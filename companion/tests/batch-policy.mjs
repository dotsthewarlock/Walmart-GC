import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ForegroundBatch,BATCH_LIMIT,batchDelay,COOLDOWN_MS} from '../src/core/batch-policy.js';
test('foreground batch requires opt-in and explicit start; cap and rest enforced',()=>{
 let now=0;const b=new ForegroundBatch(()=>now);assert.equal(b.start(true),false);b.enabled=true;assert.equal(b.start(false),false);assert.equal(b.start(true),true);assert.equal(b.canSubmit(false),false);
 for(let n=0;n<BATCH_LIMIT;n++)assert.equal(b.submitted(),true);assert.equal(b.canSubmit(true),false);assert.equal(b.submitted(),false);b.stop();assert.equal(b.start(true),false);now+=COOLDOWN_MS;assert.equal(b.start(true),true);assert.equal(b.count,0);
});
test('stop invalidates pending generation; disabled mode cannot submit',()=>{
 const b=new ForegroundBatch();b.enabled=true;b.start(true);const g=b.generation;b.stop();assert.notEqual(b.generation,g);assert.equal(b.canSubmit(true),false);b.start(true);b.enabled=false;assert.equal(b.canSubmit(true),false);
});
test('baseline pacing retained',()=>{assert.equal(batchDelay(1),1200);assert.equal(batchDelay(2),2400);assert.equal(COOLDOWN_MS,10000);});

test('cleanup after completed cooldown cannot restart the rest clock',()=>{let now=0;const b=new ForegroundBatch(()=>now);b.enabled=true;b.start(true);for(let i=0;i<BATCH_LIMIT;i++)b.submitted();b.stop(true);const deadline=b.cooldownUntil;now+=5000;b.stop();assert.equal(b.cooldownUntil,deadline);now+=5000;b.stop();assert.equal(b.cooling,false);assert.equal(b.start(true),true);assert.equal(b.count,0);});
test('review targets retain explicit ten-submission boundaries and final partial segment',()=>{let now=0;const b=new ForegroundBatch(()=>now);assert(b.setTarget(25));for(const size of [10,10,5]){assert(b.start(true));assert.equal(b.segmentLimit,size);for(let i=0;i<size;i++){assert(b.submitted());assert(b.verified());}assert.equal(b.submitted(),false);b.stop(true);assert.equal(b.start(true),false);now+=COOLDOWN_MS;}assert.equal(b.completed,25);assert(b.start(true));assert.equal(b.completed,0);assert.equal(b.segmentLimit,10);assert.equal(b.setTarget(50),false);b.stop();assert(b.setTarget(0));assert.equal(b.start(true),false);});
