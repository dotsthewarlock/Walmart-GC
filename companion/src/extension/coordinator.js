import {syntheticAdapter} from './synthetic-adapter.js';
// One bounded observation. The foreground queue owns accepted results; worker restart never resumes work.
export class Coordinator {
 constructor(api,timeout=12000,adapter=syntheticAdapter){this.api=api;this.timeout=timeout;this.adapter=adapter;this.job=null;}
 async run(mode,owner,ref){
  if(this.job)return {ok:false,error:'Another test is active'};if(!this.adapter.accepts(ref))return {ok:false,error:'Unknown synthetic reference'};
  const id=crypto.randomUUID(),url=this.adapter.target(mode,this.api,id);
  let resolve;const response=new Promise(r=>resolve=r);const j={id,url,mode,owner,ref,started:Date.now(),tabId:null,resolve,finished:false,ready:false};this.job=j;
  j.timer=setTimeout(()=>void this.finish(j,{ok:false,error:'Target timed out; no result'}),this.timeout);
  void(async()=>{try{const tab=await this.api.tabs.create({url,active:false});if(!Number.isInteger(tab.id)){await this.finish(j,{ok:false,error:'No target tab ID'});return;}if(j.finished){await this.cleanup(tab.id,j.url);return;}j.tabId=tab.id;}catch{await this.finish(j,{ok:false,error:'Unable to create target tab'});}})();return response;
 }
 async cleanup(id,url){try{const t=await this.api.tabs.get(id);if(t.url!==url&&!(t.url==='about:blank'&&t.pendingUrl===url)&&!(!t.url&&t.pendingUrl===url))return false;await this.api.tabs.remove(id);return true;}catch{return false;}}
 async finish(j,result){if(j.finished)return;j.finished=true;clearTimeout(j.timer);let closed=null;if(j.tabId!==null)closed=await this.cleanup(j.tabId,j.url);if(this.job===j)this.job=null;j.resolve({...result,cleanup:closed});}
 abort(owner){const j=this.job;if(!j||j.finished||j.owner!==owner)return {ok:false,error:'No matching active test'};void this.finish(j,{ok:false,error:'Aborted'});return {ok:true};}
 accept(m,s){const j=this.job;if(!j||j.finished||s?.url!==j.url||s?.frameId!==0||m?.id!==j.id)return {ok:false,error:'Unrecognized target'};
  if(j.tabId===null)return {ok:false,retry:true};if(s?.tab?.id!==j.tabId)return {ok:false,error:'Wrong target tab'};
  if(m.type==='ready'){j.ready=true;return this.adapter.ready(j.ref);}
  if(m.type==='observed'&&j.ready){try{const result=this.adapter.observe(j.ref,m,j.started);void this.finish(j,{ok:true,result,mode:j.mode});return {ok:true};}catch{void this.finish(j,{ok:false,error:'Invalid fixture observation'});return {ok:false};}}
  return {ok:false,error:'Unexpected message'};
 }
 removed(id){const j=this.job;if(j?.tabId===id&&!j.finished)void this.finish(j,{ok:false,error:'Target tab closed'});}
}
