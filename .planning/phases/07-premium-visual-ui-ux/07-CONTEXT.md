# Phase 7: Premium Visual UI UX - Context

**Gathered:** 2026-05-06T22:27:17.9987074-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase is a complete visual and UI/UX refactor of the existing solo-player paid loop, not a superficial polish pass.

The target is a launch-grade, premium Sens PUBG product experience across the solo loop: home/landing, app shell, mobile/desktop navigation, analyze/upload, result report, spray visualization, dashboard, history, pricing/plans, billing/subscription, quota, Free/Pro locks, and global visual foundations. The phase also creates the visual identity foundation: Sens PUBG logo/wordmark direction, local design system, icon system, and premium SVG silhouettes for all 29 current weapon profile seed entries.

This phase must not implement the future deep capabilities reserved for later phases: complete training protocols, Spray Lab/session runner, guided programs, social Pro/community premium, team/coach workflows, export/share products, or a full admin redesign. It may make light global coherence updates to community/admin so the app does not look like two different products, but deep community redesign belongs to Phase 11.

The phase must preserve the browser-first analysis path, truth contract, confidence/coverage/inconclusive visibility, entitlement/quota truth, billing security, coach loop behavior, history audit, benchmark/copy gates, and all no-overclaim constraints. Premium polish must make evidence clearer, not hide uncertainty.

</domain>

<decisions>
## Implementation Decisions

### Scope And Product Shape
- **D-01:** Phase 7 is a full visual/UI/UX refactor of the existing solo-player loop with extreme premium polish. It is not a small CSS refinement pass.
- **D-02:** Scope is "deep solo loop + light global coherence": deeply refactor home, shell/nav, analyze/upload/result, dashboard, history, pricing/plans, billing/subscription, locks, Free/Pro states, design system base, logo/brand, and weapon SVGs.
- **D-03:** Community receives only enough shared-shell/token/component/card/spacing/CTA/brand coherence to avoid visual discrepancy. Deep feed, profiles, posts, social Pro, creator analytics, collections, and community monetization stay for Phase 11.
- **D-04:** Admin receives shared global coherence only. Admin billing/support surfaces may receive enough polish to avoid looking crude for Pro support, but full admin redesign is out of scope.
- **D-05:** Future export/share, team/coach, Spray Lab, guided programs, and complete training UX may be visually anticipated by the design system, but must not be implemented as Phase 7 features.

### Guided Pro Loop
- **D-06:** The premium product should feel like one guided loop: analyze clip -> understand evidence -> train next block -> record outcome -> validate compatible clip -> follow evolution.
- **D-07:** Each core screen has a fixed role. Result = immediate report and decision. Dashboard = current training command center. History = audit/evolution. Pricing and billing = conversion/trust surfaces.
- **D-08:** Every screen should expose one dominant contextual next action: analyze, save, record outcome, record compatible validation, open protocol, resolve quota, or resolve billing.
- **D-09:** Result, dashboard, and history should share a discreet persistent Pro loop spine/rail showing current stage, next action, evidence/confidence, and protocol state. It must not become heavy gamification.

### Free Versus Pro
- **D-10:** Free must also look premium. The difference between Free and Pro is depth/continuity of the loop, not "ugly versus beautiful."
- **D-11:** Free remains a useful trust-building report: verdict, mastery, confidence, coverage, inconclusive/blockers, and short coach/next-step summary remain visible.
- **D-12:** Pro unlocks the complete loop: full protocol, advanced metrics, compatible trends, history depth, outcomes, validation, dashboard active loop, and continuity.
- **D-13:** Pro locks must be premium contextual previews. No fake data, deceptive blur, or hiding truth-contract evidence. The lock should show exactly what is missing at that moment.
- **D-14:** Upgrade should be strongest at the moment of value, especially after a useful analysis. Quota remains a secondary upgrade moment.
- **D-15:** Quota, subscription, founder beta, grace, cancellation, suspension, portal, and billing states should be product-designed, not raw technical/admin screens.
- **D-16:** Free-vs-Pro explanation should be short and contextual on each surface. Pricing may have a more complete comparison, but still compact and elegant.

