---
phase: 07-premium-visual-ui-ux
plan: 02
subsystem: ui
tags: [react, svg, weapon-catalog, visual-registry, playwright]

requires:
  - phase: 07-premium-visual-ui-ux
    provides: Phase 7 brand tokens, premium shell primitives, and WeaponIcon foundation from 07-01
provides:
  - Canonical visual registry covering all 29 current seed weapons
  - Support-status contract separating visual coverage from technical analysis support
  - Premium authored SVG silhouettes for all 29 seed weapons
  - Development-only visual matrix route with desktop and mobile Playwright screenshot evidence
affects: [phase-07, weapon-catalog, analyze, dashboard, history, visual-verification]

tech-stack:
  added: []
  patterns:
    - Visual weapon support lives in src/ui/components and does not mutate the technical PUBG analysis registry
    - WeaponIcon exposes data-silhouette-id and data-support-kind for visual contract tests
    - Development visual matrices are production-blocked with notFound()

key-files:
  created:
    - src/ui/components/weapon-visual-registry.ts
    - src/ui/components/weapon-visual-registry.test.ts
    - src/ui/components/weapon-support-status.ts
    - src/ui/components/weapon-support-status.test.ts
    - src/ui/components/weapon-icon.contract.test.tsx
    - src/ui/components/weapon-icon.module.css
    - src/app/visual/phase7-weapon-icons/page.tsx
    - src/app/visual/phase7-weapon-icons/weapon-icons.module.css
    - e2e/phase7.weapon-icons.spec.ts
  modified:
    - src/ui/components/weapon-icon.tsx
    - src/app/analyze/analysis-weapon-support.ts
    - src/app/analyze/analysis-weapon-support.test.ts
    - src/app/dashboard/page.contract.test.ts
    - src/app/history/page.contract.test.ts

key-decisions:
  - "Visual catalog coverage is canonical for all 29 seed weapons, while technical analysis support remains derived from src/game/pubg/weapon-data.ts."
  - "QBZ and QBU expose explicit current-patch lifecycle labels from the patch catalog while still retaining authored visual silhouettes."
  - "The 29-weapon screenshot route is available only outside production and exists as verification evidence, not as a public feature page."

patterns-established:
  - "WeaponIcon resolves by seed id, seed name, and aliases through weaponVisualRegistry before falling back to premium non-seed category silhouettes."
  - "Support labels use the exact user-facing pt-BR contract: suporte completo, suporte visual, suporte tecnico limitado, removida, deprecated."
  - "Playwright screenshot evidence is written to test-results/phase7-weapon-icons-desktop.png and test-results/phase7-weapon-icons-mobile.png."

requirements-completed: [MON-01, MON-02, MON-04]

duration: 14 min
completed: 2026-05-07
---

# Phase 07 Plan 02: 29 Weapon SVG Catalog And Support Status Contract Summary

**Authored 29-weapon SVG catalog with honest visual-vs-technical support status and desktop/mobile screenshot evidence.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-05-07T04:10:26Z
- **Completed:** 2026-05-07T04:24:50Z
- **Tasks:** 3/3
- **Files modified:** 14

## Accomplishments

- Added `weaponVisualRegistry` as the canonical 29-seed visual catalog, with stable ids, aliases, categories, lifecycle status, silhouette ids, and technical-analysis support flags.
- Added `resolveWeaponSupportStatus` so UI can say `suporte completo`, `suporte visual`, `suporte tecnico limitado`, `removida`, or `deprecated` without weakening the actual analysis engine registry.
- Refactored `WeaponIcon` around authored SVG geometry for every current seed weapon and moved frame/status styling into `weapon-icon.module.css`.
- Added a production-blocked visual matrix route and Playwright checks that capture all 29 weapons on desktop and mobile.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the visual registry and support status model** - `39a63ee` (feat)
2. **Task 2: Expand WeaponIcon to all 29 authored silhouettes** - `91ba10d` (feat)
3. **Task 3: Add visual grid verification and route consumers** - `e55be4b` (test)

**Plan metadata:** pending in this docs completion commit.

## 29-Weapon Registry Evidence

