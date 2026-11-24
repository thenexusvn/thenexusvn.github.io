import re, sys
src_dir, out = sys.argv[1], sys.argv[2]
html = open(src_dir + '/index.html', encoding='utf-8').read()
city = open(src_dir + '/city.js', encoding='utf-8').read()
assert '</script' not in city.lower()
shim = ("<script>try{localStorage.getItem('_');}catch(e){try{const m={};Object.defineProperty(window,'localStorage',"
        "{configurable:true,value:{getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v);},removeItem:k=>{delete m[k];}}});}catch(_){}}</script>\n")
# drop document wrapper tags: the artifact skeleton supplies them
html = re.sub(r'<!DOCTYPE html>\s*', '', html, flags=re.I)
for t in [r'<html[^>]*>', r'</html>', r'<head>', r'</head>', r'<body>', r'</body>']:
    html = re.sub(t, '', html, count=1, flags=re.I)
html = re.sub(r'(<title>[^<]*</title>)', r'\1\n' + shim.replace('\\', '\\\\'), html, count=1)
# city.js inline: defined as a function, run after three.js has loaded
old = "if(!window.NexusCity2)await load('city.js');"
assert old in html
html = html.replace(old, "if(!window.NexusCity2)window.__cityInit();")
html = html.replace('</style>', '</style>\n<script>window.__cityInit=function(){\n' + city + '\n};</script>', 1)
lz = open(src_dir + '/lastzone.js', encoding='utf-8').read()
assert '</script' not in lz.lower()
old2 = "if(!window.LastZone)await load('lastzone.js');"
assert old2 in html
html = html.replace(old2, "if(!window.LastZone)window.__lzInit();")
html = html.replace('</style>', '</style>\n<script>window.__lzInit=function(){\n' + lz + '\n};</script>', 1)
open(out, 'w', encoding='utf-8', newline='').write(html)
print(len(html))
