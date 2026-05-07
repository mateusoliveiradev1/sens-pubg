# Phase 8: Complete Training Protocols - Context

**Gathered:** 2026-05-07T16:03:23.2642712-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 turns the existing coach next-block advice into complete, practical, premium PUBG training protocols.

This phase delivers a rich, deterministic protocol contract, a polished Free/Pro protocol experience, PUBG-specific drill families, evidence-bound downgrade behavior, safe physical preparation/ergonomics guidance, structured outcomes, compatible validation clips, real-match transfer validation, and No False Done verification.

This phase does not build the full Phase 9 Spray Lab/session runner, Phase 10 weekly/monthly guided programs, Phase 11 social premium loop, or a full physical training/medical module. It prepares contracts for those later phases without depending on them.

The protocol must remain browser-first, deterministic, evidence-bound, confidence/coverage-aware, and honest. It must never claim perfect sensitivity, guaranteed improvement, rank gain, medical benefit, or final certainty.

</domain>

<decisions>
## Implementation Decisions

### Complete Protocol Contract
- **D-01:** Phase 8 creates a new rich complete-protocol entity. It must not merely beautify the current `CoachBlockPlan` three-step `nextBlock`.
- **D-02:** Use a dual contract: a complete technical contract for the engine/tests and a premium summarized view model for UI.
- **D-03:** Pro users see a clean, polished summary first. Technical evidence, criteria, thresholds, blocked fields, diagnostic links, and audit details must be available through disclosure/audit views.
- **D-04:** Free must show real value and polish: focus, duration, essential steps, compact preparation, and basic validation. Pro unlocks reps, location, target, stop/continue, full preparation, audit, revision, real-match transfer, and complete ficha.
- **D-05:** Complete-protocol fields are rigid with honest fallback. If evidence is missing, the system downgrades to recapture, short test, or stabilization instead of inventing a pretty protocol.
- **D-06:** Missing context such as weapon, optic, distance, stance, or attachments blocks only dependent decisions. The rest of the protocol remains useful and explains what is missing.
- **D-07:** Store a versioned protocol snapshot per analysis. Future changes do not rewrite old protocols.
- **D-08:** Allow explicit protocol revisions. A revision must show reason, new evidence, changed fields, and whether the tier became stronger or more conservative.
- **D-09:** Use stable technical `drillId` values plus dynamic composition. User-facing names are premium pt-BR; IDs remain invisible and stable for engine/tests/benchmarks.
- **D-10:** One executable protocol runs at a time, driven by the primary focus. Secondary focuses appear as observations or anti-mixing notes, not extra drills inside the same validation block.
- **D-11:** Prescribe duration and volume by coach tier: `capture_again` around 5 minutes, `test_protocol` around 10-12, `stabilize_block` around 15-18, and `apply_protocol` around 18-25, with reps and pauses by drill type.
- **D-12:** Protocol revision UI uses before/after comparison: original protocol, what changed, why it changed, new evidence, and tier direction.
- **D-13:** Complete protocol UI must follow a premium ficha rubric: first fold answers what to do now, technical fields live behind disclosure, no card exceeds 3-5 items, one contextual CTA dominates, evidence reason remains visible, and repetitive copy is forbidden.

