# Domestic Electricity (iGCSE lesson)

A teacher-led lesson to project and click through, with a student worksheet. It is a lesson, not a practical, so it does not use the Bench / Analyse / Improve tabs or `shared/sim.css`, and it has no uncertainty work. The page keeps its own look and is one self-contained file apart from `model.js`.

## Learning goals (Edexcel iGCSE 2.2 to 2.6)
- 2.2 How insulation, double insulation, earthing, fuses and circuit breakers protect the device or user.
- 2.3 Why a current in a resistor heats it, and where this is used at home.
- 2.4 P = I × V, and choosing a fuse.
- 2.5 E = I × V × t.
- 2.6 Mains is a.c.; a cell or battery supplies d.c.

Misconception targeted: "the fuse protects the person". The earth wire simulation shows a shock current far too small to melt the fuse.

## Stages
1 Power up (retrieval), 2 a.c. and d.c., 3 Hot wires (with the wire wool demo), 4 Fuses, 5 Pick the fuse (quiz), 6 Earth wire, 7 Double insulation (with the French plug question), 8 Wire a plug (class practical), 9 Plenary. Timings and kit are under "Lesson plan" in the page. Press T for teacher notes.

## Model and assumptions (keep in step with model.js)
- UK mains: 230 V, 50 Hz.
- Fuse choice: the lowest rating above the working current I = P ÷ V. Standard set 3 A, 5 A, 13 A; challenge set adds 1 A and 10 A.
- Every appliance current is at least 5% away from every fuse rating.
- Fuse simulation: the wire warms as the current nears the rating and melts sooner the further the current is above it. Illustrative, not a real fuse characteristic.
- Hot wires: temperature rises with current squared. The temperatures are illustrative.
- Earth wire simulation: kettle at 9 A, 13 A fuse, person at 2300 Ω so the shock current is 0.1 A. The live wire is drawn coming off the heating element, so the kettle stops heating when the fault happens.

## Files
`index.html` (lesson), `model.js` (numbers, single source of truth), `model.test.mjs` (tests), `worksheet/` (Word worksheet pipeline: `./build.sh`).
