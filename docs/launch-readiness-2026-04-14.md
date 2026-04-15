# Launch Readiness 2026-04-14

Status: release candidate tecnico / operacao pendente

## O que ja esta validado

- `npm run verify:release`: verde
- `npm run typecheck`: verde
- `npx vitest run`: verde (`58` arquivos, `190` testes)
- `npm run benchmark:gate`: verde
- benchmark capturado draft: verde com `4/4` em tracking, diagnostico e coach
- `npm run build`: verde
- `npm run smoke:local`: verde (`21` testes)

Comandos uteis:

- validacao tecnica local completa: `npm run verify:release`
- smoke no deploy publicado: `npm run smoke:deployed -- <base-url>`

## O que ainda falta antes de chamar de launch-ready

### 1. Configuracao real de producao

Preencher no ambiente de deploy:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_DISCORD_ID`
- `AUTH_DISCORD_SECRET`
- `NEXT_PUBLIC_APP_URL`

Opcionais:

- `DISCORD_GUILD_ID`
- `BOT_API_KEY`

### 2. Banco de producao

Executar as migracoes Drizzle no banco real antes do primeiro boot de producao.

### 3. OAuth no dominio final

Confirmar no Google e no Discord:

- callback URL correta
- dominio final permitido
- fluxo de login funcionando de ponta a ponta

### 4. Smoke test pos-deploy

No ambiente publicado, validar:

- home abre sem erro
- `/login` mostra Google e Discord
- `/analyze` abre
- upload e analise de um clip curto funcionam
- `/profile` e `/history` redirecionam corretamente quando sem sessao

Comando sugerido:

```bash
npm run smoke:deployed -- https://seu-dominio
```

### 5. Go / no-go

Pode lancar quando:

- `npm run verify:release` estiver verde na revisao final local
- envs reais estiverem configuradas
- banco estiver migrado
- login OAuth funcionar no dominio final
- smoke test publicado passar

Nao deveria lancar ainda se qualquer um desses itens estiver pendente.
