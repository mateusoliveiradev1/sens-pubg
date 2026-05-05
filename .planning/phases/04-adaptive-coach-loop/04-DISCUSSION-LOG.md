# Phase 4: Adaptive Coach Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-05T18:29:08.2978007-03:00
**Phase:** 04-Adaptive Coach Loop
**Areas discussed:** Outcome do protocolo, Memoria e prioridade adaptativa, Agressividade do coach, Superficie e guardrails

---

## Outcome do protocolo

| Option | Description | Selected |
|--------|-------------|----------|
| Protocolo inteiro | User evaluates whether the whole block worked. | |
| Foco principal | User evaluates only the primary focus. | |
| Protocolo + foco | User records the protocol result and the focus affected. | yes |
| Mais detalhado | Each step/check can have its own status. | |

**User's choice:** Protocolo + foco, with a strong internal quality bar.
**Notes:** The user repeatedly asked for "perfeicao". The captured interpretation is high rigor, not public overclaiming.

| Option | Description | Selected |
|--------|-------------|----------|
| Aceito/concluido/melhorou/falhou/inconclusivo | Basic lifecycle plus result. | |
| Aceito/pulei/conclui/melhorou/igual/piorou | Adds skip and neutral result. | |
| Comecei/conclui/melhorei/nao mudou/piorou/invalido por captura | Separates execution, result, and invalid capture. | yes |
| Funcionou/nao funcionou/inconclusivo | Minimal status. | |

**User's choice:** Use the richer status set.
**Notes:** `started` and `completed` do not prove improvement. `invalid_capture` needs a reason.

| Option | Description | Selected |
|--------|-------------|----------|
| Weak trust until compatible clip | User outcome is weak signal. | |
| Medium trust after completed + improved | User execution and result give moderate signal. | |
| Strong only after compatible clip confirms | Clip validation is required for strong evidence. | yes |
| Manual consolidation | User chooses whether to consolidate. | |

**User's choice:** Improvement only becomes strong evidence with compatible clip confirmation.
**Notes:** Human feedback orients the coach; compatible clip validates it.

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore feedback if absent | Coach uses only clips. | |
| Keep pending | Coach remembers unresolved outcome. | yes |
| Prompt on dashboard | Dashboard asks user to close the prior block. | yes |
| Auto-inconclusive after time | Status becomes inconclusive automatically. | |

**User's choice:** Pending plus dashboard/coach prompt, without blocking the product.
**Notes:** Incomplete feedback reduces memory quality, not product access.

| Option | Description | Selected |
|--------|-------------|----------|
| Always require clip | Maximum validation but high friction. | |
| Require for result statuses | Clip required only for improved/unchanged/worse. | |
| Strong CTA without forcing | Outcome can save; clip validates later. | yes |
| Require clip to save any outcome | Strictest but too heavy. | |

**User's choice:** Strong CTA without requiring clip.
**Notes:** Outcome without clip remains weak evidence.

| Option | Description | Selected |
|--------|-------------|----------|
| Clip wins | Clip downgrades human outcome. | |
| Explicit conflict and validation | Coach marks conflict and asks for another validation. | yes |
| Human outcome still weighs heavily | User felt improvement, so keep strong user signal. | |
| Ignore until 3 clips | No conclusion until enough clips. | |

**User's choice:** Explicit conflict, with trend/clip evidence weighted more strongly.
**Notes:** Conflict is not hidden or quickly resolved.

| Option | Description | Selected |
|--------|-------------|----------|
| Status only | No reason or note. | |
| Free note | Optional short text. | |
| Structured reason | Capture/execution/context reason. | |
| Structured reason + free note | Machine-readable reason plus optional user note. | yes |

**User's choice:** Structured reason plus optional note.
**Notes:** Good for memory and audit without forcing long input.

| Option | Description | Selected |
|--------|-------------|----------|
| Mandatory distinction | Always classify why failure happened. | |
| When user informs reason | Distinguish when the user gives context. | yes |
| Any failure downgrades protocol | Simple but too blunt. | |
| Infer from next clip | Use future evidence to support classification. | yes |

**User's choice:** User reason plus clip-supported inference.
**Notes:** The system can infer carefully, but cannot invent certainty.

| Option | Description | Selected |
|--------|-------------|----------|
| Started is intention only | No memory effect. | |
| Started means in progress | Coach can remember active block. | yes |
| Counts as activation | Engagement metric only. | |
| Expires if not completed | Prevent stale active protocols. | yes |

