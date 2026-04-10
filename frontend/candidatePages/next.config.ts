import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow access from local network devices during development
  allowedDevOrigins: ['*'],
};

export default nextConfig;
