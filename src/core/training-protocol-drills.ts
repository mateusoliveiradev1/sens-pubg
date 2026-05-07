import type {
    AnalysisResult,
    CoachDecisionTier,
    CoachFocusArea,
    TrainingProtocolContextSnapshot,
    TrainingProtocolDose,
    TrainingProtocolDowngradeReasonCode,
    TrainingProtocolDrillId,
    TrainingProtocolEnvironmentType,
} from '../types/engine';
import { getWeapon } from '../game/pubg';
import { resolveWeaponSupportStatus } from '../ui/components/weapon-support-status';

export interface TrainingProtocolEnvironmentCatalogEntry {
    readonly id: TrainingProtocolEnvironmentType;
    readonly label: string;
    readonly requiredDefault: boolean;
}

export interface TrainingProtocolDrillMaster {
    readonly id: TrainingProtocolDrillId;
    readonly objective: string;
    readonly environment: TrainingProtocolEnvironmentType;
    readonly target: string;
    readonly defaultDistanceLabel: string;
    readonly baseReps: number;
    readonly baseSpraysPerRep: number;
    readonly basePauseSeconds: number;
    readonly executionSteps: readonly string[];
    readonly observedError: string;
    readonly successCriteria: readonly string[];
    readonly failCriteria: readonly string[];
    readonly preparationFocus: readonly string[];
    readonly downgradeCopy: string;
    readonly validationTarget: string;
}

export const TRAINING_PROTOCOL_ENVIRONMENTS: Record<TrainingProtocolEnvironmentType, TrainingProtocolEnvironmentCatalogEntry> = {
    training_mode: {
        id: 'training_mode',
        label: 'Training Mode oficial',
        requiredDefault: true,
    },
    training_mode_custom: {
        id: 'training_mode_custom',
        label: 'Training Mode customizado',
        requiredDefault: false,
    },
    ugc_range: {
        id: 'ugc_range',
        label: 'UGC range opcional',
        requiredDefault: false,
    },
    aim_sound_lab: {
        id: 'aim_sound_lab',
        label: 'Aim/Sound Lab',
        requiredDefault: true,
    },
    tdm_warmup: {
        id: 'tdm_warmup',
        label: 'TDM warmup',
        requiredDefault: false,
    },
    real_match_transfer: {
        id: 'real_match_transfer',
        label: 'Transferencia em partida',
        requiredDefault: false,
    },
    future_spray_lab: {
        id: 'future_spray_lab',
        label: 'Spray Lab futuro',
        requiredDefault: false,
    },
};

