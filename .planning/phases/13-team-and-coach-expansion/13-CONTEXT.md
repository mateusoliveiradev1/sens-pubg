# Phase 13: Team And Coach Expansion - Context

**Gathered:** 2026-05-10T22:16:47.5607753-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 extends Sens PUBG from a solo Pro improvement loop into a paid team/coach workflow.

The phase delivers a first-class **Mesa do Coach** workspace: a coach or analyst can invite players, receive consented team-safe reports, review multiple player reports, triage blockers, open a player dossier, leave private review notes, request next validation/training actions, and share/export a redacted premium review packet without exposing private account data.

The wedge is **coach/analyst solo with a small roster of players**. The system should support small teams/squads as a natural shape, but it must not jump straight to enterprise org management, full seat billing, accounting, coach marketplace, live chat, real-time in-game coaching, or backend video processing.

This phase must keep browser-first analysis intact. Deterministic analysis, confidence, coverage, blockers, inconclusive states, compatible validation, Spray Lab execution, Ciclo Pro state, and Social Pro report redaction remain the truth layers. Team/coach surfaces organize and review that evidence; they do not alter technical conclusions, certify a coach, rank players globally, or promise improvement.

</domain>

<decisions>
## Implementation Decisions

### First Team/Coach Product
- **D-01:** The first paid team/coach product is **Mesa do Coach**, not an enterprise org suite.
- **D-02:** The primary buyer/user is a coach, analyst, or team lead who reviews a small roster of players.
- **D-03:** The first user story is: coach creates workspace, invites players, receives shared reports, reviews evidence, leaves next-step feedback, and tracks who needs validation/repair.
- **D-04:** The first workspace should feel like a premium operating surface for coaching decisions, not a social feed, leaderboard, or generic CRM.
- **D-05:** Small squad/team use is supported through the same workspace model, but the language should avoid implying full esports organization management in v1.
- **D-06:** Existing `communitySquads` can inspire invite/member patterns, but Phase 13 should not simply reuse public/social squad semantics as the private paid coach workspace.
- **D-07:** Team workspace identity is private and operational by default. Public squad identity remains a community feature, not the source of private coach access.
- **D-08:** The product name used in UI can be `Mesa do Coach`; planner may choose route naming such as `/team`, `/coach`, or `/mesa-coach`.
- **D-09:** The workspace must be useful for a coach with 2-8 players before optimizing for larger organizations.
- **D-10:** Enterprise concepts such as departments, multiple rosters, custom roles per org, SSO, procurement, contracts, tax, invoices, and coach marketplace are deferred.

### Multi-Player Review Experience
- **D-11:** The central TEAM-01 surface is a **coach cockpit** with roster, latest reports, blocker lanes, validation status, and next action.
- **D-12:** The first fold should answer: which players need coach attention today, why, and what is the smallest evidence-safe next action?
- **D-13:** The cockpit should prioritize evidence states over vanity metrics: weak capture, missing validation, regression, no clear change, repair, stale context, completed protocol, and ready for next block.
- **D-14:** The coach sees multiple player reports as a triage queue plus roster summary, not as a global ranking.
- **D-15:** Each player has a **Dossie do Jogador** view with shared reports, active context, recent blockers, current protocol/Ciclo Pro/Spray Lab state, compatible validation status, and coach notes.
- **D-16:** Cross-player comparison is allowed only as operational triage, such as "3 players need Beryl 3x validation" or "2 players are blocked by weak capture". It must not become an absolute skill leaderboard.
- **D-17:** Coach review notes are private workspace artifacts. They may summarize observations and next requests, but they cannot mutate deterministic analysis, thresholds, confidence, or coach truth.
- **D-18:** Coach can mark review status such as `needs_review`, `reviewed`, `waiting_player`, `validation_requested`, `repair_requested`, and `archived`.
- **D-19:** Coach can request next action from existing product loops: new compatible clip, Spray Lab session, Ciclo Pro mission, blocker repair, or updated Team Review Packet.
- **D-20:** The coach cockpit should link into existing Analyze, History, Spray Lab, Ciclo Pro, Social Pro report, and dashboard evidence instead of rebuilding those systems.
- **D-21:** The experience should be dense, serious, and premium: compact table/lanes for scanning, dossier detail for audit, and no marketing hero page as the first workspace screen.
- **D-22:** Mobile should support review and status triage, but desktop can be the primary coach workflow for dense roster review.

