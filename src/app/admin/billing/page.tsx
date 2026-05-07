import Link from 'next/link';

import {
    applyBillingSuspension,
    createManualProGrant,
    forceStripeReconciliation,
    getAdminBillingSnapshot,
    lookupAdminBillingUser,
    recordBillingSupportNote,
    revokeManualProGrant,
} from '@/actions/admin-billing';

import styles from '@/app/admin/admin.module.css';

export const dynamic = 'force-dynamic';

function formValue(formData: FormData, key: string): string {
    return String(formData.get(key) ?? '').trim();
}

async function createManualGrantAction(formData: FormData) {
    'use server';

    const endsAt = formValue(formData, 'endsAt');

    await createManualProGrant({
        userId: formValue(formData, 'userId'),
        tier: formValue(formData, 'tier') || 'pro',
        entitlementKey: formValue(formData, 'entitlementKey') || 'coach.full_plan',
        reasonCode: formValue(formData, 'reasonCode'),
        quotaBoost: formValue(formData, 'quotaBoost') || '0',
        auditNote: formValue(formData, 'auditNote'),
        ...(endsAt.length > 0 ? { endsAt } : {}),
    });
}

async function revokeGrantAction(formData: FormData) {
    'use server';

    await revokeManualProGrant({
        grantId: formValue(formData, 'grantId'),
        reasonCode: formValue(formData, 'reasonCode') || 'manual_revoke',
        auditNote: formValue(formData, 'auditNote') || 'Revogado via suporte operacional de billing.',
    });
}

async function applySuspensionAction(formData: FormData) {
    'use server';

    await applyBillingSuspension({
        userId: formValue(formData, 'userId'),
        reason: formValue(formData, 'reason') || 'manual',
        auditNote: formValue(formData, 'auditNote'),
    });
}

async function supportNoteAction(formData: FormData) {
    'use server';

    await recordBillingSupportNote({
        userId: formValue(formData, 'userId'),
        category: formValue(formData, 'category') || 'support',
        note: formValue(formData, 'note'),
    });
}

async function reconciliationAction(formData: FormData) {
    'use server';

    await forceStripeReconciliation(formValue(formData, 'userId'));
}

