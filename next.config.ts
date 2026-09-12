import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fvvmfrbfqwdypkagtdce.supabase.co" },
    ],
  },
};

export default nextConfig;
