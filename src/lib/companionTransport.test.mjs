import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WalletTransport,walletSender} from '../../companion/src/core/wallet-transport.js';
import {HEAD,REQUEST_HEAD} from '../../companion/src/core/wire.js';
import {sendCompanion,companionExtensionId} from './companionTransport.js';
const now=Date.now();
const observedAt=new Date(now+1000).toISOString();
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const wallet={origin:'https://walmart-gc.dotsthewarlock.com',url:'https://walmart-gc.dotsthewarlock.com/',frameId:0,tab:{id:1},documentId:'wallet-document'};
const receiver={tab:{id:2},frameId:1,documentId:'overlay-document'};
const request={type:'wallet-transfer-request',version:1,sessionId:id,packet:REQUEST_HEAD+'\n'+ids.map((ref,i)=>`${ref}\t60370000000000${i?84:42}\t1234`).join('\n')};
const results=(refs=ids,amount='12.34')=>HEAD+'\n'+refs.map(ref=>`${ref}\t${amount}\t${observedAt}`).join('\n');
const message=type=>({type,version:1,sessionId:id});
function setup(){const broker=new WalletTransport(()=>now);assert(broker.external(request,wallet).ok);return broker;}
test('transport admits only exact Wallet top-level documents and strict v1 messages',()=>{
 assert(walletSender(wallet));
 for(const s of [{...wallet,id:'other-extension'},{...wallet,origin:'https://evil.test'},{...wallet,url:wallet.url+'evil'},{...wallet,frameId:1},{...wallet,documentId:undefined},{...wallet,tab:{}}]){assert.equal(walletSender(s),false);assert.equal(new WalletTransport().external(request,s).ok,false);}
 for(const m of [{...request,version:2},{...request,extra:true},{...request,type:'start'},{...request,sessionId:'bad'},{...request,packet:request.packet+'\tsecret'}])assert.equal(new WalletTransport().external(m,wallet).ok,false);
});
test('single ephemeral delivery is bound to receiver and originating Wallet document',()=>{
 const b=setup();assert.equal(b.external(request,wallet).ok,false);
 assert.equal(b.internal({type:'wallet-transfer-take',version:1},receiver,false).ok,false);
 const delivery=b.internal({type:'wallet-transfer-take',version:1},receiver,true);assert.equal(delivery.packet,request.packet);assert.equal(b.transfer.packet,null);
 assert.equal(b.internal({type:'wallet-transfer-take',version:1},receiver,true).ok,false);
 assert.equal(b.external(message('wallet-transfer-results'),{...wallet,tab:{id:9}}).ok,false);
 assert.equal(b.external({...message('wallet-transfer-results'),sessionId:ids[0]},wallet).ok,false);
 assert.equal(b.internal({...message('wallet-transfer-return'),packet:results()}, {...receiver,documentId:'new-frame'},true).ok,false);
});
test('fresh authorized document retires credentials and can send a replacement without inheriting results',()=>{
 const b=setup(),fresh={...wallet,documentId:'reloaded'};
 assert.equal(b.external(message('wallet-transfer-results'),fresh).ok,false);assert.equal(b.transfer,null);
 assert(b.external({...request,sessionId:ids[0]},fresh).ok);
 b.removed(wallet.tab.id);assert.equal(b.transfer,null);
});
test('partial observations, exact replay and atomic rejection retain previous results',()=>{
 const b=setup();b.internal({type:'wallet-transfer-take',version:1},receiver,true);
 const ret=packet=>b.internal({...message('wallet-transfer-return'),packet},receiver,true);
 assert(ret(results([ids[0]])).ok);assert(ret(results([ids[0]])).ok);
 const before=b.external(message('wallet-transfer-results'),wallet).packet;
 assert.equal(ret(results([ids[0]],'99.00')).ok,false);
 assert.equal(ret(results([ids[1]])+'\nbad').ok,false);
 assert.equal(ret(results(['33333333-3333-4333-8333-333333333333'])).ok,false);
 assert.equal(b.external(message('wallet-transfer-results'),wallet).packet,before);
 assert(ret(results()).ok);assert.equal(b.external(message('wallet-transfer-results'),wallet).packet,results());
});
test('expiry, explicit cancellation, closure and worker restart never resume credentials',()=>{
 const b=setup();b.now=()=>now+31*60000;assert.equal(b.internal({type:'wallet-transfer-take',version:1},receiver,true).ok,false);assert.equal(b.transfer,null);
 const c=setup();assert(c.external(message('wallet-transfer-cancel'),wallet).ok);assert.equal(c.transfer,null);
 const d=setup();d.removed(1);assert.equal(d.transfer,null);
 assert.equal(new WalletTransport().external(message('wallet-transfer-results'),wallet).ok,false);
});
test('Wallet client checks extension identity, correlation, errors and bounded timeout',async()=>{
 const m=message('wallet-transfer-results');
 assert.equal((await sendCompanion(m,{sendMessage(target,msg,reply){assert.equal(target,companionExtensionId);assert.deepEqual(msg,m);reply({ok:true,version:1,sessionId:id,packet:null});}})).packet,null);
 await assert.rejects(sendCompanion(m,{sendMessage(_,__,reply){reply({ok:true,version:2,sessionId:id});}}));
 await assert.rejects(sendCompanion(m,{sendMessage(_,__,reply){reply({ok:true,version:1,sessionId:ids[0]});}}));
 await assert.rejects(sendCompanion(m,{}),/unavailable/);
 await assert.rejects(sendCompanion(m,{sendMessage(){}},5),/interrupted/);
});
