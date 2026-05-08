# Phase 9: PUBG Spray Lab Session Runner And Benchmark - Context

**Gathered:** 2026-05-08T02:00:48.1159303-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 builds the PUBG-focused Spray Lab layer on top of the Phase 8 complete training protocol contract. It turns the protocol into a guided, premium, evidence-bound session runner with drill lanes, session fidelity, contextual Spray Lab scoring, explicit compatible-clip validation, benchmark snapshots, dashboard/history/coach handoff, and a strict No False Done verification gate.

The product mental model for this phase is:

**Analisar -> Treinar -> Validar -> Evoluir**

- **Analisar:** upload a clip, detect spray truth, and create a coach/protocol decision.
- **Treinar:** use Spray Lab to execute the current protocol in a guided session.
- **Validar:** upload the next compatible clip through an explicit validation flow, not a loose re-analysis.
- **Evoluir:** dashboard and history show current state, audit, validated progress, blockers, and next action.

This phase must not become a generic course product, a broad aim trainer, a weekly/monthly guided program system from Phase 10, a social premium system from Phase 11, team/coach workflows from Phase 13, a global player ranking product, or a backend video-processing path. It must preserve browser-first analysis, confidence honesty, weak-evidence downgrades, privacy-minimal data, entitlement truth, and no perfect-sensitivity/guaranteed-improvement claims.

</domain>

<decisions>
## Implementation Decisions

### Spray Lab Session Runner
- **D-01:** Spray Lab sessions are guided by the user's current complete protocol from Phase 8. The Lab is the executor of the protocol, not a replacement for analysis or coach truth.
- **D-02:** The session flow has four acts: `preparar`, `executar`, `fechar_resultado`, and `validar_clip_compativel`.
- **D-03:** The primary UI mode is a command/cockpit experience with technical audit in drawers/disclosures. The main screen must not become a dense technical report while the user is training.
- **D-04:** The runner uses an assisted timer with full manual control. The Lab guides reps, sprays, pauses, checks, and next action, but the user can pause, repeat, skip, stop, mark a problem, or end early.
- **D-05:** Session fidelity is a first-class concept. It measures whether the user maintained variables, reps, pauses, preparation, and execution well enough for the session to feed coach/benchmark.
- **D-06:** Breaking fidelity causes an honest downgrade instead of punishment. A session can remain useful as practice or weak evidence, but cannot become a strong benchmark or technical validation when critical variables changed.
- **D-07:** The final session screen is a premium two-layer summary: clean fidelity/result/next-action first, then audit drawers for reps, pauses, variables, criteria, downgrade reasons, and benchmark/coach impact.
- **D-08:** Fatigue, pain, confusion, variable changes, skipped reps, excessive pauses, or early stop do not count as player failure. They reduce evidence strength, adjust dose, and create a repair path.

### Session UX And Route IA
- **D-09:** Spray Lab gets a real route, expected as `/spray-lab`, but its best entry path is contextual CTAs from result, dashboard, and history.
- **D-10:** The route opens in the most useful state: continue active session, start from recent protocol, close pending result, record compatible validation, or show a short premium empty state when no analysis exists.
- **D-11:** Navigation must not make the app feel like disconnected surfaces. Phase 9 must consolidate the product IA around `Analisar -> Treinar -> Validar -> Evoluir`.
- **D-12:** The session cockpit is mobile-first and every state has one dominant action. Each state answers: what is happening, what to do now, how much remains, what could invalidate the session, and what safe action to take if something went wrong.
- **D-13:** Required session states include at least: `Preparar`, `Pronto para spray`, `Spray em andamento`, `Descanso`, `Checagem rapida`, `Resultado`, and `Validar clip`.
- **D-14:** Dashboard is the command center, not a full report. History is the audit/evolution surface, not the primary session runner. Analyze remains clip ingestion and reading, not Lab execution.
- **D-15:** Copy should avoid loose "leitura" language. Use clear loop terms: analysis/reading is what the clip showed, Lab/training is what the user did, validation is the second compatible clip, and evolution is comparison over time.

