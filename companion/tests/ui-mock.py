from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json
root=Path(__file__).resolve().parents[1];src=root/'gc-wallet-companion';out={}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':412,'height':923});page.set_content((src/'lab.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+ (src/'style.css').read_text()+'</style>').replace('<script type="module" src="lab.js"></script>',''))
  page.evaluate("""()=>{globalThis.chrome={runtime:{sendMessage:async(m)=>m.type==='ping'?{ok:true,mode:'internal',version:'0.5.0',merchant:false}:m.type==='start'?{ok:true,mode:'internal',cleanup:true,result:{ref:m.ref,balanceCAD:({'1':'12.34','2':'0.00','3':'1234.56'})[m.ref[0]],checkedAt:new Date().toISOString()}}:{ok:true}}};}""")
  # Evaluate the exact module bodies together in a mock context; not an extension runtime test.
  code='\n'.join(re.sub(r'\bimport\s*\{[^}]+\}\s*from\s*[^;]+;','',(src/f).read_text()).replace('export {HEAD};','').replace('export ','') for f in ['wire.js','protocol.js','queue.js','lab.js'])
  page.add_script_tag(content='(()=>{'+code+'})()');page.locator('#self').click();page.wait_for_function("document.querySelector('#status').textContent.includes('PASS')",timeout=5000)
  assert page.locator('#progress').inner_text()=='3/3 completed · complete';assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  with page.expect_download() as dl:page.locator('#download').click()
  report=json.loads(Path(dl.value.path()).read_text());assert len(report['results'])==3 and '000000000000' not in json.dumps(report)
  out={'status':'passed','viewport':'412x923','report':report};browser.close()
except Exception as e:out={'status':'unverified','reason':str(e)[:600]}
(root/'tests/ui-mock-results.json').write_text(json.dumps(out,indent=2)+'\n');print(out['status'],out.get('reason',''))
