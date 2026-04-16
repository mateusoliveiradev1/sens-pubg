# Video Analysis Execution Plan

Status: execution backlog
Data: 2026-04-15
Base document: `docs/SDD-analise-de-video.md`

## 1. Objetivo

Este documento transforma o SDD de analise de video em um plano de execucao pratico, atomico e verificavel.

A meta nao e "mexer no tracker ate parecer melhor".

A meta e:

- aumentar precisao espacial;
- aumentar precisao temporal;
- aumentar robustez em clips degradados;
- medir a qualidade do clip antes de analisar;
- reduzir erro de tracking que contamina metricas, diagnostico e sens;
- criar evidencia numerica para dizer que a analise de video realmente melhorou.

## 2. Modo de trabalho

### 2.1 Regras nao negociaveis

1. Nenhuma task fecha sem validacao local relevante.
2. Toda task que muda comportamento deve comecar por teste que falha ou fixture que expresse a falha atual.
3. A analise de video nunca pode transformar baixa confianca em coordenada "boa o bastante".
4. Melhor bloquear clip ruim do que contaminar o pipeline inteiro.
5. Nenhuma melhoria de tracking pode piorar os goldens limpos sem justificativa explicita.
6. Toda metrica nova de video precisa ter dono, contrato e uso claro.
7. Qualidade de video e parte do produto, nao so telemetria interna.

### 2.2 Ritual de TDD por task

Para cada task:

1. Criar teste, fixture ou benchmark que demonstre a falha atual.
2. Rodar e confirmar falha.
3. Implementar a menor mudanca possivel para passar.
4. Refatorar preservando tipagem, clareza e suite verde.
5. Rodar validacao local da task.
6. Atualizar docs, contracts e fixtures se o comportamento publico mudou.

### 2.3 Tipos de teste aceitos

- Unit: funcoes puras, scoring, thresholds, filtros, mapeamentos.
- Integration: `ingestion -> extraction -> tracking -> mapping -> metrics`.
- Contract: schemas, payloads do worker, tipos, relatórios.
- Golden: fixtures de tracking e janela de spray.
- Benchmark: erro espacial, erro temporal, coverage, recalibracao.
- E2E: UI de upload, bloqueio de clip ruim, visualizacao de tracking quality.

### 2.4 Definition of Done global

O programa de video so pode ser chamado de "muito melhor" quando:

- clip quality score existe e bloqueia casos ruins de forma correta;
- spray window e detectada ou ao menos auditada por contrato proprio;
- tracking suporta perda, oclusao e re-aquisicao de modo honesto;
- erro espacial e temporal sao medidos por benchmark;
- confianca esta calibrada, nao so exibida;
- goldens limpos e degradados rodam em CI;
- a melhora do video gera melhora real nas metricas que alimentam diagnostico e sens.

## 3. Como uma IA deve executar este plano

### 3.1 Regras de foco

- pegar 1 task por vez;
- nao misturar refactor amplo com task de benchmark se nao for exigencia do aceite;
- nao "pular" para streams tardios sem fechar precondicoes do tracking;
- nao alterar contrato do worker sem atualizar mapeamento e testes de contract;
- nao vender melhoria de percepcao por comparacao visual sem benchmark numerico.

### 3.2 Pacote minimo que a IA deve carregar

Ao iniciar uma task, a IA deve ler apenas:

- este arquivo;
- a task escolhida;
- `docs/SDD-analise-de-video.md`;
- os arquivos listados em `Read/Write`;
- os testes/fixtures relacionados.

### 3.3 Formato de entrega esperado por task

- o que mudou;
- quais contratos ou tipos mudaram;
- quais testes/benchmarks foram criados ou alterados;
- quais comandos rodaram;
- qual ganho foi observado;
- se existe bloqueio, follow-up ou fixture faltando.

## 4. Mapa de workstreams

| Stream | Nome | Objetivo |
|---|---|---|
| V00 | Baseline & Instrumentation | medir o estado real da analise de video atual |
| V10 | Intake & Quality Gating | pontuar utilidade do clip antes do tracking |
| V20 | Temporal Framing | melhorar extracao e detectar a janela real do spray |
| V30 | Tracking Core | elevar precisao espacial, estabilidade e re-aquisicao |
| V40 | Context Perception | modelar movimento global, perturbacoes e estado optico |
| V50 | Evidence & Calibration | consolidar confianca, coverage e erro medido |
| V60 | Dataset & Benchmark | construir corpus, runners e gates fortes |
| V70 | Product Integration | expor video quality e estados do motor na UX |

## 5. Backlog atomico

Cada task abaixo foi desenhada para caber em uma sessao focada e deixar uma trilha objetiva de prova.

---

## V00 - Baseline & Instrumentation

### V00-T01 - Congelar baseline atual da analise de video

Goal:

- criar um relatorio reproduzivel do estado atual da camada de video.

Read/Write:

- read: `src/core/video-ingestion.ts`
- read: `src/core/frame-extraction.ts`
- read: `src/core/crosshair-tracking.ts`
- read: `src/workers/aim-analyzer-session.ts`
- write: `docs/video-analysis-baseline-2026-04-15.md`

Depends on:

- none

Acceptance:

- existe relatorio com pipeline atual, limites conhecidos e comandos executados;
- relatorio distingue ingestao, extracao, tracking, mapping e metricas.

Tests:

- `npx vitest run src/core/crosshair-tracking.test.ts`
- `npx vitest run src/workers/aim-analyzer-session.test.ts`

TDD:

- nao se aplica; task de observacao.

Execution notes:

- 2026-04-15: V00-T01 concluida com `docs/video-analysis-baseline-2026-04-15.md`, registrando comandos executados, estado de ingestao, extracao, tracking, worker, mapping, pipeline integrado, limites conhecidos e prioridades imediatas.

### V00-T02 - Instrumentar o runner de tracking com metricas espaciais e temporais

Goal:

- fazer o benchmark atual reportar mais do que `pass/fail`.

Read/Write:

- `scripts/run-tracking-goldens.*`
- `src/core/tracking-golden-runner.test.ts`

Depends on:

- V00-T01

Acceptance:

- runner reporta `meanErrorPx`, `p95ErrorPx`, `maxErrorPx`, `coverage`, `brierScore`, `expectedCalibrationError`;
- testes cobrem o shape do relatorio.

Tests:

- `npx vitest run src/core/tracking-golden-runner.test.ts`

TDD:

- primeiro falhar por campo ausente no relatorio.

Execution notes:

- 2026-04-15: V00-T02 concluida no runner de goldens. `scripts/run-tracking-goldens.ts` reporta coverage, erro medio/p95/max, Brier, ECE e metricas de re-aquisicao; `src/core/tracking-golden-runner.test.ts` cobre o shape e thresholds versionados.

### V00-T03 - Medir erro do pipeline inteiro em fixture controlada

Goal:

- separar erro do tracker de erro de extracao, mapping e smoothing.

Read/Write:

- `src/core/frame-extraction.ts`
- `src/app/analyze/tracking-result-mapper.ts`
- novo teste de integracao em `src/core/analysis-pipeline.integration.test.ts`

Depends on:

- V00-T02

Acceptance:

- existe teste/fixture que mede o erro do pipeline do frame ate a trajetoria;
- diferenca entre erro puro de tracking e erro do pipeline fica explicitada.

Tests:

- `npx vitest run src/core/analysis-pipeline.integration.test.ts`

TDD:

- adicionar fixture controlada com centro conhecido antes da implementacao.

Execution notes:

- 2026-04-15: V00-T03 concluida em `src/core/analysis-pipeline.integration.test.ts`, separando drift de extracao, erro bruto do tracking, erro apos mapping e erro da trajetoria suavizada/resampleada em fixture deterministica.

---

## V10 - Intake & Quality Gating

### V10-T01 - Criar contrato de `VideoQualityReport`

Goal:

- dar dono e shape para qualidade de captura.

Read/Write:

- `src/types/engine.ts`
- novo `src/core/capture-quality.ts`

Depends on:

- V00-T03

Acceptance:

- tipo inclui `overallScore`, `sharpness`, `compressionBurden`, `reticleContrast`, `roiStability`, `fpsStability`, `usableForAnalysis`, `blockingReasons`;
- testes cobrem o contrato.

Tests:

- unit/contract tests para o novo modulo

TDD:

- criar primeiro teste de contract do objeto retornado.

Execution notes:

- 2026-04-15: V10-T01 concluida. `VideoQualityReport` foi criado em `src/types/engine.ts` com score, nitidez, compressao, contraste, estabilidade de ROI/FPS, usabilidade e motivos de bloqueio; `src/core/capture-quality.test.ts` cobre o contrato.

### V10-T02 - Medir nitidez, contraste da mira e burden de compressao

Goal:

- deixar o motor entender se o clip realmente serve para tracking fino.

Read/Write:

- novo `src/core/capture-quality.ts`
- novos testes `src/core/capture-quality.test.ts`

Depends on:

- V10-T01

Acceptance:

- modulo calcula ao menos `sharpness`, `reticleContrast` e `compressionBurden`;
- caso limpo e caso degradado ficam distinguiveis por fixture.

Tests:

- `npx vitest run src/core/capture-quality.test.ts`

TDD:

- criar fixture limpa e fixture degradada antes.

Execution notes:

- 2026-04-15: V10-T02 concluida em `src/core/capture-quality.ts`, com analise de frames para nitidez, contraste de mira e burden de compressao, distinguindo fixture limpa de degradada por score e blocking reasons.

### V10-T03 - Integrar quality gating em `validateAndPrepareVideo`

Goal:

- mover qualidade do clip para a porta de entrada.

Read/Write:

- `src/core/video-ingestion.ts`
- `src/core/video-ingestion-contract.ts`
- `src/app/analyze/analysis-client.tsx`

Depends on:

- V10-T02

Acceptance:

- metadata passa a incluir quality report;
- clips claramente ruins podem sair como `valid: false` ou `valid but blocked for analysis`;
- UI recebe mensagem especifica de bloqueio.

Tests:

- `npx vitest run src/core/video-ingestion-contract.test.ts`
- `npx vitest run src/app/analyze/analysis-ingestion.contract.test.ts`

TDD:

- primeiro testar payload esperado para clip bloqueado por qualidade.

Execution notes:

- 2026-04-15: V10-T03 concluida. `validateAndPrepareVideo` agora anexa `qualityReport` ao metadata, aceita injetar `assessQuality` em teste e bloqueia clips perceptualmente ruins com mensagem especifica; validado por `src/core/video-ingestion.test.ts`.

### V10-T04 - Expor motivos de bloqueio na UX

Goal:

- deixar o usuario entender por que o clip nao foi aceito.

Read/Write:

- `src/app/analyze/analysis-client.tsx`
- `src/app/analyze/analysis-guide.tsx`
- `src/i18n/*.ts`

Depends on:

- V10-T03

Acceptance:

- UI mostra motivos como blur, contraste insuficiente, compressao pesada ou FPS instavel;
- sem claim de analise quando o clip foi bloqueado.

Tests:

- component or contract tests
- Playwright targeted se necessario

TDD:

- consultar texto esperado antes da implementacao.

Execution notes:

- 2026-04-15: V10-T04 concluida. `analysis-client` exibe aviso/bloqueio por qualidade com motivos legiveis, `results-dashboard` mostra score/status/motivos/metricas do clip, e os textos de guia/i18n evitam claim de analise perfeita quando o video limita a precisao.

---

## V20 - Temporal Framing

### V20-T01 - Criar contrato de `SprayWindowDetection`

Goal:

- tratar a janela do spray como entidade de dominio.

Read/Write:

- `src/types/engine.ts`
- novo `src/core/spray-window-detection.ts`

Depends on:

- V10-T03

Acceptance:

- existe tipo com `startMs`, `endMs`, `confidence`, `shotLikeEvents`, `rejectedLeadingMs`, `rejectedTrailingMs`;
- testes cobrem o contrato.

Tests:

- unit/contract tests

TDD:

- criar contract test antes.

Execution notes:

- 2026-04-15: V20-T01 concluida. `SprayWindowDetection` foi adicionado em `src/types/engine.ts` e implementado em `src/core/spray-window-detection.ts` com `startMs`, `endMs`, confianca, eventos de tiro e rejeicoes de lead-in/trailing.

### V20-T02 - Detectar inicio e fim do spray em clip simples

Goal:

- deixar de depender implicitamente do clip inteiro.

Read/Write:

- novo `src/core/spray-window-detection.ts`
- testes `src/core/spray-window-detection.test.ts`

Depends on:

- V20-T01

Acceptance:

- modulo detecta uma janela principal em fixture simples;
- coverage temporal melhora contra baseline do clip inteiro.

Tests:

- `npx vitest run src/core/spray-window-detection.test.ts`

TDD:

- primeiro criar fixture com periodo morto antes e depois do spray.

Execution notes:

- 2026-04-15: V20-T02 concluida com fixture de periodo morto antes/depois em `src/core/spray-window-detection.test.ts`; `detectSprayWindow` identifica a janela principal e retorna `null` quando nao ha eventos suficientes.

### V20-T03 - Integrar janela do spray na extracao de frames

Goal:

- extrair e processar apenas o trecho util.

Read/Write:

- `src/core/frame-extraction.ts`
- `src/app/analyze/analysis-client.tsx`

Depends on:

- V20-T02

Acceptance:

- extracao passa a suportar janela detectada ou fornecida;
- pipeline evita frames mortos antes/depois.

Tests:

- `npx vitest run src/core/frame-extraction.test.ts`
- integration test do analyze pipeline

TDD:

- primeiro caso que falha por extracao fora da janela.

Execution notes:

- 2026-04-15: V20-T03 concluida. `src/core/frame-extraction.ts` suporta filtragem por janela detectada/fornecida, `frame-extraction.test.ts` valida descarte de frames mortos, e o pipeline integrado usa a janela para reduzir lead-in/trailing.

### V20-T04 - Melhorar alinhamento temporal baseline entre frame e tiro

Goal:

- reduzir erro de casamento entre timestamps de frame e bullets.

Read/Write:

- `src/core/frame-extraction.ts`
- `src/core/spray-metrics.ts`
- novo `src/core/shot-alignment.ts`

Depends on:

- V20-T03

Acceptance:

- existe funcao clara de alinhamento de tiros;
- benchmark reporta `shotAlignmentErrorMs`.

Tests:

- unit tests numericos
- integration test com fixture controlada

TDD:

