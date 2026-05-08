# Phase 9: PUBG Spray Lab Session Runner And Benchmark - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-08T02:00:48.1159303-03:00
**Phase:** 9-PUBG Spray Lab Session Runner And Benchmark
**Areas discussed:** session shape, drill catalog, benchmark/index, progression, Free/Pro/privacy, compatible validation, blocked-state UX, learning model, navigation/IA, session UX, data/schema, coach/dashboard/history integration, verification

---

## Session Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Guided current protocol | Lab opens from the current complete protocol and guides blocks/reps/outcome/validation. | yes |
| Free drill selection | User chooses any drill without recent analysis. | no |
| Benchmark first | Lab starts by measuring baseline before training. | no |
| Hybrid | Protocol-first with optional free/benchmark modes. | partial context only |

**User's choice:** Guided current protocol.
**Notes:** User asked for extreme polish. Decisions refined into four acts: prepare, execute, close result, validate compatible clip. The UI should be command mode with audit drawers, assisted timer, full manual control, fidelity downgrade, and a two-layer premium final summary.

---

## Drill Catalog

| Option | Description | Selected |
|--------|-------------|----------|
| Stable families + polished lanes | Keep stable technical families and present them as PUBG lanes/presets. | yes |
| Giant manual matrix | Author every weapon/optic/distance combination separately. | no |
| Existing Phase 8 only | Use complete protocol families with no Lab-specific presentation. | no |

**User's choice:** Stable families + polished lanes.
**Notes:** User accepted the recommendation, with stronger polish requirement. The Lab should feel like a real PUBG laboratory while staying maintainable and evidence-bound.

---

## Benchmark And Index

| Option | Description | Selected |
|--------|-------------|----------|
| Evidence benchmark only | No score, only benchmark states and evidence levels. | no |
| Absolute player grade | One global player note/score. | no |
| Contextual Spray Lab index | Score by drill/context/evidence, with provisional and validated states. | yes |

**User's choice:** Contextual Spray Lab index.
**Notes:** User liked having a note/score but agreed it must not be an absolute player grade. Recommended naming: `Indice Spray Lab` or contextual score. It should be visually desirable but mathematically humble.

---

## Progression And Difficulty

| Option | Description | Selected |
|--------|-------------|----------|
| Global player levels | One global level for the player. | no |
| Context refinement lines | Progression per strict context such as weapon/optic/distance/focus. | yes |
| XP/gamified missions | Generic gamification disconnected from evidence. | no |

**User's choice:** Context refinement lines.
**Notes:** Difficulty should increase only with convergent evidence and downgrade humanely under fatigue, confusion, variable changes, weak capture, or conflicts.

---

## Free / Pro / Privacy

| Option | Description | Selected |
|--------|-------------|----------|
| Free premium, Pro deep | Free gets useful basic guided session; Pro gets full runner, lanes, history, validated index, benchmark, audit. | yes |
| Pro-only Lab | Lab hidden almost entirely behind Pro. | no |
| Fully free Lab | No meaningful Pro depth in Spray Lab. | no |

**User's choice:** Free premium, Pro deep.
**Notes:** User repeatedly emphasized "perfeito e polido." Privacy decision: persist minimal technical evidence, reason codes, and optional short notes; do not persist raw Lab video or sensitive health data.

---

## Compatible Validation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Manual re-analysis | User goes to Analyze again and re-enters context manually. | no |
| Explicit validation CTA | `Gravar validacao compativel` opens analysis in validation mode with context preloaded. | yes |
| Lab-only upload | Validation happens only inside Spray Lab route. | possible implementation detail |

**User's choice:** Explicit validation CTA with preloaded context.
**Notes:** This came from user confusion about how to validate with a second clip. Result/dashboard/history/final session need contextual CTAs. The second clip must be tagged as validation candidate and compared automatically against the base.

---

## Blocked States And Error UX

| Option | Description | Selected |
|--------|-------------|----------|
| Generic error | Keep showing `Erro na Analise` for blocked clips. | no |
| Repair center | Treat blockers as guided repair states with next actions. | yes |
| Save everything equally | Let invalid/inconclusive clips count as normal evidence. | no |

