import type {
    CompleteTrainingProtocol,
    SprayLabLaneDifficulty,
    SprayLabLanePreset,
    SprayLabLaneSupportLevel,
    TrainingProtocolContextSnapshot,
    TrainingProtocolDrillId,
} from '../types/engine';

export interface SprayLabLanePresetFilter {
    readonly drillId?: TrainingProtocolDrillId;
    readonly difficulty?: SprayLabLaneDifficulty;
    readonly supportLevel?: SprayLabLaneSupportLevel;
}

type MutableTrainingProtocolContextSnapshot = {
    -readonly [Key in keyof TrainingProtocolContextSnapshot]?: TrainingProtocolContextSnapshot[Key];
};

export const SPRAY_LAB_LANES: readonly SprayLabLanePreset[] = [
    {
        version: 'spray-lab-v1',
        id: 'spray-lab-capture-clean',
        drillId: 'capture_guided_recapture',
        label: 'Captura limpa guiada',
        shortLabel: 'captura limpa',
        objective: 'Gerar um clip com reticulo visivel, alvo unico e spray sustentado antes de treino tecnico.',
        familyLabel: 'Captura',
        difficulty: 'starter',
        recommendedEnvironment: 'training_mode',
        evidenceRequirements: {
            minimumFidelityTier: 'practice_only',
            compatibleValidationRequired: false,
            allowedEvidenceLevels: ['practice', 'weak_execution'],
        },
        suggestedSetup: [
            'Training Mode com alvo fixo e reticulo visivel.',
            'Um spray continuo sem corte, flick dominante ou troca de alvo.',
            'Salvar como pratica ate a captura sustentar analise.',
        ],
        supportNotes: [
            'Lane de reparo de captura; nao promete leitura tecnica ate o clip ficar usavel.',
        ],
        supportLevel: 'practice_only',
    },
    {
        version: 'spray-lab-v1',
        id: 'spray-lab-compatible-validation',
        drillId: 'validation_controlled_spray',
        label: 'Validacao compativel controlada',
        shortLabel: 'validacao compativel',
        objective: 'Repetir o mesmo contexto do protocolo para confirmar ou refutar o sinal tecnico.',
        familyLabel: 'Validacao',
        difficulty: 'controlled',
        recommendedEnvironment: 'training_mode',
        evidenceRequirements: {
            minimumFidelityTier: 'usable',
            compatibleValidationRequired: true,
            allowedEvidenceLevels: ['provisional_benchmark', 'validated_benchmark'],
        },
        suggestedSetup: [
            'Mesma arma, mira, distancia, postura, acessorios e sensibilidade.',
            'Uma variavel em teste por bloco.',
            'Gravar o proximo clip compativel antes de consolidar mudanca.',
        ],
        supportNotes: [
            'Se qualquer variavel mudar, a tentativa vira pratica ou evidencia fraca.',
        ],
        supportLevel: 'full',
    },
    {
        version: 'spray-lab-v1',
        id: 'spray-lab-vertical-sustain',
        drillId: 'vertical_recoil_lane',
        label: 'Controle vertical sustentado',
        shortLabel: 'controle vertical',
        objective: 'Treinar puxada vertical constante sem transformar o bloco em teste de sensibilidade.',
        familyLabel: 'Controle vertical',
        difficulty: 'controlled',
        recommendedEnvironment: 'training_mode',
        evidenceRequirements: {
            minimumFidelityTier: 'usable',
            compatibleValidationRequired: false,
            allowedEvidenceLevels: ['weak_execution', 'provisional_benchmark', 'validated_benchmark'],
        },
        suggestedSetup: [
            'Alvo fixo em 40-60m ou distancia do clip.',
            'Espaco livre no mousepad para puxar.',
            'Parar se dor, formigamento ou fadiga contaminar a execucao.',
        ],
        supportNotes: [
            'Fidelity forte depende de reps completas e variaveis preservadas.',
        ],
        supportLevel: 'full',
    },
    {
        version: 'spray-lab-v1',
        id: 'spray-lab-horizontal-lane',
        drillId: 'horizontal_tracking_lane',
        label: 'Linha horizontal de spray',
        shortLabel: 'controle horizontal',
        objective: 'Reduzir drift lateral e tremor repetido com uma pegada consistente.',
        familyLabel: 'Controle horizontal',
        difficulty: 'controlled',
        recommendedEnvironment: 'training_mode',
        evidenceRequirements: {
            minimumFidelityTier: 'usable',
            compatibleValidationRequired: false,
            allowedEvidenceLevels: ['weak_execution', 'provisional_benchmark', 'validated_benchmark'],
        },
        suggestedSetup: [
            'Alvo fixo e pressao de pegada repetivel.',
            'Pausas curtas entre sprays para nao confundir fadiga com erro lateral.',
            'Validar sem trocar sensibilidade ou acessorio.',
        ],
        supportNotes: [
            'Variacao de pegada rebaixa a leitura do Lab para pratica.',
        ],
        supportLevel: 'full',
    },
    {
        version: 'spray-lab-v1',
        id: 'spray-lab-first-ten',
        drillId: 'timing_first_ten',
        label: 'Primeiros 10 tiros',
        shortLabel: 'primeiros 10 tiros',
        objective: 'Antecipar a compensacao inicial sem virar overpull.',
        familyLabel: 'Timing',
        difficulty: 'controlled',
        recommendedEnvironment: 'training_mode',
        evidenceRequirements: {
            minimumFidelityTier: 'usable',
            compatibleValidationRequired: false,
            allowedEvidenceLevels: ['weak_execution', 'provisional_benchmark', 'validated_benchmark'],
        },
        suggestedSetup: [
            'Sprays curtos com cadencia natural.',
            'Julgar os primeiros tiros antes do sustain.',
            'Nao misturar timing com troca de variavel.',
        ],
        supportNotes: [
            'Conta como sinal tecnico somente quando cadencia e contexto ficam comparaveis.',
        ],
        supportLevel: 'full',
    },
    {
        version: 'spray-lab-v1',
        id: 'spray-lab-repeatability',
        drillId: 'consistency_repeatability',
        label: 'Repetibilidade de spray',
        shortLabel: 'repetibilidade',
        objective: 'Estabilizar sprays parecidos antes de aplicar ajustes mais agressivos.',
        familyLabel: 'Consistencia',
        difficulty: 'starter',
        recommendedEnvironment: 'training_mode',
        evidenceRequirements: {
            minimumFidelityTier: 'usable',
            compatibleValidationRequired: false,
            allowedEvidenceLevels: ['weak_execution', 'provisional_benchmark', 'validated_benchmark'],
        },
        suggestedSetup: [
            'Mesmo setup em todos os sprays.',
            'Ritual curto antes de cada tentativa.',
            'Downgrade se postura, distancia ou mira mudarem.',
        ],
        supportNotes: [
            'A lane mede repetibilidade do contexto, nao nota global do jogador.',
        ],
        supportLevel: 'full',
    },
    {
        version: 'spray-lab-v1',
        id: 'spray-lab-one-variable-sens',
        drillId: 'sensitivity_one_variable_test',
        label: 'Teste de sensibilidade de uma variavel',
        shortLabel: 'teste de sensibilidade',
        objective: 'Testar um perfil de sensibilidade sem empilhar outras mudancas.',
        familyLabel: 'Sensibilidade',
        difficulty: 'advanced',
        recommendedEnvironment: 'aim_sound_lab',
        evidenceRequirements: {
            minimumFidelityTier: 'usable',
            compatibleValidationRequired: true,
            allowedEvidenceLevels: ['provisional_benchmark', 'validated_benchmark'],
        },
        suggestedSetup: [
            'Registrar perfil antigo e perfil testado.',
            'Manter arma, mira, distancia, postura e acessorios fixos.',
            'Voltar ao baseline se a validacao compativel piorar.',
        ],
        supportNotes: [
            'Sem clip compativel, o score fica provisorio.',
        ],
        supportLevel: 'full',
    },
    {
        version: 'spray-lab-v1',
        id: 'spray-lab-one-variable-loadout',
        drillId: 'loadout_one_variable_test',
        label: 'Teste de loadout de uma variavel',
        shortLabel: 'teste de loadout',
        objective: 'Isolar uma mudanca de acessorio ou loadout sem misturar sensibilidade.',
        familyLabel: 'Loadout',
        difficulty: 'advanced',
        recommendedEnvironment: 'training_mode',
        evidenceRequirements: {
            minimumFidelityTier: 'usable',
            compatibleValidationRequired: true,
            allowedEvidenceLevels: ['provisional_benchmark', 'validated_benchmark'],
        },
        suggestedSetup: [
            'Escolher uma unica variavel de equipamento.',
            'Manter sensibilidade, arma, mira, distancia e postura fixas.',
            'Registrar suporte limitado como aviso, nao promessa tecnica.',
        ],
        supportNotes: [
            'Armas com suporte limitado podem executar a lane, mas nao recebem promessa fina de calibracao.',
        ],
        supportLevel: 'limited',
    },
];

