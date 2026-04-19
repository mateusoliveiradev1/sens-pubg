export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

import { applyCommunityModerationAction, listOpenCommunityReports } from '@/actions/community-admin';
import { auth } from '@/auth';
import styles from '@/app/admin/admin.module.css';

const entityToneByType = {
    post: styles.admin,
    comment: styles.mod,
    profile: styles.support,
} as const;

const actionGroupStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
} as const;

const primaryActionStyle = {
    padding: '0.625rem 1rem',
    borderRadius: '0.75rem',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#ef4444',
    fontWeight: 700,
    cursor: 'pointer',
} as const;

const secondaryActionStyle = {
    padding: '0.625rem 1rem',
    borderRadius: '0.75rem',
    border: '1px solid var(--border-subtle)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'var(--text-primary)',
    fontWeight: 700,
    cursor: 'pointer',
} as const;

interface CommunityAdminPageProps {
    readonly searchParams?: Promise<{
        readonly updated?: string;
        readonly error?: string;
    }>;
}

type CommunityAdminPageSearchParams = {
    readonly updated?: string;
    readonly error?: string;
};

export default async function CommunityAdminPage({
    searchParams,
}: CommunityAdminPageProps) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/');
    }

    if (session.user.role !== 'admin') {
        redirect('/admin');
    }

    const [queueResult, params] = await Promise.all([
        listOpenCommunityReports(),
        (searchParams ?? Promise.resolve({})) as Promise<CommunityAdminPageSearchParams>,
    ]);

    async function submitModerationAction(formData: FormData) {
        'use server';

        const reportId = String(formData.get('reportId') ?? '');
        const actionKey = String(formData.get('actionKey') ?? '');
        const notes = String(formData.get('notes') ?? '');

        const result = await applyCommunityModerationAction({
            reportId,
            actionKey: actionKey === 'dismiss' ? 'dismiss' : 'hide',
            notes,
        });

        if (!result.success) {
            redirect(`/admin/community?error=${encodeURIComponent(result.error)}`);
        }

        redirect('/admin/community?updated=1');
    }

    return (
        <div className={styles.dashboard}>
            <header className={styles.pageHeader}>
                <div>
                    <h1>Fila de Moderacao da Comunidade</h1>
                    <p>
                        Reports abertos da comunidade com acao administrativa inicial e trilha
                        persistida.
                    </p>
                </div>
            </header>

            {params.error ? (
                <div
                    className={styles.tableContainer}
                    style={{
                        marginTop: 0,
                        padding: '1rem 1.25rem',
                        borderColor: 'rgba(239, 68, 68, 0.35)',
                    }}
                >
                    <strong style={{ color: '#ef4444' }}>Falha ao moderar report:</strong>{' '}
                    <span>{params.error}</span>
                </div>
            ) : null}

            {params.updated ? (
                <div
                    className={styles.tableContainer}
                    style={{
                        marginTop: 0,
                        padding: '1rem 1.25rem',
                        borderColor: 'rgba(16, 185, 129, 0.35)',
                    }}
                >
                    <strong style={{ color: '#10b981' }}>Fila atualizada.</strong>{' '}
                    <span>A acao de moderacao foi registrada com trilha administrativa.</span>
                </div>
            ) : null}

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Report</th>
                            <th>Entidade</th>
                            <th>Motivo</th>
                            <th>Detalhes</th>
                            <th>Aberto em</th>
                            <th>Acoes</th>
                        </tr>
                    </thead>

                    <tbody>
                        {queueResult.success ? (
                            queueResult.reports.length > 0 ? (
                                queueResult.reports.map((report) => (
                                    <tr
                                        key={report.id}
                                        data-community-admin-report={report.id}
                                    >
                                        <td>
                                            <strong>{report.id}</strong>
                                            <div className={styles.dim}>
                                                Reporter: {report.reportedByUserId}
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={`${styles.roleTag} ${entityToneByType[report.entityType]}`}
                                            >
                                                {report.entityType}
                                            </span>
                                            <div className={styles.dim}>
                                                <code>{report.entityId}</code>
                                            </div>
                                        </td>
                                        <td>
                                            <strong>{report.reasonKey}</strong>
                                            <div className={styles.dim}>{report.status}</div>
                                        </td>
                                        <td className={styles.dim}>
                                            {report.details || 'Sem detalhes adicionais.'}
                                        </td>
                                        <td className={styles.dim}>
                                            {report.createdAt.toLocaleString('pt-BR')}
                                        </td>
                                        <td>
                                            <div style={actionGroupStyle}>
                                                <form action={submitModerationAction}>
                                                    <input
                                                        type="hidden"
                                                        name="reportId"
                                                        value={report.id}
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name="actionKey"
                                                        value="hide"
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name="notes"
                                                        value="Ocultado pela fila admin da comunidade."
                                                    />
                                                    <button
                                                        type="submit"
                                                        style={primaryActionStyle}
                                                        data-community-admin-hide={report.id}
                                                    >
                                                        Ocultar
                                                    </button>
                                                </form>

                                                <form action={submitModerationAction}>
                                                    <input
                                                        type="hidden"
                                                        name="reportId"
                                                        value={report.id}
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name="actionKey"
                                                        value="dismiss"
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name="notes"
                                                        value="Report descartado na fila admin da comunidade."
                                                    />
                                                    <button
                                                        type="submit"
                                                        style={secondaryActionStyle}
                                                        data-community-admin-dismiss={report.id}
                                                    >
                                                        Descartar
                                                    </button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className={styles.empty}>
                                        Nenhum report aberto na fila de moderacao da comunidade.
                                    </td>
                                </tr>
                            )
                        ) : (
                            <tr>
                                <td colSpan={6} className={styles.empty}>
                                    {queueResult.error}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
