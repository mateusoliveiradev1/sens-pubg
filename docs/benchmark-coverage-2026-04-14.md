# Benchmark Coverage 2026-04-14

Dataset: `captured-benchmark-draft`
Source: `tests/goldens/benchmark/captured-benchmark-draft.json`

## Snapshot

| Metric | Value |
|---|---:|
| Total clips | 5 |
| Clips com diagnostico esperado | 1 |
| Clips promovidos para golden | 1 |
| Clips capturados no patch atual 41.1 | 1 |
| Goldens validados por especialista | 1 |

## Coverage

| Dimension | Count |
|---|---:|
| Source type captured | 5 |
| Review status golden | 1 |
| Review status reviewed | 4 |
| Review provenance machine-assisted | 4 |
| Review provenance specialist-reviewed | 1 |
| Tracking tier clean | 3 |
| Tracking tier degraded | 2 |
| Visibility tier clean | 3 |
| Visibility tier degraded | 2 |
| Occlusion light | 3 |
| Occlusion moderate | 2 |
| Compression light | 4 |
| Compression medium | 1 |
| Distance bucket 0-30m | 1 |
| Distance bucket 31-60m | 1 |
| Distance bucket 61-100m | 3 |

## Domain Diversity

| Dimension | Values |
|---|---|
| Weapons | aug, beryl-m762 |
| Optics | 2x:2x, red-dot-sight:1x |
| Patch versions | 40.1, 41.1 |

## Starter Gate

| Requirement | Actual | Required | Status |
|---|---:|---:|---|
| Captured clips | 5 | 4 | PASS |
| Distinct weapons | 2 | 2 | PASS |
| Captured clips with diagnoses | 1 | 1 | PASS |
| Captured golden clips | 1 | 1 | PASS |

## Starter Gaps

- Nenhuma lacuna minima detectada para o starter pack capturado.

## SDD Evidence Gate

| Requirement | Actual | Required | Status |
|---|---:|---:|---|
| Current PUBG patch captured clips (41.1) | 1 | 1 | PASS |
| Distinct captured optics | 2 | 2 | PASS |
| Clean captured clips | 3 | 1 | PASS |
| Degraded captured clips | 2 | 1 | PASS |
| Specialist-reviewed golden clips | 1 | 1 | PASS |

## SDD Gaps

- Nenhuma lacuna SDD de evidencia detectada para o corpus capturado atual.