### Visual Identity And Research
- **D-17:** Visual direction is "premium tactical mature": keep dark PUBG/tactical DNA, but move away from template-like glass/neon toward an adult, dense, authored paid-product interface.
- **D-18:** Research is mandatory and should be deeper than a quick skim, but applied. It must produce actionable direction for logo, palette, type, icon/weapon system, mobile patterns, premium product references, and QA rubrics.
- **D-19:** Research should produce three polished visual routes before implementation, then converge on one. Candidate routes include precision premium, tactical training lab, and competitive analytics.
- **D-20:** Rebrand the product experience around **Sens PUBG**, not the current `AIMANALYZER` header identity. The paid product should feel like a brand, not a demo module.
- **D-21:** Logo direction: an authored precision mark combining ideas such as S, sensitivity, recoil trail, crosshair, and evidence, with a premium Sens PUBG wordmark. It must work in header, favicon, mobile nav, pricing, result report, locks, and weapon/icon contexts.
- **D-22:** Do not use official PUBG/KRAFTON logos, extracted game assets, or anything implying affiliation. Brand and weapon art must be original and safe.

### Palette, Surfaces, Typography, And Copy
- **D-23:** Use a premium semantic palette. Dark remains, but orange/cyan must not be sprayed everywhere. Each color needs a job: CTA, focus, information, evidence, Pro/lock, warning, error, success, blocker, confidence.
- **D-24:** Reduce generic glassmorphism and decorative glow. Prefer dense premium surfaces, refined borders/dividers, controlled shadows, strong hierarchy, and purposeful microcontrast.
- **D-25:** Create/refine a local design system for the Pro loop: tokens, shell, page headers, loop rail, metric tiles, evidence chips, lock previews, weapon marks, empty/loading/error states, pricing/billing panels, forms, and disclosure patterns.
- **D-26:** Typography should be premium, technical, and controlled. Keep a fast readable sans plus mono for evidence/numbers, but refactor scale, weights, uppercase, labels, line-height, and hierarchy. Avoid excessive tracking and noisy all-caps.
- **D-27:** A custom logo/wordmark may carry distinct brand character, but the app's main type system should remain legible and performant unless research proves otherwise.
- **D-28:** Copy should be pt-BR premium, direct, demanding, and honest. Refine previous truth-aware copy; do not regress into raw technical labels, mixed English, or generic SaaS wording.
- **D-29:** Never promise perfect sensitivity, guaranteed improvement, rank gain, final certainty, definitive player skill, or PUBG/KRAFTON affiliation.
- **D-30:** Prepare copy for future i18n where heavily touched, but do not turn Phase 7 into a full translation migration. Default product copy remains polished pt-BR.

### Weapon SVGs And Catalog Coherence
- **D-31:** Deliver premium authored SVG silhouettes for all 29 current weapon seed entries: Beryl M762, M416, AUG, ACE32, AKM, SCAR-L, G36C, QBZ, K2, Groza, FAMAS, M16A4, Mk47 Mutant, UMP45, Vector, Micro UZI, MP5K, PP-19 Bizon, Tommy Gun, JS9, P90, Mini14, Mk12, SKS, SLR, Dragunov, QBU, VSS, and Mk14.
- **D-32:** The SVGs should be faithful and recognizable as the real PUBG weapon identities, but original/authored. Do not use official/extracted assets.
- **D-33:** Define an icon-system contract before drawing: grid, viewBox, proportion, detail level, stroke/fill strategy, scale, status states, hover/focus, dark-surface behavior, accessibility labels, and future fallback rules.
- **D-34:** `WeaponIcon` and related visual surfaces must resolve all 29 weapon profile seed names/IDs without generic fallback for existing weapons.
- **D-35:** Align the visual catalog to the 29 weapon profile seed entries without pretending the technical engine is perfect for every weapon. If technical/calibration support is limited, UI must say so through confidence, blockers, and conservative copy.
- **D-36:** Future/removed/deprecated weapons need premium fallback plus clear catalog status: full support, visual support, technical limited support, removed, or deprecated.

### Progression And Evidence Visualization
- **D-37:** Progress should be evidential, not empty gamification. Show active line, checkpoints, compatibility, confidence, coverage, next block, validation, and blockers.
- **D-38:** Build a premium loop timeline/rail: Clip -> Coach -> Block -> Outcome -> Validation -> Checkpoint. It should adapt across result, dashboard, and history, stay light, and avoid PDF-like heaviness.
- **D-39:** Use strong summary plus progressive detail. The first view answers "what now?" and "how strong is the evidence?" Technical proof opens via disclosure, tabs, accordions, history, or audit surfaces.
- **D-40:** Build authored, explainable visualizations for spray path, ideal-vs-real trail, deltas, confidence/coverage, blockers, and compatible trends. Avoid generic charts dropped into cards.
- **D-41:** The spray path/rastro component is central and must be polished to product level: responsive, legible, with clear legend, evidence states, low-evidence behavior, ideal-vs-real comparison, mobile reading, and no "canvas dumped in a card" feeling.

