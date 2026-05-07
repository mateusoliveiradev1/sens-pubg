import React from 'react';
import styles from './premium-ui.module.css';

export type EvidenceTone = 'info' | 'success' | 'warning' | 'error' | 'pro';

interface EvidenceChipProps {
    readonly label: string;
    readonly value?: string;
    readonly detail?: string;
    readonly tone?: EvidenceTone;
    readonly className?: string;
}

const toneClass: Record<EvidenceTone, string> = {
    info: styles.toneInfo ?? '',
    success: styles.toneSuccess ?? '',
    warning: styles.toneWarning ?? '',
    error: styles.toneError ?? '',
    pro: styles.tonePro ?? '',
};

export function EvidenceChip({
    label,
    value,
    detail,
    tone = 'info',
    className,
}: EvidenceChipProps): React.JSX.Element {
    return (
        <span
            className={[styles.evidenceChip, toneClass[tone], className].filter(Boolean).join(' ')}
            data-tone={tone}
            title={detail}
        >
            <span>{label}</span>
            {value ? <span className={styles.chipValue}>{value}</span> : null}
        </span>
    );
}
