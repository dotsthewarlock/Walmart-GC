import os
"""No external requests. Actual packaged MV3 extension against intercepted synthetic page."""
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright
import json,shutil
root=Path(__file__).resolve().parents[1];source_ext=root/'gc-wallet-companion'
target='https://www.walmart.ca/en/account/giftcards/balance'
fixture='''<!doctype html><meta charset="utf-8"><style>body{padding:30px;font:16px system-ui}input,button{padding:12px;margin:8px}</style><h1>Synthetic checker</h1><form id="check-gift-card-balance-form"><input name="gc-number" autocomplete="off"><input name="securitycode" autocomplete="off"><button type="submit">Check Balance</button></form><script>window.submissions=0;window.kind='valid';document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();window.submissions++;const d=document.createElement('div');d.setAttribute('role','dialog');d.innerHTML=kind==='blocked'?'<h2>Challenge</h2><button>Close</button>':'<h2>Gift card balance</h2><p class="cardnumber">Ending in '+(kind==='mismatch'?'9999':document.querySelector('[name="gc-number"]').value.replace(/\\D/g,'').slice(-4))+'</p><p class="balance">Balance: $0.00</p><button>Check another card balance</button>';d.querySelector('button').onclick=()=>d.remove();document.body.append(d);});</script>'''
req='WMGC-REQUEST\t1\nref\tcardNumber\tpin\n11111111-1111-4111-8111-111111111111\t0000000000001111\t0001\n22222222-2222-4222-8222-222222222222\t0000000000002222\t0002\n33333333-3333-4333-8333-333333333333\t0000000000003333\t0003'
with TemporaryDirectory() as profile,TemporaryDirectory() as package,sync_playwright() as p:
 ext=Path(package)/'extension';shutil.copytree(source_ext,ext);shell=ext/'checker-launcher.js';code=shell.read_text();assert code.count("attachShadow({mode:'closed'})")==1;shell.write_text(code.replace("attachShadow({mode:'closed'})","attachShadow({mode:'open'})"))
 c=p.chromium.launch_persistent_context(profile,executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-extensions-except='+str(ext),'--load-extension='+str(ext)],viewport={'width':1400,'height':900})
 c.route('**/*',lambda r:r.fulfill(status=200,content_type='text/html',body=fixture) if r.request.url==target else r.continue_() if r.request.url.startswith('chrome-extension://') else r.abort())
 page=c.pages[0];page.goto(target);page.wait_for_selector('#gc-wallet-companion-launcher',timeout=7000)
 # Open the shell shadow only in this instrumented copy so Playwright can inspect its iframe.
 box=page.locator('#gc-wallet-companion-launcher').bounding_box();page.mouse.click(box['x']+24,box['y']+24)
 f=page.frame_locator('iframe[title="Private GC Wallet manual review"]')
 f.locator('#start').click(timeout=8000);f.locator('#input').fill(req);f.locator('#import').click();f.locator('#start').wait_for();page.wait_for_function('window.submissions===0');f.locator('#start').click();page.wait_for_function("document.querySelector('[name=\"gc-number\"]').value.replace(/\\D/g,'')==='0000000000001111'")
 assert page.locator('[name=securitycode]').input_value()=='0001';assert page.evaluate('window.submissions')==0
 page.get_by_role('button',name='Check Balance',exact=True).click();f.locator('#progress').get_by_text('1/3 completed',exact=False).wait_for(timeout=5000)
 assert page.evaluate('window.submissions')==1
 page.wait_for_function("document.querySelector('[name=\"gc-number\"]').value.replace(/\\D/g,'')==='0000000000002222'");page.evaluate("window.kind='mismatch'");page.get_by_role('button',name='Check Balance',exact=True).click();f.locator('#status').get_by_text('Capture stopped',exact=False).wait_for(timeout=5000)
 assert '1/3 completed' in f.locator('#progress').inner_text();page.get_by_role('button',name='Check another card balance',exact=True).click();f.locator('#queueTab').click();f.locator('#fillCard').click();page.evaluate("window.kind='blocked'");page.get_by_role('button',name='Check Balance',exact=True).click();f.locator('#status').get_by_text('Capture stopped',exact=False).wait_for(timeout=5000)
 assert '1/3 completed' in f.locator('#progress').inner_text();assert page.evaluate('window.submissions')==3
 f.locator('#resultsTab').click();f.locator('#wallet').click();out=f.locator('#output').input_value();assert out.startswith('WMGC-RESULT\t1');assert '\t0.00\t' in out and '0000000000001111' not in out and '22222222-2222' not in out
 status=f.locator('#status').inner_text();print('Native synthetic workflow PASS; clipboard:',status)
 (root/'tests/assisted-browser-results.json').write_text(json.dumps({'nativeExtension':True,'syntheticMerchant':True,'autofill':True,'matchedCapture':True,'mismatchRejected':True,'challengeStopped':True,'noAutomaticSubmit':True,'wireExport':True,'clipboardStatus':status},indent=2)+'\n');c.close()
