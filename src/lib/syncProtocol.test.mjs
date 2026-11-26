import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconcile,emptyEvidence,fingerprint,canonical,materialize} from './syncProtocol.js';
import {cardA as a,cardB as b,operation} from '../../tests/syncFixtures.mjs';
const merge=(base,local,remote,operations=[],extra={})=>reconcile({base,local,remote,operations,...extra});
test('independent additions, independent fields, exact equivalent notes and optional metadata survive',async()=>{
 assert.equal(merge([], [a],[b]).cards.length,2);
 const result=merge([a],[{...a,notes:'local'}],[{...a,used:true,dateUsed:'2026-11-25',lastBalanceChecked:'2026-11-25',pendingReconciliation:false}]);
 assert.equal(result.cards[0].notes,'local');assert.equal(result.cards[0].used,true);assert.equal(result.cards[0].lastBalanceChecked,'2026-11-25');
 assert.equal(merge([a],[{...a,notes:'same'}],[{...a,notes:'same'}]).evidence.cards[a.cardNumber],undefined);
 assert.equal(await fingerprint({b:2,a:1}),await fingerprint({a:1,b:2}));assert.ok(canonical(a));
});
test('equal resulting monetary values from distinct actions conflict; remote is provisional with shared evidence',()=>{
 const after={...a,currentBalance:80};
 const result=merge([a],[after],[after],[operation('spend-B',a,after,'set-balance')],{baseEvidence:emptyEvidence(),evidence:{cards:{[a.cardNumber]:{money:1,conflicts:[]}},tombstones:{}}});
 assert.equal(result.cards[0].currentBalance,80);assert.equal(result.cards[0].pendingReconciliation,true);
 assert.equal(result.evidence.cards[a.cardNumber].conflicts[0].local,80);
});
test('different balances preserve remote and unrelated additions; later applicable genuine verification clears uncertainty',()=>{
 const local={...a,currentBalance:70},remote={...a,currentBalance:80};
 const disputed=merge([a],[local,b],[remote],[operation('spend-A',a,local,'set-balance')]);
 assert.equal(disputed.cards.find(c=>c.cardNumber===a.cardNumber).currentBalance,80);assert.equal(disputed.cards.length,2);
 const observed={...remote,currentBalance:75,lastBalanceChecked:'2026-11-26',dateUpdated:'2026-11-26',pendingReconciliation:false};
 const verified=merge([remote],[observed],disputed.cards,[operation('verified',remote,observed,'manual-verification',{checkedAt:'2026-11-26T12:00:00.000Z',observedBalance:75})],{evidence:disputed.evidence,now:'2026-11-26T12:00:01.000Z'});
 assert.equal(verified.cards.find(c=>c.cardNumber===a.cardNumber).pendingReconciliation,false);
});
test('conflicting notes and PINs retain both alternatives; missing rows never imply deletion',()=>{
 const notes=merge([a],[{...a,notes:'local'}],[{...a,notes:'remote'}]);assert.equal(notes.cards[0].notes,'remote');assert.equal(notes.evidence.cards[a.cardNumber].conflicts[0].local,'local');
 const pin=merge([a],[{...a,pin:'9999'}],[a]);assert.equal(pin.cards[0].pin,a.pin);assert.equal(pin.evidence.cards[a.cardNumber].conflicts[0].local.pin,'9999');
 const missing=merge([a],[a],[]);assert.equal(missing.cards.length,1);assert.equal(missing.evidence.cards[a.cardNumber].conflicts[0].kind,'missing-remote');
});
test('explicit tombstones block stale resurrection while preserving targeted credentials',()=>{
 const evidence={cards:{},tombstones:{[a.cardNumber]:{id:'delete-a'}}};
 const result=merge([a],[a,b],[],[],{evidence});assert.deepEqual(result.cards,[b]);assert.equal(result.evidence.cards[a.cardNumber].conflicts[0].local.pin,a.pin);
 const restored=merge([a],[a],[],[{id:'restore-a',cardNumber:a.cardNumber,kind:'resolve-conflict',choice:'restore',conflictId:'delete-a'}],{evidence});assert.equal(restored.cards[0].cardNumber,a.cardNumber);assert.equal(restored.cards[0].pendingReconciliation,true);
});
test('unknown initial baseline never silently replaces monetary or credential data',()=>{
 const result=merge([],[{...a,currentBalance:10}],[a]);assert.equal(result.cards[0].currentBalance,100);assert.equal(result.cards[0].pendingReconciliation,true);
 assert.equal(result.evidence.cards[a.cardNumber].conflicts[0].local,10);assert.equal(result.evidence.cards[a.cardNumber].conflicts[0].remote,100);
});
test('ordinary edits do not clear an existing uncertain balance or silently add false metadata',()=>{
 const evidence={cards:{[a.cardNumber]:{money:1,uncertainSince:'2026-11-25T00:00:00.000Z',conflicts:[]}},tombstones:{}};
 const saved={...a,pendingReconciliation:true},after={...saved,currentBalance:60};
 const result=merge([saved],[after],[saved],[operation('ordinary',saved,after,'set-balance')],{evidence,baseEvidence:evidence});
 assert.equal(result.cards[0].currentBalance,100);assert.equal(result.cards[0].pendingReconciliation,true);
 const checked={...a,lastBalanceChecked:'2026-11-25'};
 const verified=merge([a],[checked],[a],[operation('unchanged',a,checked,'manual-verification',{checkedAt:'2026-11-25T01:00:00.000Z'})],{now:'2026-11-25T01:00:01.000Z'});
 assert.equal(verified.cards[0].pendingReconciliation,undefined);
});
test('malformed or inapplicable verification cannot clear balance uncertainty',()=>{
 const saved={...a,pendingReconciliation:true},evidence={cards:{[a.cardNumber]:{money:1,uncertainSince:'2026-11-25T00:00:00.000Z',conflicts:[]}},tombstones:{}};
 for(const observation of [{checkedAt:'2026-11-25T01:00:00.000Z'},{checkedAt:'invalid',observedBalance:100},{checkedAt:'2026-11-25T01:00:00.000Z',observedBalance:50}]){
  const after={...saved,pendingReconciliation:false,lastBalanceChecked:'2026-11-25'};
  const result=merge([saved],[after],[saved],[operation('inapplicable',saved,after,'manual-verification',observation)],{evidence,baseEvidence:evidence,now:'2026-11-25T01:00:01.000Z'});
  assert.equal(result.cards[0].pendingReconciliation,true);
 }
});
test('a later monetary action cannot use an earlier verification to clear uncertainty',()=>{
 const saved={...a,pendingReconciliation:true},evidence={cards:{[a.cardNumber]:{money:1,uncertainSince:'2026-11-25T00:00:00.000Z',conflicts:[]}},tombstones:{}};
 const checked={...saved,currentBalance:80,lastBalanceChecked:'2026-11-25',pendingReconciliation:false};
 const spent={...checked,currentBalance:60};
 const ops=[operation('check',saved,checked,'manual-verification',{checkedAt:'2026-11-25T01:00:00.000Z',observedBalance:80}),operation('spend',checked,spent,'set-balance')];
 const result=merge([saved],[spent],[saved],ops,{evidence,baseEvidence:evidence,now:'2026-11-25T01:00:01.000Z'});
 assert.equal(result.cards[0].currentBalance,saved.currentBalance);
 assert.equal(result.cards[0].pendingReconciliation,true);
});
test('explicit notes/PIN resolution consumes only a still-applicable conflict and preserves alternatives',()=>{
 for(const field of ['notes','pin']){
  const local={...a,[field]:field==='pin'?'9999':'local note'},remote={...a,[field]:field==='pin'?'1111':'remote note'};
  const disputed=merge([a],[local],[remote],[operation('original',a,local)],{now:'2026-11-25T00:00:00.000Z'});
  const conflict=disputed.evidence.cards[a.cardNumber].conflicts[0];
  const op={...operation('resolution',remote,local,'resolve-conflict'),conflictId:conflict.id,choice:'local'};
  const resolved=merge([remote],[local],[remote],[op],{evidence:disputed.evidence,baseEvidence:disputed.evidence});
  assert.equal(resolved.cards[0][field],local[field]);assert.equal(resolved.evidence.cards[a.cardNumber].conflicts.filter(c=>!c.resolution).length,0);assert.ok(resolved.evidence.cards[a.cardNumber].conflicts[0].remote);
  const later={...remote,[field]:field==='pin'?'2222':'later remote note'};
  const stale=merge([remote],[local],[later],[op],{evidence:disputed.evidence,baseEvidence:disputed.evidence});
  assert.equal(stale.cards[0][field],later[field]);assert.ok(stale.evidence.cards[a.cardNumber].conflicts.some(c=>!c.resolution));
 }
});
test('semantic replay for a missing card retains its full credentials rather than constructing a partial row',async()=>{
 const {materialize}=await import('./syncProtocol.js');const after={...a,notes:'edited while remote removed'};
 const [rebased]=materialize([], [operation('missing-identity',a,after)]);assert.equal(rebased.cardNumber,a.cardNumber);assert.equal(rebased.pin,a.pin);assert.equal(rebased.notes,after.notes);
});
test('CSV uncertainty is active without a balance change and unchanged inventories do not acquire revision backfill',()=>{
 const flagged={...a,pendingReconciliation:true};const result=merge([a],[flagged],[a],[operation('csv-flag',a,flagged,'csv-recovery')]);
 assert.equal(result.cards[0].pendingReconciliation,true);assert.ok(result.evidence.cards[a.cardNumber].uncertainSince);
 assert.deepEqual(merge([a,b],[a,b],[a,b]).evidence.cards,{});
 assert.deepEqual(merge([],[a,b],[],[operation('csv-a',null,a,'csv-recovery'),operation('csv-b',null,b,'csv-recovery')]).evidence.cards,{});
});
test('CSV verification metadata updates persist even with an unchanged balance, while monetary conflicts keep remote dates',()=>{
 const dated={...a,lastBalanceChecked:'2026-11-20'},imported={...dated,lastBalanceChecked:'2026-11-25'};
 const result=merge([dated],[imported],[dated],[operation('csv-date',dated,imported,'csv-recovery')]);assert.equal(result.cards[0].lastBalanceChecked,'2026-11-25');
 const remote={...dated,currentBalance:80,lastBalanceChecked:'2026-11-24',dateUpdated:'2026-11-24'},local={...dated,currentBalance:70,lastBalanceChecked:'2026-11-25',dateUpdated:'2026-11-25'};
 const conflict=merge([dated],[local],[remote],[operation('csv-money',dated,local,'csv-recovery')]);assert.equal(conflict.cards[0].lastBalanceChecked,'2026-11-24');assert.equal(conflict.cards[0].dateUpdated,'2026-11-24');
});
test('independent CSV metadata edits never combine a date and timestamp from different versions',()=>{
 const base={...a,lastBalanceChecked:'2026-11-24',lastBalanceCheckedAt:'2026-11-24T12:00:00.000Z'};
 const local={...a,lastBalanceChecked:'2026-11-25'};
 const remote={...base,lastBalanceCheckedAt:'2026-11-24T14:00:00.000Z'};
 const result=merge([base],[local],[remote],[operation('csv-date',base,local,'csv-recovery')]);
 assert.equal(result.cards[0].lastBalanceChecked,remote.lastBalanceChecked);
 assert.equal(result.cards[0].lastBalanceCheckedAt,remote.lastBalanceCheckedAt);
 assert.ok(result.evidence.cards[a.cardNumber].conflicts.length);
});
test('date-only pending operations cannot erase precise remote verification metadata',()=>{
 const old={...a,lastBalanceChecked:'2026-11-24'},after={...old,lastBalanceChecked:'2026-11-25',notes:'old backup'};
 const remote={...a,lastBalanceChecked:'2026-11-26',lastBalanceCheckedAt:'2026-11-26T10:00:00.000Z'};
 const op=operation('legacy-csv',old,after,'csv-recovery');
 const replay=materialize([remote],[op]);
 assert.equal(replay[0].lastBalanceCheckedAt,remote.lastBalanceCheckedAt);
 assert.equal(replay[0].lastBalanceChecked,remote.lastBalanceChecked);
 const result=merge([old],replay,[remote],[op]);
 assert.equal(result.cards[0].lastBalanceCheckedAt,remote.lastBalanceCheckedAt);
 assert.equal(result.cards[0].lastBalanceChecked,remote.lastBalanceChecked);
 assert.ok(result.evidence.cards[a.cardNumber].conflicts.some(c=>c.kind==='field:lastBalanceChecked'));
 const fromOldBase=merge([old],materialize([old],[op]),[remote],[op]);
 assert.equal(fromOldBase.cards[0].lastBalanceCheckedAt,remote.lastBalanceCheckedAt);
 assert.equal(fromOldBase.cards[0].lastBalanceChecked,remote.lastBalanceChecked);
});
test('remote verification clears inherited uncertainty without an unchanged device reasserting it',()=>{
 const before={...a,pendingReconciliation:true},remote={...a,pendingReconciliation:false,lastBalanceChecked:'2026-11-25'};
 const evidence={cards:{[a.cardNumber]:{money:2,conflicts:[]}},tombstones:{}};
 const result=merge([before],[{...before,notes:'independent note'}],[remote],[operation('note-after-verification',before,{...before,notes:'independent note'})],{evidence});
 assert.equal(result.cards[0].pendingReconciliation,false);assert.equal(result.cards[0].notes,'independent note');assert.equal(result.evidence.cards[a.cardNumber].uncertainSince,undefined);
});
test('fresh monetary verification reconciles its dates with the balance rather than creating date conflicts',()=>{
 const remote={...a,currentBalance:80,dateUpdated:'2026-11-24',lastBalanceChecked:'2026-11-24'},local={...a,currentBalance:70,dateUpdated:'2026-11-25',lastBalanceChecked:'2026-11-25'};
 const result=merge([a],[local],[remote],[operation('fresh-date',a,local,'manual-verification',{checkedAt:'2026-11-25T12:00:00.000Z',observedBalance:70})],{now:'2026-11-25T12:00:01.000Z'});
 assert.equal(result.cards[0].currentBalance,70);assert.equal(result.cards[0].dateUpdated,'2026-11-25');assert.equal(result.cards[0].lastBalanceChecked,'2026-11-25');assert.equal(result.evidence.cards[a.cardNumber].conflicts.length,0);
});
