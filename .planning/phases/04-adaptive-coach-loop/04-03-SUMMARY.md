---
phase: 04-adaptive-coach-loop
plan: 03
subsystem: coach-ui
tags: [adaptive-coach-loop, analysis-ui, dashboard, history, outcomes, audit]

requires:
  - phase: 04-adaptive-coach-loop
    plan: 01
    provides: Protocol outcome persistence and hydration contracts.
  - phase: 04-adaptive-coach-loop
    plan: 02
    provides: Outcome-aware coach memory and saved coach decision snapshots.
provides:
  - Compact adaptive coach loop surface in post-analysis results.
  - Saved-session protocol outcome capture and auditable correction UI.
  - Dashboard active coach loop state for pending, validation-needed, and conflict paths.
  - History list outcome chips and full coach audit detail timeline.
affects: [analysis-ui, history, dashboard, server-actions, coach-outcomes]

tech-stack:
  added: []
  patterns:
    - Analysis shows only the essential next coach-loop action.
    - Dashboard shows active loop state and routes pending/conflict cases to closure or validation.
    - History detail owns the complete audit surface for snapshots, outcomes, revisions, conflicts, memory, and compatible clips.

key-files:
  created:
    - src/app/history/[id]/coach-protocol-outcome-panel.tsx
    - src/app/history/[id]/coach-protocol-outcome-panel.contract.test.ts
    - src/actions/dashboard.test.ts
    - src/actions/dashboard-active-coach-loop.ts
  modified:
    - src/types/engine.ts
    - src/actions/history.ts
    - src/actions/history.test.ts
    - src/actions/dashboard.ts
    - src/app/analyze/results-dashboard-view-model.ts
    - src/app/analyze/results-dashboard-view-model.test.ts
    - src/app/analyze/results-dashboard.tsx
    - src/app/analyze/results-dashboard.contract.test.ts
    - src/app/analyze/analysis.module.css
    - src/app/dashboard/dashboard-truth-view-model.ts
    - src/app/dashboard/dashboard-truth-view-model.test.ts
    - src/app/dashboard/page.tsx
    - src/app/dashboard/page.contract.test.ts
    - src/app/history/[id]/page.tsx
    - src/app/history/page.tsx
    - src/app/history/page.contract.test.ts

key-decisions:
  - "Returned saved analysis results now include historySessionId so post-analysis can distinguish saved feedback paths from unsaved fallback copy."
  - "Corrections append revision outcomes through recordCoachProtocolOutcome instead of mutating or deleting prior feedback."
  - "Dashboard active-loop state overrides generic next action when a protocol is pending, started, completed, needs validation, or conflicts."
  - "Full revision and memory audit stays in history detail, not analysis or dashboard."

patterns-established:
  - "buildAdaptiveCoachLoopModel is the compact post-analysis coach-loop read model."
  - "CoachProtocolOutcomePanel is the structured client UI for outcome capture and audit-safe correction."
  - "DashboardActiveCoachLoop is the dashboard read model for active coach-loop closure and validation routing."

requirements-completed: [COACH-01, COACH-03, COACH-04]

duration: 70min
completed: 2026-05-05
---

# Phase 04: Adaptive Coach Loop Plan 03 Summary

**Adaptive coach loop is now visible after analysis, actionable on dashboard, and auditable in history**

## Performance

- **Duration:** 70 min
- **Completed:** 2026-05-05
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- Added `buildAdaptiveCoachLoopModel` and rendered a compact Coach Extremo loop after the mastery verdict, before precision/technical audit.
- Added CTA states for unsaved analyses, pending outcomes, validation-needed outcomes, and conflicts.
- Added `historySessionId` to returned saved analysis results so analysis UI can route feedback only when a saved session exists.
- Added `CoachProtocolOutcomePanel` with six structured outcome options, invalid-capture reason enforcement, optional note, success receipt, compatible-validation CTA, and append-only correction revisions.
- Replaced duplicate detail-page sensitivity feedback CTA with the coach outcome panel when a saved coach plan exists.
- Added dashboard `activeCoachLoop` state and made pending/conflict loops override generic next-action copy.
- Added coach outcome chips to history cards and a full history detail audit panel for decision snapshots, outcome records, revisions, conflicts, compatible clips, blockers, and memory explanations.

## Task Commits

1. **Task 1-3: Surface adaptive coach loop across analysis, history, and dashboard** - `60dc7df` (feat)
2. **Hotfix: Move dashboard helper out of server action module** - `65c561c` (fix)

## Files Created/Modified