### Permission, Privacy, And Consent
- **D-23:** Player consent is the central access primitive. A coach/team cannot inspect a player's private account, full history, raw private analysis payload, private notes, private links, billing state, or unshared reports by default.
- **D-24:** A player shares into a workspace through an invitation or explicit share action. Joining a team does not automatically expose all existing or future history.
- **D-25:** Team access is scoped to a **team-safe report snapshot** or explicitly shared source IDs, not the player's entire account.
- **D-26:** Team-safe snapshots must preserve mandatory honesty fields: confidence, coverage, blockers, inconclusive state, limited support, validation state, and no-overclaim disclaimer.
- **D-27:** Shared reports can include safe context from analysis, protocol, Spray Lab, Ciclo Pro, compatible validation, and current state when the player explicitly shares those sources.
- **D-28:** Sensitive/private fields stay hidden: private account details, payment state, full private history, hidden history entries, private collection contents, private report readers, internal support/admin notes, raw video, raw frame data, payment metadata, and sensitive preparation/health details.
- **D-29:** Coaches can request access to additional report context, but the player must approve before expanded data becomes visible.
- **D-30:** Players can revoke team sharing. Existing coach notes remain as workspace audit artifacts, but future access to revoked private source data must stop.
- **D-31:** Revocation must leave a clear audit trail: who revoked, when, what source access stopped, and what safe snapshot remains readable if any.
- **D-32:** Workspace roles should start with stable roles: `owner`, `coach`, `analyst`, and `player`. Planner may add `viewer` only if it keeps access logic simple.
- **D-33:** Owners manage workspace, invites, roster, and billing/seat foundation. Coaches/analysts review shared reports. Players control their own shared evidence.
- **D-34:** Role checks must be enforced server-side in actions/loaders. Client state, URL params, localStorage, public report links, or community membership cannot grant coach/team access.
- **D-35:** Access decisions should produce stable denial reasons such as no workspace membership, role blocked, invite expired, consent missing, report revoked, Team entitlement missing, and source not shared.
- **D-36:** Every team-sensitive action needs audit evidence: invite sent/accepted/revoked, report shared, report revoked, review note created, export created, link revoked, role changed, and workspace archived.

### Premium Share And Export
- **D-37:** TEAM-02 is delivered as a **Team Review Packet**: a premium, redacted, evidence-backed packet for one player/report context that a coach can read, share, print, or export safely.
- **D-38:** The first export format should be a secure web packet plus print-friendly layout. PDF generation can be added only if it fits existing build/runtime constraints without heavy new infrastructure.
- **D-39:** Team Review Packet builds on Social Pro report redaction, but adds coach/team context: review status, coach note summary, requested next action, team-safe source list, and workspace audit metadata.
- **D-40:** External sharing uses revocable high-entropy links, expiration controls, and public-safe redaction. It must not expose private reader identities or raw token values in storage.
- **D-41:** Public discoverability is off by default for team exports. A team packet is private/unlisted unless explicitly published through an already safe public Social Pro path.
- **D-42:** Export controls must preserve required honesty fields. A coach or owner cannot remove confidence, coverage, blockers, validation state, or no-overclaim copy from a shared packet.
- **D-43:** Export copy should say this is an evidence review and next-step coaching packet, not certification, rank proof, guaranteed improvement, or official PUBG/KRAFTON material.
- **D-44:** Exported packets should distinguish technical proof, training execution, practical transfer, compatible validation, blockers, repairs, coach review notes, and current state.
- **D-45:** A canceled/lost Team entitlement should prevent creating new exports and editing controls, but already shared safe packets may remain readable in their last safe state unless revoked or disabled.
- **D-46:** Admin/moderation/support should be able to disable unsafe team packets or links without deleting audit history.

