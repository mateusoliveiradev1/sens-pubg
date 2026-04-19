# Community Execution Plan

Status: execution backlog
Data: 2026-04-15
Base document: `docs/SDD-comunidade.md`

## 1. Objetivo

Este documento transforma o SDD da comunidade em um plano de execucao atomico para implementacao futura.

Regras centrais:

- uma task por vez;
- TDD obrigatorio para mudancas comportamentais;
- nenhuma fase fecha sem provas;
- nada de quebrar analise, historico, profile, dashboard ou auth;
- nenhum servico pago novo;
- nenhuma feature premium ligada por padrao.

## 2. Modo de trabalho

### 2.1 Regras nao negociaveis

1. Nenhuma task de comunidade pode degradar o fluxo atual de analise.
2. Toda mutacao publica precisa de auth e ownership claros.
3. Toda regra de visibilidade precisa ser testada antes da implementacao.
4. Toda publicacao derivada de analise precisa usar snapshot imutavel.
5. Toda contagem importante precisa ser persistida ou derivavel do banco.
6. Nenhum hack de UI pode substituir regra server-side.
7. Nenhuma preparacao para monetizacao pode introduzir pagamento ativo nesta fase.

### 2.2 Ritual de TDD por task

Para cada task comportamental:

1. Escrever teste que prova o contrato alvo.
2. Rodar o teste e confirmar falha.
3. Implementar a menor mudanca possivel.
4. Refatorar mantendo a suite verde.
5. Rodar validacoes locais da task.
6. Atualizar docs/contratos se a task alterar schema ou payload.

### 2.3 Tipos de teste aceitos

- Unit
- Contract
- Integration
- E2E
- Auth/abuse

### 2.4 Definition of Done global

A comunidade so pode ser chamada de pronta para release inicial quando:

- publicar analise funciona ponta a ponta;
- feed publico funciona sem login;
- post detail mostra snapshot correto;
- likes/comments/saves/follows funcionam com auth;
- copy sens registra evento;
- moderacao basica existe;
- build, vitest e playwright estao verdes;
- nenhum fluxo legado foi quebrado.

## 3. Workstreams

| Stream | Nome | Objetivo |
|---|---|---|
| W00 | Preconditions | travar contratos, escopo e precondicoes |
| W10 | Domain & Schema | criar entidades, enums, contratos e indices |
| W20 | Publishing | publicar analise e persistir snapshot |
| W30 | Feed & Discovery | feed publico, detalhe do post e perfil publico |
| W40 | Engagement | likes, saves, comments e follows |
| W50 | Moderation | reports, estados e auditoria |
| W60 | Monetization Ready | entitlement boundary e campos inativos |
| W70 | Hardening | abuse guards, SEO, E2E e release gates |

## 4. Backlog atomico

---

## W00 - Preconditions

### W00-T01 - Congelar contratos da comunidade

Goal:

- transformar o SDD em baseline validada para execucao.

Read/Write:

- read: `docs/SDD-comunidade.md`
- read/write: `docs/COMMUNITY-EXECUTION-PLAN.md`

Depends on:

- none

Acceptance:

- SDD e execution plan aprovados;
- escopo V1 e nao-objetivos travados;
- preparacao para monetizacao futura explicitamente aprovada.

Tests:

- nao se aplica

TDD:

- nao se aplica

### W00-T02 - Definir naming e contratos de tipos

Goal:

- travar enums, nomes de tabelas e tipos de post/visibility/status antes de migracao.

Read/Write:

- create: `src/types/community.ts`
- create: `src/types/community.test.ts`

Depends on:

- W00-T01

Acceptance:

- enums de status, visibility, post type e entitlement key existem;
- testes de contrato cobrem valores validos e invalidos.

Tests:

- `npx vitest run src/types/community.test.ts`

TDD:

- primeiro escrever testes de contrato dos enums;
- depois implementar os tipos e helpers minimos.

Status:

- concluida em 2026-04-18

Evidence:

- `src/types/community.ts` criado com nomes canonicos de tabelas, `CommunityPostStatus`, `CommunityPostVisibility`, `CommunityPostType` e `CommunityEntitlementKey`
- `src/types/community.test.ts` criado cobrindo valores validos e invalidos
- validacao executada: `npx vitest run src/types/community.test.ts` -> 9 testes verdes

---

## W10 - Domain & Schema

### W10-T01 - Adicionar contratos de snapshot de analise para comunidade

Goal:

- definir o shape canonico do snapshot tecnico que sera publicado.

Read/Write:

- create: `src/core/community-post-snapshot.ts`
- create: `src/core/community-post-snapshot.test.ts`
- read: `src/types/engine.ts`
- read: `src/actions/history.ts`

Depends on:

- W00-T02

Acceptance:

- existe mapper deterministico de `AnalysisResult`/session para snapshot comunitario;
- snapshot inclui patch, arma, scope, distance, attachments, metrics, diagnoses, coaching e sens.

Tests:

- `npx vitest run src/core/community-post-snapshot.test.ts`

TDD:

- primeiro testar o shape minimo exigido;
- depois implementar o mapper.

Status:

- concluida em 2026-04-18

Evidence:

- `src/core/community-post-snapshot.ts` criado com `createCommunityPostAnalysisSnapshot`, `CommunityPostAnalysisSnapshot` e `CommunityPostAnalysisSnapshotSourceSession`
- snapshot canonico trava `patchVersion`, `weaponId`, `scopeId`, `distance`, `stance`, `attachmentsSnapshot`, `metricsSnapshot`, `diagnosesSnapshot`, `coachingSnapshot`, `sensSnapshot` e `trackingSnapshot`
- `src/core/community-post-snapshot.test.ts` criado cobrindo shape minimo, determinismo e detach do snapshot em relacao ao resultado original
- validacao executada: `npx vitest run src/core/community-post-snapshot.test.ts` -> 2 testes verdes

### W10-T02 - Estender schema com tabelas comunitarias core

Goal:

- adicionar `community_profiles`, `community_posts` e `community_post_analysis_snapshots`.

Read/Write:

- read/write: `src/db/schema.ts`
- create: `drizzle/0004_community_core.sql`
- create/update: `src/db/schema.test.ts`

Depends on:

- W10-T01

Acceptance:

- schema possui tabelas, relacoes e constraints principais;
- migration compila;
- testes de schema cobrem chaves e campos obrigatorios.

Tests:

- `npx vitest run src/db/schema.test.ts`

TDD:

- primeiro testar relacoes e constraints esperadas;
- depois atualizar schema e migration.

Status:

- concluida em 2026-04-18

Evidence:

- `src/db/schema.ts` estendido com `community_profiles`, `community_posts` e `community_post_analysis_snapshots`
- `community_posts` ficou com FKs para `users`, `community_profiles` e `analysis_sessions`, com `community_posts_slug_uidx` para o slug publico
- `community_post_analysis_snapshots` passou a persistir o contrato travado em `src/core/community-post-snapshot.ts`, incluindo `analysis_result_id`, `analysis_timestamp`, `analysis_result_schema_version`, `attachments_snapshot`, `metrics_snapshot`, `diagnoses_snapshot`, `coaching_snapshot`, `sens_snapshot` e `tracking_snapshot`
- `src/db/schema.test.ts` foi atualizado para cobrir campos obrigatorios, unicidade principal e FKs das tres tabelas core
- `drizzle/0004_community_core.sql` criado para materializar as tres tabelas e constraints principais
- validacoes executadas: `npx vitest run src/db/schema.test.ts` -> 8 testes verdes; `npm run typecheck` -> ok

### W10-T03 - Adicionar tabelas de engagement e moderacao

Goal:

- adicionar `community_post_likes`, `community_post_saves`, `community_post_comments`, `community_follows`, `community_reports` e `community_moderation_actions`.

Read/Write:

- read/write: `src/db/schema.ts`
- create: `drizzle/0005_community_engagement.sql`
- create/update: `src/db/schema.test.ts`

Depends on:

- W10-T02

Acceptance:

- unique constraints e FKs estao corretas;
- estados de comentario/report existem;
- schema de moderacao e engagement esta auditavel.

Tests:

- `npx vitest run src/db/schema.test.ts`

TDD:

- primeiro expressar constraints e estados em teste;
- depois implementar no schema.

Status:

- concluida em 2026-04-18

Evidence:

- `src/db/schema.test.ts` foi atualizado primeiro para cobrir `community_post_likes`, `community_post_saves`, `community_post_comments`, `community_follows`, `community_reports` e `community_moderation_actions`, incluindo PKs compostas, FKs e defaults de estado
- `src/db/schema.ts` foi estendido com as seis tabelas de engagement/moderacao, preservando o escopo estrito da W10-T03
- `community_post_comments.status` ficou com default `visible` e `community_reports.status` ficou com default `open`, mantendo os estados minimos exigidos pelo SDD
- `community_reports` e `community_moderation_actions` ficaram auditaveis com rastreamento de `reported_by_user_id`, `reviewed_by_user_id`, `actor_user_id`, `notes` e `metadata`
- `drizzle/0005_community_engagement.sql` foi criado para materializar as seis tabelas e constraints correspondentes
- validacoes executadas: `npx vitest run src/db/schema.test.ts` -> RED com 6 falhas por ausencia das novas tabelas/exports; `npx vitest run src/db/schema.test.ts` -> GREEN com 14 testes verdes; `npm run typecheck` -> ok

### W10-T04 - Adicionar tabela de copy events e scaffold de entitlements

Goal:

- persistir eventos de `copy sens` e preparar `feature_entitlements` + `user_entitlements` inativos.

Read/Write:

- read/write: `src/db/schema.ts`
- create: `drizzle/0006_community_copy_and_entitlements.sql`
- create/update: `src/db/schema.test.ts`

Depends on:

- W10-T03

Acceptance:

- copy events estao modelados;
- entitlements existem sem ativar nenhuma feature premium.

Tests:

- `npx vitest run src/db/schema.test.ts`

TDD:

- primeiro testar o contrato das tabelas novas;
- depois implementar schema e migration.

Status:

- concluida em 2026-04-18

Evidence:

- `src/db/schema.test.ts` foi atualizado primeiro para cobrir `community_post_copy_events`, `feature_entitlements` e `user_entitlements`, incluindo nullable actor em copy events, PK composta em user entitlements e default `inactive` no catalogo de features
- `src/db/schema.ts` foi estendido com as tres tabelas novas, FKs para `community_posts`, `users` e `feature_entitlements`, mantendo o scaffold de monetizacao inativo
- `community_post_copy_events` ficou com `post_id`, `copied_by_user_id` nullable, `copy_target`, `created_at` e indice por `post_id + created_at`
- `drizzle/0006_community_copy_and_entitlements.sql` foi criado para materializar copy events e o catalogo/mapa de entitlements sem ativar nenhuma feature premium
- validacoes executadas: `npx vitest run src/db/schema.test.ts` -> RED com 3 falhas por ausencia dos novos exports/tabelas; `npx vitest run src/db/schema.test.ts` -> GREEN com 17 testes verdes; `npm run typecheck` -> ok

---

## W20 - Publishing

### W20-T01 - Criar action server-side para publicar analise como draft/post

Goal:

- permitir que o usuario publique uma analise existente na comunidade.

Read/Write:

- create: `src/actions/community-posts.ts`
- create: `src/actions/community-posts.test.ts`
- read: `src/actions/history.ts`
- read: `src/core/community-post-snapshot.ts`

Depends on:

- W10-T04

Acceptance:

- action exige auth;
- action valida ownership da `analysis_session`;
- action cria `community_post` e `community_post_analysis_snapshot`.

Tests:

- `npx vitest run src/actions/community-posts.test.ts`

TDD:

- primeiro testar auth, ownership e persistencia;
- depois implementar action minima.

Status:

- concluida em 2026-04-18

Evidence:

- `src/actions/community-posts.ts` criado com `publishAnalysisSessionToCommunity`, exigindo auth, buscando `analysis_sessions` com ownership por `userId` e resolvendo `community_profile` do autor antes de persistir
- a action cria `community_posts` com `type = analysis_snapshot`, suporta `status = draft | published`, preenche `publishedAt` apenas quando publicado e deriva `slug`, `primaryWeaponId`, `primaryPatchVersion`, `primaryDiagnosisKey` e `copySensPreset` da sessao/snapshot
- a action cria `community_post_analysis_snapshots` a partir de `createCommunityPostAnalysisSnapshot`, preservando `analysisResultId`, `analysisTimestamp`, `attachmentsSnapshot`, `metricsSnapshot`, `diagnosesSnapshot`, `coachingSnapshot`, `sensSnapshot` e `trackingSnapshot`
- `src/actions/community-posts.test.ts` criado cobrindo auth obrigatoria, ownership da `analysis_session`, persistencia minima do post + snapshot e os dois modos `draft` e `published`
- validacoes executadas: `npx vitest run src/actions/community-posts.test.ts` -> RED inicial por modulo ausente; `npx vitest run src/actions/community-posts.test.ts` -> 4 testes verdes; `npm run typecheck` -> ok

### W20-T02 - Criar policy de visibilidade e status de post

Goal:

- centralizar regra de acesso a `draft`, `published`, `hidden`, `archived` e `deleted`.

Read/Write:

- create: `src/lib/community-access.ts`
- create: `src/lib/community-access.test.ts`
- read: `src/types/community.ts`

Depends on:

- W20-T01

Acceptance:

- autor pode ver draft;
- publico nao ve draft;
- hidden/deleted obedecem policy;
- hooks futuros para entitlement existem.

Tests:

- `npx vitest run src/lib/community-access.test.ts`

TDD:

- primeiro testar matriz de acesso;
- depois implementar helper.

