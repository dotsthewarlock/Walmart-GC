import {test,expect} from '@playwright/test';
import {syntheticRemote,cardA,cardB} from '../syncFixtures.mjs';
import {setup,start,snapshot,active,settings} from './walletFixture.mjs';

async function switchInventory(page,key){
 await settings(page); await page.locator('#saved-inventory').selectOption(key);
 await expect.poll(async()=>(await snapshot(page)).active).toBe(key);
 await page.locator('#settings-back').click();
}
async function review(page){await page.locator('#nav-review').click();await page.getByRole('button',{name:/^Select cards \(/}).click();}
async function holdCommit(page,button){
 await page.evaluate(()=>{delete window.qaCompleteSelection;sessionStorage.setItem('qa-hold-selection','yes');});
 await button.click();await expect.poll(()=>page.evaluate(()=>typeof window.qaCompleteSelection)).toBe('function');
 await page.evaluate(()=>sessionStorage.removeItem('qa-hold-selection'));
}
async function releaseCommit(page){
 await page.evaluate(async()=>{await window.qaCompleteSelection();delete window.qaCompleteSelection;});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

test('P0.2 old Manual success preserves durable commit without advancing a new context queue or unlocking its command',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([cardA,cardB]);
 const qa=await setup(context,remote,[cardA,cardB]);
 const page=await context.newPage();await start(page);qa.mock.offline=true;await review(page);
 const cloud=(await snapshot(page)).active;
 await page.getByLabel('Verified balance (CAD)').fill('44.44');
 await holdCommit(page,page.getByRole('button',{name:'Save & next'}));
 await page.evaluate(()=>{window.qaOldCompletion=window.qaCompleteSelection;});
 const other=await context.newPage();await start(other);await switchInventory(other,'unbound');
 await expect(page.getByRole('button',{name:/^Select cards \(/})).toBeEnabled();
 await page.getByRole('button',{name:/^Select cards \(/}).click();
 await page.getByLabel('Verified balance (CAD)').fill('55.55');
 await holdCommit(page,page.getByRole('button',{name:'Save & next'}));
 await page.evaluate(async()=>{await window.qaOldCompletion();});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.getByRole('button',{name:'Save & next'})).toBeDisabled();
 await expect(page.getByText('Working selection: 2 cards · 0 verified',{exact:true})).toBeVisible();
 await releaseCommit(page);
 await expect(page.getByText('Working selection: 2 cards · 1 verified',{exact:true})).toBeVisible();
 expect((await snapshot(page)).profiles[cloud].cards[0].currentBalance).toBe(44.44);
 expect(active(await snapshot(page)).cards[0].currentBalance).toBe(55.55);
 expect(qa.errors).toEqual([]);
 await context.close();
});

test('P0.2 changed context clears busy and rejects late Batch preparation',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([cardA]);
 const qa=await setup(context,remote,[cardB]);const page=await context.newPage();await start(page);qa.mock.offline=true;
 await review(page);await page.getByRole('button',{name:'Companion / Batch',exact:true}).click();
 await holdCommit(page,page.getByRole('button',{name:'Prepare selected cards'}));
 const other=await context.newPage();await start(other);await switchInventory(other,'unbound');
 await expect(page.getByRole('button',{name:/^Select cards \(/})).toBeEnabled();
 await releaseCommit(page);
 await expect(page.getByText('Working selection: 1 cards · 0 verified',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Copy selected cards',exact:true})).toHaveCount(0);
 expect(qa.errors).toEqual([]);await context.close();
});

test('P0.2 frame-visible context fencing and same-context unmounted clipboard continuity',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([cardA]);
 const qa=await setup(context,remote,[cardB]);
 await context.addInitScript(()=>{
  window.qaCopyCallbacks=[];
  Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>new Promise(resolve=>window.qaCopyCallbacks.push(resolve))}});
 });
 const page=await context.newPage();await start(page);qa.mock.offline=true;await review(page);
 await page.getByLabel('Verified balance (CAD)').fill('PRIVATE OLD AMOUNT');
 await page.getByRole('button',{name:'Copy PIN',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>window.qaCopyCallbacks.length)).toBe(1);
 await page.locator('#nav-list').click();await page.evaluate(()=>window.qaCopyCallbacks[0]());
 await page.locator('#nav-review').click();
 await expect(page.getByText('PIN copied.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Verified balance (CAD)')).toHaveValue('PRIVATE OLD AMOUNT');
 await page.evaluate(()=>{
  window.qaPaints=[];window.qaWatchPaint=true;
  const sample=()=>{
   if(!window.qaWatchPaint)return;
   const heading=document.querySelector('#review-card-heading')?.textContent??'';
   const amount=document.querySelector('input[inputmode="decimal"]')?.value??'';
   const total=[...document.querySelectorAll('[role="status"][aria-label]')].map(el=>el.getAttribute('aria-label')).join(' ');
   window.qaPaints.push({heading,amount,total,text:document.body.textContent.includes('PIN copied.')});
   requestAnimationFrame(sample);
  };requestAnimationFrame(sample);
 });
 const other=await context.newPage();await start(other);await switchInventory(other,'unbound');
 await expect(page.locator('#review-card-heading')).toContainText('0084');
 await expect(page.getByLabel('Verified balance (CAD)')).toHaveValue('');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const frames=await page.evaluate(()=>{window.qaWatchPaint=false;return window.qaPaints;});
 const changed=frames.filter(frame=>frame.total.includes('$50.00')||frame.heading.includes('0084'));
 expect(changed.length).toBeGreaterThan(0);
 expect(changed.every(frame=>!frame.amount&&!frame.text&&frame.heading.includes('0084'))).toBe(true);
 expect(qa.errors).toEqual([]);await context.close();
});

