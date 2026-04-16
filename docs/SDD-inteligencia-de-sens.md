# SDD - Inteligencia de Sens por Video

## 0. Relacao com os documentos atuais

Este SDD complementa `docs/SDD-analise-spray.md`.

O documento de spray ja cobre o pipeline amplo de analise, tracking, metricas, diagnostico e coaching. O gap que continua aberto e especifico: como transformar evidencias de video em recomendacao de sens mais precisa, mais honesta e mais util para o jogador.

Este documento fecha esse gap.

Ele tambem conversa diretamente com:

- `docs/SPRAY-ANALYSIS-EXECUTION-PLAN.md`
- `docs/sdd-compliance-2026-04-14.md`
- `src/core/sensitivity-engine.ts`
- `src/game/pubg/effective-sens.ts`
- `src/core/crosshair-tracking.ts`
- `src/core/video-ingestion.ts`
- `src/app/analyze/results-dashboard.tsx`

## 1. Resumo executivo

Hoje o projeto ja consegue sair de `video -> tracking -> metrics -> diagnoses -> sensitivity -> coach`.

Isso e bom o bastante para um produto local coerente, mas ainda nao e bom o bastante para uma recomendacao de sens "perfeita" ou realmente confiavel.

O principal motivo e simples:

- a recomendacao atual ainda mistura heuristica de perfil (`playStyle`, `gripStyle`) com residual medido;
- o motor atual ainda gera tres perfis por spread fixo e curto;
- as miras ainda sao recomendadas de forma quase espelhada ao `general`;
- a confianca ainda nao governa o quanto o sistema pode sugerir mudancas;
- um unico clip ainda consegue empurrar uma recomendacao com agressividade maior do que deveria.

O alvo deste SDD e trocar esse comportamento por um motor de "video -> sens" com as seguintes propriedades:

1. patch-aware;
2. optic-aware;
3. distance-aware;
4. residual-aware por fase do spray;
5. confidence-aware de ponta a ponta;
6. fisicamente viavel para o mousepad e setup atual;
7. calibrado para sugerir mudancas pequenas, reversiveis e testaveis.

O resultado esperado nao e "acertar um numero magico em um clip".

O resultado esperado e:

- reduzir a taxa de sugestao errada;
- reduzir a agressividade em video ruim;
- produzir perfis de teste melhores;
- permitir que 3 a 5 clips levem a uma convergencia de sens muito mais estavel do que hoje.

## 2. Objetivo deste SDD

Definir um sistema completo para recomendacao de sens baseada em video que:

- use evidencias reais do clip, nao so faixas heuristicas;
- trate qualidade de video e confianca como parte do motor, nao como detalhe de UI;
- gere tres perfis com papel claro: controle, balanceado e velocidade;
- limite sugestoes agressivas quando a evidencia for fraca;
- permita validacao empirica por benchmark, por clips capturados e por uso real;
- seja implementavel no repositorio atual sem reescrever o produto inteiro.

## 3. Entendimento confirmado

### 3.1 O que o produto ja faz

O sistema atual ja possui:

- ingestao de video com contrato de duracao, mime, resolucao e FPS em `src/core/video-ingestion.ts`;
- tracker baseline de crosshair com ROI e template matching em `src/core/crosshair-tracking.ts`;
- metricas de spray e residual por tiro em `src/types/engine.ts` e `src/core/spray-metrics.ts`;
- diagnostico deterministico em `src/core/diagnostic-engine.ts`;
- recomendacao de sens em `src/core/sensitivity-engine.ts`;
- coaching evidence-linked em `src/core/coach-engine.ts`;
- dashboard de resultado em `src/app/analyze/results-dashboard.tsx`;
- historico e persistencia parcial em `src/db/schema.ts`.

### 3.2 O que esta faltando

O produto ainda nao possui um motor de recomendacao de sens com estas propriedades minimas:

- busca real em espaco de candidatos;
- funcao objetivo baseada em residual por fase;
- fronteira de candidatos aceitaveis em vez de spread fixo;
- agregacao multi-clip;
- tiers de recomendacao guiados por confianca;
- persistencia de evidencia especifica da recomendacao;
- calibracao quantitativa da recomendacao.

### 3.3 O que "mais preciso" quer dizer aqui