export const TRAINING_PROTOCOL_DRILLS: Record<TrainingProtocolDrillId, TrainingProtocolDrillMaster> = {
    capture_guided_recapture: {
        id: 'capture_guided_recapture',
        objective: 'Gerar uma captura limpa antes de qualquer decisao de treino.',
        environment: 'training_mode',
        target: 'Reticulo visivel, alvo unico, spray sustentado e contexto repetivel.',
        defaultDistanceLabel: '40-60m se a distancia real nao estiver confiavel',
        baseReps: 2,
        baseSpraysPerRep: 1,
        basePauseSeconds: 45,
        executionSteps: [
            'Entre no Training Mode com a mesma arma e mira quando souber o contexto.',
            'Grave um spray sem cortes, flicks ou troca de alvo.',
            'Mantenha reticulo e alvo visiveis ate o fim do spray.',
        ],
        observedError: 'Captura ou protocolo de spray nao sustenta leitura confiavel.',
        successCriteria: [
            'O proximo clip fica usavel para analise.',
            'Cobertura e confianca sobem acima do limite minimo do coach.',
        ],
        failCriteria: [
            'Reticulo some, ha corte forte, flick dominante ou troca de alvo.',
            'Compressao ou nitidez seguem bloqueando rastreio.',
        ],
        preparationFocus: [
            'Checar nitidez e enquadramento antes de gravar.',
            'Manter a mira visivel e o alvo unico.',
            'Nao mudar sensibilidade enquanto a captura esta bloqueada.',
        ],
        downgradeCopy: 'Sem captura limpa, o protocolo vira recaptura guiada em vez de treino tecnico.',
        validationTarget: 'captura valida para liberar o coach completo',
    },
    validation_controlled_spray: {
        id: 'validation_controlled_spray',
        objective: 'Confirmar o diagnostico com um spray controlado e comparavel.',
        environment: 'training_mode',
        target: 'Mesmo contexto do clip, um criterio tecnico por vez.',
        defaultDistanceLabel: 'Distancia do clip ou faixa honesta de 40-60m',
        baseReps: 3,
        baseSpraysPerRep: 1,
        basePauseSeconds: 50,
        executionSteps: [
            'Repita o spray com arma, mira, postura, acessorios e sensibilidade fixos.',
            'Nao corrija mais de uma variavel no bloco.',
            'Grave a proxima validacao antes de promover o resultado.',
        ],
        observedError: 'A evidencia ainda precisa de confirmacao compativel.',
        successCriteria: [
            'O criterio principal melhora sem derrubar consistencia.',
            'O clip compativel mantem confianca e cobertura minimas.',
        ],
        failCriteria: [
            'Variavel de teste muda durante o bloco.',
            'A captura fica fraca ou nao comparavel.',
        ],
        preparationFocus: [
            'Fixar variaveis antes do primeiro spray.',
            'Anotar arma, mira, distancia e sensibilidade usadas.',
            'Fazer pausas curtas entre sprays.',
        ],
        downgradeCopy: 'Sem validacao compativel, a ficha fica em modo teste controlado.',
        validationTarget: 'spray compativel confirma ou refuta o foco do coach',
    },
    vertical_recoil_lane: {
        id: 'vertical_recoil_lane',
        objective: 'Treinar puxada vertical constante durante burst, sustain e fadiga.',
        environment: 'training_mode',
        target: 'Linha vertical mais curta e repetivel no alvo.',
        defaultDistanceLabel: '40-60m ou distancia exata do clip',
        baseReps: 4,
        baseSpraysPerRep: 1,
        basePauseSeconds: 60,
        executionSteps: [
            'Escolha um alvo fixo e preserve a mesma mira.',
            'Puxe para baixo de forma progressiva sem trocar sensibilidade.',
            'Compare o sustain antes de julgar a fase final do pente.',
        ],
        observedError: 'Controle vertical domina a perda de spray.',
        successCriteria: [
            'Erro vertical sustentado cai no proximo clip compativel.',
            'A correcao nao aumenta tremor horizontal relevante.',
        ],
        failCriteria: [
            'Puxada vira overpull forte ou muda no meio do bloco.',
            'Cansaco ou desconforto aparece antes da validacao.',
        ],
        preparationFocus: [
            'Garantir espaco livre no mousepad para puxar.',
            'Relaxar ombro, mao e antebraco.',
            'Parar se houver dor, dormencia ou formigamento.',
        ],
        downgradeCopy: 'Se a distancia ou cobertura estiver fraca, use teste curto de controle vertical.',
        validationTarget: 'reduzir erro vertical sustentado em spray compativel',
    },
    horizontal_tracking_lane: {
        id: 'horizontal_tracking_lane',
        objective: 'Reduzir desvio lateral, tensao de pegada e tremor horizontal repetido.',
        environment: 'training_mode',
        target: 'Spray com menor oscilacao lateral sem trocar variaveis.',
        defaultDistanceLabel: '30-50m ou distancia exata do clip',
        baseReps: 4,
        baseSpraysPerRep: 1,
        basePauseSeconds: 55,
        executionSteps: [
            'Use alvo fixo e observe se o desvio puxa para um lado.',
            'Mantenha a mesma pressao de pegada ate o fim do spray.',
            'Valide se o horizontal melhora sem perder controle vertical.',
        ],
        observedError: 'Ruido ou drift horizontal limita o spray.',
        successCriteria: [
            'Desvio lateral repetido diminui no clip compativel.',
            'A pegada permanece igual durante o bloco.',
        ],
        failCriteria: [
            'Empunhadura muda no meio do bloco.',
            'A tentativa cria variacao maior entre sprays.',
        ],
        preparationFocus: [
            'Checar pegada repetivel antes do bloco.',
            'Soltar tensao excessiva do antebraco.',
            'Manter postura e apoio iguais em todos os sprays.',
        ],
        downgradeCopy: 'Se houver muita variacao, estabilize antes de mudar equipamento.',
        validationTarget: 'reduzir drift ou tremor horizontal repetido',
    },
    timing_first_ten: {
        id: 'timing_first_ten',
        objective: 'Antecipar a compensacao dos dez primeiros tiros sem acelerar demais.',
        environment: 'training_mode',
        target: 'Primeiros dez tiros controlados antes do sustain.',
        defaultDistanceLabel: '30-50m ou distancia exata do clip',
        baseReps: 4,
        baseSpraysPerRep: 1,
        basePauseSeconds: 45,
        executionSteps: [
            'Inicie a puxada no comeco do spray, sem esperar o recoil escapar.',
            'Julgue primeiro os dez tiros iniciais.',
            'Grave validacao curta mantendo cadencia e contexto.',
        ],
        observedError: 'Compensacao chega tarde nos tiros iniciais.',
        successCriteria: [
            'Erro dos dez primeiros tiros diminui.',
            'Cadencia e distancia continuam comparaveis.',
        ],
        failCriteria: [
            'A correcao vira puxada antecipada excessiva.',
            'O bloco mistura timing com troca de sensibilidade.',
        ],
        preparationFocus: [
            'Fazer uma repeticao mental curta antes de atirar.',
            'Manter cadencia natural do spray.',
            'Pausar se a execucao ficar confusa.',
        ],
        downgradeCopy: 'Com evidencia parcial, treine timing como mini-teste antes de aplicar mudanca.',
        validationTarget: 'reduzir atraso de compensacao nos dez primeiros tiros',
    },
    consistency_repeatability: {
        id: 'consistency_repeatability',
        objective: 'Criar repetibilidade antes de qualquer ajuste mais agressivo.',
        environment: 'training_mode',
        target: 'Sprays parecidos entre si, com uma unica variavel controlada.',
        defaultDistanceLabel: 'Distancia do clip ou faixa honesta de 40-60m',
        baseReps: 5,
        baseSpraysPerRep: 1,
        basePauseSeconds: 60,
        executionSteps: [
            'Repita exatamente o mesmo setup por todo o bloco.',
            'Compare variacao entre tentativas antes de decidir ajuste.',
            'Se a execucao degradar, reduza dose e valide de novo.',
        ],
        observedError: 'Variacao entre tentativas domina o diagnostico.',
        successCriteria: [
            'Sprays ficam mais repetiveis sem trocar variavel.',
            'O proximo clip permite comparar o mesmo criterio.',
        ],
        failCriteria: [
            'Mudanca de postura, distancia, mira ou sensibilidade invalida o bloco.',
            'Fadiga aumenta a variacao e impede leitura honesta.',
        ],
        preparationFocus: [
            'Criar ritual curto antes de cada spray.',
            'Conferir postura e mousepad antes de repetir.',
            'Fazer pausa maior se a repetibilidade cair.',
        ],
        downgradeCopy: 'Quando a consistencia oscila, o bloco vira estabilizacao antes de aplicar.',
        validationTarget: 'aumentar repetibilidade entre sprays compativeis',
    },
    sensitivity_one_variable_test: {
        id: 'sensitivity_one_variable_test',
        objective: 'Testar um perfil de sensibilidade sem misturar outras mudancas.',
        environment: 'aim_sound_lab',
        target: 'Uma variavel de sensibilidade isolada e validada por clip compativel.',
        defaultDistanceLabel: 'Distancia do clip ou faixa honesta de 40-60m',
        baseReps: 3,
        baseSpraysPerRep: 2,
        basePauseSeconds: 70,
        executionSteps: [
            'Aplique apenas o perfil recomendado para o teste.',
            'Mantenha arma, mira, distancia, postura e acessorios fixos.',
            'Volte ao baseline se o clip compativel piorar.',
        ],
        observedError: 'Sensibilidade pode estar interferindo, mas precisa de teste isolado.',
        successCriteria: [
            'Perfil testado melhora o erro principal sem quebrar consistencia.',
            'Validacao compativel confirma direcao antes de consolidar.',
        ],
        failCriteria: [
            'Outra variavel muda junto com a sensibilidade.',
            'Resultado forte e assumido sem clip compativel.',
        ],
        preparationFocus: [
            'Registrar perfil antigo e perfil testado.',
            'Fixar todas as variaveis nao testadas.',
            'Nao empilhar loadout e sensibilidade no mesmo bloco.',
        ],
        downgradeCopy: 'Sem evidencia forte, sensibilidade fica como teste de uma variavel.',
        validationTarget: 'perfil recomendado melhora com contexto fixo',
    },
    loadout_one_variable_test: {
        id: 'loadout_one_variable_test',
        objective: 'Testar uma mudanca de acessorio ou loadout sem misturar sensibilidade.',
        environment: 'training_mode',
        target: 'Uma variavel de equipamento isolada por bloco.',
        defaultDistanceLabel: 'Distancia do clip ou faixa honesta de 40-60m',
        baseReps: 3,
        baseSpraysPerRep: 2,
        basePauseSeconds: 65,
        executionSteps: [
            'Escolha uma unica variavel de equipamento para testar.',
            'Mantenha sensibilidade, arma, mira, distancia e postura fixas.',
            'Compare contra clip compativel antes de promover a mudanca.',
        ],
        observedError: 'Loadout pode ajudar, mas so uma variavel deve mudar.',
        successCriteria: [
            'A variavel testada melhora o erro dominante.',
            'Nenhuma outra variavel mudou durante a validacao.',
        ],
        failCriteria: [
            'Muda acessorio e sensibilidade no mesmo bloco.',
            'A arma nao tem suporte tecnico suficiente para promessa fina.',
        ],
        preparationFocus: [
            'Anotar acessorio atual e variavel testada.',
            'Evitar trocar mira ou distancia junto.',
            'Voltar ao baseline se a validacao piorar.',
        ],
        downgradeCopy: 'Com suporte limitado, loadout vira hipotese conservadora de uma variavel.',
        validationTarget: 'uma mudanca de equipamento melhora o erro dominante',
    },
};

