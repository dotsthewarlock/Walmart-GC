import os
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1];d=root/'gc-wallet-companion';target='https://www.walmart.ca/en/account/giftcards/balance'
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 for width,height in [(320,480),(412,923),(1440,900)]:
  page=b.new_page(viewport={'width':width,'height':height});page.route('**/*',lambda r:r.abort());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<main><h1>Synthetic merchant</h1><button id="merchant">Unrelated page control</button></main>')
  page.add_script_tag(content="""window.calls=[];window.saved={};window.merchantClicks=0;document.querySelector('#merchant').onclick=()=>merchantClicks++;const oldAttach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(opts){return oldAttach.call(this,{...opts,mode:'open'})};window.chrome={runtime:{id:'fixture',getURL:p=>'chrome-extension://fixture/'+p,onMessage:{addListener:f=>window.showOverlay=f},sendMessage:async m=>{calls.push(m.type);return {ok:true}}},storage:{local:{get:async()=>saved,set:async v=>Object.assign(saved,v)}}};""")
  page.add_script_tag(content=(d/'overlay-position.js').read_text())
  page.add_script_tag(content='(function(location){'+(d/'checker-launcher.js').read_text()+'})({href:'+json.dumps(target)+'})')
  host=page.locator('#gc-wallet-companion-launcher');micro=host.locator('.micro');dock=host.locator('.dock');assert micro.is_visible() and not dock.is_visible();assert micro.bounding_box()['width']==48 and micro.bounding_box()['height']==48;assert page.evaluate('calls.length')==0
  # User can click unrelated merchant control while collapsed.
  page.locator('#merchant').click();assert page.evaluate('merchantClicks')==1
  # Drag the micro icon: do not interpret this as opening.
  bb=micro.bounding_box();page.mouse.move(bb['x']+24,bb['y']+24);page.mouse.down();page.mouse.move(45,45,steps=8);page.mouse.up();page.wait_for_timeout(300);assert micro.is_visible() and not dock.is_visible();assert page.evaluate('saved["gc-overlay-position-v1"].x')<0.3
  micro.click();assert dock.is_visible();assert not micro.is_visible();iframe=host.locator('iframe');assert iframe.count()==1
  # Simulate the private frame readiness signal only; actual native frame unverified.
  page.evaluate("""()=>{const f=document.querySelector('#gc-wallet-companion-launcher').shadowRoot.querySelector('iframe');window.dispatchEvent(new MessageEvent('message',{source:f.contentWindow,origin:'https://evil.test',data:{type:'gc-overlay-ready'}}));}""");assert not iframe.is_visible()
  page.evaluate("""()=>{const f=document.querySelector('#gc-wallet-companion-launcher').shadowRoot.querySelector('iframe');window.dispatchEvent(new MessageEvent('message',{source:f.contentWindow,origin:'chrome-extension://fixture',data:{type:'gc-overlay-ready'}}));}""");assert iframe.is_visible()
  page.evaluate("window.frameIdentity=document.querySelector('#gc-wallet-companion-launcher').shadowRoot.querySelector('iframe')")
  host.get_by_role('button',name='Position options',exact=True).click();host.get_by_role('button',name='Reset to bottom right').click();assert page.evaluate('saved["gc-overlay-position-v1"].x')==1;host.get_by_role('button',name='Move to next corner').click();assert page.evaluate('saved["gc-overlay-position-v1"].x')==0
  host.get_by_role('button',name='Minimize review').click();assert micro.is_visible() and not dock.is_visible();micro.click();assert page.evaluate("frameIdentity===document.querySelector('#gc-wallet-companion-launcher').shadowRoot.querySelector('iframe')")
  host.get_by_role('button',name='Minimize review').click();host.get_by_role('button',name='Hide review until reopened from toolbar').click();assert not host.is_visible();page.evaluate("showOverlay({type:'show-overlay'},{id:'wrong'},()=>{})");assert not host.is_visible();page.evaluate("showOverlay({type:'show-overlay'},{id:'fixture'},()=>{})");assert dock.is_visible()
  box=dock.bounding_box();assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1,box
  page.set_viewport_size({'width':320,'height':480});page.wait_for_timeout(100);box=dock.bounding_box();assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=321 and box['y']+box['height']<=481,box
  assert not errors,errors;results.append({'viewport':[width,height],'micro_drag_corner_reset_hide_restore_resize':'pass','iframe_identity_preserved':True,'origin_filter':'pass','no_automatic_message':True,'mock_ready_only':True});page.close()
 # No-ready timeout exposes deliberate fallback without automatic navigation.
 page=b.new_page(viewport={'width':412,'height':923});page.route('**/*',lambda r:r.abort());page.set_content('<main>synthetic</main>');page.add_script_tag(content="""window.calls=[];const a=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return a.call(this,{...o,mode:'open'})};window.chrome={runtime:{id:'fixture',getURL:p=>'chrome-extension://fixture/'+p,onMessage:{addListener:()=>{}},sendMessage:async m=>{calls.push(m.type);return {ok:true}}},storage:{local:{get:async()=>({'gc-overlay-position-v1':{x:0,y:0}}),set:async()=>{}}}};""");page.add_script_tag(content=(d/'overlay-position.js').read_text());page.add_script_tag(content='(function(location){'+(d/'checker-launcher.js').read_text()+'})({href:'+json.dumps(target)+'})');host=page.locator('#gc-wallet-companion-launcher');page.wait_for_timeout(100);assert host.locator('.micro').bounding_box()['x']==12;host.locator('.micro').click();fallback=host.get_by_role('button',name='Open separate review window');fallback.wait_for(state='visible',timeout=6500);assert page.evaluate('calls.length')==0;fallback.click();assert page.evaluate('calls')==['open-review'];results.append({'remembered_position':'pass','explicit_fallback_after_timeout':'pass'});b.close()
(root/'tests/overlay-browser-results.json').write_text(json.dumps(results,indent=2)+'\n');print('Overlay shell mock browser passed: 3 viewports + fallback')
