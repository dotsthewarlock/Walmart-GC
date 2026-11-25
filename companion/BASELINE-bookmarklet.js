(() => {
  'use strict';
  if (location.origin !== 'https://www.walmart.ca' || location.pathname.replace(/\/$/, '') !== '/en/account/giftcards/balance') {
    alert('Open the Walmart Canada gift card balance page first.'); return;
  }
  const ID = 'wmgc-helper-v01';
  if (document.getElementById(ID)) { alert('A helper is already open. Close it before starting a new session.'); return; }
  const form = () => document.querySelector('#check-gift-card-balance-form');
  const fields = () => { const f = form(); return [f?.querySelector('input[name="gc-number"]'), f?.querySelector('input[name="securitycode"]')]; };
  const visible = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const dialogs = () => [...document.querySelectorAll('[role="dialog"]')].filter(visible);
  const resultDialog = () => dialogs().find(d => d.querySelector('.cardnumber') && d.querySelector('.balance') && [...d.querySelectorAll('h2')].some(h => h.textContent.trim() === 'Gift card balance'));
  if (fields().some(x => !x)) { alert('Gift card form not found. No changes made.'); return; }
  const host = document.createElement('div'); host.id = ID;
  Object.assign(host.style, {position:'fixed', bottom:'12px', right:'12px', zIndex:'2147483646', width:'min(335px, calc(100vw - 24px))'});
  const root = host.attachShadow({mode:'closed'});
  const box = document.createElement('section');
  Object.assign(box.style,{background:'#f8f9ff',color:'#1b1b1f',font:'13px/1.45 system-ui,Arial,sans-serif',border:'1px solid #c5c6d0',borderRadius:'16px',padding:'12px',boxShadow:'0 4px 16px #0002',boxSizing:'border-box',maxHeight:'calc(100dvh - 16px)',overflow:'auto'});
  const style=document.createElement('style');
  style.textContent=`button,input,textarea{font-family:inherit} button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #2859a7;outline-offset:2px} button:disabled{cursor:default!important} button:not(:disabled):hover{filter:brightness(.96)} [hidden]{display:none!important} textarea::placeholder{color:#62636d} input[type=checkbox]{accent-color:#2859a7;width:18px;height:18px;margin:0;flex:none} button{box-sizing:border-box} `;
  root.append(style,box); document.body.append(host);
  function element(tag, text, parent=box) { const e=document.createElement(tag); e.textContent=text; parent.append(e); return e; }
  const header=element('div','');
  Object.assign(header.style,{display:'flex',alignItems:'center',gap:'5px',background:'#e4e9f7',borderRadius:'12px',padding:'4px 6px'});
  const grip=element('span','⠿',header);
  grip.title='Drag to move'; grip.setAttribute('aria-label','Drag to move'); grip.setAttribute('data-grip','true'); Object.assign(grip.style,{display:'inline-flex',alignItems:'center',justifyContent:'center',flex:'0 0 18px',width:'18px',height:'18px',cursor:'grab',touchAction:'none',userSelect:'none',fontSize:'16px',color:'#526477',borderRadius:'3px'});
  const title=element('strong','WM GC Helper · v0.3.0',header); Object.assign(title.style,{flex:'1',fontSize:'13px'});
  const toggle=element('button','−',header); toggle.type='button'; toggle.title='Minimize or expand'; toggle.setAttribute('aria-label','Minimize helper'); toggle.setAttribute('aria-expanded','true'); Object.assign(toggle.style,{width:'36px',height:'36px',cursor:'pointer',background:'transparent',border:'0',borderRadius:'18px',fontSize:'18px',color:'#174782'});
  const batchBar=element('div',''); batchBar.hidden=true; batchBar.style.cssText='position:sticky;top:0;z-index:2;margin:8px 0;padding:10px;border:1px solid #a9afbe;border-radius:12px;background:#e4e9f7';
  const batchStatus=element('div','',batchBar);batchStatus.style.cssText='font-weight:600;margin-bottom:7px';
  const batchActions=element('div','',batchBar);batchActions.style.cssText='display:flex;gap:6px';
  const body=element('div','');
  const tabs=element('div','',body); tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','Helper views'); tabs.style.cssText='display:flex;margin:8px 0;border-bottom:1px solid #c5c6d0';
  const checkTab=element('button','Check',tabs), queueTab=element('button','Queue',tabs), resultsTab=element('button','Results',tabs);
  const checkView=element('div','',body), queueView=element('div','',body), resultsView=element('div','',body);
  checkView.id='check-view'; queueView.id='queue-view'; resultsView.id='results-view'; for(const v of [checkView,queueView,resultsView])v.setAttribute('role','tabpanel');
  for(const [b,v] of [[checkTab,checkView],[queueTab,queueView],[resultsTab,resultsView]]){b.type='button';b.id=v.id+'-tab';b.setAttribute('role','tab');b.setAttribute('aria-controls',v.id);v.setAttribute('aria-labelledby',b.id);b.style.cssText='flex:1;border:0;border-bottom:3px solid transparent;background:transparent;padding:9px 2px;color:#45464f;font:600 13px system-ui;min-height:44px;cursor:pointer';}
  let activeTab='check';
  function setTab(name,focus=false){activeTab=name;for(const [b,v,on] of [[checkTab,checkView,name==='check'],[queueTab,queueView,name==='queue'],[resultsTab,resultsView,name==='results']]){v.hidden=!on;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;b.style.borderBottomColor=on?'#2859a7':'transparent';b.style.color=on?'#174782':'#45464f';if(on&&focus)b.focus();}clamp();}
  checkTab.addEventListener('click',()=>setTab('check'));queueTab.addEventListener('click',()=>setTab('queue'));resultsTab.addEventListener('click',()=>setTab('results'));
  tabs.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const names=['check','queue','results'];setTab(e.key==='Home'?'check':e.key==='End'?'results':names[(names.indexOf(activeTab)+(e.key==='ArrowRight'?1:2))%3],true);}});
  const summary=element('div','Paste card/PIN, CSV or TSV.',checkView); Object.assign(summary.style,{margin:'5px 0 3px',fontWeight:'bold'});
  const progress=element('progress','',checkView);progress.max=1;progress.value=0;progress.setAttribute('aria-label','Current queue verified');progress.style.cssText='width:100%;height:6px;accent-color:#2859a7;display:block;margin:5px 0 8px';
  const checked=element('div','',checkView); checked.style.cssText='font-size:11px;color:#475569;margin-bottom:4px;overflow-wrap:anywhere'; checked.hidden=true;
  const importSection=element('details','',queueView);importSection.open=true;importSection.style.cssText='margin:8px 0';const importLabel=element('summary','Add cards',importSection);importLabel.style.cssText='cursor:pointer;font-weight:600;color:#174782;padding:8px 0';
  const input=element('textarea','',importSection); input.placeholder='Paste wallet request, card/PIN, CSV or TSV';input.setAttribute('aria-label','Card and PIN import'); input.rows=3; input.autocomplete='off'; input.spellcheck=false; Object.assign(input.style,{width:'100%',boxSizing:'border-box',resize:'vertical',font:'11px monospace',padding:'7px',border:'1px solid #797983',borderRadius:'8px',background:'#fff',color:'#1b1b1f'});
  const importControls=element('div','',importSection);importControls.style.cssText='display:flex;margin:4px 0 10px';
  const status=element('div','Credentials stay in this tab. Verified results are saved locally.',body); status.setAttribute('aria-live','polite'); status.style.cssText='font-size:11px;margin:4px 0;color:#475569;overflow-wrap:anywhere';
  const queueHeader=element('div','',queueView);queueHeader.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:6px';const queueSummary=element('div','',queueHeader);queueSummary.style.cssText='font-weight:600;margin:4px 0'; const queueList=element('div','',queueView);queueList.style.cssText='max-height:200px;overflow:auto;display:grid;gap:4px';
  const batchOption=element('label','',checkView);batchOption.style.cssText='display:flex;gap:9px;align-items:center;min-height:40px;margin:3px 0;cursor:pointer';
  const auto=element('input','',batchOption);auto.type='checkbox';auto.setAttribute('aria-label','Auto proceed (10 per batch)');element('span','Auto proceed · up to 10',batchOption);
  const batchHint=element('div','1.2 / 2.4 s · 10 s rest',checkView);batchHint.style.cssText='font-size:11px;color:#475569;margin:0 0 9px';
  const controls=element('div','',checkView); controls.style.cssText='display:flex;flex-wrap:wrap;gap:6px;align-items:center';
  const secondary=element('details','',queueView);secondary.style.cssText='margin-top:8px';const secondaryLabel=element('summary','Queue & recovery',secondary);secondaryLabel.style.cssText='cursor:pointer;color:#174782;padding:8px 0;font-weight:600';const secondaryActions=element('div','',secondary);secondaryActions.style.cssText='display:flex;gap:5px;flex-wrap:wrap';
  const resultSummary=element('div','',resultsView); resultSummary.style.cssText='font-weight:600;margin:4px 0 8px';
  const resultList=element('div','',resultsView); resultList.style.cssText='max-height:200px;overflow:auto;display:grid;gap:4px';
  const exportArea=element('textarea','',resultsView); exportArea.rows=4;exportArea.readOnly=true;exportArea.hidden=true;exportArea.setAttribute('aria-label','TSV output');exportArea.style.cssText='width:100%;box-sizing:border-box;margin-top:8px;font:11px monospace;resize:vertical';
  const resultControls=element('div','',resultsView);resultControls.style.cssText='display:flex;gap:5px;flex-wrap:wrap;margin-top:8px';
  const footer=element('div','',body);footer.style.cssText='display:flex;justify-content:flex-end;margin-top:5px';
  function button(text, fn, parent=controls) {const b=element('button',text,parent); b.type='button'; Object.assign(b.style,{minHeight:'36px',padding:'7px 11px',border:'1px solid #a9afbe',borderRadius:'20px',background:'#f8f9ff',color:'#24446e',cursor:'pointer',font:'12px/1.25 system-ui,Arial,sans-serif'}); b.addEventListener('click',fn); return b;}
  let drag=null, moved=false, minimized=false;
  function place(x,y){const r=host.getBoundingClientRect();host.style.right='auto';host.style.bottom='auto';host.style.left=Math.max(0,Math.min(x,window.innerWidth-r.width))+'px';host.style.top=Math.max(0,Math.min(y,window.innerHeight-r.height))+'px';}
  function clamp(){if(moved){const r=host.getBoundingClientRect();place(r.left,r.top);}}
  grip.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;const r=host.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};grip.setPointerCapture(e.pointerId);grip.style.cursor='grabbing';e.preventDefault();});
  grip.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;moved=true;place(e.clientX-drag.x,e.clientY-drag.y);});
  function endDrag(e){if(drag?.id===e.pointerId){drag=null;grip.style.cursor='grab';}}
  grip.addEventListener('pointerup',endDrag);grip.addEventListener('pointercancel',endDrag);grip.addEventListener('lostpointercapture',endDrag);
  toggle.addEventListener('click',()=>{minimized=!minimized;body.hidden=minimized;toggle.textContent=minimized?'+':'−';toggle.setAttribute('aria-label',minimized?'Expand helper':'Minimize helper');toggle.setAttribute('aria-expanded',String(!minimized));clamp();});
  window.addEventListener('resize',clamp);
  let rows=[], index=0, loaded=false, armed=false, pending=null, observer=null, advancing=false, advanceObserver=null, advanceTimer=null;
  const current=()=>rows[index];
  const BATCH_LIMIT=10, STEP_MS=1200, LONG_STEP_MS=2400, COOLDOWN_MS=10000, RESPONSE_MS=30000;
  let batchActive=false,batchCount=0,batchTimer=null,responseTimer=null,cooldownUntil=0,uiTimer=null,nextAt=0,batchMessage='';
  function batchUI(){
    const remaining=Math.max(0,cooldownUntil-Date.now()), wait=Math.max(0,nextAt-Date.now());
    batchBar.hidden=!(batchActive||remaining||armed||advancing);
    batchStatus.textContent=batchActive?`Batch ${batchCount}/${BATCH_LIMIT} submitted · ${wait?'Next in '+(wait/1000).toFixed(1)+'s':'Waiting / processing'}`:remaining?`Batch cooldown: ${Math.ceil(remaining/1000)}s · ${batchCount}/${BATCH_LIMIT}`:armed?'Waiting for Walmart…':advancing?'Loading next card…':batchMessage||'Ready to check';
    pauseBatch.hidden=!batchActive;pauseBatch.disabled=!batchActive; abortBatch.disabled=!batchActive&&!auto.checked;startBatchButton.hidden=!auto.checked||batchActive;abortBatch.hidden=!batchActive;pauseBatch.hidden=!batchActive;
    startBatchButton.disabled=importing||!auto.checked||batchActive||!!remaining||armed||advancing||!current()||!rows.some(r=>r.status==='pending')||!!storageIssue;
    for(const b of [startBatchButton,pauseBatch,abortBatch]){b.style.opacity=b.disabled?'0.48':'1';b.style.cursor=b.disabled?'default':'pointer';}if(!batchActive&&!remaining&&uiTimer){clearInterval(uiTimer);uiTimer=null;queueMicrotask(render);}
    if((batchActive||remaining)&&!uiTimer)uiTimer=setInterval(batchUI,200);
  }
  function stopBatch(message, cooldown=false){
    batchActive=false;clearTimeout(batchTimer);batchTimer=null;clearTimeout(responseTimer);responseTimer=null;nextAt=0;cancelAdvance();
    if(cooldown||batchCount>=BATCH_LIMIT)cooldownUntil=Math.max(cooldownUntil,Date.now()+COOLDOWN_MS);
    batchMessage=message;say(message);render();
  }
  function pauseAuto(){if(batchActive)stopBatch('Paused. Any submitted check may finish and be saved.');}
  function abortAuto(){auto.checked=false;stopBatch('Aborted. No further checks will start; any submitted check may finish.');}
  function batchStep(){
    if(!batchActive)return;
    if(document.hidden||storageIssue){stopBatch('Batch stopped: tab hidden or result storage unavailable.');return;}
    auditQueue();
    if(pending){
      if(nextPending()<0){stopBatch('Queue complete. Results saved.',true);setTab('results');return;}
      const d=resultDialog();const ds=dialogs();
      if(ds.length&&(!d||ds.length!==1)){stopBatch('Unexpected Walmart dialog. Resolve manually; batch stopped.');return;}
      if(d){const b=[...d.querySelectorAll('button')].find(b=>b.textContent.trim()==='Check another card balance');if(!visible(b)||b.disabled||b.getAttribute('aria-disabled')==='true'){stopBatch('Next-card button unavailable. Batch stopped.');return;}advanceOnClose(d,true);b.click();}
      else saveAndNext(true);
    }else fill(true);
    if(batchActive&&!armed&&!advancing&&!batchTimer)stopBatch('No check started. Inspect the form before continuing.');
  }
  function startBatch(){
    if(startBatchButton.disabled)return;
    auditQueue();if(!rows.some(r=>r.status==='pending')){say('No eligible cards remain.');render();return;}batchActive=true;batchCount=0;batchMessage='';render();batchStep();
  }
  function scheduleNext(){
    if(!batchActive)return;
    if(batchCount>=BATCH_LIMIT||nextPending()<0){stopBatch(nextPending()<0?'Queue complete. Results saved.':'Batch complete. Start another batch after cooldown.',true);return;}
    const delay=batchCount%2===0?LONG_STEP_MS:STEP_MS;nextAt=Date.now()+delay;batchTimer=setTimeout(()=>{batchTimer=null;nextAt=0;batchStep();},delay);batchUI();
  }
  function onVisibility(){if(document.hidden&&batchActive)stopBatch('Tab hidden. Batch paused.');}
  document.addEventListener('visibilitychange',onVisibility);
  auto.addEventListener('change',()=>{if(!auto.checked&&batchActive)stopBatch('Auto proceed disabled.');else render();});
  const startBatchButton=button('Start batch',e=>{if(e.isTrusted)startBatch();},controls);
  const pauseBatch=button('Pause',e=>{if(e.isTrusted)pauseAuto();},batchActions);
  const abortBatch=button('Abort',e=>{if(e.isTrusted)abortAuto();},batchActions);
  for(const b of [startBatchButton,pauseBatch,abortBatch])Object.assign(b.style,{flex:'1',fontWeight:'bold',fontSize:'13px',minHeight:'48px',padding:'10px 5px',borderRadius:'24px'});
  Object.assign(startBatchButton.style,{background:'#2859a7',color:'#fff',borderColor:'#2859a7',flex:'1 0 100%'});Object.assign(pauseBatch.style,{background:'#2859a7',color:'#fff',borderColor:'#2859a7'});Object.assign(abortBatch.style,{background:'#9c2424',color:'#fff',borderColor:'#9c2424'});
  const storageKey='wmgc-helper:verified-results:v1';
  const validRef=r=>typeof r==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r);
  let exportMode='legacy';
  let archive=[], lastRaw=null, storageIssue='', nextId=1, importing=false;
  const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  let salt=hex(crypto.getRandomValues(new Uint8Array(16)));
  const fingerprint=async(number)=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+number))));
  const storageNote=element('div','');
  storageNote.style.cssText='font-size:10px;color:#865b10;margin:4px 0;overflow-wrap:anywhere';
  function storageWarning(message){storageIssue=message;storageNote.textContent=message;storageNote.hidden=!message;}
  function restore(){
    try{
      lastRaw=localStorage.getItem(storageKey);
      if(lastRaw===null)return;
      const data=JSON.parse(lastRaw);
      if(data.version!==1||!Array.isArray(data.results))throw Error('Invalid saved format');
      if(data.salt!==undefined){if(!/^[a-f0-9]{32}$/.test(data.salt))throw Error('Invalid saved salt');salt=data.salt;}
      const seen=new Set(), refs=new Set();
      for(const r of data.results){
        if(!Number.isSafeInteger(r.id)||r.id<1||seen.has(r.id)||!/^\d{4}$/.test(r.last4)||typeof r.balance!=='string'||!/^\d+\.\d{2}$/.test(r.balance)||!Number.isSafeInteger(Math.round(Number(r.balance)*100))||typeof r.checkedAt!=='string'||!Number.isFinite(Date.parse(r.checkedAt)))throw Error('Invalid saved record');
        if(r.fingerprint!==undefined&&(!data.salt||!/^[a-f0-9]{64}$/.test(r.fingerprint)))throw Error('Invalid saved fingerprint');
        if(r.walletRef!==undefined){if(!validRef(r.walletRef)||!r.fingerprint||refs.has(r.walletRef))throw Error('Invalid saved wallet reference');refs.add(r.walletRef);}
        seen.add(r.id);
      }
      archive=data.results.map(({id,last4,balance,checkedAt,fingerprint,walletRef})=>({id,last4,balance,checkedAt,fingerprint,walletRef,status:'verified'})).sort((a,b)=>a.id-b.id);
      nextId=archive.reduce((n,r)=>Math.max(n,r.id+1),1);
    }catch(e){storageWarning('Saved results unavailable. Export this session before refreshing. Existing storage has not been changed.');}
  }
  function combined(){return [...archive,...rows].sort((a,b)=>a.id-b.id);}
  function persist(){
    if(storageIssue)return false;
    try{
      if(localStorage.getItem(storageKey)!==lastRaw)throw Error('Saved results changed in another tab');
      const raw=JSON.stringify({version:1,salt,results:combined().filter(r=>r.status==='verified').map(({id,last4,balance,checkedAt,fingerprint,walletRef})=>({id,last4,balance,checkedAt,fingerprint,walletRef}))});
      localStorage.setItem(storageKey,raw);lastRaw=raw;return true;
    }catch(e){storageWarning('Could not save results locally. Export this session before refreshing. Use one helper tab at a time.');return false;}
  }
  restore();
  function clearQueue(){
    if(armed||advancing||batchActive||importing||!rows.length)return;
    if(!confirm('Clear all queue entries? Verified balances and timestamps will remain in Results. Unchecked cards and PINs will be removed.'))return;
    // Clear only values belonging to the selected helper card, not unrelated manual entries.
    if(matches()&&!dialogs().length){const [n,p]=fields();setNative(n,'');setNative(p,'');}
    archive.push(...rows.filter(r=>r.status==='verified').map(({id,last4,balance,checkedAt,fingerprint,walletRef,status})=>({id,last4,balance,checkedAt,fingerprint,walletRef,status})));
    reset();rows=[];index=0;input.value='';auto.checked=false;secondary.open=false;importSection.open=true;
    say('Queue cleared. Verified results retained.');setTab('queue');render();
  }
  function clearHistory(){
    if(armed||advancing||pending){say('Finish or dismiss the current result before clearing saved results.');return;}
    if(!confirm('Delete all saved balance results from this browser, including the current queue’s verified balances?'))return;
    try{if(localStorage.getItem(storageKey)!==lastRaw)throw Error('Storage changed');localStorage.removeItem(storageKey);lastRaw=null;storageWarning('');}
    catch(e){storageWarning('Could not clear browser storage. Saved results may still exist.');return;}
    archive=[];for(const r of rows){if(r.status==='verified')Object.assign(r,{balance:null,checkedAt:'',status:'pending'});}if(!rows.length)nextId=1;
    say('Saved results cleared.');render();
  }
  const say=t=>{status.textContent=t;};
  const digits=s=>String(s).replace(/[ \-]/g,'');
  const unquote=s=>s.trim().replace(/^"(.*)"$/,'$1');
  const cardText=s=>/^(?:\d{16}|\d{4}(?:[ -]\d{4}){3})$/.test(s);
  const validRow=r=>!!r&&typeof r.number==='string'&&/^\d{16}$/.test(r.number)&&typeof r.pin==='string'&&/^\d{4}$/.test(r.pin)&&r.last4===r.number.slice(-4);
  // Wallet packets use a separate, exact TSV grammar. Never fall back on unknown versions.
  function parseWallet(text){
    const lines=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').split('\n');
    while(lines.length&&!lines[lines.length-1].trim())lines.pop();
    if(lines[0]!=='WMGC-REQUEST\t1'||lines[1]!=='ref\tcardNumber\tpin'||lines.length<3)throw Error('Unsupported or malformed wallet request. Nothing imported.');
    const refs=new Map(), numbers=new Map();let duplicates=0;
    for(let i=2;i<lines.length;i++){
      const parts=lines[i].split('\t'),[walletRef,number,pin]=parts;
      if(parts.length!==3||!validRef(walletRef)||!/^\d{16}$/.test(number)||!/^\d{4}$/.test(pin))throw Error('Invalid wallet request at line '+(i+1)+'. Nothing imported.');
      const old=refs.get(walletRef);
      if(old){if(old.number!==number||old.pin!==pin)throw Error('Conflicting wallet reference. Nothing imported.');duplicates++;continue;}
      if(numbers.has(number))throw Error('Multiple references for the same card. Nothing imported.');
      const r={walletRef,number,pin,last4:number.slice(-4),balance:null,checkedAt:'',status:'pending',line:i+1};refs.set(walletRef,r);numbers.set(number,r);
    }
    return {out:[...refs.values()],duplicates,rejected:[],wallet:true};
  }
  function parse(text) {
    if(/^\s*WMGC-/im.test(text.replace(/^\uFEFF/,'')))return parseWallet(text);
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
    const candidates=new Map(), conflicts=new Set(), rejected=[];let duplicates=0,first=true;
    for(let i=0;i<lines.length;i++){
      if(!lines[i].trim())continue;
      const parts=lines[i].split(lines[i].includes('\t')?'\t':lines[i].includes(',')?',':'/').map(unquote);
      const header=first&&parts.length===2&&/^(card(\s*(number|#|no\.?))?|gift\s*card(\s*(number|#))?|gc-number)$/i.test(parts[0])&&/^(pin|securitycode|security code)$/i.test(parts[1]);first=false;if(header)continue;
      if(parts.length!==2||!cardText(parts[0])||!/^\d{4}$/.test(parts[1])){rejected.push(i+1);continue;}
      const number=digits(parts[0]),pin=parts[1];
      if(conflicts.has(number)){rejected.push(i+1);continue;}
      if(candidates.has(number)){const old=candidates.get(number);if(old.pin!==pin){rejected.push(old.line,i+1);candidates.delete(number);conflicts.add(number);}else duplicates++;continue;}
      candidates.set(number,{number,pin,last4:number.slice(-4),balance:null,checkedAt:'',status:'pending',line:i+1});
    }
    return {out:[...candidates.values()],duplicates,rejected};
  }
  function auditQueue(){
    const seen=new Set(rows.filter(r=>r.status==='verified').map(r=>r.number));
    const history=new Set(archive.map(r=>r.fingerprint).filter(Boolean));const refs=new Set(archive.map(r=>r.walletRef).filter(Boolean));for(const r of rows)if(r.status==='verified'&&r.walletRef)refs.add(r.walletRef);let removed=0;
    for(const r of rows){if(r.status!=='pending')continue;
      if(!validRow(r)||!/^[a-f0-9]{64}$/.test(r.fingerprint||'')||seen.has(r.number)||(r.walletRef!==undefined?(!validRef(r.walletRef)||refs.has(r.walletRef)):history.has(r.fingerprint))){
        r.status='rejected';r.number='';r.pin='';removed++;continue;
      }seen.add(r.number);if(r.walletRef)refs.add(r.walletRef);
    }return removed;
  }
  function nextPending(after=index){for(let offset=1;offset<=rows.length;offset++){const i=(after+offset)%rows.length;if(rows[i].status==='pending')return i;}return -1;}
  function selectPending(){auditQueue();if(current()?.status==='pending')return true;const i=nextPending();if(i<0)return false;index=i;return true;}
  function disarm(){ armed=false; observer?.disconnect(); observer=null;clearTimeout(responseTimer);responseTimer=null; }
  function cancelAdvance(){advancing=false;advanceObserver?.disconnect();advanceObserver=null;clearTimeout(advanceTimer);advanceTimer=null;}
  function reset(){cancelAdvance();disarm(); loaded=false; pending=null;}
  function render(){
    const waiting=rows.filter(r=>r.status==='pending').length; const rejectedCount=rows.filter(r=>r.status==='rejected').length;
    summary.textContent=rows.length ? `${rows.filter(r=>r.status==='verified').length}/${rows.length} verified | Row ${current().id}: ending ${current().last4}${pending ? ' | CAD '+pending.balance : ''}` : 'Paste card/PIN, CSV or TSV.';
    queueTab.textContent=`Queue (${waiting})`;queueSummary.textContent=`${waiting} pending · ${rows.filter(r=>r.status==='skipped').length} skipped · ${rejectedCount} rejected`;
    queueList.replaceChildren();if(!rows.length)element('div','Paste cards to begin.',queueList);
    for(const [i,r] of rows.entries()){const line=element('div','',queueList);line.style.cssText='display:flex;align-items:center;gap:6px;justify-content:space-between;background:#fff;border:1px solid #e0e2ec;border-radius:10px;padding:5px 8px'; const desc=element('span',`${r.id}. •••• ${r.last4} · ${r.status}${r.walletRef?' · Wallet':''}${i===index?' · selected':''}`,line);desc.style.cssText='font-size:12px';if(r.status==='pending'){const select=button('Select',()=>{if(armed||advancing||pending||batchActive||importing)return;reset();index=i;setTab('check');render();},line);select.disabled=armed||advancing||!!pending||batchActive||importing;select.setAttribute('aria-label',`Select row ${r.id}`);}}
    clearQueueButton.disabled=!rows.length||armed||advancing||batchActive||importing;
    progress.max=Math.max(1,rows.length);progress.value=rows.filter(r=>r.status==='verified').length;progress.hidden=!rows.length;
    const all=combined(), verified=all.filter(r=>r.status==='verified');
    const queueVerified=rows.filter(r=>r.status==='verified');const cents=queueVerified.reduce((sum,r)=>sum+Math.round(Number(r.balance)*100),0);
    resultSummary.textContent=`${queueVerified.length}/${rows.length} current queue verified · CAD $${(cents/100).toFixed(2)}${archive.length?' · '+archive.length+' restored':''}`;
    resultList.replaceChildren();
    if(!verified.length)element('div','No verified results yet.',resultList);
    if(queueVerified.length)element('strong','Current queue',resultList);
    for(const r of [...queueVerified,...archive]){
      if(r===archive[0]){element('strong','Saved history (not included in queue total)',resultList);if(archive.some(r=>!r.fingerprint))element('div','Older records cannot be matched to new imports.',resultList);}
      const item=element('div','',resultList);item.style.cssText='background:#fff;border-radius:10px;padding:6px 8px;border:1px solid #e0e2ec';
      const line=element('div','',item);line.style.cssText='display:flex;justify-content:space-between;gap:8px';
      element('strong',`${r.id}. •••• ${r.last4}${archive.includes(r)?' (saved)':''}${r.walletRef?' · Wallet':''}`,line);element('span',r.status==='verified'?`$${r.balance}`:r.status,line);
      if(r.checkedAt){const t=element('div',new Date(r.checkedAt).toLocaleString(),item);t.style.cssText='font-size:10px;color:#565965';}
    }
    if(!exportArea.hidden)exportArea.value=exportMode==='wallet'?walletExportText():exportText();
    resultsTab.textContent=`Results (${verified.length})`;
    const timestamp=pending?.checkedAt||current()?.checkedAt; checked.hidden=!timestamp; checked.textContent=timestamp?'Last checked: '+new Date(timestamp).toLocaleString()+' (local time)':'';
    load.disabled=!waiting||!!pending||armed||advancing||Date.now()<cooldownUntil; save.disabled=!pending||advancing||armed||Date.now()<cooldownUntil; prev.disabled=index===0||!!pending||armed; next.disabled=!current()||index>=rows.length-1||!!pending||armed; skip.disabled=!current()||current().status!=='pending'||!!pending||armed; discard.disabled=!pending||advancing; retry.disabled=!armed;auditButton.disabled=armed||advancing||importing; exportButton.disabled=!all.length; walletExportButton.disabled=!verified.some(r=>validRef(r.walletRef)); clearButton.disabled=!verified.length&&!storageIssue||armed||advancing||!!pending; importButton.disabled=armed||advancing||importing; importButton.textContent=rows.length?'Add to queue':'Import';
    if(batchActive||auto.checked||importing){load.disabled=true;save.disabled=true;}load.hidden=auto.checked||!!pending||!waiting;save.hidden=auto.checked||!pending;addLink.hidden=!!waiting||!!pending;openQueue.hidden=!waiting;auto.disabled=false;batchHint.hidden=!auto.checked;
    importLabel.textContent=rows.length?'Add more cards':'Add cards';secondary.hidden=!rows.length;retry.hidden=!armed;discard.hidden=!pending;save.textContent=nextPending()<0?'Finish / view results':'Check next card';
    if(!rows.length)importSection.open=true;
    if(batchActive||importing){for(const b of [prev,next,skip,discard,retry,clearButton,importButton,auditButton])b.disabled=true;input.disabled=true;if(batchActive){importSection.open=false;secondary.open=false;}}else input.disabled=false;
    batchUI();
    for(const b of box.querySelectorAll('button:not([role=tab])')){b.style.opacity=b.disabled?'0.48':'1';b.style.cursor=b.disabled?'default':'pointer';} clamp();
  }
  function setNative(e,v){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));}
  function matches(){const r=current(),[n,p]=fields();return !!r&&!!n&&!!p&&digits(n.value)===r.number&&p.value===r.pin;}
  function fill(submit=false){
    if(dialogs().length){say('Close the Walmart dialog using its own button first.');return;}
    if(!selectPending()){say('No eligible cards remain.');render();return;}
    const r=current(),[n,p]=fields(); if(!validRow(r)||!visible(n)||!visible(p)||n.disabled||p.disabled||n.readOnly||p.readOnly){say('Form unavailable. No card loaded. Click GO - Check card when the form is ready.');render();return;}
    reset(); setNative(n,r.number.replace(/(.{4})(?=.)/g,'$1 ')); setNative(p,r.pin);
    if(!matches()){say('Field entry did not match. Do not submit; check the form manually.');render();return;}
    loaded=true; say('Card loaded.');render();
    if(submit) submitCurrent();
  }
  function readResult(){
    const d=resultDialog(); if(!armed||!current())return;
    if((!d&&dialogs().length)||(d&&dialogs().length!==1)){if(batchActive)stopBatch('Unexpected Walmart dialog. Batch stopped.');else say('Resolve the Walmart dialog before continuing.');return;}
    if(!d)return;
    clearTimeout(responseTimer);responseTimer=null;
    const tail=d.querySelector('.cardnumber').textContent.trim().match(/^Ending in\s+(\d{4})$/i);
    const amount=d.querySelector('.balance').textContent.trim().match(/^Balance:\s*\$\s*((?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?)$/i);
    disarm();
    if(!tail||tail[1]!==current().last4||!amount||!matches()){loaded=false;if(batchActive)stopBatch('Result or card mismatch. Batch stopped; nothing saved.');else{say('Result or card mismatch. Nothing saved. Close dialog and reload card.');render();}return;}
    const value=Number(amount[1].replace(/,/g,'')); if(!Number.isFinite(value)||value<0||!Number.isSafeInteger(Math.round(value*100))){loaded=false;if(batchActive)stopBatch('Unrecognized balance. Batch stopped; nothing saved.');else{say('Unrecognized balance. Nothing saved.');render();}return;}
    pending={balance:value.toFixed(2),checkedAt:new Date().toISOString(),prior:{balance:current().balance,checkedAt:current().checkedAt,status:current().status}}; Object.assign(current(),{balance:pending.balance,checkedAt:pending.checkedAt,status:'verified'}); loaded=false;
    const saved=persist();say(saved?'Balance saved.':'Captured in memory. Export before refreshing.');render();
    if(batchActive){if(saved)scheduleNext();else stopBatch('Storage failed. Batch stopped; export captured results.');}
  }
  function saveAndNext(submit=false){
    if(!pending||dialogs().length){say('Close the Walmart dialog first.');return;}
    reset();
    auditQueue();const i=nextPending();if(i>=0){index=i;fill(submit);}else{say('Last row saved. Add more cards or export results.');setTab('results');}render();
  }
  function advanceOnClose(d, automatic=false){
    if(advancing)return;advancing=true;
    const finish=()=>{
      if(!advancing||visible(d)||dialogs().length)return;
      advanceObserver?.disconnect();advanceObserver=null;
      // One next-card check is authorized by the user click on the result button.
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(!advancing)return;
        cancelAdvance();
        if(automatic&&!batchActive)return;
        saveAndNext(true);
        if(automatic&&batchActive&&!armed&&!batchTimer)stopBatch('Next submission did not start. Batch stopped.');
        render();
      }));
    };
    advanceObserver=new MutationObserver(finish);
    advanceObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden','aria-hidden']});
    advanceTimer=setTimeout(()=>{cancelAdvance();if(batchActive)stopBatch('Dialog did not close. Batch stopped.');else{say('Result retained. Close the dialog, then use Save & check next.');render();}},5000);
    say('Waiting for Walmart to close its result dialog.');render();
  }
  function onClick(e){
    if(!e.isTrusted)return;
    if(pending){const d=resultDialog(), b=e.target.closest?.('button');if(d&&b&&d.contains(b)&&b.textContent.trim()==='Check another card balance'){if(batchActive)stopBatch('Manual dialog action. Batch paused.');else if(!auto.checked&&Date.now()>=cooldownUntil)advanceOnClose(d);}return;}
    if(!loaded)return;
    const b=e.target.closest?.('button[type="submit"]'); if(!b||!form()?.contains(b))return;
    if(armed){reset();say('Multiple submissions detected. Capture cancelled; wait for Walmart to finish, then reload.');render();return;}
    armCurrent();
  }
  function armCurrent(){
    disarm(); if(dialogs().length||!matches()){loaded=false;say('Card changed or dialog open. Reload before checking.');render();return false;}
    armed=true; observer=new MutationObserver(readResult);observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class','hidden','aria-hidden']});
    say('Waiting for Walmart result. If a challenge appears, resolve it manually or stop.');render();return true;
  }
  function submitCurrent(){
    const b=form()?.querySelector('button[type="submit"]');
    if(!validRow(current())||current().status!=='pending'||!loaded||armed||pending||dialogs().length||!visible(b)||b.disabled||b.getAttribute('aria-disabled')==='true'||b.textContent.trim()!=='Check Balance'){
      say('Walmart check button unavailable. No submission made.');render();return;
    }
    if(document.hidden||importing||Date.now()<cooldownUntil){say('Check not started. Wait until ready.');render();return;}
    if(storageIssue){say('Storage unavailable. Export results before continuing.');render();return;}
    try{if(localStorage.getItem(storageKey)!==lastRaw)throw Error('Storage changed');}catch(e){storageWarning('Saved results changed or unavailable. Reopen helper.');render();return;}
    if(armCurrent()){
      if(batchActive){batchCount++;batchUI();}
      responseTimer=setTimeout(()=>{if(batchActive)stopBatch('No verified response within 30s. Batch stopped; wait for Walmart to finish.');else{say('No verified response within 30s. Wait for Walmart or reset the failed attempt in Queue.');render();}},RESPONSE_MS);
      b.click();
    }
  }
  document.addEventListener('click',onClick,true);
  const importButton=button('Import',async()=>{if(importing||batchActive||armed||advancing)return;importing=true;render();try{
    const parsed=parse(input.value);const removed=auditQueue();const known=new Map(rows.filter(r=>validRow(r)).map(r=>[r.number,r]));
    const history=new Set(archive.map(r=>r.fingerprint).filter(Boolean));
    const refs=new Map(combined().filter(r=>validRef(r.walletRef)&&r.status!=='rejected').map(r=>[r.walletRef,r]));
    const added=[],links=[];let duplicates=parsed.duplicates, historical=0;const rejected=parsed.rejected;
    for(const r of parsed.out){
      const old=known.get(r.number);
      if(parsed.wallet){
        r.fingerprint=await fingerprint(r.number);
        const prior=refs.get(r.walletRef);
        if(prior){if(prior.fingerprint!==r.fingerprint||(validRow(prior)&&prior.pin!==r.pin))throw Error('Wallet reference conflicts with existing record. Nothing imported.');if(prior.status==='verified')historical++;else duplicates++;continue;}
        if(old){if(old.pin!==r.pin||old.walletRef||old.status!=='pending')throw Error('Card already in queue with different request or state. Clear queue before importing this wallet request.');links.push([old,r.walletRef]);refs.set(r.walletRef,r);continue;}
        // New explicit wallet request authorizes a fresh observation; old balances are never relabeled.
      }else{
        if(old){if(old.pin!==r.pin)rejected.push(r.line);else duplicates++;continue;}
        r.fingerprint=await fingerprint(r.number);if(history.has(r.fingerprint)){historical++;continue;}
      }
      delete r.line;added.push(r);known.set(r.number,r);if(r.walletRef)refs.set(r.walletRef,r);
    }
    if(!host.isConnected)return;
    const oldLength=rows.length, wasComplete=oldLength>0&&index===oldLength-1&&current().status!=='pending'&&!pending&&!armed&&!advancing;
    for(const [r,ref] of links)r.walletRef=ref;for(const r of added)r.id=nextId++;rows.push(...added);input.value='';if(added.length&&(!oldLength||wasComplete)){reset();index=oldLength;}
    auditQueue();if(added.length||links.length){importSection.open=false;setTab('check');}
    say(`${added.length} added${links.length?' · '+links.length+' linked to wallet':''}${duplicates?' · '+duplicates+' duplicate'+(duplicates===1?'':'s')+' omitted':''}${historical?' · '+historical+' already checked':''}${rejected.length?' · '+rejected.length+' invalid/conflicting (lines '+rejected.sort((a,b)=>a-b).join(', ')+')':''}${removed?' · '+removed+' queue rows rejected':''}.`);
  }catch(e){say(e.message);}finally{importing=false;if(host.isConnected)render();}});
  importControls.append(importButton);Object.assign(importButton.style,{flex:'1',minHeight:'40px',background:'#e4e9f7',borderColor:'transparent',fontWeight:'600'});
  const addLink=button('Add cards',()=>{setTab('queue');importSection.open=true;input.focus();});Object.assign(addLink.style,{background:'#2859a7',color:'#fff',flex:'1 0 100%',minHeight:'48px'});
  const openQueue=button('Manage queue',()=>setTab('queue'));
  const load=button('GO - Check card',e=>{if(e.isTrusted)fill(true);});
  Object.assign(load.style,{background:'#2859a7',color:'#fff',fontWeight:'bold',border:'1px solid #2859a7',flex:'1 0 100%',order:-1,minHeight:'48px',fontSize:'13px',padding:'10px 12px'});
  const save=button('Check next card',e=>{if(e.isTrusted)saveAndNext(true);});save.dataset.nextAction='true';Object.assign(save.style,{background:'#2859a7',color:'#fff',borderColor:'#2859a7',minHeight:'48px',fontWeight:'bold',flex:'1 0 100%'});
  const retry=button('Reset failed attempt',()=>{if(!confirm('Only reset after Walmart has finished and shown an error, not while a request is pending. Reset capture?'))return;reset();say('Capture reset. Close any Walmart dialog and reload to retry.');render();},secondaryActions);
  const discard=button('Discard result',()=>{if(pending){Object.assign(current(),pending.prior);persist();}reset();say('Result discarded. Reload card to retry.');render();},secondaryActions);
  const prev=button('Previous',()=>{reset();index--;say('Selected previous row. Click GO - Check card.');render();},secondaryActions);
  const next=button('Next row',()=>{reset();index++;say('Selected next row. Click GO - Check card.');render();},secondaryActions);
  const skip=button('Skip',()=>{reset();if(current().status!=='verified')current().status='skipped';if(index<rows.length-1)index++;say('Skipped. Click GO - Check card for selected row.');render();},secondaryActions);
  const clearQueueButton=button('Clear queue',clearQueue,queueHeader);Object.assign(clearQueueButton.style,{color:'#9c2424',minHeight:'40px',whiteSpace:'nowrap',flexShrink:'0'});
  const auditButton=button('Validate queue',()=>{if(armed||advancing||batchActive||importing)return;const n=auditQueue();say(n?n+' broken or duplicate rows rejected.':'Queue valid.');render();},secondaryActions);
  function exportText(){return ['Row\tLast4\tBalance CAD\tLast checked UTC\tStatus',...combined().map(r=>[r.id,r.last4,r.balance??'',r.checkedAt,r.status].join('\t'))].join('\n');}
  const exportButton=button('Export TSV',()=>{exportMode='legacy';setTab('results');exportArea.hidden=false;exportArea.value=exportText();exportArea.focus();exportArea.select();say('Copy selected TSV (Ctrl+C). No full card numbers or PINs included.');clamp();},resultControls);
  function walletExportText(){return ['WMGC-RESULT\t1','ref\tbalanceCAD\tcheckedAt',...combined().filter(r=>r.status==='verified'&&validRef(r.walletRef)).map(r=>[r.walletRef,r.balance,new Date(r.checkedAt).toISOString()].join('\t'))].join('\n');}
  const walletExportButton=button('Wallet results',()=>{exportMode='wallet';setTab('results');exportArea.hidden=false;exportArea.value=walletExportText();exportArea.focus();exportArea.select();say('Copy selected wallet results (Ctrl+C). Verified linked records only.');clamp();},resultControls);
  Object.assign(walletExportButton.style,{background:'#2859a7',color:'#fff',borderColor:'#2859a7',minHeight:'44px',flex:'1 0 100%'});
  const clearButton=button('Clear saved results',clearHistory,resultControls);Object.assign(exportButton.style,{background:'#2859a7',color:'#fff',borderColor:'#2859a7',minHeight:'44px',flex:'1'});Object.assign(clearButton.style,{color:'#9c2424',minHeight:'44px'});
  button('Close',()=>{if(rows.length&&!confirm('Close helper? Unchecked cards and PINs will be lost. Saved results remain; export first if local storage failed.'))return;batchActive=false;clearTimeout(batchTimer);clearTimeout(responseTimer);clearInterval(uiTimer);document.removeEventListener('visibilitychange',onVisibility);reset();rows=[];input.value='';exportArea.value='';document.removeEventListener('click',onClick,true);window.removeEventListener('resize',clamp);host.remove();},footer);
  setTab('queue');
  if(archive.length)say(`${archive.length} saved results restored.${archive.some(r=>!r.fingerprint)?' Older records cannot be matched automatically.':''}`);
  render();
})();
