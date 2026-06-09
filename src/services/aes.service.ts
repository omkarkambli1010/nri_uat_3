import CryptoJS from 'crypto-js';

// AES encryption/decryption service (equivalent to Angular AesService)
// Uses AES-128-CBC with PKCS7 padding, matching the original implementation

export class AesService {
  private static padKey(key: string): string {
    return (key ?? '').toString().padEnd(16, '=').slice(0, 16);
  }

  static encrypt(plainText: string, _key: string, _iv: string): string {
    const key = this.padKey(_key);
    const iv = this.padKey(_iv);

    const encrypted = CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(plainText),
      CryptoJS.enc.Utf8.parse(key),
      {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );
    return encrypted.toString();
  }

  static decrypt(cipherText: string, _key: string, _iv: string): string {
    if (cipherText == null || cipherText === 'null') return '';

    const key = this.padKey(_key);
    const iv = this.padKey(_iv);

    const decrypted = CryptoJS.AES.decrypt(cipherText, CryptoJS.enc.Utf8.parse(key), {
      keySize: 128 / 8,
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
}

// Instance-style export for use in class-based services
const aesService = {
  encrypt: AesService.encrypt.bind(AesService),
  decrypt: AesService.decrypt.bind(AesService),
};

export default aesService;
