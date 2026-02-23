/**
 * Profile Wizard — Multi-step form com 6 steps.
 * Client Component para interatividade do formulário.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { saveProfile } from '@/actions/profile';
import type { ProfileActionResult } from '@/actions/profile';
import type { playerProfiles } from '@/db/schema';
import styles from './profile-wizard.module.css';

// ═══════════════════════════════════════════
// Step definitions
// ═══════════════════════════════════════════

const STEPS = [
    { id: 'mouse', label: '🖱️ Mouse', icon: '🖱️' },
    { id: 'mousepad', label: '🟫 Mousepad', icon: '🟫' },
    { id: 'style', label: '🎮 Estilo', icon: '🎮' },
    { id: 'monitor', label: '🖥️ Monitor', icon: '🖥️' },
    { id: 'pubg', label: '⚙️ PUBG', icon: '⚙️' },
    { id: 'physical', label: '📐 Espaço', icon: '📐' },
] as const;

// ═══════════════════════════════════════════
// Default form state
// ═══════════════════════════════════════════

interface FormState {
    mouse: { model: string; sensor: string; dpi: number; pollingRate: number; weightGrams: number; liftOffDistance: number };
    mousepad: { model: string; widthCm: number; heightCm: number; type: string; material: string };
    gripStyle: string;
    playStyle: string;
    monitor: { resolution: string; refreshRate: number; panelType: string };
    pubgSettings: {
        generalSens: number; adsSens: number; fov: number;
        verticalMultiplier: number; mouseAcceleration: boolean;
        scopeSens: Record<string, number>;
    };
    physical: { armLength: string; deskSpaceCm: number };
}

const DEFAULT_FORM: FormState = {
    mouse: { model: '', sensor: '', dpi: 800, pollingRate: 1000, weightGrams: 80, liftOffDistance: 1 },
    mousepad: { model: '', widthCm: 45, heightCm: 40, type: 'control', material: 'cloth' },
    gripStyle: 'claw',
    playStyle: 'hybrid',
    monitor: { resolution: '1920x1080', refreshRate: 144, panelType: 'ips' },
    pubgSettings: {
        generalSens: 50, adsSens: 50, fov: 103, verticalMultiplier: 1.0, mouseAcceleration: false,
        scopeSens: { 'red-dot': 50, '2x': 50, '3x': 50, '4x': 50, '6x': 50, '8x': 50 },
    },
    physical: { armLength: 'medium', deskSpaceCm: 60 },
};

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

interface Props {
    readonly initialData?: typeof playerProfiles.$inferSelect | null;
}

export function ProfileWizard({ initialData }: Props): React.JSX.Element {
    const [step, setStep] = useState(0);

    // Hydrate form from initialData or use defaults
    const hydratedForm = useMemo((): FormState => {
        if (!initialData) return DEFAULT_FORM;

        return {
            mouse: {
                model: initialData.mouseModel,
                sensor: initialData.mouseSensor,
                dpi: initialData.mouseDpi,
                pollingRate: initialData.mousePollingRate,
                weightGrams: initialData.mouseWeight,
                liftOffDistance: initialData.mouseLod,
            },
            mousepad: {
                model: initialData.mousepadModel,
                widthCm: initialData.mousepadWidth,
                heightCm: initialData.mousepadHeight,
                type: initialData.mousepadType,
                material: initialData.mousepadMaterial,
            },
            gripStyle: initialData.gripStyle,
            playStyle: initialData.playStyle,
            monitor: {
                resolution: initialData.monitorResolution,
                refreshRate: initialData.monitorRefreshRate,
                panelType: initialData.monitorPanel,
            },
            pubgSettings: {
                generalSens: initialData.generalSens,
                adsSens: initialData.adsSens,
                fov: initialData.fov,
                verticalMultiplier: initialData.verticalMultiplier,
                mouseAcceleration: initialData.mouseAcceleration,
                scopeSens: initialData.scopeSens as Record<string, number>,
            },
            physical: {
                armLength: initialData.armLength as any,
                deskSpaceCm: initialData.deskSpace,
            },
        };
    }, [initialData]);

    const [form, setForm] = useState<FormState>(hydratedForm);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<ProfileActionResult | null>(null);

    const updateField = useCallback(<K extends keyof FormState>(
        section: K,
        field: string,
        value: string | number | boolean
    ): void => {
        setForm(prev => {
            const sectionVal = prev[section];
            if (typeof sectionVal === 'object' && sectionVal !== null) {
                return { ...prev, [section]: { ...sectionVal, [field]: value } };
            }
            return { ...prev, [section]: value };
        });
    }, []);

    const updateScopeSens = useCallback((scope: string, value: number): void => {
        setForm(prev => ({
            ...prev,
            pubgSettings: {
                ...prev.pubgSettings,
                scopeSens: { ...prev.pubgSettings.scopeSens, [scope]: value },
            },
        }));
    }, []);

    const handleSubmit = useCallback(async (): Promise<void> => {
        setSaving(true);
        setResult(null);
        const res = await saveProfile(form);
        setResult(res);
        setSaving(false);
    }, [form]);

    const canGoNext = step < STEPS.length - 1;
    const canGoBack = step > 0;
    const isLastStep = step === STEPS.length - 1;

    return (
        <div className={styles.wizard}>
            {/* Step Indicator */}
            <div className={styles.steps} role="tablist" aria-label="Passos do formulário">
                {STEPS.map((s, i) => (
                    <button
                        key={s.id}
                        className={`${styles.stepBtn} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}
                        onClick={() => setStep(i)}
                        role="tab"
                        aria-selected={i === step}
                        aria-label={`Passo ${i + 1}: ${s.label}`}
                    >
                        <span className={styles.stepIcon}>{s.icon}</span>
                        <span className={styles.stepLabel}>{s.label.split(' ')[1]}</span>
                    </button>
                ))}
            </div>

            {/* Progress bar */}
            <div className="progress-bar" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="progress-bar-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>

            {/* Step Content */}
            <div className={`glass-card ${styles.stepContent}`} role="tabpanel">
                {step === 0 && (
                    <div className={styles.fadeIn}>
                        <h3 className={styles.stepTitle}>🖱️ Mouse</h3>
                        <p className={styles.stepDesc}>Dados do seu mouse para calcular a sensibilidade ideal.</p>
                        <div className={styles.formGrid}>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="mouse-model">Modelo *</label>
                                <input id="mouse-model" className="input" placeholder="Ex: Logitech G Pro X Superlight" value={form.mouse.model} onChange={e => updateField('mouse', 'model', e.target.value)} />
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="mouse-sensor">Sensor *</label>
                                <input id="mouse-sensor" className="input" placeholder="Ex: HERO 25K, PAW3395" value={form.mouse.sensor} onChange={e => updateField('mouse', 'sensor', e.target.value)} />
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="mouse-dpi">DPI *</label>
                                <input id="mouse-dpi" type="number" className="input" min={100} max={25600} value={form.mouse.dpi} onChange={e => updateField('mouse', 'dpi', Number(e.target.value))} />
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="mouse-polling">Polling Rate *</label>
                                <select id="mouse-polling" className="input select" value={form.mouse.pollingRate} onChange={e => updateField('mouse', 'pollingRate', Number(e.target.value))}>
                                    <option value={125}>125 Hz</option>
                                    <option value={250}>250 Hz</option>
                                    <option value={500}>500 Hz</option>
                                    <option value={1000}>1000 Hz</option>
                                    <option value={2000}>2000 Hz</option>
                                    <option value={4000}>4000 Hz</option>
                                </select>
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="mouse-weight">Peso (gramas) *</label>
                                <input id="mouse-weight" type="number" className="input" min={30} max={200} value={form.mouse.weightGrams} onChange={e => updateField('mouse', 'weightGrams', Number(e.target.value))} />
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="mouse-lod">Lift-off Distance (mm) *</label>
                                <input id="mouse-lod" type="number" className="input" step={0.1} min={0.5} max={3} value={form.mouse.liftOffDistance} onChange={e => updateField('mouse', 'liftOffDistance', Number(e.target.value))} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className={styles.fadeIn}>
                        <h3 className={styles.stepTitle}>🟫 Mousepad</h3>
                        <p className={styles.stepDesc}>O tamanho e tipo do mousepad definem o range de sensibilidade viável.</p>
                        <div className={styles.formGrid}>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="pad-model">Modelo *</label>
                                <input id="pad-model" className="input" placeholder="Ex: Artisan Hien, QcK Heavy" value={form.mousepad.model} onChange={e => updateField('mousepad', 'model', e.target.value)} />
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="pad-type">Tipo *</label>
                                <select id="pad-type" className="input select" value={form.mousepad.type} onChange={e => updateField('mousepad', 'type', e.target.value)}>
                                    <option value="speed">Speed</option>
                                    <option value="control">Control</option>
                                    <option value="hybrid">Híbrido</option>
                                </select>
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="pad-width">Largura (cm) *</label>
                                <input id="pad-width" type="number" className="input" min={10} max={120} value={form.mousepad.widthCm} onChange={e => updateField('mousepad', 'widthCm', Number(e.target.value))} />
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="pad-height">Altura (cm) *</label>
                                <input id="pad-height" type="number" className="input" min={10} max={60} value={form.mousepad.heightCm} onChange={e => updateField('mousepad', 'heightCm', Number(e.target.value))} />
                            </div>
                            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                                <label className="input-label" htmlFor="pad-material">Material *</label>
                                <select id="pad-material" className="input select" value={form.mousepad.material} onChange={e => updateField('mousepad', 'material', e.target.value)}>
                                    <option value="cloth">Tecido (Cloth)</option>
                                    <option value="hard">Rígido (Hard)</option>
                                    <option value="glass">Vidro (Glass)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className={styles.fadeIn}>
                        <h3 className={styles.stepTitle}>🎮 Estilo de Jogo</h3>
                        <p className={styles.stepDesc}>Seu grip e estilo influenciam diretamente na sensibilidade recomendada.</p>

                        <div className={styles.optionSection}>
                            <label className="input-label">Grip Style *</label>
                            <div className={styles.optionGrid}>
                                {(['palm', 'claw', 'fingertip', 'hybrid'] as const).map(g => (
                                    <button key={g} type="button"
                                        className={`${styles.optionCard} ${form.gripStyle === g ? styles.optionActive : ''}`}
                                        onClick={() => setForm(prev => ({ ...prev, gripStyle: g }))}
                                        aria-pressed={form.gripStyle === g}
                                    >
                                        <span className={styles.optionEmoji}>{g === 'palm' ? '🤚' : g === 'claw' ? '🦀' : g === 'fingertip' ? '☝️' : '🔀'}</span>
                                        <span className={styles.optionName}>{g.charAt(0).toUpperCase() + g.slice(1)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.optionSection}>
                            <label className="input-label">Play Style *</label>
                            <div className={styles.optionGrid}>
                                {(['arm', 'wrist', 'hybrid'] as const).map(p => (
                                    <button key={p} type="button"
                                        className={`${styles.optionCard} ${form.playStyle === p ? styles.optionActive : ''}`}
                                        onClick={() => setForm(prev => ({ ...prev, playStyle: p }))}
                                        aria-pressed={form.playStyle === p}
                                    >
                                        <span className={styles.optionEmoji}>{p === 'arm' ? '💪' : p === 'wrist' ? '✊' : '🔀'}</span>
                                        <span className={styles.optionName}>{p === 'arm' ? 'Arm Aimer' : p === 'wrist' ? 'Wrist Aimer' : 'Híbrido'}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className={styles.fadeIn}>
                        <h3 className={styles.stepTitle}>🖥️ Monitor</h3>
                        <p className={styles.stepDesc}>Resolução e refresh rate afetam o FOV e a fluidez do tracking.</p>
                        <div className={styles.formGrid}>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="monitor-res">Resolução *</label>
                                <select id="monitor-res" className="input select" value={form.monitor.resolution} onChange={e => updateField('monitor', 'resolution', e.target.value)}>
                                    <option value="1920x1080">1920×1080 (Full HD)</option>
                                    <option value="2560x1440">2560×1440 (2K)</option>
                                    <option value="3840x2160">3840×2160 (4K)</option>
                                    <option value="2560x1080">2560×1080 (UW)</option>
                                    <option value="3440x1440">3440×1440 (UW 2K)</option>
                                </select>
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="monitor-hz">Refresh Rate *</label>
                                <select id="monitor-hz" className="input select" value={form.monitor.refreshRate} onChange={e => updateField('monitor', 'refreshRate', Number(e.target.value))}>
                                    <option value={60}>60 Hz</option>
                                    <option value={75}>75 Hz</option>
                                    <option value={144}>144 Hz</option>
                                    <option value={165}>165 Hz</option>
                                    <option value={240}>240 Hz</option>
                                    <option value={360}>360 Hz</option>
                                </select>
                            </div>
                            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                                <label className="input-label" htmlFor="monitor-panel">Tipo de Painel *</label>
                                <select id="monitor-panel" className="input select" value={form.monitor.panelType} onChange={e => updateField('monitor', 'panelType', e.target.value)}>
                                    <option value="ips">IPS</option>
                                    <option value="tn">TN</option>
                                    <option value="va">VA</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className={styles.fadeIn}>
                        <h3 className={styles.stepTitle}>⚙️ Configurações PUBG</h3>
                        <p className={styles.stepDesc}>Suas configurações atuais in-game. A IA vai comparar com o ideal.</p>
                        <div className={styles.formGrid}>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="pubg-gen">Sensibilidade Geral *</label>
                                <div className={styles.sliderRow}>
                                    <input id="pubg-gen" type="range" className="slider" min={1} max={100} value={form.pubgSettings.generalSens} onChange={e => updateField('pubgSettings', 'generalSens', Number(e.target.value))} />
                                    <span className={styles.sliderValue}>{form.pubgSettings.generalSens}</span>
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="pubg-ads">Sensibilidade ADS *</label>
                                <div className={styles.sliderRow}>
                                    <input id="pubg-ads" type="range" className="slider" min={1} max={100} value={form.pubgSettings.adsSens} onChange={e => updateField('pubgSettings', 'adsSens', Number(e.target.value))} />
                                    <span className={styles.sliderValue}>{form.pubgSettings.adsSens}</span>
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="pubg-fov">FOV *</label>
                                <div className={styles.sliderRow}>
                                    <input id="pubg-fov" type="range" className="slider" min={80} max={103} value={form.pubgSettings.fov} onChange={e => updateField('pubgSettings', 'fov', Number(e.target.value))} />
                                    <span className={styles.sliderValue}>{form.pubgSettings.fov}</span>
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="pubg-vmult">Multiplicador Vertical *</label>
                                <div className={styles.sliderRow}>
                                    <input id="pubg-vmult" type="range" className="slider" min={50} max={150} value={form.pubgSettings.verticalMultiplier * 100} onChange={e => updateField('pubgSettings', 'verticalMultiplier', Number(e.target.value) / 100)} />
                                    <span className={styles.sliderValue}>{form.pubgSettings.verticalMultiplier.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Scope sensitivities */}
                            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                                <label className="input-label">Sensibilidade por Mira *</label>
                                <div className={styles.scopeGrid}>
                                    {Object.entries(form.pubgSettings.scopeSens).map(([scope, val]) => (
                                        <div key={scope} className={styles.scopeItem}>
                                            <span className={styles.scopeLabel}>{scope.replace('-', ' ').toUpperCase()}</span>
                                            <input type="range" className="slider" min={1} max={100} value={val} onChange={e => updateScopeSens(scope, Number(e.target.value))} aria-label={`Sensibilidade ${scope}`} />
                                            <span className={styles.scopeValue}>{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" checked={form.pubgSettings.mouseAcceleration} onChange={e => updateField('pubgSettings', 'mouseAcceleration', e.target.checked)} />
                                    <span>Aceleração do Mouse ativada</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className={styles.fadeIn}>
                        <h3 className={styles.stepTitle}>📐 Espaço Físico</h3>
                        <p className={styles.stepDesc}>Espaço disponível para movimentar o mouse e comprimento do braço.</p>
                        <div className={styles.formGrid}>
                            <div className={styles.field}>
                                <label className="input-label">Comprimento do Braço *</label>
                                <div className={styles.optionGrid}>
                                    {(['short', 'medium', 'long'] as const).map(a => (
                                        <button key={a} type="button"
                                            className={`${styles.optionCard} ${form.physical.armLength === a ? styles.optionActive : ''}`}
                                            onClick={() => updateField('physical', 'armLength', a)}
                                            aria-pressed={form.physical.armLength === a}
                                        >
                                            <span className={styles.optionName}>{a === 'short' ? 'Curto' : a === 'medium' ? 'Médio' : 'Longo'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className="input-label" htmlFor="desk-space">Espaço na Mesa (cm) *</label>
                                <div className={styles.sliderRow}>
                                    <input id="desk-space" type="range" className="slider" min={20} max={200} value={form.physical.deskSpaceCm} onChange={e => updateField('physical', 'deskSpaceCm', Number(e.target.value))} />
                                    <span className={styles.sliderValue}>{form.physical.deskSpaceCm} cm</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Result message */}
            {result && (
                <div className={`${styles.result} ${result.success ? styles.resultSuccess : styles.resultError}`}>
                    {result.success ? '✅ Perfil salvo com sucesso!' : `❌ ${result.error}`}
                </div>
            )}

            {/* Navigation buttons */}
            <div className={styles.navButtons}>
                <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)} disabled={!canGoBack}>
                    ← Voltar
                </button>

                {isLastStep ? (
                    <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={saving}>
                        {saving ? '⏳ Salvando...' : '💾 Salvar Perfil'}
                    </button>
                ) : (
                    <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canGoNext}>
                        Próximo →
                    </button>
                )}
            </div>
        </div>
    );
}
