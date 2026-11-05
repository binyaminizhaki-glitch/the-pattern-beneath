# The Pattern Beneath

A single-player game about who gets believed, inspired by Charlotte Perkins Gilman's _The Yellow Wall-Paper_. Play five short scenes in the narrator’s room, change the story being told in Vesper across eight weeks, and follow Clara Vale’s work through two towns. Ten scene types use eleven environment paintings and portraits, plus the original 1892 ending illustration. The document never scrolls; optional records and sources scroll inside overlays.

[Play the game](https://binyaminizhaki-glitch.github.io/the-pattern-beneath/) · [Source repository](https://github.com/binyaminizhaki-glitch/the-pattern-beneath)

## Run locally

Requires Node.js 22.12 or later; developed and tested with Node 24.13.0 and npm 11.6.2. In this project directory, run:

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The development server binds to the local machine only. No API key, backend, account or internet connection is needed for gameplay. All art, fonts and core assets are local. Source links open external primary materials only when followed.

To serve the production build:

```powershell
npm run build
npm run preview -- --port 4173
```

Open **http://127.0.0.1:4173** to inspect the production build locally.

## Play

1. Select **Enter the Story**, write a private line in the room, follow the Gazette prologue, and meet Clara before stepping into Vesper.
2. Choose **Let people try** or **Keep women out**.
3. Select **Physicians' Council**, **Town Gazette**, or **Community Circle**.
4. **Send the story** advances a week. **Let a week pass** advances without a message. **Skip** ends the brief visual transition immediately.
5. Select a citizen, or use the citizen selector on small screens, to inspect their actual history. Inspect the three institutions for rules and decisions. Timeline controls revisit immutable weekly records; return to the present to continue.
6. Clara returns after weeks 2, 5 and 7 with dialogue drawn from her records. Henry Bell appears after weeks 1 and 6; Benjamin Grey after week 3. Return to the room after weeks 2, 4 and 6: ask to leave, trace the pattern, and see the woman behind it. After week eight, compare the towns, pull the final three strips and read the ending. Clara and Gilman’s unnamed narrator are different people. See [story and design direction](docs/STORY_AND_DESIGN.md).

Asking a citizen or institutional representative about hopes, rules or work reveals perspectives without changing outcomes. Only the explicit narrative broadcast invokes the simulation. Every scene and primary control fits the viewport; detailed records and sources remain optional.

Conversations use spoken responses and follow-up branches. Challenge Henry's protective reasoning, Grey's headline or Moss's admissions; ask to examine the recorded evidence. Clara has literary ambitions, humor and misgivings about her own work. The character writing approach and factual boundaries are documented in [dialogue direction](docs/DIALOGUE_DIRECTION.md).

Tab/Enter operate buttons; native arrow keys select narrative/channel radio options. Escape closes dialogs and restores focus. F outside controls toggles fullscreen. Operating-system reduced-motion preferences are respected.

**Refresh resets the experiment.** There is no saved progress or data collection. Restart and opposite-narrative controls reuse seed 42, resetting mutable state. The pure engine accepts any finite seed for independent experiments.

## What actually runs

React, strict TypeScript and Vite; Tailwind's Vite plugin; selective Motion transitions; Lucide icons; eleven optimized local WebP paintings with small live SVG citizens/connections. There is no charting framework, remote AI service, backend or database. Image generation was used during production only. See the [visual design bible](docs/VISUAL_DESIGN_BIBLE.md) and [asset provenance](public/art/manifest.json). The complete art set is approximately 2.8 MB. Optional locally synthesized ambience is muted by default; the speaker control enables it. All information remains readable without sound.

48 persistent agents form 24 matched aptitude pairs. Beliefs update synchronously from peers, authority, message exposure, prior news and limited personal testimony. Institutions retain 75% of prior policy bias each week. Recorded seminar and writing-support decisions affect agency, training and manuscript production. The editor assesses completed manuscripts and frames the real resulting output counts. That interpretation enters belief updating the following week.

Metrics are derived from records, never assigned by player choices. **Baseline aptitude, identities and social ties never change.** Independent `randomAt(seed, turn, agentId, eventType)` draws are identical in played and passive towns. Week zero's bulletin is also simulated; weekly counts label their denominator, cumulative counts explicitly include that opening edition, and the final publication table covers weeks 1–8 only.

## Verification

```powershell
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
npm run audit:model
npm run format:check
```

Vitest covers causal invariants, deterministic replay, synchronous influence, policy inertia, access-mediated outcomes, lagged news, zero denominators and opposed strategies across seeds 1, 42 and 123. Additional tests verify the scene state machine, adaptive dialogue, authentic visual events and delayed presentation of outcomes. Playwright starts the production preview and tests 1280×720, 1440×900, 1920×1080 and 390×844 Chromium views: every scene, dialogue branches, all eight turns, three channels, opposite and passive playthroughs, inspections, comparison, epilogue, sources, replay, keyboard focus, duplicate prevention, reduced motion and both document dimensions. Tests also check that primary controls remain inside the stage. Axe scans inspect the key scenes and overlays. Screenshots are under `output/screenshots/`; the latest `story-*` and `immersive-*` files show the final design.

`npm run audit:model` writes reproducible nine-run results to `output/model-audit.json`. The supplied web-game skill client is copied unchanged to `scripts/web-game-client.mjs`; with the development server running, `npm run test:game` independently captures the current scene and `render_game_to_text` state under `output/web-game/`. `advanceTime` is intentionally inert because wall-clock time never advances this turn-based simulation.

The browser suite also starts `scripts/serve-pages.mjs` and verifies the production game and all eleven image assets at `http://127.0.0.1:4174/the-pattern-beneath/`. To inspect that static subpath yourself after a build, run `node scripts/serve-pages.mjs`. Relative Vite asset URLs allow a GitHub Pages project folder without a backend.

See [verification results](docs/VERIFICATION.md), [model specification](docs/SIMULATION_MODEL.md), [research](docs/RESEARCH.md), [game design](docs/GAME_DESIGN.md), and [execution plan](docs/EXECUTION_PLAN.md).

## Limits and literary integrity

This is an explanatory fictional model, not validated social science, a historical reconstruction, or a clinical simulation. Coefficients are selected for legible eight-week play. The paired aptitude control is invented; it is not a biological measurement or a claim that all people have equal abilities. Institutional policies deliberately model gendered exclusions, while access, training and behavior remain distinct from aptitude.

John's authority and restrictions on work make the story's ideas material, but the narrator is already in distress. The game does not claim social narratives wholly cause mental illness. Wallpaper imagery remains an interpretation, and Gilman's retrospective biography is distinguished from her fiction.

Browser automation was performed in Chromium, including a mobile viewport; physical phones, Firefox, Safari and screen-reader software were not separately tested. Small screens use a readable citizen selector instead of overlapping map hit targets. No save/resume feature is included.

## Project map

- `src/sim/`: pure state, event noise, transitions, metrics and comparison helpers.
- `src/components/`: image-led scenes, live town figures, accessible native dialogs, evidence ledger, source notes and final reveal.
- `src/App.tsx`: complete game orchestration and interaction locking.
- `src/narrative/`: explicit scene reducer, acts and record-derived dialogue.
- `src/presentation/`: causal animation phases and authentic visual event projection.
- `public/art/`: optimized original paintings, recurring portraits and provenance manifest.
- `tests/unit/` and `tests/e2e/`: causal and browser verification.
- `docs/`: model assumptions, literary grounding, plan and verification.

## GitHub Pages

The `main` branch publishes through `.github/workflows/pages.yml`. Each push installs the locked dependencies, checks formatting, runs unit tests, builds the game and runs the full desktop/mobile browser suite. Pages receives only the built `dist/` files after these checks pass. Test captures, local progress notes and dependencies stay outside Git. Relative asset URLs support the project’s `/the-pattern-beneath/` path, including the original PDF and illustration.
