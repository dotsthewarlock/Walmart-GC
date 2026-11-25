import {pageKind} from './navigation.js';
import {checkRelease} from './release-check.js';
import {checkMerchant,merchantEvidence,sanitizeEvidence,EVIDENCE_KEY,isMerchantTarget} from './merchant-compat.js';
const $=id=>document.getElementById(id);let tab=null,busy=false,evidence={status:'not-tested',at:null};
function render(){const kind=pageKind(tab?.url);$('manual').textContent=kind==='checker'?'Open / resume overlay':'Open Walmart checker';$('checker').hidden=true;$('context').textContent=({wallet:'GC Wallet is open',checker:'Walmart checker is open',merchant:'Walmart site is open',other:'Ready for manual review'})[kind]; $('merchantStatus').textContent=evidence.status==='context-verified'?'Read-only script context verified':evidence.status==='user-blocked'?'Stopped: user reported denial or challenge':evidence.status.replaceAll('-',' ');$('probe').disabled=busy||evidence.status==='user-blocked'||!isMerchantTarget(tab?.url)||!$('confirmed').checked;$('blocked').disabled=busy||evidence.status==='user-blocked';$('confirmed').disabled=busy||evidence.status==='user-blocked'||!isMerchantTarget(tab?.url);$('targetStatus').textContent=isMerchantTarget(tab?.url)?'Official checker is the active tab.':'Open the official checker normally first, if permitted.';}
async function save(value){evidence=value;try{await chrome.storage.session.set({[EVIDENCE_KEY]:value});}catch{$('saveStatus').textContent='Evidence could not be saved; report this manually.';}render();}
$('open').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('companion.html')});
$('external').onclick=()=>chrome.tabs.create({url:'http://localhost:8765/launcher.html'});
$('confirmed').onchange=render;
$('blocked').onclick=async()=>{if(busy||evidence.status==='user-blocked')return;busy=true;render();await save(merchantEvidence('user-blocked'));busy=false;render();};
$('probe').onclick=async()=>{if(busy||evidence.status==='user-blocked'||!$('confirmed').checked||!isMerchantTarget(tab?.url))return;busy=true;render();try{const active=(await chrome.tabs.query({active:true,currentWindow:true}))[0];const result=active?.id===tab.id?await checkMerchant(chrome,active,true):merchantEvidence('not-target');await save(result);}catch{await save(merchantEvidence('permission-denied'));}finally{busy=false;render();}};
(async()=>{try{const stored=await chrome.storage.session.get(EVIDENCE_KEY);evidence=sanitizeEvidence(stored[EVIDENCE_KEY]);tab=(await chrome.tabs.query({active:true,currentWindow:true}))[0];}catch{$('saveStatus').textContent='Compatibility check unavailable.';}render();})();

$('releaseCheck').onclick=async()=>{const b=$('releaseCheck');b.disabled=true;try{const r=await checkRelease(chrome.runtime.getManifest().version);$('releaseStatus').textContent=r.status==='unverified'?'Release host unavailable or invalid (local test only)':r.status==='current'?'Release current: '+r.version:r.status==='update-available'?'Update available: '+r.version+' (use cumulative ZIP)':'Installed build is newer';}finally{b.disabled=false;}};

const links={manual:'open-review',checker:'open-checker',walletLink:'open-wallet'};
for(const [id,type] of Object.entries(links))$(id).onclick=async()=>{for(const k of Object.keys(links))$(k).disabled=true;try{let r;if(id==='manual'){if(pageKind(tab?.url)==='checker'){r=await chrome.tabs.sendMessage(tab.id,{type:'show-overlay'});}else r=await chrome.runtime.sendMessage({type:'open-checker'});}else r=await chrome.runtime.sendMessage({type});if(!r?.ok)throw Error();window.close();}catch{$('navStatus').textContent='Overlay unavailable. Refresh the normally accessible checker, or use separate review in Diagnostics.';}finally{for(const k of Object.keys(links))$(k).disabled=false;}};


$('fallbackReview').onclick=async()=>{try{const r=await chrome.runtime.sendMessage({type:'open-review'});if(!r?.ok)throw Error();window.close();}catch{$('navStatus').textContent='Could not open separate review.';}};