**User's choice:** Started means in progress and expires if not closed.
**Notes:** It is not technical evidence.

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral evidence | Executed, result unknown. | yes |
| Light positive | Discipline matters. | |
| Pending | Must choose result later. | |
| Auto-inconclusive | Closes without result. | |

**User's choice:** Neutral evidence with CTA.
**Notes:** Execution is useful, but not proof of improvement.

| Option | Description | Selected |
|--------|-------------|----------|
| Capture only | Video/visibility issue. | |
| Capture + context | Incompatible weapon/scope/distance/etc. | |
| Capture + execution | User changed variable or did not follow block. | |
| All with mandatory reason | Invalid outcome becomes structured learning. | yes |

**User's choice:** All with mandatory reason.
**Notes:** Invalid capture should teach the coach what failed.

| Option | Description | Selected |
|--------|-------------|----------|
| Always editable | Correct mistakes freely. | |
| Editable with revision history | Audit changes. | yes |
| Only before next clip | Prevent conflicting revisions. | |
| Immutable | Strong audit but unfriendly. | |

**User's choice:** Editable with revision history.
**Notes:** Correct without erasing the trail.

---

## Memoria e prioridade adaptativa

| Option | Description | Selected |
|--------|-------------|----------|
| Global player memory | Broad player tendencies. | |
| Weapon + scope | Simple context grouping. | |
| Strict compatible context | Patch, weapon, scope, stance, attachments, distance. | |
| Global + strict compatible | Two-layer memory. | yes |

**User's choice:** Accepted recommended perfect set.
**Notes:** Strict memory leads; global memory only supports.

| Option | Description | Selected |
|--------|-------------|----------|
| Prioritize recurrence automatically | Past dominant issue wins. | |
| Current clip must still show it | Avoid stale recurrence. | |
| Show recurrence only | Inform but do not rank. | |
| Recurrence + current severity + outcome | Balanced adaptive priority. | yes |

**User's choice:** Recurrence plus current severity plus prior outcome.
**Notes:** Coach should not be hostage to old history or one isolated clip.

| Option | Description | Selected |
|--------|-------------|----------|
| Avoid same protocol | Previous failure blocks repeat. | |
| Repeat if current clip requires it | Current evidence can justify retry. | |
| Lower aggressiveness and validate | Safer next step. | yes |
| Create alternative hypothesis | Avoid blind repetition. | yes |

**User's choice:** Lower aggressiveness and create/revise hypothesis.
**Notes:** Failure is signal, not automatic abandonment.

| Option | Description | Selected |
|--------|-------------|----------|
| Repeat focus until validated | Continue same work. | |
| Consolidate before changing variable | Prevent premature switching. | yes |
| Move to next blocker | Progress means advance. | |
| Ask user | Manual branch. | |

**User's choice:** Consolidate before changing variable.
**Notes:** Aligns with Phase 3 active-line logic.

| Option | Description | Selected |
|--------|-------------|----------|
| 1 outcome + 1 compatible clip | Fast memory. | |
| 2 compatible clips | Basic evidence. | |
| 3 clips or 2 + coherent outcome | Conservative strong memory. | yes |
| Planner decides entirely | No locked bar. | |

**User's choice:** Three compatible clips, or two compatible clips plus coherent outcome.
**Notes:** Exact constants can be tuned, but the conservative shape is locked.

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot audit every session | Preserve why the coach decided. | yes |
| Only in fullResult | Lightweight persistence. | |
| Table later | Normalize when stable. | |
| Recalculate | No snapshot. | |

**User's choice:** Audit snapshot required.
**Notes:** Implementation may start in `fullResult` and evolve to a table.

| Option | Description | Selected |
|--------|-------------|----------|
| Last 3 compatible clips | Very recent. | |
| Last 5-8 compatible clips | Broader clip window. | |
| Last 30 days | Time window. | |
| Hybrid clip + time window | Balanced recency. | yes |

**User's choice:** Hybrid window.
**Notes:** Prevents stale memory from dominating.

| Option | Description | Selected |
|--------|-------------|----------|
| Global can change priority | Strong global influence. | |
| Global breaks close ties | Supportive influence. | yes |
| Text only | No ranking influence. | |
| Only when no strict memory exists | Fallback influence. | yes |

