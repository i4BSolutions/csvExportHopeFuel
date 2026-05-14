---
status: resolved
trigger: "Country 'Ireland' not found; used 'ZZ' is still showing"
created: 2026-05-14T00:00:00Z
updated: 2026-05-14T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED. The user observed the bug on the GitHub Pages-hosted deployment, not on a local runtime. The `gh-pages` branch was pinned to a pre-fix bundle (`assets/index-DTmLPwtf.js`) built from a commit predating even the 2026-02-22 first fix (80148d4) — proven because the bundle contained the wording "not found; used 'ZZ'" (the older warning phrasing) and lacked the Ireland → IE mapping entirely. The source on `main` (HEAD 45fe8da) was correct; the two prior fix commits never reached production because `npm run deploy` was never run after either fix.
test: Build and publish HEAD to `gh-pages` via `npm run deploy`, then verify the new bundle on `origin/gh-pages` contains `Ireland:"IE"` and uses the current warning wording "unmapped; set 'ZZ'".
expecting: `origin/gh-pages:assets/index-CsFnQ6Uo.js` contains `Ireland:"IE"` and `unmapped; set 'ZZ'`; the old `index-DTmLPwtf.js` is gone.
next_action: complete

## Symptoms

expected: On the GitHub Pages site, uploading a CSV with "Ireland" in the Country column should produce country code "IE" with no warning.
actual: The site emitted `Country 'Ireland' not found; used 'ZZ'` and exported "ZZ".
errors: None — silent miscoding (warning only).
reproduction: Open the GitHub Pages-hosted app, upload a CSV containing "Ireland".
started: User re-reported on 2026-05-14, observed on the hosted (GitHub Pages) site.

## Eliminated

- hypothesis: Ireland missing from COUNTRY_MAP in src/App.tsx
  reason: src/App.tsx:59 has `{ Ireland: "IE", Myanmar: "MM", Thailand: "TH" }` (since commit 80148d4).

- hypothesis: Stale .js siblings shadowing .tsx (the 2026-05-09 cause)
  reason: `find src -name '*.js'` returns nothing; `tsconfig.json:18` and `tsconfig.app.json:14` both set `"noEmit": true`; commit 45fe8da is on HEAD.

- hypothesis: Local `dist/` is stale on this commit
  reason: `dist/assets/index-CsFnQ6Uo.js` (built 2026-05-09 10:01, post-fix) contains `Ireland:"IE"` and uses the "unmapped; set" wording. Local build would not produce "not found; used".

- hypothesis: The reported warning string is emitted by current source on this commit
  reason: `grep -rn "not found" src/ dist/` returns no matches at HEAD. The phrase exists only in the old gh-pages bundle.

## Evidence

- timestamp: 2026-05-14T00:00:00Z
  checked: `git branch -a` and `git remote -v`
  found: Remote `origin` = https://github.com/i4BSolutions/csvExportHopeFuel.git; `origin/gh-pages` exists.
  implication: The site is hosted on GitHub Pages, deployed from the `gh-pages` branch.

- timestamp: 2026-05-14T00:00:00Z
  checked: `git ls-tree origin/gh-pages assets/` (pre-fix)
  found: `assets/index-DTmLPwtf.js` (a different filename from the local `dist/` build `index-CsFnQ6Uo.js`).
  implication: The deployed bundle is a different artifact than the post-fix local build — strong signal the deploy never happened after either fix commit.

- timestamp: 2026-05-14T00:00:00Z
  checked: `git show origin/gh-pages:assets/index-DTmLPwtf.js | grep "not found; used 'ZZ'"`
  found: `not found; used 'ZZ'` present.
  implication: Exact match for the user's reported wording. The deployed bundle predates not only commit 45fe8da but also commit 80148d4 (since the warning wording in source uses "unmapped; set" — the "not found; used" phrasing is from an earlier code state).

- timestamp: 2026-05-14T00:00:00Z
  checked: `git show origin/gh-pages:assets/index-DTmLPwtf.js | grep -o "Ireland:\"[A-Z]\\{2\\}\""`
  found: No matches.
  implication: The deployed bundle had no Ireland mapping — Ireland fell through to the default "ZZ" branch.

