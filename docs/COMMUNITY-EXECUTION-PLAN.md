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
