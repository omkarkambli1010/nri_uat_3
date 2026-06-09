class BlobService {
  async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }

  async dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
    const blob = await this.dataUrlToBlob(dataUrl);

    return new File([blob], fileName, {
      type: blob.type || "image/jpeg",
    });
  }

  async blobToFile(blob: Blob, fileName: string, type?: string): Promise<File> {
    return new File([blob], fileName, {
      type: type || blob.type || "application/octet-stream",
    });
  }

  fileToPreviewUrl(file: File | Blob): string {
    return URL.createObjectURL(file);
  }

  revokePreviewUrl(url?: string | null): void {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }

  getFileExtension(fileName: string): string {
    return fileName.split(".").pop()?.toLowerCase() || "";
  }

  isFileSizeValid(fileOrBlob: File | Blob, maxSizeInMb: number): boolean {
    const maxBytes = maxSizeInMb * 1024 * 1024;
    return fileOrBlob.size <= maxBytes;
  }

  generateFileName(prefix: string, extension = "png"): string {
    return `${prefix}-${Date.now()}.${extension}`;
  }

  getExtensionFromMimeType(mimeType?: string): string {
    if (!mimeType) return "png";

    if (mimeType.includes("jpeg")) return "jpg";
    if (mimeType.includes("jpg")) return "jpg";
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("pdf")) return "pdf";

    return "png";
  }
}

export const blobService = new BlobService();
export default blobService;
