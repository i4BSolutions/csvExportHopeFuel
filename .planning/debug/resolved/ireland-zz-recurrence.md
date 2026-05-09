---
status: resolved
trigger: "the country Ireland is mapping as ZZ"
created: 2026-05-09T00:00:00Z
updated: 2026-05-09T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — and deeper than first assumed. Stale TypeScript-compiled .js artifacts (10 files in total: src/App.js, src/main.js, src/lib/utils.js, and seven shadcn UI components in src/components/ui/) were committed to the repo and shadowed their .tsx siblings via Vite's default resolve.extensions order (.js wins). The recurrence enabler was that the root `tsconfig.json` (used by `tsc -b`) had no `noEmit` setting, so every build re-emits .js files into src/. After commit 80148d4 fixed the .tsx source, no rebuild-and-commit cycle followed, so the pre-fix .js sat in git and continued to be served at runtime.
test: Built the app post-fix; grepped the bundled output for "Ireland"; verified no .js files are emitted into src/ on subsequent builds.
expecting: Build succeeds with no .js sibling regeneration; bundle contains `Ireland:"IE"`; mapCountry("Ireland") resolves to "IE".
next_action: complete

## Symptoms

expected: mapCountry("Ireland") should return "IE"
actual: mapCountry("Ireland") returned "ZZ" (the unmapped fallback) — the same symptom as the 2026-02-22 session
errors: None — silent miscoding (warning emitted via CODES.WARN.COUNTRY_UNMAPPED)
reproduction: Upload a CSV containing "Ireland" in the Country column and observe the exported country code is "ZZ" with a "Country 'Ireland' unmapped; set 'ZZ'" warning.
started: After commit 80148d4 was reported as resolved on 2026-02-22; user re-reported the bug on 2026-05-09.

## Eliminated

- hypothesis: Ireland string has whitespace or casing variation in the CSV preventing match
  reason: mapCountry trims whitespace before lookup; the lookup missed because the .js file Vite served lacked the key.

- hypothesis: COUNTRY_MAP key was reverted in src/App.tsx
  reason: src/App.tsx line 59 still contained `{ Ireland: "IE", Myanmar: "MM", Thailand: "TH" }` from commit 80148d4 — the fix was intact in the .tsx source but never reached runtime.

- hypothesis: Only src/App.js needs deletion
  reason: The first deletion attempt was followed by `npm run build`, which silently re-emitted ALL of the .js siblings (10 of them, not just App.js). Investigation revealed the root tsconfig.json lacks `noEmit` while tsconfig.app.json has it. Because `tsc -b` builds the root project too, every build regenerates .js into src/ and would re-introduce the shadowing.

## Evidence

- timestamp: 2026-05-09T00:00:00Z
  checked: src/App.js line 1-2 — file header
  found: 'import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";' followed by '// File: src/App.tsx'
  implication: src/App.js is TypeScript compiler output, not hand-written. Same applies to all 10 .js siblings.

- timestamp: 2026-05-09T00:00:00Z
  checked: src/App.js line 47 (pre-fix)
  found: 'const COUNTRY_MAP = { Myanmar: "MM", Thailand: "TH" };'
  implication: Ireland was absent from the JS file at the commit on disk. Vite's default extension order made this the file that ran.

- timestamp: 2026-05-09T00:00:00Z
  checked: src/main.tsx line 3
  found: "import App from './App'"
  implication: Extensionless import; default resolve.extensions order is ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'] — .js wins over .tsx.

- timestamp: 2026-05-09T00:00:00Z
  checked: vite.config.ts
  found: No custom resolve.extensions override.
  implication: Default resolution applies — .js wins.

- timestamp: 2026-05-09T00:00:00Z
  checked: tsconfig.app.json
  found: '"noEmit": true' is set.
  implication: This config alone would prevent emission, BUT it is not directly used by `tsc -b` from the root.

- timestamp: 2026-05-09T00:00:00Z
  checked: tsconfig.json (root, pre-fix)
  found: No `noEmit` setting; references only ./tsconfig.node.json (NOT tsconfig.app.json); includes `src`.
  implication: When `npm run build` runs `tsc -b`, the root project is built with no `noEmit` and emits .js files for everything in src/. tsconfig.app.json is effectively orphaned — it only documents intent.

