/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.discogs.com', 'img.youtube.com'],
  },
  // Add webpack configuration to handle Supabase realtime-js syntax errors
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle potential syntax errors in Supabase realtime-js
      config.module.rules.push({
        test: /node_modules\/@supabase\/realtime-js/,
        use: ['source-map-loader'],
        enforce: 'pre',
      });
    }
    return config;
  },
}

module.exports = nextConfig