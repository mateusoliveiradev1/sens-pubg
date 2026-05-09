# Phase 11: Social Pro Community Premium - Research

**Researched:** 2026-05-09  
**Domain:** Next.js App Router community monetization, server-side Pro entitlements, public-safe social reporting, privacy-preserving creator analytics  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

The following locked decisions, discretion areas, and deferred ideas are copied from `.planning/phases/11-social-pro-community-premium/11-CONTEXT.md`. [VERIFIED: .planning/phases/11-social-pro-community-premium/11-CONTEXT.md]

### Locked Decisions

### Free/Open Community And Pro Depth
- **D-01:** Public feed, public posts, basic profiles, likes, comments, normal saves, follows, and existing public community reading remain open/free where already open.
- **D-02:** Pro social value is depth, polish, organization, sharing, and audit continuity. Pro does not hide basic evidence truth.
- **D-03:** The Phase 11 hero is **Relatorio Pro Compartilhavel**.
- **D-04:** The product cut is **Free aberto + Pro profundo**: Free stays useful and trustworthy; Pro adds shareable premium report, Pro badge, private context library, saved drills, advanced post context, safe creator analytics, and continuity with Ciclo Pro/Spray Lab.
- **D-05:** Community upgrade value must point back to original Sens PUBG value: analysis, coach, history, complete protocols, Spray Lab, Ciclo Pro, compatible validation, and evidence-backed improvement workflow.
- **D-06:** No paid value in Phase 11 may be based only on exclusive PUBG API-derived data.

### Relatorio Pro Compartilhavel
- **D-07:** Only Pro can create/generate the premium shareable report.
- **D-08:** Reading the public-safe report does not require Pro. A report shared publicly or by link must remain useful, polished, and honest for non-Pro readers.
- **D-09:** The report format is a **case de evolucao auditavel**, not just a pretty social card and not a dense raw technical dump.
- **D-10:** The report includes evolution with controlled evidence: base analysis, diagnosis, confidence/coverage, blockers, complete protocol, Spray Lab execution, Ciclo Pro state, compatible validation, and final/current state when available.
- **D-11:** Sensitive/private fields are summarized, redacted, or hidden by default. The public report must never expose private account data, internal notes, whole history, private collection contents, sensitive health/preparation notes, payment state, or hidden history entries.
- **D-12:** The report is safe by default plus Pro controls. Pro users may show/hide only public-safe sections such as setup summary, drill context, validation, timeline, advanced context, and safe sensitivity/setup fields.
- **D-13:** The UI must prevent inconsistent or unsafe public reports. User controls cannot remove required honesty fields such as confidence, coverage, blockers, inconclusive state, limited support, or no-overclaim disclaimers when those apply.
- **D-14:** Report copy must avoid perfect sensitivity, guaranteed improvement/rank, global player grade, official PUBG/KRAFTON affiliation, and paid-user authority claims.

### Report Visibility, Links, And Lifecycle
- **D-15:** Pro reports support two visibility modes: `Publicar na comunidade` and `Link privado`.
- **D-16:** Public reports appear in community/profile surfaces and are moderated like public community content.
- **D-17:** Link-private reports are unlisted: not in feed/discovery/profile lists by default, readable only by link, and still public-safe/redacted.
- **D-18:** Private report links are revocable and can be regenerated.
- **D-19:** Private report links may have optional expiration. The default does not need automatic expiration, so long-term evolution links do not break unexpectedly.
- **D-20:** Admin/moderation can disable or hide abusive reports/links.
- **D-21:** If a user cancels or loses Pro, existing published/shared reports remain readable in their last safe state. Creating new reports, editing advanced report controls, Pro analytics, and Pro library features require active Pro access.

### Moderation And Safety
- **D-22:** Pro public reports reuse the existing community moderation infrastructure: report, hidden, archived, deleted/restricted states, moderation actions, and audit logs.
- **D-23:** Phase 11 adds Pro-report-specific report reasons: exposicao indevida, dados sensiveis, claim enganosa, falsa autoridade, abuso de badge Pro, and uso indevido de contexto premium.
- **D-24:** Moderation must preserve auditability and avoid silent deletion of disputed premium reports.
- **D-25:** A report must clearly distinguish technical evidence, training execution, practical transfer, and compatible validation. TDM/real-match transfer remains practical evidence, not technical proof.

### Private Collections And Saved Drills
- **D-26:** Pro collections are a **biblioteca Pro pessoal conectada ao treino**, not generic favorites.
- **D-27:** Pro can save reports, posts, setups, drills, Ciclo Pro missions, Spray Lab sessions, and compatible validations into private context-aware collections.
- **D-28:** Collections organize by meaningful training context: weapon, optic, distance/range, diagnosis, active line, Ciclo Pro, Spray Lab lane, objective, validation state, and blocker.
- **D-29:** Collection organization is hybrid: intelligent automatic collections plus manual Pro curation.
- **D-30:** Example automatic collections include `Beryl 3x 50m`, `controle vertical`, `Ciclo Pro ativo`, `validacoes pendentes`, `reparo de captura`, and `Spray Lab - consistencia`.
- **D-31:** Pro social library appears in a compact Pro hub inside `/community` and through contextual shortcuts from report, post, dashboard, Ciclo Pro, Spray Lab, history, and result surfaces.
- **D-32:** Free can continue normal community saves. When a Free user attempts a Pro-library action for reports/drills/advanced context, show a useful preview plus honest lock explaining Pro organization by context.
- **D-33:** Pro collections are private by default. Shareable collections are deferred unless planning proves they fit safely without becoming a large new publishing/moderation surface.

### Badge, Creator Analytics, And Social Trust
- **D-34:** The Pro badge means active Pro access/subscriber state only. It does not mean technical authority, coach verification, higher skill, creator certification, or pro-player status.
- **D-35:** Badge copy/tooltip must explicitly avoid authority confusion. Suggested posture: `Pro: acesso aos recursos premium do Sens PUBG`.
- **D-36:** Badge appears with moderation on key social surfaces only: public profile, post author identity, Pro report, Pro social hub, and creator cards.
- **D-37:** Badge style should be discreet, refined, accessible, and consistent with the Phase 7 premium system. It must not be loud, gamified, or visually imply competitive rank.
- **D-38:** Creator analytics Pro shows safe social impact: public posts, setup/sens copies, saves, comments, follows, generated reports, clicks into analysis/training, and contexts that generate interest.
- **D-39:** Creator analytics must not expose private reader identities, private collection contents, private report link readers, payment/funnel data, raw private analysis data, or financial conversion metrics.
- **D-40:** Creator analytics live in the Pro social panel inside the community hub, alongside reports, library, and collections.
- **D-41:** Advanced revenue/funnel analytics belong to Phase 12, not creator-facing Phase 11.

### Upgrade Cues And Product Analytics
- **D-42:** Upgrade cues are contextual, elegant, and tied to real intent.
- **D-43:** Do not add generic aggressive Pro banners to the feed. The public community should remain a clean trust funnel.
- **D-44:** Cues appear when the user attempts or explores real Pro value: generate report, save item into Pro library, open creator analytics, use advanced post context, use Pro report/badge controls, or connect post/drill to Ciclo Pro.
- **D-45:** Cue copy is premium, utilitarian, and honest. Suggested posture: `O Free mantem a leitura publica. O Pro organiza este contexto em relatorio, biblioteca e Ciclo Pro.`
- **D-46:** Upgrade-intent analytics should record only real Pro actions or CTA clicks, not every lock impression.
- **D-47:** Phase 11 analytics stay privacy-minimal and should feed Phase 12 later without exposing private clips, private links, private readers, or payment data to social surfaces.

### Visual Identity And Social Pro UX
- **D-48:** Visual language is **premium editorial tecnico**.
- **D-49:** Relatorios Pro should feel like a polished technical dossier: strong hierarchy, restrained surfaces, discreet badges, audit timeline, evidence emphasis, precise CTAs, and safe public reading.
- **D-50:** Report structure uses three visual layers: public summary, audit/evidence timeline, and Pro continuity/actions.
- **D-51:** The public summary answers what changed, what evidence supports it, what remains blocked/inconclusive, and what the next action is.
- **D-52:** The audit/evidence timeline shows analysis, protocol, Spray Lab, Ciclo Pro, compatible validation, blockers, repairs, and current state without becoming a wall of raw data.
- **D-53:** Pro continuity/actions link to generate/update report, save to library, continue Ciclo Pro, open Spray Lab, record validation, or resolve blockers.
- **D-54:** The Pro social hub is a compact cockpit inside `/community`, not a separate analytics product or duplicate dashboard.
- **D-55:** The hub includes recent reports, context library, safe analytics, intelligent collections, and CTAs to generate report or continue Ciclo Pro/Spray Lab.
- **D-56:** UI must be mobile-first, overflow-safe, accessible, and consistent with Phase 7 tokens/components. Premium polish clarifies evidence instead of hiding uncertainty.

