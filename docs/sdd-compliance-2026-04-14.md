# SDD Compliance Audit - Spray Analysis

Data: 2026-04-14  
Base: `docs/SDD-analise-spray.md` e `docs/SPRAY-ANALYSIS-EXECUTION-PLAN.md`  
Escopo: estado local do repositorio apos as tarefas de tracking, dominio, coach, UX e CI benchmark.

## Veredito curto

O projeto nao esta 100% conforme o SDD em criterio de confiabilidade real.

Estado atual: **release candidate tecnico / beta local condicionado**.

Motivo:

- O fluxo local agora passa em um pacote unico de release com `npm run verify:release`.
- O produto ja expoe patch, confianca, cobertura, distancia e estado optico.
- O benchmark existe e agora roda no CI com gate combinado de regressao + cobertura minima via `npm run benchmark:gate`.
- O starter pack capturado minimo agora tambem esta fechado com `4` clips, `2` armas, `1` diagnostico esperado e `1` clip promovido para `golden`.
- Playwright passa localmente, existe como gate explicito no CI e pode ser reaproveitado como smoke no deploy publicado.
- Ainda falta dataset real rotulado e estratificado, calibracao de confianca contra clips reais e validacao por especialista.

## Evidencia fresca desta auditoria

| Gate | Comando | Resultado |
|---|---|---|
| Unit/contract/integration | `npx vitest run` | PASS - 58 arquivos, 190 testes |
| Benchmark sintetico | `npm run benchmark` | PASS - 2 clips, score 100, sem regressao |
| Benchmark capturado | `npm run benchmark:captured` | PASS - 4 clips, `4/4` em tracking, diagnostico e coach |
| Coverage gate capturado | `npm run validate:benchmark-coverage` | PASS - starter gate `4/4`, `2/2`, `1/1`, `1/1` |
| Build | `npm run build` | PASS - build limpo, sem warning remanescente |
| E2E local | `npm run smoke:local` | PASS - 21 testes |
| Release pack local | `npm run verify:release` | PASS - typecheck, vitest, benchmark gate, build e smoke local |

## Matriz de conformidade

| Area SDD | Status | Evidencia local | Lacuna real |
|---|---|---|---|
| Build/test baseline estavel | PASS | `npm run verify:release` fecha typecheck, vitest, benchmark gate, build e smoke local | Nenhuma lacuna funcional imediata no repositorio local |
| Patch-aware domain | PARCIAL FORTE | Catalogos/testes de patch, optics, attachments e weapon patch profiles existem | Precisa manter patch atual sincronizado com fonte oficial quando o jogo mudar |
| Optics modernos | PARCIAL FORTE | Testes cobrem optic catalog, hybrid scope e estados opticos | Falta validacao externa continua contra patch atual do PUBG |
| Attachments modernos | PARCIAL FORTE | Testes cobrem availability e Angled/Tilted/slots por patch | Falta prova automatica contra fonte oficial atualizada |
| Tracking honesto | PARCIAL FORTE | Pipeline usa status/confianca/cobertura/frames perdidos; dashboard mostra esses dados | Ainda e baseline de CV, nao point tracker neural estado-da-arte |
| Oclusao e perda de frames | PASS LOCAL | Tracking golden cobre clean/degraded e status counts | Dataset ainda pequeno e sintetico |
| ROI/stabilization | PASS LOCAL | `src/core/roi-stabilization.ts` existe e `src/workers/aim-analyzer-session.test.ts` cobre lock estavel com ruido vermelho fora da ROI no caminho principal | Ainda falta cobertura empirica mais ampla com clips reais degradados |
| Projecao angular e distancia | PARCIAL FORTE | Modulos de projection/error math e UI de distancia existem | Precisa validar com clips reais e FOV/resolucao variados |
| Metricas por fase/residual | PARCIAL FORTE | Spray metrics tem fases, residual por shot e metric quality | Falta benchmark real por fase com labels humanos |
| Diagnostico confidence-aware | PARCIAL FORTE | Diagnostico tem `inconclusive`, evidence, confidence e goldens | Falta precision/recall/F1 em dataset real |
| Recomendacao de sens por objetivo | PARCIAL | Engine usa residual objective e reasoning com variaveis | Modelo ainda simplificado; falta otimizacao/calibracao quantitativa em clips reais |
| Coach evidence-linked | PASS LOCAL | Coach schema tem evidence, confidence, patch, guardrails e goldens | Falta avaliacao humana de qualidade do feedback |
| LLM guardrails | PASS LOCAL | Adapter opcional com fallback deterministic e testes | Falta teste com provider real, se for ativado em produto |
| Benchmark dataset | PARCIAL FORTE | Schema existe, dataset sintetico existe e draft capturado agora fecha o starter pack com 4 clips reais, 2 armas, 1 diagnostico esperado e 1 golden | Falta ampliar cobertura real alem do starter pack: mais armas, optics, distancias, degradacoes e revisao humana mais profunda |
| Benchmark em CI | PASS | `.github/workflows/ci.yml` executa `npm run benchmark:gate` | Falta observar primeira execucao remota no GitHub Actions |
| E2E em CI | PASS | `.github/workflows/ci.yml` instala Chromium e executa `npm run smoke:local` | Falta observar primeira execucao remota no GitHub Actions |
| UX honesta | PASS LOCAL | Copy contract remove claims fortes; dashboard mostra patch/confianca/cobertura | Precisa smoke com clip real anexado ao dataset |

## Bloqueadores para dizer "100% SDD"

1. Dataset real rotulado e mais amplo.
   O SDD pede clips estratificados por arma, patch, mira, distancia, qualidade, oclusao, compressao e labels. Hoje ja existe um draft capturado inicial, mas a cobertura real ainda e pequena.

2. Calibracao de confianca em corpus maior.
   O sistema agora ja expoe `brierScore` e `expectedCalibrationError`, mas ainda nao prova correlacao robusta entre confianca prevista e erro real em um conjunto capturado mais amplo.

3. Validacao por especialista.
   O SDD pede agreement com avaliacao especialista. Ainda nao existe processo nem fixture com label humano confiavel.

## Proximo passo recomendado

O proximo passo de maior retorno agora e **sair do starter pack minimo e entrar em validacao empirica mais ampla**.

Por que:

- O CI agora ja cobre unit, benchmark sintetico, benchmark capturado, build e Playwright.
- O CI agora protege explicitamente a cobertura minima do starter gate capturado.
- O starter gate capturado fechou com `npm run validate:benchmark-coverage` e o benchmark capturado passa com `npm run benchmark:captured`.
- O gargalo real deixou de ser automacao do corpus inicial e passou a ser validade externa e estratificacao mais profunda.
- O SDD continua pedindo benchmark real mais amplo, calibracao de confianca em corpus maior e validacao por especialista.
- O repositorio agora consegue regenerar todo o pacote de readiness capturado em um passo com `npm run captured:autopilot-pack`, preservando decisoes ja aprovadas e atualizando os relatórios depois da promocao.

Plano sugerido:

1. ampliar o corpus capturado para alem de `aug` e `beryl-m762`, cobrindo mais armas e optics;
2. adicionar novos clips reais em buckets ainda pouco representados de distancia/qualidade/oclusao;
3. substituir progressivamente labels proxy por revisao humana especializada nos clips mais importantes;
4. medir agreement humano e recalibrar confianca em um conjunto real maior.
