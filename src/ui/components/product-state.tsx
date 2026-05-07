import React from 'react';
import type { ReactNode } from 'react';
import type { EvidenceTone } from './evidence-chip';
import styles from './premium-ui.module.css';

export type ProductStateKind = 'empty' | 'loading' | 'error' | 'inconclusive' | 'locked' | 'weak';

interface ProductStateProps {
    readonly state: ProductStateKind;
    readonly title: string;
    readonly body: string;
    readonly action?: ReactNode;
    readonly tone?: EvidenceTone;
    readonly className?: string;
}

export function ProductState({
    state,
    title,
    body,
    action,
    tone = 'info',
    className,
}: ProductStateProps): React.JSX.Element {
    return (
        <section
            aria-label={title}
            className={[styles.productState, className].filter(Boolean).join(' ')}
            data-state={state}
            data-tone={tone}
        >
            <h3 className={styles.stateTitle}>{title}</h3>
            <p className={styles.stateBody}>{body}</p>
            {action ? <div>{action}</div> : null}
        </section>
    );
}
