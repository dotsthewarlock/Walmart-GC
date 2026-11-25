from pathlib import Path
import hashlib,json,shutil,re
version_config=json.loads(Path(__file__).with_name("version.json").read_text())
version=version_config["version"]
assert re.fullmatch(r"(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)",version) and all(int(x)<=65535 for x in version.split("."))
assert version_config["protocolVersion"]==1
root=Path(__file__).resolve().parent
src=root/'src'
ext=root/'gc-wallet-companion';site=root/'site'
for d in (ext,site):
 if d.exists():shutil.rmtree(d)
 d.mkdir()
for group in ('core','ui','extension'):
 for p in (src/group).iterdir():shutil.copy2(p,ext/p.name)
# Stamp all distribution labels from one version, never independent constants.
manifest_path=ext/'manifest.json'
manifest=json.loads(manifest_path.read_text());manifest['version']=version
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
for name in ('manual.html','popup.html','checker-launcher.js'):
 p=ext/name;p.write_text(p.read_text().replace('__COMPANION_VERSION__',version))
for name in ('wire.js','protocol.js','queue.js','lab.js','style.css'):
 shutil.copy2(ext/name,site/name)
shutil.copy2(ext/'lab.html',site/'launcher.html')
shutil.copy2(src/'site/fixture.html',site/'fixture.html')
# Bundle the same checked-in modules; no eval, remote execution, or dependencies in the extension.
def flatten(p):
 s=p.read_text();s=re.sub(r"\bimport\s*\{[^}]+\}\s*from\s*[^;]+;",'',s);s=re.sub(r'export\s*\{[^}]+\};','',s);return s.replace('export ','')
(ext/'merchant-assist.js').write_text(flatten(src/'core'/'merchant-fields.js')+'\n'+(src/'extension'/'merchant-assist-entry.js').read_text())
files=[src/'core'/n for n in ('wire.js','protocol.js','queue.js')]+[src/'bookmarklet/transport.js',src/'ui/lab.js']
# Avoid overlapping bindings: wire.js owns HEAD; protocol imports/re-exports it.
bundle='(()=>{\n'+(src/'bookmarklet/guard.js').read_text()+'\n'+'\n'.join(flatten(p) for p in files)+'\n})();\n'
(site/'bookmarklet.js').write_text(bundle)
loader="javascript:(()=>{if(location.origin!=='http://localhost:8765'||location.pathname!=='/bookmarklet-lab.html'||document.body?.dataset.companionFixture!=='synthetic-bookmarklet-v1')return;const s=document.createElement('script');s.src=location.origin+'/bookmarklet.js';document.head.append(s)})()"
(site/'bookmarklet.txt').write_text(loader+'\n')
html=(ext/'lab.html').read_text().replace('<body>','<body data-companion-fixture="synthetic-bookmarklet-v1">').replace('<script type="module" src="lab.js"></script>','').replace('<h1 id="heading">Balance review lab</h1>','<h1 id="heading">Synthetic bookmarklet fixture</h1><p><a id="launchBookmarklet" href="'+loader+'">Launch hosted synthetic bookmarklet</a></p>')
(site/'bookmarklet-lab.html').write_text(html)
# Build metadata, not executable update instructions. Publication path is a candidate only.
manifest=json.loads((ext/'manifest.json').read_text());h=hashlib.sha256()
for p in sorted(src.rglob('*')):
 if p.is_file():h.update(str(p.relative_to(src)).encode()+b'\0'+p.read_bytes()+b'\0')
for p in (root/'BASELINE-bookmarklet.js',root/'build.py',root/'version.json',root/'launcher.txt',root/'stage_release.py',root/'promote_release.py'):
 h.update(p.name.encode()+b'\0'+p.read_bytes()+b'\0')
release={'engineVersion':manifest['version'],'extensionVersion':manifest['version'],'protocolVersion':1,'sourceSha256':h.hexdigest(),'channel':'synthetic-development','extensionDownload':'/companion/extension.zip','merchantEnabled':False}
(site/'release.json').write_text(json.dumps(release,indent=2)+'\n')
print('Built shared source',release['sourceSha256'])
# The functional development surface shares its source across the two delivery wrappers.
for name in ('session.js','companion.js','companion.html'):
 shutil.copy2(ext/name,site/name)
