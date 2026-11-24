import {
  isCanonicalTimestamp, isTransferReference, sameTransferContext, transferCardSnapshot, transferVersion,
} from "./balanceTransfer.js";
import { parseVerifiedBalance } from "./balanceReview.js";
import { isCalendarDate } from "./csvSchema.js";
import { captureBalanceReviewStorage, persistBalanceReviewCards, serializeReviewInventory } from "./cards.js";
import { storageKeys } from "./storage.js";

const storageError = "Batch storage could not be verified. Check browser storage and reopen Batch to recover.";
const recoveryError = "A batch application was interrupted. Displayed balances may be stale. Open Batch to verify the saved inventory before discarding.";
const reloadRecoveryError = "Recovery is still protected. Reload the wallet to load the persisted balances, then return to Batch and try discarding again.";
const keysAre = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const text = (value) => typeof value === "string" && value.trim() !== "";
const digestPattern = /^[a-f0-9]{64}$/;

function validObservation(value) {
  if (!keysAre(value, ["ref", "balance", "checkedAt"]) || !isTransferReference(value.ref)
      || typeof value.balance !== "number" || !isCanonicalTimestamp(value.checkedAt)) return false;
  try {
    return parseVerifiedBalance(value.balance) === value.balance;
  } catch {
    return false;
  }
}

function validRequest(request) {
  if (!keysAre(request, ["ref", "cardNumber", "createdAt", "snapshot", "state", "applied"])) return false;
  const { snapshot, ref, cardNumber, createdAt, state, applied } = request;
  return isTransferReference(ref) && typeof cardNumber === "string" && /^[0-9]{16}$/.test(cardNumber)
    && isCanonicalTimestamp(createdAt)
    && keysAre(snapshot, ["currentBalance", "lastBalanceChecked", "dateUpdated", "used"])
    && Number.isFinite(snapshot.currentBalance) && typeof snapshot.used === "boolean"
    && typeof snapshot.dateUpdated === "string"
    && (snapshot.lastBalanceChecked === "" || isCalendarDate(snapshot.lastBalanceChecked))
    && (state === "applied"
      ? validObservation(applied) && applied.ref === ref && applied.checkedAt >= createdAt
      : ["pending", "invalidated"].includes(state) && applied === null);
}

export function decodeTransferLedger(raw) {
  if (raw === null) return null;
  let ledger;
  try {
    ledger = JSON.parse(raw);
    if (keysAre(ledger, ["version", "id", "context", "inventoryDigest", "requests", "application"])
        && ledger.version === transferVersion && isTransferReference(ledger.id)
        && keysAre(ledger.context, ["sheetId", "sheetVersion"])
        && text(ledger.context.sheetId) && text(ledger.context.sheetVersion)
        && Array.isArray(ledger.requests) && ledger.requests.length && ledger.requests.every(validRequest)
        && (ledger.requests.some(({ state }) => state === "pending")
          ? typeof ledger.inventoryDigest === "string" && digestPattern.test(ledger.inventoryDigest)
          : ledger.inventoryDigest === null)) {
      const byRef = new Map(ledger.requests.map((request) => [request.ref, request]));
      const identities = new Set(ledger.requests.map(({ cardNumber }) => cardNumber));
      const marker = ledger.application;
      if (byRef.size === ledger.requests.length && identities.size === byRef.size && (marker === null
          || (Array.isArray(marker) && marker.length && new Set(marker.map((result) => result?.ref)).size === marker.length
            && marker.every((result) => validObservation(result) && byRef.get(result.ref)?.state === "pending"
              && result.checkedAt >= byRef.get(result.ref).createdAt)))) return ledger;
    }
  } catch {
    // Malformed data must never be used for transfer or recovery.
  }
  throw new Error("The saved batch is damaged or unsupported. Discard it before creating a new batch.");
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    throw new Error(storageError);
  }
}

export function readTransferLedger() {
  return readStorage(storageKeys.balanceTransfer);
}

export function writeTransferLedger(expectedRaw, ledger) {
  const nextRaw = ledger ? JSON.stringify(ledger) : null;
  decodeTransferLedger(nextRaw);
  if (readTransferLedger() !== expectedRaw) throw new Error("The saved batch changed. Reopen Batch and try again.");
  try {
    if (nextRaw === null) localStorage.removeItem(storageKeys.balanceTransfer);
    else localStorage.setItem(storageKeys.balanceTransfer, nextRaw);
  } catch {
    throw new Error(storageError);
  }
  if (readTransferLedger() !== nextRaw) throw new Error(storageError);
  return nextRaw;
}

export function createTransferDiscardGuard() {
  // Keep a failed check latched for this wallet load, including mode switches.
  let reloadRequired = false;
  return (raw, getCards) => {
    let ledger;
    try {
      ledger = decodeTransferLedger(raw);
    } catch {
      // A damaged ledger cannot rule out an interrupted application.
    }
    if (ledger === undefined || ledger?.application) {
      if (reloadRequired) throw new Error(reloadRecoveryError);
      try {
        const inventoryRaw = captureBalanceReviewStorage(getCards());
        assertTransferUnchanged(raw, inventoryRaw);
      } catch {
        reloadRequired = true;
        throw new Error(reloadRecoveryError);
      }
    }
    writeTransferLedger(raw, null);
  };
}

export function readLocalTransferContext() {
  try {
    return {
      sheets: JSON.parse(readStorage(storageKeys.directSheets)),
      sync: JSON.parse(readStorage(storageKeys.sync)),
    };
  } catch {
    throw new Error("Local Sheet context could not be read. Reopen the wallet and check Settings.");
  }
}

