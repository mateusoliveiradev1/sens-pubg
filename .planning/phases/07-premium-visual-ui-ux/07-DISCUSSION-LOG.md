# Phase 7: Premium Visual UI UX - Discussion Log

Date: 2026-05-06
Phase: 07 - Premium Visual UI UX
Status: Context captured

## Scope Decision

Decision: Phase 07 is a complete premium visual/UI/UX refactor for the product loop, not a superficial refinement.

Options considered:

- Superficial visual polish over existing screens.
- Deep solo product loop redesign plus light global coherence.
- Full platform relaunch including community/admin deep redesign.

Selected direction:

- Deep redesign of home, global shell/navigation, mobile navigation, analyze/upload/result, dashboard, history, pricing/plans, billing/subscription, locks, Free/Pro states, brand/logo, design system, and weapon visuals.
- Community receives coherence pass only; deep community/social redesign remains Phase 11.
- Admin receives global coherence only, with optional billing polish if already touched.

Reason:

- The user wants a final-product feel: premium, polished, cohesive, mobile-first, and not visually discrepant across the touched experience.

## Product Loop

Decision: The core UX becomes a guided evidence loop.

Selected loop:

1. Analyze clip.
2. Understand evidence.
3. Train next block.
4. Record outcome.
5. Validate with compatible clip.
6. Follow evolution over time.

Screen roles:

- Result: report and action.
- Dashboard: training command center.
- History: audit and evolution.
- Pricing/Billing: trust and conversion.

Interaction model:

- One dominant CTA per screen.
- A discreet persistent Pro loop rail/spine across result, dashboard, and history.
- Progress is evidential, not empty gamification.

## Free, Pro, Locks, And Billing

Decision: Free must look and feel premium; Pro sells depth, continuity, and workflow.

Selected rules:

- Free users receive useful, truthful, beautiful analysis surfaces.
- Pro unlocks continuity, deeper historical context, programs, advanced coach workflow, and team/business value.
- Locks must be contextual previews, never fake data, blur tricks, or hidden truth.
- Upgrade prompts should appear strongest after useful analysis; quota pressure is secondary.
- Billing, subscription, quota, checkout disabled, canceled, grace, suspended, and founder beta states must be designed as premium product states.

Monetization constraint:

- Paid value cannot rely on PUBG API-derived data as exclusive content. It must sell original clip analysis, coach workflow, history, programs, and team workflow value.

## Visual Direction

Decision: Use a premium tactical mature visual direction.

Selected traits:

- Mature, technical, precise, dark UI.
- Less generic glass/neon.
- Refined borders, dividers, spacing, hierarchy, and microcontrast.
- Dense but breathable product surfaces.
- Semantic palette with clear roles, not orange/cyan everywhere.
- Mobile-first layout and navigation.

Alternatives considered:

- Neon esports arcade.
- Generic glass dashboard.
- Minimal grayscale product.

Reason:

- Sens PUBG needs to feel like a paid precision tool, not a decorative landing page or a PDF-like report.

## Research And Visual Routes

Decision: Planning must include deep applied UI/brand research before implementation.

Required output before build:

- Three polished visual routes.
- Clear recommendation and rationale.
- References applied to product decisions, not just moodboard notes.

Research areas:

- Tactical/performance dashboards.
- Premium technical product UI.
- Competitive/esports coaching surfaces.
- Icon systems and responsive navigation.
- Trustworthy pricing/billing UX.
- Mobile-first analysis flows.

## Brand And Logo

Decision: Rebrand around Sens PUBG with an original authored precision mark.

Selected brand goals:

- Premium, memorable, ownable.
- Mark can combine S/sens, recoil trail, crosshair/evidence, and precision language.
- Works as app icon, nav mark, empty-state mark, favicon direction, and wordmark.

Hard constraints:

- Do not use official PUBG or KRAFTON logos/assets.
- Do not imply affiliation, endorsement, or official status.
- Any brand treatment must remain original and legally safer.

## Weapon SVG Catalog

Decision: Phase 07 must resolve the 29-weapon visual catalog.

Catalog required from seed data:

- Beryl M762, M416, AUG, ACE32, AKM, SCAR-L, G36C, QBZ, K2, Groza, FAMAS, M16A4, Mk47 Mutant, UMP45, Vector, Micro UZI, MP5K, PP-19 Bizon, Tommy Gun, JS9, P90, Mini14, Mk12, SKS, SLR, Dragunov, QBU, VSS, Mk14.

Important distinction:

- The icons must be original authored silhouettes inspired by real in-game weapon classes and proportions.
- Do not extract, copy, or ship official PUBG artwork.

Implementation requirement:

- Create an icon-system contract before drawing: viewBox, grid, proportions, detail level, stroke/fill rules, scale rules, variants, states, accessibility, fallback, and visual QA.
- `WeaponIcon` must resolve all 29 seed weapons.
- Preserve technical honesty: visual catalog polish does not mean the analysis engine is validated for all 29 weapons unless its own data and tests support that.

## Typography And Copy

Decision: Typography and copy are part of the premium refactor.

