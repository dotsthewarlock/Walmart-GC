import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ForegroundBatch,batchDelay} from '../src/core/batch-policy.js';

test('batch requires opt-in, explicit start and foreground visibility',()=>{
 const b=new ForegroundBatch();assert.equal(b.start(true),false);assert(b.setTarget(25));assert.equal(b.start(false),false);assert(b.start(true));assert.equal(b.canSubmit(false),false);assert.equal(b.setTarget(50),false);
});
test('selected targets run without ten-card interruptions and stop at their limit',()=>{
 for(const target of [10,25,50]){const b=new ForegroundBatch();assert(b.setTarget(target));assert(b.start(true));for(let i=0;i<target;i++){assert(b.submitted());assert(b.verified());}assert.equal(b.submitted(),false);assert.equal(b.completed,target);b.stop();assert(b.start(true));assert.equal(b.completed,0);}
});
test('pause invalidates pending work and resumes the remaining target immediately',()=>{
 const b=new ForegroundBatch();b.setTarget(25);b.start(true);for(let i=0;i<12;i++){assert(b.submitted());assert(b.verified());}const g=b.generation;b.stop();assert.notEqual(b.generation,g);assert.equal(b.canSubmit(true),false);assert(b.start(true));assert.equal(b.segmentLimit,13);b.stop();assert(b.setTarget(0));assert.equal(b.start(true),false);
});
test('pacing is fixed at 1400 milliseconds',()=>{for(let n=1;n<=50;n++)assert.equal(batchDelay(n),1400);});
