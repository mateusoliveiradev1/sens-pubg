# SDD Compliance 2026-04-19

- W30-T03 concluida: `/community/[slug]` agora renderiza o snapshot persistido com patch, arma, scope, distance e diagnosticos, exibe o `CopySensButton` existente e passa pela `getCommunityPostReadAccess` antes de abrir o detalhe.
- Evidencias locais: `npx vitest run src/app/community/[slug]/page.test.tsx`, `npx vitest run src/lib/community-access.test.ts`, `npx vitest run src/actions/community-copy.test.ts`, `npm run typecheck`.
- W30-T04 concluida: `/community/users/[slug]` agora resolve o autor por `community_profiles`, exibe `creatorProgramStatus` apenas como dado informativo e lista somente os posts publicados/publicos do autor.
- Evidencias locais: `npx vitest run src/actions/community-profiles.test.ts`, `npm run typecheck`.
- W40-T01 concluida: likes agora usam `setCommunityPostLike` com estado alvo idempotente, auth obrigatoria e respeito explicito a unique constraint de `community_post_likes`; o detalhe do post passou a carregar `likeCount`/`viewerHasLiked` e exibir `LikeButton` no padrao visual atual.
- Evidencias locais: `npx vitest run src/actions/community-likes.test.ts`, `npx vitest run src/app/community/[slug]/page.test.tsx`, `npx vitest run src/actions/community-copy.test.ts`, `npm run typecheck`.
