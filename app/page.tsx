import type { Metadata } from 'next';
import LegacyApp from '@/components/LegacyApp';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mappingg.com';

export const metadata: Metadata = {
  title: 'Associatte Interactive Map — Find Live Real Estate',
  description:
    'Explore live projects, upcoming launches and infrastructure across Pune and the Mumbai Metropolitan Region on an interactive, colour-coded map.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'Associatte Interactive Map — Live Project Map',
    description: 'Explore live projects, upcoming launches and infrastructure across Mundhwa.',
    url: SITE_URL,
  },
};

// JSON-LD structured data for the organisation / web application.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Mappingg',
  url: SITE_URL,
  description:
    'Live, interactive map of real estate projects in Pune and the Mumbai Metropolitan Region.',
  publisher: {
    '@type': 'Organization',
    name: 'Associatte Proptech Pvt Ltd',
    url: 'https://associatte.co.in/',
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Crawlable heading for SEO; visually hidden so the map UI is unchanged. */}
      <h1 className="sr-only">
        Mappingg — Live interactive real estate project map for Pune and the Mumbai Metropolitan
        Region
      </h1>
      <LegacyApp slug="public-map" />
    </>
  );
}
