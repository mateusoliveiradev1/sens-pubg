---
phase: 11
slug: social-pro-community-premium
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-09
---

# Phase 11 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.0.18` for unit/contract/CI tests; Playwright `^1.58.2` for e2e and visual evidence. |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test:community:unit && npm run test:monetization` plus changed-file Vitest commands for new Social Pro modules. |
| **Full suite command** | `npm run typecheck && npx vitest run && npm run test:community:unit && npm run test:community:e2e && npm run test:community:visual && npm run test:monetization && npm run benchmark:gate && npm run build && npm run verify:phase11:social-pro` |
| **Estimated runtime** | Quick: under 90 seconds. Full: CI-scale; executor must report actual runtime. |

---

## Sampling Rate

- **After every task commit:** Run the focused changed-area Vitest command and any affected community/monetization unit script.
- **After every plan wave:** Run `npm run typecheck`, `npx vitest run`, `npm run test:community:unit`, and `npm run verify:phase11:social-pro` once available.
- **Before `$gsd-verify-work`:** Full suite must be green and desktop/mobile Playwright evidence must exist for the key Social Pro states.
- **Max feedback latency:** One task may not introduce more than one unverified Social Pro access, redaction, lifecycle, analytics, or UI state.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-W0-01 | W0 | 0 | MON-01 | T-11-ACCESS | Free public feed, posts, profiles, likes, comments, follows, normal saves, and basic reading remain open where already open. | unit + e2e regression | `npm run test:community:unit && npm run test:community:e2e` | Existing partial; Phase 11 rows W0 | pending |
| 11-W0-02 | W0 | 0 | MON-02 | T-11-ACCESS | Pro-only creation/editing for reports, private links, Pro library, advanced context, badge controls, and creator analytics. | unit + action integration | `npx vitest run src/actions/social-pro-reports.test.ts src/actions/social-pro-library.test.ts src/lib/social-pro-access.test.ts` | W0 | pending |
| 11-W0-03 | W0 | 0 | MON-03 | T-11-ENTITLEMENT | Product subscription/grant truth controls every Social Pro mutation/read on the server. | unit + contract | `npx vitest run src/lib/product-entitlements.test.ts src/lib/social-pro-access.test.ts` | Product partial; Social Pro W0 | pending |
| 11-W0-04 | W0 | 0 | MON-04 | T-11-COMMERCIAL | Paid value is original report, coach/history/protocol/Lab/Ciclo continuity, and organization; no PUBG API-derived exclusive paid value. | contract + copy safety | `npx vitest run src/core/social-pro-report-redaction.test.ts src/app/community/social-pro-copy.contract.test.ts` | W0 | pending |
| 11-W0-05 | W0 | 0 | MON-05 | T-11-COPY | Copy avoids perfect sensitivity, guaranteed rank/improvement, official affiliation, global grades, and paid authority claims. | unit + visual contract | `npx vitest run src/core/social-pro-report-redaction.test.ts src/app/community/social-pro-copy.contract.test.ts` | W0 | pending |
| 11-W0-06 | W0 | 0 | MON-02, MON-03 | T-11-LINK | Link-private reports are unlisted, public-safe, revocable/regenerable, optionally expirable, and readable only through active non-revoked links. | unit + e2e | `npx vitest run src/actions/social-pro-reports.test.ts && npm run test:community:e2e` | W0 | pending |
| 11-W0-07 | W0 | 0 | MON-01, MON-02 | T-11-REDACTION | Public reports never expose private account data, private collection contents, payment state, private readers, hidden history, or internal notes. | unit + e2e | `npx vitest run src/core/social-pro-report-redaction.test.ts && npm run test:community:e2e` | W0 | pending |
| 11-W0-08 | W0 | 0 | MON-02, MON-05 | T-11-MODERATION | Pro reports reuse moderation lifecycle, add Pro-specific reasons, preserve audit logs, and support admin hide/disable without silent deletion. | unit + action integration | `npx vitest run src/actions/community-reports.test.ts src/actions/community-admin.test.ts src/actions/social-pro-reports.test.ts` | Existing partial; Pro rows W0 | pending |
| 11-W0-09 | W0 | 0 | MON-01, MON-02 | T-11-ANALYTICS | Upgrade intent logs only real Pro actions or CTA clicks and excludes private clips, private links, private readers, payment data, and funnel/revenue metrics. | unit + contract | `npx vitest run src/lib/product-analytics.test.ts src/core/social-pro-creator-analytics.test.ts` | Product partial; Social Pro W0 | pending |
| 11-W0-10 | W0 | 0 | MON-01, MON-02, MON-05 | T-11-UI | Desktop and mobile Social Pro states are overflow-safe, accessible, honest about confidence/coverage/blockers, and do not add aggressive feed banners. | visual + e2e | `npm run test:community:visual && npx playwright test e2e/phase11-social-pro.spec.ts` | W0 | pending |
| 11-W0-11 | W0 | 0 | MON-01, MON-02, MON-03, MON-04, MON-05 | T-11-GATE | No False Premium verifier enforces the Phase 11 matrix and blocks Delivered status without evidence. | CI verifier | `npm run verify:phase11:social-pro` | W0 | pending |

