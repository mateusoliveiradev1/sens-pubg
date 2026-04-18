import type {
    AnalysisResult,
    CoachActionProtocol,
    CoachBlockPlan,
    CoachDecisionTier,
    CoachPlan,
    CoachPriority,
    CoachValidationCheck,
} from '../types/engine';
import type { CoachMemorySnapshot } from './coach-memory';
import { extractCoachMemorySignals } from './coach-memory';
import { rankCoachPriorities } from './coach-priority-engine';
import { extractCoachSignals } from './coach-signal-extractor';

export interface BuildCoachPlanInput {
    readonly analysisResult?: AnalysisResult;
    readonly memorySnapshot?: CoachMemorySnapshot;
}

export interface ResolveCoachDecisionTierInput {
    readonly analysisResult: AnalysisResult | undefined;
    readonly primaryFocus: CoachPriority;
    readonly priorities: readonly CoachPriority[];
    readonly memorySnapshot?: CoachMemorySnapshot;
}

export function buildCoachPlan(input: BuildCoachPlanInput = {}): CoachPlan {
    const priorities = input.analysisResult
        ? rankCoachPriorities({
            signals: [
                ...extractCoachSignals({ analysisResult: input.analysisResult }),
                ...extractCoachMemorySignals(input.memorySnapshot),
            ],
        })
        : [];
    const primaryFocus = priorities[0] ?? {
        id: 'contract-primary-focus',
        area: 'validation' as const,
        title: 'Validate the next coaching block',
        whyNow: 'Task 1 only establishes the CoachPlan contract.',
        priorityScore: 0,
        severity: 0,
        confidence: 0,
        coverage: 0,
        dependencies: [],
        blockedBy: [],
        signals: [],
    };

    const tier = resolveCoachDecisionTier({
        analysisResult: input.analysisResult,
        primaryFocus,
        priorities,
        ...(input.memorySnapshot ? { memorySnapshot: input.memorySnapshot } : {}),
    });

    return {
        tier,
        sessionSummary: 'CoachPlan contract stub awaiting signal extraction and ranking.',
        primaryFocus,
        secondaryFocuses: priorities.slice(1),
        actionProtocols: buildActionProtocols({ tier, primaryFocus, analysisResult: input.analysisResult }),
        nextBlock: buildNextBlockPlan({ tier, primaryFocus }),
        stopConditions: buildStopConditions({ tier, primaryFocus }),
        adaptationWindowDays: buildAdaptationWindow(tier),
        llmRewriteAllowed: false,
    };
}

export function buildActionProtocols(input: {
    readonly tier: CoachDecisionTier;
    readonly primaryFocus: CoachPriority;
    readonly analysisResult: AnalysisResult | undefined;
}): readonly CoachActionProtocol[] {
    const { tier, primaryFocus, analysisResult } = input;

    if (tier === 'capture_again') {
        return [{
            id: 'capture-retry-protocol',
            kind: 'capture',
            instruction: 'Record one clean spray with the same weapon, optic, distance, and stance before changing settings.',
            expectedEffect: 'Improves tracking coverage so the next coaching decision can use stronger evidence.',
            risk: 'low',
            applyWhen: 'Use this before any sensitivity or loadout change when capture evidence is blocked.',
            avoidWhen: 'Avoid changing sensitivity until the capture is usable for analysis.',
        }];
    }

    if (primaryFocus.area === 'sensitivity' && tier === 'apply_protocol') {
        const recommendedProfile = analysisResult?.sensitivity.recommended ?? 'balanced';
        const suggestedVsm = analysisResult?.sensitivity.suggestedVSM;
        const vsmInstruction = typeof suggestedVsm === 'number'
            ? ` and set VSM near ${suggestedVsm.toFixed(2)}`
            : '';

        return [{
            id: 'sensitivity-apply-protocol',
            kind: 'sens',
            instruction: `Apply the ${recommendedProfile} sensitivity profile${vsmInstruction}, then keep every other variable fixed for the block.`,
            expectedEffect: 'Tests the recommended sensitivity change without mixing in capture, stance, optic, or loadout noise.',
            risk: 'medium',
            applyWhen: 'Use when capture is usable, sensitivity evidence is strong, and the priority is unblocked.',
            avoidWhen: 'Avoid stacking another sensitivity change before the validation block is complete.',
        }];
    }

    if (tier === 'stabilize_block') {
        return [{
            id: 'stability-drill-protocol',
            kind: 'drill',
            instruction: 'Run repeated sprays with the same setup and focus on matching the first ten shots before judging sensitivity.',
            expectedEffect: 'Reduces run-to-run variance so later sensitivity decisions are not based on noise.',
            risk: 'low',
            applyWhen: 'Use when consistency is the dominant focus and capture is usable.',
            avoidWhen: 'Avoid changing sensitivity during the stabilization block.',
        }];
    }

    return [protocolForFocus(primaryFocus)];
}

