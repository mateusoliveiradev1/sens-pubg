import styles from '../admin.module.css';

export default function AuditLogsPage() {
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
                            <th>Data/Hora</th>
                            <th>Admin</th>
                            <th>Ação</th>
                            <th>Alvo</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className={styles.dim}>26/02/2026, 16:20:00</td>
                            <td><strong>Você</strong></td>
                            <td>Alteração de Cargo</td>
                            <td>mateus@exemplo.com</td>
                            <td><span className={`${styles.roleTag} ${styles.support}`}>Sucesso</span></td>
                        </tr>
                        <tr>
                            <td className={styles.dim}>26/02/2026, 15:20:00</td>
                            <td><strong>Sistema</strong></td>
                            <td>Heartbeat recebido</td>
                            <td>main_bot</td>
                            <td><span className={`${styles.roleTag} ${styles.support}`}>Sucesso</span></td>
                        </tr>
                    </tbody>
                </table>
                <div className={styles.empty}>
                    <p>Esta é uma versão preliminar. A persistência de logs será implementada na próxima fase.</p>
                </div>
            </div>
        </div>
    );
}
