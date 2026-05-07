import { notFound } from 'next/navigation';

import { resolveWeaponSupportStatus } from '@/ui/components/weapon-support-status';
import { weaponVisualRegistry } from '@/ui/components/weapon-visual-registry';
import { WeaponIcon } from '@/ui/components/weapon-icon';

import styles from './weapon-icons.module.css';

export const metadata = {
    title: 'Phase 7 Weapon Icon Matrix',
};

export default function Phase7WeaponIconMatrixPage() {
    if (process.env.NODE_ENV === 'production') {
        notFound();
    }

    return (
        <main className={styles.page}>
            <div className={styles.shell}>
                <header className={styles.header}>
                    <p className={styles.eyebrow}>Phase 7 visual verification</p>
                    <h1 className={styles.title}>29 weapon visual catalog</h1>
                    <p className={styles.body}>
                        Development-only matrix for PUBG API weapon renders, authored fallbacks, and support-status copy.
                    </p>
                </header>

                <section aria-label="29 weapon visuals" className={styles.grid} data-weapon-grid>
                    {weaponVisualRegistry.map((entry) => {
                        const status = resolveWeaponSupportStatus({
                            weaponId: entry.id,
                            weaponName: entry.displayName,
                            category: entry.category,
                        });

                        return (
                            <article
                                className={styles.card}
                                data-silhouette-id={entry.silhouetteId}
                                data-support-kind={status.kind}
                                data-weapon-grid-card
                                key={entry.id}
                            >
                                <div className={styles.visual}>
                                    <WeaponIcon
                                        showStatus
                                        size={80}
                                        weaponId={entry.id}
                                        weaponName={entry.displayName}
                                    />
                                </div>
                                <h2 className={styles.name}>{entry.displayName}</h2>
                                <div className={styles.meta}>
                                    <span className={styles.chip}>{entry.category}</span>
                                    <span className={styles.chip}>{status.label}</span>
                                </div>
                            </article>
                        );
                    })}
                </section>
            </div>
        </main>
    );
}
