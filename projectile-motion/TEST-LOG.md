# Projectile Motion Explorer: acceptance test log

Run: `node projectile-motion/acceptance.mjs` on 2026-11-13. Chromium via Playwright, served locally. Result: **all passed**.

## 1. Simulated flight time, max height and range match the closed-form equations within 0.1% (25 random inputs): PASS

- Numerical simulation: fixed step 0.001 s, apex and landing refined by bisection (model.simulate). Inputs drawn at random: u 5 to 100 m s⁻¹, θ 5 to 90°, h0 −20 to 100 m, g 1 to 20 m s⁻².
- model.test.mjs: 11 passed, 0 failed.

| # | u (m s⁻¹) | θ (°) | h0 (m) | g (m s⁻²) | T closed (s) | T sim (s) | T error (%) | H (m) | H error (%) | R (m) | R error (%) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 48.26 | 31.2 | 59.34 | 12.75 | 5.5893 | 5.5893 | 9.2e-12 | 83.882 | 3.9e-12 | 230.688 | 1.3e-11 |
| 2 | 19.47 | 23.9 | 61.94 | 16.23 | 3.2906 | 3.2906 | 9.9e-12 | 63.853 | 4.5e-13 | 58.583 | 6.7e-12 |
| 3 | 32.88 | 8.6 | -12.01 | 12.77 | 0.7723 | 0.7723 | 1.7e-12 | -11.057 | 3.2e-13 | 25.105 | 2.3e-12 |
| 4 | 41.94 | 14.7 | 1.54 | 7.29 | 3.0637 | 3.0637 | 8.8e-12 | 9.340 | 2.5e-12 | 124.259 | 5.0e-12 |
| 5 | 43.64 | 83.3 | 47.81 | 1.03 | 85.0008 | 85.0008 | 1.0e-10 | 956.912 | 1.0e-10 | 434.443 | 9.2e-11 |
| 6 | 24.36 | 28.5 | 73.37 | 19.11 | 3.4440 | 3.4440 | 5.7e-12 | 76.894 | 3.0e-12 | 73.764 | 6.0e-12 |
| 7 | 94.51 | 70.0 | 13.42 | 6.21 | 28.7695 | 28.7695 | 5.2e-12 | 648.990 | 7.1e-11 | 928.234 | 1.2e-11 |
| 8 | 44.33 | 29.4 | 59.65 | 17.01 | 4.2193 | 4.2193 | 6.8e-12 | 73.549 | 5.2e-13 | 163.019 | 2.5e-12 |
| 9 | 33.61 | 83.1 | -10.35 | 1.78 | 37.2786 | 37.2786 | 3.3e-11 | 303.235 | 2.4e-11 | 150.870 | 3.6e-11 |
| 10 | 36.86 | 70.7 | 69.03 | 8.50 | 9.8352 | 9.8352 | 1.2e-11 | 140.231 | 1.8e-11 | 119.613 | 1.5e-11 |
| 11 | 96.90 | 62.5 | 55.50 | 7.94 | 22.2854 | 22.2854 | 4.7e-11 | 520.866 | 4.1e-11 | 997.101 | 5.6e-11 |
| 12 | 7.96 | 89.4 | 1.88 | 19.37 | 1.0132 | 1.0132 | 8.5e-13 | 3.513 | 1.5e-12 | 0.084 | 4.4e-13 |
| 13 | 83.94 | 28.3 | 39.12 | 4.37 | 19.1566 | 19.1566 | 1.6e-12 | 220.542 | 6.9e-12 | 1415.600 | 4.7e-11 |
| 14 | 97.75 | 56.0 | 84.37 | 15.59 | 11.3537 | 11.3537 | 3.6e-12 | 295.105 | 7.4e-12 | 620.288 | 1.1e-11 |
| 15 | 61.93 | 44.3 | 40.23 | 16.00 | 6.2124 | 6.2124 | 5.7e-12 | 98.596 | 2.1e-12 | 275.585 | 8.3e-12 |
| 16 | 77.93 | 54.0 | 60.79 | 19.39 | 7.3528 | 7.3528 | 1.0e-11 | 163.221 | 2.2e-12 | 337.003 | 4.6e-12 |
| 17 | 40.47 | 6.1 | 1.44 | 2.52 | 3.7299 | 3.7299 | 9.6e-12 | 5.127 | 3.7e-12 | 150.102 | 9.5e-13 |
| 18 | 95.41 | 83.8 | 0.84 | 4.24 | 44.7796 | 44.7796 | 2.4e-11 | 1062.506 | 1.1e-10 | 462.261 | 1.0e-10 |
| 19 | 51.07 | 55.0 | 14.59 | 19.01 | 4.7277 | 4.7277 | 1.9e-12 | 60.665 | 3.5e-12 | 138.341 | 2.0e-12 |
| 20 | 90.41 | 6.4 | 96.22 | 12.77 | 4.7442 | 4.7442 | 5.2e-12 | 100.136 | 5.2e-12 | 426.292 | 1.6e-12 |
| 21 | 89.06 | 24.9 | 51.78 | 11.49 | 7.6974 | 7.6974 | 8.6e-12 | 112.929 | 8.3e-12 | 621.910 | 1.4e-11 |
| 22 | 6.86 | 82.4 | 83.88 | 19.31 | 3.3209 | 3.3209 | 2.5e-12 | 85.080 | 1.4e-12 | 2.997 | 8.9e-12 |
| 23 | 80.24 | 7.2 | 94.39 | 18.78 | 3.7484 | 3.7484 | 5.9e-12 | 97.062 | 2.2e-12 | 298.404 | 2.4e-12 |
| 24 | 50.19 | 44.2 | -19.89 | 5.61 | 11.8815 | 11.8815 | 4.1e-12 | 89.295 | 9.9e-12 | 427.459 | 1.2e-11 |
| 25 | 83.68 | 82.8 | 46.83 | 4.66 | 36.1857 | 36.1857 | 1.2e-11 | 786.311 | 2.7e-11 | 378.974 | 6.7e-11 |