Status:

- concluida em 2026-04-18

Evidence:

- `src/lib/community-access.test.ts` foi criado primeiro cobrindo a matriz minima de acesso para `draft`, `published`, `hidden`, `archived` e `deleted`, separando autor e leitor publico
- o RED foi confirmado com `npx vitest run src/lib/community-access.test.ts` falhando com 6 falhas porque `src/lib/community-access.ts` ainda nao existia
- `src/lib/community-access.ts` foi criado com `getCommunityPostReadAccess` e `canReadCommunityPost`, centralizando a policy por status sem tocar em UI, feed, queries publicas ou entitlement runtime
- a policy resultante permite `draft`, `hidden` e `archived` apenas ao autor, deixa `published` legivel publicamente e bloqueia `deleted` para autor e publico
- hooks futuros para entitlement ficaram preservados no retorno da policy via `requiredEntitlementKey` + `enforcement: inactive`, mantendo a W20-T02 pronta para a W60 sem ativar premium agora
- validacoes executadas: `npx vitest run src/lib/community-access.test.ts` -> 6 testes verdes; `npm run typecheck` -> ok

### W20-T03 - Criar ponto de entrada na pagina de historico/detalhe

Goal:

- dar ao usuario um caminho claro para publicar uma analise.

Read/Write:

- create: `src/app/history/[id]/publish-analysis-button.tsx`
- read/write: `src/app/history/[id]/page.tsx`
- create: `e2e/community.publish-entry.spec.ts`

Depends on:

- W20-T02

Acceptance:

- usuario autenticado ve CTA para publicar;
- usuario sem permissao nao ve CTA invalida;
- CTA nao quebra UX existente do historico.

Tests:

- `npx playwright test e2e/community.publish-entry.spec.ts`

TDD:

- primeiro escrever E2E/interaction test da entrada;
- depois implementar UI minima.

- o RED foi confirmado com `npx playwright test e2e/community.publish-entry.spec.ts` falhando porque o CTA `Publicar na comunidade` ainda nao existia no detalhe do historico
- `e2e/community.publish-entry.spec.ts` foi criado com seed real de `analysis_sessions`, cookie Auth.js local e cobertura para CTA visivel ao usuario autenticado e ausencia do CTA para usuario sem acesso ao detalhe
- `src/app/history/[id]/publish-analysis-button.tsx` foi criado e integrado em `src/app/history/[id]/page.tsx` com acao minima para criar rascunho, preservando o layout atual do historico sem tocar em feed, post detail, queries publicas ou entitlement runtime
- validacoes executadas: `npx playwright test e2e/community.publish-entry.spec.ts` -> 2 testes verdes; `npm run typecheck` -> ok

### W20-T04 - Implementar copy sens snapshot-first e copy event logging

Goal:

- fazer o botao de copiar sens usar snapshot do post e registrar evento.

Read/Write:

- create: `src/actions/community-copy.ts`
- create: `src/actions/community-copy.test.ts`
- create: `src/app/community/[slug]/copy-sens-button.tsx`

Depends on:

- W20-T01

Acceptance:

- copy usa `copySensPreset` do post/snapshot;
- evento e persistido em `community_post_copy_events`;
- sistema suporta `clipboard` como target inicial.

Tests:

- `npx vitest run src/actions/community-copy.test.ts`

TDD:

- primeiro testar persistencia e payload copiado;
- depois implementar action.

Status:

- concluida em 2026-04-18

Evidence:

- `src/actions/community-copy.test.ts` foi criado primeiro cobrindo payload de clipboard derivado do `copySensPreset` persistido e logging em `community_post_copy_events`, incluindo caso anonimo com `copiedByUserId = null`
- o RED foi confirmado com `npx vitest run src/actions/community-copy.test.ts` falhando porque `src/actions/community-copy.ts` ainda nao existia
- `src/actions/community-copy.ts` foi criado com `copyCommunityPostSens`, lendo `community_posts.copySensPreset` por `slug`, sem reconstruir preset a partir de `analysis_sessions`, e persistindo `copyTarget = clipboard` em `community_post_copy_events`
- a action devolve `copySensPreset` persistido e `clipboardText` formatado a partir do preset recomendado, deixando o cliente pronto para copiar sem acoplar feed, detalhe publico completo ou entitlement runtime
- `src/app/community/[slug]/copy-sens-button.tsx` foi criado como botao cliente isolado, pronto para integracao futura, consumindo a action server-side e escrevendo no clipboard quando disponivel
- validacoes executadas: `npx vitest run src/actions/community-copy.test.ts` -> RED por modulo ausente; `npx vitest run src/actions/community-copy.test.ts` -> GREEN com 2 testes verdes; `npm run typecheck` -> ok

---

## W30 - Feed & Discovery

### W30-T01 - Implementar query do feed publico

Goal:

- criar feed publico barato, previsivel e filtravel.

Read/Write:

- create: `src/core/community-feed.ts`
- create: `src/core/community-feed.test.ts`
- read: `src/db/schema.ts`

Depends on:

- W20-T02

Acceptance:

- feed retorna apenas posts publicos publicados;
- suporta filtros por arma, patch e diagnostico;
- ordenacao padrao e recencia.

Tests:

- `npx vitest run src/core/community-feed.test.ts`

TDD:

- primeiro testar filtros e ordenacao;
- depois implementar query/helper.

Status:

- concluida em 2026-04-18

Evidence:

- `src/core/community-feed.test.ts` foi criado primeiro cobrindo query leve, clausulas obrigatorias de `published + public`, filtros opcionais por arma/patch/diagnostico e ordenacao padrao por `publishedAt desc`
- o RED foi confirmado com `npx vitest run src/core/community-feed.test.ts` falhando porque `src/core/community-feed.ts` ainda nao existia
- `src/core/community-feed.ts` foi criado com `listPublicCommunityFeed`, selecionando apenas campos do card de feed, aplicando `status = published`, `visibility = public`, `published_at is not null`, filtros opcionais e `limit` padrao de 20 para manter a consulta barata e previsivel
- o helper manteve a ordenacao server-side por recencia via `publishedAt desc`, sem tocar em `/community`, detalhe publico, perfil publico, E2E ou entitlement runtime
- validacoes executadas: `npx vitest run src/core/community-feed.test.ts` -> 2 testes verdes; `npm run typecheck` -> ok

### W30-T02 - Criar pagina `/community`

Goal:

- exibir feed publico integrado ao visual atual do projeto.

Read/Write:

- create: `src/app/community/page.tsx`
- create: `src/app/community/community-filters.tsx`
- create: `e2e/community.feed.spec.ts`
- read: `src/ui/components/header.tsx`

Depends on:

- W30-T01

Acceptance:

- pagina carrega com feed;
- filtros basicos funcionam;
- header e visual seguem o padrao do projeto.

Tests:

- `npx playwright test e2e/community.feed.spec.ts`

TDD:

