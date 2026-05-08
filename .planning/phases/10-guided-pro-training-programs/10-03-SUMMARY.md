---
phase: 10-guided-pro-training-programs
plan: 03
subsystem: ui-route-navigation
tags: [nextjs, react, css-modules, ciclo-pro, training-programs, premium-projection]

requires:
  - phase: 10-guided-pro-training-programs
    provides: 10-01 Ciclo Pro contracts, mission anatomy, checkpoint layers, and recovery states
  - phase: 10-guided-pro-training-programs
    provides: 10-02 training program actions, persistence snapshots, entitlements, and Free/Pro projection
provides:
  - Dedicated `/ciclo-pro` server route that loads requested or active cycles through existing actions
  - Display-ready Ciclo Pro view model for empty, locked, repair, active, and completed states
  - Responsive 30-day/four-week program map with mission anatomy, checkpoints, active line, lock, and repair panels
  - Desktop and mobile navigation entries that keep Ciclo Pro distinct from Sens dos Pros and pricing
affects: [dashboard-handoff, result-entry, history-audit, phase-10-verifier]

tech-stack:
  added: []
  patterns:
    - Route loads server-owned program snapshots and applies `projectTrainingProgramForAccess`
    - Pure view model converts projection/state into stable pt-BR UI labels before rendering
    - Program route links to Spray Lab and Analyze validation instead of rebuilding either flow

key-files:
  created:
    - src/app/ciclo-pro/page.tsx
    - src/app/ciclo-pro/ciclo-pro-view-model.ts
    - src/app/ciclo-pro/ciclo-pro-view-model.test.ts
    - src/app/ciclo-pro/ciclo-pro-program-map.tsx
    - src/app/ciclo-pro/ciclo-pro.module.css
    - src/app/ciclo-pro/page.contract.test.ts
  modified:
    - src/ui/components/header.tsx
    - src/ui/components/mobile-nav.tsx
    - src/ui/components/header.contract.test.tsx
    - src/ui/components/mobile-nav.contract.test.tsx

key-decisions:
  - "Use `/ciclo-pro` as the full 30-day map route while keeping dashboard as current cockpit, Spray Lab as runner, and Analyze as validation."
  - "Free route state shows one real basic mission and evidence; Pro unlocks the full four-week adaptive/auditable map."
  - "Navigation label is `Ciclo Pro`, not `Pro`, so it does not collide with `Sens dos Pros` or pricing."
  - "Shared GSD tracking files were not updated in this parallel wave; the orchestrator owns STATE, ROADMAP, and REQUIREMENTS."

patterns-established:
  - "Mission cards render the full anatomy: Agora, Por que importa, O que invalida, Evidencia gerada, and Proximo CTA."
  - "Checkpoint rail separates operational weekly, technical validated, and monthly checkpoint language without global grades."
  - "Repair/consolidation/reentry copy is driven by stable program reason codes and visible user-facing reasons."

requirements-completed: [PREC-03, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05, MON-01, MON-02]

duration: 12min
completed: 2026-05-08
---

# Phase 10 Plan 03: Dedicated Ciclo Pro Program Route Summary

**Server-owned Ciclo Pro route with Free/Pro projection, four-week mission map, checkpoint rail, active-line context, repair panels, and distinct navigation.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-08T20:33:59Z
- **Completed:** 2026-05-08T20:45:00Z
- **Tasks:** 4
- **Files modified:** 10

## Accomplishments

- Built `/ciclo-pro` as a dynamic server route that authenticates, resolves server product access, loads requested or active cycles, and applies the existing training-program projection.
- Added `buildCicloProViewModel` for empty, locked, repair, active, and completed route states with command-header evidence, loop stage, mission cards, checkpoints, active line, and lock copy.
- Rendered a responsive full Ciclo Pro map with four adaptive weeks, seven mission slots per week, mission anatomy, checkpoint layers, active-line audit context, and repair/consolidation panels.
- Added desktop and mobile `Ciclo Pro` navigation without merging it into `Sens dos Pros`, `Planos`, Spray Lab, or billing.

## Task Commits

1. **Task 1: Create server route loader for `/ciclo-pro`** - `c90b79b` (feat)
2. **Task 2: Build Ciclo Pro view model** - `7930846` (feat)
3. **Task 3: Render the program map UI** - `bee8393` (feat)
4. **Task 4: Add route navigation and locks** - `e55e8fa` (feat)

**Plan metadata:** this summary commit is separate.

## Files Created/Modified

