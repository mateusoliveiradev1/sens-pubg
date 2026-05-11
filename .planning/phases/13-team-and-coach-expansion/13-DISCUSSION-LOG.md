# Phase 13: Team And Coach Expansion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-10T22:16:47.5607753-03:00
**Phase:** 13-Team And Coach Expansion
**Areas discussed:** Primeiro produto Team/Coach, Mesa de revisao multi-jogador, Permissao/privacidade/consentimento, Export/share premium, Gate Team separado e seats futuros

---

## Primeiro Produto Team/Coach

| Option | Description | Selected |
|--------|-------------|----------|
| Coach/analista solo com roster de alunos | Menor corte pagavel: coach convida jogadores, recebe relatorios seguros, revisa multiplos players e deixa proximos passos. | x |
| Squad/time pequeno com capitao | Lider gerencia 3-8 jogadores e acompanha blockers/evolucao do grupo, reaproveitando ideias de squads. | |
| Organizacao/staff competitivo | Permissoes mais fortes, multiplos rosters e governanca maior. | |
| Voce decide | Agent chooses the most conservative product cut. | x |

**User's choice:** "responde tudo ai para mim com tudo mais perfeito e polido possivel"
**Notes:** Locked as Mesa do Coach for a coach/analyst solo with a small roster, while preserving a future path to teams and seats.

---

## Mesa De Revisao Multi-Jogador

| Option | Description | Selected |
|--------|-------------|----------|
| Fila de revisao | Coach sees reports needing attention, ordered by blocker and next action. | |
| Dossie por jogador | Each player has an audit view with shared reports, protocol, Spray Lab, Ciclo Pro and validation state. | |
| Cockpit com blockers e proximas acoes | First screen answers who needs attention and why. | x |
| Voce decide | Combine cockpit, roster queue, and player dossier. | x |

**User's choice:** Agent discretion.
**Notes:** Locked as coach cockpit plus player dossier. No global ranking or absolute player grading.

---

## Permissao, Privacidade E Consentimento

| Option | Description | Selected |
|--------|-------------|----------|
| Compartilhamento por convite/workspace | Player joins or accepts workspace invitation and shares scoped evidence. | x |
| Link por relatorio | Safe for packet reading, but weaker as the main Team permission model. | |
| Compartilhamento automatico por time | Too risky because joining a team could expose too much history. | |
| Voce decide | Agent chooses the privacy-first consent model. | x |

**User's choice:** Agent discretion.
**Notes:** Locked as explicit consent with team-safe snapshots. Revocation, audit trails, scoped source IDs, and server-side role checks are mandatory.

---

## Export/Share Premium

| Option | Description | Selected |
|--------|-------------|----------|
| Secure web packet | Revocable team-safe report packet, reusable across browser and share flows. | x |
| Print/PDF packet | Useful for coaches, but PDF should not require heavy new runtime work. | x |
| Public Social Pro report only | Already exists, but does not cover private coach review status and notes. | |
| Voce decide | Agent chooses secure packet first, print-friendly second. | x |

**User's choice:** Agent discretion.
**Notes:** Locked as Team Review Packet: secure web packet plus print-friendly layout; PDF is optional if low-risk.

---

## Gate Team Separado E Seats Futuros

| Option | Description | Selected |
|--------|-------------|----------|
| Activate real seat billing now | Full Stripe seat billing, proration and lifecycle. | |
| Separate Team gate with beta/admin grant | Team capabilities are server-owned and separate from solo Pro, with seat foundation but no self-serve billing yet. | x |
| Fold Team into solo Pro | Simpler, but violates roadmap criterion that Team gate is separate. | |
| Voce decide | Agent chooses the safest monetization foundation. | x |

**User's choice:** Agent discretion.
**Notes:** Locked as separate Team access using `team.player_review` and `team.seats`; real self-serve seat billing is deferred.

---

## the agent's Discretion

- Chose **Mesa do Coach** as the first product concept.
- Chose coach/analyst solo with small roster as the first buyer/user wedge.
- Chose coach cockpit plus player dossier as the main review experience.
- Chose explicit consent and team-safe report snapshots as the privacy model.
- Chose Team Review Packet as the export/share artifact.
- Chose separate Team entitlement/access foundation without activating full Stripe seat billing in this phase.

## Deferred Ideas

- Enterprise org management, SSO, multi-roster hierarchy, custom roles, seat self-serve billing, invoices, proration, coach marketplace, coach certification, live chat, video annotations, in-game overlays, public team rankings, and global skill grades.
