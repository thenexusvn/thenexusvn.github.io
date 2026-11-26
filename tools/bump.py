"""Run before every publish: gives index.html (and dev/) a new build id and writes version.json,
so open pages show the full-screen "There's an update" card. Usage: python3 tools/bump.py ["note shown on the card"]"""
import re,sys,time,json,os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b=time.strftime('%Y%m%d%H%M%S');note=sys.argv[1] if len(sys.argv)>1 else ''
for p in ['index.html','dev/index.html']:
    f=os.path.join(root,p)
    if not os.path.exists(f):continue
    s=open(f).read();s=re.sub(r'<meta name="nexus-build" content="[^"]*">','<meta name="nexus-build" content="%s">'%b,s);open(f,'w').write(s)
open(os.path.join(root,'version.json'),'w').write(json.dumps({'build':b,'note':note},ensure_ascii=False)+'\n')
print(b)
