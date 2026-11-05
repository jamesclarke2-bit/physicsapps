# Force, Mass and Acceleration

## Learning goal
Substantiate F = ma and the SUVAT equations of motion from the student's own measurements, and practise experimental technique: keeping total mass constant, compensating for friction, choosing a timer, and quoting uncertainty as half the range.

## Apparatus (simulated)
A 2.0 m track with a trolley pulled by a hanger and slotted masses over a pulley at one end. The track can be tilted (pulley end lower). Timers: hand stopwatch, video (frame by frame), two light gates with an interrupt card.

## Investigations
1. **a against F, total mass constant**: move slotted masses from the trolley to the hanger. Prediction: straight line, gradient 1/m.
2. **a against 1/m, force constant**: fixed hanger, add 0.1 kg blocks to the trolley.
3. **SUVAT**: vary the finish distance s from rest (s against t^2), and use two light gates to get u, v, t and d (v^2 - u^2 against d), and test all four equations on one run.
4. **Ramp** (extension): remove the hanger, tilt the track; acceleration is independent of mass.

## Model (single source of truth: model.js)
- Trolley mass Mt = 0.600 kg + 0.020 kg per slotted mass on the trolley (10 slotted masses in total) + 0.100 kg per extra block.
- Hanger mass mh = 0.010 kg + 0.020 kg per slotted mass on the hanger. Hanger weight F = mh g (this is what students call F).
- Accelerating mass Msys = Mt + mh + 0.005 kg (effective mass of the pulley, ignored by students).
- Track tilted by theta with the pulley end lower: net force = mh g + Mt g sin(theta) - mu Mt g cos(theta), kinetic friction mu = 0.011.
- The trolley does not move unless mh g + Mt g (sin(theta) - 1.25 mu cos(theta)) > 0.
- a = net / Msys. Constant acceleration from rest: s = (1/2) a t^2, v = a t.
- Hanger removed: a = g (sin(theta) - mu cos(theta)).
- Friction is compensated when tan(theta) = mu, about 0.63 degrees.

## Systematic errors students can find
- Friction: negative a-intercept (or F-axis intercept) on every graph. Tilting the track to about 0.6 degrees removes it.
- Not keeping total mass constant: a against F curves.
- Pulley inertia: gradient about 0.6% low (small; extension question).

## Uncertainty (teaching rules)
- Each timing has random error with standard deviation equal to the biggest single source: timer (stopwatch 0.07 s, video 0.01 s, gates 0.003 s), release/judging (2% of the time for hand and video; none for gates), or resolution/2.
- Light-gate speeds come from card time t = 0.100 m / v; error is the bigger of 0.001 s and 1% of the card time.
- Uncertainty in a mean = half the range. a = 2s/t^2 so percentage uncertainty in a is twice that in t. For (v^2 - u^2) add absolute uncertainties.
- Anomalies: 4% of runs (string snags, trolley sticks), plus a stopwatch fumble 6%.

## Targets (Improve the design)
Percentage uncertainty in a at most 5% (adjustable); timing at least 10 x timer uncertainty; friction effect on a at most 5%.
