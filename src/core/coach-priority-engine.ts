import type {
    CoachFocusArea,
    CoachPriority,
    CoachSignal,
} from '../types/engine';

export interface RankCoachPrioritiesInput {
    readonly signals: readonly CoachSignal[];
    readonly limit?: number;
}

const DEFAULT_PUBLIC_PRIORITY_LIMIT = 3;

export function rankCoachPriorities(input: RankCoachPrioritiesInput): readonly CoachPriority[] {
    const groupedSignals = groupSignalsByArea(input.signals);
    const limit = input.limit ?? DEFAULT_PUBLIC_PRIORITY_LIMIT;

    const rawPriorities = Array.from(groupedSignals.entries())
        .map(([area, signals]) => buildPriority(area, signals));
    const priorities = resolvePriorityDependencies(rawPriorities);

    return [...priorities]
        .sort((left, right) => right.priorityScore - left.priorityScore)
        .slice(0, limit);
}

function groupSignalsByArea(signals: readonly CoachSignal[]): Map<CoachFocusArea, CoachSignal[]> {
    const groupedSignals = new Map<CoachFocusArea, CoachSignal[]>();

    for (const signal of signals) {
        const existingSignals = groupedSignals.get(signal.area) ?? [];
        existingSignals.push(signal);
        groupedSignals.set(signal.area, existingSignals);
    }

    return groupedSignals;
}

function buildPriority(area: CoachFocusArea, signals: readonly CoachSignal[]): CoachPriority {
    const severity = maxSignalValue(signals, (signal) => signal.weight);
    const confidence = weightedAverage(signals, (signal) => signal.confidence);
    const coverage = weightedAverage(signals, (signal) => signal.coverage);
    const priorityScore = calculateRawPriorityScore({ severity, confidence, coverage });

    return {
        id: `${area}-priority`,
        area,
        title: titleForArea(area),
        whyNow: summarizeWhyNow(signals),
        priorityScore,
        severity,
        confidence,
        coverage,
        dependencies: [],
        blockedBy: [],
        signals,
    };
}

function resolvePriorityDependencies(priorities: readonly CoachPriority[]): readonly CoachPriority[] {
    const capturePriority = findPriority(priorities, 'capture_quality');
    const consistencyPriority = findPriority(priorities, 'consistency');
    const badCaptureBlocksSensitivity = hasSignal(capturePriority, 'video_quality.unusable')
        || hasSignal(findPriority(priorities, 'sensitivity'), 'sensitivity.capture_again');
    const consistencyBlocksSensitivity = isDominantConsistencyPriority(consistencyPriority);
    const historyConflictBlocksSensitivity = hasHistoryConflict(priorities);
    const validationBlocksSensitivity = hasValidationBlockingHistory(priorities);

    return priorities.map((priority) => {
        let resolvedPriority = applyOutcomeDependencies(priority);

        if (priority.area !== 'sensitivity') {
            return resolvedPriority;
        }

        if (badCaptureBlocksSensitivity) {
            resolvedPriority = addPriorityDependency(resolvedPriority, 'capture_quality');
        }

        if (consistencyBlocksSensitivity && consistencyPriority) {
            resolvedPriority = addPriorityDependency(
                resolvedPriority,
                'consistency',
                roundScore(Math.min(
                    resolvedPriority.priorityScore,
                    consistencyPriority.priorityScore - 0.05,
                )),
            );
        }

        if (historyConflictBlocksSensitivity) {
            resolvedPriority = addPriorityDependency(
                resolvedPriority,
                'history_conflict',
                roundScore(Math.max(0, resolvedPriority.priorityScore - 0.12)),
            );
        }

        if (validationBlocksSensitivity) {
            resolvedPriority = addPriorityDependency(
                resolvedPriority,
                'validation',
                roundScore(Math.max(0, resolvedPriority.priorityScore - 0.1)),
            );
        }

        return resolvedPriority;
    });
}

function findPriority(
    priorities: readonly CoachPriority[],
    area: CoachFocusArea,
): CoachPriority | undefined {
    return priorities.find((priority) => priority.area === area);
}

function hasSignal(priority: CoachPriority | undefined, key: string): boolean {
    return priority?.signals.some((signal) => signal.key === key) ?? false;
}

