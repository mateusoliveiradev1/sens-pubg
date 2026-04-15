import type { AnalysisResult } from '@/types/engine';

import { adaptCoachWithOptionalLlm, type CoachLlmClient } from './coach-llm-adapter';

export async function enrichAnalysisResultCoaching(
    result: AnalysisResult,
    client?: CoachLlmClient
): Promise<AnalysisResult> {
    if (!client) {
        return result;
    }

    const [coaching, subSessions] = await Promise.all([
        adaptCoachWithOptionalLlm(result.coaching, client),
        result.subSessions
            ? Promise.all(result.subSessions.map((session) => enrichAnalysisResultCoaching(session, client)))
            : Promise.resolve(undefined),
    ]);

    return {
        ...result,
        coaching,
        ...(subSessions ? { subSessions } : {}),
    };
}
