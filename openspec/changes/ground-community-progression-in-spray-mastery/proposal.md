## Why

A comunidade ja tem feed, perfis, destaques, progresso e detalhe de post, mas a experiencia ainda nao parece uma parte forte do produto. O usuario entra e encontra uma pagina longa, muito vertical e com varias secoes que parecem ter a mesma prioridade.

Tambem existe um problema de percepcao. Parte da copy ainda soa como nome de sistema ou linguagem interna, e a comunidade nao pode depender de sinais inventados para parecer viva. Se nao houver dado publico suficiente, a interface precisa assumir isso com clareza e oferecer um empty state honesto.

## What Changes

- Reorganizar a comunidade para que a primeira leitura seja progresso do spray, proxima acao e descoberta relevante, e nao uma pilha de modulos.
- Melhorar a UX de `/community`, `/community/users/[slug]` e `/community/[slug]` para reduzir verticalidade, repeticao e competicao visual.
- Reescrever a copy da comunidade com linguagem curta, clara e orientada a jogador.
- Garantir que hub, perfil e detalhe do post usem apenas dados publicos reais, sem contagens, destaques, tendencias ou progressos mockados.
- Fazer a progressao principal nascer da evolucao do spray; sinais sociais entram como reforco leve, nao como protagonista.
- Manter a gamificacao contida, com sensacao de progresso real em vez de urgencia artificial.

## Capabilities

### New Capabilities

- `spray-mastery-journey`: define a jornada principal de progresso com base em historico real de analise, foco atual e proximo passo.
- `community-post-experience`: define o detalhe do post como uma leitura clara, util e conectada ao restante da comunidade.

### Modified Capabilities

- `community-discovery-experience`: redefine o hub publico para uma hierarquia mais clara, menos vertical e com copy mais direta.
- `community-strength-loops`: redefine prompts, retornos e relacoes da comunidade para apoiar a jornada do jogador sem exagero.
- `public-community-profiles`: redefine o perfil publico para parecer uma pagina forte de jogador, com identidade, contexto e provas reais.

## Impact

- Hub da comunidade: `src/app/community/page.tsx`, `src/app/community/community-hub.module.css`, `src/app/community/community-visual-contract.test.ts` e os blocos exibidos no primeiro fold e nas secoes de descoberta.
- Perfis publicos: `src/app/community/users/[slug]/page.tsx` e os view models que montam identidade, setup, metricas, continuidade e empty states.
- Detalhe do post: `src/app/community/[slug]/page.tsx`, `src/app/community/[slug]/post-detail.tsx` e a ordem entre valor do post, contexto tecnico, autor, conversa e exploracao relacionada.
- Progressao: `src/core/community-progression.ts`, `src/core/community-discovery-view-model.ts`, `src/core/community-public-profile-view-model.ts` e helpers ligados a spray mastery e exibicao publica segura.
- Confianca da experiencia: auditoria de fallbacks, placeholders e estados que hoje possam passar sensacao de dado mockado.
