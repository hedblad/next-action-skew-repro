/** @type {import('next').NextConfig} */
const nextConfig = {
  // As the self-hosting guide recommends, for version skew protection.
  deploymentId: process.env.DEPLOYMENT_ID,
  // The workaround: send the deployment ID on every response, including Server Action responses.
  ...(process.env.WORKAROUND === '1' && {
    headers: async () => [
      {
        source: '/:path*',
        headers: [{ key: 'x-nextjs-deployment-id', value: process.env.DEPLOYMENT_ID }],
      },
    ],
  }),
};

export default nextConfig;
