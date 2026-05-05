# Phase 1: Measurement Truth Contract - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 1-Measurement Truth Contract
**Areas discussed:** Score de spray mastery, Regras de confianca / evidencia fraca, Linguagem das recomendacoes, Dashboard da verdade, Redesign da tela de analise, Loop da dashboard, Contrato dos programas completos, Taxonomia final de estados

---

## Score de spray mastery

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Meaning of score | Acao confiavel; Desempenho puro; Indice misto | Acao confiavel |
| Decomposition | 4 pilares visiveis; Mecanica primeiro; Nota simples | 4 pilares visiveis |
| Weak evidence behavior | Teto por evidencia; Score alto com aviso; Sem score | Teto por evidencia |
| Labels | Acao; Performance; Nivel | Acao + nivel secundario |
| Mechanical level basis | So mecanica; Nota final; Dois niveis | So mecanica |
| Formula visibility | Resumo simples; Formula visivel; So texto | Resumo simples |
| Evidence cap display | Potencial mecanico + score confiavel; So score; Aviso | Potencial mecanico + score confiavel |
| High label conservatism | Conservador; Balanceado; Motivacional | Conservador |

**User's choice:** Score should represent reliable action, expose four pillars, cap actionability when evidence is weak, and use action labels plus mechanical levels.
**Notes:** `Elite` and `Pronto` should be hard to earn. Mechanical level describes the analyzed spray, not the whole player.

---

## Regras de confianca / evidencia fraca

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Weak evidence posture | Block strong decision; Light hypothesis; User decides | Block strong decision |
| Minimum testable gate | >=60%; >=70%; Per metric | >=60% baseline |
| Moderate evidence behavior | Test protocol; Small change; Almost strong | Test protocol |
| Ready/apply threshold | Strong + compatible repetition; One great clip; Never in Phase 1 | Strong + compatible repetition |

**User's choice:** Weak evidence blocks strong decisions. Moderate evidence creates a test protocol. Ready/apply needs strong evidence plus repeat compatible clips.
**Notes:** Existing engine threshold around 0.6 should be respected as the base, with stricter gates allowed for sensitive metrics.

---

## Linguagem das recomendacoes

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Sens/VSM recommendation language | Test protocol; Direct with caveat; Technical hypothesis | Test protocol |
| Recommendation structure | Diagnostico -> treino -> meta -> validacao; Problem -> sens; Coach narrative | Diagnostico -> treino -> meta -> validacao |
| Detail level | Short executable block; Long training; Summary + future program | Short executable block |
| Confident tone | Firm but testable; Absolute; Always cautious | Firm but testable |

**User's choice:** Recommendations must feel premium and valuable, but remain validatable rather than absolute.
**Notes:** The user wants "perfect" quality internally. The external product promise should be "best protocol to test now with this evidence", not guaranteed perfection.

---

## Dashboard da verdade

| Question | Options considered | Selected |
|----------|--------------------|----------|
| First verdict after analysis | Action first; Score first; Diagnosis first | Action first |
| Visual direction for dashboard | Training cockpit; Professional report; Guided coach app | Training cockpit |
| Dashboard primary focus | Next training step; Overall progress; Last analysis | Next training step |
| Information density | Executive summary + layers; All cards; Guided mode | Executive summary + layers |

**User's choice:** `/dashboard` should be a premium training cockpit / player evolution center. The analysis result screen is a separate clip-specific report/coach.
**Notes:** User clarified that screenshots of analysis result are not the dashboard. The current dashboard direction is closer, but should become more action-driven.

---

## Redesign da tela de analise

| Question | Options considered | Selected |
|----------|--------------------|----------|
| First fold | Verdict + next block; Technical summary; Spray visualization | Verdict + next block |
| Organization | Narrative flow; Tabs; Cards by engine | Narrative flow |
| Technical evidence role | Secondary audit proof; Side by side; Expand only | Secondary audit proof |
| Visual feel | Premium/clean/decisive; Technical/sport; Coach motivational | Premium/clean/decisive |

**User's choice:** The analysis result should lead with verdict and next block, then evidence and visuals as proof.
**Notes:** The user strongly dislikes the current analysis presentation; this should guide planning for layout and copy hierarchy.

---

## Loop da dashboard

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Habit loop | Train -> record clip -> validate -> adjust; Weekly progress; Weapon/focus chooser | Train -> record clip -> validate -> adjust |
| Next action priority | Continue current protocol; Analyze new clip; Fix biggest weakness | Continue current protocol |
| Progress display | Trend + evidence; Score history; Goals/streaks | Trend + evidence + real gamification |
| Arsenal role | Contextual focus; Strong own section; Secondary | Contextual focus |

**User's choice:** Dashboard should create the loop of training, recording, validating, and adjusting. Gamification is valuable only when tied to real training behavior and evidence.
**Notes:** User asked how this fits monetization. Deferred: free should not be unlimited; Pro value should be limits plus history, trends, deep coach, protocols, and future programs.

---

## Contrato dos programas completos

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Phase 1 preparation | Structured blocks; Full program model now; Open text | Structured blocks |
| Future organization | Objective; Weapon; Level | Objective + weapon/level filters |
| Next training selection | Biggest validated blocker; User objective; Hybrid | Hybrid |
| Anti-weak-plan rules | No unvalidated progress; No generic training; Both | Both |

**User's choice:** Phase 1 prepares blocks; future programs must be excellent and specific about how, what, where, and how to validate.
**Notes:** User asked about UGC/offical maps as possible training locations. This is deferred for product/legal research.

---

## Taxonomia final de estados

| Question | Options considered | Selected |
|----------|--------------------|----------|
| Main state names | Capturar de novo / Incerto / Testavel / Pronto; Fraco/Medio/Bom/Excelente; Sem leitura/Hipotese/Plano/Validado | Capturar de novo / Incerto / Testavel / Pronto |
| Mechanical levels | Inicial/Intermediario/Avancado/Elite; Base/Controle/Dominio/Elite; Bronze/Prata/Ouro/Elite | Inicial/Intermediario/Avancado/Elite |
| Technical diagnosis names | Friendly first; Technical + translation; Friendly only | Friendly first |
| State copy tone | Direct premium; Motivational; Technical | Direct premium |

**User's choice:** Use direct premium action states, mechanical levels, and friendly Portuguese diagnosis names.
**Notes:** Internal technical terms can remain in code/tests/debug, but the user-facing product should not lead with `underpull`, `overpull`, etc.

---

## the agent's Discretion

- Implementation details remain open to the planner/researcher as long as the truth contract, browser-first path, and benchmark/test requirements are preserved.

## Deferred Ideas

- Complete training programs with progression, validation, and physical preparation/musculacao.
- Freemium/Pro limits and fair-use model; free should not have infinite clips.
- Original legal-safe SVG/silhouette weapon asset pack.
- Research Training Mode, official maps, UGC/custom maps, and legal-safe "where to train" references.
- Broader user-facing diagnosis copy sweep.
