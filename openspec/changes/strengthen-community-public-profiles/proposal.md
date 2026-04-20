## Why

A nova comunidade ja ficou visualmente forte, mas o perfil publico ainda nao entrega a identidade real do jogador porque nao carrega a bio, headline, links e dados de setup que aparecem em "Meu Perfil". Sem essa paridade e sem loops sociais mais claros, a comunidade parece bonita, mas ainda nao vira um lugar onde jogadores querem seguir criadores, copiar setups, voltar e participar.

## What Changes

- Corrigir a pagina de perfil publico para carregar os campos publicos do perfil do usuario, incluindo bio, headline, avatar, links sociais e dados de hardware/in-game liberados para exibicao.
- Criar uma regra explicita de paridade: tudo que o jogador marcou como publico em "Meu Perfil" deve aparecer de forma segura e bem organizada no perfil publico.
- Melhorar o perfil publico com secoes mais fortes para setup, PUBG core, superficie/grip, links, posts publicados, impacto na comunidade e proximas acoes.
- Fortalecer a comunidade com mecanismos de descoberta e retorno: destaque de criadores, feed de seguindo, tendencias por arma/patch, desafios semanais, posts salvos/colecoes e recomendacoes relacionadas.
- Adicionar sinais de confianca e qualidade sem fingir autoridade: perfil completo, setup verificado pelo usuario, criador ativo, post util, patch atual e atividade recente.
- Melhorar estados vazios e chamadas de acao para incentivar completar perfil, publicar snapshot, seguir operadores, salvar drills, copiar presets e comentar com contexto.
- Manter privacidade: somente dados explicitamente publicos podem aparecer publicamente; dados privados, sessoes nao publicadas e identificadores internos continuam ocultos.
- Nao introduzir mudancas quebradoras.

## Capabilities

### New Capabilities

- `public-profile-data-parity`: garante que perfis publicos exibam, com allowlist de privacidade, os mesmos dados publicos configurados em "Meu Perfil".
- `community-growth-loops`: cobre mecanismos que tornam a comunidade mais forte, incluindo descoberta, seguidores, tendencias, desafios, colecoes, recomendacoes e prompts de participacao.
- `community-trust-signals`: cobre badges, metricas e sinais de qualidade baseados em dados publicos e explicaveis, sem prometer habilidade que o sistema nao mediu.

### Modified Capabilities

- Nenhuma. As specs ativas em `openspec/specs/` ainda estao vazias; esta change adiciona contratos incrementais para a comunidade atual.

## Impact

- Perfil e UI publica: `src/app/community/users/[slug]/page.tsx`, `src/app/community/users/[slug]/page.contract.test.ts`, `src/app/community/community-hub.module.css`, `src/app/community/community-avatar.tsx` e componentes locais de perfil/placas tecnicas.
- Dados e regras de privacidade: `src/core/community-public-profile-view-model.ts`, `src/core/community-public-profile-view-model.test.ts`, `src/actions/community-profiles.ts`, `src/actions/community-profiles.test.ts` e possiveis ajustes em `src/db/schema.ts` se algum campo publico ainda nao estiver persistido.
- Comunidade e descoberta: `src/app/community/page.tsx`, `src/core/community-discovery-view-model.ts`, `src/core/community-highlights.ts`, `src/core/community-creator-metrics.ts` e testes unitarios correspondentes.
- Fluxos sociais: `src/actions/community-follows.ts`, `src/actions/community-saves.ts`, `src/actions/community-copy.ts`, `src/actions/community-reports.ts` e eventuais testes E2E em `e2e/community.*.spec.ts`.
- Sem novas dependencias obrigatorias previstas; preferir derivar sinais dos dados atuais antes de criar novas tabelas.
