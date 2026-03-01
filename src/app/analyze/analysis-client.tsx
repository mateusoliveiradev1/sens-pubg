/**
 * Analysis Client — Upload de clip, seleção de arma/mira, e pipeline de análise.
 */

'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { validateAndPrepareVideo, releaseVideoUrl, extractFrames, trackCrosshair, buildTrajectory, calculateSprayMetrics, runDiagnostics, generateSensitivityRecommendation, generateCoaching } from '@/core';
import type { VideoMetadata } from '@/core';
import type { AnalysisResult, PlayerStance, MuzzleAttachment, GripAttachment, StockAttachment, WeaponLoadout } from '@/types/engine';
import { WEAPON_LIST, getWeapon, SCOPE_LIST } from '@/game/pubg';
import { ResultsDashboard } from './results-dashboard';
import { saveAnalysisResult } from '@/actions/history';
import type { PlayerProfile } from '@/db/schema';
import { AnalysisGuide } from './analysis-guide';
import styles from './analysis.module.css';
import type { weaponProfiles } from '@/db/schema';

// Worker type helper
interface WorkerMessage {
    type: string;
    payload: any;
}

const MUZZLE_LABELS: Record<MuzzleAttachment, string> = { none: 'Nenhum', compensator: 'Compensator', flash_hider: 'Flash Hider', suppressor: 'Suppressor', muzzle_brake: 'Muzzle Brake', choke: 'Choke', duckbill: 'Duckbill' };
const GRIP_LABELS: Record<GripAttachment, string> = { none: 'Nenhum', vertical: 'Vertical Grip', angled: 'Angled Grip', half: 'Half Grip', thumb: 'Thumb Grip', lightweight: 'Lightweight Grip', laser: 'Laser Sight', ergonomic: 'Ergonomic Grip' };
const STOCK_LABELS: Record<StockAttachment, string> = { none: 'Nenhuma', tactical: 'Tactical Stock', heavy: 'Heavy Stock', folding: 'Folding Stock', cheek_pad: 'Cheek Pad' };

type AnalysisStep = 'upload' | 'settings' | 'processing' | 'done' | 'error';
type ProcessingPhase = 'extracting' | 'tracking' | 'calculating' | 'diagnosing' | 'done';
type CrosshairColor = 'RED' | 'GREEN';

interface Props {
    readonly profile: any; // Using any temporarily for combined type
    readonly dbWeapons: (typeof weaponProfiles.$inferSelect)[];
}

