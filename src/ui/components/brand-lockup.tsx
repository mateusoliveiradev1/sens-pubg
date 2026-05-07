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
            <span aria-hidden="true" className={styles.lockupWordmark} data-wordmark="Sens PUBG">
                <span className={styles.lockupProduct}>
                    <span>S</span>
                    <span className={styles.lockupAccentLetter}>E</span>
                    <span>N</span>
                    <span>S</span>
                </span>
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
