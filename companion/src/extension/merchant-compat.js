// Compatibility probe only. No merchant form adapter, submissions or balance reads.
export const MERCHANT_URL='https://www.walmart.ca/en/account/giftcards/balance';
export const EVIDENCE_KEY='merchantCompatibilityV030';
const states=new Set(['not-tested','user-blocked','not-target','permission-denied','context-verified','context-unverified']);
export function merchantEvidence(status, at=new Date().toISOString()){
 if(!states.has(status)||typeof at!=='string'||!Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at)throw Error('Invalid compatibility evidence');
 return {status,at};
}
export function sanitizeEvidence(value){try{return merchantEvidence(value.status,value.at);}catch{return {status:'not-tested',at:null};}}
export function isMerchantTarget(url){return url===MERCHANT_URL;}
// Serialized into an explicitly selected top-level tab, in the default isolated world.
// Returns only a fixed marker and a readiness enum; does not inspect the DOM or card values.
export function readContext(){
 if(location.origin!=='https://www.walmart.ca'||location.pathname!=='/en/account/giftcards/balance'||location.search||location.hash||window!==window.top)return {marker:'wrong-context'};
 return {marker:'expected-context',ready:['loading','interactive','complete'].includes(document.readyState)?document.readyState:'unknown'};
}
export async function checkMerchant(api,tab,confirmed){
 if(confirmed!==true)return merchantEvidence('context-unverified');
 if(!Number.isInteger(tab?.id)||!isMerchantTarget(tab.url))return merchantEvidence('not-target');
 try{
  const results=await api.scripting.executeScript({target:{tabId:tab.id,frameIds:[0]},func:readContext});
  const latest=await api.tabs.get(tab.id);
  const r=results?.length===1&&results[0]?.frameId===0?results[0].result:null;
  return merchantEvidence(isMerchantTarget(latest.url)&&r?.marker==='expected-context'&&['interactive','complete'].includes(r.ready)?'context-verified':'context-unverified');
 }catch{return merchantEvidence('permission-denied');}
}
