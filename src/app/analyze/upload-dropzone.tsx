import React, { useRef } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';

import { WeaponIcon } from '@/ui/components/weapon-icon';
import type { WeaponSupportStatus } from '@/ui/components/weapon-support-status';

import styles from './analysis.module.css';

export type UploadDropzoneState =
    | 'empty'
    | 'drag_hover'
    | 'file_selected'
    | 'validating'
    | 'invalid_file'
    | 'quality_warning'
    | 'processing_frames'
    | 'quota_warning'
    | 'quota_exhausted'
    | 'analysis_ready'
    | 'error';

export interface UploadDropzoneQuotaNotice {
    readonly label: string;
    readonly body: string;
    readonly usageLabel: string;
    readonly tone: 'success' | 'warning' | 'error' | 'info';
    readonly ctaLabel: string | null;
    readonly href: string | null;
}

export interface UploadDropzoneWeapon {
    readonly id: string;
    readonly name: string;
    readonly category: string;
    readonly supportStatus: WeaponSupportStatus;
}

interface UploadDropzoneProps {
    readonly state: UploadDropzoneState;
    readonly guidance: string;
    readonly clipRequirementLabel: string;
    readonly onFileSelected: (file: File) => void;
    readonly onOpenGuide?: () => void;
    readonly onDragActiveChange?: (active: boolean) => void;
    readonly dragActive?: boolean;
    readonly errorMessage?: string | null;
    readonly qualityMessage?: string | null;
    readonly quotaNotice?: UploadDropzoneQuotaNotice | null;
    readonly selectedWeapon?: UploadDropzoneWeapon | null;
    readonly selectedFileLabel?: string | null;
    readonly density?: 'full' | 'compact';
}

const STATE_LABELS: Record<UploadDropzoneState, string> = {
    empty: 'Pronto para clip',
    drag_hover: 'Solte para validar',
    file_selected: 'Clip selecionado',
    validating: 'Validando clip',
    invalid_file: 'Clip invalido',
    quality_warning: 'Evidencia pode ficar fraca',
    processing_frames: 'Lendo frames no navegador',
    quota_warning: 'Poucas analises uteis restantes',
    quota_exhausted: 'Limite Free do mes atingido',
    analysis_ready: 'Analise pronta',
    error: 'Acao bloqueada',
};

function resolveStateTone(state: UploadDropzoneState): 'info' | 'success' | 'warning' | 'error' | 'pro' {
    switch (state) {
        case 'file_selected':
        case 'analysis_ready':
            return 'success';
        case 'quality_warning':
        case 'quota_warning':
            return 'warning';
        case 'invalid_file':
        case 'quota_exhausted':
        case 'error':
            return 'error';
        case 'processing_frames':
        case 'validating':
            return 'info';
        case 'empty':
        case 'drag_hover':
            return 'pro';
    }
}

function getFilesFromInput(event: React.ChangeEvent<HTMLInputElement>): File | undefined {
    return event.target.files?.[0];
}

