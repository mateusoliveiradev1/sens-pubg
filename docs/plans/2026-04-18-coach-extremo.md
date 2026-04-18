# Coach Extremo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformar o coach atual em um motor deterministico de priorizacao, tiering e plano de bloco, com `coachPlan` proprio, memoria minima e renderizacao de sessao.

**Architecture:** O V1 preserva `CoachFeedback[]` como camada detalhada por diagnostico, mas adiciona `CoachPlan` como entidade central. O plano nasce em camadas pequenas: contratos, fixture de teste, extracao de sinais, ranking, dependencias, tier, protocolo, orquestracao, memoria, rewrite opcional e UI.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, schema tipado em `src/types/engine.ts`, motor de dominio em `src/core/**`.

---

## Execution Protocol

### 1. One task per chat

Regra operacional:

- abra um chat novo para cada task abaixo;
- execute somente a task atual;
- nao avance para a task seguinte no mesmo chat;
- no maximo resolva pequenos ajustes mecanicos estritamente necessarios para a task atual compilar.

### 2. TDD is mandatory

Toda task deste plano tem TDD obrigatorio.

Fluxo minimo por task:

1. escrever ou expandir o teste que define o comportamento;
2. rodar o teste e confirmar RED;
3. implementar o minimo para GREEN;
4. refatorar sem mudar comportamento;
5. rodar a validacao da task;
6. marcar o checklist de aceite.

Se a task nao passar por RED -> GREEN -> REFACTOR, ela nao esta concluida.

### 3. Completion package required in every chat

Ao fechar cada task, a resposta final daquele chat precisa conter:

- arquivos alterados;
- comandos rodados;
- resultado dos comandos;
- checklist de aceite com status;
- riscos ou follow-ups;
- prompt copy-paste para abrir o proximo chat.

Excecao terminal: Task 14 nao possui prompt de proxima task, porque ela fecha a documentacao e a verificacao final do plano inteiro.

### 4. Scope guard

Se durante uma task surgir trabalho maior do que o escopo dela:

- nao implemente "aproveitando";
- anote como risco;
- siga para a proxima task do plano quando chegar a hora.

### 5. Suggested commit rhythm

Se estiver usando commits por task, o padrao recomendado e:

- 1 task concluida = 1 commit limpo.

Isso combina bem com o fluxo "1 chat = 1 task".

### 6. Merge gate discipline

Cada task tem um merge gate proprio.

Regra:

- nao marque a task como pronta se o gate dela nao estiver verde;
- nao empurre escopo para a task seguinte com gate vermelho;
- se o gate falhar, a task continua aberta.

### 7. Rollback discipline

Cada task tambem precisa de um rollback plan minimo.

Regra:

- se a task quebrar algo fora do escopo e voce nao estabilizar rapido, reverta apenas o delta da task atual;
- nunca carregue bug conhecido para a task seguinte;
- rollback faz parte da task, nao e acidente de percurso.

### 8. Prompt queue file

Existe um arquivo canonico de prompts de handoff em:

- `docs/plans/2026-04-18-coach-extremo-prompts.md`

Use esse arquivo quando quiser abrir o proximo chat sem pescar prompt no plano principal.

---

## Chat Template

Use este template no inicio de cada chat:

```text
Quero executar a Task X do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task X
- TDD obrigatorio
- nao avance para a Task X+1
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, status do merge gate, riscos residuais e o prompt copy-paste da proxima task
```

## Mandatory task fields

Toda task deste plano deve ter:

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

## Shared artifact ownership map

Para reduzir conflito entre chats:

- `src/core/coach-test-fixtures.ts`
  - ownership primario: Task 2
  - mudancas fora da Task 2 so quando a task atual realmente precisar ampliar fixture
- `tests/goldens/benchmark/captured-benchmark-draft.json`
  - ownership primario: Task 13
  - evitar tocar nesse arquivo antes da task de benchmark, salvo se um gate anterior depender disso de forma explicita
- `docs/plans/2026-04-18-coach-extremo-prompts.md`
  - ownership primario: Task 14 para consolidacao final
  - pequenas correcoes de consistencia podem acontecer antes, mas sem mudar o fluxo do plano

---

## Task 1 - Fechar os contratos base do Coach Extremo