export function listSprayLabLanePresets(
    filter: SprayLabLanePresetFilter = {},
): readonly SprayLabLanePreset[] {
    return SPRAY_LAB_LANES.filter((lane) => (
        (filter.drillId === undefined || lane.drillId === filter.drillId)
        && (filter.difficulty === undefined || lane.difficulty === filter.difficulty)
        && (filter.supportLevel === undefined || lane.supportLevel === filter.supportLevel)
    ));
}

export function selectSprayLabLaneForProtocol(protocol: CompleteTrainingProtocol): SprayLabLanePreset {
    const base = listSprayLabLanePresets({ drillId: protocol.drillId })[0]
        ?? SPRAY_LAB_LANES[0]!;
    const contextLabel = formatLaneContextLabel(protocol.context);
    const supportNotes = buildSupportNotes(base, protocol.context);
    const supportLevel = resolveSupportLevel(base.supportLevel, protocol.context);

    return {
        ...base,
        label: contextLabel ? `${contextLabel} - ${base.shortLabel}` : base.label,
        targetContext: buildLaneTargetContext(protocol.context),
        supportNotes,
        supportLevel,
    };
}

export function buildSprayLabLaneContextKey(context: TrainingProtocolContextSnapshot): string {
    const parts = [
        ['patch', context.patchVersion ?? 'unknown'],
        ['weapon', context.weaponId ?? context.weaponName ?? 'unknown'],
        ['optic', context.opticId ?? context.opticName ?? 'unknown'],
        ['distance', context.distanceMeters === undefined ? context.distanceMode : `${Math.round(context.distanceMeters)}m`],
        ['stance', context.stance ?? 'unknown'],
        ['muzzle', context.attachments.muzzle ?? 'missing'],
        ['grip', context.attachments.grip ?? 'missing'],
        ['stock', context.attachments.stock ?? 'missing'],
    ] as const;

    return parts
        .map(([key, value]) => `${key}:${normalizeKeyPart(value)}`)
        .join('|');
}

