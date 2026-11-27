import { bundledSampleGiftCards } from './cards.js';
import { compactEvidence, evidenceMetadata } from './syncEvidence.js';
import { lowRiskField, metadataDefault, repairRecovery, retireVerificationEvidence, recordQuarantined } from './reconciliationPolicy.js';
export const syncProtocol = 'gc-wallet-sync-v1';
export const equal = (a,b) => canonical(a) === canonical(b);
export function canonical(value) {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export async function fingerprint(value) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export const emptyEvidence = () => ({ cards:{}, tombstones:{} });
export const maintenanceRevision=(evidence,number)=>evidence?.cards?.[number]?.maintenanceAt
  ??(evidence?.maintenanceScoped?evidence.legacyMaintenanceAt:evidence?.maintenanceAt);
export const snapshotContent = snapshot => ({ cards:snapshot.cards,evidence:snapshot.evidence??emptyEvidence() });
const samples=new Set(bundledSampleGiftCards.map(c=>c.cardNumber));
const mapCards=cards=>new Map(cards.map(c=>[c.cardNumber,c]));
export const isMonetaryOperation=op=>['set-balance','manual-verification','batch-verification'].includes(op.kind)
  || op.before?.currentBalance!==op.after?.currentBalance;

const moneyOp=isMonetaryOperation;
const canonicalTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const validLegacyVerification=(op,priorTime)=>{
  const checked=op.observation?.checkedAt;
  const amount=op.kind==='manual-verification'?op.observation?.observedBalance:op.observation?.balance;
  return ['manual-verification','batch-verification'].includes(op.kind) && canonicalTime(checked) && checked>priorTime
    && checked.slice(0,10)===op.after?.lastBalanceChecked && typeof amount==='number' && amount===op.after?.currentBalance
    && op.before?.pin===op.after?.pin && (op.after?.merchant||op.after?.merchantInferred)==='walmart-ca';
};

// Absence is never a delete operation. Only controlled maintenance creates tombstones.
// A monetary operation's identity matters even when two resulting values match.
export function reconcile({base,local,remote,operations=[],baseEvidence=emptyEvidence(),evidence=emptyEvidence(),now=new Date().toISOString()}) {
  ({cards:remote,evidence}=repairRecovery(remote,evidence,now));
  const result=mapCards(remote), old=mapCards(base), working=mapCards(local);
  const operationsByCard=new Map();
  for(const op of operations){if(!operationsByCard.has(op.cardNumber))operationsByCard.set(op.cardNumber,[]);operationsByCard.get(op.cardNumber).push(op);}
  const next=structuredClone(evidence);next.cards??={};next.tombstones??={};
  const conflict=(number,kind,values,ids=[])=>{
    const entry=next.cards[number]??={money:0,conflicts:[]};entry.conflicts??=[];
    const id=kind+':'+number+':'+ids.join(',');
    if(!entry.conflicts.some(c=>c.id===id)){
      entry.conflicts.push({id,kind,...values,operationIds:ids,at:now});
      if(kind==='balance')entry.uncertainSince=now;
    }
    return entry;
  };
  for(const [number,workingCard] of working){
    let card={...workingCard};
    const cardOperations=operationsByCard.get(number)??[];
    for(const op of cardOperations) {
      const priorDate=card.lastBalanceChecked,priorTime=card.lastBalanceCheckedAt;
      for(const key of Object.keys(op.after??{}))if(!equal(op.before?.[key],op.after[key]))card[key]=op.after[key];
      if(priorTime && !op.after?.lastBalanceCheckedAt) {
        const checked=op.observation?.checkedAt;
        if(validLegacyVerification(op,priorTime)) card.lastBalanceCheckedAt=checked;
        else {card.lastBalanceChecked=priorDate;card.lastBalanceCheckedAt=priorTime;}
      }
      if(moneyOp(op)&&op.after)card.currentBalance=op.after.currentBalance;
    }
    if(samples.has(number))throw Error('Bundled samples cannot synchronize.');
    const prior=old.get(number),saved=result.get(number),ops=cardOperations;
    const ids=ops.map(o=>o.id);
    if(next.tombstones[number]){
      if(ops.some(o=>o.kind==='resolve-conflict'&&o.choice==='restore'&&o.conflictId===next.tombstones[number].id)){
        delete next.tombstones[number];result.set(number,{...card,pendingReconciliation:true});
        for(const c of next.cards[number]?.conflicts??[])if(c.kind==='deleted-identity')c.resolution='restored';
      }else {
        for(const op of ops.filter(o=>o.kind==='resolve-conflict'&&o.choice==='remote')){const c=next.cards[number]?.conflicts?.find(c=>c.id===op.conflictId);if(c)c.resolution='remote';}
        if(!ops.some(o=>o.kind==='resolve-conflict'&&o.choice==='remote'))conflict(number,'deleted-identity',{local:card,remote:saved??null},ids);
      }
      continue;
    }
    if(!saved){
      const missingBase=prior??ops.find(o=>o.before)?.before;
      if(missingBase){
        card.pendingReconciliation=true;
        const entry=next.cards[number]??={money:0,conflicts:[]};
        entry.uncertainSince??=now;
      }
      // Preserve credentials even when direct edits removed a row without a tombstone.
      result.set(number,card);
      const financial=ops.filter(o=>['set-balance','manual-verification','batch-verification'].includes(o.kind));
      if(financial.length||card.pendingReconciliation)next.cards[number]??={money:financial.length,moneyAt:now,conflicts:[],...(card.pendingReconciliation?{uncertainSince:now}:{})};
      continue;
    }
    for(const op of ops.filter(o=>o.kind==='resolve-conflict')){
      const target=next.cards[number]?.conflicts?.find(c=>c.id===op.conflictId);
      if(target&&op.choice==='remote')target.resolution='remote';
      if(target?.kind==='missing-remote'&&op.choice==='local'&&target.local?.pin===saved.pin)target.resolution='restored';
      if(target?.kind==='credentials'&&op.choice==='local'&&target.local?.pin===saved.pin)target.resolution='equivalent-local';
    }
    if(card.pin!==saved.pin){
      const entry=next.cards[number];
      const resolution=ops.find(o=>{
        const c=entry?.conflicts?.find(c=>c.id===o.conflictId&&!c.resolution);
        return o.kind==='resolve-conflict'&&o.choice==='local'&&c?.kind==='credentials'&&c.remote?.pin===saved.pin&&c.local?.pin===card.pin;
      });
      if(resolution){result.set(number,{...saved,pin:card.pin});entry.conflicts.find(c=>c.id===resolution.conflictId).resolution='local';}
      else conflict(number,'credentials',{local:card,remote:saved,base:prior??null},ids);
      continue;
    }
    const merged={...saved};
    const monetary=ops.filter(moneyOp),localMoney=monetary.length>0||!equal(card.currentBalance,prior?.currentBalance);
    for (const op of ops) if (saved.lastBalanceCheckedAt && !op.after?.lastBalanceCheckedAt && op.kind==='csv-recovery'
        && op.after?.lastBalanceChecked && op.after.lastBalanceChecked!==saved.lastBalanceChecked)
      conflict(number,'field:lastBalanceChecked',{local:op.after.lastBalanceChecked,remote:saved.lastBalanceChecked,base:op.before?.lastBalanceChecked??null},[op.id]);
    const localUncertainty=card.pendingReconciliation===true&&prior?.pendingReconciliation!==true;
    const assign=(field,value)=>{if(value===undefined)delete merged[field];else merged[field]=value;};
    for(const field of new Set([...Object.keys(card),...Object.keys(saved)])){
      if(['cardNumber','pin','currentBalance','pendingReconciliation'].includes(field))continue;
      if(localMoney&&['dateUpdated','lastBalanceChecked','lastBalanceCheckedAt'].includes(field))continue;
      if(ops.some(o=>o.kind==='unbound-recovery')&&['lastBalanceChecked','lastBalanceCheckedAt'].includes(field)
        &&saved.lastBalanceCheckedAt&&(!card.lastBalanceCheckedAt||card.lastBalanceCheckedAt<=saved.lastBalanceCheckedAt))continue;
      if(saved.lastBalanceCheckedAt && !card.lastBalanceCheckedAt && ['lastBalanceChecked','lastBalanceCheckedAt'].includes(field)) {
        if(field==='lastBalanceChecked' && card.lastBalanceChecked && card.lastBalanceChecked!==saved.lastBalanceChecked)
          conflict(number,'field:'+field,{local:card[field],remote:saved[field]??null,base:prior?.[field]??null},ids);
        continue;
      }
      const entry=next.cards[number];
      const resolution=ops.find(o=>{
        const c=entry?.conflicts?.find(c=>c.id===o.conflictId&&!c.resolution);
        return o.kind==='resolve-conflict'&&o.choice==='local'&&c?.kind==='field:'+field&&equal(c.local,card[field]??null)
          &&(equal(c.remote,saved[field]??null)||equal(c.local,saved[field]??null));
      });
      if(resolution){assign(field,card[field]);entry.conflicts.find(c=>c.id===resolution.conflictId).resolution='local';continue;}
      // A later edit retains its own field baseline across an earlier ACK.
      // Advancing the inventory baseline must not turn a competing edit into LWW.
      const first=ops.find(o=>o.after&&!equal(o.before?.[field],o.after[field]));
      const fieldBase=first?first.before?.[field]:prior?.[field];
      if(equal(card[field],saved[field])||equal(card[field],fieldBase))continue;
      if((prior||first?.before)&&equal(saved[field],fieldBase)&&!ops.some(o=>o.kind==='unbound-recovery'))assign(field,card[field]);
      else if(!prior&&saved[field]===undefined)assign(field,card[field]);
      else if(lowRiskField(field))assign(field,metadataDefault(field,[card[field],saved[field]]));
      else conflict(number,'field:'+field,{local:card[field]??null,remote:saved[field]??null,base:fieldBase??null},ids);
    }
    // Verification date and timestamp form one value. Independent CSV edits can
    // otherwise produce a pair that neither side supplied and cannot be reloaded.
    if (merged.lastBalanceCheckedAt && merged.lastBalanceCheckedAt.slice(0,10) !== merged.lastBalanceChecked) {
      for (const field of ['lastBalanceChecked','lastBalanceCheckedAt']) {
        if (!equal(card[field],saved[field])) conflict(number,'field:'+field,{local:card[field]??null,remote:saved[field]??null,base:prior?.[field]??null},ids);
        assign(field,saved[field]);
      }
    }
    const entry=next.cards[number]??{money:0,conflicts:[]};
    const verify=monetary.filter(o=>['manual-verification','batch-verification'].includes(o.kind)).at(-1);
    const observedAt=verify?.observation?.checkedAt;
    const observedValue=verify?.kind==='manual-verification'?verify.observation?.observedBalance:verify?.observation?.balance;
    const applicable=typeof observedAt==='string'&&Number.isFinite(Date.parse(observedAt))&&new Date(observedAt).toISOString()===observedAt
      &&!recordQuarantined(next,number)
      &&typeof observedValue==='number'&&verify.after?.currentBalance===observedValue
      &&verify.after?.lastBalanceChecked===observedAt.slice(0,10)
      &&(!verify.after?.lastBalanceCheckedAt||verify.after.lastBalanceCheckedAt===observedAt)&&verify.after?.pin===saved.pin
      &&verify.before?.pin===saved.pin&&(verify.after?.merchant||verify.after?.merchantInferred)==='walmart-ca'
      &&(saved.merchant||saved.merchantInferred)==='walmart-ca';
    const fresh=applicable&&monetary.at(-1)===verify
      &&(!saved.lastBalanceChecked||observedAt.slice(0,10)>=saved.lastBalanceChecked)
      &&(!saved.lastBalanceCheckedAt||observedAt>saved.lastBalanceCheckedAt)
      &&Date.parse(observedAt)>=Math.max(Date.parse(entry.uncertainSince||'1970-01-01'),Date.parse(entry.moneyAt||'1970-01-01'),Date.parse(maintenanceRevision(next,number)||'1970-01-01'))
      &&Date.parse(observedAt)<=Date.parse(now)+60_000;
    const changedRemotely=ops.some(o=>o.requiresReconciliation===true)||maintenanceRevision(next,number)!==maintenanceRevision(baseEvidence,number)||ops.some(o=>o.kind==='unbound-recovery')||!prior||(entry.money??0)!==(baseEvidence.cards?.[number]?.money??0)
      || (prior&&(!equal(prior.currentBalance,saved.currentBalance)||!equal(prior.lastBalanceCheckedAt,saved.lastBalanceCheckedAt)));
    // The first conflict must share the same entry as its uncertainty marker.
    // Otherwise a new balance alternative could be replaced by the empty entry.
    if(localMoney||localUncertainty)next.cards[number]=entry;
    if(localMoney&&(changedRemotely||entry.uncertainSince||saved.pendingReconciliation)&&!fresh){
      conflict(number,'balance',{local:card.currentBalance,remote:saved.currentBalance,base:prior?.currentBalance??null},ids);
      entry.uncertainSince??=now;merged.pendingReconciliation=true;
      assign('dateUpdated',saved.dateUpdated);assign('lastBalanceChecked',saved.lastBalanceChecked);assign('lastBalanceCheckedAt',saved.lastBalanceCheckedAt);
    }else if(localMoney){
      merged.currentBalance=card.currentBalance;merged.dateUpdated=card.dateUpdated;
      if (fresh && verify.after?.lastBalanceCheckedAt === undefined) {
        merged.lastBalanceChecked = observedAt.slice(0,10); merged.lastBalanceCheckedAt = observedAt;
      } else if (saved.lastBalanceCheckedAt && (!card.lastBalanceCheckedAt || (verify && !verify.after?.lastBalanceCheckedAt && !fresh))) {
        assign('lastBalanceChecked',saved.lastBalanceChecked);assign('lastBalanceCheckedAt',saved.lastBalanceCheckedAt);
      } else {
        assign('lastBalanceChecked',card.lastBalanceChecked);assign('lastBalanceCheckedAt',card.lastBalanceCheckedAt);
      }
      if(fresh){
        if(saved.pendingReconciliation!==undefined||card.pendingReconciliation!==undefined||entry.uncertainSince)merged.pendingReconciliation=false;
        retireVerificationEvidence(entry);
      }
    }
    if(localMoney&&monetary.length){entry.money=(entry.money??0)+monetary.length;entry.moneyAt=now;}
    if(localUncertainty&&!fresh){merged.pendingReconciliation=true;entry.uncertainSince??=now;}
    if(localMoney||localUncertainty)next.cards[number]=entry;
    if(saved.pendingReconciliation&&!fresh)merged.pendingReconciliation=true;
    if(entry.uncertainSince)merged.pendingReconciliation=true;
    result.set(number,merged);
  }
  const cards=[...result.values()].sort((a,b)=>a.cardNumber.localeCompare(b.cardNumber));
  const repaired=repairRecovery(cards,next,now);
  const compact=compactEvidence(repaired.evidence);
  evidenceMetadata(compact); // Check actual bounded Sheet representation before dispatch.
  return {cards:repaired.cards,evidence:compact};
}

// Replay semantic differences against the acknowledged inventory, never a stale
// array replacement. Missing rows and omitted operations cannot delete records.
export function materialize(base,operations) {
  const cards=mapCards(structuredClone(base));
  for(const op of operations){
    if(!op.after)continue;
    const current=cards.get(op.cardNumber)??structuredClone(op.before??op.after);
    const priorDate=current.lastBalanceChecked,priorTime=current.lastBalanceCheckedAt;
    for(const key of new Set([...Object.keys(op.before??{}),...Object.keys(op.after)])){
      if(!equal(op.before?.[key],op.after[key])){
        if(op.after[key]===undefined)delete current[key];else current[key]=op.after[key];
      }
    }
    if(priorTime && !op.after.lastBalanceCheckedAt){
      const checked=op.observation?.checkedAt;
      if(validLegacyVerification(op,priorTime))current.lastBalanceCheckedAt=checked;
      else {current.lastBalanceChecked=priorDate;current.lastBalanceCheckedAt=priorTime;}
    }
    if(moneyOp(op))current.currentBalance=op.after.currentBalance;
    cards.set(op.cardNumber,current);
  }
  return [...cards.values()];
}

export function validateEvidence(evidence) {
  const map=value=>value&&typeof value==='object'&&!Array.isArray(value);
  if(!map(evidence)||!map(evidence.cards)||!map(evidence.tombstones))throw Error('Synchronization recovery evidence is damaged. Preserve a backup.');
  for(const [number,entry] of Object.entries(evidence.cards)){
    if(!/^63\d{14}$/.test(number)||!map(entry)||!Number.isSafeInteger(entry.money)||entry.money<0||!Array.isArray(entry.conflicts)
      ||entry.conflicts.some(c=>!map(c)||typeof c.id!=='string'||typeof c.kind!=='string'))throw Error('Invalid per-card recovery evidence.');
  }
  for(const [number,tombstone] of Object.entries(evidence.tombstones))if(!/^63\d{14}$/.test(number)||!map(tombstone)||typeof tombstone.id!=='string')throw Error('Invalid deletion recovery evidence.');
  evidenceMetadata(evidence);
  return evidence;
}