**Outcome:** o dominio passa a conhecer `CoachPlan`, `CoachDecisionTier` e os tipos base do plano.

**Scope guard:** esta task nao implementa logica de ranking, tiering ou UI.

**Estimated time:** 15-25 min

**Risk level:** baixo

**Ownership notes:** esta task e dona apenas dos contratos base em `src/types/engine.ts` e do stub inicial do builder. Nao alterar fixtures compartilhadas nem goldens.

**Files**
- Modify: `src/types/engine.ts`
- Create: `src/core/coach-plan-builder.ts`
- Create: `src/core/coach-plan-builder.test.ts`

**Implementation checklist**
- [ ] adicionar `CoachDecisionTier`
- [ ] adicionar `CoachFocusArea`
- [ ] adicionar `CoachSignal`
- [ ] adicionar `CoachPriority`
- [ ] adicionar `CoachActionProtocol`
- [ ] adicionar `CoachValidationCheck`
- [ ] adicionar `CoachBlockPlan`
- [ ] adicionar `CoachPlan`
- [ ] estender `AnalysisResult` com `coachPlan?: CoachPlan`
- [ ] criar stub de `buildCoachPlan`

**TDD target**
- criar um teste RED que exija:
  - `tier`
  - `primaryFocus`
  - `nextBlock`
- confirmar falha por modulo inexistente
- criar o stub minimo
- confirmar nova falha dentro do stub

**Validation**

```bash
npx vitest run src/core/coach-plan-builder.test.ts
npm run typecheck
```

**Merge gate**
- `src/core/coach-plan-builder.test.ts` verde
- `npm run typecheck` verde

**Rollback plan**
- remover os tipos novos de `src/types/engine.ts`
- deletar o stub `src/core/coach-plan-builder.ts`
- restaurar o teste para o estado anterior da task

**Acceptance checklist**
- [ ] `src/types/engine.ts` compila com os novos tipos
- [ ] o teste novo existe e falhou antes da implementacao
- [ ] o stub `buildCoachPlan` existe
- [ ] `AnalysisResult` ja suporta `coachPlan`
- [ ] nenhum comportamento alem do contrato foi introduzido

**Prompt do proximo chat**

```text
Quero executar a Task 2 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 2
- TDD obrigatorio
- nao avance para a Task 3
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 2 - Criar fixtures e helpers de teste reutilizaveis do coach

**Outcome:** existe uma base de fixture limpa para as tasks seguintes sem duplicar setup em cada teste.

**Scope guard:** esta task nao implementa regras de negocio do coach.

**Estimated time:** 15-25 min

**Risk level:** baixo

**Ownership notes:** esta task passa a ser dona do arquivo `src/core/coach-test-fixtures.ts`. Tasks futuras nao devem duplicar fixtures inline se esse helper ja cobrir o caso.

**Files**
- Create: `src/core/coach-test-fixtures.ts`
- Modify: `src/core/coach-plan-builder.test.ts`
- Create: `src/core/coach-signal-extractor.test.ts`

**Implementation checklist**
- [ ] criar fixture `analysisResultBase`
- [ ] criar fixture `analysisResultWithWeakCapture`
- [ ] criar fixture `analysisResultWithStrongSensitivity`
- [ ] criar helper para sobrescrever partes do fixture sem copiar tudo
- [ ] migrar o teste da Task 1 para usar fixture real
- [ ] abrir o teste base do signal extractor com fixture compartilhada

**TDD target**
- escrever teste RED em `coach-signal-extractor.test.ts` usando fixture compartilhada
- confirmar que o teste falha por extractor inexistente
- refatorar o teste anterior para fixture reutilizavel sem mudar expectativa

**Validation**

```bash
npx vitest run src/core/coach-plan-builder.test.ts src/core/coach-signal-extractor.test.ts
npm run typecheck
```

**Merge gate**
- testes de fixture e builder verdes
- `npm run typecheck` verde

**Rollback plan**
- deletar `src/core/coach-test-fixtures.ts`
- restaurar os testes alterados para fixtures inline
- garantir que nenhuma dependencia da fixture compartilhada reste quebrada

**Acceptance checklist**
- [ ] existe uma fixture reutilizavel central
- [ ] os testes nao dependem de objetos inline gigantes
- [ ] os cenarios fraco/forte de captura e sens ja existem
- [ ] as proximas tasks podem usar essas fixtures sem retrabalho

**Prompt do proximo chat**

```text
Quero executar a Task 3 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 3
- TDD obrigatorio
- nao avance para a Task 4
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 3 - Extrair sinais de captura, diagnostico e sensibilidade

