import React from 'react';

import type { SocialProReportViewModel } from '@/core/social-pro-report-view-model';

import styles from '../../community-hub.module.css';

export interface SocialProReportBadgeViewModel {
    readonly visible: boolean;
    readonly label: string | null;
    readonly tooltip: string;
    readonly meaning: 'active_pro_access';
}

export type ProReportDetailModel = SocialProReportViewModel & {
    readonly proBadge?: SocialProReportBadgeViewModel;
};

interface ProReportDetailProps {
    readonly model: ProReportDetailModel;
}

function ProAccessBadge({
    badge,
}: {
    readonly badge: SocialProReportBadgeViewModel | undefined;
}): React.JSX.Element | null {
    if (!badge?.visible) {
        return null;
    }

    return (
        <span
            className={styles.loadoutChip}
            data-social-pro-badge={badge.meaning}
            title={badge.tooltip}
            aria-label={badge.tooltip}
        >
            {badge.label ?? 'Pro'}
        </span>
    );
}

function ReportHonestyGrid({
    model,
}: {
    readonly model: ProReportDetailModel;
}): React.JSX.Element {
    return (
        <section className={`glass-card ${styles.postNarrativePanel}`} aria-labelledby="social-pro-honesty">
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Honestidade obrigatoria</span>
                    <h2 className={styles.sectionTitle} id="social-pro-honesty">
                        Confianca, cobertura e limites
                    </h2>
                </div>
                <p className={styles.sectionSummary}>
                    O relatorio publico mantem os campos que impedem overclaim.
                </p>
            </div>

            <div className={styles.postSnapshotGrid}>
                {model.requiredHonesty.map((row) => (
                    <div className={styles.postSnapshotItem} key={row.key}>
                        <span className={styles.profileProofLabel}>{row.label}</span>
                        <strong className={styles.postSnapshotValue}>{row.value}</strong>
                    </div>
                ))}
            </div>
        </section>
    );
}

function EvidenceTimeline({
    model,
}: {
    readonly model: ProReportDetailModel;
}): React.JSX.Element {
    return (
        <section className={`glass-card ${styles.postSnapshotPanel}`} aria-labelledby="social-pro-evidence">
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Linha de evidencia</span>
                    <h2 className={styles.sectionTitle} id="social-pro-evidence">
                        Auditoria do caso
                    </h2>
                </div>
                <p className={styles.sectionSummary}>
                    Analise, execucao, transferencia e validacao ficam separados.
                </p>
            </div>

            <div className={styles.postContinuityList}>
                {model.evidenceLayers.map((layer) => (
                    <article className={styles.postContinuityCard} key={layer.kind}>
                        <span className={styles.loadoutChipMuted}>{layer.evidenceStrength}</span>
                        <h3>{layer.title}</h3>
                        <p>{layer.summary}</p>
                        {layer.sourceId ? (
                            <span className={styles.profileStatusNote}>Fonte: {layer.sourceId}</span>
                        ) : null}
                    </article>
                ))}
            </div>
        </section>
    );
}

function ContinuityActions({
    model,
}: {
    readonly model: ProReportDetailModel;
}): React.JSX.Element {
    return (
        <section className={`glass-card ${styles.postContinuityPanel}`} aria-labelledby="social-pro-actions">
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Proximos passos</span>
                    <h2 className={styles.sectionTitle} id="social-pro-actions">
                        Continuidade Pro
                    </h2>
                </div>
                <p className={styles.sectionSummary}>
                    Acoes de organizacao e treino continuam exigindo acesso Pro ativo.
                </p>
            </div>

            <div className={styles.postContinuityList}>
                {model.continuityActions.map((action) => (
                    <div className={styles.postSnapshotItem} key={`${action.kind}-${action.sourceId ?? 'none'}`}>
                        <span className={styles.profileProofLabel}>{action.kind}</span>
                        <strong className={styles.postSnapshotValue}>{action.label}</strong>
                        {action.sourceId ? (
                            <span className={styles.profileStatusNote}>Fonte: {action.sourceId}</span>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );
}

export function ProReportDetail({
    model,
}: ProReportDetailProps): React.JSX.Element {
    return (
        <article
            className={`container ${styles.postDetailStack}`}
            data-social-pro-report-state={model.visibility}
        >
            <section className={`glass-card ${styles.postHeroBoard}`} aria-labelledby="social-pro-report-title">
                <div className={styles.postHeroCopy}>
                    <div className={styles.profileSlugRail}>
                        <span className={styles.boardEyebrow}>{model.caseLabel}</span>
                        <span className={styles.loadoutChipMuted}>{model.status}</span>
                        <ProAccessBadge badge={model.proBadge} />
                    </div>

                    <h1 className={styles.profileTitle} id="social-pro-report-title">
                        {model.title}
                    </h1>
                    <p className={styles.profileLead}>{model.publicSummary.whatChanged}</p>
                    <p className={styles.postHeroSummary}>{model.publicSummary.evidenceSupport}</p>
                    <p className={styles.profileStatusNote}>{model.publicSummary.nextAction}</p>
                </div>
            </section>

            <div className={styles.postDetailGrid}>
                <div className={styles.postDetailStack}>
                    <ReportHonestyGrid model={model} />
                    <EvidenceTimeline model={model} />
                </div>
                <aside className={styles.postSideRail}>
                    <ContinuityActions model={model} />
                </aside>
            </div>
        </article>
    );
}
