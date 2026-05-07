import type { CompleteTrainingProtocol } from '@/types/engine';

export interface CompatibleValidationChecklist {
    readonly weapon: string;
    readonly optic: string;
    readonly distance: string;
    readonly stance: string;
    readonly attachments: string;
    readonly sensitivity: string;
    readonly preparation: readonly string[];
    readonly duration: string;
    readonly successCriterion: string;
    readonly checklist: readonly string[];
}

function formatProtocolDistance(protocol: CompleteTrainingProtocol): string {
    const context = protocol.context;

    if (typeof context.distanceMeters === 'number') {
        return context.distanceMode === 'estimated_range'
            ? `${context.distanceMeters}m estimados`
            : `${context.distanceMeters}m`;
    }

    return context.distanceMode === 'unknown'
        ? 'distancia a confirmar'
        : context.distanceMode;
}

function formatProtocolAttachments(protocol: CompleteTrainingProtocol): string {
    const attachments = protocol.context.attachments;
    const visible = [
        attachments.muzzle ? `muzzle ${attachments.muzzle}` : null,
        attachments.grip ? `grip ${attachments.grip}` : null,
        attachments.stock ? `stock ${attachments.stock}` : null,
    ].filter((item): item is string => item !== null);

    return visible.length > 0
        ? visible.join(', ')
        : 'sem attachment confiavel informado';
}

export function buildCompatibleValidationChecklistFromProtocol(
    protocol: CompleteTrainingProtocol,
): CompatibleValidationChecklist {
    const preparation = protocol.preparation.slice(0, 5).map((item) => item.label);
    const successCriterion = protocol.validation.successCriteria[0]
        ?? 'Comparar o proximo clip compativel antes de consolidar.';
    const checklist = [
        `Arma: ${protocol.context.weaponName ?? protocol.context.weaponId ?? 'mesma arma do clip'}`,
        `Mira: ${protocol.context.opticName ?? protocol.context.opticId ?? 'mesma mira do clip'}`,
        `Distancia: ${formatProtocolDistance(protocol)}`,
        `Postura: ${protocol.context.stance ?? 'mesma postura do clip'}`,
        `Attachments: ${formatProtocolAttachments(protocol)}`,
        `Sensibilidade: ${protocol.context.sensitivityProfile ?? 'mesma sensibilidade e VSM'}`,
        `Duracao: ${protocol.dose.durationMinutes} min`,
        `Criterio: ${successCriterion}`,
    ];

    return {
        weapon: protocol.context.weaponName ?? protocol.context.weaponId ?? 'mesma arma do clip',
        optic: protocol.context.opticName ?? protocol.context.opticId ?? 'mesma mira do clip',
        distance: formatProtocolDistance(protocol),
        stance: protocol.context.stance ?? 'mesma postura do clip',
        attachments: formatProtocolAttachments(protocol),
        sensitivity: protocol.context.sensitivityProfile ?? 'mesma sensibilidade e VSM',
        preparation,
        duration: `${protocol.dose.durationMinutes} min`,
        successCriterion,
        checklist,
    };
}