export function buildNextBlockPlan(input: {
    readonly tier: CoachDecisionTier;
    readonly primaryFocus: CoachPriority;
}): CoachBlockPlan {
    const { tier, primaryFocus } = input;

    return {
        title: nextBlockTitle(tier, primaryFocus),
        durationMinutes: durationForTier(tier),
        steps: stepsForTier(tier, primaryFocus),
        checks: [validationCheckForFocus(primaryFocus)],
    };
}

export function buildStopConditions(input: {
    readonly tier: CoachDecisionTier;
    readonly primaryFocus: CoachPriority;
}): readonly string[] {
    const { tier, primaryFocus } = input;

    if (tier === 'capture_again') {
        return [
            'Stop if the capture remains unusable; repeat recording before testing sensitivity.',
            'Stop if reticle visibility or compression prevents stable tracking.',
        ];
    }

    if (tier === 'apply_protocol') {
        return [
            'Stop if the next clip drops below the required coverage or confidence.',
            'Stop if the first validation block gets worse before making another setting change.',
        ];
    }

    if (tier === 'stabilize_block') {
        return [
            'Stop if sprays vary enough that the same mistake cannot be repeated.',
            'Stop if fatigue or setup changes invalidate comparison between attempts.',
        ];
    }

    return [
        `Stop if ${focusLabel(primaryFocus)} is no longer the dominant repeated signal.`,
        'Stop if capture, optic, distance, or stance changes during the test block.',
    ];
}

export function buildAdaptationWindow(tier: CoachDecisionTier): number {
    switch (tier) {
        case 'capture_again':
            return 1;
        case 'test_protocol':
            return 2;
        case 'stabilize_block':
            return 3;
        case 'apply_protocol':
            return 5;
    }
}

export function resolveCoachDecisionTier(input: ResolveCoachDecisionTierInput): CoachDecisionTier {
    if (captureCannotSupportAnalysis(input)) {
        return 'capture_again';
    }

    if (hasConflictingSensitivityHistory(input.analysisResult)) {
        return 'test_protocol';
    }

    if (hasConflictingCoachMemory(input.memorySnapshot)) {
        return 'test_protocol';
    }

    if (shouldStabilizeBlock(input.primaryFocus)) {
        return 'stabilize_block';
    }

    if (shouldApplyProtocol(input)) {
        return 'apply_protocol';
    }

    return 'test_protocol';
}

function captureCannotSupportAnalysis(input: ResolveCoachDecisionTierInput): boolean {
    const { analysisResult, primaryFocus, priorities } = input;

    return analysisResult?.videoQualityReport?.usableForAnalysis === false
        || analysisResult?.sensitivity.tier === 'capture_again'
        || hasSignal(primaryFocus, 'video_quality.unusable')
        || priorities.some((priority) => (
            priority.area === 'sensitivity'
            && priority.blockedBy.includes('capture_quality')
        ));
}

function hasConflictingSensitivityHistory(analysisResult: AnalysisResult | undefined): boolean {
    return analysisResult?.sensitivity.historyConvergence?.agreement === 'conflicting';
}

function hasConflictingCoachMemory(memorySnapshot: CoachMemorySnapshot | undefined): boolean {
    return Boolean(memorySnapshot && memorySnapshot.conflictingFocusAreas.length > 0);
}

