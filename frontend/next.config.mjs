/** @type {import('next').NextConfig} */
const backendOrigin = process.env.NEXT_BACKEND_ORIGIN || 'http://localhost:5000';

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
