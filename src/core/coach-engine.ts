import {
    listAvailableAttachmentsBySlot,
    resolveAttachmentCatalogVersion,
    type AttachmentDefinition,
    type AttachmentSlot,
} from '@/game/pubg/attachment-catalog';
import { getOptic, getOpticState } from '@/game/pubg/optic-catalog';
import { CURRENT_PUBG_PATCH_VERSION } from '@/game/pubg/patch';
import type {
    CoachAttachmentEvidence,
    CoachContext,
    CoachEvidence,
    CoachMode,
    CoachOpticEvidence,
    CoachFeedback,
    Diagnosis,
    WeaponLoadout,
} from '@/types/engine';

const DRILLS: Record<string, string> = {
    overpull: 'Drill da Janela (30m): va ao Training Mode e escolha uma janela pequena. Faca sprays de 10 balas focando em manter todo o spray dentro do buraco, sem deixar a mira descer.',
    underpull: 'Drill de Pulldown Gradual: atire em uma parede limpa a 50m. Tente fazer um ponto de impactos. Se o spray subir, force o mouse para baixo de forma continua, nao apenas no inicio.',
    late_compensation: 'Flash Pull: foque no som do primeiro tiro. O movimento de descida do mouse deve iniciar junto com o audio do disparo.',
    excessive_jitter: 'Drill Vertical Puro: faca sprays ignorando o horizontal. Deixe a mira balancar para os lados, mas mantenha a altura perfeita.',
    horizontal_drift: 'Linha de Tracejo: siga uma linha vertical na parede enquanto faz o spray. Se a mira fugir da linha para o mesmo lado sempre, ajuste a posicao do braco e do mousepad.',
    inconsistency: 'Drill dos 20 Sprays: faca 20 sprays na mesma parede. Eles devem ser gemeos; se cada um sair diferente, foque em repetir o mesmo movimento muscular.',
};

function estimateAdaptationDays(severity: number): number {
    if (severity >= 5) return 7;
    if (severity >= 4) return 5;
    if (severity >= 3) return 3;
    return 1;
}

function formatPhaseLabel(phase: CoachEvidence['dominantPhase'] | 'overall'): string {
    if (phase === 'burst') return 'abertura';
    if (phase === 'sustained') return 'miolo do spray';
    if (phase === 'fatigue') return 'fadiga';
    return 'spray inteiro';
}

function formatOpticContext(evidence: CoachEvidence): string {
    if (!evidence.optic) {
        return '';
    }

    return ` com ${evidence.optic.name}${evidence.optic.stateName ? ` no state ${evidence.optic.stateName}` : ''}`;
}

function buildVerificationTarget(diagnosis: Diagnosis, evidence: CoachEvidence): string {
    switch (diagnosis.type) {
        case 'underpull':
        case 'overpull':
            return `VCI mais perto de 1.00 e erro linear abaixo de ${Math.max(12, Math.round(evidence.linearErrorCm * 0.7))}cm`;
        case 'late_compensation':
            return `resposta inicial abaixo de ${Math.max(180, Number(diagnosis.idealResponseMs) + 20)}ms`;
        case 'excessive_jitter':
            return `ruido horizontal abaixo de ${diagnosis.threshold}`;
        case 'horizontal_drift':
            return 'desvio lateral abaixo de 1.0px/frame';
        case 'inconsistency':
            return 'consistencia acima de 65/100';
        case 'inconclusive':
            return 'coverage >= 70% e confidence >= 70%';
    }
}

