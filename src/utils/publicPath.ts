
import { environment } from "@/environments/environment";

export const publicPath = (path: string): string => {
  const basePath = environment.basePath || "";

  if (!path) {
    return basePath || "/";
  }

  // Do not modify full external URLs
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Avoid double prefix: /diynri/diynri/...
  if (basePath && normalizedPath.startsWith(`${basePath}/`)) {
    return normalizedPath;
  }

  if (basePath && normalizedPath === basePath) {
    return normalizedPath;
  }

  return `${basePath}${normalizedPath}`;
};
