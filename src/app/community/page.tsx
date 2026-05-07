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
    title: 'Comunidade Sens PUBG',
    description:
        'Veja posts publicos, setups e leituras de spray Sens PUBG por arma, patch e diagnostico.',
    alternates: {
        canonical: '/community',
    },
    openGraph: {
        title: 'Comunidade Sens PUBG',
        description:
            'Veja posts publicos, setups e leituras de spray Sens PUBG por arma, patch e diagnostico.',
        url: '/community',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Comunidade Sens PUBG',
        description:
            'Veja posts publicos, setups e leituras de spray Sens PUBG por arma, patch e diagnostico.',
    },
};

export const dynamic = 'force-dynamic';

type CommunityPageSearchParams = Record<string, string | string[] | undefined>;
type CommunityAnalysisTag = CommunityDiscoveryPostCard['analysisTags'][number];
type FeaturedPost = CommunityDiscoveryViewModel['featuredPosts']['items'][number];
type CreatorHighlight = CommunityDiscoveryViewModel['creatorHighlights']['items'][number];
type TrendItem = CommunityDiscoveryViewModel['trendBoard']['items'][number];
type WeeklyChallengeBoard = NonNullable<CommunityDiscoveryViewModel['weeklyChallenge']>;
type WeeklyChallengeAction = WeeklyChallengeBoard['actions'][number];
type ViewerProgressionSummary = NonNullable<CommunityDiscoveryViewModel['viewerProgressionSummary']>;
type MissionBoard = NonNullable<CommunityDiscoveryViewModel['missionBoard']>;
type MissionBoardItem = MissionBoard['items'][number];
type PersonalRecap = NonNullable<CommunityDiscoveryViewModel['personalRecap']>;
type SquadSpotlight = NonNullable<CommunityDiscoveryViewModel['squadSpotlight']>;
type TrustSignal = FeaturedPost['trustSignals'][number];

interface CommunityHubFocus {
    readonly kicker: string;
    readonly title: string;
    readonly body: string;
    readonly action: {
        readonly label: string;
        readonly href: string;
    };
    readonly note: string | null;
}

interface CommunityHeroPulseItem {
    readonly key: string;
    readonly kicker: string;
    readonly title: string;
    readonly body: string;
    readonly href: string;
    readonly actionLabel: string;
}

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
                <span className={styles.signalLabel}>posts na tela</span>
            </div>
            <div className={styles.signalCell}>
                <span className={styles.signalValue}>{publicPostCount}</span>
                <span className={styles.signalLabel}>posts abertos</span>
            </div>
            <div className={styles.signalCell}>
                <span className={styles.signalValue}>{hasActiveFilters ? 'Ativo' : 'Geral'}</span>
                <span className={styles.signalLabel}>recorte</span>
            </div>
        </aside>
    );
}

function formatProgressPercent(value: number): string {
    return `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`;
}

function formatMissionStateLabel(state: MissionBoardItem['state']): string {
    switch (state) {
        case 'zero_state':
            return 'Pronto para abrir';
        case 'complete':
            return 'Concluida';
        case 'in_progress':
        default:
            return 'Em andamento';
    }
}

function formatRecapStateLabel(state: PersonalRecap['state']): string {
    switch (state) {
        case 'zero_state':
            return 'Primeira janela';
        case 'reentry':
            return 'Ritmo de retorno';
        case 'recap':
        default:
            return 'Janela fechada';
    }
}