## 2. The equation substitution text matches the live values: PASS

- 20 states checked (4 launches × 5 times). For each: the t, g and result in the y substitution equal the t readout, the g input and the y readout; the x, v_y and |v| results equal their readouts; redoing the arithmetic from the shown numbers gives the shown result to within rounding. Middle-of-flight examples:
- ok  u=20, θ=45°, h0=0, g=9.81, t=1.44 s: "y = 0.00 + (14.14 × 1.44) − 0.5 × 9.81 × (1.442) = 10.19 m" | readout y = 10.19 m; "vy = 14.14 − (9.81 × 1.44) = 0.00 m s−1" | readout vy = 0.00 m s−1
- ok  u=18, θ=65°, h0=12.5, g=9.81, t=1.98 s: "y = 12.50 + (16.31 × 1.98) − 0.5 × 9.81 × (1.982) = 25.56 m" | readout y = 25.56 m; "vy = 16.31 − (9.81 × 1.98) = −3.15 m s−1" | readout vy = −3.15 m s−1
- ok  u=35, θ=30°, h0=-10, g=4.2, t=3.86 s: "y = (−10.00) + (17.50 × 3.86) − 0.5 × 4.20 × (3.862) = 26.26 m" | readout y = 26.26 m; "vy = 17.50 − (4.20 × 3.86) = 1.30 m s−1" | readout vy = 1.30 m s−1
- ok  u=15, θ=0°, h0=45, g=9.81, t=1.51 s: "y = 45.00 + (0.00 × 1.51) − 0.5 × 9.81 × (1.512) = 33.75 m" | readout y = 33.75 m; "vy = 0.00 − (9.81 × 1.51) = −14.86 m s−1" | readout vy = −14.86 m s−1

## 3. Panel 2 velocity is constant and Panel 3 acceleration is constant to display precision: PASS

- u=20, θ=45°, h0=0, g=9.81, 25 samples while playing: Panel 2 v_x values {14.14 m s−1}, a_x {0.00 m s−2}; Panel 3 a_y {−9.81 m s−2}; Panel 3 v_y took 25 different values (it should change).
- u=30, θ=20°, h0=40, g=3.7, 25 samples while playing: Panel 2 v_x values {28.19 m s−1}, a_x {0.00 m s−2}; Panel 3 a_y {−3.70 m s−2}; Panel 3 v_y took 25 different values (it should change).

## 4. Every table heading uses brackets, e.g. t (s). No formula triangles anywhere: PASS