**Outcome:** o sistema gera uma lista unificada de `CoachSignal[]` a partir de `AnalysisResult`.

**Scope guard:** esta task nao faz ranking nem decide foco principal.

**Estimated time:** 20-35 min

**Risk level:** medio

**Ownership notes:** esta task e dona do contrato semantico de `CoachSignal`. Nao deve introduzir peso de ranking ainda.

**Files**
- Create: `src/core/coach-signal-extractor.ts`
- Modify: `src/core/coach-signal-extractor.test.ts`
- Modify: `src/types/engine.ts`

**Implementation checklist**
- [ ] criar `BuildCoachSignalInput`
- [ ] mapear sinais de `videoQualityReport`
- [ ] mapear sinais de `diagnoses`
- [ ] mapear sinais de `sensitivity.tier`, `evidenceTier` e `confidenceScore`
- [ ] mapear sinais basicos de contexto (`patch`, `optic`, `distance`) quando existirem
- [ ] garantir `capture_quality` forte quando `usableForAnalysis === false`
- [ ] garantir bloqueio semantico quando `sensitivity.tier === capture_again`

**TDD target**
- teste RED: extrai sinais de captura, diagnostico e sensibilidade
- teste RED: emite sinal forte de captura quando o clip nao e utilizavel
- implementar o minimo para GREEN
- refatorar sem mudar o payload

**Validation**

```bash
npx vitest run src/core/coach-signal-extractor.test.ts
npm run typecheck
```

**Merge gate**
- `src/core/coach-signal-extractor.test.ts` verde
- `npm run typecheck` verde

**Rollback plan**
- remover `src/core/coach-signal-extractor.ts`
- restaurar eventuais tipos extras de `src/types/engine.ts` ligados so ao extractor
- manter as fixtures para a task seguinte, se ja estiverem corretas

**Acceptance checklist**
- [ ] o extractor retorna `CoachSignal[]`
- [ ] existe cobertura de captura fraca
- [ ] existe cobertura de sensibilidade em `capture_again`
- [ ] o payload nao inventa dados fora do `AnalysisResult`

**Prompt do proximo chat**

```text
Quero executar a Task 4 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 4
- TDD obrigatorio
- nao avance para a Task 5
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 4 - Implementar o ranking bruto de prioridades

**Outcome:** os sinais sao agrupados por area e recebem `priorityScore`.

**Scope guard:** esta task nao resolve dependencias nem bloqueios complexos.

**Estimated time:** 20-35 min

**Risk level:** medio

**Ownership notes:** esta task e dona do score bruto de prioridade. Bloqueios e downgrade forte continuam reservados para a Task 5.

**Files**
- Create: `src/core/coach-priority-engine.ts`
- Create: `src/core/coach-priority-engine.test.ts`
- Modify: `src/core/coach-plan-builder.ts`

**Implementation checklist**
- [ ] criar funcao `rankCoachPriorities`
- [ ] agrupar sinais por `CoachFocusArea`
- [ ] calcular `priorityScore` inicial
- [ ] ordenar prioridades por score decrescente
- [ ] limitar saida publica a 3 prioridades
- [ ] conectar o builder ao ranking

**TDD target**
- teste RED: `capture_quality` vence quando a captura esta fraca
- teste RED: `vertical_control` vence num caso forte de diagnostico vertical
- implementar score minimo
- refatorar pesos sem quebrar as expectativas

**Validation**

```bash
npx vitest run src/core/coach-priority-engine.test.ts src/core/coach-plan-builder.test.ts
npm run typecheck
```

**Merge gate**
- `src/core/coach-priority-engine.test.ts` verde
- `src/core/coach-plan-builder.test.ts` verde no escopo tocado
- `npm run typecheck` verde

**Rollback plan**
- remover `src/core/coach-priority-engine.ts`
- voltar o builder para ler prioridades stubadas ou vazias
- desfazer qualquer peso experimental que tenha vazado para outros modulos

**Acceptance checklist**
- [ ] existe `priorityScore`
- [ ] a saida vem ordenada
- [ ] o builder ja consegue ler a prioridade principal
- [ ] a logica ainda nao vazou para UI nem para LLM

**Prompt do proximo chat**

```text
Quero executar a Task 5 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 5
- TDD obrigatorio
- nao avance para a Task 6
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 5 - Resolver dependencias e bloqueios das prioridades