function buildCoachProblem(diagnosis: Diagnosis, evidence: CoachEvidence): string {
    const phaseLabel = formatPhaseLabel(evidence.dominantPhase ?? 'overall');

    switch (diagnosis.type) {
        case 'underpull':
            return `O spray esta subindo alem do ideal, com VCI ${diagnosis.verticalControlIndex.toFixed(2)} e erro projetado de ${evidence.linearErrorCm.toFixed(1)}cm. O desvio pesa mais na ${phaseLabel}.`;
        case 'overpull':
            return `Voce esta descendo a mira alem do necessario, com VCI ${diagnosis.verticalControlIndex.toFixed(2)} e perda de linha principalmente na ${phaseLabel}.`;
        case 'late_compensation':
            return `A compensacao esta entrando tarde: ${Math.round(Number(diagnosis.responseTimeMs))}ms contra um ideal perto de ${Math.round(Number(diagnosis.idealResponseMs))}ms.`;
        case 'excessive_jitter':
            return `O eixo horizontal ficou solto demais: ruido ${diagnosis.horizontalNoise.toFixed(1)} para um limite de ${diagnosis.threshold}. Isso espalha o spray mesmo quando a altura parece boa.`;
        case 'horizontal_drift':
            return `A trajetoria puxa para a ${diagnosis.bias.direction === 'left' ? 'esquerda' : 'direita'} com magnitude ${diagnosis.bias.magnitude.toFixed(1)}px/frame.`;
        case 'inconsistency':
            return `Cada spray esta saindo diferente do anterior: consistencia ${diagnosis.consistencyScore}/100 e leitura instavel entre blocos.`;
        case 'inconclusive':
            return `O clip ainda nao sustenta leitura final: coverage ${(diagnosis.evidenceQuality.coverage * 100).toFixed(0)}% e confidence ${(diagnosis.evidenceQuality.confidence * 100).toFixed(0)}%.`;
    }
}

function buildCoachCause(diagnosis: Diagnosis, evidence: CoachEvidence, loadout: WeaponLoadout): string {
    const phaseCue = evidence.dominantPhase
        ? ` O erro aparece mais na ${formatPhaseLabel(evidence.dominantPhase)}.`
        : '';
    const stanceCue = loadout.stance === 'standing' && diagnosis.severity >= 3
        ? ' De pe, qualquer sobra de movimento cobra mais caro.'
        : '';
    const opticCue = evidence.optic
        ? ` A leitura foi feita${formatOpticContext(evidence)}.`
        : '';

    switch (diagnosis.type) {
        case 'underpull':
            return `${diagnosis.cause} O mouse para de descer cedo demais ou perde forca depois do inicio.${phaseCue}${stanceCue}${opticCue}`;
        case 'overpull':
            return `${diagnosis.cause} A mao esta entrando com forca demais e fecha o spray antes da conta.${phaseCue}${stanceCue}${opticCue}`;
        case 'late_compensation':
            return `${diagnosis.cause} O padrao sugere hesitacao antes do primeiro ajuste.${stanceCue}${opticCue}`;
        case 'excessive_jitter':
            return `${diagnosis.cause} O problema parece mais de tensao e microcorrecao do que de sens pura.${stanceCue}${opticCue}`;
        case 'horizontal_drift':
            return `${diagnosis.cause} O eixo lateral esta viciado para um lado e repete o mesmo escape.${phaseCue}${stanceCue}${opticCue}`;
        case 'inconsistency':
            return `${diagnosis.cause} O clip sugere falta de repeticao do mesmo gesto do inicio ao fim.${stanceCue}${opticCue}`;
        case 'inconclusive':
            return `${diagnosis.cause}${opticCue}`;
    }
}

function buildCoachAction(
    diagnosis: Diagnosis,
    evidence: CoachEvidence,
    adjustment: string,
    mode: CoachMode
): string {
    if (mode !== 'standard') {
        return adjustment;
    }

    const phaseLabel = formatPhaseLabel(evidence.dominantPhase ?? 'overall');

    switch (diagnosis.type) {
        case 'underpull':
            return `Foque em manter a descida viva na ${phaseLabel}, nao so nos primeiros tiros. ${adjustment}`;
        case 'overpull':
            return `Tire forca da descida justamente na ${phaseLabel} e deixe o spray andar antes de corrigir de novo. ${adjustment}`;
        case 'late_compensation':
            return `Antecipe o primeiro ajuste; a descida precisa nascer junto com o disparo, nao depois da leitura visual. ${adjustment}`;
        case 'excessive_jitter':
            return `Trave menos o punho e deixe o antebraco conduzir a linha principal do spray. ${adjustment}`;
        case 'horizontal_drift':
            return `Recentralize o eixo lateral e cheque se o mousepad esta alinhado ao ombro antes de mexer mais na sens. ${adjustment}`;
        case 'inconsistency':
            return `Repita o mesmo tempo de disparo e o mesmo ponto de partida do mouse em todas as tentativas. ${adjustment}`;
        case 'inconclusive':
            return adjustment;
    }
}

