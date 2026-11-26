# Nexus: handoff note for Claude chat

Start a Claude chat with the GitHub repo `thenexusvn/thenexusvn.github.io` attached (or upload the project zip) and say: "Read HANDOFF-CLAUDE-CHAT.md first, then continue the project."

The owner writes in Vietnamese and is not technical: explain in plain Vietnamese, one step at a time.

## How to ship a change
Edit the files, commit, and push to `main` of `thenexusvn/thenexusvn.github.io`. GitHub Pages republishes https://thenexusvn.github.io in about a minute. No build step.

## What Nexus is
A school super-app, rebuilt from v0-thenexus.vercel.app. Single-page vanilla JS app with hash routing. Natural Vietnamese copy, with a full English switch.

## Files
- `index.html` (~249 KB): the whole app.
  - Sections: Trang chủ, The 7-Vault, CourtDraft, TheArena, SonicDeck, CommsHub, Loopy, Pro, Đăng nhập.
  - Contains the i18n module (`window.NexusI18n`), the data layer (`NexusData`: Firebase or a localStorage fallback), the Loopy video app and the game launchers.
- `city.js` (~188 KB): the 3D open-world game "Nexus City". Lazily loaded.
- `lastzone.js` (~121 KB): the 3D single-player battle royale "Last Zone". Lazily loaded.
- `firebase-config.js`: `NEXUS_FIREBASE_CONFIG`, `NEXUS_VIDEO_UPLOAD` (Cloudinary) and `NEXUS_SCHOOL_EMAIL_DOMAIN`. All empty, so the app runs in local-only mode.
- `firestore.rules`, `HUONG-DAN-FIREBASE.txt`: setup for a real shared backend.
- `README.txt`: user-facing description and controls.

