## Context

Hoje a comunidade ja tem bastante coisa pronta: feed publico, destaques, desafios, progresso, perfis publicos e detalhe de post. O problema nao e falta de funcionalidade. O problema e que a experiencia ainda passa tres sinais ruins ao mesmo tempo:

- parece longa demais
- usa copy que ainda soa interna em varios pontos
- perde confianca quando a interface parece preenchida demais para a quantidade real de atividade

Se a comunidade precisa ficar realmente forte, ela tem que melhorar estrutura, copy e credibilidade ao mesmo tempo. Melhorar so layout nao resolve. Melhorar so a progressao tambem nao resolve.

## Goals / Non-Goals

**Goals:**

- Fazer a comunidade parecer uma parte central do produto, e nao uma pagina montada por modulos independentes.
- Colocar a evolucao do spray como principal leitura de progresso.
- Melhorar a hierarquia de hub, perfil e detalhe do post.
- Reescrever a copy das superficies principais com linguagem mais natural para jogador.
- Garantir que a experiencia use dado publico real ou um zero-state honesto.
- Reduzir a sensacao de pagina muito vertical em desktop e mobile.

**Non-Goals:**

- Nao criar chat, mensagens privadas ou transformar a comunidade em rede social completa.
- Nao transformar o produto em uma experiencia agressiva de gamificacao.
- Nao inventar atividade, trends, provas sociais ou estagios para preencher tela.
- Nao expor progresso privado so para enriquecer superficies publicas.

## Decisions

### 1. A comunidade passa a ter uma ordem de leitura clara

O hub, o perfil publico e o detalhe do post precisam responder rapido tres perguntas:

- o que importa agora
- o que esta acontecendo de verdade
- o que vale explorar depois

Quando tudo aparece com o mesmo peso, a comunidade vira uma pagina cansativa. A nova direcao troca pilhas de secoes por blocos compostos por prioridade, nao por origem tecnica dos dados.

Rationale:

- reduz a sensacao de pagina comprida
- melhora leitura em poucos segundos
- deixa o produto mais seguro e mais forte visualmente

Alternativa considerada: manter a estrutura atual e mexer so em espacamento. Rejeitada porque o problema principal e hierarquia.

### 2. A evolucao do spray vira a linha principal de progresso

O produto precisa fazer o usuario sentir que esta evoluindo no spray, nao apenas circulando numa comunidade. Por isso a ordem passa a ser:

- progresso principal: evidencia de treino, analise e foco por arma
- progresso secundario: publicacao, relacao com creators, saves, follows e contribuicao publica

O social continua importante, mas entra como reforco leve da jornada.

Rationale:

- conecta a comunidade ao nucleo do produto
- diminui a sensacao de gamificacao vazia
- melhora o motivo de retorno

Alternativa considerada: manter o mesmo peso entre progresso tecnico e social. Rejeitada porque isso continuaria deixando a comunidade mais parecida com feed do que com jornada.

### 3. Copy e parte do escopo, nao acabamento

Titulos, subtitulos, labels, CTAs e empty states fazem parte da experiencia principal. A regra passa a ser:

- texto curto
- vocabulario de jogador
- menos nomes de sistema
- menos termos abstratos
- mais clareza do que ver, fazer ou entender

Se uma frase parece nome de modulo, linguagem de dashboard interno ou placeholder de produto, ela precisa sair.

Rationale:

- aumenta qualidade percebida
- reduz ruido cognitivo
- deixa a comunidade parecer pronta

Alternativa considerada: ajustar a copy depois da implementacao estrutural. Rejeitada porque grande parte da sensacao ruim ja nasce do texto.

### 4. Sem dado real, sem simulacao

Toda superficie principal da comunidade precisa seguir o mesmo contrato:

- usar apenas dados publicos reais
- nao inventar contagens, tendencias, destaques, estagios, premios ou provas sociais
- quando faltar dado, mostrar um estado vazio bom, honesto e util

Isso vale para:

- `/community`
- `/community/users/[slug]`
- `/community/[slug]`

Se a comunidade ainda estiver vazia em algum ponto, ela precisa parecer nova e honesta, nao encenada.

Rationale:

- aumenta confianca
- evita sensacao de UI mockada
- reduz risco de parecer comunidade artificial

Alternativa considerada: usar placeholders ricos ate a atividade crescer. Rejeitada porque isso enfraquece credibilidade.

### 5. A mesma revisao vale para hub, perfil e detalhe do post

Nao adianta melhorar so o hub se perfil e detalhe do post continuarem parecendo paginas seriais, longas e burocraticas. A experiencia precisa ser consistente nas tres entradas principais da comunidade.

Rationale:

- evita quebra de percepcao quando o usuario navega mais fundo
- melhora continuidade entre descoberta, identidade e conversa
- faz a comunidade parecer um sistema coeso

Alternativa considerada: revisar primeiro so o hub. Rejeitada porque deixaria a proposta incompleta.

### 6. Empty state precisa ajudar, nao pedir desculpa

Quando nao houver post, highlight, creator relevante ou evidencia suficiente de progresso, a interface nao deve parecer quebrada nem compensar com fake content. O empty state precisa:

- admitir a ausencia de dado
- explicar por que aquilo ainda nao esta cheio
- apontar uma proxima acao simples

Rationale:

- mantem credibilidade
- evita frustacao
- transforma ausencia em orientacao util

Alternativa considerada: esconder secoes inteiras sempre que faltar dado. Rejeitada porque isso pode deixar a navegacao opaca demais.

## Risks / Trade-offs

- [Risk] Simplificar a copy demais pode tirar contexto. -> Mitigar com texto curto no primeiro nivel e detalhes so onde fizerem falta.
- [Risk] Exigir dado real pode deixar algumas telas mais vazias no inicio. -> Mitigar com zero-states honestos e bons caminhos de continuidade.
- [Risk] Comprimir blocos pode esconder informacao relevante. -> Mitigar com revelacao progressiva e prioridade clara, nao com remocao cega.
- [Risk] Reduzir o peso do social pode frustrar quem hoje olha so para XP. -> Mitigar com explicacao clara do novo papel do social.

## Migration Plan

1. Revisar proposal, design, tasks e specs para deixar claros os principios de hierarquia, copy e dado real.
2. Auditar hub, perfil e detalhe do post em busca de termos internos, repeticao visual e sinais que parecam mockados.
3. Ajustar os view models para montar experiencias por prioridade e por evidencia disponivel.
4. Implementar a leitura principal de progresso ligada ao spray.
5. Reorganizar hub, perfil e detalhe do post com menos verticalidade e melhor continuidade.
6. Criar empty states honestos para todos os casos em que faltarem sinais publicos reais.
7. Validar visualmente em desktop e mobile.

Rollback:

- Manter os contratos de dado real e copy revisada, mas voltar temporariamente para a composicao antiga se a nova hierarquia piorar a leitura.
- Desligar apenas as novas composicoes de superficie se algum agrupamento introduzir confusao.

## Open Questions

- Quais sinais reais ja existem hoje para sustentar uma leitura publica de spray mastery sem inventar nada?
- No perfil, o que deve aparecer primeiro para gerar mais valor: setup, prova publica ou progresso?
- No detalhe do post, conversa deve subir quando houver comentarios fortes ou continuar sempre abaixo do contexto tecnico?
- Quais fallbacks atuais mais passam sensacao de mock na comunidade?
