# Captured Specialist Review Kit - 2026-04-16

This guide is generated from the captured benchmark draft, intake manifest, label worksheet, and review decisions.

Only a real specialist review should flip provenance to `specialist-reviewed`.

Specialist review is not a substitute for consent review. Confirm that the clip has a matching consent record, allowed benchmark purpose, derivative scope, and trainability authorization before approving any `golden` transition.

Public streamer/pro videos are qualitative reference only unless formal permission/trainability is verified. Do not use public video frames as validation or training evidence from this kit without formal permission recorded in the consent manifest.

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
- Confirmar que consentimento, finalidade permitida, autorizacao de trainability e escopo de derivativos ainda permitem a promocao.
- Se permissao foi retirada, quarentenar o clip e disparar rebaseline antes de qualquer release claim.
- Se houver duvida material, nao escrever `specialist-reviewed`; manter a decisao como `pending` e corrigir corpus/labels primeiro.
