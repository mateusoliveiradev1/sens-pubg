# Phase 12: Revenue Operations Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-09T16:44:10.5897364-03:00
**Phase:** 12-Revenue Operations Hardening
**Areas discussed:** Painel de funil e receita, Suporte/admin operacional, Readiness pago e Stripe, Checklist de lancamento/no-go

---

## Painel de funil e receita

| Option | Description | Selected |
|--------|-------------|----------|
| Cockpit de decisao de lancamento | Mostra status go/no-go, funil resumido, blockers pagos e proximos checks. | yes |
| Dashboard de metricas | Comeca por numeros: ativacao, upgrade intent, conversao, churn, quota e limites. | |
| Fila de problemas operacionais | Comeca por usuarios/casos com erro de pagamento, entitlement, auth, quota ou analise. | |

**User's choice:** Cockpit de decisao de lancamento.
**Notes:** A primeira tela mental deve ajudar a decidir se pode abrir beta/public launch.

| Option | Description | Selected |
|--------|-------------|----------|
| Funil essencial | Primeira analise util, upgrade intent, checkout started, checkout confirmed, Pro active, churn/cancelamento, quota limit hit. | yes |
| Funil + uso Pro | Inclui Coach completo, History, Spray Lab, Ciclo Pro e Social Pro. | |
| So monetizacao dura | Checkout, webhook, Pro active, past due, cancelamento, churn e disputes. | |

**User's choice:** Funil essencial.
**Notes:** User added "polido"; top funnel should be concise and polished.

| Option | Description | Selected |
|--------|-------------|----------|
| Agregado por padrao | Mostra metricas agregadas e abre detalhe operacional so quando ha motivo concreto. | yes |
| Detalhe por usuario sempre visivel | Admin ve funil por usuario no mesmo painel. | |
| Separar total | Cockpit so agregado; detalhes ficam apenas no admin billing atual. | |

**User's choice:** Agregado por padrao.
**Notes:** User-level details require operational justification.

| Option | Description | Selected |
|--------|-------------|----------|
| Launch control premium | Status claro, cards densos, PASS/WARN/BLOCKED, evidencia, owner e proxima acao. | yes |
| BI classico | Graficos e tabelas maiores, filtros por periodo, menos checklist. | |
| Support console | Lista de incidentes e usuarios antes de metricas. | |

**User's choice:** Launch control premium.
**Notes:** Avoid generic BI feel.

---

## Suporte/admin operacional

| Option | Description | Selected |
|--------|-------------|----------|
| Diagnostico por dominio | Pagamento, entitlement, auth, quota, analise, webhook, admin grant, com status e evidencia. | yes |
| Linha do tempo unica | Mostra todos os eventos cronologicos e o admin interpreta. | |
| Estado do usuario | Comeca por tier, billing status, quota e historico; classificacao vem depois. | |

**User's choice:** Diagnostico por dominio.
**Notes:** Domain diagnosis is the first support lens.

| Option | Description | Selected |
|--------|-------------|----------|
| Suporte le e anota; admin muda estado | Suporte ve snapshot/eventos/cria nota; admin concede/revoga/suspende/reconcilia. | yes |
| Suporte pode corrigir casos simples | Suporte tambem pode quota boost e reconcilia simples. | |
| Tudo por admin apenas | Suporte nao acessa Revenue Ops. | |

**User's choice:** Suporte le e anota; admin muda estado.
**Notes:** Mutations remain admin-only.

| Option | Description | Selected |
|--------|-------------|----------|
| Arvore de causa explicita | Mostra primeira causa verdadeira: sem checkout, webhook pendente, price mismatch, past_due, grant expirado, safe mode, suspensao, entitlement inexistente. | yes |
| Resumo simples | Mostra so estado final: Free, Pro, bloqueado, cancelado. | |
| Timeline interpretavel | Mostra eventos e deixa o staff inferir a causa. | |

**User's choice:** Arvore de causa explicita.
**Notes:** Staff should not infer Pro access failures manually.

| Option | Description | Selected |
|--------|-------------|----------|
| Acoes auditadas e conservadoras | Nota interna, resumo seguro, abrir billing, pedir reconciliacao admin, marcar owner. | yes |
| Acoes corretivas rapidas | Inclui resetar quota, aplicar grant temporario e resolver casos no painel. | |
| Somente leitura | Nenhum botao alem de ver dados. | |

