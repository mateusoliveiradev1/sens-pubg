# Spray Analysis Execution Plan

Status: execution backlog  
Data: 2026-04-13  
Base document: `docs/SDD-analise-spray.md`

## 1. Objetivo

Este documento transforma o SDD em um plano de execucao atomico para IA e engenharia humana.

A regra e simples:

- uma task por vez;
- escopo pequeno;
- TDD obrigatorio sempre que for mudanca comportamental;
- aceite objetivo;
- sem dizer "feito" sem prova;
- sem mexer em workstreams paralelos sem necessidade.

## 2. Modo de trabalho

### 2.1 Regras nao negociaveis

1. Nenhuma task fecha sem testes verdes relevantes.
2. Toda task que muda comportamento precisa começar por teste que falha.
3. Toda task precisa preservar ou melhorar build, lint e tipagem.
4. Nenhuma task pode introduzir regra de produto baseada em "achismo" se o valor depende de patch oficial.
5. O coach nunca pode inventar evidencias que o motor nao mediu.
6. O sistema nunca pode transformar incerteza em certeza artificial.

### 2.2 Ritual de TDD por task

Para cada task:

1. Escrever ou ajustar teste que prova o comportamento alvo.
2. Rodar o teste e confirmar falha.
3. Implementar a menor mudanca possivel para passar.
4. Refatorar mantendo a suite verde.
5. Rodar validacao local da task.
6. Atualizar docs/fixtures se a task alterar contrato.

### 2.3 Tipos de teste aceitos

- Unit: funcoes puras, formulas, mapeamentos, regras de negocio.
- Integration: pipeline entre 2-4 modulos.
- Contract: schema, payloads, tipos, dados canonicos.
- Golden: clips, tracking, diagnostico, coach output.
- E2E: fluxo real de UI.
- Benchmark: erro quantitativo comparado a baseline/golden.

### 2.4 Definition of Done global

O programa so pode ser chamado de "quase perfeito para uso real" quando:

- build estiver verde;
- unit/integration/e2e estiverem verdes;
- benchmark existir e rodar;
- dominio estiver patch-aware;
- tracking expuser confianca real;
- sensibilidade vier de matematica/calibracao, nao so heuristica;
- coach estiver limitado por evidencia e confianca;
- nenhuma recomendacao contradizer o patch atual.

## 3. Como uma IA deve executar este plano

### 3.1 Regras de foco

- pegar apenas 1 task `in_progress`;
- se a task depender de outra nao pronta, parar e registrar bloqueio;
- nao "adiantar" varias tasks no mesmo pacote;
- nao trocar contrato publico sem atualizar testes e docs;
- nao fazer refatoracao lateral sem necessidade do aceite.

### 3.2 Pacote minimo que a IA deve carregar

Ao iniciar uma task, a IA deve ler apenas:

- este arquivo;
- a task escolhida;
- os arquivos listados no campo `Read/Write`;
- os testes relacionados.

### 3.3 Formato de entrega esperado por task

- o que mudou;
- quais testes foram criados/alterados;
- quais comandos rodaram;
- se ha bloqueio, risco ou follow-up.

## 4. Mapa de workstreams

| Stream | Nome | Objetivo |
|---|---|---|
| W00 | Baseline | deixar build/testes/UX minima estaveis |
| W10 | Canonical Domain 2026 | tornar armas, optics e attachments patch-aware |
| W20 | Math Core | formalizar projecao, sens e calibracao |
| W30 | Tracking | tornar percepcao robusta, honesta e auditavel |
| W40 | Metrics & Diagnosis | scoring rubricado com incerteza |
| W50 | Coach & AI | feedback factual, patch-aware e evidence-linked |
| W60 | Validation & Data | dataset, goldens, benchmark e CI |
| W70 | Product Integration | expor patch, confianca e resultado certo na UX |

## 5. Backlog atomico

Cada task abaixo foi desenhada para caber em uma sessao de trabalho focada.

---

## W00 - Baseline

### W00-T01 - Congelar baseline atual em relatorio reproduzivel

Goal:

- criar um ponto de partida reproduzivel com os erros atuais de build, vitest e e2e.

Read/Write:

- read: `package.json`, `vitest.config.ts`, `playwright.config.ts`
- write: `docs/baseline-2026-04-13.md`

Depends on:

- none

Acceptance:

- existe relatorio com comandos, status, falhas e arquivos impactados;
- relatorio distingue unit, build e e2e.

