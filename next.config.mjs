/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      {
        source: "/",
        destination: "/accueil-v2",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;