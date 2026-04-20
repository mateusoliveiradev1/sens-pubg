## Context

O app ja tem uma comunidade visualmente evoluida, com hub publico, feed, destaques, follows, saves, reports e perfil publico em `/community/users/[slug]`. O problema visto nos prints e no codigo e que "Meu Perfil" usa `player_profiles` para bio, X/Twitch, hardware e configuracoes PUBG, enquanto o perfil publico atual usa principalmente `community_profiles`. Quando `community_profiles.bio`, `headline` ou `links` nao estao preenchidos, a pagina publica cai em textos genericos mesmo quando o usuario ja cadastrou esses dados em "Meu Perfil".

Tambem existe uma oportunidade de fortalecer a comunidade alem da estetica: a experiencia precisa transformar posts e perfis em ciclos de descoberta, confianca e retorno. Isso deve acontecer sem expor dados privados e sem criar uma rede social generica desconectada do PUBG Aim Analyzer.

## Goals / Non-Goals

**Goals:**

- Garantir que o perfil publico exiba os dados publicos configurados em "Meu Perfil": bio, links sociais, hardware principal, superficie/grip e PUBG core.
- Definir uma allowlist clara de campos seguros para exibicao publica, mantendo sessoes privadas e identificadores internos ocultos.
- Compor dados de `community_profiles`, `users` e `player_profiles` em um view model server-first testavel.
- Melhorar a pagina publica com placas de setup e sinais de perfil completo, sem depender de duplicacao manual de dados.
- Adicionar loops de comunidade que incentivem seguir, voltar, salvar, copiar presets, participar de desafios e explorar tendencias.
- Tornar badges e sinais de confianca explicaveis e baseados em dados publicos reais.

**Non-Goals:**

- Nao criar chat, DM, grupos privados, notificacoes push ou ranking competitivo complexo nesta change.
- Nao criar paywall, monetizacao ou cargos pagos.
- Nao expor analises privadas, dados de sessao nao publicados, e-mail, Discord ID, user ID, auth session ou campos internos.
- Nao exigir uma biblioteca visual nova ou migracao de design system.
- Nao prometer que um jogador e "melhor" ou "pro" apenas por metricas sociais.

## Decisions

### 1. Compor o perfil publico em tempo de leitura

`getPublicCommunityProfileViewModel` deve buscar o perfil publico por slug e compor uma fonte publica com `community_profiles`, `users` e `player_profiles`. `community_profiles` continua sendo a entidade social principal para slug, visibilidade e creator status; `player_profiles` vira a fonte para dados de setup e para campos de identidade legados de "Meu Perfil".

Precedencia proposta:

- `displayName`: `community_profiles.displayName`, com fallback para `users.name`.
- `avatarUrl`: `community_profiles.avatarUrl`, com fallback para `users.image`.
- `headline`: `community_profiles.headline`, com fallback derivado do setup quando fizer sentido, por exemplo estilo de grip/play style.
- `bio`: `community_profiles.bio`, com fallback para `player_profiles.bio`.
- `links`: `community_profiles.links` normalizados + X/Twitch de `player_profiles`, com deduplicacao e validacao.
- `setup`: somente campos allowlisted de `player_profiles`.

Alternativa considerada: sincronizar todos os campos de `player_profiles` para `community_profiles` ao salvar. Rejeitada como fonte principal porque duplica estado e pode continuar ficando defasada. Pode ser usado apenas para cache futuro, nao como contrato inicial.

### 2. Criar uma allowlist publica de setup

O view model deve expor um objeto como `publicSetup` com tres placas:

- `aimSetup`: mouse model, sensor, DPI e polling rate.
- `surfaceGrip`: mousepad model, tipo de superficie, grip style e play style/pivot.
- `pubgCore`: general sens, ADS, vertical multiplier e FOV.

Campos como user ID, e-mail, Discord ID, auth data, analises privadas, sessoes nao publicadas e qualquer campo fora da allowlist nao entram no modelo publico.

Alternativa considerada: expor todo `player_profiles` e filtrar no componente. Rejeitada porque aumenta risco de vazamento e espalha responsabilidade de privacidade na UI.

### 3. Representar ausencia de dados como proxima acao

Se o perfil publico existe, mas falta `player_profiles`, a pagina deve mostrar um estado "setup ainda nao publicado" com acao para o dono completar o perfil quando for self-profile, ou uma mensagem neutra para visitantes. Se campos parciais faltarem, cada placa deve renderizar fallback curto sem quebrar o layout.