**User's choice:** Acoes auditadas e conservadoras.
**Notes:** No deleting history or editing payment state.

---

## Readiness pago e Stripe

| Option | Description | Selected |
|--------|-------------|----------|
| Bloqueio total ate evidencia completa | Checkout publico so abre quando checklist Stripe, webhook, portal, cancelamento, falha, admin grant e deployed smoke estiverem PASS. | yes |
| Founder beta controlado | Permite cobrar poucos usuarios com alguns casos raros ainda manuais. | |
| Grant-only ate public launch | Nao cobra ninguem; so Pro manual por admin. | |

**User's choice:** Bloqueio total ate evidencia completa.
**Notes:** Real charging remains blocked without complete evidence.

| Option | Description | Selected |
|--------|-------------|----------|
| Evidence matrix versionada | Linha por check com PASS/WARN/BLOCKED, evidencia, ator, ambiente, data, owner e rollback. | yes |
| Somente painel admin | Tudo fica no banco/cockpit, sem documento versionado. | |
| Somente runbook manual | Checklist markdown, sem refletir no cockpit. | |

**User's choice:** Evidence matrix versionada.
**Notes:** Evidence should also reflect in cockpit.

| Option | Description | Selected |
|--------|-------------|----------|
| Ambientes separados e explicitos | Cockpit mostra test e production separados; producao nao herda PASS de test mode. | yes |
| Um status unico | Se test mode passou, considera fluxo aprovado. | |
| Producao manual fora do app | Cockpit acompanha so test mode. | |

**User's choice:** Ambientes separados e explicitos.
**Notes:** Test mode is prerequisite only.

| Option | Description | Selected |
|--------|-------------|----------|
| Safe degradation | Fecha novos checkouts, preserva Pro confirmado, mantem Free util, cria blocker e aponta runbook/owner. | yes |
| Hard stop amplo | Desliga monetizacao inteira, inclusive locks e billing pages. | |
| So alerta | Nao muda flags automaticamente; admin decide manualmente. | |

**User's choice:** Safe degradation.
**Notes:** Preserve confirmed paid users and Free usefulness.

---

## Checklist de lancamento/no-go

| Option | Description | Selected |
|--------|-------------|----------|
| Launch completo | Env/dominio, OAuth, DB migration, Stripe, webhook, deployed smoke, paid-flow, copy compliance, privacy, support runbooks e core gates. | yes |
| So produto + pagamento | App gates, Stripe e deployed smoke; compliance/runbooks externos. | |
| Beta-ready separado | Define beta ready com menos checks e public launch ready mais forte. | |

**User's choice:** Launch completo.
**Notes:** Public launch readiness needs operational/compliance/support evidence, not only code.

| Option | Description | Selected |
|--------|-------------|----------|
| Delivered/Partial/Blocked com regras duras | Delivered so se todos os checks obrigatorios tem evidencia. | yes |
| Percentual de prontidao | Exibe 0-100% e deixa interpretacao para admin. | |
| Go/No-go apenas | Sem status intermediario. | |

**User's choice:** Delivered/Partial/Blocked com regras duras.
**Notes:** Percent readiness cannot override blockers.

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, dois gates | Founder/Beta launch e Public paid launch, com public mais forte. | yes |
| Nao, um gate so | Evita ambiguidade. | |
| Beta nao importa mais | Fase 12 mira apenas public launch. | |

**User's choice:** Sim, dois gates.
**Notes:** Beta and public launch need separate readiness gates.

| Option | Description | Selected |
|--------|-------------|----------|
| NO-GO acionavel | Mostra blocker, impacto, owner, runbook, evidencia faltante e menor proximo passo verificavel. | yes |
| NO-GO simples | Mostra apenas que nao pode lancar. | |
| Ocultar launch CTA | Remove acao e deixa admin procurar a causa. | |

**User's choice:** NO-GO acionavel.
**Notes:** Internal no-go should explain exactly what to do next.

---

## the agent's Discretion

- Exact route names, component names, schema/table names, query shapes, date ranges, filter controls, chart primitives, evidence file name, verifier implementation, and plan wave count.

## Deferred Ideas

- Team/coach revenue expansion remains Phase 13.
- Creator payouts, affiliate/referral payouts, tax/accounting, and detailed revenue finance remain future work.
- Public creator-facing funnel/revenue analytics remain out of scope.
- New payment providers, credits, one-off paid reviews, and seat billing remain future monetization phases.
