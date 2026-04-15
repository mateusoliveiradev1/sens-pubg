# Benchmark Dataset Spec

## Goal

Este documento define como clips de benchmark devem ser armazenados para validar tracking, diagnostico e coaching de forma versionada e auditavel.

O contrato executavel correspondente fica em `src/types/benchmark.ts`.

## Root Object

```ts
interface BenchmarkDataset {
  schemaVersion: 1;
  datasetId: string;
  createdAt: string; // ISO-8601
  clips: BenchmarkClip[];
}
```

## Clip Record

Cada `BenchmarkClip` precisa conter quatro blocos:

1. `media`
   - `videoPath`: caminho relativo do video
   - `frameLabelsPath?`: caminho relativo para labels frame-a-frame
   - `previewImagePath?`: thumbnail opcional
   - `sha256?`: checksum opcional

2. `capture`
   - `patchVersion`: patch explicito no formato `major.minor`
   - `weaponId`: arma existente no catalogo do patch
   - `distanceMeters`: distancia do alvo
   - `stance`: `standing | crouching | prone`
   - `optic`: `opticId` + `stateId`
   - `attachments`: `muzzle`, `grip`, `stock`

3. `labels`
   - `expectedDiagnoses`: diagnosticos esperados para o clip; pode ser vazio em clips limpos
   - `expectedCoachMode`: `standard | low-confidence | inconclusive`
   - omitir `expectedCoachMode` quando `expectedDiagnoses` estiver vazio
   - `expectedTrackingTier`: `clean | degraded`
   - `notes?`: observacoes humanas

4. `quality`
   - `sourceType`: `captured | synthetic | augmented`
   - `reviewStatus`: `draft | reviewed | golden`
   - `occlusionLevel`: `none | light | moderate | heavy`
   - `compressionLevel`: `lossless | light | medium | heavy`
   - `visibilityTier`: `clean | degraded | rejected`
   - `notes?`: observacoes de qualidade

Opcionalmente, clips sintéticos podem adicionar um bloco `fixtures` para o runner local:

- `trackingFixturePath?`: fixture usada para validar tracking
- `diagnosticFixturePath?`: fixture usada para validar diagnostico
- `coachFixturePath?`: fixture usada para validar coaching

## Validation Rules

- `patchVersion` deve ser explicito; `legacy-unknown` nao entra em benchmark.
- `weaponId` precisa existir no catalogo do patch.
- `opticId` e `stateId` precisam existir no catalogo de optics do patch.
- `muzzle`, `grip` e `stock` precisam existir no catalogo de attachments do patch quando diferentes de `none`.
- `labels` e `quality` sao obrigatorios; benchmark sem rotulo nao conta como benchmark.
- clips limpos podem usar `expectedDiagnoses: []`.
- `expectedCoachMode` so pode aparecer quando houver pelo menos um diagnostico esperado.
- clips sintéticos podem apontar para fixtures auxiliares em `fixtures.*Path` sem afetar o contrato dos clips capturados.

## Example

```json
{
  "schemaVersion": 1,
  "datasetId": "pubg-spray-benchmark-v1",
  "createdAt": "2026-04-14T12:00:00.000Z",
  "clips": [
    {
      "clipId": "beryl-411-hybrid-clean-001",
      "media": {
        "videoPath": "tests/goldens/real/beryl-411-hybrid-clean-001.mp4",
        "frameLabelsPath": "tests/goldens/real/beryl-411-hybrid-clean-001.labels.json"
      },
      "capture": {
        "patchVersion": "41.1",
        "weaponId": "beryl-m762",
        "distanceMeters": 30,
        "stance": "standing",
        "optic": {
          "opticId": "hybrid-scope",
          "stateId": "4x"
        },
        "attachments": {
          "muzzle": "compensator",
          "grip": "vertical",
          "stock": "none"
        }
      },
      "labels": {
        "expectedDiagnoses": ["underpull"],
        "expectedCoachMode": "standard",
        "expectedTrackingTier": "clean"
      },
      "quality": {
        "sourceType": "captured",
        "reviewStatus": "golden",
        "occlusionLevel": "none",
        "compressionLevel": "light",
        "visibilityTier": "clean"
      }
    }
  ]
}
```

## Why This Shape

- separa claramente sinal bruto (`media`) de contexto de dominio (`capture`)
- prende rotulo esperado em `labels`
- deixa a qualidade auditavel em `quality`
- ja e suficiente para os proximos passos: pacote de goldens reais, runner local e benchmark em CI