### Entitlement And Server Truth
- **D-57:** Product Pro entitlements are server-owned and must flow through the existing product access resolver pattern, not client state.
- **D-58:** Community-only entitlement scaffolding can inform policy shape, but Phase 11 Pro access must not be implemented as an inactive UI-only community entitlement.
- **D-59:** Existing product entitlement keys `community.pro_badge`, `community.premium_report_share`, and `community.creator_attribution` should be activated or refined through the product entitlement catalog as needed.
- **D-60:** Planning may add new product entitlement keys if needed for Pro library, creator analytics, private report links, or advanced social context, but must keep Free public community behavior intact.
- **D-61:** All report creation, link controls, library writes, analytics reads, and badge entitlement decisions must be enforced server-side.

### No False Premium Verification
- **D-62:** Phase 11 requires a dedicated verification gate, expected as `npm run verify:phase11:social-pro` or equivalent.
- **D-63:** The verification matrix must prove Free public feed, public posts, public profiles, likes, comments, normal saves, follows, and basic community reading remain open/free where already open.
- **D-64:** The matrix must prove Pro-only creation/editing for shareable reports, private links, Pro library, advanced context, badge controls, and creator analytics.
- **D-65:** The matrix must prove public-safe report redaction, required honesty fields, safe defaults, public vs unlisted visibility, link revocation, optional expiration, cancellation behavior, and moderation disable/hide behavior.
- **D-66:** The matrix must prove Pro-specific moderation reasons, audit logs, report lifecycle states, and no silent entitlement leaks.
- **D-67:** The matrix must prove upgrade-intent analytics fire only on real Pro actions/CTA clicks and remain privacy-minimal.
- **D-68:** Required gates include focused Phase 11 tests, `npm run typecheck`, `npx vitest run`, `npm run test:community:unit`, `npm run test:community:e2e`, `npm run test:community:visual`, `npm run test:monetization`, `npm run benchmark:gate`, `npm run build`, and desktop/mobile Playwright evidence for key social Pro states.
- **D-69:** If a route/UI change materially affects community, pricing, billing, history, dashboard, Ciclo Pro, Spray Lab, or result handoffs, focused page/contract and Playwright coverage must be added.
- **D-70:** Final status cannot be `Delivered` unless the No False Premium matrix is complete and all required gates are accounted for with evidence.

### the agent's Discretion
The researcher/planner may choose exact route names, table names, schema layout, entitlement key additions, component boundaries, CSS module names, view-model shapes, event names, exact copy wording, visual composition, and plan wave count.

That discretion does not include closing public community basics, hiding evidence truth, weakening confidence/coverage/blocker visibility, treating paid badge as authority, exposing private data, making unlisted links unrevokable, relying on UI-only entitlement checks, making PUBG API-derived data exclusive paid value, adding team/coach workflows, adding creator payout/funnel finance analytics, creating global rankings, or declaring Phase 11 complete without No False Premium evidence.

### Deferred Ideas (OUT OF SCOPE)
- Team/coach review workflow remains Phase 13.
- Revenue operations, funnel dashboards, conversion/churn/revenue admin metrics, and financial analytics remain Phase 12.
- Creator payouts, affiliate/referral compensation, and public creator monetization program remain future work.
- Shareable public collections are deferred unless planning proves they fit safely without expanding moderation too far.
- Global rankings, absolute skill grades, pro-player status, and paid-authority badges remain out of scope.
- Backend video processing and server-side raw video analysis remain out of scope.
- PUBG API-derived exclusive paid features remain out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MON-01 | Free users can access limited core value while Pro value is deeper. | Keep public community basics open and preserve normal saves while adding Pro-only report creation, Pro library, badge controls, creator analytics, and advanced context. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: 11-CONTEXT.md] |
| MON-02 | Pro monthly unlocks higher-value product features. | Activate/refine community Pro keys through `ProductEntitlementKey`, `productProEntitlementKeys`, premium projection copy, and server action gates. [VERIFIED: src/types/monetization.ts; VERIFIED: src/lib/product-entitlements.ts; VERIFIED: src/lib/premium-projection.ts] |
| MON-03 | Subscription status syncs into entitlement/access checks. | Use `resolveServerProductAccess` and `hasProductEntitlement` for all Pro social mutations/reads instead of client state or inactive community entitlements. [VERIFIED: src/lib/product-access-server.ts; VERIFIED: src/lib/product-entitlements.ts; VERIFIED: src/lib/community-entitlements.ts] |
| MON-04 | Paid value must not be exclusive PUBG API-derived data. | Plan Pro value around original clip analysis, coach workflow, history, protocols, Spray Lab, Ciclo Pro, organization, sharing, and audit continuity. [VERIFIED: AGENTS.md; VERIFIED: .planning/PROJECT.md; VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: 11-CONTEXT.md] |
| MON-05 | Commercial copy must avoid affiliation, perfect sensitivity, guaranteed rank, or false certainty. | Add copy-safety and report-redaction tests for report text, Pro badge tooltip, upgrade cues, and public summary language. [VERIFIED: AGENTS.md; VERIFIED: docs/SDD-analise-spray.md; VERIFIED: docs/SDD-inteligencia-de-sens.md; VERIFIED: 11-CONTEXT.md] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Preserve the browser-first analysis path unless a phase explicitly changes it. [VERIFIED: AGENTS.md]
- Do not claim perfect sensitivity or guaranteed improvement. [VERIFIED: AGENTS.md]
- Any analysis or coach change must keep confidence, coverage, and inconclusive behavior honest. [VERIFIED: AGENTS.md]
- Functional changes to analysis, sensitivity, tracking, diagnostics, or coach require targeted tests and relevant golden/benchmark checks. [VERIFIED: AGENTS.md]
- Monetization must sell original clip analysis, coach workflow, history, programs, and team workflow value; it must not make PUBG API-derived data an exclusive paid feature. [VERIFIED: AGENTS.md]
- Analysis/coach validation defaults are `npm run typecheck`, `npx vitest run`, and `npm run benchmark:gate`; release/payment/community work adds focused scripts and relevant Playwright checks. [VERIFIED: AGENTS.md]
- The repo-level planning docs list Phase 11 as the current focus even though AGENTS.md still names Phase 1, so Phase 11 planning should follow `.planning/STATE.md` and the user-provided phase scope. [VERIFIED: AGENTS.md; VERIFIED: .planning/STATE.md; VERIFIED: 11-CONTEXT.md]

## Summary

Phase 11 should be planned as a server-owned Pro social layer inside the existing community, not as a separate social product or a client-side paywall. [VERIFIED: 11-CONTEXT.md; VERIFIED: src/app/community/page.tsx; VERIFIED: src/lib/product-entitlements.ts] The hero deliverable is a polished `Relatorio Pro Compartilhavel`: Pro-only creation/editing, public-safe reading for all users, honesty fields that cannot be hidden, and lifecycle controls for public/community visibility plus unlisted private links. [VERIFIED: 11-CONTEXT.md; VERIFIED: src/core/community-post-snapshot.ts; VERIFIED: src/actions/community-posts.ts]

The main technical planning implication is that Phase 11 needs new canonical social-Pro contracts and persistence rather than simply decorating `community_posts`. [VERIFIED: src/db/schema.ts; VERIFIED: src/types/community.ts] Existing community posts/snapshots/saves/reports/moderation are strong reusable patterns, but Pro reports need report-specific visibility, link revocation/regeneration, safe report projection, advanced section controls, cancellation behavior, and moderation/audit lifecycle that current `community_posts` and `community_post_analysis_snapshots` do not fully model. [VERIFIED: src/db/schema.ts; VERIFIED: src/lib/community-access.ts; VERIFIED: src/actions/community-admin.ts; VERIFIED: 11-CONTEXT.md]

Plan the phase in slices: product entitlement activation first, schema/contracts second, safe report projection third, actions/access/moderation fourth, `/community` Pro hub and public surfaces fifth, contextual handoffs from result/history/dashboard/Ciclo/Spray Lab sixth, analytics/privacy seventh, and a dedicated No False Premium verifier last. [VERIFIED: package.json; VERIFIED: scripts/verify-phase9-spray-lab.ts; VERIFIED: scripts/verify-phase10-programs.ts; VERIFIED: 11-CONTEXT.md]  

