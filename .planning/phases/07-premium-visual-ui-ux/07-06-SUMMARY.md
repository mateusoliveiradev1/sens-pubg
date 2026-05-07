---
phase: 07-premium-visual-ui-ux
plan: 06
subsystem: global-ui
tags: [nextjs, react, home, route-ia, community, admin, faq, playwright]

requires:
  - phase: 07-premium-visual-ui-ux
    provides: Phase 7 brand shell, premium loop primitives, 29-weapon visual registry, and paid/pricing/billing trust surfaces.
provides:
  - Premium home entry rebuilt around the Sens PUBG solo-player loop.
  - Route, metadata, FAQ, and navigation copy that separates paid Pro from `Sens dos Pros`.
  - Light community and admin/billing visual coherence without changing their product scope.
  - Home motion polish, loop-label containment, and sticky FAQ intro requested during review.
  - Home, community, and admin billing Playwright screenshots with overflow checks.
affects: [home, route-ia, metadata, faq, pros, community, admin-billing, global-copy, visual-qa]

tech-stack:
  added: []
  patterns:
    - Home should show the actual product loop first, not a generic marketing landing page.
    - `Sens dos Pros` is a public professional sensitivity reference; paid `Pro` is subscription continuity/depth.
    - Global visual coherence can tune shell, typography, spacing, and support copy without inventing new product promises.
    - FAQ sticky context is desktop-only and reduced-motion safe; mobile remains a normal stacked flow.
    - Playwright global checks assert no horizontal overflow on home, community, and admin billing states.

key-files:
  created:
    - e2e/phase7.home-global.spec.ts
    - .planning/phases/07-premium-visual-ui-ux/07-06-SUMMARY.md
  modified:
    - src/app/page.tsx
    - src/app/page.module.css
    - src/app/layout.tsx
    - src/app/sitemap.ts
    - src/app/copy-claims.contract.test.ts
    - src/app/community/page.tsx
    - src/app/community/community-hub.module.css
    - src/app/community/metadata.test.ts
    - src/app/pros/page.tsx
    - src/app/pros/pros.module.css
    - src/app/admin/layout.tsx
    - src/app/admin/admin.module.css
    - src/app/admin/billing/page.tsx
    - src/app/admin/billing/page.contract.test.ts
    - src/ui/components/faq-accordion.tsx
    - src/ui/components/premium-ui.module.css

key-decisions:
  - "The first viewport now sells the original Sens PUBG loop: short clip, tracking evidence, confidence, coverage, blockers, and next training block."
  - "The home preview uses real Phase 7 primitives and weapon visuals so it feels like the product, not a detached ad."
  - "Paid Pro and Sens dos Pros stay separate in copy, FAQ, route language, and tests."
  - "Community was lightly rebranded as Sens PUBG public discovery, while admin billing remains an operational support surface and not a revenue dashboard."
  - "User-requested polish was kept inside this plan because it directly improved the home/global visual quality required before 07-07."

patterns-established:
  - "Use `LoopRail`, `EvidenceChip`, `MetricTile`, `ProductState`, `BrandLockup`, and `WeaponIcon` for product-loop storytelling."
  - "Prefer responsive grid tracks for loop steps so labels like Resultado, Validacao, and Checkpoint never clip."
  - "Keep entry copy honest: browser-first, evidence-backed, confidence/coverage/blockers visible, and no guarantee claims."
  - "When global route names change, update metadata contracts with the route copy."
  - "Capture desktop and mobile screenshots for home/global coherence before final visual QA."

requirements-completed: [ANALYT-01, ANALYT-02, MON-01, MON-02, MON-04]

duration: 28 min
completed: 2026-05-07
---

# Phase 07 Plan 06: Home Entry Route IA Global Coherence Summary

**The product now opens on a premium Sens PUBG loop entry, with route language, community/admin shell, and final home polish aligned for Phase 7 visual QA.**

## Performance

