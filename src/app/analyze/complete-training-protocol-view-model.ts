import type {
    AnalysisResult,
    CoachFocusArea,
    CompleteTrainingProtocol,
    TrainingProtocolDowngradeReasonCode,
} from '@/types/engine';

export interface ProtocolSummaryRow {
    readonly label: 'Arma' | 'Mira' | 'Distancia' | 'Foco' | 'Alvo';
    readonly value: string;
}

export interface ProtocolPreparationItemModel {
    readonly label: string;
    readonly reason: string;
    readonly safety: string;
}

export interface ProtocolBlockerPanelModel {
    readonly reason: string;
    readonly impact: string;
    readonly repairAction: string;
    readonly unlocksNext: string;
}

export interface ProtocolValidationCardModel {
    readonly title: 'Grave o proximo clip assim';
    readonly checklist: readonly string[];
    readonly successCriterion: string;
}

export interface ProtocolTransferCardModel {
    readonly title: 'Transferir para TDM/partida';
    readonly checklist: readonly string[];
    readonly technicalProofCopy: string;
}

export interface ProtocolAuditDisclosureModel {
    readonly drillId: string;
    readonly version: string;
    readonly confidence: string;
    readonly coverage: string;
    readonly downgradeCodes: readonly TrainingProtocolDowngradeReasonCode[];
    readonly limitedPersonalizationReasons: readonly string[];
}

export interface CompleteTrainingProtocolViewModel {
    readonly headline: string;
    readonly tierLabel: string;
    readonly durationLabel: string;
    readonly environmentLabel: string;
    readonly primaryCtaLabel: string;
    readonly sprayLabCta: {
        readonly label: 'Abrir Spray Lab' | 'Salvar analise para abrir Spray Lab';
        readonly href: string | null;
        readonly body: string;
        readonly disabled: boolean;
    };
    readonly summaryRows: readonly ProtocolSummaryRow[];
    readonly essentialSteps: readonly string[];
    readonly preparationItems: readonly ProtocolPreparationItemModel[];
    readonly blockerPanel: ProtocolBlockerPanelModel | null;
    readonly validationCard: ProtocolValidationCardModel;
    readonly transferCard: ProtocolTransferCardModel;
    readonly auditDisclosure: ProtocolAuditDisclosureModel;
    readonly proSectionCount: number;
}

export function buildCompleteTrainingProtocolViewModel(
    result: AnalysisResult,
): CompleteTrainingProtocolViewModel | null {
    return buildCompleteTrainingProtocolViewModelFromProtocol(
        result.coachPlan?.completeProtocol,
        { baseAnalysisSessionId: result.historySessionId ?? null },
    );
}

export function buildCompleteTrainingProtocolViewModelFromProtocol(
    protocol: CompleteTrainingProtocol | undefined,
    options: {
        readonly baseAnalysisSessionId?: string | null;
    } = {},
): CompleteTrainingProtocolViewModel | null {
    if (!protocol) {
        return null;
    }

    const sprayLabHref = options.baseAnalysisSessionId
        ? `/spray-lab?sourceSessionId=${encodeURIComponent(options.baseAnalysisSessionId)}&protocolId=${encodeURIComponent(protocol.id)}`
        : null;

    return {
        headline: protocol.title,
        tierLabel: formatTierLabel(protocol.tier),
        durationLabel: `${protocol.dose.durationMinutes} min`,
        environmentLabel: formatEnvironmentLabel(protocol.environment),
        primaryCtaLabel: formatPrimaryCtaLabel(protocol.tier),
        sprayLabCta: {
            label: sprayLabHref ? 'Abrir Spray Lab' : 'Salvar analise para abrir Spray Lab',
            href: sprayLabHref,
            body: sprayLabHref
                ? 'Executa esta ficha como sessao Lab com timer, checklist, fidelidade e validacao compativel.'
                : 'A ficha precisa estar salva no historico antes de abrir uma sessao Lab auditavel.',
            disabled: !sprayLabHref,
        },
        summaryRows: [
            { label: 'Arma', value: protocol.context.weaponName ?? protocol.context.weaponId ?? 'Arma a confirmar' },
            { label: 'Mira', value: protocol.context.opticName ?? protocol.context.opticId ?? 'Mira a confirmar' },
            { label: 'Distancia', value: formatDistance(protocol) },
            { label: 'Foco', value: formatFocusArea(protocol.audit.primaryFocusArea) },
            { label: 'Alvo', value: protocol.target },
        ],
        essentialSteps: protocol.executionSteps.slice(0, 3),
        preparationItems: protocol.preparation.slice(0, 5).map((item) => ({
            label: item.label,
            reason: item.reason,
            safety: formatSafetyKind(item.safetyKind),
        })),
        blockerPanel: buildBlockerPanel(protocol),
        validationCard: {
            title: 'Grave o proximo clip assim',
            checklist: protocol.validation.compatibleClipChecklist.slice(0, 8),
            successCriterion: protocol.validation.successCriteria[0]
                ?? 'Comparar o proximo clip compativel antes de consolidar.',
        },
        transferCard: {
            title: 'Transferir para TDM/partida',
            checklist: protocol.transfer.situationChecklist.slice(0, 5),
            technicalProofCopy: 'Transferencia em TDM/partida ajuda a leitura pratica, mas nao substitui a validacao compativel.',
        },
        auditDisclosure: {
            drillId: protocol.drillId,
            version: protocol.version,
            confidence: formatPercent(protocol.audit.confidence),
            coverage: formatPercent(protocol.audit.coverage),
            downgradeCodes: protocol.downgrade.reasons,
            limitedPersonalizationReasons: [
                ...(protocol.context.personalizationLimited ? ['personalizacao limitada'] : []),
                ...protocol.context.limitationReasons,
            ],
        },
        proSectionCount: protocol.proSections.length,
    };
}