- primeiro escrever E2E de carregamento e filtro;
- depois implementar pagina.

Status:

- concluida em 2026-04-18

Evidence:

- `e2e/community.feed.spec.ts` foi criado primeiro cobrindo carregamento de `/community` com feed publico, header padrao do app e aplicacao dos filtros basicos por `weaponId`, `patchVersion` e `diagnosisKey`
- o ambiente local de E2E precisou receber os SQLs ja versionados `drizzle/0004_community_core.sql`, `drizzle/0005_community_engagement.sql` e `drizzle/0006_community_copy_and_entitlements.sql` para expor as tabelas da comunidade no banco de teste sem reabrir o escopo de schema
- o RED comportamental foi confirmado com `npx playwright test e2e/community.feed.spec.ts` falhando porque `/community` ainda nao tinha title, heading e formulario de filtros esperados
- `src/app/community/page.tsx` foi criado como pagina server-side integrada ao `Header`, consumindo `listPublicCommunityFeed` para renderizar o feed publico e derivar filtros basicos sem tocar em detalhe publico, likes, comments, saves, follows ou entitlement runtime
- `src/app/community/community-filters.tsx` foi criado com formulario `GET` acessivel, selects de arma/patch/diagnostico e acao de limpar filtros, seguindo os tokens globais (`page`, `container`, `glass-card`, `input`, `btn`) ja usados no app
- o REFACTOR removeu duplicacao do markup dos selects em `community-filters.tsx` via helper local de campo, mantendo o comportamento validado pelo E2E
- validacoes executadas: `npx playwright test e2e/community.feed.spec.ts` -> 2 testes verdes; `npx vitest run src/core/community-feed.test.ts` -> 2 testes verdes; `npm run typecheck` -> ok

### W30-T03 - Criar pagina de detalhe do post

Goal:

- renderizar publicacao tecnica a partir do snapshot.

Read/Write:

- create: `src/app/community/[slug]/page.tsx`
- create: `src/app/community/[slug]/post-detail.tsx`
- create: `src/app/community/[slug]/page.test.tsx`

Depends on:

- W20-T04

Acceptance:

- detalhe mostra patch, arma, scope, distance e diagnosticos do snapshot;
- botao de copy sens aparece;
- pagina respeita policy de visibilidade.

Tests:

- `npx vitest run src/app/community/[slug]/page.test.tsx`

TDD:

- primeiro testar render e policy;
- depois implementar pagina.

Status:

- concluida em 2026-04-19

Evidence:

- `src/app/community/[slug]/page.test.tsx` foi criado primeiro cobrindo o detalhe publicado com snapshot persistido, a presenca do `CopySensButton`, o acesso do autor ao rascunho e o bloqueio publico via `notFound()` quando a policy negar leitura
- o primeiro RED com `npx vitest run src/app/community/[slug]/page.test.tsx` expôs que o runner ainda ignorava `*.test.tsx`; `vitest.config.ts` foi ajustado para incluir esse padrao e o mesmo comando passou a falhar pelo motivo esperado da task, com `src/app/community/[slug]/page.tsx` ausente
- `src/app/community/[slug]/page.tsx` foi criado com query server-side para `community_posts` + `community_post_analysis_snapshots`, aplicando `getCommunityPostReadAccess` antes de renderizar e retornando `notFound()` quando o slug nao existe ou quando a policy atual nega leitura
- `src/app/community/[slug]/post-detail.tsx` foi criado seguindo o visual atual do projeto, lendo patch, arma, scope, distance e diagnosticos diretamente do snapshot persistido e encaixando o `CopySensButton` existente sem tocar em likes, comments, saves, follows ou entitlement runtime
- o REFACTOR manteve o comportamento verde enquanto removeu a dependencia implícita de `auth()` dentro do loader, passando `viewerUserId` explicitamente da pagina para a etapa de policy
- validacoes executadas: `npx vitest run src/app/community/[slug]/page.test.tsx` -> RED por descoberta de `.test.tsx`; `npx vitest run src/app/community/[slug]/page.test.tsx` -> RED por modulo `page.tsx` ausente; `npx vitest run src/app/community/[slug]/page.test.tsx` -> GREEN com 3 testes; `npx vitest run src/lib/community-access.test.ts` -> 6 testes verdes; `npx vitest run src/actions/community-copy.test.ts` -> 2 testes verdes; `npm run typecheck` -> ok

### W30-T04 - Criar perfil publico do autor

Goal:

- exibir conteudo publicado por um criador/jogador.

Read/Write:

- create: `src/actions/community-profiles.ts`
- create: `src/actions/community-profiles.test.ts`
- create: `src/app/community/users/[slug]/page.tsx`

Depends on:

- W10-T02

Acceptance:

- perfil publico carrega posts publicados do autor;
- slug e resolvido via `community_profiles`;
- creator program status existe apenas como dado, sem funcionalidade paga.

Tests:

- `npx vitest run src/actions/community-profiles.test.ts`

TDD:

- primeiro testar query e resolucao de slug;
- depois implementar action/pagina.

Status:

- concluida em 2026-04-19

Evidence:

- `src/actions/community-profiles.test.ts` foi criado primeiro cobrindo resolucao do slug via `community_profiles`, retorno do `creatorProgramStatus` apenas como dado e listagem restrita aos posts `published + public`
- o RED foi confirmado com `npx vitest run src/actions/community-profiles.test.ts` falhando porque `src/actions/community-profiles.ts` ainda nao existia
- `src/actions/community-profiles.ts` foi criado com `getPublicCommunityProfileBySlug`, resolvendo o perfil publico por `community_profiles.slug`, rejeitando perfis ocultos e retornando apenas os posts publicados/publicos do autor em ordem de `publishedAt desc`
- `src/app/community/users/[slug]/page.tsx` foi criado seguindo o visual atual do projeto, com hero do autor, `creatorProgramStatus` exibido apenas como informacao e lista dos posts publicados apontando para `/community/[slug]`
- o REFACTOR manteve a suite verde enquanto endureceu o harness do teste para evitar vazamento de `mockReturnValueOnce` entre casos, sem alterar o contrato validado da W30-T04
- validacoes executadas: `npx vitest run src/actions/community-profiles.test.ts` -> RED por modulo ausente; `npx vitest run src/actions/community-profiles.test.ts` -> GREEN com 2 testes verdes; `npm run typecheck` -> ok

---

## W40 - Engagement

### W40-T01 - Implementar likes com toggle idempotente

Goal:

- permitir curtir/descurtir post com persistencia correta.

Read/Write:

- create: `src/actions/community-likes.ts`
- create: `src/actions/community-likes.test.ts`
- create: `src/app/community/[slug]/like-button.tsx`

Depends on:

- W30-T03

Acceptance:

- toggle e idempotente;
- unique constraint e respeitada;
- usuario anonimo nao pode mutar.

Tests:

- `npx vitest run src/actions/community-likes.test.ts`

