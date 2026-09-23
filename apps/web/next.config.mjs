/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages are consumed as TS source (06_ARCHITECTURE.md §3).
  transpilePackages: ['@bounty-bay/config', '@bounty-bay/contracts', '@bounty-bay/domain'],
};

export default nextConfig;
