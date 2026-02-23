/**
 * Analysis Client — Upload de clip, seleção de arma/mira, e pipeline de análise.
 */

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { validateAndPrepareVideo, releaseVideoUrl, extractFrames, trackCrosshair, buildTrajectory, calculateSprayMetrics, runDiagnostics, generateSensitivityRecommendation, generateCoaching } from '@/core';
import type { VideoMetadata } from '@/core';
import type { AnalysisResult } from '@/types/engine';
import { WEAPON_LIST, getWeapon, SCOPE_LIST } from '@/game/pubg';
import { ResultsDashboard } from './results-dashboard';
import { saveAnalysisResult } from '@/actions/history';
import type { PlayerProfile } from '@/db/schema';
import styles from './analysis.module.css';

type AnalysisStep = 'upload' | 'settings' | 'processing' | 'done' | 'error';
type ProcessingPhase = 'extracting' | 'tracking' | 'calculating' | 'diagnosing' | 'done';

interface Props {
    readonly profile: PlayerProfile;
}

export function AnalysisClient({ profile }: Props): React.JSX.Element {
    const [step, setStep] = useState<AnalysisStep>('upload');
    const [video, setVideo] = useState<VideoMetadata | null>(null);
    const [weaponId, setWeaponId] = useState('m416');
    const [scopeId, setScopeId] = useState('red-dot');
    const [distance, setDistance] = useState(30);
    const [phase, setPhase] = useState<ProcessingPhase>('extracting');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const weaponsByCategory = useMemo(() => {
        const grouped: Record<string, typeof WEAPON_LIST[number][]> = {};
        for (const w of WEAPON_LIST) {
            if (!grouped[w.category]) grouped[w.category] = [];
            grouped[w.category]!.push(w);
        }
        return grouped;
    }, []);

    const handleFile = useCallback(async (file: File) => {
        setError(null);
        const result = await validateAndPrepareVideo(file);
        if (!result.valid) {
            setError(result.error.message);
            return;
        }
        setVideo(result.metadata);
        setStep('settings');
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) void handleFile(file);
    }, [handleFile]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
    }, [handleFile]);

    const handleAnalyze = useCallback(async () => {
        if (!video) return;
        setStep('processing');
        setPhase('extracting');
        setProgress(0);

        try {
            // Step 1: Extract frames
            const frames = await extractFrames(video.url, Math.min(video.fps, 30), (p) => {
                setProgress(p.percent * 0.3); // 0-30%
            });

            // Step 2: Track crosshair
            setPhase('tracking');
            const tracking = trackCrosshair(frames);
            setProgress(60);

            // Step 3: Calculate metrics
            setPhase('calculating');
            const weapon = getWeapon(weaponId);
            if (!weapon) throw new Error('Arma não encontrada');
            const trajectory = buildTrajectory(tracking, weapon);

            // Extrair Resolução e FOV do hardware físico do jogador para precisão perfeita (Pixels -> Angular Yaw/Pitch)
            const monitorWidth = parseInt(profile.monitorResolution.split('x')[0] || '1920', 10);
            const pixelToDegree = profile.fov / monitorWidth;

            const metrics = calculateSprayMetrics(trajectory, weapon, pixelToDegree);
            setProgress(80);

            // Step 4: Run diagnostics + sensitivity + coaching
            setPhase('diagnosing');
            const diagnoses = runDiagnostics(metrics, weapon.category);
            const sensitivity = generateSensitivityRecommendation(
                metrics, diagnoses,
                profile.mouseDpi,
                profile.playStyle as 'arm' | 'wrist' | 'hybrid',
                profile.gripStyle as 'palm' | 'claw' | 'fingertip' | 'hybrid',
                profile.generalSens,
                profile.scopeSens as Record<string, number>
            );
            const coaching = generateCoaching(diagnoses);
            setProgress(100);

            setPhase('done');
            const finalResult = {
                id: crypto.randomUUID(),
                timestamp: new Date(),
                trajectory,
                metrics,
                diagnoses,
                sensitivity,
                coaching,
            };

            try {
                // Save to database
                await saveAnalysisResult(finalResult, weaponId, scopeId, distance);
            } catch (err) {
                console.error('[saveAnalysisResult]', err);
            }

            setResult(finalResult);
            setStep('done');
        } catch (err) {
            console.error('[Analysis Error]:', err);
            setError(err instanceof Error ? err.message : 'Erro na análise');
            setStep('error');
        }
    }, [video, weaponId]);

    const handleReset = useCallback(() => {
        if (video) releaseVideoUrl(video.url);
        setVideo(null);
        setStep('upload');
        setResult(null);
        setError(null);
    }, [video]);

    const phaseLabels: Record<ProcessingPhase, string> = {
        extracting: '🎞️ Extraindo frames...',
        tracking: '🎯 Rastreando mira...',
        calculating: '📊 Calculando métricas...',
        diagnosing: '🧠 Diagnosticando...',
        done: '✅ Análise concluída!',
    };

    // ═══ Upload Step ═══
    if (step === 'upload') {
        return (
            <div>
                <div
                    className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    aria-label="Área de upload de vídeo"
                >
                    <div className={styles.dropzoneIcon}>🎬</div>
                    <h3>Solte seu clip aqui</h3>
                    <p>MP4 ou WebM, 5-15 segundos, até 50MB</p>
                    <button className="btn btn-primary" type="button">Escolher Arquivo</button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/webm"
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                        aria-hidden="true"
                    />
                </div>
                {error && <div className={styles.error}>❌ {error}</div>}
            </div>
        );
    }

    // ═══ Settings Step ═══
    if (step === 'settings' && video) {
        return (
            <div className="animate-fade-in">
                <div className={`glass-card ${styles.videoPreview}`}>
                    <video src={video.url} controls className={styles.video} />
                    <div className={styles.videoMeta}>
                        <span className="badge badge-info">{video.width}×{video.height}</span>
                        <span className="badge badge-info">{Math.round(video.duration)}s</span>
                        <span className="badge badge-info">{video.fps} FPS</span>
                    </div>
                </div>

                <div className={`glass-card ${styles.settingsForm}`}>
                    <h3>Configurações da Análise</h3>
                    <div className={styles.settingsGrid}>
                        <div className={styles.field}>
                            <label className="input-label" htmlFor="weapon">Arma *</label>
                            <select id="weapon" className="input select" value={weaponId} onChange={e => setWeaponId(e.target.value)}>
                                {Object.entries(weaponsByCategory).map(([cat, weapons]) => (
                                    <optgroup key={cat} label={cat.toUpperCase()}>
                                        {weapons.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className="input-label" htmlFor="scope">Mira *</label>
                            <select id="scope" className="input select" value={scopeId} onChange={e => setScopeId(e.target.value)}>
                                {SCOPE_LIST.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className="input-label" htmlFor="dist">Distância (m) *</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                <input id="dist" type="range" className="slider" min={10} max={300} value={distance} onChange={e => setDistance(Number(e.target.value))} />
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-primary)', minWidth: '40px' }}>{distance}m</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.settingsActions}>
                        <button className="btn btn-ghost" onClick={handleReset}>← Trocar Clip</button>
                        <button className="btn btn-primary btn-lg" onClick={handleAnalyze}>🚀 Iniciar Análise</button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══ Processing Step ═══
    if (step === 'processing') {
        return (
            <div className={`glass-card ${styles.processing}`}>
                <div className={styles.processingSpinner} />
                <h3>{phaseLabels[phase]}</h3>
                <div className="progress-bar" style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    {Math.round(progress)}%
                </p>
            </div>
        );
    }

    // ═══ Error Step ═══
    if (step === 'error') {
        return (
            <div className={`glass-card ${styles.processing}`}>
                <div style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-lg)' }}>❌</div>
                <h3>Erro na Análise</h3>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={handleReset} style={{ marginTop: 'var(--space-xl)' }}>Tentar Novamente</button>
            </div>
        );
    }

    // ═══ Results Step ═══
    if (step === 'done' && result) {
        return (
            <div className="animate-fade-in">
                <div className={styles.resultHeader}>
                    <h2>Resultado da Análise</h2>
                    <button className="btn btn-ghost" onClick={handleReset}>← Nova Análise</button>
                </div>
                <ResultsDashboard result={result} />
            </div>
        );
    }

    return <div />;
}
