import React from 'react';
import type { PremiumFeatureLock } from '@/types/monetization';
import styles from './premium-ui.module.css';

interface ProLockPreviewProps {
    readonly lock: PremiumFeatureLock;
    readonly currentValueLabel: string;
    readonly proValueLabel: string;
    readonly ctaLabel?: string;
    readonly className?: string;
}

function formatLockReason(reason: PremiumFeatureLock['reason']): string {
    switch (reason) {
        case 'pro_feature':
            return 'Pro desbloqueia continuidade';
        case 'limit_reached':
            return 'Limite atual atingido';
        case 'payment_issue':
            return 'Assinatura precisa de atencao';
        case 'weak_evidence':
            return 'Evidencia fraca';
        case 'not_enough_history':
            return 'Historico ainda curto';
    }
}

function resolveCtaLabel(lock: PremiumFeatureLock, ctaLabel: string | undefined): string {
    if (ctaLabel) {
        return ctaLabel;
    }

    return lock.ctaHref === '/billing' ? 'Ver Assinatura' : 'Entrar no Pro Founder';
}

export function ProLockPreview({
    lock,
    currentValueLabel,
    proValueLabel,
    ctaLabel,
    className,
}: ProLockPreviewProps): React.JSX.Element {
    return (
        <aside
            aria-label={`${lock.title}: ${formatLockReason(lock.reason)}`}
            className={[styles.lockPreview, className].filter(Boolean).join(' ')}
            data-no-fake-blur="true"
        >
            <div className={styles.lockHeader}>
                <h3 className={styles.lockTitle}>{lock.title}</h3>
                <span className={styles.lockReason}>{formatLockReason(lock.reason)}</span>
            </div>
            <p className={styles.lockCopy}>{lock.body}</p>
            <div className={styles.lockFacts}>
                <div className={styles.lockFact}>
                    <span className={styles.lockFactLabel}>Visivel agora</span>
                    <span className={styles.lockFactValue}>{currentValueLabel}</span>
                </div>
                <div className={styles.lockFact}>
                    <span className={styles.lockFactLabel}>Com Pro</span>
                    <span className={styles.lockFactValue}>{proValueLabel}</span>
                </div>
            </div>
            {lock.ctaHref ? (
                <a className={styles.lockAction} href={lock.ctaHref}>
                    {resolveCtaLabel(lock, ctaLabel)}
                </a>
            ) : null}
        </aside>
    );
}
