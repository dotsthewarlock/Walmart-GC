import {fingerprint,snapshotContent,syncProtocol,emptyEvidence} from '../src/lib/syncProtocol.js';
import {SerialCoordinator} from '../worker/src/syncCoordinator.js';
export const cardA={cardNumber:'6300000000010042',pin:'0042',startingBalance:100,currentBalance:100,merchant:'',merchantInferred:'walmart-ca',dateAdded:'2024-01-01',dateUpdated:'2024-01-01',dateUsed:'',used:false,notes:'Synthetic A'};
export const cardB={...cardA,cardNumber:'6300000000020084',pin:'0084',startingBalance:50,currentBalance:50,notes:'Synthetic B'};
export function memoryStorage(){
 const data=new Map();const storage={data,
  async get(key){return Array.isArray(key)?new Map(key.filter(k=>data.has(k)).map(k=>[k,structuredClone(data.get(k))])):structuredClone(data.get(key));},
  async put(key,value){data.set(key,structuredClone(value));},async delete(key){data.delete(key);},
  async transaction(fn){const before=structuredClone(data);try{return await fn(storage);}catch(error){data.clear();for(const [k,v] of before)data.set(k,v);throw error;}}
 };return storage;
}
export async function syntheticRemote(cards=[]){
  let snapshot={cards:structuredClone(cards),evidence:emptyEvidence(),version:'v0',commitId:'',protocol:syncProtocol,maintenance:false};
  snapshot.fingerprint=await fingerprint(snapshotContent(snapshot));
  const fixture={writes:0,fail:null,delay:null,beforeWrite:null};
  fixture.adapter={
    async read(){return structuredClone(snapshot);},
    async write(next,id,hash){fixture.writes++;await fixture.beforeWrite?.();if(fixture.fail==='before')throw Error('Synthetic lost request');if(fixture.delay)await fixture.delay;snapshot={...structuredClone(next),protocol:syncProtocol,version:'v'+fixture.writes,commitId:id,fingerprint:hash};if(fixture.fail==='after')throw Error('Synthetic lost response');},
  };
  fixture.coordinator=new SerialCoordinator(memoryStorage(),fixture.adapter);
  fixture.read=()=>fixture.adapter.read();
  fixture.directEdit=fn=>{fn(snapshot);};
  return fixture;
}
export function operation(id,before,after,kind='set-notes',observation){return {id,kind,cardNumber:after.cardNumber,before,after,revision:1,...(observation?{observation}: {})};}
export async function commitRequest(remote,cards,operations,id=crypto.randomUUID(),base){return {protocol:syncProtocol,principal:'synthetic-principal',sheetId:'synthetic-sheet',action:'commit',id,base:base??await remote.read(),cards,operations};}