- criar caso de erro temporal conhecido antes.

Execution notes:

- 2026-04-15: V20-T04 concluida com `src/core/shot-alignment.ts`. O alinhamento pula frames iniciais sem recoil, interpola pontos por cadencia de tiro e propaga `shotAlignmentErrorMs` para `SprayMetrics`/benchmark; validado por unit e integracao controlada.

---

## V30 - Tracking Core

### V30-T01 - Extrair `ReticleObservation` como contrato proprio

Goal:

- dar shape unico para a observacao frame-a-frame da mira.

Read/Write:

- `src/types/engine.ts`
- `src/core/crosshair-tracking.ts`
- `src/workers/aim-analyzer-session.ts`

Depends on:

- V20-T04

Acceptance:

- existe contrato de observacao por frame com `x`, `y`, `confidence`, `visiblePixels`, `colorState`, `opticStateConfidence`, disturbios exogenos basicos;
- worker e engine usam o mesmo shape.

Tests:

- contract tests
- worker mapping tests

TDD:

- falhar primeiro por shape incompleto.

Execution notes:

- 2026-04-15: V30-T01 concluida. `ReticleObservation`/`TrackingFrameObservation` centralizam status, coordenadas, confianca, pixels visiveis, cor, optic state e perturbacoes exogenas; worker, mapper e metricas consomem o mesmo shape.

### V30-T02 - Adicionar refinamento subpixel do centro da mira

Goal:

- melhorar precisao espacial fina do tracker.

Read/Write:

- `src/core/crosshair-tracking.ts`
- `src/core/crosshair-tracking.test.ts`

Depends on:

- V30-T01

Acceptance:

- tracker refina o centro alem do pixel inteiro;
- `meanErrorPx` melhora ou se mantem nos goldens limpos;
- jitter artificial nao aumenta.

Tests:

- `npx vitest run src/core/crosshair-tracking.test.ts`
- runner de goldens

TDD:

- criar fixture/assercoes de erro fino antes.

Execution notes:

- 2026-04-15: V30-T02 concluida. `crosshair-tracking` refina o centro por pesos de intensidade e `crosshair-tracking.test.ts` cobre centroid subpixel assimetrico sem regressao nos goldens limpos.

### V30-T03 - Adicionar re-aquisicao explicita apos perda

Goal:

- tornar o tracker robusto quando a mira some temporariamente.

Read/Write:

- `src/core/crosshair-tracking.ts`
- `src/workers/aim-analyzer-session.ts`

Depends on:

- V30-T02

Acceptance:

- tracker mede `reacquisitionFrames`;
- perda curta nao vira drift permanente;
- `falseReacquisitionRate` entra no relatorio.

Tests:

- unit tests com oclusao temporaria
- golden degradado

TDD:

- fixture com muzzle flash/oclusao antes.

Execution notes:

- 2026-04-15: V30-T03 concluida. O tracker mede `reacquisitionFrames`, preserva lock apos perda curta/decoy, e o runner reporta `meanReacquisitionFrames` e `falseReacquisitionRate`; validado por testes unitarios e golden degradado.

### V30-T04 - Implementar multi-hypothesis tracking simples

Goal:

- manter mais de uma hipoteses leve antes de decretar perda total.

Read/Write:

- `src/core/crosshair-tracking.ts`

Depends on:

- V30-T03

Acceptance:

- tracker consegue avaliar ultima posicao confiavel, predicao temporal e candidato visual;
- cobertura degradada melhora sem piorar goldens limpos.

Tests:

- tracking goldens
- unit tests de prioridade das hipoteses

TDD:

- primeiro fixture onde o lock visual some por poucos frames.

Execution notes:

- 2026-04-15: V30-T04 concluida. O tracker avalia hipoteses de ultima posicao confiavel, predicao temporal, fallback de template e candidato visual, priorizando recuperacao conservadora em oclusao/decoy sem piorar os goldens limpos.

### V30-T05 - Auto-detectar cor da mira quando nao houver hint explicita

Goal:

- parar de depender demais do `targetColor` fornecido.

Read/Write:

- `src/core/crosshair-tracking.ts`
- `src/workers/aim-analyzer-session.ts`

Depends on:

- V30-T04

Acceptance:

- tracker diferencia ao menos `red`, `green`, `neutral`, `unknown`;
- fallback nao degrada os casos ja suportados.

Tests:

- unit tests com frames sinteticos
- goldens quando aplicavel

TDD:

- criar frame sintético verde/neutro antes.

Execution notes:

- 2026-04-15: V30-T05 concluida. `crosshair-tracking` detecta `red`, `green`, `neutral` e `unknown` quando nao ha hint explicita, e o worker propaga `colorState`; validado por frames sinteticos e teste de worker sem `crosshairColor`.

### V30-T06 - Adicionar preprocessamento visual antes do tracking

Goal:

- reforcar contraste local e reduzir ruido em casos degradados.

Read/Write:

- novo `src/core/video-normalization.ts`
- `src/core/crosshair-tracking.ts`

Depends on:

- V30-T05

Acceptance:

- pipeline pode aplicar normalizacao de forma opcional e testada;
- benchmark degradado melhora sem regressao nos limpos.

Tests:

- unit tests do normalizer
- tracking goldens

TDD:

- caso degradado falhando antes da normalizacao.

Execution notes:

- 2026-04-15: V30-T06 concluida. `src/core/video-normalization.ts` adiciona normalizacao opcional antes do tracking; `crosshair-tracking.test.ts` prova recuperacao de reticle degradado quando `normalizeBeforeTracking` esta ativo e `video-normalization.test.ts` cobre a transformacao.

---

## V40 - Context Perception

### V40-T01 - Criar baseline de compensacao de movimento global

Goal:

- separar movimento da camera de movimento da mira.

Read/Write:

- novo `src/core/global-motion-compensation.ts`
- `src/core/crosshair-tracking.ts`

Depends on:

- V30-T06

Acceptance:

- existe estimativa de movimento global por frame;
- tracking pode operar no frame compensado ou na coordenada corrigida.

Tests:

- unit tests
- fixture com shake artificial

TDD:

- fixture com deslocamento global conhecido antes.

Execution notes:

- 2026-04-15: V40-T01 concluida. `src/core/global-motion-compensation.ts` estima deslocamento global entre frames, `crosshair-tracking` usa a compensacao no fallback de template e reporta shake como perturbacao; validado por `global-motion-compensation.test.ts` e casos de camera shake em `crosshair-tracking.test.ts`.

### V40-T02 - Classificar perturbacoes exogenas por frame

Goal:

- parar de tratar muzzle flash, blur e shake como ruido generico.

Read/Write:

- `src/core/crosshair-tracking.ts`
- `src/workers/aim-analyzer-session.ts`
- `src/types/engine.ts`

Depends on:

- V40-T01

Acceptance:

- observacao por frame passa a ter score de `muzzleFlash`, `blur`, `shake`, `occlusion`;
- esses scores entram na confianca.

Tests:

- unit tests
- worker mapping tests

TDD:

- primeiro testar o shape e a propagacao no payload.

Execution notes:

- 2026-04-15: implementado no tracker streaming com score de `muzzleFlash`, `shake`, `blur` e `occlusion`; `muzzleFlash`/`shake` passam a reduzir a confianca de forma conservadora. Validado por testes unitarios, worker mapping, regressao de tracking e goldens.

### V40-T03 - Introduzir timeline de `opticState`

Goal:

- permitir leitura optica por frame quando aplicavel.

Read/Write:

- novo `src/core/optic-state-detection.ts`
- `src/workers/aim-analyzer-session.ts`
- `src/types/engine.ts`

Depends on:

- V40-T02

Acceptance:

- existe `opticState` e `opticStateConfidence` por frame ou trecho;
- casos sem evidencia podem voltar `unknown` honestamente.

Tests:

- contract tests
- fixtures simples quando disponiveis

TDD:

- primeiro testar `unknown` e propagacao segura.

Execution notes:

- 2026-04-15: criado `src/core/optic-state-detection.ts` com contrato de deteccao de optic state; hints confiaveis sao propagados com confianca clampada e ausencia de evidencia retorna `unknown` com confianca 0. Worker agora registra `opticState`/`opticStateConfidence` em todo frame.

### V40-T04 - Medir qualidade por trecho e por fase

Goal:

- deixar de usar so score global do clip.

Read/Write:

- `src/core/capture-quality.ts`
- `src/core/spray-metrics.ts`

Depends on:

- V40-T03

Acceptance:

- quality report pode ser consultado por fase ou trecho;
- burst, sustained e fatigue recebem qualidade herdada.

Tests:

- unit tests
- integration tests

TDD:

- criar fixture com trecho bom e trecho ruim no mesmo clip.

Execution notes:

- 2026-04-15: `SprayMetrics` agora inclui `phaseQuality` para `burst`, `sustained` e `fatigue`; `burstVCI/HNI`, `sustainedVCI/HNI` e `fatigueVCI/HNI` herdam a qualidade da respectiva fase. Validado com fixture sintética em que apenas o sustained degrada.

---

## V50 - Evidence & Calibration

### V50-T01 - Criar `TrackingEvidence` consolidado

Goal:

- consolidar tudo que o resto do produto precisa saber da analise de video.

Read/Write:

- `src/types/engine.ts`
- novo `src/core/tracking-evidence.ts`

Depends on:

- V40-T04

Acceptance:

- tipo inclui `trackingQuality`, `coverage`, `meanErrorPx`, `maxErrorPx`, `meanReacquisitionFrames`, `falseReacquisitionRate`, `confidenceCalibration`;
- contrato claro e testado.

Tests:

- contract tests

TDD:

- falhar primeiro por payload incompleto.

Execution notes:

