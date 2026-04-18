# SDD - Coach Extremo

Status: implemented
Data: 2026-04-18
Projeto: `sens-pubg`

Documentos companheiros:

- `docs/SDD-analise-spray.md`
- `docs/SDD-inteligencia-de-sens.md`
- `docs/sdd-compliance-2026-04-16.md`
- `docs/plans/2026-04-18-coach-extremo.md`

## 0. Relacao com o estado atual

O repositorio ja possui um coach funcional, patch-aware em attachments e com fallback seguro quando a evidencia esta fraca.

Isso e melhor do que um "texto bonito" sem lastro.

Mas o coach atual ainda e, na pratica, uma camada de copy evidence-linked em cima de diagnosticos isolados. Ele nao opera como um sistema completo de decisao, priorizacao, plano adaptativo e memoria de progresso.

Arquivos que definem o estado atual:

- `src/core/diagnostic-engine.ts`
- `src/core/sensitivity-engine.ts`
- `src/core/coach-engine.ts`
- `src/core/coach-llm-adapter.ts`
- `src/core/analysis-result-coach-enrichment.ts`
- `src/core/sensitivity-history-convergence.ts`
- `src/core/coach-llm-contract.ts`
- `src/server/coach/groq-coach-client.ts`
- `src/app/analyze/results-dashboard.tsx`
- `src/types/engine.ts`

Este SDD define o salto necessario para transformar o coach em um subsistema extremo, completo e auditavel.

## 1. Resumo executivo

Hoje o coach consegue:

- transformar cada diagnostico em uma orientacao util;
- respeitar patch e estado de optic;
- sugerir attachments compativeis com o patch;
- reduzir agressividade quando confidence e coverage estao fracos;
- opcionalmente reescrever o texto com LLM sem deixar o modelo inventar metricas.

Hoje o coach ainda nao consegue:

- decidir o que realmente importa mais agora entre varios problemas;
- reconciliar diagnosticos, sensibilidade, qualidade de captura e historico em um plano unico;
- construir um protocolo de treino em blocos;
- usar memoria real de recorrencia e sucesso/fracasso;
- explicar dependencias entre causas;
- operar em horizontes de sessao, bloco e programa;
- ser benchmarkado como "motor de coaching", e nao apenas como "texto do card".

Objetivo deste SDD:

- elevar o coach de "renderer de diagnosticos" para "orquestrador deterministico de melhoria";
- manter a IA como camada opcional de linguagem e variacao, nunca como fonte primaria da verdade;
- entregar um contrato de coach que a IA consiga implementar com tasks atomicas, sem ambiguidade.

## 2. Definicao de "coach completo e perfeito"

Para este projeto, "perfeito" nao significa prometer certeza absoluta.

Significa que o coach:

- sabe quando orientar captura, quando orientar treino e quando orientar ajuste real;
- prioriza no maximo 1 a 3 focos acionaveis por vez;
- usa toda a evidencia disponivel, nao so o primeiro diagnostico;
- respeita patch, optic, distancia, stance, attachments e tier de sens;
- reconhece conflito entre sinais e baixa agressividade quando necessario;
- gera um plano validavel no proximo bloco;
- aprende com historico e aceita dizer "nao conclui ainda";
- expoe lastro tecnico suficiente para auditoria e benchmark.

## 3. Entendimento confirmado do coach atual

### 3.1 O que ja esta implementado

O estado atual do repositorio mostra:

- `runDiagnostics(...)` em `src/core/diagnostic-engine.ts` gera diagnosticos tipados e ordenados por severidade.
- `generateSensitivityRecommendation(...)` em `src/core/sensitivity-engine.ts` ja possui `tier`, `evidenceTier`, `confidenceScore` e convergencia historica.
- `generateCoaching(...)` em `src/core/coach-engine.ts` transforma cada diagnostico em:
  - problema
  - causa
  - ajuste
  - drill
  - verificacao do proximo clip
  - adaptation window
