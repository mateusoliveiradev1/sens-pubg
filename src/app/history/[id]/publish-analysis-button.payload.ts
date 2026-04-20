interface PublishAnalysisPayloadInput {
    readonly analysisSessionId: string;
    readonly weaponName: string;
    readonly scopeName: string;
    readonly patchVersion: string;
    readonly createdAtIso: string;
}

export function buildCommunityPublishPayload(input: PublishAnalysisPayloadInput) {
    const createdAtLabel = new Date(input.createdAtIso).toLocaleDateString('pt-BR');

    return {
        analysisSessionId: input.analysisSessionId,
        title: `${input.weaponName} - analise de spray`,
        excerpt: `Analise de ${input.weaponName} com ${input.scopeName} no patch ${input.patchVersion}.`,
        bodyMarkdown: [
            'Analise publicada a partir do historico do jogador.',
            '',
            `- Arma: ${input.weaponName}`,
            `- Mira: ${input.scopeName}`,
            `- Patch: ${input.patchVersion}`,
            `- Sessao original: ${createdAtLabel}`,
        ].join('\n'),
        status: 'published' as const,
    };
}

export type { PublishAnalysisPayloadInput };