### Team Gate, Entitlements, And Seats
- **D-47:** Team features must be gated separately from solo Pro. A solo Pro subscription does not automatically grant coach workspace/player-review authority.
- **D-48:** Existing planned entitlement keys `team.player_review` and `team.seats` should become the Team expansion foundation.
- **D-49:** `team.player_review` gates Mesa do Coach creation/review/export workflows.
- **D-50:** `team.seats` is implemented as a seat/accounting foundation and workspace limit, but real self-serve seat billing can remain deferred.
- **D-51:** Phase 13 should support manual/admin Team beta grants or internal flags so the workflow can be tested before Stripe seat billing exists.
- **D-52:** Seat concepts should be explicit: seat limit, occupied seats, invited seats, pending invites, active members, suspended members, and revoked members.
- **D-53:** Seat state must be server-owned and auditable. Client-side roster counts or checkout success URLs never grant seats.
- **D-54:** Future seat billing should map into the same Team access resolver instead of requiring a rewrite.
- **D-55:** Team access should not weaken existing solo Pro resolver truth. Product Pro, Social Pro, and Team access are related paid domains but have separate capability checks.
- **D-56:** Free/public community basics remain open. Team gating must not accidentally close public reports, public community reading, normal saves, likes, comments, follows, or basic profiles.
- **D-57:** Pricing and locks can preview team value, but real charging for seats remains blocked until a later phase or explicit plan provides Stripe price/product, webhook, proration, cancellation, support, and Revenue Ops evidence.

### Coach Truth And Product Claims
- **D-58:** Team/coach workflow organizes evidence; it does not make coach conclusions stronger than the underlying analysis supports.
- **D-59:** Coach notes are human review context, not deterministic truth. They can recommend next actions but cannot override confidence, coverage, blockers, or validation state.
- **D-60:** A team coach can request a different protocol or focus review only through explicit review status and note, not by silently changing the player's saved analysis or Coach Extremo result.
- **D-61:** Team reports should avoid language like `coach certificado`, `jogador aprovado`, `rank garantido`, `melhora garantida`, `sens perfeita`, or global player grade.
- **D-62:** Coach/team value is sold as workflow value: reviewing multiple player reports, protecting privacy, coordinating next training blocks, exporting safe packets, and preparing for seat-based teams.
- **D-63:** PUBG API-derived data, if ever present, remains supporting context and cannot be exclusive paid team value.

### Verification And No False Team Gate
- **D-64:** Phase 13 needs a dedicated verifier, expected as `npm run verify:phase13:team-coach` or equivalent.
- **D-65:** Verification must prove Team access is separate from solo Pro and Social Pro, while preserving public/community behavior.
- **D-66:** Tests must cover workspace creation, invites, role checks, consent/share/revoke, team-safe report redaction, review notes, review status, export packet creation, private links, seat accounting, and denial reasons.
- **D-67:** Privacy tests must prove private account data, billing state, raw analysis payloads, private history, private links/readers, support notes, payment metadata, and sensitive health/preparation detail do not leak into coach/team outputs.
- **D-68:** UI/browser evidence must cover coach cockpit, roster, player dossier, share/consent, export packet, locked Team state, revoked access, and mobile overflow.
- **D-69:** Required gates should include focused Phase 13 tests, `npm run test:monetization`, `npm run test:community:unit` if community/squad code is touched, `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`, `npm run build`, and relevant Playwright evidence.
- **D-70:** Final status cannot be `Delivered` unless Team workspace, privacy, access, export/share, seat foundation, copy-safety, and evidence matrix rows are all accounted for.

