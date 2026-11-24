import sys, json, os
from playwright.sync_api import sync_playwright
d = sys.argv[1]
fake = open(os.path.join(d, 'tools', 'fakefb.js')).read()
def cfg(admin): return 'window.NEXUS_FIREBASE_CONFIG={apiKey:"x",authDomain:"x",projectId:"x",appId:"x"};window.NEXUS_VIDEO_UPLOAD=null;window.NEXUS_SCHOOL_EMAIL_DOMAIN="";window.NEXUS_ADMIN_EMAILS=' + json.dumps(admin) + ';'
ok = True
def check(n, c, x=''):
    global ok; print(('PASS ' if c else 'FAIL ') + n, x); ok = ok and bool(c)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    def page(admin, store, clock=False):
        ctx = b.new_context(viewport={'width': 1280, 'height': 860})
        def serve(r):
            f = r.request.url.split('nexus.test/')[1].split('#')[0] or 'index.html'
            if f == 'firebase-config.js': return r.fulfill(body=cfg(admin), content_type='text/javascript')
            r.fulfill(path=d + '/' + f)
        ctx.route('**/firebasejs/**', lambda r: r.fulfill(body=fake if 'app-compat' in r.request.url else '', content_type='text/javascript'))
        ctx.route('http://nexus.test/**', serve)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script('sessionStorage.setItem("fbstore",' + json.dumps(json.dumps(store)) + ')')
        if clock: pg.clock.install()
        pg.goto('http://nexus.test/index.html#home'); pg.wait_for_timeout(800)
        return ctx, pg, errs

    # 1. a guest sends feedback through the sidebar button
    ctx, pg, errs = page([], {})
    check('sign-in shown while signed out', pg.is_visible('#sideSignIn'))
    check('admin link hidden', not pg.is_visible('#sideAdmin'))
    pg.click('#fbOpen'); pg.wait_for_timeout(100)
    check('popup opens', pg.is_visible('#fbPop'))
    check('form hidden until stars', not pg.is_visible('#fbForm'))
    pg.click('#fbStars [data-s="4"]')
    check('4 stars lit', pg.evaluate("document.querySelectorAll('#fbStars .on').length") == 4 and pg.inner_text('#fbLab') == 'Tốt')
    pg.select_option('#fbArea', 'SonicDeck'); pg.fill('#fbText', 'Thêm nhạc cải lương nữa nha'); pg.click('#fbSend'); pg.wait_for_timeout(400)
    fb = pg.evaluate("Object.entries(window.__FB).filter(([k])=>k.startsWith('feedback/')).map(([k,v])=>v)")
    check('saved to server', len(fb) == 1 and fb[0]['stars'] == 4 and fb[0]['area'] == 'SonicDeck' and fb[0]['name'] == '', fb)
    check('thanks shown', pg.is_visible('#fbThanks'))
    store = pg.evaluate('window.__FB')
    # non-admin Google user
    pg.evaluate("location.hash='#sign-in'"); pg.click('#siGoogle'); pg.wait_for_timeout(400)
    check('sign-in button hidden once signed in', not pg.is_visible('#sideSignIn'))
    pg.evaluate("location.hash='#admin'"); pg.wait_for_timeout(200)
    check('non-admin blocked', pg.is_visible('#adNo') and 'không có quyền' in pg.inner_text('#adNo'))
    check('no errors 1', not errs, errs); ctx.close()

    # 2. admin account reads it
    store['feedback/f2'] = {'stars': 2, 'text': '', 'area': '', 'name': 'An', 'uid': 'x', 'lang': 'vi', 'page': 'home', 'createdAt': 1795500000000}
    ctx, pg, errs = page(['MK@gmail.com'], store)
    pg.evaluate("location.hash='#sign-in'"); pg.click('#siGoogle'); pg.wait_for_timeout(500)
    check('admin link shown for admin', pg.is_visible('#sideAdmin'))
    pg.click('#sideAdmin'); pg.wait_for_timeout(300)
    check('list shows both', pg.evaluate("document.querySelectorAll('#adList .adit').length") == 2)
    check('average 3,0', pg.inner_text('#adAvg') == '3,0', pg.inner_text('#adAvg'))
    check('comment visible', 'cải lương' in pg.inner_text('#adList'))
    pg.check('#adTextOnly'); pg.wait_for_timeout(100)
    check('comment filter', pg.evaluate("document.querySelectorAll('#adList .adit').length") == 1)
    pg.uncheck('#adTextOnly'); pg.click('#adStarsF [data-st="2"]'); pg.wait_for_timeout(100)
    check('star filter', pg.evaluate("document.querySelectorAll('#adList .adit').length") == 1)
    pg.click('#adList [data-fdel]'); pg.wait_for_timeout(300)
    check('delete', pg.evaluate("Object.keys(window.__FB).filter(k=>k.startsWith('feedback/')).length") == 1)
    pg.click('#adStarsF [data-st="0"]'); pg.wait_for_timeout(100)
    pg.screenshot(path='./admin.png')
    pg.evaluate("NexusI18n.setLang('en')"); pg.wait_for_timeout(200)
    check('English admin', 'User feedback' in pg.inner_text('[data-view=admin]'))
    check('no errors 2', not errs, errs); ctx.close()

    # 3. popup appears by itself after 3 minutes, once
    ctx, pg, errs = page([], {}, clock=True)
    check('not shown at start', not pg.is_visible('#fbPop'))
    pg.clock.fast_forward('03:05'); pg.wait_for_timeout(200)
    check('auto popup after 3 min', pg.is_visible('#fbPop'))
    pg.click('#fbStars [data-s="5"]'); pg.click('#fbLater'); pg.wait_for_timeout(100)
    check('later closes and snoozes', not pg.is_visible('#fbPop') and pg.evaluate("JSON.parse(localStorage.getItem('nexus-feedback')).snooze>Date.now()"))
    pg.screenshot(path='./fb-popup-closed.png')
    pg.click('#fbOpen'); pg.click('#fbStars [data-s="5"]'); pg.wait_for_timeout(150)
    pg.screenshot(path='./fb-popup.png')
    check('no errors 3', not errs, errs)
    b.close()
print('ALL PASS' if ok else 'SOME FAILED')