- `adaptCoachWithOptionalLlm(...)` em `src/core/coach-llm-adapter.ts` so reescreve texto curto e preserva o payload tecnico.
- `createGroqCoachClient()` em `src/server/coach/groq-coach-client.ts` usa schema fechado via `zodTextFormat`.
- `results-dashboard.tsx` ja mostra o "Plano do Coach" com agrupamento, modo, confidence, coverage e expansao.

### 3.2 Onde o coach atual para

O desenho atual ainda opera em um formato "1 diagnostico -> 1 feedback".

Isso cria estes limites:

- a ordenacao vem quase toda da severidade do diagnostico, nao de um score global de impacto;
- o coach nao decide dependencias entre problemas;
- nao existe uma entidade de "plano da sessao";
- nao existe uma entidade de "foco primario";
- nao existe uma entidade de "protocolo de bloco";
- o historico de convergencia hoje vive no motor de sens, nao no coach;
- a IA generativa so reescreve cinco campos curtos e nao participa de um contrato mais rico;
- a UI mostra cards expandidos, mas nao mostra uma estrategia global da sessao.

### 3.3 Leitura honesta do nivel atual

O coach atual nao e fraco.

Ele ja e melhor do que a maioria dos "coaches de IA" superficiais porque:

- ancora texto em evidence;
- possui guardrails;
- e patch-aware;
- nao delega a verdade para o LLM.

Mas ele ainda nao e um coach extremo, porque o centro da inteligencia ainda esta espalhado entre diagnostico, sensibilidade, UI e copy, em vez de morar num motor de coaching proprio.

## 4. Problema que este SDD resolve

Quando um jogador recebe um resultado de analise, ele nao quer apenas "mais texto".

Ele quer quatro respostas claras:

1. O que mais derruba meu resultado agora?
2. O que eu faco primeiro, sem desperdicar bloco?
3. Quais mudancas eu testo e em que ordem?
4. Como eu valido se melhorou de verdade?

O coach atual responde bem a pergunta 2 em escala local.

Ele ainda responde mal ou de forma incompleta as perguntas 1, 3 e 4 quando:

- ha varios diagnosticos relevantes;
- a sensibilidade tem tier proprio;
- o clip esta bom para algumas leituras e ruim para outras;
- existe historico conflitante;
- o problema principal nao e tecnica, e sim captura ou repetibilidade.

## 5. Escopo funcional do Coach Extremo

### 5.1 Escopo obrigatorio V1

O novo coach obrigatoriamente precisa:

- consolidar diagnosticos, video quality, sensibilidade e historico em um unico `CoachPlan`;
- ranquear prioridades por impacto real e confianca;
- eleger um `primaryFocus`;
- decidir um `CoachDecisionTier`;
- emitir um plano de bloco com passos testaveis;
- separar:
  - evidencia
  - hipotese
  - acao
  - verificacao
- suportar modo conservador quando houver baixa confianca;
- explicar por que um foco venceu outro;
- manter o LLM limitado a rewrite/tonalidade em schema fechado.

### 5.2 Escopo recomendado

- memoria de recorrencia por jogador;
- tracking de protocolos aceitos/rejeitados;
- consenso multi-clip dentro do coach, e nao so da sens;
- benchmark dedicado para ranking de prioridades e qualidade do plano;
- sugestao de ordem de teste para sens, attachments e drills no mesmo bloco.

### 5.3 Fora de escopo inicial

- treinador conversacional em tempo real durante gameplay;
- inferencia opaca end-to-end via modelo generativo;
- plano automatico com dezenas de tarefas de uma vez;
- personal coach social/comunitario;
- autoajuste de configuracao do jogo.

## 6. Principios de arquitetura e produto

### 6.1 O coach decide, o LLM comunica

Toda decisao de coaching deve nascer em codigo deterministico.

O LLM pode:

- reescrever;
- variar ritmo e linguagem;
- resumir;
- humanizar.

O LLM nao pode:

- inventar metricas;
- trocar tier;
- criar attachment inexistente;
- contradizer a prioridade eleita;
- promover um plano mais agressivo do que a evidencia permite.