Tests:

- `npx vitest run`
- `npm run build`
- `npx playwright test`

TDD:

- nao se aplica; task de observacao.

### W00-T02 - Corrigir falhas de unit test existentes

Goal:

- zerar as falhas atuais em `coach-engine.test.ts` e `sensitivity-engine.test.ts`.

Read/Write:

- read/write: `src/core/coach-engine.ts`, `src/core/coach-engine.test.ts`
- read/write: `src/core/sensitivity-engine.ts`, `src/core/sensitivity-engine.test.ts`

Depends on:

- W00-T01

Acceptance:

- `npx vitest run` sem falhas nas suites atuais;
- nenhuma regressao em suites que antes passavam.

Tests:

- `npx vitest run`

TDD:

- primeiro ajustar ou adicionar teste que expresse o contrato correto;
- depois corrigir implementacao.

### W00-T03 - Corrigir build de producao

Goal:

- fazer `npm run build` passar com ambiente local atual.

Read/Write:

- arquivos identificados pela falha de build

Depends on:

- W00-T01

Acceptance:

- `npm run build` termina com exit code 0;
- sem workaround que degrade runtime deliberadamente.

Tests:

- `npm run build`

TDD:

- se a causa for em modulo puro ou contrato, primeiro escrever teste direcionado;
- se a causa for wiring/config, validar por build.

### W00-T04 - Corrigir E2E minimo de navegacao e acessibilidade

Goal:

- zerar as 4 falhas atuais do Playwright.

Read/Write:

- `e2e/a11y.spec.ts`
- `e2e/pages.spec.ts`
- `e2e/responsive.spec.ts`
- componentes de header/login/analyze afetados

Depends on:

- W00-T03

Acceptance:

- `npx playwright test` verde;
- links de navegacao e dropzone encontram os seletores esperados;
- botoes de login focaveis ou testes ajustados ao comportamento correto do produto.

Tests:

- `npx playwright test`

TDD:

- corrigir expectativa ou comportamento sempre com justificativa explicita.

### W00-T05 - Alinhar copy de ingestao e claims de IA

Goal:

- alinhar UI, FAQ e README com a realidade do sistema atual e com o plano de evolucao.

Read/Write:

- `README.md`
- `src/app/analyze/page.tsx`
- `src/ui/components/faq-accordion.tsx`
- `src/i18n/*.ts`

Depends on:

- W00-T04

Acceptance:

- duracao de clip e claims de IA nao se contradizem;
- linguagem nao promete precisao nao suportada.

Tests:

- `npx playwright test`
- smoke manual de textos criticos

TDD:

- nao obrigatorio, mas snapshots/queries de texto podem ser adicionados.

---

## W10 - Canonical Domain 2026

### W10-T01 - Adicionar `patchVersion` ao dominio de analise

Goal:

- toda analise deve saber em qual patch do jogo ela foi calculada.

Read/Write:

- `src/db/schema.ts`
- `src/types/engine.ts`
- `src/actions/history.ts`
- `src/app/analyze/analysis-client.tsx`

Depends on:

- W00-T05

Acceptance:

- `patchVersion` existe em sessao de analise, persistencia e resultado;
- valor aparece no payload final.

Tests:

- unit/contract tests para tipos/schema
- integration test de persistencia

TDD:

- criar teste de schema/contract antes da mudanca.

### W10-T02 - Criar catalogo canonico de optics 2026

Goal:

- substituir lista estatica atual por catalogo patch-aware de optics.

Read/Write:

- `src/game/pubg/scope-multipliers.ts`
- novo arquivo `src/game/pubg/optic-catalog.ts`
- testes novos em `src/game/pubg/optic-catalog.test.ts`

Depends on:

- W10-T01

Acceptance:

- inclui `hybrid-scope` e estado `15x`;
- consegue responder optic por `patchVersion`;
- expõe multiplicadores e estados oticos.

Tests:

- unit tests de lookup
- contract tests de patch coverage

TDD:

- escrever fixtures do patch 41.1 antes da implementacao.

### W10-T03 - Criar catalogo canonico de attachments 2026

Goal:

- representar attachments por slot, patch, disponibilidade e efeitos.

Read/Write:

- novo `src/game/pubg/attachment-catalog.ts`
- testes `src/game/pubg/attachment-catalog.test.ts`

Depends on:

- W10-T01

Acceptance:

- suporta Muzzle Brake, Compensator, Heavy Stock, Half Grip, Vertical Grip, Thumb Grip, Lightweight Grip, Tilted Grip;
- marca Angled Foregrip como removido de world spawn em 41.1+;
- distingue efeito por dimensao.

Tests:

- unit tests de compatibilidade e availability

TDD:

- começar por fixture oficial de patch.

### W10-T04 - Reestruturar schema de `weapon_profiles`

Goal:

- sair do modelo `baseVerticalRecoil + baseHorizontalRng + multipliers limitados`.

Read/Write:

- `src/db/schema.ts`
- `drizzle/*`
- `src/db/seed.ts`

Depends on:

- W10-T02
- W10-T03

Acceptance:

- schema suporta efeitos multidimensionais por attachment;
- migration executa localmente;
- seed carrega sem perda de informacao relevante.

Tests:

- schema tests
- seed tests

TDD:

- criar teste de shape do objeto canonico antes da migration.

### W10-T05 - Separar `weapon_patch_profiles` de `weapon_registry`

Goal:

- permitir que uma arma exista em varios patches com perfis diferentes.

Read/Write:

- novo `src/game/pubg/weapon-patch-catalog.ts`
- `src/db/schema.ts`
- `src/db/seed.ts`

Depends on:

- W10-T04

Acceptance:

- lookup usa `(weaponId, patchVersion)`;
- removals/deprecations sao representaveis.

Tests:

- unit tests de lookup por patch
- tests de armas removidas/deprecated

TDD:

- fixture com pelo menos um caso de alteracao entre patches.

### W10-T06 - Atualizar profile wizard para optics e patch atual

Goal:

- coletar todos os sliders relevantes para optics modernos.

Read/Write:

- `src/app/profile/profile-wizard.tsx`
- `src/app/profile/profile-wizard.module.css`

Depends on:

- W10-T02

Acceptance:

- UI contempla Hybrid Scope ou estado equivalente;
- 15x nao fica invisivel do ponto de vista de configuracao.

Tests:

- component test ou Playwright targeted

TDD:

- adicionar seletor/teste de render antes da implementacao.

---

## W20 - Math Core

### W20-T01 - Criar modulo de projecao angular exata

Goal:

- formalizar `pixel -> angulo` via inversao de perspectiva.

Read/Write:

- novo `src/game/pubg/projection-math.ts`
- testes `src/game/pubg/projection-math.test.ts`

Depends on:

- W10-T02

Acceptance:

- modulo implementa `fov_v`, `ang_x`, `ang_y`, `delta_theta`;
- cobre aspect ratio variavel, nao so `16/9`.

Tests:

- unit tests numericos
- golden numeric fixtures

TDD:

- escrever fixtures matematicas conhecidas antes.

### W20-T02 - Remover uso de aproximacoes lineares quando houver projecao exata

Goal:

- trocar as aproximacoes atuais em metricas e tracking.

Read/Write:

- `src/game/pubg/sens-math.ts`
- `src/game/pubg/scope-multipliers.ts`
- `src/core/spray-metrics.ts`

Depends on:

- W20-T01

Acceptance:

- nenhum caminho principal usa aproximacao linear sem comentario/justificativa;
- conversoes centrais usam modulo novo.

Tests:

- unit tests das funcoes alteradas
- regression tests matematicos

TDD:

- adicionar teste comparando antiga vs nova API onde relevante.

### W20-T03 - Formalizar sensibilidade efetiva patch-aware

Goal:

- encapsular `phi_patch`, `effective_yaw`, `effective_pitch`.

Read/Write:

- `src/game/pubg/sens-math.ts`
- novo `src/game/pubg/effective-sens.ts`
- testes dedicados

Depends on:

- W10-T02
- W10-T03

Acceptance:

- API recebe `patchVersion`, sliders e optic state;
- output diferencia yaw/pitch;
- suporta VSM explicitamente.

Tests:

- unit tests
- property tests simples de monotonicidade

TDD:

- primeiro escrever contratos de monotonicidade e reversibilidade.

### W20-T04 - Introduzir erro linear por distancia

Goal:

- converter erro angular em erro linear no alvo.

Read/Write:

- novo `src/game/pubg/error-math.ts`
- `src/core/spray-metrics.ts`

Depends on:

- W20-T01

Acceptance:

- metricas expõem erro angular e erro linear;
- `distance` passa a influenciar severidade.

Tests:

- unit tests numericos

TDD:

- criar teste de 15m vs 80m antes.

