# Pendulum Timing (also the template)

This folder is both a working app and the starting point for every new one. Copy it with `bash tools/new-app.sh`.

## Learning goal
Show that T² is proportional to L, find g from the gradient, and practise uncertainty (half the range, biggest source of error) and spotting a systematic error.

## Model and assumptions (keep in step with model.js)
- T = 2π√(L/g) x (1 + θ²/16 + 11θ⁴/3072), g = 9.81 m s⁻².
- A timing of N swings has random error with standard deviation equal to the biggest single source: timer (stopwatch 0.07 s, video 0.01 s, light gate 0.003 s), release and judging (1% of the time), or resolution/2.
- Anomalies: miscounting by one swing (3%), stopwatch fumble (5%).
- Systematic error: measuring L to the top of the bob (radius 2.5 cm) gives a positive T²-L intercept.

## Variables
Change L (0.2 to 1.2 m), amplitude, N, timer, where L is measured to. Measure: time for N swings.

## Targets (Improve the design)
Percentage uncertainty in T at most 5%; timing at least 10x timer uncertainty; small-angle formula within 1%.

## Files
`index.html` + `app.js` (UI), `model.js` (physics, single source of truth), `model.test.mjs` (tests), `worksheet/` (Word worksheet pipeline: `./build.sh`).
