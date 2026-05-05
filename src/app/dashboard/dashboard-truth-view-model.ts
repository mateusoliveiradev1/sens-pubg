import type { DashboardPrincipalPrecisionTrend, DashboardStats, DashboardTrendEvidenceState } from '@/actions/dashboard';

export interface DashboardTruthNextBlock {
    readonly title: string;
    readonly durationLabel: string;
    readonly steps: readonly string[];
    readonly validation: string | null;
}

export interface DashboardTruthArsenalFocus {
    readonly title: string;
    readonly body: string;
}

export interface DashboardTruthViewModel {
    readonly nextActionTitle: string;
    readonly nextActionBody: string;
    readonly truthBadgeLabel: string;
    readonly scoreLabel: string;
    readonly trendTitle: string;
    readonly trendBody: string;
    readonly evidenceState: DashboardTrendEvidenceState;
    readonly evidenceLabel: string;
    readonly evidenceSummary: string;
    readonly precisionTrendLabel: string | null;
    readonly precisionTrendSummary: string | null;
    readonly nextBlock: DashboardTruthNextBlock | null;
    readonly arsenalFocus: DashboardTruthArsenalFocus | null;
}

function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function formatSignedPoints(value: number): string {
    if (value > 0) {
        return `+${value} pts`;
    }

    if (value < 0) {
        return `${value} pts`;
    }

    return '0 pts';
}

function evidenceLabel(state: DashboardTrendEvidenceState): string {
    switch (state) {
        case 'strong':
            return 'Evidencia forte';
        case 'moderate':
            return 'Evidencia moderada';
        case 'weak':
            return 'Evidencia fraca';
        case 'missing':
            return 'Sem evidencia recente';
    }
}

function buildEvidenceSummary(stats: DashboardStats): string {
    const evidence = stats.trendEvidence;

    if (evidence.evidenceState === 'missing') {
        return 'Sem mastery recente salvo; trate a curva como historico bruto ate gravar outro clip comparavel.';
    }

    return `${formatPercent(evidence.coverage)} de cobertura, ${formatPercent(evidence.confidence)} de confianca e ${evidence.sessionCount} leitura${evidence.sessionCount === 1 ? '' : 's'} recente${evidence.sessionCount === 1 ? '' : 's'}.`;
}

function buildNextBlock(stats: DashboardStats): DashboardTruthNextBlock | null {
    const block = stats.latestCoachNextBlock;

    if (!block) {
        return null;
    }

    const validation = block.validationSuccessCondition
        ? `${block.validationTarget ? `${block.validationTarget}. ` : ''}${block.validationSuccessCondition}`
        : null;

    return {
        title: block.title,
        durationLabel: `${block.durationMinutes} min`,
        steps: block.steps,
        validation,
    };
}

function precisionTrendLabel(trend: DashboardPrincipalPrecisionTrend): string {
    switch (trend.label) {
        case 'baseline':
            return 'Baseline criado';
        case 'initial_signal':
            return 'Sinal inicial';
        case 'in_validation':
            return 'Em validacao';
        case 'validated_progress':
            return 'Progresso validado';
        case 'validated_regression':
            return 'Regressao validada';
        case 'oscillation':
            return 'Oscilacao';
        case 'not_comparable':
            return 'Nao comparavel';
        case 'consolidated':
            return 'Consolidado';
    }
}

function buildPrecisionNextAction(
    trend: DashboardPrincipalPrecisionTrend | null,
): Pick<DashboardTruthViewModel, 'nextActionTitle' | 'nextActionBody' | 'truthBadgeLabel'> | null {
    if (!trend) {
        return null;
    }

    switch (trend.label) {
        case 'baseline':
        case 'initial_signal':
            return {
                nextActionTitle: 'Gravar validacao compativel',
                nextActionBody: `${precisionTrendLabel(trend)} com ${trend.compatibleCount} clip(s). Mantenha a variavel em teste fixa e registre outro clip antes de consolidar mudanca.`,
                truthBadgeLabel: precisionTrendLabel(trend),
            };
        case 'in_validation':
        case 'oscillation':
            return {
                nextActionTitle: 'Manter variavel fixa e validar',
                nextActionBody: `${precisionTrendLabel(trend)} na linha principal. Use o proximo bloco para confirmar o sinal sem trocar sensibilidade, loadout ou contexto.`,
                truthBadgeLabel: precisionTrendLabel(trend),
            };
        case 'validated_progress':
        case 'consolidated':
            return {
                nextActionTitle: 'Consolidar antes de mudar variavel',
                nextActionBody: `${precisionTrendLabel(trend)} com ${trend.compatibleCount} clips compativeis. Consolide o bloco atual antes de testar outra variavel.`,
                truthBadgeLabel: precisionTrendLabel(trend),
            };
        case 'validated_regression':
            return {
                nextActionTitle: 'Voltar ao baseline confiavel',
                nextActionBody: 'A linha principal validou regressao. Retorne ao ultimo baseline confiavel e grave uma nova validacao compativel.',
                truthBadgeLabel: precisionTrendLabel(trend),
            };
        case 'not_comparable':
            return {
                nextActionTitle: 'Alinhar contexto antes de comparar',
                nextActionBody: trend.blockerReasons[0]
                    ? `Trend nao comparavel: ${trend.blockerReasons[0]} Corrija o contexto e grave validacao compativel.`
                    : 'Trend nao comparavel. Corrija captura, metadados ou contexto antes de comparar evolucao.',
                truthBadgeLabel: precisionTrendLabel(trend),
            };
    }
}

