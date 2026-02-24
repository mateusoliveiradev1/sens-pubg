'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { playerProfileSchema } from '@/types/schemas';
import type { z } from 'zod';
import type { playerProfiles } from '@/db/schema';
import { saveProfile, deleteUserAccount } from '@/actions/profile';
import styles from './settings-form.module.css';

const MOUSE_SENSORS = ['Logitech HERO', 'PixArt PAW3395', 'PixArt PAW3370', 'Focus Pro 30K', 'TrueMove', 'Outro Sensor'];
const GRIP_STYLES = ['palm', 'claw', 'fingertip', 'hybrid'];
const PLAY_STYLES = ['arm', 'wrist', 'hybrid'];
const MOUSEPAD_TYPES = ['speed', 'control', 'hybrid'];
const MOUSEPAD_MATERIALS = ['cloth', 'hard', 'glass'];
const MONITOR_PANELS = ['ips', 'tn', 'va'];

type ProfileFormValues = z.infer<typeof playerProfileSchema>;

// Sub-component for performance optimization: Only re-renders when DPI or Sensitivity changes
function Cm360Badge({ control }: { control: any }) {
    const currentDpi = useWatch({ control, name: 'mouse.dpi' }) || 800;
    const currentSens = useWatch({ control, name: 'pubgSettings.generalSens' }) || 35;
    const calculatedCm360 = Math.round(((800 / currentDpi) * (35 / currentSens) * 43.2) * 10) / 10;

    return (
        <div className={styles.cmBadge}>
            {calculatedCm360} cm/360°
        </div>
    );
}

