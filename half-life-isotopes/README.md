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

## Question bank (16 questions, 70 marks; one source in questions.js)
| Part | Level | Content |
| --- | --- | --- |
| A | Easy | 1 define half-life and random decay; 2 complete a halving table (Tc-99m); 3 read a half-life from a graph |
| B | Medium | 4 fraction left (Sr-90); 5 unit conversion (Na-24); 6 background and half-life; 7 choose the smoke-alarm isotope |
| C | Hard | 8 medical tracer (choose, explain, calculate); 9 non-whole half-lives (Co-60); 10 storing waste until 1/1000 left; 11 dating |
| D | Very hard | 12 mixture of two isotopes; 13 same number of nuclei, different half-lives; 14 measure a half-life and give the uncertainty (half the range); 15 reading uncertainty and longer measurements; 16 background as a systematic error |

Marking: numeric answers are marked with a tolerance and any equivalent unit, with follow-through from the student's earlier steps; written answers are marked against key ideas (the student can claim a point made in different words, which is flagged); isotope choices are marked from the table. Progress is saved in the browser (localStorage).

## Files
`index.html` + `app.js` (simulator and chooser), `quiz.js` (questions and marking UI), `model.js` (physics), `questions.js` (question bank and marking), `model.test.mjs`, `worksheet/` (`./build.sh`).
