import {test,expect,chromium} from '@playwright/test';
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const walletURL='https://walmart-gc.dotsthewarlock.com/';
const checker='https://www.walmart.ca/en/account/giftcards/balance';
const extensionId='gmmgofgdleacbpalihfehpllgbbgjooo';
const fixture=`<!doctype html><meta charset="utf-8"><h1>Synthetic checker</h1><form id="check-gift-card-balance-form"><input name="gc-number" autocomplete="off"><input name="securitycode" autocomplete="off"><button type="submit">Check Balance</button></form><script>window.submissions=0;document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();window.submissions++;const d=document.createElement('div');d.setAttribute('role','dialog');d.innerHTML='<h2>Gift card balance</h2><p class="cardnumber">Ending in '+document.querySelector('[name="gc-number"]').value.replace(/\\D/g,'').slice(-4)+'</p><p class="balance">Balance: $0.00</p><button>Check another card balance</button>';d.querySelector('button').onclick=()=>d.remove();document.body.append(d);});</script>`;

test('native extension directly transfers Batch v1 on inert origins, with explicit foreground start and document fencing',async({},info)=>{
 const ext=info.outputPath('extension');await mkdir(ext,{recursive:true});await cp(path.resolve('companion/gc-wallet-companion'),ext,{recursive:true});
 const launcher=path.join(ext,'checker-launcher.js');const source=await readFile(launcher,'utf8');
 expect(source).toContain("attachShadow({mode:'closed'})");await writeFile(launcher,source.replace("attachShadow({mode:'closed'})","attachShadow({mode:'open'})"));
 const context=await chromium.launchPersistentContext(info.outputPath('profile'),{channel:'chromium',headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`],viewport:{width:1400,height:900}});
 try{
  const blocked=[];
  await context.route('**/*',route=>{
   const url=route.request().url();
   if(url===walletURL)return route.fulfill({contentType:'text/html',body:'<!doctype html><h1>Inert Wallet transport fixture</h1>'});
   if(url===checker)return route.fulfill({contentType:'text/html',body:fixture});
   if(url.startsWith('chrome-extension://'))return route.continue();
   blocked.push(url);return route.abort();
  });
  const wallet=await context.newPage();await wallet.goto(walletURL);
  const sessionId=crypto.randomUUID(),refs=[crypto.randomUUID(),crypto.randomUUID()];
  const packet=['WMGC-REQUEST\t1','ref\tcardNumber\tpin',`${refs[0]}\t0000000000001111\t0001`,`${refs[1]}\t0000000000002222\t0002`].join('\n');
  const send=m=>wallet.evaluate(({extensionId,m})=>new Promise(resolve=>chrome.runtime.sendMessage(extensionId,m,r=>resolve(chrome.runtime.lastError?{ok:false}:r))),{extensionId,m});
  expect(await send({type:'wallet-transfer-request',version:1,sessionId,packet})).toEqual({ok:true,version:1,sessionId});
  const merchant=await context.newPage();await merchant.goto(checker);
  await merchant.locator('#gc-wallet-companion-launcher').click();
  const overlay=merchant.frameLocator('iframe[title="Private GC Wallet manual review"]');
  await overlay.locator('#start').click();await overlay.locator('#receiveWallet').click();
  await expect(overlay.locator('#status')).toContainText('Wallet cards received');expect(await merchant.evaluate(()=>submissions)).toBe(0);
  await overlay.locator('#autoProceed').focus();await overlay.locator('#autoProceed').press('ArrowDown');await overlay.locator('#autoProceed').press('Enter');await overlay.locator('#start').click();
  await expect(overlay.locator('#progress')).toContainText('2/2 completed',{timeout:15000});expect(await merchant.evaluate(()=>submissions)).toBe(2);
  await overlay.locator('#returnWallet').click();await expect(overlay.locator('#status')).toContainText('Results returned');
  await wallet.bringToFront();const result=await send({type:'wallet-transfer-results',version:1,sessionId});
  expect(result.ok).toBe(true);expect(result.packet).toContain(refs[0]+'\t0.00\t');expect(result.packet).toContain(refs[1]+'\t0.00\t');expect(result.packet).not.toContain('0000000000001111');
  expect((await send({type:'wallet-transfer-cancel',version:1,sessionId})).ok).toBe(true);
  const second=crypto.randomUUID(),secondRef=crypto.randomUUID();
  expect((await send({type:'wallet-transfer-request',version:1,sessionId:second,packet:`WMGC-REQUEST\t1\nref\tcardNumber\tpin\n${secondRef}\t0000000000003333\t0003`})).ok).toBe(true);
  await merchant.bringToFront();await overlay.locator('#queueTab').click();await overlay.locator('#clear').click();await overlay.locator('#confirmDialog [value="confirm"]').click();await overlay.locator('#receiveWallet').click();
  await expect(overlay.locator('#status')).toContainText('Wallet cards received');expect(await merchant.evaluate(()=>submissions)).toBe(2);
  await wallet.bringToFront();await wallet.reload();expect((await send({type:'wallet-transfer-results',version:1,sessionId:second})).ok).toBe(false);
  expect((await send({type:'wallet-transfer-request',version:1,sessionId:crypto.randomUUID(),packet})).ok).toBe(true);
  // No unexpected network or merchant services were called.
  expect(blocked).toEqual([]);
 }finally{await context.close();}
});
