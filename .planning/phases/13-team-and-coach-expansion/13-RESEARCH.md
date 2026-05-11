# Phase 13: Team And Coach Expansion - Research

**Researched:** 2026-05-11
**Domain:** Team/coach workspace, consented multi-player review, team-safe report packets, separate Team entitlements, seat foundation, No False Team verification
**Confidence:** HIGH

## Research Question

What must be true to plan Phase 13 well?

Phase 13 should extend the finished solo Pro/Social Pro loop into a small-roster coach workflow without weakening privacy, report redaction, entitlement truth, or evidence honesty. The safe product cut is **Mesa do Coach**: a private operating surface where a coach or analyst reviews consented player evidence, triages blockers, leaves private notes, requests next actions, and shares a redacted Team Review Packet.

## Current System Facts

### Paid Access And Entitlements

- `src/types/monetization.ts` already declares `team.player_review` and `team.seats`.
- `src/lib/product-entitlements.ts` has explicit Free, Pro, Social Pro, and operational key groupings, but Team keys are not yet activated through a separate Team policy.
- `src/lib/social-pro-access.ts` is the closest access-policy pattern: it resolves server-owned product access, maps entitlement keys to capabilities, and exposes explicit booleans for UI/actions.
- `src/lib/premium-projection.ts` already has Team feature labels, but projection summary booleans currently focus on solo Pro and Social Pro.
- Therefore Phase 13 should add a `team-coach-access` layer instead of folding Team authority into solo Pro or Social Pro.

### Shareable Report And Redaction Foundation

- Social Pro already provides public-safe report contracts in `src/types/social-pro.ts`.
- `src/core/social-pro-report-redaction.ts` enforces allowlisted public-safe snapshots and mandatory honesty fields: confidence, coverage, blockers, inconclusive/limited support, validation state, and no-overclaim copy.
- `src/core/social-pro-report-view-model.ts` distinguishes technical evidence, training execution, practical transfer, compatible validation, blockers, repairs, and current state.
- `src/actions/social-pro-reports.ts` owns source reloading, report creation/update, private-link lifecycle, token verifier storage, and audit events.
- Team Review Packet should reuse these concepts but add workspace membership, consent scope, coach review status, coach note summary, requested next action, and workspace audit metadata.

### Community Squad Patterns Are Useful But Not Sufficient

- `src/core/community-squads.ts` and `src/actions/community-squads.ts` already model small groups, invite codes, member limits, membership status, and goal progress.
- Those semantics are public/community oriented. Phase 13 needs a private paid workspace with explicit player consent, scoped evidence sharing, seat accounting, and private coach artifacts.
- The plan should reuse invite/member implementation patterns but create new Team/Coach contracts and tables rather than treating community squad membership as private coach access.

### Evidence Sources To Organize, Not Rewrite

- `analysisSessions`, precision lines/checkpoints, coach protocol outcomes/revisions, Spray Lab sessions/validation links, and training program cycles already live in `src/db/schema.ts`.
- `src/actions/history.ts`, `src/actions/dashboard-active-coach-loop.ts`, `src/core/spray-lab-coach-handoff.ts`, and `src/core/training-program-coach-handoff.ts` already preserve evidence hierarchy and next-action meaning.
- Phase 13 should link to Analyze, History, Spray Lab, Ciclo Pro, Dashboard, and Social Pro report evidence instead of duplicating or mutating those systems.

### Verification Pattern

- `scripts/verify-phase11-social-pro.ts` and `scripts/verify-phase12-revenue-ops.ts` are the established No False Done pattern.
- The verifier parses a phase checklist, enforces required evidence rows, validates row statuses, derives `Delivered`, `Partially delivered`, or `Blocked`, and fails missing rows/statuses.
- Phase 13 should add `verify:phase13:team-coach` and a checklist that cannot claim Delivered unless access, privacy, consent/revocation, report packets, seats, UI/browser evidence, copy safety, and final command gates are accounted for.

## Planning Implications

### Recommended Plan Slices

1. Start with a Wave 0 validation scaffold. Team/coach scope has high privacy and access risk, so tests/verifier/Playwright matrix should exist before implementation.
2. Add Team/Coach contracts and access resolver next. This must prove solo Pro and Social Pro do not grant Team review authority by accident.
3. Add persistence for workspaces, memberships, invites, seat ledger/foundation, consent/share records, review notes/status, packet links, and audit events.
4. Build team-safe snapshot/packet actions by extending Social Pro redaction, source ownership reloads, and link-token patterns.
5. Build coach cockpit and player dossier view models/actions. The first fold should answer who needs attention, why, and the smallest safe next action.
6. Build `/mesa-coach` UI, roster/dossier states, locked Team state, consent/share flows, packet/print route, and contextual handoffs from existing product loops.
7. Finish with No False Team verification, copy safety, desktop/mobile browser evidence, checklist/docs, and final required gates.

