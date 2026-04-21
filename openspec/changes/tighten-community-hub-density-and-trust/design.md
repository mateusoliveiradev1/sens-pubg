## Context

O feedback mais recente juntou dois diagnosticos que antes estavam separados:

- o hub ainda consegue parecer grande demais para uma comunidade com pouco conteudo publico real
- a gamificacao atual existe, mas ainda nao cria a sensacao de sistema forte, memoravel e completo

Hoje ja existe base tecnica relevante:

- feed, highlights, trend board, follows, saves, comments e perfis publicos
- ledger de eventos elegiveis para progressao, regras de XP, streak, desafio semanal e recaps em `community-progression.ts`
- suporte a temporadas, missoes, rewards e squads no schema

O problema e que esses dois mundos ainda nao estao amarrados como uma experiencia unica. Em estados de baixa densidade, o hub pode parecer promovido cedo demais. Em estados mais ricos, a progressao ainda pode soar leve demais ou pouco visivel. O objetivo desta change passa a ser unir as duas frentes numa comunidade que pareca honesta quando pequena e poderosa quando o jogador entra no loop.

## Goals / Non-Goals

**Goals:**
- Introduzir uma leitura mais honesta para estados `sparse` e `active` de descoberta publica.
- Reduzir a verticalidade do hub quando existirem poucos posts, poucos autores ou pouca prova social real.
- Tornar o sistema de XP, niveis, missoes, desafios, streaks, recaps e recompensas mais forte e mais legivel para o jogador.
- Conectar discovery, progressao pessoal, rituais e squads sem afogar o feed real nem vender sinais publicos cedo demais.
- Exibir apenas progresso publico seguro em superficies abertas, mantendo detalhes privados para o proprio viewer.
- Fortalecer guardrails anti-abuso desde o contrato.

**Non-Goals:**
- Nao criar chat em tempo real, DMs, clan wars ou uma camada competitiva completa.
- Nao adicionar ranking global agressivo nem promessas de skill que o produto nao mede.
- Nao transformar a comunidade num produto separado do nucleo de treino e spray mastery.
- Nao introduzir pay-to-win, boosts pagos ou recompensas ligadas a monetizacao.

## Decisions

### 1. O hub passa a operar em modos de densidade publica

`getCommunityDiscoveryViewModel` passa a produzir um sinal adicional de densidade publica do hub, derivado de fatores como:

- quantidade de posts publicos visiveis
- quantidade de autores publicos distintos
- existencia real de trend/highlight com evidencia suficiente
- existencia de creator promotion que passe um threshold mais forte
- existencia de viewer-specific surfaces realmente uteis, em vez de empty states serializados

Esse modo sera usado pela pagina para decidir entre composicoes `sparse` e `active`.

Rationale:

- transforma a percepcao de "parece mockado" em uma regra objetiva de produto
- reduz a chance de o layout ficar superestruturado quando ainda existe pouco conteudo
- permite manter a comunidade rica quando houver densidade suficiente

Alternativa considerada: ajustar apenas CSS e espacamento. Rejeitada porque a causa principal e comportamento de composicao, nao so visual.

### 2. Creator/profile promotion precisa de threshold mais forte que "tem um post"

`buildCommunityCreatorHighlights` deixara de promover perfis com base em um sinal minimo demais. O threshold novo precisa exigir evidencias mais fortes, por exemplo:

- mais de um post publico, ou
- combinacao real de post publico com engajamento/follow/copy, ou
- creator status acompanhado de atividade publica suficiente

Em outras palavras: um perfil nao pode ganhar protagonismo de hub so porque existe um unico post aberto.

Rationale:

- esse e o ponto mais visivel do feedback do usuario
- corrige a sensacao de perfil promovido cedo demais
- deixa o post real ser o protagonista quando a comunidade ainda esta rasa

Alternativa considerada: esconder apenas o link de perfil no topo. Rejeitada porque isso atacaria o sintoma, mas nao a regra.

### 3. A gamificacao continua baseada em um ledger de eventos elegiveis

Em vez de espalhar pontos por varias actions isoladas, a progressao continua centrada num ledger audivel de eventos elegiveis. Esse ledger precisa sustentar:

- XP bruto e efetivo
- niveis e level-ups
- streaks
- missoes
- desafios semanais
- metas de squad
- recompensas e recaps

