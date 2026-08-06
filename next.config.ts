import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/library-wall/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/textures/closing-shelf.webp",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
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
        statusCode: 301,
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
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
