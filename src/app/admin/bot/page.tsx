import { db } from '@/db';
import { botHeartbeat } from '@/db/schema';
import styles from '../admin.module.css';

async function getDetailedBotStatus() {
    try {
        const status = await db.query.botHeartbeat.findFirst({
            where: (hb, { eq }) => eq(hb.id, 'main_bot'),
        });
        return status;
    } catch {
        return null;
    }
}

export default async function BotStatusPage() {
    const status = await getDetailedBotStatus();

    const isOnline = status ? (new Date().getTime() - status.lastSeen.getTime()) < 5 * 60 * 1000 : false;

    return (
        <div className={styles.botStatusPage}>
            <header className={styles.pageHeader}>
                <h1>Status do Bot Discord</h1>
                <p>Monitore a conexão entre o site e o seu servidor de processamento.</p>
            </header>

            <div className={styles.statusDetailCard}>
                <div className={`${styles.statusIndicator} ${isOnline ? styles.online : styles.offline}`}>
                    <span className={styles.statusDot}></span>
                    {isOnline ? 'O Bot está comunicando corretamente' : 'O Bot não está enviando sinais'}
                </div>

                <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Último Sinal Recebido</span>
                        <strong className={styles.detailValue}>
                            {status ? status.lastSeen.toLocaleString('pt-BR') : 'Nunca'}
                        </strong>
                    </div>
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>ID do Sistema</span>
                        <code className={styles.detailCode}>main_bot</code>
                    </div>
                </div>

                {!isOnline && (
                    <div className={styles.alertBox}>
                        <h3>⚠️ Ação Necessária</h3>
                        <p>
                            O site não está recebendo o sinal (heartbeat) do seu Bot.
                            Verifique se o processo do Bot está rodando e enviando o POST para
                            <code>/api/bot/health</code> com a chave correta.
                        </p>
                    </div>
                )}
            </div>

            <div className={styles.infoSection}>
                <h2>Como conectar?</h2>
                <div className={styles.stepList}>
                    <div className={styles.stepItem}>
                        <span className={styles.stepNumber}>1</span>
                        <div>
                            <strong>Verifique as credenciais</strong>
                            <p>O Bot deve usar a mesma <code>BOT_API_KEY</code> configurada na Vercel.</p>
                        </div>
                    </div>
                    <div className={styles.stepItem}>
                        <span className={styles.stepNumber}>2</span>
                        <div>
                            <strong>Envie o sinal (POST)</strong>
                            <p>O sinal deve ser enviado periodicamente (aprox. 1 a 2 min).</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
