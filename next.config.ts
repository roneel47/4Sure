
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // allowedDevOrigins was moved to top level
  },
  allowedDevOrigins: [
    'https://6000-firebase-studio-1749372654766.cluster-htdgsbmflbdmov5xrjithceibm.cloudworkstations.dev',
    'https://9000-firebase-studio-1749372654766.cluster-htdgsbmflbdmov5xrjithceibm.cloudworkstations.dev',
  ],
};

export default nextConfig;
