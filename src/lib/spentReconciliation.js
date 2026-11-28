import { isCalendarDate } from './csvSchema.js';
import { applicableZeroProof } from './zeroObservation.js';

const dayMs = 86400000;
export function spentLifecycle(card, evidence, operations = [], now = new Date()) {
  const today = now.toISOString().slice(0,10);
  const usedDay = isCalendarDate(card.dateUsed) && card.dateUsed <= today ? card.dateUsed : '';
  const age = usedDay ? Math.floor((Date.parse(today) - Date.parse(usedDay)) / dayMs) : null;
  const proof = applicableZeroProof(card,evidence?.cards?.[card.cardNumber],operations);
  // Positive verification remains useful history, but never establishes zero or
  // final completion. A zero without proof remains explicitly unconfirmed.
  const checkedAt = proof?.checkedAt || (card.currentBalance > 0 ? card.lastBalanceCheckedAt || card.lastBalanceChecked || '' : '');
  const finalDay = usedDay ? new Date(Date.parse(usedDay) + 120 * dayMs).toISOString().slice(0,10) : '';
  const finalComplete = Boolean(proof && finalDay && checkedAt.slice(0,10) >= finalDay);
  return {age,checkedAt,confirmedZero:Boolean(proof),finalComplete,
    finalDue:age !== null && age >= 120 && !finalComplete,
    finalPriority:age !== null && age >= 120 && age < 150 && !finalComplete};
}

export function selectSpentCards(eligible, preferences, evidence, operations, now) {
  const freshness = [30,60,90].includes(preferences.freshness) ? preferences.freshness : 60;
  const cutoff = now.getTime() - freshness * dayMs;
  const mode = preferences.purpose;
  const candidates = eligible.map(entry => ({...entry,lifecycle:spentLifecycle(entry.card,evidence,operations,now)}))
    .filter(({card,lifecycle:life}) => {
      if (card.pendingReconciliation === true) return true;
      if (!card.used) return false;
      const stale = !life.checkedAt || Date.parse(life.checkedAt) <= cutoff;
      if (mode === 'reconcile') return !life.confirmedZero;
      if (mode === 'watch') return life.age !== null && life.age < 120 && stale;
      if (mode === 'final') return life.finalDue;
      return (life.age === null || life.age >= 120) && stale;
    }).sort((a,b) => Number(b.card.pendingReconciliation === true) - Number(a.card.pendingReconciliation === true)
      || Number(b.lifecycle.finalPriority) - Number(a.lifecycle.finalPriority)
      || Number(b.lifecycle.finalDue) - Number(a.lifecycle.finalDue)
      || Number(!b.lifecycle.checkedAt) - Number(!a.lifecycle.checkedAt)
      || a.lifecycle.checkedAt.localeCompare(b.lifecycle.checkedAt)
      || a.card.cardNumber.localeCompare(b.card.cardNumber));
  const quantity = ['1','5','20','50'].includes(preferences.quantity) ? Number(preferences.quantity) : 20;
  return {selected:candidates.slice(0,Math.min(quantity,50)),matching:candidates.length};
}
