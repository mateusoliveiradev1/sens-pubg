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
    data: { date: string; score: number }[];
}

export function TrendChart({ data }: TrendChartProps) {
    const chartData = {
        labels: data.map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
        datasets: [
            {
                label: 'Score Médio',
                data: data.map(d => d.score),
                borderColor: '#06b6d4', // Bright Cyan
                backgroundColor: (context: any) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return null;
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
                    gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
                    return gradient;
                },
                borderWidth: 3,
                tension: 0.4, // Smooth curves
                pointRadius: 4,
                pointBackgroundColor: '#06b6d4',
                pointBorderColor: '#0a0a0c',
                pointBorderWidth: 2,
                fill: true,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(9, 9, 11, 0.95)',
                titleColor: '#06b6d4',
                bodyColor: '#ffffff',
                borderColor: '#27272a',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                cornerRadius: 8,
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
                    font: {
                        family: 'var(--font-mono)',
                        size: 11,
                    },
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
