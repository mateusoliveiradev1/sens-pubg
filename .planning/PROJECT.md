# Sens PUBG

## What This Is

Sens PUBG is a live PUBG spray analysis product for players who want measurable improvement, not generic aim advice. The app analyzes short spray clips locally in the browser, reports tracking quality and recoil/sensitivity signals, then turns that evidence into a coach plan the player can test in the next training block.

The next milestone is not a greenfield launch. It is a product-hardening and monetization milestone: make spray analysis more accurate, make the coach more useful, and prepare a paid product that can serve competitive players, dedicated casuals, and teams/coaches without overpromising certainty.

## Core Value

Players pay only if the product helps them improve spray control through evidence-backed clip analysis, honest confidence, and a clear next-block coach plan.

## Requirements

### Validated

- Sens PUBG already provides browser-first video analysis with Web Workers and no required server-side video processing.
- The product already reports clip quality, tracking transparency, diagnostics, sensitivity guidance, history, and Coach Extremo.
- Coach Extremo already separates deterministic coach planning from optional LLM copy rewrite.
- The codebase already includes golden/benchmark fixtures for tracking, diagnostics, coach, and captured clips.
- Community publishing, profiles, moderation, admin, and entitlement scaffolding already exist.
- The project is linked to Vercel and has release/readiness scripts for local, deployed, and backend checks.
- Phase 3 adds strict compatible precision trends, persisted evolution lines/checkpoints, visible blocker reasons, history audit timelines, and dashboard principal trend actions for repeat-clip improvement evidence.
- Phase 4 adds an adaptive coach loop with persisted protocol outcomes, outcome-aware memory, lower aggressiveness under conflict/weak evidence, post-analysis/dashboard/history loop surfaces, and copy-only LLM guardrails.

### Active

- [ ] Improve spray analysis precision with measurable tracking, metric, and benchmark targets.
- [ ] Define "perfection" as practical accuracy, confidence honesty, and repeatable improvement, not impossible certainty.
- [ ] Create a monetization model around original value: user clip analysis, coach plans, history, programs, and team workflows.
- [ ] Launch a freemium monthly path first, with future room for credits and team/community plans.
- [ ] Protect commercial risk by not paywalling PUBG API-derived data as an exclusive feature.
- [ ] Build product analytics around activation, upgrade intent, retention, and paid value.

### Out of Scope

- Backend-heavy video processing as the main path until ffmpeg/runtime/deploy constraints are resolved.
- Claiming a perfect or definitive sensitivity value; recommendations must remain ranges/protocols until validated by repeat clips.
- Selling exclusive access to PUBG API-derived data or official PUBG assets without complying with PUBG developer/trademark rules.
- Real-time in-game coaching or overlays.
- Mobile native app in this milestone.
- Broad multi-game aim trainer scope before PUBG spray mastery is strong enough to sell.

## Context

The current product is already unusually strong for an early commercial tool: it has deterministic analysis, confidence-aware coaching, optional LLM copy rewriting, release gates, and a community surface. The strongest business direction is not to compete head-on with generic aim trainers. It is to own a narrower promise: "upload your PUBG spray clip and get a measurable, testable training decision."

User direction for this milestone:

- Priority 1 is both precision and coach quality.
- The target customer set can include competitive serious players, dedicated casual players, and teams/coaches, but the first paid wedge should be one clear solo-player subscription.
- Initial monetization preference is freemium monthly, with deeper research before locking price and limits.

Research summary:

- PUBG still has meaningful PC demand and KRAFTON continues to invest in PUBG as a franchise/content platform.
- Aim products monetize advanced metrics, training plans, sensitivity tools, AI coach, community, and progression.
- Freemium works only when activation is fast, provider costs are controlled, and upgrade gates are tied to moments of value.
- PUBG API and trademark policy make it important to monetize original analysis/coach value rather than gated official data.

## Constraints

- **Accuracy**: Every coach recommendation must be backed by measured evidence, confidence, and enough clip quality to support the decision.
- **Commercial claims**: Copy must avoid "perfect sens" or guaranteed rank improvement unless supported by benchmark/outcome data.
- **PUBG policy**: If PUBG API data is used, do not make API-derived features exclusive paid access.
- **Architecture**: Preserve the browser-first analysis path; avoid server video compute as a dependency for the core paid product.
- **Testing**: Analysis engine work needs unit/integration tests plus golden/benchmark gates.
- **Cost**: Free tier must not create uncontrolled LLM, storage, or support costs.
- **Market focus**: Serve all three customer groups over time, but launch monetization with a single strong wedge.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat this as brownfield product hardening, not greenfield creation | The repo already has analysis, coach, community, tests, and deploy scaffolding | Pending |
| Prioritize precision and coach together | Better tracking without coaching does not sell; better coach without evidence overpromises | Validated through Phases 3-4 |
| Start monetization with freemium monthly | It matches the user's preference and the product's habit-building training loop | Pending |
| Keep teams/coaches as expansion, not the first required buyer | Serving all customer types at once risks fuzzy positioning | Pending |
| Monetize original analysis/coach value, not gated PUBG API data | PUBG API terms restrict exclusive paid access based on API data | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

**After each milestone**:
1. Full review of all sections.
2. Core Value check: still the right priority?
3. Audit Out of Scope: reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-05-06 after Phase 4 adaptive coach loop*
