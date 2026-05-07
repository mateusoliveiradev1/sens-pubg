---
phase: 07-premium-visual-ui-ux
plan: 04
subsystem: ui
tags: [nextjs, react, dashboard, history, audit, playwright, premium-ui]

requires:
  - phase: 07-premium-visual-ui-ux
    provides: Phase 7 brand shell, shared loop/evidence primitives, weapon visuals, and premium analyze/result report from 07-01 through 07-03.
provides:
  - Dashboard command center with one primary next action and evidence-bound loop state.
  - Mobile-safe history audit/evolution timeline with outcome, checkpoint, blocker, and Pro depth context.
  - Saved analysis detail page with global header, local analysis navigation, coach/outcome/checkpoint audit, and reduced report repetition.
  - Playwright dashboard/history/detail overflow checks and desktop/mobile screenshots.
  - Single-spray saved reports do not show a pointless segmentation selector.
  - Saved analysis detail lower report sections share the audit-detail polish for metrics, diagnoses, sensitivity, and coach.
  - History field-reading surface uses the same audit/timeline density instead of a displaced legacy card.
  - Saved analysis detail audit internals calm old card chrome across clip quality, tracking, metrics, readings, and sensitivity.
affects: [dashboard, history, saved-analysis-detail, coach-outcomes, precision-timeline, phase7-visual-verification]

tech-stack:
  added: []
  patterns:
    - Dashboard and history compose PageCommandHeader, LoopRail, EvidenceChip, MetricTile, ProLockPreview, and WeaponIcon.
    - History actions return an evidence summary so the list can render truth state without recomputing UI guesses.
    - ResultsDashboard supports an audit-detail mode for saved analysis pages, avoiding duplicate report chrome.
    - Audit-detail mode also calms legacy result cards, removes broken section icons, and keeps lower report sections responsive.
    - History field reading summarizes real sensitivity feedback with EvidenceChip totals and compact weapon cards.
    - Audit-detail CSS overrides legacy nested glass-card chrome only inside saved analysis detail.

key-files:
  created:
    - e2e/phase7.dashboard-history.spec.ts
  modified:
    - src/app/dashboard/page.tsx
    - src/app/dashboard/page.contract.test.ts
    - src/actions/history.ts
    - src/actions/history.test.ts
    - src/app/history/page.tsx
    - src/app/history/page.contract.test.ts
    - src/app/history/[id]/page.tsx
    - src/app/history/[id]/publish-analysis-button.tsx
    - src/app/history/[id]/coach-protocol-outcome-panel.contract.test.ts
    - src/app/analyze/analysis.module.css
    - src/app/analyze/results-dashboard.tsx
    - src/app/analyze/results-dashboard.contract.test.ts

key-decisions:
  - "Dashboard is a command center, not a report dump: one main action is chosen from active coach loop, capture again, validation, quota, or history state."
  - "History list shows basic recent evidence for Free while Pro previews sell depth/continuity, not hidden truth."
  - "Saved analysis detail gets the global Header and a compact local analysis nav before the audit header."
  - "The embedded ResultsDashboard hides its upload/result chrome in saved analysis detail, while retaining the technical mastery, proof, coach, sensitivity, and metric sections."
  - "Spray segmentation only appears when there are at least two sprays to choose between."
  - "Saved detail lower sections keep the same audit language and visual density as the top shell instead of mixing old result-page chrome."
  - "History field reading is a timeline section with summary chips and line cards, not a nested floating promo card."
  - "Saved detail embedded result internals can be visually normalized through scoped audit-detail styles without changing analysis truth."
  - "Playwright seeds an authenticated history fixture so dashboard, history list, and detail are checked in mobile and desktop states."

patterns-established:
  - "Use responsive auto-fit grids with minmax(min(100%, ...)) for dense dashboard/history tiles."
  - "Use mode=\"audit-detail\" when reusing result report internals inside an already headed audit page."
  - "Use dashboardAuditDetail styles to keep reused result internals visually coherent on saved analysis detail."
  - "Hide one-item selectors; controls render only when they create a real choice."
  - "Use section borders plus repeated cards for history timeline blocks instead of card-inside-card layouts."
  - "Scope local page navigation assertions in Playwright when global nav contains the same labels."

requirements-completed: [ANALYT-01, ANALYT-02, MON-01, MON-02]

duration: 58 min
completed: 2026-05-07
---

# Phase 07 Plan 04: Dashboard And History Loop Surfaces Summary

**Dashboard is now the current command center, history is a scannable audit/evolution timeline, and saved analysis details preserve the full audit without repeating the same header/loop twice.**

## Performance

- **Duration:** 58 min including saved-analysis navigation/redundancy/lower-section follow-ups.
- **Started:** 2026-05-07T05:22:09Z
- **Completed:** 2026-05-07T06:34:20Z
- **Tasks:** 3 completed plus 5 user-requested polish corrections.
- **Files modified/added:** 12 implementation/test files.