---

## Wave 0 Requirements

- [ ] `src/types/social-pro.ts` and `src/types/social-pro.test.ts` - stable report, link, library, analytics, visibility, and moderation reason contracts.
- [ ] `src/lib/social-pro-access.ts` and `src/lib/social-pro-access.test.ts` - product entitlement wrapper, Free/Pro/canceled/admin access matrix, no client-only access truth.
- [ ] `src/core/social-pro-report-redaction.ts` and `src/core/social-pro-report-redaction.test.ts` - public-safe allowlist, required honesty fields, prohibited private fields, and copy-safety assertions.
- [ ] `src/actions/social-pro-reports.test.ts` - Pro-only report creation/edit/update, visibility, link lifecycle, cancellation behavior, moderation disable/hide, and audit behavior.
- [ ] `src/actions/social-pro-library.test.ts` - normal Free saves unchanged; Pro library writes gated, private by default, and context-aware.
- [ ] `src/core/social-pro-creator-analytics.test.ts` - safe aggregate social-impact metrics with no private reader, private link, raw private analysis, payment, funnel, or financial leakage.
- [ ] `src/ci/phase11-social-pro-evidence.test.ts` - script/checklist registration for No False Premium evidence.
- [ ] `scripts/verify-phase11-social-pro.ts` - No False Premium matrix parser and failure messages.
- [ ] `e2e/phase11-social-pro.spec.ts` - public report, link-private report, revoked/hidden report, Free locks, Pro hub, report controls, and desktop/mobile states.
- [ ] `package.json` - add `verify:phase11:social-pro` and any focused Social Pro test scripts needed by the verifier.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Desktop/mobile visual evidence for polished Social Pro surfaces | MON-01, MON-02, MON-05 | Automated visual tests catch regressions, but final planning requires captured evidence for the exact key states. | Capture Playwright screenshots for public report, link-private report, revoked/hidden report, Free lock, Pro hub, badge tooltip, creator analytics, and Pro library on desktop and mobile. |
| Stripe/payment dashboard copy review, if social copy touches billing surfaces | MON-05 | External dashboard copy may not be fully testable from local code. | Confirm no official PUBG/KRAFTON affiliation, perfect sensitivity, guaranteed rank, or paid-authority language exists in any changed Stripe/payment copy. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify commands or explicit Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing test references.
- [ ] No watch-mode flags.
- [ ] Feedback latency is bounded by focused tests after each task and full Social Pro verifier after each wave.
- [ ] `nyquist_compliant: true` set in frontmatter only after Wave 0 evidence exists and all planned task verification commands are green.

**Approval:** pending
