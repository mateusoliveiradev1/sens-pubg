# SDD Compliance Closure Gate - 2026-04-16

Status: **starter tecnico fechado; gate executavel de evidencia SDD agora esta PASS**.

Este documento substitui a leitura operacional de "CI verde = 100% SDD". O SDD exige benchmark real estratificado, patch atual, labels confiaveis, calibracao e validacao especialista. O repositorio agora separa esses niveis em comandos diferentes.

## Evidencia ja fechada

| Area | Resultado |
|---|---|
| CI remoto em `main` | PASS em `https://github.com/mateusoliveiradev1/sens-pubg/actions/runs/24490072935` |
| Starter captured gate | PASS com 5 clips capturados, 2 armas, 1 diagnostico esperado e 1 golden |
| Benchmark capturado | PASS em tracking, diagnostico e coach para os 5 clips atuais |
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
| Current PUBG patch captured clips (41.1) | 1 | 1 | PASS |
| Distinct captured optics | 2 | 2 | PASS |
| Clean captured clips | 3 | 1 | PASS |
| Degraded captured clips | 2 | 1 | PASS |
| Specialist-reviewed golden clips | 1 | 1 | PASS |

## Veredito

Para o gate executavel que o repositorio materializa hoje, agora e correto declarar o SDD como fechado.

O que esta fechado:

- fluxo de desenvolvimento, build, testes, benchmark starter e CI;
- contrato de dominio patch-aware no codigo;
- separacao entre gate tecnico minimo e gate de evidencia SDD;
- rastreabilidade de procedencia para reviews do benchmark.
- cobertura minima de patch atual `41.1` no corpus capturado;
- cobertura minima de optic/optic state distinto no corpus capturado.

O que continua recomendado, mas nao bloqueia mais este gate:

- ampliar o corpus real para cobrir melhor os buckets de arma, optic, distancia, qualidade, oclusao e compressao;
- medir calibracao/agreement em corpus maior antes de qualquer promessa forte de confiabilidade.

## Auditoria dos fixtures existentes

Em 2026-04-16 foi feita a auditoria do corpus capturado em `tests/fixtures/captured-clips`, primeiro com os quatro clips originais e depois com a promocao do `clip5`.

Resultado:

- o melhor candidato existente para fechar o gap de `specialist-reviewed` foi `captured-clip1-2026-04-14`, e essa aprovacao ja foi registrada no decision set.
- o novo `captured-clip5-2026-04-16` fechou honestamente os gaps de patch atual `41.1` e de optic/optic state distinto com `opticId: 2x` e `stateId: 2x`.

Evidencia usada:

- `tests/fixtures/captured-clips/labels.todo.v1.json` agora registra `captured-clip5-2026-04-16` com `patchVersion: 41.1`, `weaponId: aug`, `distanceMeters: 10`, `opticId: 2x`, `stateId: 2x`, `muzzle: muzzle_brake` e `grip: tilted`;
- `tests/goldens/benchmark/captured-benchmark-draft.json` agora confirma que o golden `captured-clip1-2026-04-14` ficou com `reviewProvenance.source = specialist-reviewed`;
- `tests/goldens/benchmark/captured-benchmark-draft.json` tambem confirma a promocao de `captured-clip5-2026-04-16` como clip capturado `reviewed` e `visibilityTier: clean`;
- os arquivos de video locais `clip1.mp4` a `clip4.mp4` ja existiam no workspace em fevereiro de 2026, e `clip5.mp4` entrou em 2026-04-16 para fechar o slot de evidencia restante;
- o detector atual de optic state (`src/core/optic-state-detection.ts`) ainda e somente hint-based e nao fornece evidencia visual independente para reclassificar optic/state.

Conclusao operacional:

- um fixture existente conseguiu fechar o gap de provenance especialista;
- o corpus agora tambem possui o clip novo necessario para fechar patch atual e optic distinto;
- `npm run validate:sdd-coverage` passou integralmente em 2026-04-16.

## Proximo fechamento recomendado

Pacotes e acoes que continuam mais valiosos depois do fechamento do gate:

- `docs/captured-specialist-review-kit-2026-04-16.md` consolidou o caso do `captured-clip1-2026-04-14`, mostrou os assets de evidencia e serviu de base para registrar a aprovacao especialista no `review-decisions.todo.v1.json`.

1. adicionar mais clips reais em outros buckets de distancia e optic para reduzir dependencia de um unico exemplar `41.1`;
2. promover pelo menos mais um golden capturado com provenance especialista;
3. elevar o gate com metricas quantitativas do SDD: ECE, agreement, macro-F1 e erro espacial/temporal.
