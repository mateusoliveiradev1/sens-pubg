'use client';

import { useState } from 'react';
import styles from './faq-accordion.module.css';

interface FaqItem {
    q: string;
    a: string;
}

const FAQS: FaqItem[] = [
    {
        q: 'A analise de video da ban no PUBG?',
        a: 'Nao. A ferramenta trabalha no navegador lendo um arquivo de video do usuario. Ela nao interage com memoria, arquivos do jogo ou processo do PUBG.',
    },
    {
        q: 'Preciso enviar meu video para algum servidor?',
        a: 'Nao. Os quadros sao processados localmente no seu navegador com Web Workers e APIs visuais do browser. O video nao precisa ser enviado para um servidor de processamento.',
    },
    {
        q: 'Como o app descobre minha sensibilidade?',
        a: 'Voce configura seu perfil de hardware e de jogo. O motor combina o rastreio visual com dados patch-aware da arma, mira e distancia para sugerir faixas de teste, sempre mostrando confianca e cobertura da analise.',
    },
    {
        q: 'Funciona com qualquer arma do PUBG?',
        a: 'Hoje o projeto cobre um conjunto importante das armas mais usadas do meta. O catalogo do dominio ainda esta evoluindo para cobertura patch-aware mais completa, entao armas ou patches sem base confiavel geram leitura mais conservadora.',
    },
    {
        q: 'Quais sao os limites da analise?',
        a: 'Clipes com fumaca, overlays, baixa nitidez ou mira fora do centro reduzem a confianca. Use a cobertura, os frames perdidos e o patch exibido no resultado para decidir se a recomendacao serve como sinal forte ou apenas como ponto de partida.',
    },
    {
        q: 'O que e o Vertical Sensitivity Multiplier (VSM) e como ajustar?',
        a: 'O VSM altera a relacao entre o movimento vertical e horizontal. A analise observa sinais de overpull e underpull para sugerir uma faixa de teste mais natural para o seu puxe de mouse.',
    },
];

export function FaqAccordion() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggle = (i: number) => {
        setOpenIndex(openIndex === i ? null : i);
    };

    return (
        <div className={styles.accordionContainer}>
            {FAQS.map((faq, i) => {
                const isOpen = openIndex === i;
                return (
                    <div key={i} className={`${styles.faqItem} ${isOpen ? styles.open : ''}`}>
                        <button
                            type="button"
                            className={styles.faqHeader}
                            onClick={() => toggle(i)}
                            aria-expanded={isOpen}
                        >
                            <h3>{faq.q}</h3>
                            <span className={styles.icon}>{isOpen ? '-' : '+'}</span>
                        </button>

                        <div
                            className={styles.faqBodyWrapper}
                            style={{
                                gridTemplateRows: isOpen ? '1fr' : '0fr',
                            }}
                        >
                            <div className={styles.faqBody}>
                                <p>{faq.a}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
