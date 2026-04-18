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
