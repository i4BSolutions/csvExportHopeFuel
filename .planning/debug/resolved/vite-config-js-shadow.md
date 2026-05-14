---
status: resolved
trigger: "Vercel deploy serves white screen; console 404 on index-nSNxcAq0.css"
created: 2026-05-14T00:00:00Z
updated: 2026-05-14T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED before spawning debugger. `vite.config.js` is committed at HEAD with `base: '/csvHopeFuel'` (line 6) — a stale TypeScript-emitted sibling of `vite.config.ts`. The 2026-05-09 structural fix (commit 45fe8da) added `noEmit: true` to `tsconfig.json` and `tsconfig.app.json` but NOT to `tsconfig.node.json`, which is the project that `include`s `vite.config.ts` (it has `composite: true`, no `noEmit`). `tsc -b` therefore continues to emit `vite.config.js` and `vite.config.d.ts`. Vite's config-file resolution loads `vite.config.js` (it exists on disk first, and the file is what `git checkout` of HEAD produces on Vercel's fresh build). On Vercel's `npm run build` (`tsc -b && vite build`), the incremental tsbuildinfo plus the committed-state file means Vite ends up loading the bad base path, producing `dist/index.html` references to `/csvHopeFuel/assets/...` instead of `/assets/...`. At Vercel root, those URLs 404.
test: Add `emitDeclarationOnly: true` to `tsconfig.node.json` (composite stays for the root project reference to work), delete the committed `vite.config.js` and `vite.config.d.ts`, gitignore those plus `*.tsbuildinfo`, rebuild, verify `dist/index.html` paths are root-relative and `vite.config.js` doesn't reappear.
expecting: After `npm run build`, no `vite.config.js` is emitted; `dist/index.html` references `/assets/index-*.js` and `/assets/index-*.css`.
next_action: apply fix

## Symptoms

expected: Vercel-deployed site loads CSS/JS from /assets/index-*.css and /assets/index-*.js.
actual: White screen; console reports `index-nSNxcAq0.css:1 Failed to load resource: the server responded with a status of 404` (and same for the JS bundle). HTML is loading; assets at the requested path are not.
errors: HTTP 404 from Vercel CDN for the asset URLs.
reproduction: Open the Vercel deployment URL after commit 7776411 was pushed.
started: After the deploy from commit 7776411 (the "set Vite base to root" fix) — the source change did not actually take effect on Vercel because `vite.config.js` shadowed the .ts source during the build.

## Eliminated

- hypothesis: vite.config.ts on main still has the bad base
  reason: `grep -n base vite.config.ts` returns nothing — base was removed in commit 7776411.

- hypothesis: dist/index.html (the locally built artifact) has the bad path
  reason: `grep -o "/assets/index\|/csvHopeFuel" dist/index.html` returns `/assets/index` (root-relative). Local build is correct because `tsc -b` regenerated `vite.config.js` to match the source during my local build.

- hypothesis: Vercel hasn't rebuilt yet
  reason: Direct file evidence in the working tree shows `vite.config.js` line 6 = `base: '/csvHopeFuel',` — this file is committed on `main`. Even when Vercel rebuilds, this committed-state file (or its incremental-emitted version) feeds Vite. The bug is structural, not timing.

## Evidence

- timestamp: 2026-05-14T00:00:00Z
  checked: `grep -n "/csvHopeFuel\|base:" vite.config.ts vite.config.js`
  found: vite.config.js:6 contains `base: '/csvHopeFuel', // <- important for GitHub Pages`. vite.config.ts has no match.
  implication: Confirmed shadowing — the .js sibling still has the bad value while .ts has been fixed.

- timestamp: 2026-05-14T00:00:00Z
  checked: tsconfig.node.json
  found: `{ "compilerOptions": { "composite": true, "module": "ESNext", "moduleResolution": "Bundler", "types": ["node"] }, "include": ["vite.config.ts"] }` — composite is true, no noEmit.
  implication: This project participates in `tsc -b` from root tsconfig.json's references, and emits .js/.d.ts because composite requires emit. The prior 2026-05-09 fix missed this config.

