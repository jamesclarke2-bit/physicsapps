# Motion Graphs Mastery

An interactive game for learning displacement–time, velocity–time and acceleration–time graphs,
from GCSE to top-end A-level and Oxbridge-style enrichment. It is built the same way as the GCSE
Astronomy site: plain HTML, CSS and JavaScript with no build step, no libraries and no outside
assets. It runs straight from GitHub Pages or from local files.

## What's in it

**Home (`#/`)** opens on *Explore freely*: the Motion Lab and Air Resistance Lab up front, then the
Gradient and Area Explorers, Insight panels and the Misconception gym. A slim banner points to the
lessons.

**Learning journey (`#/learn`)** is a separate page holding the six-stage level map
(`src/levels.js`, 34 levels).

**Six-stage level map** (`src/levels.js`, 34 levels). Stages unlock once half of the previous
stage's core GCSE levels are done. A-level and extension levels never block progress.

1. Understanding Motion: the Signs lab (position, displacement, distance, velocity, speed, and the
   sign of acceleration)
2. Reading Graphs: Predict the Motion on s–t, v–t and a–t graphs, and Match the Motion
3. Interpreting Graphs: gradients, the area challenge, Draw the Graph and Fix the Mistake
4. Linking Representations: words, graphs and equations in both directions, reverse engineering,
   Create the Motion, and the first Detective cases
5. Quantitative Problem Solving: 18 question generators, from velocity-from-gradient up to
   A-level journey reconstruction
6. Mastery: expert and mastery Detective files, variable acceleration, the Reconstruction lab,
   optimisation, and calculus (shown only in Mathematical Extension mode)

**Game modes**

- **A. Match the Motion:** every wrong graph is built from a named misconception.
- **B. Predict the Motion.**
- **C. Draw the Graph:** freehand or point-and-line sketching, marked phase by phase.
- **D. Fix the Mistake:** 18 cases, each worked through as what's wrong, then why, then the correct
  reading.
- **E. Create the Motion:** "Plan it" builds a program of thrust and brake blocks; "Drive it live"
  works with a held button or the arrow keys.
- **Graph Detective (flagship):** five tiers of case files.

**Air Resistance Lab** (`#/drag`). A ball, bullet or shuttlecock fired straight up, a skydiver,
or a ball dropped from a tower, with quadratic drag (drag = k v²). It shows:

- a live free-body diagram of weight, drag and resultant, drawn to scale
- a faded twin of the same object with no air resistance, and its graphs dashed for comparison
- the terminal velocity marked on the v–t graph and −g on the a–t graph
- commentary on the forces at each moment, and a with/without table (time up, height, time
  down, landing speed)

It comes with a 10-question predict-first quiz (level 6-9, also at `#/drag/quiz`) and four
Fix-the-Mistake cases on air resistance. The drag engine (`src/dragModel.js`) is checked against
the exact formulas for quadratic drag.

**Explorers:** the Motion Lab (scenario library, equation builder, stage builder), the Gradient
Explorer (tangent, chord-to-limit) and the Area Explorer (shading, strips, running total).

**Insight panels:** five "why" explanations, each with its own interactive graph.

**Three maths modes:** Standard, Advanced (rates of change) and Mathematical Extension (d/dt and
∫). The mode changes what is drawn and said, not just the labels.

**Dashboard:** XP and ranks, stars, streaks, 15 badges, personal bests, mastery rings for the ten
skills, misconception counts and an accuracy trend over the session.

**Teacher mode:** GCSE, A-level and Extension course settings, the maths mode, difficulty
(adaptive or fixed), unlock-all, lesson launchers, a seeded printable question-bank generator with
graphs and worked answers, and session analytics.

## Privacy

There are no accounts, no analytics and no network requests beyond the site's own files.
Progress is kept in `sessionStorage`, so the browser deletes it when the tab or app closes. The
strict content-security policy is the same one the astronomy site uses.

## Layout

```
index.html, styles.css, favicon.svg
src/   pure logic (UMD, also loaded by Node for tests)
  motionModel.js     exact piecewise motion engine (constant, uniform and linearly-varying acceleration)
  dragModel.js       vertical motion with air resistance (RK4, checked against exact results)
  scenarios.js       24 story scenarios across 5 tiers, plus a random generator
  misconceptions.js  16 misconceptions and 18 Fix-the-Mistake cases
  graphCompare.js    sketch marking with phase-by-phase physics feedback
  quantGenerators.js 18 question generators with worked answers and misconception-tagged wrong answers
  reconstruction.js  constraint-checked v–t design challenges
  levels.js, progress.js, format.js
app/   interface: graph canvas, animated stage, player, level runner, activities/, views/
test/  engines.test.js (unit) and browser.test.js (Playwright: every route, phone layout, interactions)
```

To add a level, add an entry to `LEVELS` in `src/levels.js`. To add a scenario, add an entry to
`SCENARIO_DEFS`. To add a question type, add a generator to `GENERATORS` in
`src/quantGenerators.js`. The tests check every generator's answer against the engine.

## Running the tests

```sh
npm install          # Playwright 1.63.0, pinned like the astronomy repo
npm test
```

If the browser tests print `⚠ BROWSER TESTS SKIPPED`, set `PLAYWRIGHT_CHROMIUM_PATH` to an
installed Chromium.

## Publishing on GitHub Pages

Push the folder to a repository, then go to Settings → Pages and deploy from the `main` branch,
root folder. No build step is needed.

## Content status

The scenario stories and misconception wording are a first draft, to be checked by the teacher.
