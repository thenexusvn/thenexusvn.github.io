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
