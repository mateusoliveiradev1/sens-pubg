# Phase 1: Measurement Truth Contract - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase defines the product truth contract for PUBG spray analysis: what the mastery score means, how confidence/coverage/clip quality gate recommendations, how result states are named, and how the analysis/dashboard surfaces should present honest next actions.

The phase must preserve the browser-first analysis path. It must not promise perfect sensitivity, guaranteed improvement, or definitive player skill from one clip. It may prepare contracts for future training programs and monetization, but it does not implement full multi-week programs, physical training, billing, or unlimited paid/free limits.

</domain>

<decisions>
## Implementation Decisions

### Score de spray mastery
- **D-01:** The spray mastery score means "reliable action", not just raw mechanical beauty. It should tell whether the product can safely act on the reading.
- **D-02:** The score must expose four visible pillars: control, consistency, confidence, and clip quality.
- **D-03:** Weak evidence caps the final/actionable mastery score, but the UI should still show the estimated mechanical potential so the user understands what looked strong versus what was not reliable enough.
- **D-04:** The primary score label is action-oriented: `Capturar de novo`, `Incerto`, `Testavel`, `Pronto`.
- **D-05:** The secondary label is the mechanical level of the analyzed spray: `Inicial`, `Intermediario`, `Avancado`, `Elite`. It must not claim the user's absolute player level.
- **D-06:** Mechanical level is based on observed spray mechanics. Confidence and clip quality decide how much the product can trust that level.
- **D-07:** Do not show the full score formula/preset weights to the user by default. Show the four pillars and a plain-language explanation of why the score landed there.
- **D-08:** High labels are conservative. `Elite` and `Pronto` require strong mechanics plus strong evidence.

### Regras de confianca / evidencia fraca
- **D-09:** Weak evidence blocks strong decisions. The app may explain signals, but must not recommend aggressive sensitivity changes or assert strong diagnostics when evidence is weak.
- **D-10:** Baseline threshold for leaving `Capturar de novo` and entering `Testavel`: confidence and coverage should be at least 60%, matching existing engine conventions. More sensitive metrics may require stricter gates.
- **D-11:** Moderate evidence can recommend a test protocol, not a definitive/apply-now change.
- **D-12:** `Pronto` / `apply-ready` requires strong evidence plus compatible repetition across clips. One excellent clip can be testable, but not treated as final proof.

### Linguagem das recomendacoes
- **D-13:** Recommendations must be premium, concrete, measurable, and validatable. They should be presented as the best protocol to test now, not as magical certainty.
- **D-14:** Strong recommendations follow this structure: diagnosis -> training block -> target/meta -> validation.
- **D-15:** In this phase, each analysis should return a short executable training block: duration, exercise, target, stop/continue criteria, and next-clip validation.
- **D-16:** Training blocks should be structurally ready to become pieces of future complete programs.
- **D-17:** When confident, use a firm but testable tone: "this is the best protocol to test now; validate on the next clip." Avoid absolute wording like "this is perfect" or "this is the guaranteed correct sens".

### Dashboard da verdade
- **D-18:** The analysis result must show the recommended action first: `Testavel`, `Capturar de novo`, `Pronto`, etc., with mastery score and pillars directly below.
- **D-19:** The current analysis result experience needs a redesign. It should feel like a premium clip report/coach, not a stacked list of laudos/cards with buried decisions.
- **D-20:** `/dashboard` is a separate product surface: a premium training cockpit / player evolution center. It shows progress, next action, routine, and context.
- **D-21:** The analysis screen and dashboard should share a visual language, but they serve different jobs: analysis = clip-specific report/coach; dashboard = progress and next training action.
- **D-22:** The dashboard's first priority is the next training step. Progress appears beside it as context, not as disconnected numbers.
- **D-23:** Dashboard information should use an executive summary plus layered detail: first next step, score, trend, and evidence; then history, arsenal, metrics, and technical detail.

### Redesign da tela de analise
- **D-24:** First fold after clip analysis: verdict + next block. It should show action state, mastery score, mechanical level, and recommended training block. Spray visualization appears immediately after as proof.
- **D-25:** Organize diagnosis, sensitivity, coach, and evidence as a narrative flow: what happened -> why it matters -> what to train -> how to validate.
- **D-26:** Technical evidence is audit proof in a secondary layer: tracking, coverage, lost frames, clip quality, residuals, and timeline remain available but do not lead the experience.
- **D-27:** Visual feel should be premium, clean, and decisive: fewer strong blocks, clear hierarchy, less faded text, and obvious actions. Technical/sport elements should prove decisions, not decorate the page.

