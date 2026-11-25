// Frozen legacy split-write recovery contracts; never imported by the app.
import { sameTransferContext } from './balanceTransfer.js';
import { captureBalanceReviewStorage, persistBalanceReviewCards } from './legacyCards.fixture.mjs';
import { storageKeys } from './storage.js';
import { decodeTransferLedger, invalidatedLedger, inventoryFingerprint } from './balanceTransferLedger.js';
export { decodeTransferLedger, invalidatedLedger, inventoryFingerprint, createTransferLedger, prepareTransferApplication } from './balanceTransferLedger.js';
const storageError = "Batch storage could not be verified. Check browser storage and reopen Batch to recover.";
const recoveryError = "A batch application was interrupted. Displayed balances may be stale. Open Batch to verify the saved inventory before discarding.";
const reloadRecoveryError = "Recovery is still protected. Reload the wallet to load the persisted balances, then return to Batch and try discarding again.";
const text = value => typeof value === 'string' && value.trim() !== '';
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
