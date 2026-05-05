# Requirements: Sens PUBG

**Defined:** 2026-05-05
**Core Value:** Players pay only if the product helps them improve spray control through evidence-backed clip analysis, honest confidence, and a clear next-block coach plan.

## v1 Requirements

### Precision

- [x] **PREC-01**: User can see a practical "spray mastery" score based on measured control, consistency, confidence, and clip quality.
- [x] **PREC-02**: User can see confidence, coverage, visible frames, lost frames, and inconclusive states for every analysis result.
- [x] **PREC-03**: User can compare a current clip against prior clips using stable metrics instead of only one-off diagnosis text.
- [x] **PREC-04**: System can block or downgrade recommendations when clip evidence is too weak.

### Benchmark

- [x] **BENCH-01**: Maintainer can run a benchmark gate that covers tracking, diagnosis, coach tier, primary focus, and next-block protocol.
- [x] **BENCH-02**: Maintainer can add labeled real clips with patch, weapon, optic, attachments, distance, and expected diagnosis/coach outcomes.
- [x] **BENCH-03**: System can report regression against baseline before release.

### Coach

- [ ] **COACH-01**: User receives one primary focus, up to two secondary focuses, and one next-block protocol after each usable analysis.
- [ ] **COACH-02**: Coach plan uses diagnostics, sensitivity, clip quality, context, and history before choosing a recommendation.
- [ ] **COACH-03**: User can record whether a coach protocol was accepted, completed, improved, failed, or inconclusive.
- [ ] **COACH-04**: Coach memory can use prior compatible clips and outcomes to adjust priority and confidence.
- [ ] **COACH-05**: Optional LLM rewrite cannot alter tier, priority order, scores, attachments, thresholds, or technical facts.

### Product Analytics

- [ ] **ANALYT-01**: System records activation when a user completes a first usable analysis.
- [ ] **ANALYT-02**: System records upgrade-intent events when users hit analysis limits or attempt premium history/coach features.
- [ ] **ANALYT-03**: Admin can inspect high-level funnel metrics without exposing local secrets.

### Monetization

- [ ] **MON-01**: User can use a free tier with limited analyses and basic coach output.
- [ ] **MON-02**: User can subscribe to Pro monthly for higher analysis limits, full coach plan, history trends, and advanced metrics.
- [ ] **MON-03**: Server can sync subscription status into existing entitlement/access checks.
- [ ] **MON-04**: System does not make PUBG API-derived data an exclusive paid feature.
- [ ] **MON-05**: Pricing and paywall copy clearly say the product is independent from PUBG/KRAFTON and does not guarantee rank or perfect sensitivity.

### Expansion

- [ ] **TEAM-01**: Coach/team user can review multiple player reports in a team-oriented workflow after solo Pro is validated.
- [ ] **TEAM-02**: User can share/export a premium analysis report without exposing private account data.

## v2 Requirements

### Monetization

- **MONV2-01**: User can buy credits for one-off premium/manual/LLM-heavy reviews.
- **MONV2-02**: Team owner can manage seats and player report access.
- **MONV2-03**: Creator/coach partner can receive a referral or affiliate attribution.

### Product

- **PRODV2-01**: System can support structured seasonal programs and missions for spray mastery.
- **PRODV2-02**: System can integrate PUBG API context safely as non-exclusive supporting data.
- **PRODV2-03**: System can internationalize the paid funnel beyond pt-BR.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time in-game overlay | High risk, not needed for first paid value |
| Guaranteed perfect sensitivity | Not supportable; product must remain evidence/confidence based |
| Exclusive paywall for PUBG API data | PUBG developer monetization policy risk |
| Backend-only video analysis | Current strength is browser-first and backend ffmpeg readiness is not solved |
| Native mobile app | Web-first monetization is enough for this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PREC-01 | Phase 1 | Complete |
| PREC-02 | Phase 1 | Complete |
| PREC-03 | Phase 3 | Complete |
| PREC-04 | Phase 1 | Complete |
| BENCH-01 | Phase 2 | Complete |
| BENCH-02 | Phase 2 | Complete |
| BENCH-03 | Phase 2 | Complete |
| COACH-01 | Phase 4 | Pending |
| COACH-02 | Phase 4 | Pending |
| COACH-03 | Phase 4 | Pending |
| COACH-04 | Phase 4 | Pending |
| COACH-05 | Phase 4 | Pending |
| ANALYT-01 | Phase 5 | Pending |
| ANALYT-02 | Phase 5 | Pending |
| ANALYT-03 | Phase 7 | Pending |
| MON-01 | Phase 5 | Pending |
| MON-02 | Phase 5 | Pending |
| MON-03 | Phase 5 | Pending |
| MON-04 | Phase 5 | Pending |
| MON-05 | Phase 5 | Pending |
| TEAM-01 | Phase 6 | Pending |
| TEAM-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-05-05*
*Last updated: 2026-05-05 after Phase 3 multi-clip precision loop*