**User's choice:** Tie-breaker or fallback only.
**Notes:** Global memory cannot override strict compatible evidence.

| Option | Description | Selected |
|--------|-------------|----------|
| Penalize protocol | Treat as technical failure. | |
| Ignore | Lose useful friction data. | |
| Mark invalid and validate again | Keep honest. | yes |
| Store execution friction | Learn without overcounting. | yes |

**User's choice:** Invalid outcome plus execution/capture friction.
**Notes:** Not technical evidence against protocol.

| Option | Description | Selected |
|--------|-------------|----------|
| Discipline positive | Reward execution. | |
| Neutral memory | Result unknown. | yes |
| Ask to close result | Avoid endless incomplete outcomes. | yes |
| Reduce outcome confidence | Memory is incomplete. | yes |

**User's choice:** Neutral, prompt closure, reduce outcome confidence.
**Notes:** Execution alone does not prove result.

| Option | Description | Selected |
|--------|-------------|----------|
| Trend wins | Clip evidence leads. | |
| Human outcome wins | User report leads. | |
| Explicit conflict, trend heavier | Honest conflict handling. | yes |
| Require new validation | No advance while conflicted. | yes |

**User's choice:** Explicit conflict with stronger trend weight and new validation.
**Notes:** Conflict blocks strong action.

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-switch focus | Avoid repeat failure. | |
| Lower and find prior cause | Safer reasoning. | yes |
| Ask about execution/capture | Human context matters. | yes |
| Keep if current clip proves dominance | Do not abandon real blocker. | yes |

**User's choice:** Lower aggressiveness, look for cause, ask context, keep only if current clip proves dominance.
**Notes:** Repeated failure revises hypothesis.

| Option | Description | Selected |
|--------|-------------|----------|
| Celebrate and continue | Simple positive loop. | |
| Prioritize new blocker | Chase biggest new problem. | |
| Consolidate if new blocker not critical | Conditional consolidation. | yes |
| Treat as partial progress | Avoid false victory. | yes |

**User's choice:** Partial progress; consolidate only if new blocker is not critical.
**Notes:** Improvement in one area can carry cost elsewhere.

| Option | Description | Selected |
|--------|-------------|----------|
| Short memory summary | User sees what coach remembers. | |
| Full history audit | Detailed trace. | |
| Internal only | Less UI noise. | |
| Analysis essential, dashboard short, history full | Layered visibility. | yes |

**User's choice:** Layered visibility.
**Notes:** Keeps the product trustworthy without flooding analysis.

---

## Agressividade do coach

| Option | Description | Selected |
|--------|-------------|----------|
| Strong current evidence only | One-clip strong action. | |
| Strong evidence + no history conflict | Better but still shallow. | |
| Strong evidence + trend/outcome | Adds validation. | |
| Strong evidence + compatible memory + recent validation | Strictest apply gate. | yes |

**User's choice:** Strictest `apply_protocol` gate.
**Notes:** A single excellent clip cannot authorize final strong action.

| Option | Description | Selected |
|--------|-------------|----------|
| Consistency focus only | Narrow stabilize condition. | |
| Good signal but high variance | Stabilize noisy evidence. | |
| History/trend not ready | Stabilize before advancing. | |
| Good signal plus variance/history issue | Full rule, especially before sensitivity. | yes |

**User's choice:** Good signal plus variance/history insufficiency.
**Notes:** Use before sensitivity changes when evidence is not ready.

| Option | Description | Selected |
|--------|-------------|----------|
| Sensitivity wins | Apply setting change first. | |
| Technique wins | Drill first always. | |
| Trend decides | Multi-clip evidence chooses. | |
| Least irreversible path unless strong evidence | Technique/validation before sens by default. | yes |

**User's choice:** Least irreversible path.
**Notes:** Sensitivity leads only with strong compatible support.

| Option | Description | Selected |
|--------|-------------|----------|
| Block | User cannot proceed. | |
| Permit high risk | User can ignore evidence. | |
| Downgrade to test protocol | Safer protocol. | yes |
| Explain safe path | Transparent blocker. | yes |

**User's choice:** Downgrade to test protocol and explain safe path.
**Notes:** Do not silently let weak evidence become aggressive advice.

| Option | Description | Selected |
|--------|-------------|----------|
| Repeat until validated | Simple persistence. | |
| Max two repeats | Hard cap. | |
| While progress/evidence insufficient | Adaptive repeat. | |
| Repeat only with new hypothesis/check | Avoid blind repetition. | yes |

