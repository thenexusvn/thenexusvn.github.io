import sys, json, os
from playwright.sync_api import sync_playwright
d = sys.argv[1]
fake = open(os.path.join(d, 'tools', 'fakefb.js')).read()
cfg = 'window.NEXUS_FIREBASE_CONFIG={apiKey:"x",authDomain:"x",projectId:"x",appId:"x"};window.NEXUS_VIDEO_UPLOAD=null;window.NEXUS_SCHOOL_EMAIL_DOMAIN="";'
ok = True
def check(name, cond, extra=''):
    global ok
    print(('PASS ' if cond else 'FAIL ') + name, extra); ok = ok and bool(cond)

# a tiny silent WAV for upload tests
import struct, wave, io
buf = io.BytesIO(); w = wave.open(buf, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(b'\x00\x00' * 8000 * 2); w.close()
open('/tmp/test.wav', 'wb').write(buf.getvalue())

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    # ---- local mode ----
    ctx = b.new_context(); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + d + '/index.html#sonicdeck'); pg.wait_for_timeout(800)
    n = pg.evaluate("document.querySelectorAll('#sdList [data-k]').length")
    check('Vietnamese list shows songs', n > 50, n)
    pg.click('#sdGenres button:has-text("Cải lương")'); pg.wait_for_timeout(100)
    check('cai luong filter', pg.evaluate("document.querySelectorAll('#sdList [data-k]').length") >= 8)
    pg.click('#sdGenres button:has-text("Bolero")'); pg.wait_for_timeout(100)
    check('bolero filter', pg.evaluate("document.querySelectorAll('#sdList [data-k]').length") >= 20)
    pg.fill('#sdQ', 'nhu quynh'); pg.wait_for_timeout(100)
    check('accent-free search', pg.evaluate("document.querySelectorAll('#sdList [data-k]').length") >= 3)
    pg.click('#deckTabs [data-tab=world]'); pg.wait_for_timeout(100)
    check('world list', pg.evaluate("document.querySelectorAll('#sdList [data-k]').length") >= 90)
    check('no synth Originals listed', 'Giờ Ra Chơi' not in pg.inner_text('[data-view=sonicdeck]'))
    # clicking a YouTube song shows the video area and sets now playing (the API itself is offline here)
    pg.click('#sdList [data-k]:first-child'); pg.wait_for_timeout(300)
    check('now playing title', pg.inner_text('#npTitle') == 'La Vie en rose', pg.inner_text('#npTitle'))
    check('video area shown', pg.is_visible('#ytWrap'))
    check('YouTube API requested', pg.evaluate("!!document.querySelector('script[src*=\"youtube.com/iframe_api\"]')"))
    # community: local mode needs a name
    pg.click('#deckTabs [data-tab=up]'); pg.click('#upBox summary')
    pg.fill('#upTitle', 'Bài thử'); pg.click('#upGo'); pg.wait_for_timeout(200)
    check('needs a name', 'tên hiển thị' in pg.inner_text('#upErr'))
    pg.evaluate("NexusData.setLocalName('Khoa')"); pg.wait_for_timeout(100)
    pg.set_input_files('#upFile', '/tmp/test.wav'); pg.fill('#upTitle', 'Bài thử'); pg.click('#upGo'); pg.wait_for_timeout(300)
    check('rights box required', 'quyền' in pg.inner_text('#upErr'))
    pg.check('#upRights'); pg.click('#upGo'); pg.wait_for_timeout(1200)
    check('file saved on device', 'Bài thử' in pg.inner_text('#upList') and 'Trên máy này' in pg.inner_text('#upList'), pg.inner_text('#upList')[:120])
    pg.click('#upList [data-k]'); pg.wait_for_timeout(800)
    check('local file plays', pg.evaluate("!document.querySelector('#sdAudio').paused || document.querySelector('#sdAudio').ended"), pg.evaluate("document.querySelector('#sdAudio').src.slice(0,5)"))
    check('cover shown for file', pg.is_visible('#sdCover') and not pg.is_visible('#ytWrap'))
    pg.click('#upList [data-del]'); pg.wait_for_timeout(500)
    check('local delete', 'Bài thử' not in pg.inner_text('#upList'))
    pg.evaluate("NexusI18n.setLang('en')"); pg.wait_for_timeout(200)
    check('English tabs', 'Community' in pg.inner_text('#deckTabs'))
    pg.evaluate("NexusI18n.setLang('vi')")
    check('no page errors (local)', not errs, errs)
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.evaluate("location.hash='#sonicdeck'"); pg.click('#deckTabs [data-tab=vn]'); pg.wait_for_timeout(300)
    pg.screenshot(path='sd-mobile.png', full_page=False)
    ctx.close()

    # ---- cloud mode with fake Firebase ----
    ctx = b.new_context(viewport={'width': 1280, 'height': 860})
    def serve(r):
        f = r.request.url.split('nexus.test/')[1].split('#')[0] or 'index.html'
        if f == 'firebase-config.js': return r.fulfill(body=cfg, content_type='text/javascript')
        r.fulfill(path=d + '/' + f)
    ctx.route('**/firebasejs/**', lambda r: r.fulfill(body=fake if 'app-compat' in r.request.url else '', content_type='text/javascript'))
    ctx.route('http://nexus.test/**', serve)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script('sessionStorage.setItem("fbstore","{}")')
    pg.goto('http://nexus.test/index.html#sign-in'); pg.wait_for_timeout(800)
    pg.click('#siGoogle'); pg.wait_for_timeout(500)
    pg.evaluate("location.hash='#sonicdeck'"); pg.wait_for_timeout(200)
    pg.click('#deckTabs [data-tab=up]'); pg.click('#upBox summary')
    pg.click('#upMode [data-m=yt]')
    pg.fill('#upLink', 'https://youtu.be/dQw4w9WgXcQ?si=abc'); pg.fill('#upTitle', 'Never Gonna Give You Up'); pg.fill('#upArtist', 'Rick Astley')
    pg.click('#upGo'); pg.wait_for_timeout(700)
    doc = pg.evaluate("Object.entries(window.__FB).filter(([k])=>k.startsWith('songs/')).map(([k,v])=>v)[0]")
    check('YouTube link shared to Firestore', doc and doc['yt'] == 'dQw4w9WgXcQ' and doc['uid'] == 'G1' and doc['plays'] == 0, doc)
    check('shared song listed with poster', 'đăng bởi Minh Khoa' in pg.inner_text('#upList'))
    pg.click('#upList [data-k]'); pg.wait_for_timeout(300)
    plays = pg.evaluate("window.__FB['stats/tracks']")
    check('play counted', plays and any(k.startswith('u_') for k in plays), plays)
    pg.click('#deckTabs [data-tab=vn]'); pg.click('#sdList [data-k]:first-child'); pg.wait_for_timeout(300)
    pg.evaluate("location.hash='#home'"); pg.wait_for_timeout(300)
    check('home shows most played', pg.is_visible('#hotbar'), pg.inner_text('#hotbar') if pg.is_visible('#hotbar') else '')
    pg.evaluate("location.hash='#sonicdeck'"); pg.click('#deckTabs [data-tab=up]')
    pg.set_input_files('#upFile', '/tmp/test.wav') if pg.is_visible('#upFile') else None
    check('no page errors (cloud)', not errs, errs)
    pg.evaluate("location.hash='#sonicdeck'"); pg.click('#deckTabs [data-tab=vn]'); pg.wait_for_timeout(300)
    pg.screenshot(path='sd-desktop.png')
    b.close()
print('ALL PASS' if ok else 'SOME FAILED')
