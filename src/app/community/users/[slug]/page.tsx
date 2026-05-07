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
type CommunityProfilePublicSetup = NonNullable<CommunityPublicProfileViewModel['publicSetup']>;
type CommunityProfileRelatedLink = CommunityPublicProfileViewModel['relatedLinks'][number];
type CommunityProfileTrustSignal = CommunityPublicProfileViewModel['trustSignals'][number];
type CommunityProfileReward = CommunityPublicProfileViewModel['publicRewards'][number];
type CommunityProfileStreak = CommunityPublicProfileViewModel['streak'];
type CommunityProfileSquadIdentity = NonNullable<CommunityPublicProfileViewModel['squadIdentity']>;

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
        hint: 'gente acompanhando',
    },
    {
        key: 'publicPostCount',
        label: 'Posts publicos',
        hint: 'posts abertos',
    },
    {
        key: 'likeCount',
        label: 'Curtidas',
        hint: 'curtidas recebidas',
    },
    {
        key: 'commentCount',
        label: 'Comentarios',
        hint: 'respostas da comunidade',
    },
    {
        key: 'copyCount',
        label: 'Copias',
        hint: 'setup aproveitado',
    },
    {
        key: 'saveCount',
        label: 'Saves',
        hint: 'post guardado',
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

function hasSetupValue(value: string | number | null): boolean {
    return typeof value === 'number' || Boolean(value?.trim());
}

function hasPublicSetupData(
    publicSetup: CommunityPublicProfileViewModel['publicSetup'],
): publicSetup is CommunityProfilePublicSetup {
    if (!publicSetup) {
        return false;
    }

    return [
        ...Object.values(publicSetup.aimSetup),
        ...Object.values(publicSetup.surfaceGrip),
        ...Object.values(publicSetup.pubgCore),
    ].some(hasSetupValue);
}

function formatSetupValue(
    value: string | number | null,
    options: {
        readonly suffix?: string;
        readonly decimals?: number;
    } = {},
): string {
    if (typeof value === 'number') {
        const formattedValue = typeof options.decimals === 'number'
            ? value.toFixed(options.decimals).replace(/\.?0+$/, '')
            : String(value);

        return `${formattedValue}${options.suffix ?? ''}`;
    }

    const normalizedValue = value?.trim();

    return normalizedValue || 'Nao informado';
}

function formatRewardDisplayStateLabel(displayState: CommunityProfileReward['displayState']): string {
    switch (displayState) {
        case 'equipped':
            return 'Em uso';
        case 'hidden':
            return 'Oculto';
        case 'visible':
        default:
            return 'Visivel';
    }
}

function formatStreakStateLabel(streakState: CommunityProfileStreak['streakState']): string {
    switch (streakState) {
        case 'active':
            return 'Ativo';
        case 'at_risk':
            return 'Em risco';
        case 'reentry':
            return 'Retorno';
        case 'inactive':
        default:
            return 'Sem sequencia';
    }
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
            title: 'Perfil da comunidade nao encontrado',
        };
    }

    const title = `${viewModel.identity.displayName} | Comunidade Sens PUBG`;
    const description = viewModel.identity.headline
        ?? viewModel.identity.bio
        ?? `Perfil publico de @${viewModel.identity.slug} na comunidade Sens PUBG.`;

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
                    Post publico
                </span>
            )}
        </div>
    );
}

