from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1];site=root/'site'
# This tests the exact built bundle with a synthetic location binding, not live navigation or the hosted loader.
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':412,'height':923})
    page.set_content((site/'bookmarklet-lab.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+(site/'style.css').read_text()+'</style>'))
    code=(site/'bookmarklet.js').read_text()
    page.add_script_tag(content="((location)=>{"+code+"})({origin:'http://localhost:8765',pathname:'/bookmarklet-lab.html',protocol:'http:'});")
    page.locator('#self').click();page.wait_for_function("document.querySelector('#status').textContent.includes('PASS')",timeout=5000)
    assert page.locator('#progress').inner_text()=='3/3 completed · complete'
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    with page.expect_download() as dl:page.locator('#download').click()
    report=json.loads(Path(dl.value.path()).read_text());assert report['mode']=='bookmarklet';assert len(report['results'])==3;assert '000000000000' not in json.dumps(report)
    extension=json.loads((root/'tests/ui-mock-results.json').read_text())['report'];assert [(x['ref'],x['balanceCAD']) for x in report['results']]==[(x['ref'],x['balanceCAD']) for x in extension['results']]
    (root/'tests/bookmarklet-browser-results.json').write_text(json.dumps({'status':'passed','scope':'generated bundle with synthetic location; no hosted navigation','viewport':'412x923','parity':'same refs and balances as extension mock UI','report':report},indent=2)+'\n')
    browser.close()
print('Generated bookmarklet bundle, synthetic UI and cross-distribution result parity passed')
