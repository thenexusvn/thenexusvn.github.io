import sys, json
from playwright.sync_api import sync_playwright
d = sys.argv[1]
fake = open(__import__('os').path.join(__import__('os').path.dirname(__file__), 'fakefb.js')).read()
cfg = 'window.NEXUS_FIREBASE_CONFIG={apiKey:"x",authDomain:"x",projectId:"x",appId:"x"};window.NEXUS_VIDEO_UPLOAD=null;window.NEXUS_SCHOOL_EMAIL_DOMAIN="";'
ok = True
def check(name, cond, extra=''):
    global ok
    print(('PASS ' if cond else 'FAIL ') + name, extra)
    ok = ok and bool(cond)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    def device(store, local):
        ctx = b.new_context()
        ctx.route('**/firebasejs/**', lambda r: r.fulfill(body=fake if 'app-compat' in r.request.url else '', content_type='text/javascript'))
        def serve(r):
            f = r.request.url.split('nexus.test/')[1].split('#')[0] or 'index.html'
            if f == 'firebase-config.js': return r.fulfill(body=cfg, content_type='text/javascript')
            r.fulfill(path=d + '/' + f)
        ctx.route('http://nexus.test/**', serve)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script('sessionStorage.setItem("fbstore",' + json.dumps(json.dumps(store)) + ');' +
                           ''.join(f'localStorage.setItem({json.dumps(k)},{json.dumps(json.dumps(v))});' for k, v in local.items()) if not local.get('_skip') else '')
        pg.goto('http://nexus.test/index.html#sign-in'); pg.wait_for_timeout(800)
        return ctx, pg, errs

    # Device A: guest progress, then sign in with Google
    guest = {'diamonds': 300, 'owned': ['neon'], 'equipped': {}, 'stats': {'matches': 4, 'wins': 1, 'kills': 9}, 'xp': 40}
    cloudPrev = {'saves/G1': {'lastzone': json.dumps({'t': 1000, 'd': {'diamonds': 80, 'owned': ['gold'], 'stats': {'matches': 10, 'wins': 0, 'kills': 3}, 'xp': 100}})}}
    ctx, pg, errs = device(cloudPrev, {'lastzone-save': guest})
    check('mode is cloud', pg.evaluate('NexusData.mode') == 'cloud')
    check('Google button visible', pg.is_visible('#siGoogle'))
    pg.click('#siGoogle'); pg.wait_for_timeout(600)
    check('account chooser requested', pg.evaluate('window.__lastProvider&&window.__lastProvider.params&&window.__lastProvider.params.prompt') == 'select_account')
    lz = pg.evaluate("JSON.parse(localStorage.getItem('lastzone-save'))")
    check('guest + account skins merged', sorted(lz['owned']) == ['gold', 'neon'], lz)
    check('stats take the better value', lz['stats']['matches'] == 10 and lz['stats']['kills'] == 9 and lz['diamonds'] == 300)
    pg.wait_for_timeout(3000)
    cloud = pg.evaluate('JSON.parse(window.__FB["saves/G1"].lastzone).d')
    check('merged save uploaded', sorted(cloud['owned']) == ['gold', 'neon'])
    # play: buy a skin
    pg.evaluate("NexusData.saveGame('lastzone',Object.assign(JSON.parse(localStorage.getItem('lastzone-save')),{owned:['gold','neon','dragon'],diamonds:50}))")
    pg.evaluate("NexusData.saveGame('city',{money:9000,heists:1})")
    pg.evaluate('NexusData.flushSaves()'); pg.wait_for_timeout(300)
    check('new skin in cloud', 'dragon' in pg.evaluate('JSON.parse(window.__FB["saves/G1"].lastzone).d.owned'))
    # plan granted by the server
    pg.evaluate("window.__FB['entitlements/G1']={pro:Date.now()+30*864e5};NexusData.signInGoogle&&0")
    pg.evaluate("NexusData.flushSaves()")
    pg.evaluate("firebase.firestore().collection('x').doc('y').set({a:1})")  # trigger snapshot notify
    pg.wait_for_timeout(300)
    check('plan shown on account page', pg.inner_text('#siPlan').count('Nexus Pro')==1 and 'Vault+' not in pg.inner_text('#siPlan'), pg.inner_text('#siPlan'))
    check('Pro page status', 'Nexus Pro' in pg.inner_text('#proStatus'))
    check('hasPlan vaultPlus via Pro', pg.evaluate("NexusData.hasPlan('vaultPlus')"))
    store = pg.evaluate('window.__FB')
    pg.evaluate("location.hash='#sign-in'"); pg.wait_for_timeout(200)
    pg.click('#siOut'); pg.wait_for_timeout(500)
    check('signed out: game data removed from device', pg.evaluate("localStorage.getItem('lastzone-save')===null&&localStorage.getItem('nexus-city2-save')===null"))
    check('no page errors A', not errs, errs)
    ctx.close()

    # Device B: new computer, same Google account
    ctx, pg, errs = device(store, {})
    check('B starts empty', pg.evaluate("localStorage.getItem('lastzone-save')") is None)
    pg.click('#siGoogle'); pg.wait_for_timeout(800)
    lz = pg.evaluate("JSON.parse(localStorage.getItem('lastzone-save'))")
    check('B gets skins back', lz and sorted(lz['owned']) == ['dragon', 'gold', 'neon'] and lz['diamonds'] == 50, lz)
    check('B gets city money', pg.evaluate("JSON.parse(localStorage.getItem('nexus-city2-save')).money") == 9000)
    check('B sees plan', 'Nexus Pro' in pg.inner_text('#siPlan'))
    # English
    pg.evaluate("location.hash='#sign-in'"); pg.wait_for_timeout(200)
    pg.evaluate("NexusI18n.setLang('en')"); pg.wait_for_timeout(300)
    check('English plan line', pg.inner_text('#siPlan').startswith('Your plan: Nexus Pro until'), pg.inner_text('#siPlan'))
    check('English sync note', 'saved to this account' in pg.inner_text('#siSyncNote'))
    check('no page errors B', not errs, errs)
    ctx.close()

    # Local mode (no Firebase): Google button visible, explains it is off
    ctx = b.new_context(); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + d + '/index.html#sign-in'); pg.wait_for_timeout(800)
    pg.click('#siGoogle'); pg.wait_for_timeout(200)
    check('local mode message', 'chưa bật' in pg.inner_text('#siErr'), pg.inner_text('#siErr'))
    check('no page errors local', not errs, errs)
    pg.screenshot(path='signin-local.png')
    b.close()
print('ALL PASS' if ok else 'SOME FAILED')