### PUBG-Specific Drills
- **D-14:** Official Training Mode is the default controlled environment for Phase 8 protocols.
- **D-15:** UGC is supported as optional advanced/experimental training presets/maps when available, never as a dependency for protocol execution.
- **D-16:** The protocol environment contract should support `training_mode`, `training_mode_custom`, `ugc_range`, aim/sound lab style preparation, TDM warmup, real-match transfer notes, and `future_spray_lab`.
- **D-17:** Phase 8 prepares the contract for Phase 9 Spray Lab but does not build the session runner, guided sessions, or benchmark runner.
- **D-18:** Organize the drill library by dominant error plus PUBG context. Diagnosis chooses the drill family; weapon, optic, distance, stance, tier, evidence, and outcomes personalize the ficha.
- **D-19:** Use a layered premium library: core drill families for capture, validation, vertical control, horizontal control, timing, consistency, sensitivity, and loadout.
- **D-20:** Each drill family has a polished drill master defining objective, environment, target, distance, reps, pause, execution, observed error, success/fail criteria, preparation, downgrade, and validation.
- **D-21:** Context adapters personalize drill masters by weapon, optic, distance, stance, attachment, tier, difficulty, and support status instead of creating an unmaintainable giant library.
- **D-22:** Personalization is evidence-gated. If weapon/optic/distance/support is not trustworthy, mark personalization as limited and guide validation.
- **D-23:** Hard weapons such as Beryl and Groza adjust dose, reps, pauses, criteria, and progression while keeping the same drill family when appropriate.
- **D-24:** Attachments are one-variable-at-a-time experiments. If the protocol changes compensator, grip, muzzle, or another attachment, sensitivity, weapon, optic, distance, stance, and other variables stay fixed.
- **D-25:** Never suggest unsupported patch attachments or imply full patch-specific calibration when support is limited.
- **D-26:** Optic/scope follows the clip context. Changing optic only appears as its own protocol when optic, sensitivity, or loadout is the actual focus.
- **D-27:** Distance follows the clip when reliable. If estimated, prescribe an honest range such as 40-60m and mark it estimated. Fixed distances are fallback/library defaults, not replacements for real context.
- **D-28:** Real-match/TDM transfer is mandatory as a practical validation layer when evidence allows, but it cannot replace controlled compatible clip validation for strong technical conclusions.
- **D-29:** Real-match transfer uses a short checklist per focus with 3-5 items: situation, weapon/optic, approximate distance, whether the player held the pattern, whether correction felt excessive, and perceived result.
- **D-30:** Difficulty is derived from tier, confidence, history, consistency, weapon/optic/distance, weapon difficulty, and previous outcomes, but the UX must feel progressive and enjoyable to learn.
- **D-31:** If the user reports fatigue, confusion, or repeated failure, the next protocol softens and returns one step rather than punishing the user.
- **D-32:** UGC should be represented as a catalog of specific training presets/maps with status and setup requirements, for example vertical recoil range, horizontal tracking lane, burst timing lane, moving target transfer, Beryl 3x 50m range, spray reset station, and match pressure simulation.

### Evidence Downgrade Behavior
- **D-33:** Protocol strength is governed by the Phase 6 analysis decision ladder: `blocked_invalid_clip` -> recapture, `inconclusive_recapture` -> guided recapture, `partial_safe_read` -> short test, `usable_analysis` -> controlled protocol, `strong_analysis` -> apply plus dual validation.
- **D-34:** Weak evidence becomes a polished conservative protocol, not a dead end: guided recapture, fixed setup, safe mini-test, and blockers to resolve before complete protocol.
- **D-35:** `apply_protocol` has rigid blockers: invalid/inconclusive clip, low confidence/coverage, missing critical metadata, history/outcome conflict, uncontrolled variable change, limited technical support, fatigue/pain, or insufficient compatible validation.
- **D-36:** Compatible clip evidence wins technically over self-report. Self-report still matters for memory and UX, but conflict blocks aggressiveness and asks for short validation or hypothesis revision.
- **D-37:** Fatigue, pain, confusion, or poor execution downgrades to safety/learning. It reduces duration/reps, adds rest or recapture guidance, and does not automatically count as technical protocol failure.
- **D-38:** Use stable reason codes under the hood and human premium copy in UI. Examples: `low_confidence`, `missing_distance`, `outcome_conflict`, `fatigue_or_pain`, `variable_changed`, `limited_weapon_support`.
- **D-39:** Missing metadata uses dependency blocking: missing distance blocks distance-dependent criteria; missing optic blocks optic-specific protocols; missing attachment blocks loadout experiments.
- **D-40:** Limited weapon support limits fine personalization but does not erase value. The protocol may train the focus with that weapon, but cannot promise fine recoil targets, weapon-specific precision, or benchmark-backed claims.
- **D-41:** Changing sensitivity, grip, muzzle, optic, distance, stance, or weapon mid-block invalidates strong technical validation, but the learning can still be recorded.
- **D-42:** Downgraded protocols use specific repair CTAs tied to blockers: complete distance, record compatible clip, reduce reps, repeat without changing grip, close pending outcome, or similar.
- **D-43:** Downgrade UX must feel like an unlock path, not punishment: show reason, impact, repair action, what unlocks the next level, and what value remains now.

