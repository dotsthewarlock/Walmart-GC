// The packaged frame is extension-origin, not a merchant-origin credential UI.
const origin='https://www.walmart.ca';
const fail=()=>{document.body.replaceChildren();const p=document.createElement('p');p.textContent='Private review unavailable in this context. Open the companion from the toolbar.';document.body.append(p);};
try{
 if(window.parent===window||location.ancestorOrigins.length!==1||location.ancestorOrigins[0]!==origin)throw Error();
 const auth=await chrome.runtime.sendMessage({type:'authorize-overlay'});if(!auth?.ok)throw Error();
 await import('./manual.js');
 const main=document.querySelector('main');main.hidden=false;main.inert=false;
 window.addEventListener('message',e=>{if(e.source===window.parent&&e.origin===origin&&e.data?.type==='gc-overlay-layout'&&Object.keys(e.data).length===2&&['','left','right','stack'].includes(e.data.side)){document.body.dataset.drawer=e.data.side;return;}if(e.source===window.parent&&e.origin===origin&&e.data?.type==='gc-overlay-conceal'&&Object.keys(e.data).length===1){for(const id of ['number','pin'])document.getElementById(id).type='password';document.getElementById('reveal').textContent='Show credentials';document.dispatchEvent(new Event('gc-review-concealed'));}});
 window.parent.postMessage({type:'gc-overlay-ready'},origin);
}catch{fail();}