TDD:

- primeiro testar create/delete/auth;
- depois implementar action.

Status:

- concluida em 2026-04-19

Evidence:

- `src/actions/community-likes.test.ts` foi criado primeiro cobrindo auth obrigatoria, `like` idempotente com `onConflictDoNothing`, repeticao do mesmo `like` sem duplicacao e `unlike` idempotente sem erro quando repetido
- o RED foi confirmado com `npx vitest run src/actions/community-likes.test.ts` falhando porque `src/actions/community-likes.ts` ainda nao existia
- `src/actions/community-likes.ts` foi criado com `setCommunityPostLike`, exigindo auth, resolvendo o post por `slug`, persistindo `like` via `community_post_likes` com respeito explicito a unique constraint composta e removendo `like` por `postId + userId` sem tocar em saves, comments, follows, moderacao ou entitlement runtime
- `src/app/community/[slug]/like-button.tsx` foi criado como botao cliente no mesmo padrao do `copy-sens-button`, chamando a action com estado alvo (`liked: true | false`) para manter o toggle idempotente e exibindo erro amigavel quando o usuario anonimo tenta mutar
- `src/app/community/[slug]/page.tsx` e `src/app/community/[slug]/post-detail.tsx` foram ajustados apenas para carregar `likeCount`/`viewerHasLiked` e encaixar o novo `LikeButton` no detalhe do post seguindo o visual atual
- o REFACTOR manteve o comportamento verde enquanto atualizou `src/app/community/[slug]/page.test.tsx` para refletir as leituras adicionais de likes no loader, sem alterar a policy de acesso nem reabrir W30-T04
- validacoes executadas: `npx vitest run src/actions/community-likes.test.ts` -> RED por modulo ausente; `npx vitest run src/actions/community-likes.test.ts` -> GREEN com 4 testes; `npx vitest run src/app/community/[slug]/page.test.tsx` -> 3 testes verdes; `npx vitest run src/actions/community-copy.test.ts` -> 2 testes verdes; `npm run typecheck` -> ok

### W40-T02 - Implementar saves privados

Goal:

- permitir salvar/remover salvo sem tornar esse dado publico.

Read/Write:

- create: `src/actions/community-saves.ts`
- create: `src/actions/community-saves.test.ts`
- create: `src/app/community/[slug]/save-button.tsx`

Depends on:

- W30-T03

Acceptance:

- save e privado por usuario;
- toggle funciona;
- feed/detail podem refletir estado do proprio usuario logado.

Tests:

- `npx vitest run src/actions/community-saves.test.ts`

TDD:

- primeiro testar privacidade e toggle;
- depois implementar.

Status:

- concluida em 2026-04-19

Evidence:

- `src/actions/community-saves.test.ts` foi criado primeiro cobrindo auth obrigatoria, `save` idempotente com `onConflictDoNothing`, `unsave` idempotente e ausencia de contador publico no contrato de retorno
- o RED foi confirmado com `npx vitest run src/actions/community-saves.test.ts` falhando porque `src/actions/community-saves.ts` ainda nao existia
- `src/actions/community-saves.ts` foi criado com `setCommunityPostSave`, exigindo auth, resolvendo o post por `slug`, persistindo/removendo `community_post_saves` por `postId + userId` e mantendo o dado de save privado por usuario
- `src/app/community/[slug]/save-button.tsx` foi criado no mesmo padrao visual do detalhe atual, chamando a action com estado alvo idempotente e exibindo erro amigavel para usuario anonimo
- `src/app/community/[slug]/page.tsx`, `src/app/community/[slug]/post-detail.tsx` e `src/app/community/[slug]/page.test.tsx` foram ajustados apenas para refletir `viewerHasSaved` do usuario logado, sem expor contador publico de save no detalhe do post
- validacoes executadas: `npx vitest run src/actions/community-saves.test.ts` -> RED por modulo ausente; `npx vitest run src/actions/community-saves.test.ts` -> GREEN com 4 testes; `npx vitest run src/app/community/[slug]/page.test.tsx` -> 3 testes verdes; `npx vitest run src/actions/community-saves.test.ts src/app/community/[slug]/page.test.tsx src/actions/community-likes.test.ts src/actions/community-copy.test.ts` -> 13 testes verdes; `npm run typecheck` -> ok

### W40-T03 - Implementar comentarios planos

Goal:

- permitir comentarios simples em posts publicos.

Read/Write:

- create: `src/actions/community-comments.ts`
- create: `src/actions/community-comments.test.ts`
- create: `src/app/community/[slug]/comment-form.tsx`
- create: `e2e/community.comments.spec.ts`

Depends on:

- W30-T03

Acceptance:

- comentario exige auth;
- comentario visivel aparece em ordem cronologica;
- comentario pode carregar `diagnosisContextKey` opcional.

Tests:

- `npx vitest run src/actions/community-comments.test.ts`
- `npx playwright test e2e/community.comments.spec.ts`

TDD:

- primeiro testar auth e contrato do comentario;
- depois implementar action e UI.

Status:

- concluida em 2026-04-19

Evidence:

- `src/actions/community-comments.test.ts` foi criado primeiro cobrindo auth obrigatoria, bloqueio para post nao publicado/publico, persistencia de comentario `visible` com `diagnosisContextKey` opcional e leitura dos comentarios visiveis em ordem cronologica
- o RED foi confirmado com `npx vitest run src/actions/community-comments.test.ts` falhando porque `src/actions/community-comments.ts` ainda nao existia
- `e2e/community.comments.spec.ts` foi criado antes da UI cobrindo leitura publica dos comentarios visiveis, ordem cronologica, `diagnosisContextKey` opcional, gate de auth para mutacao e preservacao visual de copy/like/save no detalhe do post
- `src/actions/community-comments.ts` foi criado com `createCommunityPostComment` e `listVisibleCommunityPostComments`, exigindo auth para mutacao, aceitando comentario apenas em post `published + public`, persistindo `community_post_comments` com `status = visible` e listando comentarios por `createdAt asc`
- `src/app/community/[slug]/comment-form.tsx` foi criado e `src/app/community/[slug]/page.tsx` + `src/app/community/[slug]/post-detail.tsx` passaram a renderizar o formulario/gate correto e os comentarios visiveis sem tocar em replies, follows, moderacao avancada ou entitlement runtime
- `src/app/community/[slug]/page.test.tsx` foi atualizado para cobrir o contrato novo do detalhe com comentario visivel, `diagnosisContextKey` renderizado e mensagens de gate para anonimo/post nao publicado
- validacoes executadas: `npx vitest run src/actions/community-comments.test.ts`; `npx playwright test e2e/community.comments.spec.ts`; `npx vitest run src/actions/community-comments.test.ts src/app/community/[slug]/page.test.tsx src/actions/community-likes.test.ts src/actions/community-saves.test.ts src/actions/community-copy.test.ts`; `npm run typecheck`

### W40-T04 - Implementar follows