Para este projeto, "mais preciso" nao quer dizer "mais agressivo" e nem "mais inteligente no texto".

Quer dizer:

- sugerir menos mudancas erradas;
- sugerir mudancas menores quando a evidencia e limitada;
- sugerir mudancas maiores apenas quando a evidencia e forte;
- separar erro do jogador de ruido visual do video;
- levar em conta distancia, optic state, attachment state, VSM e espaco fisico;
- convergir para ajustes repetiveis em multiplos clips.

## 4. Estado atual implementado

### 4.1 Forcas reais do repositorio hoje

O codigo atual ja tem bases muito boas para essa evolucao:

- `ShotRecoilResidual` ja existe;
- `metricQuality` ja existe;
- `effective_yaw` e `effective_pitch` ja existem em `src/game/pubg/effective-sens.ts`;
- o dashboard ja apresenta recomendacao, perfis e VSM;
- `analysisSessions` e `sensitivityHistory` ja permitem guardar parte do historico.

### 4.2 Gargalos confirmados no codigo atual

O motor atual em `src/core/sensitivity-engine.ts` ainda faz isto:

- usa `playStyle` e `gripStyle` para definir uma faixa base;
- aplica um ajuste curto em cima do `idealCm360`;
- gera tres perfis por spread aproximado de `6%`;
- escolhe o recomendado a partir de polaridade residual ou diagnostico dominante;
- calcula `suggestedVSM` por regra curta;
- usa o `generalSlider` como recomendacao quase uniforme para scopes.

Isso e util como baseline, mas insuficiente como sistema de recomendacao de sens de alta precisao.

### 4.3 Limites praticos do estado atual

Hoje ainda existe risco de:

- overfit em um clip isolado;
- subestimar impacto de distancia;
- recomendar scopes de forma simplificada demais;
- sugerir mudanca de sens quando o problema principal e captura ruim;
- nao separar direito "problema mecanico" de "evidencia degradada".

## 5. Escopo funcional

## 5.1 Escopo V1 obrigatorio

O novo motor obrigatoriamente precisa:

- receber um bloco explicito de `SensitivityEvidence`;
- pontuar qualidade de captura antes de recomendar mudanca;
- avaliar candidatos de sens em torno da sens atual;
- usar residual por fase do spray;
- respeitar mousepad, DPI, FOV, VSM, optic e distancia;
- produzir tres perfis a partir de uma fronteira de candidatos aceitaveis;
- emitir tier de recomendacao;
- suportar agregacao de 3 a 5 clips da mesma configuracao;
- expor reasoning tecnico legivel e auditavel.

## 5.2 Escopo recomendado

- timeline de `optic_state` por frame;
- score de higiene de captura;
- persistencia de candidato vencedor e runner-ups;
- calibracao de confianca com corpus capturado;
- validacao de aceitacao no historico do usuario.

## 5.3 Fora de escopo inicial

- mudar configuracao do jogo automaticamente;
- treinar modelo opaco end-to-end sem audit trail;
- recomendacao cross-game;
- personalizacao por comunidade antes de fechar benchmark real.

## 6. Principios de produto e ciencia

### 6.1 Medida antes de opiniao

O motor nao deve comecar pela pergunta "qual faixa combina com esse jogador?".

Ele deve comecar pela pergunta:

"dado o erro observado neste clip, quais configuracoes reduzem melhor esse erro sem violar as restricoes fisicas e sem forcar adaptacao absurda?"

### 6.2 Confianca governa agressividade

Se tracking, optic state ou qualidade visual estiverem degradados, a recomendacao deve ficar mais conservadora.

Se estiverem ruins demais, o sistema nao deve recomendar mudanca de sens. Deve pedir novo clip.

### 6.3 Pequenas mudancas vencem grandes palpites

Para sens, o sistema deve preferir:

- ajustes pequenos;
- ajustes reversiveis;
- perfis de teste claros;
- comparacao antes/depois.

### 6.4 Single clip nao fecha verdade final

Um unico clip pode:

- indicar direcao;
- sugerir perfis de teste;
- sinalizar problema dominante.

Um unico clip nao deve:

- cravar sens final;
- empurrar mudanca grande;
- vencer sozinho contra historico consistente multi-clip.

