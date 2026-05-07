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
                <path
                    d="M35 8H19C12.9 8 9 11.2 9 16.4c0 4.6 3.1 7.1 9.2 7.7l9.1.9c4.5.4 6.7 2.2 6.7 5.2 0 3.4-2.7 5.8-7.4 5.8H11"
                    data-part="s-curve"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4"
                />
                <path
                    d="M13 36c7.6-8.6 14-14.4 23-22"
                    data-part="recoil-trail"
                    stroke="currentColor"
                    strokeDasharray="1 5"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                />
                <circle cx="34" cy="14" data-part="evidence-node" fill="currentColor" r="3" />
                <path
                    d="M34 5v6M34 17v6M25 14h6M37 14h6"
                    data-part="crosshair"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2"
                />
            </svg>
        </span>
    );
}
