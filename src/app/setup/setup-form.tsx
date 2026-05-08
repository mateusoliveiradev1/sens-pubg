'use client';

import { useMemo, useState, useTransition } from 'react';
import { useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { setupWizardSchema, type SetupWizardInput } from '@/types/schemas';
import { updateUserSetup } from '@/actions/setup';
import { useRouter } from 'next/navigation';
import {
    PROFILE_WIZARD_SCOPE_ORDER,
    buildHybridScopeHintText,
} from '@/app/profile/profile-wizard-scopes';
import styles from './setup-form.module.css';

const SENSOR_OPTIONS = [
    'Logitech HERO',
    'PixArt PAW3395',
    'PixArt PAW3370',
    'Focus Pro 30K',
    'TrueMove',
    'Outro sensor',
] as const;

const SCOPE_LABELS: Record<string, string> = {
    'red-dot': 'Red Dot',
    '2x': '2x',
    '3x': '3x',
    '4x': '4x',
    '6x': '6x',
    '8x': '8x',
    '15x': '15x',
};

const GRIP_OPTIONS = [
    { value: 'palm', label: 'Palm' },
    { value: 'claw', label: 'Claw' },
    { value: 'fingertip', label: 'Fingertip' },
    { value: 'hybrid', label: 'Hibrida' },
] as const;

const PLAY_STYLE_OPTIONS = [
    { value: 'arm', label: 'Braco' },
    { value: 'wrist', label: 'Pulso' },
    { value: 'hybrid', label: 'Hibrido' },
] as const;

const ARM_LENGTH_OPTIONS = [
    { value: 'short', label: 'Curto' },
    { value: 'medium', label: 'Medio' },
    { value: 'long', label: 'Longo' },
] as const;

function firstErrorMessage(errors: FieldErrors<SetupWizardInput>): string | null {
    if (errors.mouse) return 'Revise mouse e DPI.';
    if (errors.mousepad || errors.gripStyle || errors.playStyle || errors.physical) {
        return 'Revise mousepad, pegada e espaco fisico.';
    }
    if (errors.monitor) return 'Revise monitor e resolucao.';
    if (errors.pubgSettings) return 'Revise as configuracoes in-game do PUBG.';
    return 'Revise os campos marcados antes de salvar.';
}

function formatNumber(value: number | null | undefined, suffix = ''): string {
    return Number.isFinite(value) ? `${value}${suffix}` : '-';
}

export function SetupForm({ initialData }: { readonly initialData: SetupWizardInput }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const hybridScopeHint = useMemo(() => buildHybridScopeHintText(), []);

    const {
        register,
        handleSubmit,
        formState: { errors },
        control,
        setValue,
    } = useForm<SetupWizardInput>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(setupWizardSchema) as any,
        defaultValues: initialData,
        mode: 'onBlur',
    });

    const dpi = useWatch({ control, name: 'mouse.dpi' });
    const generalSens = useWatch({ control, name: 'pubgSettings.generalSens' });
    const adsSens = useWatch({ control, name: 'pubgSettings.adsSens' });
    const fov = useWatch({ control, name: 'pubgSettings.fov' });
    const verticalMultiplier = useWatch({ control, name: 'pubgSettings.verticalMultiplier' });
    const gripStyle = useWatch({ control, name: 'gripStyle' });
    const playStyle = useWatch({ control, name: 'playStyle' });
    const armLength = useWatch({ control, name: 'physical.armLength' });
    const mousepadWidth = useWatch({ control, name: 'mousepad.widthCm' });
    const mousepadHeight = useWatch({ control, name: 'mousepad.heightCm' });

    const estimatedCm360 = useMemo(() => {
        const safeDpi = Number(dpi) || 800;
        const safeSens = Number(generalSens) || 50;
        return Math.round(((800 / safeDpi) * (35 / safeSens) * 43.2) * 10) / 10;
    }, [dpi, generalSens]);

    const onSubmit = (data: SetupWizardInput) => {
        setError(null);
        startTransition(async () => {
            try {
                const result = await updateUserSetup(data);
                if (result?.data?.success) {
                    router.push('/analyze');
                    router.refresh();
                    return;
                }

                setError(result?.serverError ?? 'Nao foi possivel salvar o setup.');
            } catch {
                setError('Falha na comunicacao com o servidor.');
            }
        });
    };

    const onError = (formErrors: FieldErrors<SetupWizardInput>) => {
        setError(firstErrorMessage(formErrors));
    };

    return (
        <>
            <header className={styles.hero}>
                <span className={styles.eyebrow}>Onboarding de conta</span>
                <h1 className={styles.title}>Setup do jogador</h1>
                <p className={styles.subtitle}>
                    Salve mouse, mousepad, pegada, monitor e sensibilidade do PUBG na sua conta.
                    Esse contexto deixa as proximas analises mais consistentes sem prometer resultado fechado.
                </p>
            </header>

            <div className={styles.shell}>
                <form id="setup-form" onSubmit={handleSubmit(onSubmit, onError)} className={styles.form}>
                    {error && <div className={styles.errorBanner}>{error}</div>}

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <div className={styles.sectionKicker}>01 Hardware</div>
                                <h2 className={styles.sectionTitle}>Mouse e monitor</h2>
                                <p className={styles.sectionDesc}>Base usada para converter DPI, FOV e resolucao em contexto de analise.</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.grid3}>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mouse-model">Modelo do mouse</label>
                                    <input
                                        id="mouse-model"
                                        className={`input ${errors.mouse?.model ? styles.inputError : ''}`}
                                        placeholder="G Pro X Superlight"
                                        {...register('mouse.model')}
                                    />
                                    {errors.mouse?.model && <span className={styles.errorText}>{errors.mouse.model.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mouse-sensor">Sensor</label>
                                    <input
                                        id="mouse-sensor"
                                        list="sensor-options"
                                        className={`input ${errors.mouse?.sensor ? styles.inputError : ''}`}
                                        placeholder="HERO 25K"
                                        {...register('mouse.sensor')}
                                    />
                                    <datalist id="sensor-options">
                                        {SENSOR_OPTIONS.map((sensor) => <option key={sensor} value={sensor} />)}
                                    </datalist>
                                    {errors.mouse?.sensor && <span className={styles.errorText}>{errors.mouse.sensor.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mouse-dpi">DPI</label>
                                    <input
                                        id="mouse-dpi"
                                        type="number"
                                        className={`input ${errors.mouse?.dpi ? styles.inputError : ''}`}
                                        {...register('mouse.dpi', { valueAsNumber: true })}
                                    />
                                    {errors.mouse?.dpi && <span className={styles.errorText}>{errors.mouse.dpi.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mouse-polling">Polling rate</label>
                                    <select
                                        id="mouse-polling"
                                        className="input select"
                                        {...register('mouse.pollingRate', { valueAsNumber: true })}
                                    >
                                        <option value={125}>125 Hz</option>
                                        <option value={250}>250 Hz</option>
                                        <option value={500}>500 Hz</option>
                                        <option value={1000}>1000 Hz</option>
                                        <option value={2000}>2000 Hz</option>
                                        <option value={4000}>4000 Hz</option>
                                        <option value={8000}>8000 Hz</option>
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mouse-weight">Peso</label>
                                    <input
                                        id="mouse-weight"
                                        type="number"
                                        step="0.1"
                                        className={`input ${errors.mouse?.weightGrams ? styles.inputError : ''}`}
                                        {...register('mouse.weightGrams', { valueAsNumber: true })}
                                    />
                                    {errors.mouse?.weightGrams && <span className={styles.errorText}>{errors.mouse.weightGrams.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mouse-lod">Lift-off distance</label>
                                    <input
                                        id="mouse-lod"
                                        type="number"
                                        step="0.1"
                                        className={`input ${errors.mouse?.liftOffDistance ? styles.inputError : ''}`}
                                        {...register('mouse.liftOffDistance', { valueAsNumber: true })}
                                    />
                                    {errors.mouse?.liftOffDistance && <span className={styles.errorText}>{errors.mouse.liftOffDistance.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="monitor-resolution">Resolucao</label>
                                    <select
                                        id="monitor-resolution"
                                        className={`input select ${errors.monitor?.resolution ? styles.inputError : ''}`}
                                        {...register('monitor.resolution')}
                                    >
                                        <option value="1920x1080">1920 x 1080</option>
                                        <option value="1728x1080">1728 x 1080</option>
                                        <option value="1600x900">1600 x 900</option>
                                        <option value="2560x1440">2560 x 1440</option>
                                        <option value="3840x2160">3840 x 2160</option>
                                    </select>
                                    {errors.monitor?.resolution && <span className={styles.errorText}>{errors.monitor.resolution.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="monitor-refresh">Refresh rate</label>
                                    <input
                                        id="monitor-refresh"
                                        type="number"
                                        className={`input ${errors.monitor?.refreshRate ? styles.inputError : ''}`}
                                        {...register('monitor.refreshRate', { valueAsNumber: true })}
                                    />
                                    {errors.monitor?.refreshRate && <span className={styles.errorText}>{errors.monitor.refreshRate.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="monitor-panel">Painel</label>
                                    <select id="monitor-panel" className="input select" {...register('monitor.panelType')}>
                                        <option value="ips">IPS</option>
                                        <option value="tn">TN</option>
                                        <option value="va">VA</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <div className={styles.sectionKicker}>02 Superficie</div>
                                <h2 className={styles.sectionTitle}>Mousepad, pegada e espaco</h2>
                                <p className={styles.sectionDesc}>A recomendacao fica mais conservadora quando o espaco fisico limita o pull vertical.</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.grid3}>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mousepad-model">Modelo do mousepad</label>
                                    <input
                                        id="mousepad-model"
                                        className={`input ${errors.mousepad?.model ? styles.inputError : ''}`}
                                        placeholder="Artisan Hien"
                                        {...register('mousepad.model')}
                                    />
                                    {errors.mousepad?.model && <span className={styles.errorText}>{errors.mousepad.model.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mousepad-width">Largura</label>
                                    <input
                                        id="mousepad-width"
                                        type="number"
                                        step="0.1"
                                        className={`input ${errors.mousepad?.widthCm ? styles.inputError : ''}`}
                                        {...register('mousepad.widthCm', { valueAsNumber: true })}
                                    />
                                    {errors.mousepad?.widthCm && <span className={styles.errorText}>{errors.mousepad.widthCm.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mousepad-height">Altura</label>
                                    <input
                                        id="mousepad-height"
                                        type="number"
                                        step="0.1"
                                        className={`input ${errors.mousepad?.heightCm ? styles.inputError : ''}`}
                                        {...register('mousepad.heightCm', { valueAsNumber: true })}
                                    />
                                    {errors.mousepad?.heightCm && <span className={styles.errorText}>{errors.mousepad.heightCm.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mousepad-type">Tipo</label>
                                    <select id="mousepad-type" className="input select" {...register('mousepad.type')}>
                                        <option value="control">Control</option>
                                        <option value="hybrid">Hybrid</option>
                                        <option value="speed">Speed</option>
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="mousepad-material">Material</label>
                                    <select id="mousepad-material" className="input select" {...register('mousepad.material')}>
                                        <option value="cloth">Tecido</option>
                                        <option value="hard">Hard</option>
                                        <option value="glass">Glass</option>
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="desk-space">Espaco livre</label>
                                    <input
                                        id="desk-space"
                                        type="number"
                                        step="0.1"
                                        className={`input ${errors.physical?.deskSpaceCm ? styles.inputError : ''}`}
                                        {...register('physical.deskSpaceCm', { valueAsNumber: true })}
                                    />
                                    {errors.physical?.deskSpaceCm && <span className={styles.errorText}>{errors.physical.deskSpaceCm.message}</span>}
                                </div>
                            </div>

                            <div className={styles.grid2} style={{ marginTop: 'var(--space-lg)' }}>
                                <div className={styles.field}>
                                    <label className="input-label">Pegada</label>
                                    <div className={styles.optionGrid}>
                                        {GRIP_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`${styles.choice} ${gripStyle === option.value ? styles.choiceActive : ''}`}
                                                onClick={() => setValue('gripStyle', option.value, { shouldDirty: true, shouldValidate: true })}
                                                aria-pressed={gripStyle === option.value}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label">Estilo motriz</label>
                                    <div className={styles.segmented}>
                                        {PLAY_STYLE_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`${styles.choice} ${playStyle === option.value ? styles.choiceActive : ''}`}
                                                onClick={() => setValue('playStyle', option.value, { shouldDirty: true, shouldValidate: true })}
                                                aria-pressed={playStyle === option.value}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.fieldWide}>
                                    <label className="input-label">Comprimento do braco</label>
                                    <div className={styles.segmented}>
                                        {ARM_LENGTH_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`${styles.choice} ${armLength === option.value ? styles.choiceActive : ''}`}
                                                onClick={() => setValue('physical.armLength', option.value, { shouldDirty: true, shouldValidate: true })}
                                                aria-pressed={armLength === option.value}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <div className={styles.sectionKicker}>03 PUBG</div>
                                <h2 className={styles.sectionTitle}>Sensibilidade in-game</h2>
                                <p className={styles.sectionDesc}>Inclui ADS, miras e multiplicador vertical para salvar o mesmo contexto usado no jogo.</p>
                            </div>
                        </div>
                        <div className={styles.sectionBody}>
                            <div className={styles.grid4}>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="general-sens">Geral</label>
                                    <input
                                        id="general-sens"
                                        type="number"
                                        step="0.01"
                                        className={`input ${errors.pubgSettings?.generalSens ? styles.inputError : ''}`}
                                        {...register('pubgSettings.generalSens', { valueAsNumber: true })}
                                    />
                                    {errors.pubgSettings?.generalSens && <span className={styles.errorText}>{errors.pubgSettings.generalSens.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="ads-sens">ADS</label>
                                    <input
                                        id="ads-sens"
                                        type="number"
                                        step="0.01"
                                        className={`input ${errors.pubgSettings?.adsSens ? styles.inputError : ''}`}
                                        {...register('pubgSettings.adsSens', { valueAsNumber: true })}
                                    />
                                    {errors.pubgSettings?.adsSens && <span className={styles.errorText}>{errors.pubgSettings.adsSens.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="fov">FOV</label>
                                    <input
                                        id="fov"
                                        type="number"
                                        className={`input ${errors.pubgSettings?.fov ? styles.inputError : ''}`}
                                        {...register('pubgSettings.fov', { valueAsNumber: true })}
                                    />
                                    {errors.pubgSettings?.fov && <span className={styles.errorText}>{errors.pubgSettings.fov.message}</span>}
                                </div>
                                <div className={styles.field}>
                                    <label className="input-label" htmlFor="vertical-multiplier">Multiplicador vertical</label>
                                    <input
                                        id="vertical-multiplier"
                                        type="number"
                                        step="0.01"
                                        className={`input ${errors.pubgSettings?.verticalMultiplier ? styles.inputError : ''}`}
                                        {...register('pubgSettings.verticalMultiplier', { valueAsNumber: true })}
                                    />
                                    {errors.pubgSettings?.verticalMultiplier && <span className={styles.errorText}>{errors.pubgSettings.verticalMultiplier.message}</span>}
                                </div>
                            </div>

                            <div className={styles.fieldWide} style={{ marginTop: 'var(--space-lg)' }}>
                                <label className="input-label">Sensibilidade por mira</label>
                                <div className={styles.scopeGrid}>
                                    {PROFILE_WIZARD_SCOPE_ORDER.map((scopeId) => (
                                        <div key={scopeId} className={styles.field}>
                                            <label className="input-label" htmlFor={`scope-${scopeId}`}>{SCOPE_LABELS[scopeId] ?? scopeId}</label>
                                            <input
                                                id={`scope-${scopeId}`}
                                                type="number"
                                                step="0.01"
                                                className={`input ${errors.pubgSettings?.scopeSens?.[scopeId] ? styles.inputError : ''}`}
                                                {...register(`pubgSettings.scopeSens.${scopeId}` as const, { valueAsNumber: true })}
                                            />
                                            {errors.pubgSettings?.scopeSens?.[scopeId] && (
                                                <span className={styles.errorText}>{errors.pubgSettings.scopeSens[scopeId]?.message}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {hybridScopeHint && <div className={styles.hint}>{hybridScopeHint}</div>}
                            </div>

                            <label className={styles.checkboxRow}>
                                <input type="checkbox" {...register('pubgSettings.mouseAcceleration')} />
                                <span>Aceleracao do mouse ativada no PUBG</span>
                            </label>
                        </div>
                    </section>
                </form>

                <aside className={styles.summary} aria-label="Resumo do setup">
                    <div>
                        <h2 className={styles.summaryTitle}>Resumo salvo na conta</h2>
                        <p className={styles.sectionDesc}>O onboarding cria ou atualiza seu perfil tecnico no banco.</p>
                    </div>

                    <div>
                        <div className={styles.metricRow}>
                            <span className={styles.metricLabel}>eDPI</span>
                            <span className={styles.metricValue}>{formatNumber(Number(dpi) * Number(generalSens))}</span>
                        </div>
                        <div className={styles.metricRow}>
                            <span className={styles.metricLabel}>cm/360 estimado</span>
                            <span className={styles.metricValue}>{formatNumber(estimatedCm360, ' cm')}</span>
                        </div>
                        <div className={styles.metricRow}>
                            <span className={styles.metricLabel}>ADS / Vertical</span>
                            <span className={styles.metricValue}>{formatNumber(Number(adsSens))} / {formatNumber(Number(verticalMultiplier), 'x')}</span>
                        </div>
                        <div className={styles.metricRow}>
                            <span className={styles.metricLabel}>FOV</span>
                            <span className={styles.metricValue}>{formatNumber(Number(fov))}</span>
                        </div>
                        <div className={styles.metricRow}>
                            <span className={styles.metricLabel}>Mousepad</span>
                            <span className={styles.metricValue}>{formatNumber(Number(mousepadWidth), ' cm')} x {formatNumber(Number(mousepadHeight), ' cm')}</span>
                        </div>
                    </div>

                    <div className={styles.notice}>
                        Sens PUBG usa estes dados como contexto. Recomendacoes continuam dependendo da qualidade do clip, confianca e cobertura.
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="submit"
                            form="setup-form"
                            disabled={isPending}
                            className={`btn btn-primary btn-lg ${styles.submit}`}
                        >
                            {isPending ? 'Salvando...' : 'Salvar setup e analisar'}
                        </button>
                    </div>
                </aside>
            </div>
        </>
    );
}
