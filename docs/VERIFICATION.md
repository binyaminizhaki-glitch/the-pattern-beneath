# Verification and delivery

Verified locally on Windows with Node 24.13.0. This is the actual React/TypeScript/Vite application and pure agent simulation, not a static prototype. Nothing was pushed or deployed.

## 5 November 2026: room readings and plain-English revision

- `npm run test`: PASS, 25 tests. The added room test checks action gates, immutable prior readings, duplicate strips and reset. The narrative route now visits all five room scenes.
- `npm run build`: PASS, strict TypeScript and Vite.
- `npm run format:check` and `npm run test:game`: PASS. The supplied client now captures the opening room and its exported reading state.
- Broad production regression: 23 of 24 scenarios passed. The 1920px complete story reached the epilogue but exceeded its old 75-second test budget during an Axe scan. Five added room scenes increase the complete route’s interactions and scans; that test now has a 180-second budget.
- Final focused regression: **8 of 8 passed in 7.2 minutes**, covering the complete story and production subpath at all four sizes. It checks every room action, the final source illustration, gated final text, unchanged town records, source PDF bytes and correct PDF/PNG MIME types. The other 16 scenarios passed in the broad run.
- A follow-up scan found low contrast during the Continue button’s disabled-to-enabled color transition. Removed that transition; the final room scans pass. Screenshot review also caught a clipped sidebar record and a caption overlapping the peel controls; both were corrected.

Visually inspected the room, traced pattern, final illustration and town at desktop/mobile sizes. Current captures include `room-*`, `final-room-mobile.png`, `final-room-1280.png`, `final-town-1280.png`, plus the refreshed `immersive-*` and `story-*` files. The original printed pages 648, 652, 653 and 656 were rendered and checked before quoting. See `STORY_AND_DESIGN.md` for passages and provenance.

The source PDF and illustration add 5,007,740 bytes in `public/sources/`. They are local and load when used. The core simulation’s equations and draws are unchanged; its output descriptions now use simpler English. The room is a separate reading state, not a diagnosis or a new town variable. Nothing was deployed or pushed.

## Previous revision checks

| Command | Result |
| --- | --- |
| `npm run build` | PASS. TypeScript and Vite production compilation. HTML 0.73 KB; CSS 71.15 KB (16.27 KB gzip); JS 433.95 KB (138.77 KB gzip). |
| `npm test` | PASS. 24 tests in 3 files: 17 original engine invariants, 2 presentation tests, 5 narrative tests. |
| `npm run test:e2e` | PASS. 24 tests across all four production viewports, including dialogue, complete eight-week paths and full subpath playthroughs. Final dialogue regression: 8.2 minutes. |
| `npm run audit:model` | PASS. 9 reproducible runs, seeds 1/42/123, both narratives and passive control. |
| `npm run format:check` | PASS. |
| `npm audit` | PASS. Zero known reported dependency vulnerabilities, including development dependencies. |
| `npm run test:game` | PASS. Supplied game-skill browser client captures a scene and state without browser errors; its short capture ends in the prologue. Full gameplay is covered by the production Playwright suite. |

Production Chromium viewports: **1280×720, 1440×900, 1920×1080, 390×844**. The dialogue revision adds a sixth scenario per size: challenges and evidence through every institutional voice, keyboard continuation, unchanged state and dialogue bounds. The other five scenarios cover the complete mixed-channel story; keyboard/reduced-motion/duplicate-release/reset; eight quiet weeks; eight restrictive weeks; production project subpath through the ending and replay. The production subpath server serves `dist/` at `/the-pattern-beneath/`; no hosting service is involved.

Dialogue revision preservation check: SHA-256 comparison found **zero changes across 15 simulation/art files**, including the entire pure engine and all eleven paintings. See `../output/dialogue-preservation-result.json`. Personal motives and spoken lines were rewritten; admissions, recommendations, manuscripts, publications, rules and evidence remain snapshot-derived. See `DIALOGUE_DIRECTION.md` for the writing approach. The complete updated 24-test production browser regression passed.

