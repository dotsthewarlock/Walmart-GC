import {test,expect} from '@playwright/test';
import {syntheticRemote,cardA,cardB} from '../syncFixtures.mjs';
import {setup,start,snapshot,active,checkoutA,settings} from './walletFixture.mjs';

async function editSaved(page,change){
 await page.evaluate(async({change,number})=>{
  const {openInventory,profileOf}=await import('/src/lib/inventory.js');
  const store=await openInventory(),state=await store.read();await store.close();
  const p=profileOf(state);
  if(change==='reorder')p.cards.reverse();
  if(change==='remove')p.cards=p.cards.filter(card=>card.cardNumber!==number);
  if(change==='filter')p.cards.find(card=>card.cardNumber===number).used=true;
  if(change==='pin')p.cards.find(card=>card.cardNumber===number).pin='9999';
  if(change==='generation')state.contextGeneration=(state.contextGeneration??0)+2;
  state.revision++;
  await new Promise((resolve,reject)=>{const req=indexedDB.open('walmartGc.inventory',1);req.onsuccess=()=>{
   const db=req.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(state,'wallet');
   tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);
  };});
 },{change,number:cardA.cardNumber});
}

test('P1.2 selected Checkout card saves changed, unchanged and zero offline; abort/retry and mobile focus',async({browser})=>{
 const context=await browser.newContext({viewport:{width:412,height:923}}),qa=await setup(context,await syntheticRemote([cardA,cardB]),[]);
 const page=await context.newPage();await start(page);qa.mock.offline=true;await checkoutA(page);
 await expect(page.getByRole('button',{name:'Update Balance',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Mark Used',exact:true})).toBeVisible();
 for(const value of ['27.31','unchanged','0']){
  await page.locator('#verify-balance').click();
  await expect(page.locator('#review-card-heading')).toContainText('0042');
  await expect(page.locator('#wallet-section-heading')).toBeFocused();
  await expect(page.getByRole('button',{name:'Companion / Batch',exact:true})).toHaveCount(0);
  await expect(page.locator('#nav-list')).toBeDisabled();
  if(value==='27.31')await page.screenshot({path:test.info().outputPath('single-card-mobile.png'),fullPage:true});
  if(value==='unchanged')await page.getByRole('button',{name:'Confirm unchanged',exact:true}).click();
  else {
   await page.getByLabel('Verified balance (CAD)').fill(value);
   if(value==='27.31'){
    await page.evaluate(()=>sessionStorage.setItem('qa-fail','yes'));
    await page.getByRole('button',{name:'Save & return',exact:true}).click();
    await expect(page.getByText('QA transaction failure',{exact:true})).toBeVisible();
    await expect(page.getByLabel('Verified balance (CAD)')).toHaveValue(value);
    expect(active(await snapshot(page)).cards[0].currentBalance).toBe(100);
   }
   await page.getByRole('button',{name:'Save & return',exact:true}).click();
  }
  await expect(page.locator('#verify-balance')).toBeFocused();
  const p=active(await snapshot(page));expect(p.cards[0].currentBalance).toBe(value==='0'?0:27.31);
  expect(p.cards[1].currentBalance).toBe(cardB.currentBalance);expect(p.cards[0].lastBalanceCheckedAt).toMatch(/T/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(Object.values(active(await snapshot(page)).recoveryEvidence.cards).some(entry=>entry.zeroObservation)).toBe(true);
 await page.reload();await expect(page.locator('#nav-list')).toHaveAttribute('aria-current','page');
 expect(active(await snapshot(page)).cards[0].currentBalance).toBe(0);
 expect(qa.errors).toEqual([]);await context.close();
});

test('P1.2 cancellation and contextual save retain general Manual progress/draft and Batch state',async({browser})=>{
 const context=await browser.newContext(),qa=await setup(context,await syntheticRemote([cardA,cardB]),[]);
 const page=await context.newPage();await start(page);qa.mock.offline=true;
 await page.locator('#nav-review').click();await page.getByRole('button',{name:/^Select cards \(/}).click();
 await page.getByRole('button',{name:'Confirm unchanged',exact:true}).click();
 await page.getByLabel('Verified balance (CAD)').fill('18.20');
 await page.getByRole('button',{name:'Companion / Batch',exact:true}).click();
 await page.getByRole('button',{name:'Prepare selected cards',exact:true}).click();
 await page.getByRole('textbox',{name:'Paste results',exact:true}).fill('GENERAL BATCH DRAFT');
 const before=active(await snapshot(page));
 await checkoutA(page);await page.locator('#verify-balance').click();
 await page.getByLabel('Verified balance (CAD)').fill('55.55');
 await page.getByRole('button',{name:'Cancel verification',exact:true}).click();
 await expect(page.locator('#verify-balance')).toBeFocused();expect(active(await snapshot(page))).toEqual(before);
 await page.locator('#verify-balance').click();await page.getByRole('button',{name:'Confirm unchanged',exact:true}).click();
 await expect(page.locator('#verify-balance')).toBeFocused();
 await page.locator('#nav-review').click();
 await expect(page.getByRole('textbox',{name:'Paste results',exact:true})).toHaveValue('GENERAL BATCH DRAFT');
 await expect(page.getByText('Working selection: 2 cards · 1 verified',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Manual',exact:true}).click();
 await expect(page.getByLabel('Verified balance (CAD)')).toHaveValue('18.20');
 await expect(page.locator('#review-card-heading')).toContainText('0084');
 expect(qa.errors).toEqual([]);await context.close();
});

test('P1.2 contextual return follows reordered identity and falls back for removed/filtered/context origins',async({browser})=>{
 for(const change of ['reorder','remove','filter','generation','pin']){
  const context=await browser.newContext(),qa=await setup(context,await syntheticRemote([cardA,cardB]),[]);
  const page=await context.newPage();await start(page);qa.mock.offline=true;await checkoutA(page);await page.locator('#verify-balance').click();
  await editSaved(page,change);
  await page.getByRole('button',{name:'Cancel verification',exact:true}).click();
  if(change==='reorder'||change==='pin'){await expect(page.locator('#verify-balance')).toBeFocused();await expect(page.locator('#card-detail')).toContainText('0042');}
  else {await expect(page.locator('#nav-list')).toHaveAttribute('aria-current','page');await expect(page.locator('#wallet-section-heading')).toBeFocused();}
  expect(qa.errors).toEqual([]);await context.close();
 }
});

test('P1.2 positive recovery preserves used until explicit Mark Active',async({browser})=>{
 const used={...cardA,used:true,currentBalance:0,pendingReconciliation:true};
 const context=await browser.newContext(),qa=await setup(context,await syntheticRemote([used]),[]);
 const page=await context.newPage();await start(page);qa.mock.offline=true;
 await settings(page);await page.getByText('Hide Used Cards',{exact:true}).click();await page.locator('#settings-back').click();
 await checkoutA(page);await page.locator('#verify-balance').click();await page.getByLabel('Verified balance (CAD)').fill('15.25');
 await page.getByRole('button',{name:'Save & return',exact:true}).click();await expect(page.locator('#verify-balance')).toBeFocused();
 expect(active(await snapshot(page)).cards[0].used).toBe(true);expect(active(await snapshot(page)).cards[0].currentBalance).toBe(15.25);
 await page.getByRole('button',{name:'Mark Active',exact:true}).click();expect(active(await snapshot(page)).cards[0].used).toBe(false);
 expect(qa.errors).toEqual([]);await context.close();
});

test('P0.2 residual clipboard fallback checks persisted context/credentials before notifications',async({browser})=>{
 for(const mode of ['manual','batch','checkout'])for(const change of ['pin','generation']){
  const context=await browser.newContext(),qa=await setup(context,await syntheticRemote([cardA,cardB]),[]);
  await context.addInitScript(()=>{
   window.qaFallback=0;document.execCommand=()=>{window.qaFallback++;return true;};
   Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>new Promise((_,reject)=>{window.qaDeny=reject;})}});
  });
  const page=await context.newPage();await start(page);qa.mock.offline=true;
  if(mode==='checkout'){await checkoutA(page);await page.locator('#detail-barcode-pin').click();}
  else {
   await page.locator('#nav-review').click();await page.getByRole('button',{name:/^Select cards \(/}).click();
   if(mode==='batch'){await page.getByRole('button',{name:'Companion / Batch',exact:true}).click();await page.getByRole('button',{name:'Prepare selected cards',exact:true}).click();await page.getByRole('button',{name:'Copy selected cards',exact:true}).click();}
   else await page.getByRole('button',{name:'Copy PIN',exact:true}).click();
  }
  await expect.poll(()=>page.evaluate(()=>typeof window.qaDeny)).toBe('function');
  await editSaved(page,change);await page.evaluate(()=>window.qaDeny(Error('Synthetic delayed denial')));
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,100)));
  expect(await page.evaluate(()=>window.qaFallback)).toBe(0);
  await expect(page.getByText(/PIN copied|Code\/PIN copied|Copied \d+ requests/)).toHaveCount(0);
  expect(qa.errors).toEqual([]);await context.close();
 }
});
