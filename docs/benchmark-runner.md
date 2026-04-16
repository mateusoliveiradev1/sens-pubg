# Benchmark Runner

## Goal

Executar tracking, diagnostico e coach em um unico comando e comparar o resultado com um baseline versionado.

## Command

```bash
npm run benchmark
```

O script atual roda contra `tests/goldens/benchmark/synthetic-benchmark.v1.json` e compara contra `tests/goldens/benchmark/synthetic-benchmark.baseline.json`.

## Output

O runner imprime um JSON com:

- `summary`: total de clips, falhas, score agregado e metricas de tracking
- `summary.tracking.confidenceCalibration`: amostra, confianca media, taxa observada de frames visiveis e Brier score
- `sourceBreakdown`: o mesmo resumo agregado separado por `synthetic`, `captured` e `augmented`
- `clips`: resultado por clip para tracking, diagnostico e coach
- `regression`: delta contra o baseline e flag `isRegression`

## Dataset Contract

- o dataset segue `docs/dataset-spec.md`
- clips sinteticos podem usar `fixtures.*Path` para apontar para harnesses locais
- clips capturados de verdade continuam usando o mesmo contrato base, sem depender dos fixtures sinteticos

## Current Status

- o runner local ja cobre a regressao estrutural do pipeline com fixtures sinteticos
- o relatorio ja separa resultados por origem para evitar misturar clips sinteticos e capturados
- o relatorio expoe calibracao de confianca do tracking por Brier score e expected calibration error
- o starter pack capturado roda com `npx tsx scripts/run-benchmark.ts tests/goldens/benchmark/captured-benchmark-draft.json`
- `captured-benchmark-draft` cobre 4 clips reais: 2 clean, 2 degraded, todos com frame labels minimos para regressao local
- novos clips capturados devem seguir `docs/video-benchmark-spec.md` antes de entrar no dataset