- `src/app/ciclo-pro/page.tsx` - Server route loader, access projection, command header, loop rail, and program map wiring.
- `src/app/ciclo-pro/ciclo-pro-view-model.ts` - Route state, mission/checkpoint/repair labels, lock copy, evidence chips, and Free/Pro view model.
- `src/app/ciclo-pro/ciclo-pro-view-model.test.ts` - Free, Pro, state-label, mission anatomy, and copy-safety coverage.
- `src/app/ciclo-pro/ciclo-pro-program-map.tsx` - Program map UI for empty, locked, Free mission, Pro weeks, checkpoints, active line, and repair panels.
- `src/app/ciclo-pro/ciclo-pro.module.css` - Responsive route layout, mission/checkpoint cards, week bands, lock panel, and mobile constraints.
- `src/app/ciclo-pro/page.contract.test.ts` - Route loader, projection, copy, handoff, and rendering contracts.
- `src/ui/components/header.tsx` - Desktop `/ciclo-pro` entry.
- `src/ui/components/mobile-nav.tsx` - Mobile `/ciclo-pro` entry and glyph.
- `src/ui/components/header.contract.test.tsx` - Desktop nav separation and ordering coverage.
- `src/ui/components/mobile-nav.contract.test.tsx` - Mobile nav route visibility coverage.

## Decisions Made

- The route treats no active cycle as a real empty state and sends users to Analyze/history instead of inventing a program.
- Free users see one real basic mission, evidence, blockers, and upgrade CTA; the full four-week map appears only when server access grants the monthly program entitlement.
- Mission CTAs link outward to `/spray-lab`, `/analyze?mode=validation`, `/history`, `/dashboard`, `/pricing`, or billing-derived lock hrefs; the route does not run video analysis or Spray Lab sessions.
- Shared tracking updates were skipped because the user explicitly assigned `.planning/STATE.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md` to the orchestrator for this parallel wave.

## Deviations from Plan

None - planned route, view model, map UI, navigation, and tests were completed within the requested scope.

## Issues Encountered

- Parallel Phase 10 work interleaved commits on `main`; `10-04` commits appeared between this plan's task commits.
- `src/app/analyze/results-dashboard-view-model.ts` was dirty at completion from parallel work and was left unstaged/unmodified.
- Commit `bee8393` includes a one-line `src/actions/dashboard.ts` change from the concurrent dashboard wave. It was not part of this plan output, and I did not revert it to avoid discarding another executor's work.

## Verification

- `npx vitest run src/app/ciclo-pro/page.contract.test.ts` - PASS, 3 tests
- `npx vitest run src/app/ciclo-pro/ciclo-pro-view-model.test.ts` - PASS, 8 tests
- `npx vitest run src/ui/components/header.contract.test.tsx src/ui/components/mobile-nav.contract.test.tsx src/app/ciclo-pro/page.contract.test.ts` - PASS, 7 tests
- `npx vitest run src/app/ciclo-pro/page.contract.test.ts src/app/ciclo-pro/ciclo-pro-view-model.test.ts src/ui/components/header.contract.test.tsx` - PASS, 13 tests
- `npm run typecheck` - PASS

## Known Stubs

None. Stub scan found only test helper default override objects in `src/app/ciclo-pro/ciclo-pro-view-model.test.ts`; no UI-facing placeholder, TODO/FIXME, fake locked data, or unconnected mock program output was introduced.

## Threat Flags

None. The new route and navigation surface were planned in the threat model, use server-owned actions/projection, keep evidence/blockers visible, and link to existing Spray Lab/Analyze flows rather than adding new network endpoints or trust boundaries.

## User Setup Required

None - no external service configuration required.

## Shared Tracking

Skipped by instruction for this parallel wave. `.planning/STATE.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md` were not edited or committed.

## Next Phase Readiness

Plan 10-04 can link dashboard/result handoffs into `/ciclo-pro` using the route and projection model now in place. Later history/copy/verifier plans can assert the same mission anatomy, checkpoint separation, and no-overclaim route copy.

## Self-Check: PASSED

- Created/modified files found: `src/app/ciclo-pro/page.tsx`, `src/app/ciclo-pro/ciclo-pro-view-model.ts`, `src/app/ciclo-pro/ciclo-pro-program-map.tsx`, `src/app/ciclo-pro/ciclo-pro.module.css`, `src/app/ciclo-pro/page.contract.test.ts`, `src/app/ciclo-pro/ciclo-pro-view-model.test.ts`, `src/ui/components/header.tsx`, `src/ui/components/mobile-nav.tsx`, `src/ui/components/header.contract.test.tsx`, `src/ui/components/mobile-nav.contract.test.tsx`.
- Task commits found: `c90b79b`, `7930846`, `bee8393`, `e55e8fa`.
- Shared tracking files intentionally unchanged.

---
*Phase: 10-guided-pro-training-programs*
*Completed: 2026-05-08*