Cada evento deve manter ator, beneficiario quando houver, entidade associada, tipo, timestamp, fingerprint/idempotency key e valores de XP.

Rationale:

- permite auditoria, recalc e explicacao do sistema
- evita duplicacao de logica de pontos
- facilita anti-farming e rollback seletivo

Alternativa considerada: atualizar agregados diretamente em colunas de perfil. Rejeitada porque dificulta explicacao, controle e recalculo.

### 4. O sistema de XP, niveis e missoes deve priorizar acoes de valor e escalar melhor

O sistema precisa ficar "muito melhor" sem virar volume vazio. A direcao e:

- publicar post/analise, completar perfil, comentar com contexto e gerar save/copy continuam como acoes de alto valor
- desafios e missoes deixam de ser apenas um pano de fundo e passam a orientar o proximo passo do jogador
- o mission board mostra poucas missoes, mas priorizadas por urgencia e relevancia
- o sistema pode sustentar mais variedade de missoes sem inundar o hub com dez cards simultaneos
- ganhos relevantes precisam explicar delta de XP, nivel atual e proximo marco de forma curta e legivel

Rationale:

- melhora sensacao de sistema completo
- mantem foco em contribuicao util e nao em vanity metrics
- evita overload visual mesmo com mais profundidade de progressao
- transforma XP em feedback entendivel, nao em numero opaco

Alternativa considerada: aumentar apenas XP e numero de desafios. Rejeitada porque mais volume sem curadoria so aumentaria ruido.

### 5. Temporadas, desafios e recaps continuam leves, mas mais fortes

O sistema deve suportar:

- temporada ativa com nome, janela e tema
- desafio semanal vindo primeiro de missao semanal ativa quando existir
- fallback por trend quando nao houver missao semanal ativa
- fallback editorial neutro quando nao houver contexto publico suficiente
- recap pessoal e recap de squad com proximo passo claro

Rationale:

- da cadencia sem depender de painel administrativo completo para tudo
- preserva robustez quando a comunidade estiver pequena
- permite enriquecer o sistema mais tarde sem trocar a espinha dorsal

Alternativa considerada: painel admin completo antes de fortalecer o motor atual. Adiada para evitar travar entrega.

### 6. Squads e rewards precisam ser reais, leves e public-safe

Squads seguem leves e assincronos:

- pequenos grupos
- metas compartilhadas
- sem chat nesta fase
- reward layer publica apenas quando a recompensa for factual e segura para exibicao

Rewards publicos devem aparecer como badges, titulos, season marks ou sinais coletivos, nunca como afirmacao de skill nao medida.

Rationale:

- reforca pertencimento
- evita custo de moderacao desnecessario
- mantem a comunidade no territorio do produto atual

Alternativa considerada: clans grandes e leaderboard aberto. Rejeitada por elevar custo social e distorcer o objetivo.

### 7. Viewer-specific gamification precisa respeitar o modo sparse

Mesmo quando o viewer tiver progresso, o hub nao deve voltar a ficar serial e superalto. Em modo `sparse`:

- progresso pessoal aparece compacto
- desafio, missao e recap nao empurram o feed para muito abaixo
- empty states de gamificacao preferem nota inline ou omissao discreta

Em modo `active`, essas superficies podem abrir mais espaco porque ha contexto suficiente para sustenta-las.

Rationale:

- junta honestidade de densidade com profundidade de gamificacao
- evita que a nova camada de XP/missoes reintroduza o problema de verticalidade

Alternativa considerada: renderizar sempre todas as superficies viewer-aware quando existirem. Rejeitada porque isso reabre o problema do hub comprido demais.

### 8. Perfis publicos exibem apenas sinais public-safe de progressao

`public-community-profiles` passa a cobrir explicitamente:

- rewards public-safe
- streak summary resumido e factual
- identidade de squad publica quando permitida

Nao deve expor:

- missoes privadas em andamento
- progresso bruto interno
- reward progress parcial sem exibicao segura

Rationale:

- deixa o sistema parecer completo tambem no perfil
- preserva fronteiras de privacidade
- evita que "tudo" vire exposicao demais

Alternativa considerada: levar toda a progressao detalhada para o perfil publico. Rejeitada porque mistura progresso privado com sinal publico.

