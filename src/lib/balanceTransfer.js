import { applyBalanceObservation, createBalanceReviewQueue, parseVerifiedBalance } from "./balanceReview.js";
import { isCalendarDate, schemaCapability } from "./csvSchema.js";

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

function selectEligibleRows(eligible, selection) {
  if (selection === "all") return eligible;
  if (selection === "never") return eligible.filter(({ card }) => !card.lastBalanceChecked);
  if (["5", "10", "20", "30"].includes(selection)) return eligible.slice(0, Number(selection));
  throw new Error("Choose a batch selection.");
}

export function selectTransferCards(cards, selection) {
  const eligible = createBalanceReviewQueue(cards).filter(({ card }) => credentialsValid(card));
  return { selected: selectEligibleRows(eligible, selection), eligible: eligible.length, excluded: cards.length - eligible.length };
}

// New batches only: saved request and result validation retains the full eligible inventory.
export function selectNewBatchCards(cards, selection, includeUsed = false) {
  const all = selectTransferCards(cards, "all").selected;
  const unused = all.filter(({ card }) => !card.used);
  const used = all.filter(({ card }) => card.used);
  const eligible = includeUsed ? [...unused, ...used] : unused;
  return { selected: selectEligibleRows(eligible, selection), eligible: eligible.length,
    excluded: cards.length - eligible.length, eligibleUsed: used.length };
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

export function transferRequestRows(ledger, cards) {
  const eligible = new Map(selectTransferCards(cards, "all").selected.map(({ card }) => [card.cardNumber, card]));
  if (ledger.application) throw new Error("Resolve the interrupted application before copying a request.");
  return ledger.requests.filter(({ state }) => state === "pending").map(({ ref, cardNumber, snapshot }) => {
    const card = eligible.get(cardNumber);
    if (!card || JSON.stringify(transferCardSnapshot(card)) !== JSON.stringify(snapshot)) {
      throw new Error("The requested cards changed. Create a new batch.");
    }
    return { ref, cardNumber, pin: card.pin };
  });
}

export function previewTransferResults(ledger, cards, observations, now = Date.now()) {
  const requests = new Map(ledger.requests.map((request, index) => [request.ref, { ...request, position: index + 1 }]));
  const eligible = new Map(selectTransferCards(cards, "all").selected.map((entry) => [entry.card.cardNumber, entry]));
  const counts = { accepted: 0, changed: 0, unchanged: 0, unknown: 0, invalidated: 0, stale: 0, alreadyApplied: 0, rejected: 0 };
  const items = [];
  let candidate = cards;
  let netCents = 0n;

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
    } else if (!entry || JSON.stringify(request.snapshot) !== JSON.stringify(transferCardSnapshot(card))) {
      outcome = "stale";
      reason = "The requested card changed or is unavailable.";
    } else if (checkedAt < request.createdAt || Date.parse(checkedAt) > now + futureToleranceMs) {
      outcome = "stale";
      reason = "Observation predates its request or is more than 60 seconds in the future.";
    } else if (card.lastBalanceChecked && checkedAt.slice(0, 10) <= card.lastBalanceChecked) {
      outcome = "stale";
      reason = "The saved verification date cannot establish that this observation is newer.";
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