**User's choice:** Repeat only with new hypothesis, check, or validation purpose.
**Notes:** Repetition must be intelligent.

| Option | Description | Selected |
|--------|-------------|----------|
| After progress | Advance after improvement. | |
| After failure | Switch after failure. | |
| When current variable stops dominating | Current evidence drives. | |
| After consolidation, invalidation, or critical new variable | Strict variable-change rule. | yes |

**User's choice:** Strict variable-change rule.
**Notes:** Prevents variable hopping.

| Option | Description | Selected |
|--------|-------------|----------|
| Allow strong plan in conflict | User/clip conflict ignored. | |
| Block apply_protocol | Strong plan blocked. | yes |
| Require short validation | Resolve conflict safely. | yes |
| Block and validate | Full selected rule. | yes |

**User's choice:** Conflict blocks `apply_protocol` and requires short validation.
**Notes:** Strong plans require alignment.

| Option | Description | Selected |
|--------|-------------|----------|
| History wins | Trust old evidence. | |
| Current clip wins | Trust current evidence only. | |
| History as context | Helpful but not decisive. | yes |
| No strong plan without usable current clip | Locked guardrail. | yes |

**User's choice:** Strong history cannot authorize strong plan without usable current clip.
**Notes:** Current evidence must support the plan.

| Option | Description | Selected |
|--------|-------------|----------|
| Apply directly | Current strong clip wins. | |
| Ignore history | Prior failure not relevant. | |
| Controlled test | Safer. | |
| Controlled test with revised hypothesis | Best adaptive behavior. | yes |

**User's choice:** Controlled test with revised hypothesis.
**Notes:** Strong current evidence and failed history create a better test, not immediate apply.

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral tone always | Conservative but flat. | |
| Firmer when aligned | Better UX. | |
| More motivational | Risk of fluff. | |
| Firm and premium with validation | Confident but honest. | yes |

**User's choice:** Firm, premium, and explicit validation when evidence aligns.
**Notes:** No guaranteed outcome language.

---

## Superficie e guardrails

| Option | Description | Selected |
|--------|-------------|----------|
| Post-analysis full loop | All details immediately after analysis. | |
| Dashboard full loop | Active loop centered on dashboard. | |
| History full audit | Audit lives in history. | |
| Layered surfaces | Analysis essential, dashboard active loop, history audit. | yes |

**User's choice:** Layered surfaces.
**Notes:** Keep post-analysis clear while preserving audit depth.

| Option | Description | Selected |
|--------|-------------|----------|
| LLM improves plan freely | Not allowed. | |
| LLM can alter copy and details | Too risky. | |
| LLM only language | Basic guardrail. | |
| Copy-only with locked technical fields | Strict guardrail. | yes |

**User's choice:** LLM only rewrites language with locked schema.
**Notes:** Tier, priority, order, scores, thresholds, validation, attachments, outcome status, and blockers are immutable.

| Option | Description | Selected |
|--------|-------------|----------|
| Motivational | Risk of generic coaching. | |
| Technical | Useful but less premium. | |
| Firm | Stronger voice. | |
| Demanding, premium, honest | Desired tone. | yes |

**User's choice:** Demanding, premium, honest.
**Notes:** No promise of perfect sensitivity, rank gain, or guaranteed improvement.

| Option | Description | Selected |
|--------|-------------|----------|
| Unit tests only | Insufficient. | |
| UI contracts only | Insufficient. | |
| Basic benchmark | Not enough for adaptive loop. | |
| Targeted tests plus benchmark/golden checks | Required. | yes |

**User's choice:** Targeted tests plus benchmark/golden checks.
**Notes:** Must cover tier, primary focus, next block, outcomes, history conflict, LLM schema, and memory.

---

## the agent's Discretion

- Exact TypeScript enum names and DB table names.
- Whether outcome persistence starts in `analysisSessions.fullResult` or with a normalized table, as long as revision history remains auditable.
- Exact threshold constants for strong memory and recent validation.
- Exact UI component split across analyze, dashboard, and history.
- Exact benchmark file organization.

## Deferred Ideas

- Full visual/UI refactor.
- Monetization, pricing, entitlements, and billing.
- Team/coach workflows.
- Real-time coaching or overlays.
