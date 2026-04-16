# Captured Benchmark Plan 2026-04-14

Dataset: `captured-benchmark-draft`
Source: `tests/goldens/benchmark/captured-benchmark-draft.json`

## Current Starter Gate

| Requirement | Actual | Required | Status |
|---|---:|---:|---|
| Captured clips | 4 | 4 | PASS |
| Distinct weapons | 2 | 2 | PASS |
| Captured clips with diagnoses | 1 | 1 | PASS |
| Captured golden clips | 1 | 1 | PASS |

## Current SDD Evidence Gate

| Requirement | Actual | Required | Status |
|---|---:|---:|---|
| Current PUBG patch captured clips (41.1) | 0 | 1 | FAIL |
| Distinct captured optics | 1 | 2 | FAIL |
| Clean captured clips | 2 | 1 | PASS |
| Degraded captured clips | 2 | 1 | PASS |
| Specialist-reviewed golden clips | 0 | 1 | FAIL |

## Immediate Promotions

- Nenhuma promocao imediata restante; o starter gate ja esta fechado com a cobertura atual.

## SDD Specialist Review Actions

- Solicitar revisao especialista de `captured-clip1-2026-04-14` para manter `golden` com provenance `specialist-reviewed`.
  Motivo: clip `captured-clip1-2026-04-14` ja esta em `golden`, mas ainda nao possui provenance `specialist-reviewed`.

## New Capture Blueprints

- Nenhum clip novo necessario para fechar o starter gate.
## SDD Evidence Capture Blueprints

### sdd-evidence-slot-1

- Purpose: fechar gap de clip capturado no patch atual 41.1; fechar gap de optic/optic state distinto no corpus SDD.
- Plan tier: `sdd-evidence`
- Target review status: `reviewed`
- Target tracking tier: `clean`
- Target visibility tier: `clean`
- Target occlusion: `light`
- Target compression: `light`
- Target distance bucket: `0-30m`
- Target patch version: `41.1`
- Weapon policy: `any`
- Optic policy: `new-distinct-optic`
- Avoid optic keys: `red-dot-sight:1x`
- Requires expected diagnosis: `false`
- Requires specialist review: `true`
- Notes: Priorizar um clip limpo no patch atual, preferencialmente com outro optic/optic state, para virar candidato forte a validacao especialista.

## Projected Starter Gate After Plan

| Requirement | Actual | Required | Status |
|---|---:|---:|---|
| Captured clips | 4 | 4 | PASS |
| Distinct weapons | 2 | 2 | PASS |
| Captured clips with diagnoses | 1 | 1 | PASS |
| Captured golden clips | 1 | 1 | PASS |

## Projected SDD Evidence Gate After Plan

| Requirement | Actual | Required | Status |
|---|---:|---:|---|
| Current PUBG patch captured clips (41.1) | 1 | 1 | PASS |
| Distinct captured optics | 2 | 2 | PASS |
| Clean captured clips | 3 | 1 | PASS |
| Degraded captured clips | 2 | 1 | PASS |
| Specialist-reviewed golden clips | 1 | 1 | PASS |