### Drill Catalog And Lab Lanes
- **D-16:** The Lab uses stable drill families plus polished PUBG lanes/presets. It must not create an unmaintainable manual matrix for every weapon/optic/distance combination.
- **D-17:** Existing Phase 8 drill families remain the technical base: capture, validation, vertical control, horizontal control, timing, consistency, sensitivity, and loadout.
- **D-18:** Spray Lab presents these as premium lanes/presets such as `Beryl M762 3x 50m vertical`, `M416 sustain 40-60m`, `horizontal spray lane`, `first 10 bullets`, `one-variable sensitivity test`, and `compatible validation`.
- **D-19:** Lanes are context adapters around stable `drillId` values. User-facing names are polished pt-BR; stable IDs remain invisible and testable.
- **D-20:** Training Mode remains the default controlled environment. UGC can appear as optional/advanced status-aware presets when available, never as a dependency for the core runner.

### Compatible Validation Flow
- **D-21:** The second clip must not be a loose "go to Analyze again" flow. The app needs an explicit `Gravar validacao compativel` CTA.
- **D-22:** The validation CTA appears from result, dashboard, history, and the final Spray Lab session screen.
- **D-23:** Validation mode preloads the base context: weapon, optic, distance/range, stance, attachments, sensitivity/DPI/VSM/FOV where available, patch, protocol/drill, and base analysis/session.
- **D-24:** The upload surface must show the validation target, for example `Validando Beryl M762 · 3x · 50m · controle vertical`.
- **D-25:** Before analysis, the user confirms whether the same variables were preserved. Changed variables do not discard the attempt; they downgrade it to practice/weak evidence and explain what no longer counts.
- **D-26:** After analysis, the second clip is compared automatically with the base analysis/protocol and returns states such as `validacao_confirmada`, `sinal_promissor`, `sem_mudanca_clara`, `regressao_validada`, `nao_compativel`, or `inconclusivo`.
- **D-27:** If required context is missing, the Lab shows exactly what is missing before recording or validating. It should not force the user to rediscover profile/setup fields manually.

### Blocked Clips And Repair UX
- **D-28:** Spray Lab must never show honest evidence blockers as generic `Erro na Analise`. Generic error is reserved for true technical failures.
- **D-29:** Evidence blockers become premium repair states: `Validacao bloqueada`, `Clip inconclusivo`, `Captura fraca`, `Contexto incompativel`, `Nao contou como benchmark`, or `Tentativa salva como pratica`.
- **D-30:** Every blocked/repair state answers four questions: what happened, why it matters, what can still be used, and how to fix it now.
- **D-31:** Repair CTAs include context-aware actions such as re-record compatible validation, see clip checklist, upload continuous cut, keep as practice, or return to Lab.
- **D-32:** During discussion, a real false-positive risk was found in the current pre-tracking validity gate: absolute pixel thresholds can classify high-resolution legitimate spray movement as `flick`, `target_swap`, or `hard_cut`. Phase 9 planning must treat proportional/video-aware blocker logic and repair UX as product-critical, not cosmetic.

### Spray Lab Index And Benchmark
- **D-33:** Spray Lab has an index/score, but it is contextual and evidence-bound. It is not an absolute player grade.
- **D-34:** Use a product name such as `Indice Spray Lab` or `Score do contexto`, always attached to context: weapon, optic, distance/range, stance, protocol, patch, and evidence level.
- **D-35:** The index has a provisional score and a validated score. Provisional score may come from session fidelity and drill execution; validated score requires compatible clip evidence.
- **D-36:** Score composition should be explicit and humble. A recommended model is session fidelity, drill execution, rep consistency, and compatible validation, with validation carrying strength only when present.
- **D-37:** The UI may show states like `baseline`, `em validacao`, `sinal promissor`, `progresso validado`, `regressao validada`, `bloqueado por fidelidade`, and `inconclusivo`.
- **D-38:** The Lab must avoid global rankings, "voce e pro", final skill claims, guaranteed improvement, or a single global player score before there is enough corpus and policy to support it.
- **D-39:** Benchmark snapshots must record version, context key, score components, evidence level, fidelity tier, validation status, and downgrade/blocker reasons.