- 2026-04-15: criado `TrackingEvidence` em `src/types/engine.ts` e `createTrackingEvidence` em `src/core/tracking-evidence.ts`, consolidando qualidade, coverage, erro espacial, re-aquisicao e calibracao de confianca. Funciona com referencia rotulada quando disponivel e com fallback por visibilidade observada quando nao ha labels.

### V50-T02 - Propagar confianca honesta do frame ate a metrica

Goal:

- fazer a metric quality refletir a percepcao real do video.

Read/Write:

- `src/core/spray-metrics.ts`
- `src/core/tracking-evidence.ts`

Depends on:

- V50-T01

Acceptance:

- coverage e confidence passam a herdar informacao de visibilidade, perturbacao e re-aquisicao;
- metrics deixam rastro auditavel da origem da confianca.

Tests:

- `npx vitest run src/core/spray-metrics.test.ts`

TDD:

- criar caso onde clip degradado derruba confidence de forma comprovavel.

Execution notes:

- 2026-04-15: `MetricEvidenceQuality` agora carrega `visibilityCoverage`, `disturbancePenalty`, `reacquisitionPenalty` e `confidenceSource`, permitindo auditar se a confianca veio do resumo legado ou dos frames. `calculateSprayMetrics` passa a derivar coverage/confidence dos `trackingFrames` quando disponiveis, penalizando perturbacoes exogenas, baixa visibilidade e re-aquisicao; clips legados sem disturbio explicito continuam tolerados via fallback.

### V50-T03 - Calibrar confianca do tracking contra goldens

Goal:

- reduzir overconfidence do motor.

Read/Write:

- `scripts/run-tracking-goldens.*`
- `src/core/tracking-golden-runner.test.ts`

Depends on:

- V50-T02

Acceptance:

- relatorio inclui `brierScore` e `expectedCalibrationError` por rodada;
- ha criterio claro de regressao de calibracao.

Tests:

- runner tests
- benchmark run

TDD:

- primeiro falhar por ausencia de criterio de calibracao.

Execution notes:

- 2026-04-15: goldens de tracking agora declaram thresholds versionados de calibracao (`maxBrierScore`, `maxExpectedCalibrationError`) e cada fixture reporta `calibrationPassed`. O runner passa a reprovar fixtures com confianca superestimada mesmo quando coverage/erro/status ainda estao dentro dos limites; o benchmark sintetico continua agregando Brier/ECE no resumo.

### V50-T04 - Criar viewer de revisao visual de tracking

Goal:

- permitir auditoria humana de erros do video.

Read/Write:

- novo `src/core/captured-frame-labeler-view.ts` ou modulo relacionado
- `src/app/analyze/spray-visualization.tsx`

Depends on:

- V50-T03

Acceptance:

- existe visualizacao com overlay de pontos, status e erro quando houver label;
- debugging visual de casos dificeis fica reproduzivel.

Tests:

- component tests quando viavel
- smoke manual documentado

TDD:

- nao obrigatorio; priorizar contrato visual claro.

Execution notes:

- 2026-04-15: V50-T04 concluida como foundation reutilizavel. `captured-frame-labeler-view` agora monta overlay de revisao juntando frames rastreados com labels humanos, expondo status, erro em pixels, normalizacao para canvas e resumo de mismatches/re-aquisicoes. `SprayVisualization` aceita `trackingReviewOverlay` opcional para desenhar pontos/status/linhas de erro quando houver labels. O servidor do labeler recebeu `renderCapturedFrameLabelerHtml` com workspace browser, botoes `tracked/uncertain/occluded/lost`, click-to-label e autosave. Validacao com `npx vitest run src/core/captured-frame-labeler-server.test.ts src/core/captured-frame-labeler-view.test.ts src/app/analyze/spray-visualization-paths.test.ts` e `npx tsc --noEmit`.

---

## V60 - Dataset & Benchmark

### V60-T01 - Definir estratos do benchmark de video

Goal:

- parar de crescer o dataset de forma aleatoria.

Read/Write:

- novo `docs/video-benchmark-spec.md`
- `src/types/benchmark.ts` se necessario

Depends on:

- V50-T03

Acceptance:

- existe tabela de buckets por resolucao, FPS, qualidade, oclusao, cor de mira, distancia e optic;
- cada bucket tem criterio de cobertura minima.

Tests:

- nao se aplica diretamente

TDD:

- nao se aplica; task de especificacao.

Execution notes:

- 2026-04-15: criado `docs/video-benchmark-spec.md` com buckets e cobertura minima por resolucao, FPS, qualidade, oclusao, cor de mira, distancia e optic. O spec tambem define gates Starter/Golden/Hardening, regras anti-explosao combinatoria, naming de clips e pair rules criticas para orientar V60-T02/V60-T03.

### V60-T02 - Criar fixtures sinteticas para shake, blur e perda curta

Goal:

- estressar a analise com casos controlados que ainda nao existem.

