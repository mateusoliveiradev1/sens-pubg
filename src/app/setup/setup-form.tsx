'use client';

import { useState, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { setupWizardSchema, type SetupWizardInput } from '@/types/schemas';
import { updateUserSetup } from '@/actions/setup';
import { useRouter } from 'next/navigation';

export function SetupForm({ initialData }: { initialData?: Partial<SetupWizardInput> }) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(setupWizardSchema),
        defaultValues: {
            resolution: initialData?.resolution || '1920x1080',
            fov: initialData?.fov || 90,
            mouseDpi: initialData?.mouseDpi || 800,
            sensGeneral: initialData?.sensGeneral || 50,
            sens1x: initialData?.sens1x || 50,
            sens3x: initialData?.sens3x || 50,
            sens4x: initialData?.sens4x || 50,
        },
    });

    const onSubmit = (data: SetupWizardInput) => {
        setIsPending(true);
        setError(null);
        startTransition(async () => {
            try {
                const result = await updateUserSetup(data);
                if (result?.data?.success) {
                    router.push('/analyze');
                } else {
                    setError('Erro ao salvar configurações.');
                }
            } catch {
                setError('Falha na comunicação com o servidor.');
            } finally {
                setIsPending(false);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="animate-fade-in-up">
            <div className="glass-card-gradient space-y-6">
                <div className="space-y-2">
                    <h2 className="text-accent">Setup do Jogador</h2>
                    <p className="text-sm opacity-70">Configure seu hardware para análises precisas.</p>
                </div>

                {error && (
                    <div className="badge badge-error w-full py-2 text-center">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Hardware Column */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold border-b border-white/10 pb-2">Hardware</h3>

                        <div>
                            <label className="input-label">Resolução do Monitor</label>
                            <select {...register('resolution')} className="input select">
                                <option value="1920x1080">1920 x 1080 (FHD)</option>
                                <option value="2560x1440">2560 x 1440 (QHD)</option>
                                <option value="3840x2160">3840 x 2160 (4K)</option>
                                <option value="1728x1080">1728 x 1080 (Stretched)</option>
                                <option value="1600x900">1600 x 900</option>
                            </select>
                            {errors.resolution && <p className="text-error text-xs mt-1">{errors.resolution.message}</p>}
                        </div>

                        <div>
                            <label className="input-label">Mouse DPI</label>
                            <input
                                type="number"
                                {...register('mouseDpi', { valueAsNumber: true })}
                                className="input"
                                placeholder="ex: 800"
                            />
                            {errors.mouseDpi && <p className="text-error text-xs mt-1">{errors.mouseDpi.message}</p>}
                        </div>

                        <div>
                            <label className="input-label">PUBG FOV (Field of View)</label>
                            <input
                                type="number"
                                {...register('fov', { valueAsNumber: true })}
                                className="input"
                                placeholder="80 - 103"
                            />
                            {errors.fov && <p className="text-error text-xs mt-1">{errors.fov.message}</p>}
                        </div>
                    </div>

                    {/* Sensitivity Column */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold border-b border-white/10 pb-2">Sensibilidade In-game</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">Geral</label>
                                <input type="number" step="0.01" {...register('sensGeneral', { valueAsNumber: true })} className="input" />
                                {errors.sensGeneral && <p className="text-error text-xs mt-1">{errors.sensGeneral.message}</p>}
                            </div>
                            <div>
                                <label className="input-label">1x (Red Dot)</label>
                                <input type="number" step="0.01" {...register('sens1x', { valueAsNumber: true })} className="input" />
                                {errors.sens1x && <p className="text-error text-xs mt-1">{errors.sens1x.message}</p>}
                            </div>
                            <div>
                                <label className="input-label">3x Scope</label>
                                <input type="number" step="0.01" {...register('sens3x', { valueAsNumber: true })} className="input" />
                                {errors.sens3x && <p className="text-error text-xs mt-1">{errors.sens3x.message}</p>}
                            </div>
                            <div>
                                <label className="input-label">4x Scope</label>
                                <input type="number" step="0.01" {...register('sens4x', { valueAsNumber: true })} className="input" />
                                {errors.sens4x && <p className="text-error text-xs mt-1">{errors.sens4x.message}</p>}
                            </div>
                        </div>

                        <div className="pt-4 bg-accent/5 p-4 rounded-md border border-accent/20">
                            <p className="text-xs text-secondary italic">
                                * Estes dados são fundamentais para que nossa IA calcule o ajuste exato do seu eDPI com base no seu hardware real.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-6 flex justify-end">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="btn btn-primary btn-lg w-full md:w-auto"
                    >
                        {isPending ? 'Salvando...' : 'Finalizar Configuração'}
                    </button>
                </div>
            </div>
        </form>
    );
}