### the agent's Discretion
The researcher/planner may choose exact route names, table names, schema shape, Team access resolver API, UI component boundaries, review status enum naming, export packet route shape, print/PDF implementation details, seat limit defaults, and plan wave count.

That discretion does not include making solo Pro automatically grant Team review authority, mixing public community squads with private paid workspaces without an explicit boundary, exposing private player/account/payment data, weakening Social Pro redaction, hiding evidence honesty fields, turning coach notes into deterministic truth, adding enterprise org management, adding self-serve seat billing without full payment evidence, adding a coach marketplace, claiming certified authority, or marking the phase complete without a No False Team verification matrix.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Core value, browser-first constraint, team/coach expansion as later paid value, no-overclaim rules, and original-value monetization boundary.
- `.planning/REQUIREMENTS.md` - Phase 13 requirements: TEAM-01 and TEAM-02. Note: the traceability table still says Phase 6 for TEAM rows; use `.planning/ROADMAP.md` and `.planning/STATE.md` as the current phase mapping.
- `.planning/ROADMAP.md` - Phase 13 goal, success criteria, and boundaries after solo Pro, Social Pro, and Revenue Ops.
- `.planning/STATE.md` - Current focus is Phase 13; prior phases 10-12 are complete/partial as context for team expansion.

### Prior Phase Decisions
- `.planning/phases/05-freemium-pro-mvp/05-CONTEXT.md` - Server-owned paid truth, Free/Pro projection, quota/billing boundaries, no client-granted access, and safe monetization copy.
- `.planning/phases/07-premium-visual-ui-ux/07-CONTEXT.md` - Premium visual system, dense/serious paid surfaces, mobile overflow safety, locks, and no false perfect copy.
- `.planning/phases/08-complete-training-protocols/08-CONTEXT.md` - Complete protocol truth, coach downgrade behavior, transfer evidence, preparation safety, and LLM copy-only limits.
- `.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-CONTEXT.md` - Spray Lab execution evidence, compatible validation hierarchy, repair states, and benchmark truth.
- `.planning/phases/10-guided-pro-training-programs/10-CONTEXT.md` - Ciclo Pro program state, missions, checkpoints, dashboard/history/Analyze/Spray Lab handoffs, and no generic course boundary.
- `.planning/phases/11-social-pro-community-premium/11-CONTEXT.md` - Relatorio Pro Compartilhavel, public-safe redaction, Pro library, private links, badge meaning, moderation, and Social Pro privacy.
- `.planning/phases/12-revenue-operations-hardening/12-CONTEXT.md` - Revenue Ops access/support posture, paid evidence matrix, test-vs-production separation, safe degradation, and launch no-go rules.

### Product And Domain Docs
- `docs/SDD-comunidade.md` - Existing community architecture, public feed/profile/post model, moderation, and entitlement-ready community design.
- `docs/COMMUNITY-EXECUTION-PLAN.md` - Community verification posture, `verify:community`, creator metrics, and entitlement boundary.
- `docs/SDD-analise-spray.md` - Spray analysis confidence, coverage, inconclusive limits, and anti-overclaim posture.
- `docs/SDD-inteligencia-de-sens.md` - Sensitivity recommendation constraints, confidence-governed aggressiveness, and multi-clip validation safety.
- `docs/SDD-coach-extremo.md` - Deterministic coach behavior, memory, LLM copy restrictions, and benchmark expectations.
- `docs/benchmark-runner.md` - Benchmark gate workflow and truth-safety expectations.
- `docs/benchmark-reports/latest.md` - Current benchmark/calibration readiness signal.
- `docs/monetization-runbooks.md` - Paid support/safe-degradation runbooks that Team gates should not contradict.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Browser-first pipeline, persistence model, auth/admin, community architecture, admin/ops surfaces, and release readiness.
- `.planning/codebase/STACK.md` - Next.js App Router, strict TypeScript, Drizzle/Postgres, Vercel, Vitest/Playwright, and scripts.
- `.planning/codebase/TESTING.md` - Unit, integration, Playwright, benchmark, monetization, community, and release verification expectations.
- `.planning/codebase/CONCERNS.md` - Backend video caveat, rate-limit caveat, OAuth/ops gaps, local secrets warning, and production readiness risks.
- `.planning/codebase/CONVENTIONS.md` - Strict unions, server actions, schema/migration patterns, CSS modules, pt-BR copy posture, and operational conventions.
- `.planning/codebase/STRUCTURE.md` - App routes, server actions, core modules, schema, tests, fixtures, and naming patterns.
- `.planning/codebase/INTEGRATIONS.md` - Vercel, Neon, Auth providers, Discord bot, Groq/OpenAI-compatible coach copy, browser APIs, and metadata gaps.

