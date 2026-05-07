import React from 'react';
import styles from './premium-ui.module.css';

export type SensMarkVariant = 'default' | 'compact' | 'mono' | 'pro';

interface SensMarkProps {
    readonly variant?: SensMarkVariant;
    readonly size?: number;
    readonly title?: string;
    readonly decorative?: boolean;
    readonly className?: string;
}

const variantClass: Record<SensMarkVariant, string> = {
    default: styles.markDefault ?? '',
    compact: styles.markCompact ?? '',
    mono: styles.markMono ?? '',
    pro: styles.markPro ?? '',
};

export function SensMark({
    variant = 'default',
    size = 32,
    title = 'Sens PUBG precision mark',
    decorative = false,
    className,
}: SensMarkProps): React.JSX.Element {
    const labelProps = decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': title };

    return (
        <span
            className={[styles.mark, variantClass[variant], className].filter(Boolean).join(' ')}
            style={{ width: size, height: size }}
            {...labelProps}
        >
            <svg
                aria-hidden="true"
                data-brand-source="authored-sens-pubg"
                fill="none"
                height={size}
                viewBox="0 0 48 48"
                width={size}
            >
                <circle
                    cx="24"
                    cy="24"
                    data-part="precision-frame"
                    fill="rgba(18, 18, 26, 0.98)"
                    r="18"
                    stroke="currentColor"
                    strokeWidth="2.8"
                />
                <path
                    d="M31 15H21c-4 0-6.5 1.8-6.5 4.5 0 2.6 2 3.9 6 4.2l5.8.4c4.2.3 6.4 1.9 6.4 4.8 0 3.2-2.7 5.1-7.1 5.1H16"
                    data-part="s-curve"
                    stroke="var(--color-text-primary)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4.7"
                />
                <path
                    d="M16 36H31"
                    data-part="recoil-trail"
                    stroke="var(--color-pro-semantic)"
                    strokeLinecap="round"
                    strokeWidth="3"
                />
                <circle cx="33" cy="16" data-part="evidence-node" fill="var(--color-pro-semantic)" r="3" />
                <path
                    d="M24 4v7M24 37v7M4 24h7M37 24h7"
                    data-part="crosshair"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2.8"
                />
            </svg>
        </span>
    );
}
