import sys, json, os
from playwright.sync_api import sync_playwright
d = sys.argv[1]
fake = open(os.path.join(d, 'tools', 'fakefb.js')).read()
cfg = 'window.NEXUS_FIREBASE_CONFIG={apiKey:"x",authDomain:"x",projectId:"x",appId:"x"};window.NEXUS_VIDEO_UPLOAD=null;window.NEXUS_SCHOOL_EMAIL_DOMAIN="";'
store = {'channels/chung/messages/m1': {'text': 'Chào cả lớp, mình nhắn từ máy khác', 'uid': 'OTHER', 'name': 'Bạn Lan', 'createdAt': 1795520000000}}
ok = True
def check(n, c, x=''):
    global ok; print(('PASS ' if c else 'FAIL ') + n, x); ok = ok and bool(c)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context()
    def serve(r):
        f = r.request.url.split('nexus.test/')[1].split('#')[0] or 'index.html'
        if f == 'firebase-config.js': return r.fulfill(body=cfg, content_type='text/javascript')
        r.fulfill(path=d + '/' + f)
    ctx.route('**/firebasejs/**', lambda r: r.fulfill(body=fake if 'app-compat' in r.request.url else '', content_type='text/javascript'))
    ctx.route('http://nexus.test/**', serve)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script('sessionStorage.setItem("fbstore",' + json.dumps(json.dumps(store)) + ')')
    pg.goto('http://nexus.test/index.html#commshub'); pg.wait_for_timeout(1000)
    check('message from another device shows on load', 'nhắn từ máy khác' in pg.inner_text('#msgs'), pg.inner_text('#msgs')[:80])
    pg.evaluate("location.hash='#sign-in'"); pg.click('#siGoogle'); pg.wait_for_timeout(400)
    pg.evaluate("location.hash='#commshub'"); pg.wait_for_timeout(200)
    pg.fill('#msgIn', 'Mình nhận được rồi nè'); pg.press('#msgIn', 'Enter'); pg.wait_for_timeout(500)
    check('own message shows', 'Mình nhận được rồi nè' in pg.inner_text('#msgs'))
    saved = pg.evaluate("Object.entries(window.__FB).filter(([k])=>k.startsWith('channels/chung/messages/')).length")
    check('saved to server', saved == 2, saved)
    # another device writes while this page is open
    pg.evaluate("firebase.firestore().collection('channels').doc('chung').collection('messages').doc('m9').set({text:'Tin mới đến trực tiếp',uid:'OTHER',name:'Bạn Lan',createdAt:Date.now()})"); pg.wait_for_timeout(300)
    check('live message appears without reload', 'Tin mới đến trực tiếp' in pg.inner_text('#msgs'))
    check('no page errors', not errs, errs)
    b.close()
print('ALL PASS' if ok else 'SOME FAILED')
