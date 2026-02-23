'use client';

import { useState } from 'react';
import styles from './faq-accordion.module.css';

interface FaqItem {
    q: string;
    a: string;
}

const FAQS: FaqItem[] = [
    {
        q: 'A análise de vídeo dá ban no PUBG?',
        a: 'Não. Nossa ferramenta trabalha 100% no seu navegador lendo um arquivo de vídeo (VOD). Não interagimos com os arquivos do jogo ou memória. É seguro e em total conformidade com os termos da KRAFTON.',
    },
    {
        q: 'Preciso enviar meu vídeo para algum servidor?',
        a: 'Não. Processamos os quadros diretamente usando WebAssembly e HTML5 Canvas localmente no seu dispositivo. Seu vídeo nunca faz "upload" para um servidor, garantindo máxima privacidade e altíssima velocidade.',
    },
    {
        q: 'Como o app descobre minha sensibilidade?',
        a: 'Você configura seu perfil de hardware (Mouse, DPI, Grip, Mousepad). A Engine de IA usa os dados matemáticos do rastreio de recuo (pixel drift horizontal e vertical) e os combina com o perfil calibrado para entregar a distância exata em cm/360°.',
    },
    {
        q: 'Funciona com qualquer arma do PUBG?',
        a: 'Atualmente suportamos as armas mais importantes do meta do PUBG (M416, Beryl, AUG, ACE32, G36C, SCAR-L, DMRs e SMGs). A engine tem padrões de Recoil precisos e específicos gravados diretamente dos servidores oficiais de 2024.',
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
                            <span className={styles.icon}>{isOpen ? '−' : '+'}</span>
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
