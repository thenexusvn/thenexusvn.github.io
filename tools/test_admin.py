import sys, json, os
from playwright.sync_api import sync_playwright
d = sys.argv[1]
fake = open(os.path.join(d, 'tools', 'fakefb.js')).read()
base = 'window.NEXUS_FIREBASE_CONFIG={apiKey:"x",authDomain:"x",projectId:"x",appId:"x"};window.NEXUS_VIDEO_UPLOAD=null;'
store = {'channels/chung/messages/m1': {'text': 'Tin nhắn bậy bạ', 'uid': 'OTHER', 'name': 'Bạn Lan', 'createdAt': 1795520000000}}
ok = True
def check(n, c, x=''):
    global ok; print(('PASS ' if c else 'FAIL ') + n, x); ok = ok and bool(c)
def run(admin):
    cfg = base + ('window.NEXUS_ADMIN_EMAILS=["mk@gmail.com"];' if admin else 'window.NEXUS_ADMIN_EMAILS=["boss@gmail.com"];')
    ctx = b.new_context()
    def serve(r):
        f = r.request.url.split('nexus.test/')[1].split('#')[0] or 'index.html'
        if f == 'firebase-config.js': return r.fulfill(body=cfg, content_type='text/javascript')
        r.fulfill(path=d + '/' + f)
    ctx.route('**/firebasejs/**', lambda r: r.fulfill(body=fake if 'app-compat' in r.request.url else '', content_type='text/javascript'))
    ctx.route('http://nexus.test/**', serve)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script('if(!sessionStorage.getItem("fbstore"))sessionStorage.setItem("fbstore",' + json.dumps(json.dumps(store)) + ')')
    pg.goto('http://nexus.test/index.html#sign-in'); pg.wait_for_timeout(800)
    pg.click('#siGoogle'); pg.wait_for_timeout(400)
    pg.evaluate("location.hash='#commshub'"); pg.wait_for_timeout(300)
    return pg, errs, ctx
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    # normal member
    pg, errs, ctx = run(False)
    check('member: no gold look', not pg.evaluate("document.body.classList.contains('is-admin')"))
    check('member: cannot delete others', pg.locator('#msgs [data-delmsg]').count() == 0)
    check('member: no ban button', pg.locator('#msgs [data-ban]').count() == 0)
    check('member: admin nav hidden', pg.evaluate("$=document.querySelector.bind(document);$('#sideAdmin').hidden"))
    check('member: no page errors', not errs, errs); ctx.close()
    # admin
    pg, errs, ctx = run(True)
    check('admin: gold look', pg.evaluate("document.body.classList.contains('is-admin')"))
    check('admin: badge in user box', 'ADMIN' in pg.inner_text('#userbox'))
    check('admin: delete on others', pg.locator('#msgs [data-delmsg]').count() == 1)
    pg.fill('#msgIn', 'Chào mọi người, mình là admin'); pg.press('#msgIn', 'Enter'); pg.wait_for_timeout(400)
    mine = pg.evaluate("Object.values(window.__FB).find(m=>m.text==='Chào mọi người, mình là admin')")
    check('admin: message tagged admin', mine and mine.get('admin') is True, mine)
    check('admin: own message has badge', pg.locator('#msgs .msg.adm').count() == 1)
    pg.click('#msgs [data-ban]'); pg.wait_for_timeout(100); pg.click('#msgs [data-ban]'); pg.wait_for_timeout(400)
    check('admin: ban saved', 'banned/OTHER' in pg.evaluate("Object.keys(window.__FB).join(',')"))
    check('admin: unban button shows', pg.locator('#msgs [data-unban]').count() == 1)
    pg.click('#msgs .msg:not(.adm) [data-delmsg]'); pg.wait_for_timeout(400)
    check('admin: other message deleted', 'channels/chung/messages/m1' not in pg.evaluate("Object.keys(window.__FB).join(',')"))
    pg.evaluate("location.hash='#admin'"); pg.wait_for_timeout(300)
    check('admin page: ban listed', 'Bạn Lan' in pg.inner_text('#adBans'))
    pg.fill('#adAnn', 'Tối nay bảo trì 15 phút'); pg.click('#adAnnGo'); pg.wait_for_timeout(400)
    check('announcement banner', pg.is_visible('#announce') and 'bảo trì' in pg.inner_text('#annTxt'))
    pg.click('#adBans [data-adunban]'); pg.wait_for_timeout(300)
    check('unban from admin page', 'banned/OTHER' not in pg.evaluate("Object.keys(window.__FB).join(',')"))
    check('admin: has all plans', pg.evaluate("NexusData.hasPlan('premium')&&NexusData.hasPlan('vaultPlus')"))
    check('admin: no page errors', not errs, errs); ctx.close()
    # banned member sees the block, and the announcement
    store2 = dict(store); store2['banned/G1'] = {'name': 'Minh Khoa', 'reason': 'test'}; store2['config/announce'] = {'text': 'Xin chào cả trường'}
    store.clear(); store.update(store2)
    pg, errs, ctx = run(False)
    check('banned: input disabled', pg.evaluate("document.querySelector('#msgIn').disabled"))
    check('everyone: announcement shows', 'Xin chào cả trường' in pg.inner_text('#annTxt') and pg.is_visible('#announce'))
    pg.click('#annX'); pg.wait_for_timeout(100)
    check('announcement can be closed', not pg.is_visible('#announce'))
    check('banned: no page errors', not errs, errs); ctx.close()
    b.close()
print('ALL PASS' if ok else 'SOME FAILED')
