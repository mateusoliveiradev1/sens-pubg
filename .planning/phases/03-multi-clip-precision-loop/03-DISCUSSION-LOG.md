# Phase 3: Multi-Clip Precision Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 3-Multi-Clip Precision Loop
**Areas discussed:** Regras de clips compativeis, Significado da tendencia, Superficie do loop, Evidencia para o coach

---

## Regras de clips compativeis

| Decision Point | Options Considered | Selected |
|---|---|---|
| Compatibilidade geral | Estrita; em camadas; ampla por arma; agent decide | Estrita |
| Clip incompativel | Bloquear e explicar; contexto separado; comparacao exploratoria; agent decide | Bloquear e explicar |
| Campos obrigatorios | Tudo que muda recoil/contexto; nucleo tecnico; arma/mira/distancia; agent decide | Tudo que muda recoil/contexto |
| Quantidade de clips | 2 sinal/3+ tendencia; 3+ sempre; 2 bastam; agent decide | 1 baseline, 2 sinal, 3+ tendencia forte |
| Distancia | Tolerancia adaptativa; quase exata; faixas fixas; agent decide | Quase exata |
| Metadados ausentes | Bloquear; historico fraco; pedir recaptura; agent decide | Bloquear da tendencia precisa |
| Patch diferente | Bloqueia sempre; bloqueia se afetar arma/anexos; aviso; agent decide | Bloqueia sempre |
| Um clip compativel | Criar baseline; mostrar isolado; progresso bloqueado; agent decide | Criar baseline preciso |
| Qualidade de captura | Obrigatoria; peso; aviso; agent decide | Obrigatoria e parecida |
| Tipo de spray | Obrigatorio; peso; fora da fase; agent decide | Obrigatorio |
| Muitos bloqueios | Controle de precisao; neutro; instrutivo; agent decide | Controle de precisao |

**User's choice:** Regua maxima de precisao: comparar so quando o contexto e a evidencia forem realmente equivalentes.
**Notes:** O usuario reforcou que a analise precisa ser "muito mais que perfeita"; registrado como ambicao de qualidade interna, sem transformar isso em claim publico de perfeicao.

---

## Significado da tendencia

| Decision Point | Options Considered | Selected |
|---|---|---|
| Metrica principal | Score acionavel; score mecanico; pilares; veredito combinado | Score acionavel de mastery |
| Score mecanico | Secundario; nao destacar; mesmo peso; agent decide | Secundario/subordinado |
| Pilares | Obrigatorios; so mudanca grande; camada tecnica; agent decide | Obrigatorios com delta |
| Diagnosticos recorrentes | Explicam tendencia; parte do veredito; fora da fase; agent decide | Explicam tendencia |
| Rotulos | Conservadores; motivacionais; tecnicos; agent decide | Conservadores por evidencia |
| Delta minimo | Zona morta; qualquer delta; percentual por faixa; agent decide | Zona morta conservadora |
| Progresso validado | Nenhum pilar critico piora; score manda; tradeoff explicado; agent decide | Nenhum pilar critico piora forte |
| Regressao validada | Mesma regua; mais sensivel; nunca cedo; agent decide | Mesma regua rigida |
| Janela de comparacao | Janela + baseline; ultimo vs baseline; media movel; agent decide | Janela compativel + baseline |

**User's choice:** Tendencia honesta, auditavel e conservadora.
**Notes:** O score acionavel manda porque carrega confianca, cobertura e qualidade. O score mecanico e util, mas nao pode vender progresso se a evidencia nao sustenta.

---

## Superficie do loop

| Decision Point | Options Considered | Selected |
|---|---|---|
| Onde o loop aparece primeiro | Pos-analise; historico; dashboard; tres superficies | Pos-analise |
| Conteudo pos-analise | Veredito+deltas; relatorio completo; resumo com link; agent decide | Veredito + deltas essenciais |
| Papel do historico | Auditoria/grupos; badges; painel principal; agent decide | Auditoria e grupos compativeis |
| Papel da dashboard | Resumo executivo; painel completo; CTA; agent decide | Resumo executivo |
| Bloqueios | Analise+historico; so historico; so analise; agent decide | Analise e historico |
| Posicao do bloco de tendencia | Depois do veredito; topo absoluto; depois da tecnica; agent decide | Depois do veredito do clip |
| Grupos no historico | Clicaveis; badges; so detalhe; agent decide | Grupos compativeis clicaveis |
| Dashboard por contexto | Tendencia principal; por arma/contexto; top 3; agent decide | Tendencia principal atual |
| CTA do loop | Gravar validacao compativel; analisar novo clip; criar baseline; agent decide | Gravar validacao compativel |

**User's choice:** O loop precisa ser sentido imediatamente depois de analisar o clip, com prova tecnica no historico e resumo executivo na dashboard.
**Notes:** A fase deve melhorar as superficies necessarias do loop, mas nao virar uma reforma visual completa.

---

## Evidencia para o coach

