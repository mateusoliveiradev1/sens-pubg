import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';

import { auth } from '@/auth';
import {
    getPublicCommunityProfileViewModel,
    type CommunityPublicProfilePostCard,
    type CommunityPublicProfileViewModel,
} from '@/core/community-public-profile-view-model';
import { Header } from '@/ui/components/header';

import { CommunityAvatar } from '../../community-avatar';
import styles from '../../community-hub.module.css';
import { ReportButton } from '../../report-button';
import { FollowButton } from './follow-button';
import { ProfileShareButton } from './profile-share-button';

export const dynamic = 'force-dynamic';

interface CommunityUserProfilePageProps {
    readonly params: Promise<{
        readonly slug: string;
    }>;
}

type CommunityProfileMetricKey = keyof CommunityPublicProfileViewModel['metrics'];
type CommunityProfileTag = CommunityPublicProfilePostCard['analysisTags'][number];

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const profileMetricCards: readonly {
    readonly key: CommunityProfileMetricKey;
    readonly label: string;
    readonly hint: string;
}[] = [
    {
        key: 'followerCount',
        label: 'Seguidores',
        hint: 'sinal da squad',
    },
    {
        key: 'publicPostCount',
        label: 'Posts publicos',
        hint: 'snapshots publicados',
    },
    {
        key: 'likeCount',
        label: 'Curtidas',
        hint: 'leitura aprovada',
    },
    {
        key: 'commentCount',
        label: 'Comentarios',
        hint: 'review da comunidade',
    },
    {
        key: 'copyCount',
        label: 'Copias',
        hint: 'presets copiados',
    },
    {
        key: 'saveCount',
        label: 'Saves',
        hint: 'drills guardados',
    },
];

function createCanonicalProfileUrl(canonicalPath: string): string {
    try {
        return new URL(
            canonicalPath,
            process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        ).toString();
    } catch {
        return `http://localhost:3000${canonicalPath}`;
    }
}

function createTagFilterHref(tag: CommunityProfileTag): string {
    const queryKeyByTagKey = {
        weapon: 'weaponId',
        patch: 'patchVersion',
        diagnosis: 'diagnosisKey',
    } as const;

    return `/community?${new URLSearchParams({
        [queryKeyByTagKey[tag.key]]: tag.value,
    }).toString()}`;
}

export async function generateMetadata({
    params,
}: CommunityUserProfilePageProps): Promise<Metadata> {
    const { slug } = await params;
    const viewModel = await getPublicCommunityProfileViewModel({
        slug,
        viewerUserId: null,
    });

    if (!viewModel) {
        return {
            title: 'Perfil publico nao encontrado',
        };
    }

    const title = `${viewModel.identity.displayName} | Comunidade PUBG Aim Analyzer`;
    const description = viewModel.identity.headline
        ?? viewModel.identity.bio
        ?? `Perfil publico de @${viewModel.identity.slug} na comunidade PUBG Aim Analyzer.`;

    return {
        title,
        description,
        alternates: {
            canonical: viewModel.identity.canonicalPath,
        },
        openGraph: {
            title,
            description,
            url: viewModel.identity.canonicalPath,
            type: 'profile',
        },
        twitter: {
            card: 'summary',
            title,
            description,
        },
    };
}

function OperatorMark({
    avatarUrl,
    displayName,
    fallbackInitials,
}: {
    readonly avatarUrl: string | null;
    readonly displayName: string;
    readonly fallbackInitials: string;
}): JSX.Element {
    return (
        <CommunityAvatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            fallbackAriaLabel={`Monograma de ${displayName}`}
            fallbackClassName={styles.operatorMarkFallback}
            fallbackInitials={fallbackInitials}
            imageClassName={styles.operatorMarkImage}
            size={96}
        />
    );
}

function ProfileLoadoutChips({
    tags,
}: {
    readonly tags: readonly CommunityProfileTag[];
}): JSX.Element {
    return (
        <div className={styles.loadoutChips}>
            {tags.length > 0 ? tags.map((tag) => (
                <Link
                    key={`${tag.key}-${tag.value}`}
                    className={styles.loadoutChip}
                    data-community-chip="loadout-chip"
                    href={createTagFilterHref(tag)}
                >
                    {tag.label}
                </Link>
            )) : (
                <span className={styles.loadoutChipMuted} data-community-chip="loadout-chip">
                    Snapshot publico
                </span>
            )}
        </div>
    );
}

