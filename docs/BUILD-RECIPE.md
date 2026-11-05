# Build recipe: one practical = one simulation + one worksheet

Time per topic once the template is mastered: about one focused session. The order matters. Do not skip step 1.

## 0. Start
```
bash tools/new-app.sh <folder-name> "Title" "One line for the landing-page card"
```
This copies `_template/` to a new folder, retitles it and adds a card to the landing page.

## 1. Agree the physics (5 minutes, with James)
Write these in the app's `README.md` before any code:
- The learning goal and the misconception being targeted.
- The **model** (equations) and every **assumption**, with numbers.
- Variables: what the student changes, measures, controls.
- The **systematic error** to be discovered, and the **biggest-source-of-error** logic for each timer or instrument.
- The explicit **targets** for the Improve-the-design tab.
- The prompts, in learning order (3 to 6).

## 2. Model first (`model.js` + `model.test.mjs`)
- `model.js` is the single source of truth (UMD, works in the browser and Node).
- Tests must cover: limiting cases, a hand-checked value, the expected linear or power relationship, the systematic error, and that the median half-range of 3 simulated readings is about the biggest source.
- Run `node --test <folder>/model.test.mjs` until green. **Do not build UI on an unchecked model.**

## 3. Simulation (`index.html`, `app.js`)
- Use `../shared/sim.css` and `../shared/sim.js` (tabs, pop-ups, seeded random numbers, results table with cross-out, SVG plot, line fit).
- App-specific CSS only in the app. If you write something twice across apps, move it to `shared/`.
- Follow `docs/TEACHING-RULES.md`.

## 4. Worksheet (`<folder>/worksheet/`)
```
cd <folder>/worksheet && ./build.sh
```
`build_data.cjs` (numbers from the model) -> `figs.py` (figures) -> `worksheet.cjs` (Word file). Edit prompts in `worksheet.cjs`, never numbers. Build with `tools/worksheet-kit`.

## 5. Check
```
npm run check            # model tests + browser checks on every app (see docs/QA-CHECKLIST.md)
```
Then look at `.check/*.png`, open the .docx in Word, and run the human checklist.

## 6. Ship
Commit, push, confirm the Pages URL loads, put the URL in the worksheet's Design section and rebuild.

## Where things live
| Thing | Where |
| --- | --- |
| Look and feel, components | `shared/sim.css`, `shared/sim.js` |
| Physics for one app | `<app>/model.js` (+ tests) |
| Worksheet helpers and figure helpers | `tools/worksheet-kit/` |
| Reference builds | `_template/` (small, pendulum), `cupcake-case-drop/` (full: graphs, drag, design tab) |
| Rules | `docs/TEACHING-RULES.md` |
