# Video Benchmark Spec

Status: V60-T01 baseline spec
Scope: benchmark de video para tracking de mira, qualidade de evidencia, diagnostico e coaching.

## Goal

Impedir crescimento aleatorio do dataset. Todo novo clip deve fechar uma lacuna de cobertura declarada ou aumentar a confianca de um bucket ja aceito.

## Dataset Contract

O dataset operacional continua seguindo `src/types/benchmark.ts`:

- `capture`: patch, arma, distancia, stance, optic e attachments
- `quality`: origem, review, oclusao, compressao e tier de visibilidade
- `labels`: diagnosticos esperados, modo/plano de coach esperado, tier de tracking esperado e `expectedTruth`
- `fixtures`: harnesses sinteticos ou goldens auxiliares quando existirem

Este documento define a cobertura minima que deve existir por dimensao. A cobertura e por eixo, nao por produto cartesiano completo; combinacoes criticas sao declaradas separadamente para evitar explosao de fixtures.

## Coverage Gates

| Gate | Purpose | Minimo aceitavel |
|---|---|---:|
| Starter | liberar iteracao local sem enganar o motor | 1 clip por bucket critico |
| Golden | proteger regressao antes de confiar em recomendacao | 3 clips por bucket critico |
| Hardening | medir cauda longa e casos dificeis | 5+ clips nos buckets de degradacao |

Um bucket conta para cobertura quando:

- `quality.reviewStatus` e `reviewed` ou `golden`;
- tracking label existe ou fixture sintetico equivalente existe;
- `labels.expectedTruth` existe e usa enums internos, nao copy de UI;
- o clip roda no benchmark sem erro estrutural;
- clips `rejected` documentam exclusao, mas nao contam para cobertura minima.

## Internal Promotion Workflow

Benchmark labels and captured clip promotion are internal maintainer/dev/reviewer workflow, not public user-generated content.

Maturity path:

```text
draft -> reviewed -> golden
```

Reviewed clips can count for the strict release gate when structured checks pass:

- required metadata exists: patch, weapon, optic/state, attachments, distance, stance, spray window, frame labels, provenance;
- `labels.expectedTrackingTier` is present;
- `labels.expectedTruth` is present and stable;
- if `labels.expectedDiagnoses` is not empty, `expectedCoachMode`, `expectedCoachPlan`, and truth next-block expectations are present;
- the captured benchmark replays without structural error.

Golden requires reviewed status, stable replay/benchmark pass, complete metadata, a strong human/specialist/Codex-assisted review justification, and a promotion reason. Missing metadata blocks promotion and must report field paths.

## Consent And Public Video Rules

Every captured or real/pro validation clip needs a per-clip consent record before it can count as `reviewed` or `golden`. The record must include contributor reference, consent date, allowed purposes, trainability authorization when applicable, raw clip storage scope, derivative scope, reviewer, review state, transition reason, and withdrawal fields when permission is removed.

Raw clips are private by default. Promotion reports and benchmark artifacts may use clip IDs, metadata, labels, aggregate metrics, and review rationale. Thumbnails or frame derivatives require explicit `thumbnail_allowed` or `frames_allowed` derivative scope, and redistribution must never be inferred from benchmark membership.

Public streamer/pro videos are qualitative reference only unless formal permission/trainability is verified. Do not download, frame-extract, train on, validate against, or promote public YouTube/Twitch/pro footage as benchmark evidence without explicit permission and the required trainability/commercial benchmark purposes.

Withdrawn clips must be quarantined and any affected benchmark baseline must be rechecked or rebaselined before future release claims.

Useful commands:

```bash
npm run promote:captured-clips -- --dry-run --clip captured-clip1-2026-04-14 --to reviewed --reason "Close release evidence gap" --reviewer maintainer --consent tests/fixtures/captured-clips/consent.todo.v1.json --report docs/benchmark-reports/captured-promotion-2026-05-05.md
npm run promote:captured-clips:with-review-decisions
npm run benchmark:release
npm run benchmark:update-baseline -- --dataset captured --reason "Intentional truth-contract change" --affected-clips "captured-clip1" --honesty-rationale "The new refusal avoids overclaiming weak evidence"
```

Run `benchmark:release` before commercial claims about precision, coaching, or paid analysis value. A correct refusal (`capture_again` or `inconclusive`) can be a pass when the clip evidence does not support a strong recommendation. Coverage impact is evidence for release readiness, not proof of perfect sensitivity or guaranteed improvement.

## Resolution Buckets

| Bucket | Definition | Starter min | Golden min | Notes |
|---|---|---:|---:|---|
| `r_720p` | altura entre 700 e 800 px | 1 | 3 | captura comum e barata |
| `r_1080p` | altura entre 1000 e 1200 px | 1 | 3 | baseline principal |
| `r_1440p_plus` | altura >= 1400 px | 1 | 3 | mira pequena em imagem grande |
| `r_mobile_crop` | crop vertical/horizontal nao padrao | 1 | 2 | importante para uploads editados |

## FPS Buckets

