import React from 'react';
import { SensMark, type SensMarkVariant } from './sens-mark';
import styles from './premium-ui.module.css';

interface BrandLockupProps {
    readonly href?: string;
    readonly variant?: SensMarkVariant;
    readonly markSize?: number;
    readonly className?: string;
}

export function BrandLockup({
    href,
    variant = 'default',
    markSize = 32,
    className,
}: BrandLockupProps): React.JSX.Element {
    const content = (
        <>
            <SensMark decorative size={markSize} variant={variant} />
            <span className={styles.lockupWordmark}>
                <span className={styles.lockupProduct}>Sens</span>
                <span className={styles.lockupGame}>PUBG</span>
            </span>
        </>
    );
    const classNames = [styles.lockup, className].filter(Boolean).join(' ');

    if (href) {
        return (
            <a aria-label="Sens PUBG inicio" className={classNames} href={href}>
                {content}
            </a>
        );
    }

    return (
        <span aria-label="Sens PUBG" className={classNames}>
            {content}
        </span>
    );
}