## Accomplishments

- Refactored `/dashboard` around a premium command header, loop rail, current action resolver, evidence chips, metric tiles, active loop state, and empty-state CTA.
- Refactored `/history` into mobile-safe audit cards/timelines with weapon support visuals, confidence/coverage, blockers, checkpoints, outcome status, and contextual Pro depth preview.
- Added evidence summary data to `getHistorySessions()` so history rows show verdict/action/confidence/coverage/blocker truth from persisted full results.
- Refactored `/history/[id]` with the global `Header`, local analysis navigation, compact publish/community actions, analysis evidence header, loop rail, metric tiles, coach snapshot, outcome revisions, conflicts, checkpoint context, and anchored outcome/sensitivity panels.
- Reduced redundant saved-analysis content by adding `ResultsDashboard mode="audit-detail"`; the detail page keeps technical sections but removes the second report header, second loop rail, and duplicate Free/Pro capture guide.
- Removed the one-spray segmentation selector from saved analysis reports and upgraded the multi-spray selector to real buttons.
- Polished saved-analysis lower sections so metrics, diagnoses, sensitivity, and coach use cleaner audit titles, responsive gauge layout, and calmer cards in `audit-detail` mode.
- Polished `/history` field-reading so real sensitivity feedback appears as a cohesive audit section with summary chips, compact weapon cards, and a clear sensitivity-audit CTA.
- Tightened saved-analysis detail internals so clip quality, tracking, metrics, readings, and sensitivity no longer carry the old orange stripe/glow/card stack.
- Added authenticated Playwright coverage for `/dashboard`, `/history`, and seeded `/history/[id]` in mobile and desktop, with horizontal overflow assertions.

## Task Commits

1. **Task 1: Make dashboard the current command center** - `4b80d8a` (`feat(07-04): make dashboard command center`)
2. **Task 2: Make history list a mobile-safe audit/evolution surface** - `189d31a` (`feat(07-04): make history audit timeline mobile safe`)
3. **Task 3: Refactor history detail audit and visual checks** - `bdf9ec4` (`feat(07-04): polish history detail audit checks`)
4. **Follow-up: reduce saved-analysis repetition** - `0424c3f` (`fix(07-04): reduce saved analysis report repetition`)
5. **Follow-up: hide useless one-spray segmentation** - `7cd63b1` (`fix(07-04): hide single-spray segment selector`)
6. **Follow-up: polish saved-analysis lower sections** - `2c12a9e` (`fix(07-04): polish saved detail lower sections`)
7. **Follow-up: align history field-reading surface** - `b2eafa8` (`fix(07-04): align history field reading surface`)
8. **Follow-up: align saved-detail audit internals** - `47a04df` (`fix(07-04): align saved detail audit internals`)

## Files Created/Modified

- `src/app/dashboard/page.tsx` - Premium dashboard command center and evidence/action hierarchy.
- `src/app/dashboard/page.contract.test.ts` - Dashboard contract for shared components, copy, next actions, and weapon icons.
- `src/actions/history.ts` - Adds saved evidence summary hydration for history rows.
- `src/actions/history.test.ts` - Covers history evidence summary preservation.
- `src/app/history/page.tsx` - Responsive audit/evolution timeline, field-reading section, precision lines, checkpoints, outcome chips, Pro depth preview, and mobile-safe cards.
- `src/app/history/[id]/page.tsx` - Saved analysis detail audit shell with global header, local nav, loop/evidence summary, coach audit, outcomes, checkpoints, and embedded result report.
- `src/app/history/[id]/publish-analysis-button.tsx` - Compact publish/community action group for the analysis nav.
- `src/app/analyze/results-dashboard.tsx` - Adds audit-detail mode to avoid duplicate report chrome on saved analysis detail, cleans lower section titles, uses a responsive gauge row, and replaces broken diagnosis icons with compact text tokens.
- `src/app/analyze/analysis.module.css` - Adds stable button styling for multi-spray selection, removes the displaced horizontal selector feel, and applies scoped audit-detail polish to lower sections, nested cards, gauges, diagnoses, and sensitivity profile cards.
- `e2e/phase7.dashboard-history.spec.ts` - Dashboard/history/detail desktop/mobile overflow, header/nav, field-reading, lower-section, and redundancy regression coverage.
- Contract tests under `src/app/dashboard`, `src/app/history`, and `src/app/analyze` - Guard audit visibility, one-action hierarchy, history field-reading polish, saved-detail internals polish, and no duplicate saved-analysis chrome.

## Decisions Made

- Dashboard and history now use the same Phase 7 primitives as analysis results, but route roles stay distinct: command center, audit timeline, and saved detail.
- History detail owns the page header and local navigation; embedded result content does not re-own top-level report hierarchy.
- Community publishing stays available from saved analysis detail, but the action group is compact and separate from the main coach/outcome CTA.
- Free/Pro messaging on history focuses on continuity/history depth and leaves confidence, coverage, blockers, and recent evidence visible.
- The Playwright spec seeds real authenticated rows instead of depending on whichever local account/history happens to exist.

