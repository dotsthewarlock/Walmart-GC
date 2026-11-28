import { applyBalanceObservation, createBalanceReviewQueue, parseVerifiedBalance } from "./balanceReview.js";
import { isCalendarDate, schemaCapability } from "./csvSchema.js";
import { maintenanceRevision } from './syncProtocol.js';
import { selectSpentCards } from './spentReconciliation.js';
import { pendingMonetaryTime } from './zeroObservation.js';

export const checkerUrl = "https://www.walmart.ca/en/account/giftcards/balance";
export const transferVersion = 1;
export const futureToleranceMs = 60_000;
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const isTransferReference = (value) => typeof value === "string" && uuidV4.test(value);
const cardNumberPattern = /^[0-9]{16}$/;
const pinPattern = /^[0-9]{4}$/;
const balancePattern = /^[0-9]+\.[0-9]{2}$/;

const packets = {
  request: ["WMGC-REQUEST\t1", "ref\tcardNumber\tpin"],
  result: ["WMGC-RESULT\t1", "ref\tbalanceCAD\tcheckedAt"],
};

export function isCanonicalTimestamp(value) {
  return typeof value === "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(value)
    && isCalendarDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function credentialsValid(card) {
  return typeof card.cardNumber === "string" && cardNumberPattern.test(card.cardNumber)
    && typeof card.pin === "string" && pinPattern.test(card.pin);
}

export function transferEligibleCards(cards) {
  return createBalanceReviewQueue(cards).filter(({ card }) => credentialsValid(card));
}

export const transferPreferenceKey = "gc-wallet-batch-selection-v1";
export const defaultTransferPreferences = Object.freeze({ version: 2, purpose: 'general', freshness: 60, quantity: "all", status: "active", balance: "yes", checked: "older", days: 30, sort: "checked-oldest" });
export function readTransferPreferences(storage) {
  try {
    const value = JSON.parse(storage.getItem(transferPreferenceKey));
    if (!value || ![1, 2].includes(value.version)) return { ...defaultTransferPreferences };
    return { version: 2,
      purpose: ['general','reconcile','watch','final','historical'].includes(value.purpose) ? value.purpose : 'general',
      freshness: [30,60,90].includes(value.freshness) ? value.freshness : 60,
      quantity: ["all", "1", "5", "20", "50"].includes(value.quantity) ? value.quantity : "all",
      status: value.version === 1 ? (value.includeUsed === true ? "all" : "active") : (["active", "used", "all"].includes(value.status) ? value.status : "active"),
      balance: value.version === 1 ? (value.includeZero === true ? "all" : "yes") : (["yes", "zero", "all"].includes(value.balance) ? value.balance : "yes"),
      checked: ["any", "never", "older", "recent"].includes(value.checked) ? value.checked : defaultTransferPreferences.checked,
      days: [1, 3, 7, 30, 90, 180].includes(value.days) ? value.days : 30,
      sort: ["checked-oldest", "checked-newest", "added-oldest", "added-newest", "balance-highest", "balance-lowest"].includes(value.sort) ? value.sort : "checked-oldest" };
  } catch { return { ...defaultTransferPreferences }; }
}

export function selectTransferCards(cards, preferences = defaultTransferPreferences, now = new Date(), evidence, operations = []) {
  preferences={...defaultTransferPreferences,...preferences};
  const allEligible = transferEligibleCards(cards);
  const usedCount = allEligible.filter(({ card }) => card.used === true).length;
  const zeroCount = allEligible.filter(({ card }) => card.currentBalance === 0).length;
  if (preferences.flaggedOnly !== true && ['reconcile','watch','final','historical'].includes(preferences.purpose))
    return {...selectSpentCards(allEligible,preferences,evidence,operations,now),usedCount,zeroCount};
  const today = now.toISOString().slice(0, 10);
  const cutoff = new Date(Date.parse(`${today}T00:00:00.000Z`) - preferences.days * 86400000).toISOString().slice(0, 10);
  const matching = allEligible.filter(({ card }) => {
    if(preferences.flaggedOnly===true)return card.pendingReconciliation===true;
    const checked = card.lastBalanceChecked || "";
    return (preferences.status === "all" || (preferences.status === "used" ? card.used === true : card.used !== true))
      && (card.pendingReconciliation===true || preferences.balance === "all" || (preferences.balance === "zero" ? card.currentBalance === 0 : card.currentBalance > 0))
      && (card.pendingReconciliation===true || preferences.checked === "any" || (preferences.checked === "never" && !checked)
        || (preferences.checked === "older" && (!checked || checked <= cutoff))
        || (preferences.checked === "recent" && checked && checked >= cutoff && checked <= today));
  }).sort(({ card: a }, { card: b }) => {
    const uncertainty=Number(b.pendingReconciliation===true)-Number(a.pendingReconciliation===true);
    if(uncertainty)return uncertainty;
    const sort = preferences.sort;
    let order;
    if (sort.startsWith("checked-")) order = (a.lastBalanceChecked || "").localeCompare(b.lastBalanceChecked || "") * (sort === "checked-newest" ? -1 : 1);
    else if (sort.startsWith("added-")) order = (a.dateAdded || "").localeCompare(b.dateAdded || "") * (sort === "added-newest" ? -1 : 1);
    else order = (a.currentBalance - b.currentBalance) * (sort === "balance-highest" ? -1 : 1);
    return order || a.cardNumber.localeCompare(b.cardNumber);
  });
  const selected = preferences.quantity === "all" ? matching : matching.slice(0, Number(preferences.quantity));
  return { selected, matching: matching.length, usedCount, zeroCount };
}

// These fields can be compared across reloads. The whole saved-inventory
// fingerprint also detects changes outside the selected rows, including PINs.
export function transferCardSnapshot(card) {
  return {
    currentBalance: card.currentBalance,
    lastBalanceChecked: card.lastBalanceChecked || "",
    dateUpdated: card.dateUpdated,
    used: card.used,
  };
}

export function formatTransferRequest(rows) {
  const refs = new Set();
  const cards = new Set();
  for (const row of rows) {
    if (!isTransferReference(row.ref) || !credentialsValid(row) || refs.has(row.ref) || cards.has(row.cardNumber)) {
      throw new Error("The request contains invalid or ambiguous card credentials.");
    }
    refs.add(row.ref);
    cards.add(row.cardNumber);
  }
  if (!rows.length) throw new Error("There are no outstanding requests to copy.");
  return [...packets.request, ...rows.map(({ ref, cardNumber, pin }) => [ref, cardNumber, pin].join("\t"))].join("\n");
}

export function parseTransferResults(packet) {
  if (typeof packet !== "string") throw new Error("Paste a Wallet results packet.");
  const lines = packet.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");
  const [protocol, header, ...rows] = lines;
  if (protocol !== packets.result[0] || header !== packets.result[1] || !rows.length) {
    throw new Error("Paste a Wallet results packet with the exact WMGC-RESULT version 1 headers and at least one result.");
  }
  const results = new Map();
  for (const [index, row] of rows.entries()) {
    const [ref, amount, checkedAt, ...extra] = row.split("\t");
    if (extra.length || !isTransferReference(ref) || !balancePattern.test(amount) || !isCanonicalTimestamp(checkedAt)) {
      throw new Error(`Invalid result on line ${index + 3}. Check the UUID, amount and UTC timestamp.`);
    }
    let balance;
    try {
      balance = parseVerifiedBalance(amount);
    } catch {
      throw new Error(`The amount on line ${index + 3} cannot be stored accurately in cents.`);
    }
    const previous = results.get(ref);
    if (previous && previous.row !== row) throw new Error(`Conflicting results for one reference on line ${index + 3}.`);
    results.set(ref, { row, observation: { ref, balance, checkedAt } });
  }
  return Array.from(results.values(), ({ observation }) => observation);
}

export function requireTransferContext(status, local) {
  if (status?.authenticated !== true) throw new Error("Connect Google to use Batch. Manual review is available offline.");
  if (status.schemaCapability !== schemaCapability) throw new Error("Batch requires a Worker that supports balance metadata.");
  const protectedSync = status.syncProtocol === "gc-wallet-sync-v1";
  if (typeof status.sheetId !== "string" || !status.sheetId.trim()
      || local?.sync?.status !== "connected" || local?.sheets?.status !== "ready"
      || !local.sheets.spreadsheetId || !local.sync.lastKnownSheetVersion
      || local.sheets.spreadsheetId !== status.sheetId
      || (protectedSync ? (
        status.ownershipVerified !== true || status.coordinationAvailable !== true
        || typeof status.principal !== "string" || !status.principal.trim()
        || local.context?.kind !== "sheet" || local.context.ownershipVerified !== true
        || local.context.principal !== status.principal || local.context.sheetId !== status.sheetId
        || local.remoteBase?.protocol !== status.syncProtocol
        || local.remoteBase.version !== local.sync.lastKnownSheetVersion
        || local.sheets.remoteSheetVersion !== local.remoteBase.version
      ) : (
        typeof status.sheetVersion !== "string" || !status.sheetVersion.trim()
        || local.sync.lastKnownSheetVersion !== status.sheetVersion
        || local.sheets.remoteSheetVersion !== status.sheetVersion
      ))) {
    throw new Error("The Sheet context could not be verified. Use Settings to establish the matching Sheet and version.");
  }
  return { sheetId: status.sheetId, sheetVersion: protectedSync ? local.sync.lastKnownSheetVersion : status.sheetVersion };
}

export function sameTransferContext(a, b) {
  return a.sheetId === b.sheetId && a.sheetVersion === b.sheetVersion;
}

export function transferRequestRows(ledger, cards, selectedRefs = null) {
  const eligible = new Map(transferEligibleCards(cards).map(({ card }) => [card.cardNumber, card]));
  if (ledger.application) throw new Error("Resolve the interrupted application before copying a request.");
  return ledger.requests.filter(({ state, ref }) => state === "pending" && (!selectedRefs || selectedRefs.includes(ref))).map(({ ref, cardNumber, snapshot }) => {
    const card = eligible.get(cardNumber);
    if (!card || JSON.stringify(transferCardSnapshot(card)) !== JSON.stringify(snapshot)) {
      throw new Error("The requested cards changed. Create a new batch.");
    }
    return { ref, cardNumber, pin: card.pin };
  });
}

export function previewTransferResults(ledger, cards, observations, now = Date.now(), evidence, operations = []) {
  const requests = new Map(ledger.requests.map((request, index) => [request.ref, { ...request, position: index + 1 }]));
  const eligible = new Map(transferEligibleCards(cards).map((entry) => [entry.card.cardNumber, entry]));
  const counts = { accepted: 0, changed: 0, unchanged: 0, unknown: 0, invalidated: 0, stale: 0, alreadyApplied: 0, rejected: 0 };
  const items = [];
  let candidate = cards;
  let netCents = 0n;
  const newest = new Map();
  const ambiguous = new Set();
  const ineligible = (request, card, entry, checkedAt) => {
    if (!entry || JSON.stringify(request.snapshot) !== JSON.stringify(transferCardSnapshot(card))) return 'The requested card changed or is unavailable.';
    if (checkedAt < request.createdAt || Date.parse(checkedAt) > now + futureToleranceMs) return 'Observation predates its request or is more than 60 seconds in the future.';
    if ((card.lastBalanceChecked && checkedAt.slice(0, 10) < card.lastBalanceChecked) || (card.lastBalanceCheckedAt && checkedAt <= card.lastBalanceCheckedAt)) return 'The observation predates the saved verification time.';
    const recovery=evidence?.cards?.[card.cardNumber];
    if(checkedAt<(recovery?.uncertainSince||'')||checkedAt<(recovery?.moneyAt||'')||checkedAt<pendingMonetaryTime(operations,card.cardNumber)||checkedAt<(maintenanceRevision(evidence,card.cardNumber)||''))return 'The observation predates the latest monetary change or uncertainty.';
    return null;
  };
  for (const observation of observations) {
    const request = requests.get(observation.ref);
    if (request?.state !== 'pending') continue;
    const entry = eligible.get(request.cardNumber);
    if (ineligible(request, entry?.card, entry, observation.checkedAt)) continue;
    const previous = newest.get(request.cardNumber);
    if (!previous || observation.checkedAt > previous.checkedAt) {
      newest.set(request.cardNumber, observation);
      ambiguous.delete(request.cardNumber);
    } else if (observation.checkedAt === previous.checkedAt) {
      if (observation.balance !== previous.balance) ambiguous.add(request.cardNumber);
      if (observation.ref < previous.ref) newest.set(request.cardNumber, observation);
    }
  }

  for (const observation of observations) {
    const { ref, balance, checkedAt } = observation;
    const request = requests.get(ref);
    const entry = eligible.get(request?.cardNumber);
    const card = entry?.card;
    let outcome;
    let reason;
    if (!request) {
      outcome = "unknown";
      reason = "Reference belongs to another request.";
    } else if (request.state === "applied") {
      outcome = request.applied.checkedAt === checkedAt && request.applied.balance === balance ? "alreadyApplied" : "rejected";
      reason = outcome === "alreadyApplied" ? "Already applied." : "Conflicts with a result already applied.";
    } else if (request.state === "invalidated") {
      outcome = "invalidated";
      reason = "The request was invalidated.";
    } else if (ledger.application) {
      outcome = "rejected";
      reason = "Application outcome is uncertain.";
    } else if ((reason = ineligible(request, card, entry, checkedAt))) {
      outcome = "stale";
    } else if (ambiguous.has(request.cardNumber) && newest.get(request.cardNumber)?.checkedAt === checkedAt) {
      outcome = "rejected";
      reason = "Conflicting observations have the same timestamp.";
    } else if (newest.get(request.cardNumber)?.ref !== ref) {
      outcome = "stale";
      reason = "A newer observation for this card is included.";
    } else {
      candidate = applyBalanceObservation(candidate, {
        cardNumber: request.cardNumber, observedBalance: balance, checkedAt, expected: entry,
      });
      outcome = "accepted";
      counts[balance === card.currentBalance ? "unchanged" : "changed"]++;
      netCents += toCents(balance) - toCents(card.currentBalance);
    }
    counts[outcome]++;
    items.push({
      ...observation, outcome, reason, cardNumber: request?.cardNumber, position: request?.position,
      recorded: card?.currentBalance, used: card?.used === true,
    });
  }

  const outstanding = ledger.requests.filter(({ state }) => state === "pending").length;
  return { counts, items, candidate, netCents, outstanding };
}

function toCents(value) {
  // Fixed-point formatting avoids rounding the aggregate back through Number.
  return Number.isInteger(value) ? BigInt(value) * 100n : BigInt(value.toFixed(2).replace(".", ""));
}
