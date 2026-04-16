# Captured Specialist Review Kit - 2026-04-16

This guide is generated from the captured benchmark draft, intake manifest, label worksheet, and review decisions.

Only a real specialist review should flip provenance to `specialist-reviewed`.

## Commands

```bash
npm run validate:captured-labels
npm run benchmark:captured
npm run promote:captured-clips:with-review-decisions
npm run validate:sdd-coverage
```

## What This Kit Can Close

- Este pacote fecha apenas a pendencia de `specialist-reviewed` quando houver aprovacao humana real.
- Nenhuma outra lacuna SDD continuaria aberta depois da aprovacao especialista.

## Pending Specialist Reviews

- Nenhuma revisao especialista pendente encontrada no decision set atual.


## Specialist Approval Checklist

- Confirmar que o clip ainda merece `golden` ao revisar video, contact sheet e center preview.
- Confirmar que patch, arma, distancia, stance, optic/state, attachments e spray window continuam defensaveis.
- Confirmar que os frame labels cobrem o trecho de spray com evidencia suficiente para auditoria humana.
- Se houver duvida material, nao escrever `specialist-reviewed`; manter a decisao como `pending` e corrigir corpus/labels primeiro.

