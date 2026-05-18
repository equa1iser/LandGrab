/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { instrumentationHook: true },
  output: "standalone",
  images: {
    domains: ["photos.zillowstatic.com", "ssl.cdn-redfin.com"],
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },
};

module.exports = nextConfig;
