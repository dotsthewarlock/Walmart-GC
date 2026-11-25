// Explicit overlay copy only. Chrome 157+ supports clipboardWrite in extension workers.
// No document-policy changes, storage, clipboard reading or logging.
import {overlayAllowed} from './navigation.js';
import {HEAD,validateWireObservation} from './wire.js';
export function copyAllowed(m,s,id,base){
 if(!overlayAllowed(s,id,base)||m?.type!=='clipboard-copy'||Object.keys(m).sort().join(',')!=='kind,text,type'||typeof m.text!=='string'||m.text.length>2_000_000)return false;
 const t=m.text;
 if(m.kind==='number')return /^\d{16}$/.test(t);
 if(m.kind==='pin')return /^\d{4}$/.test(t);
 if(m.kind==='wallet'){
  const [first,header,...rows]=t.split('\n');if(first+'\n'+header!==HEAD||!rows.length)return false;
  try{const refs=new Set();for(const row of rows){const parts=row.split('\t');if(parts.length!==3||refs.has(parts[0]))return false;validateWireObservation(...parts);refs.add(parts[0]);}return true;}catch{return false;}
 }
 if(m.kind==='legacy'){
  const [header,...rows]=t.split('\n');return header==='Row\tLast4\tBalance CAD\tLast checked UTC\tStatus'&&rows.length>0&&rows.every(row=>/^\d+\t\d{4}\t(?:\d+\.\d{2})?\t(?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)?\t(?:pending|verified|skipped)$/.test(row));
 }
 return false;
}
export async function copyExplicit(m,s,api,clipboard){
 if(!copyAllowed(m,s,api.runtime.id,api.runtime.getURL(''))||typeof clipboard?.writeText!=='function')return {ok:false};
 try{await clipboard.writeText(m.text);return {ok:true};}catch{return {ok:false};}
}