Read/Write:

- `tests/goldens/tracking/*`
- scripts auxiliares se necessario

Depends on:

- V60-T01

Acceptance:

- pelo menos 3 novas fixtures entram: shake, blur, reacquisition;
- runner executa todas.

Tests:

- tracking goldens

TDD:

- criar assercoes de erro/cobertura antes da fixture entrar como aceita.

Execution notes:

- 2026-04-15: adicionadas fixtures sinteticas `shake-occlusion-red`, `blurred-red-reticle` e `short-loss-reacquisition-red`. O runner de tracking foi estendido com `tracker` por fixture, `backgroundPattern: "anchor-blocks"`, `backgroundOffset` por frame e `shape: "blur"` para simular baixa nitidez controlada. `runTrackingGoldens` agora executa 5 fixtures com coverage 1, erro 0, calibracao reportada e `calibrationPassed` por fixture.

### V60-T03 - Fechar starter pack capturado de video quality

Goal:

- ter clips reais degradados e limpos para o novo stack.

Read/Write:

- `tests/goldens/benchmark/*`
- `docs/captured-clips-intake-*.md`
- `docs/captured-labeling-kit-*.md`

Depends on:

- V60-T02

Acceptance:

- starter pack inclui clips reais limpos e degradados;
- cada clip tem label minima de quality e tracking review.

Tests:

- benchmark run

TDD:

- nao se aplica diretamente; depende de intake e review.

Execution notes:

- 2026-04-15: starter pack capturado validado com `npx tsx scripts/run-benchmark.ts tests/goldens/benchmark/captured-benchmark-draft.json`: 4 clips reais, 2 clean/2 degraded, tracking/diagnostics/coach `4/4`, Brier `0.0776`, ECE `0.097`. Documentacao de intake, labeling kit, coverage e benchmark runner foi atualizada para refletir que os labels minimos existem e que `reviewed` conta para starter, enquanto promocao ampla para `golden` continua exigindo segunda revisao humana.

### V60-T04 - Integrar benchmark de video ao CI

Goal:

- impedir regressao silenciosa de percepcao.

Read/Write:

- `.github/workflows/ci.yml`
- scripts de benchmark

Depends on:

- V60-T03

Acceptance:

- CI roda benchmark de video ou gate resumido;
- regressao de coverage, erro ou calibracao falha o job.

Tests:

- validacao do workflow
- dry run local se possivel

TDD:

- primeiro definir threshold e teste do runner.

Execution notes:

- 2026-04-15: `.github/workflows/ci.yml` ja executa `npm run benchmark:gate` no job `quality`, apos typecheck e Vitest. Validacao local com `npm run benchmark:gate` passou: synthetic benchmark sem regressao, captured benchmark `4/4`, coverage validation `starter gate: PASS`. Nenhuma alteracao no workflow foi necessaria.

---

## V70 - Product Integration

### V70-T01 - Expor `VideoQualityReport` no resultado da analise

Goal:

- fazer a camada de produto ver a qualidade do clip.

Read/Write:

- `src/types/engine.ts`
- `src/app/analyze/results-dashboard.tsx`
- `src/actions/history.ts`
- `src/db/schema.ts` se necessario

Depends on:

- V10-T04
- V50-T01

Acceptance:

- resultado mostra quality score e motivos de degradacao;
- historico preserva a informacao minima relevante.

Tests:

- contract tests
- dashboard tests

TDD:

- falhar primeiro por campo ausente no resultado.

Execution notes:

- 2026-04-15: V70-T01 concluida. `AnalysisResult` agora expoe `videoQualityReport`, `analysis-client` anexa `video.qualityReport` ao resultado agregado e aos sub-sprays, `history` preserva o campo explicitamente no `fullResult`, e o dashboard mostra score, status e motivos de degradacao do clip. Red inicial em `analysis-client.contract.test.ts` e `results-dashboard.contract.test.ts`; validacao green com `npx vitest run src/app/analyze/analysis-client.contract.test.ts src/app/analyze/results-dashboard.contract.test.ts`, `npx tsc --noEmit` e `npx vitest run src/core/video-ingestion.test.ts src/app/analyze/analysis-client.contract.test.ts src/app/analyze/results-dashboard.contract.test.ts src/app/analyze/tracking-summary.test.ts`.

### V70-T02 - Expor janela do spray, perda e re-aquisicao na UI tecnica

Goal:

- dar transparencia real sobre como o video foi lido.

Read/Write:

- `src/app/analyze/results-dashboard.tsx`
- `src/app/analyze/tracking-summary.ts`

Depends on:

- V20-T03
- V30-T03

Acceptance:

- UI consegue mostrar coverage, frames lost, reacquisition e janela efetiva do spray;
- sem esconder degradacao do tracking.

Tests:

- `npx vitest run src/app/analyze/tracking-summary.test.ts`
- dashboard tests

TDD:

- criar caso de summary com perda/re-aquisicao antes.