### Loop da dashboard
- **D-28:** Dashboard habit loop: train -> record clip -> validate -> adjust.
- **D-29:** If a protocol is in progress, the dashboard prioritizes continuing or validating that protocol. If none exists, it recommends a new clip or the primary focus.
- **D-30:** Progress must combine trend + evidence. The product cannot say "you improved" without enough confidence/coverage to support the claim.
- **D-31:** Strong gamification is desired when it is real: protocol completed, validation clip recorded, improvement with sufficient evidence, consistency across compatible clips, useful weekly goals. Avoid login-only streaks or badges from weak evidence.
- **D-32:** Arsenal/weapon priority is contextual in this phase. Weapons appear when they help decide the current training action.
- **D-33:** Weapon visuals should use original, legally safe, recognizable SVG/silhouette assets for key weapons. Do not copy official PUBG/KRAFTON assets.

### Contrato dos programas completos
- **D-34:** Phase 1 should prepare structured training blocks for future programs: objective, duration, exercise, where to train, target, validation, and minimum evidence.
- **D-35:** Future complete programs should answer: how to train, what to train, where to train, and how to validate.
- **D-36:** Future program organization should be hierarchical: primary organization by player objective, with weapon and level as filters/context.
- **D-37:** Future program progression should be hybrid: user chooses the goal, and the system adjusts the next session by the biggest validated blocker.
- **D-38:** Prohibit weak program claims: no program may advance by saying the user improved without clip/evidence validation, and no training should be generic. Every block must connect to a blocker, weapon, distance/focus, or specific objective.

### Taxonomia final de estados
- **D-39:** Primary states: `Capturar de novo`, `Incerto`, `Testavel`, `Pronto`.
- **D-40:** Mechanical levels: `Inicial`, `Intermediario`, `Avancado`, `Elite`.
- **D-41:** User-facing diagnosis names should be friendly first; technical terms are secondary/hidden. Examples: `underpull` -> "spray subindo" / "puxada insuficiente"; `overpull` -> "spray descendo demais"; `excessive_jitter` -> "tremida lateral"; `horizontal_drift` -> "desvio lateral"; `inconsistency` -> "spray irregular"; `late_compensation` -> "reacao atrasada ao recuo".
- **D-42:** State copy should be direct and premium: short, clear, confident, and never exaggerated. Motivational language is allowed only when earned by real evidence.

### the agent's Discretion
No decisions were delegated blindly to the agent. The planner/researcher may choose implementation details that preserve the decisions above, existing architecture, and test/benchmark requirements.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Project value, constraints, monetization safety, browser-first posture.
- `.planning/REQUIREMENTS.md` - Phase 1 requirements: PREC-01, PREC-02, PREC-04.
- `.planning/ROADMAP.md` - Phase 1 goal and success criteria.
- `.planning/STATE.md` - Current project state and recommended workflow.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Browser-first analysis pipeline and major integration points.
- `.planning/codebase/STACK.md` - Next.js/React/TypeScript stack, analysis engine, key scripts.
- `.planning/codebase/TESTING.md` - Required test/benchmark expectations for analysis work.
- `.planning/codebase/CONCERNS.md` - Production/product concerns, including browser-first and monetization caveats.