| Decision Point | Options Considered | Selected |
|---|---|---|
| Visibilidade da evidencia | Visivel e usada pelo coach; interna; so historico; agent decide | Visivel e usada pelo coach |
| Contrato de evidencia | Resumo estruturado; lista de clips; label final; agent decide | Resumo estruturado |
| Conflito clip vs tendencia | Rebaixa agressividade; clip manda; historico manda sempre; agent decide | Rebaixa agressividade |
| Progresso validado | Consolidar; aumentar dificuldade; trocar problema; agent decide | Consolidar antes de mudar variavel |
| Regressao validada | Voltar baseline; mudar agressivo; pedir clip; agent decide | Voltar ao ultimo baseline confiavel |
| Explicacao de cautela | Obrigatoria; so acao; so tecnica; agent decide | Obrigatoria |
| Historico compativel | Citar claro; generico; nao citar; agent decide | Citar explicitamente |
| Diagnostico recorrente | Recorrencia manda; gravidade atual; score combinado; agent decide | Recorrencia compativel manda salvo bloqueio |
| Razao visivel | Obrigatoria; detalhe tecnico; nao mostrar; agent decide | Obrigatoria |
| Sinal inicial | Validacao controlada; progresso leve; nao usar; agent decide | Validacao controlada |
| Estrutura do coach | Evidencia/leitura/bloco; narrativa; camada tecnica; agent decide | Separacao obrigatoria |
| Validacao do bloco | Sempre; so sens; nem sempre; agent decide | Sempre validavel |
| Voz | Direta/premium/exigente; gamer; tecnica; agent decide | Direta, premium e exigente |
| Evidencia insuficiente | Recaptura/validacao; treino leve; depende; agent decide | Recaptura/validacao antes de treino novo |
| Produto central | Coach central; camada explicativa; secundario | Coach, sens e treino sao nucleo premium |
| Integracao coach/sens/treino | Sistema integrado; coach orquestra; cards separados; agent decide | Sistema integrado |
| Prioridade sens vs treino | Evidencia decide; coach decide; sens manda; agent decide | Evidencia multi-clip decide |
| Rigidez da sens | Muito mais rigida; so mudancas grandes; manter atual; agent decide | Muito mais rigida |
| Treinos | Sempre por blocker; biblioteca generica; mistura; agent decide | Sempre por blocker medido |
| Bloco de treino | Completo; curto; depende; agent decide | Completo obrigatorio |
| Sensacao premium | Plano fechado; auditoria; UI/voz; tudo junto | Plano fechado de evolucao |
| Prioridades | Uma principal; principal+duas; varias categorias; agent decide | Uma prioridade principal |
| Status final | Obrigatorio; so texto; so tendencia forte; agent decide | Obrigatorio |
| Sens como principal | So evidencia forte; moderada; sempre destaque; agent decide | So evidencia forte |
| Linha ativa | Por contexto; so sessao; so dashboard; agent decide | Linha ativa por contexto |
| Reinicio da linha | Novo baseline; ruptura; perguntar; agent decide | Novo baseline |
| Coach e linha ativa | Linha manda; contexto secundario; clip atual; agent decide | Linha ativa manda no coach |
| Checkpoint | Obrigatorio; tendencia geral; so 3+ clips; agent decide | Obrigatorio |
| Meta curta | Proximo checkpoint; so bloco; futuro; agent decide | Meta do proximo checkpoint |
| Variavel por checkpoint | Uma principal; ate duas; livre; agent decide | Uma variavel principal |
| Variavel em teste | Obrigatoria; inferir; so sens; agent decide | Obrigatoria |
| Mudanca fora da variavel | Quebra linha; contaminada; aviso; agent decide | Quebra linha e cria baseline |
| Comunicacao do metodo | Variavel+validacao; detalhes; bastidor; agent decide | Variavel em teste + proxima validacao |
| Programa ativo | Sim; nao chamar programa; linha evolucao; agent decide | Programa ativo por linha compativel |
| Evolucao sem mentir | Estagios; barra; checklist; agent decide | Estagios de maturidade |
| Consolidado | Coach escolhe proxima variavel; usuario escolhe; encerra; agent decide | Coach escolhe proxima variavel |
| Timeline | Sim; so status; so historico; agent decide | Timeline de checkpoints |
| Onde timeline aparece | Resumo analise/dashboard e completa historico; todos; so historico; agent decide | Resumo curto + historico completo |
| Escopo Phase 3 | Fundacao enxuta; tudo premium; meio-termo | Fundacao premium enxuta |

**User's choice:** O usuario quer excelencia maxima em coach, sens e treinos, mas aceitou que Phase 3 deve entregar a fundacao premium enxuta para permitir execucao.
**Notes:** O usuario brincou que queria escolher o escopo maximo, mas concordou com o recomendado. A ambicao maxima fica preservada para Phase 4 e uma futura fase de UI/refatoracao visual.

---

## the agent's Discretion

- Definir thresholds exatos, contratos TypeScript, persistencia, componentes e sequenciamento.
- Escolher como particionar a implementacao entre `core`, actions, paginas e testes.
- Escolher nomes internos desde que os labels e o contrato de evidencia permanecam honestos.

## Deferred Ideas

- Melhorar muito a precisao do motor de analise do clip de spray em fases/planos de precisao futuros.
- Phase 4 deve elevar coach, sensibilidade e treinos ao nucleo premium do produto.
- Criar uma fase propria para refatoracao visual/UI completa e acabamento premium.
