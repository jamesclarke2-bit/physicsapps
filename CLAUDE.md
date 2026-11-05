# Instructions for Claude working in this repo

This repo holds James Clarke's physics apps (GitHub Pages, one folder per app) and matching Word worksheets.

1. **Read first:** `docs/TEACHING-RULES.md` (these override defaults) and `docs/BUILD-RECIPE.md` (the process).
2. **New app:** `bash tools/new-app.sh <folder> "Title" "card text"`, then follow the recipe. Agree the physics and assumptions with James before coding.
3. **One source of truth:** physics lives only in `<app>/model.js`. The app, worksheet figures, teacher answers and tests all read it.
4. **Shared code:** use `shared/sim.css` and `shared/sim.js`. Do not duplicate them into apps. Plain HTML, CSS and JavaScript, no build step.
5. **Before saying "done":** run `npm run check` and `node --test <app>/model.test.mjs`, look at `.check/*.png`, and for worksheets render to PDF and look at the pages.
6. Do not change existing apps' physics without asking. `motion-graphs/` has its own structure; leave it alone unless asked.
7. UK English, no em dashes, concise.
