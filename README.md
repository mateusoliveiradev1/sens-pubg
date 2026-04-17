# PUBG Aim Analyzer

Coach de aim para PUBG com analise local de spray no navegador.

## Sobre

O PUBG Aim Analyzer ajuda jogadores de PUBG a revisar clips de spray, identificar padroes de recoil e comparar ajustes de sensibilidade com base no proprio setup.

O motor atual roda localmente no navegador com Web Workers e APIs visuais do browser. O video nao precisa ser enviado para um servidor de processamento para a analise acontecer.

Hoje o sistema entrega:

- rastreio visual do spray em clips curtos
- relatorio de qualidade do clip: nitidez, compressao, contraste da mira, estabilidade do ROI e FPS
- transparencia do tracking: cobertura, confianca, frames perdidos, re-aquisicao e janela efetiva analisada
- diagnostico estruturado em multiplos eixos
- comparacao entre perfis de sensibilidade guiados pelo hardware
- historico e coaching orientado pelos sinais medidos

O app pode bloquear clips com qualidade insuficiente para evitar recomendacoes enganadoras. Quando a leitura e possivel, a sensibilidade sugerida deve ser tratada como faixa de teste, nao como valor perfeito ou definitivo.

O projeto ainda esta evoluindo para um motor mais patch-aware, com matematica de sensibilidade mais forte, benchmarks capturados e tracking com confianca cada vez mais honesta.

## Estado atual

Validacao mais recente em 2026-04-17:

- `npm run verify:release`: verde
- `npx vitest run`: verde (`72` arquivos, `280` testes)
- `npm run benchmark:gate`: verde
- `npm run benchmark:captured`: verde (`5/5` tracking, `5/5` diagnostico, `5/5` coach; starter gate capturado em `PASS`)
- `npm run build`: verde
- `npm run smoke:local`: verde (`21` testes)
- `npm run readiness:local`: automatiza o gate local/browser e explicita se o backend ffmpeg ainda esta bloqueado

Mais detalhes em [docs/baseline-2026-04-13.md](docs/baseline-2026-04-13.md), [docs/SPRAY-ANALYSIS-EXECUTION-PLAN.md](docs/SPRAY-ANALYSIS-EXECUTION-PLAN.md), [docs/video-benchmark-spec.md](docs/video-benchmark-spec.md), [docs/VIDEO-ANALYSIS-EXECUTION-PLAN.md](docs/VIDEO-ANALYSIS-EXECUTION-PLAN.md) e [docs/launch-readiness-2026-04-17.md](docs/launch-readiness-2026-04-17.md).

## Stack

- Next.js 15
- React 19
- TypeScript
- Drizzle ORM
- Neon Postgres
- NextAuth v5
- Playwright
- Vitest

## Rodando localmente

### Requisitos

- Node.js 20+
- Postgres local ou remoto

### Instalacao

```bash
git clone https://github.com/mateusoliveiradev1/sens-pubg.git
cd sens-pubg
npm install
```

### Ambiente

Copie `.env.example` para `.env.local` e preencha os valores reais:

```env
DATABASE_URL=postgresql://seu_usuario:sua_senha@localhost:5432/sens_pubg
AUTH_SECRET=um_segredo_muito_seguro
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
AUTH_GOOGLE_ID=seu_google_client_id
AUTH_GOOGLE_SECRET=seu_google_client_secret
AUTH_DISCORD_ID=seu_discord_client_id
AUTH_DISCORD_SECRET=seu_discord_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Observacoes:

- `AUTH_SECRET` e o nome correto da variavel de auth usada pelo projeto.
- `DISCORD_GUILD_ID` so e necessario se voce quiser sincronizar cargos do Discord no login.
- `BOT_API_KEY` so e necessario para os endpoints do bot/admin.
- `GROQ_API_KEY` e opcional e habilita o rewrite do coach com LLM, mantendo fallback deterministico se a chave nao existir.
- `GROQ_COACH_MODEL` e opcional. O padrao atual e `openai/gpt-oss-20b`.
- `AUTH_URL` e `AUTH_TRUST_HOST` deixam o fluxo de auth explicito em local e em deploy.

Para validar a integracao do coach com Groq depois de preencher a chave:

```bash
npm run coach:smoke:groq
```

### Banco

```bash
npx drizzle-kit push
```

### Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Prontidao de lancamento

O repositorio esta tecnicamente pronto para seguir para deploy, mas "100% pronto para lancar" ainda depende de operacao no ambiente real:

- configurar variaveis reais de producao
- aplicar as migracoes no banco de producao
- validar os callbacks OAuth de Google e Discord no dominio final
- rodar smoke no ambiente publicado com `npm run smoke:deployed -- <base-url>`

Para validar o pacote tecnico local antes de publicar:

```bash
npm run verify:release
npm run readiness:local
```

Para exigir um veredito de deploy final ou backend server-side:

```bash
npm run readiness:deploy
npm run readiness:backend
```

Checklist sugerido em [docs/launch-readiness-2026-04-17.md](docs/launch-readiness-2026-04-17.md).

## Licenca

Projeto desenvolvido para a comunidade de PUBG.

Nao e afiliado nem patrocinado pela KRAFTON ou PUBG Corporation.