### Code Contracts To Inspect
- `src/types/engine.ts` - Core contracts for metrics, evidence quality, diagnosis, sensitivity tiers, coach modes, coach plan, analysis result.
- `src/core/spray-metrics.ts` - Current `sprayScore`, `metricQuality`, `phaseQuality`, frame evidence, shot residuals.
- `src/core/diagnostic-engine.ts` - Inconclusive diagnosis and evidence-adjusted severity.
- `src/core/sensitivity-engine.ts` - Existing evidence thresholds, sensitivity recommendation tiers, `capture_again` / `test_profiles` / `apply_ready`.
- `src/core/coach-engine.ts` - Coach modes and conservative coaching behavior.
- `src/core/coach-plan-builder.ts` - Existing coach plan, next block, validation checks, protocol tiers.
- `src/core/coach-signal-extractor.ts` and `src/core/coach-priority-engine.ts` - Existing signal/priority model for future protocol selection.
- `src/app/analyze/results-dashboard.tsx` and `src/app/analyze/results-dashboard-view-model.ts` - Current clip result surface to redesign.
- `src/app/analyze/analysis-client.tsx` - Analysis orchestration and result assembly.
- `src/app/dashboard/page.tsx`, `src/actions/dashboard.ts`, `src/app/dashboard/trend-chart.tsx` - Current dashboard surface and metrics source.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SprayMetrics.metricQuality` and `SprayMetrics.phaseQuality` already provide coverage/confidence data that can feed the four score pillars.
- `SensitivityRecommendation.tier`, `evidenceTier`, and `confidenceScore` already model `capture_again`, `test_profiles`, and `apply_ready`; Phase 1 should align product labels with these instead of inventing a parallel truth system.
- `CoachPlan.nextBlock`, `CoachActionProtocol`, and `CoachValidationCheck` already provide a natural shape for the short executable training block.
- `results-dashboard.tsx` already renders sensitivity tiers, video quality, tracking transparency, timeline, coach plan, and detailed evidence; the work is mainly hierarchy, taxonomy, and visual redesign.
- `dashboard/page.tsx` and `actions/dashboard.ts` already compute score averages, recent deltas, trend, and weapon summaries; they can evolve into the training cockpit.

### Established Patterns
- Main analysis remains browser-first: upload/prep in `AnalysisClient`, frame extraction/tracking in workers, deterministic metrics/diagnosis/sensitivity/coach in `src/core`.
- Analysis/coach changes require targeted Vitest coverage and benchmark/golden checks. Default validation from AGENTS: `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`.
- The product already favors evidence transparency: confidence, coverage, lost frames, visible frames, quality diagnostics, and coach evidence exist in code/tests.
- Optional LLM copy rewriting must not alter technical facts, tiers, priorities, thresholds, or protocol truth.

### Integration Points
- Score contract likely touches `src/types/engine.ts`, `src/core/spray-metrics.ts`, `src/core/diagnostic-engine.ts`, `src/core/sensitivity-engine.ts`, `src/core/coach-plan-builder.ts`, and `src/app/analyze/results-dashboard*.tsx`.
- Dashboard cockpit likely touches `src/app/dashboard/page.tsx`, `src/actions/dashboard.ts`, `src/app/dashboard/trend-chart.tsx`, history/session data, and future protocol/outcome storage.
- Friendly diagnosis taxonomy should be centralized so analysis cards, coach copy, dashboard, history, benchmarks, and eventual programs use the same language.
- Weapon SVG assets should be original/static app assets or generated silhouettes, referenced from UI components without depending on official PUBG assets.

</code_context>

<specifics>
## Specific Ideas

- The user strongly dislikes the current analysis result screen shown in screenshots: it feels like stacked laudo cards, has too much faded text, buries the decision, and does not feel premium enough.
- The desired analysis result is a premium clip report/coach: decisive first fold, next block, visual proof, and audit evidence below.
- The current dashboard screenshot is closer to the desired direction, but the locked direction is not "more cards"; it is a training cockpit / evolution center with next action first.
- The user wants complete training programs later, including how to train, what to train, where to train, validation by clips, and possibly physical preparation/musculacao.
- The user asked about UGC/offical maps as future "where to train" context. This needs dedicated research before implementation because of product and legal/IP risk.
- The user wants recognizable weapon SVGs. Use original/legal-safe silhouettes, not official copied assets.

</specifics>

<deferred>
## Deferred Ideas

- Complete training programs: mechanical spray training, routine/progression, validation by clips, and physical preparation/musculacao as a future product capability.
- Monetization limits: free should not have infinite clips; Pro monthly should sell higher limits/fair use, full history, trends, deeper coach, protocols, and future programs. Paid value is evolution, plan, history, precision, and validation, not only clip count.
- Program "where to train" research: investigate Training Mode, official maps, UGC/custom maps, routes/locations, and legal-safe references/assets.
- Weapon SVG asset pack: create original and recognizable silhouettes for priority weapons.
- Broader diagnosis copy sweep: replace visible technical terms such as `underpull`, `overpull`, `inconsistency` with player-friendly Portuguese across UI, while keeping internal codes for tests/debug/audit.

</deferred>

---

*Phase: 1-Measurement Truth Contract*
*Context gathered: 2026-05-05*
