import {TARGET,fixtureFor,observation} from './protocol.js';
// Adapter boundary: target, initialization marker, and observation validation.
// No real merchant adapter is registered or enabled in this build.
export const syntheticAdapter=Object.freeze({
 target(mode,api,id){return (mode==='external'?TARGET:api.runtime.getURL('fixture.html'))+'?job='+id;},
 accepts(ref){return !!fixtureFor(ref);},
 ready(ref){return {ok:true,marker:'GC_SYNTHETIC_ONLY',index:fixtureFor(ref)[0][0]};},
 observe(ref,message,earliest){return observation(ref,message.amount,message.at,Date.now(),earliest);}
});