### Progression And Difficulty
- **D-40:** Spray Lab progression is adaptive by strict context, not a global player level.
- **D-41:** Each context has a refinement line, for example `Beryl · 3x · 50m · vertical`.
- **D-42:** Recommended progression states are `Captura limpa`, `Base controlada`, `Consistencia inicial`, `Validacao compativel`, `Progresso validado`, `Refinamento avancado`, `Transferencia pratica`, and `Consolidado`.
- **D-43:** Difficulty changes reps, duration, pauses, target, distance, and success criteria only when evidence converges. It must not increase because the user merely self-reported improvement.
- **D-44:** Difficulty stabilizes or downgrades when fatigue/pain, confusion, variable changes, weak capture, inconclusive validation, or outcome/clip conflict appears.
- **D-45:** Progression visuals should feel like a premium training lab: technical line, checkpoints, evidence, context, blockers, and next action. Avoid childish gamification and empty XP.

### Free, Pro, Privacy, And Entitlements
- **D-46:** The product cut is "Free premium, Pro profundo." Free must not feel broken.
- **D-47:** Free can execute a basic guided session from the current protocol, use a simple assisted timer, see preparation checklist, provisional contextual score, short result, and validation CTA.
- **D-48:** Pro unlocks full runner depth, audit drawers, advanced lanes/presets, session history, validated Spray Lab index, benchmark by context, comparison between sessions, and deeper dashboard/history/coach continuity.
- **D-49:** Existing entitlement keys `spray_lab.session_runner` and `spray_lab.benchmarks` are the expected access hooks. Planning may refine exact cuts but must keep server-owned entitlement truth.
- **D-50:** Persist only evidence-needed data: context, fidelity, reps, pauses, status, manual interventions, reason codes, score snapshots, validation links, and optional short notes.
- **D-51:** Do not persist raw Lab video, detailed pain history, health profile, physical routine, body metrics, or sensitive medical details. Pain/fatigue becomes a minimal safety reason code.
- **D-52:** Clips continue through the browser-first analysis path. Spray Lab does not introduce backend video compute.

### Coach, Dashboard, History, And Learning
- **D-53:** Spray Lab is the protocol executor; dashboard is the next-action command center; history is the audit/evolution surface; coach consumes Lab signals through evidence hierarchy.
- **D-54:** Evidence hierarchy remains: session result/fidelity is execution evidence, compatible clip is technical proof, and TDM/real-match transfer is practical transfer only.
- **D-55:** Coach can adapt individual next steps from Spray Lab sessions, outcomes, fidelity, compatible validations, and conflicts, but must lower aggressiveness under weak or conflicting evidence.
- **D-56:** Spray Lab may feed an internal benchmark and individual training memory, but it must not autoalter global engine thresholds/models in production without permissioned corpus, review, benchmark gates, and baseline update discipline.
- **D-57:** No private clips may be used for global training/benchmark improvement without explicit permission/trainability consent.

### Verification And No False Done
- **D-58:** Phase 9 requires a dedicated verification gate, expected as `npm run verify:phase9:spray-lab` or equivalent.
- **D-59:** Tests must prove session creation from result/dashboard/history, context preload, timer/reps/pauses/interventions, fidelity scoring, downgrade behavior, provisional vs validated score, compatible validation, incompatible clip blocking, repair states, Free/Pro cuts, dashboard next action, history audit, coach handoff, and benchmark snapshots.
- **D-60:** Required validation includes focused unit/contract tests, relevant golden/benchmark checks, `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`, and Playwright/screenshot evidence for desktop and mobile session flows.
- **D-61:** If any central Lab flow is only visually present but not proven through tests/evidence, final status cannot be `Delivered`; maximum status is partial with explicit gaps.
- **D-62:** The verification matrix must include happy path, weak evidence, invalid/inconclusive clip, variable changed, fatigue/pain, Free, Pro, no history, active session, pending outcome, validation needed, compatible validation success, incompatible validation, and dashboard/history surfaces.

