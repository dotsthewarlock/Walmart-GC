"""Stage an explicitly accepted Dev pair as Stable without rebuilding or deploying."""
from pathlib import Path
from zipfile import ZipFile
import argparse, hashlib, json, re, shutil
root=Path(__file__).resolve().parent/'staging'/'companion'
p=argparse.ArgumentParser();p.add_argument('--accepted-version',required=True);p.add_argument('--accepted-source-revision',required=True);p.add_argument('--authorize-stable',action='store_true',required=True);a=p.parse_args()
dev=root/'dev';stable=root/'stable';meta=json.loads((dev/'release.json').read_text());version=a.accepted_version
if not re.fullmatch(r'[0-9a-f]{40}',a.accepted_source_revision) or meta.get('sourceRevision')!=a.accepted_source_revision: p.error('Accepted revision does not match committed Dev source')
if meta.get('channel')!='dev' or any(meta.get(k)!=version for k in ('engineVersion','extensionVersion','bookmarkletVersion')):p.error('Dev version mismatch')
for name,key in [('bookmarklet.js','bookmarkletSha256'),('extension.zip','extensionSha256')]:
 if hashlib.sha256((dev/name).read_bytes()).hexdigest()!=meta.get(key):p.error('Dev artifact hash mismatch')
with ZipFile(dev/'extension.zip') as z:
 if z.testzip() or json.loads(z.read('manifest.json'))['version']!=version:p.error('Invalid extension package')
if f'GC Wallet · {version} · ' not in (dev/'bookmarklet.js').read_text():p.error('Invalid bookmarklet version')
# Preserve previous stable until all validation succeeds. Stage only; production deployment is separate.
stable.mkdir(parents=True,exist_ok=True)
for name in ('bookmarklet.js','extension.zip'):shutil.copyfile(dev/name,stable/name)
meta.update(channel='stable',approvedForRelease=True,extensionDownload='/companion/stable/extension.zip',bookmarkletPath='/companion/stable/bookmarklet.js')
(stable/'release.json').write_text(json.dumps(meta,indent=2)+'\n')
print('Stable staged from identical accepted Dev bytes. Not deployed.')
