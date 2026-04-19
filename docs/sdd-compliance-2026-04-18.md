# SDD Compliance - 2026-04-18

## W00-T02 - Definir naming e contratos de tipos

- Status: concluida
- Escopo: apenas `src/types/community.ts`, `src/types/community.test.ts` e evidencias documentais
- RED: `npx vitest run src/types/community.test.ts` falhou com 9 falhas porque `src/types/community.ts` ainda nao existia
- GREEN: `npx vitest run src/types/community.test.ts` passou com 9/9 testes
- Acceptance: status, visibility, post type, entitlement key e nomes canonicos de tabelas ficaram travados para as proximas tasks de schema

## W10-T01 - Adicionar contratos de snapshot de analise para comunidade

- Status: concluida
- Escopo: apenas `src/core/community-post-snapshot.ts`, `src/core/community-post-snapshot.test.ts` e evidencias documentais
- RED: `npx vitest run src/core/community-post-snapshot.test.ts` falhou com 2 falhas porque `src/core/community-post-snapshot.ts` ainda nao existia
- GREEN: `npx vitest run src/core/community-post-snapshot.test.ts` passou com 2/2 testes
- Acceptance: o snapshot tecnico ficou travado com mapper deterministico de `AnalysisResult` + sessao, incluindo patch, arma, scope, distance, attachments, metrics, diagnoses, coaching, sens e tracking pronto para sustentar `community_post_analysis_snapshots`

## W10-T02 - Estender schema com tabelas comunitarias core

- Status: concluida
- Escopo: apenas `src/db/schema.ts`, `src/db/schema.test.ts`, `drizzle/0004_community_core.sql` e evidencias documentais
- RED: `npx vitest run src/db/schema.test.ts` falhou com 4 falhas porque `community_profiles`, `community_posts` e `community_post_analysis_snapshots` ainda nao existiam no schema
- GREEN: `npx vitest run src/db/schema.test.ts` passou com 8/8 testes; `npm run typecheck` passou sem erros
- Acceptance: o schema agora possui as tres tabelas core, FKs principais com `users`/`analysis_sessions`, slug unico para `community_posts` e persistencia completa do contrato travado em `src/core/community-post-snapshot.ts`

## W10-T03 - Adicionar tabelas de engagement e moderacao

- Status: concluida
- Escopo: apenas `src/db/schema.ts`, `src/db/schema.test.ts`, `drizzle/0005_community_engagement.sql` e evidencias documentais
- RED: `npx vitest run src/db/schema.test.ts` falhou com 6 falhas porque `community_post_likes`, `community_post_saves`, `community_post_comments`, `community_follows`, `community_reports` e `community_moderation_actions` ainda nao existiam no schema
- GREEN: `npx vitest run src/db/schema.test.ts` passou com 14/14 testes; `npm run typecheck` passou sem erros
- Acceptance: likes/saves/follows ficaram com chaves compostas e FKs corretas; comentarios e reports ganharam estados minimos (`visible` e `open`); reports e moderation actions ficaram auditaveis com revisor/ator, notas e metadata

## W10-T04 - Adicionar tabela de copy events e scaffold de entitlements

- Status: concluida
- Escopo: apenas `src/db/schema.ts`, `src/db/schema.test.ts`, `drizzle/0006_community_copy_and_entitlements.sql` e evidencias documentais
- RED: `npx vitest run src/db/schema.test.ts` falhou com 3 falhas porque `community_post_copy_events`, `feature_entitlements` e `user_entitlements` ainda nao existiam no schema
- GREEN: `npx vitest run src/db/schema.test.ts` passou com 17/17 testes; `npm run typecheck` passou sem erros
- Acceptance: `community_post_copy_events` ficou com `postId`, `copiedByUserId` nullable, `copyTarget` e `createdAt`; `feature_entitlements` e `user_entitlements` foram adicionadas com FKs/PKs corretas e default `inactive`, sem ativar nenhuma feature premium

## W20-T01 - Criar action server-side para publicar analise como draft/post

- Status: concluida
- Escopo: apenas `src/actions/community-posts.ts`, `src/actions/community-posts.test.ts` e evidencias documentais
- RED: `npx vitest run src/actions/community-posts.test.ts` falhou porque `src/actions/community-posts.ts` ainda nao existia
- GREEN: `npx vitest run src/actions/community-posts.test.ts` passou com 4/4 testes; `npm run typecheck` passou sem erros
- Acceptance: a action agora exige auth, valida ownership da `analysis_session`, cria `community_posts` com `draft` ou `published` e persiste `community_post_analysis_snapshots` com snapshot imutavel derivado da sessao

## W20-T02 - Criar policy de visibilidade e status de post