function shouldStabilizeBlock(primaryFocus: CoachPriority): boolean {
    return primaryFocus.area === 'consistency'
        && primaryFocus.blockedBy.length === 0
        && primaryFocus.confidence >= 0.7
        && primaryFocus.coverage >= 0.65;
}

function shouldApplyProtocol(input: ResolveCoachDecisionTierInput): boolean {
    const { analysisResult, primaryFocus } = input;
    const sensitivity = analysisResult?.sensitivity;

    if (!sensitivity) {
        return false;
    }

    return sensitivity.tier === 'apply_ready'
        && sensitivity.evidenceTier === 'strong'
        && sensitivity.confidenceScore >= 0.85
        && primaryFocus.blockedBy.length === 0
        && primaryFocus.priorityScore >= 0.75
        && primaryFocus.confidence >= 0.75
        && primaryFocus.coverage >= 0.75;
}

function hasSignal(priority: CoachPriority, key: string): boolean {
    return priority.signals.some((signal) => signal.key === key);
}

function protocolForFocus(primaryFocus: CoachPriority): CoachActionProtocol {
    switch (primaryFocus.area) {
        case 'vertical_control':
            return {
                id: 'vertical-control-drill-protocol',
                kind: 'drill',
                instruction: 'Run three sprays focused on steady downward pull through the sustained phase.',
                expectedEffect: 'Confirms whether the vertical error improves before escalating to a sensitivity change.',
                risk: 'low',
                applyWhen: 'Use when vertical control is the primary focus and sensitivity is still experimental.',
                avoidWhen: 'Avoid changing sensitivity during the same three-spray comparison.',
            };
        case 'horizontal_control':
            return {
                id: 'horizontal-control-technique-protocol',
                kind: 'technique',
                instruction: 'Run a short block with the same grip pressure and watch for repeated left/right drift.',
                expectedEffect: 'Separates mechanical drift from random noise before loadout or sensitivity changes.',
                risk: 'low',
                applyWhen: 'Use when horizontal drift or jitter is the strongest signal.',
                avoidWhen: 'Avoid switching grips mid-block.',
            };
        case 'timing':
            return {
                id: 'timing-technique-protocol',
                kind: 'technique',
                instruction: 'Run sprays that start with earlier recoil input and compare the first ten shots.',
                expectedEffect: 'Checks whether earlier compensation reduces the dominant timing error.',
                risk: 'low',
                applyWhen: 'Use when late compensation is the primary focus.',
                avoidWhen: 'Avoid judging the result from fatigue-phase shots only.',
            };
        case 'consistency':
            return {
                id: 'consistency-drill-protocol',
                kind: 'drill',
                instruction: 'Repeat the exact same spray setup until the pattern is stable enough to compare.',
                expectedEffect: 'Creates repeatable evidence before applying a stronger coaching decision.',
                risk: 'low',
                applyWhen: 'Use when inconsistency is present but not strong enough for stabilize_block.',
                avoidWhen: 'Avoid adding new variables between attempts.',
            };
        case 'sensitivity':
            return {
                id: 'sensitivity-test-protocol',
                kind: 'sens',
                instruction: 'Test the recommended sensitivity profile in a short block without committing it permanently yet.',
                expectedEffect: 'Validates direction while keeping the decision in experimental mode.',
                risk: 'medium',
                applyWhen: 'Use only when sensitivity is unblocked and evidence is still partial.',
                avoidWhen: 'Avoid if capture quality, history, or consistency blocks the sensitivity priority.',
            };
        case 'loadout':
            return {
                id: 'loadout-test-protocol',
                kind: 'loadout',
                instruction: 'Test one loadout variable at a time while keeping weapon, optic, distance, and stance fixed.',
                expectedEffect: 'Validates whether the loadout change affects the dominant spray error.',
                risk: 'medium',
                applyWhen: 'Use when loadout is the primary unblocked focus.',
                avoidWhen: 'Avoid changing sensitivity in the same block.',
            };
        case 'capture_quality':
            return {
                id: 'capture-quality-protocol',
                kind: 'capture',
                instruction: 'Record another clip with stable ROI, visible reticle, and unchanged gameplay context.',
                expectedEffect: 'Raises capture quality before choosing a stronger training or settings protocol.',
                risk: 'low',
                applyWhen: 'Use whenever capture quality is the primary focus.',
                avoidWhen: 'Avoid applying gameplay changes from a weak capture.',
            };
        case 'validation':
            return {
                id: 'validation-block-protocol',
                kind: 'drill',
                instruction: 'Repeat a controlled validation block before promoting any single diagnosis.',
                expectedEffect: 'Improves evidence quality for the next coaching decision.',
                risk: 'low',
                applyWhen: 'Use when the current session is mostly a validation focus.',
                avoidWhen: 'Avoid making permanent settings changes from validation-only evidence.',
            };
    }
}

