import { Suspense } from "react";
import UploadSignature from "@/components/upload-signature/UploadSignature";
import SemiDigitalGuard from "@/components/guards/SemiDigitalGuard";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Upload Signature | SBI Securities",
  description:
    "Upload your specimen signature to complete your SBI Securities NRI account application.",
  alternates: { canonical: canonicalUrl("uploadSignature") },
};

export default function UploadSignaturePage() {
  return (
    <Suspense fallback={null}>
      <UploadSignature />
    </Suspense>
  );
}
