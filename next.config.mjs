/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The legacy map apps rely on data: URLs and remote tile/logo images that are
  // injected as raw <img> tags, so we keep the classic <img> behaviour rather
  // than forcing next/image on the ported markup.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        // Never let search engines index the admin editor.
        source: '/team-editor-x7k2',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
