import Link from 'next/link';

import {
    getRevenueOpsCockpitSnapshot,
    getRevenueOpsSupportSnapshot,
} from '@/actions/revenue-ops';
import { evaluateRevenueOpsLaunchGates } from '@/core/revenue-ops-readiness';
import {
    isRevenueOpsDetailReason,
    type RevenueOpsDetailReason,
} from '@/types/revenue-ops';

import {
    RevenueOpsCockpit,
    type RevenueOpsCockpitSnapshot,
    type RevenueOpsSupportSnapshot,
} from './revenue-ops-cockpit';
import styles from './revenue-ops.module.css';

export const dynamic = 'force-dynamic';

const cockpitContractCopy = {
    noGoLabels: ['blocker', 'impact', 'owner', 'runbook', 'missing evidence', 'next step'],
    serverTruth: 'Stripe webhook resolver server',
} as const;

function parseRangeDays(value: string | undefined): number {
    const parsed = Number.parseInt(value ?? '', 10);

    if (!Number.isFinite(parsed)) {
        return 30;
    }

    return Math.min(Math.max(parsed, 1), 180);
}

function parseDetailReason(value: string | undefined): RevenueOpsDetailReason | null {
    return value && isRevenueOpsDetailReason(value) ? value : null;
}

export default async function AdminRevenueOpsPage({
    searchParams,
}: {
    readonly searchParams?: Promise<{
        readonly rangeDays?: string;
        readonly userId?: string;
        readonly detailReason?: string;
    }>;
}): Promise<React.JSX.Element> {
    const params = await searchParams;
    const rangeDays = parseRangeDays(params?.rangeDays);
    const userId = params?.userId;
    const detailReason = parseDetailReason(params?.detailReason);
    const snapshot = await getRevenueOpsCockpitSnapshot({ rangeDays }) as RevenueOpsCockpitSnapshot;
    const supportSnapshot = userId && detailReason
        ? await getRevenueOpsSupportSnapshot({ userId, detailReason }) as RevenueOpsSupportSnapshot
        : null;
    const launchReadiness = evaluateRevenueOpsLaunchGates({ evidence: [] });

    return (
        <div className={styles.pageShell}>
            <header className={styles.pageHeader}>
                <div>
                    <span className={styles.eyebrow}>Revenue Ops staff admin support</span>
                    <h1>Controle de lancamento Revenue Ops</h1>
                    <p>
                        Cockpit de decisao para Founder/Beta e Public paid launch: mostra NO-GO,
                        BLOCKED, funil essencial, evidencia e a proxima acao verificavel.
                    </p>
                </div>
                <Link href="/admin/billing" className={styles.headerLink}>
                    Abrir suporte de billing
                </Link>
            </header>

            <RevenueOpsCockpit
                contractCopy={cockpitContractCopy}
                launchReadiness={launchReadiness}
                snapshot={snapshot}
                supportSnapshot={supportSnapshot}
            />
        </div>
    );
}
