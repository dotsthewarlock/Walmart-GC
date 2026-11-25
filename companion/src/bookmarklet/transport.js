// Synthetic fixture only; never read or submit a real merchant form.
export async function localSend(m){
 if(m?.type==='ping')return {ok:true,mode:'bookmarklet',version:VERSION,merchant:false};
 if(m?.type==='abort')return {ok:true};
 if(!validStart(m))return {ok:false};
 await new Promise(r=>setTimeout(r,120));
 return {ok:true,result:observation(m.ref,fixtureFor(m.ref)[3],new Date().toISOString()),cleanup:null};
}
