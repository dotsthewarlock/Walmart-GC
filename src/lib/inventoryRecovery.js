import {canonical, equal, emptyEvidence, reconcile} from './syncProtocol.js';

export const credentialAmbiguous = (evidence, number) => evidence?.cards?.[number]?.conflicts?.some(c => c.kind === 'credentials' && !c.resolution) === true;
export const verificationCards = profile => profile.cards.filter(card => !credentialAmbiguous(profile.recoveryEvidence,card.cardNumber));

export function planInventoryRecovery(profile,cards,id) {
  const saved=new Map(profile.cards.map(card=>[card.cardNumber,card]));
  const operations=cards.filter(card=>!equal(saved.get(card.cardNumber),card)).map(card=>({
    id:id+':'+card.cardNumber,kind:'unbound-recovery',cardNumber:card.cardNumber,
    before:saved.get(card.cardNumber)??null,after:card,revision:(profile.versions[card.cardNumber]??0)+1}));
  return {...reconcile({base:profile.cards,local:cards,remote:profile.cards,operations,
    baseEvidence:profile.recoveryEvidence,evidence:profile.recoveryEvidence}),operations};
}

export function projectSheetChanges(projected,base,at,sourceHash) {
  const merged=reconcile({base:base.cards,local:base.cards,remote:projected.cards,evidence:projected.evidence,baseEvidence:base.evidence,now:at});
  const previous=new Map(base.cards.map(card=>[card.cardNumber,card]));
  for(const card of merged.cards){
    const before=previous.get(card.cardNumber);
    if(!before||(equal(before.currentBalance,card.currentBalance)&&equal(before.lastBalanceCheckedAt,card.lastBalanceCheckedAt)
      &&!(before.pendingReconciliation===true&&card.pendingReconciliation!==true)))continue;
    const entry=merged.evidence.cards[card.cardNumber]??={money:0,conflicts:[]};
    if(before.currentBalance!==card.currentBalance)entry.conflicts.push({id:'external:'+sourceHash+':'+card.cardNumber,kind:'balance',local:before.currentBalance,
      remote:card.currentBalance,base:before.currentBalance,at,operationIds:[]});
    entry.money++;entry.moneyAt=at;entry.uncertainSince??=at;card.pendingReconciliation=true;
    // A direct edit is not a new merchant observation. Keep genuine history.
    if(before.lastBalanceCheckedAt)card.lastBalanceCheckedAt=before.lastBalanceCheckedAt;else delete card.lastBalanceCheckedAt;
    if(before.lastBalanceChecked)card.lastBalanceChecked=before.lastBalanceChecked;else delete card.lastBalanceChecked;
  }
  return {...projected,...merged};
}

export function resumeMaintenance(candidate,{deletedIds=[],id,now}) {
  const current=new Map(candidate.cards.map(card=>[card.cardNumber,card]));
  for(const [number,saved] of Object.entries(candidate.evidence.maintenanceCards)){
    const {currentBalance:balance,pin}=saved,date=saved.lastBalanceChecked||'',time=saved.lastBalanceCheckedAt||'';
    if(deletedIds.includes(number))continue;
    let card=current.get(number);
    if(!card){
      card={...saved,pendingReconciliation:true};candidate.cards.push(card);
      const entry=candidate.evidence.cards[number]??={money:0,conflicts:[]};entry.uncertainSince??=now;
      entry.money++;entry.moneyAt=now;entry.maintenanceAt=now;
    }
    if((card.lastBalanceChecked||'')!==date||(card.lastBalanceCheckedAt||'')!==time||card.currentBalance!==balance||card.pin!==pin){
      const entry=candidate.evidence.cards[number]??={money:0,conflicts:[]};
      entry.money++;entry.moneyAt=now;entry.uncertainSince??=now;entry.maintenanceAt=now;
      if(card.pin!==pin)entry.conflicts.push({id:id+':credentials:'+number,kind:'credentials',local:{...saved},remote:{...card},base:null,at:now,operationIds:[]});
      if(date)card.lastBalanceChecked=date;else delete card.lastBalanceChecked;
      if(time)card.lastBalanceCheckedAt=time;else delete card.lastBalanceCheckedAt;
      card.pendingReconciliation=true;
    }
  }
  delete candidate.evidence.maintenanceCards;
  if(!candidate.evidence.maintenanceScoped&&candidate.evidence.maintenanceAt)candidate.evidence.legacyMaintenanceAt=candidate.evidence.maintenanceAt;
  candidate.evidence.maintenanceScoped=true;
}