function buildCoachDrill(diagnosis: Diagnosis, evidence: CoachEvidence, drill: string): string {
    return `${drill} Meta do proximo bloco: ${buildVerificationTarget(diagnosis, evidence)}.`;
}

function resolveCoachPatchVersion(context?: CoachContext): string {
    return context?.patchVersion ?? CURRENT_PUBG_PATCH_VERSION;
}

function findAvailableAttachments(
    patchVersion: string,
    slot: AttachmentSlot,
    candidateIds: readonly string[]
): readonly AttachmentDefinition[] {
    const available = listAvailableAttachmentsBySlot(patchVersion, slot);

    return candidateIds
        .map((candidateId) => available.find((attachment) => attachment.id === candidateId))
        .filter((attachment): attachment is AttachmentDefinition => Boolean(attachment));
}

function isAttachmentEquipped(loadout: WeaponLoadout, attachment: AttachmentDefinition): boolean {
    if (!attachment.legacyId) {
        return false;
    }

    return loadout[attachment.slot] === attachment.legacyId;
}

function hasEquippedAvailableAttachment(
    loadout: WeaponLoadout,
    attachments: readonly AttachmentDefinition[]
): boolean {
    return attachments.some((attachment) => isAttachmentEquipped(loadout, attachment));
}

function selectUnequippedAttachments(
    loadout: WeaponLoadout,
    attachments: readonly AttachmentDefinition[]
): readonly AttachmentDefinition[] {
    return attachments.filter((attachment) => !isAttachmentEquipped(loadout, attachment));
}

function formatAttachmentNames(attachments: readonly AttachmentDefinition[]): string {
    if (attachments.length <= 1) {
        return attachments[0]?.name ?? '';
    }

    const names = attachments.map((attachment) => attachment.name);
    return `${names.slice(0, -1).join(', ')} ou ${names[names.length - 1]}`;
}

function addRecommendedAttachments(
    target: AttachmentDefinition[],
    attachments: readonly AttachmentDefinition[]
): void {
    for (const attachment of attachments) {
        if (!target.some((recommended) => recommended.id === attachment.id)) {
            target.push(attachment);
        }
    }
}

function toCoachAttachmentEvidence(
    attachment: AttachmentDefinition,
    catalogVersion: string
): CoachAttachmentEvidence {
    return {
        id: attachment.id,
        name: attachment.name,
        slot: attachment.slot,
        patchVersion: catalogVersion,
    };
}

function buildCoachOpticEvidence(context: CoachContext): CoachOpticEvidence | undefined {
    if (!context.opticId) {
        return undefined;
    }

    const patchVersion = resolveCoachPatchVersion(context);
    const optic = getOptic(patchVersion, context.opticId);
    if (!optic) {
        return undefined;
    }

    const opticState = getOpticState(patchVersion, context.opticId, context.opticStateId);

    return {
        id: optic.id,
        name: optic.name,
        ...(opticState ? { stateId: opticState.id, stateName: opticState.name } : {}),
        patchVersion,
    };
}

