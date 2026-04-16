# SDD Compliance Closure Gate - 2026-04-16

Status: **starter tecnico fechado; SDD completo ainda bloqueado por evidencia externa**.

Este documento substitui a leitura operacional de "CI verde = 100% SDD". O SDD exige benchmark real estratificado, patch atual, labels confiaveis, calibracao e validacao especialista. O repositorio agora separa esses niveis em comandos diferentes.

## Evidencia ja fechada

| Area | Resultado |
|---|---|
| CI remoto em `main` | PASS em `https://github.com/mateusoliveiradev1/sens-pubg/actions/runs/24490072935` |
| Starter captured gate | PASS com 4 clips capturados, 2 armas, 1 diagnostico esperado e 1 golden |
| Benchmark capturado | PASS em tracking, diagnostico e coach para os 4 clips atuais |
| Patch catalog | Catalogo local aponta para patch atual `41.1`, publicado em 2026-04-08 pela fonte oficial PUBG |
| Proveniencia de review | `reviewProvenance` agora distingue `codex-assisted`, `machine-assisted`, `human-reviewed` e `specialist-reviewed` |

## Gate SDD executavel

Comando:

```bash
npm run validate:sdd-coverage
```

Resultado atual:

| Requirement | Actual | Required | Status |
|---|---:|---:|---|
| Current PUBG patch captured clips (41.1) | 0 | 1 | FAIL |
| Distinct captured optics | 1 | 2 | FAIL |
| Clean captured clips | 2 | 1 | PASS |
| Degraded captured clips | 2 | 1 | PASS |
| Specialist-reviewed golden clips | 0 | 1 | FAIL |

## Veredito

Nao e correto declarar o SDD como 100% fechado ainda.

O que esta fechado:

- fluxo de desenvolvimento, build, testes, benchmark starter e CI;
- contrato de dominio patch-aware no codigo;
- separacao entre gate tecnico minimo e gate de evidencia SDD;
- rastreabilidade de procedencia para reviews do benchmark.

O que ainda falta para "100% SDD":

- pelo menos 1 clip capturado no patch atual `41.1`;
- pelo menos 1 optic/optic state capturado adicional alem de `red-dot-sight:1x`;
- pelo menos 1 golden com `reviewProvenance.source=specialist-reviewed`;
- ampliar o corpus real para cobrir melhor os buckets de arma, optic, distancia, qualidade, oclusao e compressao;
- medir calibracao/agreement em corpus maior antes de qualquer promessa forte de confiabilidade.

## Proximo fechamento recomendado

1. Capturar ou importar um clip real no patch `41.1`, idealmente com Hybrid Scope ou outro optic state diferente do red dot.
2. Passar esse clip pelo labeling kit e por revisao especialista.
3. Promover o clip aprovado com `reviewProvenance.source=specialist-reviewed`.
4. Rodar `npm run validate:sdd-coverage`; so quando passar, ele pode virar pre-condicao para release.
5. Depois disso, elevar o gate com metricas quantitativas do SDD: ECE, agreement, macro-F1 e erro espacial/temporal.