// One deterministic projection for Sheet duplicates and explicit inventory
// recovery. Source rows/compartments are retained until a confirmed repair.
export function reconcileDuplicates(cards, evidence = emptyEvidence(), now = new Date().toISOString(), episode=now) {
  const groups = new Map();
  for (const card of cards) {
    if (!groups.has(card.cardNumber)) groups.set(card.cardNumber, []);
    groups.get(card.cardNumber).push(card);
  }
  const next = structuredClone(evidence), result = [], diagnostics = [];
  for (const [number, rows] of [...groups].sort(([a],[b])=>a.localeCompare(b))) {
    const unique = [...new Map(rows.map(card => [canonical(card), card])).values()].sort((a,b) => canonical(a).localeCompare(canonical(b)));
    const primary = {...unique[0]};
    if (rows.length > 1) diagnostics.push({kind:'duplicate_card', last4:number.slice(-4), count:rows.length,
      compatible:unique.every(card => card.pin === primary.pin)});
    if (unique.length > 1) {
      const entry = next.cards[number] ??= {money:0, conflicts:[]};
      const add = (kind, local, remote) => {
        if (!entry.conflicts.some(c => c.kind === kind && equal(c.local,local) && equal(c.remote,remote)))
          entry.conflicts.push({id:'duplicate:'+number+':'+kind+':'+episode+':'+entry.conflicts.length, kind, local, remote, base:null, at:now, operationIds:[]});
      };
      for (const card of unique.slice(1)) {
        if (card.pin !== primary.pin) add('credentials', card, unique[0]);
        for (const field of ['notes','merchant','startingBalance']) if (!equal(primary[field],card[field])) {
          if ((primary[field] === '' || primary[field] === undefined) && card[field] !== '') primary[field] = card[field];
          else if (card[field] !== '' && card[field] !== undefined) add('field:'+field,card[field],primary[field]);
        }
      }
      // Never sum balances, revive a used card, or invent verification. Keep the
      // latest genuine timestamp as history; conflicting values need a new check.
      const latestDay=unique.map(c=>c.lastBalanceChecked||'').sort().at(-1);
      const precise=unique.filter(c=>c.lastBalanceCheckedAt).sort((a,b)=>b.lastBalanceCheckedAt.localeCompare(a.lastBalanceCheckedAt))[0];
      if(latestDay){
        primary.lastBalanceChecked=latestDay;
        if(precise?.lastBalanceChecked===latestDay)primary.lastBalanceCheckedAt=precise.lastBalanceCheckedAt;
        else {
          delete primary.lastBalanceCheckedAt;
          if(precise){
            if(!entry.previousVerification||entry.previousVerification[1]<precise.lastBalanceCheckedAt)
              entry.previousVerification=[precise.lastBalanceChecked,precise.lastBalanceCheckedAt];
            primary.pendingReconciliation=true;entry.uncertainSince??=now;
          }
        }
      }
      primary.used = unique.some(c => c.used);
      if(primary.used)primary.dateUsed=unique.filter(c=>c.used&&c.dateUsed).map(c=>c.dateUsed).sort().at(-1)||primary.dateUsed;
      const differentMoney = unique.some(c => c.currentBalance !== primary.currentBalance);
      if (differentMoney || unique.some(c => c.pendingReconciliation) || unique.some(c => c.pin !== primary.pin)) {
        primary.currentBalance = Math.min(...unique.map(c => c.currentBalance));
        primary.pendingReconciliation = true; entry.uncertainSince ??= now;
        if (differentMoney) for (const card of unique) if (card.currentBalance !== primary.currentBalance)
          add('balance',card.currentBalance,primary.currentBalance);
      }
    }
    result.push(primary);
  }
  return {cards:result.sort((a,b) => a.cardNumber.localeCompare(b.cardNumber)), evidence:next, diagnostics};
}

export function isolateBatch(state, profile) {
  if (!profile.ledgerRecovery && !profile.ledger?.application) return;
  if (profile.ledger) state.quarantine.push({kind:'isolated-batch', ledger:profile.ledger,
    reason:'Batch recovery is isolated; committed inventory remains authoritative.'});
  profile.ledger = null;
  profile.ledgerRecovery = true;
}

export function pruneObservationReceipts(state) {
  // Applied reference receipts are needed only while their exact ledger exists.
  // Unknown refs can never be applied to a newly generated UUID request.
  const retained = new Set(Object.values(state.profiles).flatMap(profile => profile.ledger?.requests?.map(r => r.ref) ?? []));
  for (const ref of Object.keys(state.observationReceipts)) if (!retained.has(ref)) delete state.observationReceipts[ref];
}