### Mobile, Forms, And Interaction
- **D-42:** Mobile-first is mandatory. Result, dashboard, history, pricing, billing, locks, rail, SVGs, tables, forms, mobile nav, and spray visualization must be designed for phone first and expanded to desktop.
- **D-43:** Use polish by intelligent reduction: one main action, clear hierarchy, progressive disclosure, less repeated text, beautiful states, breathing components, and no wall-of-text mobile experience.
- **D-44:** Forms and upload UX must be premium and assisted. Upload, weapon, optic, distance, metadata, markers, and save should guide users toward good clips without a giant tutorial.
- **D-45:** The video upload/dropzone experience needs a major redesign: drag/select/validate/process/error states, capture guidance, requirements, quality feedback, mobile behavior, and next steps should make it easy for any user to submit a usable spray clip.
- **D-46:** Microinteractions should be premium and discreet: CTA feedback, loop rail movement, lock reveal, loading transitions, disclosure transitions, weapon hover/focus, spray path animation when useful, quota/billing receipts. Always respect `prefers-reduced-motion`.
- **D-47:** Performance has a visual budget. SVGs, charts/canvas, animations, fonts, and layouts must stay smooth on mobile with minimal layout shift and no wasteful re-render patterns.

### Navigation, Home, Pricing, Billing, And Global Coherence
- **D-48:** Desktop and mobile navigation should be loop-oriented and premium. Current mobile nav hiding the paid route is a UX/conversion bug and must be fixed.
- **D-49:** Navigation should distinguish the paid product from professional-player sensitivity references. Paid route should be labeled `Planos`, `Assinatura Pro`, or similar; `/pros` should be labeled `Sens dos Pros` or `Pro Players`.
- **D-50:** Suggested nav priority: Analisar, Dashboard, Historico, Sens dos Pros, Comunidade, Planos/Assinatura. Billing/Assinatura appears contextually for logged-in users.
- **D-51:** Home should become the premium entry into the Sens PUBG loop: new brand, honest promise, premium visual, weapons, Free value, Pro loop, and clear first-analysis CTA. Do not leave it as a generic old landing page.
- **D-52:** Pricing should be a premium purchase-decision page, not a generic table. It must show loop value, Free-vs-Pro, founder beta, limits, Stripe trust, independence from PUBG/KRAFTON, and no outcome guarantees.
- **D-53:** Billing/Assinatura should be a premium trust panel: tier, quota, period, status, portal, support, cancellation, grace, suspension, and next action with product-grade layout and copy.
- **D-54:** Founder beta/cohort/invite states should look like controlled premium rollout, not broken/disabled features.

### Lists, States, Accessibility, And Analytics
- **D-55:** Lists/tables/history should become premium scannable layouts. History, weapon lists, scope tables, billing states, and rankings need responsive structure, progressive disclosure, contextual actions, and no overflow.
- **D-56:** Empty states should point to the next action. Dashboard empty, history empty, no compatible line, no Pro, no billing, no saved result, weak evidence, and inconclusive should be helpful, short, and premium.
- **D-57:** Loading, error, locked, inconclusive, weak evidence, quota, and billing states must be designed as product surfaces, not leftovers.
- **D-58:** Accessibility is part of visual perfection: contrast, visible focus, keyboard, touch targets, ARIA labels, reduced motion, tooltips, mobile reading, success/error receipts, and textual alternatives for charts/weapons.
- **D-59:** Analytics must be preserved and extended for new CTAs/locks. The refactor must not lose activation, upgrade intent, quota, checkout, lock, and pricing events; new events must remain privacy-safe.

