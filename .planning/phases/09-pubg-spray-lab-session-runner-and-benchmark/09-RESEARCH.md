# Fase 9: PUBG Spray Lab Session Runner And Benchmark - Pesquisa

**Fase:** 09 - PUBG Spray Lab Session Runner And Benchmark
**Pesquisado em:** 2026-05-08
**Status:** pronto para planejamento

## Objetivo Da Pesquisa

Responder o que precisa estar claro antes de planejar a fase 9.

A fase 9 deve construir o Spray Lab em cima do sistema de `CompleteTrainingProtocol` entregue na fase 8. O Lab nao e uma pagina generica de curso, nem uma nova esteira de processamento de video no servidor. Ele precisa ser uma camada de execucao: contrato versionado, runner guiado, fidelidade da sessao, indice contextual, persistencia, validacao compativel, estados de reparo, Free/Pro honesto, continuidade em dashboard/historico/coach, snapshots de benchmark e uma verificacao No False Done.

## Fontes Locais Lidas

- `.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-CONTEXT.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/TESTING.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/phases/08-complete-training-protocols/08-RESEARCH.md`
- `.planning/phases/08-complete-training-protocols/08-VERIFY-CHECKLIST.md`
- `docs/SDD-coach-extremo.md`
- `docs/SDD-analise-spray.md`
- `docs/SDD-inteligencia-de-sens.md`
- `docs/benchmark-runner.md`
- `docs/benchmark-reports/latest.md`
- `src/types/engine.ts`
- `src/core/training-protocol-drills.ts`
- `src/core/training-protocols.ts`
- `src/core/complete-training-protocol-validation.ts`
- `src/actions/history.ts`
- `src/actions/dashboard-active-coach-loop.ts`
- `src/actions/dashboard.ts`
- `src/app/analyze/analysis-client.tsx`
- `src/app/analyze/results-dashboard.tsx`
- `src/app/analyze/results-dashboard-view-model.ts`
- `src/app/analyze/complete-training-protocol-view-model.ts`
- `src/app/dashboard/page.tsx`
- `src/app/history/page.tsx`
- `src/app/history/[id]/page.tsx`
- `src/app/history/history-protocol-view-model.ts`
- `src/lib/product-entitlements.ts`
- `src/lib/premium-projection.ts`
- `src/types/benchmark.ts`
- `scripts/run-benchmark.ts`
- `scripts/verify-phase8-training-protocols.ts`
- `package.json`

Nao houve nova pesquisa externa neste passe. O contexto da fase ja carrega as referencias externas necessarias; a execucao da fase 9 deve evitar novas alegacoes factuais externas sem checar fontes oficiais.

## Contrato Atual Do Produto

O codigo ja esta preparado para receber o Lab, desde que o Lab reutilize os contratos de verdade existentes:

- `CompleteTrainingProtocol` ja existe em `CoachPlan`, com drill, tier, ambiente, contexto, dose, preparacao, validacao, transferencia, downgrade, auditoria, resumo Free e secoes Pro.
- `TRAINING_PROTOCOL_DRILLS` ja possui familias estaveis: captura, validacao, vertical, horizontal, timing, consistencia, sensibilidade e loadout. Tambem existe `future_spray_lab` como gancho de ambiente.
- `buildCompleteTrainingProtocol` ja reduz forca do protocolo por nivel de decisao, contexto ausente, limitacoes de suporte, fadiga/dor, mudanca de variavel, conflito de resultado e ausencia de validacao compativel.
- `analysisSessions.fullResult` guarda o `AnalysisResult` completo, incluindo `coachPlan.completeProtocol`, tendencia de precisao, decisao do coach e projecao de quota.
- `complete_training_protocol_revisions` e `training_protocol_transfer_records` ja mostram o padrao de persistencia auditavel sem gravar dados fisicos sensiveis.
- `precisionEvolutionLines` e `precisionCheckpoints` ja modelam progresso por contexto compativel estrito.
- Resultado, dashboard e historico ja mostram partes do loop, mas o CTA de validacao ainda aponta para `/analyze` generico e nao carrega contexto compativel.

Implicacao: a fase 9 deve introduzir o Spray Lab como executor de protocolo e camada de evidencia. Ela nao deve reescrever o Coach Extremo nem substituir a matematica de tendencia de precisao.

## Achados Principais

### 1. Ainda nao existe contrato de Spray Lab

`src/types/engine.ts` tem contratos de protocolo e tendencia, mas nao tem sessao Lab, bloco Lab, evento Lab, fidelidade, indice Lab, snapshot de benchmark ou link de validacao.

Contratos recomendados:

- `SprayLabSessionStatus`
- `SprayLabAct = preparar | executar | fechar_resultado | validar_clip_compativel`
- `SprayLabStepState = preparar | pronto_para_spray | spray_em_andamento | descanso | checagem_rapida | resultado | validar_clip`
- `SprayLabLanePreset`
- `SprayLabSessionSnapshot`
- `SprayLabSessionEvent`
- `SprayLabFidelityReport`
- `SprayLabIndexSnapshot`
- `SprayLabBenchmarkSnapshot`
- `SprayLabValidationLink`
- `SprayLabRepairState`

