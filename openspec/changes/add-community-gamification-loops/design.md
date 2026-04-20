## Context

O projeto ja possui fundacoes fortes para comunidade: perfis publicos, feed publico, follows, saves, copy events, comentarios, destaques, trend board e prompts de participacao. O que ainda falta e uma camada persistente que transforme essas acoes em identidade, habito e pertencimento, sem cair em mecanicas genericas de rede social.

O contexto tecnico favorece uma evolucao incremental. O schema ja registra a maior parte dos eventos relevantes (`community_posts`, `community_post_comments`, `community_post_saves`, `community_post_copy_events`, `community_follows`) e o hub de `/community` ja possui view models que agregam descoberta e tendencias. Isso permite construir gamificacao primeiro como leitura e composicao server-first, antes de introduzir automacoes ou jobs mais pesados.

Stakeholders principais:

- Jogadores que querem progresso visivel e motivo real para voltar.
- Criadores que precisam reconhecimento por contribuicao util, nao so volume.
- Moderacao, que precisa evitar farming, spam e sinais publicos enganosos.

## Goals / Non-Goals

**Goals:**

- Criar progressao comunitaria baseada em eventos reais do dominio, com XP, niveis, streaks e missoes.
- Fazer o hub e os perfis mostrarem progresso, objetivos da semana e recaps sem perder a leitura publica atual.
- Introduzir squads/circulos leves com metas compartilhadas e recompensas sociais opt-in.
- Garantir guardrails anti-abuso desde o contrato: cooldowns, deduplicacao, exclusao de conteudo ocultado e recompensa por qualidade contextual.
- Reaproveitar infra e tabelas existentes sempre que possivel, adicionando novas tabelas apenas para estados persistentes que nao podem ser derivados em leitura.

**Non-Goals:**

- Nao criar chat em tempo real, DMs, voz, clan wars ou torneio competitivo completo nesta change.
- Nao introduzir ranking global aberto por skill, elo ou promessa de performance nao medida.
- Nao depender de push notifications, fila assíncrona obrigatoria ou sistema de achievements externo para a primeira versao.
- Nao criar pay-to-win, premium XP boost ou qualquer recompensa ligada a pagamento.

## Decisions

### 1. Progressao sera baseada em um ledger de eventos elegiveis

Em vez de incrementar contadores opacos espalhados pelo app, a implementacao deve centralizar a gamificacao em um ledger de eventos elegiveis, por exemplo `community_progress_events`, com chaves como `publish_post`, `complete_public_profile`, `receive_unique_save`, `receive_unique_copy`, `comment_with_context`, `weekly_goal_complete`.

Cada evento registrado deve guardar:

- ator beneficiado
- ator originador quando houver
- entidade associada (post, profile, squad, season)
- tipo de evento
- timestamp
- idempotency key / unique fingerprint
- valor bruto e valor efetivo de XP quando aplicavel

Rationale:

- permite auditoria, recalc, anti-farming e rollback seletivo
- evita logica de pontos duplicada em cada action
- reaproveita os eventos sociais atuais como fonte

Alternativa considerada: atualizar diretamente colunas agregadas em `community_profiles` ou `users`. Rejeitada porque dificulta explicar pontos, detectar abuso e recalcular temporadas.

### 2. XP deve ser derivado de acoes de valor, com cooldown e qualidade minima

Nem toda interacao social merece o mesmo peso. A primeira versao deve priorizar:

- publicar analise/post publico
- completar perfil publico
- comentario com contexto tecnico
- save/copy unicos recebidos
- retorno para registrar progresso em desafio semanal

Curtidas podem existir como sinal secundario, mas nao devem ser o principal motor de XP. Cada regra de progresso deve prever:

- deduplicacao por usuario/alvo
- janelas de cooldown
- exclusao de posts ocultos, deletados, arquivados ou perfis suspensos
- teto de ganho por periodo para reduzir farm artificial

Alternativa considerada: usar um score simples por likes, comentarios e follows. Rejeitada porque incentiva volume vazio e nao conversa com o dominio do app.

### 3. Temporadas e rituais serao leves e derivadas do contexto atual

A camada de ritual deve introduzir:

- uma temporada ativa com nome, datas e tema
- desafios semanais ligados a arma, patch ou diagnostico
- recap semanal pessoal e, quando houver, recap de squad

Na primeira versao, os desafios podem ser gerados por heuristica sobre o trend board atual com fallback editorial ou estatico. Isso evita depender de painel administrativo completo ou ML.

