import type { Metadata } from 'next';
import LegacyApp from '@/components/LegacyApp';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mappingg.com';

export const metadata: Metadata = {
  title: '3D Project Map — Mundhwa',
  description:
    'A 3D, tilt-and-rotate view of live real estate projects and infrastructure around Mundhwa, Pune.',
  alternates: { canonical: `${SITE_URL}/mundhwa-map-3d` },
};

export default function Map3DPage() {
  return <LegacyApp slug="map-3d" />;
}