export async function inventoryFingerprint(raw, salt) {
  if (!globalThis.crypto?.subtle) throw new Error("Batch requires a secure browser context.");
  const input = new TextEncoder().encode(JSON.stringify([salt, raw]));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createTransferLedger(context, selected, rawInventory, now) {
  if (!selected.length) throw new Error("No cards match this batch selection.");
  if (!globalThis.crypto?.randomUUID) throw new Error("Batch requires a secure browser context.");
  const id = globalThis.crypto.randomUUID();
  const inventoryDigest = await inventoryFingerprint(rawInventory, id);
  const createdAt = (now ?? new Date()).toISOString();
  return {
    version: transferVersion,
    id,
    context,
    inventoryDigest,
    requests: selected.map(({ card }) => ({
      ref: globalThis.crypto.randomUUID(),
      cardNumber: card.cardNumber,
      createdAt,
      snapshot: transferCardSnapshot(card),
      state: "pending",
      applied: null,
    })),
    application: null,
  };
}

export function invalidatedLedger(ledger) {
  if (!ledger) return null;
  if (ledger.application) throw new Error(recoveryError);
  if (!ledger.requests.some(({ state }) => state === "pending")) return ledger;
  return {
    ...ledger, inventoryDigest: null, requests: ledger.requests.map((request) =>
      request.state === "pending" ? { ...request, state: "invalidated" } : request),
  };
}

// Called before ordinary mutations. Keep these guards synchronous so the
// verified invalidation and the local mutation occur in the same task.
export function invalidateTransferBeforeMutation() {
  const raw = readTransferLedger();
  const ledger = decodeTransferLedger(raw);
  const next = invalidatedLedger(ledger);
  if (next !== ledger) writeTransferLedger(raw, next);
}

export function invalidateOnObservedContext(raw, status, local) {
  if (raw === null || readTransferLedger() !== raw) return;
  const ledger = decodeTransferLedger(raw);
  if (ledger.application) return;
  const localSheet = local?.sheets?.spreadsheetId;
  const localVersion = local?.sync?.lastKnownSheetVersion;
  const changedLocal = (text(localSheet) && localSheet !== ledger.context.sheetId)
    || (text(localVersion) && localVersion !== ledger.context.sheetVersion);
  const changedSession = status?.authenticated === false || (status?.authenticated === true
    && !sameTransferContext(ledger.context, status));
  if (changedLocal || changedSession) {
    const next = invalidatedLedger(ledger);
    if (next !== ledger) writeTransferLedger(raw, next);
  }
}

export function assertTransferUnchanged(ledgerRaw, inventoryRaw) {
  if (readTransferLedger() !== ledgerRaw || readStorage(storageKeys.cards) !== inventoryRaw) {
    throw new Error("The batch or saved cards changed in this browser. Reopen Batch and try again.");
  }
}

export async function checkTransferContinuity({ ledger, raw, inventoryRaw, context }) {
  const hasPending = ledger?.requests.some(({ state }) => state === "pending");
  if (!hasPending || ledger.application) return { ledger, raw };
  const matching = sameTransferContext(ledger.context, context)
    && ledger.inventoryDigest === await inventoryFingerprint(inventoryRaw, ledger.id);
  assertTransferUnchanged(raw, inventoryRaw);
  if (matching) return { ledger, raw };
  const next = invalidatedLedger(ledger);
  return { ledger: next, raw: writeTransferLedger(raw, next) };
}

export function readTransferInventory() {
  return readStorage(storageKeys.cards);
}

export async function prepareTransferApplication(ledger, candidate, accepted) {
  if (ledger.application) throw new Error(recoveryError);
  const proposed = accepted.map(({ ref, balance, checkedAt }) => ({ ref, balance, checkedAt }));
  if (!proposed.length) throw new Error("There are no accepted results to apply.");
  const byRef = new Map(proposed.map((observation) => [observation.ref, observation]));
  const marked = { ...ledger, application: proposed };
  // Validate the marker and candidate before either localStorage write.
  decodeTransferLedger(JSON.stringify(marked));
  const serialized = serializeReviewInventory(candidate);
  const hasRemaining = ledger.requests.some(({ state, ref }) => state === "pending" && !byRef.has(ref));
  const inventoryDigest = hasRemaining ? await inventoryFingerprint(serialized, ledger.id) : null;
  const finalized = {
    ...ledger,
    inventoryDigest,
    requests: ledger.requests.map((request) => byRef.has(request.ref)
      ? { ...request, state: "applied", applied: byRef.get(request.ref) } : request),
  };
  return { marked, finalized };
}

export function commitTransferApplication({ raw, inventoryRaw, candidate, prepared }) {
  assertTransferUnchanged(raw, inventoryRaw);
  const markerRaw = writeTransferLedger(raw, prepared.marked);
  let committedRaw;
  try {
    assertTransferUnchanged(markerRaw, inventoryRaw);
    committedRaw = persistBalanceReviewCards(candidate, inventoryRaw);
    if (readStorage(storageKeys.cards) !== committedRaw) throw new Error(storageError);
  } catch {
    return { saved: false, error: "The inventory write could not be confirmed. Displayed balances may be stale. Reload the wallet to view the persisted balances." };
  }
  try {
    assertTransferUnchanged(markerRaw, committedRaw);
    writeTransferLedger(markerRaw, prepared.finalized);
    return { saved: true };
  } catch {
    return { saved: true, error: recoveryError };
  }
}
