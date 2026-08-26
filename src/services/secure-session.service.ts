import aesService from "./aes.service";

class SecureSessionService {
  private readonly encryptionKey: string;
  private readonly encryptionIv: string;
  private readonly keyPrefix = "secure_";

  constructor() {
    this.encryptionKey = process.env.NEXT_PUBLIC_SESSION_ENCRYPTION_KEY ?? "";

    this.encryptionIv = process.env.NEXT_PUBLIC_SESSION_ENCRYPTION_IV ?? "";
  }

  private isSessionStorageAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.sessionStorage !== "undefined"
    );
  }

  private getSessionKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  setItem(key: string, value: string): boolean {
    if (!this.isSessionStorageAvailable() || !key) {
      return false;
    }

    try {
      const encryptedValue = aesService.encrypt(
        value,
        this.encryptionKey,
        this.encryptionIv,
      );

      sessionStorage.setItem(this.getSessionKey(key), encryptedValue);

      return true;
    } catch {
      return false;
    }
  }

  getItem(key: string): string | null {
    if (!this.isSessionStorageAvailable() || !key) {
      return null;
    }

    try {
      const encryptedValue = sessionStorage.getItem(this.getSessionKey(key));

      if (!encryptedValue) {
        return null;
      }

      const decryptedValue = aesService.decrypt(
        encryptedValue,
        this.encryptionKey,
        this.encryptionIv,
      );

      return decryptedValue || null;
    } catch {
      return null;
    }
  }

  removeItem(key: string): boolean {
    if (!this.isSessionStorageAvailable() || !key) {
      return false;
    }

    try {
      sessionStorage.removeItem(this.getSessionKey(key));
      return true;
    } catch {
      return false;
    }
  }

  removeAll(): boolean {
    if (!this.isSessionStorageAvailable()) {
      return false;
    }

    try {
      sessionStorage.clear();

      return true;
    } catch {
      return false;
    }
  }
}

const secureSessionService = new SecureSessionService();

export default secureSessionService;