Execution notes:

- 2026-04-15: V70-T02 concluida. `tracking-summary` agora deriva janela efetiva analisada, eventos de re-aquisicao, media e maximo de frames ate reacoplar; agregados somam janela e re-aquisicoes entre sub-sprays. O dashboard exibe `Leitura tecnica do tracking` com janela efetiva, frames perdidos, re-aquisicoes, maior reacoplamento e breakdown `tracked/uncertain/occluded/lost`. Red inicial em `tracking-summary.test.ts` e `results-dashboard.contract.test.ts`; validacao green com `npx vitest run src/app/analyze/tracking-summary.test.ts`, `npx vitest run src/app/analyze/results-dashboard.contract.test.ts`, `npx tsc --noEmit` e `npx vitest run src/app/analyze/tracking-summary.test.ts src/app/analyze/results-dashboard.contract.test.ts src/app/analyze/analysis-client.contract.test.ts src/core/video-ingestion.test.ts`.

### V70-T03 - Atualizar copy e FAQ para a nova realidade da analise de video

Goal:

- alinhar discurso do produto ao motor real.

Read/Write:

- `README.md`
- `src/ui/components/faq-accordion.tsx`
- `src/app/analyze/analysis-guide.tsx`
- `src/i18n/*.ts`

Depends on:

- V70-T01
- V70-T02

Acceptance:

- texto explica que o sistema mede qualidade do clip, pode bloquear analise ruim e usa confianca real;
- linguagem nao promete perfeicao absoluta.

Tests:

- smoke manual de textos criticos
- Playwright targeted se necessario

TDD:

- nao obrigatorio.

Execution notes:

- 2026-04-15: V70-T03 concluida. README, FAQ, guia de analise e i18n `pt-BR/en/es` agora explicam que o sistema mede qualidade do clip, pode bloquear videos ruins, mostra confianca/cobertura/perdas/re-aquisicao e recomenda faixas de teste em vez de prometer sensibilidade perfeita. Validacao com `npx tsc --noEmit` e smoke textual via `Select-String` para termos criticos de qualidade, confianca, cobertura, re-aquisicao e bloqueio.

## 6. Ordem recomendada de execucao

Ordem recomendada:

1. `V00` inteiro
2. `V10` inteiro
3. `V20-T01..T03`
4. `V30-T01..T03`
5. `V40-T01..T02`
6. `V50-T01..T03`
7. `V60-T01..T02`
8. `V30-T04..T06`
9. `V40-T03..T04`
10. `V20-T04`
11. `V60-T03..T04`
12. `V70` inteiro
13. `V50-T04` como ferramenta de auditoria e hardening continuo

Critical path real:

`baseline -> quality gating -> spray window -> tracking core -> confidence propagation -> benchmark -> UX`

## 7. Gates por stream

### Gate A - Honest baseline

Para sair de `V00`:

- relatorio baseline existe;
- runner de tracking mede erro e calibracao;
- erro do pipeline inteiro esta observavel.

### Gate B - Clip quality first

Para sair de `V10`:

- `VideoQualityReport` existe;
- qualidade de clip entra na ingestao;
- UI mostra motivo de bloqueio.

### Gate C - Tracking robustness

Para sair de `V30`:

- tracking subpixel entra;
- re-aquisicao existe;
- benchmark degradado melhora sem quebrar limpos.

### Gate D - Context-aware perception

Para sair de `V40`:

- movimento global e perturbacoes entram na percepcao;
- quality por fase existe;
- optic state pode ser `unknown` honestamente.

### Gate E - Calibrated evidence

Para sair de `V50`:

- `TrackingEvidence` existe;
- metricas herdam confianca real;
- calibracao do tracking entra nos relatorios.

### Gate F - Benchmarked product

Para sair de `V60` + `V70`:

- benchmark de video roda com corpus minimo;
- CI protege regressao;
- produto mostra quality, coverage, janela e perda sem maquiagem.

## 8. Checklist final de precisao pratica

- [ ] o sistema bloqueia clips ruins corretamente
- [ ] o sistema isola a janela real do spray
- [ ] o tracker nao colapsa em oclusao curta
- [ ] erro espacial caiu em goldens relevantes
- [ ] erro temporal caiu em fixture controlada
- [ ] confianca esta calibrada
- [ ] benchmark cobre limpo, degradado, shake, blur e re-aquisicao
- [ ] UI mostra quando o video nao sustenta conclusao forte
- [ ] melhoria do video melhora as metricas que alimentam diagnostico e sens

## 9. Observacao final

O risco mais comum nessa etapa e gastar energia demais em "um tracker mais esperto" e esquecer o resto da pilha.

Para este projeto, analise de video muito melhor so aparece quando as quatro coisas andam juntas:

- qualidade do clip;
- tempo certo;
- localizacao certa;
- confianca certa.

Se uma delas ficar atras, o sistema continua parecendo sofisticado sem ficar realmente confiavel.
