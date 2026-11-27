import {cardA} from './syncFixtures.mjs';

// Accumulated persisted recovery, including repeated warnings; not an import.
export function persistedRecoveryFixture() {
  const at='2026-11-26T10:00:00.000Z';
  const cards=Array.from({length:621},(_,index)=>({...cardA,
    cardNumber:'63'+String(100000+index).padStart(14,'0'),notes:'Synthetic '+index,
    used:index<6,dateUsed:index<6?'2026-11-20':'',currentBalance:index<10?0:100,
    lastBalanceChecked:'2026-11-20',lastBalanceCheckedAt:'2026-11-20T10:00:00.000Z'}));
  const evidence={cards:{},tombstones:{}};
  const add=(index,kind,values)=>{
    const number=cards[index].cardNumber,entry=evidence.cards[number]??={money:2,moneyAt:at,conflicts:[]};
    entry.conflicts.push({id:kind+':'+number+':'+entry.conflicts.length,kind,at,operationIds:[],...values});
  };
  for(let index=0;index<65;index++) {
    add(index,'field:dateAdded',{local:'2023-11-01',remote:cards[index].dateAdded,base:cards[index].dateAdded});
    add(index,'field:dateUpdated',{local:'2026-11-01',remote:cards[index].dateUpdated,base:cards[index].dateUpdated});
  }
  for(let index=0;index<72;index++)add(index,'missing-remote',{local:{...cards[index]},remote:null,base:{...cards[index]}});
  for(let index=0;index<63;index++)add(index%21,'balance',{local:50,remote:cards[index%21].currentBalance,base:100});
  for(let index=0;index<20;index++)add(index,'field:lastBalanceChecked',{local:'2026-11-21',remote:cards[index].lastBalanceChecked,base:null});
  return {cards,evidence,at};
}