function formatLaneContextLabel(context: TrainingProtocolContextSnapshot): string {
    const weapon = context.weaponName ?? context.weaponId;
    const optic = context.opticName ?? context.opticId;
    const distance = context.distanceMeters === undefined
        ? undefined
        : `${Math.round(context.distanceMeters)}m`;

    return [weapon, optic, distance].filter((part): part is string => Boolean(part)).join(' ');
}

function buildLaneTargetContext(
    context: TrainingProtocolContextSnapshot,
): Partial<TrainingProtocolContextSnapshot> {
    const targetContext: MutableTrainingProtocolContextSnapshot = {
        distanceMode: context.distanceMode,
        attachments: context.attachments,
        supportStatus: context.supportStatus,
        personalizationLimited: context.personalizationLimited,
        limitationReasons: context.limitationReasons,
    };

    if (context.weaponId) {
        targetContext.weaponId = context.weaponId;
    }

    if (context.weaponName) {
        targetContext.weaponName = context.weaponName;
    }

    if (context.opticId) {
        targetContext.opticId = context.opticId;
    }

    if (context.opticName) {
        targetContext.opticName = context.opticName;
    }

    if (context.distanceMeters !== undefined) {
        targetContext.distanceMeters = context.distanceMeters;
    }

    if (context.stance) {
        targetContext.stance = context.stance;
    }

    if (context.patchVersion) {
        targetContext.patchVersion = context.patchVersion;
    }

    if (context.limitedSupportReason) {
        targetContext.limitedSupportReason = context.limitedSupportReason;
    }

    if (context.sensitivityProfile) {
        targetContext.sensitivityProfile = context.sensitivityProfile;
    }

    return targetContext;
}

function buildSupportNotes(
    lane: SprayLabLanePreset,
    context: TrainingProtocolContextSnapshot,
): readonly string[] {
    const notes = new Set(lane.supportNotes);

    if (context.personalizationLimited) {
        notes.add('Contexto parcial: a lane continua util, mas nao deve virar promessa tecnica forte.');
    }

    if (context.supportStatus !== 'full' && context.supportStatus !== 'unknown') {
        notes.add(context.limitedSupportReason ?? 'Suporte limitado: usar como aviso e nao como calibracao fina.');
    }

    return Array.from(notes);
}

function resolveSupportLevel(
    laneSupport: SprayLabLaneSupportLevel,
    context: TrainingProtocolContextSnapshot,
): SprayLabLaneSupportLevel {
    if (laneSupport === 'practice_only') {
        return laneSupport;
    }

    if (context.supportStatus !== 'full' && context.supportStatus !== 'unknown') {
        return 'limited';
    }

    return context.personalizationLimited ? 'limited' : laneSupport;
}

function normalizeKeyPart(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'unknown';
}