export function getTrainingProtocolDrill(drillId: TrainingProtocolDrillId): TrainingProtocolDrillMaster {
    return TRAINING_PROTOCOL_DRILLS[drillId];
}

export function selectTrainingProtocolDrillId(input: {
    readonly primaryFocusArea: CoachFocusArea;
    readonly tier: CoachDecisionTier;
}): TrainingProtocolDrillId {
    if (input.tier === 'capture_again' || input.primaryFocusArea === 'capture_quality') {
        return 'capture_guided_recapture';
    }

    switch (input.primaryFocusArea) {
        case 'validation':
            return 'validation_controlled_spray';
        case 'vertical_control':
            return 'vertical_recoil_lane';
        case 'horizontal_control':
            return 'horizontal_tracking_lane';
        case 'timing':
            return 'timing_first_ten';
        case 'consistency':
            return input.tier === 'stabilize_block'
                ? 'consistency_repeatability'
                : 'consistency_repeatability';
        case 'sensitivity':
            return 'sensitivity_one_variable_test';
        case 'loadout':
            return 'loadout_one_variable_test';
    }
}

export function buildTrainingProtocolContextSnapshot(input: {
    readonly analysisResult?: AnalysisResult;
    readonly calibrationLimited?: boolean;
}): TrainingProtocolContextSnapshot {
    const result = input.analysisResult;
    const weaponId = result?.trajectory.weaponId;
    const weapon = weaponId ? getWeapon(weaponId) : undefined;
    const weaponName = weapon?.name ?? result?.coaching[0]?.evidence.weaponName;
    const optic = result?.analysisContext?.optic;
    const distanceMode = result?.analysisContext?.distanceMode ?? 'unknown';
    const contextDistance = result?.analysisContext?.targetDistanceMeters;
    const metricDistance = result?.metrics.targetDistanceMeters;
    const distanceMeters = distanceMode !== 'unknown' && Number.isFinite(contextDistance)
        ? contextDistance
        : distanceMode !== 'unknown' && Number.isFinite(metricDistance)
            ? metricDistance
            : undefined;
    const support = weaponId || weaponName
        ? resolveWeaponSupportStatus({
            weaponId,
            weaponName,
            category: weapon?.category ?? result?.coaching[0]?.evidence.weaponCategory,
            calibrationLimited: input.calibrationLimited === true,
        })
        : undefined;
    const attachments = result?.loadout
        ? {
            muzzle: result.loadout.muzzle,
            grip: result.loadout.grip,
            stock: result.loadout.stock,
            missing: [] as const,
        }
        : {
            missing: ['muzzle', 'grip', 'stock'] as const,
        };
    const limitationReasons = collectContextLimitationReasons({
        distanceMeters,
        opticId: optic?.opticId,
        hasLoadout: Boolean(result?.loadout),
        supportKind: support?.kind,
    });

    return {
        ...(weaponId ? { weaponId } : {}),
        ...(weaponName ? { weaponName } : {}),
        ...(optic?.opticId ? { opticId: optic.opticId } : {}),
        ...(optic?.opticName ? { opticName: optic.opticName } : {}),
        ...(distanceMeters !== undefined ? { distanceMeters } : {}),
        distanceMode: distanceMeters !== undefined
            ? (distanceMode === 'unknown' ? 'estimated_range' : distanceMode)
            : 'unknown',
        ...(result?.loadout?.stance ? { stance: result.loadout.stance } : {}),
        attachments,
        ...(result?.sensitivity.recommended ? { sensitivityProfile: result.sensitivity.recommended } : {}),
        ...(result?.patchVersion ? { patchVersion: result.patchVersion } : {}),
        supportStatus: support?.kind ?? 'unknown',
        ...(support && support.kind !== 'full' ? { limitedSupportReason: support.description } : {}),
        personalizationLimited: limitationReasons.length > 0,
        limitationReasons,
    };
}

