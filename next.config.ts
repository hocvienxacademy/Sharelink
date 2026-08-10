import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./src/modules/word-export/templates/phieu-du-tuyen-v1.docx"],
  },
  productionBrowserSourceMaps: false,
  experimental: {
    useTypeScriptCli: true,
  },
  async headers() {
    const securityHeaders = [
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      ...(process.env.ENABLE_HSTS === "true"
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains",
            },
          ]
        : []),
    ];
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/dang-ky/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
