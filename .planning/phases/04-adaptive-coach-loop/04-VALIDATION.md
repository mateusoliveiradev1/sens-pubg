---
phase: 04
slug: adaptive-coach-loop
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-05T18:43:42-03:00
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/core/coach-memory.test.ts src/core/coach-plan-builder.test.ts src/core/coach-llm-adapter.test.ts src/actions/history.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Release gate command** | `npm run typecheck && npx vitest run && npm run benchmark:gate` |
| **Estimated runtime** | ~60-120 seconds for the full Vitest suite; benchmark gate may add runtime |

---

## Sampling Rate

- **After every task commit:** Run the focused automated command for the touched layer.
- **After every plan wave:** Run `npm run typecheck && npx vitest run`.
- **Before `$gsd-verify-work`:** Run `npm run typecheck && npx vitest run && npm run benchmark:gate`.
- **Max feedback latency:** 120 seconds for focused tests when practical; run the full gate before verification even if slower.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-W0-01 | 01 | 0 | COACH-03, COACH-04 | - | Outcome statuses and reason codes are validated before they can affect coach memory. | unit | `npx vitest run src/core/coach-outcomes.test.ts` | No - W0 | pending |
| 04-W0-02 | 01 | 0 | COACH-03 | - | Authenticated users can record outcomes only for their own sessions, and correction history stays auditable. | action + UI contract | `npx vitest run src/actions/history.test.ts src/app/history/[id]/coach-protocol-outcome-panel.contract.test.ts` | Partial - W0 | pending |
| 04-W0-03 | 02 | 0 | COACH-01, COACH-02, COACH-04 | - | Outcome-aware memory changes priority, confidence, and aggressiveness without inventing certainty. | unit | `npx vitest run src/core/coach-memory.test.ts src/core/coach-priority-engine.test.ts src/core/coach-plan-builder.test.ts` | Yes - extend | pending |
| 04-W0-04 | 03 | 0 | COACH-05 | - | LLM rewrite preserves deterministic tier, priorities, blockers, outcome facts, and fallback behavior. | unit | `npx vitest run src/core/coach-llm-adapter.test.ts src/core/analysis-result-coach-enrichment.test.ts` | Yes - extend | pending |
| 04-GATE-01 | 04 | final | COACH-01, COACH-02, COACH-03, COACH-04, COACH-05 | - | Golden and benchmark cases catch regressions in coach plan truth, outcome memory, and rewrite schemas. | benchmark | `npm run benchmark:gate` | Yes - extend | pending |

*Status: pending, green, red, flaky.*

---

## Wave 0 Requirements

- [ ] `src/core/coach-outcomes.test.ts` - outcome status, reason code, correction, and memory classification fixtures for COACH-03 and COACH-04.
- [ ] `src/app/history/[id]/coach-protocol-outcome-panel.contract.test.ts` - UI contract for pending protocol, outcome recording, correction state, and honest inconclusive copy.
- [ ] `src/actions/history.test.ts` - authenticated protocol outcome persistence, ownership, revision history, and dashboard/history read model coverage.
- [ ] `src/core/coach-memory.test.ts` - compatible prior outcomes, conflicting outcomes, repeated no-change, invalid capture, and stabilization cases.
- [ ] `src/core/coach-plan-builder.test.ts` and `src/core/coach-priority-engine.test.ts` - tier/aggressiveness changes driven by outcome memory while preserving capture-quality blockers.
- [ ] `src/core/coach-llm-adapter.test.ts` - outcome fact preservation and invalid rewrite fallback cases.
- [ ] Benchmark fixtures/schema updates if Phase 4 adds expected outcome-memory fields to benchmark cases.

---

## Manual-Only Verifications

All phase behaviors have automated verification. Browser walkthroughs may still be useful for product feel, but they do not replace the automated action, contract, unit, and benchmark gates above.

---

## Validation Sign-Off

- [ ] All tasks have automated verify commands or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency target documented
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
