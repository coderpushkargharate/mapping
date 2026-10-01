/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The legacy map apps rely on data: URLs and remote tile/logo images that are
  // injected as raw <img> tags, so we keep the classic <img> behaviour rather
  // than forcing next/image on the ported markup.
  images: { unoptimized: true },
  // Clean URLs for the partners intake app (static assets live under
  // /public/partners, but these are the addresses people actually use):
  //   /s-admin → admin panel (bulk CSV upload, review queue, builders, live)
  //   /submit  → builder submission page (opened via a unique ?t=token link)
  async rewrites() {
    return [
      { source: '/s-admin', destination: '/partners/admin/index.html' },
      { source: '/s-admin/', destination: '/partners/admin/index.html' },
      { source: '/submit', destination: '/partners/submit/index.html' },
      { source: '/submit/', destination: '/partners/submit/index.html' },
    ];
  },
  async headers() {
    return [
      {
        // Never let search engines index the admin editor.
        source: '/team-editor-x7k2',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // Partners intake app is internal — never index the admin, the builder
        // submit page, or their static assets.
        source: '/:path(s-admin|submit|partners/.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // Static app bundles + the DB shim: revalidate (cheap 304 when unchanged)
        // instead of a full re-download, but always pick up a fresh deploy.
        source: '/legacy/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        source: '/db-shim.js',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        // Logos/marks/icons change rarely — let the browser reuse them for a day
        // and refresh in the background, so repeat visits skip re-fetching them.
        source: '/:dir(img|icons)/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }],
      },
    ];
  },
};

export default nextConfig;
