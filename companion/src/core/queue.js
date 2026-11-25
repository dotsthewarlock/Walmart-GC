import {parseRequest,observation,packet} from './protocol.js';
// Foreground-only queue, no credentials, no storage, no background scheduling.
export class Queue {
 constructor(send,change=()=>{}){this.send=send;this.change=change;this.rows=[];this.state='empty';this.running=false;this.cancelled=false;this.pauseRequested=false;this.events=[];}
 notify(){this.change(this);}
 import(raw){if(this.running||this.state==='paused'||this.rows.some(r=>r.result))throw Error('Clear queue explicitly first');const refs=parseRequest(raw);this.rows=refs.map(ref=>({ref,state:'pending',result:null}));this.state='ready';this.notify();}
 clear(){if(this.running)throw Error('Stop active batch first');this.rows=[];this.state='empty';this.events=[];this.notify();}
 record(action,detail={}){this.events.push({at:new Date().toISOString(),action,...detail});}
 async start({pauseAfter=Infinity}={}){
  if(this.running||!['ready','paused','error'].includes(this.state))return false;
  this.running=true;this.cancelled=false;this.pauseRequested=false;this.state='running';this.notify();let count=0;
  try{for(const row of this.rows){if(row.result)continue;if(this.cancelled||this.pauseRequested)break;row.state='checking';this.notify();const earliest=Date.now();
   try{const r=await this.send({type:'start',ref:row.ref});if(this.cancelled){row.state='pending';break;}if(!r?.ok||r.result?.ref!==row.ref)throw Error('Observation failed');row.result=observation(row.ref,r.result.balanceCAD,r.result.checkedAt,Date.now(),earliest);row.state='done';this.record('observation',{ref:row.ref,cleanup:r.cleanup??null});count++;}
   catch{row.state='pending';if(!this.cancelled){this.state='error';this.record('interrupted',{ref:row.ref});}break;}
   this.notify();if(count>=pauseAfter)this.pauseRequested=true;
  }
  if(this.cancelled)this.state='cancelled';else if(this.rows.every(r=>r.result))this.state='complete';else if(this.state!=='error')this.state='paused';return this.state==='complete';
  }finally{this.running=false;this.record('state',{state:this.state});this.notify();}
 }
 pause(){if(this.running){this.pauseRequested=true;this.record('pause-requested');this.notify();}}
 async cancel(){if(!this.running){if(['ready','paused','error'].includes(this.state)){this.state='cancelled';this.record('state',{state:this.state});this.notify();}return;}this.cancelled=true;this.notify();try{await this.send({type:'abort'});}catch{/* pending observation discarded on return */}}
 results(){return this.rows.filter(r=>r.result).map(r=>r.result);}
 export(){return packet(this.results());}
}
