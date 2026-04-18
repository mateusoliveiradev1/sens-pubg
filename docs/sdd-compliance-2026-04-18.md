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
