/**
 * Root Layout — Layout principal do app.
 * Inter + JetBrains Mono fonts, SEO, Analytics, a11y skip-link.
 */

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Footer } from '@/ui/components/footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'PUBG Aim Analyzer — Coach de Aim com IA',
    template: '%s | PUBG Aim Analyzer',
  },
  description:
    'Analise seus clips de spray, diagnostique erros de mira e otimize sua sensibilidade com inteligência artificial. Seu coach de aim pessoal para PUBG.',
  keywords: [
    'PUBG', 'aim trainer', 'recoil control', 'sensitivity calculator',
    'spray analysis', 'aim coach', 'PUBG sensibilidade', 'analisador de mira',
  ],
  authors: [{ name: 'PUBG Aim Analyzer' }],
  creator: 'PUBG Aim Analyzer',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    alternateLocale: ['en_US', 'es_ES'],
    url: '/',
    siteName: 'PUBG Aim Analyzer',
    title: 'PUBG Aim Analyzer — Coach de Aim com IA',
    description: 'Analise clips reais, diagnostique erros e otimize sua sensibilidade com IA.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PUBG Aim Analyzer' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PUBG Aim Analyzer',
    description: 'Seu coach de aim pessoal para PUBG com análise por IA.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PUBG Aim Analyzer',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    description: 'Analisador de spray e coach de aim para PUBG com IA.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
    },
  };

  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="theme-color" content="#ff6b00" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo principal
        </a>
        <main id="main-content">
          {children}
        </main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
