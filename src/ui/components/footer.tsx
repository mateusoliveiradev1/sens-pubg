'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

import styles from './footer.module.css';

export function Footer(): React.JSX.Element | null {
    const pathname = usePathname();
    const [emailCopied, setEmailCopied] = useState(false);
    const supportEmail = 'warface01031999@gmail.com';

    if (pathname?.startsWith('/admin')) {
        return null;
    }

    const handleEmailClick = (event: React.MouseEvent | React.KeyboardEvent) => {
        event.preventDefault();
        navigator.clipboard.writeText(supportEmail);
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 3000);
    };

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.contactSection}>
                    <div className={styles.contactHeader}>
                        <h2>Precisa de ajuda ou quer mandar feedback?</h2>
                        <p>Entre na comunidade ou mande uma mensagem direta.</p>
                    </div>

                    <div className={styles.contactCards}>
                        <a
                            className={`${styles.contactCard} ${styles.discordCard}`}
                            href="https://discord.gg/jMYQF82uha"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <div className={styles.cardIcon}>
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                                </svg>
                            </div>
                            <div className={styles.cardContent}>
                                <h3>Comunidade no Discord</h3>
                                <span>Tire duvidas e fale com outros jogadores.</span>
                            </div>
                        </a>

                        <div
                            className={`${styles.contactCard} ${styles.emailCard}`}
                            onClick={handleEmailClick}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    handleEmailClick(event);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                        >
                            <div className={styles.cardIcon}>
                                {emailCopied ? (
                                    <svg
                                        aria-hidden="true"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    <svg
                                        aria-hidden="true"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                )}
                            </div>
                            <div className={styles.cardContent}>
                                <h3>{emailCopied ? 'Endereco copiado' : 'Suporte por e-mail'}</h3>
                                <span>{emailCopied ? 'Email pronto na area de transferencia' : supportEmail}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.top}>
                    <div className={styles.brand}>
                        <div className={styles.logo}>
                            <div className={styles.iconRing} aria-hidden="true" />
                            <div className={styles.iconDot} aria-hidden="true" />
                            <span className={styles.logoText}>Sens PUBG</span>
                        </div>
                        <p className={styles.desc}>
                            Analise sprays no navegador, veja confianca, cobertura e bloqueios,
                            e transforme cada clip util em um proximo treino testavel.
                        </p>
                    </div>

                    <div className={styles.linksBlock}>
                        <h3 className={styles.linksTitle}>Recursos</h3>
                        <ul className={styles.linksList}>
                            <li><Link href="/analyze" className={styles.link}>Analisador de Spray</Link></li>
                            <li><Link href="/pros" className={styles.link}>Sens dos Pros</Link></li>
                            <li><Link href="/profile" className={styles.link}>Meu Hardware</Link></li>
                            <li><Link href="/history" className={styles.link}>Historico</Link></li>
                        </ul>
                    </div>

                    <div className={styles.linksBlock}>
                        <h3 className={styles.linksTitle}>Legal</h3>
                        <ul className={styles.linksList}>
                            <li><Link href="/terms" className={styles.link}>Termos de Uso</Link></li>
                            <li><Link href="/privacy" className={styles.link}>Politica de Privacidade</Link></li>
                            <li><a href={`mailto:${supportEmail}`} className={styles.link}>Contato</a></li>
                        </ul>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p className={styles.copyright}>
                        &copy; {new Date().getFullYear()} Sens PUBG. Criado para a comunidade de PUBG.
                        <br />
                        Este projeto nao e afiliado ou patrocinado pela KRAFTON, Inc. ou PUBG Corporation.
                    </p>
                </div>
            </div>
        </footer>
    );
}
