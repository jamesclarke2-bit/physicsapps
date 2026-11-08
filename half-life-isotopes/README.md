# Half-life and Choosing Isotopes

GCSE Physics. A marked question set, a decay simulator linked to every question, and a Word worksheet generated from the same question bank.

## Learning goal and misconceptions targeted
- Use half-life to find activity, fraction left or time taken, for whole and non-whole numbers of half-lives, in any time unit.
- Know that decay is random for each nucleus but predictable for a large number (the half-life).
- Choose an isotope for a job using **both** the type of radiation and the half-life, and explain why the others fail.
- Targeted: "half-life is the time for the sample to disappear"; "a shorter half-life means less radioactive" (for the same number of nuclei it means a higher activity at the start, which then falls faster); forgetting background; using the wrong time unit.
- Teaching rules: uncertainty from repeated readings is half the range (it is not reduced by repeating); a longer measurement has a smaller percentage uncertainty because the reading error is a fixed amount.

## Model and assumptions (keep in step with model.js)
- N = N₀ (½)^(t ÷ T½), activity A = A₀ (½)^(t ÷ T½), A = λN with λ = ln 2 ÷ T½.
- Half-lives are rounded GCSE values (Tc-99m 6 h, I-123 13 h, I-131 8 d, Na-24 15 h, P-32 14 d, Co-60 5.3 y, Sr-90 29 y, Cs-137 30 y, Pu-238 88 y, Am-241 432 y, Ra-226 1600 y, C-14 5730 y, K-40 1.25 billion y, U-238 4.5 billion y, Rn-222 3.8 d, Po-210 138 d). Radiation listed is the main type only.
- 1 year = 365.25 days.
- The nuclei on screen are a small sample (100 to 1000 dots). Each nucleus is given a random decay time from an exponential distribution with mean T½ ÷ ln 2 (seeded, so the clock can be dragged back and forth). The graph scales the sample up to the starting value the student set.
- Count rate = net count rate + background. Background is constant (no random scatter) so the one systematic effect is clear.
- **Biggest source of error** in the Measure tab: the random scatter of a small sample. A halving time read from N dots left has a scatter of about T½ ÷ (ln 2 × √N).
- **Systematic error to discover:** reading half-life from the raw count rate without subtracting background. The successive halving times get longer (for the example in the app, 1.07, 1.16, 1.39 days instead of 1.00).
- Graph and clock reading uncertainty is a fixed amount in questions (for example ±1 h), so a longer time interval has a smaller percentage uncertainty.

## Variables
Change: isotope(s), starting value, quantity (activity, count rate, nuclei), background, sample size, time unit and window. Measure: time for the value to halve, three times in a row. Keep the same: the isotope while measuring.

## Targets (Choose the isotope tab)
Each job has explicit, adjustable targets: radiation required or ruled out, activity still at least X% at time T, and (for some jobs) activity at most Y% at a later time. The student changes the targets and sees which isotopes pass, with the working in a pop-up.

## Question bank (22 questions, 124 marks; one source in questions.js)
| Part | Level | Content |
| --- | --- | --- |
| A | Easy | 1 define half-life and random decay; 2 complete a halving table (Tc-99m); 3 read a half-life from a graph |
| B | Medium | 4 fraction left (Sr-90); 5 unit conversion (Na-24); 6 background and half-life; 7 choose the smoke-alarm isotope |
| C | Hard | 8 medical tracer (choose, explain, calculate); 9 non-whole half-lives (Co-60); 10 storing waste until 1/1000 left; 11 dating |
| D | Very hard | 12 mixture of two isotopes; 13 same number of nuclei, different half-lives; 14 measure a half-life and give the uncertainty (half the range); 15 reading uncertainty and longer measurements; 16 background as a systematic error |

Marking: numeric answers are marked with a tolerance and any equivalent unit, with follow-through from the student's earlier steps; written answers are marked against key ideas (the student can claim a point made in different words, which is flagged); isotope choices are marked from the table. Progress is saved in the browser (localStorage).

## Files
`index.html` + `app.js` (simulator and chooser), `quiz.js` (questions and marking UI), `model.js` (physics), `questions.js` (question bank and marking), `model.test.mjs`, `worksheet/` (`./build.sh`).


## Added: Geiger counter bench and Part E (Q17 to Q19, 30 marks)
Physics (all in `model.js`): a Geiger counter records random (Poisson) counts. True rate = background, plus the net source rate (which halves every half-life) only when the source is next to the tube. Background is a fixed, hidden rate (30 counts/min in Q17, 50 in Q19).
- **Bench tab:** the picture shows the tube, counter, source on a stand 5 cm away, and the lead-lined box on the shelf. Students move the source away to measure background, choose the counting time (30 s to 5 min) and the day, and press Start count. Readings are logged (cross out an anomaly), with mean, half range and percentage uncertainty (pop-up working). Readings above 100 counts/min with the source "away" give a warning. The "net count rate" tick box is off by default so students do the subtraction themselves.
- **Q17:** measure background (source starts in place, so they must put it away), mean/half range/percentage from their own readings, why remove the source, why repeat. "Repeating reduces the uncertainty" earns nothing and is corrected (repeating shows the spread, finds anomalies, gives a mean, cannot fix a faulty method).
- **Q18:** 1-minute against 5-minute background counts (given data): longer counts give a smaller percentage uncertainty; multiple choice on why we repeat.
- **Q19 (hardest):** background first, then source Z on day 0 and day 8, net rates, half-life (chain marked with follow-through from the student's own readings), half-life if background is forgotten (too long), when the net rate falls to background, and why repeating does not fix a forgotten background.
Tests cover Poisson counts, longer counts, background subtraction, why-repeat marking and the Part E chains.


## Added: full decay curves, distance and absorbers (Q20 to Q22, 24 marks)
Model: net rate = share x net0 x (5/d)^2 x transmission x (1/2)^(t/T), summed over the radiations a source emits. Alpha reaches no further than about 7 cm, beta about 1 m. Paper stops alpha (beta 90% passes); 3 mm aluminium stops beta (3% passes) and passes 90% of gamma; 10 mm lead stops alpha and beta and passes 10% of gamma. Sources: Z beta (2 days, the half-life source), A alpha, B beta, C gamma, D beta and gamma. Background is never shielded or changed by distance.
- **Bench tab now has:** source choice, day, distance (2 to 40 cm), absorber, counting time, and one-click series ("Reading every day", "at every distance", "with each absorber"). The graph shows decay with time, distance or absorber, as raw readings, and (once the student has at least three background counts) as net count rate. "Show the true curves" is off by default.
- **Q20:** a whole decay curve. The raw curve flattens at the background, the net curve keeps halving. Half-life from the net rates, from the raw readings (too long), and the percentage error.
- **Q21:** distance: net x d^2 is constant (inverse square law), and why background must be subtracted first.
- **Q22:** absorbers: decide that source D gives out beta and gamma.
