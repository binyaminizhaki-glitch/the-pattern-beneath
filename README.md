# The Pattern Beneath

A cinematic game inspired by Charlotte Perkins Gilman's _The Yellow Wall-Paper_. Start in the original painted room, follow four short source quotations, then play eight weeks in the town of Vesper.

## Play

- **Start** plays a 31-second opening automatically, with quiet local ambience. **Pause**, **Skip** and mute are available. The opening pauses when the page is hidden or a source dialog is open.
- Choose **Let people try** or **Keep women out**. Each choice sends the message through the Gazette and advances exactly one week. Watch people, rules, access and published work change. **Skip** finishes only the animation.
- There are no forced conversations, room tasks or text popups between turns. **Records**, citizens and institutions open optional information. On a phone, swipe the town or use its left/right arrows.
- After week eight, compare women's published work in your town and a matching town with no messages. Totals cover weeks 1–8, excluding the opening edition. **Continue** returns to the room and the original ending illustration. **Play again** resets the game.

The town's 48 persistent agents and deterministic engine are unchanged. Abilities and social ties stay fixed; belief, access, practice and completed work can change. Every publication requires a completed manuscript and recorded opportunity. Fictional model results are separate from the Gazette editor's interpretation and from Gilman's original story. Clara is not Gilman's narrator. No diagnosis is simulated.

## Run locally

Requires Node.js 22.12 or later.

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. All artwork, source files and ambience are local. No account, backend, external runtime API or network access is required for play. Source websites open only when followed. Refresh resets progress.

Tab and Enter operate controls. Escape closes dialogs and returns focus. F outside controls toggles fullscreen. Reduced-motion preferences remove camera movement and animations while preserving timed quotes. Sound starts after Start; muting remains in effect when replaying within the session.

## Sources and implementation

Four opening quotes and the ending excerpt were checked against the [National Library of Medicine's 1892 facsimile](https://www.nlm.nih.gov/exhibition/theliteratureofprescription/exhibitionAssets/digitalDocs/The-Yellow-Wall-Paper.pdf). PDF links use the original printed page numbers. The final engraving comes from p. 656. The other images are fictional illustrations. See [cinematic flow and source record](docs/CINEMATIC_FLOW.md).

The current experience is orchestrated by `src/App.tsx`, the pure scene reducer in `src/narrative/film.ts`, and the existing simulation in `src/sim/`. The earlier narrative components remain in the repository but are outside the active route. Older design documents describe the earlier, more detailed presentation.

## Verification

```powershell
npm run test
npm run build
npm run test:e2e
npm run format:check
```

Browser scenarios cover the automatic opening, timing and pause behavior, eight-turn mixed and restrictive playthroughs, animation projection, immutable engine results, optional records, keyboard focus, comparison, ending, replay, local assets and the GitHub Pages subpath. Viewports: 1280×720, 1440×900, 1920×1080 and 390×844. Captures are in `output/screenshots/cinematic-*`.

For the supplied game client, run the local server, then `npm run test:game`. Its `render_game_to_text` state describes the scene, current shot, turn, visible records and comparison. `advanceTime` advances the current visual segment; it never submits a simulation choice.

## Publication

The existing GitHub Pages workflow publishes `main` after its checks pass. Local changes do not update the published site. Deployment and pushes require permission.