function buildCoachEvidence(
    diagnosis: Diagnosis,
    context: CoachContext,
    recommendedAttachments: readonly AttachmentDefinition[]
): CoachEvidence {
    const fallbackQuality = diagnosis.type === 'inconclusive'
        ? diagnosis.evidenceQuality
        : undefined;
    const confidence = diagnosis.confidence
        ?? diagnosis.evidence?.confidence
        ?? fallbackQuality?.confidence
        ?? 1;
    const coverage = diagnosis.evidence?.coverage
        ?? fallbackQuality?.coverage
        ?? 1;
    const patchVersion = resolveCoachPatchVersion(context);
    const attachmentCatalogVersion = resolveAttachmentCatalogVersion(patchVersion);
    const attachmentEvidence = recommendedAttachments.map((attachment) =>
        toCoachAttachmentEvidence(attachment, attachmentCatalogVersion)
    );
    const opticEvidence = buildCoachOpticEvidence(context);

    return {
        diagnosisType: diagnosis.type,
        severity: diagnosis.severity,
        ...(diagnosis.dominantPhase ? { dominantPhase: diagnosis.dominantPhase } : {}),
        confidence,
        coverage,
        angularErrorDegrees: diagnosis.evidence?.angularErrorDegrees ?? 0,
        linearErrorCm: diagnosis.evidence?.linearErrorCm ?? 0,
        linearErrorSeverity: diagnosis.evidence?.linearErrorSeverity ?? diagnosis.severity,
        patchVersion,
        attachmentCatalogVersion,
        ...(attachmentEvidence.length > 0 ? { recommendedAttachments: attachmentEvidence } : {}),
        ...(opticEvidence ? { optic: opticEvidence } : {}),
    };
}

function determineCoachMode(diagnosis: Diagnosis, evidence: CoachEvidence): CoachMode {
    if (diagnosis.type === 'inconclusive') {
        return 'inconclusive';
    }

    if (evidence.confidence < 0.6 || evidence.coverage < 0.6) {
        return 'low-confidence';
    }

    return 'standard';
}

function shouldUseConservativeCoaching(diagnosis: Diagnosis, evidence: CoachEvidence): boolean {
    return determineCoachMode(diagnosis, evidence) !== 'standard';
}

function buildConservativeAdjustment(adjustment: string, mode: CoachMode): string {
    const reason = mode === 'inconclusive'
        ? 'Analise inconclusiva'
        : 'Hipotese de baixa confianca';

    return `${reason}: ${adjustment} Antes de alterar sensibilidade ou attachments, grave um novo clip com tracking mais limpo para confirmar o padrao.`;
}

function buildVerifyNextClip(diagnosis: Diagnosis, evidence: CoachEvidence, mode: CoachMode): string {
    const phase = formatPhaseLabel(evidence.dominantPhase ?? 'overall');
    const opticContext = formatOpticContext(evidence);
    const target = buildVerificationTarget(diagnosis, evidence);

    if (mode !== 'standard') {
        return `Grave um novo clip${opticContext} antes de fechar a leitura; busque ${target}.`;
    }

    return `No proximo clip, cheque a ${phase}${opticContext}: ${target}, com coverage >= ${(evidence.coverage * 100).toFixed(0)}% e confidence >= ${(evidence.confidence * 100).toFixed(0)}%.`;
}

