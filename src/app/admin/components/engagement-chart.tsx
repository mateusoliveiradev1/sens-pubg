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

interface EngagementChartProps {
    data: number[];
    labels: string[];
}

export function EngagementChart({ data, labels }: EngagementChartProps) {
    const chartData = {
        labels,
        datasets: [
            {
                fill: true,
                label: 'Análises de Spray',
                data,
                borderColor: '#ff6b00',
                backgroundColor: 'rgba(255, 107, 0, 0.1)',
                tension: 0.4,
                pointBackgroundColor: '#ff6b00',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#ff6b00',
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
                mode: 'index' as const,
                intersect: false,
                backgroundColor: '#1a1a1a',
                titleColor: '#fff',
                bodyColor: '#ccc',
                borderColor: '#333',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#666',
                    font: {
                        size: 11,
                    },
                },
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                },
                ticks: {
                    color: '#666',
                    font: {
                        size: 11,
                    },
                    stepSize: 1,
                },
            },
        },
    };

    return <Line data={chartData} options={options} />;
}
