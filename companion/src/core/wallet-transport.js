// Ephemeral extension transport. Batch v1 remains the request/result authority.
import {parseWireRequest, validRef, HEAD, validateWireObservation, formatWireResults} from './wire.js';
export const WALLET_ORIGIN='https://walmart-gc.dotsthewarlock.com';
export const TRANSPORT_VERSION=1;
const keys=(m,names)=>m&&Object.keys(m).sort().join(',')===names.sort().join(',');
export function walletSender(s){
 try{const u=new URL(s?.url);return !s.id&&s.origin===WALLET_ORIGIN&&u.origin===WALLET_ORIGIN&&u.pathname==='/'&&s.frameId===0&&Number.isInteger(s.tab?.id)&&typeof s.documentId==='string'&&s.documentId.length>0;}catch{return false;}
}
const identity=s=>JSON.stringify([s.tab.id,s.documentId,s.frameId]);
export class WalletTransport{
 constructor(now=Date.now){this.now=now;this.transfer=null;}
 expire(){if(this.transfer&&this.now()>=this.transfer.expires)this.transfer=null;}
 external(m,s){
  this.expire();if(!walletSender(s)||m?.version!==TRANSPORT_VERSION||!validRef(m?.sessionId))return {ok:false};
  // A fresh authorized document in the same tab retires its predecessor.
  // It may start a new transfer, but cannot retrieve the old document's results.
  if(this.transfer?.tabId===s.tab.id&&this.transfer.owner!==identity(s))this.transfer=null;
  const own=this.transfer?.owner===identity(s)&&this.transfer?.sessionId===m.sessionId;
  if(m.type==='wallet-transfer-request'&&keys(m,['type','version','sessionId','packet'])){
   if(this.transfer||typeof m.packet!=='string'||m.packet.length>200000)return {ok:false};
   try{const rows=parseWireRequest(m.packet);if(rows.length>1000)return {ok:false};this.transfer={owner:identity(s),tabId:s.tab.id,sessionId:m.sessionId,packet:m.packet,refs:new Set(rows.map(r=>r.ref)),results:new Map(),receiver:null,created:this.now(),expires:this.now()+30*60000};return {ok:true,version:1,sessionId:m.sessionId};}catch{return {ok:false};}
  }
  if(!own||!keys(m,['type','version','sessionId']))return {ok:false};
  if(m.type==='wallet-transfer-cancel'){this.transfer=null;return {ok:true,version:1,sessionId:m.sessionId};}
  if(m.type==='wallet-transfer-results')return {ok:true,version:1,sessionId:m.sessionId,packet:this.transfer.results.size?formatWireResults([...this.transfer.results.values()]):null};
  return {ok:false};
 }
 internal(m,s,authorized){
  this.expire();if(!authorized||!Number.isInteger(s?.tab?.id)||typeof s.documentId!=='string'||!s.documentId||m?.version!==1)return {ok:false};
  const t=this.transfer;if(!t)return {ok:false};
  if(m.type==='wallet-transfer-take'&&keys(m,['type','version'])&&!t.receiver&&t.packet){
   t.receiver=identity(s);t.receiverTab=s.tab.id;const packet=t.packet;t.packet=null;
   return {ok:true,version:1,sessionId:t.sessionId,packet};
  }
  if(m.type!=='wallet-transfer-return'||!keys(m,['type','version','sessionId','packet'])||m.sessionId!==t.sessionId||t.receiver!==identity(s)||typeof m.packet!=='string'||m.packet.length>200000)return {ok:false};
  try{
   const [a,b,...lines]=m.packet.split('\n');if(a+'\n'+b!==HEAD||!lines.length||lines.length>1000)throw Error();
   const results=new Map(t.results);
   for(const line of lines){const parts=line.split('\t');if(parts.length!==3)throw Error();const observation=validateWireObservation(...parts,this.now(),t.created);if(!t.refs.has(observation.ref))throw Error();const old=results.get(observation.ref);if(old&&JSON.stringify(old)!==JSON.stringify(observation))throw Error();results.set(observation.ref,observation);}
   t.results=results;return {ok:true,version:1,sessionId:t.sessionId};
  }catch{return {ok:false};}
 }
 removed(id){if(this.transfer?.tabId===id)this.transfer=null;else if(this.transfer?.receiverTab===id){this.transfer.packet=null;this.transfer.receiver=null;}}
}