- `src/app/analyze/results-dashboard-view-model.ts` - Adds compact adaptive coach loop model and CTA resolution.
- `src/app/analyze/results-dashboard.tsx` - Renders the coach loop between mastery verdict and deeper technical surfaces.
- `src/app/analyze/analysis.module.css` - Adds responsive adaptive loop styling using existing tactical system.
- `src/app/history/[id]/coach-protocol-outcome-panel.tsx` - Adds outcome capture, reason checklist, receipt, validation CTA, and correction flow.
- `src/app/history/[id]/page.tsx` - Mounts outcome panel and full coach audit detail.
- `src/app/history/page.tsx` - Shows latest coach outcome status chips and audit entry copy.
- `src/actions/history.ts` - Returns `historySessionId`, reads latest outcome state for history cards, and keeps action validation server-owned.
- `src/actions/dashboard.ts` - Adds active coach loop read model from latest saved coach plan and latest protocol outcome.
- `src/actions/dashboard-active-coach-loop.ts` - Owns the pure active-loop helper outside the `'use server'` action module.
- `src/app/dashboard/dashboard-truth-view-model.ts` - Routes active pending/conflict loops ahead of generic next action.
- `src/app/dashboard/page.tsx` - Shows active-loop band and CTA.
- Focused tests and contract tests were added/updated for all new surfaces.

## Decisions Made

- The analysis result does not show outcome timelines; it only shows the next coach-loop action and evidence badges.
- History detail is the only complete audit surface because revisions and conflicts need context and space.
- `invalid_capture` cannot be submitted from the UI without at least one structured reason code.
- Dashboard conflict state uses `Gravar validacao compativel`, never a stronger coach action.

## Deviations from Plan

### Auto-fixed Issues

**1. Saved analysis result lacked a routeable saved-session id**
- **Found during:** Task 1 analysis CTA implementation
- **Issue:** `saveAnalysisResult` returned `sessionId` separately, but the displayed `AnalysisResult` did not carry it.
- **Fix:** Added optional `historySessionId` to returned saved results so UI models can distinguish saved feedback paths from unsaved fallback copy.
- **Files modified:** `src/types/engine.ts`, `src/actions/history.ts`, `src/actions/history.test.ts`
- **Verification:** Focused action tests, typecheck, full Vitest, and benchmark gate passed.
- **Committed in:** `60dc7df`

---

**Total deviations:** 2 implementation contract adjustments
**Impact on plan:** Positive. The first made the planned CTA states implementable without guessing from transient analysis IDs; the second kept Next server-action exports valid.

**2. Next Server Actions export boundary rejected a pure helper**
- **Found during:** Local dashboard runtime/build check after implementation
- **Issue:** `buildDashboardActiveCoachLoop` was exported from `src/actions/dashboard.ts`, which is a `'use server'` module. Next requires runtime exports from server-action modules to be async server actions.
- **Fix:** Moved the pure helper and its types to `src/actions/dashboard-active-coach-loop.ts`; `dashboard.ts` imports it internally and only exports the async action.
- **Files modified:** `src/actions/dashboard.ts`, `src/actions/dashboard-active-coach-loop.ts`, `src/actions/dashboard.test.ts`
- **Verification:** Focused dashboard tests, typecheck, and `npm run build` passed.
- **Committed in:** `65c561c`

## Issues Encountered

- Typecheck caught a few inferred union issues in `getHistorySessions` and dashboard recent-session selection. These were fixed before committing.
- Next build caught the server-action export boundary issue after the first Wave 3 commit. The helper was moved into a non-server-action module.

## Verification

- `npx vitest run src/app/analyze/results-dashboard-view-model.test.ts src/app/analyze/results-dashboard.contract.test.ts src/app/history/[id]/coach-protocol-outcome-panel.contract.test.ts src/actions/history.test.ts src/actions/dashboard.test.ts src/app/dashboard/dashboard-truth-view-model.test.ts src/app/dashboard/page.contract.test.ts src/app/history/page.contract.test.ts src/app/copy-claims.contract.test.ts` - passed, 9 files / 82 tests
- `npm run typecheck` - passed
- `npx vitest run` - passed, 125 files / 677 tests
- `npm run benchmark:gate` - passed, synthetic and captured benchmarks score 100, coverage gate PASS
- `npx vitest run src/actions/dashboard.test.ts src/app/dashboard/dashboard-truth-view-model.test.ts src/app/dashboard/page.contract.test.ts` - passed after hotfix, 3 files / 16 tests
- `npm run build` - passed after hotfix

## User Setup Required

None.

## Next Phase Readiness

Wave 4 can harden LLM fact preservation and benchmark coverage now that adaptive coach facts are visible, writable, and auditable across the product surfaces.

---
*Phase: 04-adaptive-coach-loop*
*Completed: 2026-05-05*