function isDominantConsistencyPriority(priority: CoachPriority | undefined): boolean {
    return Boolean(priority && priority.severity >= 0.7 && priority.priorityScore >= 0.65);
}

function hasHistoryConflict(priorities: readonly CoachPriority[]): boolean {
    return priorities.some((priority) => priority.signals.some((signal) => {
        if (signal.source !== 'history') {
            return false;
        }

        const summary = signal.summary.toLowerCase();
        return signal.key.includes('conflict') || summary.includes('conflict');
    }));
}

function hasValidationBlockingHistory(priorities: readonly CoachPriority[]): boolean {
    return priorities.some((priority) => priority.signals.some((signal) => (
        signal.source === 'history'
        && (
            signal.key === 'precision.initial_signal'
            || signal.key === 'precision.in_validation'
            || signal.key === 'precision.oscillation'
            || signal.key.includes('.pending')
            || signal.key.includes('.weak_self_report.')
        )
    )));
}

function applyOutcomeDependencies(priority: CoachPriority): CoachPriority {
    let resolvedPriority = priority;

    if (hasOutcomeSignal(priority, '.conflict.')) {
        resolvedPriority = addPriorityDependency(
            resolvedPriority,
            'outcome_conflict',
            roundScore(Math.max(0, resolvedPriority.priorityScore - 0.16)),
        );
    }

    if (hasOutcomeSignal(priority, '.repeated_failure.')) {
        resolvedPriority = addPriorityDependency(
            resolvedPriority,
            'revised_hypothesis',
            roundScore(Math.max(0, resolvedPriority.priorityScore - 0.12)),
        );
    } else if (hasOutcomeSignal(priority, '.failure.')) {
        resolvedPriority = addPriorityDependency(
            resolvedPriority,
            'short_validation',
            roundScore(Math.max(0, resolvedPriority.priorityScore - 0.08)),
        );
    }

    return resolvedPriority;
}

function hasOutcomeSignal(priority: CoachPriority, marker: string): boolean {
    return priority.signals.some((signal) => (
        signal.source === 'history'
        && signal.key.startsWith('outcome.')
        && signal.key.includes(marker)
    ));
}

function addPriorityDependency(
    priority: CoachPriority,
    blocker: string,
    priorityScore = priority.priorityScore,
): CoachPriority {
    return {
        ...priority,
        priorityScore,
        dependencies: appendUnique(priority.dependencies, blocker),
        blockedBy: appendUnique(priority.blockedBy, blocker),
    };
}

function appendUnique(values: readonly string[], value: string): readonly string[] {
    return values.includes(value) ? values : [...values, value];
}

function calculateRawPriorityScore(input: {
    readonly severity: number;
    readonly confidence: number;
    readonly coverage: number;
}): number {
    return roundScore(
        (0.45 * input.severity)
        + (0.25 * input.confidence)
        + (0.2 * input.coverage),
    );
}

function weightedAverage(
    signals: readonly CoachSignal[],
    selectValue: (signal: CoachSignal) => number,
): number {
    const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);

    if (totalWeight <= 0) {
        return roundScore(signals.reduce((sum, signal) => sum + selectValue(signal), 0) / signals.length);
    }

    const weightedTotal = signals.reduce(
        (sum, signal) => sum + (selectValue(signal) * signal.weight),
        0,
    );

    return roundScore(weightedTotal / totalWeight);
}

function maxSignalValue(
    signals: readonly CoachSignal[],
    selectValue: (signal: CoachSignal) => number,
): number {
    return roundScore(Math.max(...signals.map(selectValue)));
}

function summarizeWhyNow(signals: readonly CoachSignal[]): string {
    const strongestSignal = [...signals].sort((left, right) => right.weight - left.weight)[0];
    return strongestSignal?.summary ?? 'Prioridade agrupada a partir dos sinais do coach.';
}

function titleForArea(area: CoachFocusArea): string {
    switch (area) {
        case 'capture_quality':
            return 'Qualidade da captura';
        case 'vertical_control':
            return 'Controle vertical';
        case 'horizontal_control':
            return 'Controle horizontal';
        case 'timing':
            return 'Tempo de resposta';
        case 'consistency':
            return 'Consistencia';
        case 'sensitivity':
            return 'Sensibilidade';
        case 'loadout':
            return 'Equipamento';
        case 'validation':
            return 'Validacao';
    }
}

function roundScore(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Number(value.toFixed(3));
}
