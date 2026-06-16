// Auto-selected based on NEXT_PUBLIC_ENV at build time
const env = process.env.NEXT_PUBLIC_ENV;

const environments: Record<
  string,
  {
    production: boolean;
    url: string;
    backendurl: string;
    localurl: string;
    basePath: string;
    nriBackendurl: string;
    googleClientId:string;
  }
> = {
  production: {
    production: true,
    url: "https://diy.sbisecurities.in/diynri/",
    backendurl: "https://diy.sbisecurities.in/nriapi",
    localurl: "http://localhost:44360/",
    basePath: "/diynri",
    nriBackendurl: "https://udn.sbisecurities.in/nriapi",
    googleClientId: "652145000458-ebpj0tfffq6e2lolfl3ei5fu11mhr831.apps.googleusercontent.com",
  },

  uat: {
    production: true,
    url: "https://udn.sbisecurities.in/diynri/",
    backendurl: "https://udn.sbisecurities.in/nriapi",
    localurl: "http://localhost:44360/",
    basePath: "/diynri",
    nriBackendurl: "https://udn.sbisecurities.in/nriapi",
    googleClientId: "652145000458-ebpj0tfffq6e2lolfl3ei5fu11mhr831.apps.googleusercontent.com",
  },

  development: {
    production: false,
    url: "http://localhost:3000/",
    backendurl: "https://udn.sbisecurities.in/nriapi",
    localurl: "http://localhost:44360/",
    basePath: "",
    nriBackendurl: "/nriapi",
    googleClientId: "652145000458-ebpj0tfffq6e2lolfl3ei5fu11mhr831.apps.googleusercontent.com",
  },
};

export const environment = environments[env ?? "development"];
export const currentEnvironment = env ?? "development";

// // Auto-selected based on NEXT_PUBLIC_ENV at build time
// const env = process.env.NEXT_PUBLIC_ENV;

// const environments: Record<string, { production: boolean; url: string; backendurl: string; localurl: string }> = {
//   production: {
//     production: true,
//     url: 'https://diy.sbisecurities.in/open-demat-account/',
//     backendurl: 'https://diy.sbisecurities.in/',
//     localurl: 'http://localhost:44360/',
//   },
//   uat: {
//     production: true,
//     url: 'https://udn.sbisecurities.in/diy/',
//     backendurl: 'https://udn.sbisecurities.in/',
//     localurl: 'http://localhost:44360/',
//   },
//   development: {
//     production: false,
//     url: 'https://udn.sbisecurities.in/diy/',
//     backendurl: 'https://udn.sbisecurities.in/',
//     localurl: 'http://localhost:44360/',
//   },
// };

// export const environment = environments[env ?? 'development'];