function resolveCommunityHubFocus(viewModel: CommunityDiscoveryViewModel): CommunityHubFocus {
    const viewerSummary = viewModel.viewerProgressionSummary;

    if (viewerSummary) {
        return {
            kicker: 'Seu foco agora',
            title: viewerSummary.title,
            body: viewerSummary.summary,
            action: {
                label: viewerSummary.nextAction.title,
                href: viewerSummary.nextAction.href,
            },
            note: `${viewerSummary.nextMilestone.title}. ${viewerSummary.nextMilestone.description}`,
        };
    }

    const participationPrompt = viewModel.participationPrompts[0];

    if (participationPrompt) {
        return {
            kicker: 'Seu proximo passo',
            title: participationPrompt.title,
            body: participationPrompt.body,
            action: participationPrompt.action,
            note: null,
        };
    }

    if (viewModel.weeklyDrillPrompt) {
        return {
            kicker: 'Treino da semana',
            title: viewModel.weeklyDrillPrompt.title,
            body: viewModel.weeklyDrillPrompt.body,
            action: viewModel.weeklyDrillPrompt.action,
            note: null,
        };
    }

    if (viewModel.feed.emptyState) {
        return {
            kicker: 'Abra a comunidade',
            title: viewModel.feed.emptyState.title,
            body: viewModel.feed.emptyState.body,
            action: viewModel.feed.emptyState.primaryAction,
            note: viewModel.feed.emptyState.secondaryAction
                ? viewModel.feed.emptyState.secondaryAction.label
                : null,
        };
    }

    return {
        kicker: 'O que importa agora',
        title: 'Veja o que vale abrir hoje',
        body: 'Progresso de spray primeiro, pulso publico logo ao lado e descoberta util sem empilhar modulos iguais.',
        action: {
            label: 'Ver posts',
            href: '#community-feed',
        },
        note: null,
    };
}

function buildCommunityHeroPulseItems(
    viewModel: CommunityDiscoveryViewModel,
): readonly CommunityHeroPulseItem[] {
    const items: CommunityHeroPulseItem[] = [];
    const topTrend = viewModel.trendBoard.items[0];
    const featuredPost = viewModel.featuredPosts.items[0];

    if (topTrend) {
        items.push({
            key: `trend-${topTrend.key}`,
            kicker: 'Pulso publico',
            title: topTrend.label,
            body: topTrend.reason,
            href: topTrend.href,
            actionLabel: 'Ver recorte',
        });
    }

    if (featuredPost) {
        items.push({
            key: `featured-${featuredPost.id}`,
            kicker: 'Vale abrir',
            title: featuredPost.title,
            body: featuredPost.reason,
            href: featuredPost.href,
            actionLabel: 'Abrir post',
        });
    }

    return items;
}

