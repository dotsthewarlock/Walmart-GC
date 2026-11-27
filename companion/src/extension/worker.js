import {copyExplicit} from './clipboard.js';
import {createNavigator,navigationAllowed,overlayAllowed} from './navigation.js';
import {Coordinator} from './coordinator.js';
import {VERSION,validStart,allowedExternal} from './protocol.js';
import {sanitizeEvidence,EVIDENCE_KEY} from './merchant-compat.js';
import {WalletTransport} from './wallet-transport.js';
const walletTransport=new WalletTransport();
const c=new Coordinator(chrome);const navigate=createNavigator(chrome);
function owner(s,mode){return mode+':'+(s.tab?.id??'page')+':'+(s.documentId??s.url);}
async function ping(mode){let evidence={status:'not-tested',at:null};try{const stored=await chrome.storage.session.get(EVIDENCE_KEY);evidence=sanitizeEvidence(stored[EVIDENCE_KEY]);}catch{}return {ok:true,version:VERSION,mode,capabilities:['synthetic-batch-v1','manual-context-diagnostic'],merchant:false,merchantCompatibility:evidence};}
function launch(m,s,reply,mode){const who=owner(s,mode);if(m?.type==='ping'&&Object.keys(m).length===1){ping(mode).then(reply,()=>reply({ok:false,error:'Ping failed'}));return true;}if(m?.type==='abort'&&Object.keys(m).length===1){reply(c.abort(who));return false;}if(!validStart(m)){reply({ok:false,error:'Only known synthetic references are allowed'});return false;}c.run(mode,who,m.ref).then(reply,()=>reply({ok:false,error:'Coordinator failure'}));return true;}
chrome.runtime.onMessage.addListener((m,s,reply)=>{if(s.id!==chrome.runtime.id){reply({ok:false,error:'Sender denied'});return false;}if((typeof m?.type==='string'&&m.type.startsWith('wallet-transfer-'))){reply(walletTransport.internal(m,s,overlayAllowed(s,chrome.runtime.id,chrome.runtime.getURL(''))));return false;}if(m?.type==='clipboard-copy'){copyExplicit(m,s,chrome,globalThis.navigator?.clipboard).then(reply,()=>reply({ok:false}));return true;}if(['assist-fill','assist-read','assist-reset','assist-finish','assist-submit'].includes(m?.type)){
 if(!overlayAllowed(s,chrome.runtime.id,chrome.runtime.getURL(''))||!Number.isInteger(s.tab?.id)){reply({ok:false,state:'unavailable'});return false;}
 const keys=Object.keys(m).sort().join(',');if((m.type==='assist-fill'&&keys!=='number,pin,token,type')||(m.type==='assist-read'&&keys!=='token,type')||(['assist-reset','assist-finish','assist-submit'].includes(m.type)&&keys!=='token,type')){reply({ok:false,state:'unavailable'});return false;}
 chrome.tabs.sendMessage(s.tab.id,m,{frameId:0}).then(r=>reply(r??{ok:false,state:'unavailable'}),()=>reply({ok:false,state:'unavailable'}));return true;
 }if(m?.type==='authorize-overlay'){reply({ok:Object.keys(m).length===1&&overlayAllowed(s,chrome.runtime.id,chrome.runtime.getURL(''))});return false;}if(['open-review','open-checker','open-wallet'].includes(m?.type)){if(Object.keys(m).length!==1||!navigationAllowed(s,chrome.runtime.id,chrome.runtime.getURL(''),m.type)){reply({ok:false,error:'Navigation sender denied'});return false;}navigate(m.type).then(reply,()=>reply({ok:false,error:'Navigation unavailable'}));return true;}if((['lab.html','companion.html'].some(p=>s.url===chrome.runtime.getURL(p)))&&s.frameId===0)return launch(m,s,reply,'internal');if(m?.type==='ready'||m?.type==='observed'){reply(c.accept(m,s));return false;}reply({ok:false,error:'Sender denied'});return false;});
chrome.runtime.onMessageExternal.addListener((m,s,reply)=>{if((typeof m?.type==='string'&&m.type.startsWith('wallet-transfer-'))){reply(walletTransport.external(m,s));return false;}if(!allowedExternal(s)){reply({ok:false,error:'External origin denied'});return false;}return launch(m,s,reply,'external');});
chrome.tabs.onRemoved.addListener(id=>{c.removed(id);walletTransport.removed(id);});
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.status==='loading')walletTransport.removed(id);});