export function adaptTrainingProtocolDoseForContext(input: {
    readonly drillId: TrainingProtocolDrillId;
    readonly tier: CoachDecisionTier;
    readonly context: TrainingProtocolContextSnapshot;
}): TrainingProtocolDose {
    const drill = getTrainingProtocolDrill(input.drillId);
    const durationMinutes = durationForTier(input.tier);
    const hardWeapon = isHardWeapon(input.context.weaponId);
    const supportLimited = input.context.supportStatus !== 'full' && input.context.supportStatus !== 'unknown';
    const repsPenalty = hardWeapon || supportLimited ? 1 : 0;
    const restBonus = hardWeapon ? 15 : supportLimited ? 10 : 0;
    const sprayReps = Math.max(input.tier === 'capture_again' ? 1 : 2, drill.baseReps - repsPenalty);
    const spraysPerRep = input.tier === 'capture_again'
        ? 1
        : drill.baseSpraysPerRep;
    const restBetweenSpraysSeconds = drill.basePauseSeconds + restBonus;

    return {
        durationMinutes,
        sprayReps,
        spraysPerRep,
        restBetweenSpraysSeconds,
        restBetweenRepsSeconds: restBetweenSpraysSeconds + (input.tier === 'apply_protocol' ? 20 : 10),
        stopAfterMinutes: durationMinutes,
    };
}

