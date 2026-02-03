import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* cacheComponents disabled due to dynamic data requirements */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 이미지 업로드를 위해 10MB로 증가
    },
  },
};

export default nextConfig;
