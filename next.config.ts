import type { NextConfig } from "next";
import {
  environment,
  currentEnvironment,
} from "./src/environments/environment";

const isDevelopment = currentEnvironment === "development";

const nextServerOrigin =
  process.env.NEXT_SERVER_ORIGIN || "http://127.0.0.1:3000";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  basePath: environment.basePath || undefined,
  //trailingSlash: true,
  output: "standalone",

  // /personalDetailsForm/6 (Link Bank Account) was merged into
  // /manual-bankdetails. The next route is server-driven — the API still returns
  // the old path after PERSONAL_DETAILS5, and users mid-application have it
  // cached in sessionStorage.allowedRoutes — so catch it here rather than in
  // each of the 24 components that push uiMetadata.route. Not permanent: remove
  // once the backend stops emitting it.
  async redirects() {
    return [
      {
        source: "/personalDetailsForm/6",
        destination: "/manual-bankdetails",
        permanent: false,
      },
    ];
  },

  async rewrites() {
    if (isDevelopment) {
      return [
        {
          source: "/nriapi/:path*",
          destination: "https://udn.sbisecurities.in/nriapi/:path*",
        }
        // },
        // {
        //   source: "/s3-file/:path*",
        //   destination: "https://s3.ap-south-1.amazonaws.com/:path*",
        //   basePath: false,
        // },
      ];
    }
    return {
      beforeFiles: [        
        {
          source: "/assets/:path*",
          destination: `${nextServerOrigin}/diynri/assets/:path*`,
          basePath: false,
        },

        {
          source: "/_next/:path*",
          destination: `${nextServerOrigin}/diynri/_next/:path*`,
          basePath: false,
        },

        {
          source:
            "/:filename((?!api|nriapi|diynri|assets|_next)[^/]+).:ext(png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|pdf|woff|woff2|ttf|eot|map|webmanifest)",
          destination: `${nextServerOrigin}/diynri/:filename.:ext`,
          basePath: false,
        },
      ],
    };
  },

  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  sassOptions: {
    includePaths: ["./src"],
    additionalData: `
    @use "sass:color";
    @use "sass:string";

    $public-base-path: "${environment.basePath || ""}";

    @function public-url($path) {
      @if string.index($path, "data:") == 1 {
        @return url("#{$path}");
      }

      @if string.index($path, "http://") == 1 or string.index($path, "https://") == 1 {
        @return url("#{$path}");
      }

      @return url("#{$public-base-path}#{$path}");
    }
  `,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "diy.sbisecurities.in" },
      { protocol: "https", hostname: "udn.sbisecurities.in" },
      { protocol: "https", hostname: "www.figma.com" },
    ],
    unoptimized: true,
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
};

export default nextConfig;

// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   reactStrictMode: true,

//   async rewrites() {
//     return [
//       {
//         source: "/nriapi/:path*",
//         destination: "https://udn.sbisecurities.in/nriapi/:path*",
//       },
//     ];
//   },

//   onDemandEntries: {
//     maxInactiveAge: 60 * 1000,
//     pagesBufferLength: 5,
//   },
//   sassOptions: {
//     includePaths: ["./src"],
//   },
//   // Equivalent to Angular's base-href for deployment sub-paths
//   // basePath: '/open-demat-account',
//   images: {
//     remotePatterns: [
//       { protocol: "https", hostname: "diy.sbisecurities.in" },
//       { protocol: "https", hostname: "udn.sbisecurities.in" },
//       { protocol: "https", hostname: "www.figma.com" },
//     ],
//   },
//   // PWA-style output
//   output: "standalone",
//   // Webpack customization for crypto-js and node modules
//   webpack: (config) => {
//     config.resolve.fallback = {
//       ...config.resolve.fallback,
//       fs: false,
//       net: false,
//       tls: false,
//     };
//     return config;
//   },
// };

// export default nextConfig;
