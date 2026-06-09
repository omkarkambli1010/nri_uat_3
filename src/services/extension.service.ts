// Extension Service — equivalent to Angular ExtensionService
// Validates uploaded file types by checking magic bytes (file signatures)

const FILE_SIGNATURES: Record<string, string> = {
  '89504E47': 'image/png',
  '25504446': 'application/pdf',
  'FFD8FFDB': 'image/jpeg',
  'FFD8FFE0': 'image/jpeg',
  'FFD8FFE1': 'image/jpeg',
  '00000018': 'image/heic',
  '66747970': 'image/heif',
};

class ExtensionService {
  async onFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<boolean> {
    const file = event.target.files?.[0];
    if (!file) return false;
    return this.onFileSelected(file);
  }

  async onFileSelected(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await this.readFileContent(file);
      return this.checkFileSignature(arrayBuffer);
    } catch (error) {
      console.error('Error reading file:', error);
      return false;
    }
  }

  readFileContent(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        resolve(new Uint8Array(event.target!.result as ArrayBuffer));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  checkFileSignature(array: Uint8Array): boolean {
    const hexString = array
      .slice(0, 4)
      .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0').toUpperCase(), '');
    return !!FILE_SIGNATURES[hexString];
  }
}

export const extensionService = new ExtensionService();
export default extensionService;
