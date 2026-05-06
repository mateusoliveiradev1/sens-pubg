# Phase 6: Core Accuracy And Pro Validation Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-06T16:01:41.8903299-03:00
**Phase:** 06-Core Accuracy And Pro Validation Hardening
**Areas discussed:** Corpus real/pro e permissao, Prioridade do hardening do engine, Calibracao de confianca e comportamento inconclusivo, Gates comerciais e claims de lancamento

---

## Corpus real/pro e permissao

| Question | Options considered | User's choice |
|----------|--------------------|---------------|
| Qual deve ser a fonte inicial prioritaria do corpus de validacao? | Clips permissionados; corpus interno controlado; misto; outro | Clips permissionados de beta, amigos e players reais, com o padrao mais polido possivel. |
| Qual nivel de permissao/proveniencia exigir? | Consentimento formal por clip; permissao beta leve/golden formal; so uso interno | Consentimento formal por clip. |
| Qual metadata deve ser obrigatoria? | Metadata completa competitiva; metadata minima com bloqueio de golden; dois niveis | Metadata completa competitiva. |
| Quando um clip pode virar golden/commercial benchmark? | Promocao em duas camadas; revisao especialista unica; quorum forte | Promocao em duas camadas. |
| Como tratar clips de streamers/pros conhecidos? | Referencia qualitativa apenas salvo permissao; outreach primeiro; fora do corpus | Referencia qualitativa apenas salvo permissao formal. |
| Qual deve ser o estado de review? | Workflow completo; estados essenciais; estados + bloqueios automaticos | Workflow completo de estados. |
| Como tratar armazenamento, privacidade e redistribuicao? | Raw privado/derivados controlados; raw interno sem frames; permissao granular | Raw privado, derivados controlados. |
| Como lidar com retirada de permissao? | Retirada prospectiva com quarentena/rebaseline; hard delete; consentimento golden forte | Retirada prospectiva com quarentena e rebaseline. |

**Notes:** The user repeatedly emphasized "mais polido possivel" and "perfeicao". This was captured as traceability, consent, review rigor, privacy, and defensible golden promotion.

---

## Prioridade do hardening do engine

| Question | Options considered | User's choice |
|----------|--------------------|---------------|
| Qual deve ser a estrategia de ataque do hardening? | Ondas por risco comercial; tudo por componente tecnico; benchmark primeiro | Ondas por risco comercial with maximum polish. |
| Qual deve ser a primeira onda obrigatoria? | Janela/validade do spray; tracking/recoil; qualidade/captura | Wave 1 = janela e validade do spray primeiro. |
| Quando o clip falha na validade? | Bloqueio com recaptura guiada; resultado parcial; dois niveis | Bloqueio polido com recaptura guiada. |
| Depois da Wave 1, qual deve ser Wave 2? | Tracking/recoil com separacao de camera; diagnostico/metricas; corpus/benchmark | Tracking/recoil com separacao de camera. |
| Qual e a regra para camera/flick/cut? | Separar/descontar agressivamente; tolerar; bloquear qualquer ocorrencia forte | Separar e descontar agressivamente. |
| Como tratar metrica, diagnostico, sens e coach depois do tracking? | Recalibrar em cadeia; tracking isolado; engine paralela | Recalibrar em cadeia. |
| Como versionar a mudanca? | Engine contract versionado; atualizar tudo; changelog apenas | Engine contract versionado. |

**Notes:** User wants the spray analysis itself to be as perfect and polished as practical for a real product. The discussion locked that invalid clips should not be force-analyzed and that downstream decisions must recalibrate after tracking/window changes.

---

## Calibracao de confianca e comportamento inconclusivo

| Question | Options considered | User's choice |
|----------|--------------------|---------------|
| Qual postura de confianca o produto deve ter? | Conservador premium; confiante com aviso; ultra restritivo | Conservador premium. |
| Quais acoes bloquear com confianca insuficiente? | Bloquear decisoes fortes/manter ajuda segura; bloquear tudo; coach fraco com aviso | Bloquear decisoes fortes, manter ajuda segura. |
| Qual evidencia minima libera tom mais firme? | Barra composta; thresholds tecnicos; revisor/corpus obrigatorio | Barra composta. |
| Como exibir inconclusivo? | Protecao de verdade; erro recuperavel; discreto | Inconclusivo como protecao de verdade. |
| Como calibrar contra revisores/corpus? | Calibration report; threshold tuning; revisao qualitativa | Calibration report obrigatorio. |
| Quais niveis de saida usar? | Escada explicita; confianca numerica + labels atuais; tres niveis | Escada de decisao explicita. |
| O que cada nivel deve liberar? | Permissoes rigidas por nivel; flexiveis por blocker; planner decide matriz | Permissoes por nivel rigidas. |
| Como tratar quota em bloqueado/inconclusivo? | So resultado util conta; tudo processado conta; Free/Pro diferenciado | So resultado util conta quota. |

**Notes:** The user wants inconclusive behavior to feel polished, not broken. The locked direction is explicit decision levels with a rigid permission matrix.

---

## Gates comerciais e claims de lancamento

| Question | Options considered | User's choice |
|----------|--------------------|---------------|
| O que precisa existir antes de claim publico forte? | Commercial truth gate completo; benchmark + copy; corpus/calibration primeiro | Commercial truth gate completo. |
| Quais claims ficam permitidos se gate passar? | Fortes mas honestos; conservadores; agressivos | Claims fortes, mas ainda honestos. |
| Qual gate de regressao obrigatorio? | Gate comercial multicamada; gates padrao; gate so antes de launch | Gate comercial multicamada. |
| Se algum gate falhar, qual status? | No False Done rigido; delivered com known issues; planner decide | No False Done rigido. |
| Como registrar evidencia final? | Evidence matrix; resumo final; relatorio so benchmarks | Evidence matrix obrigatoria. |

**Notes:** Phase 6 cannot be marked delivered if a mandatory commercial gate fails or cannot run. Stronger public copy is allowed only when the full commercial truth gate passes, and remains bounded by honesty/no-guarantee rules.

## the agent's Discretion

- Exact module boundaries, schema names, enum names, thresholds, report filenames, calibration implementation, artifact layout, and plan wave count.
- Planner/researcher may choose how to stage implementation, as long as all locked decisions from CONTEXT.md remain visible in the plans.

## Deferred Ideas

None - discussion stayed within phase scope.
