from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1]; d=root/'gc-wallet-companion'
def flatten(n):
 s=(d/n).read_text();s=re.sub(r'\bimport\s*\{[^}]+\}\s*from\s*[^;]+;','',s);return s.replace('export ','')
html=(d/'popup.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+(d/'style.css').read_text()+'</style>').replace('<script type="module" src="popup.js"></script>','')
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [344,412]:
  page=b.new_page(viewport={'width':width,'height':600});page.route('**/*',lambda r:r.abort());errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html);page.add_script_tag(content="window.calls=[];window.close=()=>{};window.chrome={runtime:{sendMessage:async m=>{calls.push(m.type);return {ok:true}},getManifest:()=>({version:'0.7.1'}),getURL:p=>p},tabs:{sendMessage:async(id,m)=>{calls.push(m.type);return {ok:true}},query:async()=>[{id:1,url:'https://www.walmart.ca/en/account/giftcards/balance'}]},storage:{session:{get:async()=>({})}}};")
  page.add_script_tag(content='(()=>{'+ '\n'.join(flatten(n) for n in ['navigation.js','release-check.js','merchant-compat.js','popup.js'])+'})()');page.wait_for_function("document.querySelector('#context').textContent==='Walmart checker is open'");assert not page.locator('#probe').is_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');
  for id in ['manual','walletLink']:page.locator('#'+id).click()
  assert page.evaluate('calls')==['show-overlay','open-wallet'];page.locator('summary').click();assert page.locator('#probe').is_visible();assert not errors,errors;results.append({'width':width,'context':'pass','navigation':'pass','diagnostics_disclosure':'pass','no_overflow':True,'scope':'mock Chrome APIs; no merchant network'});page.close()
 b.close()
(root/'tests/popup-browser-results.json').write_text(json.dumps(results,indent=2)+'\n');print('Popup mock browser checks passed at 344 and 412 px')
