import type { AnalysisResult } from '@/types/engine';

import { adaptCoachResultWithOptionalLlm, type CoachLlmClient } from './coach-llm-adapter';
import { attachCoachPlanToAnalysisResult } from './coach-engine';

export async function enrichAnalysisResultCoaching(
    result: AnalysisResult,
    client?: CoachLlmClient
): Promise<AnalysisResult> {
    const subSessions = result.subSessions
        ? await Promise.all(result.subSessions.map((session) => enrichAnalysisResultCoaching(session, client)))
        : undefined;
    const resultWithSubSessions = {
        ...result,
        ...(subSessions ? { subSessions } : {}),
    };
    const resultWithCoachPlan = attachCoachPlanToAnalysisResult(resultWithSubSessions);

    if (!client) {
        return resultWithCoachPlan;
    }

    const adaptedCoach = await adaptCoachResultWithOptionalLlm({
        coaching: resultWithCoachPlan.coaching,
        ...(resultWithCoachPlan.coachPlan ? { coachPlan: resultWithCoachPlan.coachPlan } : {}),
    }, client);

    return {
        ...resultWithCoachPlan,
        coaching: adaptedCoach.coaching,
        ...(adaptedCoach.coachPlan ? { coachPlan: adaptedCoach.coachPlan } : {}),
    };
}