function buildBlockerPanel(protocol: CompleteTrainingProtocol): ProtocolBlockerPanelModel | null {
    const reason = protocol.downgrade.reasons[0];

    if (!reason) {
        return null;
    }

    return {
        reason: formatDowngradeReason(reason),
        impact: protocol.downgrade.userCopy,
        repairAction: protocol.downgrade.repairCtas[0] ?? 'Gravar uma validacao curta mantendo as variaveis fixas.',
        unlocksNext: 'Desbloqueia criterio mais completo quando a evidencia e o contexto sustentarem.',
    };
}

function formatTierLabel(tier: CompleteTrainingProtocol['tier']): string {
    switch (tier) {
        case 'capture_again':
            return 'Recapturar com guia';
        case 'test_protocol':
            return 'Teste controlado';
        case 'stabilize_block':
            return 'Bloco de estabilizacao';
        case 'apply_protocol':
            return 'Aplicar com validacao';
    }
}

function formatPrimaryCtaLabel(tier: CompleteTrainingProtocol['tier']): string {
    switch (tier) {
        case 'capture_again':
            return 'Gravar novo clip';
        case 'test_protocol':
            return 'Executar teste curto';
        case 'stabilize_block':
            return 'Estabilizar bloco';
        case 'apply_protocol':
            return 'Aplicar e validar';
    }
}

function formatEnvironmentLabel(environment: CompleteTrainingProtocol['environment']): string {
    switch (environment) {
        case 'training_mode':
            return 'Training Mode';
        case 'training_mode_custom':
            return 'Training Mode custom';
        case 'ugc_range':
            return 'UGC experimental';
        case 'aim_sound_lab':
            return 'Aim/Sound Lab';
        case 'tdm_warmup':
            return 'TDM warmup';
        case 'real_match_transfer':
            return 'Partida real';
        case 'future_spray_lab':
            return 'Spray Lab futuro';
    }
}

function formatFocusArea(area: CoachFocusArea): string {
    switch (area) {
        case 'capture_quality':
            return 'Qualidade da captura';
        case 'vertical_control':
            return 'Controle vertical';
        case 'horizontal_control':
            return 'Controle horizontal';
        case 'timing':
            return 'Timing';
        case 'consistency':
            return 'Consistencia';
        case 'sensitivity':
            return 'Sensibilidade';
        case 'loadout':
            return 'Loadout';
        case 'validation':
            return 'Validacao';
    }
}

function formatDistance(protocol: CompleteTrainingProtocol): string {
    if (typeof protocol.context.distanceMeters === 'number') {
        return protocol.context.distanceMode === 'estimated_range'
            ? `${protocol.context.distanceMeters}m estimados`
            : `${protocol.context.distanceMeters}m`;
    }

    return 'Distancia a confirmar';
}

function formatSafetyKind(kind: CompleteTrainingProtocol['preparation'][number]['safetyKind']): string {
    switch (kind) {
        case 'setup_control':
            return 'controle de setup';
        case 'variable_control':
            return 'variavel fixa';
        case 'rest':
            return 'pausa';
        case 'stop_rule':
            return 'parar se houver dor, dormencia ou formigamento';
    }
}

function formatDowngradeReason(reason: TrainingProtocolDowngradeReasonCode): string {
    switch (reason) {
        case 'missing_distance':
            return 'Distancia ausente';
        case 'missing_optic':
            return 'Mira ausente';
        case 'missing_attachment':
            return 'Attachment a confirmar';
        case 'low_confidence':
            return 'Confianca baixa';
        case 'low_coverage':
            return 'Cobertura baixa';
        case 'invalid_clip':
            return 'Clip invalido';
        case 'partial_safe_read':
            return 'Leitura parcial';
        case 'outcome_conflict':
            return 'Resultado em conflito';
        case 'fatigue_or_pain':
            return 'Fadiga ou dor';
        case 'variable_changed':
            return 'Variavel mudou';
        case 'limited_weapon_support':
            return 'Suporte tecnico limitado';
        case 'insufficient_compatible_validation':
            return 'Falta validacao compativel';
    }
}

function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}