### Key Product Rules

- Mesa do Coach is a private paid workflow surface, not a public feed, global ranking, or enterprise org suite.
- Player consent is the access primitive. Joining a workspace never exposes the player's whole account/history by default.
- Team-safe snapshots are scoped, redacted, and audit-backed. Revocation stops future private source access while preserving a clear audit trail.
- Coach notes are human context. They cannot change deterministic analysis, confidence, coverage, blockers, validation state, or Coach Extremo truth.
- Team access is separate from solo Pro and Social Pro. Team grants/seats are server-owned and auditable.
- Seat billing remains deferred. Phase 13 creates seat/accounting foundation and manual/admin Team beta support, not self-serve Stripe seat billing.
- Copy must sell workflow value: reviewing multiple reports, coordinating next training blocks, protecting privacy, and sharing safe packets.

## Risks And Mitigations

| Risk | Planning Mitigation |
|---|---|
| Solo Pro accidentally grants Team access | Add `team-coach-access` tests that prove Pro/Social Pro alone cannot create/review/export Team artifacts. |
| Coach workspace leaks private player data | Build allowlisted team-safe snapshots and forbidden-field tests before routes/actions consume data. |
| Community squads become private Team access | Keep Team persistence and resolver separate; use squad code only as an implementation pattern. |
| Team packet hides uncertainty | Reuse required honesty fields and add tests that controls cannot hide confidence, coverage, blockers, validation, or disclaimers. |
| Human coach notes become technical truth | Keep notes/status separate from analysis payloads and forbid mutations of deterministic fields. |
| Seat billing scope creep | Implement seat limits and audit foundation only; leave Stripe seat pricing/webhook/proration to a future phase. |
| Team UI becomes a generic CRM | First fold is evidence triage: players needing attention, blockers, validation status, and next action. |
| Delivered claimed without privacy/browser evidence | Dedicated verifier requires row-by-row evidence and Playwright desktop/mobile matrix. |

## Recommended Verification

Phase 13 plans should require:

- Focused tests for Team contracts, access resolver, denial reasons, seat accounting, invites, consent/share/revoke, redaction, packet links, review notes/status, cockpit/dossier view models, and actions.
- Privacy tests proving private account data, billing state, raw analysis payloads, private history, private links/readers, support notes, payment metadata, and sensitive health/preparation details do not enter Team outputs.
- `npm run test:monetization`
- `npm run test:community:unit` when community/squad/admin surfaces are touched
- `npm run typecheck`
- `npx vitest run`
- `npm run benchmark:gate`
- `npm run build`
- `npx playwright test e2e/phase13-team-coach.spec.ts`
- `npm run verify:phase13:team-coach`

## Sources

- `.planning/phases/13-team-and-coach-expansion/13-CONTEXT.md` - locked Phase 13 decisions D-01 through D-70.
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` - project value, TEAM-01/TEAM-02, current focus, and prior phase status.
- `.planning/codebase/ARCHITECTURE.md`, `STACK.md`, `TESTING.md`, `CONCERNS.md`, `CONVENTIONS.md`, `STRUCTURE.md`, `INTEGRATIONS.md` - local architecture, stack, testing, conventions, and integrations.
- `docs/SDD-comunidade.md`, `docs/COMMUNITY-EXECUTION-PLAN.md` - community boundaries, public/private semantics, entitlement-ready patterns, and squad/community caveats.
- `docs/SDD-analise-spray.md`, `docs/SDD-inteligencia-de-sens.md`, `docs/SDD-coach-extremo.md`, `docs/benchmark-runner.md`, `docs/benchmark-reports/latest.md` - analysis/coach truth, confidence, benchmark, and no-overclaim constraints.
- `docs/monetization-runbooks.md` - server-owned paid truth, safe degradation, and support/audit posture.
- `src/types/monetization.ts`, `src/lib/product-entitlements.ts`, `src/lib/premium-projection.ts`, `src/lib/social-pro-access.ts` - current entitlement and access patterns.
- `src/types/social-pro.ts`, `src/core/social-pro-report-redaction.ts`, `src/core/social-pro-report-view-model.ts`, `src/actions/social-pro-reports.ts`, `src/lib/social-pro-link-token.ts` - report redaction, packet, and link lifecycle patterns.
- `src/core/community-squads.ts`, `src/actions/community-squads.ts`, `src/db/schema.ts` - squad invite/member patterns and persistence shape.
- `scripts/verify-phase12-revenue-ops.ts`, `src/ci/phase12-revenue-ops-evidence.test.ts` - current phase verifier pattern.

## RESEARCH COMPLETE