function ProfileActionDeck({
    viewModel,
    canonicalProfileUrl,
    viewerCanReport,
}: {
    readonly viewModel: CommunityPublicProfileViewModel;
    readonly canonicalProfileUrl: string;
    readonly viewerCanReport: boolean;
}): JSX.Element {
    const cardActionClassName = styles.cardAction || 'btn btn-secondary';

    return (
        <div className={styles.profileActionDeck}>
            <Link className={styles.cardAction} href="/community">
                Voltar para comunidade
            </Link>
            <Link className={styles.cardAction} href="#profile-snapshots">
                Ver snapshots
            </Link>

            {viewModel.follow.canFollow ? (
                <FollowButton
                    className={cardActionClassName}
                    initialFollowerCount={viewModel.follow.followerCount}
                    initialFollowing={viewModel.follow.viewerIsFollowing}
                    slug={viewModel.identity.slug}
                />
            ) : viewModel.follow.isSelfProfile ? (
                <span className={styles.profileStatusNote}>{viewModel.follow.actionLabel}</span>
            ) : (
                <Link className={styles.cardAction} href="/login">
                    {viewModel.follow.actionLabel}
                </Link>
            )}

            <ProfileShareButton
                canonicalUrl={canonicalProfileUrl}
                className={cardActionClassName}
                title={`${viewModel.identity.displayName} na comunidade`}
            />

            <ReportButton
                className={cardActionClassName}
                disabledHref={viewerCanReport ? undefined : '/login'}
                disabledReason={viewerCanReport ? null : 'Entre na sua conta para reportar este perfil.'}
                entityId={viewModel.identity.profileId}
                entityType="profile"
                subjectLabel="este perfil"
            />
        </div>
    );
}