| Weapon | Category | Silhouette | Support label |
|--------|----------|------------|---------------|
| Beryl M762 | AR | beryl-m762 | suporte completo |
| M416 | AR | m416 | suporte completo |
| AUG | AR | aug | suporte completo |
| ACE32 | AR | ace32 | suporte completo |
| AKM | AR | akm | suporte completo |
| SCAR-L | AR | scar-l | suporte completo |
| G36C | AR | g36c | suporte completo |
| QBZ | AR | qbz | removida |
| K2 | AR | k2 | suporte visual |
| Groza | AR | groza | suporte visual |
| FAMAS | AR | famas | suporte visual |
| M16A4 | AR | m16a4 | suporte visual |
| Mk47 Mutant | AR | mk47-mutant | suporte visual |
| UMP45 | SMG | ump45 | suporte completo |
| Vector | SMG | vector | suporte completo |
| Micro UZI | SMG | micro-uzi | suporte visual |
| MP5K | SMG | mp5k | suporte completo |
| PP-19 Bizon | SMG | pp-19-bizon | suporte visual |
| Tommy Gun | SMG | tommy-gun | suporte visual |
| JS9 | SMG | js9 | suporte visual |
| P90 | SMG | p90 | suporte visual |
| Mini14 | DMR | mini14 | suporte completo |
| Mk12 | DMR | mk12 | suporte visual |
| SKS | DMR | sks | suporte completo |
| SLR | DMR | slr | suporte completo |
| Dragunov | DMR | dragunov | suporte visual |
| QBU | DMR | qbu | deprecated |
| VSS | DMR | vss | suporte visual |
| Mk14 | DMR | mk14 | suporte visual |

## Screenshot Evidence

- `test-results/phase7-weapon-icons-desktop.png` - desktop full-page 29-weapon grid.
- `test-results/phase7-weapon-icons-mobile.png` - mobile full-page 29-weapon grid with viewport overflow assertions.

## Files Created/Modified

- `src/ui/components/weapon-visual-registry.ts` - Canonical visual registry and seed lookup aliases.
- `src/ui/components/weapon-support-status.ts` - Honest visual/technical/lifecycle status resolver.
- `src/ui/components/weapon-icon.tsx` - Registry-backed authored SVG renderer for all 29 seed weapons.
- `src/ui/components/weapon-icon.module.css` - Stable frame, category, and status-label styling.
- `src/app/analyze/analysis-weapon-support.ts` - Analysis selector now carries visual support status while preserving technical filtering.
- `src/app/visual/phase7-weapon-icons/page.tsx` - Development-only 29-weapon visual matrix route.
- `e2e/phase7.weapon-icons.spec.ts` - Desktop/mobile screenshot and overflow coverage.
- Focused tests under `src/ui/components`, `src/app/analyze`, `src/app/dashboard`, and `src/app/history`.

## Decisions Made

- Kept the technical analysis source of truth unchanged. The UI registry can render 29 weapons, but analysis selection still uses `getWeapon()` from the existing technical registry.
- Used current patch lifecycle status for QBZ/QBU because the patch catalog already marks them as removed/deprecated; this keeps catalog truth visible instead of flattening every visual-only entry into the same label.
- Used a `/visual/phase7-weapon-icons` route blocked in production instead of an app feature page, because this grid is verification evidence for Phase 7 rather than user-facing product IA.

## Deviations from Plan

None - plan executed within the requested scope.

## Issues Encountered

- Playwright Chromium was not installed locally, so `npx playwright install chromium` was required before the browser spec could run.
- A first attempt at a `__visual` route returned 404 because App Router treats underscore-prefixed folders as private. The route was moved to `/visual/phase7-weapon-icons` and remains blocked in production.
- Full Vitest emits existing expected stderr from analytics-drop/error-path tests, but all suites passed.

## Verification

- `npm run typecheck` - PASS.
- `npx vitest run src/ui/components/weapon-visual-registry.test.ts src/ui/components/weapon-support-status.test.ts src/ui/components/weapon-icon.contract.test.tsx src/app/analyze/analysis-weapon-support.test.ts src/app/dashboard/page.contract.test.ts src/app/history/page.contract.test.ts` - PASS, 6 files / 24 tests.
- `npx playwright test e2e/phase7.weapon-icons.spec.ts` - PASS, 2 tests; desktop and mobile screenshots generated.
- `npx vitest run` - PASS, 158 files / 864 tests.
- `npm run benchmark:gate` - PASS; synthetic and captured benchmark gates passed, coverage validation PASS.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for `07-03`: analyze/upload/result surfaces can now consume a complete authored 29-weapon visual catalog without implying technical calibration for every seed weapon.

## Self-Check: PASSED

- Summary file created.
- All plan tasks have task commits.
- All 29 seed weapons resolve to authored non-generic silhouettes.
- Visual support status stays separate from technical analysis support.
- Focused tests, full Vitest, typecheck, Playwright, and benchmark gate pass.
- No official PUBG/KRAFTON images, logos, extracted assets, or affiliation signals were introduced.

---
*Phase: 07-premium-visual-ui-ux*
*Completed: 2026-05-07*
