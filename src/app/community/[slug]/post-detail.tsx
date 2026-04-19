import React from 'react';
import { getScope, getWeapon } from '@/game/pubg';
import type { Diagnosis } from '@/types/engine';

import type { VisibleCommunityPostComment } from '@/actions/community-comments';

import { CommentForm } from './comment-form';
import { CopySensButton } from './copy-sens-button';
import { LikeButton } from './like-button';
import { SaveButton } from './save-button';
import { ReportButton } from '../report-button';

export interface CommunityPostDetailData {
    readonly id: string;
    readonly slug: string;
    readonly status: 'draft' | 'published' | 'hidden' | 'archived' | 'deleted';
    readonly title: string;
    readonly excerpt: string;
    readonly bodyMarkdown: string;
    readonly publishedAt: Date | null;
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

const heroStyle = {
    display: 'grid',
    gap: 'var(--space-lg)',
    background:
        'linear-gradient(135deg, rgba(255, 107, 0, 0.12), rgba(0, 240, 255, 0.06))',
} as const;

const heroBadgeStyle = {
    width: 'fit-content',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid rgba(255, 107, 0, 0.28)',
    background: 'rgba(255, 107, 0, 0.12)',
    color: 'var(--color-accent-primary-light)',
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
} as const;

const snapshotGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 'var(--space-md)',
} as const;

const snapshotCardStyle = {
    display: 'grid',
    gap: '0.35rem',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(255, 255, 255, 0.03)',
} as const;

const snapshotLabelStyle = {
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
} as const;

const chipStyle = {
    width: 'fit-content',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
} as const;

const heroActionsStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 'var(--space-sm)',
} as const;

const statusLabelByValue: Record<CommunityPostDetailData['status'], string> = {
    draft: 'Rascunho',
    published: 'Publicado',
    hidden: 'Oculto',
    archived: 'Arquivado',
    deleted: 'Removido',
};

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

const commentMetaStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 'var(--space-sm)',
} as const;

const commentBodyStyle = {
    margin: 0,
    whiteSpace: 'pre-line',
} as const;

const commentDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

