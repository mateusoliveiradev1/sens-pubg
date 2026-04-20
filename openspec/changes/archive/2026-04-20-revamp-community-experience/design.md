## Context

O produto e um app Next.js 15/React 19 com comunidade ja implementada sobre Drizzle/Postgres. Hoje existem feed publico, posts, comentarios, likes, saves, follows, denuncias, creator metrics basicas, snapshots de analise e uma rota de perfil publico em `/community/users/[slug]`.

O problema principal nao e ausencia de funcionalidade bruta. E falta de uma experiencia social com hierarquia visual, identidade de autor, descoberta, reputacao e chamadas claras para participacao. A comunidade precisa parecer parte central do PUBG Aim Analyzer, nao apenas uma listagem tecnica.

Restricoes atuais:

- Manter privacidade: somente perfis `public` e posts `published` + `public` podem aparecer.
- Evitar dependencias novas; a stack atual ja consegue entregar a experiencia.
- Preservar SEO e renderizacao server-first nas rotas publicas.
- Melhorar visual sem quebrar o design system atual, que usa tema escuro, tokens CSS e componentes globais.
- Preservar a assinatura visual existente: fundo escuro, glass, grid/crosshair, acentos laranja e ciano, metricas mono, cards tecnicos e navegacao premium.
- Evitar regressao nos testes existentes de comunidade e release.

Leitura visual atual do projeto:

- A home usa uma cena de analise com crosshair central, grid overlay, glow laranja/ciano e titulo forte.
- `/pros` usa cards de jogadores com foto, badges, barras, comparador e blocos compactos de estatistica.
- O header usa glass fixo com linha inferior laranja/ciano.
- As telas tecnicas usam chips, metricas mono e cards com borda fina para passar sensacao de instrumento de leitura.
- A comunidade nova deve evoluir essa linguagem para um "squad board tecnico": social, mas ainda com cara de analyzer competitivo.

## Goals / Non-Goals

**Goals:**

- Transformar `/community` em hub de descoberta com secoes claras: destaque, filtros, feed, tendencias, criadores e proximas acoes.
- Evoluir `/community/users/[slug]` para perfil publico compartilhavel com identidade, metricas, posts, badges e acoes sociais.
- Criar loops que incentivem voltar: seguir autores, copiar setups, salvar posts, publicar analises melhores e descobrir conteudos relacionados.
- Melhorar responsividade, acessibilidade, estados vazios e estabilidade visual.
- Centralizar dados de feed/perfil em view models testaveis antes de renderizar UI.
- Garantir que a nova UI pareca feita para este produto: PUBG, recoil, setup, analise e comunidade tecnica.

**Non-Goals:**

- Nao criar chat em tempo real, DM, grupos privados ou notificacoes push nesta mudanca.
- Nao criar monetizacao, assinatura ou paywall novo.
- Nao expor analises privadas, dados sensiveis de hardware ou sessoes nao publicadas.
- Nao trocar a stack visual inteira nem migrar para uma biblioteca de componentes externa.
- Nao fazer rebrand, paleta nova, visual claro, visual de rede social generica, dashboard corporativo ou landing page promocional desconectada.
- Nao implementar algoritmo complexo de ranking; a primeira versao usa sinais persistidos simples.

## Decisions

### 0. Tratar a direcao visual como contrato de produto

A comunidade deve usar o vocabulario visual ja existente do PUBG Aim Analyzer: `--color-bg-*`, `--glass-bg`, `--glass-border`, `--color-accent-primary`, `--color-accent-cyan`, `--font-mono`, chips tecnicos, cards glass, linhas de grid, motivos de crosshair, placas de estatistica e blocos compactos de leitura. A composicao deve lembrar uma mesa de squad/treino analisando sprays, nao uma rede social horizontal qualquer.

Regras praticas:

- Usar acento laranja como energia/acao e ciano como leitura/precisao, sem criar uma nova paleta dominante.
- Reutilizar o clima de crosshair, grid e HUD tecnico, mas com mais controle para nao virar decoracao poluida.
- Usar numeros, score, counts e comparacoes em mono, como nas metricas existentes.
- Usar imagens/avatar/fotos apenas quando forem identidade real de perfil ou jogador; fallback deve ser monograma/placa, nao ilustracao generica.
- Evitar "card sobre card", hero de marketing, gradientes roxos/azuis genericos, orb decorativo, mockup fake e copy explicando a interface.
- Os nomes visuais dos componentes devem nascer do dominio: `SnapshotPlate`, `LoadoutChip`, `CreatorPlate`, `RecoilSignal`, `SquadBoardSection`, ou equivalentes.

Alternativa considerada: aplicar um visual social premium generico com avatar cards, trending cards e badges comuns. Rejeitada porque deixaria a comunidade sem identidade e fora do produto.

### 1. Criar view models server-first para superficies publicas

As paginas publicas devem receber dados ja prontos para UI por funcoes dedicadas, por exemplo `getCommunityDiscoveryViewModel()` e `getPublicCommunityProfileViewModel()`. Essas funcoes podem compor consultas existentes de feed, perfil, follows e creator metrics.

Alternativa considerada: deixar cada componente fazer suas proprias queries. Rejeitada porque espalha regras de privacidade, dificulta testes e aumenta risco de inconsistencia entre feed, cards e perfil.

### 2. Enriquecer cards sem depender de dados privados