function buildNextAction(stats: DashboardStats): Pick<DashboardTruthViewModel, 'nextActionTitle' | 'nextActionBody' | 'truthBadgeLabel'> {
    const precisionAction = buildPrecisionNextAction(stats.principalPrecisionTrend);
    if (precisionAction) {
        return precisionAction;
    }

    const mastery = stats.latestMastery;
    const nextBlock = stats.latestCoachNextBlock;

    if (!mastery) {
        return {
            nextActionTitle: 'Gravar clip comparavel',
            nextActionBody: 'A dashboard ainda nao tem uma leitura de mastery recente. Grave um novo spray limpo para abrir acao, evidencia e protocolo.',
            truthBadgeLabel: 'Sem leitura recente',
        };
    }

    if (mastery.actionState === 'capture_again') {
        return {
            nextActionTitle: 'Recapturar antes de mudar treino',
            nextActionBody: 'A captura mais recente bloqueia recomendacao forte. Repita o spray com o mesmo contexto antes de alterar sensibilidade, arma ou rotina.',
            truthBadgeLabel: mastery.actionLabel,
        };
    }

    if (mastery.actionState === 'inconclusive') {
        return {
            nextActionTitle: 'Validar com novo clip',
            nextActionBody: 'Existe sinal parcial, mas ainda falta evidencia para promover treino ou ajuste. O melhor proximo passo e repetir um bloco comparavel.',
            truthBadgeLabel: mastery.actionLabel,
        };
    }

    if (mastery.actionState === 'ready') {
        return {
            nextActionTitle: nextBlock ? `Aplicar e validar: ${nextBlock.title}` : 'Aplicar e validar protocolo',
            nextActionBody: 'A leitura atual sustenta aplicar o protocolo, mantendo validacao curta no proximo bloco antes de consolidar qualquer mudanca.',
            truthBadgeLabel: mastery.actionLabel,
        };
    }

    return {
        nextActionTitle: nextBlock ? nextBlock.title : 'Rodar bloco controlado',
        nextActionBody: nextBlock
            ? `Use o bloco do coach como teste controlado de ${nextBlock.durationMinutes} minutos e compare a proxima captura antes de escalar o ajuste.`
            : 'A leitura e testavel. Rode um bloco curto com variaveis fixas e valide o mesmo sinal no proximo clip.',
        truthBadgeLabel: mastery.actionLabel,
    };
}

function buildPrecisionTrendCopy(
    trend: DashboardPrincipalPrecisionTrend | null,
): Pick<DashboardTruthViewModel, 'trendTitle' | 'trendBody'> | null {
    if (!trend) {
        return null;
    }

    const deltaText = trend.actionableDelta === null
        ? null
        : formatSignedPoints(Math.round(trend.actionableDelta));

    switch (trend.label) {
        case 'baseline':
            return {
                trendTitle: 'Baseline em aberto',
                trendBody: 'A linha principal tem baseline, mas ainda precisa de validacao compativel antes de qualquer leitura de evolucao.',
            };
        case 'initial_signal':
            return {
                trendTitle: 'Sinal inicial',
                trendBody: 'Dois clips compativeis mostram direcao. Grave a terceira validacao antes de consolidar progresso ou regressao.',
            };
        case 'in_validation':
            return {
                trendTitle: 'Em validacao',
                trendBody: `A linha ainda pede evidencia mais forte. ${deltaText ? `Delta atual: ${deltaText}. ` : ''}Mantenha a variavel em teste fixa.`,
            };
        case 'validated_progress':
            return {
                trendTitle: 'Progresso validado',
                trendBody: `A linha compativel validou progresso${deltaText ? ` (${deltaText})` : ''}. Consolide antes de mudar outra variavel.`,
            };
        case 'validated_regression':
            return {
                trendTitle: 'Regressao validada',
                trendBody: `A linha compativel validou regressao${deltaText ? ` (${deltaText})` : ''}. Volte ao baseline confiavel e valide de novo.`,
            };
        case 'oscillation':
            return {
                trendTitle: 'Oscilacao controlada',
                trendBody: `A linha oscilou dentro da margem de decisao${deltaText ? `, mesmo com delta ${deltaText}` : ''}. Nao trate delta bruto como progresso.`,
            };
        case 'not_comparable':
            return {
                trendTitle: 'Nao comparavel',
                trendBody: trend.blockerReasons[0]
                    ? `Controle de precisao bloqueou comparacao: ${trend.blockerReasons[0]}`
                    : 'Controle de precisao bloqueou comparacao. Grave outro clip com contexto alinhado.',
            };
        case 'consolidated':
            return {
                trendTitle: 'Linha consolidada',
                trendBody: 'A linha principal esta consolidada. Escolha a proxima variavel com base em evidencia, nao em pico isolado.',
            };
    }
}