export function PostDetail({
    post,
}: {
    readonly post: CommunityPostDetailData;
}): React.JSX.Element {
    const weaponName = getWeapon(post.snapshot.weaponId)?.name ?? post.snapshot.weaponId;
    const scopeName =
        getScope(post.snapshot.scopeId, post.snapshot.patchVersion)?.name ?? post.snapshot.scopeId;
    const publishedLabel = formatPublishedLabel(post.publishedAt);

    return (
        <div style={{ display: 'grid', gap: 'var(--space-xl)' }}>
            <section className="glass-card" style={heroStyle}>
                <span style={heroBadgeStyle}>{statusLabelByValue[post.status]}</span>

                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                    <h1>{post.title}</h1>
                    <p style={{ fontSize: 'var(--text-lg)' }}>{post.excerpt}</p>
                    <p
                        style={{
                            margin: 0,
                            color: 'var(--color-text-muted)',
                            fontSize: 'var(--text-sm)',
                        }}
                    >
                        Atualizado a partir do snapshot persistido em {publishedLabel}.
                    </p>
                </div>

                <div style={heroActionsStyle}>
                    <CopySensButton slug={post.slug} />
                    <LikeButton
                        slug={post.slug}
                        initialLiked={post.engagement.viewerHasLiked}
                        initialLikeCount={post.engagement.likeCount}
                    />
                    <SaveButton
                        slug={post.slug}
                        initialSaved={post.engagement.viewerHasSaved}
                    />
                    <ReportButton
                        entityType="post"
                        entityId={post.id}
                        subjectLabel="este post"
                    />
                </div>
            </section>

            <section className="glass-card" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                <div style={{ display: 'grid', gap: 'var(--space-xs)' }}>
                    <h2 style={{ fontSize: 'var(--text-2xl)' }}>Leitura tecnica do snapshot</h2>
                    <p>
                        O detalhe publico le o snapshot persistido da publicacao para manter patch,
                        arma, scope, distancia e diagnosticos auditaveis.
                    </p>
                </div>

                <div style={snapshotGridStyle}>
                    <div style={snapshotCardStyle}>
                        <span style={snapshotLabelStyle}>Patch</span>
                        <strong>Patch {post.snapshot.patchVersion}</strong>
                    </div>

                    <div style={snapshotCardStyle}>
                        <span style={snapshotLabelStyle}>Arma</span>
                        <strong>{weaponName}</strong>
                    </div>

                    <div style={snapshotCardStyle}>
                        <span style={snapshotLabelStyle}>Scope</span>
                        <strong>{scopeName}</strong>
                    </div>

                    <div style={snapshotCardStyle}>
                        <span style={snapshotLabelStyle}>Distancia</span>
                        <strong>{post.snapshot.distance} m</strong>
                    </div>
                </div>
            </section>

            <section className="glass-card" style={{ display: 'grid', gap: 'var(--space-md)' }}>
                <div style={{ display: 'grid', gap: 'var(--space-xs)' }}>
                    <h2 style={{ fontSize: 'var(--text-2xl)' }}>Diagnosticos do snapshot</h2>
                    <p>Diagnosticos tecnicos congelados na publicacao original.</p>
                </div>

                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    {post.snapshot.diagnoses.map((diagnosis) => (
                        <article
                            key={`${diagnosis.type}-${diagnosis.description}`}
                            style={{
                                display: 'grid',
                                gap: 'var(--space-sm)',
                                padding: 'var(--space-md)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--color-border)',
                                background: 'rgba(255, 255, 255, 0.02)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    gap: 'var(--space-sm)',
                                }}
                            >
                                <span style={chipStyle}>{diagnosis.type}</span>
                                <strong>{humanizeDiagnosisType(diagnosis.type)}</strong>
                                <span style={{ color: 'var(--color-text-muted)' }}>
                                    Severidade {diagnosis.severity}
                                </span>
                            </div>

                            <p style={{ margin: 0 }}>{diagnosis.description}</p>
                            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                                <strong>Causa:</strong> {diagnosis.cause}
                            </p>
                            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                                <strong>Remediacao:</strong> {diagnosis.remediation}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="glass-card" style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                <h2 style={{ fontSize: 'var(--text-2xl)' }}>Contexto tecnico</h2>
                <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{post.bodyMarkdown}</p>
            </section>

            <section
                aria-label="Comentarios do post"
                className="glass-card"
                style={{ display: 'grid', gap: 'var(--space-lg)' }}
            >
                <div style={{ display: 'grid', gap: 'var(--space-xs)' }}>
                    <h2 style={{ fontSize: 'var(--text-2xl)' }}>Comentarios</h2>
                    <p>
                        Feedback simples e em ordem cronologica para manter a leitura publica clara.
                    </p>
                </div>

                <CommentForm
                    slug={post.slug}
                    diagnosisOptions={post.commentForm.diagnosisOptions}
                    canSubmit={post.commentForm.canSubmit}
                    disabledReason={post.commentForm.disabledReason}
                />

                {post.comments.length > 0 ? (
                    <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                        {post.comments.map((comment) => (
                            <article
                                key={comment.id}
                                data-community-comment-item={comment.id}
                                style={{
                                    display: 'grid',
                                    gap: 'var(--space-sm)',
                                    padding: 'var(--space-md)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--color-border)',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                }}
                            >
                                <div style={commentMetaStyle}>
                                    <strong>{comment.author.name ?? 'Jogador da comunidade'}</strong>
                                    <span style={{ color: 'var(--color-text-muted)' }}>
                                        {commentDateFormatter.format(comment.createdAt)}
                                    </span>
                                    {comment.diagnosisContextKey ? (
                                        <span
                                            data-community-comment-context={comment.diagnosisContextKey}
                                            style={chipStyle}
                                        >
                                            {comment.diagnosisContextKey}
                                        </span>
                                    ) : null}
                                </div>

                                <p data-community-comment-body={comment.id} style={commentBodyStyle}>
                                    {comment.bodyMarkdown}
                                </p>

                                <ReportButton
                                    entityType="comment"
                                    entityId={comment.id}
                                    subjectLabel="este comentario"
                                />
                            </article>
                        ))}
                    </div>
                ) : (
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                        Nenhum comentario visivel ainda.
                    </p>
                )}
            </section>
        </div>
    );
}
