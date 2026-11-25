// Shared Batch v1 wire rules, extracted from the accepted helper contract.
// This module does not access a page, submit a form, or persist credentials.
export const REQUEST_HEAD='WMGC-REQUEST\t1\nref\tcardNumber\tpin';
export const HEAD='WMGC-RESULT\t1\nref\tbalanceCAD\tcheckedAt';
export const validRef=r=>typeof r==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r);
export function parseWireRequest(text){
 if(typeof text!=='string')throw Error('Invalid wallet request');
 const lines=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').split('\n');
 while(lines.length&&!lines.at(-1).trim())lines.pop();
 if(lines[0]+'\n'+lines[1]!==REQUEST_HEAD||lines.length<3)throw Error('Invalid wallet request header');
 const refs=new Map(),numbers=new Set();
 for(let i=2;i<lines.length;i++){
  const parts=lines[i].split('\t'),[ref,cardNumber,pin]=parts;
  if(parts.length!==3||!validRef(ref)||!/^\d{16}$/.test(cardNumber)||!/^\d{4}$/.test(pin))throw Error('Invalid wallet request row');
  const old=refs.get(ref);if(old){if(old.cardNumber!==cardNumber||old.pin!==pin)throw Error('Conflicting wallet reference');continue;}
  if(numbers.has(cardNumber))throw Error('Multiple references for same card');
  refs.set(ref,{ref,cardNumber,pin});numbers.add(cardNumber);
 }
 return [...refs.values()];
}
export function validateWireObservation(ref,amount,at,now=Date.now(),earliest=0){
 if(!validRef(ref)||typeof amount!=='string'||!/^\d+\.\d{2}$/.test(amount)||amount.length>32||BigInt(amount.replace('.',''))>BigInt(Number.MAX_SAFE_INTEGER)||typeof at!=='string'||!Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at||Date.parse(at)<earliest||Date.parse(at)>now+60000)throw Error('Invalid observation');
 return {ref,balanceCAD:amount,checkedAt:at};
}
export function formatWireResults(results){
 const refs=new Set();const lines=results.map(r=>{const o=validateWireObservation(r.ref,r.balanceCAD,r.checkedAt);if(refs.has(o.ref))throw Error('Duplicate result');refs.add(o.ref);return [o.ref,o.balanceCAD,o.checkedAt].join('\t');});
 return HEAD+(lines.length?'\n'+lines.join('\n'):'');
}