**Outcome:** o ranking passa a refletir conflitos reais entre captura, consistencia, historico e sensibilidade.

**Scope guard:** esta task ainda nao monta o plano de bloco final.

**Estimated time:** 20-35 min

**Risk level:** medio

**Ownership notes:** esta task e dona dos campos `dependencies` e `blockedBy`. Ainda nao deve persistir memoria historica de verdade; so preparar o gancho semantico.

**Files**
- Modify: `src/core/coach-priority-engine.ts`
- Modify: `src/core/coach-priority-engine.test.ts`
- Modify: `src/core/coach-plan-builder.ts`

**Implementation checklist**
- [ ] adicionar `dependencies`
- [ ] adicionar `blockedBy`
- [ ] bloquear `sensitivity` por `capture_quality` ruim
- [ ] rebaixar `sensitivity` por `consistency` muito baixa
- [ ] preparar gancho para `history_conflict`
- [ ] expor `primaryFocus` e `secondaryFocuses`

**TDD target**
- teste RED: `sensitivity` vem bloqueada por captura ruim
- teste RED: `sensitivity` vem rebaixada quando a variabilidade domina
- implementar as regras de bloqueio
- refatorar sem alterar a API publica

**Validation**

```bash
npx vitest run src/core/coach-priority-engine.test.ts src/core/coach-plan-builder.test.ts
npm run typecheck
```

**Merge gate**
- testes do priority engine verdes
- testes do builder verdes no escopo tocado
- `npm run typecheck` verde

**Rollback plan**
- remover apenas a camada de bloqueios nova
- voltar `dependencies` e `blockedBy` para arrays vazios ou ausencia controlada
- restaurar o ranking bruto da Task 4

**Acceptance checklist**
- [ ] `blockedBy` existe nas prioridades afetadas
- [ ] o foco principal muda quando os bloqueios entram
- [ ] o builder recebe foco principal e secundarios coerentes

**Prompt do proximo chat**

```text
Quero executar a Task 6 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 6
- TDD obrigatorio
- nao avance para a Task 7
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 6 - Implementar o tier de decisao do coach

**Outcome:** o coach passa a decidir entre `capture_again`, `test_protocol`, `stabilize_block` e `apply_protocol`.

**Scope guard:** esta task nao define ainda os textos completos do protocolo.

**Estimated time:** 15-30 min

**Risk level:** medio

**Ownership notes:** esta task e dona das regras de tier. Nao deve gerar ainda os protocolos detalhados do bloco.

**Files**
- Modify: `src/core/coach-plan-builder.ts`
- Modify: `src/core/coach-plan-builder.test.ts`

**Implementation checklist**
- [ ] criar `resolveCoachDecisionTier`
- [ ] bloquear para `capture_again` quando a captura nao sustenta a analise
- [ ] usar `test_protocol` para sinal com evidencia parcial
- [ ] usar `stabilize_block` para foco recorrente de estabilidade/consistencia
- [ ] reservar `apply_protocol` para evidencia forte sem conflito

**TDD target**
- teste RED para cada tier
- garantir que `apply_protocol` nao acontece em fixture fraca
- implementar minimo para GREEN

**Validation**

```bash
npx vitest run src/core/coach-plan-builder.test.ts
npm run typecheck
```

**Merge gate**
- testes de tier verdes
- `npm run typecheck` verde

**Rollback plan**
- desfazer `resolveCoachDecisionTier`
- voltar o builder para um tier fixo ou stubado
- preservar contratos e testes para a Task 7

**Acceptance checklist**
- [ ] todos os 4 tiers possuem cobertura minima
- [ ] o tier depende da evidencia, nao de copy
- [ ] `apply_protocol` continua raro e protegido

**Prompt do proximo chat**

```text
Quero executar a Task 7 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 7
- TDD obrigatorio
- nao avance para a Task 8
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 7 - Montar os protocolos de acao e o plano do proximo bloco

