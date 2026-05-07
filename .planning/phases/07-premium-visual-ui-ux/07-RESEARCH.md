# Phase 7: Premium Visual UI UX - Research

**Phase:** 07 - Premium Visual UI UX
**Researched:** 2026-05-07
**Status:** Ready for planning

## Research Goal

Answer: what do we need to know to plan this phase well?

Phase 7 is not a superficial polish pass. It is the premium visual and interaction layer for the existing paid solo-player loop. The work must make Sens PUBG feel like a real paid product while preserving browser-first analysis, confidence/coverage truth, inconclusive states, quota/entitlement security, Phase 6 commercial claim limits, and Free usefulness.

## Source Context

Primary local inputs:

- `.planning/phases/07-premium-visual-ui-ux/07-CONTEXT.md`
- `.planning/phases/07-premium-visual-ui-ux/07-UI-SPEC.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/TESTING.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/STRUCTURE.md`
- `AGENTS.md`

External references used by the approved UI-SPEC:

- Material icon guidance: `https://m1.material.io/style/icons.html`
- NN/g aesthetic-usability effect: `https://www.nngroup.com/articles/aesthetic-usability-effect/`
- NN/g ten usability heuristics: `https://www.nngroup.com/articles/ten-usability-heuristics/`
- PUBG Developer Portal terms: `https://developer.pubg.com/tos?locale=en`

## Visual Route Research

Phase 7 context asked for three polished visual routes and convergence. The approved route is already locked by `07-UI-SPEC.md`:

1. **Precision Command Center** - chosen route. Dense, calm, operational, evidence-led, mature tactical. Best fit because the product value is a guided loop with measurable evidence, not spectacle.
2. **Tactical Training Lab** - useful as a future Phase 8/9 influence, but too close to Spray Lab/session-runner scope and risks implementing later product features early.
3. **Competitive Analytics** - useful for dashboard/history density, but too cold as the whole brand direction and weaker for first paid conversion.

Planning implication: implement Precision Command Center as the design foundation, selectively borrow Tactical Training Lab only for upload/protocol guidance, and borrow Competitive Analytics only for compact evidence layouts.

## Codebase Findings

### 1. Global visual foundation exists but conflicts with the approved contract

`src/app/globals.css` already defines colors, fonts, spacing, glass cards, buttons, badges, focus states, skeletons, and utility classes. It also still describes "PUBG Aim Analyzer", uses broad font scales, large radii, all-caps letter spacing, animated background gradients, glassmorphism, glow-heavy buttons, and decorative grid effects.

The approved Phase 7 contract narrows this to:

- four typography sizes;
- two font weights;
- 8px radius for new product surfaces;
- semantic orange/cyan/gold/warning/success/destructive roles;
- controlled dark panels instead of generic glass/neon;
- no negative tracking and no viewport-scaled type;
- stable component dimensions.

Planning implication: Wave 1 should refine the local design system/tokens before route refactors. Do not add shadcn or a third-party registry.

### 2. Shell and navigation are a conversion and brand bottleneck

`src/ui/components/header.tsx` still renders `AIMANALYZER`, a circular placeholder mark, `/pricing` as `Pro`, `/pros` as `Pros`, and logged-in `/billing` as `Billing`.

`src/ui/components/mobile-nav.tsx` omits `/pricing` and `/billing`, labels `/pros` as `Pros`, uses emoji icons, and presents the drawer as `MENU` rather than Sens PUBG.

Planning implication: shell/nav must be fixed early. Paid route visibility on mobile is a known Phase 7 bug. `/pros` must become `Sens dos Pros`; paid route must be `Planos` or `Assinatura Pro`; billing user copy should become `Assinatura`.

### 3. Weapon visual catalog is the largest asset gap

`src/db/weapon-profile-seed.ts` contains 29 visual seed weapons:

- AR: Beryl M762, M416, AUG, ACE32, AKM, SCAR-L, G36C, QBZ, K2, Groza, FAMAS, M16A4, Mk47 Mutant.
- SMG: UMP45, Vector, Micro UZI, MP5K, PP-19 Bizon, Tommy Gun, JS9, P90.
- DMR: Mini14, Mk12, SKS, SLR, Dragunov, QBU, VSS, Mk14.

