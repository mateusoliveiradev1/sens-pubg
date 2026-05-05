# Phase 2: Benchmark Expansion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 2-Benchmark Expansion
**Areas discussed:** Rigor do gate de release, Promocao de clips reais, Resultados do contrato de verdade, Relatorio de regressao e baseline

---

## Rigor do gate de release

| Option | Description | Selected |
|--------|-------------|----------|
| Gate comercial separado | Manter `benchmark:gate` rapido para CI diario e criar gate rigido separado para release/claims comerciais. | yes |
| Endurecer `benchmark:gate` agora | Colocar o gate SDD ou equivalente direto no gate diario. | |
| So documentar por enquanto | Manter scripts como estao e documentar checks mais fortes. | |

**User's choice:** Gate diario rapido + gate rigido separado e obrigatorio antes de release/claim comercial.
**Notes:** O usuario perguntou se ser exigente agora seria ruim. A decisao foi ser exigente agora, mas no gate certo: manter CI diario rapido e criar `benchmark:release` rigido. O gate rigido bloqueia cobertura SDD falha, qualquer regressao mensuravel, e regressao em `reviewed`; regressao intencional exige baseline update explicito com justificativa.

---

## Promocao de clips reais

| Option | Description | Selected |
|--------|-------------|----------|
| `draft -> reviewed -> golden` | Caminho em etapas: draft como trabalho em progresso, reviewed conta para cobertura, golden vira evidencia de alta confianca. | yes |
| `draft -> golden` direto | Mais simples, mas exige revisao pesada cedo demais. | |
| `reviewed` e suficiente | Mais rapido, mas enfraquece goldens para claims comerciais. | |

**User's choice:** Caminho normal `draft -> reviewed -> golden`.
**Notes:** O usuario reforcou que precisa ser "perfeito", facil, seguro e preciso. A conversa traduziu isso para alta confianca pratica, facilidade operacional, seguranca contra label ruim e precisao suficiente para proteger release, sem alegar certeza absoluta. `reviewed` pode ser humano ou machine/Codex-assisted, mas so conta com checks estruturados. `golden` exige replay estavel, metadata completa, benchmark sem erro, revisao humana/especialista e justificativa. O fluxo e interno para mantenedor/dev/revisor, nao usuario final.

---

## Resultados do contrato de verdade

| Option | Description | Selected |
|--------|-------------|----------|
| Contrato completo de decisao | Proteger action state, mechanical level, evidence tier, downgrade, coach tier, focos, protocolo e inconclusivos. | yes |
| So coach e diagnostico | Mais simples, mas protege pouco a verdade nova da Fase 1. | |
| So action state e downgrade | Protege honestidade, mas deixa coach/protocolo soltos. | |

**User's choice:** Benchmark protege o contrato completo de decisao.
**Notes:** Expectativas ficam dentro do dataset de benchmark com enums internos estaveis. Labels em portugues sao derivadas pela UI/copy. Primario deve bater exatamente; secundarios sao conjunto sem ordem. Protocolo deve validar estrutura completa: tier, titulo/chave estavel, duracao, exercicio, target/meta, criterio de parada/continuacao e validacao no proximo clip. Mudancas legitimas falham ate expectativa ser atualizada com justificativa.

---

## Relatorio de regressao e baseline

| Option | Description | Selected |
|--------|-------------|----------|
| Sintetico e capturado | Ambos recebem baseline versionado para proteger casos controlados e clips reais. | yes |
| So sintetico | Mais estavel, mas fraco para claims baseadas em clips reais. | |
| So golden/capturado | Forte para real clips, mas perde protecao sintetica controlada. | |

**User's choice:** Sintetico e capturado terao baseline versionado.
**Notes:** Baselines ficam em `tests/goldens/benchmark`. `benchmark:release` gera console PASS/FAIL e markdown versionavel. Relatorios geram historico por data e `latest`. Saida separa synthetic, captured, reviewed e golden. Atualizacao de baseline exige comando explicito com motivo, clips afetados e por que o novo comportamento e mais honesto.

---

## the agent's Discretion

- Escolher nomes finais de comandos, arquivos de relatorio e modulo TypeScript, desde que preservem as decisoes capturadas.
- Escolher a sequencia de implementacao e a divisao entre schemas, runner, scripts, testes e docs.

## Deferred Ideas

- None.
