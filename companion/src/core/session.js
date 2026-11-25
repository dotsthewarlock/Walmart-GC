// Shared companion session: parser, atomic import planning, history and explicit foreground execution.
// Development adapter only: admission is restricted to the three invented test credentials.
import {parseWireRequest,validRef,validateWireObservation,formatWireResults} from './wire.js';
import {FIXTURES,observation} from './protocol.js';
export const HISTORY_KEY='gc-companion:synthetic-history:v1';
const clean=s=>s.trim().replace(/^"(.*)"$/,'$1');
export function parseCompanionInput(raw){
 if(typeof raw!=='string'||raw.length>65536)throw Error('Invalid or oversized input');
 const text=raw.replace(/^\uFEFF/,'');
 if(/^\s*WMGC-/im.test(text)){const rows=parseWireRequest(text);return {rows,rejected:[],duplicates:Math.max(0,text.trimEnd().split(/\r?\n/).length-2-rows.length),wallet:true};}
 const rows=new Map(),conflicts=new Set(),rejected=[];let first=true,duplicates=0;
 for(const [i,line] of text.split(/\r?\n/).entries()){
  if(!line.trim())continue;
  const p=line.split(line.includes('\t')?'\t':line.includes(',')?',':'/').map(clean);
  const header=first&&p.length===2&&/^(card(\s*(number|#|no\.?))?|gift\s*card(\s*(number|#))?|gc-number)$/i.test(p[0])&&/^(pin|securitycode|security code)$/i.test(p[1]);first=false;if(header)continue;
  if(p.length!==2||!/^(?:\d{16}|\d{4}(?:[ -]\d{4}){3})$/.test(p[0])||!/^\d{4}$/.test(p[1])){rejected.push(i+1);continue;}
  const cardNumber=p[0].replace(/[ -]/g,''),pin=p[1];
  if(conflicts.has(cardNumber)){rejected.push(i+1);continue;}
  const old=rows.get(cardNumber);if(old){if(old.pin===pin)duplicates++;else{rows.delete(cardNumber);conflicts.add(cardNumber);rejected.push(old.line,i+1);}continue;}
  rows.set(cardNumber,{cardNumber,pin,line:i+1});
 }
 return {rows:[...rows.values()],rejected,duplicates,wallet:false};
}
const fixtureById=id=>FIXTURES.find(f=>f[0]===id);
function admit(r){const f=FIXTURES.find(f=>f[1]===r.cardNumber&&f[2]===r.pin);if(!f)throw Error('Only bundled synthetic credentials are accepted. Nothing imported.');return {fixtureId:f[0],last4:f[1].slice(-4),ref:r.ref??null,line:r.line??null};}
function historyFrom(raw){
 if(raw===null)return [];
 const data=JSON.parse(raw);if(data.version!==1||data.synthetic!==true||!Array.isArray(data.results))throw Error('Invalid history; existing data untouched');
 const ids=new Set(),refs=new Set();return data.results.map(r=>{
  const f=fixtureById(r.fixtureId);
  if(!f||!Number.isSafeInteger(r.id)||r.id<1||ids.has(r.id)||r.last4!==f[1].slice(-4)||r.balanceCAD!==f[3]||!(r.ref===null||validRef(r.ref))||(r.ref&&refs.has(r.ref)))throw Error('Invalid history; existing data untouched');
  observation(f[0],r.balanceCAD,r.checkedAt);ids.add(r.id);if(r.ref)refs.add(r.ref);
  return {id:r.id,fixtureId:r.fixtureId,last4:r.last4,ref:r.ref,balanceCAD:r.balanceCAD,checkedAt:r.checkedAt};
 });
}
export class Session {
 constructor(send,store,change=()=>{}){this.send=send;this.store=store;this.change=change;this.rows=[];this.history=[];this.raw=null;this.state='ready';this.running=false;this.pauseRequested=false;this.cancelled=false;this.issue=false;this.events=[];try{this.raw=store.getItem(HISTORY_KEY);this.history=historyFrom(this.raw);}catch{this.issue=true;this.state='storage-error';}this.nextId=Math.max(0,...this.history.map(r=>r.id))+1;}
 notify(){this.change(this);}
 event(action){this.events.push({action,at:new Date().toISOString()});}
 assertIdle(){if(this.running)throw Error('Pause or abort first');if(this.issue)throw Error('History unavailable or changed. Export results and reopen.');}
 import(raw){
  this.assertIdle();const parsed=parseCompanionInput(raw);const admitted=parsed.rows.map(admit); // all synthetic, all checked before mutation
  const rows=this.rows.map(r=>({...r})), known=new Map(rows.map(r=>[r.fixtureId,r])), historyRefs=new Map(this.history.filter(r=>r.ref).map(r=>[r.ref,r])), refs=new Map(rows.filter(r=>r.ref).map(r=>[r.ref,r]));let next=this.nextId,added=0,linked=0,duplicates=parsed.duplicates,historical=0;
  for(const r of admitted){const old=known.get(r.fixtureId);
   if(r.ref){const prior=refs.get(r.ref)||historyRefs.get(r.ref);if(prior){if(prior.fixtureId!==r.fixtureId)throw Error('Conflicting reference. Nothing imported.');if(prior.state==='skipped')throw Error('Clear skipped queue before reimport');if(prior.balanceCAD)historical++;else duplicates++;continue;}
    if(old){if(old.ref||old.state!=='pending')throw Error('Clear queue before importing a new request for this card');old.ref=r.ref;refs.set(r.ref,old);linked++;continue;}
   }else{if(old){duplicates++;continue;}if(this.history.some(h=>h.fixtureId===r.fixtureId)){historical++;continue;}}
   const row={id:next++,fixtureId:r.fixtureId,last4:r.last4,ref:r.ref,state:'pending'};rows.push(row);known.set(r.fixtureId,row);if(r.ref)refs.set(r.ref,row);added++;
  }
  this.rows=rows;this.nextId=next;if(rows.some(r=>r.state==='pending'))this.state='ready';this.event('import');this.notify();return {added,linked,duplicates,historical,rejected:parsed.rejected.length};
 }
 clear(){if(this.running)throw Error('Pause or abort first');this.rows=[];this.state=this.issue?'storage-error':'ready';this.event('clear-queue');this.notify();}
 skip(){this.assertIdle();const r=this.rows.find(r=>r.state==='pending');if(r){r.state='skipped';this.event('skip');this.notify();}}
 async commit(result){
  const write=()=>{if(this.store.getItem(HISTORY_KEY)!==this.raw)throw Error('History changed');const next=[...this.history,result],raw=JSON.stringify({version:1,synthetic:true,results:next});this.store.setItem(HISTORY_KEY,raw);this.raw=raw;this.history=next;};
  if(this.store.lock)await this.store.lock(write);else write();
 }
 async start({pauseAfter=Infinity}={}){
  if(this.running||this.issue||!this.rows.some(r=>r.state==='pending'))return false;
  this.running=true;this.cancelled=false;this.pauseRequested=false;this.state='running';this.notify();let count=0;
  try{for(const row of this.rows){if(row.state!=='pending')continue;if(this.pauseRequested||this.cancelled)break;
    try{if(this.store.getItem(HISTORY_KEY)!==this.raw)throw Error('History changed');}catch{this.issue=true;break;}
    row.state='checking';this.notify();const start=Date.now();
    try{const r=await this.send({type:'start',ref:row.fixtureId});if(this.cancelled){row.state='pending';break;}if(!r?.ok||r.result?.ref!==row.fixtureId)throw Error('Observation failed');const obs=observation(row.fixtureId,r.result.balanceCAD,r.result.checkedAt,Date.now(),start);const result={id:row.id,fixtureId:row.fixtureId,last4:row.last4,ref:row.ref,balanceCAD:obs.balanceCAD,checkedAt:obs.checkedAt};
     try{await this.commit(result);}catch{this.issue=true;throw Error('History not committed');}Object.assign(row,result,{state:'done'});this.event('observation');count++;
    }catch{row.state='pending';this.state='error';this.event('interrupted');break;}
    this.notify();if(count>=pauseAfter)this.pauseRequested=true;
  }
  this.state=this.issue?'storage-error':this.cancelled?'cancelled':this.state==='error'?'error':this.rows.some(r=>r.state==='pending')?'paused':'complete';return this.state==='complete';
  }finally{this.running=false;this.event(this.state);this.notify();}
 }
 pause(){if(this.running){this.pauseRequested=true;this.notify();}}
 async abort(){if(this.running){this.cancelled=true;this.notify();try{await this.send({type:'abort'});}catch{}}else{this.state='cancelled';this.notify();}}
 walletResults(){return formatWireResults(this.history.filter(r=>r.ref).map(r=>validateWireObservation(r.ref,r.balanceCAD,r.checkedAt)));}
 legacyResults(){const active=new Map(this.rows.map(r=>[r.id,r]));for(const h of this.history)active.set(h.id,{...h,state:'done'});return ['Row\tLast4\tBalance CAD\tLast checked UTC\tStatus',...[...active.values()].sort((a,b)=>a.id-b.id).map(r=>[r.id,r.last4,r.balanceCAD??'',r.checkedAt??'',r.state==='done'?'verified':r.state==='checking'?'pending':r.state].join('\t'))].join('\n');}
}
