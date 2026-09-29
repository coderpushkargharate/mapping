import type { Metadata } from 'next';
import './globals.css';

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
    apple: '/img/mappingg-icon-mark.png',
  },
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
