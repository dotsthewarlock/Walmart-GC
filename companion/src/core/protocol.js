import {REQUEST_HEAD,HEAD,parseWireRequest,validateWireObservation,formatWireResults} from './wire.js';
export {HEAD};
export const VERSION='__COMPANION_VERSION__';
export const LAUNCHER='http://localhost:8765/launcher.html';
export const TARGET='http://127.0.0.1:8765/fixture.html';
export const FIXTURES=Object.freeze([
 ['11111111-1111-4111-8111-111111111111','0000000000001111','0001','12.34'],
 ['22222222-2222-4222-8222-222222222222','0000000000002222','0002','0.00'],
 ['33333333-3333-4333-8333-333333333333','0000000000003333','0003','1234.56']
].map(Object.freeze));
export const REQUEST=REQUEST_HEAD+'\n'+FIXTURES.map(f=>f.slice(0,3).join('\t')).join('\n');
export function parseRequest(raw){
 if(typeof raw!=='string'||raw.length>8192)throw Error('Invalid synthetic packet');
 return parseWireRequest(raw).map(r=>{const f=fixtureFor(r.ref);if(!f||f[1]!==r.cardNumber||f[2]!==r.pin)throw Error('Only bundled synthetic cards are allowed');return r.ref;});
}
export const fixtureFor=ref=>FIXTURES.find(f=>f[0]===ref);
export function validStart(m){return !!m&&m.type==='start'&&typeof m.ref==='string'&&!!fixtureFor(m.ref)&&Object.keys(m).length===2;}
export function observation(ref,amount,at,now=Date.now(),earliest=0){
 if(!fixtureFor(ref)||fixtureFor(ref)[3]!==amount)throw Error('Invalid synthetic observation');
 return validateWireObservation(ref,amount,at,now,earliest);
}
export function packet(results){for(const r of results)observation(r.ref,r.balanceCAD,r.checkedAt);return formatWireResults(results);}
export function allowedExternal(s){return s?.url===LAUNCHER&&s?.origin==='http://localhost:8765'&&s?.frameId===0&&Number.isInteger(s.tab?.id);}
