export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { desc } from 'drizzle-orm';
import styles from '../admin.module.css';

export default async function AuditLogsPage() {
    const logs = await db.query.auditLogs.findMany({
        orderBy: [desc(auditLogs.createdAt)],
        with: {
            admin: true,
        },
        limit: 50,
    });

    return (
        <div className={styles.dashboard}>
            <header className={styles.pageHeader}>
                <h1>Logs de Auditoria</h1>
                <p>Histórico de ações administrativas e eventos do sistema.</p>
            </header>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Data / Hora</th>
                            <th>Administrador</th>
                            <th>Ação</th>
                            <th>Alvo</th>
                            <th>Detalhes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? (
                            logs.map((log) => (
                                <tr key={log.id}>
                                    <td className={styles.dim}>
                                        {log.createdAt.toLocaleString('pt-BR')}
                                    </td>
                                    <td>
                                        <strong>{log.admin?.name || 'Sistema'}</strong>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{log.admin?.email}</div>
                                    </td>
                                    <td>
                                        <span className={`${styles.roleTag} ${log.action === 'CHANGE_ROLE' ? styles.mod : styles.support}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className={styles.detailCode}>{log.target || '-'}</td>
                                    <td className={styles.dim}>
                                        {log.details ? JSON.stringify(log.details) : '-'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className={styles.empty}>
                                    Nenhum log registrado ainda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