Typography direction:

- Controlled technical sans for UI.
- Mono only for evidence, numbers, metadata, or technical readings.
- Refactor hierarchy, weights, labels, line-height, uppercase usage, and spacing.
- Avoid excessive tracking and noisy all-caps surfaces.

Copy direction:

- Polished pt-BR.
- Direct, premium, honest, and coaching-oriented.
- Avoid overclaiming perfect sensitivity or guaranteed improvement.
- Reduce mixed English/raw terms where a clearer Portuguese label exists.
- Prepare touched copy for future i18n without a full i18n migration in this phase.

## Upload And Analysis UX

Decision: Upload must become an assisted premium flow.

Selected requirements:

- Make video submission clear enough for any user.
- Improve upload affordances, validation, feedback, tips, and error states.
- Preserve browser-first analysis path.
- Make inconclusive, weak evidence, confidence, coverage, and compatibility states visually clear and honest.

## Spray Visualization

Decision: The spray/rastro component is a central premium artifact.

Selected requirements:

- Improve visual clarity, scale, evidence overlays, summary-first reading, and progressive detail.
- Mobile rendering must be first-class.
- Do not create false precision.
- Verify with screenshots and focused visual/state checks.

## Navigation And Routes

Decision: Navigation must be premium, loop-oriented, and fix the missing paid route on mobile.

Selected route semantics:

- Paid product route should be named `Planos`, `Assinatura Pro`, or similarly clear.
- `/pros` should not represent the paid product; it is the route for pro player sensitivities and should be named `Sens dos Pros` or `Pro Players`.
- Mobile navigation must include the paid route.

Suggested nav model:

- Analisar.
- Dashboard.
- Historico.
- Sens dos Pros.
- Comunidade.
- Planos/Assinatura.
- Billing contextual where appropriate.

## Home, Pricing, Billing, History, Dashboard

Decision: These surfaces receive premium product-level redesign.

Home:

- Must be a perfect premium entry into the actual product loop, not a generic marketing page.

Pricing:

- Must feel like a paid product purchase decision, not a generic table.
- Include contextual Free/Pro comparison and trust states.

Billing:

- Must feel secure, clear, and premium.

Dashboard:

- Must become the command center for training and next action.

History:

- Must become evolution/audit, optimized for scanning and comparison.

Lists/tables:

- Must be polished, scannable, responsive, and not PDF-like.

## States Matrix

Decision: Phase 07 must explicitly design and verify product states.

Required states include:

- Free.
- Pro.
- Low quota.
- Exhausted quota.
- Checkout disabled.
- Billing active.
- Billing grace.
- Billing canceled.
- Billing suspended.
- Locked feature.
- Weak evidence.
- Inconclusive.
- No history.
- Active coach loop.
- Pending outcome.
- Conflict.
- Validation needed.
- Mobile nav.
- Empty.
- Loading.
- Error.

## Accessibility, Motion, Performance

Decision: Premium means accessible, stable, and fast.

Required rules:

- Respect `prefers-reduced-motion`.
- Use discreet microinteractions.
- Keep SVGs, charts, canvas, fonts, and animations within a performance budget.
- Avoid layout shifts and text overflow.
- Verify mobile and desktop.
- Include accessibility checks.

## Testing And Verification

Decision: Delivery cannot be declared perfect without evidence.

Required gates:

- `npm run typecheck`.
- Relevant Vitest suites.
- Monetization/copy contract tests where applicable.
- `npm run benchmark:gate` if analysis/coach/tracking surfaces are touched in ways that could affect contracts.
- Playwright desktop and mobile checks.
- Accessibility checks.
- Screenshot review.
- Overflow checks.
- 29-weapon visual/catalog checks.
- Spray visualization checks.
- Free/Pro/locks/billing state checks.
- Evidence matrix and screenshot report.

No False Perfect rule:

- If any required state, visual check, or contract remains unverified, report partial/blocked status instead of claiming perfection.

## Sequencing

Decision: Execute in layered waves, preferably with clean context per major wave when useful.

Recommended sequence:

1. Research and visual route selection.
2. Design system and tokens.
3. Logo/brand.
4. Icon system and 29 weapon SVGs.
5. Analyze/upload/result.
6. Dashboard.
7. History.
8. Pricing/billing/locks.
9. Landing/global coherence.
10. QA, gates, screenshots, evidence matrix.

Parallelization:

- Use wave-based implementation when planning/execution begins.
- Keep write scopes disjoint where possible.
- Do not ship until visual/product/state evidence is complete.

## Deferred Work

- Deep community/social redesign remains Phase 11.
- Deep admin redesign is out of scope unless needed for billing coherence.
- Full i18n migration is deferred; touched copy should be future-ready.
- Claims of full analysis support for all 29 weapons are deferred unless technical engine data/tests justify them.

## Open Items For Planning

- Decide final visual route after research.
- Decide final logo direction after route exploration.
- Define exact design token names and component boundaries.
- Define focused Playwright paths and screenshot matrix.
- Decide whether to split execution into separate chats/workstreams per wave.
