import React from 'react';
import Link from 'next/link';

import type { VisibleCommunityPostComment } from '@/actions/community-comments';
import type { CommunityCreatorProgramStatus } from '@/db/schema';
import { formatCommunityCreatorStatusBadge } from '@/core/community-public-formatting';
import { getScope, getWeapon } from '@/game/pubg';
import type { Diagnosis } from '@/types/engine';

import styles from '../community-hub.module.css';
import { ReportButton } from '../report-button';
import { CommentForm } from './comment-form';
import { CopySensButton } from './copy-sens-button';
import { LikeButton } from './like-button';
import { SaveButton } from './save-button';

export interface CommunityPostDetailData {
    readonly id: string;
    readonly slug: string;
    readonly status: 'draft' | 'published' | 'hidden' | 'archived' | 'deleted';
    readonly title: string;
    readonly excerpt: string;
    readonly bodyMarkdown: string;
    readonly publishedAt: Date | null;
    readonly authorProfile: {
        readonly displayName: string;
        readonly profileSlug: string;
        readonly profileHref: string;
        readonly creatorProgramStatus: CommunityCreatorProgramStatus;
    } | null;
    readonly communityContinuityLinks: readonly {
        readonly key: 'weapon' | 'patch' | 'diagnosis';
        readonly label: string;
        readonly href: string;
        readonly description: string;
    }[];
    readonly viewerCanReport: boolean;
    readonly snapshot: {
        readonly patchVersion: string;
        readonly weaponId: string;
        readonly scopeId: string;
        readonly distance: number;
        readonly diagnoses: readonly Diagnosis[];
    };
    readonly engagement: {
        readonly likeCount: number;
        readonly viewerHasLiked: boolean;
        readonly viewerHasSaved: boolean;
    };
    readonly comments: readonly VisibleCommunityPostComment[];
    readonly commentForm: {
        readonly canSubmit: boolean;
        readonly disabledReason: string | null;
        readonly diagnosisOptions: readonly string[];
    };
}

const statusLabelByValue: Record<CommunityPostDetailData['status'], string> = {
    draft: 'Rascunho',
    published: 'Publicado',
    hidden: 'Oculto',
    archived: 'Arquivado',
    deleted: 'Removido',
};

const commentDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function humanizeDiagnosisType(type: string): string {
    return type
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatPublishedLabel(publishedAt: Date | null): string {
    if (!publishedAt) {
        return 'Ainda nao publicado';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(publishedAt);
}

function formatContinuityLabel(
    key: CommunityPostDetailData['communityContinuityLinks'][number]['key'],
): string {
    switch (key) {
        case 'weapon':
            return 'Arma';
        case 'patch':
            return 'Patch';
        case 'diagnosis':
            return 'Diagnostico';
    }
}

function buildLeadSummary(input: {
    readonly weaponName: string;
    readonly patchVersion: string;
    readonly distance: number;
    readonly diagnoses: readonly Diagnosis[];
}): string {
    const firstDiagnosis = input.diagnoses[0];

    if (firstDiagnosis) {
        return `Leitura aberta de ${input.weaponName} no Patch ${input.patchVersion} a ${input.distance} m com foco em ${humanizeDiagnosisType(firstDiagnosis.type)}.`;
    }

    return `Leitura aberta de ${input.weaponName} no Patch ${input.patchVersion} a ${input.distance} m para continuar o treino com contexto tecnico claro.`;
}

function DiagnosisCard({
    diagnosis,
}: {
    readonly diagnosis: Diagnosis;
}): React.JSX.Element {
    return (
        <article className={styles.diagnosisCard}>
            <div className={styles.diagnosisMeta}>
                <span className={styles.loadoutChip}>{diagnosis.type}</span>
                <strong>{humanizeDiagnosisType(diagnosis.type)}</strong>
                <span className={styles.loadoutChipMuted}>Intensidade {diagnosis.severity}</span>
            </div>

            <p className={styles.postBodyCopy}>{diagnosis.description}</p>
            <p className={styles.profileStatusNote}>
                <strong>Causa:</strong> {diagnosis.cause}
            </p>
            <p className={styles.profileStatusNote}>
                <strong>Ajuste:</strong> {diagnosis.remediation}
            </p>
        </article>
    );
}

function PostContinuityCard({
    title,
    description,
    actionLabel,
    href,
    badge,
}: {
    readonly title: string;
    readonly description: string;
    readonly actionLabel: string;
    readonly href: string;
    readonly badge?: string | null;
}): React.JSX.Element {
    return (
        <article className={styles.postContinuityCard}>
            {badge ? <span className={styles.loadoutChipMuted}>{badge}</span> : null}
            <h3>{title}</h3>
            <p>{description}</p>
            <Link className={styles.cardAction} href={href}>
                {actionLabel}
            </Link>
        </article>
    );
}

function PostCommentCard({
    comment,
    viewerCanReport,
}: {
    readonly comment: VisibleCommunityPostComment;
    readonly viewerCanReport: boolean;
}): React.JSX.Element {
    const reportButtonClassName = styles.cardAction || 'btn btn-secondary';

    return (
        <article
            className={styles.postCommentCard}
            data-community-comment-item={comment.id}
        >
            <div className={styles.commentMetaLine}>
                <strong>{comment.author.name ?? 'Jogador da comunidade'}</strong>
                <span className={styles.authorMeta}>
                    {commentDateFormatter.format(comment.createdAt)}
                </span>
                {comment.diagnosisContextKey ? (
                    <span
                        className={styles.loadoutChipMuted}
                        data-community-comment-context={comment.diagnosisContextKey}
                    >
                        {comment.diagnosisContextKey}
                    </span>
                ) : null}
            </div>

            <p className={styles.postCommentBody} data-community-comment-body={comment.id}>
                {comment.bodyMarkdown}
            </p>

            <ReportButton
                className={reportButtonClassName}
                disabledHref={viewerCanReport ? undefined : '/login'}
                disabledReason={viewerCanReport
                    ? null
                    : 'Entre na sua conta para reportar este comentario.'}
                entityId={comment.id}
                entityType="comment"
                subjectLabel="este comentario"
            />
        </article>
    );
}

export function PostDetail({
    post,
}: {
    readonly post: CommunityPostDetailData;
}): React.JSX.Element {
    const weaponName = getWeapon(post.snapshot.weaponId)?.name ?? post.snapshot.weaponId;
    const scopeName =
        getScope(post.snapshot.scopeId, post.snapshot.patchVersion)?.name ?? post.snapshot.scopeId;
    const publishedLabel = formatPublishedLabel(post.publishedAt);
    const creatorBadge = post.authorProfile
        ? formatCommunityCreatorStatusBadge(post.authorProfile.creatorProgramStatus)
        : null;
    const reportDisabledReason = post.viewerCanReport
        ? null
        : 'Entre na sua conta para reportar conteudo da comunidade.';
    const reportButtonClassName = styles.cardAction || 'btn btn-secondary';
    const leadSummary = buildLeadSummary({
        weaponName,
        patchVersion: post.snapshot.patchVersion,
        distance: post.snapshot.distance,
        diagnoses: post.snapshot.diagnoses,
    });

    return (
        <div className={styles.postDetailStack}>
            <section
                className={`glass-card ${styles.postHeroBoard}`}
                data-community-section="post-hero"
            >
                <div className={styles.postHeroGrid}>
                    <div className={styles.postHeroCopy}>
                        <div className={styles.profileSlugRail}>
                            <span className={styles.boardEyebrow}>Post publico</span>
                            <span className={styles.loadoutChipMuted}>
                                {statusLabelByValue[post.status]}
                            </span>
                            {post.authorProfile ? (
                                <Link className={styles.loadoutChip} href={post.authorProfile.profileHref}>
                                    {post.authorProfile.displayName}
                                </Link>
                            ) : (
                                <span className={styles.loadoutChipMuted}>Autor sem perfil aberto</span>
                            )}
                            <span className={styles.authorMeta}>Publicado {publishedLabel}</span>
                        </div>

                        <h1 className={styles.profileTitle}>{post.title}</h1>
                        <p className={styles.profileLead}>{post.excerpt}</p>

                        <div className={styles.loadoutChips}>
                            <span className={styles.loadoutChip}>{weaponName}</span>
                            <span className={styles.loadoutChip}>Patch {post.snapshot.patchVersion}</span>
                            <span className={styles.loadoutChip}>{scopeName}</span>
                            <span className={styles.loadoutChip}>{post.snapshot.distance} m</span>
                        </div>

                        <p className={styles.postHeroSummary}>{leadSummary}</p>

                        <div className={styles.profileActionDeck}>
                            <CopySensButton slug={post.slug} />
                            <LikeButton
                                initialLikeCount={post.engagement.likeCount}
                                initialLiked={post.engagement.viewerHasLiked}
                                slug={post.slug}
                            />
                            <SaveButton
                                initialSaved={post.engagement.viewerHasSaved}
                                slug={post.slug}
                            />
                            <ReportButton
                                className={reportButtonClassName}
                                disabledHref={post.viewerCanReport ? undefined : '/login'}
                                disabledReason={reportDisabledReason}
                                entityId={post.id}
                                entityType="post"
                                subjectLabel="este post"
                            />
                        </div>
                    </div>

                    <aside className={styles.postHeroAside}>
                        <span className={styles.sectionKicker}>Leitura principal</span>
                        <h2 className={styles.sectionTitle}>O que esse post segura</h2>
                        <p className={styles.sectionSummary}>{leadSummary}</p>

                        {post.authorProfile ? (
                            <div className={styles.postAuthorSummary}>
                                <strong>{post.authorProfile.displayName}</strong>
                                {creatorBadge ? (
                                    <span className={styles.loadoutChipMuted}>{creatorBadge.label}</span>
                                ) : null}
                                <Link className={styles.cardAction} href={post.authorProfile.profileHref}>
                                    Ver perfil
                                </Link>
                            </div>
                        ) : (
                            <p className={styles.profileStatusNote}>
                                O perfil do autor nao esta aberto agora, entao a leitura continua
                                daqui sem esse atalho.
                            </p>
                        )}
                    </aside>
                </div>
            </section>

            <div className={styles.postDetailGrid}>
                <section
                    className={`glass-card ${styles.postNarrativePanel}`}
                    data-community-section="post-narrative"
                >
                    <div className={styles.sectionHeader}>
                        <div>
                            <span className={styles.sectionKicker}>Leitura do post</span>
                            <h2 className={styles.sectionTitle}>Resumo e diagnosticos</h2>
                        </div>
                        <p className={styles.sectionSummary}>
                            Texto aberto pelo autor e sinais tecnicos que seguram a conversa.
                        </p>
                    </div>

                    <article className={styles.postBodyPlate}>
                        <span className={styles.sectionKicker}>Resumo rapido</span>
                        <p className={styles.postBodyCopy}>{post.bodyMarkdown}</p>
                    </article>

                    <div className={styles.diagnosisGrid}>
                        {post.snapshot.diagnoses.map((diagnosis) => (
                            <DiagnosisCard
                                key={`${diagnosis.type}-${diagnosis.description}`}
                                diagnosis={diagnosis}
                            />
                        ))}
                    </div>
                </section>

                <aside className={styles.postSideRail}>
                    <section
                        className={`glass-card ${styles.postSnapshotPanel}`}
                        data-community-section="post-technical-context"
                    >
                        <div className={styles.sectionHeader}>
                            <div>
                                <span className={styles.sectionKicker}>Contexto tecnico</span>
                                <h2 className={styles.sectionTitle}>Leitura rapida</h2>
                            </div>
                            <p className={styles.sectionSummary}>
                                Arma, patch, mira e distancia que sustentam este recorte.
                            </p>
                        </div>

                        <div className={styles.postSnapshotGrid}>
                            <div className={styles.postSnapshotItem}>
                                <span className={styles.profileProofLabel}>Patch</span>
                                <strong className={styles.profileProofValue}>
                                    {post.snapshot.patchVersion}
                                </strong>
                            </div>
                            <div className={styles.postSnapshotItem}>
                                <span className={styles.profileProofLabel}>Arma</span>
                                <strong className={styles.postSnapshotValue}>{weaponName}</strong>
                            </div>
                            <div className={styles.postSnapshotItem}>
                                <span className={styles.profileProofLabel}>Mira</span>
                                <strong className={styles.postSnapshotValue}>{scopeName}</strong>
                            </div>
                            <div className={styles.postSnapshotItem}>
                                <span className={styles.profileProofLabel}>Distancia</span>
                                <strong className={styles.postSnapshotValue}>
                                    {post.snapshot.distance} m
                                </strong>
                            </div>
                        </div>
                    </section>

                    <section
                        className={`glass-card ${styles.postContinuityPanel}`}
                        data-community-section="community-continuity-links"
                    >
                        <div className={styles.sectionHeader}>
                            <div>
                                <span className={styles.sectionKicker}>Continuar por aqui</span>
                                <h2 className={styles.sectionTitle}>Proximos caminhos</h2>
                            </div>
                            <p className={styles.sectionSummary}>
                                Autor, arma, patch e diagnostico para seguir sem inventar contexto.
                            </p>
                        </div>

                        <div className={styles.postContinuityList}>
                            {post.authorProfile ? (
                                <PostContinuityCard
                                    actionLabel="Ver perfil"
                                    badge={creatorBadge?.label ?? null}
                                    description="Volte para o perfil do autor e veja os outros recortes publicos que ele ja abriu."
                                    href={post.authorProfile.profileHref}
                                    title={post.authorProfile.displayName}
                                />
                            ) : (
                                <article className={styles.postContinuityCard}>
                                    <span className={styles.loadoutChipMuted}>Autor</span>
                                    <h3>Perfil indisponivel</h3>
                                    <p>
                                        O perfil do autor nao esta aberto agora, entao o post segue
                                        sem esse atalho.
                                    </p>
                                </article>
                            )}

                            {post.communityContinuityLinks.map((link) => (
                                <PostContinuityCard
                                    key={link.key}
                                    actionLabel="Ver posts parecidos"
                                    badge={formatContinuityLabel(link.key)}
                                    description={link.description}
                                    href={link.href}
                                    title={link.label}
                                />
                            ))}
                        </div>
                    </section>
                </aside>
            </div>

            <section
                aria-label="Comentarios do post"
                className={`glass-card ${styles.postConversationPanel}`}
                data-community-section="post-conversation"
            >
                <div className={styles.sectionHeader}>
                    <div>
                        <span className={styles.sectionKicker}>Conversa</span>
                        <h2 className={styles.sectionTitle}>Conversa deste post</h2>
                    </div>
                    <p className={styles.sectionSummary}>
                        Comentarios curtos e presos ao contexto tecnico que o post abriu.
                    </p>
                </div>

                <CommentForm
                    canSubmit={post.commentForm.canSubmit}
                    diagnosisOptions={post.commentForm.diagnosisOptions}
                    disabledReason={post.commentForm.disabledReason}
                    slug={post.slug}
                />

                {post.comments.length > 0 ? (
                    <div className={styles.commentList}>
                        {post.comments.map((comment) => (
                            <PostCommentCard
                                key={comment.id}
                                comment={comment}
                                viewerCanReport={post.viewerCanReport}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyKicker}>Conversa</span>
                        <h3>Ainda nao ha comentarios visiveis</h3>
                        <p>
                            {post.commentForm.canSubmit
                                ? 'Se este post puxou um ajuste claro, deixe um comentario curto e contextual.'
                                : 'Este post ainda nao recebeu resposta visivel. Entre na sua conta para puxar a conversa quando fizer sentido.'}
                        </p>
                        {!post.commentForm.canSubmit ? (
                            <div className={styles.emptyActions}>
                                <Link className="btn btn-primary" href="/login">
                                    Entrar para comentar
                                </Link>
                            </div>
                        ) : null}
                    </div>
                )}
            </section>
        </div>
    );
}
