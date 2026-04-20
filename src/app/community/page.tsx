import type { Metadata } from 'next';
import Link from 'next/link';

import { auth } from '@/auth';
import {
    getCommunityDiscoveryViewModel,
    type CommunityDiscoveryEmptyState,
    type CommunityDiscoveryFilters,
    type CommunityDiscoveryPostCard,
    type CommunityDiscoveryViewModel,
} from '@/core/community-discovery-view-model';
import {
    buildCommunityFallbackInitials,
    formatCommunityCreatorStatusBadge,
} from '@/core/community-public-formatting';
import { Header } from '@/ui/components/header';

import { CommunityAvatar } from './community-avatar';
import { CommunityFilters } from './community-filters';
import styles from './community-hub.module.css';

export const metadata: Metadata = {
    title: 'Comunidade de Analises PUBG',
    description:
        'Explore analises publicas, setups copiaveis e diagnosticos por arma, patch e tipo de problema na comunidade.',
    alternates: {
        canonical: '/community',
    },
    openGraph: {
        title: 'Comunidade de Analises PUBG',
        description:
            'Explore analises publicas, setups copiaveis e diagnosticos por arma, patch e tipo de problema na comunidade.',
        url: '/community',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Comunidade de Analises PUBG',
        description:
            'Explore analises publicas, setups copiaveis e diagnosticos por arma, patch e tipo de problema na comunidade.',
    },
};

export const dynamic = 'force-dynamic';

type CommunityPageSearchParams = Record<string, string | string[] | undefined>;
type CommunityAnalysisTag = CommunityDiscoveryPostCard['analysisTags'][number];
type FeaturedPost = CommunityDiscoveryViewModel['featuredPosts']['items'][number];
type CreatorHighlight = CommunityDiscoveryViewModel['creatorHighlights']['items'][number];
type ParticipationPrompt = CommunityDiscoveryViewModel['participationPrompts'][number];
type TrendItem = CommunityDiscoveryViewModel['trendBoard']['items'][number];
type WeeklyDrillPrompt = CommunityDiscoveryViewModel['weeklyDrillPrompt'];
type SeasonContextCard = CommunityDiscoveryViewModel['seasonContext'];
type WeeklyChallengeBoard = CommunityDiscoveryViewModel['weeklyChallenge'];
type WeeklyChallengeAction = WeeklyChallengeBoard['actions'][number];
type ViewerProgressionSummary = NonNullable<CommunityDiscoveryViewModel['viewerProgressionSummary']>;
type MissionBoard = NonNullable<CommunityDiscoveryViewModel['missionBoard']>;
type MissionBoardItem = MissionBoard['items'][number];
type PersonalRecap = NonNullable<CommunityDiscoveryViewModel['personalRecap']>;
type SquadSpotlight = NonNullable<CommunityDiscoveryViewModel['squadSpotlight']>;
type TrustSignal = FeaturedPost['trustSignals'][number];