### Physical Preparation And Ergonomics
- **D-44:** Safe general preparation is real protocol value: light warmup, pauses, posture, mousepad space, relaxed hand/forearm, repeatable grip, and general conditioning cues.
- **D-45:** Preparation is not medical advice, injury treatment, diagnosis, or guaranteed performance gain.
- **D-46:** UI has a premium `Preparar antes do spray` section. Free sees a compact valuable version; Pro sees the complete contextual version.
- **D-47:** A full Pro physical preparation / ergonomics / strength module is deferred. It should require specialist review and may connect to Phase 10 guided programs.
- **D-48:** Phase 8 must not prescribe detailed sets, loads, medical exercises, treatment plans, or musculacao progressions.
- **D-49:** Pain, numbness, tingling, discomfort, or strong fatigue stops and downgrades the block. The next dose is reduced and professional guidance is suggested if symptoms persist.
- **D-50:** Do not count pain/fatigue/discomfort as aim failure.
- **D-51:** Grip, mousepad, posture, and setup are handled through observable checklists only: free mousepad space, arm not hitting the table, grip not changing mid-spray, relaxed shoulder/forearm, repeatable posture.
- **D-52:** Do not infer physical posture or medical/ergonomic diagnosis from the spray video.
- **D-53:** Preparation is dynamic experimental control. Vertical protocols focus on pull space; horizontal on tension/grip; consistency on repeatable ritual; sensitivity on fixed variables; capture on recording setup.
- **D-54:** If preparation/control variables change mid-block, the result may be saved but cannot count as strong technical validation.
- **D-55:** Preparation UI uses a contextual checklist by focus with 3-5 items, marked state, and a short reason for each item.
- **D-56:** Persist only minimum ergonomic/preparation data: reason codes and optional short notes. Do not persist detailed pain history, physical profile, body metrics, strength routine, or sensitive health data.
- **D-57:** Safety copy is short, firm, and integrated: stop for pain, numbness, or tingling; seek professional guidance if symptoms persist. Avoid heavy legal tone.
- **D-58:** Pauses are prescribed by protocol dose, tier, and drill type, including rest between sprays, rest between blocks, and stop rules when execution degrades or discomfort appears.

### Validation And Outcome Loop
- **D-59:** Outcomes are structured plus optional short note. Required meanings include `started`, `completed`, `improved`, `unchanged`, `worse`, `invalid_capture`, `fatigue_or_pain`, `confused`, and `variable_changed`.
- **D-60:** The ideal sequence is: close outcome -> validate compatible clip -> validate real-match/TDM transfer.
- **D-61:** Outcome records execution/self-report. Compatible clip validates the technical decision. Real match/TDM validates practical transfer with conservative confidence.
- **D-62:** Compatible validation is strict: same weapon, optic, distance or honest range, stance, relevant attachments, sensitivity, DPI, VSM, FOV, patch, spray type, duration/cadence, and preparation/control variables where applicable.
- **D-63:** Coach memory uses an evidence hierarchy: outcome = weak execution/self-report signal, compatible clip = technical evidence, real match/TDM = practical transfer. Aggressiveness rises only when they converge.
- **D-64:** After outcome, UI shows a polished `grave o proximo clip assim` checklist with exact weapon, optic, distance/range, stance, attachments, sensitivity, preparation, duration, and measured criterion.
- **D-65:** Real-match validation uses a short polished transfer card: situation, weapon/optic, approximate distance, real pressure, felt control better/same/worse, optional clip, and short note.
- **D-66:** Validated progress requires minimum convergence: non-conflicting outcome, compatible clip improves the primary criterion, real match does not strongly contradict, variables stayed controlled, confidence/coverage pass minimums, and no critical execution/ergonomics blocker exists.
- **D-67:** Missing evidence creates promising/needs-validation states, not failure by default. Copy examples may include "sinal promissor, falta validacao compativel" or "funcionou em partida, vamos confirmar em ambiente controlado."
- **D-68:** Outcome/validation UI uses small cards instead of a large form: outcome card, record-like-this card, real-transfer card, and progress card. Each asks one short question and offers one clear action.

