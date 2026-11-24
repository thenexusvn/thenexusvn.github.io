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
- No copyrighted music playback. SonicDeck plays synth tracks only; the Vietnamese and phonk list holds links only.
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
