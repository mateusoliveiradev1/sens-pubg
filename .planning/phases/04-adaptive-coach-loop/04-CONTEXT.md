# Phase 4: Adaptive Coach Loop - Context

**Gathered:** 2026-05-05T18:29:08.2978007-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns Coach Extremo from a strong V1 deterministic coach plan into a real adaptive feedback loop. It must capture protocol outcomes, use compatible memory and Phase 3 precision trends, revise priority and aggressiveness honestly, and keep the LLM as copy-only polish inside a locked schema.

This phase is about the coach loop, not monetization, team workflows, full visual redesign, real-time coaching, or a new backend video pipeline. The browser-first analysis path remains mandatory. The internal quality bar is "perfection" as operational rigor: evidence, validation, auditability, and conflict handling. Public copy must not claim perfect sensitivity, guaranteed improvement, rank gain, or absolute certainty.

</domain>

<decisions>
## Implementation Decisions

### Outcome do protocolo
- **D-01:** Protocol outcome evaluates both the protocol and the primary focus. The product must know whether the whole block was executed and which focus the outcome applies to.
- **D-02:** Outcome status must support: `started`, `completed`, `improved`, `unchanged`, `worse`, and `invalid_capture`. Exact enum names may be chosen by the planner, but these meanings are locked.
- **D-03:** User-reported `improved` is useful but weak evidence until a compatible validation clip confirms it.
- **D-04:** If the user gives no feedback, the coach keeps the protocol as pending and the dashboard prompts closure without blocking normal product use.
- **D-05:** Saving an outcome should not require an immediate clip, but the UI must show a strong CTA to record a compatible validation clip.
- **D-06:** If the user reports improvement and the next compatible clip worsens, the coach records an explicit conflict and asks for short validation. It must not rush to a conclusion.
- **D-07:** Outcome records must store structured reason codes plus an optional short free-text note.
- **D-08:** The coach must distinguish protocol failure from execution failure when the user provides a reason, and may use the next clip to support that distinction without inventing certainty.
- **D-09:** `started` means the protocol is in progress. It can expire if not closed and does not count as technical evidence.
- **D-10:** `completed` without result is neutral evidence with a CTA to mark whether the block improved, stayed the same, worsened, or became invalid.
- **D-11:** `invalid_capture` must require a reason such as capture quality, incompatible context, bad execution, or changed variable. It should become learning, not discarded noise.
- **D-12:** Outcomes can be corrected after saving, but revisions must remain auditable.

### Memoria e prioridade adaptativa
- **D-13:** Coach memory has two layers: strict compatible-context memory and global player memory.
- **D-14:** Strict compatible memory is primary. Global memory may break ties or help when strict compatible memory is absent, but it cannot override compatible evidence.
- **D-15:** Compatible memory uses a hybrid window: recent compatible clips plus a time limit, so stale history does not dominate current coaching.
- **D-16:** Priority combines recurrence, current severity, evidence quality, compatible trend state, and prior outcome. It must not be driven only by the latest diagnosis or only by old history.
- **D-17:** If a prior protocol worsened, the next coach lowers aggressiveness and creates or asks for an alternative hypothesis instead of blindly repeating the same advice.
- **D-18:** If a protocol improved and the compatible clip confirmed progress, the coach consolidates before changing variable.
- **D-19:** Strong memory requires at least three compatible clips, or two compatible clips plus a coherent outcome. Exact thresholds remain planner discretion, but this conservative bar is locked.
- **D-20:** Every session should preserve an auditable snapshot of why the coach chose its tier, primary focus, protocol, and validation.
- **D-21:** `worse` with invalid capture is not technical evidence against the protocol. It is stored as invalid outcome plus execution/capture friction and asks for a new validation.
- **D-22:** Repeated `completed` outcomes without result remain neutral, reduce outcome-memory confidence, and prompt the user to close the result before the coach advances too far.
- **D-23:** When user outcome and compatible trend disagree, the coach records explicit conflict, gives stronger weight to trend evidence, and requires new validation before advancing.
- **D-24:** If the same focus fails twice, the coach lowers aggressiveness, searches for a prior/root cause, asks whether execution or capture interfered, and only keeps the focus if the current clip still proves it is dominant.
- **D-25:** If one focus improves while another worsens, the coach treats it as partial progress. It may consolidate only if the new blocker is not critical.
- **D-26:** Memory visibility is layered: analysis shows only the essential reason, dashboard shows short active memory, and history shows complete audit.

