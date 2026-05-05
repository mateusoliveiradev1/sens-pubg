# Phase 3: Multi-Clip Precision Loop - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns isolated spray analyses into an honest multi-clip precision loop. It must create strict compatibility rules, a trend contract based on repeatable evidence, active evolution lines per compatible context, checkpoints, and visible multi-clip evidence that can feed the next coach phase.

This phase should feel like the foundation of a premium improvement system, but it is not the full coach overhaul, full training-program system, full sensitivity-engine refactor, or full visual/UI redesign. The user explicitly wants those areas to reach a much higher bar, but accepted the recommended path: Phase 3 ships a lean premium foundation; Phase 4 elevates coach/sens/training on top of it; a later dedicated phase handles complete visual/UI refactor.

The browser-first analysis path must remain intact. The product must not claim perfect sensitivity, guaranteed improvement, or impossible certainty. The internal quality bar should be extremely high, but public copy must stay evidence-based and honest.

</domain>

<decisions>
## Implementation Decisions

### Regra de compatibilidade rigida
- **D-01:** Trend comparison must be strict. A real trend can only compare clips that match the required technical context.
- **D-02:** Required compatibility fields are: same patch, weapon, optic/scope, stance, muzzle, grip, stock, and distance within a minimal near-exact tolerance.
- **D-03:** Patch mismatch always blocks precise trend comparison.
- **D-04:** Missing required metadata blocks that historical clip from the precise trend.
- **D-05:** Distance compatibility should be extremely strict. If distance is missing, ambiguous, or outside a minimal tolerance, trend comparison is blocked.
- **D-06:** Compatible clips must also have sufficient and comparable capture quality. A strong clip cannot be treated as trend-equivalent to a weak clip.
- **D-07:** Compatible clips must be the same spray type. Window, duration, cadence, and spray pattern must be equivalent enough for comparison.
- **D-08:** Incompatible clips do not receive exploratory trend math. The app must block the trend and explain exactly why.
- **D-09:** UI should frame strict blocking as "controle de precisao", not as a product failure.
- **D-10:** One compatible clip creates a precise baseline only. Two compatible clips can create an initial signal. Three or more compatible clips can support a stronger trend only if evidence gates pass.

### Significado da tendencia
- **D-11:** The primary trend metric is actionable mastery score because it already carries confidence, coverage, and quality.
- **D-12:** Mechanical score can appear as secondary context, but it must stay subordinate to actionable mastery.
- **D-13:** Trend output must include mandatory pillar deltas with short explanations: control, consistency, confidence, and clip quality.
- **D-14:** Recurring diagnoses explain the trend, but do not replace actionable mastery as the main verdict.
- **D-15:** Trend labels are conservative and evidence-based: `Baseline`, `Sinal inicial`, `Progresso validado`, `Regressao validada`, `Oscilacao`, and `Nao comparavel`.
- **D-16:** Use a conservative dead zone for actionable-score deltas. Small changes are `Oscilacao`, not progress/regression.
- **D-17:** `Progresso validado` requires enough evidence and no strong deterioration in any critical pillar.
- **D-18:** `Regressao validada` uses the same rigid bar: negative delta outside the dead zone plus sufficient evidence.
- **D-19:** Trend should compare baseline, latest clip, and a recent compatible window, not just two isolated points.

### Linha ativa e metodo experimental
- **D-20:** The product should maintain an active evolution line per compatible context, not just compare loose sessions.
- **D-21:** An active line contains baseline, current status, priority, last block, next validation, valid clips, and blocked clips.
- **D-22:** Important variable changes restart the line with a new baseline. The old line remains auditable but cannot mix into the new trend.
- **D-23:** Variables that break or restart the line include patch, weapon, scope, stance, attachments, distance, and strong sensitivity changes.
- **D-24:** Each compatible validation creates a checkpoint.
- **D-25:** Checkpoint states include baseline created, initial signal, in validation, validated progress, validated regression, oscillation, and consolidated.
- **D-26:** The active line must have a short measurable goal for the next checkpoint.
- **D-27:** The loop must use one primary variable in test per checkpoint.
- **D-28:** The variable in test is explicit and mandatory. Examples: sensitivity, vertical control, horizontal noise, consistency, capture quality, loadout, or validation.
- **D-29:** If the user changes a different variable before validating the current one, the line breaks and starts a new baseline.
- **D-30:** The UI should expose the experimental discipline simply: "variavel em teste" and "proxima validacao".
- **D-31:** The line should feel like an active mini-program per compatible context: objective, variable in test, current checkpoint, next block, and next validation.
- **D-32:** Maturity stages should show evolution without lying: `Baseline criado` -> `Sinal inicial` -> `Em validacao` -> `Progresso validado` -> `Consolidado`.
- **D-33:** When a line reaches `Consolidado`, the coach should choose the next variable based on evidence.
- **D-34:** The line should have a checkpoint timeline. Analysis/dashboard show a short summary; history shows the complete timeline.