## Deviations from Plan

- Added `src/app/history/[id]/publish-analysis-button.tsx` polish even though the plan listed the detail page and outcome panel. This was needed because the user pointed out the publish/community actions felt awkward in the saved analysis page.
- Added `ResultsDashboard mode="audit-detail"` after user feedback about redundant report blocks. This keeps the required `ResultsDashboard` mounted while removing duplicate page chrome.
- Hid single-spray segmentation after user feedback that the selector looked displaced and non-functional. Multi-spray reports still get a functional selector.
- Added a final saved-detail lower-section polish after user feedback that coach/sensitivity/metrics still felt half old and half new.
- Added a history field-reading polish after user feedback that the same old/new split was still visible on `/history`.
- Tightened saved-detail audit internals after user screenshots showed clip quality, tracking, metrics, readings, and sensitivity still carrying old result-page card chrome.

**Total deviations:** 6 user-facing polish fixes.
**Impact on plan:** Positive; the polish fixes reduce navigation friction, remove redundant chrome, align lower report/history sections, calm embedded audit internals, and preserve the audit requirement.

## Issues Encountered

- Playwright first exposed mobile horizontal overflow on saved analysis detail. The fix added global header layout, `minWidth: 0`, safer responsive widths, and a local nav shell.
- Playwright strict mode found duplicate `Comunidade` links after adding the global header. The assertion was scoped to `Navegacao da analise`.
- The saved analysis page duplicated report headers/loops after the detail audit refactor; `mode="audit-detail"` now protects that route.
- The one-item segmentation selector looked like a broken control on saved one-spray reports. It now renders only when more than one spray exists.
- The lower saved-analysis report still mixed old result-page styling with the new audit shell. `dashboardAuditDetail` now normalizes headings, cards, hover behavior, and gauge wrapping for that embedded mode.
- The `/history` field-reading card still looked like a nested legacy block. It is now a bordered timeline section with EvidenceChip totals, compact per-weapon cards, and Playwright coverage.
- Follow-up screenshots showed the saved-detail internals still had legacy orange/glow/card-stack treatment. Scoped `audit-detail` CSS now normalizes nested cards, gauges, metric stripes, diagnosis tokens, and sensitivity profile cards.

All issues were resolved before final verification.

## Verification

- `npx vitest run src/actions/dashboard.test.ts src/app/dashboard/dashboard-truth-view-model.test.ts src/app/dashboard/page.contract.test.ts src/actions/history.test.ts src/app/history/page.contract.test.ts src/app/history/[id]/coach-protocol-outcome-panel.contract.test.ts src/app/copy-claims.contract.test.ts src/app/analyze/results-dashboard.contract.test.ts` - PASS, 8 files, 82 tests.
- `npx vitest run src/app/analyze/results-dashboard.contract.test.ts` - PASS, 22 tests after the lower-section follow-up.
- `npx vitest run src/app/history/page.contract.test.ts` - PASS, 6 tests after the field-reading follow-up.
- `npx vitest run src/app/analyze/results-dashboard.contract.test.ts src/app/history/page.contract.test.ts` - PASS, 28 tests after the final audit-internals follow-up.
- `npx playwright test e2e/phase7.dashboard-history.spec.ts` - PASS, 6 tests.
- `npm run typecheck` - PASS.
- `npx vitest run` - PASS, 161 files, 881 tests.
- `npm run benchmark:gate` - PASS; synthetic benchmark 3/3, captured benchmark 5/5, starter coverage gate PASS.

Expected stderr note: `history.test.ts` and `product-analytics.test.ts` intentionally simulate analytics/database failures; all suites passed.

## Screenshots

- `test-results/phase7-dashboard-desktop.png`
- `test-results/phase7-dashboard-mobile.png`
- `test-results/phase7-history-desktop.png`
- `test-results/phase7-history-mobile.png`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 07-04 is complete and ready for 07-05. Dashboard/history now match the Phase 7 premium loop direction while preserving evidence, blockers, inconclusive behavior, outcome revision audit, Free usefulness, and Pro continuity value.

## Self-Check: PASSED

- Dashboard exposes one current next action and compact loop state.
- History list is mobile-safe, scannable, and audit/evolution oriented.
- Saved analysis detail keeps full coach/trend/outcome/checkpoint context.
- Duplicate saved-analysis report chrome was removed after user review.
- Single-spray segmentation selector was removed after user review.
- Saved-analysis lower metrics, diagnoses, sensitivity, and coach sections now match the audit-detail shell.
- History field-reading now matches the audit/timeline shell.
- Saved-analysis clip quality, tracking, metrics, readings, and sensitivity internals now use scoped audit-detail chrome.
- Focused tests, Playwright, typecheck, full Vitest, and benchmark gate pass.

---
*Phase: 07-premium-visual-ui-ux*
*Completed: 2026-05-07*