- timestamp: 2026-05-09T00:00:00Z
  checked: Working directory after a single `npm run build` post-deletion
  found: All 10 deleted .js files were re-created by tsc.
  implication: Confirmed the root tsconfig is the regeneration source. Deleting alone is not enough.

- timestamp: 2026-05-09T00:00:00Z
  checked: All .ts/.tsx files vs .js siblings (after applying both fixes)
  found: `find src -name '*.js'` returns no results.
  implication: With root tsconfig.json now setting `noEmit: true`, `tsc -b` no longer emits to src/.

- timestamp: 2026-05-09T00:00:00Z
  checked: dist/assets/index-*.js after fresh `npm run build`
  found: 'Ireland:"IE"' present in the bundle.
  implication: With no .js siblings to shadow, Vite resolves './App' to src/App.tsx and the Ireland mapping reaches runtime.

- timestamp: 2026-05-09T00:00:00Z
  checked: Functional check of mapCountry against the canonical COUNTRY_MAP
  found: mapCountry("Ireland") = "IE"; mapCountry("  Ireland  ") = "IE"; mapCountry("Atlantis") = "ZZ"
  implication: Behavior matches the spec.

## Resolution

root_cause: Two-layer structural defect. (1) The root `tsconfig.json` had no `noEmit` setting, so `tsc -b` (run as part of `npm run build`) emitted .js files into src/ — even though the more-specific tsconfig.app.json had `noEmit: true`, it was not referenced from the root tsconfig. (2) Those emitted .js files were committed to git and shadowed their .tsx siblings at runtime because Vite's default `resolve.extensions` order prefers .js over .tsx for extensionless imports like `import App from './App'`. The 2026-02-22 fix (commit 80148d4) edited only src/App.tsx and was never followed by a rebuild-and-commit, so the pre-fix src/App.js continued to be the file actually loaded.
fix: (a) Added `"noEmit": true` to the root tsconfig.json to stop `tsc -b` from emitting .js into src/. (b) Deleted all 10 stale .js siblings: src/App.js, src/main.js, src/lib/utils.js, src/components/ui/{badge,button,card,input,label,progress,separator}.js. The canonical .tsx/.ts sources (which already had the Ireland → IE mapping from commit 80148d4) are now the only candidates for Vite's resolver.
verification: 1) `npm run build` (which runs `tsc -b && vite build`) completes successfully. 2) After the build, `find src -name '*.js'` is empty — no regeneration. 3) `grep 'Ireland' dist/assets/index-*.js` returns `Ireland:"IE"` in the bundled output. 4) Direct evaluation of mapCountry confirms Ireland → IE, whitespace is trimmed, and unknown countries still fall back to ZZ. 5) `npm run lint` shows the same 23 pre-existing errors as on main (verified via `git stash` round-trip) — no new lint regressions.
files_changed:
  - tsconfig.json (added "noEmit": true)
  - src/App.js (deleted)
  - src/main.js (deleted)
  - src/lib/utils.js (deleted)
  - src/components/ui/badge.js (deleted)
  - src/components/ui/button.js (deleted)
  - src/components/ui/card.js (deleted)
  - src/components/ui/input.js (deleted)
  - src/components/ui/label.js (deleted)
  - src/components/ui/progress.js (deleted)
  - src/components/ui/separator.js (deleted)

## Specialist Review

reviewer: typescript-expert (inline review by session manager)
result: LOOKS_GOOD
reasoning: The fix targets the actual structural cause rather than the symptom. Adding `noEmit: true` to the root tsconfig.json is the idiomatic Vite + TS pattern (Vite handles the actual bundling; `tsc` should only do type-checking). Deleting the stale .js siblings removes the shadowing problem and cannot recur because the build no longer re-emits them. Alternative remediations considered and rejected: (b) overriding Vite's resolve.extensions papers over the issue and surprises future contributors, (c) keeping App.js and App.tsx in sync is fragile and was the very pattern that caused the recurrence.
follow_up_suggestions:
  - Consider deleting the now-orphaned tsconfig.app.json or wiring it into tsconfig.json's references (currently only tsconfig.node.json is referenced). Out of scope for this fix.
  - Consider adding *.tsbuildinfo to .gitignore — they're tracked and noisy in commits. Out of scope for this fix.