## Locked decisions (ask before breaking any)
- Fonts: Inter and Space Grotesk.
- Colours: `#08090c` dark background, `#c1f354` lime for free features, `#ad8dff` purple for paid ones.
- three.js **r128 APIs only** (loaded from cdnjs). Keep the PMREM black-probe check. Keep the merged-mesh performance approach (`buildVC`).
- Music (changed Nov 2026 at the owner's request): SonicDeck plays real songs only through the embedded YouTube player (youtube-nocookie), and only uploads from official channels (artist, label, producer, TV station or YouTube "Topic"). Never host or stream copyrighted audio files. Community uploads require the "I made it or may share it" box; YouTube links are the way to share other people's songs. The generated synth tracks remain only as the Nexus City car radio.
- Nexus City: no GTA names, characters or map.
- Guns are allowed, with **no blood**: a hit knocks people out.
- No fake data: online counts, files, messages and views come only from real users.
- Test the games through their `_dbg` objects.
- Export the full project as a zip after each change.

## Current state
- **Pricing:**
  - Nexus Pro 79.000đ.
  - Vault+ 49.000đ/month.
  - SonicDeck Premium 35.000đ/month.
  - No game pass.
  - The payment gateway is not connected.
- **Branding:**
  - The site logo is a square "N" icon next to a "nexus" wordmark with a two-colour x.
  - The favicon is the N icon.
- **The 7-Vault:**
  - Grade 9 only, with these subjects:
    - Math: Standard, Extended, Further.
    - English: Phase 3–6.
    - Science.
    - Physical Health Education.
    - Design: Food, Digital, Product.
    - Arts: Theatre, Music, Art.
    - Vietnamese Geography & History.
    - Individuals and Societies.
    - Languages: Mandarin, Vietnamese, Korean, Japanese.
  - The data structure is the `CURRICULUM` object in index.html.
- **Loopy:**
  - School-only video app with shorts and long videos, filters, comments, follows, likes and share links.
  - Videos go to Cloudinary when configured, otherwise to IndexedDB.
- **TheArena:** only two games, Last Zone and Nexus City. The old 2D games were removed.
- **Last Zone:**
  - Island of 7 towns. Plane drop and loot.
  - 6 guns, armor and helmets, cars.
  - Zone with 7 phases.
  - 4 modes with 19, 29, 39 or 49 bots.
  - 3D lobby, 14 paid gun skins bought with diamonds (top-up not connected; diamonds are earned by playing).
  - Save key `lastzone-save`.
  - API: `window.LastZone` {start, stop, setPaused, resize, _dbg}.
- **Nexus City:**
  - 14x14 map with a river and bridges.
  - Shops, vehicles with suspension, rain and day/night.
  - Enterable house, hospital and bank.
  - Guns without blood, GPS routing, optional tutorial.
- **Language:** the whole app switches between Vietnamese and English. Games use the `L(vi,en)` helper plus the shared dictionary.

- **Accounts (Nov 2026):**
  - Sign-in page leads with "Tiếp tục với Google" (account chooser via `prompt: select_account`, redirect fallback if popups are blocked).
  - `NexusData` syncs game saves to Firestore `saves/{uid}` (keys `lastzone`, `city`; each a JSON string `{t,d}`), debounced 2.5 s, flushed on pagehide and sign-out.
  - First sign-in after guest play merges: Last Zone skins are unioned, numbers take the max; City keeps the richer save.
  - Sign-out removes the game saves from the device. A game already open when the account data arrives is marked stale, and the page reloads on next open.
  - Plans live in `entitlements/{uid}` {pro, vaultPlus, premium} as expiry timestamps, read-only to clients (server or console writes). API: `NexusData.hasPlan(k)`, `planUntil(k)`; Pro implies the other two. Nothing is gated on plans yet.
  - Test: `tools/test_sync.py` with `tools/fakefb.js` (fake Firebase, two devices).
- **Hosting:** GitHub Pages at https://thenexusvn.github.io from repo `thenexusvn/thenexusvn.github.io`; Firebase project `nexus-4012e` (branch main, root). Add `<user>.github.io` to Firebase authorized domains.

- **SonicDeck (Nov 2026):** 177 catalog songs in `CAT` (title, artist, genre, year, YouTube id, seconds, channel), found and embed-checked through YouTube search plus oEmbed. Tabs: Nhạc Việt (cải lương, bolero, trữ tình, V-Pop, rap, remix, phonk), Quốc tế, Cộng đồng. Community songs: Firestore `songs` (file on Cloudinary via `NEXUS_VIDEO_UPLOAD`, or `yt` id), files fall back to IndexedDB on this device when Cloudinary is not set. Free users add 5 songs, `hasPlan('premium')` 100. Plays go to `stats/tracks` keyed `y_<id>` or `u_<docId>`; the home "most played" bar reads `window.NexusSongInfo`. Test: `tools/test_sd.py`.

- **Feedback (Nov 2026):** pop-up rating (1-5 stars, area, comment) opens from "Góp ý" in the sidebar, and by itself once after 3 minutes (not on #arena, #admin, #sign-in; "Để sau" snoozes 7 days, close 14). Saved to Firestore `feedback` (anyone signed in, guests too, may create). Admin page `#admin` (sidebar link only for admins) shows average, distribution, filters, delete. Admins = `window.NEXUS_ADMIN_EMAILS` in firebase-config.js AND `isAdmin()` in firestore.rules: keep both lists the same. Test: `tools/test_fb.py`.
- **CommsHub fix (Nov 2026):** the channel listener restarts on the `mode` event, so it listens to Firestore once Firebase is ready. Test: `tools/test_chat.py`.

- **Nexus City interiors (Nov 2026):** house, hospital and bank rebuilt with canvas-drawn textures (planks, tiles, marble, wallpaper, fabric, stone), detailed furniture, window views, signs, and up to 3 point lights moved into the room the player is in (`interiorLights()`, called after `todApply()`; dims sun and hides rain indoors). Helpers live inside create(): `itb` (textured box), `ceilQ`, `cyl`, `sph`, `glow`, `pframe`, `iwin`, `plant`, `room`. Camera indoors: shorter distance, lower pitch, pulled in along the ray. `/dev/` holds a preview copy of the site for trying changes before they go live.

- **Nexus City streets (Nov 2026):** street lamps can be knocked down by any car faster than 4.5 m/s (`lampHits` in carStep, `knockLamp`, `lampUpdate`; collider gets `off`, which `query()` skips; head swaps to a dark instance, glow and ground pool hidden; respawns after 120 s once the player is 80 m away). Night light pools under lamps (`poolMat`, additive, two quads per lamp: road and pavement). 1024px asphalt with patches, cracks, oil; instanced manholes and drains. Lit windows vary in tint and brightness, with blinds, curtains or a person.

- **Nexus City map (Nov 2026):** the map is no longer a square.
  - **West hills:** zone `HZ` (x -800..-456, z -110..480), height grid `HGRID`, `heightAt(x,z)` (0 outside), `inHills()`. A mountain road is a Catmull-Rom spline from (-452,128) up to a lookout plaza at (-694,184), about 60 m high. It has guard rails, a "NEXUS" hillside sign and pines. Cars tilt in `syncCar` and feel slope gravity in carStep. Player, NPCs and camera follow `heightAt`.
  - **Sea:** wraps east and south. Curved shores come from `shoreE(z)` and `shoreS(x)`, and sand height from `beachH`.
    - The water is one L-shaped grid `waterG` (y .02, small waves). Cells are kept only where sand is under water, so it never shows above dry sand.
    - Foam strip: `foamUpdate`. The pier starts on the sand.
    - Grass `G` no longer extends under the sea, because waves would show it through.
  - **City:** sidewalks are rounded slabs (`rslab`, `CRAD`=3.2) with asphalt filling the corners. `inCut()` keeps the player at road level on a cut corner.
    - Parks have diagonal paths (`dpath`).
    - More street trees, benches and blue mailboxes come from their own random stream `sr2`, so the rest of the layout stays put.
  - **Smashables:** cars knock hydrants, bins and mailboxes flying, and topple traffic lights. A hydrant leaves a water jet for about 22 s.
    - Code: `smashProp`, `smashUpdate`, `SMI` instanced meshes, and `col.smash={k,i}` on colliders.
    - They respawn after 90–120 s once the player is 80 m away.
  - **Night headlights:** the 18 nearest cars (8 on mobile) cast additive beam quads on the road (`BEAM`, `beamUpdate`).

- **Admin powers (Nov 2026):** the admin account is `NEXUS_ADMIN_EMAILS` in firebase-config.js plus `isAdmin()` in firestore.rules (both list nguyenphucvy08@gmail.com). `ND.admin` is true only in cloud mode.
  - **Look:** `body.is-admin` turns lime into gold, adds a ♛ ADMIN badge in the user box and hides the Pro upsell.
  - **CommsHub:** admin messages carry `admin:true` (rules allow it only for admins) and show a crown and badge to everyone. Admins see Xoá on every message and Chặn/Bỏ chặn on other people's messages.
  - **Bans:** stored in `banned/{uid}`. Rules function `poster()` = member and not banned, so banned users can't create messages, papers, matches, songs, videos or comments. A banned user's chat input is disabled.
  - **Deleting content:** admins can delete anyone's Vault paper, match, song, video and comment.
  - **Announcement:** a site-wide bar from `config/announce`. Admins post or remove it on #admin; each viewer can close it, and that hides only the current text.
  - **Plans:** admins get every plan (`planUntil` returns about 10 years from now).
  - **Test:** `tools/test_admin.py`.

- **Getting in and out of cars (Nov 2026):** every car (not bikes) has a driver-side front door on local +x. It is built by `doorGeo(b)`: a panel, window and handle, plus a dark opening `hole`. The door is shown only while open and animated by `c.doorA`/`c.doorT` in `doorsUpdate`.
  - Cars with a driver show a seated driver mesh `m.drv`, built by `bustGeo(body, look)`. `c.look` is reused when that driver is pulled out. The player's look is shown while the player drives.
  - **F to get in:** `startEnter` runs `P.seq`: walk to the door → open → pull the driver out if there is one (`pullDriver`: the NPC falls, gets up, flees or fights; police drivers fight and add 2 stars) → climb in → close.
  - **F to get out** (below about 16 km/h): `startExit` runs open → step out. The door closes on its own with a slam sound.
  - If the door spot is blocked, the old instant enter/exit is used. `seqUpdate` replaces player input during a sequence. A knock-down cancels the sequence (`seqCancel`).

- **The wilds (Nov 2026):** the map now runs north and west of the city.
  - **Area:** `WZ` is the grid (x -1500..545, z -1700..-110). `WA` is where the player may go, and `AREAS=[EXT,HZ,WA]` is the walkable union used by `resolve`.
  - **Height lookup:** `heightAt` checks the west-hills grid `HGRID` first, then the wild grid `WGRID` (built by `wildBuild`, pure math, cell size 6 m, 8 m on mobile). `inHills` now also covers the wilds, so cars tilt and feel slope everywhere.
  - **Roads:** R1 is asphalt, from the city's north gate through the meadow, the village, the mine valley and switchbacks up to Nexus Peak. R2 is gravel, branching to Mirror Lake and the campsite. Both are carved into the terrain.
  - **Places** (each `WILD.places` entry pays money the first time you discover it; saved in `save.disc`):
    - Wildflower Meadow and Old Pine Forest.
    - Mirror Lake, with a dock, a rowboat and an island. The water is solid except on the dock (`onDock`, `WILD.lake`).
    - Silver Falls: an animated sheet on the cliff on the north shore.
    - Pine Village: cabins, a well, and a shop and a café you can use with E (`WILD.shops` → `openShop`).
    - Windy Hill Farm: barn, silo, fields, fences, hay.
    - Whispering Pines campsite: tents, and a campfire where E calls `campRest` to heal, skip the night and save. A parked SUV and dirt bike are there.
    - The Old Mine: portal set into a rock face, rails, a cart.
    - Nexus Peak: plaza, radio mast with a blinking light, a flag, a parked sports car.
    - North Cape Lighthouse on the north beach, with a beam that turns at night.
    - Nexus Pass lookout in the hills.
  - **Gems:** 20 Nexus gems hidden around the wilds and hills (`WILD.gems`, saved in `save.gems`). Each gives $150, and finding all 20 gives $5,000.
  - **River:** keeps flowing west through its own valley, with a bank collider.
  - **Trees:** about 3,600 pines, broadleaf trees and boulders (fewer on mobile), all with colliders.
  - **Map and GPS:** the map covers everything and shows explored and gem counts. `planRoute` routes along the wild roads (`wildPath`) and falls back to `planRouteCity` in town.
  - **Fog:** draws further out while you are in the wilds. The distant mountain ring moved out to 1.75–2.3 km.

- **Share (Nov 2026):** a "Chia sẻ" button sits in the sidebar footer and a "Rủ bạn bè vào Nexus" card on the home page. Any `[data-share]` element copies `SHARE_URL` (https://thenexusvn.github.io/) through `copyText`, with an execCommand fallback.
  - On touch phones that support it, the phone's own share sheet opens instead.
  - The card also has a Facebook share link.

- **English mode (Nov 2026):** `NexusI18n` translates DOM text, attributes and canvas `fillText`/`strokeText` through the dictionary `D` and the regex list `R`.
  - Strings with no Vietnamese accent marks are translated only when they are in `NODIA` (for example the channel `chung`, `Xe`, `Mang`), so English words are never touched.
  - Added the wild place names, signs, interior signs, Nexus Originals titles, Last Zone bot names, prices in đ (shown as VND), and fixed the fine and kill-feed regexes.
  - Audit tools are in /home/claude/i18n:
    - `extract.js` lists literals the dictionary does not translate.
    - `audit.py` walks every page in English with the fake Firebase.
    - In the browser pane, a canvas/DOM recorder checks both games.
  - What stays Vietnamese on purpose: user content, real song titles and artists, the "Tiếng Việt" language button, and food names (bánh mì, phở).

- **Graphics overhaul (Nov 2026):**
  - **Post-processing `PP`** (in city.js, just before `frame`):
    - The scene renders into an MSAA render target (FXAA when MSAA is not available).
    - Bloom: a bright pass, then two blur levels at 1/4 and 1/8 size. The threshold drops at night so lamps glow.
    - Colour grade in the San Andreas style: cool shadows, warm amber highlights, smog lift, gentle S-curve.
    - Vignette and film grain.
    - `adapt()` turns PP off first when frames get slow.
  - **Graphics setting:** "Đồ hoạ: Đẹp nhất / Mượt" on the start and pause panels, saved as `nexus-city-gfx` and passed as `opt.gfx`. The game API has `setGfx`. Default is Best on desktop and Smooth on touch devices.
  - **Look and textures:**
    - Facades are weathered: rain streaks under windows and grime blotches.
    - Building colours moved to a dusty Los Santos palette.
    - Grass and sidewalk textures are 512 px with patches and cracks.
    - Foliage texture on street trees and broadleaf trees, needle texture on pines.
  - **Ground and cars:**
    - A contact-shadow band runs round the foot of every building.
    - Car paint uses MeshPhysical clear coat on desktop.

- **Airport (Nov 2026):** Nexus International Airport sits on reclaimed land `AP` (x -620..660, z 640..1010, ground y .35), joined to the city's south road by a causeway `CW` at x 0. `inAirport()` and `heightAt` return `AP.y` there, and both rects are in `AREAS`.
  - **Runway and taxiways:** runway 09/27 runs along z 950 with edge, threshold, approach and blue taxi lights (`AIR.RZ`). A parallel taxiway at z 880 has link taxiways to the runway.
  - **Terminal you can walk through** (`AIR.term`, x -230..30, z 690..745):
    - glass walls with door gaps, check-in islands, departures board, seats, café and duty free;
    - three gates with jet bridges and parked airliners;
    - gate 3's desk sells the sightseeing flight (`bookTour`, $250).
  - **Other buildings:** control tower with a beacon, three arched hangars, fuel farm, windsock, ground vehicles and a car park.
  - **Flyable planes** (`AIR.planes`): two Cessnas and a private jet in the hangars, plus a Cessna on the apron.
    - Arcade flight model in `planeStep`: W/S throttle, ↑/↓ pitch, A/D bank and turn. On mobile the stick pitches and turns, Run raises throttle, Brake lowers it.
    - Crashes (`crashPlane`) are buildings, trees, a hard landing or water; water sends you back to the airport. Wrecked planes respawn at home after 30 s once you are 60 m away.
    - The airspace is limited to a 2.7 km radius.
  - **Traffic:** `AIR.sky` holds three airliners circling high with fog off and glowing strobes at night. `AIR.traffic` is a widebody that lands from the east, rolls out, pivots and takes off again.
  - **Sightseeing flight:** `TOUR` is a Catmull-Rom path covering take-off, the coast, the lighthouse, camp, lake, peak, village, pass and downtown, then landing. It shows "Below: …" captions and takes about 2 minutes; F ends it. `endTour` brings the player back to the terminal.
  - **Camera, HUD and GPS:** the camera follows the plane. The HUD shows speed, height above ground and throttle. GPS routes to and from the airport through the causeway, and the map draws the airport.
  - **Testing without a browser:** /home/claude/smoke/smoke.js runs city.js with a stand-in THREE/DOM to catch code errors. fly.js and land.js check take-off, landing, crashes, the tour and traffic.

- **New people and characters (Nov 2026):**
  - **Models:** `makeHuman` builds smooth lathe-turned bodies from `HG2`: torso and pelvis profiles per sex, tapered limbs.
    - The head has a jaw, ears, nose, eye whites and irises, brows and a mouth.
    - Hair styles: short, buzz, bald, pony, long, bun. Optional beard, glasses, and a jacket over a tee panel.
    - Hands have thumbs; sneakers have white soles.
    - The group and joint layout is unchanged, so every animation still works.
  - **Player characters:** **Joseph** (male: denim jacket, white tee, stubble) and **Oscar** (female: ponytail, red top, black pants). Old saves `minh`/`vy` map to joseph/oscar (aliases stay in `CHARS`).
  - **NPCs:** `randomLook` gives them random hair styles, beards, glasses and jackets.
  - **HUD in GTA style:** money in green Impact with a black outline, an Impact clock, gold stars, a red health bar.

## Public link
https://thenexusvn.github.io (GitHub Pages). Firebase project `nexus-4012e`: Google, Email/Password and Anonymous sign-in on; Firestore in asia-southeast1 with `firestore.rules` published; authorized domain `thenexusvn.github.io`.

Older claude.ai artifact copies exist but are public and frozen; GitHub Pages is the live site. `tools/build_artifact.py` still makes a single-file build if one is ever needed.

## Not yet verified
- FPS on a real GPU and on phones.
- How the games feel to play.
- Google sign-in end to end with a real account (Firebase is configured; anonymous sign-in, reads and the rules were verified live).
- Cloudinary video upload for Loopy (not configured).

## Open ideas the user has not asked for yet
- Netlify deploy.
- More Vault grades.
- Cheaper single plans.
- Per-game passes.

## tools/ folder
Python helper scripts used during development:
- `build_artifact.py`: makes the single-file web build. Usage: `python build_artifact.py <project_dir> <out.html>`.
- `lzbuild.py` with `lz1.js`–`lz4.js`: the source parts that were assembled into lastzone.js. lastzone.js is now the file to edit directly.
- `lzi18n.py`: added the Last Zone English strings to index.html.

## Xe mới, nội thất, ngồi ăn, hạ cánh dễ (11/2026)
- 10 loại xe mới trong `CAR_T`/`CAR_BODY`: hatch, coupe, muscle, pickup, van, minivan, jeep, limo, hyper, bus. Chi tiết riêng theo loại ở `carExtras()` (cánh gió hyper, cản trước + bánh dự phòng jeep, thùng bán tải, cột cửa sổ + bảng tuyến xe buýt...). `spec.offs` = các vòng va chạm dọc thân (xe dài), `spec.hip`/`seatZ` chỉnh chỗ ngồi tài xế. Có trong giao thông và bán ở Nexus Motors (`VEH`).
- Nội thất mới (`room()` x 3300–4100): diner, police, mart, guns, gym, clothes, cars (showroom), và 4 phòng dùng chung: flat, office, hotel, ware. `R.acts` = điểm bấm E, `R.seats` = ghế ngồi được. Cửa hàng ngoài phố (`XROOM`) giờ E là vào trong, tới quầy mới mở shop. Đồn cảnh sát: `SP.policeDoor`, quầy trực ban nộp phạt xoá truy nã ($250/sao), tủ giáp $350.
- `GDOORS`: cửa của nhà ống, nhà ở, chung cư, toà văn phòng, khách sạn biển, nhà kho → vào phòng dùng chung tương ứng, ra lại đúng cửa đó (`enterInterior(id,out)`). Mesh cửa gộp lại thành 1 mesh.
- Tiệm ăn: mua món → `P.tray` (cầm khay), E ở ghế trống → `sitDown` ngồi ăn 6 giây hồi máu dần (`sitUpdate`, `sitPose`), E/đi để đứng dậy. Ra ngoài khi đang cầm khay thì ăn mang đi.
- Máy bay: dưới 32 m có hỗ trợ hạ cánh (tự cân cánh, tự nâng mũi, giới hạn tốc độ rơi); chạm đất mạnh thì nảy lên và mất ít máu, chỉ rơi thẳng xuống rất mạnh (>30 m/s) hoặc xuống nước mới nổ.

## Bản đồ mở rộng: 5 thị trấn mới, kim cương Nexus (11/2026)
- Code ngoài trời nằm trong khối `TOWNS` (trước phần sân bay); nội thất mới nằm sau `rooms2` (tea, sea, church, saloon, cinema ở x 4180–4500).
- Thị trấn (tâm và mặt bằng ở `PL` của `wildBuild`, được san phẳng qua `flats`):
  - Phố Cổ Đèn Lồng (-375,-612): phố đèn lồng, kênh, cầu mái đỏ, chùa ba tầng, trà quán.
  - Cảng Bắc (385,-655): bến cảng (`PADS` = sàn nâng có độ cao riêng, `AREAS` thêm cầu tàu), thuyền nhấp nhô, cẩu, container, chợ cá, nhà hàng hải sản.
  - Đồi Mây (-540,-1050): biệt thự, nhà thờ có tháp chuông, chợ đêm, khách sạn.
  - Thị trấn Mỏ Bạc (-1030,-800): nhà gỗ kiểu miền Tây, saloon, văn phòng cảnh sát trưởng, tháp nước, cối xay gió.
  - Nexus Tây (vùng `WL`, x -1385..-790, z -112..440): toà kính, quảng trường đài phun nước, rạp phim (màn hình chạy hình), mall, biệt thự có hồ bơi, sân bóng.
- Đường mới: R3 (cảng), R6 (phố cổ) đi thẳng từ thành phố; B4 (Đồi Mây), B7 (Mỏ Bạc) rẽ từ đường chính; đường đô thị ở Nexus Tây (thêm sau `wildBuild`). Mỗi đường có `kind`, `gate` (đường gốc) hoặc `par`/`pj` (rẽ nhánh); GPS `wildPath` đi theo cây đường này.
- `door()` trong thị trấn đẩy vào `GDOORS` với `room` bất kỳ (flat, office, hotel, ware, mart, guns, gym, clothes, cars, diner, police, tea, sea, church, saloon, cinema) và `txt` riêng.
- Kim cương Nexus: `DIAS` (40 viên: 24 ngoài trời, 16 trong nhà), lưu ở `save.dia`, $500/viên, đủ bộ +$50.000; xử lý trong `diaUpdate`. Bản đồ hiện bộ đếm.
- Dân cư đi bộ trong thị trấn: `TPED` trong `wildUpdate`. Ăn uống ngồi bàn chạy ở mọi phòng có `R.seats` (`takeFood`).

## Màn hình chào mừng lần đầu (11/2026)
- Cuối `index.html` (CSS `.onb*` + script): hiện khi trình duyệt chưa có `localStorage['nexus-onb-v1']`, hoặc khi mở link có `?welcome=1` (để thử lại). Link chia sẻ giờ là `?ref=share` → màn hình ghi "Bạn của bạn đã mời bạn".
- Các bước: logo + Loading → Bắt đầu → Điều khoản (tick đồng ý, link đọc đầy đủ; lưu `nexus-terms`) → Đăng nhập/Tạo tài khoản (Google hoặc email, kèm khuyến nghị dùng tài khoản Google cá nhân; bỏ qua nếu đã đăng nhập) → Tên + ảnh đại diện (`ND.setProfile`, avatar lưu ở `photoURL` dạng `https://thenexusvn.github.io/#av=aN`) → chữ "giữ bí mật… / Enjoy!" rồi vào web. Có nút VI/EN.
- Nội dung Điều khoản & Chính sách: `window.NEXUS_TERMS` (vi/en), có trang riêng `#terms` (nút "Điều khoản" ở cột trái). Đây là bản mẫu, chưa qua luật sư xem.
- Ảnh đại diện hiện cạnh tên ở cột trái (`nexusAvatarHTML`).

## CommsHub: nhắn riêng, nhóm chat, kết bạn (11/2026)
- Code ở khối `HUB` trong `index.html` (ngay trước phần FEEDBACK); ghi đè `renderChans`, `renderChat`, `openChannel` để thêm phòng riêng.
- Firestore mới (đã thêm vào `firestore.rules`, phải dán vào Firebase console):
  - `profiles/{uid}` {name, photo, at}: mỗi tài khoản thật tự ghi khi mở web. Danh sách "Mọi người" và tổng số người lấy từ đây. Tài khoản chỉ xuất hiện sau khi đã mở web bản mới ít nhất một lần.
  - `friends/{a_b}` {users, by, status}: lời mời (pending) → chấp nhận (ok).
  - `rooms/{id}` {type dm|group, members, owner, name, names, last, lastBy, lastAt} và `rooms/{id}/messages`. DM có id `dm_a_b`.
- Chấm xanh online lấy từ `presence`. Chưa đọc: so `lastAt` với `localStorage['nexus-read-<id>']`.

## Một tài khoản cho cả Nexus và Loopy, thẻ trang cá nhân (11/2026)
- Loopy lấy tên và ảnh đại diện từ `profiles` (bảng `PROF` trong script Loopy, hàm `pname`, `av`), không còn dùng tên lưu riêng. Trang hồ sơ Loopy có nút Sửa tên & ảnh (→ #sign-in), Kết bạn, Nhắn tin.
- Thẻ trang cá nhân `#pcModal` (`openCard(uid)`, `window.NexusHub.card`): ảnh, tên, trạng thái online/bạn bè, số Video / Người theo dõi / Đang theo dõi (từ `users/{uid}` và video Loopy), nút Theo dõi, Kết bạn, Nhắn tin, Xem video. Mở bằng cách bấm ảnh hoặc tên trong danh sách mọi người, trong tin nhắn, hoặc tên người ở đầu chat riêng.
- Trang Tài khoản (#sign-in) có phần sửa tên + chọn ảnh đại diện (`#siAcct`, `ND.setProfile`).
- API dùng chung giữa hai script: `window.NexusHub` {ready, dm, friendToggle, friendLabel, card} và `window.NexusLoopy` {open, follow, isFollowing, videosOf}.

## Cloudinary cho Loopy (11/2026)
- Tài khoản Cloudinary của chủ web, cloud name `znot6i1w`, upload preset `loopy_unsigned` (Unsigned, thư mục `loopy`, bật Disallow public ID). Đã ghi vào `firebase-config.js` (`NEXUS_VIDEO_UPLOAD`).
- Đã thử tải một video thử 1 giây lên thành công (nằm trong thư mục loopy trên Cloudinary, có thể xoá).

## Nexus Legends (MOBA 5v5) — moba.js
- Game MOBA gốc (lấy cảm hứng thể loại, KHÔNG dùng tướng/tên/UI của Liên Quân). Thẻ "Nexus Legends" trong #arena, launcher `window.NexusMobaUI` trong index.html, nạp `moba.js?v=3`.
- Nguồn tách phần ở /home/claude/moba/p1_core.js … p9_match.js; build: `cat p1..p9 > moba.js`.
- 8 tướng: kael, brakk, nyra, elara, vex, lumi, zoltar, thorn; 15 trang bị; 3 đường, trụ, nhà chính, quái rừng (bùa xanh/đỏ, rồng…).
- Màn: sảnh chờ (showcase 3D), chế độ (Dễ/Thường/Khó), tướng, hướng dẫn, chọn tướng (24s), loading, trận, kết quả. Lưu `nexus-moba-save` (cấp, trận, thắng, MVP).
- Điều khiển PC: WASD/chuột phải di chuyển, Space đánh, Q/E/R chiêu, F tốc biến, B về nhà, Tab bảng điểm. Mobile: joystick + nút, kéo nút chiêu để ngắm.

## Nexus City — nâng cấp đồ hoạ (25/11/2026)
- Xe: thân dựng bằng `carLoft` (mặt cắt superellipse theo profile hông xe, bo góc, kính vát vào), mui sơn tách từ khoang kính, mâm 5 chấu, lốp bo, đèn/xi nhan, viền chrome, tay nắm, khe cửa, hốc bánh tối.
- Toà nhà: `wrapGB` ghi lại mọi khối nhà → `buildDetails()` thêm gờ tầng, phào mái, lan can mái, chân tường, cột góc, vây kính (toà kính), buồng kỹ thuật/thang trên mái.
- Cây: thẻ lá alpha (`broadleafGeo`, `coniferGeo`, `LEAFM`, `NEEDLEM`, `instFol`) cho cây phố, cây thị trấn, rừng thông.
- Cỏ: `GRASS` (instanced quanh người chơi trên đồi/rừng, chỉ máy tính).
- Chất lượng tự hạ từng bước: độ phân giải → bloom → bóng. Texture anisotropy tối đa. Xe/người đi đường nhiều hơn (34 trên máy tính).
- index.html nạp `city.js?v=20261125g`.

## Nexus City — Story mode "Lật đổ Ông Trùm" (26/11/2026)
- Menu: Tutorial · Vào thẳng thành phố · Story mode (panel `#cStoryP` có 4 bước, luật 3 mạng, phần thưởng). Đổi chế độ khi game đang chạy → `sessionStorage['nexus-city-boot']` + reload rồi tự vào.
- city.js `opt.mode==='story'`: save riêng `nexus-city2-story` (không đồng bộ cloud), bắt đầu $1.500. Code ở khối STORY MODE (trước `function frame`).
- Chương: 0 mua súng → 1-5 trùm ở oldq/harbor/highland/minetown/westside (boss + đàn em kiểu guard, mỗi trùm 1 mảnh thẻ, +$2.000) → 6 Tháp Syndicate (cửa ở vỉa hè downtown gần tâm, sân thượng dựng ở x=5600 kiểu "interior" mở, thành phố giả bên dưới) → trùm còn 25% máu thì lên trực thăng, bắn rơi → màn PHÁ ĐẢO + pháo hoa.
- Chết: `wasted()` → `stDied()` trừ mạng, tỉnh ở bệnh viện giữ tiến độ; hết 3 mạng: mất thẻ, quay về trùm 1, hồi 3 mạng.
- Phần thưởng lần đầu: `localStorage['nexus-city2-legend']={done,claimed}`; chế độ thường lúc tải sẽ cộng $100.000 + xe `legend` (CAR_T.legend, VEH.legend unique, không bán ở shop) vào gara. Chơi lại story không nhận thêm.
- _dbg.story để test (SS, stSpot, stEnterTower, heli...).

## Nexus City — Bóng rổ (26/11/2026)
- Khối công viên (12,12) thành công viên thể thao: 2 sân ngoài trời 28x15 (FIBA) có rào lưới, 6 cột đèn, ghế, bảng tên. Giữ nguyên chuỗi random của thành phố (cây/ghế công viên được tạo vào mảng giả).
- Nhà thi đấu trong nhà: room 'court' ở x=4900 (sàn gỗ maple vẽ canvas, bảng rổ kính, giá đỡ bọc đệm, khán đài 2 bên, bảng điểm LED cập nhật theo điểm ném, đèn trần). Cửa ở mặt trước sân vận động (gdoor 'court'), POI trên bản đồ.
- Ném rổ: đứng trước rổ trong 10 m, bấm E (bbOption/bbShoot/bbUpdate). Tỉ lệ vào giảm theo khoảng cách, ngoài 6,75 m = 3 điểm; vào rổ +$10 / +$25.
- Chế độ chơi bóng (HP): E ở sân → cầm bóng. Tấn công: J ném (tư thế gom-bật-ra tay-giữ tay), K layup (2 bước, bật 1 chân), L úp rổ (dưới 3,8 m, treo vành), Space đảo bóng (crossover, có thể "bẻ cổ chân" bot). Phòng thủ: J cướp, K/Space chắn. Nút bấm trên màn hình (.nc-hp) cho cả PC lẫn điện thoại.
- Solo 1v1 với bot (hp1v1): nửa sân, tới 11 điểm (2/3 điểm), đổi bóng sau khi ghi điểm, bắt bóng bật bảng của đối phương phải đưa ra ngoài vạch 3 điểm. Thắng +$500. Bảng điểm trong nhà thi đấu hiện tỉ số.

## Báo cập nhật + chặn từ bậy (26/11/2026)
- MỖI LẦN publish: chạy `python3 tools/bump.py "ghi chú"` trước khi commit. Nó đổi `<meta name="nexus-build">` trong index.html (+dev) và ghi `version.json`. Trang đang mở kiểm tra /version.json mỗi 60 giây (và khi quay lại tab): khác build → màn hình "Có bản cập nhật mới / There's an update" với nút Tải lại (tạm dừng game đang chơi).
- `window.NexusMod` (script trước firebase-config): `guard(...texts)` chặn từ bậy tiếng Việt (có/không dấu, từ mơ hồ khi bỏ dấu chỉ bắt khi có dấu — đánh dấu '!') và tiếng Anh (leetspeak, f.u.c.k, kéo dài chữ). 3 lần → cấm viết 1 tiếng (localStorage 'nexus-mod' theo uid). Gắn vào: setProfile, addDoc, createMatch, sendMessage, addFeedback, addSong, makeGroup, sendRoom, postVideo, addComment.

## Guest mode (Khách)
- Onboarding auth step: link "Tiếp tục với tư cách khách / Continue as guest" (cloud mode only) → ND.continueAsGuest() sets LS 'guest' and keeps the anonymous Firebase user → profile step (name + avatar saved with updateProfile on the anonymous user).
- ND.user.guest = anonymous && LS guest. ND.isGuest. needChat() lets guests sendMessage; other features still need needUser().
- Main app: chatOK() gates CommsHub (channels, DMs, groups, people). Profile docs carry guest:true → "Khách" badge (.guest-badge) in chat, rooms, people list, profile card; sidebar shows "Khách (Guest)"; account page shows a guest note.
- firestore.rules: chatter() = signedIn() && notBanned() for channels/profiles/friends/rooms; profiles allow 'guest' key. User must re-paste rules.
- Signing in with email/Google clears the guest flag.

## Story mode cinematics (city.js, "story cinematics" block before "free mode: collect")
- CIN director: cine({type:'tip'|'intro'|'stamp'|'title'|'fail', wait, hold, slow, at:npc, steps, ...}). wait=true freezes time (CIN.ts eases to 0, frame() runs step(dt*CIN.ts)), letterbox bars, desaturated view, Space/Enter/E/J or click continues. Non-wait cards slow time to `slow` for `hold` seconds.
- Stingers synthesised in cinSfx ('in','out','boss','stamp','fail','win','slow'); game audio ducks while a card is up.
- Script: stOpening (title + mission 1), stArmed, territory title in stSpawnGang, stIntro (boss freeze-frame, camera turns to him, pointer ring), stFightTip (first exchange), stHalf, stKeyStamp (k/5 cards), Syndicate Tower open, stTowerIntro, bodyguards-down, stHeliTip, heli smoking, stHeliDown, stFail, stWantedTip, stLowTip. One-time tips are stored in save.story.tips.
- Boss/town names are bilingual via L() in ST_TOWNS. Debug: game._dbg.cin.