### Existing Product Code
- `src/types/monetization.ts` - Existing planned Team entitlements `team.player_review` and `team.seats`, ProductAccessState, event types, locks, and evidence item contracts.
- `src/lib/product-entitlements.ts` - Server-owned product access resolver and Pro/Social Pro entitlement catalog pattern; Team access must be similarly server-owned.
- `src/lib/premium-projection.ts` - Existing lock/projection copy includes Team feature titles and should guide Team lock behavior.
- `src/lib/social-pro-access.ts` - Capability-policy pattern for Social Pro access; likely analog for Team access.
- `src/types/social-pro.ts` - Public-safe report visibility/status/honesty/control contracts to extend for team-safe packets.
- `src/core/social-pro-report-redaction.ts` - Public-safe redaction and required honesty field enforcement.
- `src/core/social-pro-report-view-model.ts` - Evidence layer and continuity action model for shareable report/dossier surfaces.
- `src/actions/social-pro-reports.ts` - Owned source loading, safe snapshot creation, private link lifecycle, audit events, and public/private report reads.
- `src/actions/social-pro-library.ts` - Pro private library write/access patterns for context-aware saved items.
- `src/core/social-pro-creator-analytics.ts` - Safe aggregate analytics pattern; useful for privacy boundaries, not direct Team finance analytics.
- `src/core/community-squads.ts` - Existing squad invite/member/goal logic that can inspire but not replace private Team workspace contracts.
- `src/actions/community-squads.ts` - Existing invite, membership, role, visibility, and goal refresh action patterns.
- `src/db/schema.ts` - Existing users, analysis sessions, precision lines/checkpoints, coach outcomes, protocol revisions, Spray Lab, training programs, Social Pro reports/links/audit/collections, monetization, community squads, and audit logs.
- `src/actions/history.ts` - Saved analysis, protocol outcomes/revisions, transfer records, and history source ownership checks.
- `src/actions/dashboard-active-coach-loop.ts` - Current active coach loop and evidence handoff model.
- `src/core/training-program-coach-handoff.ts` - Program evidence hierarchy and coach signals.
- `src/core/spray-lab-coach-handoff.ts` - Spray Lab evidence hierarchy and coach-safe handoff.
- `src/app/community/reports/[token]/page.tsx` and `src/app/community/reports/[token]/pro-report-detail.tsx` - Existing shareable report route and public-safe detail surface.
- `src/app/ciclo-pro/page.tsx`, `src/app/spray-lab/page.tsx`, `src/app/history/page.tsx`, `src/app/history/[id]/page.tsx`, `src/app/dashboard/page.tsx` - Evidence and continuity surfaces that Team review should link to instead of duplicating.
- `package.json` - Existing phase verifier scripts and gate patterns; Phase 13 should add `verify:phase13:team-coach`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `team.player_review` and `team.seats` already exist as planned entitlement keys in `src/types/monetization.ts`.
- `resolveProductAccess` and `hasProductEntitlement` already establish server-owned capability resolution.
- Social Pro already has safe report snapshots, required honesty fields, revocable private links, public/private visibility, and audit events.
- Social Pro report source IDs already cover analysis sessions, history, protocol revisions, Spray Lab sessions, training program cycles, and validation links.
- Community squads already provide invite, membership, role, visibility, and small-group concepts, but they are social/community oriented.
- Training Program and Spray Lab handoff modules already separate technical proof, execution evidence, practical transfer, blockers, and state.
- Revenue Ops already has support/cause-tree patterns that can inspire explicit Team denial reasons and support diagnostics later.

