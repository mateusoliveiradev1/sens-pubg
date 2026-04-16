# Video Analysis Baseline 2026-04-15

Status: reproducible baseline
Captured on: 2026-04-15
Workspace: `C:\Users\Liiiraa\Documents\estudos\sens-pubg`

## Goal

Congelar o estado real da camada de analise de video antes das melhorias maiores planejadas em `docs/VIDEO-ANALYSIS-EXECUTION-PLAN.md`.

Este baseline responde a cinco perguntas:

1. o pipeline atual esta verde?
2. o que exatamente ja esta coberto por teste?
3. quais numeros o tracking baseline ja entrega?
4. onde a pilha ainda e simples demais?
5. qual o proximo gargalo real?

## Commands executed

```bash
npx vitest run src/core/video-ingestion-contract.test.ts
npx vitest run src/core/frame-extraction.test.ts
npx vitest run src/core/crosshair-tracking.test.ts
npx vitest run src/workers/aim-analyzer-session.test.ts
npx vitest run src/app/analyze/tracking-result-mapper.test.ts
npx vitest run src/core/analysis-pipeline.integration.test.ts
npx vitest run src/core/tracking-golden-runner.test.ts
npx tsx scripts/run-tracking-goldens.ts
```

## Fresh evidence

### Test status

Observed result:

- `src/core/video-ingestion-contract.test.ts`: PASS - 2 tests
- `src/core/frame-extraction.test.ts`: PASS - 4 tests
- `src/core/crosshair-tracking.test.ts`: PASS - 5 tests
- `src/workers/aim-analyzer-session.test.ts`: PASS - 3 tests
- `src/app/analyze/tracking-result-mapper.test.ts`: PASS - 2 tests
- `src/core/analysis-pipeline.integration.test.ts`: PASS - 2 tests
- `src/core/tracking-golden-runner.test.ts`: PASS - 1 test

Leitura honesta:

- a baseline de video esta verde no recorte auditado;
- o pipeline principal nao esta quebrado;
- a confianca e os contadores basicos do tracking ja estao chegando ao dominio final;
- isso prova estabilidade de baseline, nao prova robustez em producao.

### Tracking golden report

Command:

```bash
npx tsx scripts/run-tracking-goldens.ts
```

Observed result:

- `passed`: `true`
- `totalFixtures`: `2`
- `failedFixtures`: `0`
- `meanCoverage`: `1.0`
- `meanErrorPx`: `0`
- `p95ErrorPx`: `0`
- `maxErrorPx`: `0`
- `confidenceCalibration.sampleCount`: `7`
- `confidenceCalibration.meanConfidence`: `0.7429`
- `confidenceCalibration.observedVisibleRate`: `0.8571`
- `confidenceCalibration.brierScore`: `0.0914`
- `confidenceCalibration.expectedCalibrationError`: `0.1143`

Fixture breakdown:

1. `clean-centered-red`

- `coverage`: `1.0`
- `meanErrorPx`: `0`
- `p95ErrorPx`: `0`
- `maxErrorPx`: `0`
- `statusMismatches`: `0`
- calibracao perfeita no conjunto (`brierScore = 0`, `ece = 0`)

2. `degraded-occlusion-red`

- `coverage`: `1.0`
- `meanErrorPx`: `0`
- `p95ErrorPx`: `0`
- `maxErrorPx`: `0`
- `statusMismatches`: `0`
- `meanConfidence`: `0.55`
- `observedVisibleRate`: `0.75`
- `brierScore`: `0.16`
- `expectedCalibrationError`: `0.2`

Interpretation:

- o baseline atual acerta bem os dois goldens existentes;
- o caso degradado ja mostra que a calibracao de confianca ainda nao e excelente;
- o valor informativo principal do harness hoje e proteger regressao em casos simples e degradacao curta;
- o harness ainda e pequeno demais para validar robustez ampla.

## Baseline by subsystem

## Ingestion

Files:

- `src/core/video-ingestion.ts`
- `src/core/video-ingestion-contract.ts`

Evidence:

- `video-ingestion-contract.test.ts` cobre o range de duracao suportado e a consistencia da copy por locale.

What is good now:

- existe contrato claro de duracao suportada;
- a camada de ingestao ja valida mime, tamanho, duracao e resolucao;
- o produto nao depende de duracao "solta" entre UI e validacao.

