// Explicit foreground batch boundary, shared by both distributions.
export const BATCH_LIMIT=10, STEP_MS=1200, LONG_STEP_MS=2400, COOLDOWN_MS=10000, RESPONSE_MS=30000;
export const batchDelay=count=>count%2===0?LONG_STEP_MS:STEP_MS;
export class ForegroundBatch {
 constructor(now=()=>Date.now()){this.now=now;this.enabled=false;this.target=10;this.completed=0;this.segmentLimit=BATCH_LIMIT;this.running=false;this.count=0;this.cooldownUntil=0;this.generation=0;}
 setTarget(target){if(this.running||![0,10,25,50].includes(target))return false;this.enabled=target!==0;this.target=target||10;this.completed=0;return true;}
 start(visible){if(!this.enabled||!visible||this.running||this.now()<this.cooldownUntil)return false;if(this.completed>=this.target)this.completed=0;this.segmentLimit=Math.min(BATCH_LIMIT,this.target-this.completed);this.running=true;this.count=0;this.generation++;return true;}
 canSubmit(visible){return this.enabled&&this.running&&visible&&this.count<this.segmentLimit;}
 submitted(){if(!this.canSubmit(true))return false;this.count++;return true;}
 verified(){if(!this.running||this.completed>=this.target)return false;this.completed++;return true;}
 stop(rest=false){if(this.running&&(rest||this.count>=BATCH_LIMIT))this.cooldownUntil=Math.max(this.cooldownUntil,this.now()+COOLDOWN_MS);this.running=false;this.generation++;}
 get cooling(){return this.now()<this.cooldownUntil;}
}
