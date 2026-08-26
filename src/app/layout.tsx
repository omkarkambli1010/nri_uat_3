import type { Metadata, Viewport } from "next";
import Script from 'next/script';
import "./globals.scss";
// PrimeReact, Bootstrap &amp; Toast CSS — loaded globally
import "primereact/resources/themes/lara-light-purple/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";
import "@splidejs/react-splide/css/core";
import Providers from "@/lib/providers";
import AppShell from "@/components/app-shell/AppShell";
import GlobalBackButtonController from "@/components/navigation/GlobalBackButtonController";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    "Open Demat Account - Free Demat & Trading Account Opening Online | SBI Securities",
  description:
    "Open Demat Account - Zero Cost Demat & Trading Account opening online at SBI Securities; ₹0* Brokerage till ₹75 lakh Trades, Flat Brokerage ₹20/order* and Zero AMC for 1st Year & more",
  keywords:
    "demat account, trading account, SBI Securities, open demat account online",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Open Demat Account | SBI Securities",
    description:
      "Open a free Demat & Trading Account in minutes with SBI Securities.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <GlobalBackButtonController />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
