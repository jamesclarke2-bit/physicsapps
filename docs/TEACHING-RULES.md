# Teaching rules (apply to every simulation and worksheet)

These come from James's own teaching. They override defaults. If a build seems to need an exception, ask.

## Physics and uncertainty
1. **Uncertainty in a mean of random readings = half the range.** The floor is half the smallest division of the instrument.
2. **Repeating does not make a result more accurate or less uncertain.** Repeats show the spread, expose anomalies and give a mean. A faulty method (systematic error) stays wrong however often it is repeated. Never write "repeat to reduce uncertainty".
3. **First estimate of uncertainty = the biggest single source of error.** List the sources (timer/reaction, release/judgement, resolution, method). Do not combine in quadrature at this level. Build the simulation so that half the range is on average about the biggest source.
4. **Percentage uncertainty = uncertainty / value x 100.** Show the worked calculation in a pop-up.
5. **A timing should last at least 10x the timer uncertainty** (quick rule of thumb used in the "is it long enough" check).
6. Include at least one **systematic error** the student can discover from their own graph (for example an intercept that should be zero).
7. Anomalies are crossed out by the student, never silently removed.

## Simulations
- Every simulation has the same tabs where they make sense: **Bench** (run the experiment), **Graphs/Analyse** (see the data), **Improve the design** (tweak and check against explicit, variable targets).
- Targets are **explicit and adjustable** (for example "average speed at least 90% of terminal velocity").
- **Orange THINK prompts** ask for a prediction or explanation before the answer is shown. Never give the answer away in the first view.
- Every number a student might ask "where did that come from?" is a **clickable pop-up** with the worked calculation.
- Example data is preloaded and labelled, with a Clear button.
- If an app supports several investigations, the **first thing on the Bench** is the "What are you testing?" multiple choice (`Sim.experiment`), then yes/no technique checks that lock the controls that should stay the same, and a variables table (change, measure, keep the same).
- Real units, real instrument limits (stopwatch +/-0.07 s, video +/-0.01 s, gates +/-0.003 s).
- Must work at phone width, with keyboard, in light and dark, and without animation if the user prefers reduced motion.

## Worksheets (Word)
- A4. Concise, simple prompts. One instruction per prompt.
- **A-level spec style tables**: units in brackets in every table heading ("t (s)", "a (m s^-2)"), in the sim tables and the worksheets. Graph axes keep "quantity / unit". Blank cells for results, columns in the order of calculation.
- **Diagrams already drawn** (set-up, free body diagrams) and **graphs already given** where the aim is to read or interpret them; blank graph paper only where the student must plot.
- Equations are **native Word equations** (fractions, roots, sub/superscripts), not typed text.
- **Space for answers**: ruled lines sized to the expected answer.
- Prompt order follows the learning order. Orange numbered questions.
- Teacher answers on the **last page**, labelled "remove before printing". Every number there comes from the model.
- Link to the live simulation from the Design section.

## Language
- UK English. No em dashes. Short sentences. Say "terminal velocity (TV)" and "air resistance"; students have covered skydiving.

## Uncertainty in the models
- Every uncertainty source in a model is a **fixed amount** (a number of seconds, millimetres or degrees), never a percentage of the reading. A bigger measurement (longer time, longer distance, bigger angle) then has a smaller percentage uncertainty. Teach this: longer measurements are a good way to reduce percentage uncertainty.
- Angles come with a reading uncertainty too (protractor, half of 1 degree), so sin(theta) has a bigger percentage uncertainty at a small angle. Show it as error bars on the x axis.
- "Improve the design" must be rewritten for each experiment: only the controls that matter for that investigation, with checks that explain the worst case.
- Crossed-out readings must look different (strike-through, dashed) and drop out of the mean.

## Choosing the axes (default in every app)
- The Analyse tab uses `Sim.axes`: the student picks the quantity on each axis and can change it (as measured, 1 ÷ it, squared, square root, sine). Units of the gradient and intercept are worked out for them and the line quality (r²) is shown.
- Start each experiment on the raw quantities (for example a against m, or T against L). The skill is choosing the axis change that makes it straight and then interpreting the gradient, so never pre-plot the linear version.
- Give each known relationship a `known` entry (model line, extra rows such as "g = 4π² ÷ gradient", and a question). Unknown combinations fall back to a generic prompt about units.
- Animated rigs need a Reset button, real accelerating motion (not a jump), a strobe, and selectable force, acceleration and velocity vectors.

## Model lines
- A dashed model line always states the assumption it makes in the legend and checkbox (for example "the case always falls at terminal velocity"), never just "the physics model". Where the data leaves the line, the assumption has failed and the investigation is about why (method, drop height, mass range). Say how far the data is from it.

## Apparatus size
- Where the length of the run matters (track, drop height), let the student choose it (Bench and Improve the design) and add a yes/no check "Should you use the longest you can?". A longer run gives a longer timing and a smaller percentage uncertainty; the limit is lab space, not the model.