Os cards do feed devem exibir autor, slug do perfil, avatar quando existir, arma, patch, diagnostico, data, excerpt, contadores publicos e acoes primarias. O detalhe tecnico completo continua no post.

Alternativa considerada: expor mais campos da sessao de analise diretamente no feed. Rejeitada para manter o feed rapido, legivel e menos arriscado para privacidade.

### 3. Separar UI da comunidade em componentes e CSS modules

A comunidade deve sair gradualmente dos estilos inline repetidos para componentes locais como `CommunityHero`, `CommunityPostCard`, `CommunityCreatorCard`, `CommunityMetricStrip`, `CommunityEmptyState` e `CommunityProfileHeader`. Estilos especificos ficam em CSS modules ou classes reutilizaveis.

Alternativa considerada: continuar com objetos inline por pagina. Rejeitada porque a mudanca e visualmente ampla e precisa de consistencia, responsividade e revisao mais facil.

### 4. Perfil publico como landing social do jogador

O perfil publico deve ser tratado como a pagina social do jogador: avatar/monograma, display name, slug, headline, bio, links, creator badge, follower count, post count, like/comment/copy impact, posts em destaque e lista de posts.

Alternativa considerada: criar uma rota nova separada para criadores. Rejeitada por enquanto; `/community/users/[slug]` ja e o endereco publico correto e deve ser fortalecido primeiro.

### 5. Loops de comunidade baseados em sinais simples

A primeira versao de fortalecimento deve usar sinais ja disponiveis: likes, comments, copies, saves, follows, posts publicados, creator status, arma/patch/diagnostico e data. Isso permite criar destaques, trending basico, autores ativos e CTAs sem uma nova infraestrutura de ranking.

Alternativa considerada: criar ranking ponderado com job assinado e tabela materializada. Adiada porque aumenta custo e nao e necessario para validar a UX.

### 6. Visual "arena de treino", nao landing generica

A direcao visual deve parecer uma arena de treino competitiva: contraste alto, blocos densos mas claros, dados como prova, chips tecnicos, metricas em destaque e CTAs diretos. A primeira tela de `/community` deve mostrar comunidade e conteudo de verdade, nao um hero de propaganda. O perfil publico deve parecer uma placa de operador/criador com arsenal, impacto e posts, nao uma bio generica.

Alternativa considerada: uma landing hero-first para vender a comunidade. Rejeitada porque a comunidade deve abrir direto na experiencia util: descobrir posts, autores e setups.

### 7. Estados vazios como orientacao de acao

Estados sem posts, sem filtro, sem perfil completo ou sem publicacoes devem orientar o proximo passo: limpar filtros, publicar uma analise, completar perfil ou explorar autores.

Alternativa considerada: mensagens passivas de "nenhum resultado". Rejeitada porque uma comunidade forte precisa transformar ausencia de conteudo em proxima acao.

## Risks / Trade-offs

- [Risk] A experiencia pode ficar visualmente pesada em mobile. -> Mitigar com layout mobile-first, grids que colapsam cedo, texto curto, dimensoes estaveis e verificacao Playwright em 360px e desktop.
- [Risk] A UI pode ficar generica apesar das novas funcionalidades. -> Mitigar com um checklist visual obrigatorio baseado nos motivos atuais do projeto e revisao por screenshots antes de concluir.
- [Risk] A UI pode fugir do projeto se copiar estilos de redes sociais comuns. -> Mitigar proibindo paleta nova, componentes sociais genericos sem contexto tecnico e copy promocional fora do vocabulario de analise.
- [Risk] Consultas extras podem deixar `/community` lenta. -> Mitigar com view model enxuto, limites claros, selecao apenas de campos publicos e testes unitarios para shape de dados.
- [Risk] Badges e metricas podem parecer autoridade falsa. -> Mitigar com copy honesta, badges baseados apenas em estados persistidos e sem prometer skill real que o sistema nao mediu.
- [Risk] Perfil publico pode expor dados demais. -> Mitigar com allowlist explicita de campos publicos e testes que garantem que sessoes privadas nao entram no perfil/feed.
- [Risk] Refatorar visual pode quebrar E2E existente. -> Mitigar mantendo textos/rotas principais ou atualizando testes junto com a nova UX.

## Migration Plan

1. Criar specs e testes para os novos contratos publicos antes de alterar UI.
2. Implementar view models usando tabelas existentes e preservar consultas antigas ate os testes novos passarem.
3. Refatorar UI da comunidade por superficie: primeiro feed, depois perfil publico, depois loops de destaque.
4. Adicionar qualquer campo de banco somente se indispensavel; preferir derivar metricas existentes na primeira versao.
5. Fazer revisao visual com screenshots em mobile e desktop antes de considerar a fase pronta.
6. Validar `npm run test:community:unit`, `npm run typecheck`, `npm run build` e `npm run test:community:e2e`.

Rollback:

- Se a UI nova falhar, manter as consultas novas isoladas e voltar as paginas para o componente anterior.
- Se uma consulta nova causar custo alto, desativar secoes de destaque e manter apenas feed/perfil base.

## Open Questions

- O perfil publico deve permitir banner/capa customizada nesta fase ou apenas avatar/monograma?
- O hub deve destacar criadores manualmente via admin ou automaticamente por metricas simples?
- O feed "seguindo" deve entrar nesta mudanca ou ficar como proxima fase depois do perfil publico forte?
- Quais dados do setup sao seguros e desejaveis para exibir publicamente alem dos snapshots ja publicados?