### Superficies do produto
- **D-35:** The main moment where the user feels the loop is immediately after analyzing/saving a new clip.
- **D-36:** Post-analysis should show the clip verdict first, then the trend block, then technical details.
- **D-37:** The trend block after analysis should show verdict plus essential deltas, not a giant audit report.
- **D-38:** History is the audit surface. It should show compatible groups, baselines, windows, blocked clips, reasons, and checkpoint timelines.
- **D-39:** Compatible groups in history should be clickable, e.g. one group per strict context such as Beryl/red-dot/patch/distance/loadout.
- **D-40:** Dashboard is the executive evolution surface. It should show the current principal trend, next action, and general context without becoming the full technical audit.
- **D-41:** When a clip is not comparable, the reason must appear in both analysis and history.
- **D-42:** The CTA for continuing the loop should be explicit: `Gravar validacao compativel`.

### Coach, sensibilidade e treino handoff
- **D-43:** Multi-clip evidence must be visible to the user and used by the coach. The coach cannot feel magical or arbitrary.
- **D-44:** Phase 3 should produce a structured trend summary for Phase 4: compatible clip count, baseline, window, label, deltas, pillars, recurring diagnoses, blockers, and evidence level.
- **D-45:** If the current clip conflicts with strict trend evidence, the coach must lower aggressiveness and ask for validation.
- **D-46:** If trend validates progress, the coach should consolidate before changing a variable.
- **D-47:** If trend validates regression, the coach should return to the last reliable baseline and request compatible validation.
- **D-48:** The coach must explain when it is not aggressive: too few clips, conflict, weak quality, missing baseline, regression, or oscillation.
- **D-49:** The coach must cite compatible history explicitly with a clear summary.
- **D-50:** Recurrence in compatible clips drives priority unless a critical blocker overrides it.
- **D-51:** When trend changes coach priority, the UI must show a visible reason.
- **D-52:** `Sinal inicial` should drive controlled validation, not consolidation or aggressive variable changes.
- **D-53:** The coach output should separate measured evidence, coach reading, and next block.
- **D-54:** Every next block must be validatable by a new compatible clip.
- **D-55:** Coach voice should be direct, premium, and demanding. Avoid hype and vague motivation.
- **D-56:** With insufficient evidence, the coach prioritizes recapture/validation before a new training block. A light drill can only appear as safe secondary support.
- **D-57:** Coach, training, and sensitivity are the premium core of the product. They should operate as one integrated system: measured evidence -> sensitivity decision -> training block -> next compatible validation.
- **D-58:** If sensitivity and training point in different directions, multi-clip evidence decides the priority.
- **D-59:** Sensitivity recommendations must become stricter. Sensitivity can lead only with strong evidence or compatible trend support; otherwise it remains a test/validation protocol.
- **D-60:** Training must always connect to a measured blocker. No generic training as the primary product experience.
- **D-61:** Each training block should be complete: objective, where/mode, duration, exercise, execution, target, stop criteria, and compatible validation clip.

### Premium scope control
- **D-62:** Phase 3 should be planned as a lean premium foundation, not the full final product.
- **D-63:** The user wanted the maximal version, but accepted the recommended scope to keep execution feasible.
- **D-64:** The planner may choose exact thresholds, data models, component boundaries, and sequencing, but must preserve strict compatibility, honest evidence gates, active lines, checkpoints, and coach handoff.

### the agent's Discretion
The planner/researcher can decide the exact TypeScript contracts, database/migration shape, threshold constants, UI component split, and benchmark file organization. That discretion does not include weakening compatibility, broadening progress claims, hiding blockers, or turning Phase 3 into the full Phase 4 coach/UI overhaul.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Project value, constraints, browser-first posture, confidence honesty, and monetization safety.
- `.planning/REQUIREMENTS.md` - Phase 3 requirement: PREC-03.
- `.planning/ROADMAP.md` - Phase 3 goal and success criteria.
- `.planning/STATE.md` - Current project state and active focus.
- `.planning/phases/01-measurement-truth-contract/01-CONTEXT.md` - Locked truth contract: weak evidence blocks strong claims, single clip is not final proof, actionable mastery labels.
- `.planning/phases/02-benchmark-expansion/02-CONTEXT.md` - Benchmark/release gate decisions that protect precision and truth-contract behavior.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Browser-first analysis pipeline, persistence model, dashboard/history integration points.
- `.planning/codebase/STACK.md` - Next.js/TypeScript stack, scripts, and analysis/AI dependencies.
- `.planning/codebase/TESTING.md` - Unit, golden, benchmark, and release test expectations.
- `.planning/codebase/CONCERNS.md` - Browser-first and production caveats.
- `.planning/codebase/CONVENTIONS.md` - TypeScript, server action, database, styling, and testing conventions.

