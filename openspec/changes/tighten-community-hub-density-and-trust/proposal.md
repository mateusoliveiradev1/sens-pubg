## Why

A comunidade ainda sofre de dois problemas ao mesmo tempo: quando existe pouco conteudo publico, o hub pode parecer mais cheio do que os dados sustentam; e, mesmo quando o jogador gosta do que encontra, a gamificacao atual ainda nao cria um loop forte o bastante de retorno, pertencimento e progresso. Para a experiencia parecer realmente pronta, precisamos resolver honestidade de descoberta e profundidade de progressao no mesmo pacote.

## What Changes

- Reapertar o contrato do hub para que promocao de perfil, creator highlight e pulso social so aparecam quando houver evidencia publica suficiente.
- Reorganizar `/community` para alternar entre estados `sparse` e `active`, mantendo o feed e o post real perto do primeiro scroll quando a comunidade ainda estiver pequena.
- Melhorar de forma ampla o sistema de gamificacao com XP, niveis, streaks, missoes, desafios semanais, recaps, metas compartilhadas e recompensas public-safe.
- Tornar prompts, desafios e missoes mais claros, mais orientados a jogador e mais conectados a acoes de valor real dentro do dominio do produto.
- Reforcar guardrails anti-farming, limites de repeticao e fronteiras entre progresso privado e sinais publicos.
- Integrar a progressao no hub e no perfil publico de forma compacta, factual e sem transformar a experiencia em spam competitivo.

## Capabilities

### New Capabilities
- `community-gamification-progression`: cobre XP, niveis, streaks, missoes e progresso pessoal baseados em contribuicoes relevantes para a comunidade.
- `community-social-rituals`: cobre desafios semanais, recaps, metas por arma/patch e rituais de retorno que transformam descoberta em habito.
- `community-squads-and-rewards`: cobre squads/circulos, metas compartilhadas, recompensas sociais leves e guardrails para reconhecimento publico sem promessas falsas de skill.

### Modified Capabilities
- `community-discovery-experience`: ajustar a hierarquia do hub para estados de baixa densidade, integrar superficies de progressao e reduzir verticalidade sem promover sinais fracos cedo demais.
- `community-strength-loops`: ampliar os loops de participacao para incluir progressao persistente, retorno recorrente, prompts gamificados e thresholds mais fortes para destaque de creators e perfis.
- `public-community-profiles`: expor apenas sinais public-safe de recompensa, streak e identidade coletiva quando houver evidencia real e exibicao permitida.

## Impact

- Hub publico: `src/app/community/page.tsx`, `src/app/community/community-hub.module.css`, `src/app/community/page.contract.test.ts` e `src/app/community/community-visual-contract.test.ts`.
- Perfis publicos: `src/app/community/users/[slug]/page.tsx` e o view model de perfil para rewards, streaks e squad identity public-safe.
- Core/view models: `src/core/community-discovery-view-model.ts`, `src/core/community-highlights.ts`, `src/core/community-progression.ts`, `src/core/community-public-profile-view-model.ts` e helpers ligados a spray mastery, desafios, recaps, squads e guardrails.
- Persistencia e regras: `src/db/schema.ts`, actions de comunidade e pontos de registro de eventos elegiveis para XP, missoes e recompensas.
- Qualidade e verificacao: testes unitarios, contratuais e visuais da comunidade para cenarios sparse/active, progresso logado, desafios semanais, squads e protecao contra sinais publicos enganosos.
