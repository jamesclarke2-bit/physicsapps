# Ramp Practical: design and validate

Status: BUILT. Plan approved by James; simulation, tests and worksheet follow this plan.

This merges two existing ramp experiments into one practical task: the OUP/AQA "On the move" method sheet (a from a stopwatch, a against sin θ) and James's "Verification of v² = u² + 2as" slide (v² against s at a fixed angle). It reuses the engine in `force-mass-acceleration/model.js` (hanger off, track tilted) and the shared sim code. No physics is copied: this app's `model.js` wraps `ForceModel` and adds only what the ramp needs.

## Learning goals
1. **Designing an experiment.** The student chooses what to change, measure and keep the same, the timer, the distances and the angle range, and justifies each choice with uncertainty (not with a recipe).
2. **Validation.** Misconception targeted: "validated" does not mean "the graph looks straight" or "I repeated it a lot". Validation = comparing the result with a prediction or accepted value and deciding, using the uncertainty, whether they agree. Decision rule used throughout: the accepted value lies within (result ± uncertainty). A systematic error (friction) can make a result fail however often it is repeated.
3. **Data handling.** The student sees the raw readings, the processed (manipulated) values, the raw graph (curved) and the straight-line graph, with error bars and a gradient and intercept with uncertainties.

## Task structure: one ramp, two linked stages
- **Stage A, validate s = ½at² and v² = u² + 2as.** Fixed angle, trolley released from rest (u = 0), vary the distance s. Each run records both the time t from release to the finish (stopwatch or video, the student's choice) and the speed v at the end of the ramp (light gate and card). Two validations from the same readings:
  - t² ∝ s: raw graph s against t (curve), straight line t² against s (or s against t²), through the origin, gradient 2/a (or a/2).
  - v² ∝ s: raw graph v against s (curve), straight line v² against s, through the origin, gradient 2a.
  - Each line must be straight with an intercept consistent with zero. Each gives a ± Δa, and the two values of a are compared within their uncertainties (the product of the two gradients should be 4). The timer's uncertainty decides how well t² ∝ s can be validated.
- **Stage B, validate a = g sin θ.** Fixed distance s (1.00 m by default), vary the angle, get a at each angle. Raw graph: a against θ (curve). Straight line: a against sin θ, gradient = g, intercept 0. Validation: is 9.81 m s⁻² within the gradient ± its uncertainty? Does the line pass through the origin?
- **The link (THINK prompt):** does a from Stage A equal g sin θ within its uncertainty? It does not (friction), yet Stage A is still valid because friction is constant. Stage B exposes it as a negative intercept. So "what exactly has been validated?" has a real answer.

## Apparatus (simulated)
Ramp of chosen length (1.0 to 3.0 m) tilted by a block. Trolley, no hanger. Stage A: one light gate and card at the end of the ramp. Stage B: stopwatch, video (frame by frame) or the end gate, so the choice of timer is a design decision. Angle by protractor (reading uncertainty ±0.5°) or by trigonometry (sin θ = h/ℓ, height h read with a metre rule to ±0.5 mm). The OUP point that trigonometry beats a protractor is a yes/no check and shows in the sin θ error bars.

## Model (model.js, wraps ForceModel; to be checked by tests)
- Trolley mass 0.600 kg + 10 slotted masses of 0.020 kg = 0.800 kg, no hanger. a = g (sin θ − μ cos θ), g = 9.81 m s⁻², kinetic friction μ = 0.011 (the existing value). Moves only if tan θ > 1.25 μ, so θ > about 0.8°.
- From rest: s = ½ a t², v² = 2 a s, v = a t.
- Gate speed from the card: t_card = 0.100 m / v, error the bigger of 0.2 ms and 1% of t_card, so about 1% in v and about 2% in v².
- Stopwatch ±0.07 s, video ±0.01 s with 0.02 s release/judging, all fixed amounts of time. Percentage uncertainty in a = 2 × percentage in t. Uncertainty in v² = 2 v Δv, in sin θ = cos θ Δθ (protractor) or Δh/ℓ (trigonometry).
- Anomalies: about 4% of runs (wheel catches, card misaligned, and stopwatch fumbles). The student crosses them out.

## Systematic error the student can discover
Friction: with a = g sin θ − μ g cos θ, the a against sin θ line has a negative intercept of about −μ g = −0.11 m s⁻² and the gradient stays close to g. At small angles friction is a big fraction of the slope force (μ / tan θ). Stage A is unaffected because a stays constant.

## Uncertainty (teaching rules)
- Uncertainty in a mean of random readings = half the range (floor: half the smallest division). Repeating shows the spread, exposes anomalies and gives a mean; it never makes the result more accurate and cannot remove friction.
- First estimate = the biggest single source of error. Every source is a fixed amount, so longer runs and bigger angles have smaller percentage uncertainties.
- Gradient and intercept uncertainty from the best and worst lines through the error bars (steepest and shallowest). Needs a small additive helper in `shared/` (Sim.plot already draws error bars; Sim.linfit has no uncertainty yet).

## Analyse tab (raw and manipulated data, graphs)
1. **Raw data table:** every reading as taken, crossed-out anomalies shown struck through and excluded.
2. **Processed data table:** columns in order of calculation, units in brackets, for example mean v (m s⁻¹), Δv (m s⁻¹), v² (m² s⁻²), Δ(v²) (m² s⁻²), % uncertainty. Each value opens a worked pop-up.
3. **Raw graph** (as measured, with error bars) beside the **straight-line graph**. The student chooses the axis change (Sim.axes: 1 ÷ it, squared, square root, sine). Nothing is pre-plotted straight.
4. **Validate panel:** THINK first (what should the gradient be, what should the intercept be?), then the best and worst lines, gradient ± uncertainty, intercept ± uncertainty, accepted value and a "within uncertainty?" check.

## Variables
Stage A: change s (0.4 m up to the ramp length minus 0.2 m), measure t and v, keep θ, mass, release (from rest), gate position. Stage B: change θ (about 2° to 20°), measure t or v, keep s, mass, timer.

## Targets (Improve the design, adjustable)
Percentage uncertainty in a at most 5%; timing at least 10 × the timer uncertainty (stopwatch and video); friction changes a by at most 5% (needs θ about 12.4° or more); percentage uncertainty in sin θ at most 5% (protractor needs θ about 9.9° or more, trigonometry is easily met). Longest ramp and distance: yes/no check "Should you use the longest you can?".

## Prompts, in learning order
1. THINK (Bench): what shape of graph do you expect for v against s? For a against θ?
2. What are you testing? Then technique checks and the variables table (change, measure, keep the same).
3. Collect readings (3 per setting). Cross out anomalies.
4. THINK (Analyse): which axes make it straight, and what should the gradient and intercept be?
5. Validate: is the accepted value inside your range? What does a failure tell you?
6. Improve the design: which choice limits the uncertainty, and what limits the angle?

## Worksheet (Word, A4)
Plan (variables, prediction sketch, safety), Collect (raw tables, units in brackets), Process (calculation columns), Graphs (given raw graph, blank graph for the straight line), Validate (definition, decision rule, conclusion), Evaluate (systematic error, improvements). Teacher answers on the last page from the model. Original wording; not a copy of the OUP sheet.

## Files
`index.html` + `app.js` (UI), `model.js` (wraps ForceModel), `model.test.mjs`, `worksheet/` (`./build.sh`).