export function AnalysisClient({ profile, dbWeapons }: Props): React.JSX.Element {
    const [step, setStep] = useState<AnalysisStep>('upload');
    const [video, setVideo] = useState<VideoMetadata | null>(null);
    const [weaponId, setWeaponId] = useState('beryl-m762'); // Default to a common weapon
    const [scopeId, setScopeId] = useState('red-dot');
    const [distance, setDistance] = useState(30);
    const [stance, setStance] = useState<PlayerStance>('standing');
    const [muzzle, setMuzzle] = useState<MuzzleAttachment>('none');
    const [grip, setGrip] = useState<GripAttachment>('none');
    const [stock, setStock] = useState<StockAttachment>('none');
    const [crosshairColor, setCrosshairColor] = useState<CrosshairColor>('RED');
    const [markers, setMarkers] = useState<{ id: string, time: number }[]>([{ id: crypto.randomUUID(), time: 0 }]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [phase, setPhase] = useState<ProcessingPhase>('extracting');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [qualityWarning, setQualityWarning] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [worker, setWorker] = useState<Worker | null>(null);

    // Initialize Worker
    useEffect(() => {
        const w = new Worker(new URL('../../workers/aimAnalyzer.worker.ts', import.meta.url));
        setWorker(w);
        return () => w.terminate();
    }, []);

    const weaponsByCategory = useMemo(() => {
        const grouped: Record<string, (typeof weaponProfiles.$inferSelect)[]> = {};
        for (const w of dbWeapons) {
            if (!grouped[w.category]) grouped[w.category] = [];
            grouped[w.category]!.push(w);
        }
        return grouped;
    }, [dbWeapons]);

    const currentDbWeapon = useMemo(() =>
        dbWeapons.find(w => w.id === weaponId || w.name.toLowerCase().replace(' ', '-') === weaponId),
        [dbWeapons, weaponId]);

    const hasAttachment = (type: string) => currentDbWeapon?.attachments?.includes(type);


    const handleFile = useCallback(async (file: File) => {
        setError(null);
        setQualityWarning(null);

        const result = await validateAndPrepareVideo(file);
        if (!result.valid) {
            setError(result.error.message);
            return;
        }

        // Logic check for Resolution & FPS warnings
        if (result.metadata.height < 1080) {
            setQualityWarning(`Resolução detectada: ${result.metadata.height}p. Recomendamos 1080p para maior precisão.`);
        } else if (result.metadata.fps < 59) {
            setQualityWarning(`Framerate detectado: ${Math.round(result.metadata.fps)} FPS. Recomendamos 60 FPS para capturar cada micro-ajuste.`);
        }

        setVideo(result.metadata);
        setMarkers([{ id: crypto.randomUUID(), time: 0 }]);
        setStep('settings');
    }, []);

    const addMarker = useCallback(() => {
        setMarkers(prev => [...prev, { id: crypto.randomUUID(), time: video?.duration ? video.duration / 2 : 0 }]);
    }, [video]);

    const removeMarker = useCallback((id: string) => {
        setMarkers(prev => prev.length > 1 ? prev.filter(m => m.id !== id) : prev);
    }, []);

    const updateMarker = useCallback((id: string, time: number) => {
        setMarkers(prev => prev.map(m => m.id === id ? { ...m, time } : m));
        if (videoRef.current) videoRef.current.currentTime = time;
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
        if (!video || !worker) return;
        setStep('processing');
        setPhase('extracting');
        setProgress(0);

        try {
            const dbWeapon = dbWeapons.find(w => w.id === weaponId);
            if (!dbWeapon) throw new Error('Arma não encontrada no banco');

            const subSessions: AnalysisResult[] = [];
            const stepIncrement = 100 / markers.length;

            for (let i = 0; i < markers.length; i++) {
                const marker = markers[i]!;
                const startTime = marker.time;

                setPhase('extracting');
                const expectedDurationSecs = (30 * 0.086) + 0.5; // TODO: Get from DB weapon profile

                // Prepare Worker for this segment
                worker.postMessage({ type: 'START_ANALYSIS', payload: { startX: video.width / 2, startY: video.height / 2 } });

                // Multipliers Logic
                const currentMultipliers = {
                    vertical: (dbWeapon.multipliers as any)[muzzle] || 1.0,
                    horizontal: 1.0 // TODO: Add logic for all attachments
                };

                const context = {
                    fov: profile.fov || 90,
                    resolutionY: parseInt(profile.resolution.split('x')[1] || '1080', 10),
                    weapon: {
                        id: dbWeapon.id,
                        name: dbWeapon.name,
                        category: dbWeapon.category,
                        baseVerticalRecoil: dbWeapon.baseVerticalRecoil,
                        baseHorizontalRng: dbWeapon.baseHorizontalRng,
                        fireRateMs: dbWeapon.fireRateMs,
                        multipliers: dbWeapon.multipliers
                    },
                    multipliers: currentMultipliers,
                    vsm: profile.sensVerticalMultiplier || 1.0,
                    crosshairColor: crosshairColor
                };

                // Frame-by-frame loop with streaming to Worker
                const frames = await extractFrames(
                    video.url,
                    Math.min(video.fps, 60),
                    startTime,
                    expectedDurationSecs,
                    (p) => {
                        setProgress((i * stepIncrement) + (p.percent * 0.5 * (stepIncrement / 100)));
                    },
                    (frame) => {
                        // Send frame to worker for background processing
                        worker.postMessage(
                            { type: 'PROCESS_FRAME', payload: { imageData: frame.imageData, context } },
                            [frame.imageData.data.buffer] // Transferable!
                        );
                    }
                );

                setPhase('calculating');
                // Wait for worker results
                const workerResult = await new Promise<any>((resolve) => {
                    const handler = (e: MessageEvent) => {
                        if (e.data.type === 'RESULT') {
                            worker.removeEventListener('message', handler);
                            resolve(e.data.payload);
                        }
                    };
                    worker.addEventListener('message', handler);
                    worker.postMessage({ type: 'FINISH_ANALYSIS' });
                });

                // Map Worker result to Engine Types for Dashboard compatibility
                const trajectory = buildTrajectory({
                    points: [],
                    trackingQuality: 1.0,
                    framesTracked: frames.length,
                    framesLost: 0
                }, getWeapon(weaponId)!);

                const mockMetrics = {
                    stabilityScore: workerResult.score,
                    verticalControlIndex: 1.0, // TODO: Map back from vError
                    horizontalNoiseIndex: workerResult.metrics.jitter,
                    initialRecoilResponseMs: 100 as any,
                    driftDirectionBias: { direction: 'neutral' as const, magnitude: workerResult.metrics.drift },
                    consistencyScore: workerResult.score,
                    burstVCI: 1.0, sustainedVCI: 1.0, fatigueVCI: 1.0,
                    burstHNI: 1.0, sustainedHNI: 1.0, fatigueHNI: 1.0,
                    sprayScore: workerResult.score,
                };

                const loadout: WeaponLoadout = { stance, muzzle, grip, stock };
                const diagnoses = runDiagnostics(mockMetrics as any, dbWeapon.category as any);
                const sensitivity = generateSensitivityRecommendation(
                    mockMetrics as any, diagnoses,
                    profile.mouseDpi,
                    profile.playStyle,
                    profile.gripStyle,
                    profile.mousepadWidth,
                    profile.scopeSens as Record<string, number>,
                    profile.verticalMultiplier
                );

                subSessions.push({
                    id: crypto.randomUUID(),
                    timestamp: new Date(),
                    trajectory,
                    loadout,
                    metrics: mockMetrics as any,
                    diagnoses,
                    sensitivity,
                    coaching: generateCoaching(diagnoses, loadout),
                });

                setProgress((i + 1) * stepIncrement);
            }

            // Aggregate Results with Weighted Average (by Duration)
            const totalDuration = subSessions.reduce((acc, s) => acc + s.trajectory.durationMs, 0) || 1;

            const avgStability = subSessions.reduce((acc, s) => acc + (s.metrics.stabilityScore * s.trajectory.durationMs), 0) / totalDuration;
            const avgVCI = subSessions.reduce((acc, s) => acc + (s.metrics.verticalControlIndex * s.trajectory.durationMs), 0) / totalDuration;
            const avgHNI = subSessions.reduce((acc, s) => acc + (s.metrics.horizontalNoiseIndex * s.trajectory.durationMs), 0) / totalDuration;
            const avgResponse = subSessions.reduce((acc, s) => acc + (s.metrics.initialRecoilResponseMs * s.trajectory.durationMs), 0) / totalDuration;
            const avgConsistency = subSessions.reduce((acc, s) => acc + (s.metrics.consistencyScore * s.trajectory.durationMs), 0) / totalDuration;

            // Average of Phase-based metrics
            const avgBurstVCI = subSessions.reduce((acc, s) => acc + (s.metrics.burstVCI * s.trajectory.durationMs), 0) / totalDuration;
            const avgSustainedVCI = subSessions.reduce((acc, s) => acc + (s.metrics.sustainedVCI * s.trajectory.durationMs), 0) / totalDuration;
            const avgFatigueVCI = subSessions.reduce((acc, s) => acc + (s.metrics.fatigueVCI * s.trajectory.durationMs), 0) / totalDuration;

            const finalMetrics = {
                ...subSessions[0]!.metrics,
                stabilityScore: Math.round(avgStability) as never,
                verticalControlIndex: Number(avgVCI.toFixed(2)),
                horizontalNoiseIndex: Number(avgHNI.toFixed(2)),
                initialRecoilResponseMs: Math.round(avgResponse) as never,
                consistencyScore: Math.round(avgConsistency) as never,
                burstVCI: avgBurstVCI,
                sustainedVCI: avgSustainedVCI,
                fatigueVCI: avgFatigueVCI,
            };

            const finalDiagnoses = runDiagnostics(finalMetrics as any, dbWeapon.category as any);
            const finalSens = generateSensitivityRecommendation(
                finalMetrics, finalDiagnoses,
                profile.mouseDpi,
                profile.playStyle,
                profile.gripStyle,
                profile.mousepadWidth,
                profile.scopeSens as Record<string, number>,
                profile.verticalMultiplier
            );

            const finalResult: AnalysisResult = {
                id: crypto.randomUUID(),
                timestamp: new Date(),
                trajectory: subSessions[0]!.trajectory, // Use first as preview
                loadout: { stance, muzzle, grip, stock },
                metrics: finalMetrics,
                diagnoses: finalDiagnoses,
                sensitivity: finalSens,
                coaching: generateCoaching(finalDiagnoses, { stance, muzzle, grip, stock }),
                subSessions,
            };

            try {
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
    }, [video, weaponId, markers, profile, scopeId, distance, stance, grip, muzzle, stock]);

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

                <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setIsGuideOpen(true)}
                        style={{ color: 'var(--color-accent-primary)' }}
                    >
                        📚 Como gravar o clipe perfeito?
                    </button>
                </div>

                <AnalysisGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
            </div>
        );
    }

    // ═══ Settings Step ═══
    if (step === 'settings' && video) {
        return (
            <div className="animate-fade-in">
                <div className={`glass-card ${styles.videoPreview}`}>
                    <video ref={videoRef} src={video.url} controls className={styles.video} />
                    <div className={styles.videoMeta}>
                        <span className="badge badge-info">{video.width}×{video.height}</span>
                        <span className="badge badge-info">{Math.round(video.duration)}s</span>
                        <span className="badge badge-info">{video.fps} FPS</span>
                    </div>
                </div>

                {qualityWarning && (
                    <div className={styles.qualityWarning}>
                        <span className={styles.warningIcon}>⚠️</span>
                        <div className={styles.warningText}>
                            <strong>Aviso de Qualidade:</strong> {qualityWarning}
                        </div>
                    </div>
                )}

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

                        {/* Stance and Loadout Row */}
                        <div className={styles.field}>
                            <label className="input-label" htmlFor="stance">Postura *</label>
                            <select id="stance" className="input select" value={stance} onChange={e => setStance(e.target.value as PlayerStance)}>
                                <option value="standing">Em pé</option>
                                <option value="crouching">Agachado</option>
                                <option value="prone">Deitado</option>
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className="input-label" htmlFor="muzzle">Ponta (Muzzle)</label>
                            <select id="muzzle" className="input select" value={muzzle} onChange={e => setMuzzle(e.target.value as MuzzleAttachment)} disabled={!hasAttachment('muzzle')}>
                                {['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake'].map(m => (
                                    <option key={m} value={m}>{MUZZLE_LABELS[m as MuzzleAttachment]}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className="input-label" htmlFor="grip">Empunhadura (Grip)</label>
                            <select id="grip" className="input select" value={grip} onChange={e => setGrip(e.target.value as GripAttachment)} disabled={!hasAttachment('grip')}>
                                {['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic'].map(g => (
                                    <option key={g} value={g}>{GRIP_LABELS[g as GripAttachment]}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className="input-label" htmlFor="stock">Coronha (Stock)</label>
                            <select id="stock" className="input select" value={stock} onChange={e => setStock(e.target.value as StockAttachment)} disabled={!hasAttachment('stock')}>
                                {['none', 'tactical', 'heavy', 'folding', 'cheek_pad'].map(s => (
                                    <option key={s} value={s}>{STOCK_LABELS[s as StockAttachment]}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className="input-label" htmlFor="xhair">Cor do Retículo *</label>
                            <select id="xhair" className="input select" value={crosshairColor} onChange={e => setCrosshairColor(e.target.value as CrosshairColor)}>
                                <option value="RED">Vermelho (Padrão)</option>
                                <option value="GREEN">Verde Neon</option>
                            </select>
                        </div>
                        <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <label className="input-label">Identificação de Sprays *</label>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                                        Adicione marcadores no exato frame em que cada burst começa. A IA analisará todos e fará a média.
                                    </p>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={addMarker}>+ Adicionar Spray</button>
                            </div>

                            <div className={styles.markersList}>
                                {markers.map((m, idx) => (
                                    <div key={m.id} className={styles.markerRow}>
                                        <span className={styles.markerLabel}>Spray #{idx + 1}</span>
                                        <input
                                            type="range"
                                            className="slider"
                                            min={0}
                                            max={video.duration}
                                            step={0.01}
                                            value={m.time}
                                            onChange={e => updateMarker(m.id, Number(e.target.value))}
                                            style={{ flex: 1 }}
                                        />
                                        <span className={styles.markerTime}>{m.time.toFixed(2)}s</span>
                                        <button
                                            className={styles.removeMarker}
                                            onClick={() => removeMarker(m.id)}
                                            disabled={markers.length <= 1}
                                            title="Remover"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
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
