from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parents[1];ext=root/'gc-wallet-companion';site=root/'site'
def flatten(p):
 s=re.sub(r'\bimport\s*\{[^}]+\}\s*from\s*[^;]+;','',p.read_text());s=re.sub(r'export\s*\{[^}]+\};','',s);return s.replace('export ','')
# Mock extension messaging and isolated storage; use the exact generated executable code.
mock="""(()=>{const m=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async(k,f)=>f()}});if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=> '44444444-4444-4444-8444-444444444444'});window.chrome={runtime:{sendMessage:async m=>m.type==='ping'?{ok:true,mode:'internal',version:'0.6.0',merchant:false}:m.type==='start'?{ok:true,result:{ref:m.ref,balanceCAD:({'1':'12.34','2':'0.00','3':'1234.56'})[m.ref[0]],checkedAt:new Date().toISOString()}}:{ok:true}}};})()"""
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for mode in ('internal','bookmarklet'):
  page=browser.new_page(viewport={'width':412,'height':923});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  html=(ext/'companion.html' if mode=='internal' else site/'companion-bookmarklet.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+(ext/'style.css').read_text()+'</style>').replace('<script type="module" src="companion.js"></script>','')
  page.set_content(html);page.add_script_tag(content=mock)
  code='(()=>{'+ '\n'.join(flatten(ext/n) for n in ('wire.js','protocol.js','session.js','companion.js'))+'})()' if mode=='internal' else '((location)=>{'+(site/'companion-bookmarklet.js').read_text()+"})({origin:'http://localhost:8765',pathname:'/companion-bookmarklet.html',protocol:'http:'})"
  page.add_script_tag(content=code)
  page.locator('summary').click();page.locator('#self').click();page.wait_for_function("document.querySelector('#testStatus').textContent.startsWith('PASS')",timeout=8000)
  with page.expect_download() as d:page.locator('#report').click()
  report=json.loads(Path(d.value.path()).read_text());assert report['complete'] and len(report['checks'])==10
  # Exercise actual working interface: explicit import, no pre-submit, visible lists, stable controls.
  page.locator('#queueTab').click();page.locator('#sample').click();page.locator('#import').click();assert '0/3' in page.locator('#progress').inner_text()
  page.locator('#start').click();page.wait_for_function("document.querySelector('#progress').textContent.includes('3/3 completed')",timeout=8000)
  page.locator('#resultsTab').click();assert page.locator('#queuePanel').is_hidden();page.locator('#wallet').click();assert '1234.56' in page.locator('#output').input_value();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.set_viewport_size({'width':1100,'height':923});assert page.locator('#panel').bounding_box()['x']>=0;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('#minimize').click();assert page.locator('#close').is_visible();page.locator('#minimize').click();assert page.locator('#close').is_hidden();assert not errors,errors
  results.append({'mode':mode,'checks':report['checks'],'results':report['results'],'mobile':True,'desktop':True,'scope':'Chromium generated code, mocked messaging and storage; no native extension or actual hosting'})
  page.close()
 browser.close()
assert [(x['ref'],x['balanceCAD']) for x in results[0]['results']]==[(x['ref'],x['balanceCAD']) for x in results[1]['results']]
(root/'tests/functional-browser-results.json').write_text(json.dumps(results,indent=2)+'\n');print('Both functional surfaces passed mock-browser acceptance and parity')
