import type { Metadata } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
import InstallPrompt from '@/components/InstallPrompt';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mappingg.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Mappingg — Live Real Estate Project Map for Pune & MMR',
    template: '%s — Mappingg',
  },
  description:
    'Explore a live, interactive map of real estate projects across Pune and the Mumbai Metropolitan Region — colour-coded by status, with developer, pricing, configuration and infrastructure details.',
  applicationName: 'Mappingg',
  icons: {
    icon: '/img/mappingg-icon-mark.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Mappingg',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: 'Mappingg',
    url: SITE_URL,
    title: 'Mappingg — Live Real Estate Project Map',
    description: 'Explore live projects, upcoming launches and infrastructure across Pune and MMR.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mappingg — Live Real Estate Project Map',
    description: 'Explore live projects, upcoming launches and infrastructure across Pune and MMR.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#1b2430',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Warm up the TLS/DNS connections to the external origins the legacy map
            apps pull from (Leaflet/MapLibre on unpkg, Google Fonts). These are
            otherwise only discovered late — after the app bundle is fetched and
            injected — so pre-connecting here removes a serial round-trip from the
            critical path and makes the map paint noticeably sooner. */}
        <link rel="preconnect" href="https://unpkg.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://unpkg.com" />
      </head>
      <body>
        {children}
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
