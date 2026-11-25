// Explicit foreground batch boundary, shared by both distributions.
export const BATCH_LIMIT=10, STEP_MS=1200, LONG_STEP_MS=2400, COOLDOWN_MS=10000, RESPONSE_MS=30000;
export const batchDelay=count=>count%2===0?LONG_STEP_MS:STEP_MS;
export class ForegroundBatch {
 constructor(now=()=>Date.now()){this.now=now;this.enabled=false;this.running=false;this.count=0;this.cooldownUntil=0;this.generation=0;}
 start(visible){if(!this.enabled||!visible||this.running||this.now()<this.cooldownUntil)return false;this.running=true;this.count=0;this.generation++;return true;}
 canSubmit(visible){return this.enabled&&this.running&&visible&&this.count<BATCH_LIMIT;}
 submitted(){if(!this.canSubmit(true))return false;this.count++;return true;}
 stop(rest=false){if(this.running&&(rest||this.count>=BATCH_LIMIT))this.cooldownUntil=Math.max(this.cooldownUntil,this.now()+COOLDOWN_MS);this.running=false;this.generation++;}
 get cooling(){return this.now()<this.cooldownUntil;}
}