test('P0.2 late Manual abort does not publish failure into a newer context draft',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([cardA]);
 const qa=await setup(context,remote,[cardB]);
 await context.addInitScript(()=>{
  const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'onabort');
  Object.defineProperty(IDBTransaction.prototype,'onabort',{...descriptor,set(handler){
   descriptor.set.call(this,event=>{
    if(sessionStorage.getItem('qa-hold-failure')==='yes')window.qaCompleteFailure=()=>handler.call(this,event);
    else handler.call(this,event);
   });
  }});
 });
 const page=await context.newPage();await start(page);qa.mock.offline=true;await review(page);
 await page.getByLabel('Verified balance (CAD)').fill('19.99');
 await page.evaluate(()=>{sessionStorage.setItem('qa-fail','yes');sessionStorage.setItem('qa-hold-failure','yes');});
 await page.getByRole('button',{name:'Save & next'}).click();
 await expect.poll(()=>page.evaluate(()=>typeof window.qaCompleteFailure)).toBe('function');
 const other=await context.newPage();await start(other);await switchInventory(other,'unbound');
 await page.getByLabel('Verified balance (CAD)').fill('88.88');
 await page.evaluate(()=>{sessionStorage.removeItem('qa-hold-failure');window.qaCompleteFailure();});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.getByLabel('Verified balance (CAD)')).toHaveValue('88.88');
 await expect(page.getByText('QA transaction failure',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Working selection: 1 cards · 0 verified',{exact:true})).toBeVisible();
 expect(active(await snapshot(page)).cards[0].currentBalance).toBe(50);
 expect(qa.errors).toEqual([]);await context.close();
});

test('P0.2 fallback clipboard retains Manual and Batch trigger focus and fences a late denied copy',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([cardA]);
 const qa=await setup(context,remote,[cardB]);
 await context.addInitScript(()=>{
  window.qaFallbackCopies=0;
  document.execCommand=()=>{window.qaFallbackCopies++;return true;};
  Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>window.qaHoldCopy?
   new Promise((_,reject)=>{window.qaRejectCopy=reject;}):Promise.reject(Error('Synthetic clipboard denial'))}});
 });
 const page=await context.newPage();await start(page);qa.mock.offline=true;await review(page);
 const manual=page.getByRole('button',{name:'Copy PIN',exact:true});await manual.focus();await manual.press('Enter');
 await expect(page.getByText('PIN copied.',{exact:true})).toBeVisible();await expect(manual).toBeFocused();
 await page.getByRole('button',{name:'Companion / Batch',exact:true}).click();
 await page.getByRole('button',{name:'Prepare selected cards'}).click();
 const batch=page.getByRole('button',{name:'Copy selected cards',exact:true});await batch.focus();await batch.press('Enter');
 await expect(page.getByText('Copied 1 requests. Paste them into the Companion.',{exact:true})).toBeVisible();
 await expect(batch).toBeFocused();expect(await page.evaluate(()=>window.qaFallbackCopies)).toBe(2);
 await page.getByRole('button',{name:'Manual',exact:true}).click();await page.evaluate(()=>window.qaHoldCopy=true);
 await manual.click();await expect.poll(()=>page.evaluate(()=>typeof window.qaRejectCopy)).toBe('function');
 const other=await context.newPage();await start(other);await switchInventory(other,'unbound');
 await expect(page.locator('#review-card-heading')).toContainText('0084');
 await page.evaluate(()=>window.qaRejectCopy(Error('Old denied copy')));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 expect(await page.evaluate(()=>window.qaFallbackCopies)).toBe(2);
 await expect(page.getByText('PIN copied.',{exact:true})).toHaveCount(0);
 expect(qa.errors).toEqual([]);await context.close();
});

test('P0.2 empty Companion receive restores the connected keyboard trigger',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([cardA]);
 const qa=await setup(context,remote,[]);
 await context.addInitScript(()=>{
  window.chrome={runtime:{sendMessage(_extension,message,reply){
   setTimeout(()=>reply({ok:true,version:1,sessionId:message.sessionId,packet:''}),50);
  }}};
 });
 const page=await context.newPage();await start(page);qa.mock.offline=true;await review(page);
 await page.getByRole('button',{name:'Companion / Batch',exact:true}).click();
 await page.getByRole('button',{name:'Prepare selected cards'}).click();
 await page.getByRole('button',{name:'Send to Companion',exact:true}).click();
 await expect(page.getByText(/Request sent\. Open/)).toBeVisible();
 const receive=page.getByRole('button',{name:'Receive Companion results',exact:true});
 await receive.focus();await receive.press('Enter');
 await expect(page.getByText('No results returned yet. Existing requests remain saved.',{exact:true})).toBeVisible();
 await expect(receive).toBeFocused();expect(qa.errors).toEqual([]);await context.close();
});
