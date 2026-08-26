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

  // Next 16 builds with Turbopack by default. An empty config is enough here:
  // Turbopack does not polyfill Node builtins into client bundles, so the old
  // `webpack.resolve.fallback` stubbing of fs/net/tls is no longer needed.
  // Declaring this key also silences the "webpack config with no turbopack
  // config" build error. The `webpack` block below is kept only so `next build
  // --webpack` remains a working escape hatch if a Turbopack issue turns up.
  turbopack: {
    // @splidejs/react-splide@0.7.12 is a broken dual package: its `exports.import`
    // entry (dist/js/react-splide.esm.js) uses ESM syntax but carries a .js
    // extension in a package with no `"type": "module"`, so by spec that file is
    // CommonJS. Webpack sniffed the syntax and coped; Turbopack (the Next 16
    // default) does not — it resolved `Splide`/`SplideSlide` to `undefined`,
    // inlined `void 0` into the JSX and tree-shook the package away, so every
    // <Splide> render threw "Element type is invalid". Point the resolver at the
    // CJS build, which exports all three components correctly.
    // Remove once react-splide ships a correctly declared ESM entry.
    resolveAlias: {
      "@splidejs/react-splide":
        "./node_modules/@splidejs/react-splide/dist/js/react-splide.cjs.js",
    },
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