### the agent's Discretion
The researcher/planner may choose exact route nesting, component names, schema/table names, field names, score constants, visual implementation, exact copy, query-param structure, and plan wave count.

That discretion does not include making Spray Lab a generic course product, weakening evidence honesty, hiding blockers, making Free broken, creating an absolute player grade, adding global rankings prematurely, using self-report as technical proof, storing sensitive health data, autoaltering global engine logic without gates, relying on backend video compute, or marking the phase done without the dedicated Spray Lab verification matrix.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Core product value, browser-first constraint, confidence honesty, commercial claims posture, and paid value direction.
- `.planning/REQUIREMENTS.md` - Phase 9 mapped requirements: PREC-03, BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-03.
- `.planning/ROADMAP.md` - Phase 9 goal/success criteria and neighboring Phase 8/10 boundaries.
- `.planning/STATE.md` - Current focus, delivered Phase 8 state, and remaining commercial corpus/Stripe caveats.

### Prior Phase Decisions
- `.planning/phases/03-multi-clip-precision-loop/03-CONTEXT.md` - Strict compatible trend rules, active evolution lines, checkpoint semantics, and comparison blockers.
- `.planning/phases/04-adaptive-coach-loop/04-CONTEXT.md` - Outcome memory, evidence hierarchy, coach aggressiveness, conflict behavior, and LLM copy-only rules.
- `.planning/phases/06-core-accuracy-and-pro-validation-hardening/06-CONTEXT.md` - `spray-truth-v2` decision ladder, invalid/inconclusive behavior, confidence calibration, and commercial claim safety.
- `.planning/phases/07-premium-visual-ui-ux/07-CONTEXT.md` - Premium loop UX, route roles, Free remains useful, Pro depth, state matrix, mobile polish, and No False Perfect evidence.
- `.planning/phases/08-complete-training-protocols/08-CONTEXT.md` - Complete protocol contract, drill families, downgrade behavior, validation loop, transfer rules, preparation safety, and Phase 9 boundary.
- `.planning/phases/08-complete-training-protocols/08-VERIFY-CHECKLIST.md` - Delivered Phase 8 evidence, migration status, protocol snapshot/revision/transfer coverage, and current gate expectations.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Browser-first pipeline, persistence model, dashboard/history/action architecture, and release readiness.
- `.planning/codebase/STACK.md` - Next.js App Router, strict TypeScript, Drizzle, Vitest/Playwright, Vercel, and optional LLM rewrite stack.
- `.planning/codebase/TESTING.md` - Unit, integration, golden, benchmark, Playwright, and release verification expectations.
- `.planning/codebase/CONCERNS.md` - Browser-first/backend video caveat, production readiness concerns, i18n partial state, and local secrets warning.
- `.planning/codebase/CONVENTIONS.md` - Strict TypeScript/domain unions, server actions, CSS module/Tailwind conventions, and pt-BR copy posture.
- `.planning/codebase/STRUCTURE.md` - Source directories, routes, core modules, schema, tests, docs, and naming patterns.