### 6.2 Prioridade vence volume

Um coach extremo nao despeja dez conselhos.

Ele escolhe:

- 1 foco principal;
- 1 ou 2 focos secundarios;
- 1 protocolo claro para o proximo bloco.

### 6.3 Confianca governa agressividade

Se a evidencia estiver fraca, o coach deve migrar de:

- "ajuste sua sens agora"

para:

- "repita a captura"
- "teste um bloco curto"
- "nao feche conclusao ainda"

### 6.4 Coaching precisa de horizontes

O coach deve operar em tres horizontes:

- imediato: proximo clip;
- bloco: proximo conjunto de 3 a 5 sprays;
- adaptacao: 1 a 7 dias.

### 6.5 Causa raiz precisa competir com sintoma

Nem sempre o diagnostico mais severo e a melhor prioridade.

Exemplo:

- um `underpull` com coverage alta pode ser menos acionavel do que uma `inconsistency` recorrente que torna todos os outros sinais instaveis;
- uma recomendacao de sens `capture_again` deve bloquear sugestoes agressivas de coach.

## 7. Arquitetura alvo

### 7.1 Fluxo alvo

```text
analysis result
  -> coach signal extraction
  -> priority scoring
  -> dependency resolution
  -> decision tiering
  -> action protocol composer
  -> validation plan builder
  -> coach memory merge
  -> deterministic coach plan
  -> optional llm rewrite
  -> dashboard / history rendering
```

### 7.2 Componentes propostos

#### A. Coach Signal Extractor

Responsabilidade:

- transformar o resultado bruto em sinais comparaveis;
- unificar entradas de `videoQualityReport`, `diagnoses`, `sensitivity`, `analysisContext` e historico.

Arquivos alvo:

- novo `src/core/coach-signal-extractor.ts`
- `src/types/engine.ts`

#### B. Coach Priority Engine

Responsabilidade:

- calcular `priorityScore`;
- classificar foco principal e secundarios;
- reduzir ruido quando ha sinais redundantes ou conflitantes.

Arquivos alvo:

- novo `src/core/coach-priority-engine.ts`
- novo `src/core/coach-priority-engine.test.ts`

#### C. Coach Plan Builder

Responsabilidade:

- transformar prioridades em um plano deterministicamente estruturado;
- decidir tier;
- construir `nextBlockProtocol`, `stopConditions` e `successChecks`.

Arquivos alvo:

- novo `src/core/coach-plan-builder.ts`
- novo `src/core/coach-plan-builder.test.ts`
- `src/core/coach-engine.ts`

#### D. Coach Memory Aggregator

Responsabilidade:

- consolidar recorrencia e historico de aceitacao;
- sinalizar quando um protocolo ja falhou ou melhorou antes;
- elevar ou rebaixar confianca com base em repeticao.

Arquivos alvo:

- novo `src/core/coach-memory.ts`
- `src/core/sensitivity-history-convergence.ts`
- `src/actions/history.ts`

#### E. Coach LLM Contract V2

Responsabilidade:

- reescrever nao so os campos curtos, mas tambem resumo da sessao e narrativa do bloco;
- continuar 100% schema-bound.

Arquivos alvo:

- `src/core/coach-llm-contract.ts`
- `src/core/coach-llm-adapter.ts`
- `src/server/coach/groq-coach-client.ts`

#### F. Coach Dashboard Renderer

Responsabilidade:

- mostrar resumo da sessao;
- mostrar foco principal;
- mostrar protocolo do proximo bloco;
- manter expansao por card, agora com hierarquia de prioridades.

Arquivos alvo:

- `src/app/analyze/results-dashboard.tsx`
- `src/app/analyze/analysis.module.css`
- `src/app/history/[id]/page.tsx`

## 8. Modelo de decisao do coach

### 8.1 Sinais de entrada

O coach deve ler pelo menos estes grupos de sinal:

- captura:
  - video quality tier
  - blocking reasons
  - tracking quality
  - coverage
  - confidence
