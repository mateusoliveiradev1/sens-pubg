/**
 * Root Layout - Main app shell.
 */

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Footer } from '@/ui/components/footer';
import { JsonLd } from '@/ui/components/seo/json-ld';
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
    default: 'PUBG Aim Analyzer - Coach de Aim com IA',
    template: '%s | PUBG Aim Analyzer',
  },
  description:
    'Analise seus clips de spray, identifique padroes de mira e receba recomendacoes assistidas para sensibilidade. Seu coach de aim pessoal para PUBG.',
  keywords: [
    'PUBG', 'aim trainer', 'recoil control', 'sensitivity calculator',
    'spray analysis', 'aim coach', 'PUBG sensibilidade', 'analisador de mira',
    'PUBG recoil', 'game settings', 'e-sports coaching',
  ],
  authors: [{ name: 'PUBG Aim Analyzer', url: 'https://mateusoliveira.dev' }],
  creator: 'PUBG Aim Analyzer',
  publisher: 'PUBG Aim Analyzer',
  category: 'Gaming',
  classification: 'Utility',
  alternates: {
    canonical: '/',
    languages: {
      'pt-BR': '/?lang=pt',
      'en-US': '/?lang=en',
      'es-ES': '/?lang=es',
    },
  },
  verification: {
    google: 'google-site-verification-placeholder',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    alternateLocale: ['en_US', 'es_ES'],
    url: '/',
    siteName: 'PUBG Aim Analyzer',
    title: 'PUBG Aim Analyzer - Coach de Aim com IA',
    description: 'Analise clips reais, identifique padroes de spray e explore ajustes de sensibilidade com apoio do motor de diagnostico.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PUBG Aim Analyzer Dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PUBG Aim Analyzer',
    description: 'Seu coach de aim pessoal para PUBG com analise visual assistida.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#ff6b00' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  const enableVercelObservability = process.env.VERCEL === '1';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PUBG Aim Analyzer',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    description: 'Analisador de spray e coach de aim para PUBG com analise assistida no navegador.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      },
    ],
  };

  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="theme-color" content="#ff6b00" />
        <link rel="manifest" href="/manifest.json" />
        <JsonLd data={jsonLd} />
        <JsonLd data={breadcrumbLd} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Pular para o conteudo principal
        </a>
        <main id="main-content">
          {children}
        </main>
        <Footer />
        {enableVercelObservability ? <Analytics /> : null}
        {enableVercelObservability ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