### 9. A auditoria da change fecha os numeros e guardrails em um catalogo unico

Antes de expandir ledger, rewards e superfícies, a change fecha explicitamente o conjunto final de regras que o motor atual precisa respeitar:

- XP por acao:
  - `publish_post`: 40
  - `complete_public_profile`: 30
  - `follow_profile`: 10
  - `receive_unique_save`: 15
  - `receive_unique_copy`: 20
  - `comment_with_context`: 20
  - `weekly_challenge_complete`: 80
  - `mission_complete`: 60
  - `squad_goal_contribution`: 15
  - `streak_participation`: 10
- Mission board do hub continua compacto por regra: no maximo 3 objetivos ativos em destaque.
- Desafio semanal tem precedencia fechada: missao ativa, depois trend publica suficiente, depois fallback editorial neutro.
- Cadencia de streak fica fechada em janela semanal: semana corrente sem acao significativa entra em `at_risk`; a partir de duas janelas de distancia entra em `reentry`.
- Rewards public-safe ficam limitados a `badge`, `title`, `season_mark` e `squad_mark`, sempre com copy factual e sem claims de skill.
- Anti-farming de baixo sinal fica fechado por tipo:
  - `follow_profile`: cap por par 1/dia, cap total 3/dia, reciproco 2/dia
  - `receive_unique_save`: cap por par 2/dia, cap total 5/dia, reciproco 3/dia
  - `receive_unique_copy`: cap por par 2/dia, cap total 4/dia, reciproco 3/dia

Essas regras passam a viver em um catalogo auditavel unico para que as proximas tasks reutilizem os mesmos numeros em vez de espalhar literais.

## Risks / Trade-offs

- [Risk] A change fica grande demais e mistura duas frentes importantes. -> Mitigar com tasks separadas por camada: core progression, rituals, rewards, hub composition e contracts.
- [Risk] Mais profundidade de gamificacao pode reintroduzir verticalidade no hub. -> Mitigar com o modo `sparse` como regra de composicao, nao como detalhe visual.
- [Risk] Thresholds agressivos podem esconder discovery cedo demais. -> Mitigar com thresholds conservadores e reabertura progressiva conforme o sinal real cresce.
- [Risk] Mais regras de XP/missao podem premiar comportamento ruidoso. -> Mitigar com cooldown, dedupe, limites por periodo e exclusao de conteudo moderado.
- [Risk] Recompensas publicas podem parecer ranking disfarcado. -> Mitigar com labels factuais e separacao clara entre trust signal, reward e skill.

## Migration Plan

1. Expandir os contratos/specs do change para cobrir densidade do hub, progressao, rituais, squads, rewards e limites public-safe.
2. Revisar `community-progression.ts`, schema relacionado e rules/aggregates para suportar uma camada de XP, niveis, missoes e rewards mais forte.
3. Reapertar thresholds de highlights e adicionar o sinal de densidade publica ao discovery view model.
4. Reorganizar `page.tsx` para compor discovery + viewer progression sem perder honestidade em modo `sparse`.
5. Ajustar o perfil publico para mostrar apenas sinais public-safe de progressao e identidade coletiva.
6. Atualizar copy e contratos visuais para evitar fake fullness, CTA generica e overbuild.
7. Validar com testes unitarios, contratuais e revisao visual em cenarios sparse, active e viewer com progresso real.

Rollback:

- manter os thresholds e regras novas, mas voltar temporariamente para a composicao atual do hub se a leitura piorar
- desligar apenas superficies de gamificacao publica se o sistema ficar pesado ou confuso, preservando feed e perfis
- pausar novos registros/leituras de rewards ou squads publicos sem desmontar o restante do discovery

## Default Product Assumptions

- Creator highlight exige pelo menos 2 posts publicos ou 1 post publico com pelo menos 1 sinal forte posterior de valor publico.
- O mission board forte e rico continua compacto: no maximo 3 objetivos ativos em destaque no hub.
- A precedencia do desafio semanal fica fechada nesta change: missao semanal ativa, depois trend publica, depois fallback editorial neutro.
- Rewards public-safe ficam limitados a badges, titulos, season marks e identidade coletiva factual, nunca a ranking global ou claims de skill.
