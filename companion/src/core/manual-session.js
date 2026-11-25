// Manual observations only. No merchant networking, DOM access or submission.
import {parseCompanionInput} from './session.js';
import {validRef,validateWireObservation,formatWireResults} from './wire.js';
export const MANUAL_KEY='gc-companion:manual-history:v1';
const sentinel='00000000-0000-4000-8000-000000000000';
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
export function normalizeAmount(value){
 if(typeof value!=='string'||!/^\d{1,16}(?:\.\d{1,2})?$/.test(value.trim()))throw Error('Enter a CAD amount with up to two decimal places');
 const [a,b='']=value.trim().split('.');const amount=BigInt(a).toString()+'.'+b.padEnd(2,'0');
 return validateWireObservation(sentinel,amount,new Date().toISOString()).balanceCAD;
}
// Strict compatibility reader for the original noncredential helper history format.
// Never copies unrecognized fields; rejects ambiguous records as a unit.
export function readHistory(raw){
 if(typeof raw!=='string'||raw.length>2_000_000)throw Error('Invalid history');
 const d=JSON.parse(raw);if(d.version!==1||!Array.isArray(d.results)||d.results.length>10000|| (d.salt!==undefined&&!/^[a-f0-9]{32}$/.test(d.salt)))throw Error('Invalid history');
 const ids=new Set(),refs=new Set();const results=d.results.map(r=>{
  if(!r||typeof r.last4!=='string'||!Number.isSafeInteger(r.id)||r.id<1||r.id>=Number.MAX_SAFE_INTEGER||ids.has(r.id)||!/^\d{4}$/.test(r.last4)||typeof r.checkedAt!=='string'||!Number.isFinite(Date.parse(r.checkedAt)))throw Error('Invalid history record');
  if(r.fingerprint!==undefined&&(!d.salt||!/^([a-f0-9]{64})$/.test(r.fingerprint)))throw Error('Invalid history fingerprint');
  if(r.walletRef!==undefined&&(!validRef(r.walletRef)||!r.fingerprint||refs.has(r.walletRef)))throw Error('Invalid history reference');
  const checkedAt=new Date(r.checkedAt).toISOString();const balance=validateWireObservation(r.walletRef??sentinel,r.balance,checkedAt).balanceCAD;
  ids.add(r.id);if(r.walletRef)refs.add(r.walletRef);
  return {id:r.id,last4:r.last4,balance,checkedAt,...(r.fingerprint?{fingerprint:r.fingerprint}:{}),...(r.walletRef?{walletRef:r.walletRef}:{})};
 });return {version:1,salt:d.salt,results:results.sort((a,b)=>a.id-b.id)};
}
export function reviewProgress(rows){const total=rows.length,verified=rows.filter(r=>r.state==='verified').length,skipped=rows.filter(r=>r.state==='skipped').length;return {total,verified,skipped,reviewed:verified+skipped,pending:total-verified-skipped};}
export class ManualSession{
 constructor(store,cryptoApi=globalThis.crypto){this.store=store;this.crypto=cryptoApi;this.rows=[];this.history=[];this.raw=null;this.issue=false;this.busy=false;this.active=null;this.stopped=false;this.nextId=1;try{this.raw=store.getItem(MANUAL_KEY);const h=this.raw===null?{results:[]}:readHistory(this.raw);this.salt=h.salt??hex(cryptoApi.getRandomValues(new Uint8Array(16)));this.history=h.results;this.nextId=this.history.reduce((n,r)=>Math.max(n,r.id+1),1);}catch{this.issue=true;}}
 async fingerprint(n){return hex(new Uint8Array(await this.crypto.subtle.digest('SHA-256',new TextEncoder().encode(this.salt+':'+n))));}
 assertReady(){if(this.issue||this.busy||this.active!==null||this.stopped)throw Error('Session is busy, stopped or storage unavailable');}
 async import(raw){this.assertReady();this.busy=true;try{const parsed=parseCompanionInput(raw),rows=this.rows.map(r=>({...r}));let next=this.nextId,added=0,linked=0,duplicates=parsed.duplicates,historical=0,rejected=parsed.rejected.length;
  for(const r of parsed.rows){const fp=await this.fingerprint(r.cardNumber);if(this.stopped)throw Error('Session stopped');const old=rows.find(x=>x.cardNumber===r.cardNumber);const prior=r.ref&&(rows.find(x=>x.walletRef===r.ref)||this.history.find(x=>x.walletRef===r.ref));
   if(prior){if(prior.fingerprint!==fp||(prior.pin!==undefined&&prior.pin!==r.pin))throw Error('Conflicting reference. Nothing imported.');if(prior.state==='skipped')throw Error('Clear queue before reimporting skipped request');if(prior.balance!==undefined)historical++;else duplicates++;continue;}
   if(old){if(r.ref){if(old.pin!==r.pin||old.walletRef||old.state!=='pending')throw Error('Clear queue before importing a new request for this card');old.walletRef=r.ref;linked++;}else if(old.pin!==r.pin)rejected++;else duplicates++;continue;}
   if(!r.ref&&this.history.some(h=>h.fingerprint===fp)){historical++;continue;}
   rows.push({id:next++,cardNumber:r.cardNumber,pin:r.pin,last4:r.cardNumber.slice(-4),fingerprint:fp,walletRef:r.ref,state:'pending'});added++;
  }this.rows=rows;this.nextId=next;return {added,linked,duplicates,historical,rejected};}finally{this.busy=false;}}
 begin(id=null){this.assertReady();const r=this.rows.find(r=>r.state==='pending'&&(id===null||r.id===id));if(!r)throw Error('No pending card selected');this.active=r.id;return r;}
 pause(){if(this.busy)throw Error('Wait for save or import to finish');this.active=null;}
 stop(){this.stopped=true;this.active=null;this.rows=[];}
 skip(){this.assertReady();const r=this.rows.find(r=>r.state==='pending');if(r)r.state='skipped';}
 clear(){this.assertReady();this.rows=[];}
 async clearResults(){this.assertReady();this.busy=true;try{await this.write([]);this.rows=this.rows.filter(r=>r.state!=='verified');}catch{this.issue=true;throw Error('Results were not cleared; reopen after checking existing history');}finally{this.busy=false;}}
 async discardObservation(id){this.assertReady();const row=this.rows.find(r=>r.id===id&&r.state==='verified');if(!row||!this.history.some(r=>r.id===id))throw Error('Observation unavailable');this.busy=true;try{await this.write(this.history.filter(r=>r.id!==id));delete row.balance;delete row.checkedAt;row.state='pending';}catch{this.issue=true;throw Error('Observation was not discarded; reopen after checking existing history');}finally{this.busy=false;}}
 async write(history,salt=this.salt){if(!this.store.lock)throw Error('Storage lock unavailable');await this.store.lock(()=>{if(this.stopped)throw Error('Session stopped');if(this.store.getItem(MANUAL_KEY)!==this.raw)throw Error('History changed in another tab');const raw=JSON.stringify({version:1,salt,results:history});this.store.setItem(MANUAL_KEY,raw);this.raw=raw;this.history=history;this.salt=salt;});}
 async confirm(id,value,observed){if(this.issue||this.busy||this.stopped||id!==this.active||observed!==true)throw Error('Confirm the actual observation for the selected card');const r=this.rows.find(r=>r.id===id&&r.state==='pending');if(!r)throw Error('No active card');const balance=normalizeAmount(value),checkedAt=new Date().toISOString();const result={id:r.id,last4:r.last4,balance,checkedAt,fingerprint:r.fingerprint,...(r.walletRef?{walletRef:r.walletRef}:{})};this.busy=true;try{await this.write([...this.history,result]);Object.assign(r,result,{state:'verified'});this.active=null;}catch{this.issue=true;throw Error('Result was not saved; reopen after checking existing history');}finally{this.busy=false;}}
 async restoreOriginal(raw){this.assertReady();if(this.rows.length||this.history.length||this.raw!==null)throw Error('Restore only into an unused manual history; existing records untouched');const d=readHistory(raw);this.busy=true;try{await this.write(d.results,d.salt??this.salt);this.nextId=d.results.reduce((n,r)=>Math.max(n,r.id+1),1);}catch{this.issue=true;throw Error('History restore not committed');}finally{this.busy=false;}}
 historyBackup(){return JSON.stringify({version:1,salt:this.salt,results:this.history});}
 walletResults(){return formatWireResults(this.history.filter(r=>r.walletRef).map(r=>({ref:r.walletRef,balanceCAD:r.balance,checkedAt:r.checkedAt})));}
 legacyResults(){const all=new Map(this.rows.map(r=>[r.id,r]));for(const r of this.history)all.set(r.id,{...r,state:'verified'});return ['Row\tLast4\tBalance CAD\tLast checked UTC\tStatus',...[...all.values()].sort((a,b)=>a.id-b.id).map(r=>[r.id,r.last4,r.balance??'',r.checkedAt??'',r.state].join('\t'))].join('\n');}
}
