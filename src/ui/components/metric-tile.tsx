import React from 'react';
import type { EvidenceTone } from './evidence-chip';
import styles from './premium-ui.module.css';

interface MetricTileProps {
    readonly label: string;
    readonly value: string;
    readonly helper: string;
    readonly tone?: EvidenceTone;
    readonly className?: string;
}

export function MetricTile({
    label,
    value,
    helper,
    tone = 'info',
    className,
}: MetricTileProps): React.JSX.Element {
    return (
        <article className={[styles.metricTile, className].filter(Boolean).join(' ')} data-tone={tone}>
            <div className={styles.metricValue}>{value}</div>
            <div>
                <div className={styles.metricLabel}>{label}</div>
                <p className={styles.metricHelper}>{helper}</p>
            </div>
        </article>
    );
}