**Outcome:** o coach gera `actionProtocols`, `nextBlock`, `stopConditions` e `adaptationWindowDays`.

**Scope guard:** esta task ainda nao integra memoria historica.

**Estimated time:** 25-40 min

**Risk level:** medio

**Ownership notes:** esta task e dona da estrutura do protocolo de bloco. Nao deve ainda ler historico nem chamar LLM.

**Files**
- Modify: `src/core/coach-plan-builder.ts`
- Modify: `src/core/coach-plan-builder.test.ts`

**Implementation checklist**
- [ ] criar `buildActionProtocols`
- [ ] criar `buildNextBlockPlan`
- [ ] criar `buildStopConditions`
- [ ] criar `buildAdaptationWindow`
- [ ] garantir checks objetivos no `nextBlock`

**TDD target**
- teste RED: `actionProtocols` nao vazios
- teste RED: `nextBlock.steps` e `nextBlock.checks` nao vazios
- teste RED: `stopConditions` presentes
- implementar ate GREEN

**Validation**

```bash
npx vitest run src/core/coach-plan-builder.test.ts
npm run typecheck
```

**Merge gate**
- testes do builder verdes
- `npm run typecheck` verde

**Rollback plan**
- remover funcoes `buildActionProtocols`, `buildNextBlockPlan`, `buildStopConditions` e `buildAdaptationWindow`
- voltar o builder para um plano vazio controlado
- manter o tier da Task 6 intacto

**Acceptance checklist**
- [ ] o plano do bloco e objetivo
- [ ] cada bloco tem checks validaveis
- [ ] o protocolo condiz com o tier
- [ ] `stopConditions` evitam agressividade cega

**Prompt do proximo chat**

```text
Quero executar a Task 8 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 8
- TDD obrigatorio
- nao avance para a Task 9
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 8 - Orquestrar o `coachPlan` dentro do motor de coach

**Outcome:** o resultado final de analise passa a carregar `coachPlan`, sem perder `CoachFeedback[]`.

**Scope guard:** esta task nao mexe ainda em memoria historica nem LLM.

**Estimated time:** 20-35 min

**Risk level:** medio

**Ownership notes:** esta task e dona do ponto de integracao entre `CoachFeedback[]` e `coachPlan`. Nao deve mexer ainda no contrato de rewrite do LLM.

**Files**
- Modify: `src/core/coach-engine.ts`
- Modify: `src/core/coach-engine.test.ts`
- Modify: `src/core/analysis-result-coach-enrichment.ts`

**Implementation checklist**
- [ ] adicionar helper para anexar `coachPlan`
- [ ] manter `generateCoaching(...)` funcionando para os cards detalhados
- [ ] ligar `coach-signal-extractor`, ranking e builder
- [ ] garantir que `AnalysisResult` sai com `coaching` e `coachPlan`
- [ ] preservar compatibilidade com subSessions

**TDD target**
- teste RED: resultado enriquecido contem `coachPlan`
- teste RED: `coaching` antigo continua presente
- implementar o minimo

**Validation**

```bash
npx vitest run src/core/coach-engine.test.ts src/core/analysis-result-coach-enrichment.test.ts
npm run typecheck
```

**Merge gate**
- `src/core/coach-engine.test.ts` verde
- `src/core/analysis-result-coach-enrichment.test.ts` verde
- `npm run typecheck` verde

**Rollback plan**
- remover o helper de anexar `coachPlan`
- voltar `AnalysisResult` enriquecido para o comportamento anterior
- preservar os modulos de dominio ja criados para a task seguinte

**Acceptance checklist**
- [ ] `coachPlan` existe no resultado principal
- [ ] `CoachFeedback[]` continua intacto
- [ ] subSessions nao quebraram
- [ ] a orquestracao ainda e deterministica

**Prompt do proximo chat**

```text
Quero executar a Task 9 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 9
- TDD obrigatorio
- nao avance para a Task 10
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 9 - Integrar memoria minima e conflito historico

**Outcome:** o coach passa a subir ou descer agressividade com base em recorrencia e conflito historico.

**Scope guard:** esta task nao faz migracao de banco nem normalizacao de tabelas novas.

**Estimated time:** 25-45 min

**Risk level:** medio-alto