export function generateCoaching(
    diagnoses: readonly Diagnosis[],
    loadout: WeaponLoadout,
    context: CoachContext = {}
): CoachFeedback[] {
    const patchVersion = resolveCoachPatchVersion(context);
    const attachmentCatalogVersion = resolveAttachmentCatalogVersion(patchVersion);

    return diagnoses.map((diagnosis): CoachFeedback => {
        let whatToAdjust = diagnosis.remediation;
        const whyItHappens = diagnosis.cause;
        const recommendedAttachments: AttachmentDefinition[] = [];
        const baselineEvidence = buildCoachEvidence(diagnosis, context, []);
        const conservativeCoaching = shouldUseConservativeCoaching(diagnosis, baselineEvidence);

        const appendAttachmentTip = (
            attachments: readonly AttachmentDefinition[],
            buildTip: (attachmentNames: string) => string
        ): void => {
            if (attachments.length === 0) {
                return;
            }

            addRecommendedAttachments(recommendedAttachments, attachments);
            whatToAdjust += buildTip(formatAttachmentNames(attachments));
        };

        if (!conservativeCoaching && diagnosis.type === 'overpull') {
            const initialKickGrips = selectUnequippedAttachments(
                loadout,
                findAvailableAttachments(patchVersion, 'grip', ['lightweight-grip'])
            ).slice(0, 1);

            appendAttachmentTip(
                initialKickGrips,
                (attachmentNames) =>
                    ` Dica (${attachmentCatalogVersion}): Experimente usar o ${attachmentNames} para suavizar o kick inicial.`
            );
        } else if (!conservativeCoaching && diagnosis.type === 'underpull') {
            const availableVerticalGrips = findAvailableAttachments(patchVersion, 'grip', ['vertical-grip']);
            const availableRecoilMuzzles = findAvailableAttachments(patchVersion, 'muzzle', ['compensator', 'muzzle-brake']);
            const verticalGrips = hasEquippedAvailableAttachment(loadout, availableVerticalGrips)
                ? []
                : selectUnequippedAttachments(loadout, availableVerticalGrips).slice(0, 1);
            const recoilMuzzles = hasEquippedAvailableAttachment(loadout, availableRecoilMuzzles)
                ? []
                : selectUnequippedAttachments(loadout, availableRecoilMuzzles).slice(0, 1);
            const attachments = [...verticalGrips, ...recoilMuzzles];

            appendAttachmentTip(
                attachments,
                (attachmentNames) =>
                    ` Dica (${attachmentCatalogVersion}): ${attachmentNames} sao validos neste patch para reduzir o recuo vertical.`
            );
        } else if (!conservativeCoaching && (diagnosis.type === 'horizontal_drift' || diagnosis.type === 'excessive_jitter')) {
            const horizontalGrips = findAvailableAttachments(
                patchVersion,
                'grip',
                ['angled-foregrip', 'tilted-grip', 'half-grip']
            );

            if (!hasEquippedAvailableAttachment(loadout, horizontalGrips)) {
                appendAttachmentTip(
                    horizontalGrips.slice(0, 2),
                    (attachmentNames) =>
                        ` Dica (${attachmentCatalogVersion}): ${attachmentNames} ajudam a conter a oscilacao lateral neste patch.`
                );
            }
        }

        if (!conservativeCoaching && diagnosis.severity >= 3 && loadout.stance === 'standing') {
            whatToAdjust += ' Lembre-se: Agachar (Crouch) reduz o recuo em cerca de 20%. Use isso a seu favor em sprays longos.';
        }

        const evidence = buildCoachEvidence(diagnosis, context, recommendedAttachments);
        const mode = determineCoachMode(diagnosis, evidence);
        const adjustment = mode === 'standard'
            ? whatToAdjust
            : buildConservativeAdjustment(diagnosis.remediation, mode);
        const drill = DRILLS[diagnosis.type] ?? 'Pratique no Training Mode focando na consistencia mecanica.';
        const verifyNextClip = buildVerifyNextClip(diagnosis, evidence, mode);
        const coachProblem = buildCoachProblem(diagnosis, evidence);
        const coachCause = buildCoachCause(diagnosis, evidence, loadout);
        const coachAdjustment = buildCoachAction(diagnosis, evidence, adjustment, mode);
        const coachDrill = buildCoachDrill(diagnosis, evidence, drill);

        return {
            diagnosis,
            mode,
            problem: diagnosis.description,
            evidence,
            confidence: evidence.confidence,
            likelyCause: coachCause,
            adjustment,
            drill,
            verifyNextClip,
            whatIsWrong: coachProblem,
            whyItHappens,
            whatToAdjust: coachAdjustment,
            howToTest: coachDrill,
            adaptationTimeDays: estimateAdaptationDays(diagnosis.severity),
        };
    });
}
