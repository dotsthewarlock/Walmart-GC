(async()=>{
 const own=location.protocol==='chrome-extension:'&&location.pathname==='/fixture.html';const loop=location.origin==='http://127.0.0.1:8765'&&location.pathname==='/fixture.html';if(!own&&!loop)return;
 const id=new URLSearchParams(location.search).get('job');if(!/^[0-9a-f-]{36}$/.test(id||''))return;
 const field=document.getElementById('synthetic-marker'),result=document.getElementById('synthetic-result');if(!field||!result||document.body.dataset.fixture!=='gc-companion-v1')return;
 try{let r;for(let i=0;i<12;i++){r=await chrome.runtime.sendMessage({type:'ready',id});if(r?.ok||!r?.retry)break;await new Promise(resolve=>setTimeout(resolve,200));}const amount={'1':'12.34','2':'0.00','3':'1234.56'}[r?.index];if(!r?.ok||r.marker!=='GC_SYNTHETIC_ONLY'||!amount)return;field.value=r.marker;field.dispatchEvent(new Event('input',{bubbles:true}));if(field.value!==r.marker)return;result.textContent=amount;await chrome.runtime.sendMessage({type:'observed',id,amount:result.textContent,at:new Date().toISOString()});}catch{/* no automatic observation retry */}
})();