- **Duration:** 28 min execution and verification.
- **Started:** 2026-05-07T04:05:00-03:00
- **Completed:** 2026-05-07T04:33:35-03:00
- **Tasks:** 3 planned tasks completed plus 1 user-requested home/FAQ polish pass.
- **Files modified/added:** 18 implementation/test/planning files.

## Accomplishments

- Rebuilt `/` around the actual Sens PUBG product loop with brand lockup, evidence preview, weapon visuals, confidence/coverage/blockers metrics, Free usefulness, Pro continuity, and direct `Analisar meu spray` entry.
- Updated global metadata, sitemap, FAQ, and `Sens dos Pros` copy so paid Pro is not confused with the public pro-sensitivity reference route.
- Reworked `/pros` into a clearer public reference surface with non-emoji labels and Phase 7 typography discipline.
- Lightly aligned `/community` to the Sens PUBG shell and updated community metadata tests for the new identity.
- Reframed `/admin/billing` as `Assinaturas e entitlements`, an operational support surface with explicit non-revenue-dashboard copy.
- Added Playwright coverage for home, community, and admin billing desktop/mobile screenshots with horizontal overflow assertions.
- Applied the user-requested final polish: home entry animations, reduced-motion fallback, no-cut loop labels, FAQ wording improvement, and sticky FAQ intro text on desktop.

## Task Commits

1. **Task 1: Rebuild home loop entry** - `81e7fc8` (`feat(07-06): rebuild home loop entry`)
2. **Task 2: Clarify route identity and Pro references** - `4040296` (`feat(07-06): clarify route identity and pro references`)
3. **Task 3: Align community/admin global shell** - `d13a158` (`feat(07-06): align community and admin shell coherence`)
4. **Follow-up: Polish home motion and FAQ readability** - `30ea6f9` (`fix(07-06): polish home motion and faq readability`)
5. **Follow-up: Align community metadata contract** - `10bddd1` (`test(07-06): align community metadata contract`)

## Files Created/Modified

- `src/app/page.tsx` - Premium home loop entry, preview, CTAs, Free/Pro continuity, FAQ section, and route story.
- `src/app/page.module.css` - Home layout, responsive bounds, animations, hover polish, FAQ sticky intro, and reduced-motion behavior.
- `src/app/layout.tsx` - Global metadata aligned to Sens PUBG spray analysis.
- `src/app/sitemap.ts` - Added current launch routes for pricing, community, and dashboard discovery.
- `src/app/copy-claims.contract.test.ts` - Expanded copy-safety coverage for global/home/route language.
- `src/app/community/page.tsx` - Community lead copy aligned to Sens PUBG public discovery.
- `src/app/community/community-hub.module.css` - Light Phase 7 shell/typography coherence and responsive adjustments.
- `src/app/community/metadata.test.ts` - Updated metadata contract to `Comunidade Sens PUBG`.
- `src/app/pros/page.tsx` - Reframed `Sens dos Pros` as public pro-sensitivity reference.
- `src/app/pros/pros.module.css` - Removed emoji-style markers and tightened visual labels.
- `src/app/admin/layout.tsx` - Admin navigation now labels billing as `Assinaturas`.
- `src/app/admin/admin.module.css` - Admin billing trust/support panel and form styling.
- `src/app/admin/billing/page.tsx` - Operational subscription/entitlement support copy and structured UI.
- `src/app/admin/billing/page.contract.test.ts` - Contract for non-revenue-dashboard support framing.
- `src/ui/components/faq-accordion.tsx` - FAQ copy clarified around browser-first video analysis and Pro separation.
- `src/ui/components/premium-ui.module.css` - Loop rail label containment and responsive grid behavior.
- `e2e/phase7.home-global.spec.ts` - Home, community, and admin billing desktop/mobile visual/overflow checks.

## Decisions Made