### Verification And No False Done
- **D-69:** Free/Pro behavior must be covered by strong tests proving Free value and Pro completeness.
- **D-70:** A coverage matrix is mandatory for drill families and tiers: recapture, short test, stabilization, apply/validate.
- **D-71:** Golden tests must cover drill selection, tier, reps/duration, success criteria, downgrade, Free/Pro projection, copy safety, and compatible validation.
- **D-72:** Create a golden downgrade matrix for low confidence, missing distance, unsupported weapon, outcome conflict, variable changed, fatigue, invalid clip, and partial safe read. Each scenario proves tier, blocker, CTA, and copy.
- **D-73:** Use copy safety tests plus UI snapshots/contract tests for preparation and safety copy. Tests must block guarantees, cure/treatment/medical diagnosis language, pain as failure, or "continue despite pain" copy.
- **D-74:** Add E2E/contract flow coverage for protocol -> outcome -> compatible clip -> real-match transfer -> validated progress or conflict, covering UI, view model, memory, blockers, and repair states.
- **D-75:** Phase 8 requires a final evidence matrix for contract, drills, Free/Pro, downgrade, preparation, outcome, dual validation, LLM guardrails, benchmark/goldens, UI, copy safety, and all executed gates.
- **D-76:** Phase 8 cannot be called complete without objective evidence. No False Done is a blocking delivery rule.

### the agent's Discretion
The researcher/planner may choose exact type names, schema/table names, UI component names, CSS module boundaries, drill ID naming convention, exact copy wording, threshold constants, fixture structure, and plan wave count.

That discretion does not include weakening the complete-protocol contract, hiding evidence, making Free look broken, letting Pro lack the full ficha, depending on UGC, building Phase 9 Spray Lab early, inventing unsupported weapon/attachment/distance facts, allowing real-match validation to replace controlled technical validation, turning physical preparation into medical advice, persisting sensitive health data, letting LLM alter technical facts, or marking the phase complete without the evidence matrix.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Core value, browser-first constraint, confidence honesty, commercial claims posture, and original clip-analysis/coach/history value.
- `.planning/REQUIREMENTS.md` - Phase 8 requirements: COACH-01 through COACH-05.
- `.planning/ROADMAP.md` - Phase 8 goal and success criteria; Phase 9 Spray Lab and Phase 10 Guided Pro Programs boundaries.
- `.planning/STATE.md` - Current focus, completed Phase 7 state, and open Stripe/commercial corpus caveats.

### Prior Phase Decisions
- `.planning/phases/04-adaptive-coach-loop/04-CONTEXT.md` - Outcome semantics, adaptive coach memory, aggressiveness gates, conflict handling, and LLM copy-only guardrails.
- `.planning/phases/05-freemium-pro-mvp/05-CONTEXT.md` - Free/Pro product cut, Pro `training.next_block_protocol`, safe paid value, future programs, and no false done posture.
- `.planning/phases/06-core-accuracy-and-pro-validation-hardening/06-CONTEXT.md` - Decision ladder, invalid/inconclusive behavior, confidence calibration, limited support honesty, and commercial claim safety.
- `.planning/phases/07-premium-visual-ui-ux/07-CONTEXT.md` - Premium loop UX, Free remains valuable, Pro unlocks complete continuity, visual polish, disclosure/audit approach, and No False Perfect verification.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Browser-first pipeline, persistence model, admin/community architecture, and release readiness.
- `.planning/codebase/STACK.md` - Next.js, React, strict TypeScript, optional LLM rewrite, Vitest/Playwright/benchmark scripts.
- `.planning/codebase/TESTING.md` - Unit, integration, golden, benchmark, release, and Playwright expectations.
- `.planning/codebase/CONCERNS.md` - Browser-first/backend video caveat, production readiness caveats, i18n partial state, and local secrets warning.
- `.planning/codebase/CONVENTIONS.md` - Strict TypeScript, domain unions, server actions, CSS module/Tailwind conventions, and copy locale posture.
- `.planning/codebase/STRUCTURE.md` - App routes, source directories, server actions, core modules, tests, fixtures, and docs.

