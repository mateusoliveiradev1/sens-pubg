## 1. Progression Core

- [x] 1.1 Auditar o motor atual de progressao para fechar o conjunto final de regras de XP, missoes, streaks, rewards e anti-farming desta change
- [x] 1.2 Fortalecer o ledger e os agregados de progressao para suportar XP, niveis, feedback de level-up, missoes, recaps e rewards de forma audivel e consistente
- [x] 1.3 Reapertar cooldowns, deduplicacao, limites por periodo e exclusao de conteudo inelegivel para reduzir farm e ruido

## 2. Rituals, Missions and Rewards

- [x] 2.1 Melhorar a resolucao de temporadas, desafios semanais e fallback ritual para que o sistema pareca forte mesmo com pouco contexto publico
- [x] 2.2 Reorganizar o mission board e os resumos pessoais para mostrar poucos objetivos, mas mais claros e mais valiosos
- [x] 2.3 Refinar squads, metas compartilhadas e rewards public-safe para que reforcem pertencimento sem poluir a experiencia

## 3. Discovery Density and Hub Composition

- [x] 3.1 Adicionar ao `community-discovery-view-model` um sinal explicito de densidade publica para diferenciar estados `sparse` e `active`
- [x] 3.2 Reapertar os thresholds de creator highlight e profile promotion para impedir promocao baseada em um unico post publico ou sinal fraco demais
- [x] 3.3 Reorganizar `src/app/community/page.tsx` para combinar discovery, progressao e rituais sem empurrar o feed real para baixo no modo `sparse`

## 4. Public Surfaces

- [x] 4.1 Ajustar copy do hub, das missoes, dos desafios, do feedback de XP e dos rewards para uma linguagem mais forte, mais clara e menos generica
- [x] 4.2 Atualizar o perfil publico para expor apenas rewards, streak e identidade coletiva que sejam public-safe e factuais
- [x] 4.3 Revisar estilos e espacamentos do hub e do perfil para reduzir verticalidade mesmo com a nova camada de gamificacao

## 5. Contracts and Validation

- [x] 5.1 Atualizar specs, testes unitarios e contratos para cobrir sparse/active, progressao, missoes, desafios semanais, squads e rewards public-safe
- [x] 5.2 Revisar `/community` e `/community/users/[slug]` em desktop e mobile com cenarios de comunidade pequena e comunidade mais rica
- [x] 5.3 Confirmar antes de fechar que o hub ficou mais honesto e que a gamificacao ficou muito mais forte sem virar spam competitivo