### Agressividade do coach
- **D-27:** `apply_protocol` requires strong current evidence, compatible memory without conflict, and recent validation. A single strong-looking clip is not enough.
- **D-28:** `stabilize_block` is used when the technical signal is useful but variance, history, or trend evidence does not yet allow a stronger action, especially before sensitivity changes.
- **D-29:** If sensitivity and technique point in different directions, the coach chooses the least irreversible safe path: technique/validation before sensitivity unless strong compatible evidence supports sensitivity.
- **D-30:** If the user wants an aggressive action on weak evidence, the coach downgrades it to a test protocol, offers the safer path, and explains why the stronger action is blocked.
- **D-31:** The coach must not repeat the same protocol blindly. Repetition requires a new hypothesis, new check, or new validation purpose.
- **D-32:** The coach changes the variable in test only after consolidation, invalidation, or proof that another variable became critical.
- **D-33:** Conflict between human outcome and compatible clip blocks `apply_protocol` and routes to short validation.
- **D-34:** Strong history with a weak current clip can provide context, but cannot authorize a strong plan without a usable current clip.
- **D-35:** Strong current clip with prior failed history should become a revised controlled test, not immediate apply.
- **D-36:** When current clip, trend, and outcomes align, the coach may use a firmer premium tone, but must still include explicit validation.

### Superficie e guardrails
- **D-37:** Post-analysis should show only the essential coach loop: coach verdict, primary focus, next block, and CTA for outcome or compatible validation.
- **D-38:** Dashboard should show the active loop: protocol in progress, pending feedback, next validation, and short memory summary.
- **D-39:** History is the audit surface: outcomes, revisions, conflicts, coach snapshots, compatible clips, precision checkpoints, and memory explanations.
- **D-40:** LLM rewrite is copy-only. It cannot change tier, priority, order, scores, thresholds, validations, attachments, status, blocker reasons, outcome facts, or technical payloads.
- **D-41:** Coach copy should be direct, demanding, premium, and honest. It may sound confident when evidence aligns, but it must not promise perfection, definitive sensitivity, rank gain, or guaranteed improvement.
- **D-42:** Phase 4 needs targeted tests and relevant golden/benchmark checks covering coach tier, primary focus, next block, outcome handling, historical conflict, LLM schema preservation, and memory behavior.

### the agent's Discretion
The planner/researcher may choose exact table names, enum names, migration shape, UI component boundaries, memory threshold constants, and test file organization. That discretion does not include weakening the evidence gates, hiding conflict, letting user outcomes override incompatible clip evidence, letting global memory override strict compatible memory, or allowing LLM output to alter technical facts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Project value, browser-first constraint, confidence honesty, monetization safety, and current milestone posture.
- `.planning/REQUIREMENTS.md` - Phase 4 requirements: COACH-01 through COACH-05.
- `.planning/ROADMAP.md` - Phase 4 goal and success criteria.
- `.planning/STATE.md` - Current project state: Phase 4 is ready to plan after completed Phases 1-3.
- `.planning/phases/01-measurement-truth-contract/01-CONTEXT.md` - Locked truth contract: weak evidence blocks strong claims; one clip is not final proof.
- `.planning/phases/02-benchmark-expansion/02-CONTEXT.md` - Benchmark and release gate decisions that must protect coach behavior.
- `.planning/phases/03-multi-clip-precision-loop/03-CONTEXT.md` - Strict compatible trends, active lines, checkpoints, and Phase 4 coach handoff decisions.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Browser-first pipeline, persistence model, dashboard/history integration points.
- `.planning/codebase/STACK.md` - Next.js, TypeScript, Drizzle, optional Groq/OpenAI-compatible LLM rewrite, and validation scripts.
- `.planning/codebase/TESTING.md` - Unit, golden, benchmark, release, and Playwright expectations.
- `.planning/codebase/CONCERNS.md` - Production caveats, including browser-first path and monetization/operations cautions.

### Domain And Research Docs
- `.planning/research/SUMMARY.md` - Product loop: analyze, train, repeat; coach outcome as a key metric.
- `.planning/research/PITFALLS.md` - Pitfall: coach sounds better but does not improve outcomes; prevention requires outcome tracking, memory, and benchmarks.
- `docs/SDD-coach-extremo.md` - Existing Coach Extremo design and current implemented V1 state.
- `docs/SDD-analise-spray.md` - Spray analysis limits and anti-claim posture around impossible certainty.
- `docs/SDD-inteligencia-de-sens.md` - Sensitivity intelligence, multi-clip consensus, validation, and single-clip limits.