### Domain And Product Docs
- `docs/SDD-coach-extremo.md` - Coach plan builder, protocol horizons, LLM copy-only limits, next-block protocol, outcome/memory, benchmark metrics, and implemented V1 state.
- `docs/SDD-analise-spray.md` - Spray analysis evidence limits, confidence/coverage, physical viability, anti-overclaim posture, and 2026 coach specification.
- `docs/SDD-inteligencia-de-sens.md` - Sensitivity evidence, confidence-governed aggressiveness, single-clip limits, physical setup constraints, and multi-clip validation.

### Existing Product Code
- `src/types/engine.ts` - Current `CoachPlan`, `CoachActionProtocol`, `CoachBlockPlan`, `CoachDecisionTier`, outcome types, decision snapshots, and `AnalysisResult` coach fields.
- `src/core/coach-plan-builder.ts` - Existing tier resolution, action protocols, next block, stop conditions, adaptation window, localization, and natural extension point for complete protocols.
- `src/core/coach-engine.ts` - Legacy detailed coach feedback and deterministic coach plan attachment.
- `src/core/coach-llm-contract.ts` - Immutable-facts and schema-bound LLM contract that must remain fact-preserving.
- `src/core/coach-llm-adapter.ts` - Optional rewrite adapter and blocked-copy guardrails.
- `src/core/analysis-result-coach-enrichment.ts` - Deterministic coach-plan attachment plus optional LLM rewrite integration.
- `src/app/analyze/results-dashboard.tsx` - Current post-analysis coach/result UI, Free/Pro protocol copy, and next-block surface.
- `src/app/analyze/results-dashboard-view-model.ts` - Result verdict, adaptive loop model, protocol summaries, evidence badges, and lock view models.
- `src/actions/dashboard.ts` - Dashboard data source and latest coach next-block summary.
- `src/actions/dashboard-active-coach-loop.ts` - Active coach loop status, pending/conflict/validation-needed states, and CTA patterns.
- `src/actions/history.ts` - Save-analysis path, protocol outcome recording, coach snapshots, compatible trend reads, and outcome-to-memory integration.
- `src/types/monetization.ts` - Product entitlement keys including `coach.full_plan`, `training.next_block_protocol`, `coach.outcome_capture`, `coach.validation_loop`, and future program/lab keys.
- `package.json` - Required scripts for validation: `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`, plus focused tests added by the phase.