The browser suite checks nine scene kinds, all eight rounds, dialogue branches, claim/manuscript inspection, three messengers, authentic seven-phase causality, leader encounters, institution profiles, individual histories, historical timeline, zoom, synchronized counterfactuals, unchanged aptitude evidence, wallpaper reveal, literary text, sources, About, opposite strategy, comparison replay and story replay. Asking questions or changing uncommitted choices cannot change model metrics. Quiet-play metrics must exactly equal the independently run passive world. Restrictive outcomes must equal engine-computed expectations. The first cinematic uses a controlled browser clock to inspect short phases reliably under host load.

Document width/height must equal the viewport; scroll offsets remain zero. Primary controls are checked against stage bounds, so hiding overflow cannot conceal clipped actions. Axe scans check key rendered scenes and overlays for WCAG A/AA issues. This is automated coverage, not a full manual accessibility certification.

## Causal audit

Actual total publications in intervention weeks **1–8**, excluding the opening edition. Each seed/strategy uses the same immutable aptitudes and per-person/event draws.

| Seed | Repeated Gazette narrative | Women’s works | Men’s works |
| --- | --- | ---: | ---: |
| 1 | Hierarchy | 9 | 83 |
| 1 | Equal potential | 85 | 83 |
| 1 | No intervention | 22 | 83 |
| 42 | Hierarchy | 9 | 95 |
| 42 | Equal potential | 81 | 95 |
| 42 | No intervention | 24 | 95 |
| 123 | Hierarchy | 9 | 100 |
| 123 | Equal potential | 76 | 100 |
| 123 | No intervention | 18 | 100 |

Aptitude stayed unchanged in every run. Passive replay was identical for all three seeds. These are fictional model results, not empirical evidence about real populations. No dashboard value is directly assigned by a player choice. See `SIMULATION_MODEL.md` for the actual equations and assumptions and `../output/model-audit.json` for the audit data.

## Art and visual inspection

Eleven original generated images are stored locally as optimized WebP: bedroom, town, Clara, wallpaper, physician, editor, Gazette desk, school, clinic, manuscript and revelation. Total **2,839,558 bytes**. No hotlinked art, web fonts or runtime generation. `../public/art/manifest.json` records creator, origin, terms note and attribution status. All eleven image responses are verified under the production subpath; the opening image is also checked for successful browser decoding.

Screenshots were inspected for composition and legibility. Current files include:

- `../output/screenshots/immersive-cover-projector-1920.png`
- `../output/screenshots/story-prologue-desktop-1440.png`
- `../output/screenshots/story-clara-desktop-1440.png`
- `../output/screenshots/immersive-town-laptop-1280.png`
- `../output/screenshots/immersive-reveal-laptop-1280.png`
- `../output/screenshots/cinema-pattern-laptop-1280.png`
- `../output/screenshots/story-epilogue-laptop-1280.png`
- Corresponding mobile-390 captures of every key scene.
- `../output/screenshots/dialogue-henry-challenge-1440.png` and `dialogue-henry-*`, `dialogue-benjamin-*`, `dialogue-frederick-*` captures show the rewritten conversations at the target sizes.

Older editorial/draft images in the output directory are development history; the refreshed `immersive-*`, `story-*` and `cinema-*` files document the image-led version. The design bible records composition, character consistency, transitions and optional muted ambience.

## Startup

From the project directory:

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`.

```powershell
npm run build
npm run preview -- --port 4173
```

For local GitHub Pages project-path verification after building: `node scripts/serve-pages.mjs`, then open `http://127.0.0.1:4174/the-pattern-beneath/`. Browser tests install with `npx playwright install chromium` if needed.

## Remaining limitations

- No save/resume; refresh restarts. Replay retains seed 42 so outcomes remain comparable.
- Browser automation covers Chromium and mobile emulation. Physical phones, Safari, Firefox and screen-reader software were not separately tested.
- About ten minutes is the current pacing target; human reading speed and optional inspection change duration. No independent classroom timing study was performed.
- Live town figures and movement are stylized projections of logged model events. The paintings do not constitute historical evidence. The fixed-aptitude model is explanatory fiction and does not simulate diagnosis or establish causes of mental illness.
- No external deployment has been performed.