- Table headings found: "Point", "t (s)", "x (m)", "y (m)", "vx (m s−1)", "vy (m s−1)", "|v| (m s−1)". Every heading over a column of numbers has the form "quantity (unit)"; none uses "quantity / unit". 
- Search for "triangle" in index.html, app.js, model.js, equations.js, questions.js, README.md and in the rendered page text: none. (V = IR does not appear in this app; no formula triangle anywhere.)
- Axis labels also use brackets, to match the tables: "horizontal distance, x (m)", "height, y (m)", "x (m)", "t (s)", "vx​ (m s⁻¹)", "ax​ (m s⁻²)", "y (m)", "vy​ (m s⁻¹)", "ay​ (m s⁻²)". None uses "quantity / unit".

## 5. Every number shown has units: PASS

- Live readouts: 7 values, all with units (e.g. 1.60 s; 14.40 m; 17.38 m)
- Panel 2 and 3 readouts: 6 values, all with units (e.g. 14.40 m; 9.00 m s−1; 0.00 m s−2)
- Computed values (Graphs): 4 values, all with units (e.g. 17.39 m; 1.59 s; 3.47 s)
- Equation results: 13 values, all with units (e.g. 9.00 m s−1; 14.40 m; 9.00 m s−1)
- Equation substitutions: 13, every one ends in a value with its unit.
- Charts and scenes with numbered axes: 8; each has an axis label with its unit in brackets ("… (unit)"). 
- Question set-up line: "Set-up loaded: u = 20.00 m s⁻¹, θ = 30°, h₀ = 45.00 m, g = 9.81 m s⁻²" (every number has a unit)
- Key-points table: numbers carry their unit in the column heading: Point | t (s) | x (m) | y (m) | vx (m s−1) | vy (m s−1) | |v| (m s−1).

## 6. Each question loads the correct setup, and the simulator stays visible during questions: PASS

- 1920×1080: 12/12 questions loaded the right u, θ, h0 and g into the simulator and its inputs, with the simulator on screen beside the question. Prediction: Play/Step/inputs locked before answering (true), keyboard step blocked (t stayed 0 s), unlocked after (true).
- 1280×800: 12/12 questions loaded the right u, θ, h0 and g into the simulator and its inputs, with the simulator on screen beside the question. Prediction: Play/Step/inputs locked before answering (true), keyboard step blocked (t stayed 0 s), unlocked after (true).
- 400×800: 12/12 questions loaded the right u, θ, h0 and g into the simulator and its inputs, with the simulator on screen beside the question. Prediction: Play/Step/inputs locked before answering (true), keyboard step blocked (t stayed 0 s), unlocked after (true).

## 7. Keyboard operable; no colour-only encoding: PASS

- Tab order reaches presentation mode, theme, Play, Pause, Reset, Step forward, the three speeds, the tabs, every slider and number box and the colour picker. 
- Enter on Play ran the clock (t = 0.40 s); R reset it (0 s); S stepped one fixed step (0.10 s); arrow key on the angle slider gave 46°; arrow keys move between tabs (now t-independent).
- Keyboard-only question: wrong answer gave "Not yet" with scaffold step 1 and no answer (true); right answer marked correct; worked solution opened (true). Pop-ups close with Esc (shared Sim.pop).
- Vectors on the stage: v: label "v", line solid, head filled; vx: label "vx​", line 6 4, head filled; vy: label "vy​", line 1.5 3.5, head filled; a: label "a", line 7 3 1.5 3, head filled. Four different line patterns and a text label on each, so red (v_y) and green (a) differ without colour.
- Readouts carry a written symbol and name as well as a colour dot: t time, x horizontal displacement, y height, ux horizontal velocity, vy vertical velocity, |v| speed, ay acceleration. Question status in the stepper is in each button's name (and a ✓ mark): New, Correct. Correct/incorrect feedback uses ✓/✗ with the words "Correct"/"Not yet".

## +. Extra: animated solution links motion, equation, graph and answer: PASS

- Step-by-step: Step 2 of 3 (2 equation highlighted, 3 dimmed, 4 readouts dimmed); Step 3 of 3 (1 equation highlighted, 4 dimmed, 5 readouts dimmed). Back returned to "Step 2 of 3".
- Animated solution (Q2.1) played the motion to launch and landing, stopped at each, and ended on the answer with its substitution (true). Clock ended at T = 3.029 s. Dark mode rendered without errors.