Goal:

- permitir seguir/desseguir autores.

Read/Write:

- create: `src/actions/community-follows.ts`
- create: `src/actions/community-follows.test.ts`
- create: `src/app/community/users/[slug]/follow-button.tsx`

Depends on:

- W30-T04

Acceptance:

- toggle e idempotente;
- usuario nao pode seguir a si mesmo;
- contador pode ser exibido depois sem recalculo caotico.

Tests:

- `npx vitest run src/actions/community-follows.test.ts`

TDD:

- primeiro testar regras de auth e self-follow;
- depois implementar.

Status:

- concluida em 2026-04-19

Evidence:

- `src/actions/community-follows.test.ts` foi criado primeiro cobrindo auth obrigatoria, bloqueio de self-follow, follow/unfollow idempotentes e a leitura minima de `followerCount` + `viewerIsFollowing` para sustentar a UI do perfil publico sem contador improvisado depois
- o RED foi confirmado com `npx vitest run src/actions/community-follows.test.ts` falhando porque `src/actions/community-follows.ts` ainda nao existia
- `src/actions/community-follows.ts` foi criado com `setCommunityProfileFollow` e `getCommunityProfileFollowState`, resolvendo o autor por `community_profiles`, exigindo auth na mutacao, bloqueando self-follow, respeitando a unique constraint composta de `community_follows` e devolvendo `followerCount` como base limpa para contador futuro
- `src/app/community/users/[slug]/follow-button.tsx` foi criado no mesmo padrao visual de likes/saves, com toggle idempotente, estado local otimista controlado pelo retorno server-side e mensagens especificas para anonimo/self-follow
- `src/app/community/users/[slug]/page.tsx` foi ajustado para carregar o estado inicial de follow no servidor e encaixar o `FollowButton` no hero do perfil publico sem reabrir replies, moderacao avancada, entitlement runtime, analytics premium ou qualquer funcionalidade premium
- validacoes executadas: `npx vitest run src/actions/community-follows.test.ts` -> RED por modulo ausente; `npx vitest run src/actions/community-follows.test.ts` -> GREEN com 8 testes; `npx vitest run src/actions/community-profiles.test.ts` -> 2 testes verdes; `npm run typecheck` -> ok

---

## W50 - Moderation

### W50-T01 - Implementar reports de post/comentario/perfil

Goal:

- permitir report basico desde a primeira release publica.

Read/Write:

- create: `src/actions/community-reports.ts`
- create: `src/actions/community-reports.test.ts`
- create: `src/app/community/report-button.tsx`

Depends on:

- W40-T03

Acceptance:

- report persiste entidade, motivo e detalhes;
- usuario autenticado pode reportar;
- status inicial e `open`.

Tests:

- `npx vitest run src/actions/community-reports.test.ts`

TDD:

- primeiro testar persistencia e validacao;
- depois implementar.

Status:

- concluida em 2026-04-19

Evidence:

- `src/actions/community-reports.test.ts` foi criado primeiro cobrindo auth obrigatoria, persistencia de `entityType`, `entityId`, `reasonKey`, `details`, `status = open` e suporte a `post | comment | profile`
- o RED foi confirmado com `npx vitest run src/actions/community-reports.test.ts` falhando por ausencia inicial de `src/actions/community-reports.ts`
- `src/actions/community-reports.ts` foi criado com `createCommunityReport`, validacao minima do payload, resolucao da entidade alvo e persistencia em `community_reports` com `reportedByUserId` e `status = open`
- `src/app/community/report-button.tsx` foi criado como surface generica de report e integrado em `src/app/community/[slug]/post-detail.tsx` para post/comentarios e em `src/app/community/users/[slug]/page.tsx` para perfil, mantendo o padrao visual atual
- validacoes executadas: `npx vitest run src/actions/community-reports.test.ts` -> GREEN com 5 testes verdes; `npm run typecheck` -> ok

### W50-T02 - Implementar estados de moderacao para post e comentario

Goal:

- permitir ocultar conteudo sem apagar trilha.

Read/Write:

- create: `src/core/community-moderation.ts`
- create: `src/core/community-moderation.test.ts`
- read/write: `src/lib/community-access.ts`

Depends on:

- W50-T01

Acceptance:

- hidden/archived/deleted alteram acesso corretamente;
- comentarios `moderator_hidden` somem para publico;
- trilha de moderacao e consistente.

Tests:

- `npx vitest run src/core/community-moderation.test.ts`

TDD:

- primeiro testar matriz de estados;
- depois implementar helpers/policies.

Status:

- concluida em 2026-04-19

Evidence:

- `src/core/community-moderation.test.ts` foi criado primeiro cobrindo a matriz de estados de post (`draft | published | hidden | archived | deleted`), visibilidade publica de comentario e preservacao da trilha sem apagar entidade
- o RED foi confirmado com `npx vitest run src/core/community-moderation.test.ts` falhando por ausencia inicial de `src/core/community-moderation.ts`
- `src/core/community-moderation.ts` foi criado com helpers puros para leitura de estados moderados de post/comentario, incluindo `preservesEntityRecord` para manter a trilha consistente
- `src/lib/community-access.ts` passou a consumir a matriz central de moderacao para manter a policy de post coerente em `hidden`, `archived` e `deleted` sem alterar o hook inativo de entitlement
- validacoes executadas: `npx vitest run src/core/community-moderation.test.ts src/lib/community-access.test.ts` -> GREEN com 9 testes verdes; `npm run typecheck` -> ok

### W50-T03 - Criar fila admin de moderacao

Goal:

- oferecer uma primeira surface administrativa para reports.

Read/Write:

- create: `src/actions/community-admin.ts`
- create: `src/actions/community-admin.test.ts`
- create: `src/app/admin/community/page.tsx`
- create: `e2e/community.admin.spec.ts`

Depends on:

- W50-T02

Acceptance:

- admin autenticado consegue listar reports abertos;
- admin consegue aplicar acao de moderacao;
- acao escreve em `community_moderation_actions` e `audit_logs`.

Tests:

- `npx vitest run src/actions/community-admin.test.ts`
- `npx playwright test e2e/community.admin.spec.ts`

TDD:

- primeiro testar autorizacao admin e trilha de auditoria;
- depois implementar.

Status:

- concluida em 2026-04-19

Evidence:

- `src/actions/community-admin.test.ts` foi criado primeiro cobrindo gate de admin autenticado, listagem da fila de reports `open`, acao `hide | dismiss` e escrita obrigatoria em `community_moderation_actions` + `audit_logs`
- o RED foi confirmado com `npx vitest run src/actions/community-admin.test.ts` falhando por ausencia inicial de `src/actions/community-admin.ts`
- `src/actions/community-admin.ts` foi criado com `listOpenCommunityReports` e `applyCommunityModerationAction`, exigindo `role = admin`, atualizando `community_reports.reviewedAt/reviewedByUserId`, ocultando `post/comment/profile` com o estado minimo da W50 e registrando trilha administrativa dupla
- `src/app/admin/community/page.tsx` foi criado como primeira surface administrativa da comunidade, com tabela de reports abertos, gate especifico para admin e formularios server-side para `Ocultar` e `Descartar` sem tocar em analytics, entitlement runtime, premium ou backlog admin avancado
- `e2e/community.admin.spec.ts` seeda um admin autenticado, um report aberto e um post reportado, valida a listagem da fila em `/admin/community` e confirma a acao `Ocultar` com persistencia em `community_posts.status = hidden`, `community_reports.status = actioned`, `community_moderation_actions` e `audit_logs`
- validacoes executadas: `npx vitest run src/actions/community-admin.test.ts` -> RED por modulo ausente; `npx vitest run src/actions/community-admin.test.ts` -> GREEN com 5 testes; `npx playwright test e2e/community.admin.spec.ts` -> 1 teste verde; `npm run typecheck` -> ok

---

## W60 - Monetization Ready

### W60-T01 - Implementar resolver de entitlement com defaults free

Goal:

- criar boundary server-side para recursos futuros sem ligar nada premium.

Read/Write:

- create: `src/lib/community-entitlements.ts`
- create: `src/lib/community-entitlements.test.ts`
- read: `src/types/community.ts`

Depends on:

- W10-T04

Acceptance:

- resolver retorna apenas entitlements free padrao;
- nenhum usuario recebe premium por default;
- assinatura futura pode ser plugada depois sem reescrever policies.

Tests:

- `npx vitest run src/lib/community-entitlements.test.ts`

TDD:

- primeiro testar defaults;
- depois implementar resolver.

Status:

- concluida em 2026-04-19

Evidence:

- `src/lib/community-entitlements.test.ts` foi criado primeiro cobrindo defaults free, ausencia de premium por default e o contrato de injecao de grants futuros sem mudar a interface da policy
- o RED foi confirmado com `npx vitest run src/lib/community-entitlements.test.ts` falhando porque `src/lib/community-entitlements.ts` ainda nao existia
- `src/lib/community-entitlements.ts` foi criado com `resolveCommunityEntitlements` e `hasCommunityEntitlement`, devolvendo apenas os grants free padrao (`community.post.create`, `community.comment.create`, `community.feed.following`) e mantendo todos os entitlements premium como `premium_future` nao concedidos por default
- o resolver aceita `grants` opcionais de `manual | subscription_future | creator_program_future` para plugar assinaturas futuras depois, sem acoplar a policy atual a checkout, billing, analytics premium ou runtime pago
- a boundary continuou inativa para premium no fluxo atual, validada junto da policy existente em `src/lib/community-access.test.ts`, que manteve `requiredEntitlementKey` com `enforcement: inactive`
- validacoes executadas: `npx vitest run src/lib/community-entitlements.test.ts` -> RED por modulo ausente; `npx vitest run src/lib/community-entitlements.test.ts` -> GREEN com 3 testes; `npx vitest run src/lib/community-entitlements.test.ts src/lib/community-access.test.ts` -> 9 testes verdes; `npm run typecheck` -> ok

### W60-T02 - Conectar access policy a requiredEntitlementKey sem ativar restricoes

Goal:

- preparar enforcement futuro sem mudar comportamento atual.

Read/Write:

- read/write: `src/lib/community-access.ts`
- create/update: `src/lib/community-access.test.ts`

Depends on:

- W60-T01

Acceptance:

- policy le `requiredEntitlementKey`;
- posts V1 continuam acessiveis quando o campo e `null`;
- codigo fica pronto para futura ativacao.

Tests:

- `npx vitest run src/lib/community-access.test.ts`

TDD:

- primeiro testar `null` e denied/allowed futuros;
- depois ajustar policy.

Status:

- concluida em 2026-04-19

Evidence:

- `src/lib/community-access.test.ts` foi atualizado primeiro para cobrir preview de entitlement com `futureAccess = not_required | denied | allowed`, incluindo o caso V1 com `requiredEntitlementKey = null`
- o RED foi confirmado com `npx vitest run src/lib/community-access.test.ts` falhando com 3 falhas, porque a policy ainda nao resolvia o estado futuro do entitlement
- `src/lib/community-access.ts` passou a consumir `resolveCommunityEntitlements`/`hasCommunityEntitlement`, aceitando `entitlements` opcionais no input e calculando preview futuro por post sem alterar `canRead` enquanto `enforcement = inactive`
- posts publicados da V1 continuam legiveis quando `requiredEntitlementKey` e `null`, e posts com chave futura agora expõem preview `allowed` ou `denied` sem ativar premium, checkout, billing ou runtime pago
- validacoes executadas: `npx vitest run src/lib/community-access.test.ts` -> GREEN com 8 testes; `npx vitest run src/lib/community-access.test.ts src/lib/community-entitlements.test.ts` -> GREEN com 11 testes; `npm run typecheck` -> ok

### W60-T03 - Expor analytics basico de creator sem premium

Goal:

- deixar o sistema pronto para insights futuros usando dados ja persistidos.

Read/Write:

- create: `src/core/community-creator-metrics.ts`
- create: `src/core/community-creator-metrics.test.ts`
- read: `community_post_copy_events`, likes, comments

Depends on:

- W40-T04

Acceptance:

- metricas basicas por autor existem: posts, likes, comments, copies;
- metricas nao ativam produto premium;
- dados podem ser usados depois por creator dashboards.

Tests:

- `npx vitest run src/core/community-creator-metrics.test.ts`

TDD:

- primeiro testar agregacoes;
- depois implementar query/helper.

Status:

- concluida em 2026-04-19

Evidence:

- `src/core/community-creator-metrics.test.ts` foi criado primeiro cobrindo a agregacao basica por autor para `posts`, `likes`, `comments` e `copies`, com assertivas explicitas de que a query nao toca em `required_entitlement_key`, `feature_entitlements` ou `user_entitlements`
- o RED foi confirmado com `npx vitest run src/core/community-creator-metrics.test.ts` falhando porque `src/core/community-creator-metrics.ts` ainda nao existia
- `src/core/community-creator-metrics.ts` foi criado com `getCommunityCreatorMetrics`, agregando apenas dados ja persistidos em `community_posts`, `community_post_likes`, `community_post_comments` e `community_post_copy_events`, sem acoplar entitlement runtime, premium, checkout, billing ou analytics pagos
- a agregacao ficou restrita aos posts `published + public` do autor e aos comentarios `visible`, deixando o payload pronto para uso futuro em creator dashboards sem inventar contadores derivados fora do banco
- validacoes executadas: `npx vitest run src/core/community-creator-metrics.test.ts` -> RED por modulo ausente; `npx vitest run src/core/community-creator-metrics.test.ts` -> GREEN com 2 testes; `npm run typecheck` -> ok

---

## W70 - Hardening

