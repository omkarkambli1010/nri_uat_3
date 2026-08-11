import { Suspense } from "react";
import type { Metadata } from "next";
import Selfie from "@/components/selfie/Selfie";
import SemiDigitalGuard from "@/components/guards/SemiDigitalGuard";
import { canonicalUrl } from "@/lib/seo";

interface Props {
  params: Promise<{ formNumber: string }>;
}

// Dynamic route, so the canonical is resolved per form number rather than
// hardcoded. Noindex is inherited from the root layout.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { formNumber } = await params;
  return {
    title: "Capture Selfie | SBI Securities",
    description:
      "Capture a live selfie to complete video verification for your SBI Securities NRI account.",
    alternates: { canonical: canonicalUrl(`CaptureSelfie/${formNumber}`) },
  };
}

export default function CaptureSelfie() {
  return (
    <Suspense fallback={null}>
      <Selfie />
    </Suspense>
  );
}
