# Benchmark Runner

## Goal

Executar tracking, diagnostico, coach e contrato de verdade em um unico comando e comparar o resultado com um baseline versionado.

## Command

```bash
npm run benchmark
npm run benchmark:release
npm run benchmark:update-baseline -- --dataset synthetic --reason "..." --affected-clips "..." --honesty-rationale "..."
```

O script atual roda contra `tests/goldens/benchmark/synthetic-benchmark.v1.json` e compara contra `tests/goldens/benchmark/synthetic-benchmark.baseline.json`.

`benchmark:gate` continua sendo o gate rapido de iteracao diaria. `benchmark:release` e o gate estrito para releases importantes e claims comerciais: ele roda synthetic + captured com baselines, valida SDD coverage, bloqueia regressao e escreve reports em `docs/benchmark-reports/`.

`benchmark:release` tambem e o strict commercial truth gate. Ele nao substitui o gate rapido: ele adiciona evidencia de corpus permissionado, calibracao, seguranca de handoff e prontidao comercial antes de qualquer claim publico forte.

Veja `docs/commercial-accuracy-readiness.md` para o rubric de No False Done, claims permitidos, claims proibidos e blockers restantes antes de copy publica forte.

## Output

O runner imprime um JSON com:

- `summary`: total de clips, falhas, score agregado e metricas de tracking
- `summary.tracking.confidenceCalibration`: amostra, confianca media, taxa observada de frames visiveis e Brier score
- `summary.truth`: clips que preservaram o contrato de decisao, evidencia e protocolo
- `sourceBreakdown`: o mesmo resumo agregado separado por `synthetic`, `captured` e `augmented`
- `clips`: resultado por clip para tracking, diagnostico, coach e truth
- `regression`: delta contra o baseline e flag `isRegression`
- `calibration`: status do report de calibracao comercial, gaps, cobertura de corpus permissionado, overconfidence, underconfidence, inconclusive correctness, blocker accuracy, sensitivity safety e coach handoff safety

## Dataset Contract

- o dataset segue `docs/dataset-spec.md`
- clips sinteticos podem usar `fixtures.*Path` para apontar para harnesses locais
- clips capturados de verdade continuam usando o mesmo contrato base, sem depender dos fixtures sinteticos
- `labels.expectedTruth` guarda enums internos estaveis, nao copy de UI em portugues
- `labels.expectedCalibration` pode declarar expected decision level, blocker reasons esperados, reviewer correctness, predicted confidence e elegibilidade permissionada/comercial para calibracao
- `expectedTruth.actionState` aceita `capture_again`, `inconclusive`, `testable` e `ready`
- `expectedTruth.evidenceTier` aceita `weak`, `moderate` e `strong`
- `expectedTruth.weakEvidenceDowngrade=true` so pode passar com `capture_again` ou `inconclusive`
- `expectedTruth.primaryFocusArea` precisa bater exatamente; `secondaryFocusAreas` e validado como conjunto sem depender de ordem
- `expectedTruth.nextBlock` valida estrutura do protocolo: tier, chave, titulo, duracao, exercicio ou primeiro passo, alvo, cobertura/confianca minima, criterio de sucesso, criterio de falha e marcador de validacao do proximo clip
- quando o comportamento correto e recusar uma decisao forte, `capture_again` ou `inconclusive` e um resultado esperado valido e pode passar no benchmark
- baselines ficam em `tests/goldens/benchmark` ao lado dos datasets
- atualizacao de baseline exige comando explicito com `--reason`, `--affected-clips` e `--honesty-rationale`

## Calibration Gate

O report de calibracao compara confianca prevista contra corretude de reviewer/golden quando essa evidencia existe. As dimensoes obrigatorias sao:

- overconfidence: confianca alta em leitura incorreta; o limite do release e <= 0.15 em clips reviewed/golden permissionados e comercialmente elegiveis
- underconfidence: confianca baixa em leitura correta; reportado para evitar que o produto fique conservador demais sem motivo
- inconclusive correctness: recusas, `capture_again` e leituras parciais devem bater com a expectativa revisada quando a evidencia e fraca
- blocker accuracy: blocker esperado precisa aparecer no resultado; falso negativo deve ficar <= 0.1
- sensitivity safety: nenhum clip abaixo de `strong_analysis` pode liberar handoff `apply_ready`
- coach handoff safety: nenhum clip abaixo de `strong_analysis` pode liberar `apply_protocol`

Se nao houver clip reviewed/golden com permissao e elegibilidade de commercial benchmark, o release fica `PARTIAL`: o comando ainda gera o report, mas a prontidao comercial nao esta completa. Strong public precision claims exigem release benchmark, permissioned corpus, reviewed/golden evidence, calibration, copy-safety, inconclusive correctness e human review.

## Current Status

- o runner local ja cobre a regressao estrutural do pipeline com fixtures sinteticos
- o relatorio ja separa resultados por origem para evitar misturar clips sinteticos e capturados
- o relatorio expoe calibracao de confianca do tracking por Brier score e expected calibration error
- o release report inclui uma secao `## Calibration` e marca corpus placeholder/internal-only como readiness parcial em vez de passar como evidencia comercial completa
- o relatorio expoe mismatches de truth por campo para explicar qual parte do contrato regrediu
- `benchmark:release` gera report datado e atualiza `docs/benchmark-reports/latest.md`
- `benchmark:update-baseline` nunca roda implicitamente a partir do release gate
- o starter pack capturado roda com `npx tsx scripts/run-benchmark.ts tests/goldens/benchmark/captured-benchmark-draft.json`
- `captured-benchmark-draft` cobre 5 clips reais, separados por qualidade, maturidade de review e origem de evidencia
- novos clips capturados devem seguir `docs/video-benchmark-spec.md` antes de entrar no dataset