### Sequencing And Verification
- **D-60:** Sequence the work in layers: research -> route selection -> design system -> brand/logo -> icon system + 29 SVGs -> analyze/result -> dashboard -> history -> pricing/billing/locks -> landing/global coherence -> QA/gates.
- **D-61:** Plans should be wave-based with gates by layer. One wave per thread/chat is recommended when useful to keep context clean and reduce risk.
- **D-62:** Deep UI refactor may change components, CSS, layout, shell, and assets, but must preserve product contracts: browser-first analysis, truth contract, entitlements/quota, save flow, history audit, coach loop, benchmark/copy gates.
- **D-63:** Adopt a "No False Perfect" gate. Phase 7 is delivered only when all required UI/UX, visual, mobile, asset, state, copy, and verification evidence passes. If anything material is missing, final status must be partial/blocked with explicit gaps.
- **D-64:** Required gates include at least `npm run typecheck`, `npx vitest run`, monetization/copy contracts, `npm run benchmark:gate`, Playwright desktop/mobile, accessibility checks, screenshot review, overflow checks, 29-weapon visual checks, spray visualization checks, Free/Pro/locks/billing state checks, and evidence report.
- **D-65:** Use a rubriced visual checklist per major screen/state: hierarchy, first action, density, responsive behavior, contrast, overflow, empty/loading/error, locks, honest copy, assets, accessibility, and premium feel.
- **D-66:** Test a complete state matrix: Free, Pro, low quota, exhausted quota, checkout disabled, billing active, grace, canceled, suspended, locked feature, weak evidence, inconclusive, no history, active coach loop, pending outcome, conflict, validation needed, mobile nav, empty/loading/error.
- **D-67:** Weapon SVG verification requires contract tests plus a visual render grid for all 29 weapons, confirming asset resolution, labels, sizing, and absence of generic fallback for existing weapons.
- **D-68:** Final evidence must include an evidence matrix and screenshot report listing each screen/state/asset/gate, command, result, screenshots, gaps, and final status.

### the agent's Discretion
The researcher/planner may choose exact component names, file boundaries, token names, CSS module structure, final visual route, exact logo geometry, detailed copy wording, Playwright implementation strategy, and plan wave count.

That discretion does not include weakening the scope into superficial polish, hiding evidence/confidence/blockers, using official PUBG/KRAFTON assets, dropping mobile-first, shipping generic weapon fallbacks for current seed weapons, hiding paid plans on mobile, confusing `Planos/Assinatura Pro` with `Sens dos Pros`, redesigning Phase 11 community features inside Phase 7, implementing Phase 8/9/10 features early, or declaring the phase complete without the No False Perfect evidence.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Core value, browser-first constraint, confidence honesty, monetization posture, and original clip-analysis/coach/history value.
- `.planning/REQUIREMENTS.md` - Phase 7 requirements: ANALYT-01, ANALYT-02, MON-01, MON-02, MON-04, plus copy/monetization constraints.
- `.planning/ROADMAP.md` - Phase 7 goal and success criteria: premium, clear, launch-grade solo-player loop across analysis, result, dashboard, history, pricing, billing, and locked states.
- `.planning/STATE.md` - Current focus, Phase 6 partial commercial claim boundary, and next recommended command.