`src/ui/components/weapon-icon.tsx` currently has authored silhouettes for 15 technical weapons and category fallbacks. `src/game/pubg/weapon-data.ts` still has 15 technical registry entries. `src/app/analyze/analysis-weapon-support.ts` correctly separates technically supported analysis weapons from unsupported database-only entries.

Planning implication: create a visual icon registry separate from the technical analysis registry. All 29 seed weapons need non-generic authored SVGs, while technical support status stays honest.

### 4. Analyze/upload/result is the densest implementation surface

`src/app/analyze/analysis-client.tsx` is a large client component that handles upload, drag/drop, video validation, save access, quality warnings, spray validity, worker processing, save, and error states.

`src/app/analyze/analysis.module.css` already contains dropzone, quota notice, premium lock, verdict report, precision trend, adaptive coach, sensitivity profile, and responsive styles. It is powerful but broad and still uses older visual choices and ad hoc dimensions.

`src/app/analyze/results-dashboard.tsx` is very large and already has the right truth sequence: verdict, coach loop, precision trend, visual proof, sensitivity, video quality, tracking, diagnostics, and audit details.

Planning implication: this route should be a separate plan. It needs shared components such as `PageCommandHeader`, `LoopRail`, `EvidenceChip`, `MetricTile`, `ProLockPreview`, `UploadDropzone`, and `SprayTrailPanel`, but must preserve existing view-model truth and browser-first flow.

### 5. Spray visualization needs product-level treatment

`src/app/analyze/spray-visualization.tsx` draws a canvas grid, center target, optional ideal path, real path, shot points, and review overlays. It has no surrounding textual summary, no explicit low-evidence/weak-reference state in the component contract, and fixed `width`/`height` defaults.

Planning implication: create a `SprayTrailPanel` around the canvas or refactor the component API so the visual has a stable aspect ratio, accessible summary, semantic legend, reference-unavailable handling, low-evidence mode, blocker text, and mobile-safe labels.

### 6. Dashboard and history already have truth models, but layout polish is uneven

`src/actions/dashboard.ts` exposes latest truth, premium projection, active loop, trend evidence, and arsenal stats. `src/app/dashboard/dashboard-truth-view-model.ts` protects evidence language. `src/app/dashboard/page.tsx` still uses inline Tailwind classes, arbitrary font sizes/tracking, raw glass cards, and a dashboard page shape that should become a command center.

`src/actions/history.ts` exposes premium projection, full/basic history locks, coach outcome status, precision lines, checkpoints, and blocker reasons. `src/app/history/page.tsx` and `src/app/history/[id]/page.tsx` render the audit/evolution role, but use inline styles and long dense sections that need mobile-first restructuring.

Planning implication: dashboard and history can share a plan focused on loop rail, current action, scannable timeline/rows, evidence chips, and Pro continuity without altering server truth.

### 7. Pricing and billing are server-truth safe but visually raw

`src/app/pricing/page.tsx` correctly uses server-owned pricing and `startProCheckout({ intent: 'founder_brl_monthly' })`. It has a module CSS file and strong copy contracts, but the layout is still a generic conversion page rather than a premium purchase-decision surface.

`src/app/billing/page.tsx` correctly resolves server access and opens the Stripe portal through `openBillingPortal`, but it uses inline styles, `Billing` copy, and simple glass cards.

`src/app/checkout/success/page.tsx` and `src/app/checkout/cancel/page.tsx` preserve the Phase 5 truth that success URL never grants Pro, but they need product-grade receipts.

Planning implication: pricing/billing/checkout/locks should be one paid-state plan with contract tests. It must preserve server-owned checkout, portal, quota, access, and no-overclaim copy.

### 8. Home and global coherence should come after foundations

`src/app/page.tsx` still feels like the old product entry: generic hero, decorative crosshair, emoji feature icons, old `PUBG Aim Analyzer` wording, and visual emphasis not aligned to the approved Sens PUBG loop. Community/admin routes already have their own visual systems; Phase 7 should only give them shared shell/token/button/card coherence.