What is still missing:

- score de qualidade de captura;
- blur detection;
- compression burden;
- reticle contrast;
- roi stability;
- usable-for-analysis gating.

Interpretation:

- a ingestao atual e um gate estrutural;
- ainda nao e um gate perceptual.

## Frame extraction

Files:

- `src/core/frame-extraction.ts`

Evidence:

- testes atuais cobrem:
  - extracao em timestamps regulares com progresso
  - conversao de bitmaps preservando indexes e timestamps
  - descarte de bitmap sem timestamp correspondente
  - resumo de drift temporal contra timestamps esperados

What is good now:

- API simples e clara;
- suporte a extracao por seek e por bitmap;
- preservacao de timestamp no contrato.

What is still missing:

- deteccao automatica da janela do spray;
- alinhamento temporal fino entre frame e tiro;
- medicao de `shotAlignmentErrorMs`;
- robustez contra decode irregular e stutter real;
- score de qualidade por trecho.

Interpretation:

- a extracao atual e boa como baseline de engenharia;
- ainda nao e uma camada temporal forte para analise competitiva de spray.

## Tracking

Files:

- `src/core/crosshair-tracking.ts`
- `src/core/roi-stabilization.ts`

Evidence:

- `crosshair-tracking.test.ts` cobre:
  - centroid vermelho com confianca medida
  - retorno `null` quando a mira nao esta visivel
  - restricao por ROI
  - fallback para reticle neutro
  - uso de template fallback para oclusao curta

What is good now:

- baseline simples, reutilizavel e modular;
- ROI ja existe;
- estados `tracked`, `uncertain`, `occluded`, `lost` ja existem;
- fallback visual evita parte das perdas curtas;
- goldens atuais estao limpos.

What is still missing:

- refinamento subpixel;
- re-aquisicao explicita e medida;
- multi-hypothesis tracking;
- auto-detect de cor da mira;
- preprocessamento visual;
- compensacao de movimento global;
- modelagem de perturbacoes exogenas por frame;
- timeline de `opticState`.

Interpretation:

- o tracker atual e um baseline honesto e funcional;
- ainda esta mais perto de um tracker heuristico robusto do que de uma pilha de percepcao forte.

## Worker session

Files:

- `src/workers/aim-analyzer-session.ts`
- `src/workers/aimAnalyzer.worker.ts`

Evidence:

- `aim-analyzer-session.test.ts` cobre:
  - contadores auditaveis de `tracked`, `uncertain`, `occluded`, `lost`
  - comportamento correto quando nao ha lock previo
  - preservacao do lock local quando existe ruido vermelho forte fora da ROI

What is good now:

- sessao incremental clara;
- tracking quality ja e calculada;
- counters ja existem e sao coerentes;
- worker separa `progress` e `result`.

What is still missing:

- `ReticleObservation` mais rico como contrato proprio;
- perturbacoes exogenas por frame;
- re-aquisicao measure-driven;
- signals temporais mais fortes;
- integraçao com score de qualidade do clip.

Interpretation:

- o worker atual ja preserva honestidade basica;
- ainda nao expõe toda a evidencia que o resto do produto vai precisar.

## Mapping

Files:

- `src/app/analyze/tracking-result-mapper.ts`

Evidence:

- `tracking-result-mapper.test.ts` cobre preservacao de `confidence`, `trackingQuality` e counters do worker para o dominio da engine.
- o mapper agora tambem expone um resumo reutilizavel de erro espacial por `frame`, permitindo comparar baseline bruto, mapping e trajetoria.

What is good now:

- o mapping nao joga fora counters importantes;
- limites de unidade ja passam por clamp consistente.

What is still missing:

- novos campos de quality, perturbacao, re-aquisicao e evidencias por frame ainda nao existem no contrato;
- nao ha hoje separacao rica entre `tracking payload` e `tracking evidence`.

Interpretation:

- mapping atual esta correto para o baseline atual;
- ele ainda nao foi estressado por um contrato de percepcao mais sofisticado.

## Integrated pipeline

Files:

- `src/core/analysis-pipeline.integration.test.ts`
- `src/core/spray-metrics.ts`

Evidence:

- os testes de integracao agora provam:
  - um caso deterministico coerente de `tracking -> trajectory -> metrics -> diagnoses -> sensitivity -> coaching`
  - uma fixture controlada que separa drift de extracao, erro bruto do tracking e erro introduzido pela etapa de `smoothing/resampling`

Observed behavior in the integration case:

- `trajectory.displacements`: `11`
- `trajectory.framesProcessed`: `12`
- `metrics.verticalControlIndex`: `> 1.15`
- `metrics.initialRecoilResponseMs`: `88ms`
- `metrics.metricQuality.verticalControlIndex.coverage`: `~1`
- `metrics.metricQuality.verticalControlIndex.confidence`: `~0.95`
- diagnostico dominante: `overpull`
- recomendacao de sens: `high`

Observed behavior in the controlled video fixture:

- `extractionDrift.sampleCount`: `12`
- `extractionDrift.meanErrorMs`: `0`
- `extractionDrift.maxErrorMs`: `0`
- `rawTrackingError.sampleCount`: `12`
- `rawTrackingError.meanErrorPx`: `0`
- `rawTrackingError.maxErrorPx`: `0`
- `mappedTrackingError.meanErrorPx`: `0`
- `mappedTrackingError.maxErrorPx`: `0`
- `trajectoryError.sampleCount`: `3`
- `trajectoryError.meanErrorPx`: `2.8124`
- `trajectoryError.maxErrorPx`: `3.4510`

What is good now:

- a linha principal do produto esta coerente no caso sintetico de referencia;
- `metricQuality` ja participa da historia;
- `shotResiduals` ja existem no dominio.

What is still missing:

- baseline de video mais forte antes dessas metricas;
- propagacao mais rica de confianca vinda da percepcao;
- janela do spray;
- compensacao de movimento global;
- calibracao com corpus maior e mais cruel.

Interpretation:

- a integracao atual esta coerente;
- a maior fragilidade nao esta no wiring, e sim na profundidade da percepcao que alimenta esse wiring;
- agora existe evidencia objetiva de quanto erro a pilha adiciona depois do tracking bruto, o que ajuda a atacar smoothing, resample e alinhamento temporal sem adivinhacao.

## Baseline verdict

Veredito curto:

**baseline tecnico verde / percepcao ainda simples**

O estado atual da analise de video pode ser descrito assim:

- verde como baseline de engenharia;
- correto para casos sintéticos e goldens pequenos;
- honesto o bastante para contar `tracked/uncertain/occluded/lost`;
- insuficiente ainda para chamar a percepcao de video de "muito precisa".

## Strengths confirmed at baseline

- o pipeline principal esta modularizado;
- ingestao, extracao, tracking, worker e mapping ja se conectam sem gambiarra evidente;
- o harness de tracking ja existe;
- a baseline atual ja diferencia qualidade e estado de tracking melhor do que uma leitura binaria simples;
- os resultados atuais sao auditaveis.

## Main limits confirmed at baseline

1. o benchmark de tracking ainda e pequeno demais
2. a calibracao do caso degradado ainda e so razoavel, nao excelente
3. a ingestao ainda nao pontua qualidade de captura
4. a extracao ainda nao isola a janela real do spray
5. o tracking ainda e centrado em cor + centroid + fallback simples
6. ainda nao existe camada de compensacao de movimento global
7. ainda nao existe re-aquisicao medida e reportada como metrica propria
8. ainda nao existe timeline de `opticState`

## Immediate priorities derived from the baseline

1. criar `VideoQualityReport` e quality gating antes da analise
2. criar `SprayWindowDetection` para sair do clip inteiro como unidade implicita
3. enriquecer o contrato do tracking com observacao por frame mais rica
4. adicionar refinamento espacial e re-aquisicao ao tracker
5. ampliar o benchmark com shake, blur, perda curta e hard negatives

## Final interpretation

Este baseline mostra uma situacao boa para evolucao:

- o projeto nao esta quebrado;
- o tracking atual nao esta desonesto;
- o pipeline principal esta coerente;
- ja existe trilha de benchmark inicial.

Mas ele tambem mostra com clareza que o maior ganho real agora nao vem de "mais regra de diagnostico".

O maior ganho real vem de elevar a camada de analise de video antes do diagnostico:

- qualidade do clip;
- tempo certo;
- centro certo;
- perda e re-aquisicao honestas;
- confianca calibrada.
