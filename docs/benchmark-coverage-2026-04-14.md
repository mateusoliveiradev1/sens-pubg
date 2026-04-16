# Benchmark Coverage 2026-04-14

Dataset: `captured-benchmark-draft`
Source: `tests/goldens/benchmark/captured-benchmark-draft.json`

## Snapshot

| Metric | Value |
|---|---:|
| Total clips | 4 |
| Clips com diagnostico esperado | 1 |
| Clips promovidos para golden | 1 |
| Benchmark captured pass rate | 4/4 |
| Tracking Brier score | 0.0776 |
| Tracking expected calibration error | 0.097 |

## Coverage

| Dimension | Count |
|---|---:|
| Source type captured | 4 |
| Review status golden | 1 |
| Review status reviewed | 3 |
| Tracking tier clean | 2 |
| Tracking tier degraded | 2 |
| Visibility tier clean | 2 |
| Visibility tier degraded | 2 |
| Occlusion light | 2 |
| Occlusion moderate | 2 |
| Compression light | 3 |
| Compression medium | 1 |
| Distance bucket 31-60m | 1 |
| Distance bucket 61-100m | 3 |

## Domain Diversity

| Dimension | Values |
|---|---|
| Weapons | aug, beryl-m762 |
| Optics | red-dot-sight:1x |
| Patch versions | 40.1 |

## Starter Gate

| Requirement | Actual | Required | Status |
|---|---:|---:|---|
| Captured clips | 4 | 4 | PASS |
| Distinct weapons | 2 | 2 | PASS |
| Captured clips with diagnoses | 1 | 1 | PASS |
| Captured golden clips | 1 | 1 | PASS |

## Starter Gaps

- Nenhuma lacuna minima detectada para o starter pack capturado.

## Validation Command

```bash
npx tsx scripts/run-benchmark.ts tests/goldens/benchmark/captured-benchmark-draft.json
```

Latest V60-T03 validation: `passed=true`, `failedClips=0`, tracking/diagnostics/coach all `4/4`.