### 6.5 Patch e estado otico sao parte do dominio

Recomendacao de sens sem patch e sem optic state correto nao e recomendacao confiavel.

## 7. Arquitetura alvo

### 7.1 Fluxo alvo

```text
video intake
  -> capture quality scoring
  -> crosshair tracking + status timeline
  -> trajectory + shot residuals
  -> sensitivity evidence builder
  -> candidate generator
  -> objective evaluator
  -> confidence calibrator
  -> profile frontier selector
  -> recommendation tiering
  -> coach renderer
  -> persistence + validation history
```

### 7.2 Componentes propostos

#### A. Capture Quality Scorer

Responsabilidade:

- medir se o clip sustenta recomendacao de sens;
- calcular sinais como FPS estavel, nitidez da mira, visibilidade, oclusao, compression burden e cobertura temporal.

Read/Write recomendado:

- `src/core/video-ingestion.ts`
- novo `src/core/capture-quality.ts`
- `src/types/engine.ts`

#### B. Sensitivity Evidence Builder

Responsabilidade:

- consolidar tudo que o otimizador precisa;
- transformar `metrics`, `shotResiduals`, `metricQuality`, contexto de patch e dados do perfil do jogador em um unico contrato.

Read/Write recomendado:

- novo `src/core/sensitivity-evidence.ts`
- `src/types/engine.ts`

#### C. Candidate Generator

Responsabilidade:

- gerar candidatos em torno da sens atual;
- explorar `general`, `ads`, `scope`, `verticalMultiplier`;
- respeitar faixa fisica do setup.

Read/Write recomendado:

- `src/core/sensitivity-engine.ts`
- `src/game/pubg/effective-sens.ts`

#### D. Objective Evaluator

Responsabilidade:

- calcular custo de cada candidato;
- penalizar erro residual, jitter, inviabilidade fisica e custo de adaptacao.

Read/Write recomendado:

- `src/core/sensitivity-engine.ts`
- novo `src/core/sensitivity-objective.ts`

#### E. Frontier Selector

Responsabilidade:

- escolher:
  - melhor candidato global;
  - melhor candidato de controle;
  - melhor candidato de velocidade.

Ou seja, os perfis deixam de ser um spread fixo e passam a ser membros de uma fronteira aceitavel.

#### F. Recommendation Tiering

Responsabilidade:

- decidir se a saida e:
  - `capture_again`
  - `test_profiles`
  - `apply_ready`

#### G. Persistence and Validation

Responsabilidade:

- guardar o que foi recomendado;
- guardar com que evidencia foi recomendado;
- medir se o usuario convergiu ou rejeitou a recomendacao depois.

## 8. Modelo matematico alvo

### 8.1 Base canonica

Para qualquer candidato `c`:

```text
c = {
  general_slider,
  ads_slider,
  scope_slider(scope_state),
  vertical_multiplier
}
```

O modelo deve continuar ancorado em:

```text
effective_yaw =
    phi_patch
  * general_internal
  * ads_internal
  * scope_internal
  * optic_multiplier

effective_pitch =
    effective_yaw
  * vertical_multiplier
```

### 8.2 Residual por tiro

Para cada tiro `n`:

```text
residual_n =
    observed_n
  - expected_n
```

Onde `expected_n` precisa ser calculado a partir de:

- arma;
- patch;
- muzzle;
- grip;
- stock;
- stance;
- optic state;
- FOV/projecao;
- distancia.

### 8.3 Fases obrigatorias

O motor precisa otimizar ao menos sobre:

- `burst`
- `sustained`
- `fatigue`

O peso por fase nao precisa ser fixo, mas precisa existir.

### 8.4 Funcao objetivo recomendada

Para cada candidato `c`:

```text
J(c) =
    w1 * residual_vertical(c)
  + w2 * residual_horizontal(c)
  + w3 * phase_instability(c)
  + w4 * distance_penalty(c)
  + w5 * pad_violation_penalty(c)
  + w6 * adaptation_cost(c)
  + w7 * low_confidence_penalty(c)
```

Onde:

