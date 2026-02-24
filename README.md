<div align="center">

# 🎯 PUBG Aim Analyzer

**O seu coach de aim pessoal para PUBG.** <br/>
*Analise seu spray, domine o recoil e ajuste sua sensibilidade com base no seu hardware real.*

[**Acessar a Aplicação (Vercel)**](https://sens-pubg.vercel.app/)

[![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)

</div>

<br/>

## 🚀 Sobre o Projeto

O **PUBG Aim Analyzer** é uma ferramenta definitiva para jogadores de PUBG que desejam otimizar seu controle de recoil. Utilizando visão computacional (Canvas API) diretamente no seu navegador, a aplicação rastreia o deslocamento do retículo em clips de gameplay e entrega um diagnóstico preciso das suas deficiências de spray.

Tudo é processado **localmente no seu navegador através de Web Workers e GPU**. Privacidade garantida, processamento instantâneo e zero upload de vídeo para servidores externos.

---

## ✨ Features Principais

* **🎥 Análise Local e Privada:** Processamento no lado do cliente. Faça upload do seu clip de 5–15 segundos e tenha total segurança.
* **🧠 Diagnóstico Inteligente em 6 Eixos:**
  * *Overpull* (puxou demais)
  * *Underpull* (puxou de menos)
  * *Jitter* (tremor lateral excessivo)
  * *Drift* (desvio diagonal)
  * *Compensação Atrasada* (demorou a reagir)
  * *Inconsistência*
* **🔫 Amplo Suporte a Armamento:** Suporte para **14 armas principais** (ARs, SMGs, LMGs), incluindo Beryl M762, M416, AUG, ACE32 e mais, baseadas nos padrões de recuo extraídos dos arquivos do jogo.
* **🎯 Perfis de Sensibilidade Calibrados:** 3 perfis gerados conforme seu hardware (DPI do mouse, atrito do mousepad e tipo de pegada).
* **📈 Evolução e Prática:** Acompanhe seu progresso estatisticamente e receba drills específicos para treinar seus pontos fracos.

---

## 🛠️ Tech Stack

Este projeto foi desenhado sob uma arquitetura serverless moderna, rápida e altamente escalável.

### **Frontend & Core**
* **Framework:** [Next.js](https://nextjs.org/) (App Router, 100% React Server Components onde possível)
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
* **Análise de Imagem:** Canvas API & Web Workers

### **Backend & Banco de Dados**
* **Database:** [Neon Database](https://neon.tech/) (Serverless Postgres)
* **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
* **Autenticação:** [NextAuth.js v5 (Auth.js)](https://authjs.dev/)

### **Qualidade de Código & Testes**
* **Linting / Formatação:** ESLint & Prettier
* **Testes E2E:** [Playwright](https://playwright.dev/)
* **Testes Unitários:** [Vitest](https://vitest.dev/)

---

## 💻 Como Rodar o Projeto Localmente

Siga o passo a passo para clonar, instalar e rodar na sua máquina.

### Pré-requisitos
* **Node.js**: `v20` ou superior.
* Um banco de dados Postgres (sugerimos o Neon ou Postgres local) para configurar as variáveis de ambiente.

### 1. Instalações
```bash
# Clone o repositório
git clone https://github.com/mateusoliveiradev1/sens-pubg.git
cd sens-pubg

# Instale as dependências usando NPM
npm install
```

### 2. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto com base no seu `.env.example` e adicione a URL do seu BD:
```env
DATABASE_URL=postgresql://seu_usuario:sua_senha@localhost:5432/sens_pubg
NEXTAUTH_SECRET=um_segredo_muito_seguro
# Adicione outras chaves omitidas que o sistema exija
```

### 3. Banco de Dados
Gere as suas migrações e rode no seu banco de dados local com Drizzle:
```bash
# Gerar a configuração ou puxar schema
npx drizzle-kit push
```

### 4. Iniciando o Servidor de Desenvolvimento
```bash
npm run dev
```

Pronto! Acesse [http://localhost:3000](http://localhost:3000) no seu navegador para explorar o app.

---

## 📜 Licença

Desenvolvido para ajudar a comunidade de **PUBG** a dominar o campo de batalha. <br>
*Este projeto possui fins não-comerciais. Para mais informações, verifique os termos de licença padrão.*

<br/>

<div align="center">
  <sub>Feito com paixão pelos headshots por <a href="https://github.com/mateusoliveiradev1">@mateusoliveiradev1</a>.</sub>
</div>
