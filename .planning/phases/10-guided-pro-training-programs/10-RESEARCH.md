# Phase 10: Guided Pro Training Programs - Research

**Phase:** 10 - Guided Pro Training Programs
**Researched:** 2026-05-08
**Status:** ready for planning

## Research Objective

Answer what must be clear before planning Phase 10 well.

Phase 10 should add **Programa Pro: Ciclo de Spray** above the already delivered evidence loop. The program layer organizes analysis, complete protocols, Spray Lab execution, compatible validation, outcomes, history, and dashboard command state into a 30-day Pro cycle with four adaptive weeks. It must not become a generic course, XP system, content library, broad habit tracker, team workflow, social premium loop, or server-side video analysis path.

## Sources Read

- `.planning/phases/10-guided-pro-training-programs/10-CONTEXT.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/TESTING.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/phases/08-complete-training-protocols/08-*-PLAN.md`
- `.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-*-PLAN.md`
- `.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-RESEARCH.md`
- `src/types/engine.ts`
- `src/types/monetization.ts`
- `src/lib/product-entitlements.ts`
- `src/lib/premium-projection.ts`
- `src/lib/spray-lab-projection.ts`
- `src/db/schema.ts`
- `src/actions/spray-lab.ts`
- `src/actions/dashboard.ts`
- `src/actions/dashboard-active-coach-loop.ts`
- `src/actions/history.ts`
- `src/core/training-protocols.ts`
- `src/core/training-protocol-drills.ts`
- `src/core/spray-lab-session.ts`
- `src/core/spray-lab-fidelity.ts`
- `src/core/spray-lab-scoring.ts`
- `src/core/spray-lab-validation.ts`
- `src/core/spray-lab-coach-handoff.ts`
- `src/app/spray-lab/page.tsx`
- `src/app/spray-lab/spray-lab-view-model.ts`
- `src/app/analyze/page.tsx`
- `src/app/analyze/analysis-client.tsx`
- `src/app/analyze/results-dashboard-view-model.ts`
- `src/app/dashboard/page.tsx`
- `src/app/history/page.tsx`
- `src/app/history/[id]/page.tsx`
- `src/core/copy-safety.test.ts`
- `scripts/verify-phase9-spray-lab.ts`
- `package.json`

No new external research was needed. The phase is primarily a local architecture and product integration problem, and all factual claims should stay grounded in existing Sens PUBG evidence.

## Product Contract

The target product is **Programa Pro: Ciclo de Spray**, short UI name **Ciclo Pro**.

The product should feel like a serious adaptive PUBG improvement system:

- `Analisar` produces browser-first clip evidence.
- `Treinar` runs Phase 8 protocols through Phase 9 Spray Lab.
- `Validar` records compatible clips through Analyze validation mode.
- `Evoluir` updates active lines, checkpoints, coach memory, and the next mission.

The weak-evidence on-ramp is **Ciclo de Reparo**. It should be a premium honest path, not a degraded teaser or punishment. Weak base evidence, missing context, stale context, low Lab fidelity, variable changes, fatigue/confusion, and inconclusive validation should create repair or consolidation instead of fake advancement.

## Existing Assets To Reuse

### Contracts and evidence

- `CompleteTrainingProtocol` already carries target, context, dose, preparation, validation, transfer, downgrade, audit, Free summary, and Pro sections.
- `SprayLabSessionSnapshot`, fidelity, benchmark snapshot, validation link, repair state, and coach handoff already exist in `src/types/engine.ts` and `src/core/spray-lab-*`.
- `PrecisionTrendSummary`, `precisionEvolutionLines`, and `precisionCheckpoints` already provide the active-line backbone.
- Coach outcome persistence, protocol revisions, and transfer records already separate execution outcome, technical validation, and practical transfer.

### Persistence and actions

- `src/db/schema.ts` has normalized tables for precision lines/checkpoints, protocol revisions/transfers, Spray Lab sessions/events/benchmarks/validation links.
- `src/actions/spray-lab.ts` validates ownership, loads owned analysis/protocol rows, persists Lab state, creates validation links, and revalidates dashboard/history.
- `src/actions/history.ts` already links Analyze validation saves back to Spray Lab and hydrates Lab continuity into history.

### Entitlements and projection

- `src/types/monetization.ts` already defines `programs.guided_weekly` and `programs.guided_monthly`.
- Those program keys are currently planned/future because `productProEntitlementKeys` does not grant them yet.
- `src/lib/premium-projection.ts` already has titles for weekly/monthly programs but does not yet make them part of the premium feature set.
- `src/lib/spray-lab-projection.ts` is the best pattern for a dedicated Free/Pro projection helper.

