import { Suspense } from "react";
import UploadSignatureInfo from "@/components/upload-signature-info/UploadSignatureInfo";
import SemiDigitalGuard from "@/components/guards/SemiDigitalGuard";

export default function UploadSignatureInfoPage() {
  return (
    <Suspense fallback={null}>
      <UploadSignatureInfo />
    </Suspense>
  );
}