export function UploadDropzone({
    state,
    guidance,
    clipRequirementLabel,
    onFileSelected,
    onOpenGuide,
    onDragActiveChange,
    dragActive = false,
    errorMessage,
    qualityMessage,
    quotaNotice,
    selectedWeapon,
    selectedFileLabel,
    density = 'full',
}: UploadDropzoneProps): React.JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    const visibleState = dragActive ? 'drag_hover' : state;
    const tone = resolveStateTone(visibleState);
    const isCompact = density === 'compact';

    const openFilePicker = (): void => {
        inputRef.current?.click();
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        onDragActiveChange?.(false);
        const file = event.dataTransfer.files[0];
        if (file) {
            onFileSelected(file);
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFilePicker();
        }
    };

    const supportDescription = selectedWeapon?.supportStatus.description;
    const actionableQuotaNotice = quotaNotice && (quotaNotice.tone === 'warning' || quotaNotice.tone === 'error')
        ? quotaNotice
        : null;

    return (
        <section
            aria-label="Upload guiado de clip de spray"
            className={[
                styles.uploadDropzone,
                isCompact && styles.uploadDropzoneCompact,
                dragActive && styles.uploadDropzoneActive,
            ].filter(Boolean).join(' ')}
            data-state={visibleState}
            data-tone={tone}
            onDragEnter={() => onDragActiveChange?.(true)}
            onDragLeave={() => onDragActiveChange?.(false)}
            onDragOver={(event) => {
                event.preventDefault();
                onDragActiveChange?.(true);
            }}
            onDrop={handleDrop}
        >
            <div
                className={styles.uploadDropzoneTarget}
                onClick={openFilePicker}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={0}
            >
                <div className={styles.uploadStateBadge} data-tone={tone}>
                    {STATE_LABELS[visibleState]}
                </div>
                <div className={styles.uploadMainCopy}>
                    <h3>{isCompact ? 'Clip carregado no navegador' : 'Envie um spray utilizavel'}</h3>
                    <p>{guidance}</p>
                    <p className={styles.browserFirstCopy}>
                        Seu video nao precisa ir para o servidor para ser analisado.
                    </p>
                </div>
                <button className={styles.uploadPickerButton} type="button">
                    Escolher clip de spray
                </button>
                <input
                    ref={inputRef}
                    aria-label="Escolher clip de spray"
                    className={styles.uploadFileInput}
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={(event) => {
                        const file = getFilesFromInput(event);
                        if (file) {
                            onFileSelected(file);
                        }
                    }}
                />
            </div>

            <div className={styles.uploadEvidenceGrid}>
                <span>{clipRequirementLabel}</span>
                <span>Reticulo visivel</span>
                <span>Uma arma</span>
                <span>Spray continuo</span>
                <span>Lendo frames no navegador</span>
            </div>

            {selectedFileLabel ? (
                <p className={styles.uploadSelectedFile}>{selectedFileLabel}</p>
            ) : null}

            {selectedWeapon ? (
                <div className={styles.uploadWeaponStatus}>
                    <WeaponIcon
                        category={selectedWeapon.category}
                        showStatus
                        size={56}
                        weaponId={selectedWeapon.id}
                        weaponName={selectedWeapon.name}
                    />
                    <div>
                        <strong>{selectedWeapon.name}</strong>
                        <p>{selectedWeapon.supportStatus.label}: {supportDescription}</p>
                    </div>
                </div>
            ) : null}

            {qualityMessage ? (
                <div className={styles.uploadInlineState} data-tone="warning">
                    <strong>Evidencia fraca</strong>
                    <p>{qualityMessage}</p>
                </div>
            ) : null}

            {errorMessage ? (
                <div className={styles.uploadInlineState} data-tone="error">
                    <strong>Nao foi possivel validar este clip</strong>
                    <p>{errorMessage}</p>
                </div>
            ) : null}

            {actionableQuotaNotice ? (
                <div className={styles.uploadInlineState} data-tone={actionableQuotaNotice.tone}>
                    <strong>{actionableQuotaNotice.label}</strong>
                    <p>{actionableQuotaNotice.body}</p>
                    <span>{actionableQuotaNotice.usageLabel}</span>
                    {actionableQuotaNotice.href && actionableQuotaNotice.ctaLabel ? (
                        <a className="btn btn-ghost btn-sm" href={actionableQuotaNotice.href}>
                            {actionableQuotaNotice.ctaLabel === 'Ver Pro' ? 'Ver Planos' : actionableQuotaNotice.ctaLabel}
                        </a>
                    ) : null}
                </div>
            ) : null}

            {onOpenGuide ? (
                <button className={styles.uploadGuideButton} type="button" onClick={onOpenGuide}>
                    Ver guia de captura utilizavel
                </button>
            ) : null}
        </section>
    );
}