- Status: concluida
- Escopo: apenas `src/lib/community-access.ts`, `src/lib/community-access.test.ts` e evidencias documentais
- RED: `npx vitest run src/lib/community-access.test.ts` falhou com 6 falhas porque `src/lib/community-access.ts` ainda nao existia
- GREEN: `npx vitest run src/lib/community-access.test.ts` passou com 6/6 testes; `npm run typecheck` passou sem erros
- REFACTOR: helper interno de autor foi simplificado para remover non-null assertion, sem alterar a matriz de acesso
- Acceptance: autor pode ver `draft`, `hidden` e `archived`; publico nao ve `draft`, `hidden`, `archived` nem `deleted`; `published` segue publico; o retorno da policy preserva `requiredEntitlementKey` com enforcement inativo para a futura W60

## W20-T03 - Criar ponto de entrada na pagina de historico/detalhe

- Status: concluida
- Escopo: apenas `e2e/community.publish-entry.spec.ts`, `src/app/history/[id]/publish-analysis-button.tsx`, `src/app/history/[id]/page.tsx` e evidencias documentais
- RED: `npx playwright test e2e/community.publish-entry.spec.ts` falhou porque o CTA `Publicar na comunidade` ainda nao existia no detalhe do historico
- GREEN: `npx playwright test e2e/community.publish-entry.spec.ts` passou com 2/2 testes; `npm run typecheck` passou sem erros
- REFACTOR: a linha superior do detalhe ganhou `flexWrap` para acomodar o CTA sem apertar a UX existente em larguras menores
- Acceptance: usuario autenticado agora ve um CTA claro para publicar a analise; usuario sem acesso ao detalhe nao recebe CTA invalida; o fluxo legado do historico permaneceu carregando normalmente com o novo ponto de entrada

## W20-T04 - Implementar copy sens snapshot-first e copy event logging

- Status: concluida
- Escopo: apenas `src/actions/community-copy.ts`, `src/actions/community-copy.test.ts`, `src/app/community/[slug]/copy-sens-button.tsx` e evidencias documentais
- RED: `npx vitest run src/actions/community-copy.test.ts` falhou porque `src/actions/community-copy.ts` ainda nao existia
- GREEN: `npx vitest run src/actions/community-copy.test.ts` passou com 2/2 testes; `npm run typecheck` passou sem erros
- REFACTOR: a action passou a normalizar `slug` e extrair `copySensPreset`/`clipboardText` para variaveis locais, sem alterar contrato nem persistencia
- Acceptance: o copy agora usa `community_posts.copySensPreset` persistido, registra `community_post_copy_events` com `copiedByUserId` nullable e entrega payload de `clipboard` pronto para integracao futura via botao isolado

## W30-T01 - Implementar query do feed publico

- Status: concluida
- Escopo: apenas `src/core/community-feed.ts`, `src/core/community-feed.test.ts` e evidencias documentais
- RED: `npx vitest run src/core/community-feed.test.ts` falhou porque `src/core/community-feed.ts` ainda nao existia
- GREEN: `npx vitest run src/core/community-feed.test.ts` passou com 2/2 testes; `npm run typecheck` passou sem erros
- REFACTOR: o retorno do feed passou a usar o tipo interno `PublicCommunityFeedRow` para explicitar o narrowing de `publishedAt` sem alterar o contrato publico
- Acceptance: a query agora retorna apenas posts `published` com `visibility = public`, aplica filtros opcionais por `primaryWeaponId`, `primaryPatchVersion` e `primaryDiagnosisKey`, preserva a ordenacao por `publishedAt desc` e seleciona somente campos leves do card de feed com `limit` padrao de 20

## W30-T02 - Criar pagina `/community`

- Status: concluida
- Escopo: apenas `e2e/community.feed.spec.ts`, `src/app/community/page.tsx`, `src/app/community/community-filters.tsx` e evidencias documentais
- RED: `npx playwright test e2e/community.feed.spec.ts` falhou depois do alinhamento do banco local com os SQLs ja versionados da comunidade, expondo que `/community` ainda nao entregava title, heading e formulario de filtros esperados
- GREEN: `npx playwright test e2e/community.feed.spec.ts` passou com 2/2 testes; `npx vitest run src/core/community-feed.test.ts` passou com 2/2 testes; `npm run typecheck` passou sem erros
- REFACTOR: o componente `src/app/community/community-filters.tsx` extraiu um helper local para os campos `select`, removendo duplicacao sem alterar o comportamento validado
- Acceptance: `/community` agora carrega o feed publico via `listPublicCommunityFeed`, aplica filtros basicos por arma/patch/diagnostico com submit `GET` e reutiliza `Header` + tokens visuais globais do app sem tocar em detalhe publico, likes, comments, saves, follows ou entitlement runtime