### Established Patterns
- Server actions own authenticated mutations and ownership checks.
- Deterministic code owns technical truth; UI and human notes present/contextualize it.
- Free/public surfaces stay useful; paid features add depth, continuity, organization, review, and safe sharing.
- Public-safe snapshots are allowlisted and must not expose private data.
- Required honesty fields cannot be hidden by user controls.
- Links/tokens store verifier hashes/prefixes, not raw tokens.
- Phase-specific verifiers and evidence matrices are the standard for No False Done gates.
- pt-BR copy should be direct, premium, serious, and evidence-bound.

### Integration Points
- Add Team/Coach contracts in a new `src/types/team-coach.ts` or equivalent with workspace roles, consent scopes, report packet status, review status, seat state, and denial reasons.
- Add Team access policy/resolver in `src/lib`, analogous to Social Pro access but gated by `team.player_review` and `team.seats`.
- Add Team persistence in `src/db/schema.ts` and Drizzle migration for workspaces, memberships, invites, report shares, review notes, review status/events, export links, seat ledgers, and audit events.
- Add server actions for creating workspace, inviting player/coach, accepting invite, sharing/revoking report, adding coach note, updating review status, creating/revoking export links, and reading coach cockpit/dossier data.
- Build Team-safe report packets by reusing Social Pro redaction and source ownership patterns.
- Add a route for coach cockpit and player dossier; planner can choose exact path.
- Link from History, Social Pro report, dashboard, Ciclo Pro, and Spray Lab to share/report into Mesa do Coach when Team access exists.
- Add locked-state and upgrade-intent projection for Team features without activating self-serve seat billing.
- Add `verify:phase13:team-coach`, focused tests, copy-safety checks, and desktop/mobile Playwright evidence.

</code_context>

<specifics>
## Specific Ideas

- User selected all gray areas and asked the agent to answer everything with the most polished/perfect version possible.
- Interpret "perfect and polished" as specific product contracts, privacy-safe defaults, serious premium UI, stable state machines, explicit access reasons, and verification evidence.
- Recommended product wedge is coach/analyst solo with a small player roster, because it delivers Team value without enterprise scope creep.
- Preferred user-facing concept is **Mesa do Coach**.
- Preferred packet concept is **Team Review Packet**: secure, redacted, evidence-backed, coach-review-aware, and print/share safe.
- The main experience should feel like a coach operating room: roster triage, blockers, validation needs, review status, and player dossier.
- Team gate must be separate from solo Pro, but must still use server-owned paid truth.

</specifics>

<deferred>
## Deferred Ideas

- Self-serve Stripe seat billing, proration, invoices, cancellation flows, and production seat-payment evidence are deferred.
- Enterprise organization management, multi-roster hierarchy, custom roles, SSO, procurement, and tax/accounting are deferred.
- Coach marketplace, coach certification, affiliate/referral compensation, creator payouts, and public coach revenue analytics are deferred.
- Real-time chat, video annotation tools, live coaching, in-game overlays, and backend video processing are deferred.
- Public team leaderboards, global player rankings, absolute skill grades, and paid authority badges remain out of scope.
- Shareable public collections remain deferred unless a later phase proves the moderation/privacy scope is safe.

</deferred>

---

*Phase: 13-Team And Coach Expansion*
*Context gathered: 2026-05-10T22:16:47.5607753-03:00*
