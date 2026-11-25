(()=>{
if(location.origin!=='https://www.walmart.ca'||location.pathname!=='/en/account/giftcards/balance'||window!==window.top)return;
if(document.getElementById('wmgc-helper-v01')||document.getElementById('gc-wallet-companion-launcher')){alert('Close the existing helper first.');return;}
const companionHost=document.createElement('div');companionHost.id='wmgc-helper-v01';companionHost.style.cssText='all:initial;position:fixed;right:12px;bottom:12px;z-index:2147483647;display:block;width:min(380px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto';
const companionChannel=document.currentScript?.dataset.gcChannel==='stable'?'Stable':'Dev';
const companionShadow=companionHost.attachShadow({mode:'closed'}),companionStyle=document.createElement('style'),companionTemplate=document.createElement('template');
companionStyle.textContent=":host{color-scheme:light dark;font:16px/1.5 system-ui,sans-serif;--surface:#f5f7fc;--ink:#202530;--card:#fff;--primary:#355c9a;--edge:#c3c9d5}*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--ink)}main{max-width:640px;margin:auto;padding:20px}h1{font-size:1.45rem;line-height:1.2;margin:8px 0}h2{font-size:1.08rem}p{margin:10px 0}.eyebrow{font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:var(--primary);font-weight:700}.card{background:var(--card);border:1px solid var(--edge);border-radius:20px;padding:16px;margin:16px 0}.actions{display:flex;flex-wrap:wrap;gap:8px}button{font:inherit;font-weight:600;border:1px solid var(--primary);border-radius:24px;min-height:48px;padding:8px 19px;color:white;background:var(--primary);cursor:pointer}button.secondary{background:transparent;color:var(--primary)}button:disabled{opacity:.45;cursor:default}button:focus-visible{outline:3px solid #bc7215;outline-offset:3px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.8rem;background:var(--surface);padding:12px;border-radius:12px}small{opacity:.8}body.popup{width:320px}body.popup main{padding:16px}body.popup button{width:100%}@media(prefers-color-scheme:dark){:host{--surface:#131824;--ink:#e3e9f6;--card:#202737;--primary:#a9c7ff;--edge:#4b5669}button{color:#102348}}\n.muted{font-size:.9rem;opacity:.85}.queue-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--edge)}.controls{margin-top:12px}textarea{width:100%;background:var(--surface);color:var(--ink);border:1px solid var(--edge);border-radius:12px;padding:12px;resize:vertical;font:12px/1.5 monospace;overflow-wrap:anywhere}summary{cursor:pointer;padding:12px 0}button{max-width:100%}\n\n.confirm{display:flex;align-items:flex-start;gap:8px;margin:12px 0;font-size:.9rem}.confirm input{margin-top:4px;flex-shrink:0}body.popup .card button{margin:4px 0}body.popup .card{padding:12px}body.popup main{max-height:560px;overflow:auto}\n[hidden]{display:none!important}.companion{max-width:760px}.dock{position:relative;background:var(--card);border:1px solid var(--edge);border-radius:20px;padding:14px;max-width:380px;margin:0 0 0 auto}.dock header{align-items:center}.dock header button{padding:6px 12px;min-height:44px}.dock #minimize{margin-left:auto;min-width:44px}.dock #close{min-width:44px}.dockControls{display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px}.dockControls button{padding:8px 6px}.dock #status{margin-top:8px;min-height:1.6em;height:1.6em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.85rem;color:var(--primary)}.dock #panel{margin-top:12px;border-top:1px solid var(--edge);padding-top:8px;animation:reveal .13s ease-out}.scrollList{max-height:200px;overflow:auto}.dock #panel h2{margin:4px 0 8px}.dock textarea{margin-top:6px}.dock #progress{font-size:.9rem}.companion details{max-width:380px;margin-left:auto}.companion a{color:var(--primary)}@media(min-width:790px){.dock #panel{position:absolute;right:calc(100% + 10px);top:0;width:330px;background:var(--card);border:1px solid var(--edge);border-radius:20px;padding:14px;margin:0;box-shadow:0 3px 16px #0002}}@keyframes reveal{from{opacity:0;transform:translateX(5px)}to{opacity:1;transform:translateX(0)}}@media(prefers-reduced-motion:reduce){.dock #panel{animation:none}}@media(max-width:390px){.dockControls{grid-template-columns:1fr 1fr}.dockControls #start{grid-column:1/-1}}\n#current{padding:12px;margin:8px 0}#current label:not(.confirm){display:block;margin:8px 0;font-size:.9rem}#current input:not([type=checkbox]){display:block;width:100%;border:1px solid var(--edge);border-radius:12px;padding:10px;background:var(--surface);color:var(--ink);font:inherit}#current button{width:100%}.merchantLink{display:block;padding:12px;text-align:center}#denied{width:100%;margin-top:6px;font-size:.85rem;min-height:44px}#backup{max-width:100%;margin-bottom:8px}\n/* Compact action popup and persistent review window. */\nbody.popup{width:344px;max-width:100vw}body.popup main{padding:16px;max-height:540px}.popup-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}.popup-actions{display:grid;gap:8px;margin:16px 0}.popup-actions button{min-height:46px}.popup details{border-top:1px solid var(--edge);margin-top:12px}.popup #navStatus:empty{display:none}.manual-review{padding:14px}.manual-review .dock,.manual-review details{margin-left:auto;margin-right:auto}.manual-review h1{font-size:1.35rem}.manual-review>.muted{font-size:.85rem}.manual-review #current h2{margin:0 0 6px}.manual-review #current .merchantLink{padding:8px}.manual-review details.card{margin-top:10px;margin-bottom:10px;padding:12px}.manual-review details summary{padding:6px 0}\n\n/* In-page extension frame: shell owns positioning and window controls. */\nbody.embedded-review main{padding:10px;max-width:none}body.embedded-review .eyebrow,body.embedded-review h1,body.embedded-review .merchantLink,body.embedded-review #minimize,body.embedded-review #close{display:none!important}body.embedded-review .dock{max-width:none;border:0;padding:2px;background:transparent}body.embedded-review .dock header{margin-bottom:6px}body.embedded-review .dock #panel{position:static;width:auto;box-shadow:none}body.embedded-review .dockControls{grid-template-columns:2fr 1fr 1fr}body.embedded-review .dockControls #start{grid-column:auto}body.embedded-review .dockControls button{font-size:.85rem}body.embedded-review .manual-review>.muted{margin:0 0 8px;font-size:.78rem}body.embedded-review .manual-review details{max-width:none}body.embedded-review .manual-review>p:last-child{display:none}\n\n/* V0.8: native accessible progress; compact credential controls and explicit transfer. */\n.review-progress{margin:8px 0 12px}.review-progress p{margin:0 0 5px}.review-progress progress{display:block;width:100%;height:7px;border:0;border-radius:999px;overflow:hidden;appearance:none;background:var(--edge);accent-color:var(--primary)}.review-progress progress::-webkit-progress-bar{background:var(--edge);border-radius:999px}.review-progress progress::-webkit-progress-value{background:var(--primary);border-radius:999px;transition:width .18s ease}.review-progress progress::-moz-progress-bar{background:var(--primary)}.credential-line{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:6px;margin:6px 0}.credential-line label{margin:0!important;min-width:0}.credential-line button{width:auto!important;padding:5px 12px;min-height:44px}.queue-hint{margin:0 0 5px}.manual-review .tools{background:transparent;border:0;border-top:1px solid var(--edge);border-radius:0;padding:4px 2px;margin:6px auto}.manual-review .tools summary{font-size:.85rem;color:var(--primary)}body.embedded-review .manual-review>.muted{font-size:.75rem;margin-bottom:4px}body.embedded-review .dock #status{font-size:.78rem}body.embedded-review .dockControls button{min-height:44px}body.embedded-review #current{padding:8px}body.embedded-review #current input:not([type=checkbox]){padding:8px}body.embedded-review .scrollList{max-height:150px}@media(prefers-reduced-motion:reduce){.review-progress progress::-webkit-progress-value{transition:none}}\n\n#manualFallback{margin:0;max-width:none}#manualFallback summary{font-size:.82rem;padding:7px 0;color:var(--primary)}body.embedded-review #fillCard{font-size:.82rem;min-height:40px}\n\n.auto-option{display:flex;align-items:center;gap:8px;min-height:40px;font-size:.85rem}.auto-option input{accent-color:var(--primary);width:18px;height:18px;margin:0}body.embedded-review .dock #status{height:1.7em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}\n\ndialog{max-width:min(420px,calc(100vw - 32px));border:0;border-radius:28px;padding:24px;background:var(--card);color:var(--ink);box-shadow:0 8px 28px #0004}dialog::backdrop{background:#0006}dialog h2{margin:0 0 12px}dialog .actions{justify-content:flex-end;margin-top:24px}\n\n/* Compact bookmarklet-style dock: the primary controls never depend on drawer contents. */\nbody.embedded-review{font-size:13px;overflow:hidden}\nbody.embedded-review main{height:100dvh;padding:0;overflow:hidden}\nbody.embedded-review .manual-review>.muted,body.embedded-review .manual-review>.tools{display:none!important}\nbody.embedded-review .dock{height:100%;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:44px minmax(0,1fr);padding:0;margin:0;border:0;max-width:none;border-radius:0}\nbody.embedded-review .dock header{grid-area:1/1;display:flex;flex-wrap:nowrap;gap:0;margin:0;border-bottom:1px solid var(--edge);padding:0 8px}\nbody.embedded-review .dock header button{flex:1;border:0;border-radius:0;border-bottom:3px solid transparent;background:transparent;color:var(--ink);font-size:12px;padding:3px 0;white-space:nowrap;min-height:42px}\nbody.embedded-review .dock header button[aria-pressed=true],body.embedded-review .dock header button[aria-expanded=true]{color:var(--primary);border-bottom-color:var(--primary)}\nbody.embedded-review #dockBody{grid-area:2/1;display:flex;flex-direction:column;min-height:0;gap:2px;padding:8px 12px;overflow:auto}\nbody.embedded-review .selected-summary{font-size:12px;font-weight:600;min-height:18px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}\nbody.embedded-review .review-progress{margin:0 0 4px}body.embedded-review .review-progress p{margin:0 0 3px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\nbody.embedded-review .auto-option{min-height:28px;margin:0;font-size:12px}body.embedded-review .batch-hint{font-size:11px;color:var(--ink);opacity:.8;min-height:17px}\nbody.embedded-review .dockControls{display:flex;flex-wrap:nowrap;gap:5px;margin-top:auto;min-height:46px}body.embedded-review .dockControls button{flex:1;min-height:44px;font-size:12px;padding:6px 4px}body.embedded-review .dockControls #abort{color:#a13232;border-color:#a13232}\nbody.embedded-review #status{margin-top:2px;padding-top:3px;border-top:1px solid var(--edge);height:21px;min-height:21px;font-size:11px;line-height:16px}\nbody.embedded-review .dock #panel{grid-area:3/1;margin:0;padding:8px 12px;border-top:1px solid var(--edge);overflow:auto;min-height:0;background:var(--card);width:auto;max-width:none;box-shadow:none;border-radius:0}\nbody.embedded-review #drawerClose{float:right;border:0;padding:0 5px;min-height:30px;font-size:11px}body.embedded-review #panel h2{font-size:14px}body.embedded-review #panel .actions button{font-size:12px;min-height:40px;padding:5px 8px}body.embedded-review .scrollList{max-height:130px}\nbody.embedded-review[data-drawer=left] .dock,body.embedded-review[data-drawer=right] .dock{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:44px minmax(0,1fr)}\nbody.embedded-review[data-drawer=left] .dock header{grid-area:1/2}body.embedded-review[data-drawer=left] #dockBody{grid-area:2/2}body.embedded-review[data-drawer=left] .dock #panel{grid-area:1/1/3/2;border-top:0;border-right:1px solid var(--edge)}\nbody.embedded-review[data-drawer=right] .dock #panel{grid-area:1/2/3/3;border-top:0;border-left:1px solid var(--edge)}\nbody.embedded-review[data-drawer=stack] .dock{grid-template-rows:44px 198px minmax(0,1fr)}\nbody.embedded-review:not([data-drawer]) .dock:has(#panel:not([hidden])){grid-template-rows:44px 198px minmax(0,1fr)}\nbody.embedded-review #current{margin:8px 0;padding:8px}body.embedded-review #denied{font-size:12px}\n\n.dock #panel{position:static;width:auto;box-shadow:none;margin-top:12px}.manual-review{padding:8px;background:var(--surface);color:var(--ink)}";companionTemplate.innerHTML="<main class=\"companion manual-review\"><span class=\"eyebrow\">GC Wallet Companion / V1.0.3</span><h1>Balance review</h1><p class=\"muted\">Paste a request. Check individually or enable Auto proceed and explicitly start a foreground batch. Matched results are saved automatically. Credentials stay in this review window until closed. Clear clipboard history after transfer.</p><div class=\"dock\"><header class=\"actions\"><button id=\"checkTab\" class=\"secondary\" aria-pressed=\"true\">Check</button><button id=\"queueTab\" class=\"secondary\" aria-expanded=\"false\">Queue</button><button id=\"resultsTab\" class=\"secondary\" aria-expanded=\"false\">Results</button><button id=\"minimize\" class=\"secondary\" aria-label=\"Minimize\" aria-expanded=\"true\">\u2212</button><button id=\"close\" class=\"secondary\" aria-label=\"Close\" hidden>\u00d7</button></header><section id=\"dockBody\"><div id=\"selectedSummary\" class=\"selected-summary\"></div><div class=\"review-progress\"><p id=\"progress\" aria-live=\"polite\"></p><progress id=\"reviewProgress\" max=\"1\" value=\"0\" aria-label=\"Cards reviewed\" aria-describedby=\"progress\"></progress></div><div class=\"card\" id=\"current\" hidden><h2 id=\"selectedHeading\">Selected card</h2><button id=\"checkCard\" hidden disabled>Check balance</button><button id=\"fillCard\" class=\"secondary\" hidden>Refill selected card</button><details id=\"manualFallback\" open><summary>Manual fallback</summary><div class=\"credential-line\"><label>Card number<input id=\"number\" readonly type=\"password\" autocomplete=\"off\"></label><button id=\"copyNumber\" class=\"secondary\" aria-label=\"Copy selected card number\">Copy</button></div><div class=\"credential-line\"><label>PIN<input id=\"pin\" readonly type=\"password\" autocomplete=\"off\"></label><button id=\"copyPin\" class=\"secondary\" aria-label=\"Copy selected PIN\">Copy</button></div><button id=\"reveal\" class=\"secondary\">Show credentials</button><a class=\"merchantLink\" href=\"https://www.walmart.ca/en/account/giftcards/balance\" target=\"_blank\" rel=\"noopener noreferrer\">Open official checker</a><label>Observed CAD balance<input id=\"amount\" inputmode=\"decimal\" autocomplete=\"off\" placeholder=\"0.00\"></label><label class=\"confirm\"><input type=\"checkbox\" id=\"confirmed\"> I checked this exact card and observed this balance.</label><button id=\"save\">Confirm observation</button></details></div><label id=\"autoOption\" class=\"auto-option\" hidden>Auto proceed <select id=\"autoProceed\"><option value=\"0\">Off</option><option value=\"10\">10</option><option value=\"25\">25</option><option value=\"50\">50</option></select></label><div id=\"batchHint\" class=\"batch-hint\">One check at a time</div><div class=\"actions dockControls\"><button id=\"start\">Select next card</button><button id=\"pause\" class=\"secondary\">Pause</button><button id=\"abort\" class=\"secondary\">Abort</button></div><button id=\"denied\" class=\"secondary\">Blocked / challenge \u2014 stop</button><div id=\"status\" role=\"status\" aria-live=\"polite\">Ready</div></section><aside id=\"panel\" hidden><button id=\"drawerClose\" class=\"secondary\" aria-label=\"Close list\">Close list</button><section id=\"queuePanel\" hidden><h2>Queue</h2><p class=\"muted queue-hint\">Paste a Batch v1 request or legacy card list. Import does not start a check.</p><textarea id=\"input\" rows=\"4\" autocomplete=\"off\" spellcheck=\"false\" aria-label=\"Batch v1 or legacy input\" placeholder=\"Paste request or card/PIN\"></textarea><div class=\"actions\"><button id=\"import\">Import</button><button id=\"skip\" class=\"secondary\">Skip next</button><button id=\"clear\" class=\"secondary\">Clear queue</button></div><label class=\"auto-option\"><input id=\"detectClipboard\" type=\"checkbox\"> Detect copied requests on focus</label><button id=\"allowClipboard\" class=\"secondary\" type=\"button\" hidden>Allow clipboard access</button><div id=\"rows\" class=\"scrollList\"></div></section><section id=\"resultsPanel\" hidden><h2>Results</h2><label class=\"auto-option\"><input id=\"autoCopy\" type=\"checkbox\"> Copy wallet results after each batch</label><div class=\"actions\"><button id=\"clearResults\" class=\"secondary\">Clear results</button><button id=\"wallet\">Copy wallet results</button><button id=\"legacy\" class=\"secondary\">Copy legacy TSV</button><button id=\"discardLast\" class=\"secondary\">Discard last observation</button></div><div id=\"history\" class=\"scrollList\"></div><textarea id=\"output\" rows=\"4\" readonly aria-label=\"Result packet\" hidden></textarea></section></aside></div><details class=\"card tools\"><summary>History transfer (optional)</summary><p class=\"muted\">Restore an existing v1 helper JSON backup only into an unused manual history. No automatic access to the old Walmart-origin storage. Only recognized noncredential fields are retained. Do not upload backups or results to AI.</p><input id=\"backup\" type=\"file\" accept=\".json,application/json\"><button id=\"restore\" class=\"secondary\">Restore local backup</button><button id=\"restoreLegacy\" class=\"secondary\" hidden>Restore previous bookmarklet history</button><button id=\"exportHistory\" class=\"secondary\">Export local history backup</button></details><details class=\"card tools\"><summary>Acceptance test</summary><p class=\"muted\">Isolated invented data, no merchant navigation. This report contains only pass/fail checks.</p><button id=\"self\">Run manual workflow self-test</button><p id=\"testStatus\" role=\"status\">Not run</p><button id=\"report\" class=\"secondary\" disabled>Download acceptance report</button></details><p class=\"muted\"><a href=\"companion.html\">Synthetic diagnostics</a> \u00b7 Explicit review</p><dialog id=\"confirmDialog\" aria-labelledby=\"confirmTitle\" aria-describedby=\"confirmMessage\"><h2 id=\"confirmTitle\"></h2><p id=\"confirmMessage\"></p><form method=\"dialog\" class=\"actions\"><button value=\"cancel\" class=\"secondary\">Cancel</button><button value=\"confirm\">Confirm</button></form></dialog></main>";companionShadow.append(companionStyle,companionTemplate.content);companionShadow.querySelector('.eyebrow').textContent="GC Wallet · 1.0.3 · "+companionChannel;document.body.append(companionHost);
const companionMove=document.createElement('button');companionMove.type='button';companionMove.textContent='Move';companionMove.setAttribute('aria-label','Move companion; click to change corner');companionMove.style.cssText='float:right;min-height:36px;padding:4px 12px;touch-action:none;cursor:grab';companionShadow.querySelector('.eyebrow').after(companionMove);
let companionDrag=null,companionMoved=false;function companionPlace(x,y){const r=companionHost.getBoundingClientRect();companionHost.style.right='auto';companionHost.style.bottom='auto';companionHost.style.left=Math.max(0,Math.min(x,innerWidth-r.width))+'px';companionHost.style.top=Math.max(0,Math.min(y,innerHeight-r.height))+'px';}
companionMove.addEventListener('pointerdown',e=>{if(!e.isTrusted||e.button!==0)return;const r=companionHost.getBoundingClientRect();companionDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};companionMoved=false;companionMove.setPointerCapture(e.pointerId);});
companionMove.addEventListener('pointermove',e=>{if(!companionDrag||e.pointerId!==companionDrag.id)return;const dx=e.clientX-companionDrag.x,dy=e.clientY-companionDrag.y;if(Math.hypot(dx,dy)>5)companionMoved=true;if(companionMoved)companionPlace(companionDrag.left+dx,companionDrag.top+dy);});
companionMove.addEventListener('pointerup',e=>{if(companionDrag?.id===e.pointerId)companionDrag=null;});companionMove.addEventListener('pointercancel',()=>{companionDrag=null;});companionMove.addEventListener('click',e=>{if(!e.isTrusted||companionMoved)return;const r=companionHost.getBoundingClientRect();companionPlace(r.left<innerWidth/2?innerWidth-r.width-12:12,r.top);});
let companionHandler;const companionBridge={runtime:{id:'bookmarklet',onMessage:{addListener(fn){companionHandler=fn;}},sendMessage(message){if(message.type==='clipboard-copy')return navigator.clipboard?.writeText(message.text).then(()=>({ok:true}),()=>({ok:false}))??Promise.resolve({ok:false});return new Promise(resolve=>{if(!companionHandler){resolve({ok:false});return;}try{companionHandler(message,{id:'bookmarklet'},resolve);}catch{resolve({ok:false});}});}}};const chrome=companionBridge;

// Shared Batch v1 wire rules, extracted from the accepted helper contract.
// This module does not access a page, submit a form, or persist credentials.
const REQUEST_HEAD='WMGC-REQUEST\t1\nref\tcardNumber\tpin';
const HEAD='WMGC-RESULT\t1\nref\tbalanceCAD\tcheckedAt';
const validRef=r=>typeof r==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r);
function parseWireRequest(text){
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
function validateWireObservation(ref,amount,at,now=Date.now(),earliest=0){
 if(!validRef(ref)||typeof amount!=='string'||!/^\d+\.\d{2}$/.test(amount)||amount.length>32||BigInt(amount.replace('.',''))>BigInt(Number.MAX_SAFE_INTEGER)||typeof at!=='string'||!Number.isFinite(Date.parse(at))||new Date(at).toISOString()!==at||Date.parse(at)<earliest||Date.parse(at)>now+60000)throw Error('Invalid observation');
 return {ref,balanceCAD:amount,checkedAt:at};
}
function formatWireResults(results){
 const refs=new Set();const lines=results.map(r=>{const o=validateWireObservation(r.ref,r.balanceCAD,r.checkedAt);if(refs.has(o.ref))throw Error('Duplicate result');refs.add(o.ref);return [o.ref,o.balanceCAD,o.checkedAt].join('\t');});
 return HEAD+(lines.length?'\n'+lines.join('\n'):'');
}



const VERSION='1.0.3';
const LAUNCHER='http://localhost:8765/launcher.html';
const TARGET='http://127.0.0.1:8765/fixture.html';
const FIXTURES=Object.freeze([
 ['11111111-1111-4111-8111-111111111111','0000000000001111','0001','12.34'],
 ['22222222-2222-4222-8222-222222222222','0000000000002222','0002','0.00'],
 ['33333333-3333-4333-8333-333333333333','0000000000003333','0003','1234.56']
].map(Object.freeze));
const REQUEST=REQUEST_HEAD+'\n'+FIXTURES.map(f=>f.slice(0,3).join('\t')).join('\n');
function parseRequest(raw){
 if(typeof raw!=='string'||raw.length>8192)throw Error('Invalid synthetic packet');
 return parseWireRequest(raw).map(r=>{const f=fixtureFor(r.ref);if(!f||f[1]!==r.cardNumber||f[2]!==r.pin)throw Error('Only bundled synthetic cards are allowed');return r.ref;});
}
const fixtureFor=ref=>FIXTURES.find(f=>f[0]===ref);
function validStart(m){return !!m&&m.type==='start'&&typeof m.ref==='string'&&!!fixtureFor(m.ref)&&Object.keys(m).length===2;}
function observation(ref,amount,at,now=Date.now(),earliest=0){
 if(!fixtureFor(ref)||fixtureFor(ref)[3]!==amount)throw Error('Invalid synthetic observation');
 return validateWireObservation(ref,amount,at,now,earliest);
}
function packet(results){for(const r of results)observation(r.ref,r.balanceCAD,r.checkedAt);return formatWireResults(results);}
function allowedExternal(s){return s?.url===LAUNCHER&&s?.origin==='http://localhost:8765'&&s?.frameId===0&&Number.isInteger(s.tab?.id);}

// Shared companion session: parser, atomic import planning, history and explicit foreground execution.
// Development adapter only: admission is restricted to the three invented test credentials.


const HISTORY_KEY='gc-companion:synthetic-history:v1';
const clean=s=>s.trim().replace(/^"(.*)"$/,'$1');
function parseCompanionInput(raw){
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
class Session {
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

// Manual observations only. No merchant networking, DOM access or submission.


const MANUAL_KEY='gc-companion:manual-history:v1';
const sentinel='00000000-0000-4000-8000-000000000000';
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
function normalizeAmount(value){
 if(typeof value!=='string'||!/^\d{1,16}(?:\.\d{1,2})?$/.test(value.trim()))throw Error('Enter a CAD amount with up to two decimal places');
 const [a,b='']=value.trim().split('.');const amount=BigInt(a).toString()+'.'+b.padEnd(2,'0');
 return validateWireObservation(sentinel,amount,new Date().toISOString()).balanceCAD;
}
// Strict compatibility reader for the original noncredential helper history format.
// Never copies unrecognized fields; rejects ambiguous records as a unit.
function readHistory(raw){
 if(typeof raw!=='string'||raw.length>2_000_000)throw Error('Invalid history');
 const d=JSON.parse(raw);if(d.version!==1||!Array.isArray(d.results)||d.results.length>10000|| (d.salt!==undefined&&!/^[a-f0-9]{32}$/.test(d.salt)))throw Error('Invalid history');
 const ids=new Set(),refs=new Set();const results=d.results.map(r=>{
  if(!r||typeof r.last4!=='string'||!Number.isSafeInteger(r.id)||r.id<1||r.id>=Number.MAX_SAFE_INTEGER||ids.has(r.id)||!/^\d{4}$/.test(r.last4)||typeof r.checkedAt!=='string'||!Number.isFinite(Date.parse(r.checkedAt)))throw Error('Invalid history record');
  if(r.fingerprint!==undefined&&(!d.salt||!/^([a-f0-9]{64})$/.test(r.fingerprint)))throw Error('Invalid history fingerprint');
  if(r.walletRef!==undefined&&(!validRef(r.walletRef)||!r.fingerprint||refs.has(r.walletRef)))throw Error('Invalid history reference');
  const checkedAt=new Date(r.checkedAt).toISOString();const balance=validateWireObservation(r.walletRef??sentinel,r.balance,checkedAt).balanceCAD;
  ids.add(r.id);if(r.walletRef)refs.add(r.walletRef);
  return {id:r.id,last4:r.last4,balance,checkedAt,...(r.fingerprint?{fingerprint:r.fingerprint}:{}),...(r.walletRef?{walletRef:r.walletRef}:{})};
 });return {version:1,salt:d.salt,results:results.sort((a,b)=>a.id-b.id)};
}
function reviewProgress(rows){const total=rows.length,verified=rows.filter(r=>r.state==='verified').length,skipped=rows.filter(r=>r.state==='skipped').length;return {total,verified,skipped,reviewed:verified+skipped,pending:total-verified-skipped};}
class ManualSession{
 constructor(store,cryptoApi=globalThis.crypto){this.store=store;this.crypto=cryptoApi;this.rows=[];this.history=[];this.raw=null;this.issue=false;this.busy=false;this.active=null;this.stopped=false;this.nextId=1;try{this.raw=store.getItem(MANUAL_KEY);const h=this.raw===null?{results:[]}:readHistory(this.raw);this.salt=h.salt??hex(cryptoApi.getRandomValues(new Uint8Array(16)));this.history=h.results;this.nextId=this.history.reduce((n,r)=>Math.max(n,r.id+1),1);}catch{this.issue=true;}}
 async fingerprint(n){return hex(new Uint8Array(await this.crypto.subtle.digest('SHA-256',new TextEncoder().encode(this.salt+':'+n))));}
 assertReady(){if(this.issue||this.busy||this.active!==null||this.stopped)throw Error('Session is busy, stopped or storage unavailable');}
 async import(raw){this.assertReady();this.busy=true;try{const parsed=parseCompanionInput(raw),rows=this.rows.map(r=>({...r}));let next=this.nextId,added=0,linked=0,duplicates=parsed.duplicates,historical=0,rejected=parsed.rejected.length;
  for(const r of parsed.rows){const fp=await this.fingerprint(r.cardNumber);if(this.stopped)throw Error('Session stopped');const old=rows.find(x=>x.cardNumber===r.cardNumber);const prior=r.ref&&(rows.find(x=>x.walletRef===r.ref)||this.history.find(x=>x.walletRef===r.ref));
   if(prior){if(prior.fingerprint!==fp||(prior.pin!==undefined&&prior.pin!==r.pin))throw Error('Conflicting reference. Nothing imported.');if(prior.state==='skipped')throw Error('Clear queue before reimporting skipped request');if(prior.balance!==undefined)historical++;else duplicates++;continue;}
   if(old){if(r.ref){if(old.pin!==r.pin||old.walletRef||old.state!=='pending')throw Error('Clear queue before importing a new request for this card');old.walletRef=r.ref;linked++;}else if(old.pin!==r.pin)rejected++;else duplicates++;continue;}
   if(!r.ref&&this.history.some(h=>h.fingerprint===fp)){historical++;continue;}
   rows.push({id:next++,cardNumber:r.cardNumber,pin:r.pin,last4:r.cardNumber.slice(-4),fingerprint:fp,walletRef:r.ref,state:'pending'});added++;
  }this.rows=rows;this.nextId=next;return {added,linked,duplicates,historical,rejected};}finally{this.busy=false;}}
 begin(id=null){this.assertReady();const r=this.rows.find(r=>r.state==='pending'&&(id===null||r.id===id));if(!r)throw Error('No pending card selected');this.active=r.id;return r;}
 pause(){if(this.busy)throw Error('Wait for save or import to finish');this.active=null;}
 stop(){this.stopped=true;this.active=null;this.rows=[];}
 skip(){this.assertReady();const r=this.rows.find(r=>r.state==='pending');if(r)r.state='skipped';}
 clear(){this.assertReady();this.rows=[];}
 async clearResults(){this.assertReady();this.busy=true;try{await this.write([]);this.rows=this.rows.filter(r=>r.state!=='verified');}catch{this.issue=true;throw Error('Results were not cleared; reopen after checking existing history');}finally{this.busy=false;}}
 async discardObservation(id){this.assertReady();const row=this.rows.find(r=>r.id===id&&r.state==='verified');if(!row||!this.history.some(r=>r.id===id))throw Error('Observation unavailable');this.busy=true;try{await this.write(this.history.filter(r=>r.id!==id));delete row.balance;delete row.checkedAt;row.state='pending';}catch{this.issue=true;throw Error('Observation was not discarded; reopen after checking existing history');}finally{this.busy=false;}}
 async write(history,salt=this.salt){if(!this.store.lock)throw Error('Storage lock unavailable');await this.store.lock(()=>{if(this.stopped)throw Error('Session stopped');if(this.store.getItem(MANUAL_KEY)!==this.raw)throw Error('History changed in another tab');const raw=JSON.stringify({version:1,salt,results:history});this.store.setItem(MANUAL_KEY,raw);this.raw=raw;this.history=history;this.salt=salt;});}
 async confirm(id,value,observed){if(this.issue||this.busy||this.stopped||id!==this.active||observed!==true)throw Error('Confirm the actual observation for the selected card');const r=this.rows.find(r=>r.id===id&&r.state==='pending');if(!r)throw Error('No active card');const balance=normalizeAmount(value),checkedAt=new Date().toISOString();const result={id:r.id,last4:r.last4,balance,checkedAt,fingerprint:r.fingerprint,...(r.walletRef?{walletRef:r.walletRef}:{})};this.busy=true;try{await this.write([...this.history,result]);Object.assign(r,result,{state:'verified'});this.active=null;}catch{this.issue=true;throw Error('Result was not saved; reopen after checking existing history');}finally{this.busy=false;}}
 async restoreOriginal(raw){this.assertReady();if(this.rows.length||this.history.length||this.raw!==null)throw Error('Restore only into an unused manual history; existing records untouched');const d=readHistory(raw);this.busy=true;try{await this.write(d.results,d.salt??this.salt);this.nextId=d.results.reduce((n,r)=>Math.max(n,r.id+1),1);}catch{this.issue=true;throw Error('History restore not committed');}finally{this.busy=false;}}
 historyBackup(){return JSON.stringify({version:1,salt:this.salt,results:this.history});}
 walletResults(){return formatWireResults(this.history.filter(r=>r.walletRef).map(r=>({ref:r.walletRef,balanceCAD:r.balance,checkedAt:r.checkedAt})));}
 legacyResults(){const all=new Map(this.rows.map(r=>[r.id,r]));for(const r of this.history)all.set(r.id,{...r,state:'verified'});return ['Row\tLast4\tBalance CAD\tLast checked UTC\tStatus',...[...all.values()].sort((a,b)=>a.id-b.id).map(r=>[r.id,r.last4,r.balance??'',r.checkedAt??'',r.state].join('\t'))].join('\n');}
}



// Runs only against a separate ephemeral test namespace. No merchant page, credentials or results from user sessions.
async function runManualAcceptance(store){const checks=[];const check=(name,ok)=>{checks.push({name,ok:!!ok});if(!ok)throw Error(name);};let q;
 try{q=new ManualSession(store);check('isolated storage',!q.issue&&q.history.length===0);const added=await q.import(REQUEST);check('explicit import',added.added===3&&q.history.length===0);check('duplicate import',(await q.import(REQUEST)).duplicates===3);let row=q.begin();let rejected=false;try{await q.confirm(row.id,'12.34',false);}catch{rejected=true;}check('confirmation required',rejected&&q.history.length===0);q.pause();check('pause retains pending',q.active===null&&q.rows[0].state==='pending');for(const f of FIXTURES){row=q.begin();await q.confirm(row.id,f[3],true);}check('manual observation serialization',q.history.length===3&&q.walletResults().includes('\t0.00\t')&&q.walletResults().includes('\t1234.56\t'));const raw=store.getItem(MANUAL_KEY);check('no raw fixture credentials',FIXTURES.every(f=>!raw.includes(f[1]))&&JSON.parse(raw).results.every(r=>!('pin'in r)&&!('cardNumber'in r)));const restored=new ManualSession(store);check('history roundtrip and replay',restored.walletResults()===q.walletResults()&&(await restored.import(REQUEST)).historical===3);q.stop();check('stop discards queue',q.stopped&&q.rows.length===0&&q.history.length===3);}
 catch{if(!checks.length)checks.push({name:'test setup',ok:false});}return {version:'1.0.3',synthetic:true,mode:'manual-acceptance',checks,complete:checks.length===9&&checks.every(c=>c.ok)};}

// Explicit foreground batch boundary, shared by both distributions.
const BATCH_LIMIT=10, STEP_MS=1200, LONG_STEP_MS=2400, COOLDOWN_MS=10000, RESPONSE_MS=30000;
const batchDelay=count=>count%2===0?LONG_STEP_MS:STEP_MS;
class ForegroundBatch {
 constructor(now=()=>Date.now()){this.now=now;this.enabled=false;this.target=10;this.completed=0;this.segmentLimit=BATCH_LIMIT;this.running=false;this.count=0;this.cooldownUntil=0;this.generation=0;}
 setTarget(target){if(this.running||![0,10,25,50].includes(target))return false;this.enabled=target!==0;this.target=target||10;this.completed=0;return true;}
 start(visible){if(!this.enabled||!visible||this.running||this.now()<this.cooldownUntil)return false;if(this.completed>=this.target)this.completed=0;this.segmentLimit=Math.min(BATCH_LIMIT,this.target-this.completed);this.running=true;this.count=0;this.generation++;return true;}
 canSubmit(visible){return this.enabled&&this.running&&visible&&this.count<this.segmentLimit;}
 submitted(){if(!this.canSubmit(true))return false;this.count++;return true;}
 verified(){if(!this.running||this.completed>=this.target)return false;this.completed++;return true;}
 stop(rest=false){if(this.running&&(rest||this.count>=BATCH_LIMIT))this.cooldownUntil=Math.max(this.cooldownUntil,this.now()+COOLDOWN_MS);this.running=false;this.generation++;}
 get cooling(){return this.now()<this.cooldownUntil;}
}

// Exact field and result selectors retained from the established Walmart helper.
// Local DOM operations only; no submission, retry or network call.
function createMerchantFields(doc, win) {
  const form=()=>doc.querySelector('#check-gift-card-balance-form');
  const fields=()=>{const f=form();return [f?.querySelector('input[name="gc-number"]'),f?.querySelector('input[name="securitycode"]')];};
  const visible=e=>!!e&&e.getClientRects().length>0&&win.getComputedStyle(e).visibility!=='hidden';
  const dialogs=()=>[...doc.querySelectorAll('[role="dialog"]')].filter(visible);
  const resultDialog=()=>dialogs().find(d=>d.querySelector('.cardnumber')&&d.querySelector('.balance')&&[...d.querySelectorAll('h2')].some(h=>h.textContent.trim()==='Gift card balance'));
  const matches=(number,pin)=>{const [n,p]=fields();return !!n&&!!p&&n.value.replace(/\D/g,'')===number&&p.value===pin;};
  const native=(e,v)=>{Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype,'value').set.call(e,v);e.dispatchEvent(new win.Event('input',{bubbles:true}));};
  function fill(number,pin){
    if(!/^[0-9]{16}$/.test(number)||!/^\d{4}$/.test(pin)||dialogs().length||doc.hidden)return false;
    const [n,p]=fields();if(!visible(n)||!visible(p)||n.disabled||p.disabled||n.readOnly||p.readOnly)return false;
    native(n,number.replace(/(.{4})(?=.)/g,'$1 '));native(p,pin);return matches(number,pin);
  }
  function read(number,pin){
    const ds=dialogs(),d=resultDialog();if(!ds.length)return {state:'waiting'};
    if(!d||ds.length!==1)return {state:'blocked'};
    const tail=d.querySelector('.cardnumber').textContent.trim().match(/^Ending in\s+(\d{4})$/i);
    const amount=d.querySelector('.balance').textContent.trim().match(/^Balance:\s*\$\s*((?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?)$/i);
    if(!tail||tail[1]!==number.slice(-4)||!amount||!matches(number,pin))return {state:'mismatch'};
    const value=Number(amount[1].replace(/,/g,''));if(!Number.isFinite(value)||value<0||!Number.isSafeInteger(Math.round(value*100)))return {state:'mismatch'};
    return {state:'observed',balance:value.toFixed(2)};
  }
  function dismissSaved(number,pin,balance,expected){
    const ds=dialogs();
    if(!ds.length)return true;
    if(ds.length!==1||ds[0]!==expected)return false;
    const result=read(number,pin);
    if(result.state!=='observed'||result.balance!==balance)return false;
    const buttons=[...expected.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Check another card balance'&&visible(b)&&!b.disabled&&b.getAttribute('aria-disabled')!=='true');
    if(buttons.length!==1||doc.hidden)return false;
    buttons[0].click();return true;
  }
  return {form,fields,visible,dialogs,resultDialog,matches,fill,read,dismissSaved};
}

(()=>{
 const target='https://www.walmart.ca/en/account/giftcards/balance';
 if(window!==window.top||location.href!==target)return;
 const adapter=createMerchantFields(document,window);let active=null,expiry=null,expiredToken=null;
 const RESPONSE_MS=30000,DIALOG_MS=5000,FORM_SETTLE_MS=1200;const cancelled=new Set();
 function reset(){active=null;clearTimeout(expiry);expiry=null;}
 function armResponse(){active.submitted=true;active.until=Date.now()+RESPONSE_MS;clearTimeout(expiry);const token=active.token;expiry=setTimeout(()=>{expiredToken=token;reset();},RESPONSE_MS);}
 function submitButton(){const buttons=[...(adapter.form()?.querySelectorAll('button[type="submit"]')??[])].filter(b=>b.textContent.trim()==='Check Balance'&&adapter.visible(b)&&!b.disabled&&b.getAttribute('aria-disabled')!=='true');return buttons.length===1?buttons[0]:null;}
 function safeContext(){return location.href===target&&!document.hidden&&document.getElementById('wmgc-helper-v01')===companionHost;}
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





const uiRoot=companionShadow,companionRuntime=companionBridge.runtime,bookmarkletMode=true;
const $=id=>uiRoot.getElementById(id);let panel='',minimized=false;
const store={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),lock:fn=>{if(!navigator.locks)throw Error('Storage lock unavailable');return navigator.locks.request(MANUAL_KEY,fn);}};
const q=new ManualSession(store);
const assisted=bookmarkletMode||(location.protocol==='chrome-extension:'&&window.parent!==window&&!!companionRuntime?.id);let assistToken=null,assistTimer=null,assistBusy=false,checkReady=false,inFlight=false;
const batch=new ForegroundBatch();let autoTimer=null,restTimer=null;
let lastPanelState=null;
function notifyPanel(){if(!assisted||window.parent===window)return;const open=!!panel&&!minimized;if(open===lastPanelState)return;lastPanelState=open;window.parent.postMessage({type:"gc-overlay-panel",open},"https://www.walmart.ca");}
function stopAuto(rest=false){clearTimeout(autoTimer);autoTimer=null;batch.stop(rest);clearTimeout(restTimer);if(batch.cooling)restTimer=setTimeout(tickCooldown,Math.min(250,Math.max(0,batch.cooldownUntil-Date.now())+20));}
function tickCooldown(){render();if(batch.cooling)restTimer=setTimeout(tickCooldown,250);else if(!batch.running&&q.rows.some(r=>r.state==='pending'))say("Cooldown complete. Start next batch.");}
function confirmAction(title,message){const d=$('confirmDialog'),previous=uiRoot.activeElement||document.activeElement;return new Promise(resolve=>{if(d.open){resolve(false);return;}d.querySelector('#confirmTitle').textContent=title;d.querySelector('#confirmMessage').textContent=message;d.returnValue='cancel';d.addEventListener('close',()=>{previous?.focus();resolve(d.returnValue==='confirm');},{once:true});d.showModal();d.querySelector('[value=cancel]').focus();});}
const say=s=>{$('status').textContent=s;$('status').title=s;};
function endAssist(stopBatch=true){if(stopBatch)stopAuto();clearTimeout(assistTimer);assistTimer=null;const token=assistToken;assistToken=null;assistBusy=false;checkReady=false;inFlight=false;if(assisted&&token)companionRuntime.sendMessage({type:'assist-reset',token}).catch(()=>{});}
async function fillMerchant(){if(!assisted||assistBusy||q.stopped||q.active===null)return;const active=q.active,r=q.rows.find(x=>x.id===active);if(!r)return;endAssist(false);assistBusy=true;const token=crypto.randomUUID();assistToken=token;render();
 try{const response=await companionRuntime.sendMessage({type:'assist-fill',number:r.cardNumber,pin:r.pin,token});if(assistToken!==token||q.active!==active||q.stopped)return;if(!response?.ok){endAssist();say('Form unavailable. Close Walmart dialogs, then retry Fill.');return;}checkReady=true;say(batch.running?'Card filled. Preparing check.':'Card filled. Check balance when ready.');const until=Date.now()+150000;
 const poll=async()=>{if(assistToken!==token||q.active!==active||q.stopped)return;if(document.hidden||Date.now()>until){endAssist();say('Capture stopped. Verify manually or refill.');render();return;}let reply;try{reply=await companionRuntime.sendMessage({type:'assist-read',token});}catch{reply={state:'unavailable'};}if(assistToken!==token||q.active!==active||q.stopped)return;
 if(reply?.state==='timeout'){endAssist();say('No matching response within 30 seconds. Stop and inspect Walmart; no automatic retry.');render();return;}
 if(reply?.state==='observed'&&typeof reply.balance==='string'&&/^\d+\.\d{2}$/.test(reply.balance)){
   if(batch.running&&checkReady&&!batch.submitted()){endAssist();render();return;}clearTimeout(autoTimer);autoTimer=null;checkReady=false;assistBusy=true;try{const save=q.confirm(active,reply.balance,true);render();await save;if(batch.running)batch.verified();
     if(assistToken!==token||q.stopped)return;
     clearFields();
     if(!q.rows.some(r=>r.state==='pending')){const completedBatch=batch.running;if(completedBatch)stopAuto(true);endAssist();say('Review complete. Results ready to copy.');show('results',true);if(completedBatch)await copyBatchResults();return;}
     say('Balance saved. Preparing next card.');render();
     const ready=await companionRuntime.sendMessage({type:'assist-finish',token});
     if(assistToken!==token||q.stopped)return;
     endAssist(false);
     if(!ready?.ok){stopAuto();say('Balance saved. Close the Walmart dialog, then select next card.');return;}
     if(batch.running&&batch.count>=batch.segmentLimit){stopAuto(true);say('Batch complete. Start another after cooldown.');await copyBatchResults();return;}
     const next=q.begin();$('number').value=next.cardNumber;$('pin').value=next.pin;
     await fillMerchant();
   }catch(e){if(assistToken===token)endAssist();say(e.message||'Unable to prepare next card.');}finally{render();}return;}

 if(reply?.state==='waiting'){if(reply.submitted&&checkReady){if(batch.running){clearTimeout(autoTimer);autoTimer=null;if(!batch.submitted()){endAssist();render();return;}}checkReady=false;inFlight=true;render();}assistTimer=setTimeout(poll,600);return;}
 endAssist();say('Capture stopped. Check Walmart for a dialog or mismatch. Nothing saved.');render();};assistTimer=setTimeout(poll,600);if(batch.running){const generation=batch.generation;autoTimer=setTimeout(()=>{autoTimer=null;if(generation===batch.generation&&batch.canSubmit(!document.hidden))submitCard(true);},batch.count?batchDelay(batch.count):0);}
 }catch{if(assistToken===token){endAssist();say('Form unavailable. Use manual review.');}}finally{if(assistToken===token)assistBusy=false;render();}}
document.addEventListener('gc-review-concealed',()=>{if(assistToken){endAssist();if(!q.busy){q.pause();clearFields();}say('Capture paused. Select next card when ready.');render();}});
$('checkCard').hidden=!assisted;
async function submitCard(automatic=false){if(!checkReady||!assistToken||assistBusy||q.stopped||document.hidden||batch.cooling||(automatic&&!batch.canSubmit(true)))return;if(batch.running&&!batch.submitted()){endAssist();render();return;}clearTimeout(autoTimer);autoTimer=null;const token=assistToken;checkReady=false;inFlight=true;render();try{const r=await companionRuntime.sendMessage({type:'assist-submit',token});if(assistToken!==token)return;if(!r?.ok){endAssist();say('Check unavailable. Inspect Walmart before refilling.');}else say('Checking balance. Waiting up to 30 seconds.');}catch{if(assistToken===token){endAssist();say('Check status unknown. Inspect Walmart; no automatic retry.');}}finally{render();}}
$('checkCard').onclick=e=>{if(e.isTrusted&&!batch.running)submitCard();};
$('autoProceed').onchange=e=>{if(!e.isTrusted)return;batch.setTarget(Number(e.target.value));if(!batch.enabled){endAssist();if(!q.busy)q.pause();clearFields();say('Auto proceed disabled. Select next card when ready.');}render();};
$('autoOption').hidden=!assisted;if(assisted){$('queuePanel').append($('current'),$('denied'));$('current').prepend($('fillCard'));uiRoot.querySelector('.dockControls').prepend($('checkCard'));}
$('fillCard').hidden=!assisted;$('fillCard').onclick=e=>{if(e.isTrusted&&!batch.running)fillMerchant();};if(assisted){$('start').textContent='Fill next card';$('manualFallback').open=false;}else $('manualFallback').querySelector('summary').hidden=true;
function conceal(){for(const id of ['number','pin'])$(id).type='password';$('reveal').textContent='Show credentials';}
function clearFields(){conceal();for(const id of ['number','pin','amount'])$(id).value='';$('confirmed').checked=false;}
function wipe(){endAssist();clearFields();}
function countsPlaceholder(){return q.rows.some(r=>r.state==='pending')?'Ready to check':q.rows.length?'Review finished':'Paste card/PIN, CSV or TSV.';}
function render(){const active=q.rows.find(r=>r.id===q.active);$('current').hidden=!active;$('selectedSummary').textContent=active?'Card ending '+active.last4:countsPlaceholder();$('selectedHeading').textContent=active?'Selected card · •••• '+active.last4:'Selected card';$('checkCard').disabled=batch.running||batch.cooling||!checkReady||assistBusy||q.busy||!active||q.stopped;$('fillCard').disabled=batch.running||batch.cooling||inFlight||assistBusy||q.busy||!active||q.stopped;const counts=reviewProgress(q.rows);$('reviewProgress').max=Math.max(1,counts.total);$('reviewProgress').value=counts.reviewed;$('progress').textContent=counts.total?`${counts.verified}/${counts.total} completed${counts.skipped?' · '+counts.skipped+' skipped':''} · ${q.stopped?'stopped':q.issue?'storage error':batch.running?'batch '+batch.count+'/'+batch.segmentLimit+' · target '+batch.completed+'/'+batch.target:batch.cooling?'rest '+Math.ceil((batch.cooldownUntil-Date.now())/1000)+'s':active?'awaiting observation':counts.pending?'ready':'review finished'}`:(q.stopped?'Stopped · saved results retained':q.issue?'Storage unavailable':'No cards imported');$('reviewProgress').setAttribute('aria-valuetext',`${counts.reviewed} of ${counts.total} reviewed; ${counts.verified} verified; ${counts.skipped} skipped`);for(const id of ['start','import','clear','skip','restore','restoreLegacy'])$(id).disabled=batch.running||q.busy||assistBusy||q.issue||q.stopped||!!active;$('start').disabled||=batch.running||batch.cooling||!q.rows.some(r=>r.state==='pending');$('start').textContent=assisted?(batch.enabled?(batch.cooling?'Rest '+Math.ceil((batch.cooldownUntil-Date.now())/1000)+'s':batch.count>=batch.segmentLimit?'Start next batch':'Start batch'):'Fill next card'):'Select next card';$('autoProceed').disabled=q.busy||q.stopped||batch.running||!!active;$('pause').disabled=q.busy||(!active&&!assistBusy&&!batch.running);$('abort').disabled=q.busy||q.stopped;$('denied').disabled=q.stopped;$('save').disabled=batch.running||q.busy||q.issue||q.stopped||!active||!$('confirmed').checked;$('wallet').disabled=!q.history.some(r=>r.walletRef);$('legacy').disabled=!q.rows.length&&!q.history.length;$('exportHistory').disabled=q.busy||!q.history.length;$('clearResults').disabled=batch.running||q.busy||q.issue||q.stopped||!!active||!q.history.length;$('discardLast').disabled=q.busy||q.issue||q.stopped||!!active||batch.running||!lastDiscardable();
 $('queueTab').textContent='Queue ('+counts.pending+')';$('resultsTab').textContent='Results ('+q.history.length+')';$('checkTab').setAttribute('aria-pressed',String(!panel));$('selectedHeading').textContent=active?'Card ending '+active.last4:'Ready';$('batchHint').textContent=batch.enabled?'1.2 / 2.4 s · 10 s rest':'One check at a time';
 if(assisted){$('start').hidden=batch.running||!!active&&!batch.enabled;$('checkCard').hidden=!active||batch.enabled;$('start').classList.toggle('primary-wide',!batch.running);if(!counts.total&&!q.stopped&&!q.issue&&!q.busy){$('start').textContent='Add cards';$('start').disabled=false;}$('pause').hidden=!active&&!batch.running;$('abort').hidden=!batch.running&&!active; $('fillCard').hidden=!active||batch.running; $('denied').hidden=!active&&!batch.running; }
 const item=(r,t)=>{const e=document.createElement('div');e.className='queue-row';const a=document.createElement('span'),b=document.createElement('strong');a.textContent='•••• '+r.last4;b.textContent=t;e.append(a,b);return e;};$('rows').replaceChildren(...q.rows.map(r=>{const row=item(r,r.state);if(r.state==='pending'){const select=document.createElement('button');select.type='button';select.className='secondary';select.textContent='Select';select.setAttribute('aria-label','Select card ending '+r.last4);select.disabled=q.busy||q.issue||q.stopped||q.active!==null||assistBusy||batch.running||batch.cooling||batch.enabled;select.onclick=e=>{if(e.isTrusted)beginSelection(r.id);};row.append(select);}return row;}));$('history').replaceChildren(...q.history.map(r=>item(r,'$'+r.balance)));}
function show(name,force=false){panel=force?name:panel===name?'':name;$('panel').hidden=!panel||minimized;for(const k of ['queue','results']){$(k+'Panel').hidden=panel!==k;$(k+'Tab').setAttribute('aria-expanded',String(panel===k&&!minimized));}$('checkTab').setAttribute('aria-pressed',String(!panel));notifyPanel();if(panel!=='results'){$('output').value='';$('output').hidden=true;}}
$('checkTab').onclick=()=>show('',true);$('drawerClose').onclick=()=>show('',true);$('queueTab').onclick=()=>show('queue');$('resultsTab').onclick=()=>show('results');$('minimize').onclick=()=>{minimized=!minimized;conceal();$('minimize').textContent=minimized?'+':'−';$('minimize').setAttribute('aria-expanded',String(!minimized));$('dockBody').hidden=minimized;$('panel').hidden=minimized||!panel;$('close').hidden=!minimized;for(const k of ['queue','results'])$(k+'Tab').disabled=minimized;};
function stop(){q.stop();wipe();$('input').value='';say('Stopped. Pending credentials discarded. Saved observations retained.');render();}
$('close').onclick=async()=>{if(!q.busy&&await confirmAction('Close review?','Pending credentials will be discarded. Saved results remain.')){stop();if(bookmarkletMode)uiRoot.host.remove();else uiRoot.querySelector('.dock').hidden=true;}};
$('import').onclick=async()=>{const input=$('input'),raw=input.value;input.value='';try{const p=q.import(raw);render();const r=await p;say(`${r.added} added · ${r.linked} linked · ${r.duplicates} duplicate · ${r.historical} history · ${r.rejected} rejected`);if(r.added||r.linked)show('',true);}catch(e){say(e.message);}finally{render();}};
function beginSelection(id=null){if(document.hidden||batch.cooling)return;try{wipe();const r=q.begin(id);if(assisted&&batch.enabled&&!batch.start(!document.hidden)){q.pause();render();return;}$('number').value=r.cardNumber;$('pin').value=r.pin;show('',true);if(assisted)fillMerchant();else say('Copy fields one at a time; check on Walmart.');}catch(e){say(e.message);}render();}
$('start').onclick=e=>{if(!e.isTrusted||document.hidden||batch.cooling)return;if(assisted&&!q.rows.some(r=>r.state==='pending')&&!q.stopped&&!q.issue){show('queue',true);$('input').focus();return;}beginSelection();};$('reveal').onclick=()=>{const visible=$('number').type==='password';for(const id of ['number','pin'])$(id).type=visible?'text':'password';$('reveal').textContent=visible?'Hide credentials':'Show credentials';};document.addEventListener('visibilitychange',()=>{if(document.hidden){conceal();endAssist();if(!q.busy){q.pause();clearFields();}say('Tab hidden. Review paused.');render();}});
// Clipboard writes are individual trusted user actions, never merchant DOM access.
async function writeClipboard(kind,text){
 if(assisted){const reply=await companionRuntime.sendMessage({type:'clipboard-copy',kind,text});if(!reply?.ok)throw Error('Clipboard unavailable');return;}
 if(window.parent!==window||!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);
}
async function copyBatchResults(){if(!$('autoCopy').checked||!q.history.some(r=>r.walletRef))return;let packet;try{packet=q.walletResults();}catch{say('Verified results could not be prepared.');return;}try{await writeClipboard('wallet',packet);say('Wallet results copied.');}catch{show('results',true);const field=$('output');field.value=packet;field.hidden=false;field.focus();field.select();say('Clipboard unavailable. Press Ctrl+C to copy selected results.');}}
let clipboardReading=false;const seenRequests=new Set();
async function detectRequest(explicit=false){
 if(!$('detectClipboard').checked||clipboardReading||document.hidden||q.busy||q.stopped||q.issue||q.active!==null||batch.running||!navigator.clipboard?.readText)return;
 clipboardReading=true;
 try{
  if(!explicit){if(!navigator.permissions?.query)return;const permission=await navigator.permissions.query({name:'clipboard-read'});if(permission.state!=='granted'||document.hidden||!document.hasFocus())return;}
  const raw=await navigator.clipboard.readText();if(typeof raw!=='string'||raw.length>65536)return;const rows=parseWireRequest(raw);
  const canonical=JSON.stringify(rows.map(({ref,cardNumber,pin})=>[ref,cardNumber,pin]).sort((a,b)=>a[0].localeCompare(b[0])));
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical))),b=>b.toString(16).padStart(2,'0')).join('');
  if(seenRequests.has(hash)||document.hidden||!$('detectClipboard').checked||q.busy||q.active!==null||batch.running)return;
  seenRequests.add(hash);if(!await confirmAction('Import copied request?',`A valid wallet request contains ${rows.length} card${rows.length===1?'':'s'}. Import it into the queue?`))return;
  const result=await q.import(raw);say(`${result.added} added · ${result.linked} linked · ${result.duplicates} duplicate · ${result.historical} history · ${result.rejected} rejected`);render();
 }catch{if(explicit)say('Clipboard unavailable or no valid wallet request. Paste manually if needed.');}finally{clipboardReading=false;}
}
$('detectClipboard').onchange=()=>{$('allowClipboard').hidden=!$('detectClipboard').checked;};
$('allowClipboard').onclick=e=>{if(e.isTrusted)void detectRequest(true);};
window.addEventListener('focus',()=>{void detectRequest();});
async function copyField(event,id,label){if(!event.isTrusted||q.stopped||q.busy||q.active===null)return;const input=$(id),value=input.value,active=q.active;if(!value)return;try{await writeClipboard(id,value);if(q.active===active&&!q.stopped)say(label+' copied. Paste on Walmart; clear clipboard history after use.');}catch{if(q.active!==active||q.stopped)return;input.type='text';input.focus();input.select();$('reveal').textContent='Hide credentials';say('Clipboard unavailable. Press Ctrl+C to copy selected '+label.toLowerCase()+'.');}}
$('copyNumber').onclick=e=>copyField(e,'number','Card number');$('copyPin').onclick=e=>copyField(e,'pin','PIN');
$('confirmed').onchange=render;$('save').onclick=async()=>{if(batch.running)return;try{const p=q.confirm(q.active,$('amount').value,$('confirmed').checked);render();await p;wipe();say('Observation saved. Select next card when ready.');}catch(e){say(e.message);}finally{render();}};
$('pause').onclick=()=>{try{q.pause();wipe();say('Paused. Previously saved results retained.');}catch(e){say(e.message);}render();};$('abort').onclick=async()=>{if(await confirmAction('Abort review?','Pending credentials will be discarded. Saved results remain.'))stop();};$('denied').onclick=stop;
$('skip').onclick=()=>{try{q.skip();say('Skipped next pending card.');}catch(e){say(e.message);}render();};$('clear').onclick=async()=>{if(!batch.running&&await confirmAction('Clear queue?','Pending credentials will be discarded. Saved observations remain.')&&!batch.running){try{q.clear();wipe();$('input').value='';say('Queue cleared.');}catch(e){say(e.message);}render();}};
function lastDiscardable(){return [...q.history].reverse().find(h=>q.rows.some(r=>r.id===h.id&&r.state==='verified'));}
$('discardLast').onclick=async()=>{const last=lastDiscardable();if(batch.running||!last||!await confirmAction('Discard observation?','The last observation will be removed and its card returned to the pending queue.')||batch.running)return;try{const pending=q.discardObservation(last.id);render();await pending;$('output').value='';$('output').hidden=true;say('Observation discarded. Card returned to queue.');}catch(e){say(e.message);}finally{render();}};
$('clearResults').onclick=async()=>{if(batch.running||!await confirmAction('Clear results?','Saved observations will be deleted. Pending queue entries remain.')||batch.running)return;try{const pending=q.clearResults();render();await pending;$('output').value='';$('output').hidden=true;say('Results cleared. Queue retained.');}catch(e){say(e.message);}finally{render();}};
// Only explicit user clicks results; output contains no card number or PIN.
async function output(event,kind){if(!event.isTrusted)return;const b=$(kind==='wallet'?'wallet':'legacy');if(b.disabled)return;const field=$('output');let packet;try{packet=kind==='wallet'?q.walletResults():q.legacyResults();}catch{say('Results unavailable. Reopen after checking saved history.');return;}field.value=packet;field.hidden=false;field.focus();field.select();try{await writeClipboard(kind,packet);say(kind==='wallet'?'Wallet results copied. Paste into GC Wallet to preview.':'Legacy TSV copied.');}catch{if(field.value===packet&&!field.hidden){field.focus();field.select();say('Clipboard unavailable. Press Ctrl+C to copy selected results.');}}} $('wallet').onclick=e=>output(e,'wallet');$('legacy').onclick=e=>output(e,'legacy');
$('restore').onclick=async()=>{const f=$('backup').files[0];if(!f)return;try{if(f.size>2_000_000)throw Error('Backup too large');const raw=await f.text();const pending=q.restoreOriginal(raw);render();await pending;say('History restored.');}catch(e){say(e.message);}finally{$('backup').value='';render();}};
$('restoreLegacy').hidden=!bookmarkletMode;
$('restoreLegacy').onclick=async()=>{if(!await confirmAction('Restore previous history?','Restore the previous bookmarklet history into an unused companion history. The original data remains in place.'))return;try{const raw=localStorage.getItem('wmgc-helper:verified-results:v1');if(raw===null)throw Error('No previous bookmarklet history found.');await q.restoreOriginal(raw);say('Previous history restored; original data retained.');}catch(e){say(e.message);}finally{render();}};
$('exportHistory').onclick=()=>{if(!q.raw)return;const url=URL.createObjectURL(new Blob([q.historyBackup()],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='private-companion-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
if(q.issue)say('History unavailable; existing data untouched.');render();if(!q.issue&&!assisted)show('queue',true);

let diagnostic=null;$('self').onclick=async()=>{if(q.busy||q.active!==null)return;const key=MANUAL_KEY+':test:'+crypto.randomUUID();$('self').disabled=true;$('report').disabled=true;try{diagnostic=await runManualAcceptance({getItem:()=>localStorage.getItem(key),setItem:(_,v)=>localStorage.setItem(key,v),lock:fn=>navigator.locks.request(key,fn)});$('testStatus').textContent=(diagnostic.complete?'PASS':'FAIL')+' · '+diagnostic.checks.length+' checks';$('report').disabled=false;}catch{$('testStatus').textContent='FAIL · test setup';}finally{try{localStorage.removeItem(key);}catch{}$('self').disabled=false;}};
$('report').onclick=()=>{if(!diagnostic)return;const url=URL.createObjectURL(new Blob([JSON.stringify(diagnostic,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gc-companion-v100-acceptance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
// Navigating away discards the ephemeral queue, including back/forward-cache restoration.
window.addEventListener('pagehide',()=>{q.stop();wipe();$('input').value='';$('output').value='';});
window.addEventListener('pageshow',()=>{if(q.stopped){say('Session ended. Reopen and import a fresh request.');render();}});

// Extension review window reuses the existing checker tab; hosted candidate retains its ordinary link.
if(location.protocol==='chrome-extension:'&&globalThis.chrome?.runtime?.id){uiRoot.querySelector('.merchantLink').addEventListener('click',async e=>{e.preventDefault();try{const r=await companionRuntime.sendMessage({type:'open-checker'});if(!r?.ok)throw Error();}catch{say('Open the official checker from the extension popup.');}});}

})();