### Existing Product Code
- `src/types/engine.ts` - Complete protocol, coach outcomes, analysis decision, precision compatibility, and future Lab-adjacent contracts.
- `src/core/training-protocols.ts` - Complete protocol builder, downgrade rules, validation/transfer plans, and tier dose logic.
- `src/core/training-protocol-drills.ts` - Current stable drill families and `future_spray_lab` environment hook.
- `src/core/complete-training-protocol-validation.ts` - Compatible validation checklist generation from complete protocol context.
- `src/actions/history.ts` - Save-analysis path, precision trend/checkpoint persistence, outcome recording, protocol revisions, and transfer records.
- `src/actions/dashboard-active-coach-loop.ts` - Active coach loop state and complete protocol summary for dashboard next actions.
- `src/actions/dashboard.ts` - Dashboard data source and access-gated active coach loop.
- `src/app/analyze/analysis-client.tsx` - Browser-first upload/analysis orchestration, current pre-tracking validity block, and validation-flow integration target.
- `src/app/analyze/results-dashboard.tsx` - Post-analysis result/coach/protocol surface and CTA integration target.
- `src/app/analyze/results-dashboard-view-model.ts` - Result/trend/lock/protocol view-model patterns.
- `src/app/analyze/complete-training-protocol-view-model.ts` - Complete protocol Free/Pro display model and environment labels.
- `src/app/dashboard/page.tsx` - Dashboard command center and active protocol rendering.
- `src/app/history/page.tsx` - History/evolution list surface.
- `src/app/history/[id]/page.tsx` - Saved analysis detail, protocol outcome, revision, transfer, and precision checkpoint audit surface.
- `src/app/history/history-protocol-view-model.ts` - History protocol validation/transfer view-model.
- `src/lib/premium-projection.ts` - Free/Pro projection, lock copy, and existing Spray Lab entitlement titles.
- `src/types/monetization.ts` - Product entitlement keys including `spray_lab.session_runner` and `spray_lab.benchmarks`.
- `src/core/spray-window-detection.ts` - Current spray validity gate; discussion surfaced need for proportional blocker thresholds and repair-aware UX.
- `src/core/analysis-decision.ts` - `spray-truth-v2` permission matrix and invalid/inconclusive decision levels.
- `src/types/benchmark.ts` and `scripts/run-benchmark.ts` - Benchmark schema/runner and complete protocol truth expectations.
- `package.json` - Required scripts and expected location for a future `verify:phase9:spray-lab` gate.

### Domain And Product Docs
- `docs/SDD-coach-extremo.md` - Coach behavior, protocol handoff, memory, LLM copy limits, and benchmark expectations.
- `docs/SDD-analise-spray.md` - Spray analysis limits, confidence/coverage, evidence framing, and anti-overclaim posture.
- `docs/SDD-inteligencia-de-sens.md` - Sensitivity evidence, multi-clip validation, and confidence-governed aggressiveness.
- `docs/benchmark-runner.md` - Benchmark runner workflow and safety expectations.
- `docs/benchmark-reports/latest.md` - Current benchmark/calibration readiness signal.

