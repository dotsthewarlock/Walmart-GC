import os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html='''<!doctype html><form id="check-gift-card-balance-form"><input name="gc-number"><input name="securitycode"><button type="submit">Check Balance</button></form><script>document.querySelector('form').onsubmit=e=>{e.preventDefault();const d=document.createElement('div');d.setAttribute('role','dialog');d.innerHTML='<h2>Gift card balance</h2><p class="cardnumber">Ending in 1111</p><p class="balance">Balance: $12.34</p><button>Check another card balance</button>';d.querySelector('button').onclick=()=>d.remove();document.body.append(d)};</script>'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1100,'height':800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body=html) if route.request.url=='https://www.walmart.ca/en/account/giftcards/balance' else route.abort())
 page.add_init_script("""const realAttach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(init){return realAttach.call(this,{...init,mode:'open'})};window.testClip='';Object.defineProperty(navigator,'permissions',{value:{query:async()=>({state:'granted'})}});Object.defineProperty(navigator,'clipboard',{value:{readText:async()=>window.testClip,writeText:async()=>{throw Error('denied')}}});""")
 page.goto('https://www.walmart.ca/en/account/giftcards/balance');page.add_script_tag(content=(root/'release-assets/companion/bookmarklet.js').read_text())
 page.locator('#queueTab').click();page.locator('#input').fill('WMGC-REQUEST\t1\nref\tcardNumber\tpin\n11111111-1111-4111-8111-111111111111\t0000000000001111\t0001');page.locator('#import').click()
 page.wait_for_function("document.querySelector('#wmgc-helper-v01').shadowRoot.querySelector('#status').textContent.includes('1 added')")
 page.locator('#start').click();page.wait_for_function("document.querySelector('#wmgc-helper-v01').shadowRoot.querySelector('#status').textContent.includes('Card filled')")
 page.locator('#checkCard').click();page.wait_for_function("document.querySelector('#wmgc-helper-v01').shadowRoot.querySelector('#progress').textContent.includes('1/1 completed')")
 page.locator('#wallet').click();assert '12.34' in page.locator('#output').input_value();assert 'Ctrl+C' in page.locator('#status').inner_text()
 page.locator('#discardLast').click();assert page.locator('#confirmDialog').evaluate('(d)=>d.open');page.locator('#confirmDialog [value=cancel]').click();assert '12.34' in page.locator('#history').inner_text()
 page.locator('#clearResults').click();assert page.locator('#confirmDialog').evaluate('(d)=>d.open');page.locator('#confirmDialog [value=cancel]').click();assert '12.34' in page.locator('#history').inner_text()
 page.locator('#clearResults').click();page.locator('#confirmDialog [value=confirm]').click();page.wait_for_function("!document.querySelector('#wmgc-helper-v01').shadowRoot.querySelector('#history').textContent.includes('12.34')")
 page.locator('#queueTab').click();page.locator('#detectClipboard').check();packet='WMGC-REQUEST\t1\nref\tcardNumber\tpin\n22222222-2222-4222-8222-222222222222\t0000000000002222\t0002';page.evaluate('(x)=>window.testClip=x',packet);page.evaluate("window.dispatchEvent(new Event('focus'))")
 page.wait_for_function("document.querySelector('#wmgc-helper-v01').shadowRoot.querySelector('#confirmDialog').open");page.locator('#confirmDialog [value=confirm]').click();page.wait_for_function("document.querySelector('#wmgc-helper-v01').shadowRoot.querySelector('#status').textContent.includes('1 added')")
 page.evaluate("window.dispatchEvent(new Event('focus'))");page.wait_for_timeout(300);assert not page.locator('#confirmDialog').evaluate('(d)=>d.open');assert not errors,errors
 b.close()
print('Shared bookmarklet: offline merchant fill, submission, verified result and wallet export PASS')