function ProfileTrustSignalRail({
    signals,
}: {
    readonly signals: readonly CommunityProfileTrustSignal[];
}): JSX.Element | null {
    if (signals.length === 0) {
        return null;
    }

    return (
        <div
            aria-label="Sinais publicos explicaveis do perfil"
            className={styles.trustSignalRail}
            data-community-layout="stable-trust-rail"
            data-community-section="profile-trust-rail"
        >
            {signals.map((signal) => (
                <article
                    key={signal.key}
                    aria-label={`${signal.label}: ${signal.reason}`}
                    className={styles.trustSignalPlate}
                    data-community-signal="community-trust-signal"
                >
                    <span className={styles.trustSignalLabel}>{signal.label}</span>
                    <p className={styles.trustSignalReason}>{signal.reason}</p>
                    {signal.count !== null ? (
                        <span className={styles.trustSignalCount}>{signal.count}</span>
                    ) : null}
                </article>
            ))}
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
                Ver posts
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
                        <span className={styles.boardEyebrow}>Perfil do jogador</span>
                        <h1 className={styles.profileTitle}>{viewModel.identity.displayName}</h1>
                        <div className={styles.profileSlugRail}>
                            <span className={styles.loadoutChipMuted}>@{viewModel.identity.slug}</span>
                            {creatorBadge ? (
                                <span className={styles.creatorBadge}>{creatorBadge.label}</span>
                            ) : (
                                <span className={styles.authorMeta}>Jogador da comunidade</span>
                            )}
                        </div>
                        {viewModel.identity.headline ? (
                            <p className={styles.profileLead}>{viewModel.identity.headline}</p>
                        ) : null}
                        {viewModel.identity.bio ? (
                            <p className={styles.profileBio}>{viewModel.identity.bio}</p>
                        ) : (
                            <p className={styles.profileBio}>
                                Esse jogador ainda nao escreveu uma bio publica.
                            </p>
                        )}
                    </div>
                </div>

                <aside
                    aria-label="Acoes do perfil publico"
                    className={styles.profileControlPlate}
                >
                    <span className={styles.sectionKicker}>O que fazer aqui</span>
                    <p>
                        Perfil publico pronto para compartilhar. Siga, copie o link ou reporte se
                        encontrar algo que quebre a confianca deste espaco.
                    </p>
                    <ProfileActionDeck
                        canonicalProfileUrl={canonicalProfileUrl}
                        viewModel={viewModel}
                        viewerCanReport={viewerCanReport}
                    />
                </aside>
            </div>

            <ProfileSpotlightDeck viewModel={viewModel} />

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
                    Sem links publicos por enquanto.
                </p>
            )}

            <ProfileTrustSignalRail signals={viewModel.trustSignals} />

            {viewModel.follow.disabledReason ? (
                <p className={styles.profileStatusNote}>{viewModel.follow.disabledReason}</p>
            ) : null}
        </section>
    );
}