### External Context From Prior Research
- `https://pubg.com/en/news/9855` - PUBG 2026 roadmap context for UGC expansion and professional training range direction.
- `https://pubg.com/en/news/8865` - PUBG UGC Alpha context; UGC is optional/advanced, not required for core Lab execution.
- `https://pubg.com/en/news/1713` - Official training mode/custom training context used by prior planning.
- `https://developer.pubg.com/tos?locale=en` - PUBG policy/trademark constraints; avoid official affiliation and unsafe asset/data monetization.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CompleteTrainingProtocol` in `src/types/engine.ts`: the natural base for Spray Lab session plans, validation checklist, context keys, and audit.
- `TRAINING_PROTOCOL_DRILLS` in `src/core/training-protocol-drills.ts`: already has stable drill families and environment labels, including `future_spray_lab`.
- `buildCompleteTrainingProtocol` in `src/core/training-protocols.ts`: current deterministic source of dose, execution steps, preparation, validation, transfer, and downgrade reasons.
- `complete_training_protocol_revisions` and `training_protocol_transfer_records` in `src/db/schema.ts`: Phase 8 persistence shows the right pattern for Lab session audit and transfer records.
- `precisionEvolutionLines` and `precisionCheckpoints`: existing strict compatible evolution model that Lab benchmark/progression should connect to rather than duplicate loosely.
- `buildDashboardActiveCoachLoop`: existing dashboard command state can be extended to active Lab session / validation needed / pending result.
- `premium-projection.ts`: already names `spray_lab.session_runner` and `spray_lab.benchmarks`, so entitlement integration has an obvious home.
- `analysis-client.tsx`: current analysis flow is the integration target for preloaded compatible-validation mode.

### Established Patterns
- Deterministic code owns truth; optional LLM only rewrites allowed copy.
- Browser-first analysis stays mandatory. Spray Lab guides training and validation around clips but does not process videos on the backend.
- Free remains useful and polished; Pro unlocks continuity, audit, benchmark depth, and advanced Lab lanes.
- Weak evidence becomes downgrade/repair guidance, not a fake strong result.
- History is the full audit surface; dashboard is current command; result is immediate post-analysis decision.
- Golden/benchmark gates are product safety gates, not optional QA polish.
- Strict TypeScript unions and versioned contracts are preferred for domain truth.

### Integration Points
- Add a Spray Lab route, likely `src/app/spray-lab`, with page/view-model/tests and mobile-first session cockpit UI.
- Add server actions for creating/updating/completing Lab sessions, recording reps/interventions, creating benchmark snapshots, and linking validation clips.
- Add Drizzle schema/migration for Lab sessions, session events/blocks, benchmark snapshots, and validation links.
- Extend result/dashboard/history CTAs to start/continue Lab, close session outcome, and record compatible validation.
- Extend `/analyze` or add a Lab validation entry mode that preloads base context and writes validation linkage.
- Extend premium projection and entitlement checks for `spray_lab.session_runner` and `spray_lab.benchmarks`.
- Extend benchmark/golden coverage for Lab fidelity, provisional/validated score, and compatible validation behavior.
- Add a deterministic Phase 9 verification script and Playwright/state-matrix screenshots.

</code_context>

<specifics>
## Specific Ideas

- The user wants "perfeicao extrema", "muito polido", and "testes perfeitos." Interpret this as explicit contracts, state matrices, screenshots, benchmarks, and No False Done evidence, not vague visual polish.
- The app currently feels confusing because "analise", "leitura", "historico", dashboard, protocol, validation, and future Lab can feel like separate surfaces. Phase 9 must make the loop understandable: `Analisar -> Treinar -> Validar -> Evoluir`.
- The second clip validation flow is a major user pain. It must be explicit and context-aware, not "send another clip manually."
- During discussion, the user showed a production screenshot where a real-looking spray was blocked as `flick`, `target_swap`, and `hard_cut`. The immediate root cause found locally was absolute pixel thresholds in pre-tracking validity; source now scales displacement thresholds by frame size and focused/full gates passed locally. Phase 9 still needs premium blocked-state UX and stronger validation-flow design around this class of issue.
- A score is desirable, but only as contextual/evidence-bound `Indice Spray Lab`, with provisional and validated states. It must never become a global "player skill score."
- Free should feel premium and valuable; Pro should feel deeper, more continuous, and more auditable.
- The system should feel intelligent through individual adaptation and audited memory, but it must not self-modify global engine behavior without corpus consent, review, and gates.

</specifics>

<deferred>
## Deferred Ideas

- Full weekly/monthly adaptive programs remain Phase 10.
- Social Pro/community premium loops remain Phase 11.
- Revenue operations/admin funnel metrics remain Phase 12.
- Team/coach review workflows remain Phase 13.
- Global player rankings or absolute skill grades are deferred until enough permissioned corpus, policy, and evidence exist.
- Autonomous global model/threshold learning from private clips is deferred and must require explicit consent, human/specialist review, benchmark gates, and baseline discipline.

</deferred>

---

*Phase: 9-PUBG Spray Lab Session Runner And Benchmark*
*Context gathered: 2026-05-08T02:00:48.1159303-03:00*