function nextBlockTitle(tier: CoachDecisionTier, primaryFocus: CoachPriority): string {
    switch (tier) {
        case 'capture_again':
            return 'Clean capture block';
        case 'test_protocol':
            return `Short ${focusLabel(primaryFocus)} test block`;
        case 'stabilize_block':
            return 'Stabilization block';
        case 'apply_protocol':
            return `Apply and validate ${focusLabel(primaryFocus)}`;
    }
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
            return 20;
    }
}

function stepsForTier(
    tier: CoachDecisionTier,
    primaryFocus: CoachPriority,
): readonly string[] {
    if (tier === 'capture_again') {
        return [
            'Record one new spray with the same weapon, optic, distance, and stance.',
            'Keep the reticle visible and avoid extra compression or unstable ROI.',
            'Submit the new clip before applying sensitivity or loadout changes.',
        ];
    }

    const focus = focusLabel(primaryFocus);

    if (tier === 'apply_protocol') {
        return [
            `Apply the ${focus} protocol once.`,
            'Run 3 to 5 comparable sprays without changing any other variable.',
            'Compare the validation check before deciding on another adjustment.',
        ];
    }

    if (tier === 'stabilize_block') {
        return [
            'Run 4 comparable sprays with identical setup.',
            `Focus only on stabilizing ${focus}.`,
            'Keep the same sensitivity until the pattern repeats.',
        ];
    }

    return [
        `Run 3 comparable sprays focused on ${focus}.`,
        'Keep weapon, optic, distance, stance, attachments, and sensitivity fixed.',
        'Use the next clip to confirm whether the same signal repeats.',
    ];
}

function validationCheckForFocus(primaryFocus: CoachPriority): CoachValidationCheck {
    return {
        label: `${focusLabel(primaryFocus)} validation`,
        target: targetForFocus(primaryFocus),
        minimumCoverage: threshold(primaryFocus.coverage),
        minimumConfidence: threshold(primaryFocus.confidence),
        successCondition: successConditionForFocus(primaryFocus),
        failCondition: `Fail if ${focusLabel(primaryFocus)} does not improve or evidence falls below threshold.`,
    };
}

function targetForFocus(primaryFocus: CoachPriority): string {
    switch (primaryFocus.area) {
        case 'capture_quality':
            return 'usable capture with stable reticle visibility';
        case 'vertical_control':
            return 'lower sustained vertical error across comparable sprays';
        case 'horizontal_control':
            return 'lower repeated horizontal drift or jitter';
        case 'timing':
            return 'earlier recoil response in the first ten shots';
        case 'consistency':
            return 'more repeatable spray pattern between attempts';
        case 'sensitivity':
            return 'recommended profile improves control without new instability';
        case 'loadout':
            return 'single loadout change improves the dominant spray error';
        case 'validation':
            return 'stronger evidence for the next coaching decision';
    }
}

function successConditionForFocus(primaryFocus: CoachPriority): string {
    switch (primaryFocus.area) {
        case 'capture_quality':
            return 'Success when the next clip becomes usable for analysis with no capture blockers.';
        case 'sensitivity':
            return 'Success when the recommended profile improves the primary error without lowering consistency.';
        default:
            return `Success when ${focusLabel(primaryFocus)} improves while coverage and confidence stay above threshold.`;
    }
}

function focusLabel(primaryFocus: CoachPriority): string {
    return primaryFocus.area.replace(/_/g, ' ');
}

function threshold(value: number): number {
    const bounded = Math.min(0.9, Math.max(0.65, value));
    return Number(bounded.toFixed(2));
}
