(()=>{
 const target='https://www.walmart.ca/en/account/giftcards/balance';
 if(window!==window.top||location.href!==target)return;
 const adapter=createMerchantFields(document,window);let active=null,expiry=null,expiredToken=null;
 const RESPONSE_MS=30000,DIALOG_MS=5000,FORM_SETTLE_MS=1200;const cancelled=new Set();
 function reset(){active=null;clearTimeout(expiry);expiry=null;}
 function armResponse(){active.submitted=true;active.until=Date.now()+RESPONSE_MS;clearTimeout(expiry);const token=active.token;expiry=setTimeout(()=>{expiredToken=token;reset();},RESPONSE_MS);}
 function submitButton(){const buttons=[...(adapter.form()?.querySelectorAll('button[type="submit"]')??[])].filter(b=>b.textContent.trim()==='Check Balance'&&adapter.visible(b)&&!b.disabled&&b.getAttribute('aria-disabled')!=='true');return buttons.length===1?buttons[0]:null;}
 function safeContext(){return location.href===target&&!document.hidden&&!document.getElementById('wmgc-helper-v01');}
 document.addEventListener('click',e=>{
   if(!e.isTrusted||!active||!safeContext())return;
   const b=e.target.closest?.('button[type="submit"]');
   if(!b||!adapter.form()?.contains(b))return;
   if(active.submitted||adapter.dialogs().length||!adapter.matches(active.number,active.pin)||b.textContent.trim()!=='Check Balance'){reset();return;}
   armResponse();
 },true);
 document.addEventListener('input',e=>{if(e.isTrusted&&active&&adapter.fields().includes(e.target))reset();},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 window.addEventListener('pagehide',reset);
 chrome.runtime.onMessage.addListener((m,s,reply)=>{
   if(s.id!==chrome.runtime.id||!['assist-fill','assist-read','assist-reset','assist-finish','assist-submit'].includes(m?.type))return false;
   if(m.type==='assist-reset'){if(typeof m.token==='string'){cancelled.add(m.token);setTimeout(()=>cancelled.delete(m.token),120000);}if(active?.token===m.token)reset();reply({ok:true});return false;}
   if(!safeContext()){reset();reply({ok:false,state:'unavailable'});return false;}
   if(m.type==='assist-fill'){
     reset();expiredToken=null;const {number,pin,token}=m;
     if(typeof token!=='string'||cancelled.has(token)||!/^[0-9a-f-]{36}$/.test(token)||typeof number!=='string'||typeof pin!=='string'||!adapter.fill(number,pin)){reply({ok:false,state:'unavailable'});return false;}
     active={number,pin,token,submitted:false,until:Date.now()+120000};expiry=setTimeout(reset,120000);reply({ok:true});return false;
   }
   if(m.type==='assist-read'&&expiredToken===m.token){reply({ok:false,state:'timeout'});return false;}
   if(!active||active.token!==m.token||Date.now()>active.until){if(active?.token===m.token)reset();reply({ok:false,state:'unavailable'});return false;}
   // A foreground session authorizes this single submission. Each token is single-use; the adapter never queues another request.
   if(m.type==='assist-submit'){
     const button=submitButton();
     if(active.submitted||active.observed||!button||adapter.dialogs().length||!adapter.matches(active.number,active.pin)){reply({ok:false,state:'unavailable'});return false;}
     armResponse();button.click();reply({ok:true});return false;
   }
   if(m.type==='assist-finish'){
     const saved=active;
     if(!saved.observed||saved.finishing){reply({ok:false,state:'unavailable'});return false;}
     saved.finishing=true;
     if(!adapter.dismissSaved(saved.number,saved.pin,saved.observed.balance,saved.dialog)){reset();reply({ok:false,state:'blocked'});return false;}
     const until=Date.now()+DIALOG_MS;let readySince=null;
     function ready(){
       if(active!==saved||!safeContext()){reply({ok:false,state:'unavailable'});return;}
       const ds=adapter.dialogs();const fs=adapter.fields();
       if(ds.some(d=>d!==saved.dialog)){reset();reply({ok:false,state:'blocked'});return;}
       if(!ds.length&&fs.every(f=>adapter.visible(f)&&!f.disabled&&!f.readOnly)){
         readySince??=Date.now();if(Date.now()-readySince>=FORM_SETTLE_MS){reset();reply({ok:true,state:'ready'});return;}
       }else readySince=null;
       if(Date.now()>=until){reset();reply({ok:false,state:'unavailable'});return;}
       setTimeout(ready,80);
     }
     ready();return true;
   }
   if(active.observed){reply({ok:false,state:'awaiting-save'});return false;}
   if(!active.submitted){if(adapter.dialogs().length){reset();reply({ok:false,state:'blocked'});}else reply({ok:false,state:'waiting'});return false;}
   const result=adapter.read(active.number,active.pin);
   if(result.state==='observed'){clearTimeout(expiry);expiry=null;active.until=Date.now()+30000;active.observed=result;active.dialog=adapter.resultDialog();}
   else if(result.state!=='waiting')reset();
   reply({ok:result.state==='observed',...result,...(result.state==='waiting'?{submitted:true}:{})});return false;
 });
})();
