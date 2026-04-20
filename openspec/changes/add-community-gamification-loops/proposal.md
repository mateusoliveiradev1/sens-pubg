## Why

A comunidade ja ganhou descoberta, perfis publicos e sinais basicos de confianca, mas ainda falta um motor claro de pertencimento e retorno. Sem progressao, rituais recorrentes e recompensas ligadas a contribuicoes realmente uteis, o jogador visita a comunidade, consome alguns posts e vai embora sem criar habito nem identidade dentro do produto.

## What Changes

- Introduzir uma camada de gamificacao utilitaria baseada em acoes que fortalecem a comunidade: publicar analise, completar perfil publico, seguir operadores relevantes, comentar com contexto, copiar presets, salvar drills e voltar para registrar progresso.
- Criar um sistema de progressao comunitaria com XP, niveis, streaks e missoes, sempre explicado por acoes do dominio PUBG Aim Analyzer e nunca por vanity metrics vazias.
- Adicionar rituais de retorno como desafios semanais, themes por arma/patch, metas pessoais e recaps de progresso para criar frequencia sem depender de notificacoes agressivas.
- Introduzir identidade coletiva com squads/circulos de treino, metas compartilhadas e placares limitados por periodo para reforcar pertencimento sem transformar a experiencia em spam competitivo.
- Criar recompensas sociais e cosmeticas leves, como badges, titulos e marcos publicos, sem alegar habilidade tecnica que o sistema nao mediu.
- Incluir guardrails anti-farming para evitar abuso, troca de engajamento artificial, loops toxicos e pontuacao baseada em volume sem qualidade.
- Manter tudo opt-in, transparente e seguro para a comunidade atual, sem mudancas quebradoras.

## Capabilities

### New Capabilities
- `community-gamification-progression`: cobre XP, niveis, streaks, missoes e progresso pessoal baseados em contribuicoes relevantes para a comunidade.
- `community-social-rituals`: cobre desafios semanais, recaps, metas por arma/patch e rituais de retorno que transformam descoberta em habito.
- `community-squads-and-rewards`: cobre squads/circulos, metas compartilhadas, recompensas sociais leves e guardrails para reconhecimento publico sem promessas falsas de skill.

### Modified Capabilities
- `community-strength-loops`: ampliar os loops de participacao atuais para incluir progressao persistente, retorno recorrente e prompts gamificados baseados em acoes de valor.
- `community-discovery-experience`: incluir superfícies de descoberta para desafios, progresso semanal e destaques gamificados sem quebrar a leitura publica do hub.

## Impact

- Comunidade e descoberta: `src/app/community/page.tsx`, componentes do hub, cards de destaque, filtros e empty states relacionados a `/community`.
- Perfis e identidade social: `src/app/community/users/[slug]/page.tsx` e componentes locais que exibem badges, streaks, metas, squads ou recompensas publicas.
- Core/view models: `src/core/community-discovery-view-model.ts`, `src/core/community-highlights.ts`, `src/core/community-creator-metrics.ts` e novos helpers para progressao, missoes, streaks e anti-abuso.
- Acoes e persistencia: `src/actions/community-*.ts` existentes e provaveis novas rotas/acoes para progresso, desafios, squads, rewards e recaps; possiveis ajustes em `src/db/schema.ts` para tabelas de temporada, eventos, progresso e membership.
- Qualidade e verificacao: testes unitarios/contratuais/E2E em `tests`, `e2e` e suites de comunidade para garantir que a gamificacao incentive valor real e nao exponha dados privados.
