import { Header } from '@/ui/components/header';
import { getDashboardStats } from '@/actions/dashboard';
import { TrendChart } from './trend-chart';
import Link from 'next/link';

export default async function DashboardPage() {
    const stats = await getDashboardStats();

    return (
        <div className="bg-[#08080c] min-h-screen text-white">
            <Header />

            <main className="page">
                <div className="container" style={{ maxWidth: '1100px' }}>

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-zinc-800 pb-10">
                        <div>
                            <p className="text-cyan-500 font-mono text-[10px] uppercase tracking-[0.3em] mb-3">
                                Telemetria de Combate // Protocolo Ativo
                            </p>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
                                EVOLUÇÃO <span className="text-zinc-600">DE MIRA</span>
                            </h1>
                        </div>
                        <div className="hidden md:block text-right">
                            <span className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-700 text-[9px] font-mono text-zinc-500 uppercase tracking-widest rounded-sm">
                                Sessão: {new Date().toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    </div>

                    {!stats || stats.totalSessions === 0 ? (
                        <div className="glass-card flex flex-col items-center justify-center p-20 text-center border-dashed border-zinc-800">
                            <div className="text-6xl mb-6 opacity-40">🎯</div>
                            <h2 className="text-2xl font-bold mb-4">SEM DADOS REGISTRADOS</h2>
                            <p className="text-zinc-500 mb-10 max-w-sm">
                                Nenhuma análise foi encontrada para sua conta. Realize seu primeiro upload para ver sua evolução aqui.
                            </p>
                            <Link href="/analyze" className="btn btn-primary btn-lg">
                                Iniciar Primeira Análise
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid — 4 cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
                                {/* Sessions */}
                                <div className="glass-card p-8 border hover:border-zinc-700 transition-colors">
                                    <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Sessões</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black leading-none">{stats.totalSessions}</span>
                                        <span className="text-xs text-zinc-600 font-mono italic">TOTAL</span>
                                    </div>
                                </div>

                                {/* Spray Score */}
                                <div className="glass-card p-8 border border-green-500/20 hover:border-green-500/50 transition-colors shadow-[0_0_30px_rgba(34,197,94,0.05)]">
                                    <span className="block text-[10px] font-mono text-green-500/70 uppercase tracking-widest mb-3">Spray Score</span>
                                    <div className="flex items-baseline gap-1 text-green-500">
                                        <span className="text-4xl font-black leading-none">{stats.avgSprayScore}</span>
                                        <span className="text-xl font-black italic">%</span>
                                    </div>
                                    {stats.lastSessionDelta !== 0 && (
                                        <div className={`mt-2 text-xs font-mono font-bold ${stats.lastSessionDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {stats.lastSessionDelta > 0 ? '↑' : '↓'} {stats.lastSessionDelta > 0 ? '+' : ''}{stats.lastSessionDelta}%
                                        </div>
                                    )}
                                </div>

                                {/* Stability Score */}
                                <div className="glass-card p-8 border border-cyan-500/20 hover:border-cyan-500/50 transition-colors shadow-[0_0_30px_rgba(6,182,212,0.05)]">
                                    <span className="block text-[10px] font-mono text-cyan-500/70 uppercase tracking-widest mb-3">Estabilidade Média</span>
                                    <div className="flex items-baseline gap-1 text-cyan-500">
                                        <span className="text-4xl font-black leading-none">{stats.avgStabilityScore}</span>
                                        <span className="text-xl font-black italic">%</span>
                                    </div>
                                </div>

                                {/* Peak Score */}
                                <div className="glass-card p-8 border border-orange-500/20 hover:border-orange-500/50 transition-colors shadow-[0_0_30px_rgba(249,115,22,0.05)]">
                                    <span className="block text-[10px] font-mono text-orange-500/70 uppercase tracking-widest mb-3">Pico Máximo</span>
                                    <div className="flex items-baseline gap-1 text-orange-500">
                                        <span className="text-4xl font-black leading-none">{stats.bestSprayScore}</span>
                                        <span className="text-xl font-black italic">%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                {/* Chart Section */}
                                <div className="lg:col-span-8 glass-card p-8 min-h-[400px]">
                                    <div className="flex items-center gap-2 mb-8">
                                        <div className="w-1.5 h-6 bg-cyan-500" />
                                        <h2 className="text-xl font-black uppercase tracking-tight">Tendência (30 dias)</h2>
                                    </div>
                                    <div className="h-[300px] w-full">
                                        {stats.weeklyTrend.length > 0 ? (
                                            <TrendChart data={stats.weeklyTrend} />
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center gap-4">
                                                <div className="text-4xl opacity-20">📈</div>
                                                <p className="text-zinc-500 font-mono text-xs text-center max-w-xs">
                                                    Faça mais análises para ver sua tendência de evolução ao longo do tempo.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Weapon Progress */}
                                <div className="lg:col-span-4 glass-card p-8">
                                    <div className="flex items-center gap-2 mb-8">
                                        <div className="w-1.5 h-6 bg-orange-500" />
                                        <h2 className="text-xl font-black uppercase tracking-tight">Arsenal</h2>
                                    </div>
                                    <div className="space-y-6">
                                        {stats.weaponStats.length > 0 ? stats.weaponStats.map((w) => (
                                            <div key={w.weaponId} className="group">
                                                <div className="flex justify-between items-end mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base opacity-60">🔫</span>
                                                        <span className="text-xs font-black uppercase tracking-widest italic">{w.weaponName}</span>
                                                        <span className="text-[10px] text-zinc-600 font-mono">{w.count}x</span>
                                                    </div>
                                                    <span className={`text-lg font-black font-mono ${w.avgScore >= 50 ? 'text-green-500' : w.avgScore >= 25 ? 'text-cyan-500' : 'text-orange-500'}`}>
                                                        {w.avgScore}%
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${w.avgScore >= 50 ? 'bg-green-500' : w.avgScore >= 25 ? 'bg-cyan-500' : 'bg-orange-500'}`}
                                                        style={{ width: `${Math.max(w.avgScore, 2)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-zinc-600 font-mono text-xs italic">Nenhuma arma analisada...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