**Ownership notes:** esta task e dona da semantica de memoria minima do coach. Nao deve criar tabelas novas nem reescrever a camada inteira de historico.

**Files**
- Create: `src/core/coach-memory.ts`
- Create: `src/core/coach-memory.test.ts`
- Modify: `src/core/coach-plan-builder.ts`
- Modify: `src/actions/history.ts`

**Implementation checklist**
- [ ] criar `CoachMemorySnapshot`
- [ ] ler sessoes compativeis do historico atual
- [ ] identificar focos recorrentes
- [ ] identificar conflito historico
- [ ] rebaixar tier quando houver conflito
- [ ] elevar confianca quando houver alinhamento forte

**TDD target**
- teste RED: historico conflitante derruba `apply_protocol`
- teste RED: historico alinhado sobe confianca
- implementar ate GREEN

**Validation**

```bash
npx vitest run src/core/coach-memory.test.ts src/core/coach-plan-builder.test.ts
npm run typecheck
```

**Merge gate**
- `src/core/coach-memory.test.ts` verde
- testes do builder verdes no escopo tocado
- `npm run typecheck` verde

**Rollback plan**
- remover `src/core/coach-memory.ts`
- voltar o builder para ignorar historico
- desfazer apenas o adapter adicional em `src/actions/history.ts`

**Acceptance checklist**
- [ ] existe `CoachMemorySnapshot`
- [ ] o coach reconhece conflito historico
- [ ] o coach reconhece alinhamento historico
- [ ] nenhuma migracao de schema foi exigida no V1

**Prompt do proximo chat**

```text
Quero executar a Task 10 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 10
- TDD obrigatorio
- nao avance para a Task 11
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 10 - Expandir o contrato do LLM com seguranca

**Outcome:** o rewrite opcional do LLM passa a cobrir resumo da sessao e bloco, sem alterar tier nem fatos.

**Scope guard:** esta task nao muda o provider nem transforma o LLM em fonte primaria da verdade.

**Estimated time:** 20-35 min

**Risk level:** alto

**Ownership notes:** esta task e dona do schema de rewrite seguro. Nao deve alterar o provider, a politica de fallback ou transformar o LLM em decisor.

**Files**
- Modify: `src/core/coach-llm-contract.ts`
- Modify: `src/core/coach-llm-adapter.ts`
- Modify: `src/server/coach/groq-coach-client.ts`
- Create: `src/core/coach-llm-adapter.test.ts`

**Implementation checklist**
- [ ] criar schema V2 de rewrite seguro
- [ ] permitir rewrite de `sessionSummary`
- [ ] permitir rewrite do motivo do foco principal
- [ ] permitir rewrite de instrucoes dos protocolos
- [ ] permitir rewrite do titulo do proximo bloco
- [ ] bloquear tier, score, dependencias e thresholds
- [ ] manter fallback duro para parse invalido

**TDD target**
- teste RED: rewrite seguro altera so os campos permitidos
- teste RED: payload invalido retorna deterministico
- implementar ate GREEN

**Validation**

```bash
npx vitest run src/core/coach-llm-adapter.test.ts src/core/coach-engine.test.ts
npm run typecheck
```

**Merge gate**
- `src/core/coach-llm-adapter.test.ts` verde
- `src/core/coach-engine.test.ts` verde no escopo tocado
- `npm run typecheck` verde

**Rollback plan**
- voltar `src/core/coach-llm-contract.ts` ao schema anterior
- voltar o adapter para reescrever apenas os campos antigos
- manter `coachPlan` deterministico funcionando sem rewrite expandido

**Acceptance checklist**
- [ ] o LLM nao consegue trocar tier
- [ ] o LLM nao consegue trocar facts tecnicos
- [ ] existe fallback para JSON ruim
- [ ] o contrato continua schema-bound

**Prompt do proximo chat**

```text
Quero executar a Task 11 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 11
- TDD obrigatorio
- nao avance para a Task 12
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 11 - Renderizar o resumo de sessao na dashboard de analise

**Outcome:** a UI mostra veredito da sessao, foco principal e proximo bloco antes dos cards detalhados.

**Scope guard:** esta task nao mexe ainda na pagina de historico.

**Estimated time:** 25-45 min

**Risk level:** medio-alto

