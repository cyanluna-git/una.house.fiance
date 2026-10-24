/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    middlewareClientMaxBodySize: "52mb",
    optimizePackageImports: ["recharts"],
  },
};

export default nextConfig;