function ProfileSpotlightDeck({
    viewModel,
}: {
    readonly viewModel: CommunityPublicProfileViewModel;
}): JSX.Element {
    const latestPost = viewModel.posts[0] ?? null;
    const saveAndCopyCount = viewModel.metrics.saveCount + viewModel.metrics.copyCount;
    const proofCards = [
        {
            label: 'Posts abertos',
            value: String(viewModel.metrics.publicPostCount),
            summary: viewModel.metrics.publicPostCount > 0
                ? 'recortes publicos reais para abrir neste perfil.'
                : 'nenhum post publico aberto por enquanto.',
        },
        {
            label: 'Seguidores',
            value: String(viewModel.metrics.followerCount),
            summary: viewModel.metrics.followerCount > 0
                ? 'pessoas voltando para acompanhar este jogador.'
                : 'ainda sem seguidores visiveis.',
        },
        {
            label: 'Saves + copias',
            value: String(saveAndCopyCount),
            summary: saveAndCopyCount > 0
                ? 'retornos publicos que nasceram dos posts abertos.'
                : 'sem retorno publico suficiente para virar prova forte ainda.',
        },
    ] as const;
    const emptyStateActionHref = viewModel.emptyState?.primaryAction.href ?? '/community';
    const emptyStateActionLabel = viewModel.emptyState?.primaryAction.label ?? 'Explorar comunidade';

    return (
        <div
            className={styles.profileSpotlightGrid}
            data-community-section="profile-spotlight"
        >
            <article
                className={styles.profileSpotlightCard}
                data-community-section="profile-recent-work"
            >
                <div className={styles.sectionHeader}>
                    <div>
                        <span className={styles.sectionKicker}>Trabalho recente</span>
                        <h2 className={styles.sectionTitle}>
                            {latestPost ? latestPost.title : viewModel.emptyState?.title ?? 'Ainda sem post aberto'}
                        </h2>
                    </div>
                    {latestPost ? (
                        <time className={styles.snapshotDate} dateTime={latestPost.publishedAtIso}>
                            {dateFormatter.format(latestPost.publishedAt)}
                        </time>
                    ) : null}
                </div>

                {latestPost ? (
                    <>
                        <ProfileLoadoutChips tags={latestPost.analysisTags} />
                        <p className={styles.sectionSummary}>{latestPost.excerpt}</p>
                        <div className={styles.snapshotFooter}>
                            <Link className={styles.cardAction} href={latestPost.href}>
                                Abrir post mais recente
                            </Link>
                        </div>
                    </>
                ) : (
                    <>
                        <p className={styles.sectionSummary}>
                            {viewModel.emptyState?.body ?? 'Este jogador ainda nao abriu um post publico.'}
                        </p>
                        <div className={styles.emptyActions}>
                            <Link className="btn btn-primary" href={emptyStateActionHref}>
                                {emptyStateActionLabel}
                            </Link>
                        </div>
                    </>
                )}
            </article>

            <div className={styles.profileSpotlightRail}>
                <div
                    className={styles.profileProofGrid}
                    data-community-layout="profile-proof-grid"
                >
                    {proofCards.map((card) => (
                        <article
                            key={card.label}
                            className={styles.profileProofPlate}
                        >
                            <span className={styles.profileProofLabel}>{card.label}</span>
                            <strong className={styles.profileProofValue}>{card.value}</strong>
                            <p className={styles.profileProofSummary}>{card.summary}</p>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SetupMetric({
    label,
    value,
}: {
    readonly label: string;
    readonly value: string;
}): JSX.Element {
    return (
        <div className={styles.setupMetricRow}>
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function SetupPlate({
    title,
    subtitle,
    metrics,
}: {
    readonly title: string;
    readonly subtitle: string;
    readonly metrics: readonly {
        readonly label: string;
        readonly value: string;
    }[];
}): JSX.Element {
    return (
        <article
            aria-label={title}
            className={styles.setupPlate}
            data-community-card="setup-plate"
        >
            <div className={styles.setupPlateHeader}>
                <span className={styles.sectionKicker}>Setup</span>
                <h3>{title}</h3>
                <p>{subtitle}</p>
            </div>

            <dl className={styles.setupMetricList}>
                {metrics.map((metric) => (
                    <SetupMetric
                        key={metric.label}
                        label={metric.label}
                        value={metric.value}
                    />
                ))}
            </dl>
        </article>
    );
}

function ProfileSetupEmptyState({
    isSelfProfile,
}: {
    readonly isSelfProfile: boolean;
}): JSX.Element {
    return (
        <section
            className={styles.sectionShell}
            data-community-section="profile-public-setup"
        >
            <div className={styles.emptyState}>
                <span className={styles.emptyKicker}>Setup</span>
                <h2>{isSelfProfile ? 'Mostre seu setup' : 'Setup ainda nao apareceu'}</h2>
                <p>
                    {isSelfProfile
                        ? 'Abra seu perfil e preencha mouse, mousepad e sensibilidade para mostrar seu jeito de jogar aqui.'
                        : 'Este jogador ainda nao abriu mouse, mousepad ou sensibilidade no perfil publico.'}
                </p>
                <div className={styles.emptyActions}>
                    <Link
                        className={isSelfProfile ? 'btn btn-primary' : styles.cardAction}
                        href={isSelfProfile ? '/profile/settings' : '/community'}
                    >
                        {isSelfProfile ? 'Abrir meu perfil' : 'Voltar para comunidade'}
                    </Link>
                </div>
            </div>
        </section>
    );
}

function ProfileSetupShowcase({
    publicSetup,
    isSelfProfile,
}: {
    readonly publicSetup: CommunityPublicProfileViewModel['publicSetup'];
    readonly isSelfProfile: boolean;
}): JSX.Element {
    if (!hasPublicSetupData(publicSetup)) {
        return <ProfileSetupEmptyState isSelfProfile={isSelfProfile} />;
    }

    return (
        <section
            className={styles.sectionShell}
            data-community-section="profile-public-setup"
        >
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Setup aberto</span>
                    <h2 className={styles.sectionTitle}>Como esse jogador configura o jogo</h2>
                </div>
                <p className={styles.sectionSummary}>
                    So aparece o que o jogador decidiu deixar publico.
                </p>
            </div>

            <div className={styles.setupPlateGrid}>
                <SetupPlate
                    title="Mouse e sensor"
                    subtitle="Mouse, sensor, DPI e polling rate usados nas analises."
                    metrics={[
                        {
                            label: 'Mouse',
                            value: formatSetupValue(publicSetup.aimSetup.mouseModel),
                        },
                        {
                            label: 'Sensor',
                            value: formatSetupValue(publicSetup.aimSetup.mouseSensor),
                        },
                        {
                            label: 'DPI',
                            value: formatSetupValue(publicSetup.aimSetup.mouseDpi),
                        },
                        {
                            label: 'Polling',
                            value: formatSetupValue(publicSetup.aimSetup.mousePollingRate, { suffix: ' Hz' }),
                        },
                    ]}
                />
                <SetupPlate
                    title="Mousepad e grip"
                    subtitle="Superficie, pegada e estilo que acompanham o spray."
                    metrics={[
                        {
                            label: 'Mousepad',
                            value: formatSetupValue(publicSetup.surfaceGrip.mousepadModel),
                        },
                        {
                            label: 'Surface',
                            value: formatSetupValue(publicSetup.surfaceGrip.mousepadType),
                        },
                        {
                            label: 'Grip',
                            value: formatSetupValue(publicSetup.surfaceGrip.gripStyle),
                        },
                        {
                            label: 'Pivot',
                            value: formatSetupValue(publicSetup.surfaceGrip.playStyle),
                        },
                    ]}
                />
                <SetupPlate
                    title="Sens do PUBG"
                    subtitle="Sensibilidade base aberta para comparar com seus posts."
                    metrics={[
                        {
                            label: 'General',
                            value: formatSetupValue(publicSetup.pubgCore.generalSens),
                        },
                        {
                            label: 'ADS',
                            value: formatSetupValue(publicSetup.pubgCore.adsSens),
                        },
                        {
                            label: 'Vert. Mult',
                            value: formatSetupValue(publicSetup.pubgCore.verticalMultiplier, { suffix: 'x' }),
                        },
                        {
                            label: 'FOV',
                            value: formatSetupValue(publicSetup.pubgCore.fov),
                        },
                    ]}
                />
            </div>
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
                    <span className={styles.sectionKicker}>Numeros publicos</span>
                    <h2 className={styles.sectionTitle}>Como esse perfil se move na comunidade</h2>
                </div>
                <p className={styles.sectionSummary}>
                    Aqui entram so sinais reais: seguidores, posts, comentarios, curtidas, saves
                    e copias.
                </p>
            </div>

            <dl className={styles.profileMetricGrid}>
                {profileMetricCards.map((metric) => (
                    <div
                        key={metric.key}
                        className={styles.profileMetricPlate}
                        data-community-layout="stable-metric-plate"
                    >
                        <dt>{metric.label}</dt>
                        <dd>{metrics[metric.key]}</dd>
                        <span>{metric.hint}</span>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function RecognitionSection({
    rewards,
    streak,
    squadIdentity,
}: {
    readonly rewards: readonly CommunityProfileReward[];
    readonly streak: CommunityProfileStreak;
    readonly squadIdentity: CommunityPublicProfileViewModel['squadIdentity'];
}): JSX.Element {
    return (
        <section className={styles.sectionShell}>
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Reconhecimento publico</span>
                    <h2 className={styles.sectionTitle}>O que este perfil ja sustentou em publico</h2>
                </div>
                <p className={styles.sectionSummary}>
                    Aqui entram so rewards public-safe, streak factual e identidade coletiva com exibicao permitida.
                </p>
            </div>

            <div className={styles.profileRecognitionGrid}>
                <RewardStrip rewards={rewards} />
                <StreakSummaryCard streak={streak} />
                <SquadIdentityCard squadIdentity={squadIdentity} />
            </div>
        </section>
    );
}

function RewardStrip({
    rewards,
}: {
    readonly rewards: readonly CommunityProfileReward[];
}): JSX.Element {
    return (
        <article
            className={styles.recognitionPlate}
            data-community-layout="stable-reward-rail"
            data-community-section="profile-reward-strip"
        >
            <div className={styles.ritualPanelHeader}>
                <span className={styles.sectionKicker}>Rewards</span>
                <span className={styles.loadoutChipMuted}>
                    {rewards.length === 1 ? '1 marca visivel' : `${rewards.length} marcas visiveis`}
                </span>
            </div>
            <h3>Marcas publicas</h3>
            <p>
                So entram rewards liberados de forma publica, factual e verificavel.
            </p>

            {rewards.length > 0 ? (
                <div className={styles.rewardRail}>
                    {rewards.map((reward) => (
                        <article key={reward.id} className={styles.rewardItem}>
                            <div className={styles.rewardHeadline}>
                                <strong className={styles.rewardLabel}>
                                    {reward.shortLabel ?? reward.label}
                                </strong>
                                <span className={styles.loadoutChipMuted}>
                                    {formatRewardDisplayStateLabel(reward.displayState)}
                                </span>
                            </div>
                            <p>{reward.factualContext}</p>
                            {reward.description ? (
                                <p className={styles.ritualMeta}>{reward.description}</p>
                            ) : null}
                        </article>
                    ))}
                </div>
            ) : (
                <div className={styles.rewardItem}>
                    <span className={styles.rewardMeta}>Sem reward publico</span>
                    <p>
                        Ainda nao existe reward publico liberado para este perfil.
                    </p>
                </div>
            )}
        </article>
    );
}

function StreakSummaryCard({
    streak,
}: {
    readonly streak: CommunityProfileStreak;
}): JSX.Element {
    return (
        <article
            className={styles.recognitionPlate}
            data-community-section="profile-streak-summary"
        >
            <div className={styles.ritualPanelHeader}>
                <span className={styles.sectionKicker}>Ritmo</span>
                <span className={styles.loadoutChipMuted}>{formatStreakStateLabel(streak.streakState)}</span>
            </div>
            <h3>{streak.title}</h3>
            <p>{streak.summary}</p>
            <div className={styles.ritualStatGrid}>
                <div className={styles.ritualStat}>
                    <span>Agora</span>
                    <strong>{streak.currentStreak}</strong>
                </div>
                <div className={styles.ritualStat}>
                    <span>Melhor marca</span>
                    <strong>{streak.longestStreak}</strong>
                </div>
            </div>
        </article>
    );
}

function SquadIdentityCard({
    squadIdentity,
}: {
    readonly squadIdentity: CommunityPublicProfileViewModel['squadIdentity'];
}): JSX.Element {
    return (
        <article
            className={styles.recognitionPlate}
            data-community-section="profile-squad-identity"
        >
            <div className={styles.ritualPanelHeader}>
                <span className={styles.sectionKicker}>Squad</span>
                <span className={styles.loadoutChipMuted}>
                    {squadIdentity ? 'Publico' : 'Sem identidade aberta'}
                </span>
            </div>

            {squadIdentity ? (
                <ProfileSquadIdentityBody squadIdentity={squadIdentity} />
            ) : (
                <>
                    <h3>Sem identidade coletiva aberta</h3>
                    <p>
                        Este jogador ainda nao liberou uma identidade coletiva publica aqui.
                    </p>
                    <Link className={styles.cardAction} href="/community">
                        Voltar para comunidade
                    </Link>
                </>
            )}
        </article>
    );
}

function ProfileSquadIdentityBody({
    squadIdentity,
}: {
    readonly squadIdentity: CommunityProfileSquadIdentity;
}): JSX.Element {
    return (
        <>
            <h3>{squadIdentity.name}</h3>
            <div className={styles.profileSlugRail}>
                <span className={styles.loadoutChipMuted}>#{squadIdentity.slug}</span>
            </div>
            <p>
                {squadIdentity.description
                    ?? 'Identidade coletiva liberada com exibicao publica permitida.'}
            </p>
            <Link className={styles.cardAction} href="/community">
                Ver comunidade
            </Link>
        </>
    );
}

function ProfileRelatedLinkPlate({
    link,
}: {
    readonly link: CommunityProfileRelatedLink;
}): JSX.Element {
    return (
        <article className={styles.relatedPlate}>
            <span className={styles.sectionKicker}>Explorar depois</span>
            <h3>{link.label}</h3>
            <p>{link.description}</p>
            <Link className={styles.cardAction} href={link.href}>
                Ver posts
            </Link>
        </article>
    );
}

function ProfileRelatedContentLinks({
    links,
}: {
    readonly links: readonly CommunityProfileRelatedLink[];
}): JSX.Element | null {
    if (links.length === 0) {
        return null;
    }

    return (
        <section
            className={styles.sectionShell}
            data-community-section="profile-related-links"
        >
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Continuar descobrindo</span>
                    <h2 className={styles.sectionTitle}>Caminhos relacionados</h2>
                </div>
                <p className={styles.sectionSummary}>
                    Atalhos montados a partir dos posts publicos deste perfil.
                </p>
            </div>

            <div className={styles.relatedGrid}>
                {links.map((link) => (
                    <ProfileRelatedLinkPlate key={link.key} link={link} />
                ))}
            </div>
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
                    <span className={styles.sectionKicker}>Post publico</span>
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
            aria-label="Posts publicos do perfil"
            className={styles.sectionShell}
            data-community-section="profile-snapshots"
            id="profile-snapshots"
        >
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Posts do jogador</span>
                    <h2 className={styles.sectionTitle}>Posts publicos</h2>
                </div>
                <p className={styles.sectionSummary}>
                    {posts.length === 1
                        ? '1 post publico para abrir.'
                        : `${posts.length} posts publicos para abrir.`}
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
                    <span className={styles.emptyKicker}>Sem posts ainda</span>
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
                    <ProfileSetupShowcase
                        isSelfProfile={viewModel.follow.isSelfProfile}
                        publicSetup={viewModel.publicSetup}
                    />
                    <RecognitionSection
                        rewards={viewModel.publicRewards}
                        squadIdentity={viewModel.squadIdentity}
                        streak={viewModel.streak}
                    />
                    <ProfileMetricStrip metrics={viewModel.metrics} />
                    <ProfilePostShowcase
                        emptyState={viewModel.emptyState}
                        posts={viewModel.posts}
                    />
                    <ProfileRelatedContentLinks links={viewModel.relatedLinks} />
                </main>
            </div>
        </>
    );
}