**Primary recommendation:** Use the existing product entitlement resolver as the only Pro truth, add dedicated Social Pro report/library tables plus public-safe projection helpers, and integrate the Pro cockpit into `/community` with focused Phase 11 tests and `npm run verify:phase11:social-pro`. [VERIFIED: src/lib/product-entitlements.ts; VERIFIED: src/app/community/page.tsx; VERIFIED: package.json; VERIFIED: 11-CONTEXT.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Product Pro social entitlement truth | API / Backend | Database / Storage | Product access is already resolved server-side from subscriptions/manual grants/catalog and must not be replaced by UI state. [VERIFIED: src/lib/product-access-server.ts; VERIFIED: src/lib/product-entitlements.ts; VERIFIED: 11-CONTEXT.md] |
| Pro report creation/update | API / Backend | Database / Storage | Creation/editing requires auth, Pro checks, owned source evidence reads, safe projection, and audit writes. [VERIFIED: src/actions/community-posts.ts; VERIFIED: src/actions/spray-lab.ts; VERIFIED: src/actions/training-programs.ts; VERIFIED: 11-CONTEXT.md] |
| Public-safe report reading | Frontend Server (SSR) | API / Backend | Reports should render publicly from stored safe snapshots while link/status/moderation checks stay on the server. [VERIFIED: src/app/community/[slug]/page.tsx; VERIFIED: src/lib/community-access.ts; VERIFIED: 11-CONTEXT.md] |
| Private report links | API / Backend | Database / Storage | Revocation, regeneration, optional expiration, and unlisted lookup require server-side token/lifecycle state. [VERIFIED: 11-CONTEXT.md; CITED: OWASP ASVS V3 Session Management] |
| Pro private context library | API / Backend | Database / Storage | Library writes are Pro-only, private by default, and must reference owned/report/public entities without changing normal community saves. [VERIFIED: src/actions/community-saves.ts; VERIFIED: src/db/schema.ts; VERIFIED: 11-CONTEXT.md] |
| Pro badge rendering | Frontend Server (SSR) | API / Backend | Badge display depends on active product access and appears on public profile/post/report/creator surfaces without implying authority. [VERIFIED: src/core/community-public-profile-view-model.ts; VERIFIED: src/core/community-trust-signals.ts; VERIFIED: 11-CONTEXT.md] |
| Creator analytics | API / Backend | Database / Storage | Safe aggregates come from persisted public social events and must exclude private identities, payment, private links, and raw analysis. [VERIFIED: src/core/community-creator-metrics.ts; VERIFIED: src/lib/product-analytics.ts; VERIFIED: 11-CONTEXT.md] |
| Upgrade-intent analytics | API / Backend | Database / Storage | Existing analytics sanitizer rejects unsafe metadata shapes and Phase 11 should log only real actions/CTA clicks. [VERIFIED: src/lib/product-analytics.ts; VERIFIED: 11-CONTEXT.md] |
| Moderation/reporting for Pro reports | API / Backend | Database / Storage; Frontend Server (admin UI) | Community moderation already has reports, hide/dismiss actions, moderation actions, and audit logs; Phase 11 extends that lifecycle to Pro reports/links. [VERIFIED: src/actions/community-reports.ts; VERIFIED: src/actions/community-admin.ts; VERIFIED: src/db/schema.ts; VERIFIED: 11-CONTEXT.md] |
| Contextual handoffs from result/history/dashboard/Ciclo/Spray Lab | Frontend Server (SSR) | API / Backend | Existing surfaces own user journey placement while server actions own actual report/library mutations. [VERIFIED: src/app/analyze/results-dashboard.tsx; VERIFIED: src/app/history/[id]/page.tsx; VERIFIED: src/app/dashboard/page.tsx; VERIFIED: src/app/ciclo-pro/page.tsx; VERIFIED: src/app/spray-lab/page.tsx] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.2.9 in repo; npm latest checked 16.2.6, modified 2026-05-08 | App Router, Server Components, server actions, route rendering, revalidation | Existing app is App Router-based and community routes/actions already use server-side rendering plus server actions. [VERIFIED: package.json; VERIFIED: npm registry 2026-05-09; CITED: /vercel/next.js] |
| React / React DOM | 19.2.3 in repo; npm latest checked 19.2.6, modified 2026-05-08 | UI component rendering | Existing Next app uses React 19; Phase 11 should avoid framework upgrades unless explicitly planned. [VERIFIED: package.json; VERIFIED: npm registry 2026-05-09] |
| TypeScript | `^5` in repo; npm latest checked 6.0.3, modified 2026-04-16 | Strict contracts for report states, entitlement keys, library item types, and analytics metadata | Existing codebase uses strict TypeScript unions and contract tests for social/community/product keys. [VERIFIED: package.json; VERIFIED: .planning/codebase/CONVENTIONS.md; VERIFIED: npm registry 2026-05-09] |
| Drizzle ORM / Drizzle Kit | `drizzle-orm ^0.45.1`, `drizzle-kit ^0.31.9`; latest checked 0.45.2 / 0.31.10, modified 2026-05-09 | PostgreSQL schema, typed queries, migrations | Existing persistence is centralized in `src/db/schema.ts`; social Pro report/library/link tables should follow that pattern. [VERIFIED: package.json; VERIFIED: src/db/schema.ts; VERIFIED: npm registry 2026-05-09; CITED: /drizzle-team/drizzle-orm-docs] |
| PostgreSQL | External DB via `DATABASE_URL` | Durable report/library/moderation/product state | Existing Drizzle schema, `.env.example`, and product/community tables assume a Postgres connection. [VERIFIED: src/db/schema.ts; VERIFIED: .env.example; VERIFIED: drizzle.config.ts] |
| Auth.js / next-auth | `next-auth ^5.0.0-beta.30`; npm beta checked 5.0.0-beta.31; stable dist-tag latest checked 4.24.14 | Server-side session/auth checks | Existing server actions and routes use `auth()`; Context7 docs show `auth()` as the server component/session retrieval pattern. [VERIFIED: package.json; VERIFIED: auth.ts; VERIFIED: src/actions/community-posts.ts; VERIFIED: npm registry 2026-05-09; CITED: /websites/authjs_dev] |
| Zod | `^4.3.6`; npm latest checked 4.4.3, modified 2026-05-04 | Runtime validation for report controls, library refs, analytics inputs, action payloads | Existing type contracts and key schemas use Zod; Phase 11 should extend these contracts rather than parse ad hoc strings. [VERIFIED: package.json; VERIFIED: src/types/community.ts; VERIFIED: src/types/monetization.ts; VERIFIED: npm registry 2026-05-09] |
| Stripe SDK | `^22.1.0`; npm latest checked 22.1.1, modified 2026-05-07 | Subscription/payment state feeding product access | Phase 11 should consume product access resolution; it should not add new billing truth. [VERIFIED: package.json; VERIFIED: src/lib/product-entitlements.ts; VERIFIED: src/actions/admin-billing.ts; VERIFIED: npm registry 2026-05-09] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-safe-action | `^8.0.12`; npm latest checked 8.5.2, modified 2026-04-13 | Typed server-action helper if the phase adds schema-wrapped action clients | Existing community actions currently use direct server actions, so use only if matching local patterns for new forms. [VERIFIED: package.json; VERIFIED: src/actions/community-posts.ts; VERIFIED: npm registry 2026-05-09] |
| Vitest | `^4.0.18`; npm latest checked 4.1.5, modified 2026-05-05 | Unit/contract/CI tests | Existing focused gates use Vitest for community, monetization, verifier, and projection tests. [VERIFIED: package.json; VERIFIED: vitest.config.ts; VERIFIED: .planning/codebase/TESTING.md; CITED: /vitest-dev/vitest] |
| Playwright | `^1.58.2`; npm latest checked 1.59.1, modified 2026-05-08 | E2E and visual regression | Existing community e2e/visual scripts use Playwright; Phase 11 needs desktop/mobile evidence for report/hub/link/badge states. [VERIFIED: package.json; VERIFIED: e2e; CITED: /microsoft/playwright] |
| Existing product analytics module | Local module | Privacy-minimal upgrade-intent and feature-value events | Reuse/extend allowed surfaces and safe metadata keys for Pro social actions. [VERIFIED: src/lib/product-analytics.ts; VERIFIED: src/lib/product-analytics.test.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Product entitlement resolver | Community-only `community-entitlements` scaffold | Do not use as Pro source of truth because current community premium keys are inactive/future and Phase 11 explicitly requires product access truth. [VERIFIED: src/lib/community-entitlements.ts; VERIFIED: src/lib/community-access.ts; VERIFIED: 11-CONTEXT.md] |
| Dedicated Pro report tables | Overload `community_posts` and `community_post_analysis_snapshots` | Overloading reduces schema work but current post/snapshot model lacks report link lifecycle, section controls, cancellation behavior, report-specific moderation reasons, and public-safe report projection. [VERIFIED: src/db/schema.ts; VERIFIED: src/types/community.ts; VERIFIED: 11-CONTEXT.md] |
| Compact Pro hub inside `/community` | Separate analytics/report dashboard route | Separate route conflicts with the locked cockpit-in-community decision and risks duplicating dashboard/product IA. [VERIFIED: 11-CONTEXT.md; VERIFIED: src/app/community/page.tsx] |
| Existing normal saves only | Upgrade `community_post_saves` into Pro collections | Do not repurpose normal saves because Free normal saves must remain open and Pro library needs private context-aware collections across reports/posts/setups/drills/missions/Lab/validation. [VERIFIED: src/actions/community-saves.ts; VERIFIED: src/db/schema.ts; VERIFIED: 11-CONTEXT.md] |
| Generic lock-impression analytics | Record only real Pro action attempts/CTA clicks | Lock impressions are explicitly disallowed as Phase 11 upgrade-intent signal; product analytics should stay privacy-minimal. [VERIFIED: 11-CONTEXT.md; VERIFIED: src/lib/product-analytics.ts] |

**Installation:**

```bash
# No new package installation is recommended for Phase 11 planning.
# Use existing dependencies in package.json and add schema/actions/tests.
```

**Version verification:** Package versions above were verified from `package.json` and current npm registry metadata on 2026-05-09. [VERIFIED: package.json; VERIFIED: npm registry 2026-05-09]

## Architecture Patterns

### System Architecture Diagram

```mermaid
flowchart TD
    A[User opens /community, report link, profile, result, history, dashboard, Ciclo Pro, or Spray Lab] --> B{Server route/action}
    B --> C[auth() session when mutation or viewer-personalized Pro panel is needed]
    C --> D[resolveServerProductAccess]
    D --> E{hasProductEntitlement}
    E -->|Pro mutation allowed| F[Owned evidence loader]
    E -->|Free or missing Pro| G[Honest lock / preview / public read path]
    F --> H[Report/library/analytics service]
    H --> I[Safe projection and redaction allowlist]
    I --> J[(Social Pro tables: reports, links, collections, items, audit)]
    J --> K[revalidatePath for community/report/profile surfaces]
    G --> L[recordUpgradeIntent only on real action/CTA]
    J --> M{Visibility}
    M -->|Publicar na comunidade| N[/community feed + profile public report card]
    M -->|Link privado| O[Unlisted report link route]
    N --> P[Community reporting/moderation/admin actions]
    O --> P
    P --> Q[(community_reports, moderation actions, audit logs)]
```

This diagram keeps product access checks in the backend tier, public rendering in SSR routes, and public-safe projection between owned evidence and any shared report surface. [VERIFIED: src/lib/product-access-server.ts; VERIFIED: src/app/community/page.tsx; VERIFIED: src/actions/community-admin.ts; VERIFIED: 11-CONTEXT.md]

### Recommended Project Structure

```text
src/
├── types/
│   └── social-pro.ts                    # Report, link, library, analytics, moderation reason contracts
├── core/
│   ├── social-pro-report.ts             # Report assembly from owned evidence sources
│   ├── social-pro-report-redaction.ts   # Public-safe allowlist and required honesty fields
│   ├── social-pro-library.ts            # Auto/manual collection model and item contexts
│   └── social-pro-creator-analytics.ts  # Safe aggregate analytics from public/community events
├── lib/
│   └── social-pro-access.ts             # Thin product-entitlement policy helper for social Pro keys
├── actions/
│   ├── social-pro-reports.ts            # Create/update/publish/revoke/regenerate/report controls
│   └── social-pro-library.ts            # Pro library save/collection actions
├── app/
│   └── community/
│       ├── pro-social-panel.tsx         # Compact cockpit in /community
│       ├── reports/[token]/page.tsx     # Link-private/public-safe report route
│       └── reports/[token]/page.test.tsx
├── ci/
│   └── phase11-social-pro-evidence.test.ts
scripts/
└── verify-phase11-social-pro.ts
e2e/
└── phase11-social-pro.spec.ts
```

This structure follows the repo's route/action/core/lib/type layering and keeps durable schema changes in `src/db/schema.ts` plus migrations. [VERIFIED: .planning/codebase/STRUCTURE.md; VERIFIED: .planning/codebase/CONVENTIONS.md; VERIFIED: src/db/schema.ts]

### Recommended Schema Shape

Use dedicated canonical tables for Social Pro reports and library state instead of forcing report lifecycle into generic posts. [VERIFIED: src/db/schema.ts; VERIFIED: 11-CONTEXT.md]

| Table / Contract | Purpose | Planning Notes |
|------------------|---------|----------------|
| `social_pro_reports` | Owner, status, visibility, source refs, safe snapshot, controls, current public summary, timestamps | Status should cover draft/published/hidden/archived/deleted or equivalent and keep last safe state readable after cancellation. [VERIFIED: 11-CONTEXT.md; VERIFIED: src/db/schema.ts] |
| `social_pro_report_links` | Link-private tokens, status, revoked/regenerated lifecycle, optional expiration | Store opaque-token lookup state and never expose raw private reader identity in creator analytics. [VERIFIED: 11-CONTEXT.md; CITED: OWASP ASVS V3 Session Management] |
| `social_pro_report_audit_events` | Creation/update/publish/revoke/hide/admin lifecycle audit | Required to avoid silent deletion and prove moderation lifecycle. [VERIFIED: 11-CONTEXT.md; VERIFIED: src/actions/community-admin.ts] |
| `social_pro_collections` | Private manual/auto collections for Pro library | Default visibility must be private; shareable collections are out of scope. [VERIFIED: 11-CONTEXT.md] |
| `social_pro_collection_items` | References to reports/posts/setups/drills/missions/Lab sessions/validations with context snapshot | Do not mutate or replace `community_post_saves`; normal saves remain Free/open. [VERIFIED: src/actions/community-saves.ts; VERIFIED: 11-CONTEXT.md] |

### Pattern 1: Server-Owned Product Access Gate

**What:** Resolve product access on the server and check product entitlement keys before Pro report creation, report editing, private link control, library writes, badge control, and creator analytics reads. [VERIFIED: src/lib/product-access-server.ts; VERIFIED: src/lib/product-entitlements.ts; VERIFIED: 11-CONTEXT.md]

**When to use:** Every Phase 11 Pro action or Pro-only read. [VERIFIED: 11-CONTEXT.md]

**Example:**

```typescript
// Source: repo product access pattern + Auth.js server session docs.
'use server';

import { auth } from '@/auth';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import { hasProductEntitlement } from '@/lib/product-entitlements';

const REPORT_FEATURE = 'community.premium_report_share';

export async function createSocialProReport(input: CreateSocialProReportInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'login_required' };
  }

  const access = await resolveServerProductAccess(session.user.id);
  if (!hasProductEntitlement(access, REPORT_FEATURE)) {
    // Record only the real attempted Pro action, then return an honest lock model.
    return { success: false, error: 'pro_required', lock: buildReportLockView(access) };
  }

  // Load owned evidence by userId, build safe projection, persist report + audit.
  return { success: true };
}
```

### Pattern 2: Safe Projection Before Public Rendering

**What:** Treat report generation as a two-step pipeline: internal evidence assembly from owned records, then public-safe projection through an explicit allowlist that preserves required honesty fields. [VERIFIED: src/core/community-post-snapshot.ts; VERIFIED: src/db/schema.ts; VERIFIED: 11-CONTEXT.md]

**When to use:** Before writing any report snapshot that can be read by public/community/profile/link routes. [VERIFIED: 11-CONTEXT.md]

**Example:**

```typescript
// Source: repo immutable snapshot pattern + Phase 11 safe-report contract.
export function projectPublicSocialProReport(input: InternalSocialProReport): PublicSocialProReport {
  return {
    summary: input.summary,
    evidence: {
      baseAnalysis: summarizeAnalysis(input.baseAnalysis),
      confidence: input.baseAnalysis.confidence,
      coverage: input.baseAnalysis.coverage,
      blockers: input.blockers,
      inconclusiveState: input.inconclusiveState,
    },
    timeline: projectAllowedTimelineEvents(input.timeline),
    nextAction: input.nextAction,
    disclaimers: buildRequiredHonestyCopy(input),
  };
}
```

### Pattern 3: Separate Public Discovery From Link-Private Lookup

**What:** Public reports can be unioned into community/profile view models, while link-private reports resolve only through an unlisted token route and never appear in feed/profile by default. [VERIFIED: src/core/community-discovery-view-model.ts; VERIFIED: src/core/community-public-profile-view-model.ts; VERIFIED: 11-CONTEXT.md]

**When to use:** Planning report list queries and profile/report route behavior. [VERIFIED: 11-CONTEXT.md]

**Example:**

```typescript
// Source: repo view-model pattern for community discovery/profile.
const publicReportCards = await getPublishedSocialProReportCards({
  viewerUserId,
  visibility: 'community_public',
  includeHidden: false,
});

const linkPrivateReport = await getReadableReportByLinkToken({
  token,
  now,
});
```

### Pattern 4: Private Library Uses New Pro Collections, Not Normal Saves

**What:** Preserve `community_post_saves` as the Free normal-save feature and add Pro-only library actions/tables for context-aware organization. [VERIFIED: src/actions/community-saves.ts; VERIFIED: src/db/schema.ts; VERIFIED: 11-CONTEXT.md]

**When to use:** Saving reports, drills, missions, Spray Lab sessions, compatible validations, and setup contexts into Pro library. [VERIFIED: 11-CONTEXT.md]

**Example:**

```typescript
// Source: Phase 11 private-library contract.
type SocialProLibraryItemType =
  | 'report'
  | 'community_post'
  | 'setup'
  | 'drill'
  | 'ciclo_mission'
  | 'spray_lab_session'
  | 'compatible_validation';

type SocialProLibraryContext = {
  weapon?: string;
  optic?: string;
  distanceRange?: string;
  diagnosis?: string;
  activeLineId?: string;
  validationState?: string;
  blockerCodes: readonly string[];
};
```

### Pattern 5: Phase Verifier Mirrors Phase 9/10 Evidence Scripts

**What:** Add `scripts/verify-phase11-social-pro.ts`, an npm script, a CI contract test proving registration, and a checklist parser that fails incomplete No False Premium rows. [VERIFIED: scripts/verify-phase9-spray-lab.ts; VERIFIED: scripts/verify-phase10-programs.ts; VERIFIED: src/ci/phase10-programs-evidence.test.ts; VERIFIED: package.json]

**When to use:** Phase gate and final delivery. [VERIFIED: 11-CONTEXT.md]

**Example:**

```typescript
// Source: repo phase verifier pattern.
const requiredRows = [
  'free-public-basics-open',
  'pro-only-report-create-edit',
  'public-safe-redaction',
  'private-link-revoke-regenerate',
  'cancellation-last-safe-state',
  'moderation-hide-disable-audit',
  'privacy-minimal-analytics',
  'no-entitlement-leak',
];
```

### Anti-Patterns to Avoid

- **Client-only Pro checks:** Users can bypass UI state; enforce Pro access in server actions and route loaders. [VERIFIED: src/lib/product-entitlements.ts; CITED: OWASP ASVS V4 Access Control]
- **Community entitlement scaffold as product Pro truth:** `community-entitlements` currently models future/inactive community keys and should not grant product Pro access. [VERIFIED: src/lib/community-entitlements.ts; VERIFIED: src/lib/community-access.ts; VERIFIED: 11-CONTEXT.md]
- **Raw report dump:** Public reports must summarize/redact and keep confidence, coverage, blockers, inconclusive state, and no-overclaim copy. [VERIFIED: 11-CONTEXT.md; VERIFIED: docs/SDD-analise-spray.md]
- **Pro badge as trust/skill signal:** The badge means active Pro access only; do not connect it to authority, creator verification, rank, or player skill. [VERIFIED: 11-CONTEXT.md; VERIFIED: src/core/community-trust-signals.ts]
- **Generic social feed paywall:** Public feed/posts/profiles/basic reading/likes/comments/follows/saves stay open where already open. [VERIFIED: 11-CONTEXT.md; VERIFIED: src/actions/community-saves.ts; VERIFIED: src/actions/community-likes.ts; VERIFIED: src/actions/community-comments.ts]
- **Private collections as publishable V1 surface:** Shareable collections are explicitly deferred because they expand publishing/moderation scope. [VERIFIED: 11-CONTEXT.md]
- **Revenue/funnel analytics in creator panel:** Phase 12 owns revenue ops; Phase 11 creator analytics must avoid payment/funnel/financial conversion data. [VERIFIED: 11-CONTEXT.md; VERIFIED: .planning/ROADMAP.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication/session lookup | Custom cookie/session parser | `auth()` from the existing Auth.js setup | Existing server routes/actions already use Auth.js and docs support server-side `auth()` retrieval. [VERIFIED: auth.ts; VERIFIED: src/actions/community-posts.ts; CITED: /websites/authjs_dev] |
| Product Pro access | Client flags or a new social-only entitlement engine | `resolveServerProductAccess` + `hasProductEntitlement` | Existing product resolver already combines subscription/manual grant/catalog state and Phase 11 requires shared server truth. [VERIFIED: src/lib/product-access-server.ts; VERIFIED: src/lib/product-entitlements.ts; VERIFIED: 11-CONTEXT.md] |
| Billing/subscription source of truth | New billing tables for social Pro | Existing product subscription/grant/catalog tables | Phase 11 consumes Pro state; it is not a billing rebuild. [VERIFIED: src/db/schema.ts; VERIFIED: src/lib/product-entitlements.ts; VERIFIED: .planning/ROADMAP.md] |
| Database schema/migrations | JSON files or ad hoc SQL strings | Drizzle schema + migrations | The project already centralizes tables in `src/db/schema.ts` with Drizzle/Postgres. [VERIFIED: src/db/schema.ts; VERIFIED: drizzle.config.ts; CITED: /drizzle-team/drizzle-orm-docs] |
| Public report redaction | Generic deep-delete helpers | Domain allowlist projection with required honesty fields | Report safety is product-specific and must prove exactly what is allowed, hidden, and required. [VERIFIED: 11-CONTEXT.md; VERIFIED: docs/SDD-analise-spray.md] |
| Normal saves plus Pro library | Overload `community_post_saves` | New Pro library tables/actions and keep normal saves unchanged | Normal saves are already Free/open; Pro library spans reports/posts/drills/missions/Lab/validation with private context. [VERIFIED: src/actions/community-saves.ts; VERIFIED: 11-CONTEXT.md] |
| Analytics privacy filter | Arbitrary event metadata | Existing `product-analytics` safe metadata sanitizer | Existing module rejects objects/arrays and prohibited private keys; extend allowed surfaces deliberately. [VERIFIED: src/lib/product-analytics.ts; VERIFIED: src/lib/product-analytics.test.ts] |
| Link cryptography | Homegrown reversible tokens or predictable IDs | Opaque high-entropy tokens generated with platform crypto and stored with revocable lifecycle | ASVS requires unguessable/session-token-like secrecy properties and Phase 11 requires revocation/regeneration. [CITED: OWASP ASVS V3 Session Management; VERIFIED: 11-CONTEXT.md] |
| Visual verification | Manual visual spot checks only | Existing Playwright e2e/visual script style plus screenshots | Playwright supports screenshot assertions and the repo already has community visual/e2e gates. [VERIFIED: package.json; CITED: /microsoft/playwright] |

**Key insight:** Phase 11 is deceptively complex because it combines public sharing, paid access, evidence claims, privacy, moderation, and cancellation semantics; custom shortcuts usually fail at the boundaries between these concerns. [VERIFIED: 11-CONTEXT.md; VERIFIED: src/db/schema.ts; VERIFIED: src/lib/product-entitlements.ts; VERIFIED: src/actions/community-admin.ts]

## Common Pitfalls

### Pitfall 1: UI-Only Premium Gates
**What goes wrong:** Free users can call report/library/analytics actions directly or see Pro badge decisions computed from stale client state. [CITED: OWASP ASVS V4 Access Control]  
**Why it happens:** The existing community entitlement hook is inactive and UI locks are tempting because the community is public-first. [VERIFIED: src/lib/community-access.ts; VERIFIED: src/lib/community-entitlements.ts]  
**How to avoid:** Every Pro mutation/read uses `auth()`, `resolveServerProductAccess`, and `hasProductEntitlement`. [VERIFIED: src/lib/product-access-server.ts; VERIFIED: src/lib/product-entitlements.ts]  
**Warning signs:** Tests only inspect rendered locks and never call actions as Free/canceled users. [VERIFIED: .planning/codebase/TESTING.md]

### Pitfall 2: Breaking Free Community Basics
**What goes wrong:** Public feed/profile/post reading, likes, comments, follows, or normal saves accidentally become Pro-dependent. [VERIFIED: 11-CONTEXT.md]  
**Why it happens:** New Pro hub and badge logic gets added to shared community view models without explicit Free matrices. [VERIFIED: src/core/community-discovery-view-model.ts; VERIFIED: src/core/community-public-profile-view-model.ts]  
**How to avoid:** Add regression tests for Free public basics and normal saves before Pro feature assertions. [VERIFIED: package.json; VERIFIED: src/actions/community-saves.test.ts]  
**Warning signs:** `community_posts` read queries start requiring product access or hidden `requiredEntitlementKey` enforcement. [VERIFIED: src/lib/community-access.ts]

### Pitfall 3: Report Snapshot Leaks Private Evidence
**What goes wrong:** Public reports expose account data, internal notes, whole history, private collection contents, payment state, hidden history entries, or sensitive preparation/health details. [VERIFIED: 11-CONTEXT.md]  
**Why it happens:** Existing analysis/community snapshots include rich technical objects and are not automatically a public report contract. [VERIFIED: src/core/community-post-snapshot.ts; VERIFIED: src/db/schema.ts]  
**How to avoid:** Introduce a public-safe report allowlist with tests that assert prohibited fields are absent. [VERIFIED: 11-CONTEXT.md; VERIFIED: docs/SDD-analise-spray.md]  
**Warning signs:** Public report route renders raw JSON snapshots or `CoachPlan`-like nested objects directly. [VERIFIED: src/core/community-post-snapshot.ts]

### Pitfall 4: Badge Implies Authority
**What goes wrong:** Pro badge becomes perceived as skill, verified coach, creator certification, rank, or technical authority. [VERIFIED: 11-CONTEXT.md]  
**Why it happens:** Existing community trust signals already contain creator/social proof concepts, so Pro could be mixed into trust signals. [VERIFIED: src/core/community-trust-signals.ts; VERIFIED: src/core/community-public-profile-view-model.ts]  
**How to avoid:** Keep badge copy to active product access and exclude it from trust/skill/scoring logic. [VERIFIED: 11-CONTEXT.md]  
**Warning signs:** Badge appears near score/rank/trust language or creator authority copy. [VERIFIED: src/core/community-trust-signals.ts]

### Pitfall 5: Link-Private Reports Become Discoverable
**What goes wrong:** Unlisted reports show in profile/feed, analytics leak readers, or revoked links remain readable. [VERIFIED: 11-CONTEXT.md]  
**Why it happens:** Public and link-private modes share report rendering but require different listing and lifecycle rules. [VERIFIED: 11-CONTEXT.md]  
**How to avoid:** Split discovery queries from token lookup, include revoked/expired/hidden states, and test feed/profile absence for link-private reports. [VERIFIED: src/core/community-discovery-view-model.ts; VERIFIED: src/core/community-public-profile-view-model.ts]  
**Warning signs:** A single `published` flag controls both community listing and link readability. [VERIFIED: src/db/schema.ts]

### Pitfall 6: Analytics Becomes Phase 12 Revenue Ops
**What goes wrong:** Creator panel exposes conversion, payment state, private readers, or funnel data. [VERIFIED: 11-CONTEXT.md]  
**Why it happens:** Product analytics already has monetization events and can be misused as a creator dashboard source. [VERIFIED: src/lib/product-analytics.ts]  
**How to avoid:** Build creator analytics from public social impact aggregates plus privacy-minimal report/action counts, and reserve revenue/funnel work for Phase 12. [VERIFIED: src/core/community-creator-metrics.ts; VERIFIED: .planning/ROADMAP.md; VERIFIED: 11-CONTEXT.md]  
**Warning signs:** Creator analytics queries `product_subscriptions`, Stripe IDs, checkout sessions, or private report readers. [VERIFIED: src/db/schema.ts; VERIFIED: src/lib/product-analytics.ts]

### Pitfall 7: Evidence Copy Overclaims
**What goes wrong:** Reports imply perfect sensitivity, guaranteed improvement, rank gain, global skill grade, or official PUBG/KRAFTON affiliation. [VERIFIED: AGENTS.md; VERIFIED: 11-CONTEXT.md]  
**Why it happens:** Shareable social surfaces create pressure for stronger claims than the analysis truth contract supports. [VERIFIED: docs/SDD-analise-spray.md; VERIFIED: docs/SDD-inteligencia-de-sens.md]  
**How to avoid:** Require copy-safety tests across report summary, timeline, badge tooltip, upgrade cues, and creator analytics. [VERIFIED: 11-CONTEXT.md; VERIFIED: .planning/codebase/TESTING.md]  
**Warning signs:** Copy uses words like guaranteed, perfect, official, rank, global grade, or pro-player status. [VERIFIED: 11-CONTEXT.md]

### Pitfall 8: Phase 8-10 Evidence Is Duplicated Instead Of Referenced
**What goes wrong:** Report/library code rebuilds protocol, Spray Lab, or Ciclo Pro logic and diverges from existing truth. [VERIFIED: .planning/phases/08-complete-training-protocols/08-CONTEXT.md; VERIFIED: .planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-CONTEXT.md; VERIFIED: .planning/phases/10-guided-pro-training-programs/10-CONTEXT.md]  
**Why it happens:** Reports need a rich timeline and it is tempting to recompute evidence summaries locally. [VERIFIED: 11-CONTEXT.md]  
**How to avoid:** Load/version references to existing analysis/protocol/Lab/program/validation records and project them into report sections. [VERIFIED: src/db/schema.ts; VERIFIED: src/actions/spray-lab.ts; VERIFIED: src/actions/training-programs.ts]  
**Warning signs:** New report modules contain separate session fidelity, program state, or compatible validation algorithms. [VERIFIED: src/core/spray-lab-fidelity.ts; VERIFIED: src/core/training-programs.ts]

## Code Examples

Verified patterns from official sources and local code:

### Server Action Revalidation

```typescript
// Source: Next.js revalidatePath docs and local community action pattern.
'use server';

import { revalidatePath } from 'next/cache';

export async function publishReport() {
  // Persist report and audit event.
  revalidatePath('/community');
  revalidatePath('/community/users/[slug]', 'page');
}
```

Next.js documents `revalidatePath` as server-side only and valid from Server Functions/Route Handlers; existing community actions already revalidate affected community paths after mutations. [CITED: /vercel/next.js; VERIFIED: src/actions/community-posts.ts; VERIFIED: src/actions/community-admin.ts]

### Auth In Server Components / Actions

```typescript
// Source: Auth.js docs and existing route/action usage.
import { auth } from '@/auth';

export default async function CommunityPage() {
  const session = await auth();
  return <CommunityShell viewerUserId={session?.user?.id ?? null} />;
}
```

Auth.js docs show server-side `auth()` session retrieval; existing community, billing, pricing, Ciclo Pro, and Spray Lab surfaces use the same pattern. [CITED: /websites/authjs_dev; VERIFIED: src/app/community/page.tsx; VERIFIED: src/app/ciclo-pro/page.tsx; VERIFIED: src/app/spray-lab/page.tsx]

### Drizzle Table Addition Pattern

```typescript
// Source: Drizzle docs and existing src/db/schema.ts style.
export const socialProReports = pgTable('social_pro_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  visibility: text('visibility').notNull(),
  safeSnapshot: jsonb('safe_snapshot').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Drizzle docs show PostgreSQL table definitions and relations in TypeScript; this repo already uses `pgTable`, typed columns, foreign keys, and timestamps in `src/db/schema.ts`. [CITED: /drizzle-team/drizzle-orm-docs; VERIFIED: src/db/schema.ts]

### Privacy-Minimal Analytics Event

```typescript
// Source: local product analytics safe metadata pattern.
await recordUpgradeIntent({
  userId,
  surface: 'community',
  featureKey: 'community.premium_report_share',
  accessState: access.state,
  ctaId: 'generate_social_pro_report',
});
```

Phase 11 must extend the existing safe metadata allowlist only for needed community/social report surfaces and keep event metadata scalar and privacy-minimal. [VERIFIED: src/lib/product-analytics.ts; VERIFIED: src/lib/product-analytics.test.ts; VERIFIED: 11-CONTEXT.md]

### Playwright Visual Evidence

```typescript
// Source: Playwright screenshot assertion docs and existing community visual gate.
import { expect, test } from '@playwright/test';

test('social pro report public view is stable on mobile', async ({ page }) => {
  await page.goto('/community/reports/test-public-safe-report');
  await expect(page).toHaveScreenshot('social-pro-report-mobile.png');
});
```

Playwright supports screenshot assertions, and the repo already has `test:community:visual` for community visual checks. [CITED: /microsoft/playwright; VERIFIED: package.json]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Community premium keys exist only as future/inactive scaffold | Product Pro keys should be activated/refined through `ProductEntitlementKey` and product resolver | Phase 11 planning | Prevents UI-only or community-only entitlement leaks. [VERIFIED: src/lib/community-entitlements.ts; VERIFIED: src/types/monetization.ts; VERIFIED: 11-CONTEXT.md] |
| Pretty social card | Audit-backed evolution report with public summary, timeline, and continuity/actions | Phase 11 decision | Requires report contracts, redaction, status, link lifecycle, and evidence references. [VERIFIED: 11-CONTEXT.md] |
| Generic favorites/saves | Private context-aware Pro training library plus normal Free saves unchanged | Phase 11 decision | Requires new collection/item model and Free regression coverage. [VERIFIED: src/actions/community-saves.ts; VERIFIED: 11-CONTEXT.md] |
| Creator metrics as basic public social counts | Pro safe creator impact panel excluding private/payment/funnel/raw analysis data | Phase 11 decision | Extends existing creator metrics without Phase 12 revenue scope. [VERIFIED: src/core/community-creator-metrics.ts; VERIFIED: .planning/ROADMAP.md; VERIFIED: 11-CONTEXT.md] |
| Dashboard/history/result as separate loops | Social Pro report/library shortcuts connect to result, history, dashboard, Ciclo Pro, and Spray Lab | Phase 11 decision after Phases 8-10 | Planner must account for focused contracts/Playwright when touching handoff surfaces. [VERIFIED: .planning/phases/08-complete-training-protocols/08-CONTEXT.md; VERIFIED: .planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-CONTEXT.md; VERIFIED: .planning/phases/10-guided-pro-training-programs/10-CONTEXT.md; VERIFIED: 11-CONTEXT.md] |

**Deprecated/outdated:**
- Treating `community.post.premium_access` / `premium_future` as actual Pro access is outdated for Phase 11 because product access must flow through the product resolver. [VERIFIED: src/types/community.ts; VERIFIED: src/lib/community-entitlements.ts; VERIFIED: 11-CONTEXT.md]
- Counting every lock impression as upgrade intent is explicitly out for Phase 11; only real Pro actions/CTA clicks should be logged. [VERIFIED: 11-CONTEXT.md]
- Public collections are not a Phase 11 standard; private collections are the default and shareable collections are deferred. [VERIFIED: 11-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Store private report link lookup state using opaque high-entropy tokens and a revocable lifecycle; hashing the stored token is recommended but the exact implementation is a planning/security design choice. [ASSUMED] | Recommended Schema Shape / Don't Hand-Roll | If the team chooses a different token storage model, security review must still prove unguessability, revocation, and no reader identity leak. |

## Open Questions (RESOLVED)

1. **Exact new product entitlement key names**
   - Resolution: Keep and activate/refine existing product keys `community.pro_badge`, `community.premium_report_share`, and `community.creator_attribution`.
   - Resolution: Add explicit product entitlement keys `community.pro_library`, `community.creator_analytics`, `community.private_report_links`, and `community.advanced_context` for Pro library, creator analytics, private report links, and advanced social context.
   - Planning implication: Add the explicit keys to `ProductEntitlementKey`, `productProEntitlementKeys`, Social Pro access tests, and premium projection lock/cue copy so Pro access remains server-owned and testable. [VERIFIED: src/lib/product-entitlements.ts; VERIFIED: src/lib/premium-projection.ts; VERIFIED: 11-CONTEXT.md]

2. **Report URL shape**
   - Resolution: Use one report rendering route, planned as `/community/reports/[token]`, with server-side lookup that distinguishes public slug from private token internally.
   - Planning implication: Discovery/feed/profile queries must only include public report slug/status lookup. They must not include private-token lookup, private token verifier state, private reader identity, or private link analytics. [VERIFIED: src/app/community/[slug]/page.tsx; VERIFIED: 11-CONTEXT.md]

3. **How much report data is stored vs recomputed**
   - Resolution: Store the current public-safe report snapshot plus report audit events.
   - Resolution: Regenerate the current safe snapshot only on explicit Pro update actions; preserve older lifecycle, link, moderation, and update events for audit.
   - Planning implication: Public rendering reads the current safe snapshot, while lifecycle disputes and moderation review use audit events rather than silently overwriting history. [VERIFIED: 11-CONTEXT.md; VERIFIED: src/actions/community-admin.ts]

4. **Admin/moderator role granularity**
   - Resolution: Reuse the existing admin-only moderation approach for Phase 11 Pro report moderation.
   - Planning implication: Phase 11 may add Pro-report-specific reasons and audit events, but it must not introduce a new moderator role model unless a future phase explicitly plans it. [VERIFIED: src/actions/community-admin.ts; VERIFIED: 11-CONTEXT.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next/Vitest/scripts | Yes | v24.15.0 | Project expects Node 20+; use CI target if local-only differences appear. [VERIFIED: local command `node --version`; VERIFIED: .planning/codebase/STACK.md] |
| npm | Package scripts | Yes | 11.12.1 | None needed. [VERIFIED: local command `npm --version`] |
| Playwright CLI | E2E/visual evidence | Yes | 1.58.2 | Use existing `npm run test:community:e2e` / `npm run test:community:visual`. [VERIFIED: local command `npx playwright --version`; VERIFIED: package.json] |
| Drizzle Kit | Schema/migration generation | Yes | drizzle-kit 0.31.9 / drizzle-orm 0.45.1 local output | If DB unavailable, planner can still add schema/tests and leave migration/apply evidence explicit. [VERIFIED: local command `npx drizzle-kit --version`] |
| PostgreSQL CLI `psql` | Manual DB inspection | No | — | Use Drizzle, app tests, or project DB tooling; do not require `psql` in plan unless installing it is included. [VERIFIED: local command `Get-Command psql`] |
| DATABASE_URL | Drizzle/app runtime | Configured by environment, not read from secrets | `.env.example` documents required key | Do not read `.env.local`; use existing secret policy. [VERIFIED: .env.example; VERIFIED: .planning/codebase/CONCERNS.md] |

**Missing dependencies with no fallback:**
- None for planning. [VERIFIED: local environment audit]

**Missing dependencies with fallback:**
- `psql` CLI is not available, but Drizzle and app-level tests are the standard project path. [VERIFIED: local environment audit; VERIFIED: drizzle.config.ts]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `^4.0.18` for unit/contract/CI tests and Playwright `^1.58.2` for e2e/visual evidence. [VERIFIED: package.json; CITED: /vitest-dev/vitest; CITED: /microsoft/playwright] |
| Config file | `vitest.config.ts` and `playwright.config.ts`. [VERIFIED: local repo files] |
| Quick run command | `npm run test:community:unit && npm run test:monetization` plus any new focused Phase 11 unit command. [VERIFIED: package.json; VERIFIED: .planning/codebase/TESTING.md] |
| Full suite command | `npm run typecheck && npx vitest run && npm run test:community:e2e && npm run test:community:visual && npm run benchmark:gate && npm run build && npm run verify:phase11:social-pro`. [VERIFIED: package.json; VERIFIED: 11-CONTEXT.md] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| MON-01 | Free public feed/posts/profiles/likes/comments/normal saves/follows/basic reading remain open | unit + e2e regression | `npm run test:community:unit && npm run test:community:e2e` | Existing community tests yes; Phase 11 Free regression rows need Wave 0 additions. [VERIFIED: package.json; VERIFIED: src/actions/community-saves.test.ts; VERIFIED: 11-CONTEXT.md] |
| MON-02 | Pro can create/edit report, manage private links, use Pro library, see badge controls, read creator analytics | unit + action integration + e2e | `npx vitest run src/actions/social-pro-reports.test.ts src/actions/social-pro-library.test.ts src/lib/product-entitlements.test.ts` | No, Wave 0. [VERIFIED: package.json; VERIFIED: src/lib/product-entitlements.test.ts] |
| MON-03 | Product subscription/grant state controls social Pro access server-side | unit + contract | `npx vitest run src/lib/product-entitlements.test.ts src/lib/social-pro-access.test.ts` | Product entitlement tests yes; social-pro tests Wave 0. [VERIFIED: src/lib/product-entitlements.test.ts] |
| MON-04 | Paid value is original report/library/coach/history/protocol/Lab/Ciclo continuity, not PUBG API-exclusive data | contract + copy safety | `npx vitest run src/core/social-pro-report-redaction.test.ts src/app/community/social-pro-copy.contract.test.ts` | No, Wave 0. [VERIFIED: AGENTS.md; VERIFIED: 11-CONTEXT.md] |
| MON-05 | Copy avoids perfect/guaranteed/rank/affiliation/authority claims | unit + visual contract | `npx vitest run src/core/social-pro-report-redaction.test.ts src/app/community/social-pro-copy.contract.test.ts` | No, Wave 0. [VERIFIED: docs/SDD-analise-spray.md; VERIFIED: 11-CONTEXT.md] |

### Sampling Rate

- **Per task commit:** Run focused changed-area tests, usually `npm run test:community:unit` subset plus `npm run test:monetization` when entitlements/analytics change. [VERIFIED: package.json; VERIFIED: .planning/codebase/TESTING.md]
- **Per wave merge:** Run `npm run typecheck`, `npx vitest run`, `npm run test:community:unit`, and the new Phase 11 verifier when available. [VERIFIED: 11-CONTEXT.md; VERIFIED: package.json]
- **Phase gate:** Run all D-68 commands and attach desktop/mobile Playwright evidence before `$gsd-verify-work`. [VERIFIED: 11-CONTEXT.md]

### Wave 0 Gaps

- [ ] `src/types/social-pro.ts` and `src/types/social-pro.test.ts` — stable report/link/library/analytics/moderation reason contracts. [VERIFIED: src/types/community.ts; VERIFIED: 11-CONTEXT.md]
- [ ] `src/lib/social-pro-access.ts` and `.test.ts` — product entitlement key wrapper and Free/Pro/canceled behavior. [VERIFIED: src/lib/product-entitlements.ts; VERIFIED: 11-CONTEXT.md]
- [ ] `src/core/social-pro-report-redaction.ts` and `.test.ts` — public-safe allowlist, required honesty fields, prohibited private fields. [VERIFIED: docs/SDD-analise-spray.md; VERIFIED: 11-CONTEXT.md]
- [ ] `src/actions/social-pro-reports.test.ts` — Pro-only creation/edit/update/link lifecycle/cancellation/moderation behavior. [VERIFIED: src/actions/community-posts.test.ts; VERIFIED: 11-CONTEXT.md]
- [ ] `src/actions/social-pro-library.test.ts` — Free normal saves unchanged, Pro library writes gated and private. [VERIFIED: src/actions/community-saves.test.ts; VERIFIED: 11-CONTEXT.md]
- [ ] `src/core/social-pro-creator-analytics.test.ts` — safe aggregate metrics and no private/payment/reader leakage. [VERIFIED: src/core/community-creator-metrics.test.ts; VERIFIED: 11-CONTEXT.md]
- [ ] `src/ci/phase11-social-pro-evidence.test.ts` — npm script/checklist registration. [VERIFIED: src/ci/phase10-programs-evidence.test.ts; VERIFIED: package.json]
- [ ] `scripts/verify-phase11-social-pro.ts` — No False Premium matrix parser. [VERIFIED: scripts/verify-phase10-programs.ts; VERIFIED: 11-CONTEXT.md]
- [ ] `e2e/phase11-social-pro.spec.ts` — public report, link-private, revoked/hidden, Free lock, Pro hub, mobile/desktop states. [VERIFIED: package.json; VERIFIED: 11-CONTEXT.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Yes | Use existing Auth.js `auth()` server sessions for mutations/admin/Pro personalized reads. [VERIFIED: auth.ts; CITED: /websites/authjs_dev] |
| V3 Session Management | Yes | Do not place session tokens in URLs; private report links are separate opaque share tokens with revocation/regeneration lifecycle, not auth sessions. [CITED: OWASP ASVS V3 Session Management; VERIFIED: 11-CONTEXT.md] |
| V4 Access Control | Yes | Enforce product entitlements and ownership checks on trusted server layers; test Free/Pro/canceled/admin matrices. [CITED: OWASP ASVS V4 Access Control; VERIFIED: src/lib/product-entitlements.ts; VERIFIED: 11-CONTEXT.md] |
| V5 Input Validation | Yes | Zod contracts for report controls, visibility, library item refs, analytics metadata, moderation reasons, and token params. [VERIFIED: src/types/community.ts; VERIFIED: src/types/monetization.ts; VERIFIED: package.json] |
| V6 Cryptography | Yes | Use platform cryptography for private link token generation; do not hand-roll crypto. [CITED: OWASP ASVS V3 Session Management] |

### Known Threat Patterns for Next.js Community Pro Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Insecure Direct Object Reference on report/library/source evidence IDs | Elevation of Privilege / Information Disclosure | Every action loads records by `userId` owner or public-safe status before use. [CITED: OWASP ASVS V4 Access Control; VERIFIED: src/actions/community-posts.ts; VERIFIED: src/actions/spray-lab.ts] |
| Client-side entitlement bypass | Elevation of Privilege | `resolveServerProductAccess` + `hasProductEntitlement` in actions/loaders, with Free/canceled tests. [VERIFIED: src/lib/product-access-server.ts; VERIFIED: src/lib/product-entitlements.ts] |
| Private report token guessing or non-revocation | Information Disclosure | High-entropy opaque tokens, status checks, revocation/regeneration, optional expiration. [CITED: OWASP ASVS V3 Session Management; VERIFIED: 11-CONTEXT.md] |
| Public report private-data leakage | Information Disclosure | Public-safe allowlist projection and redaction tests for prohibited fields. [VERIFIED: 11-CONTEXT.md; VERIFIED: docs/SDD-analise-spray.md] |
| Pro badge authority abuse | Spoofing / Repudiation | Server-derived active-Pro badge only, tooltip copy, moderation reasons for badge abuse and false authority. [VERIFIED: 11-CONTEXT.md] |
| Analytics privacy leakage | Information Disclosure | Existing `product-analytics` scalar allowlist and Pro creator analytics from safe public aggregates only. [VERIFIED: src/lib/product-analytics.ts; VERIFIED: src/core/community-creator-metrics.ts] |
| Moderation deletion without audit | Repudiation | Extend `community_reports`, moderation actions, and `auditLogs`; avoid silent deletion. [VERIFIED: src/actions/community-admin.ts; VERIFIED: src/db/schema.ts; VERIFIED: 11-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/11-social-pro-community-premium/11-CONTEXT.md` - locked Phase 11 decisions, discretion, deferred scope, verification matrix. [VERIFIED]
- `AGENTS.md` - project-specific engineering, monetization, validation, and safety rules. [VERIFIED]
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` - project scope, MON-01..MON-05, current Phase 11 focus, neighboring phase boundaries. [VERIFIED]
- `.planning/codebase/ARCHITECTURE.md`, `STACK.md`, `TESTING.md`, `CONCERNS.md`, `CONVENTIONS.md`, `STRUCTURE.md` - codebase layer map, stack, test strategy, risks, coding conventions, file organization. [VERIFIED]
- `src/types/monetization.ts`, `src/lib/product-entitlements.ts`, `src/lib/product-access-server.ts`, `src/lib/premium-projection.ts`, `src/lib/product-analytics.ts` - product Pro keys, resolver, premium projection, analytics sanitizer. [VERIFIED]
- `src/types/community.ts`, `src/lib/community-entitlements.ts`, `src/lib/community-access.ts`, `src/db/schema.ts` - community contracts, inactive community premium scaffold, access policy, persistence. [VERIFIED]
- `src/actions/community-posts.ts`, `src/actions/community-saves.ts`, `src/actions/community-reports.ts`, `src/actions/community-admin.ts` - existing server-action, save, reporting, moderation patterns. [VERIFIED]
- `src/core/community-post-snapshot.ts`, `src/core/community-discovery-view-model.ts`, `src/core/community-public-profile-view-model.ts`, `src/core/community-creator-metrics.ts`, `src/core/community-trust-signals.ts` - snapshot, feed/profile, safe creator metrics, trust signal patterns. [VERIFIED]
- `.planning/phases/08-complete-training-protocols/08-CONTEXT.md`, `.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-CONTEXT.md`, `.planning/phases/10-guided-pro-training-programs/10-CONTEXT.md` - protocol/Lab/Ciclo handoff contracts and evidence hierarchy. [VERIFIED]
- `scripts/verify-phase9-spray-lab.ts`, `scripts/verify-phase10-programs.ts`, `src/ci/phase10-programs-evidence.test.ts`, `package.json` - phase verifier and script-registration patterns. [VERIFIED]
- Context7 `/vercel/next.js` - App Router server action revalidation with `revalidatePath`. [CITED]
- Context7 `/websites/authjs_dev` - Auth.js server-side `auth()` session retrieval in Next.js. [CITED]
- Context7 `/drizzle-team/drizzle-orm-docs` - Drizzle PostgreSQL schema/migration patterns. [CITED]
- Context7 `/vitest-dev/vitest` - Vitest projects/configuration guidance. [CITED]
- Context7 `/microsoft/playwright` - Playwright screenshot assertions and visual testing. [CITED]
- OWASP ASVS official project and GitHub ASVS V3/V4 pages - security verification basis, session/token/access-control requirements. [CITED: https://owasp.org/www-project-application-security-verification-standard/; CITED: https://github.com/OWASP/ASVS/blob/master/4.0/en/0x12-V3-Session-management.md; CITED: https://github.com/OWASP/ASVS/blob/master/4.0/en/0x12-V4-Access-Control.md]
- npm registry checks on 2026-05-09 for Next.js, React, Drizzle, Auth.js/next-auth beta, Zod, Stripe, TypeScript, next-safe-action, Vitest, Playwright. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- None. Official docs, registry, and local code were sufficient for planning guidance. [VERIFIED: research session]

### Tertiary (LOW confidence)

- A1 token storage hashing recommendation is listed as an assumption because Phase 11 decisions require revocable/regenerable private links but do not prescribe exact token storage mechanics. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package versions were verified in `package.json`, npm registry metadata, and Context7 official docs where relevant. [VERIFIED: package.json; VERIFIED: npm registry 2026-05-09; CITED: Context7]
- Architecture: HIGH - recommendations follow existing server action/core/lib/schema/community/product access patterns and locked Phase 11 decisions. [VERIFIED: src/actions; VERIFIED: src/core; VERIFIED: src/lib; VERIFIED: src/db/schema.ts; VERIFIED: 11-CONTEXT.md]
- Pitfalls: HIGH - risks are directly tied to locked decisions, local code boundaries, OWASP access-control/session guidance, and existing phase verifier/test practices. [VERIFIED: 11-CONTEXT.md; VERIFIED: .planning/codebase/TESTING.md; CITED: OWASP ASVS]

**Research date:** 2026-05-09  
**Valid until:** 2026-06-08 for local architecture and locked decisions; dependency/latest-version checks should be refreshed after 7 days because Next/React/Drizzle/Playwright changed recently in npm metadata. [VERIFIED: npm registry 2026-05-09]