### W70-T01 - Adicionar rate limiting nas mutacoes comunitarias

Goal:

- reduzir spam e abuso sem servicos externos.

Read/Write:

- read/write: `src/lib/rate-limit.ts`
- read/write: `src/actions/community-posts.ts`
- read/write: `src/actions/community-copy.ts`
- read/write: `src/actions/community-likes.ts`
- read/write: `src/actions/community-saves.ts`
- read/write: `src/actions/community-comments.ts`
- read/write: `src/actions/community-follows.ts`
- read/write: `src/actions/community-reports.ts`
- create: `src/actions/community-rate-limit.test.ts`

Depends on:

- W50-T03

Acceptance:

- post/comment/report/follow/like usam guardas apropriados;
- limites falham de forma previsivel.

Tests:

- `npx vitest run src/actions/community-rate-limit.test.ts`

TDD:

- primeiro testar cenarios permitidos e bloqueados;
- depois integrar rate limit.

Status:

- concluida em 2026-04-19

Evidence:

- `src/actions/community-rate-limit.test.ts` foi criado primeiro cobrindo cenarios permitidos e bloqueados para `publish`, `copy`, `like`, `save`, `comment`, `follow` e `report`, com assertivas explicitas de que o bloqueio por rate limit falha de forma previsivel e nao alcanca selects/inserts/deletes quando a janela estoura
- o RED foi confirmado com `npx vitest run src/actions/community-rate-limit.test.ts` falhando em 14 testes enquanto nenhuma action ainda chamava um guarda de rate limit
- `src/lib/rate-limit.ts` passou a expor `checkCommunityActionRateLimit`, com buckets in-memory por acao comunitaria e identificadores normalizados por `userId` ou `clientId`, sem introduzir servicos externos, runtime pago ou dependencia premium
- `src/actions/community-posts.ts`, `src/actions/community-copy.ts`, `src/actions/community-likes.ts`, `src/actions/community-saves.ts`, `src/actions/community-comments.ts`, `src/actions/community-follows.ts` e `src/actions/community-reports.ts` agora aplicam o guarda antes da mutacao, preservando auth, ownership e o happy path ja existente
- validacoes executadas: `npx vitest run src/actions/community-rate-limit.test.ts` -> RED inicial com 14 falhas; `npx vitest run src/actions/community-rate-limit.test.ts` -> GREEN com 14 testes; `npx vitest run src/actions/community-posts.test.ts src/actions/community-copy.test.ts src/actions/community-likes.test.ts src/actions/community-saves.test.ts src/actions/community-comments.test.ts src/actions/community-follows.test.ts src/actions/community-reports.test.ts src/actions/community-rate-limit.test.ts` -> GREEN com 45 testes; `npm run typecheck` -> ok

### W70-T02 - Adicionar SEO e metadata das paginas comunitarias

Goal:

- tornar feed e post detail consistentes com o restante do app e preparados para descoberta.

Read/Write:

- read/write: `src/app/community/page.tsx`
- read/write: `src/app/community/[slug]/page.tsx`
- create: `src/app/community/metadata.test.ts`

Depends on:

- W30-T03

Acceptance:

- paginas possuem title/description coerentes;
- post detail pode gerar metadata baseada no snapshot.

Tests:

- `npx vitest run src/app/community/metadata.test.ts`

TDD:

- primeiro testar metadata derivada;
- depois implementar.

Status:

- concluida em 2026-04-19

Evidence:

- `src/app/community/metadata.test.ts` foi criado primeiro para travar o contrato de metadata do feed e do post detail, incluindo `title`, `description` e `alternates.canonical`
- o RED foi confirmado com `npx vitest run src/app/community/metadata.test.ts` falhando porque `/community` ainda expunha metadata generica e `/community/[slug]` ainda nao exportava `generateMetadata`
- `src/app/community/page.tsx` passou a expor metadata mais alinhada ao app, com copy SEO para comunidade e `canonical` em `/community`
- `src/app/community/[slug]/page.tsx` passou a exportar `generateMetadata`, derivando `title`/`description` do snapshot persistido com arma, patch, scope, distancia e diagnosticos, sem alterar o comportamento funcional da pagina
- validacoes executadas: `npx vitest run src/app/community/metadata.test.ts` -> GREEN com 2 testes; `npm run typecheck` -> ok
- checagem adicional: `npx vitest run src/app/community/metadata.test.ts src/app/community/[slug]/page.test.tsx` manteve `metadata.test.ts` verde, mas expôs um problema lateral ja existente em `src/app/community/report-button.tsx` (`React is not defined`) fora do escopo da W70-T02

### W70-T03 - Fechar E2E principal da comunidade

Goal:

- provar o fluxo comunitario principal ponta a ponta.

Read/Write:

- create/update: `e2e/community.publish.spec.ts`
- create/update: `e2e/community.feed.spec.ts`
- create/update: `e2e/community.comments.spec.ts`

Depends on:

- W70-T01

Acceptance:

- publicar analise, abrir post, copiar sens, curtir e comentar passam em E2E;
- nenhuma regressao visivel nas rotas atuais.

Tests:

- `npx playwright test e2e/community.publish.spec.ts e2e/community.feed.spec.ts e2e/community.comments.spec.ts`

TDD:

- escrever os cenarios antes de polir implementacao final.

### W70-T04 - Criar gate agregado `verify:community`

Goal:

- consolidar validacao local do escopo comunitario.

Read/Write:

- read/write: `package.json`
- create: `src/ci/community-workflow.test.ts`

Depends on:

- W70-T03

Acceptance:

- existe comando agregado para typecheck/tests/build/e2e relevantes;
- gate pode ser plugado no CI depois.

Tests:

- `npm run verify:community`

TDD:

- primeiro definir o contrato do gate;
- depois adicionar script.

## 5. Ordem recomendada de implementacao

1. W00
2. W10
3. W20
4. W30
5. W40
6. W50
7. W60
8. W70

## 6. Gates por fase

### Gate A - Dominio pronto

- W10 completo
- migrations coerentes
- contratos verdes

### Gate B - Publicacao pronta

- W20 completo
- publicar analise funcionando localmente

### Gate C - Comunidade minima pronta

- W30 + W40 completos
- feed, post detail, likes, comments, saves e follows operacionais

### Gate D - Comunidade governavel

- W50 completo
- report e moderacao funcionando

### Gate E - Comunidade monetization-ready

- W60 completo
- entitlement boundary pronta e inativa

### Gate F - Release candidate

- W70 completo
- `verify:community` verde
- regressao do produto atual checada

## 7. Veredito final

O caminho seguro e implementar a comunidade em camadas:

- primeiro dominio e snapshot;
- depois publicacao;
- depois feed;
- depois engajamento;
- depois moderacao;
- so entao preparar monetizacao futura de forma limpa.

Esse plano foi desenhado para manter o produto atual estavel, sem custo novo de infraestrutura, e sem fechar portas para o futuro SDD de monetizacao.