- timestamp: 2026-05-14T00:00:00Z
  checked: root tsconfig.json
  found: `references: [{ path: "./tsconfig.node.json" }]` and `compilerOptions.noEmit: true`.
  implication: The root project respects noEmit. The referenced tsconfig.node.json project does not — and produces the stale .js.

- timestamp: 2026-05-14T00:00:00Z
  checked: `ls -la vite.config.* tsconfig*.tsbuildinfo`
  found: vite.config.d.ts, vite.config.js (both committed to repo), plus three tsbuildinfo files at the project root.
  implication: Both stale outputs from tsc -b are tracked. They're the same pattern as the App.js bug from the prior session.

## Resolution

root_cause: The 2026-05-09 structural fix (commit 45fe8da) added `noEmit: true` to `tsconfig.json` and `tsconfig.app.json` to stop `tsc -b` from emitting .js siblings into `src/`. But it missed `tsconfig.node.json` — the project that includes `vite.config.ts`. That project has `composite: true` and no `noEmit`, so `tsc -b` continued emitting `vite.config.js` and `vite.config.d.ts` at the project root, and those files were committed. After commit 7776411 removed `base: '/csvHopeFuel'` from `vite.config.ts`, the committed `vite.config.js` still contained the old base value, and Vite loaded it at build time, producing `dist/index.html` with `/csvHopeFuel/assets/*` references. On Vercel (serving from root), those URLs 404'd, manifesting as a white screen.
fix: (a) Added `"emitDeclarationOnly": true` to `tsconfig.node.json` — keeps `composite: true` so the root project reference works, but suppresses .js emission. (b) Deleted the tracked stale outputs: `vite.config.js`, `vite.config.d.ts`, `tsconfig.tsbuildinfo`, `tsconfig.app.tsbuildinfo`, `tsconfig.node.tsbuildinfo`. (c) Added `vite.config.js`, `vite.config.d.ts`, and `*.tsbuildinfo` to `.gitignore` so they can never be committed again.
verification: 1) `npm run build` succeeds. 2) After build, `ls vite.config.*` shows only `vite.config.ts` and the regenerated `vite.config.d.ts` (gitignored) — no `vite.config.js`. 3) `grep -o "/assets/index\|/csvHopeFuel" dist/index.html` returns only `/assets/index` (no `/csvHopeFuel` prefix). 4) `git status` shows the regenerated `vite.config.d.ts` and tsbuildinfo files do NOT appear — confirming `.gitignore` is effective.
files_changed:
  - tsconfig.node.json (added emitDeclarationOnly)
  - .gitignore (added vite.config.js, vite.config.d.ts, *.tsbuildinfo)
  - vite.config.js (deleted, untracked)
  - vite.config.d.ts (deleted, untracked)
  - tsconfig.tsbuildinfo (deleted, untracked)
  - tsconfig.app.tsbuildinfo (deleted, untracked)
  - tsconfig.node.tsbuildinfo (deleted, untracked)

## Specialist Review

reviewer: session manager (inline)
result: LOOKS_GOOD
reasoning: The fix completes the structural work the 2026-05-09 session began: `tsc -b` no longer emits executable .js siblings anywhere in the project. The `emitDeclarationOnly` choice preserves the root `references` to `tsconfig.node.json` (which would have broken if I'd removed `composite`) while eliminating the shadowing risk. Gitignoring the byproducts prevents the failure mode where someone runs the build locally, accidentally `git add .`'s the generated files, and reintroduces the bug.
follow_up_suggestions:
  - The orphaned `tsconfig.app.json` (still not referenced from anywhere) was flagged in the prior session. Still out of scope.
  - `homepage` in package.json (`https://github.com/geeksquadstudio/csvHopeFuel.git`) — stale, unused. Out of scope.