function collectContextLimitationReasons(input: {
    readonly distanceMeters: number | undefined;
    readonly opticId: string | undefined;
    readonly hasLoadout: boolean;
    readonly supportKind: string | undefined;
}): readonly TrainingProtocolDowngradeReasonCode[] {
    const reasons: TrainingProtocolDowngradeReasonCode[] = [];

    if (input.distanceMeters === undefined) {
        reasons.push('missing_distance');
    }

    if (!input.opticId) {
        reasons.push('missing_optic');
    }

    if (!input.hasLoadout) {
        reasons.push('missing_attachment');
    }

    if (
        input.supportKind === 'visual'
        || input.supportKind === 'technical_limited'
        || input.supportKind === 'removed'
        || input.supportKind === 'deprecated'
    ) {
        reasons.push('limited_weapon_support');
    }

    return reasons;
}

function durationForTier(tier: CoachDecisionTier): number {
    switch (tier) {
        case 'capture_again':
            return 5;
        case 'test_protocol':
            return 12;
        case 'stabilize_block':
            return 18;
        case 'apply_protocol':
            return 22;
    }
}

function isHardWeapon(weaponId: string | undefined): boolean {
    if (!weaponId) {
        return false;
    }

    const normalized = weaponId.toLowerCase();
    if (normalized === 'beryl-m762' || normalized === 'groza') {
        return true;
    }

    const weapon = getWeapon(weaponId);
    return Boolean(weapon && (weapon.verticalRecoilBase >= 240 || weapon.horizontalNoiseBase >= 4.5));
}