### W20-T05 - Reescrever motor de recomendacao de sens por funcao objetivo

Goal:

- sair de faixas heuristicas e usar otimizacao por residual.

Read/Write:

- `src/core/sensitivity-engine.ts`
- `src/core/sensitivity-engine.test.ts`

Depends on:

- W20-T03
- W20-T04
- W40-T03

Acceptance:

- a recomendacao passa a depender de residual medido;
- `playStyle` e `gripStyle` viram prior/context, nao nucleo da matematica;
- reasoning expõe variaveis do modelo.

Tests:

- unit tests
- golden tests com perfis sintéticos

TDD:

- primeiro escrever novos casos de aceite.

---

## W30 - Tracking

### W30-T01 - Definir contrato honesto do resultado de tracking

Goal:

- worker e engine precisam compartilhar `confidence`, `framesLost`, `trackingQuality`, `visibleFrames`.

Read/Write:

- `src/types/engine.ts`
- `src/workers/aimAnalyzer.worker.ts`
- `src/app/analyze/analysis-client.tsx`

Depends on:

- W00-T05

Acceptance:

- nao existe mais preenchimento artificial de `1.0/0`;
- payload final preserva qualidade real do tracking.

Tests:

- contract tests
- integration test do worker mapping

TDD:

- criar teste que falha com o comportamento artificial atual.

### W30-T02 - Integrar tracker baseline reutilizavel no caminho principal

Goal:

- usar `crosshair-tracking.ts` ou substituto oficial como baseline real do pipeline.

Read/Write:

- `src/core/crosshair-tracking.ts`
- `src/app/analyze/analysis-client.tsx`
- testes novos de integracao

Depends on:

- W30-T01

Acceptance:

- o pipeline principal usa tracker com `trackingQuality` real;
- modulo morto deixa de ficar solto.

Tests:

- integration tests
- golden tracking fixture

TDD:

- fixture de tracking simples primeiro.

### W30-T03 - Adicionar estado de visibilidade e oclusao

Goal:

- o motor distinguir `tracked`, `occluded`, `lost`, `uncertain`.

Read/Write:

- `src/workers/aimAnalyzer.worker.ts`
- `src/types/engine.ts`

Depends on:

- W30-T01

Acceptance:

- frames nao detectados nao somem silenciosamente;
- status por frame e agregacao existem.

Tests:

- unit tests do worker logic

TDD:

- escrever casos com mira ausente/muzzle flash sintético.

### W30-T04 - Adicionar ROI/stabilization stage

Goal:

- estabilizar a area relevante antes de medir a mira.

Read/Write:

- novo `src/core/roi-stabilization.ts`
- integracao no pipeline

Depends on:

- W30-T02

Acceptance:

- tracking fica menos sensivel a ruido fora da ROI;
- stage e opcional e testado.

Tests:

- unit
- integration

TDD:

- primeiro fixture mostrando falha sem ROI.

### W30-T05 - Criar golden harness de tracking

Goal:

- benchmark minimo de tracking com fixtures versionadas.

Read/Write:

- `tests/goldens/tracking/*`
- novo runner `scripts/run-tracking-goldens.*`

Depends on:

- W30-T03

Acceptance:

- harness compara saida atual com expected;
- calcula cobertura e erro.

Tests:

- runner test
- golden run

TDD:

- construir 1 fixture limpa e 1 degradada primeiro.

---

## W40 - Metrics & Diagnosis

### W40-T01 - Introduzir faseamento do spray

Goal:

- separar burst, sustained e fatigue como entidades explicitas.

Read/Write:

- `src/core/spray-metrics.ts`
- testes relacionados

Depends on:

- W30-T02

Acceptance:

- segmentacao temporal existe e e testada;
- metrica por fase nao depende de magia implicita.

Tests:

- unit tests

TDD:

- construir trajetoria sintética com mudanca clara de fase.

### W40-T02 - Modelar recoil esperado por tiro

Goal:

- permitir comparacao por shot index, nao so por agregado.

Read/Write:

- novo `src/game/pubg/recoil-sequences.ts`
- `src/core/spray-metrics.ts`

Depends on:

- W10-T05

Acceptance:

- arma/patch retornam perfil por bala;
- metricas podem comparar residual por shot.

Tests:

- unit tests do catalogo
- tests de alinhamento por shot

TDD:

- fixture minima com 5 tiros.

### W40-T03 - Propagar incerteza para metricas

Goal:

- metricas carregarem confidence/coverage.

Read/Write:

- `src/core/spray-metrics.ts`
- `src/types/engine.ts`

Depends on:

- W30-T03

Acceptance:

- cada metrica relevante tem coverage e confidence;
- dashboard pode distinguir medicao forte de medicao fraca.

Tests:

- unit tests
- contract tests

TDD:

- escrever teste com frames perdidos.

### W40-T04 - Reescrever `runDiagnostics` com rubrica v2

Goal:

- diagnostico baseado em fase, residual e confianca.

Read/Write:

- `src/core/diagnostic-engine.ts`
- `src/core/diagnostic-engine.test.ts`

Depends on:

- W40-T01
- W40-T02
- W40-T03
- W20-T04

Acceptance:

- diagnostico cita fase dominante;
- severidade usa erro angular/linear e confidence;
- classe "inconclusive" existe quando a evidencia for fraca.

Tests:

- unit tests
- golden diagnosis fixtures

TDD:

- criar casos de overpull/underpull/inconclusive antes.

---

## W50 - Coach & AI

### W50-T01 - Definir schema de coach evidence-linked

Goal:

- coach output padronizado com evidencia, confianca e plano.

Read/Write:

- `src/types/engine.ts`
- `src/core/coach-engine.ts`

Depends on:

- W40-T04

Acceptance:

- output tem: `problem`, `evidence`, `confidence`, `likelyCause`, `adjustment`, `drill`, `verifyNextClip`;
- nao existe texto solto sem ancoragem.

Tests:

- contract tests
- unit tests do coach schema

TDD:

- escrever shape primeiro.

### W50-T02 - Tornar coach patch-aware

Goal:

- impedir recomendacoes invalidas para o patch.

Read/Write:

- `src/core/coach-engine.ts`
- `src/game/pubg/attachment-catalog.ts`
- testes novos

Depends on:

- W10-T03
- W50-T01

Acceptance:

- coach nao recomenda attachment removido/inexistente no patch;
- coach conhece Tilted Grip/Hybrid Scope quando aplicavel.

Tests:

- unit tests por patch

TDD:

- caso 41.1 com Angled proibido primeiro.

### W50-T03 - Tornar coach confidence-aware

Goal:

- reduzir agressividade e certezas quando a analise for fraca.

Read/Write:

- `src/core/coach-engine.ts`
- testes

Depends on:

- W40-T03
- W50-T01

Acceptance:

- existe modo `inconclusive` ou `low-confidence`;
- recomendacao inclui pedido de novo clip quando apropriado.

Tests:

- unit tests com low confidence fixture

TDD:

- caso de confidence baixa antes.

### W50-T04 - Adicionar golden fixtures de coach

Goal:

- congelar saidas essenciais do coach.

Read/Write:

- `tests/goldens/coach/*`
- runner ou tests snapshots

Depends on:

- W50-T03

Acceptance:

- ao menos 5 cenarios goldens;
- snapshots/goldens estaveis e explicitos.

Tests:

- golden tests

TDD:

- fixture first.

### W50-T05 - Criar adapter opcional para LLM com guardrails

Goal:

- permitir camada generativa sem dar a ela poder de inventar metricas.

Read/Write:

- novo `src/core/coach-llm-adapter.ts`
- schema/guardrails

Depends on:

- W50-T01
- W50-T03

Acceptance:

- adapter recebe apenas dados estruturados e confianca;
- se indisponivel, fallback deterministic funciona;
- nenhuma saida escapa do schema.

Tests:

- unit tests
- mock integration tests

TDD:

- começar pelo schema e pelo fallback.

---

## W60 - Validation & Data

### W60-T01 - Definir formato do benchmark dataset

Goal:

- formalizar como clips e labels serao armazenados.

Read/Write:

- novo `docs/dataset-spec.md`
- novo schema em `src/types/benchmark.ts`

Depends on:

- W10-T05

Acceptance:

- formato define patch, arma, optics, attachments, labels e metadata de qualidade.

Tests:

- schema validation tests

TDD:

- schema first.

### W60-T02 - Criar primeiro pacote de goldens reais

Goal:

- registrar clips minimos para tracking/diagnostico/coach.

Read/Write:

- `tests/goldens/*`

Depends on:

- W60-T01

Acceptance:

- pelo menos 1 clip limpo e 1 degradado;
- labels basicas documentadas.

Tests:

- runner/harness tests

TDD:

- nao se aplica; tarefa de dados.

### W60-T03 - Criar runner de benchmark local

Goal:

- rodar tracking + diagnostico + coach sobre goldens com score resumido.

Read/Write:

- `scripts/run-benchmark.*`
- docs de uso

Depends on:

- W30-T05
- W50-T04
- W60-T02

Acceptance:

- comando unico gera relatorio de erro;
- output inclui regressao vs baseline.

Tests:

- runner test
- smoke benchmark run

TDD:

- teste de CLI/script primeiro.

### W60-T04 - Integrar benchmark ao CI

Goal:

- impedir regressao silenciosa.

Read/Write:

- `.github/workflows/*`

Depends on:

- W60-T03

Acceptance:

- CI executa benchmark minimo;
- falha quando regressao supera threshold.

Tests:

- workflow validation

TDD:

- sim, em YAML/validation minima.

---

## W70 - Product Integration

### W70-T01 - Expor patch e confianca no resultado

Goal:

- o usuario ver em qual patch e com qual confianca a analise foi feita.

Read/Write:

- `src/app/analyze/results-dashboard.tsx`
- `src/app/history/[id]/page.tsx`

Depends on:

- W10-T01
- W40-T03

Acceptance:

- dashboard mostra `patchVersion`, `tracking coverage`, `confidence`;
- historico preserva esses dados.

Tests:

- component tests
- Playwright targeted

TDD:

- query de UI primeiro.

### W70-T02 - Expor estado optico e distancia corretamente

Goal:

- parar de tratar scope/distance como campos decorativos.

Read/Write:

- `src/app/analyze/analysis-client.tsx`
- `src/app/analyze/results-dashboard.tsx`

Depends on:

- W20-T04
- W10-T02

Acceptance:

- resultado explica optic state usado e distancia usada;
- se houver ambiguidade, UI informa.

Tests:

- integration tests
- Playwright targeted

TDD:

- criar teste de payload/resultado.

### W70-T03 - Atualizar FAQ, profile e help para o motor v2

Goal:

- documentacao in-product coerente com o motor final.

Read/Write:

- `src/ui/components/faq-accordion.tsx`
- `src/app/profile/*`
- i18n

Depends on:

- W70-T01
- W70-T02

Acceptance:

- texto reflete patch-aware math, confidence e limites do sistema.

Tests:

- smoke manual
- Playwright se houver queries estaveis

TDD:

- opcional.

## 6. Ordem recomendada de execucao

Executar nesta ordem:

1. W00-T01 -> W00-T05
2. W10-T01 -> W10-T06
3. W20-T01 -> W20-T04
4. W30-T01 -> W30-T05
5. W40-T01 -> W40-T04
6. W20-T05
7. W50-T01 -> W50-T05
8. W60-T01 -> W60-T04
9. W70-T01 -> W70-T03

## 7. Gates por stream

### Gate A - Engine baseline

Precisa para prosseguir de W00 para W10:

- build verde
- vitest verde
- playwright verde ou falhas explicitamente aceitas/documentadas

### Gate B - Domain completeness

Precisa para prosseguir de W10 para W20/W30:

- patchVersion existe
- optics 2026 existem
- attachment catalog 2026 existe

### Gate C - Honest tracking

Precisa para prosseguir de W30 para W40/W50:

- trackingQuality real
- framesLost real
- confidence real

### Gate D - Real recommendation

Precisa para chamar a stack de "quase pronta para uso real":

- sens baseada em residual/otimizacao
- coach patch-aware
- benchmark existente
- UI mostra confianca

## 8. Checklist final de perfeicao pratica

Antes de usar em producao real:

- [ ] patch atual espelhado no catalogo
- [ ] nenhuma arma removida sendo tratada como valida no patch errado
- [ ] nenhuma recomendacao de attachment contradiz patch notes atuais
- [ ] Hybrid Scope e demais optics dinamicos modelados
- [ ] tracking com confidence real
- [ ] distancia entra na severidade
- [ ] sens recomendada vem de funcao objetivo
- [ ] coach cita evidencia e confianca
- [ ] benchmark roda em CI
- [ ] regressao de goldens bloqueia merge

## 9. Observacao final

Se a meta e "beirar a perfeicao", o erro mais perigoso e atacar tudo de uma vez.

O caminho certo e:

- microtasks;
- gates;
- TDD;
- benchmark;
- refinar o sistema em camadas.

Este arquivo existe exatamente para isso.