### Existing Product Code
- `src/actions/history.ts` - Saves analysis results, reads prior sessions, applies sensitivity history convergence, builds coach memory, and returns history sessions.
- `src/core/coach-memory.ts` - Existing compatible-session memory model and distance/loadout/patch checks.
- `src/core/sensitivity-history-convergence.ts` - Existing multi-session sensitivity convergence and conflict behavior.
- `src/actions/dashboard.ts` - Current dashboard trend evidence, latest mastery, and coach next-block source.
- `src/app/history/page.tsx` - Current history surface with feedback summaries and analysis session list.
- `src/app/dashboard/dashboard-truth-view-model.ts` - Evidence-aware dashboard copy and next-action model.
- `src/app/analyze/results-dashboard.tsx` - Clip report surface where the post-analysis trend block likely connects.
- `src/app/analyze/results-dashboard-view-model.ts` - Existing mastery/report view model.
- `src/app/history/analysis-result-hydration.ts` - Backward-compatible hydration of stored analysis results.
- `src/types/engine.ts` - Analysis result, mastery, sensitivity, coach, and history-related type contracts.
- `src/db/schema.ts` - `analysisSessions`, `sensitivityHistory`, and related persistence schema.

### Domain And Prior Specs
- `docs/SDD-analise-spray.md` - Spray analysis domain, historical comparison notes, and compatibility rule references.
- `docs/SDD-inteligencia-de-sens.md` - Sensitivity precision direction, multi-clip consensus, before/after validation, and single-clip limits.
- `docs/SDD-coach-extremo.md` - Coach memory/history, history conflict downgrade, tier rules, and coach-plan direction.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/actions/history.ts` already fetches recent prior sessions, filters by patch/weapon/scope, enriches sensitivity with history convergence, builds coach memory, and persists `fullResult`.
- `src/core/coach-memory.ts` already filters compatible sessions by patch, loadout, and distance tolerance, and emits history signals.
- `src/core/sensitivity-history-convergence.ts` already models aligned/mixed/conflicting historical sensitivity evidence.
- `src/actions/dashboard.ts` already hydrates recent mastery, computes trend evidence state, and protects progress claims with confidence/coverage.
- `src/app/history/analysis-result-hydration.ts` already supports backward-compatible stored-result hydration.
- Existing `analysisSessions` rows include patch, weapon, scope, stance, attachments, distance, scores, diagnoses, and `fullResult`, which are likely anchors for strict compatibility and active-line construction.

### Established Patterns
- Browser-first analysis remains the primary path. Multi-clip work should use stored session evidence and avoid server-side video processing dependency.
- Analysis/coach changes require targeted Vitest coverage plus relevant benchmark/golden checks.
- Domain contracts live in `src/types` and deterministic decisions live in `src/core`.
- UI currently uses analysis, history, and dashboard as separate surfaces; Phase 3 should sharpen their roles rather than collapse them into one giant page.
- Weak evidence, inconclusive behavior, and blocked recommendations must remain visible.

### Integration Points
- Trend contract/types likely belong near `src/types/engine.ts` and `src/core` as a deterministic model.
- Active-line and checkpoint persistence likely touches `src/db/schema.ts`, Drizzle migrations, and server actions.
- Saving analysis likely needs to resolve/update compatible active lines in `src/actions/history.ts`.
- Post-analysis display likely connects to `src/app/analyze/results-dashboard.tsx` and its view model.
- History audit likely connects to `src/app/history/page.tsx`, `src/app/history/[id]/page.tsx`, and hydration helpers.
- Dashboard summary likely connects to `src/actions/dashboard.ts` and `src/app/dashboard/dashboard-truth-view-model.ts`.
- Tests should cover strict compatibility, blocked reasons, baseline/signal/trend states, active-line reset, checkpoint updates, dashboard/history/analyze contracts, and benchmark gate preservation.

</code_context>

<specifics>
## Specific Ideas

- The user repeatedly pushed for "perfeicao" as an internal quality bar. Translate this into strict precision, honest gates, high polish, and strong validation, not public claims of impossible certainty.
- Coach, sensitivity, and training are the premium core of the product. Phase 3 should set them up with reliable multi-clip evidence.
- The product should feel like the player is evolving for real, but only when evidence supports that feeling.
- The premium loop should feel like an active program per compatible context: objective, variable in test, checkpoint current, next block, and next validation.
- The UI needs a future full refactor/premium pass, but Phase 3 should only build the surfaces necessary for the loop.

</specifics>

<deferred>
## Deferred Ideas

- Deeply improve the core spray-clip analysis engine in future precision work, with targeted tests, golden fixtures, and benchmark gates.
- Phase 4 should elevate coach, sensitivity, and training into the true premium system using Phase 3's multi-clip foundation.
- Create a dedicated visual/UI refactor phase for complete premium polish, instead of expanding Phase 3 into a full redesign.

</deferred>

---

*Phase: 3-Multi-Clip Precision Loop*
*Context gathered: 2026-05-05*