Planning implication: do home and light global coherence late, after shell, brand, design tokens, weapon assets, and paid/result components exist.

### 9. Analytics foundation exists but needs Phase 7 event additions

`src/lib/product-analytics.ts` safely records typed monetization events with sanitized metadata. Existing events include activation, upgrade intent, quota, checkout, lifecycle, lock viewed, paywall viewed, and billing portal opened. The UI-SPEC asks to consider hero CTA, upload guidance correction, result lock preview opened, loop rail CTA clicked, pricing plan selected, billing portal opened, and mobile paid route clicked.

Planning implication: do not add free-form private telemetry. Add stable event helpers or reuse `recordProductEvent` with enum-safe events and sanitized metadata only. If client-side UI events need persistence, route through a server action or existing server-side events; never record raw video/frame/trajectory data.

## Test And Verification Research

Existing focused contracts:

- `src/ui/components/header.contract.test.tsx`
- `src/app/pricing/page.contract.test.ts`
- `src/app/billing/page.contract.test.ts`
- `src/app/analyze/results-dashboard.contract.test.ts`
- `src/app/analyze/results-dashboard-view-model.test.ts`
- `src/app/dashboard/page.contract.test.ts`
- `src/app/history/page.contract.test.ts`
- `src/app/copy-claims.contract.test.ts`
- `src/app/analyze/analysis-weapon-support.test.ts`
- monetization action/library tests under `src/actions` and `src/lib`

Existing Playwright coverage:

- `e2e/pages.spec.ts`
- `e2e/responsive.spec.ts`
- `e2e/a11y.spec.ts`
- community E2E/visual specs

Phase 7 must add:

- header/mobile nav contract tests for `Planos`/`Assinatura Pro` and `Sens dos Pros`;
- weapon icon contract tests proving every seed weapon resolves to a non-generic silhouette;
- visual render grid route or test component for 29 weapons;
- copy tests for Phase 7 changed surfaces;
- route/page contract tests for new shared components and required states;
- Playwright desktop/mobile screenshots for home, analyze, dashboard, history, pricing, billing, checkout receipts, mobile nav, spray visualization states, and weapon grid;
- evidence report with commands, screenshots, gaps, and final status.

## Recommended Plan Shape

Create seven plans:

1. `07-01` - Premium Design System, Brand Shell, And Loop Foundation.
2. `07-02` - 29 Weapon SVG Catalog And Support Status Contract.
3. `07-03` - Analyze Upload, Result Report, And Spray Proof Experience.
4. `07-04` - Dashboard And History Loop Surfaces.
5. `07-05` - Pricing, Billing, Checkout Receipts, Locks, And Paid Analytics.
6. `07-06` - Home Entry, Route IA, And Light Global Coherence.
7. `07-07` - No False Perfect Visual QA And Evidence Matrix.

Dependency shape:

- Wave 1: `07-01`
- Wave 2: `07-02` after `07-01`
- Wave 3: `07-03` after `07-01` and `07-02`
- Wave 4: `07-04` and `07-05` after `07-03`
- Wave 5: `07-06` after `07-01`, `07-02`, and `07-05`
- Wave 6: `07-07` after all prior plans

## Key Risks

- Deep UI refactor can accidentally hide confidence, coverage, blockers, inconclusive states, or Phase 6 commercial readiness caveats.
- Weapon visuals can imply full technical support for all 29 weapons unless the visual/technical support split is explicit.
- Mobile nav/purchase route fixes can regress route protection, billing truth, or `/pros` professional sensitivity references.
- Copy polish can slip into perfect sensitivity, guaranteed improvement, rank, or PUBG/KRAFTON affiliation claims.
- Big CSS changes can introduce mobile overflow, text overlap, layout shift, weak contrast, or reduced-motion failures.
- Screenshot/state-matrix verification can be expensive; keep focused contracts per plan and reserve full matrix for the final QA plan.

## RESEARCH COMPLETE

Research is complete and ready for planning.