- `residual_vertical(c)` mede erro vertical normalizado por fase;
- `residual_horizontal(c)` mede erro lateral normalizado por fase;
- `phase_instability(c)` penaliza candidato que melhora um trecho e piora outro;
- `distance_penalty(c)` aumenta o custo quando o erro linear no alvo continua alto;
- `pad_violation_penalty(c)` impede recomendacao fisicamente inviavel;
- `adaptation_cost(c)` penaliza grandes mudancas sem ganho suficiente;
- `low_confidence_penalty(c)` reduz agressividade quando a evidencia esta degradada.

### 8.5 Restricao de adaptacao

O motor deve preferir candidatos com delta pequeno contra a configuracao atual.

Exemplo de regra:

```text
adaptation_cost =
    a1 * abs(delta_general_pct)
  + a2 * abs(delta_ads_pct)
  + a3 * abs(delta_scope_pct_mean)
  + a4 * abs(delta_vsm_pct)
```

Isso evita:

- recomendacao "perfeita" na matematica e pessima na pratica;
- ajuste gigante para ganho minimo;
- sugerir "mudar tudo" quando bastava mexer em VSM ou 1x/4x.

### 8.6 Fronteira de perfis

Os tres perfis devem nascer assim:

- `balanced`: candidato com menor `J(c)`;
- `low`: candidato mais controlador cujo `J(c)` ainda esteja perto do minimo;
- `high`: candidato mais rapido cujo `J(c)` ainda esteja perto do minimo.

Exemplo de envelope:

```text
acceptable(c) = J(c) <= J(best) * 1.05
```

Dentro do envelope:

- `low` maximiza `cm_per_360`;
- `high` minimiza `cm_per_360`;
- `balanced` minimiza `J(c)`.

Isso e muito melhor do que um spread fixo de `+/- 6%`.

## 9. Contratos de dados propostos

### 9.1 Novos tipos obrigatorios

```ts
interface SensitivityEvidence {
  patchVersion: string;
  weaponId: string;
  opticId: string;
  opticStateId?: string;
  distanceMeters: number;
  dpi: number;
  mousepadWidthCm: number;
  current: {
    general: number;
    ads: number;
    scopes: Record<string, number>;
    vsm: number;
  };
  clipQuality: {
    score: number;
    fpsConfidence: number;
    visibilityConfidence: number;
    compressionConfidence: number;
    opticStateConfidence: number;
  };
  metrics: SprayMetrics;
  diagnoses: readonly Diagnosis[];
}
```

```ts
interface SensitivityCandidateScore {
  candidateId: string;
  general: number;
  ads: number;
  scopes: Record<string, number>;
  vsm: number;
  objective: number;
  objectiveBreakdown: {
    verticalResidual: number;
    horizontalResidual: number;
    instability: number;
    distancePenalty: number;
    padPenalty: number;
    adaptationCost: number;
    confidencePenalty: number;
  };
  expectedCm360: number;
  confidence: number;
}
```

```ts
type SensitivityRecommendationTier =
  | 'capture_again'
  | 'test_profiles'
  | 'apply_ready';
```

### 9.2 Persistencia recomendada

Opcao minima:

- armazenar tudo dentro de `analysisSessions.fullResult`.

Opcao correta:

- adicionar `sensitivity_recommendation_snapshots`;
- adicionar `sensitivity_validation_runs`.

Minimo recomendado para o repositorio:

```text
sensitivity_recommendation_snapshots
- id
- session_id
- tier
- recommended_profile_type
- recommended_payload
- candidate_scores
- evidence_summary
- created_at
```

```text
sensitivity_validation_runs
- id
- user_id
- recommendation_snapshot_id
- clip_count
- accepted_profile_type?
- outcome_score?
- created_at
```

## 10. Captura e analise de video para recomendacao de sens

### 10.1 Requisitos minimos de clip

Para sens, o clip precisa ser mais limpo do que o clip minimo de demonstracao.

Contrato recomendado:

- um spray principal por clip;
- sem cortes;
- sem zoom de editor;
- HUD e optic state visiveis quando possivel;
- distancia conhecida ou inferivel com confianca;
- duracao curta;
- preferencia por 60 FPS ou mais;
- crosshair com contraste suficiente.

### 10.2 Sinais de qualidade obrigatorios

O score de captura precisa considerar:

- `fps_stability`
- `crosshair_visibility`
- `occlusion_burden`
- `compression_burden`
- `roi_lock_stability`
- `optic_state_confidence`
- `residual_coverage`

