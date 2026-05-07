import React from 'react';
import { EvidenceChip, type EvidenceTone } from './evidence-chip';
import styles from './premium-ui.module.css';

interface CommandEvidenceItem {
    readonly label: string;
    readonly value?: string;
    readonly tone?: EvidenceTone;
    readonly detail?: string;
}

interface CommandPrimaryAction {
    readonly label: string;
    readonly href: string;
    readonly disabled?: boolean;
}

interface PageCommandHeaderProps {
    readonly roleLabel: string;
    readonly title: string;
    readonly body: string;
    readonly primaryAction: CommandPrimaryAction;
    readonly evidenceItems: readonly CommandEvidenceItem[];
    readonly className?: string;
}

export function PageCommandHeader({
    roleLabel,
    title,
    body,
    primaryAction,
    evidenceItems,
    className,
}: PageCommandHeaderProps): React.JSX.Element {
    return (
        <header className={[styles.pageCommandHeader, className].filter(Boolean).join(' ')}>
            <div className={styles.commandIntro}>
                <span className={styles.commandRole}>{roleLabel}</span>
                <h1 className={styles.commandTitle}>{title}</h1>
                <p className={styles.commandBody}>{body}</p>
                <div aria-label="Status e evidencia" className={styles.evidenceRow}>
                    {evidenceItems.map((item) => {
                        const chipProps = {
                            ...(item.detail ? { detail: item.detail } : {}),
                            ...(item.value ? { value: item.value } : {}),
                        };

                        return (
                            <EvidenceChip
                                key={`${item.label}:${item.value ?? ''}`}
                                label={item.label}
                                tone={item.tone ?? 'info'}
                                {...chipProps}
                            />
                        );
                    })}
                </div>
            </div>
            <a
                aria-disabled={primaryAction.disabled ? 'true' : undefined}
                className={styles.commandAction}
                href={primaryAction.disabled ? '#' : primaryAction.href}
            >
                {primaryAction.label}
            </a>
        </header>
    );
}
