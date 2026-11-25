import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copyExplicit,copyAllowed} from '../gc-wallet-companion/clipboard.js';
const id='fixture',base='chrome-extension://fixture/',s={id,url:base+'overlay.html',origin:base.slice(0,-1),frameId:1,tab:{url:'https://www.walmart.ca/en/account/giftcards/balance'}},api={runtime:{id,getURL:()=>base}};
const message=(kind,text)=>({type:'clipboard-copy',kind,text});
const ref='11111111-1111-4111-8111-111111111111',at='2026-01-01T00:00:00.000Z';
const wallet='WMGC-RESULT\t1\nref\tbalanceCAD\tcheckedAt\n'+[ref,'0.00',at].join('\t');
const legacy='Row\tLast4\tBalance CAD\tLast checked UTC\tStatus\n1\t1111\t0.00\t'+at+'\tverified\n2\t2222\t\t\tpending';
test('clipboard accepts only bounded typed data from authorized overlay',()=>{
 for(const [kind,text] of [['number','0000000000001111'],['pin','0001'],['wallet',wallet],['legacy',legacy]])assert.equal(copyAllowed(message(kind,text),s,id,base),true);
 for(const m of [message('number','123'),message('pin','12345'),message('wallet',wallet+'\n'+[ref,'0.00',at].join('\t')),message('wallet','WMGC-REQUEST\t1\nref\tcardNumber\tpin'),message('legacy',legacy+'\n3\t0000000000001111\t\t\tpending'),message('unknown','0001'),{...message('pin','0001'),extra:true}])assert.equal(copyAllowed(m,s,id,base),false);
 for(const sender of [{...s,id:'foreign'},{...s,frameId:0},{...s,url:base+'popup.html'},{...s,tab:{url:'https://example.test'}}])assert.equal(copyAllowed(message('pin','0001'),sender,id,base),false);
});
test('worker returns success only after clipboard write, never echoes copied payload',async()=>{
 const writes=[];const clip={writeText:async t=>writes.push(t)};
 assert.deepEqual(await copyExplicit(message('pin','0001'),s,api,clip),{ok:true});assert.deepEqual(writes,['0001']);
 assert.deepEqual(await copyExplicit(message('wallet',wallet),s,api,clip),{ok:true});assert.equal(writes[1],wallet);
 assert.deepEqual(await copyExplicit(message('number','123'),s,api,clip),{ok:false});assert.equal(writes.length,2);
 assert.deepEqual(await copyExplicit(message('pin','0001'),s,api,undefined),{ok:false});
 assert.deepEqual(await copyExplicit(message('pin','0001'),s,api,{writeText:async()=>{throw Error('blocked')}}),{ok:false});
});