**User's choice:** Repair center.
**Notes:** User showed a screenshot where a spray was blocked as `flick`, `target_swap`, and `hard_cut`. We investigated and found the validity gate used absolute pixel thresholds, which can false-positive on high-resolution clips. A focused local fix scaled thresholds by frame size and tests/gates passed, but Phase 9 still needs premium repair UX and validation design.

---

## Learning Model

| Option | Description | Selected |
|--------|-------------|----------|
| Self-modifying production engine | System changes thresholds/models automatically from user clips. | no |
| Assisted/auditable learning | Individual adaptation plus corpus-reviewed global improvements through gates. | yes |
| No learning | Lab records sessions but does not adapt. | no |

**User's choice:** Assisted/auditable learning.
**Notes:** The app should feel intelligent by adapting user sessions, difficulty, coach memory, and benchmark context. It must not train on private clips or alter global truth without consent, review, benchmark, and baseline discipline.

---

## Navigation And Product IA

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone route only | Add `/spray-lab` with no strong contextual entry. | no |
| Contextual CTAs only | No real Lab route, only buttons from other screens. | no |
| `/spray-lab` + contextual CTAs | Dedicated product route, opened in the right state from result/dashboard/history. | yes |

**User's choice:** `/spray-lab` plus contextual CTAs.
**Notes:** User noted the app can feel confusing with analysis, reading, history, and now Lab. The locked mental model is `Analisar -> Treinar -> Validar -> Evoluir`.

---

## Session UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dense technical page | Show all protocol/audit details at once during training. | no |
| Minimal cockpit only | Hide technical details completely. | no |
| Mobile-first cockpit + audit drawers | One dominant action per state, with technical audit available. | yes |

**User's choice:** Mobile-first cockpit + audit drawers.
**Notes:** Every session state must clearly answer what is happening, what to do now, how much remains, what can invalidate the session, and how to recover.

---

## Data And Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal ephemeral state | Do not persist enough for audit/benchmark. | no |
| Audit-heavy/sensitive storage | Persist detailed physical/health/raw video data. | no |
| Evidence-first persistence | Persist session, fidelity, reps/events, benchmark snapshots, validation links, and reason codes. | yes |

**User's choice:** Evidence-first persistence.
**Notes:** Expected tables include Lab sessions, blocks/events/reps, benchmark snapshots, and validation links. The exact schema is planner discretion.

---

## Coach / Dashboard / History Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Lab as isolated feature | Lab data does not meaningfully feed coach/dashboard/history. | no |
| Mixed all-in-one surfaces | Every page tries to show everything. | no |
| Fixed roles | Lab executes, dashboard commands, history audits, coach consumes evidence hierarchy. | yes |

**User's choice:** Fixed roles, refined by `Analisar -> Treinar -> Validar -> Evoluir`.
**Notes:** This was polished further after the user said the app is confusing. Each surface needs a clear job and one next action.

---

## Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Normal gates only | Rely only on typecheck/Vitest/benchmark gate. | no |
| Dedicated Spray Lab gate | Add focused verification script, matrix, benchmark checks, and Playwright screenshots. | yes |
| Manual QA only | Trust visual review without automated evidence. | no |

**User's choice:** Dedicated Spray Lab gate and perfect tests.
**Notes:** User explicitly requested perfect tests. Required evidence includes happy path, blockers, Free/Pro, compatible validation, incompatible validation, dashboard/history, coach handoff, benchmark snapshots, mobile/desktop screenshots, and No False Done matrix.

---

## the agent's Discretion

- Exact route structure and query-param/linking design.
- Exact schema/table/field names.
- Exact score constants and score component weights.
- Exact UI components and CSS module boundaries.
- Exact text labels, as long as copy remains pt-BR, premium, and honest.
- Exact plan wave count and verification script implementation.

## Deferred Ideas

- Weekly/monthly guided programs remain Phase 10.
- Social Pro/community premium remains Phase 11.
- Revenue operations hardening remains Phase 12.
- Team/coach expansion remains Phase 13.
- Global player rankings and absolute skill grades are deferred until corpus/policy/evidence supports them.
- Autonomous global model or threshold learning from private clips is deferred and requires explicit consent, review, and gates.