Alternativa considerada: editor completo de temporadas/challenges antes da primeira entrega. Adiada para reduzir escopo e acelerar validacao.

### 4. Squads serao pequenos, assíncronos e sem chat

Para reforcar pertencimento sem abrir nova frente de moderacao, squads/circulos devem nascer como grupos pequenos e assíncronos:

- limite de membros definido no contrato
- entrada por convite ou aceite
- sem chat interno nesta fase
- foco em metas compartilhadas, progresso agregado e badges/titulos coletivos

Rationale:

- aumenta retorno e cooperacao
- evita custo de moderacao de conversas em tempo real
- casa melhor com o produto atual, que ja gira em torno de posts, setups e historico

Alternativa considerada: clans grandes com mural, chat e ranking aberto. Rejeitada por elevar muito o custo operacional.

### 5. Recompensas publicas devem ser cosmeticas, factuais e opt-in

As recompensas publicas devem assumir a forma de:

- badges de temporada
- titulos/callsigns
- marcos de contribuicao
- destaque temporario de squad ou operador da semana

Esses sinais podem ser exibidos no hub, perfil e post, mas sempre como fatos do sistema, nunca como afirmacao de skill real. O usuario deve poder esconder partes publicas sensiveis dessa exibicao quando a recompensa for cosmética ou social.

Alternativa considerada: leaderboard global numerico permanente. Rejeitada porque aumenta comparacao toxica e distorce o objetivo de comunidade forte.

### 6. Integracao UI sera feita sobre view models existentes

O hub `/community` e os perfis publicos devem receber novos blocos no mesmo fluxo server-first atual:

- `community-discovery-view-model` ganha mission board, progress summary, seasonal recap e squad spotlight
- `community-public-profile-view-model` ganha reward strip, streak summary e squad identity publica
- `community-trust-signals` permanece factual e passa a conviver com recompensas sem se confundir com elas

Isso preserva o estilo atual do app e reduz risco de espalhar logica de negocio pela UI.

Alternativa considerada: componentes client-heavy consumindo varios endpoints de gamificacao. Rejeitada para a primeira fase por aumentar acoplamento e loading states.

## Risks / Trade-offs

- [Risk] Gamificacao pode premiar comportamento ruidoso em vez de contribuicao real. -> Mitigar com pesos por acao de valor, cooldown, limites por periodo e exclusao de conteudo moderado.
- [Risk] O ledger adiciona complexidade de schema e composicao. -> Mitigar com escopo inicial pequeno de tipos de evento e agregacoes server-side testadas.
- [Risk] Squads podem virar vetor de spam de convite. -> Mitigar com limites de membros, cooldown de convite e opt-in explicito.
- [Risk] Recompensas publicas podem parecer falso status competitivo. -> Mitigar com labels factuais, copy explicativa e separacao visual entre trust signal e reward.
- [Risk] Recaps e desafios podem ficar vazios em comunidades pequenas. -> Mitigar com fallback editorial e mensagens neutras baseadas em progresso pessoal.
- [Risk] Calculo on-demand pode pesar o hub. -> Mitigar com agregados simples, consultas limitadas por periodo e possibilidade futura de materializacao se a carga crescer.

## Migration Plan

1. Adicionar contratos/specs para progressao, rituais, squads e requisitos modificados do hub/loops.
2. Introduzir schema minimo para temporadas, eventos de progresso, estado agregado por membro e membership de squad.
3. Criar helpers/core para registrar eventos elegiveis a partir das actions de comunidade ja existentes.
4. Construir view models agregados de progresso pessoal, desafios semanais, recap e squads.
5. Exibir as novas superficies no hub e no perfil publico com fallbacks seguros para usuarios anonimos e comunidade pequena.
6. Adicionar verificacoes anti-abuso e exclusao de conteudo moderado do calculo de recompensa.
7. Validar com testes unitarios, contratos de rota/UI e E2E de comunidade.

Rollback:

- Desligar apenas as superficies de gamificacao se o hub ficar instavel, preservando feed/perfis existentes.
- Parar de registrar novos eventos de progresso e manter somente leitura dos dados antigos se houver problema de schema.

## Open Questions

- O recap semanal deve aparecer apenas no hub logado ou tambem em `/profile`?
- Squads devem ser publicos por padrao ou privados por padrao com resumo publico opcional?
- Titulos/badges conquistados devem ser equipaveis manualmente ou sempre automáticos?
- A primeira temporada deve ser totalmente automatica via trends ou parcialmente curada por admin?
