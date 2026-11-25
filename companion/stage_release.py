"""Create a verified Dev channel in staging only. Never deploy or modify Stable."""
from pathlib import Path
from zipfile import ZipFile
import argparse, hashlib, json, re, shutil, subprocess, sys
root=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--source-revision', help='Exact source commit SHA, required before publication')
args=parser.parse_args()
revision=args.source_revision
if revision and not re.fullmatch(r'[0-9a-f]{40}',revision):parser.error('Expected a full Git commit SHA')
if revision:
    # Reject claims of provenance for local, modified or untracked input.
    try:
        actual=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
        dirty=subprocess.check_output(['git','status','--porcelain','--untracked-files=all','--','src','tests','build.py','version.json','launcher.txt','stage_release.py','promote_release.py','BASELINE-bookmarklet.js'],cwd=root,text=True).strip()
    except subprocess.CalledProcessError:parser.error('Source revision requires a Git checkout')
    if revision!=actual or dirty:parser.error('Source revision must match clean checked-in inputs')
subprocess.run([sys.executable,str(root/'build.py')],check=True)
assets=root/'release-assets'/'companion'
meta=json.loads((assets/'release.json').read_text())
version=json.loads((root/'version.json').read_text())['version']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
with ZipFile(assets/'extension.zip') as z:
    assert z.testzip() is None
    assert json.loads(z.read('manifest.json'))['version']==version
    assert f'v{version}' in z.read('popup.html').decode()
assert f'GC Wallet · {version} · ' in (assets/'bookmarklet.js').read_text()
assert meta['engineVersion']==meta['extensionVersion']==meta['bookmarkletVersion']==version
assert sha(assets/'extension.zip')==meta['extensionSha256'] and sha(assets/'bookmarklet.js')==meta['bookmarkletSha256']
channel=root/'staging'/'companion'/'dev';channel.mkdir(parents=True,exist_ok=True)
for name in ('extension.zip','bookmarklet.js'):shutil.copyfile(assets/name,channel/name)
meta.update(channel='dev',sourceRevision=revision,extensionDownload='/companion/dev/extension.zip',bookmarkletPath='/companion/dev/bookmarklet.js',approvedForRelease=False,hostedLoaderVerified=False)
(channel/'release.json').write_text(json.dumps(meta,indent=2)+'\n')
shutil.copyfile(root/'launcher.txt',channel.parent/'launcher.txt')
print(f'Staged synchronized Dev {version}; no Stable promotion or deployment.')
