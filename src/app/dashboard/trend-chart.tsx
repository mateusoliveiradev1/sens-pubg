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
    const chartData = {
        labels: data.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
        datasets: [
            {
                label: 'Score Médio',
                data: data.map(d => d.avgScore),
                borderColor: '#06b6d4',
                backgroundColor: (context: ScriptableContext<'line'>) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return undefined;
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
                    gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
                    return gradient;
                },
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#06b6d4',
                pointBorderColor: '#0a0a0c',
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                fill: true,
            },
            {
                label: 'Pico da Sessão',
                data: data.map(d => d.peakScore),
                borderColor: '#f97316',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [6, 4],
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#f97316',
                pointBorderColor: '#0a0a0c',
                pointBorderWidth: 1,
                pointHoverRadius: 6,
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
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    color: '#a1a1aa',
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 16,
                    font: {
                        family: 'var(--font-mono)',
                        size: 10,
                    },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(9, 9, 11, 0.95)',
                titleColor: '#06b6d4',
                bodyColor: '#ffffff',
                borderColor: '#27272a',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (ctx: TooltipItem<'line'>) => {
                        const label = ctx.dataset.label || '';
                        return `${label}: ${ctx.parsed.y}%`;
                    },
                },
            },
        },
        scales: {
            y: {
                min: 0,
                max: 100,
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
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