| Bucket | Definition | Starter min | Golden min | Notes |
|---|---|---:|---:|---|
| `fps_30` | 24-35 FPS | 1 | 3 | baixo temporal, mais aliasing |
| `fps_60` | 50-70 FPS | 1 | 3 | baseline principal |
| `fps_90_plus` | >= 85 FPS | 1 | 3 | exige estabilidade de janela e reacquisicao |

## Capture Quality Buckets

| Bucket | Definition | Starter min | Golden min | Notes |
|---|---|---:|---:|---|
| `quality_clean` | `visibilityTier=clean`, compressao lossless/light | 1 | 3 | controle positivo |
| `quality_compressed` | `compressionLevel=medium/heavy` | 1 | 5 | risco de falso negativo da mira |
| `quality_blur` | motion blur ou perda de nitidez visivel | 1 | 5 | deve reduzir confianca |
| `quality_shake` | camera/recoil global motion acima do baseline | 1 | 5 | deve acionar perturbacao exogena |
| `quality_rejected` | `visibilityTier=rejected` | 1 documentado | 2 documentados | nao entra no score, valida gating |

## Occlusion Buckets

| Bucket | Definition | Starter min | Golden min | Notes |
|---|---|---:|---:|---|
| `occ_none` | `occlusionLevel=none` | 1 | 3 | baseline limpo |
| `occ_light` | oclusao curta ou parcial | 1 | 3 | deve manter tracking |
| `occ_moderate` | perda curta e re-aquisicao | 1 | 5 | principal para V60-T02 |
| `occ_heavy` | mira ausente por janela relevante | 1 | 3 | deve gerar baixa confianca ou rejeicao |

## Reticle Color Buckets

| Bucket | Definition | Starter min | Golden min | Notes |
|---|---|---:|---:|---|
| `reticle_red` | mira vermelha | 1 | 3 | ja existe em synthetic v1 |
| `reticle_green` | mira verde | 1 | 3 | precisa validar thresholds HSV |

## Distance Buckets

| Bucket | Definition | Starter min | Golden min | Notes |
|---|---|---:|---:|---|
| `dist_close` | 10-30 m | 1 | 3 | recoil aparente alto |
| `dist_mid` | 31-60 m | 1 | 3 | baseline de treino |
| `dist_far` | 61-100 m | 1 | 3 | alvo menor, erro mais sensivel |
| `dist_long` | > 100 m | 1 | 2 | menor prioridade, mas precisa existir |

## Optic Buckets

| Bucket | Definition | Starter min | Golden min | Notes |
|---|---|---:|---:|---|
| `optic_1x_red_dot` | red dot 1x | 1 | 3 | baseline atual |
| `optic_1x_holo` | holographic 1x | 1 | 3 | reticle/shape diferente |
| `optic_2x` | 2x | 1 | 3 | muda escala aparente |
| `optic_3x_or_4x` | 3x ou 4x | 1 | 3 | maior recoil visual |
| `optic_unknown` | detector nao tem evidencia suficiente | 1 | 2 | deve reduzir confianca, nao inventar estado |

## Critical Pair Rules

| Pair | Starter min | Golden min | Why |
|---|---:|---:|---|
| `quality_shake` + `fps_30` | 1 | 3 | pior caso para estabilizacao temporal |
| `quality_blur` + `reticle_green` | 1 | 3 | risco de threshold fraco em cor secundaria |
| `occ_moderate` + `optic_1x_red_dot` | 1 | 5 | re-aquisicao principal do produto hoje |
| `quality_compressed` + `r_720p` | 1 | 3 | uploads ruins mais comuns |
| `dist_far` + `optic_3x_or_4x` | 1 | 3 | erro pequeno vira recomendacao errada |

## Naming

Clip IDs devem seguir:

```text
<source>-<quality>-<weapon>-<distance>-<optic>-<short-hash>
```

Exemplos:

- `synthetic-shake-beryl-30m-red-dot-a01`
- `captured-clean-aug-75m-red-dot-c14`
- `captured-blur-ace32-50m-2x-d02`

## Intake Rules

1. Classificar o clip nos buckets antes de adicionar ao dataset.
2. Se nenhum bucket ou pair rule melhora, nao adicionar.
3. Clips reais entram como `draft` ate terem label minima de tracking e qualidade.
4. `reviewed` conta para Starter; `golden` conta para Golden.
5. Todo clip degradado precisa explicar se a perda esperada vem de blur, shake, oclusao, compressao ou optic desconhecido.

## Current Known Coverage

| Bucket | Current evidence | Gap |
|---|---|---|
| `reticle_red` | synthetic v1 | precisa `reticle_green` |
| `optic_1x_red_dot` | synthetic v1, captured draft | precisa expandir outros optics |
| `occ_moderate` | synthetic degraded occlusion | precisa casos de shake/blur/reacquisition |
| `quality_clean` | synthetic clean | precisa resolucoes/FPS reais |
| `quality_compressed` | synthetic benchmark metadata | precisa fixtures especificas |

## Next Work

- V60-T02 deve adicionar fixtures sinteticas para `quality_shake`, `quality_blur` e `occ_moderate` com re-aquisicao curta.
- V60-T03 deve promover starter pack capturado usando esta tabela como checklist.
- Futuro schema pode adicionar campos normalizados (`resolutionBucket`, `fpsBucket`, `qualityBucket`) se a cobertura manual ficar dificil de auditar.
