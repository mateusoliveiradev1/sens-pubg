import React from 'react';

import {
    resolvePublicSocialProReportByToken,
} from '@/actions/social-pro-reports';
import {
    buildSocialProReportViewModel,
    type SocialProReportSourceIds,
} from '@/core/social-pro-report-view-model';
import { Header } from '@/ui/components/header';

import styles from '../../community-hub.module.css';
import { ProReportDetail, type SocialProReportBadgeViewModel } from './pro-report-detail';

export const dynamic = 'force-dynamic';

interface SocialProReportPageProps {
    readonly params: Promise<{
        readonly token: string;
    }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSourceIds(value: unknown): SocialProReportSourceIds {
    if (!isRecord(value)) {
        return {};
    }

    return {
        ...(typeof value.analysisSessionId === 'string' ? { analysisSessionId: value.analysisSessionId } : {}),
        ...(typeof value.historySessionId === 'string' ? { historySessionId: value.historySessionId } : {}),
        ...(typeof value.protocolRevisionId === 'string' ? { protocolRevisionId: value.protocolRevisionId } : {}),
        ...(typeof value.sprayLabSessionId === 'string' ? { sprayLabSessionId: value.sprayLabSessionId } : {}),
        ...(typeof value.trainingProgramCycleId === 'string' ? { trainingProgramCycleId: value.trainingProgramCycleId } : {}),
        ...(typeof value.validationLinkId === 'string' ? { validationLinkId: value.validationLinkId } : {}),
    };
}

function readProBadge(value: unknown): SocialProReportBadgeViewModel {
    if (!isRecord(value)) {
        return {
            visible: false,
            label: null,
            tooltip: 'Pro: acesso aos recursos premium do Sens PUBG',
            meaning: 'active_pro_access',
        };
    }

    return {
        visible: value.visible === true,
        label: typeof value.label === 'string' ? value.label : null,
        tooltip: typeof value.tooltip === 'string'
            ? value.tooltip
            : 'Pro: acesso aos recursos premium do Sens PUBG',
        meaning: 'active_pro_access',
    };
}

function UnavailableReport({
    message,
}: {
    readonly message: string;
}): React.JSX.Element {
    return (
        <>
            <Header />
            <main className="page">
                <section className={`container ${styles.emptyState}`} data-social-pro-report-state="unavailable">
                    <span className={styles.emptyKicker}>Relatorio Pro</span>
                    <h1>Relatorio indisponivel</h1>
                    <p>
                        {message} O Sens PUBG mostra apenas um estado seguro quando o relatorio
                        foi ocultado, desativado, arquivado, removido, expirou ou teve o link revogado.
                    </p>
                </section>
            </main>
        </>
    );
}

export default async function SocialProReportPage({
    params,
}: SocialProReportPageProps): Promise<React.JSX.Element> {
    const { token } = await params;
    const result = await resolvePublicSocialProReportByToken(token);

    if (!result.success) {
        return <UnavailableReport message={result.error} />;
    }

    const reportPayload = result.report ?? {};
    const publicSafeSnapshot = isRecord(reportPayload.publicSafeSnapshot)
        ? reportPayload.publicSafeSnapshot
        : reportPayload;
    const model = buildSocialProReportViewModel({
        report: publicSafeSnapshot,
        sourceIds: readSourceIds(reportPayload.sourceIds),
    });

    return (
        <>
            <Header />
            <main className="page">
                <ProReportDetail
                    model={{
                        ...model,
                        proBadge: readProBadge(reportPayload.proBadge),
                    }}
                />
            </main>
        </>
    );
}