**Ownership notes:** esta task e dona da UX do resumo de sessao em `results-dashboard`. Nao deve redesenhar o restante da pagina nem mexer ainda no historico.

**Files**
- Modify: `src/app/analyze/results-dashboard.tsx`
- Modify: `src/app/analyze/analysis.module.css`
- Modify: `src/app/analyze/results-dashboard.contract.test.ts`

**Implementation checklist**
- [ ] renderizar badge do `CoachDecisionTier`
- [ ] renderizar `sessionSummary`
- [ ] renderizar `primaryFocus`
- [ ] renderizar `nextBlock.title`
- [ ] renderizar 2 ou 3 passos iniciais do bloco
- [ ] manter cards atuais como evidencia detalhada

**TDD target**
- teste RED: tela mostra veredito, foco principal e proximo bloco
- teste RED: cards antigos continuam renderizando
- implementar ate GREEN

**Validation**

```bash
npx vitest run src/app/analyze/results-dashboard.contract.test.ts
npm run typecheck
```

**Merge gate**
- `src/app/analyze/results-dashboard.contract.test.ts` verde
- `npm run typecheck` verde
- `npm run build` verde

**Rollback plan**
- remover apenas o painel-resumo novo
- restaurar os cards antigos como entrada principal
- manter `coachPlan` no dominio sem exigir sua renderizacao

**Acceptance checklist**
- [ ] existe resumo de sessao acima dos cards
- [ ] existe foco principal visivel
- [ ] existe resumo do proximo bloco
- [ ] os cards antigos nao sumiram

**Prompt do proximo chat**

```text
Quero executar a Task 12 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 12
- TDD obrigatorio
- nao avance para a Task 13
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 12 - Expor o `coachPlan` nas superficies de historico

**Outcome:** o replay de sessoes antigas consegue mostrar ou hidratar o plano do coach.

**Scope guard:** esta task nao cria uma nova UX complexa de historico; ela apenas garante acesso ao dado.

**Estimated time:** 20-35 min

**Risk level:** medio

**Ownership notes:** esta task e dona da hidratacao do `coachPlan` no historico. Nao deve introduzir redesign de pagina nem dependencias fortes de `coachPlan` em sessoes antigas.

**Files**
- Modify: `src/app/history/analysis-result-hydration.ts`
- Modify: `src/app/history/analysis-result-hydration.test.ts`
- Modify: `src/app/history/[id]/page.tsx`

**Implementation checklist**
- [ ] garantir hidratacao de `coachPlan`
- [ ] garantir que pagina de historico nao quebra sem `coachPlan`
- [ ] mostrar resumo minimo quando `coachPlan` existir

**TDD target**
- teste RED: hydration preserva `coachPlan`
- teste RED: page aguenta ausencia de `coachPlan`
- implementar ate GREEN

**Validation**

```bash
npx vitest run src/app/history/analysis-result-hydration.test.ts src/app/history/page.contract.test.ts
npm run typecheck
```

**Merge gate**
- testes de hydration verdes
- testes da pagina de historico verdes no escopo tocado
- `npm run typecheck` verde

**Rollback plan**
- restaurar a hidratacao anterior sem `coachPlan`
- voltar a page para ignorar o plano novo
- manter backward compatibility do payload salvo

**Acceptance checklist**
- [ ] `coachPlan` hidrata corretamente
- [ ] historico continua backward compatible
- [ ] pagina nao assume que todo resultado tem plano novo

**Prompt do proximo chat**

```text
Quero executar a Task 13 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 13
- TDD obrigatorio
- nao avance para a Task 14
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist, riscos residuais e o prompt copy-paste da proxima task
```

---

## Task 13 - Fechar benchmark e goldens do Coach Extremo

**Outcome:** o benchmark do coach passa a validar o plano de sessao, nao so o texto detalhado.

**Scope guard:** esta task nao amplia o corpus; ela so atualiza o gate atual para o novo contrato.

**Estimated time:** 20-35 min

**Risk level:** medio

**Ownership notes:** esta task passa a ser dona do contrato de golden do coach em `tests/goldens/benchmark/captured-benchmark-draft.json`. Tasks futuras nao devem alterar esse arquivo fora do fluxo de benchmark.

**Files**
- Modify: `src/core/coach-golden-runner.test.ts`
- Modify: `tests/goldens/benchmark/captured-benchmark-draft.json`

**Implementation checklist**
- [ ] validar `coachPlan.tier`
- [ ] validar `coachPlan.primaryFocus.area`
- [ ] validar `coachPlan.nextBlock.title`
- [ ] manter tolerancia para rewrites de copy que nao mudem fatos

**TDD target**
- teste RED: benchmark exige os novos campos
- fixtures ainda nao passam
- ajustar fixtures e runner ate GREEN

**Validation**

```bash
npx vitest run src/core/coach-golden-runner.test.ts
npm run typecheck
```

**Merge gate**
- `src/core/coach-golden-runner.test.ts` verde
- `npm run typecheck` verde

**Rollback plan**
- restaurar os goldens anteriores
- voltar o runner para validar apenas o formato antigo
- preservar o dominio novo mesmo que o gate de benchmark volte temporariamente

**Acceptance checklist**
- [ ] os goldens cobrem o plano de sessao
- [ ] o benchmark nao quebra por pequenas variacoes de texto permitidas
- [ ] o gate continua util para regressao

**Prompt do proximo chat**

```text
Quero executar a Task 14 do arquivo docs/plans/2026-04-18-coach-extremo.md.

