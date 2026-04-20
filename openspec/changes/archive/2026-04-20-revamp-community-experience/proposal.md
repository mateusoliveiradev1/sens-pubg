## Why

A comunidade ja existe e esta funcional, mas ainda parece uma lista tecnica de posts em vez de um espaco social forte para jogadores aprenderem, copiarem setups, seguirem criadores e voltarem com vontade. Agora e o momento de elevar UI/UX, perfil publico e loops sociais para transformar o modulo em uma area central do produto.

## What Changes

- Redesenhar a home da comunidade para parecer um hub vivo, com hero mais util, filtros melhores, cards ricos, destaques, estados vazios acionaveis e caminhos claros para publicar, explorar perfis e copiar setups.
- Evoluir os perfis publicos para uma pagina compartilhavel de jogador/criador com identidade, avatar, headline, bio, links, status, metricas, seguidores, posts publicados, setups/analises em destaque e acoes sociais.
- Adicionar sinais de confianca e reputacao: badges de creator, contadores de impacto, qualidade do snapshot, tags por arma/patch/diagnostico, denuncias ainda acessiveis e copy honesta sobre dados publicos.
- Criar loops para fortalecer a comunidade: chamadas para completar perfil, publicar melhor analise, seguir autores, explorar tendencias, destacar criadores, colecionar posts salvos e descobrir comparacoes relevantes.
- Melhorar a experiencia mobile e visual com componentes dedicados, menos estilos inline, hierarquia mais clara, microinteracoes leves e layout estavel.
- Definir uma direcao visual autoral da comunidade como "squad board tecnico" do PUBG Aim Analyzer: crosshair/grid, placas de snapshot, metricas mono, chips de arma/patch/diagnostico e a mesma tensao visual de analise de recoil do projeto.
- Preservar o DNA visual atual: tema escuro premium, glass controlado, acentos laranja/ciano, tipografia mono para numeros, bordas finas, header fixo e linguagem de HUD tecnico. A mudanca nao deve parecer dashboard SaaS generico, rede social generica ou landing page desconectada.
- Preservar a privacidade atual: apenas perfis e posts publicos aparecem publicamente, sem expor dados privados do usuario ou sessoes nao publicadas.

## Capabilities

### New Capabilities

- `community-discovery-experience`: cobre a experiencia publica de descoberta da comunidade, incluindo feed, filtros, destaques, estados vazios, cards ricos e caminhos de acao.
- `public-community-profiles`: cobre a experiencia de perfil publico de jogador/criador, incluindo identidade, metricas, links, follow, posts e compartilhamento.
- `community-strength-loops`: cobre mecanismos que deixam a comunidade mais forte, como reputacao, creator highlights, prompts de participacao, descoberta de tendencias e continuidade de engajamento.

### Modified Capabilities

- Nenhuma. Nao existem specs ativas em `openspec/specs/` para alterar; esta mudanca introduz contratos novos para a camada de comunidade.

## Impact

- Rotas e UI: `src/app/community/page.tsx`, `src/app/community/community-filters.tsx`, `src/app/community/[slug]/post-detail.tsx`, `src/app/community/users/[slug]/page.tsx` e componentes novos em `src/app/community`.
- Dados e consultas: `src/core/community-feed.ts`, `src/actions/community-profiles.ts`, `src/core/community-creator-metrics.ts`, `src/actions/community-follows.ts` e possiveis extensoes em `src/db/schema.ts`.
- Design system: `src/app/globals.css`, `src/app/page.module.css`, `src/app/pros/pros.module.css`, `src/ui/components/header.module.css` e/ou novos CSS modules para padronizar cards, chips, metricas, empty states e layouts responsivos sem fugir dos tokens e motivos visuais existentes.
- Testes: unitarios em `src/core`, `src/actions` e contratos de pagina, alem dos fluxos E2E de comunidade em `e2e/community.*.spec.ts`.
- Sem novas dependencias obrigatorias previstas.
