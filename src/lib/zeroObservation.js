// Optional protected evidence, never a card/CSV field. Absence is unconfirmed.
// Pending evidence additionally names the exact accepted local operation.
export const canonicalObservationTime = value => typeof value === 'string'
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export function pendingMonetaryTime(operations, number) {
  return operations.filter(op => op.cardNumber === number).map(op =>
    ['manual-verification','batch-verification'].includes(op.kind) ? op.observation?.checkedAt
      : (op.kind === 'set-balance' || op.before?.currentBalance !== op.after?.currentBalance) ? op.performedAt : '')
    .filter(canonicalObservationTime).sort().at(-1) || '';
}

export function validZeroProof(proof) {
  return proof && typeof proof === 'object' && !Array.isArray(proof)
    && canonicalObservationTime(proof.checkedAt)
    && Number.isSafeInteger(proof.money) && proof.money >= 0
    && (proof.operationId === undefined || typeof proof.operationId === 'string' && proof.operationId.length > 0)
    && Object.keys(proof).every(key => ['checkedAt','money','operationId'].includes(key));
}

export function applicableZeroProof(card, entry, operations = []) {
  const proof = entry?.zeroObservation;
  if (!validZeroProof(proof) || card?.currentBalance !== 0 || card.pendingReconciliation === true
    || (card.merchant || card.merchantInferred) !== 'walmart-ca'
    || entry.money !== proof.money || entry.uncertainSince
    || proof.checkedAt < (entry.moneyAt || '') || proof.checkedAt < pendingMonetaryTime(operations,card.cardNumber)
    || (entry.conflicts ?? []).some(conflict => !conflict.resolution)
    || card.lastBalanceCheckedAt !== proof.checkedAt || card.lastBalanceChecked !== proof.checkedAt.slice(0,10)) return null;
  const monetary = operations.filter(op => op.cardNumber === card.cardNumber &&
    (['set-balance','manual-verification','batch-verification'].includes(op.kind)
      || op.before?.currentBalance !== op.after?.currentBalance));
  if (proof.operationId !== undefined) {
    const op = monetary.at(-1), amount = op?.kind === 'manual-verification' ? op.observation?.observedBalance : op?.observation?.balance;
    if (!op || op.id !== proof.operationId || op.requiresReconciliation || amount !== 0
      || !['manual-verification','batch-verification'].includes(op.kind)
      || op.observation?.checkedAt !== proof.checkedAt || op.after?.pin !== card.pin
      || op.after?.currentBalance !== 0) return null;
  } else if (monetary.length) return null;
  return proof;
}

export function recordZeroObservation(profile, operation, card) {
  const previous = profile.recoveryEvidence.cards[card.cardNumber];
  if (previous) delete previous.zeroObservation;
  if (card.currentBalance === 0 && card.pendingReconciliation !== true) {
    const entry = profile.recoveryEvidence.cards[card.cardNumber] ??= {money:0,conflicts:[]};
    entry.zeroObservation = {checkedAt:operation.observation.checkedAt, money:entry.money, operationId:operation.id};
  }
}