export default async function AdminBillingPage({
    searchParams,
}: {
    readonly searchParams?: Promise<{ readonly q?: string; readonly userId?: string }>;
}): Promise<React.JSX.Element> {
    const params = await searchParams;
    const query = params?.q?.trim() ?? '';
    const lookupResults = query.length >= 3
        ? await lookupAdminBillingUser({ query })
        : [];
    const selectedUserId = params?.userId ?? lookupResults[0]?.id ?? null;
    const snapshot = selectedUserId ? await getAdminBillingSnapshot(selectedUserId) : null;
    const canMutate = snapshot?.viewerRole === 'admin';

    return (
        <div className={styles.adminPage}>
            <header className={styles.pageHeader}>
                <div>
                    <span className={styles.pageEyebrow}>Operacoes Pro</span>
                    <h1>Assinaturas e entitlements</h1>
                    <p>Suporte operacional Sens PUBG para Pro Founder, grants, suspensoes, quota e eventos auditaveis.</p>
                </div>
                <Link href="/admin" className={styles.backButton}>
                    Voltar
                </Link>
            </header>

            <section className={styles.trustPanel} aria-label="Escopo operacional de billing">
                <div>
                    <span>Verdade de acesso</span>
                    <strong>Stripe + resolver servidor</strong>
                </div>
                <p>
                    Esta tela ajuda suporte a investigar estados Pro. Ela nao e dashboard de receita
                    e nao altera acesso por URL, client state ou recibo visual.
                </p>
            </section>

            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2>Lookup seguro</h2>
                    <p>Busque por email, nome ou UUID. Mutacoes ficam restritas a admin; suporte ve estado e registra notas.</p>
                </div>
                <form className={styles.lookupForm}>
                    <input
                        aria-label="Buscar usuario"
                        defaultValue={query}
                        name="q"
                        placeholder="email, nome ou user id"
                        style={{ minWidth: 280, flex: 1 }}
                    />
                    <button className={styles.actionButton} type="submit">
                        Buscar
                    </button>
                </form>
                {lookupResults.length > 0 ? (
                    <div className={`${styles.tableWrapper} ${styles.sectionOffset}`}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Tier</th>
                                    <th>Status</th>
                                    <th>Quota</th>
                                    <th>Acao</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lookupResults.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.email ?? user.name ?? user.id}</td>
                                        <td>{user.access.effectiveTier}</td>
                                        <td>{user.access.accessState}</td>
                                        <td>{user.access.quota.used}/{user.access.quota.limit}</td>
                                        <td>
                                            <Link href={`/admin/billing?userId=${user.id}`} className={styles.actionLink}>
                                                Abrir
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </section>

            {snapshot ? (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>{snapshot.user.email ?? snapshot.user.name ?? snapshot.user.id}</h2>
                        <p>Resolver compartilhado: {snapshot.access.effectiveTier} / {snapshot.access.accessState} / {snapshot.access.billingStatus}</p>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <span>Quota</span>
                            <strong>{snapshot.access.quota.used}/{snapshot.access.quota.limit}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span>Subscriptions</span>
                            <strong>{snapshot.subscriptions.length}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span>Grants</span>
                            <strong>{snapshot.grants.length}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span>Eventos</span>
                            <strong>{snapshot.events.length}</strong>
                        </div>
                    </div>

                    <div className={`${styles.tableWrapper} ${styles.sectionOffsetLarge}`}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Detalhe</th>
                                    <th>Criado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {snapshot.grants.map((grant) => (
                                    <tr key={grant.id}>
                                        <td>grant</td>
                                        <td>{grant.status}</td>
                                        <td>{grant.entitlementKey} / {grant.reasonCode}</td>
                                        <td>{grant.createdAt.toLocaleString('pt-BR')}</td>
                                    </tr>
                                ))}
                                {snapshot.attempts.map((attempt) => (
                                    <tr key={attempt.id}>
                                        <td>checkout</td>
                                        <td>{attempt.status}</td>
                                        <td>{attempt.internalPriceKey}</td>
                                        <td>{attempt.createdAt.toLocaleString('pt-BR')}</td>
                                    </tr>
                                ))}
                                {snapshot.events.map((event) => (
                                    <tr key={event.id}>
                                        <td>event</td>
                                        <td>{event.eventType}</td>
                                        <td>{event.targetType}</td>
                                        <td>{event.createdAt.toLocaleString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={`${styles.statsGrid} ${styles.sectionOffsetLarge}`}>
                        <form action={supportNoteAction} className={styles.statCard}>
                            <input type="hidden" name="userId" value={snapshot.user.id} />
                            <span>Nota de suporte</span>
                            <input name="category" defaultValue="billing_support" aria-label="Categoria da nota" />
                            <textarea name="note" aria-label="Nota de suporte" placeholder="Resumo operacional e evidencia observada" rows={4} />
                            <button className={styles.actionButton} type="submit">
                                Registrar nota
                            </button>
                        </form>

                        {canMutate ? (
                            <>
                                <form action={createManualGrantAction} className={styles.statCard}>
                                    <input type="hidden" name="userId" value={snapshot.user.id} />
                                    <span>Grant manual admin-only</span>
                                    <select name="tier" defaultValue="pro" aria-label="Tier do grant">
                                        <option value="pro">pro</option>
                                        <option value="founder">founder</option>
                                    </select>
                                    <input name="entitlementKey" defaultValue="coach.full_plan" aria-label="Entitlement key" />
                                    <input name="reasonCode" placeholder="reason code" aria-label="Reason code" required />
                                    <input name="quotaBoost" defaultValue="0" aria-label="Quota boost" />
                                    <input name="endsAt" type="datetime-local" aria-label="Fim opcional" />
                                    <textarea name="auditNote" aria-label="Audit note do grant" placeholder="Motivo, aprovador e referencia" rows={3} required />
                                    <button className={styles.actionButton} type="submit">
                                        Criar grant
                                    </button>
                                </form>

                                <form action={applySuspensionAction} className={styles.statCard}>
                                    <input type="hidden" name="userId" value={snapshot.user.id} />
                                    <span>Suspensao auditada</span>
                                    <select name="reason" defaultValue="manual" aria-label="Motivo da suspensao">
                                        <option value="manual">manual</option>
                                        <option value="fraud">fraud</option>
                                        <option value="chargeback">chargeback</option>
                                        <option value="abuse">abuse</option>
                                    </select>
                                    <textarea name="auditNote" aria-label="Audit note da suspensao" placeholder="Evidencia e caminho de rollback" rows={4} required />
                                    <button className={styles.actionButton} type="submit">
                                        Suspender
                                    </button>
                                </form>

                                <form action={reconciliationAction} className={styles.statCard}>
                                    <input type="hidden" name="userId" value={snapshot.user.id} />
                    <span>Reconciliacao Stripe</span>
                                    <p>Registra pedido auditavel para conferir a verdade Stripe sem mudar acesso local diretamente.</p>
                                    <button className={styles.actionButton} type="submit">
                                        Forcar reconciliacao
                                    </button>
                                </form>
                            </>
                        ) : null}
                    </div>

                    {canMutate && snapshot.grants.length > 0 ? (
                        <div className={`${styles.tableWrapper} ${styles.sectionOffsetLarge}`}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Grant</th>
                                        <th>Status</th>
                                        <th>Revogacao</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {snapshot.grants.map((grant) => (
                                        <tr key={`revoke-${grant.id}`}>
                                            <td>{grant.entitlementKey}</td>
                                            <td>{grant.status}</td>
                                            <td>
                                                <form action={revokeGrantAction} className={styles.revokeForm}>
                                                    <input type="hidden" name="grantId" value={grant.id} />
                                                    <input name="reasonCode" defaultValue="manual_revoke" aria-label="Reason revoke" />
                                                    <input name="auditNote" defaultValue="Revogado via suporte operacional de billing." aria-label="Audit revoke" />
                                                    <button className={styles.actionButton} type="submit">
                                                        Revogar
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </section>
            ) : (
                <section className={styles.section}>
                    <h2>Nenhum usuario selecionado</h2>
                    <p>Use o lookup para abrir um snapshot operacional de billing e entitlement.</p>
                </section>
            )}
        </div>
    );
}
