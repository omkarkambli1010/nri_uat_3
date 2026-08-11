import { Suspense } from "react";
import UploadSignatureInfo from "@/components/upload-signature-info/UploadSignatureInfo";
import SemiDigitalGuard from "@/components/guards/SemiDigitalGuard";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Signature Guidelines | SBI Securities",
  description:
    "Guidelines for capturing a valid specimen signature for your SBI Securities NRI account.",
  alternates: { canonical: canonicalUrl("uploadSignatureinfo") },
};

export default function UploadSignatureInfoPage() {
  return (
    <Suspense fallback={null}>
      <UploadSignatureInfo />
    </Suspense>
  );
}
