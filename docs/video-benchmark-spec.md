# Video Benchmark Spec

Status: V60-T01 baseline spec
Scope: benchmark de video para tracking de mira, qualidade de evidencia, diagnostico e coaching.

## Goal

Impedir crescimento aleatorio do dataset. Todo novo clip deve fechar uma lacuna de cobertura declarada ou aumentar a confianca de um bucket ja aceito.

## Dataset Contract

O dataset operacional continua seguindo `src/types/benchmark.ts`:

- `capture`: patch, arma, distancia, stance, optic e attachments
- `quality`: origem, review, oclusao, compressao e tier de visibilidade
- `labels`: diagnosticos esperados, modo de coach esperado e tier de tracking esperado
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
- o clip roda no benchmark sem erro estrutural;
- clips `rejected` documentam exclusao, mas nao contam para cobertura minima.

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
