/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-hosting guide: set a deployment ID for version skew protection.
  deploymentId: process.env.DEPLOYMENT_ID,
  distDir: process.env.DIST_DIR ?? '.next',
  ...(process.env.WORKAROUND_HEADER === '1' && {
    headers: async () => [
      {
        source: '/:path*',
        headers: [{ key: 'x-nextjs-deployment-id', value: process.env.DEPLOYMENT_ID }],
      },
    ],
  }),
};

export default nextConfig;