Esses contratos devem se ligar a `CompleteTrainingProtocol`, `PrecisionTrendSummary` e `AnalysisResult`, sem duplicar a fonte de verdade.

### 2. As familias de drill da fase 8 bastam; o Lab precisa de adaptadores

O Lab nao deve manter uma matriz gigante de arma/optic/distancia. O melhor desenho e:

- familia tecnica continua estavel e testavel;
- lane do Lab embrulha `drillId` com label pt-BR, contexto alvo, dificuldade, nivel de evidencia e setup sugerido;
- exemplos podem incluir Beryl M762 3x 50m vertical, M416 40-60m, horizontal spray lane, first 10 bullets, teste de sensibilidade de uma variavel e validacao compativel;
- personalizacao exata vem do contexto do protocolo, nao de centenas de linhas estaticas.

### 3. Fidelidade da sessao precisa ser um score de primeira classe

A sessao so pode alimentar benchmark/coach com forca se as condicoes forem minimamente controladas.

Modelo recomendado:

- componentes: preparacao, controle de variaveis, conclusao de reps, disciplina de pausas, seguranca/reparo e carga de intervencao manual;
- tiers: `strong`, `usable`, `practice_only`, `invalid_for_benchmark`;
- motivos de downgrade: fadiga/dor, variavel mudou, reps puladas, pausa excessiva, fim antecipado, blocker de captura, contexto ausente e confusao;
- saida: copia de reparo para usuario e impacto legivel para benchmark/coach.

### 4. Indice Spray Lab deve ser contextual, nao nota global

O repositorio ja possui `SprayMastery` e `PrecisionTrendSummary`. O indice do Lab deve ser separado de qualquer promessa global de habilidade.

Modelo recomendado:

- nome de produto: `Indice Spray Lab` ou `score do contexto`;
- componentes: fidelidade da sessao, execucao do drill, consistencia das reps e validacao compativel;
- estados: `baseline`, `em_validacao`, `sinal_promissor`, `progresso_validado`, `regressao_validada`, `bloqueado_por_fidelidade`, `inconclusivo`;
- score provisorio e score validado separados;
- snapshot de benchmark registra versao, contexto, componentes, nivel de evidencia, tier de fidelidade, status de validacao e blockers.

### 5. Persistencia deve ser nova, minima e sem video bruto

Tabelas provaveis:

- `spray_lab_sessions`
- `spray_lab_session_events`
- `spray_lab_benchmark_snapshots`
- `spray_lab_validation_links`

Guardar apenas evidencia necessaria: usuario, sessao base, protocolo, status, ato/estado, chave de contexto, lane, snapshot do protocolo, fidelidade, indice, outcome e link de validacao. Nao guardar video bruto do Lab, historico de dor, perfil de saude, metricas corporais ou rotina fisica detalhada.

### 6. Entitlements ja nomeiam o recurso, mas ainda nao o concedem

`src/types/monetization.ts` ja contem `spray_lab.session_runner` e `spray_lab.benchmarks`. `premium-projection` ja sabe nomear essas features, mas `productProEntitlementKeys` ainda nao as concede.

Corte recomendado:

- Free: sessao guiada basica a partir do protocolo atual, timer assistido simples, checklist, score provisorio curto e CTA de validacao.
- Pro: profundidade do runner, lanes, auditoria, historico de sessoes, indice validado, benchmark por contexto, comparacoes e continuidade.

### 7. Validacao compativel ainda e CTA generico

O produto ja escreve `Gravar validacao compativel`, mas nao abre modo de validacao.

Desenho recomendado:

- `/analyze?mode=validation&baseSessionId=...&protocolId=...&labSessionId=...`;
- servidor carrega e autoriza a sessao base;
- pagina passa alvo sanitizado para `AnalysisClient`;
- upload/settings pre-carregam arma, optic, distancia, stance, attachments, sens/DPI/VSM/FOV e patch quando existirem;
- usuario confirma que variaveis ficaram iguais;
- variavel alterada rebaixa evidencia em vez de fingir compatibilidade;
- resultado registra link de validacao e compara contra base/protocolo/sessao.

### 8. Clips bloqueados ainda viram erro generico

`analysis-client.tsx` joga erro quando `sprayValidity.decisionLevel === 'blocked_invalid_clip'`. A mensagem melhorou, mas a UI cai em estado de erro. A fase 9 deve transformar isso em UX de reparo:

- `validacao_bloqueada`
- `clip_inconclusivo`
- `captura_fraca`
- `contexto_incompativel`
- `nao_contou_como_benchmark`
- `tentativa_salva_como_pratica`