const COMMUNITY_PROFILE_PATH_PREFIX = '/community/users/';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function getSingleSearchParamValue(
    value: string | string[] | undefined,
): string | undefined {
    if (Array.isArray(value)) {
        return getSingleSearchParamValue(value[0]);
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function parseDiscoveryFilters(searchParams: CommunityPageSearchParams): CommunityDiscoveryFilters {
    const weaponId = getSingleSearchParamValue(searchParams.weaponId);
    const patchVersion = getSingleSearchParamValue(searchParams.patchVersion);
    const diagnosisKey = getSingleSearchParamValue(searchParams.diagnosisKey);

    return {
        ...(weaponId ? { weaponId } : {}),
        ...(patchVersion ? { patchVersion } : {}),
        ...(diagnosisKey ? { diagnosisKey } : {}),
    };
}

function createTagFilterHref(tag: CommunityAnalysisTag): string {
    const queryKeyByTagKey = {
        weapon: 'weaponId',
        patch: 'patchVersion',
        diagnosis: 'diagnosisKey',
    } as const;

    return `/community?${new URLSearchParams({
        [queryKeyByTagKey[tag.key]]: tag.value,
    }).toString()}`;
}

function normalizeCommunityProfileHref(href: string): string {
    return href.startsWith(COMMUNITY_PROFILE_PATH_PREFIX) ? href : '/community';
}

function LoadoutChip({ tag }: { readonly tag: CommunityAnalysisTag }): React.JSX.Element {
    return (
        <Link
            className={styles.loadoutChip}
            data-community-chip="loadout-chip"
            href={createTagFilterHref(tag)}
        >
            {tag.label}
        </Link>
    );
}

function TrustSignalRail({
    signals,
}: {
    readonly signals: readonly TrustSignal[];
}): React.JSX.Element | null {
    if (signals.length === 0) {
        return null;
    }

    return (
        <div
            aria-label="Sinais publicos explicaveis"
            className={styles.trustSignalRailCompact}
            data-community-layout="stable-trust-rail"
            data-community-section="community-trust-rail"
        >
            {signals.map((signal) => (
                <article
                    key={signal.key}
                    className={styles.trustSignalPill}
                    data-community-signal="community-trust-signal"
                >
                    <span className={styles.trustSignalLabel}>{signal.label}</span>
                    <span className={styles.trustSignalReason}>{signal.reason}</span>
                    {signal.count !== null ? (
                        <span className={styles.trustSignalCount}>{signal.count}</span>
                    ) : null}
                </article>
            ))}
        </div>
    );
}

function RecoilSignal({
    visiblePostCount,
    publicPostCount,
    hasActiveFilters,
}: {
    readonly visiblePostCount: number;
    readonly publicPostCount: number;
    readonly hasActiveFilters: boolean;
}): React.JSX.Element {
    return (
        <aside className={styles.recoilSignal} data-community-signal="recoil-signal">
            <div className={styles.signalCell}>
                <span className={styles.signalValue}>{visiblePostCount}</span>
                <span className={styles.signalLabel}>snapshots na mira</span>
            </div>
            <div className={styles.signalCell}>
                <span className={styles.signalValue}>{publicPostCount}</span>
                <span className={styles.signalLabel}>posts publicos</span>
            </div>
            <div className={styles.signalCell}>
                <span className={styles.signalValue}>{hasActiveFilters ? 'ON' : 'ALL'}</span>
                <span className={styles.signalLabel}>HUD de filtro</span>
            </div>
        </aside>
    );
}

function formatProgressPercent(value: number): string {
    return `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`;
}

function SquadBoard({ viewModel }: {
    readonly viewModel: CommunityDiscoveryViewModel;
}): React.JSX.Element {
    return (
        <section
            className={`glass-card ${styles.squadBoard}`}
            data-community-section="squad-board"
        >
            <div className={styles.boardLayout}>
                <div className={styles.boardCopy}>
                    <span className={styles.boardEyebrow}>Squad board tecnico</span>
                    <div className={styles.boardTitleGroup}>
                        <h1 className={styles.boardTitle}>Comunidade</h1>
                        <p className={styles.boardLead}>
                            Compare snapshots publicos, siga operadores que publicam bons setups e
                            encontre leitura de recoil por arma, patch e diagnostico.
                        </p>
                    </div>
                    <div className={styles.boardActions}>
                        <Link className="btn btn-primary" href="#community-feed">
                            Explorar posts
                        </Link>
                        <Link className="btn btn-secondary" href="/history">
                            Publicar analise
                        </Link>
                        <Link className="btn btn-ghost" href="/analyze">
                            Analisar recoil
                        </Link>
                    </div>
                </div>

                <RecoilSignal
                    hasActiveFilters={viewModel.filters.hasActiveFilters}
                    publicPostCount={viewModel.hubSummary.publicPostCount}
                    visiblePostCount={viewModel.hubSummary.visiblePostCount}
                />
            </div>
        </section>
    );
}

function AvatarPlate({
    displayName,
    avatarUrl,
    fallbackInitials,
}: {
    readonly displayName: string;
    readonly avatarUrl?: string | null;
    readonly fallbackInitials: string;
}): React.JSX.Element {
    return (
        <CommunityAvatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            fallbackAriaHidden
            fallbackClassName={styles.avatarFallback}
            fallbackInitials={fallbackInitials || buildCommunityFallbackInitials(displayName)}
            imageClassName={styles.avatarImage}
            size={44}
        />
    );
}

function AuthorLine({ card }: {
    readonly card: CommunityDiscoveryPostCard;
}): React.JSX.Element {
    const creatorBadge = formatCommunityCreatorStatusBadge(card.author.creatorProgramStatus);
    const authorName = card.author.displayName;
    const authorLabel = (
        <span className={styles.authorName}>{authorName}</span>
    );

    return (
        <div className={styles.authorLine}>
            <AvatarPlate
                avatarUrl={card.author.avatarUrl}
                displayName={authorName}
                fallbackInitials={card.author.fallbackInitials}
            />
            <div className={styles.authorCopy}>
                {card.author.profileHref ? (
                    <Link
                        className={styles.authorLink}
                        href={normalizeCommunityProfileHref(card.author.profileHref)}
                    >
                        {authorLabel}
                    </Link>
                ) : authorLabel}
                {creatorBadge ? (
                    <span className={styles.creatorBadge}>{creatorBadge.label}</span>
                ) : (
                    <span className={styles.authorMeta}>Operador publico</span>
                )}
            </div>
        </div>
    );
}

function LoadoutChips({ tags }: {
    readonly tags: readonly CommunityAnalysisTag[];
}): React.JSX.Element {
    return (
        <div className={styles.loadoutChips}>
            {tags.length > 0 ? tags.map((tag) => (
                <LoadoutChip key={`${tag.key}-${tag.value}`} tag={tag} />
            )) : (
                <span className={styles.loadoutChipMuted} data-community-chip="loadout-chip">
                    Snapshot publico
                </span>
            )}
        </div>
    );
}

function EngagementSignals({ engagement }: {
    readonly engagement: CommunityDiscoveryPostCard['engagement'];
}): React.JSX.Element {
    const signals = [
        ['Curtidas', engagement.likeCount],
        ['Comentarios', engagement.commentCount],
        ['Copias', engagement.copyCount],
        ['Saves', engagement.saveCount],
    ] as const;

    return (
        <dl className={styles.engagementSignals}>
            {signals.map(([label, value]) => (
                <div key={label} className={styles.engagementItem}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                </div>
            ))}
        </dl>
    );
}

function SnapshotPlate({ card }: {
    readonly card: CommunityDiscoveryPostCard;
}): React.JSX.Element {
    return (
        <article className={styles.snapshotPlate} data-community-card="snapshot-plate">
            <div className={styles.snapshotHeader}>
                <AuthorLine card={card} />
                <time className={styles.snapshotDate} dateTime={card.publishedAtIso}>
                    {dateFormatter.format(card.publishedAt)}
                </time>
            </div>

            <LoadoutChips tags={card.analysisTags} />

            <div className={styles.snapshotBody}>
                <h3 className={styles.snapshotTitle}>
                    <Link href={card.href}>{card.title}</Link>
                </h3>
                <p className={styles.snapshotExcerpt}>{card.excerpt}</p>
            </div>

            <div className={styles.snapshotFooter}>
                <EngagementSignals engagement={card.engagement} />
                <Link className={styles.cardAction} href={card.primaryAction.href}>
                    {card.primaryAction.label}
                </Link>
            </div>
        </article>
    );
}

function FeaturedSnapshotPlate({ post }: {
    readonly post: FeaturedPost;
}): React.JSX.Element {
    return (
        <article className={styles.featuredPlate} data-community-card="snapshot-plate">
            <div className={styles.featuredReason}>{post.reason}</div>
            <TrustSignalRail signals={post.trustSignals} />
            <LoadoutChips tags={post.analysisTags} />
            <div className={styles.snapshotBody}>
                <h3 className={styles.snapshotTitle}>
                    <Link href={post.href}>{post.title}</Link>
                </h3>
                <p className={styles.snapshotExcerpt}>{post.excerpt}</p>
            </div>
            <Link className={styles.cardAction} href={post.href}>
                Abrir destaque
            </Link>
        </article>
    );
}

function ActionableEmptyState({ emptyState }: {
    readonly emptyState: CommunityDiscoveryEmptyState;
}): React.JSX.Element {
    return (
        <div className={styles.emptyState}>
            <span className={styles.emptyKicker}>Sem sinal publico</span>
            <h3>{emptyState.title}</h3>
            <p>{emptyState.body}</p>
            <div className={styles.emptyActions}>
                <Link className="btn btn-primary" href={emptyState.primaryAction.href}>
                    {emptyState.primaryAction.label}
                </Link>
                {emptyState.secondaryAction ? (
                    <Link className="btn btn-ghost" href={emptyState.secondaryAction.href}>
                        {emptyState.secondaryAction.label}
                    </Link>
                ) : null}
            </div>
        </div>
    );
}

function FeaturedSection({ featuredPosts }: {
    readonly featuredPosts: CommunityDiscoveryViewModel['featuredPosts'];
}): React.JSX.Element {
    return (
        <section className={styles.sectionShell} data-community-section="featured-posts">
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Destaques publicos</span>
                    <h2 className={styles.sectionTitle}>Snapshots com sinal forte</h2>
                </div>
                <p className={styles.sectionSummary}>
                    Presets copiados, drills salvos, comentarios de recoil e contexto de patch
                    puxam estes posts para a mira da squad.
                </p>
            </div>

            {featuredPosts.items.length > 0 ? (
                <div className={styles.featuredGrid}>
                    {featuredPosts.items.map((post) => (
                        <FeaturedSnapshotPlate key={post.id} post={post} />
                    ))}
                </div>
            ) : featuredPosts.emptyState ? (
                <ActionableEmptyState emptyState={featuredPosts.emptyState} />
            ) : null}
        </section>
    );
}

function FollowingFeed({ followingFeed }: {
    readonly followingFeed: CommunityDiscoveryViewModel['followingFeed'];
}): React.JSX.Element {
    return (
        <section className={styles.sectionShell} data-community-section="following-feed">
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Seguindo</span>
                    <h2 className={styles.sectionTitle}>Feed dos creators acompanhados</h2>
                </div>
                <p className={styles.sectionSummary}>{followingFeed.summary}</p>
            </div>

            {followingFeed.cards.length > 0 ? (
                <div className={styles.feedGrid}>
                    {followingFeed.cards.map((card) => (
                        <SnapshotPlate key={card.id} card={card} />
                    ))}
                </div>
            ) : followingFeed.emptyState ? (
                <ActionableEmptyState emptyState={followingFeed.emptyState} />
            ) : null}
        </section>
    );
}

function TrendPlate({ trend }: {
    readonly trend: TrendItem;
}): React.JSX.Element {
    return (
        <article className={styles.trendPlate}>
            <div className={styles.trendTopline}>
                <span className={styles.sectionKicker}>{trend.kind}</span>
                <span className={styles.trendCount}>{trend.postCount}</span>
            </div>
            <h3>{trend.label}</h3>
            <p>{trend.reason}</p>
            <Link className={styles.cardAction} href={trend.href}>
                Ver filtro
            </Link>
        </article>
    );
}

function TrendBoard({ trendBoard }: {
    readonly trendBoard: CommunityDiscoveryViewModel['trendBoard'];
}): React.JSX.Element {
    return (
        <section className={styles.sectionShell} data-community-section="trend-board">
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Trend board</span>
                    <h2 className={styles.sectionTitle}>Armas, patches e diagnosticos em alta</h2>
                </div>
                <p className={styles.sectionSummary}>
                    Tendencias aparecem apenas quando posts publicos repetem contexto e geram
                    sinais publicos de comentario, save, copia ou curtida.
                </p>
            </div>

            {trendBoard.items.length > 0 ? (
                <div className={styles.trendGrid}>
                    {trendBoard.items.map((trend) => (
                        <TrendPlate key={trend.key} trend={trend} />
                    ))}
                </div>
            ) : trendBoard.emptyState ? (
                <ActionableEmptyState emptyState={trendBoard.emptyState} />
            ) : null}
        </section>
    );
}

function WeeklyDrillPromptPanel({ prompt }: {
    readonly prompt: WeeklyDrillPrompt;
}): React.JSX.Element {
    return (
        <section className={styles.promptGrid} aria-label="Drill semanal da comunidade">
            <article className={styles.promptPanel} data-community-section="weekly-drill-prompt">
                <span className={styles.sectionKicker}>Drill semanal</span>
                <h2>{prompt.title}</h2>
                <p>{prompt.body}</p>
                <div className={styles.emptyActions}>
                    <Link className={styles.cardAction} href={prompt.action.href}>
                        {prompt.action.label}
                    </Link>
                    <Link className={styles.cardAction} href={prompt.secondaryAction.href}>
                        {prompt.secondaryAction.label}
                    </Link>
                </div>
            </article>
        </section>
    );
}

function SeasonContextDeck({
    season,
    challenge,
}: {
    readonly season: SeasonContextCard;
    readonly challenge: WeeklyChallengeBoard;
}): React.JSX.Element {
    return (
        <section className={styles.ritualDeck} aria-label="Temporada e desafio semanal">
            <article
                className={styles.ritualPanel}
                data-community-section="season-context"
            >
                <div className={styles.ritualPanelHeader}>
                    <span className={styles.sectionKicker}>{season.stateLabel}</span>
                    <span className={styles.loadoutChipMuted}>{season.windowLabel}</span>
                </div>
                <h2>{season.title}</h2>
                <p>{season.summary}</p>
                <div className={styles.ritualStatGrid}>
                    <div className={styles.ritualStat}>
                        <span>Tema</span>
                        <strong>{season.theme}</strong>
                    </div>
                    <div className={styles.ritualStat}>
                        <span>Janela</span>
                        <strong>{season.windowLabel}</strong>
                    </div>
                </div>
            </article>

            <article
                className={styles.ritualPanel}
                data-community-section="weekly-challenge-board"
            >
                <div className={styles.ritualPanelHeader}>
                    <span className={styles.sectionKicker}>Weekly challenge</span>
                    <span className={styles.loadoutChipMuted}>{challenge.windowLabel}</span>
                </div>
                <h2>{challenge.title}</h2>
                <p>{challenge.description}</p>
                <p className={styles.ritualMeta}>{challenge.rationale}</p>
                <div className={styles.challengeActionList}>
                    {challenge.actions.map((action) => (
                        <ChallengeActionPlate key={`${action.title}-${action.href}`} action={action} />
                    ))}
                </div>
                <div className={styles.emptyActions}>
                    {challenge.trendHref ? (
                        <Link className={styles.cardAction} href={challenge.trendHref}>
                            Ver contexto
                        </Link>
                    ) : null}
                    <span className={styles.loadoutChipMuted}>{challenge.theme}</span>
                </div>
            </article>
        </section>
    );
}

function ChallengeActionPlate({
    action,
}: {
    readonly action: WeeklyChallengeAction;
}): React.JSX.Element {
    return (
        <article className={styles.challengeAction}>
            <div className={styles.challengeActionTopline}>
                <strong>{action.title}</strong>
                <span className={styles.challengeXp}>{action.xpLabel}</span>
            </div>
            <p>{action.description}</p>
            <Link className={styles.cardAction} href={action.href}>
                Abrir acao
            </Link>
        </article>
    );
}

function ViewerRitualDeck({
    summary,
    recap,
    squadSpotlight,
}: {
    readonly summary: ViewerProgressionSummary | null;
    readonly recap: PersonalRecap | null;
    readonly squadSpotlight: SquadSpotlight | null;
}): React.JSX.Element | null {
    if (!summary) {
        return null;
    }

    return (
        <section className={styles.ritualDeck} aria-label="Superficies viewer-aware">
            <article
                className={styles.ritualPanel}
                data-community-section="progression-summary"
            >
                <div className={styles.ritualPanelHeader}>
                    <span className={styles.sectionKicker}>Progressao pessoal</span>
                    <span className={styles.loadoutChipMuted}>Nivel {summary.level}</span>
                </div>
                <h2>{summary.title}</h2>
                <p>{summary.summary}</p>
                <div className={styles.progressMeter} aria-hidden="true">
                    <span
                        className={styles.progressMeterFill}
                        style={{ width: formatProgressPercent(summary.progressRatio) }}
                    />
                </div>
                <div className={styles.ritualStatGrid}>
                    <div className={styles.ritualStat}>
                        <span>XP total</span>
                        <strong>{summary.totalXp}</strong>
                    </div>
                    <div className={styles.ritualStat}>
                        <span>Streak</span>
                        <strong>{summary.currentStreak}</strong>
                    </div>
                    <div className={styles.ritualStat}>
                        <span>Proximo nivel</span>
                        <strong>{summary.xpToNextLevel} XP</strong>
                    </div>
                </div>
                <p className={styles.ritualMeta}>{summary.nextMilestone.description}</p>
                <div className={styles.emptyActions}>
                    <Link className={styles.cardAction} href={summary.nextAction.href}>
                        {summary.nextAction.title}
                    </Link>
                    {summary.publicProfileHref ? (
                        <Link className={styles.cardAction} href={summary.publicProfileHref}>
                            Abrir perfil publico
                        </Link>
                    ) : null}
                </div>
            </article>

            {recap ? (
                <article
                    className={styles.ritualPanel}
                    data-community-section="personal-recap"
                >
                    <div className={styles.ritualPanelHeader}>
                        <span className={styles.sectionKicker}>Recap pessoal</span>
                        <span className={styles.loadoutChipMuted}>{recap.state}</span>
                    </div>
                    <h2>{recap.title}</h2>
                    <p>{recap.summary}</p>
                    <div className={styles.ritualStatGrid}>
                        <div className={styles.ritualStat}>
                            <span>Rituais</span>
                            <strong>{recap.ritualCount}</strong>
                        </div>
                        <div className={styles.ritualStat}>
                            <span>Rewards</span>
                            <strong>{recap.rewardCount}</strong>
                        </div>
                        <div className={styles.ritualStat}>
                            <span>XP da janela</span>
                            <strong>{recap.earnedXp}</strong>
                        </div>
                    </div>
                    {recap.nextAction ? (
                        <div className={styles.emptyActions}>
                            <Link className={styles.cardAction} href={recap.nextAction.href}>
                                {recap.nextAction.title}
                            </Link>
                        </div>
                    ) : null}
                </article>
            ) : null}

            {squadSpotlight ? (
                <article
                    className={styles.ritualPanel}
                    data-community-section="squad-spotlight"
                >
                    <div className={styles.ritualPanelHeader}>
                        <span className={styles.sectionKicker}>Squad spotlight</span>
                        <span className={styles.loadoutChipMuted}>{squadSpotlight.visibilityLabel}</span>
                    </div>
                    <h2>{squadSpotlight.title}</h2>
                    <p>{squadSpotlight.description}</p>
                    <div className={styles.ritualStatGrid}>
                        <div className={styles.ritualStat}>
                            <span>Meta</span>
                            <strong>{squadSpotlight.progressLabel}</strong>
                        </div>
                        <div className={styles.ritualStat}>
                            <span>Membros</span>
                            <strong>{squadSpotlight.memberCount}</strong>
                        </div>
                    </div>
                    <p className={styles.ritualMeta}>{squadSpotlight.goalHeadline}</p>
                    <p className={styles.ritualMeta}>{squadSpotlight.recapSummary}</p>
                    {squadSpotlight.nextAction ? (
                        <div className={styles.emptyActions}>
                            <Link className={styles.cardAction} href={squadSpotlight.nextAction.href}>
                                {squadSpotlight.nextAction.title}
                            </Link>
                        </div>
                    ) : null}
                </article>
            ) : null}
        </section>
    );
}

function MissionBoardSection({
    missionBoard,
}: {
    readonly missionBoard: MissionBoard | null;
}): React.JSX.Element | null {
    if (!missionBoard) {
        return null;
    }

    return (
        <section className={styles.sectionShell} data-community-section="mission-board">
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Mission board</span>
                    <h2 className={styles.sectionTitle}>{missionBoard.title}</h2>
                </div>
                <p className={styles.sectionSummary}>{missionBoard.summary}</p>
            </div>

            {missionBoard.items.length > 0 ? (
                <div className={styles.missionGrid}>
                    {missionBoard.items.map((item) => (
                        <MissionPlate key={item.missionId} item={item} />
                    ))}
                </div>
            ) : missionBoard.emptyState ? (
                <ActionableEmptyState emptyState={missionBoard.emptyState} />
            ) : null}
        </section>
    );
}

function MissionPlate({
    item,
}: {
    readonly item: MissionBoardItem;
}): React.JSX.Element {
    return (
        <article className={styles.missionPlate}>
            <div className={styles.challengeActionTopline}>
                <strong>{item.title}</strong>
                <span className={styles.challengeXp}>{item.rewardLabel}</span>
            </div>
            <p>{item.description}</p>
            <div className={styles.progressMeter} aria-hidden="true">
                <span
                    className={styles.progressMeterFill}
                    style={{ width: formatProgressPercent(item.completionRatio) }}
                />
            </div>
            <div className={styles.ritualStatGrid}>
                <div className={styles.ritualStat}>
                    <span>Progresso</span>
                    <strong>{item.progressLabel}</strong>
                </div>
                <div className={styles.ritualStat}>
                    <span>Estado</span>
                    <strong>{item.state}</strong>
                </div>
            </div>
            <Link className={styles.cardAction} href={item.primaryAction.href}>
                {item.primaryAction.label}
            </Link>
        </article>
    );
}

function CreatorPlate({ creator }: {
    readonly creator: CreatorHighlight;
}): React.JSX.Element {
    const initials = buildCommunityFallbackInitials(creator.displayName);

    return (
        <article className={styles.creatorPlate}>
            <div className={styles.creatorTopline}>
                <span aria-hidden="true" className={styles.creatorMark}>
                    {initials}
                </span>
                <div className={styles.creatorIdentity}>
                    <h3>
                        <Link href={normalizeCommunityProfileHref(creator.profileHref)}>
                            {creator.displayName}
                        </Link>
                    </h3>
                    {creator.badge ? (
                        <span className={styles.creatorBadge}>{creator.badge.label}</span>
                    ) : (
                        <span className={styles.authorMeta}>Operador em atividade</span>
                    )}
                </div>
            </div>
            <div className={styles.creatorReasons}>
                {creator.reasons.length > 0 ? creator.reasons.map((reason) => (
                    <span key={reason}>{reason}</span>
                )) : (
                    <span>Atividade publica recente</span>
                )}
            </div>
            <TrustSignalRail signals={creator.trustSignals} />
            <Link className={styles.cardAction} href={normalizeCommunityProfileHref(creator.profileHref)}>
                Ver perfil
            </Link>
        </article>
    );
}

function CreatorHighlights({ creatorHighlights }: {
    readonly creatorHighlights: CommunityDiscoveryViewModel['creatorHighlights'];
}): React.JSX.Element {
    return (
        <section className={styles.sectionShell} data-community-section="creator-plates">
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Creator plates</span>
                    <h2 className={styles.sectionTitle}>Operadores para acompanhar</h2>
                </div>
                <p className={styles.sectionSummary}>
                    Sinais publicos de posts, presets copiados, patch ativo e status de creator
                    ajudam a escolher quem seguir.
                </p>
            </div>

            {creatorHighlights.items.length > 0 ? (
                <div className={styles.creatorGrid}>
                    {creatorHighlights.items.map((creator) => (
                        <CreatorPlate key={creator.profileId} creator={creator} />
                    ))}
                </div>
            ) : creatorHighlights.emptyState ? (
                <ActionableEmptyState emptyState={creatorHighlights.emptyState} />
            ) : null}
        </section>
    );
}

function CommunityFeed({ feed }: {
    readonly feed: CommunityDiscoveryViewModel['feed'];
}): React.JSX.Element {
    const filterEmptyState = feed.emptyState;

    return (
        <section
            aria-label="Feed da comunidade"
            className={styles.sectionShell}
            id="community-feed"
        >
            <div className={styles.sectionHeader}>
                <div>
                    <span className={styles.sectionKicker}>Feed publico</span>
                    <h2 className={styles.sectionTitle}>Analises abertas</h2>
                </div>
                <p className={styles.sectionSummary}>{feed.summary}</p>
            </div>

            {feed.cards.length > 0 ? (
                <div className={styles.feedGrid}>
                    {feed.cards.map((card) => (
                        <SnapshotPlate key={card.id} card={card} />
                    ))}
                </div>
            ) : filterEmptyState ? (
                <ActionableEmptyState emptyState={filterEmptyState} />
            ) : null}
        </section>
    );
}

function ParticipationPrompts({ prompts }: {
    readonly prompts: readonly ParticipationPrompt[];
}): React.JSX.Element | null {
    if (prompts.length === 0) {
        return null;
    }

    return (
        <section className={styles.promptGrid} aria-label="Proximas acoes da comunidade">
            {prompts.map((prompt) => (
                <article key={prompt.key} className={styles.promptPanel}>
                    <span className={styles.sectionKicker}>Proxima acao</span>
                    <h2>{prompt.title}</h2>
                    <p>{prompt.body}</p>
                    <Link className={styles.cardAction} href={prompt.action.href}>
                        {prompt.action.label}
                    </Link>
                </article>
            ))}
        </section>
    );
}

export default async function CommunityPage({
    searchParams,
}: {
    searchParams?: Promise<CommunityPageSearchParams>;
}): Promise<React.JSX.Element> {
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const selectedFilters = parseDiscoveryFilters(resolvedSearchParams);
    const session = await auth();
    const viewModel = await getCommunityDiscoveryViewModel({
        filters: selectedFilters,
        viewerUserId: session?.user?.id ?? null,
    });
    const clearHref = viewModel.filters.clearHref;

    return (
        <>
            <Header />

            <div className="page">
                <main className={`container ${styles.pageStack}`}>
                    <SquadBoard viewModel={viewModel} />

                    <CommunityFilters
                        clearHref={clearHref}
                        filters={viewModel.filters}
                    />

                    <SeasonContextDeck
                        challenge={viewModel.weeklyChallenge}
                        season={viewModel.seasonContext}
                    />
                    <ViewerRitualDeck
                        recap={viewModel.personalRecap}
                        squadSpotlight={viewModel.squadSpotlight}
                        summary={viewModel.viewerProgressionSummary}
                    />
                    <MissionBoardSection missionBoard={viewModel.missionBoard} />
                    <FollowingFeed followingFeed={viewModel.followingFeed} />
                    <TrendBoard trendBoard={viewModel.trendBoard} />
                    <WeeklyDrillPromptPanel prompt={viewModel.weeklyDrillPrompt} />
                    <FeaturedSection featuredPosts={viewModel.featuredPosts} />
                    <CommunityFeed feed={viewModel.feed} />
                    <CreatorHighlights creatorHighlights={viewModel.creatorHighlights} />
                    <ParticipationPrompts prompts={viewModel.participationPrompts} />
                </main>
            </div>
        </>
    );
}
