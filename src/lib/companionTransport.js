export const companionExtensionId='gmmgofgdleacbpalihfehpllgbbgjooo';
export async function sendCompanion(message,runtime=globalThis.chrome?.runtime,timeoutMs=5000){
 if(typeof runtime?.sendMessage!=='function')throw Error('Companion extension unavailable. Use Copy selected cards or Manual.');
 let timer;
 try{
  const response=await Promise.race([new Promise((resolve,reject)=>{
   try{runtime.sendMessage(companionExtensionId,message,reply=>{if(runtime.lastError)reject(Error('Companion unavailable'));else resolve(reply);});}catch{reject(Error('Companion unavailable'));}
  }),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Companion transfer interrupted')),timeoutMs);})]);
  if(response?.ok!==true||response.version!==1||response.sessionId!==message.sessionId)throw Error('Companion transfer unavailable or expired. Cancel transfer and use saved requests or Manual.');
  return response;
 }finally{clearTimeout(timer);}
}