- mecanica:
  - diagnosticos
  - dominant phase
  - angular error
  - linear error
  - consistency
- sensibilidade:
  - recommended profile
  - sensitivity tier
  - evidence tier
  - confidence score
  - suggested VSM
- contexto:
  - arma
  - optic
  - optic state
  - distancia
  - stance
  - patch
- memoria:
  - historico alinhado ou conflitante
  - outcomes reais de teste
  - focos recorrentes nas ultimas sessoes compativeis

### 8.2 Score de prioridade

Cada foco de coach deve ser ranqueado por uma funcao explicita.

Exemplo recomendado:

```text
priorityScore =
    0.28 * severity
  + 0.18 * confidence
  + 0.14 * coverage
  + 0.14 * leverage
  + 0.10 * recurrence
  + 0.08 * convergence
  + 0.08 * fixability
  - 0.12 * dependencyPenalty
```

Onde:

- `severity` vem do sinal tecnico dominante;
- `confidence` e `coverage` refletem o lastro da leitura;
- `leverage` mede o quanto corrigir esse foco deve melhorar outros;
- `recurrence` mede repeticao em sessoes compativeis;
- `convergence` sobe quando historico e sessao atual concordam;
- `fixability` privilegia mudancas acionaveis no proximo bloco;
- `dependencyPenalty` evita priorizar sintoma que depende de outro foco anterior.

### 8.3 Dependencias obrigatorias

O motor precisa entender dependencias simples:

- `capture_quality` bloqueia `sens_change` agressivo;
- `inconsistency` reduz forca de `sens_change` se a variabilidade ainda for alta;
- `late_compensation` pode tornar `underpull` menos prioritario se o erro principal estiver na entrada do gesto;
- `history_conflict` rebaixa qualquer `apply_protocol`.

### 8.4 Decision tier do coach

O coach precisa ter tier proprio:

```ts
type CoachDecisionTier =
  | 'capture_again'
  | 'test_protocol'
  | 'stabilize_block'
  | 'apply_protocol';
```

Semantica:

- `capture_again`: a captura nao sustenta coaching forte.
- `test_protocol`: existe direcao, mas ainda em modo de experimento.
- `stabilize_block`: existe foco tecnico forte, mas o usuario precisa repetir o mesmo protocolo por alguns clips antes de mexer mais.
- `apply_protocol`: ha evidencia suficiente para aplicar o protocolo sugerido com alta prioridade.

### 8.5 Regras minimas do tier

- se `sensitivity.tier === capture_again`, o coach nao pode sugerir ajuste forte de sens;
- se `videoQualityReport.usableForAnalysis === false`, o tier do coach precisa ser `capture_again`;
- se `historyConvergence.agreement === conflicting`, o maximo tier permitido e `test_protocol`;
- `apply_protocol` exige:
  - evidence tier nao fraca
  - confidence composta alta
  - ausencia de bloqueio de captura
  - ausencia de conflito historico dominante

## 9. Contratos de dados propostos

### 9.1 Tipos obrigatorios

```ts
type CoachFocusArea =
  | 'capture_quality'
  | 'vertical_control'
  | 'horizontal_control'
  | 'timing'
  | 'consistency'
  | 'sensitivity'
  | 'loadout'
  | 'validation';

interface CoachSignal {
  source: 'video_quality' | 'diagnosis' | 'sensitivity' | 'history' | 'context';
  key: string;
  summary: string;
  confidence: number;
  coverage: number;
  weight: number;
}

interface CoachPriority {
  id: string;
  area: CoachFocusArea;
  title: string;
  whyNow: string;
  priorityScore: number;
  severity: number;
  confidence: number;
  coverage: number;
  dependencies: readonly string[];
  blockedBy: readonly string[];
  signals: readonly CoachSignal[];
}

interface CoachActionProtocol {
  id: string;
  kind: 'capture' | 'technique' | 'sens' | 'loadout' | 'drill';
  instruction: string;
  expectedEffect: string;
  risk: 'low' | 'medium' | 'high';
  applyWhen: string;
  avoidWhen?: string;
}

interface CoachValidationCheck {
  label: string;
  target: string;
  minimumCoverage: number;
  minimumConfidence: number;
  successCondition: string;
  failCondition: string;
}

interface CoachBlockPlan {
  title: string;
  durationMinutes: number;
  steps: readonly string[];
  checks: readonly CoachValidationCheck[];
}

interface CoachPlan {
  tier: CoachDecisionTier;
  sessionSummary: string;
  primaryFocus: CoachPriority;
  secondaryFocuses: readonly CoachPriority[];
  actionProtocols: readonly CoachActionProtocol[];
  nextBlock: CoachBlockPlan;
  stopConditions: readonly string[];
  adaptationWindowDays: number;
  llmRewriteAllowed: boolean;
}
```

