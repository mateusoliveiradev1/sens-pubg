'use client';

import { useState } from 'react';
import { formatSprayClipDurationLabel } from '@/core';
import styles from './analysis-guide.module.css';

interface AnalysisGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const idealClipDurationLabel = formatSprayClipDurationLabel('pt-BR', 'natural');

const SLIDES = [
    {
        title: 'Qualidade Define Confianca',
        content: 'O motor precisa ver a mira com nitidez para estimar cobertura e confianca. Videos borrados, muito comprimidos ou com poucos frames deixam partes do spray incertas.',
        items: [
            'Resolucao recomendada: 1080p ou maior',
            'Taxa de quadros recomendada: 60 FPS',
            `Duracao ideal: ${idealClipDurationLabel}`,
        ],
        icon: '*',
    },
    {
        title: 'Centralize o Alvo',
        content: 'O rastreador usa a regiao da mira como referencia. Se overlays, fumaca ou cortes esconderem o reticulo, o resultado pode cair para incerto ou perdido.',
        items: [
            'Sem overlays cobrindo a mira',
            'Mantenha o HUD do PUBG visivel',
            'Evite fumaca densa no clipe',
        ],
        icon: 'O',
    },
    {
        title: 'Presets de Gravacao',
        content: 'Configure seu software de captura para melhorar a fidelidade visual. Isso aumenta a cobertura util, mas nao remove os limites do clipe original:',
        presets: [
            { name: 'OBS Studio', tip: 'Bitrate > 20,000 Kbps | Encoder: NVENC' },
            { name: 'Shadowplay', tip: 'Qualidade: Alta | 60 FPS' },
            { name: 'Medal.tv', tip: 'Bitrate: 20M | Resolucao: 1080p' },
        ],
        icon: '#',
    },
] as const;

export function AnalysisGuide({ isOpen, onClose }: AnalysisGuideProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (!isOpen) {
        return null;
    }

    const nextSlide = () => setCurrentSlide((previous) => (previous + 1) % SLIDES.length);
    const previousSlide = () => setCurrentSlide((previous) => (previous - 1 + SLIDES.length) % SLIDES.length);
    const slide = SLIDES[currentSlide]!;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    x
                </button>

                <div className={styles.carousel}>
                    <div className={styles.slideHeader}>
                        <div className={styles.slideIcon}>{slide.icon}</div>
                        <h2>{slide.title}</h2>
                    </div>

                    <div className={styles.slideContent}>
                        <p>{slide.content}</p>

                        {'items' in slide ? (
                            <ul className={styles.itemsList}>
                                {slide.items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        ) : null}

                        {'presets' in slide ? (
                            <div className={styles.presetsList}>
                                {slide.presets.map((preset) => (
                                    <div key={preset.name} className={styles.presetItem}>
                                        <span className={styles.presetName}>{preset.name}:</span>
                                        <span className={styles.presetTip}>{preset.tip}</span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.dots}>
                            {SLIDES.map((_, index) => (
                                <span
                                    key={index}
                                    className={`${styles.dot} ${index === currentSlide ? styles.dotActive : ''}`}
                                    onClick={() => setCurrentSlide(index)}
                                />
                            ))}
                        </div>
                        <div className={styles.nav}>
                            <button className="btn btn-secondary btn-sm" onClick={previousSlide}>
                                Anterior
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={currentSlide === SLIDES.length - 1 ? onClose : nextSlide}
                            >
                                {currentSlide === SLIDES.length - 1 ? 'Entendi!' : 'Proximo'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