### 10.3 Gates de bloqueio

Se qualquer um destes casos acontecer, a recomendacao nao deve sair como mudanca de sens:

- `trackingQuality` abaixo do minimo;
- `shotResiduals` insuficientes;
- `opticStateConfidence` baixa em mira variavel;
- `clipQuality.score` baixo;
- conflito alto entre clips do mesmo bloco.

Nesses casos, a saida correta e:

- `capture_again`, com instrucao objetiva de recaptura.

## 11. Agregacao multi-clip

### 11.1 Regra central

Recomendacao de sens so fica realmente confiavel com repeticao.

O sistema deve suportar bloco de validacao com `3-5` clips da mesma configuracao:

- mesma arma;
- mesmo patch;
- mesma mira;
- mesma distancia alvo;
- mesmo conjunto de attachments;
- mesma sens atual.

### 11.2 Agregacao recomendada

Para cada clip, o motor produz um ranking de candidatos.

Depois, agrega por:

- media ponderada por confianca para custo objetivo;
- mediana ponderada para deltas finais;
- penalidade por discordancia entre clips.

Exemplo:

```text
aggregate_score(c) =
    confidence_weighted_mean(J_clip_i(c))
  + disagreement_penalty(c)
```

### 11.3 Regra de discordancia

Se clips diferentes pedirem direcoes opostas com confianca parecida, a recomendacao nao deve ser "chutar o meio".

Ela deve:

- cair de `apply_ready` para `test_profiles`; ou
- virar `capture_again` se a discordancia for alta demais.

## 12. UX da recomendacao

### 12.1 Tiers de saida

#### `capture_again`

Mostrar:

- porque o clip nao sustenta recomendacao;
- o que precisa melhorar na captura;
- quais sinais ficaram fracos.

#### `test_profiles`

Mostrar:

- tres perfis de teste;
- delta contra a configuracao atual;
- explicacao curta;
- ordem sugerida de teste.

#### `apply_ready`

Mostrar:

- perfil vencedor;
- por que venceu;
- confianca;
- qual evidencia sustentou a decisao;
- qual bloco de validacao confirmou a recomendacao.

### 12.2 O que o dashboard deve explicar

O dashboard precisa responder quatro perguntas sem enrolacao:

1. O que o video mostrou?
2. O que o sistema recomenda mudar?
3. Quanta confianca existe nessa mudanca?
4. Como validar no proximo bloco?

### 12.3 O que o dashboard nao deve fazer

- fingir certeza total;
- esconder conflito entre clips;
- recomendar scope grande sem mostrar evidencia;
- vender sens como verdade final em um unico clip.

## 13. Benchmark e validacao

### 13.1 Estratos obrigatorios

O benchmark de sens precisa cobrir combinacoes de:

- arma;
- optic;
- optic state;
- distancia;
- attachments;
- qualidade de video;
- oclusao;
- resolucao/FPS;
- perfil mecanico de erro.

### 13.2 Metricas de sistema

O motor precisa ser medido por algo melhor do que "parece bom":

- `direction_accuracy`
  - a direcao sugerida estava certa?
- `objective_lift`
  - o candidato vencedor reduz custo contra a baseline atual?
- `false_change_rate`
  - quantas vezes o sistema sugeriu mudar quando devia segurar?
- `tier_calibration`
  - `apply_ready` realmente acerta mais do que `test_profiles`?
- `multi_clip_stability`
  - o bloco de clips converge ou oscila?
- `ece`
  - expected calibration error da confianca.

### 13.3 Gates recomendados

O projeto so deve promover esse motor como pronto quando bater, no minimo:

- `false_change_rate <= 0.10`
- `ece <= 0.08`
- `multi_clip_stability >= 0.85`
- `apply_ready precision >= 0.85`
- `capture_again recall >= 0.80` para clips degradados

Os valores exatos podem ser recalibrados depois, mas o contrato de ter gates numericos e obrigatorio.

## 14. Fases de rollout

### 14.1 Fase S0 - Contratos e evidencia

Goal:

- fechar os tipos e os sinais que alimentam a recomendacao.

Read/Write:

- `src/types/engine.ts`
- novo `src/core/sensitivity-evidence.ts`
- `src/core/video-ingestion.ts`