### Existing Product Code
- `src/types/engine.ts` - Current `CoachPlan`, `CoachDecisionTier`, `CoachFocusArea`, `CoachPriority`, `CoachBlockPlan`, `AnalysisResult.coachPlan`, precision trend, and sensitivity feedback contracts.
- `src/core/coach-signal-extractor.ts` - Existing deterministic signal extraction for coach inputs.
- `src/core/coach-priority-engine.ts` - Existing priority ranking and dependency blocking.
- `src/core/coach-plan-builder.ts` - Existing tier resolution, action protocols, next block, stop conditions, and localized stored coach plan behavior.
- `src/core/coach-memory.ts` - Existing compatible memory snapshot, recurrent focus, precision trend, and sensitivity-outcome signal logic.
- `src/core/coach-engine.ts` - Legacy detailed coach feedback plus coach-plan attachment entrypoints.
- `src/core/analysis-result-coach-enrichment.ts` - Existing deterministic coach-plan attachment plus optional LLM rewrite.
- `src/core/coach-llm-contract.ts` - Schema-bound LLM contract that must remain fact-preserving.
- `src/core/coach-llm-adapter.ts` - Optional rewrite adapter that must preserve technical payloads.
- `src/server/coach/groq-coach-client.ts` - Optional OpenAI-compatible Groq client.
- `src/actions/history.ts` - Analysis save path, history reads, coach memory handoff, precision trend persistence, and existing sensitivity outcome action.
- `src/db/schema.ts` - `analysisSessions`, `sensitivityHistory`, `precisionEvolutionLines`, `precisionCheckpoints`, and persistence extension points.
- `src/app/analyze/results-dashboard.tsx` - Post-analysis coach summary and detailed evidence surface.
- `src/app/analyze/results-dashboard-view-model.ts` - Result verdict and coach plan view-model helpers.
- `src/app/history/page.tsx` - History audit surface with compatible precision lines and feedback summaries.
- `src/app/history/[id]/page.tsx` - Saved analysis detail with coach plan and checkpoint context.
- `src/app/history/[id]/sensitivity-acceptance-panel.tsx` - Existing sensitivity outcome UI pattern that Phase 4 can expand or replace for protocol outcomes.
- `src/actions/dashboard.ts` - Dashboard data source and principal trend/coach summary integration.
- `src/app/dashboard/dashboard-truth-view-model.ts` - Evidence-aware dashboard copy and next-action model.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/types/engine.ts` already has the core `CoachPlan` shape, so Phase 4 should extend/adapt it rather than create a parallel coach payload.
- `src/core/coach-plan-builder.ts` already resolves coach tiers and next-block protocols, making it the likely home for stricter aggressiveness and memory rules.
- `src/core/coach-memory.ts` already reads compatible history, sensitivity outcomes, recurring focuses, and precision trend signals. Phase 4 should make this memory outcome-aware and auditable.
- `src/actions/history.ts` already saves enriched results, builds memory snapshots, persists precision evolution, and has `recordSensitivityAcceptance`; this is the strongest existing pattern for protocol outcome persistence.
- `src/app/history/[id]/sensitivity-acceptance-panel.tsx` already demonstrates a small outcome-recording panel, but Phase 4 needs broader protocol/focus outcome semantics.
- Existing Phase 3 precision lines and checkpoints provide strict compatible evidence that the coach must use before strong action.

### Established Patterns
- Browser-first analysis remains the product path. Coach adaptation should use stored session evidence and avoid server video processing as a dependency.
- Deterministic code decides coaching truth; optional LLM only rewrites allowed copy fields.
- Analysis/coach changes require targeted Vitest tests and relevant benchmark/golden checks.
- User-facing confidence must remain honest: weak evidence, inconclusive states, blocked trend math, and conflicts stay visible.
- History is the natural audit surface; dashboard is the active-loop summary; post-analysis is the immediate next-action surface.

### Integration Points
- Protocol outcome contracts likely touch `src/types/engine.ts`, `src/db/schema.ts`, `src/actions/history.ts`, and history/detail UI.
- Outcome-aware memory likely extends `src/core/coach-memory.ts`, `src/core/coach-priority-engine.ts`, and `src/core/coach-plan-builder.ts`.
- LLM guardrails likely require tests around `src/core/coach-llm-contract.ts`, `src/core/coach-llm-adapter.ts`, and `src/server/coach/groq-coach-client.ts`.
- Benchmark expectations likely extend `src/types/benchmark.ts`, `scripts/run-benchmark.ts`, and existing coach/golden tests.
- UI surfaces likely touch `src/app/analyze/results-dashboard.tsx`, `src/app/history/page.tsx`, `src/app/history/[id]/page.tsx`, `src/actions/dashboard.ts`, and dashboard view models.

</code_context>

<specifics>
## Specific Ideas

- The user repeatedly asked for "perfeicao" for the coach. Translate that into operational rigor: strict evidence gates, conflict handling, auditable memory, and no impossible claims.
- The coach should feel demanding and premium, not motivational fluff. It should choose one thing that matters now and explain why.
- Human outcome is valuable but not final proof. Compatible clips and Phase 3 trend evidence decide whether improvement is confirmed.
- The loop should sell future paid value: evidence -> protocol -> outcome -> compatible validation -> memory -> better next protocol.
- The UI should not become a giant form. Outcome capture should be quick, while full audit stays in history.

</specifics>

<deferred>
## Deferred Ideas

- Full visual/UI refactor for a more premium app-wide experience belongs in a dedicated later phase.
- Monetization limits, Pro pricing, billing, entitlements, and paid feature gates belong to Phase 5.
- Team/coach multi-player review workflows belong to Phase 6.
- Real-time in-game coaching, overlays, and native/mobile experiences remain out of scope.

</deferred>

---

*Phase: 4-Adaptive Coach Loop*
*Context gathered: 2026-05-05T18:29:08.2978007-03:00*