function CommunityPulsePreview({ viewModel }: {
    readonly viewModel: CommunityDiscoveryViewModel;
}): React.JSX.Element {
    const pulseItems = buildCommunityHeroPulseItems(viewModel);

    return (
        <aside className={styles.boardRail} data-community-section="hero-pulse">
            <article className={styles.heroPulseCard}>
                <div className={styles.heroPulseHeader}>
                    <span className={styles.sectionKicker}>Acontecendo agora</span>
                    <span className={styles.loadoutChipMuted}>
                        {viewModel.hubSummary.publicPostCount} posts abertos
                    </span>
                </div>

                {pulseItems.length > 0 ? (
                    <div className={styles.heroPulseGrid}>
                        {pulseItems.map((item) => (
                            <article key={item.key} className={styles.heroPulseItem}>
                                <span className={styles.heroPulseKicker}>{item.kicker}</span>
                                <h2 className={styles.heroPulseTitle}>{item.title}</h2>
                                <p className={styles.heroPulseBody}>{item.body}</p>
                                <Link className={styles.cardAction} href={item.href}>
                                    {item.actionLabel}
                                </Link>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className={styles.heroPulseEmpty}>
                        Ainda nao ha sinal publico suficiente para resumir o pulso da comunidade.
                    </p>
                )}
            </article>

            <RecoilSignal
                hasActiveFilters={viewModel.filters.hasActiveFilters}
                publicPostCount={viewModel.hubSummary.publicPostCount}
                visiblePostCount={viewModel.hubSummary.visiblePostCount}
            />
        </aside>
    );
}

function SquadBoard({ viewModel }: {
    readonly viewModel: CommunityDiscoveryViewModel;
}): React.JSX.Element {
    const focus = resolveCommunityHubFocus(viewModel);

    return (
        <section
            className={`glass-card ${styles.squadBoard}`}
            data-community-section="squad-board"
        >
            <div className={styles.boardLayout}>
                <div className={styles.boardCopy}>
                    <span className={styles.boardEyebrow}>O que importa agora</span>
                    <div className={styles.boardTitleGroup}>
                        <h1 className={styles.boardTitle}>Comunidade</h1>
                        <p className={styles.boardLead}>
                            Comunidade Sens PUBG com progresso do spray primeiro, sinais publicos de verdade logo ao lado e
                            descoberta util sem transformar a pagina em uma pilha de modulos.
                        </p>
                    </div>

                    <article className={styles.boardFocusPanel}>
                        <span className={styles.sectionKicker}>{focus.kicker}</span>
                        <h2 className={styles.boardFocusTitle}>{focus.title}</h2>
                        <p className={styles.boardFocusBody}>{focus.body}</p>
                        <div className={styles.boardActions}>
                            <Link className="btn btn-primary" href={focus.action.href}>
                                {focus.action.label}
                            </Link>
                        </div>
                        {focus.note ? (
                            <p className={styles.boardFocusNote}>{focus.note}</p>
                        ) : null}
                    </article>
                </div>

                <CommunityPulsePreview viewModel={viewModel} />
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
                    <span className={styles.authorMeta}>Jogador da comunidade</span>
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
                    Post publico
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
                Abrir post
            </Link>
        </article>
    );
}

function ActionableEmptyState({ emptyState }: {
    readonly emptyState: CommunityDiscoveryEmptyState;
}): React.JSX.Element {
    return (
        <div className={styles.emptyState}>
            <span className={styles.emptyKicker}>Sem movimento aqui</span>
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
                    <span className={styles.sectionKicker}>Para abrir agora</span>
                    <h2 className={styles.sectionTitle}>Posts que puxaram a comunidade</h2>
                </div>
                <p className={styles.sectionSummary}>
                    Copias, saves e comentarios reais mostram quais posts valem seu tempo agora.
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
                    <span className={styles.sectionKicker}>De quem voce acompanha</span>
                    <h2 className={styles.sectionTitle}>Posts de quem voce segue</h2>
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
                Ver posts
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
                    <span className={styles.sectionKicker}>Acontecendo agora</span>
                    <h2 className={styles.sectionTitle}>Armas, patches e leituras que estao puxando conversa</h2>
                </div>
                <p className={styles.sectionSummary}>
                    So entra aqui o que ja ganhou sinal publico de verdade em posts abertos.
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
    readonly prompt: CommunityDiscoveryViewModel['weeklyDrillPrompt'];
}): React.JSX.Element | null {
    if (!prompt) {
        return null;
    }

    return (
        <section className={styles.promptGrid} aria-label="Treino da semana">
            <article className={styles.promptPanel} data-community-section="weekly-drill-prompt">
                <span className={styles.sectionKicker}>Treino da semana</span>
                <h2>{prompt.title}</h2>
                <p>{prompt.body}</p>
                <div className={styles.emptyActions}>
                    <Link className={styles.cardAction} href={prompt.action.href}>
                        {prompt.action.label}
                    </Link>
                </div>
                <Link className={styles.inlineActionLink} href={prompt.secondaryAction.href}>
                    {prompt.secondaryAction.label}
                </Link>
            </article>
        </section>
    );
}

function SeasonContextDeck({
    season,
    challenge,
}: {
    readonly season: CommunityDiscoveryViewModel['seasonContext'];
    readonly challenge: CommunityDiscoveryViewModel['weeklyChallenge'];
}): React.JSX.Element | null {
    if (!season || !challenge) {
        return null;
    }

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
                    <span className={styles.sectionKicker}>Desafio da semana</span>
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
                            Ver posts
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
                Ver passo
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
            <section className={styles.ritualDeck} aria-label="Seu momento na comunidade">
                <article
                    className={styles.ritualPanel}
                    data-community-section="progression-summary"
                >
                    <div className={styles.ritualPanelHeader}>
                        <span className={styles.sectionKicker}>Seu spray agora</span>
                        <span className={styles.loadoutChipMuted}>{summary.stageLabel}</span>
                    </div>
                    <h2>{summary.title}</h2>
                    <p>{summary.summary}</p>
                    <div className={styles.ritualStatGrid}>
                        {summary.facts.map((fact) => (
                            <div key={fact.label} className={styles.ritualStat}>
                                <span>{fact.label}</span>
                                <strong>{fact.value}</strong>
                            </div>
                        ))}
                    </div>
                    <p className={styles.ritualMeta}>
                        {summary.nextMilestone.title}. {summary.nextMilestone.description}
                    </p>
                    <div className={styles.emptyActions}>
                        <Link className={styles.cardAction} href={summary.nextAction.href}>
                            {summary.nextAction.title}
                        </Link>
                    </div>
                    <p className={styles.ritualMeta}>{summary.nextAction.description}</p>
                    {summary.publicProfileHref ? (
                        <Link className={styles.inlineActionLink} href={summary.publicProfileHref}>
                            Abrir perfil publico
                        </Link>
                    ) : null}
                    {summary.socialReinforcement ? (
                        <p className={styles.ritualMeta}>
                            {summary.socialReinforcement.title}. {summary.socialReinforcement.description}
                        </p>
                    ) : null}
                </article>

            {recap ? (
                <article
                    className={styles.ritualPanel}
                    data-community-section="personal-recap"
                >
                    <div className={styles.ritualPanelHeader}>
                        <span className={styles.sectionKicker}>Seu resumo</span>
                        <span className={styles.loadoutChipMuted}>{formatRecapStateLabel(recap.state)}</span>
                    </div>
                    <h2>{recap.title}</h2>
                    <p>{recap.summary}</p>
                    <div className={styles.ritualStatGrid}>
                        <div className={styles.ritualStat}>
                            <span>Acoes que contam</span>
                            <strong>{recap.ritualCount}</strong>
                        </div>
                        <div className={styles.ritualStat}>
                            <span>Rewards</span>
                            <strong>{recap.rewardCount}</strong>
                        </div>
                        <div className={styles.ritualStat}>
                            <span>XP fechado</span>
                            <strong>{recap.earnedXp}</strong>
                        </div>
                    </div>
                    {recap.nextAction ? (
                        <Link className={styles.inlineActionLink} href={recap.nextAction.href}>
                            {recap.nextAction.title}
                        </Link>
                    ) : null}
                </article>
            ) : null}

            {squadSpotlight ? (
                <article
                    className={styles.ritualPanel}
                    data-community-section="squad-spotlight"
                >
                    <div className={styles.ritualPanelHeader}>
                        <span className={styles.sectionKicker}>Seu squad</span>
                        <span className={styles.loadoutChipMuted}>{squadSpotlight.visibilityLabel}</span>
                    </div>
                    <h2>{squadSpotlight.title}</h2>
                    <p>{squadSpotlight.description}</p>
                    <div className={styles.ritualStatGrid}>
                        <div className={styles.ritualStat}>
                            <span>Meta viva</span>
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
                        <Link className={styles.inlineActionLink} href={squadSpotlight.nextAction.href}>
                            {squadSpotlight.nextAction.title}
                        </Link>
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
                    <span className={styles.sectionKicker}>Objetivos que rendem</span>
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
                    <span>Andamento</span>
                    <strong>{formatMissionStateLabel(item.state)}</strong>
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
                        <span className={styles.authorMeta}>Jogador em atividade</span>
                    )}
                </div>
            </div>
            <div className={styles.creatorReasons}>
                {creator.reasons.length > 0 ? creator.reasons.map((reason) => (
                    <span key={reason}>{reason}</span>
                )) : (
                    <span>Postando agora</span>
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
                    <span className={styles.sectionKicker}>Quem vale seguir</span>
                    <h2 className={styles.sectionTitle}>Jogadores para acompanhar</h2>
                </div>
                <p className={styles.sectionSummary}>
                    Use sinais publicos reais para decidir quem acompanhar mais de perto.
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
                    <span className={styles.sectionKicker}>Posts da comunidade</span>
                    <h2 className={styles.sectionTitle}>Posts para abrir</h2>
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

function CommunityBand({
    kicker,
    title,
    summary,
    section,
    children,
}: {
    readonly kicker: string;
    readonly title: string;
    readonly summary: string;
    readonly section: string;
    readonly children: React.ReactNode;
}): React.JSX.Element {
    return (
        <section className={styles.bandShell} data-community-section={section}>
            <div className={styles.bandIntro}>
                <div className={styles.bandIntroCopy}>
                    <span className={styles.sectionKicker}>{kicker}</span>
                    <h2 className={styles.bandTitle}>{title}</h2>
                </div>
                <p className={styles.bandSummary}>{summary}</p>
            </div>
            {children}
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
    const isSparsePublicMode = viewModel.publicDensity.mode === 'sparse';
    const hasNowMainContent = Boolean(
        viewModel.viewerProgressionSummary
        || viewModel.personalRecap
        || viewModel.squadSpotlight
        || viewModel.missionBoard,
    );
    const hasNowAsideContent = Boolean(viewModel.seasonContext && viewModel.weeklyChallenge);
    const hasNowBand = hasNowMainContent || hasNowAsideContent;
    const hasPulsePrimaryContent = viewModel.trendBoard.items.length > 0
        || viewModel.featuredPosts.items.length > 0;
    const hasPulseAsideContent = viewModel.followingFeed.cards.length > 0;
    const hasPulseBand = hasPulsePrimaryContent || hasPulseAsideContent;
    const hasExploreAsideContent = viewModel.creatorHighlights.items.length > 0
        || Boolean(viewModel.weeklyDrillPrompt);

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

                    {isSparsePublicMode ? (
                        <>
                            <CommunityFeed feed={viewModel.feed} />

                            {hasNowBand ? (
                                <CommunityBand
                                    kicker="Agora"
                                    section="community-now-band"
                                    summary="Seu progresso, a janela ativa e os objetivos que realmente mudam a proxima rodada."
                                    title="O que mexe no seu treino agora"
                                >
                                    {hasNowMainContent && hasNowAsideContent ? (
                                        <div className={styles.bandGrid}>
                                            <div className={styles.bandMain}>
                                                <ViewerRitualDeck
                                                    recap={viewModel.personalRecap}
                                                    squadSpotlight={viewModel.squadSpotlight}
                                                    summary={viewModel.viewerProgressionSummary}
                                                />
                                                <MissionBoardSection missionBoard={viewModel.missionBoard} />
                                            </div>
                                            <div className={styles.bandAside}>
                                                <SeasonContextDeck
                                                    challenge={viewModel.weeklyChallenge}
                                                    season={viewModel.seasonContext}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.bandStack}>
                                            <ViewerRitualDeck
                                                recap={viewModel.personalRecap}
                                                squadSpotlight={viewModel.squadSpotlight}
                                                summary={viewModel.viewerProgressionSummary}
                                            />
                                            <MissionBoardSection missionBoard={viewModel.missionBoard} />
                                            <SeasonContextDeck
                                                challenge={viewModel.weeklyChallenge}
                                                season={viewModel.seasonContext}
                                            />
                                        </div>
                                    )}
                                </CommunityBand>
                            ) : null}

                            {hasPulseBand ? (
                                <CommunityBand
                                    kicker="Acontecendo"
                                    section="community-pulse-band"
                                    summary="Sinais publicos reais ficam logo depois do feed quando a comunidade ainda esta ganhando corpo."
                                    title="O que ja tem resposta publica"
                                >
                                    <div className={styles.bandStack}>
                                        {viewModel.trendBoard.items.length > 0 ? (
                                            <TrendBoard trendBoard={viewModel.trendBoard} />
                                        ) : null}
                                        {viewModel.featuredPosts.items.length > 0 ? (
                                            <FeaturedSection featuredPosts={viewModel.featuredPosts} />
                                        ) : null}
                                        {viewModel.followingFeed.cards.length > 0 ? (
                                            <FollowingFeed followingFeed={viewModel.followingFeed} />
                                        ) : null}
                                    </div>
                                </CommunityBand>
                            ) : null}

                            {hasExploreAsideContent ? (
                                <CommunityBand
                                    kicker="Explorar"
                                    section="community-explore-band"
                                    summary="Quando houver mais contexto util, siga jogadores e abra os recortes que ajudam seu proximo treino."
                                    title="Onde vale aprofundar depois"
                                >
                                    <div className={styles.bandStack}>
                                        {viewModel.creatorHighlights.items.length > 0 ? (
                                            <CreatorHighlights creatorHighlights={viewModel.creatorHighlights} />
                                        ) : null}
                                        {viewModel.weeklyDrillPrompt ? (
                                            <WeeklyDrillPromptPanel prompt={viewModel.weeklyDrillPrompt} />
                                        ) : null}
                                    </div>
                                </CommunityBand>
                            ) : null}
                        </>
                    ) : (
                        <>
                            {hasNowBand ? (
                                <CommunityBand
                                    kicker="Agora"
                                    section="community-now-band"
                                    summary="Seu progresso, a janela ativa e os objetivos que realmente mudam a proxima rodada."
                                    title="O que mexe no seu treino agora"
                                >
                                    {hasNowMainContent && hasNowAsideContent ? (
                                        <div className={styles.bandGrid}>
                                            <div className={styles.bandMain}>
                                                <ViewerRitualDeck
                                                    recap={viewModel.personalRecap}
                                                    squadSpotlight={viewModel.squadSpotlight}
                                                    summary={viewModel.viewerProgressionSummary}
                                                />
                                                <MissionBoardSection missionBoard={viewModel.missionBoard} />
                                            </div>
                                            <div className={styles.bandAside}>
                                                <SeasonContextDeck
                                                    challenge={viewModel.weeklyChallenge}
                                                    season={viewModel.seasonContext}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.bandStack}>
                                            <ViewerRitualDeck
                                                recap={viewModel.personalRecap}
                                                squadSpotlight={viewModel.squadSpotlight}
                                                summary={viewModel.viewerProgressionSummary}
                                            />
                                            <MissionBoardSection missionBoard={viewModel.missionBoard} />
                                            <SeasonContextDeck
                                                challenge={viewModel.weeklyChallenge}
                                                season={viewModel.seasonContext}
                                            />
                                        </div>
                                    )}
                                </CommunityBand>
                            ) : null}

                            {hasPulseBand ? (
                                <CommunityBand
                                    kicker="Acontecendo"
                                    section="community-pulse-band"
                                    summary="O que ja ganhou resposta publica de verdade, sem deixar a leitura principal se perder no meio da pagina."
                                    title="O que esta puxando a comunidade"
                                >
                                    {hasPulsePrimaryContent && hasPulseAsideContent ? (
                                        <div className={styles.bandGrid}>
                                            <div className={styles.bandMain}>
                                                {viewModel.trendBoard.items.length > 0 ? (
                                                    <TrendBoard trendBoard={viewModel.trendBoard} />
                                                ) : null}
                                                {viewModel.featuredPosts.items.length > 0 ? (
                                                    <FeaturedSection featuredPosts={viewModel.featuredPosts} />
                                                ) : null}
                                            </div>
                                            <div className={styles.bandAside}>
                                                <FollowingFeed followingFeed={viewModel.followingFeed} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.bandStack}>
                                            {viewModel.trendBoard.items.length > 0 ? (
                                                <TrendBoard trendBoard={viewModel.trendBoard} />
                                            ) : null}
                                            {viewModel.featuredPosts.items.length > 0 ? (
                                                <FeaturedSection featuredPosts={viewModel.featuredPosts} />
                                            ) : null}
                                            {viewModel.followingFeed.cards.length > 0 ? (
                                                <FollowingFeed followingFeed={viewModel.followingFeed} />
                                            ) : null}
                                        </div>
                                    )}
                                </CommunityBand>
                            ) : null}

                            <CommunityBand
                                kicker="Explorar"
                                section="community-explore-band"
                                summary="Depois do pulso principal, abra o feed completo, ajuste o recorte e encontre jogadores para acompanhar."
                                title="Onde vale aprofundar depois"
                            >
                                {hasExploreAsideContent ? (
                                    <div className={styles.bandGrid}>
                                        <div className={styles.bandMain}>
                                            <CommunityFeed feed={viewModel.feed} />
                                        </div>
                                        <div className={styles.bandAside}>
                                            {viewModel.creatorHighlights.items.length > 0 ? (
                                                <CreatorHighlights creatorHighlights={viewModel.creatorHighlights} />
                                            ) : null}
                                            {viewModel.weeklyDrillPrompt ? (
                                                <WeeklyDrillPromptPanel prompt={viewModel.weeklyDrillPrompt} />
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.bandStack}>
                                        <CommunityFeed feed={viewModel.feed} />
                                    </div>
                                )}
                            </CommunityBand>
                        </>
                    )}
                </main>
            </div>
        </>
    );
}