### UI surface roles

- `/spray-lab` is the execution cockpit and must remain the runner.
- `/analyze?mode=validation` is already wired for validation preload and variable confirmation.
- Dashboard already acts as a command center with `PageCommandHeader`, `LoopRail`, active coach loop, and Spray Lab handoff.
- History list/detail already show protocol continuity and Spray Lab audit signals.
- Result view models already route saved analyses into Spray Lab and validation.

## Gaps To Fill In Phase 10

### 1. Program contracts do not exist yet

There is no stable `Ciclo Pro` contract. Phase 10 needs versioned program types for:

- 30-day cycle identity and strict context.
- Four adaptive weeks.
- Five main missions plus two flexible slots per week.
- Mission anatomy: Agora, Por que importa, O que invalida, Evidencia gerada, Proximo CTA.
- Mission categories: execution, validation, repair, preparation, transfer.
- Program states: `preparando`, `ativo`, `reparando`, `consolidando`, `validacao_pendente`, `progresso_validado`, `sem_mudanca_clara`, `regressao_validada`, `inconclusivo`, `linha_reiniciada`, `concluido`, plus optional paused/stale if needed.
- Checkpoint layers: operational weekly, technical validated, monthly program.
- Adaptation reason codes and visible user-facing reasons.
- Recovery hierarchy: repair, consolidate, restart line.

Recommended location: either `src/types/engine.ts` near protocol/Lab contracts, or a new `src/types/training-programs.ts`. Given `engine.ts` is already large, a dedicated type file may keep the program domain readable while still importing shared engine types.

### 2. Deterministic program builder/state machine is needed

The program cannot be generated by UI copy or an LLM. It needs deterministic core code that consumes:

- saved analysis result and `analysisDecision`;
- `CompleteTrainingProtocol`;
- active precision line/trend/checkpoints;
- Spray Lab session/benchmark/validation handoff;
- coach outcome and protocol revision history;
- entitlement projection;
- elapsed/missed-day information.

Recommended modules:

- `src/core/training-programs.ts`: create/update Ciclo Pro, create Ciclo de Reparo, derive missions, week state, checkpoints, reentry/recovery, and adaptation reasons.
- `src/core/training-program-checkpoints.ts`: weekly/technical/monthly checkpoint composition if the main file becomes too dense.
- `src/core/training-programs.test.ts`: state-machine, mission anatomy, recovery, missed-day, and no-overclaim tests.

### 3. Persistence should be normalized but snapshot-friendly

Likely tables:

- `training_program_cycles`
- `training_program_weeks`
- `training_program_missions`
- `training_program_checkpoints`
- `training_program_events`

The tables should store stable columns for user, base analysis, active line/context, state, kind, week number, mission slot, status, reason codes, timestamps, and minimal references to Spray Lab sessions, validation clips, protocol revisions, and checkpoints. JSON payloads can carry versioned snapshots, following Spray Lab and complete protocol patterns.

Do not store raw program video, medical detail, health history, body metrics, or private training notes beyond minimal reason codes.

### 4. Actions must own program truth

The route should not trust client payloads to start or advance a program. Server actions should load owned rows and derive truth from persisted analysis/protocol/Lab/validation evidence.

Recommended actions:

- `createTrainingProgramCycleAction`
- `getActiveTrainingProgramCycleAction`
- `reenterTrainingProgramCycleAction`
- `completeTrainingProgramMissionAction`
- `closeTrainingProgramWeekAction`
- `recordTrainingProgramCheckpointAction`
- `pauseOrFreezeTrainingProgramCycleAction`

All actions should check auth, ownership, current state, allowed transition, and evidence support before moving a cycle.

### 5. Free/Pro projection needs a dedicated helper

Free should remain useful:

- next recommended step;
- one honest basic weekly mission;
- blockers/evidence/reason;
- CTA to Ciclo Pro;
- no fake blur or fake program data.

Pro should unlock:

- full 30-day Ciclo Pro;
- four adaptive weeks;
- contextual missions/checkpoints/recovery;
- history/audit/comparisons;
- active-line continuation.

Recommended helper: `src/lib/training-program-projection.ts`, mirroring `spray-lab-projection.ts`, using `programs.guided_weekly` and `programs.guided_monthly`.

### 6. Dedicated program route is required

Dashboard is the "now" cockpit, but the phase requires a first-class full map route. Likely route:

- `/ciclo-pro`

Alternative names like `/programs` are less product-specific. `/ciclo-pro` is aligned with the locked short UI name and pt-BR posture.