### 9.2 Extensao do `CoachFeedback`

`CoachFeedback[]` pode continuar existindo para o nivel por-diagnostico.

Mas `AnalysisResult` precisa ganhar um objeto novo de primeiro nivel:

```ts
interface AnalysisResult {
  ...
  coaching: readonly CoachFeedback[];
  coachPlan?: CoachPlan;
}
```

Isso evita quebrar o que ja existe e introduz o subsistema extremo sem jogar fora o feedback atual.

## 10. Comportamento alvo do coach

### 10.1 Quando a captura estiver ruim

O coach deve:

- focar em captura;
- bloquear ajustes agressivos;
- dizer o minimo necessario para recaptura;
- expor exatamente o que invalidou a leitura.

### 10.2 Quando a captura estiver razoavel, mas a amostra curta

O coach deve:

- escolher um foco principal;
- recomendar um protocolo curto de teste;
- nao vender conclusao final;
- usar `test_protocol` ou `stabilize_block`.

### 10.3 Quando a evidencia estiver forte

O coach deve:

- assumir uma ordem clara de execucao;
- mostrar por que o foco venceu;
- sugerir ajuste tecnico e, se permitido, ajuste de sens/loadout;
- explicitar como validar no proximo bloco.

### 10.4 Quando historico e sessao atual conflitam

O coach deve:

- rebaixar agressividade;
- mencionar o conflito;
- evitar conclusao definitiva;
- pedir bloco curto de confirmacao.

## 11. UX e apresentacao

### 11.1 Estrutura da tela

O dashboard de coach deve responder nesta ordem:

1. Veredito da sessao
2. Foco principal
3. Protocolo do proximo bloco
4. Focos secundarios
5. Evidencia detalhada por diagnostico

### 11.2 Novo bloco resumo

Adicionar acima da lista atual:

- badge do `CoachDecisionTier`
- resumo em 2 linhas
- foco principal
- CTA textual do proximo bloco

### 11.3 Cards expandidos continuam

Os cards por diagnostico continuam valiosos e nao devem ser removidos.

Mas agora eles passam a ser "evidencia detalhada", nao o centro da decisao.

### 11.4 Transparencia obrigatoria

Sempre mostrar:

- confidence
- coverage
- motivo do tier
- criterio de validacao do proximo bloco

## 12. Integracao com IA generativa

### 12.1 Regras obrigatorias

O contrato LLM precisa continuar fechado.

Campos reescreviveis recomendados:

- `sessionSummary`
- `primaryFocus.whyNow`
- `actionProtocols[].instruction`
- `nextBlock.title`

Campos que nao podem ser alterados semanticamente:

- tier
- priority order
- scores
- dependencies
- attachments
- validations

### 12.2 Estrategia recomendada

Fase 1:

- render deterministico puro;
- LLM opcional so para copy curta.

Fase 2:

- expandir schema para resumo da sessao e bloco.

Fase 3:

- permitir variacao controlada de tom por perfil de usuario, sem alterar fatos.

## 13. Persistencia e memoria

### 13.1 Persistencia minima

No curto prazo, persistir `coachPlan` dentro de `analysisSessions.fullResult` ja resolve.