Cada estado deve explicar o que ocorreu, por que importa, o que ainda pode ser usado e como corrigir agora.

### 9. Dashboard e historico ja tem a divisao certa de papeis

`buildDashboardActiveCoachLoop` ja modela pendente/concluido/validacao/conflito e inclui detalhes do protocolo. `history/[id]` ja mostra auditoria de protocolo, outcomes, revisoes, transferencia, checkpoints e resultado completo.

A fase 9 deve ampliar isso:

- dashboard vira centro de comando para sessao Lab ativa, resultado pendente, validacao necessaria ou proxima acao;
- historico vira auditoria de fidelidade, snapshot de benchmark, link de validacao e reparos;
- resultado adiciona CTAs contextuais para iniciar/continuar Lab e validar;
- `/spray-lab` e onde a sessao roda de fato.

### 10. Benchmarks podem absorver a verdade do Lab

`src/types/benchmark.ts` e `scripts/run-benchmark.ts` ja validam partes do protocolo completo. A fase 9 pode adicionar:

- expectativa de lane;
- expectativa de fidelidade;
- expectativa de indice provisorio/validado;
- expectativa de status de link de validacao;
- expectativa de snapshot de benchmark;
- expectativa de estado de reparo para clip invalido/inconclusivo.

Isso complementa `benchmark:gate`; nao substitui os gates de tracking, diagnostico e coach.

### 11. A fase 9 precisa de verificador proprio

Espelhar a fase 8 com `verify:phase9:spray-lab` e checklist deterministico.

Linhas obrigatorias sugeridas:

- `contracts.lab_session`
- `lanes.catalog`
- `fidelity.scoring`
- `index.contextual`
- `persistence.sessions`
- `projection.free_pro`
- `ui.session_runner`
- `validation.preload`
- `repair.blocked_states`
- `dashboard.command`
- `history.audit`
- `coach.handoff`
- `benchmark.snapshots`
- `playwright.desktop_mobile`
- `commands.typecheck`
- `commands.vitest`
- `commands.benchmark_gate`
- `commands.verify_phase9`

## Arquitetura Recomendada

### Modulos Core

- `src/core/spray-lab-lanes.ts`: catalogo de lanes e selecao protocolo -> lane.
- `src/core/spray-lab-session.ts`: state machine, reducer de eventos, atos/estados e controles manuais.
- `src/core/spray-lab-fidelity.ts`: componentes, tiers e motivos de downgrade/reparo.
- `src/core/spray-lab-scoring.ts`: indice provisorio/validado e snapshot de benchmark.
- `src/core/spray-lab-validation.ts`: alvo de validacao, confirmacao de variaveis e status do link.

### Dados E Actions

- `src/actions/spray-lab.ts`: criar/continuar/atualizar/concluir sessao, registrar eventos, snapshot e validacao.
- `src/db/schema.ts` e `drizzle/0012_spray_lab_sessions.sql`: persistencia normalizada do Lab.
- `src/lib/spray-lab-projection.ts` ou extensao de `premium-projection.ts`: profundidade Free/Pro.

### UI E Rotas

- `src/app/spray-lab/page.tsx`: rota server que carrega estado util.
- `src/app/spray-lab/spray-lab-runner.tsx`: cockpit client.
- `src/app/spray-lab/spray-lab-view-model.ts`: modelo de rota/projecao.
- `src/app/analyze/page.tsx` e `analysis-client.tsx`: modo de validacao compativel.
- CTAs em resultado/dashboard/historico: iniciar/continuar Lab, fechar resultado e gravar validacao.

### Verificacao

- `scripts/verify-phase9-spray-lab.ts`
- `src/ci/phase9-spray-lab-evidence.test.ts`
- `.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-VERIFY-CHECKLIST.md`
- `docs/phase9-spray-lab-verification.md`
- testes unitarios/contratuais focados e Playwright desktop/mobile do runner.

## Divisao Recomendada De Planos

1. Contratos core, catalogo de lanes, state machine, fidelidade e indice contextual.
2. Persistencia, actions, validation links, snapshots de benchmark e projecao Free/Pro.
3. Cockpit mobile-first em `/spray-lab` com preparar/executar/descanso/checagem/resultado/validar.
4. Modo explicito de validacao compativel e estados premium de reparo para clips bloqueados/inconclusivos.
5. Continuidade em resultado/dashboard/historico/coach, comando ativo e auditoria de progresso.
6. Benchmark/goldens, matriz Playwright, verificador deterministico e evidencia No False Done.

Isso mantem dependencias limpas: verdade primeiro, storage/actions depois, UI do runner quando o estado existe, validacao/reparo como fluxo critico separado, superficies de continuidade depois dos dados, e evidencia final por ultimo.

## RESEARCH COMPLETE

A fase 9 pode ser planejada como seis planos executaveis em cinco ondas, preservando analise browser-first, honestidade de evidencia, utilidade Free, profundidade Pro e a fronteira contra a fase 10 de programas guiados.
