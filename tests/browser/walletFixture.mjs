import {expect} from '@playwright/test';
import {cardA,cardB} from '../syncFixtures.mjs';
import {schemaCapability} from '../../src/lib/csvSchema.js';
const protocol='gc-wallet-sync-v1';

const syncPoll=fn=>expect.poll(fn,{timeout:22000});
async function snapshot(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('walmartGc.inventory',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('state','readonly'),read=tx.objectStore('state').get('wallet');read.onsuccess=()=>{resolve(read.result);db.close();};};}));}
const active=s=>s.profiles[s.active];
async function settings(page){await page.getByRole('button',{name:'Open settings'}).click();}
async function cards(page){await page.getByRole('button',{name:'Cards',exact:true}).click();}
async function checkoutA(page){await cards(page);await page.getByText(/0042/).first().click();}
async function setup(context,remote,legacy=[cardA,cardB]){
 const errors=[],blocked=[],requests=[],dialogs=[];
 await context.addInitScript(({legacy})=>{
  if(location.origin!=='http://127.0.0.1:5178')return;
  if(!localStorage.getItem('qa-seeded')){localStorage.setItem('walmartGc.cards',JSON.stringify(legacy));localStorage.setItem('qa-seeded','yes');}
  const native=indexedDB;
  const wrap=db=>new Proxy(db,{get(target,key){if(key==='transaction')return(...args)=>{const tx=target.transaction(...args);return new Proxy(tx,{get(target,key){if(key==='objectStore')return(...args)=>{const store=target.objectStore(...args);return new Proxy(store,{get(target,key){if(key==='put')return(...args)=>{if(args[1]==='wallet'&&sessionStorage.getItem('qa-fail')==='yes'){sessionStorage.removeItem('qa-fail');throw Error('QA transaction failure');}return target.put(...args);};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},set(target,key,value){if(key==='oncomplete'&&args[1]==='readwrite'&&typeof value==='function'&&sessionStorage.getItem('qa-hold-selection')==='yes')return Reflect.set(target,key,event=>{window.qaCompleteSelection=()=>value.call(target,event);},target);return Reflect.set(target,key,value,target);}});};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},set(target,key,value){return Reflect.set(target,key,value,target);}});
  Object.defineProperty(window,'indexedDB',{value:{open(name,version){const req=native.open(name,version),wrapper={};req.onupgradeneeded=()=>{wrapper.result=wrap(req.result);wrapper.onupgradeneeded?.();};req.onsuccess=()=>{wrapper.result=wrap(req.result);wrapper.onsuccess?.();};req.onerror=()=>{wrapper.error=req.error;wrapper.onerror?.();};req.onblocked=()=>wrapper.onblocked?.();return wrapper;}}});
 },{legacy});
 const mock={principal:'qa-principal',sheetId:'synthetic-sheet',authenticated:true,offline:false,hold:null};
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://127.0.0.1:5178'){blocked.push(url.href);return route.abort();}
  if(url.pathname.startsWith('/auth')){blocked.push(url.pathname);return route.fulfill({status:403,body:'Synthetic QA blocks OAuth navigation'});}
  if(!url.pathname.startsWith('/api/'))return route.continue();
  requests.push({path:url.pathname,method:request.method()});
  if(mock.offline)return route.abort('internetdisconnected');
  if(url.pathname==='/api/status')return route.fulfill({json:{...mock,ownershipVerified:true,syncProtocol:protocol,coordinationAvailable:true,schemaCapability,sheetVersion:'',email:'qa@example.invalid'}});
  const body=request.postDataJSON();
  if(url.pathname!=='/api/sync'&&url.pathname!=='/api/sheet/ensure'){blocked.push(url.pathname);return route.fulfill({status:403,json:{error:'Unsupported synthetic API'}});}
  if(mock.hold)await mock.hold;
  try{const result=await remote.coordinator.run(body);return route.fulfill({json:{...result,principal:mock.principal,sheetId:mock.sheetId}});}catch(error){return route.fulfill({status:error.code==='uncertain'?503:409,json:{...error.body,error:error.message,code:error.code,notDispatched:error.notDispatched,rejection:error.rejection,principal:mock.principal,sheetId:mock.sheetId}});}
 });
 context.on('page',page=>{page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>{dialogs.push(dialog.message());return mock.dismissRecovery&&dialog.message().includes('Recovery exports contain')?dialog.dismiss():dialog.accept();});});
 return {errors,blocked,requests,mock,dialogs};
}
async function start(page){await page.goto('/');await expect(page.getByRole('button',{name:'Open settings'})).toBeVisible();await expect.poll(async()=>active(await snapshot(page)).context.ownershipVerified).toBe(true);}
async function recover(page){await settings(page);await page.locator('summary').filter({hasText:'Advanced synchronization and recovery'}).click();await page.getByRole('button',{name:'Recover unbound inventory into connected account'}).click();await syncPoll(async()=>active(await snapshot(page)).pending.length).toBe(0);await cards(page);}

export { snapshot, active, settings, cards, checkoutA, setup, start, recover, syncPoll };
