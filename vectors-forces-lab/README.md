# Vectors and Forces Lab

Companion to the A-level consolidation sheet "Vectors and Static Forces" (tip-to-tail addition, resolving, moments). It is an explorer, not an experiment, so there is no Bench, Analyse or Improve the design structure and no uncertainty model.

## Learning goal and misconception
- Golf: velocities add as vectors. A crosswind changes the direction of the resultant, not just its size, so you must aim off. Misconception: "aim at the flag".
- Bag: a force has a turning effect that depends on the perpendicular distance from the pivot. Holding a bag out sideways needs a much larger muscle force than letting it hang.

## Model and assumptions (keep in step with model.js)
Golf in a crosswind
- Flat view from above, no air drag. The wind adds a sideways velocity w (west to east). Flag at D = 150 m. On target = within 6 m.
- Aim angle theta from the target line (negative = upwind). f = u cos(theta), s = w + u sin(theta), R = sqrt(f² + s²), alpha = atan2(s, f), miss = D s / f.
- Aiming off: sin(theta) = -w/u.

Shopping bag and shoulder
- Rigid straight arm, L = 0.65 m, angle phi from the vertical, arm weight ignored. g = 9.81 N/kg.
- W = m g, x = L sin(phi), M = W x, muscle with lever arm d: F = M / d, F / W = x / d.
- Default numbers: 4 kg, 90°, d = 4 cm gives M = 25.5 N m, F = 638 N, ratio 16.25. Illustrative, not a real shoulder.

## Variables
Golf: ball speed 30 to 70 m/s, wind 0 to 15 m/s, aim angle -40° to 40°. Bag: mass 1 to 8 kg, arm angle 0° to 90°, lever arm 2 to 8 cm.

## Prompts (THINK, in learning order)
1. Golf: aiming straight at the flag, which side does it finish and how far off?
2. Golf: find an aim angle that works (the reason is in a closed "Why does that angle work?" box).
3. Bag: hanging or held out, which is harder, and how many times the weight is the muscle force?

## Files
`index.html` + `app.js` (UI), `model.js` (physics, single source of truth), `model.test.mjs` (tests). No worksheet folder: the companion is the Word consolidation sheet.
