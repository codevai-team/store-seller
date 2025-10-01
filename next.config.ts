import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Дополнительные настройки для production
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
