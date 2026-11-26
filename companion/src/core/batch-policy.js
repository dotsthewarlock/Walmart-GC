// Explicit foreground batch boundary, shared by both distributions.
export const STEP_MS=1400, RESPONSE_MS=30000;
export const batchDelay=()=>STEP_MS;
export class ForegroundBatch {
 constructor(){this.enabled=false;this.target=10;this.completed=0;this.segmentLimit=10;this.running=false;this.count=0;this.generation=0;}
 setTarget(target){if(this.running||![0,10,25,50].includes(target))return false;this.enabled=target!==0;this.target=target||10;this.completed=0;return true;}
 start(visible){if(!this.enabled||!visible||this.running)return false;if(this.completed>=this.target)this.completed=0;this.segmentLimit=this.target-this.completed;this.running=true;this.count=0;this.generation++;return true;}
 canSubmit(visible){return this.enabled&&this.running&&visible&&this.count<this.segmentLimit;}
 submitted(){if(!this.canSubmit(true))return false;this.count++;return true;}
 verified(){if(!this.running||this.completed>=this.target)return false;this.completed++;return true;}
 stop(){this.running=false;this.generation++;}
}
