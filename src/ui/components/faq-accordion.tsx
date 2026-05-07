'use client';

import { useState } from 'react';
import styles from './faq-accordion.module.css';

interface FaqItem {
    q: string;
    a: string;
}

const FAQS: FaqItem[] = [
    {
        q: 'A analise de video interage com o PUBG?',
        a: 'Nao. A ferramenta trabalha no navegador lendo um arquivo de video do usuario. Ela nao interage com memoria, arquivos do jogo ou processo do PUBG.',
    },
    {
        q: 'Preciso enviar meu video para algum servidor?',
        a: 'Nao. A leitura roda no seu navegador. O servidor cuida de conta, historico salvo, quota e assinatura; o video nao precisa ir para um servidor de processamento.',
    },
    {
        q: 'Como o app descobre minha sensibilidade?',
        a: 'Voce informa seu mouse e configuracoes do jogo. O app cruza a leitura visual do spray com arma, mira, distancia e dados patch-aware para sugerir uma faixa de teste. Ele mostra confianca, cobertura e o que atrapalhou a captura para voce validar no proximo bloco.',
    },
    {
        q: 'O app encontra minha sensibilidade ideal sozinho?',
        a: 'Nao. Ele entrega uma leitura do clip e uma faixa de teste baseada nos sinais medidos. Se o video estiver ruim, com pouca cobertura ou com mira dificil de acompanhar, trate como ponto de partida ou grave outro clip.',
    },
    {
        q: 'Funciona com qualquer arma do PUBG?',
        a: 'Hoje o projeto cobre um conjunto importante das armas mais usadas. O catalogo ainda esta evoluindo para cobertura patch-aware mais completa, entao armas ou patches com pouca base geram leitura mais conservadora.',
    },
    {
        q: 'Qual a diferenca entre Pro e Sens dos Pros?',
        a: 'Pro e a assinatura paga para continuidade do seu loop: coach completo, historico, tendencias compativeis e mais analises uteis salvas. Sens dos Pros e uma referencia publica de configuracoes de jogadores profissionais; ele nao concede assinatura, billing ou acesso Pro.',
    },
    {
        q: 'Quais sao os limites da analise?',
        a: 'Fumaca, overlay, baixa nitidez, compressao pesada, FPS instavel ou mira fora do centro reduzem a confianca. O app pode bloquear videos ruins e, quando analisa, mostra qualidade do clip, motivos de degradacao, frames perdidos, re-aquisicao e patch para voce julgar a forca do sinal.',
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
