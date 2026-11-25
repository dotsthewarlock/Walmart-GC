from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
import json, shutil, subprocess, sys
root=Path(__file__).resolve().parents[1]
def run(cwd,*args,ok=True):
 p=subprocess.run(args,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 assert (p.returncode==0)==ok,p.stdout
 return p.stdout.strip()
with TemporaryDirectory() as d:
 repo=Path(d)/'repo';repo.mkdir()
 for n in ('src','tests'):shutil.copytree(root/n,repo/n,ignore=shutil.ignore_patterns('*-results.json','*-results.txt','__pycache__'))
 for n in ('build.py','version.json','BASELINE-bookmarklet.js','stage_release.py','promote_release.py','launcher.txt','.gitignore'):shutil.copyfile(root/n,repo/n)
 run(repo,'git','init','-q');run(repo,'git','add','.');run(repo,'git','-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Synthetic provenance fixture')
 rev=run(repo,'git','rev-parse','HEAD')
 run(repo,sys.executable,'stage_release.py','--source-revision',rev)
 dev=repo/'staging/companion/dev';stable=dev.parent/'stable';meta=json.loads((dev/'release.json').read_text());v=meta['engineVersion']
 assert meta['sourceRevision']==rev and meta['extensionVersion']==meta['bookmarkletVersion']==v
 assert not stable.exists()
 args=(sys.executable,'promote_release.py','--accepted-version',v,'--accepted-source-revision',rev,'--authorize-stable')
 run(repo,*args[:-1],ok=False);assert not stable.exists()
 run(repo,*args);assert all((dev/n).read_bytes()==(stable/n).read_bytes() for n in ['extension.zip','bookmarklet.js'])
 previous=(stable/'release.json').read_bytes();assert json.loads(previous)['channel']=='stable'
 (dev/'bookmarklet.js').write_text('tampered')
 run(repo,*args,ok=False);assert (stable/'release.json').read_bytes()==previous
 (repo/'version.json').write_text('{"version":"1.0.4","protocolVersion":1}')
 run(repo,sys.executable,'stage_release.py','--source-revision',rev,ok=False)
print('Channel tests: clean source identity, synchronized versions, explicit promotion, identical bytes, tamper rejection, dirty source rejection PASS')