### 13.2 Persistencia correta

Quando o V1 estabilizar, criar estruturas normalizadas:

```text
coach_plan_snapshots
- id
- session_id
- tier
- primary_focus_id
- summary
- payload
- created_at
```

```text
coach_protocol_outcomes
- id
- user_id
- coach_plan_snapshot_id
- focus_area
- outcome
- notes
- created_at
```

### 13.3 Memoria minima necessaria

O coach deve lembrar:

- ultimos focos primarios do mesmo contexto;
- se o protocolo parecido melhorou, piorou ou empatou;
- se a recorrencia esta subindo ou caindo.

## 14. Benchmark e avaliacao

Hoje o benchmark capturado ja cobre `tracking`, `diagnostico` e `coach` em nivel basico.

O Coach Extremo precisa de benchmark proprio.

### 14.1 Metricas minimas

- `primary_focus_precision`
  - o foco principal bate com revisao especialista?
- `tier_precision`
  - `capture_again` aparece quando devia?
- `conflict_handling_score`
  - o sistema rebaixa a agressividade quando sinais entram em conflito?
- `hallucination_rate`
  - o payload final inventou algo? objetivo: zero
- `protocol_improvement_rate`
  - quantas vezes o protocolo recomendado melhora o bloco seguinte?
- `plan_consistency_rate`
  - o plano e coerente com sensibilidade e diagnosticos?

### 14.2 Gates recomendados

- `hallucination_rate == 0`
- `plan_consistency_rate >= 0.98`
- `primary_focus_precision >= 0.80`
- `capture_again precision >= 0.85`
- `apply_protocol precision >= 0.80`
- `history conflict downgrade recall >= 0.80`

## 15. Fases de rollout

### Fase C0 - Contratos

Goal:

- definir `CoachPlan`, `CoachPriority`, `CoachDecisionTier` e contratos de bloco.

Acceptance:

- tipos novos existem;
- `AnalysisResult` suporta `coachPlan`.

### Fase C1 - Motor deterministico

Goal:

- criar `coach-signal-extractor`, `coach-priority-engine` e `coach-plan-builder`.

Acceptance:

- foco principal e focos secundarios saem do motor;
- tier do coach e explicavel.

### Fase C2 - Integracao com o coach atual

Goal:

- manter `CoachFeedback[]` como evidencia detalhada e anexar `coachPlan`.

Acceptance:

- `generateCoaching(...)` deixa de ser apenas templating por diagnostico;
- `coachPlan` e retornado no resultado final.

### Fase C3 - UI

Goal:

- mostrar resumo da sessao e protocolo do bloco na dashboard.

Acceptance:

- a pagina de analise responde claramente "o que fazer agora".

### Fase C4 - Memoria e historico

Goal:

- elevar recorrencia e outcomes reais ao motor de coaching.

Acceptance:

- conflito historico rebaixa tier;
- alinhamento historico sobe confianca.

### Fase C5 - LLM e benchmark

Goal:

- expandir rewrite controlado e fechar benchmark do coach.

Acceptance:

- schema continua fechado;
- novos gates passam.

## 16. Definition of Done

O Coach Extremo so pode ser considerado pronto quando:

1. existe `coachPlan` separado de `CoachFeedback[]`;
2. o coach decide um foco principal;
3. o coach decide um tier proprio;
4. o coach integra sensibilidade, diagnosticos, captura e historico;
5. o coach gera protocolo do proximo bloco;
6. a UI mostra resumo de sessao e plano de execucao;
7. o LLM continua preso a schema fechado;
8. o benchmark cobre ranking, tier e consistencia;
9. o sistema consegue reduzir agressividade diante de conflito ou baixa confianca.

## 17. Protocolo de execucao

Para este SDD, a implementacao correta deve seguir um protocolo de execucao explicito.

### 17.1 Uma task por chat

O fluxo recomendado e:

- 1 task atomica
- 1 chat novo
- 1 objetivo claro
- 1 pacote de validacao

Motivo:

- reduz vazamento de contexto;
- reduz escopo acidental;
- melhora auditabilidade;
- facilita rollback e comparacao de diff.

### 17.2 TDD obrigatorio

Toda task derivada deste SDD deve seguir:

1. RED
2. GREEN
3. REFACTOR
4. VALIDATE
5. HANDOFF

Sem RED comprovado e sem validacao ao final, a task nao conta como concluida.

### 17.3 Pacote obrigatorio de fechamento de task

Cada task precisa terminar com:

- arquivos alterados;
- comandos rodados;
- resultado dos comandos;
- checklist de aceite;
- riscos residuais;
- prompt copy-paste para o proximo chat.

Se a task tiver merge gate proprio:

- o status do merge gate tambem precisa aparecer explicitamente no fechamento.

### 17.4 Scope guard

Cada task deve:

- tocar no menor numero possivel de arquivos;
- fechar uma responsabilidade so;
- evitar "ja aproveitei e fiz mais isso aqui".

Se uma descoberta abrir escopo novo, ela deve virar task seguinte, nao incremento escondido da task atual.

## 18. Padrao de task atomica

O plano derivado deste SDD deve obedecer este formato minimo por task:

- outcome
- scope guard
- estimated time
- risk level
- files
- ownership notes
- implementation checklist
- TDD target
- validation
- merge gate
- rollback plan
- acceptance checklist
- prompt do proximo chat

Uma task so e considerada realmente atomica quando:

- tem uma responsabilidade principal;
- cabe em um chat limpo;
- tem criterio objetivo de RED e GREEN;
- tem criterio objetivo de aceite;
- produz handoff claro para a proxima task.

## 19. Veredito final

O proximo salto de qualidade do produto nao esta em "deixar o coach falar mais bonito".

Esta em transformar o coach em um motor de orquestracao.

O repositorio ja tem pecas fortes:

- diagnostico tipado;
- recomendacao de sens com tier;
- coaching evidence-linked;
- LLM com guardrails;
- UI que ja aceita uma camada de plano.

O que falta agora e ligar essas pecas numa entidade central:

- com prioridade;
- com dependencias;
- com tier proprio;
- com protocolo de bloco;
- com memoria;
- com benchmark.

Quando isso existir, o coach deixa de ser um conjunto de bons cards e passa a ser um sistema completo de melhoria guiada.

## 20. Estado implementado

O V1 do Coach Extremo agora esta representado no repositorio como um contrato proprio de `coachPlan`, separado de `CoachFeedback[]`.

O contrato final implementado cobre:

- `CoachPlan` em `AnalysisResult`, com `tier`, `sessionSummary`, `primaryFocus`, `secondaryFocuses`, `actionProtocols`, `nextBlock`, `stopConditions`, `adaptationWindowDays` e `llmRewriteAllowed`;
- extracao deterministica de sinais de captura, diagnostico, sensibilidade, contexto e memoria minima;
- ranking de prioridades com bloqueios explicitos por captura fraca, baixa consistencia e conflito historico;
- tier proprio do coach entre `capture_again`, `test_protocol`, `stabilize_block` e `apply_protocol`;
- protocolo do proximo bloco com passos, checks e condicoes de parada;
- integracao do plano ao resultado principal sem remover os cards detalhados antigos;
- rewrite opcional por LLM limitado a campos de copy, sem permissao para alterar tier, score, ordem de prioridade, dependencias ou fatos tecnicos;
- renderizacao do resumo de sessao na dashboard e hidratacao backward compatible no historico;
- benchmark/golden cobrindo `coachPlan.tier`, `primaryFocus.area` e `nextBlock.title`.

O fluxo operacional do plano tambem ficou consolidado:

- cada task deve continuar sendo executada em um chat isolado;
- TDD continua obrigatorio para qualquer mudanca funcional;
- Task 14 e a tarefa terminal de documentacao e verificacao final;
- novas descobertas fora do escopo devem virar novo plano ou novo SDD, nao incremento escondido neste fechamento.

