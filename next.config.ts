import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "book.richology.cn",
          },
        ],
        destination: "https://www.bookleap.cn/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "bookleap.cn",
          },
        ],
        destination: "https://www.bookleap.cn/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