export function SettingsForm({ initialData }: { initialData: typeof playerProfiles.$inferSelect | null }) {
    const [isPending, startTransition] = useTransition();
    const [isDeleting, setIsDeleting] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'identity' | 'mouse' | 'mousepad' | 'ingame' | 'danger'>('identity');

    const defaultValues: Partial<ProfileFormValues> = initialData ? {
        identity: {
            bio: initialData.bio,
            twitter: initialData.twitter,
            twitch: initialData.twitch,
        },
        mouse: {
            model: initialData.mouseModel || '',
            sensor: initialData.mouseSensor || '',
            dpi: initialData.mouseDpi || 800,
            pollingRate: initialData.mousePollingRate || 1000,
            weightGrams: initialData.mouseWeight || 60,
            liftOffDistance: initialData.mouseLod || 1.0,
        },
        mousepad: {
            model: initialData.mousepadModel || '',
            widthCm: initialData.mousepadWidth || 45,
            heightCm: initialData.mousepadHeight || 40,
            type: initialData.mousepadType as any || 'control',
            material: initialData.mousepadMaterial as any || 'cloth',
        },
        gripStyle: initialData.gripStyle as any || 'palm',
        playStyle: initialData.playStyle as any || 'arm',
        monitor: {
            resolution: initialData.monitorResolution || '1920x1080',
            refreshRate: initialData.monitorRefreshRate || 144,
            panelType: initialData.monitorPanel as any || 'ips',
        },
        pubgSettings: {
            generalSens: initialData.generalSens || 35,
            adsSens: initialData.adsSens || 30,
            scopeSens: initialData.scopeSens || { '1x': 30, '2x': 30, '3x': 30, '4x': 30, '6x': 30, '8x': 30, '15x': 30 },
            fov: initialData.fov || 90,
            verticalMultiplier: initialData.verticalMultiplier || 1.0,
            mouseAcceleration: initialData.mouseAcceleration || false,
        },
        physical: {
            armLength: initialData.armLength as any || 'medium',
            deskSpaceCm: initialData.deskSpace || 60,
        },
    } : {
        pubgSettings: {
            generalSens: 35,
            adsSens: 30,
            scopeSens: { '1x': 30, '2x': 30, '3x': 30, '4x': 30, '6x': 30, '8x': 30, '15x': 30 },
            fov: 90,
            verticalMultiplier: 1.0,
            mouseAcceleration: false,
        }
    };

    const { register, handleSubmit, formState: { errors, isDirty }, control, reset } = useForm<ProfileFormValues>({
        resolver: zodResolver(playerProfileSchema),
        defaultValues,
        mode: 'onChange' // To keep isDirty up to date easily
    });


    const syncAllScopes = () => {
        // Get current ADS value from the form
        const currentAds = control._formValues?.pubgSettings?.adsSens || 30;

        // Update all scope values
        const newScopes = {
            '1x': currentAds,
            '2x': currentAds,
            '3x': currentAds,
            '4x': currentAds,
            '6x': currentAds,
            '8x': currentAds,
            '15x': currentAds,
        };

        reset({
            ...(control._formValues as any),
            pubgSettings: {
                ...(control._formValues?.pubgSettings as any),
                scopeSens: newScopes
            }
        });
    };

    const onSubmit = (data: ProfileFormValues) => {
        setNotification(null);
        startTransition(async () => {
            const result = await saveProfile(data);
            if (result.success) {
                setNotification({ type: 'success', message: 'Configurações salvas com sucesso!' });
                reset(data); // Resets isDirty
                setTimeout(() => setNotification(null), 3000);
            } else {
                setNotification({ type: 'error', message: result.error || 'Erro desconhecido' });
            }
        });
    };

    const onError = (errors: any) => {
        setNotification({ type: 'error', message: 'Por favor, revise os campos marcados em vermelho nas abas de configuração.' });

        // Find the first tab that has an error and switch to it
        if (errors.identity) {
            setActiveTab('identity');
        } else if (errors.mouse || errors.monitor || errors.gripStyle || errors.playStyle) {
            setActiveTab('mouse');
        } else if (errors.mousepad || errors.physical) {
            setActiveTab('mousepad');
        } else if (errors.pubgSettings) {
            setActiveTab('ingame');
        }

        // Scroll to top of form area for visibility on mobile
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteAccount = async () => {
        if (!confirm('🚨 Atenção! Esta ação apagará SUA CONTA, TODOS os seus relatórios e vídeos e NÃO TEM VOLTA. Confirmar?')) return;

        setIsDeleting(true);
        const result = await deleteUserAccount();
        if (!result.success) {
            setNotification({ type: 'error', message: result.error || 'Erro ao deletar conta' });
            setIsDeleting(false);
        }
    };

    return (
        <div className={styles.layout}>
            {notification && (
                <div className={`${styles.toast} ${notification.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
                    {notification.message}
                </div>
            )}

            {/* TABBED SIDEBAR */}
            <aside className={styles.sidebar}>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'identity' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('identity')}
                >
                    👤 Identidade
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'mouse' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('mouse')}
                >
                    🖱️ Mouse e Monitor
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'mousepad' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('mousepad')}
                >
                    🟫 Mousepad
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${activeTab === 'ingame' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('ingame')}
                >
                    🎯 In-Game PUBG
                </button>
                <button
                    type="button"
                    className={`${styles.tabBtn} ${styles.dangerTabBtn} ${activeTab === 'danger' ? styles.dangerTabActive : ''}`}
                    onClick={() => setActiveTab('danger')}
                >
                    ⚠️ Danger Zone
                </button>
            </aside>

            {/* CONTENT AREA */}
            <form id="settings-form" onSubmit={handleSubmit(onSubmit, onError)} className={styles.contentArea}>

                {/* TAB: IDENTITY */}
                <div className={`${styles.tabPane} ${activeTab === 'identity' ? styles.tabPaneActive : ''}`}>
                    <div>
                        <h2 className={styles.sectionTitle}>Identidade e Sociais</h2>
                        <p className={styles.sectionDesc}>Esta informação aparecerá no seu perfil público e relatórios.</p>
                    </div>

                    <div className="glass-card">
                        <div className={styles.grid1}>
                            <div className="field">
                                <label className="input-label" htmlFor="bio">Sobre Mim (Bio)</label>
                                <textarea id="bio" rows={4} className={`input ${errors.identity?.bio ? styles.inputError : ''}`} placeholder="Me chamo X e jogo competitivamente..." {...register('identity.bio')} />
                                {errors.identity?.bio && <span className={styles.errorText}>{errors.identity.bio.message}</span>}
                            </div>
                        </div>
                        <div className={styles.grid2} style={{ marginTop: 'var(--space-lg)' }}>
                            <div className="field">
                                <label className="input-label" htmlFor="twitter">X (Twitter)</label>
                                <input id="twitter" className={`input ${errors.identity?.twitter ? styles.inputError : ''}`} placeholder="https://x.com/seuuser" {...register('identity.twitter')} />
                                {errors.identity?.twitter && <span className={styles.errorText}>{errors.identity.twitter.message}</span>}
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="twitch">Twitch</label>
                                <input id="twitch" className={`input ${errors.identity?.twitch ? styles.inputError : ''}`} placeholder="https://twitch.tv/seuuser" {...register('identity.twitch')} />
                                {errors.identity?.twitch && <span className={styles.errorText}>{errors.identity.twitch.message}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* TAB: MOUSE */}
                <div className={`${styles.tabPane} ${activeTab === 'mouse' ? styles.tabPaneActive : ''}`}>
                    <div>
                        <h2 className={styles.sectionTitle}>Mouse & Monitor</h2>
                        <p className={styles.sectionDesc}>Hardware base usado pela IA para extrapolar pixel skipping e input lag.</p>
                    </div>

                    <div className="glass-card">
                        <div className={styles.grid2}>
                            <div className="field">
                                <label className="input-label" htmlFor="mouse-model">Modelo do Mouse *</label>
                                <input id="mouse-model" className={`input ${errors.mouse?.model ? styles.inputError : ''}`} placeholder="G Pro X Superlight" {...register('mouse.model')} />
                                {errors.mouse?.model && <span className={styles.errorText}>{errors.mouse.model.message}</span>}
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="mouse-sensor">Sensor *</label>
                                <input id="mouse-sensor" list="sensors" className={`input ${errors.mouse?.sensor ? styles.inputError : ''}`} placeholder="HERO 25K" {...register('mouse.sensor')} />
                                <datalist id="sensors">{MOUSE_SENSORS.map(s => <option key={s} value={s} />)}</datalist>
                                {errors.mouse?.sensor && <span className={styles.errorText}>{errors.mouse.sensor.message}</span>}
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="mouse-dpi">DPI *</label>
                                <input id="mouse-dpi" type="number" className={`input ${errors.mouse?.dpi ? styles.inputError : ''}`} {...register('mouse.dpi', { valueAsNumber: true })} />
                                {errors.mouse?.dpi && <span className={styles.errorText}>{errors.mouse.dpi.message}</span>}
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="mouse-polling">Polling Rate (Hz) *</label>
                                <select id="mouse-polling" className="input select" {...register('mouse.pollingRate', { valueAsNumber: true })}>
                                    <option value="125">125 Hz</option>
                                    <option value="500">500 Hz</option>
                                    <option value="1000">1000 Hz</option>
                                    <option value="2000">2000 Hz</option>
                                    <option value="4000">4000 Hz</option>
                                    <option value="8000">8000 Hz</option>
                                </select>
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="mouse-weight">Peso (gramas) *</label>
                                <input id="mouse-weight" type="number" className={`input ${errors.mouse?.weightGrams ? styles.inputError : ''}`} {...register('mouse.weightGrams', { valueAsNumber: true })} />
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="mouse-lod">Lift-Off Distance (mm) *</label>
                                <input id="mouse-lod" type="number" step="0.1" className={`input ${errors.mouse?.liftOffDistance ? styles.inputError : ''}`} {...register('mouse.liftOffDistance', { valueAsNumber: true })} />
                            </div>
                        </div>

                        <hr style={{ margin: 'var(--space-xl) 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

                        <div className={styles.grid2}>
                            <div className="field">
                                <label className="input-label" htmlFor="monitor-res">Resolução *</label>
                                <input id="monitor-res" className={`input ${errors.monitor?.resolution ? styles.inputError : ''}`} placeholder="1920x1080" {...register('monitor.resolution')} />
                                {errors.monitor?.resolution && <span className={styles.errorText}>{errors.monitor.resolution.message}</span>}
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="monitor-refresh">Refresh Rate (Hz) *</label>
                                <input id="monitor-refresh" type="number" className={`input ${errors.monitor?.refreshRate ? styles.inputError : ''}`} {...register('monitor.refreshRate', { valueAsNumber: true })} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* TAB: MOUSEPAD */}
                <div className={`${styles.tabPane} ${activeTab === 'mousepad' ? styles.tabPaneActive : ''}`}>
                    <div>
                        <h2 className={styles.sectionTitle}>Mousepad & Estilo Motriz</h2>
                        <p className={styles.sectionDesc}>Define o atrito dinâmico (CoD) nas equações de arrasto da AI.</p>
                    </div>

                    <div className="glass-card">
                        <div className={styles.grid2}>
                            <div className="field">
                                <label className="input-label" htmlFor="pad-model">Modelo do Mousepad *</label>
                                <input id="pad-model" className={`input ${errors.mousepad?.model ? styles.inputError : ''}`} placeholder="Artisan Hien" {...register('mousepad.model')} />
                                {errors.mousepad?.model && <span className={styles.errorText}>{errors.mousepad.model.message}</span>}
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="pad-type">Tipo de Superfície *</label>
                                <select id="pad-type" className="input select" {...register('mousepad.type')}>
                                    <option value="speed">Speed</option>
                                    <option value="control">Control</option>
                                    <option value="hybrid">Híbrido</option>
                                </select>
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="pad-material">Material *</label>
                                <select id="pad-material" className="input select" {...register('mousepad.material')}>
                                    <option value="cloth">Tecido (Cloth)</option>
                                    <option value="hard">Rígido (Hard)</option>
                                    <option value="glass">Vidro (Glass)</option>
                                </select>
                            </div>
                        </div>

                        <hr style={{ margin: 'var(--space-xl) 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

                        <div className={styles.grid2}>
                            <div className="field">
                                <label className="input-label" htmlFor="grip">Estilo de Pegada (Grip) *</label>
                                <select id="grip" className="input select" {...register('gripStyle')}>
                                    <option value="palm">Palm Grip</option>
                                    <option value="claw">Claw Grip</option>
                                    <option value="fingertip">Fingertip Grip</option>
                                    <option value="hybrid">Híbrido</option>
                                </select>
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="play-style">Estilo Motriz *</label>
                                <select id="play-style" className="input select" {...register('playStyle')}>
                                    <option value="arm">Braço (Arm Aimer)</option>
                                    <option value="wrist">Pulso (Wrist Aimer)</option>
                                    <option value="hybrid">Híbrido</option>
                                </select>
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="deskspace">Espaço Livre no Setup (cm) *</label>
                                <input id="deskspace" type="number" className="input" {...register('physical.deskSpaceCm', { valueAsNumber: true })} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* TAB: INGAME */}
                <div className={`${styles.tabPane} ${activeTab === 'ingame' ? styles.tabPaneActive : ''}`}>
                    <div className={styles.badgeBadgeWrapper}>
                        <div>
                            <h2 className={styles.sectionTitle}>In-Game (PUBG)</h2>
                            <p className={styles.sectionDesc}>Configurações brutas do jogo.</p>
                        </div>
                        <Cm360Badge control={control} />
                    </div>

                    <div className="glass-card">
                        <div className={styles.grid2}>
                            <div className="field">
                                <label className="input-label" htmlFor="gen-sens">Sensibilidade Geral *</label>
                                <input id="gen-sens" type="number" step="0.1" className={`input ${errors.pubgSettings?.generalSens ? styles.inputError : ''}`} {...register('pubgSettings.generalSens', { valueAsNumber: true })} />
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="ads-sens">Sensibilidade ADS (Mira) *</label>
                                <input id="ads-sens" type="number" step="0.1" className="input" {...register('pubgSettings.adsSens', { valueAsNumber: true })} />
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="vert-mult">Multiplicador Vertical *</label>
                                <input id="vert-mult" type="number" step="0.01" className="input" {...register('pubgSettings.verticalMultiplier', { valueAsNumber: true })} />
                            </div>
                            <div className="field">
                                <label className="input-label" htmlFor="fov">FOV (Campo de Visão) *</label>
                                <input id="fov" type="number" className="input" {...register('pubgSettings.fov', { valueAsNumber: true })} />
                            </div>
                        </div>

                        <hr style={{ margin: 'var(--space-xl) 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-text)' }}>Sensibilidade por Mira (Scopes)</h3>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={syncAllScopes}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    🔄 Sincronizar todas com ADS
                                </button>
                            </div>
                            <div className={styles.grid4}>
                                {(['1x', '2x', '3x', '4x', '6x', '8x', '15x'] as const).map((scope) => (
                                    <div className="field" key={scope}>
                                        <label className="input-label" htmlFor={`sens-${scope}`}>Mira {scope}</label>
                                        <input
                                            id={`sens-${scope}`}
                                            type="number"
                                            step="0.1"
                                            className="input"
                                            {...register(`pubgSettings.scopeSens.${scope}` as const, { valueAsNumber: true })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* TAB: DANGER ZONE */}
                <div className={`${styles.tabPane} ${activeTab === 'danger' ? styles.tabPaneActive : ''}`}>
                    <div className={styles.dangerZone}>
                        <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>Apagar Conta</h2>
                        <p className={styles.sectionDesc} style={{ color: 'rgba(255, 74, 74, 0.8)' }}>
                            Isso apagará permanentemente seu perfil de hardware, todo o histórico de análises de spray e desfará o vínculo com os provedores de login (Google/Discord). Isso não pode ser desfeito.
                        </p>
                        <button
                            type="button"
                            className={styles.btnDanger}
                            onClick={handleDeleteAccount}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Apagando dados...' : 'Excluir Minha Conta Definitivamente'}
                        </button>
                    </div>
                </div>

            </form>

            {/* FLOATING SAVE BAR */}
            <div className={`${styles.floatingSaveBar} ${isDirty ? styles.floatingSaveBarVisible : ''}`}>
                <span className={styles.saveBarText}>Você possui alterações não salvas.</span>
                <div className={styles.saveActions}>
                    <button type="button" className="btn btn-secondary" onClick={() => reset()} disabled={isPending}>Descartar</button>
                    <button type="submit" form="settings-form" className={styles.btnSave} disabled={isPending}>
                        {isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>

        </div>
    );
}
