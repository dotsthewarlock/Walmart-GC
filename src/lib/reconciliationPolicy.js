import { compactEvidence } from './syncEvidence.js';
import { createBalanceReviewQueue } from './balanceReview.js';

// Record-level defaults shared by the local authority and the Worker. These
// fields cannot move money or select credentials. Notes retain distinct lines.
export function metadataDefault(field, values) {
  const present = values.filter(value => value !== undefined && value !== null && value !== '');
  if (field === 'notes') return [...new Set(present.flatMap(value => String(value).split('\n')))].sort().join('\n');
  if (field === 'used') return values.some(value => value === true);
  if (field === 'startingBalance') return Math.max(...present);
  if (['dateAdded', 'dateUpdated', 'dateUsed'].includes(field)) {
    return present.sort()[field === 'dateAdded' ? 0 : present.length - 1] ?? '';
  }
  return undefined;
}

export const lowRiskField = field => ['notes', 'used', 'startingBalance', 'dateAdded', 'dateUpdated', 'dateUsed'].includes(field);
export const verificationConflict = kind => ['verification', 'field:lastBalanceChecked', 'field:lastBalanceCheckedAt'].includes(kind);
export const flaggedConflict = kind => kind === 'balance' || verificationConflict(kind);
export const recordQuarantined = (evidence, number) => Boolean(evidence?.tombstones?.[number])
  || (evidence?.cards?.[number]?.conflicts ?? []).some(c => !c.resolution && !flaggedConflict(c.kind));

export function retireVerificationEvidence(entry) {
  if (!entry) return;
  delete entry.uncertainSince;
  delete entry.previousVerification;
  entry.conflicts = (entry.conflicts ?? []).filter(c => !flaggedConflict(c.kind));
}

function consolidate(conflicts, kind) {
  const first = conflicts[0];
  if (!first) return [];
  const alternatives = kind === 'balance'
    ? [...new Set(conflicts.flatMap(c => [...(c.alternatives ?? []), c.local, c.remote, c.base]).filter(v => typeof v === 'number'))].sort((a,b) => a-b)
    : [...new Map(conflicts.flatMap(c => c.alternatives ?? [c.local,c.remote,c.base].filter(v => v != null)
      .map(value => ({field:c.kind.slice(6),value}))).map(value => [JSON.stringify(value),value])).values()]
      .sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return [{...first,kind,alternatives,operationIds:[],at:conflicts.map(c => c.at || '').sort().at(-1)}];
}

// Also repairs saved v1 evidence. It never rewrites pending operations, commit
// identities, baselines, tombstones or original migration bytes. Missing rows
// already restored with matching credentials need verification, not approval.
export function repairRecovery(cards, evidence, now = new Date().toISOString(), operations = []) {
  const next = structuredClone(evidence), result = cards.map(card => ({...card}));
  next.cards ??= {}; next.tombstones ??= {};
  const current = new Map(result.map(card => [card.cardNumber,card]));
  for (const [number, entry] of Object.entries(next.cards)) {
    const card = current.get(number), kept = [];
    for (const conflict of entry.conflicts ?? []) {
      if (conflict.resolution) continue;
      const field = conflict.kind.startsWith('field:') ? conflict.kind.slice(6) : '';
      if (card && lowRiskField(field)) {
        // A subsequent explicit edit supersedes an old metadata disagreement.
        if (!operations.some(op => op.cardNumber === number && op.after && op.before?.[field] !== op.after[field])
          && [conflict.local,conflict.remote,conflict.base].some(value => value === card[field]))
          card[field] = metadataDefault(field,[card[field],conflict.local,conflict.remote]);
        continue;
      }
      if (card && conflict.kind === 'missing-remote' && !next.tombstones[number]) {
        const alternatives = [conflict.local,conflict.remote,conflict.base].filter(Boolean);
        if (alternatives.every(value => value.cardNumber === number && value.pin === card.pin)) {
          entry.uncertainSince ??= conflict.at || now;
          continue;
        }
        kept.push({...conflict,kind:'credentials',remote:{...card}});
      } else kept.push(conflict);
    }
    const money = kept.filter(c => c.kind === 'balance');
    const verification = kept.filter(c => verificationConflict(c.kind));
    entry.conflicts = [...kept.filter(c => !flaggedConflict(c.kind)),...consolidate(money,'balance'),...consolidate(verification,'verification')];
    if (money.length || verification.length) {
      entry.uncertainSince = [entry.uncertainSince,...money.map(c=>c.at),...verification.map(c=>c.at)].filter(Boolean).sort().at(-1) || now;
    }
    if (card && entry.uncertainSince) card.pendingReconciliation = true;
    if (card?.used !== true && card) card.dateUsed = '';
  }
  return {cards:result,evidence:compactEvidence(next)};
}

export function recoverySummary(profile) {
  const quarantined = new Set(Object.entries(profile.recoveryEvidence?.cards ?? {})
    .filter(([number]) => recordQuarantined(profile.recoveryEvidence,number)).map(([number]) => number));
  const uncertain = profile.cards.filter(card => card.pendingReconciliation === true);
  return {uncertain:uncertain.length,quarantined:quarantined.size,
    flaggedEligible:createBalanceReviewQueue(uncertain).filter(({card}) => !recordQuarantined(profile.recoveryEvidence,card.cardNumber)).length};
}