function buildTrendCopy(stats: DashboardStats): Pick<DashboardTruthViewModel, 'trendTitle' | 'trendBody'> {
    const precisionCopy = buildPrecisionTrendCopy(stats.principalPrecisionTrend);
    if (precisionCopy) {
        return precisionCopy;
    }

    const evidence = stats.trendEvidence;
    const delta = evidence.delta || stats.lastSessionDelta;
    const deltaText = formatSignedPoints(delta);

    if (delta > 0 && evidence.canClaimProgress) {
        return {
            trendTitle: 'Progresso validado',
            trendBody: `A media subiu ${deltaText} com evidencia ${evidenceLabel(evidence.evidenceState).toLowerCase()}. Continue o protocolo e valide de novo antes de mudar mais uma variavel.`,
        };
    }

    if (delta > 0) {
        return {
            trendTitle: 'Sinal para validar',
            trendBody: `A media subiu ${deltaText}, mas a evidencia ainda nao sustenta chamar isso de progresso. Grave outro clip comparavel antes de comemorar ou trocar configuracao.`,
        };
    }

    if (delta < 0) {
        return {
            trendTitle: 'Oscilacao para corrigir',
            trendBody: `A media caiu ${formatSignedPoints(delta)}. Use o proximo bloco para recuperar consistencia com cobertura e confianca suficientes.`,
        };
    }

    return {
        trendTitle: 'Base em observacao',
        trendBody: 'A curva esta lateral. O proximo ganho depende de novo clip comparavel com evidencia suficiente para separar padrao real de ruido.',
    };
}

function buildArsenalFocus(stats: DashboardStats): DashboardTruthArsenalFocus | null {
    if (stats.weaponStats.length === 0) {
        return null;
    }

    const sortedWeapons = [...stats.weaponStats].sort((left, right) => left.avgScore - right.avgScore);
    const weakest = sortedWeapons[0]!;
    const strongest = sortedWeapons[sortedWeapons.length - 1]!;
    const evidenceWeak = stats.trendEvidence.evidenceState === 'weak' || stats.trendEvidence.evidenceState === 'missing';

    if (evidenceWeak) {
        return {
            title: 'Arsenal como contexto',
            body: `${weakest.weaponName} aparece como ponto de atencao, mas a evidencia recente ainda e fraca. Use essa arma apenas como contexto ate validar outro clip.`,
        };
    }

    if (weakest.weaponId !== strongest.weaponId) {
        return {
            title: `Priorizar ${weakest.weaponName}`,
            body: `${weakest.weaponName} esta abaixo de ${strongest.weaponName}. Treine ela se esse foco apoiar o proximo bloco do coach.`,
        };
    }

    return {
        title: 'Manter arma principal',
        body: `${strongest.weaponName} concentra o painel agora. Continue nela ate o proximo bloco validar outra prioridade.`,
    };
}

export function buildDashboardTruthViewModel(stats: DashboardStats): DashboardTruthViewModel {
    const mastery = stats.latestMastery;
    const nextAction = buildNextAction(stats);
    const trendCopy = buildTrendCopy(stats);

    return {
        ...nextAction,
        scoreLabel: mastery
            ? `${Math.round(mastery.actionableScore)}/100 acionavel`
            : `${Math.round(stats.avgSprayScore)}/100 media`,
        ...trendCopy,
        evidenceState: stats.trendEvidence.evidenceState,
        evidenceLabel: evidenceLabel(stats.trendEvidence.evidenceState),
        evidenceSummary: buildEvidenceSummary(stats),
        precisionTrendLabel: stats.principalPrecisionTrend
            ? precisionTrendLabel(stats.principalPrecisionTrend)
            : null,
        precisionTrendSummary: stats.principalPrecisionTrend
            ? `${stats.principalPrecisionTrend.compatibleCount} clip(s), ${formatPercent(stats.principalPrecisionTrend.coverage)} cobertura, ${formatPercent(stats.principalPrecisionTrend.confidence)} confianca.`
            : null,
        nextBlock: buildNextBlock(stats),
        arsenalFocus: buildArsenalFocus(stats),
    };
}