- The home should feel like the product already exists: upload clip, inspect evidence, see confidence/coverage/blockers, then continue training.
- Motion is subtle and opt-in through CSS media queries; reduced-motion users get static, readable surfaces.
- `Sens dos Pros` stays public and distinct from subscription `Pro`; this avoids misleading monetization or route expectations.
- Community and admin received only light coherence because deeper community/admin product work belongs to later phases.
- The FAQ left intro is sticky only where it improves reading; mobile remains simple and scroll-native.

## Deviations from Plan

### User-directed Refinements

**1. Home animation, clipped texts, and sticky FAQ**
- **Found during:** User visual review after the first home implementation.
- **Issue:** The home was close, but needed more life; some loop labels could clip; FAQ left-side context could stay fixed while reading.
- **Fix:** Added reduced-motion-safe entrance/hover polish, made loop rail labels responsive/wrappable, improved FAQ question wording, and made the FAQ intro sticky on desktop.
- **Files modified:** `src/app/page.module.css`, `src/ui/components/premium-ui.module.css`, `src/ui/components/faq-accordion.tsx`
- **Verification:** Focused Vitest, Playwright home/global screenshots, typecheck, full Vitest, and benchmark gate passed.
- **Committed in:** `30ea6f9`

**Total deviations:** 1 user-requested visual polish pass.
**Impact on plan:** Positive; the home is more launch-grade before the final `07-07` visual evidence matrix.

## Issues Encountered

- Full Vitest initially failed because `src/app/community/metadata.test.ts` still expected the old `Comunidade PUBG Aim Analyzer` title after the route identity update. The contract now expects `Comunidade Sens PUBG` and the full suite passes.
- History/product analytics tests intentionally print `event dropped` stderr while simulating telemetry/database failures. These are expected test paths and all suites passed.

## Verification

- `npx vitest run src/ui/components/header.contract.test.tsx src/ui/components/mobile-nav.contract.test.tsx src/app/admin/billing/page.contract.test.ts src/app/copy-claims.contract.test.ts` - PASS, 4 files, 13 tests.
- `npx vitest run src/app/copy-claims.contract.test.ts src/ui/components/loop-rail.contract.test.tsx` - PASS after home polish.
- `npx vitest run src/app/community/metadata.test.ts` - PASS, 1 file, 2 tests.
- `npx playwright test e2e/phase7.home-global.spec.ts` - PASS, 6 tests.
- `npm run typecheck` - PASS.
- `npx vitest run` - PASS, 161 files, 886 tests.
- `npm run benchmark:gate` - PASS; synthetic benchmark 3/3, captured benchmark 5/5, starter coverage gate PASS.

## Screenshots

- `test-results/phase7-home-mobile.png`
- `test-results/phase7-home-desktop.png`
- `test-results/phase7-community-mobile.png`
- `test-results/phase7-community-desktop.png`
- `test-results/phase7-admin-billing-mobile.png`
- `test-results/phase7-admin-billing-desktop.png`

## User Setup Required

None for this plan. Manual Stripe test-mode paid-flow setup remains a broader monetization launch blocker from Phase 5/07-05, not a new 07-06 blocker.

## Next Phase Readiness

Plan 07-06 is ready for 07-07. The remaining Phase 7 work is the No False Perfect visual QA/evidence matrix across browser states, accessibility, overflow, weapon visuals, spray surfaces, and final delivered/partial/blocked status.

## Self-Check: PASSED

- Home entry is premium, product-led, and browser-first.
- Confidence, coverage, blockers, weak evidence, and inconclusive behavior remain visible in product copy.
- Free versus Pro value is clearer without hiding truth evidence.
- `Sens dos Pros` is distinct from paid `Pro`.
- Community/admin received only light global coherence within scope.
- User-requested animation, no-cut text, and sticky FAQ polish are in place.
- Focused tests, Playwright, typecheck, full Vitest, and benchmark gate pass.

---
*Phase: 07-premium-visual-ui-ux*
*Completed: 2026-05-07*