functional_guard="if(location.origin!=='http://localhost:8765'||location.pathname!=='/companion-bookmarklet.html'||document.body?.dataset.companionFixture!=='synthetic-companion-v1'||document.body.dataset.started==='yes')return;document.body.dataset.started='yes';"
functional_files=[src/'core'/n for n in ('wire.js','protocol.js','session.js')]+[src/'bookmarklet/transport.js',src/'ui/companion.js']
(site/'companion-bookmarklet.js').write_text('(()=>{\n'+functional_guard+'\n'+'\n'.join(flatten(p) for p in functional_files)+'\n})();\n')
functional_loader="javascript:(()=>{if(location.origin!=='http://localhost:8765'||location.pathname!=='/companion-bookmarklet.html'||document.body?.dataset.companionFixture!=='synthetic-companion-v1')return;const s=document.createElement('script');s.src=location.origin+'/companion-bookmarklet.js';document.head.append(s)})()"
(site/'companion-bookmarklet.txt').write_text(functional_loader+'\n')
functional_html=(ext/'companion.html').read_text().replace('<body>','<body data-companion-fixture="synthetic-companion-v1">').replace('<script type="module" src="companion.js"></script>','').replace('<h1>Balance review</h1>','<h1>Synthetic bookmarklet companion</h1><p><a href="'+functional_loader+'">Launch hosted synthetic companion</a></p>')
(site/'companion-bookmarklet.html').write_text(functional_html)

# The manual candidate uses identical modules in extension and standalone hosted page.
for name in ('manual-session.js','manual-acceptance.js','manual.js','manual.html','batch-policy.js'):
 shutil.copy2(ext/name,site/name)
# Local candidate launcher only; final isolated hosting origin needs approval.
(site/'manual-launcher.txt').write_text("javascript:(()=>{window.open('http://localhost:8765/manual.html','_blank','noopener,noreferrer')})()\n")

# Only the dedicated extension-origin frame is web-accessible; never inject credential UI into merchant DOM.
overlay=(ext/'manual.html').read_text().replace('<body>','<body class="embedded-review">').replace('src="manual.js"','src="overlay-entry.js"').replace('<main class=','<main hidden inert class=').replace('Credentials stay in this review window until closed.','Credentials remain in this review until the checker page is closed or refreshed.')
(ext/'overlay.html').write_text(overlay)
# Candidate downloadable extension asset; no hosting or deployment performed.
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
with ZipFile(site/'extension.zip','w',compression=ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(ext.rglob('*')):
  if p.is_file():
   info=ZipInfo(p.relative_to(ext).as_posix(),(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o100644<<16
   z.writestr(info,p.read_bytes(),compresslevel=9)
# Staging only: publish neither this directory nor the localhost fixtures without approval.
assets=root/'release-assets'/'companion'
assets.mkdir(parents=True,exist_ok=True)
package=assets/'extension.zip';shutil.copyfile(site/'extension.zip',package)
metadata={**release,'channel':'manual-candidate','extensionSha256':hashlib.sha256(package.read_bytes()).hexdigest(),'extensionBytes':package.stat().st_size,'productionBookmarkletUnchanged':True,'approvedForRelease':False}
(assets/'release.json').write_text(json.dumps(metadata,indent=2)+'\n')

# Candidate hosted helper retains the baseline checking controls and request behavior.
legacy=(root/'BASELINE-bookmarklet.js').read_text().replace("'WM GC Helper · v0.3.0'","'GC Wallet · "+version+" · '+(document.currentScript?.dataset.gcChannel==='stable'?'Stable':'Dev')")
start=legacy.index('  const form = () =>');end=legacy.index('  if (fields().some',start)
legacy=legacy.replace('const BATCH_LIMIT=10, STEP_MS=1200, LONG_STEP_MS=2400, COOLDOWN_MS=10000, RESPONSE_MS=30000;',flatten(src/'core'/'batch-policy.js')).replace('batchCount%2===0?LONG_STEP_MS:STEP_MS','batchDelay(batchCount)')
legacy=legacy[:start]+flatten(src/'core'/'merchant-fields.js')+"\n  const {form,fields,visible,dialogs,resultDialog} = createMerchantFields(document,window);\n"+legacy[end:]
# No change to legacy submit/retry/queue behavior. Only share the DOM selectors and matching.
legacy=legacy.replace("function matches(){const r=current(),[n,p]=fields();return !!r&&!!n&&!!p&&digits(n.value)===r.number&&p.value===r.pin;}","function matches(){const r=current();return !!r&&createMerchantFields(document,window).matches(r.number,r.pin);}")
(assets/'bookmarklet.js').write_text(legacy)
(assets/'bookmarklet-launcher.txt').write_text("javascript:(()=>{if(location.origin!=='https://www.walmart.ca'||location.pathname.replace(/\\/$/,'')!=='/en/account/giftcards/balance')return alert('Open the Walmart Canada balance page first.');const s=document.createElement('script');s.src='https://walmart-gc.dotsthewarlock.com/companion/bookmarklet.js?v='+Date.now();s.onerror=()=>alert('Hosted helper unavailable. Use the existing standalone bookmarklet.');document.head.append(s)})()\n")
metadata.update({'channel':'assisted-candidate','merchantEnabled':True,'merchantSubmission':'explicit-foreground-batch-or-individual','bookmarkletVersion':version,'bookmarkletSha256':hashlib.sha256((assets/'bookmarklet.js').read_bytes()).hexdigest(),'hostedLoaderVerified':False,'sharedEngineParity':False})
(assets/'release.json').write_text(json.dumps(metadata,indent=2)+'\n')
