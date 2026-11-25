// Data only, never executable code or arbitrary URLs. Loopback simulator until hosting is authorized.
const RELEASE_URL='http://127.0.0.1:8765/release.json';
function parts(v){if(typeof v!=='string'||!/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(v))return null;return v.split('.').map(Number);}
export function classifyRelease(data,installed){
 const local=parts(installed),remote=parts(data?.extensionVersion);
 if(!local||!remote||data.engineVersion!==data.extensionVersion||data.protocolVersion!==1||data.channel!=='synthetic-development'||data.merchantEnabled!==false||typeof data.sourceSha256!=='string'||!/^\w{64}$/.test(data.sourceSha256)||!(/^[a-f0-9]{64}$/).test(data.sourceSha256)||data.extensionDownload!=='/companion/extension.zip')return {status:'unverified'};
 const delta=remote.findIndex((n,i)=>n!==local[i]);return {status:delta<0?'current':remote[delta]>local[delta]?'update-available':'installed-newer',version:data.extensionVersion};
}
export async function checkRelease(installed,fetcher=fetch){
 try{const r=await fetcher(RELEASE_URL,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(2500)});if(!r.ok)return {status:'unverified'};const text=await r.text();if(text.length>4096)return {status:'unverified'};return classifyRelease(JSON.parse(text),installed);}catch{return {status:'unverified'};}
}