### Prior Phase Decisions
- `.planning/phases/04-adaptive-coach-loop/04-CONTEXT.md` - Adaptive loop truth, outcome/memory surfaces, coach aggressiveness, and no-overclaim posture.
- `.planning/phases/04-adaptive-coach-loop/04-UI-SPEC.md` - Approved coach-loop UI contract: existing CSS/Tailwind system, spacing/type/color/copy/accessibility constraints.
- `.planning/phases/05-freemium-pro-mvp/05-CONTEXT.md` - Free/Pro cut, Stripe truth, quota, founder pricing, paywall copy, no false done, Pro loop monetization.
- `.planning/phases/06-core-accuracy-and-pro-validation-hardening/06-CONTEXT.md` - Commercial truth boundaries, decision ladder, blocked/inconclusive behavior, no strong public claims without validation.

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` - Local TypeScript/React/CSS module/Tailwind/copy/style conventions.
- `.planning/codebase/STRUCTURE.md` - App routes, source directories, server actions, UI and core module layout.
- `.planning/codebase/STACK.md` - Next.js, React, strict TypeScript, Tailwind/CSS modules, Vitest, Playwright, Vercel stack.
- `.planning/codebase/ARCHITECTURE.md` - Browser-first pipeline, persistence model, admin/community architecture, release readiness.
- `.planning/codebase/TESTING.md` - Unit, contract, Playwright, benchmark, release, and UI verification expectations.
- `.planning/codebase/CONCERNS.md` - Current visual/production gaps, i18n partial state, local secrets warning, dashboard/public shell caveat.

### Domain And Product Docs
- `docs/SDD-analise-spray.md` - Important catalog caveat: technical weapon registry has 15 entries while DB seed has more; preserve honest support limits.
- `docs/SDD-inteligencia-de-sens.md` - Sensitivity intelligence and anti-overclaim constraints.
- `docs/SDD-coach-extremo.md` - Coach loop and protocol behavior.
- `docs/benchmark-runner.md` - Benchmark safety expectations.
- `docs/benchmark-reports/latest.md` - Current benchmark/calibration readiness signal.

### Existing Product Code
- `src/app/globals.css` - Current global tokens, dark glass language, base buttons/badges/typography, and responsive utilities.
- `src/ui/components/header.tsx` - Current desktop nav with `AIMANALYZER`, `/pricing`, `/billing`, `/pros`; must be rebranded and re-IA'd.
- `src/ui/components/header.module.css` - Current fixed glass nav styles and logo treatment.
- `src/ui/components/mobile-nav.tsx` - Current mobile nav does not expose `/pricing`/paid route; Phase 7 must fix this.
- `src/ui/components/mobile-nav.module.css` - Current drawer behavior and icon/copy patterns.
- `src/ui/components/weapon-icon.tsx` - Existing 15-weapon silhouette approach; must evolve to a 29-weapon icon system.
- `src/db/weapon-profile-seed.ts` - Canonical 29 weapon profile seed list shown by landing stats.
- `src/game/pubg/weapon-data.ts` - Current 15-weapon technical registry; visual catalog must not falsely claim perfect technical support.
- `src/game/pubg/weapon-patch-catalog.ts` - Patch-aware weapon registry derived from seed entries.
- `src/app/page.tsx` and `src/app/page.module.css` - Current home/landing and 29-weapon stat; must become premium Sens PUBG entry.
- `src/app/analyze/analysis-client.tsx` - Browser-first upload/analysis orchestration and key form/upload UX.
- `src/app/analyze/analysis.module.css` - Current analysis/result CSS, including dropzone, quota notice, locks, report, trend, coach, sensitivity, visualizations.
- `src/app/analyze/results-dashboard.tsx` - Result report, coach, sensitivity, tracking, proof, and spray visualization integration.
- `src/app/analyze/results-dashboard-view-model.ts` - Truth-aware result/lock/trend/coach view models.
- `src/app/analyze/spray-visualization.tsx` - Spray path/rastro component that needs premium redesign.
- `src/app/dashboard/page.tsx` - Current dashboard UI, truth view, active loop, arsenal, and trend surfaces.
- `src/app/dashboard/dashboard-truth-view-model.ts` - Evidence-aware dashboard next-action copy.
- `src/app/dashboard/trend-chart.tsx` - Chart surface and mobile/visual polish candidate.
- `src/app/history/page.tsx` - History list, precision lines, field feedback, and long-list UI.
- `src/app/history/[id]/page.tsx` - History detail audit, coach outcome, precision checkpoint and saved result surface.
- `src/app/pricing/page.tsx` and `src/app/pricing/page.module.css` - Founder pricing page; must become premium purchase-decision surface.
- `src/app/billing/page.tsx` - Current billing/subscription/quota surface; must become premium trust panel.
- `src/app/admin/billing/page.tsx` - Admin billing support surface; may need enough polish for Pro support trust.
- `src/app/community/page.tsx` and community CSS/modules - Receive light coherence only, not Phase 11 deep redesign.
- `src/app/pros/page.tsx` and `src/app/pros/*` - Professional-player sensitivity reference; nav label should distinguish it from paid Pro.
- `src/lib/product-analytics.ts` - Preserve/extend privacy-safe upgrade and CTA tracking.
- `src/lib/product-access-server.ts`, `src/lib/premium-projection.ts`, `src/actions/billing.ts`, `src/actions/history.ts`, `src/actions/dashboard.ts` - Entitlement/quota/access contracts that visual refactor must not break.
- `package.json` - Existing scripts: `typecheck`, Vitest, `benchmark:gate`, `test:monetization`, `verify:release`, Playwright smoke.

### External References
- `https://m1.material.io/style/icons.html` - Icon-system principles: grid, clarity, consistency, scalable visual language.
- `https://www.nngroup.com/articles/aesthetic-usability-effect/` - Aesthetic polish can improve perceived usability, but must not replace clarity.
- `https://www.nngroup.com/articles/ten-usability-heuristics/` - Consistency, match with real world, feedback, error recovery, and user control.
- `https://developer.pubg.com/tos?locale=en` - PUBG Developer Portal terms/trademark constraints; avoid official asset misuse or false affiliation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/globals.css`: Current tokens, buttons, badges, glass cards, focus states, and responsive utilities should become the foundation for a more mature design system rather than being ignored.
- `src/ui/components/header.tsx`, `mobile-nav.tsx`, and modules: Shared shell points for brand/nav/mobile-first corrections.
- `src/ui/components/weapon-icon.tsx`: Existing authored SVG strategy is a strong starting point, but it must scale from 15 to all 29 seed weapons with a formal icon contract.
- `src/app/analyze/results-dashboard-view-model.ts` and `src/app/dashboard/dashboard-truth-view-model.ts`: Existing truth-aware copy/view-model layer should be preserved while improving presentation.
- `src/app/analyze/spray-visualization.tsx`: Central visual proof component; should be redesigned as a premium authored visualization.
- `src/lib/product-analytics.ts`: Existing privacy-safe analytics should be connected to new locks/CTAs and not dropped.

### Established Patterns
- Next.js App Router with Server Components by default and client components for interactive analysis/charts/outcomes.
- CSS modules plus global tokens/Tailwind utilities are already in use; Phase 7 should build a local system rather than adding an unrelated third-party UI kit by default.
- Deterministic truth remains in core/view models; UI polish must consume and clarify existing evidence rather than inventing claims.
- Page contract tests already exist for pricing, billing, result dashboard, dashboard, history, header, and copy claims. Extend these patterns.
- Benchmark/copy gates are product safety gates, not optional extras.

### Integration Points
- Header/mobile nav must fix the paid-route visibility bug and resolve naming conflict between paid `Planos/Assinatura Pro` and `/pros` as `Sens dos Pros`.
- Analyze/upload/result changes touch `analysis-client.tsx`, `analysis.module.css`, result view models, and `saveAnalysisResult` UI states; preserve browser-first and server-owned save/quota truth.
- Dashboard changes must preserve truth language for evidence, active coach loop, next actions, and strict trend comparisons.
- History changes must preserve full audit role while improving long-list, precision-line, checkpoint, and detail readability.
- Pricing/billing changes must preserve server-created Checkout, webhook truth, Billing Portal, quota, founder beta, grace/cancel/suspended states, and no-overclaim copy.
- Weapon icon changes need alignment between DB seed names, `WeaponIcon` lookup, landing stats, dashboard/history weapon cards, and future patch statuses.
- Playwright/screenshot verification likely needs routes or fixtures/test doubles for multiple product states.

</code_context>

<specifics>
## Specific Ideas

- User repeatedly emphasized "perfeita", "polida ao extremo", "projeto final grande", and "produto pago real." Interpret this as concrete gates, not vague perfectionism.
- The user specifically corrected that the app shows 29 weapons, not 15; Phase 7 must resolve the visual inconsistency.
- Mobile nav currently omits the paid route. This is a known UX/conversion bug to fix.
- `/pros` is important because it shows sensitivities of professional PUBG players; do not remove it. Rename/position it as `Sens dos Pros` or `Pro Players` to avoid confusion with paid Pro.
- Home should become a premium first impression, not old generic landing.
- Upload/dropzone and first-analysis guidance must become easy enough for non-experts to submit a good clip.
- The spray path/rastro visualization should be one of the most polished components in the app.
- The design should feel premium by clarity, density control, and evidence, not by adding more neon or heavy animation.

</specifics>

<deferred>
## Deferred Ideas

- Deep community premium/social redesign belongs to Phase 11.
- Complete training protocol product belongs to Phase 8.
- PUBG Spray Lab/session runner/drills belong to Phase 9.
- Guided weekly/monthly Pro programs belong to Phase 10.
- Team/coach workflows and report export/share products belong to Phase 13 or related future planning.
- Full i18n migration is deferred; Phase 7 only prepares touched copy for future i18n.
- Full technical unification of engine/DB/domain weapon analysis for all 29 weapons is not Phase 7. Phase 7 aligns presentation visually and keeps technical support honest.

</deferred>

---

*Phase: 7-Premium Visual UI UX*
*Context gathered: 2026-05-06T22:27:17.9987074-03:00*