- timestamp: 2026-05-14T00:00:00Z
  checked: `npm run deploy` (after installing the missing `gh-pages` devDependency)
  found: Initial deploy failed with `sh: 1: gh-pages: not found` — the `deploy` script in `package.json` referenced a CLI that was not in `devDependencies`. After `npm install --save-dev gh-pages`, `npm run deploy` published `dist/` to `origin/gh-pages` (commit 5cfd922 → abee713).
  implication: A secondary defect: the deploy pipeline was never functional from a clean checkout. This is part of the reason prior fixes never reached production — anyone running `npm run deploy` would have hit `gh-pages: not found`.

- timestamp: 2026-05-14T00:00:00Z
  checked: `git fetch origin gh-pages` + `git ls-tree origin/gh-pages assets/` (post-deploy)
  found: `assets/index-CsFnQ6Uo.js` (replacing `index-DTmLPwtf.js`).
  implication: The deployed bundle is now byte-identical to the local post-fix build.

- timestamp: 2026-05-14T00:00:00Z
  checked: `git show origin/gh-pages:assets/index-CsFnQ6Uo.js | grep -o -E "Ireland:\"IE\"|unmapped; set 'ZZ'|not found; used 'ZZ'"`
  found: `Ireland:"IE"` and `unmapped; set 'ZZ'` present; `not found; used 'ZZ'` absent.
  implication: Deployment carries the fix; old warning wording is gone.

## Resolution

root_cause: Stale deployment. The two prior fixes (80148d4 and 45fe8da) corrected the source code but were never published to the GitHub Pages site. The `gh-pages` branch continued serving an old bundle (`index-DTmLPwtf.js`) that predated both fixes — it had no Ireland mapping and used the older "not found; used 'ZZ'" warning wording. A secondary defect compounded the problem: the `deploy` script in `package.json` referenced `gh-pages` CLI without listing it in `devDependencies`, so a clean checkout could not run `npm run deploy`.
fix: (a) Added `gh-pages` as a devDependency (`npm install --save-dev gh-pages`). (b) Ran `npm run deploy`, which built `dist/` from HEAD (45fe8da) and published it to `origin/gh-pages`. The Pages site now serves `assets/index-CsFnQ6Uo.js` with `Ireland:"IE"` mapped.
verification: 1) `git fetch origin gh-pages` followed by `git ls-tree origin/gh-pages assets/` shows the new bundle filename matches the local build. 2) `git show origin/gh-pages:assets/index-CsFnQ6Uo.js | grep Ireland` returns `Ireland:"IE"`. 3) The old "not found; used 'ZZ'" string is no longer present in the deployed bundle. 4) The current warning wording in the deployed bundle matches HEAD source: "unmapped; set 'ZZ'".
files_changed:
  - package.json (added gh-pages to devDependencies)
  - package-lock.json (regenerated)
  - origin/gh-pages branch (publishing only — fix bundle deployed)

## Specialist Review

reviewer: session manager (inline)
result: LOOKS_GOOD
reasoning: The diagnosis is grounded in direct evidence — the deployed bundle's exact wording matches the user's report, and the deployed bundle's filename differs from the local post-fix build, conclusively isolating the failure to publishing rather than source. The fix is minimally invasive: install the missing CLI as a devDependency (which the `deploy` script already assumed exists) and run the documented deploy command. No source changes were needed at HEAD because the prior fixes were already correct.
follow_up_suggestions:
  - Consider a GitHub Actions workflow to auto-deploy on push to main, eliminating the manual `npm run deploy` step that has now caused this recurrence twice.
  - The `homepage` field in package.json points at the repo URL rather than the GitHub Pages site URL — informational only for Vite, but worth correcting for accuracy. Out of scope.
  - Reconciling the deployed bundle versus the source has been the underlying issue across all three Ireland/ZZ sessions. A pre-deploy smoke check (e.g. grep the new `dist/assets/*.js` for `Ireland:"IE"` before publishing) would catch a regression at the deploy step rather than at the user-report step.
