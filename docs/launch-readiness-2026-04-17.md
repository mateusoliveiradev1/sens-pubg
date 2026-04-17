# Launch Readiness 2026-04-17

Status: pre-corpus release candidate / backend ffmpeg pendente

## O que ja esta validado

- `npm run typecheck`: verde
- `npm run lint`: verde
- `npx vitest run`: verde (`72` arquivos, `280` testes)
- `npm run benchmark:gate`: verde
- benchmark capturado draft: verde com `5/5` em tracking, diagnostico e coach
- `npm run build`: verde
- `npm run smoke:local`: verde (`21` testes)

## Gates automatizados

O repositorio agora expõe um checker de prontidao operacional:

- `npm run readiness:local`
  Valida o caminho browser-first do projeto com base nas envs locais e acusa o que ainda impede deploy ou backend.
- `npm run readiness:deploy`
  Falha se a configuracao ainda nao sustenta deploy final.
- `npm run readiness:backend`
  Falha se o runtime para pipeline server-side ainda nao esta pronto.

## Veredito atual

### 1. Browser-first release

Estado: tecnicamente pronto

O app esta consistente para o fluxo atual de analise local no navegador:

- ingestao com quality gating
- tracking com re-aquisicao e compensacao de movimento global
- timeline tecnica do tracking
- benchmark e smoke protegendo regressao

### 2. Deploy final

Estado: depende de env final + smoke publicado

Ainda falta confirmar no ambiente real:

- `AUTH_URL` e `NEXT_PUBLIC_APP_URL` apontando para o dominio final
- OAuth Google/Discord com callbacks no dominio publicado
- banco de producao migrado
- smoke publicado com `npm run smoke:deployed -- <base-url>`

### 3. Backend ffmpeg server-side

Estado: bloqueado neste ambiente

`ffmpeg` nao esta disponivel no runtime local atual. Isso significa:

- o produto browser-first pode seguir;
- o pipeline server-side real com extracao/transcodificacao ainda nao pode ser chamado de pronto;
- esse fechamento depende de preparar o runtime/deploy com ffmpeg antes da implementacao final do backend.

## Checklist final antes de publicar

- preencher envs reais de producao
- migrar banco real
- validar callbacks OAuth no dominio final
- rodar `npm run verify:release`
- rodar `npm run readiness:deploy`
- rodar `npm run smoke:deployed -- <base-url>`

## Checklist extra para backend futuro

- provisionar `ffmpeg` no runtime
- reexecutar `npm run readiness:backend`
- só então ligar a trilha server-side de video
