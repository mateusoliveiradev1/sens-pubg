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
    overpull: '**O Drill da Janela (30m)**: Va ao Training Mode e escolha uma janela pequena. Faca sprays de 10 balas focando em manter TODO o spray dentro do buraco, sem deixar a mira descer.',
    underpull: '**Drill de Pulldown Gradual**: Atire em uma parede limpa a 50m. Tente fazer um ponto de impactos. Se o spray subir, force o mouse para baixo de forma continua, nao apenas no inicio.',
    late_compensation: '**The Flash Pull**: Foque no som do primeiro tiro. O movimento de descida do mouse deve iniciar junto com o audio do disparo.',
    excessive_jitter: '**Drill Vertical Puro**: Faca sprays ignorando o horizontal. Deixe a mira balancar para os lados, mas mantenha a altura perfeita.',
    horizontal_drift: '**Linha de Tracejo**: Siga uma linha vertical na parede enquanto faz o spray. Se a mira fugir da linha para o mesmo lado sempre, ajuste a posicao do braco e mousepad.',
    inconsistency: '**Drill dos 20 Sprays**: Faca 20 sprays na mesma parede. Eles devem ser gemeos; se cada um for diferente, foque em repetir o mesmo movimento muscular.',
};

function estimateAdaptationDays(severity: number): number {
    if (severity >= 5) return 7;
    if (severity >= 4) return 5;
    if (severity >= 3) return 3;
    return 1;
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
    const phase = evidence.dominantPhase ?? 'overall';
    const opticContext = evidence.optic
        ? ` usando ${evidence.optic.name}${evidence.optic.stateName ? ` no state ${evidence.optic.stateName}` : ''}`
        : '';

    if (mode !== 'standard') {
        return `Grave um novo clip${opticContext} antes de confirmar ${diagnosis.type}; busque coverage >= 70% e confidence >= 70%.`;
    }

    return `No proximo clip, confirme se ${diagnosis.type} melhora na fase ${phase}${opticContext} com coverage >= ${(evidence.coverage * 100).toFixed(0)}% e confidence >= ${(evidence.confidence * 100).toFixed(0)}%.`;
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

        return {
            diagnosis,
            mode,
            problem: diagnosis.description,
            evidence,
            confidence: evidence.confidence,
            likelyCause: whyItHappens,
            adjustment,
            drill,
            verifyNextClip: buildVerifyNextClip(diagnosis, evidence, mode),
            whatIsWrong: diagnosis.description,
            whyItHappens,
            whatToAdjust: adjustment,
            howToTest: drill,
            adaptationTimeDays: estimateAdaptationDays(diagnosis.severity),
        };
    });
}