Alternativa considerada: manter texto generico unico no header. Rejeitada porque esconde o motivo do perfil parecer vazio e nao orienta o usuario.

### 4. Fortalecer comunidade por loops simples e explicaveis

A primeira fase deve usar sinais existentes antes de criar infraestrutura nova:

- Feed de seguindo para usuario logado, usando `community_follows`.
- Tendencias por arma/patch/diagnostico a partir de posts publicos recentes.
- Destaque de criadores por posts publicos, seguidores, copias, comentarios e atividade recente.
- Colecoes/salvos como caminho de retorno para drills guardados.
- Desafios semanais simples como prompts editoriais ou derivados de arma/patch em alta.
- Recomendacoes relacionadas no post/perfil com base em tags publicas.

Alternativa considerada: ranking pesado com job materializado. Adiada porque a comunidade ainda precisa primeiro provar os loops basicos.

### 5. Badges como sinais, nao julgamento de habilidade

Badges devem comunicar fatos publicos: "perfil completo", "setup publico", "creator aprovado", "ativo no patch", "post salvo/copied", "comentou recoil". Eles nao devem declarar que alguem e melhor, legitimo ou profissional se o sistema nao mede isso.

Alternativa considerada: criar tiers competitivos ou score unico de jogador. Rejeitada porque seria enganoso e poderia gerar toxicidade.

### 6. UI continua no vocabulário tecnico do produto

As novas secoes devem reaproveitar `community-hub.module.css` ou componentes locais com linguagem de placa tecnica: `OperatorPlate`, `AimSetupPlate`, `SurfaceGripPlate`, `PubgCorePlate`, `TrustSignalRail`, `FollowingFeed`, `TrendBoard`, `WeeklyDrillPrompt`. A tela deve continuar escura, densa, com acentos laranja/ciano, metricas mono e sem hero promocional.

Alternativa considerada: copiar padroes de rede social comum com cards grandes de bio. Rejeitada porque enfraquece a identidade do app.

## Risks / Trade-offs

- [Risk] Compor `player_profiles` em paginas publicas pode vazar campos privados por descuido. -> Mitigar com allowlist tipada, testes unitarios de shape publico e evitar passar linhas brutas para componentes.
- [Risk] Mais joins podem pesar `/community/users/[slug]`. -> Mitigar com selecao de campos, limites de posts e consultas paralelas somente quando o perfil publico existir.
- [Risk] X/Twitch podem estar em formato invalido. -> Mitigar com normalizacao de links existente e descartar URLs invalidas.
- [Risk] Loops demais podem poluir a comunidade. -> Mitigar por entrega incremental: primeiro perfil e setup, depois feed seguindo/tendencias, depois desafios/recomendacoes.
- [Risk] Badges podem parecer autoridade falsa. -> Mitigar usando labels factuais e explicaveis.
- [Risk] Mobile pode ficar apertado com setup + metricas + posts. -> Mitigar com grids responsivos, placas de altura estavel e verificacao Playwright em mobile/desktop.

## Migration Plan

1. Adicionar testes unitarios para o view model do perfil publico cobrindo fallback de `player_profiles`, links sociais, allowlist de setup e privacidade.
2. Ajustar consultas de perfil publico para compor `community_profiles`, `users` e `player_profiles` sem quebrar perfis existentes.
3. Atualizar UI de `/community/users/[slug]` para renderizar placas de setup quando houver dados publicos.
4. Revalidar caminhos de perfil publico ao salvar "Meu Perfil" para que alteracoes de bio/setup aparecam apos salvar.
5. Adicionar testes e UI para loops de comunidade em fatias: seguindo, tendencias, desafios e recomendacoes relacionadas.
6. Rodar testes unitarios de comunidade, typecheck, build e E2E de comunidade.

Rollback:

- Se o join com `player_profiles` causar problema, manter o perfil publico antigo e desligar apenas as placas de setup.
- Se algum loop social ficar instavel, manter feed/hub atual e esconder a nova secao atras de fallback vazio.

## Open Questions

- O jogador deve ter controles granulares para esconder partes do setup publico, ou nesta fase o perfil publico implica exibir a allowlist completa de setup?
- A headline deve continuar editavel em `community_profiles` ou ser derivada automaticamente quando vazia?
- Desafios semanais devem ser gerados automaticamente por tendencia de arma/patch ou definidos manualmente por admin?
- O feed "seguindo" deve aparecer como aba principal da comunidade ou como bloco lateral para usuario logado?
