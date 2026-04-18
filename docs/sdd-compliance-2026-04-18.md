# SDD Compliance - 2026-04-18

## W00-T02 - Definir naming e contratos de tipos

- Status: concluida
- Escopo: apenas `src/types/community.ts`, `src/types/community.test.ts` e evidencias documentais
- RED: `npx vitest run src/types/community.test.ts` falhou com 9 falhas porque `src/types/community.ts` ainda nao existia
- GREEN: `npx vitest run src/types/community.test.ts` passou com 9/9 testes
- Acceptance: status, visibility, post type, entitlement key e nomes canonicos de tabelas ficaram travados para as proximas tasks de schema