Acceptance:

- existe `SensitivityEvidence`;
- existe score de qualidade de captura;
- recommendation tier existe no contrato.

### 14.2 Fase S1 - Otimizador single-clip

Goal:

- substituir spread fixo por avaliacao de candidatos.

Read/Write:

- `src/core/sensitivity-engine.ts`
- novo `src/core/sensitivity-objective.ts`
- `src/core/sensitivity-engine.test.ts`

Acceptance:

- perfis saem de fronteira aceitavel;
- `playStyle` e `gripStyle` viram prior/context;
- reasoning expõe custo e breakdown.

### 14.3 Fase S2 - Tiers e gates de confianca

Goal:

- impedir recomendacao forte com evidencia fraca.

Read/Write:

- `src/core/sensitivity-engine.ts`
- `src/app/analyze/results-dashboard.tsx`

Acceptance:

- existem tiers `capture_again`, `test_profiles`, `apply_ready`;
- UI mostra por que caiu em cada tier.

### 14.4 Fase S3 - Multi-clip consensus

Goal:

- sair do single clip como unidade principal de decisao.

Read/Write:

- `src/types/engine.ts`
- `src/actions/history.ts`
- `src/app/history/[id]/page.tsx`
- persistencia nova se adotada

Acceptance:

- blocos de 3-5 clips geram consenso;
- sistema mede discordancia entre clips.

### 14.5 Fase S4 - Calibracao e benchmark real

Goal:

- fechar validade externa da recomendacao.

Read/Write:

- `tests/goldens/...`
- runners de benchmark
- relatorios em `docs/`

Acceptance:

- gates numericos ativos;
- relatorio de calibracao reproducivel.

## 15. Definition of Done

O motor novo so pode ser considerado pronto quando:

1. a recomendacao deixa de depender de spread fixo como nucleo;
2. a recomendacao nasce de candidatos avaliados;
3. confianca governa agressividade da sugestao;
4. existe tier de recomendacao;
5. o dashboard explica a evidencia da recomendacao;
6. multi-clip consensus existe;
7. benchmark numerico existe;
8. gates de regressao e calibracao existem;
9. o sistema consegue dizer "nao sei" de forma correta.

## 16. Assumptions

- o setup do usuario cadastrado esta razoavelmente correto;
- `effective_yaw` e `effective_pitch` continuam como base canonica;
- o produto continua local-first para analise do clip;
- o tracker atual ainda e baseline e nao verdade absoluta;
- a melhor recomendacao de sens depende tanto de matematica quanto de prudencia de produto.

## 17. Decision log

### D1 - `playStyle` e `gripStyle` continuam existindo

Decisao:

- manter como prior/context.

Motivo:

- ainda ajudam a filtrar candidatos inviaveis ou improvaveis;
- nao devem decidir a recomendacao principal sozinhos.

### D2 - Tres perfis continuam existindo

Decisao:

- manter `low`, `balanced`, `high`.

Motivo:

- o produto ja comunica bem esse formato;
- o problema nao e ter tres perfis, e como eles nascem.

### D3 - Recomendacao forte exige bloco multi-clip

Decisao:

- `apply_ready` nao deve depender de um clip isolado.

Motivo:

- reduz erro de sugestao;
- aumenta confiabilidade pratica.

### D4 - Melhor "nao recomendar" do que recomendar mal

Decisao:

- `capture_again` e saida valida do motor.

Motivo:

- honestidade de produto vale mais que cobertura artificial.

## 18. Veredito final

O proximo salto de qualidade deste projeto nao esta em escrever um coach mais eloquente.

Ele esta em fechar um motor dedicado de inteligencia de sens por video.

O repositorio ja tem quase todas as pecas necessarias:

- ingestao;
- tracking;
- residual;
- diagnostico;
- matematica de sens;
- UI de resultado;
- historico.

O que falta e ligar essas pecas sob um contrato melhor:

- com qualidade de captura;
- com otimizacao por candidato;
- com confianca propagada;
- com fronteira de perfis;
- com consenso multi-clip;
- com validacao empirica.

Quando isso existir, as dicas de sens vao deixar de ser "heuristica convincente" e vao passar a ser "recomendacao calibrada, auditavel e muito mais precisa".
