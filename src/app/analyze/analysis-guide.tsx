import { useState } from 'react';
import styles from './analysis-guide.module.css';

interface AnalysisGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const SLIDES = [
    {
        title: "🚀 Qualidade é Tudo",
        content: "Para que a IA consiga rastrear cada pixel do seu spray, precisamos de clips nítidos. Vídeos borrados ou com poucos frames podem gerar resultados imprecisos.",
        items: [
            "Resolução Mínima: 1080p (Full HD)",
            "Taxa de Quadros: 60 FPS (obrigatório)",
            "Duração Ideal: 5 a 15 segundos"
        ],
        icon: "✨"
    },
    {
        title: "🎯 Centralize o Alvo",
        content: "A IA foca no centro da sua tela. Certifique-se de que nada está obstruindo a área da mira (como facecams ou overlays de Discord).",
        items: [
            "Sem Overlays cobrindo a mira",
            "Mantenha o HUD do PUBG visível",
            "Evite fumaça densa no clipe"
        ],
        icon: "🎯"
    },
    {
        title: "⚙️ Presets de Gravação",
        content: "Configure seu software de captura para garantir a melhor fidelidade para o processamento visual:",
        presets: [
            { name: "OBS Studio", tip: "Bitrate > 20,000 Kbps | Encoder: NVENC" },
            { name: "Shadowplay", tip: "Qualidade: Alta | 60 FPS" },
            { name: "Medal.tv", tip: "Bitrate: 20M | Resolução: 1080p" }
        ],
        icon: "⚙️"
    }
];

export function AnalysisGuide({ isOpen, onClose }: AnalysisGuideProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (!isOpen) return null;

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);

    const slide = SLIDES[currentSlide]!;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>✕</button>

                <div className={styles.carousel}>
                    <div className={styles.slideHeader}>
                        <div className={styles.slideIcon}>{slide.icon}</div>
                        <h2>{slide.title}</h2>
                    </div>

                    <div className={styles.slideContent}>
                        <p>{slide.content}</p>

                        {slide.items && (
                            <ul className={styles.itemsList}>
                                {slide.items.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        )}

                        {slide.presets && (
                            <div className={styles.presetsList}>
                                {slide.presets.map((p, i) => (
                                    <div key={i} className={styles.presetItem}>
                                        <span className={styles.presetName}>{p.name}:</span>
                                        <span className={styles.presetTip}>{p.tip}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.dots}>
                            {SLIDES.map((_, i) => (
                                <span
                                    key={i}
                                    className={`${styles.dot} ${i === currentSlide ? styles.dotActive : ''}`}
                                    onClick={() => setCurrentSlide(i)}
                                />
                            ))}
                        </div>
                        <div className={styles.nav}>
                            <button className="btn btn-secondary btn-sm" onClick={prevSlide}>Anterior</button>
                            <button className="btn btn-primary btn-sm" onClick={currentSlide === SLIDES.length - 1 ? onClose : nextSlide}>
                                {currentSlide === SLIDES.length - 1 ? 'Entendi!' : 'Próximo'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
