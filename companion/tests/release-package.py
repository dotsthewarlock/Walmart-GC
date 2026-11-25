from pathlib import Path
from zipfile import ZipFile
import hashlib,json,subprocess,sys
root=Path(__file__).resolve().parents[1]
assets=root/'release-assets'/'companion'
ext=root/'gc-wallet-companion'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
package=assets/'extension.zip'
meta=json.loads((assets/'release.json').read_text())
assert meta['approvedForRelease'] is False
assert meta['channel']=='assisted-candidate' and meta['productionBookmarkletUnchanged'] is True
assert meta['merchantEnabled'] is True and meta['protocolVersion']==1
assert sha(package)==meta['extensionSha256']
assert meta['bookmarkletSha256']==sha(assets/'bookmarklet.js')
assert meta['hostedLoaderVerified'] is False and meta['sharedEngineParity'] is False
assert meta['extensionBytes']==package.stat().st_size
assert package.read_bytes()==(root/'site'/'extension.zip').read_bytes()
with ZipFile(package) as z:
 assert z.testzip() is None
 expected={p.relative_to(ext).as_posix() for p in ext.rglob('*') if p.is_file()}
 assert set(z.namelist())==expected and len(z.namelist())==len(expected)
 for name in expected:assert z.read(name)==(ext/name).read_bytes()
 manifest=json.loads(z.read('manifest.json'))
 assert manifest['version']==meta['extensionVersion']==meta['engineVersion']
previous=package.read_bytes()
subprocess.run([sys.executable,str(root/'build.py')],check=True)
assert package.read_bytes()==previous
print('Release package: exact contents, manifest, hash, size, reproducible rebuild, unpublished state PASS')