function OperatorProfileBoard({
    viewModel,
    canonicalProfileUrl,
    viewerCanReport,
}: {
    readonly viewModel: CommunityPublicProfileViewModel;
    readonly canonicalProfileUrl: string;
    readonly viewerCanReport: boolean;
}): JSX.Element {
    const creatorBadge = viewModel.identity.creatorBadge;

    return (
        <section
            className={`glass-card ${styles.operatorProfileBoard}`}
            data-community-section="operator-profile"
        >
            <div className={styles.operatorProfileGrid}>
                <div className={styles.profileIdentityCluster}>
                    <OperatorMark
                        avatarUrl={viewModel.identity.avatarUrl}
                        displayName={viewModel.identity.displayName}
                        fallbackInitials={viewModel.identity.fallbackInitials}
                    />

                    <div className={styles.profileCopy}>
                        <span className={styles.boardEyebrow}>Operator plate publico</span>
                        <h1 className={styles.profileTitle}>{viewModel.identity.displayName}</h1>
                        <div className={styles.profileSlugRail}>
                            <span className={styles.loadoutChipMuted}>@{viewModel.identity.slug}</span>
                            {creatorBadge ? (
                                <span className={styles.creatorBadge}>{creatorBadge.label}</span>
                            ) : (
                                <span className={styles.authorMeta}>Operador publico</span>
                            )}
                        </div>
                        <p className={styles.profileLead}>
                            {viewModel.identity.headline
                                ?? 'Perfil publico pronto para publicar snapshots de recoil.'}
                        </p>
                        <p className={styles.profileBio}>
                            {viewModel.identity.bio
                                ?? 'Acompanhe os posts publicos deste operador e volte para a comunidade para comparar setups, patch e diagnosticos.'}
                        </p>
                    </div>
                </div>

                <aside
                    aria-label="Acoes do perfil publico"
                    className={styles.profileControlPlate}
                >
                    <span className={styles.sectionKicker}>Navegacao da comunidade</span>
                    <p>
                        Link publico sem identificadores privados. Use para seguir o creator,
                        compartilhar a placa ou reportar um problema.
                    </p>
                    <ProfileActionDeck
                        canonicalProfileUrl={canonicalProfileUrl}
                        viewModel={viewModel}
                        viewerCanReport={viewerCanReport}
                    />
                </aside>
            </div>

            {viewModel.links.length > 0 ? (
                <div className={styles.profileExternalLinks} aria-label="Links publicos">
                    {viewModel.links.map((link) => (
                        <a
                            key={link.url}
                            className={styles.loadoutChip}
                            href={link.url}
                            rel={link.rel}
                            target={link.target}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
            ) : (
                <p className={styles.profileStatusNote}>
                    Sem links externos publicados neste perfil.
                </p>
            )}

            {viewModel.follow.disabledReason ? (
                <p className={styles.profileStatusNote}>{viewModel.follow.disabledReason}</p>
            ) : null}
        </section>
    );
}

function ProfileMetricStrip({
    metrics,
}: {
    readonly metrics: CommunityPublicProfileViewModel['metrics'];
}): JSX.Element {
    return (
        <section className={styles.sectionShell} data-community-section="profile-metrics">
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Stat plates publicos</span>
                    <h2 className={styles.sectionTitle}>Impacto do operador</h2>
                </div>
                <p className={styles.sectionSummary}>
                    Apenas atividade publica entra nestas placas: seguidores, posts publicados,
                    comentarios, curtidas, saves e presets copiados.
                </p>
            </div>

            <dl className={styles.profileMetricGrid}>
                {profileMetricCards.map((metric) => (
                    <div key={metric.key} className={styles.profileMetricPlate}>
                        <dt>{metric.label}</dt>
                        <dd>{metrics[metric.key]}</dd>
                        <span>{metric.hint}</span>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function ProfileSnapshotPlate({
    post,
}: {
    readonly post: CommunityPublicProfilePostCard;
}): JSX.Element {
    return (
        <article
            className={`${styles.snapshotPlate} ${styles.profileSnapshotPlate}`}
            data-community-card="snapshot-plate"
        >
            <div className={styles.snapshotHeader}>
                <div>
                    <span className={styles.sectionKicker}>Snapshot publico</span>
                    <h3 className={styles.snapshotTitle}>
                        <Link href={post.href}>{post.title}</Link>
                    </h3>
                </div>
                <time className={styles.snapshotDate} dateTime={post.publishedAtIso}>
                    {dateFormatter.format(post.publishedAt)}
                </time>
            </div>

            <ProfileLoadoutChips tags={post.analysisTags} />

            <div className={styles.snapshotBody}>
                <p className={styles.snapshotExcerpt}>{post.excerpt}</p>
            </div>

            <div className={styles.snapshotFooter}>
                <Link className={styles.cardAction} href={post.primaryAction.href}>
                    {post.primaryAction.label}
                </Link>
            </div>
        </article>
    );
}

function ProfilePostShowcase({
    posts,
    emptyState,
}: {
    readonly posts: readonly CommunityPublicProfilePostCard[];
    readonly emptyState: CommunityPublicProfileViewModel['emptyState'];
}): JSX.Element {
    return (
        <section
            aria-label="Snapshots publicos do perfil"
            className={styles.sectionShell}
            data-community-section="profile-snapshots"
            id="profile-snapshots"
        >
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Loadout/snapshot showcase</span>
                    <h2 className={styles.sectionTitle}>Analises publicas</h2>
                </div>
                <p className={styles.sectionSummary}>
                    {posts.length === 1
                        ? '1 snapshot publico pronto para abrir.'
                        : `${posts.length} snapshots publicos prontos para abrir.`}
                </p>
            </div>

            {posts.length > 0 ? (
                <div className={styles.profilePostGrid}>
                    {posts.map((post) => (
                        <ProfileSnapshotPlate key={post.id} post={post} />
                    ))}
                </div>
            ) : emptyState ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyKicker}>Sem posts publicados</span>
                    <h3>{emptyState.title}</h3>
                    <p>{emptyState.body}</p>
                    <div className={styles.emptyActions}>
                        <Link className="btn btn-primary" href={emptyState.primaryAction.href}>
                            {emptyState.primaryAction.label}
                        </Link>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

export default async function CommunityUserProfilePage({
    params,
}: CommunityUserProfilePageProps): Promise<JSX.Element> {
    const session = await auth();
    const { slug } = await params;
    const viewModel = await getPublicCommunityProfileViewModel({
        slug,
        viewerUserId: session?.user?.id ?? null,
    });

    if (!viewModel) {
        notFound();
    }

    const canonicalProfileUrl = createCanonicalProfileUrl(viewModel.identity.canonicalPath);
    const viewerCanReport = Boolean(session?.user?.id);

    return (
        <>
            <Header />

            <div className="page">
                <main className={`container ${styles.pageStack}`}>
                    <OperatorProfileBoard
                        canonicalProfileUrl={canonicalProfileUrl}
                        viewModel={viewModel}
                        viewerCanReport={viewerCanReport}
                    />
                    <ProfileMetricStrip metrics={viewModel.metrics} />
                    <ProfilePostShowcase
                        emptyState={viewModel.emptyState}
                        posts={viewModel.posts}
                    />
                </main>
            </div>
        </>
    );
}
