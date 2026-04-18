'use client';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ScriptableContext,
    TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface TrendChartProps {
    data: { date: string; avgScore: number; peakScore: number }[];
}

export function TrendChart({ data }: TrendChartProps) {
    const latestIndex = Math.max(data.length - 1, 0);

    const chartData = {
        labels: data.map((entry) => new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
        datasets: [
            {
                label: 'Score Medio',
                data: data.map((entry) => entry.avgScore),
                borderColor: '#06b6d4',
                backgroundColor: (context: ScriptableContext<'line'>) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return undefined;

                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.26)');
                    gradient.addColorStop(0.55, 'rgba(6, 182, 212, 0.08)');
                    gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
                    return gradient;
                },
                borderWidth: 3,
                tension: 0.38,
                pointRadius: (context: ScriptableContext<'line'>) => context.dataIndex === latestIndex ? 6 : 4,
                pointBackgroundColor: (context: ScriptableContext<'line'>) => context.dataIndex === latestIndex ? '#e0fbff' : '#06b6d4',
                pointBorderColor: '#0a0a0c',
                pointBorderWidth: (context: ScriptableContext<'line'>) => context.dataIndex === latestIndex ? 3 : 2,
                pointHoverRadius: 8,
                pointHitRadius: 18,
                fill: true,
            },
            {
                label: 'Pico da Sessao',
                data: data.map((entry) => entry.peakScore),
                borderColor: '#f97316',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [6, 4],
                tension: 0.38,
                pointRadius: (context: ScriptableContext<'line'>) => context.dataIndex === latestIndex ? 5 : 3,
                pointBackgroundColor: (context: ScriptableContext<'line'>) => context.dataIndex === latestIndex ? '#ffd7bf' : '#f97316',
                pointBorderColor: '#0a0a0c',
                pointBorderWidth: 1,
                pointHoverRadius: 7,
                pointHitRadius: 16,
                fill: false,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        layout: {
            padding: {
                top: 8,
                right: 6,
                bottom: 0,
                left: 0,
            },
        },
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    color: '#a1a1aa',
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 10,
                    boxHeight: 10,
                    padding: 16,
                    font: {
                        family: 'var(--font-mono)',
                        size: 10,
                    },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(9, 9, 11, 0.96)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#27272a',
                borderWidth: 1,
                displayColors: true,
                padding: 12,
                cornerRadius: 10,
                callbacks: {
                    title: (items: TooltipItem<'line'>[]) => {
                        const item = items[0];
                        return item?.label ? `Checkpoint ${item.label}` : '';
                    },
                    label: (context: TooltipItem<'line'>) => {
                        const label = context.dataset.label || '';
                        return `${label}: ${context.parsed.y}%`;
                    },
                    footer: (items: TooltipItem<'line'>[]) => {
                        const averageItem = items.find((item) => item.datasetIndex === 0);
                        const peakItem = items.find((item) => item.datasetIndex === 1);

                        if (!averageItem || !peakItem) {
                            return '';
                        }

                        if (averageItem.parsed.y === null || peakItem.parsed.y === null) {
                            return '';
                        }

                        const gap = peakItem.parsed.y - averageItem.parsed.y;
                        return `Gap da sessao: ${gap.toFixed(0)} pts`;
                    },
                },
            },
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                grid: {
                    color: (context: { tick: { value: number } }) => {
                        if (context.tick.value === 50) {
                            return 'rgba(6, 182, 212, 0.12)';
                        }

                        return 'rgba(255, 255, 255, 0.05)';
                    },
                    drawTicks: false,
                },
                border: {
                    display: false,
                },
                ticks: {
                    color: '#a1a1aa',
                    padding: 10,
                    stepSize: 20,
                    font: {
                        family: 'var(--font-mono)',
                        size: 11,
                    },
                    callback: (value: string | number) => `${value}%`,
                },
            },
            x: {
                grid: {
                    display: false,
                },
                border: {
                    display: false,
                },
                ticks: {
                    color: '#a1a1aa',
                    padding: 10,
                    maxRotation: 0,
                    font: {
                        family: 'var(--font-mono)',
                        size: 11,
                    },
                },
            },
        },
    };

    return (
        <div style={{ width: '100%', height: '300px' }}>
            <Line data={chartData} options={options} />
        </div>
    );
}