The route should show:

- 30-day cycle map;
- week 1-4 structure;
- current mission;
- flexible slots;
- checkpoint layers;
- repairs/consolidation;
- active line and strict context;
- evidence audit;
- Free/Pro state.

The route must link to `/spray-lab` for execution and `/analyze?mode=validation` for validation rather than duplicating those flows.

### 7. Dashboard should become the Ciclo Pro now-cockpit

Dashboard should show the current program state without becoming the full report:

- current week (`Semana 2 de 4`);
- dominant mission;
- program state;
- evidence/reason;
- blocker;
- CTA (`Abrir Ciclo Pro`, `Continuar Spray Lab`, `Gravar validacao compativel`, repair/reentry).

This likely extends `DashboardStats`, `buildDashboardActiveCoachLoop`, and `dashboard-truth-view-model`.

### 8. History should become program audit, not just Lab/protocol audit

History needs cycle summaries and detail audit:

- old cycles;
- weekly checkpoints;
- technical validation checkpoint;
- monthly checkpoint;
- repair/consolidation/restart reasons;
- associated Lab sessions;
- associated validation clips;
- active-line archive/restart.

The existing history list/detail already has the right pattern for continuity cards and audit panels.

### 9. Copy safety must expand from Spray Lab to programs

Phase 10 needs copy-safety checks across new route, dashboard, history, result, projection, pricing/lock surfaces, and program core copy. Disallowed claims should include:

- perfect sensitivity;
- guaranteed improvement/rank;
- global player grade;
- official PUBG/KRAFTON affiliation;
- course/library language that implies static content instead of adaptive evidence;
- "TDM/real match proves technical progress";
- "progress validated" without compatible clip evidence.

### 10. A dedicated verifier is mandatory

Add `verify:phase10:programs`, modeled on Phase 8/9 verifiers.

Required rows should include:

- `contracts.program_cycle`
- `state_machine.adaptation`
- `mission.anatomy`
- `checkpoints.layers`
- `persistence.cycles`
- `projection.free_pro`
- `actions.ownership`
- `ui.program_route`
- `dashboard.cockpit`
- `history.audit`
- `handoff.spray_lab_analyze`
- `coach.evidence`
- `recovery.reentry`
- `copy_safety.programs`
- `playwright.program_matrix`
- `commands.typecheck`
- `commands.vitest`
- `commands.benchmark_gate`
- `commands.verify_phase10`
- `commands.build`

The matrix from context D-80 should be represented explicitly: Free, Pro, no analysis, weak evidence, Ciclo de Reparo, active cycle, repair, consolidation, validation pending, progress validated, no clear change, regression validated, fatigue, pain/discomfort stop, variable changed, stale context, missed days, line restarted, completed cycle, locked/upgrade states.

## Recommended Plan Split

1. **Program contracts, builder, missions, checkpoints, and recovery engine.**
2. **Program persistence, actions, entitlements, and Free/Pro projection.**
3. **Dedicated `/ciclo-pro` program route and 30-day map UI.**
4. **Dashboard cockpit, result entry, Spray Lab, and Analyze handoffs.**
5. **History audit, coach continuity, adaptation reasons, and program copy safety.**
6. **Phase 10 verifier, Playwright matrix, docs, and No False Done evidence.**

This preserves clean dependencies: deterministic truth first, storage/actions second, full route UI after persisted state, surface handoffs after the route exists, audit/coach/copy hardening after data is available, and final verification last.

## Planning Risks

- **Program becomes a course.** Mitigation: every mission must change evidence/state and cite mission anatomy.
- **Calendar completion fakes progress.** Mitigation: week can close by rhythm, but difficulty/aggressiveness only increases when evidence converges.
- **Program duplicates Spray Lab.** Mitigation: execution CTAs always go to `/spray-lab`.
- **Program duplicates Analyze.** Mitigation: validation CTAs use existing validation mode.
- **Free feels broken.** Mitigation: Free shows one useful mission, blockers, evidence, and honest next step.
- **Pro overclaims.** Mitigation: copy safety and No False Done verifier block guaranteed improvement, perfect sensitivity, rank, or global grades.
- **Sensitive health detail sneaks into storage.** Mitigation: persist reason codes, not medical detail.
- **Migrations block Delivered status.** Mitigation: program persistence plan must include target DB migration apply/verify as user setup/final evidence.

## RESEARCH COMPLETE

Phase 10 can be planned as six executable plans across five waves, preserving browser-first analysis, evidence honesty, Pro value, useful Free projection, and the boundary between Ciclo Pro, Spray Lab, Analyze, dashboard, and history.