Regras:
- leia primeiro docs/SDD-coach-extremo.md e docs/plans/2026-04-18-coach-extremo.md
- execute somente a Task 14
- TDD obrigatorio
- nao avance para nenhuma task alem dela
- no final entregue: arquivos alterados, comandos rodados, status do acceptance checklist e riscos residuais
```

---

## Task 14 - Fechar documentacao e verificacao final

**Outcome:** o repo termina com docs alinhadas e validacao final verde para o escopo do Coach Extremo.

**Scope guard:** esta task nao abre novos escopos funcionais.

**Estimated time:** 15-30 min

**Risk level:** baixo

**Ownership notes:** esta task consolida a documentacao final. Nao deve introduzir feature nova nem mexer em contratos alem do necessario para alinhar docs.

**Files**
- Modify: `docs/SDD-coach-extremo.md`
- Modify: `README.md`
- Modify: `docs/plans/2026-04-18-coach-extremo.md`

**Implementation checklist**
- [ ] refletir `coachPlan` no SDD
- [ ] refletir o fluxo "1 task = 1 chat" no plano, se necessario ajustar algo apos implementacao
- [ ] refletir TDD obrigatorio e benchmark no README, se fizer sentido
- [ ] revisar consistencia dos termos usados no repo

**TDD target**
- esta task e documental, mas ainda exige verificacao final dos testes do escopo completo

**Validation**

```bash
npx vitest run
npm run typecheck
npm run build
```

Se a suite local de browser estiver estavel nesta altura:

```bash
npx playwright test
```

**Merge gate**
- `npx vitest run` verde
- `npm run typecheck` verde
- `npm run build` verde
- `npx playwright test` verde se a suite estiver estavel e fizer parte do gate local

**Rollback plan**
- reverter apenas alteracoes documentais e pequenos ajustes de alinhamento
- se algum comando final falhar por mudanca documental indireta, remover a alteracao documental que causou o problema
- nao abrir escopo novo de implementacao dentro desta task

**Acceptance checklist**
- [ ] Vitest verde
- [ ] typecheck verde
- [ ] build verde
- [ ] docs alinhadas com o contrato final
- [ ] o plano continua executavel task por task

**Observacao terminal**

Task 14 nao deve abrir escopo funcional novo. Se a validacao final revelar bug de implementacao, registre o risco e corrija somente quando a correcao for mecanica e indispensavel para o gate documental; caso contrario, abra um novo plano/task especifico.

---

## Final Definition of Done

O plano inteiro so esta concluido quando:

- [ ] `coachPlan` existe no dominio
- [ ] `coachPlan` nasce de extracao de sinais, ranking, bloqueios e tier
- [ ] `CoachFeedback[]` continua existindo como detalhe
- [ ] memoria minima influencia o coach
- [ ] o LLM continua sob guardrails fortes
- [ ] a dashboard mostra veredito de sessao
- [ ] o historico consegue hidratar o plano
- [ ] o benchmark cobre o plano novo
- [ ] as validacoes finais passam

Plan complete and saved to `docs/plans/2026-04-18-coach-extremo.md`.
