# QA checklist

## Automated (`npm run check`)
- Model tests pass.
- No JavaScript errors, in light and dark, at desktop and 400px width.
- Every tab shows its panel; no horizontal scroll at 400px.
- Page has a title and an h1; all buttons have a name; all images have alt text.

## Human (about 10 minutes)
**Physics**
- [ ] Hand-check two numbers in the app against a calculator.
- [ ] Teacher answers match what the simulation shows (they come from `data.json`).
- [ ] The systematic error can be discovered from the student's own graph.
- [ ] Nothing says repeating reduces uncertainty. Uncertainty = half the range.
**Simulation**
- [ ] Try the app cold: is it clear what to do in 10 seconds?
- [ ] Predict-first prompts do not give the answer away.
- [ ] Every calculated value has a pop-up with the working.
- [ ] Keyboard only: tab through, open and close a pop-up with Esc.
- [ ] Phone: controls reachable, text readable, no sideways scroll.
- [ ] Dark mode readable (data colours are not the only cue).
**Worksheet (open in Word, not a viewer)**
- [ ] Equations display as equations.
- [ ] No table splits awkwardly; each question's answer lines sit with its question.
- [ ] Space left for answers is about right.
- [ ] Teacher page is last and labelled.
- [ ] Prints cleanly in black and white.
**Ship**
- [ ] Landing-page card added; live URL works; worksheet links to it.