### External References
- `https://pubg.com/en/news/9855` - PUBG 2026 roadmap: UGC expansion, discovery, creator maps, and a shooting range used for professional training.
- `https://pubg.com/en/news/8865` - PUBG UGC Alpha: UGC as custom match world/rules/device/object creation with early limitations.
- `https://pubg.com/en/news/1713` - PUBG custom/training mode reference from prior official training-mode context.
- `https://www.osha.gov/computer-workstations` - General workstation ergonomics reference for neutral posture, breaks, and discomfort framing.
- `https://www.cdc.gov/niosh/ergonomics/about/index.html` - General ergonomics risk framing; use as safety boundary, not medical personalization.
- `https://www.mayoclinic.org/symptoms/arm-pain/basics/when-to-see-doctor/sym-20050870` - Conservative pain/numbness/tingling escalation reference for copy safety.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/types/engine.ts`: already contains `CoachPlan`, `CoachActionProtocol`, `CoachBlockPlan`, outcome types, and decision snapshots. Phase 8 should extend or version these contracts rather than create unrelated payloads.
- `src/core/coach-plan-builder.ts`: current home for tier, protocol, nextBlock, stop conditions, and adaptation window. Likely anchor for the complete-protocol builder or for calling a new complete-protocol module.
- `src/core/coach-engine.ts`: attaches deterministic coach plans to analysis results; complete protocols should remain deterministic before optional LLM copy.
- `src/core/analysis-result-coach-enrichment.ts`: existing deterministic-plus-optional-LLM enrichment path. Complete protocol enrichment must preserve the same fact-first order.
- `src/core/coach-llm-contract.ts` and `src/core/coach-llm-adapter.ts`: already preserve immutable facts and block unsafe copy. Extend guardrails for complete-protocol fields instead of allowing LLM to create training truth.
- `src/actions/history.ts`: already records protocol outcomes and coach snapshots. This is the primary persistence/integration point for complete protocol snapshots, revisions, outcomes, compatible validation, transfer cards, and audit.
- `src/actions/dashboard-active-coach-loop.ts`: existing active-loop CTA/state model for pending, conflict, and validation-needed; can be expanded into complete protocol next actions.
- `src/app/analyze/results-dashboard-view-model.ts`: current place where next block, adaptive loop, evidence badges, locks, and result verdict are shaped for UI.
- `src/app/analyze/results-dashboard.tsx`: current post-analysis surface for the next block and full coach plan. It will need complete protocol cards and Free/Pro projection.
- `src/types/monetization.ts`: already defines entitlement keys for full coach, next-block protocol, outcome capture, validation loop, future guided programs, and Spray Lab.

### Established Patterns
- Deterministic code owns coach truth; optional LLM can only rewrite allowed copy.
- Browser-first analysis stays mandatory. Phase 8 trains and validates around user clips but does not add backend video processing.
- Strict TypeScript unions and exported contracts are the local pattern for domain truth.
- Page/view-model contract tests already exist and should be extended for protocol UI and Free/Pro behavior.
- Golden/benchmark checks are product safety gates, not optional.
- History is the full audit surface; dashboard is active state; post-analysis is immediate action.
- Free must remain valuable and polished; Pro unlocks continuity/depth rather than hiding evidence truth.

### Integration Points
- Complete protocol contract likely touches `src/types/engine.ts` and possibly new `src/core/complete-training-protocols.ts` / `.test.ts`.
- Drill library and adapters likely belong in `src/core` with stable IDs and tests, while PUBG static context may use `src/game/pubg` catalogs.
- Free/Pro projection likely touches result view models, `src/lib/premium-projection.ts`, monetization entitlements, and result/dashboard/history surfaces.
- Protocol snapshots/revisions/outcomes likely touch `src/actions/history.ts`, `src/db/schema.ts`, and history/detail UI.
- Real-match transfer cards likely need a new server action or extension to protocol outcome actions.
- Compatibility validation needs integration with existing precision loop compatibility logic and active evolution lines.
- Copy-safety and No False Done evidence likely need new focused tests/scripts plus final phase verification docs.

</code_context>

<specifics>
## Specific Ideas

- The user repeatedly asked for "perfeicao maxima", "muito polido", "polido ao extremo", "UI impecavel", and "testes muito fortes." Interpret this as concrete contracts, rubrics, gates, and evidence, not vague polish.
- Free must show high value. It should never feel like a broken demo, even though Pro unlocks the full protocol ficha and continuity.
- Pro protocol should feel like a paid training order: exact next action, exact variables, exact validation, but no overclaim.
- UGC should be treated as specific training maps/presets when available, such as vertical recoil range, horizontal tracking lane, burst timing lane, moving target transfer, Beryl 3x 50m range, spray reset station, and match pressure simulation.
- Spray Lab is expected soon in Phase 9. Phase 8 should prepare the contract for it but not implement the runner.
- Real-match validation matters to the user. It must be part of the loop, but with conservative confidence and without replacing controlled technical validation.
- Physical preparation and ergonomics are value, not legal filler. The UI should make them feel like part of the protocol while staying safe and non-medical.
- Full musculacao / physical training module is desirable but deferred until it can be done with specialist-level care.
- Downgrades should feel like unlock paths, not punishments.

</specifics>

<deferred>
## Deferred Ideas

- Full Pro physical preparation / ergonomics / strength module with specialist review, likely connected to Phase 10 Guided Pro Training Programs.
- Phase 9 Spray Lab session runner, guided drills, session state, lab benchmarks, and deep UGC/Spray Lab implementation.
- Phase 10 weekly/monthly guided programs that sequence complete protocols over time.
- Team/coach workflows and report export/share remain later phases.

</deferred>

---

*Phase: 8-Complete Training Protocols*
*Context gathered: 2026-05-07T16:03:23.2642712-03:00*
