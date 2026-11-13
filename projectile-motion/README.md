# Projectile Motion Explorer (Phase 1)

For high-attaining GCSE and A-level students, including those not taking A-level Maths. Teacher demos, self-study, homework and interactive whiteboards. Brief: `BRIEF.md`.

## Learning goal and misconceptions
Horizontal and vertical motions are independent: constant horizontal velocity, constant downward acceleration g. Targeted misconceptions: "acceleration is zero at the top", "a faster horizontal launch stays up longer", "horizontal velocity dies away", "doubling the speed doubles the height".

## Model and assumptions (keep in step with `model.js`)
- Point particle. Ground is y = 0, up is positive, launch point (0, h0).
- **No air resistance** (Phase 1). a<sub>x</sub> = 0, a<sub>y</sub> = −g.
- x = u<sub>x</sub>t; y = h0 + u<sub>y</sub>t − ½gt²; v<sub>x</sub> = u<sub>x</sub>; v<sub>y</sub> = u<sub>y</sub> − gt.
- Flight time = the positive root of y = 0 (the later root when there are two, i.e. landing on the way down). Range = x at landing. Max height = h0 + u<sub>y</sub>²/(2g) at t = u<sub>y</sub>/g; for a horizontal launch that is h0 at t = 0.
- h0 < 0 is a launch from a pit, shown as a narrow shaft whose walls are ignored, and the UI says so. If u<sub>y</sub>² + 2gh0 < 0 it never reaches ground level: the flight ends back on the pit floor (y = h0) at t = 2u<sub>y</sub>/g, and the UI says so.
- Collision (Phase 2 hook): two point particles within 0.01 m of each other at the same time.
- Inputs: u 0 to 100 m s⁻¹, θ 0 to 90°, h0 −20 to 100 m, g 1 to 20 m s⁻² (default 9.81). One "Step forward" = 0.10 s. Playback 0.25×, 1×, 3×.
- Displayed precision: 2 decimal places, angles to 1°. Questions are marked within 2% of the model value.

## Files
| File | What it does |
| --- | --- |
| `model.js` | Physics, the single source of truth (UMD). Also an independent step-by-step simulation used to check the closed-form results. |
| `equations.js` | Equation Explorer text: symbolic forms and live substitution, numbers from the model. |
| `questions.js` | Scenarios 1 and 2, 12 questions in the brief's data model, rule-based marking. Answers and every number in hints come from the model. |
| `app.js`, `index.html` | UI. Uses `../shared/sim.css` and `../shared/sim.js`. |
| `model.test.mjs` | Model, equation text and question-bank tests (`node --test projectile-motion/model.test.mjs`). |
| `acceptance.mjs` | The brief's seven acceptance tests in a real browser. Writes `TEST-LOG.md`. Run `node projectile-motion/acceptance.mjs`. |

## Where this follows the repo rather than the brief
- Flat layout (`index.html`, `model.js`, `app.js` ...) and the shared stylesheet and helpers, not `css/` and `js/` folders (CLAUDE.md rule 4).
- Axis labels use brackets to match the tables, e.g. "height, y (m)" (agreed for this app; docs/TEACHING-RULES.md still says "quantity / unit" for graphs elsewhere).
- No worksheet: the brief does not ask for one.

## Room for later phases (not built)
- Phase 2: every model function takes a projectile object `{u, thetaDeg, h0, g, t0}`; `t0` (launch time) is already honoured and `collide()` exists. The app keeps projectiles in a list (`PROJ`). Air resistance: `drag` is reserved and Phase 1 refuses it rather than ignoring it. Scenarios 3 to 9 add entries to `SCENARIOS` and `QUESTIONS`.
- Phase 3: questions are plain data with `setup` objects, so Teacher Mode can randomise setups within ranges; answers recompute from the model. How assignments are shared (URL code or export/import) is left open.

## Visual design
- Quiet by default, loud only where the physics is: neutral greys, hairlines instead of boxes, and the four meaning colours (horizontal blue, vertical red, resultant purple, acceleration green) used only for physics. One accent (orange) for Play, the current step and THINK prompts.
- Colour is never the only cue: each vector has its own line pattern and a label; each readout has a written symbol.
- Velocity is drawn head to tail (v<sub>x</sub>, then v<sub>y</sub> from its tip, v as the diagonal); acceleration sits to one side on its own scale. Labels avoid the ball, other shafts and each other, and are left out when an arrow is too short. Tapping a velocity or acceleration readout highlights its arrow.
- Font: Inter, self-hosted in `shared/fonts/` (SIL Open Font License, `shared/fonts/Inter-OFL.txt`), with tabular figures.
- Presentation mode (toolbar button) scales everything up for whiteboards. Touch targets are at least 44 px.

