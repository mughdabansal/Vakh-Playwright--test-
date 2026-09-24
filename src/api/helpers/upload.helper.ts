/**
 * Upload & Storage Helper:
 * Generates test payloads for magic-byte validation, path traversal filename fuzzing,
 * and exact size boundary testing (16 MiB upload limit and 5 MiB CSV pre-parse limit).
 */

export class UploadHelper {
  /**
   * Generates a 15.9 MiB buffer (under the 16 MiB limit -> should pass)
   */
  public static createUnderLimitBuffer(): Buffer {
    const sizeBytes = Math.floor(15.9 * 1024 * 1024);
    const buf = Buffer.alloc(sizeBytes);
    // Add PNG magic header (89 50 4E 47 0D 0A 1A 0A)
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    pngHeader.copy(buf, 0);
    return buf;
  }

  /**
   * Generates a 16.1 MiB buffer (over the 16 MiB limit -> should reject with FILE_TOO_LARGE)
   */
  public static createOverLimitBuffer(): Buffer {
    const sizeBytes = Math.ceil(16.1 * 1024 * 1024);
    const buf = Buffer.alloc(sizeBytes);
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    pngHeader.copy(buf, 0);
    return buf;
  }

  /**
   * Generates a buffer with mismatched magic bytes (e.g. executable MZ or shell script labeled as .png)
   */
  public static createMismatchedMagicByteFile(fakeExtension: string = 'png'): { buffer: Buffer; filename: string; mimeType: string } {
    // Windows PE / DOS Executable header "MZ" (0x4D, 0x5A)
    const executableHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const body = Buffer.alloc(1024, 0x00);
    const buffer = Buffer.concat([executableHeader, body]);

    return {
      buffer,
      filename: `avatar-malicious.${fakeExtension}`,
      mimeType: 'image/png',
    };
  }

  /**
   * Path traversal attack filenames for sanitization testing
   */
  public static getPathTraversalFilenames(): string[] {
    return [
      '../../etc/passwd',
      '..\\..\\windows\\system32\\cmd.exe',
      '%2e%2e%2f%2e%2e%2fetc%2fhosts',
      'avatar\x00.png',
      '....//....//config.json',
      '/var/run/secrets.env',
    ];
  }

  /**
   * Generates CSV buffers for testing the 5 MiB pre-parse body limit
   */
  public static createCsvBuffer(sizeInMb: number): Buffer {
    const targetBytes = Math.floor(sizeInMb * 1024 * 1024);
    const header = 'id,name,email,score\n';
    const row = '1,Alice,alice@example.com,100\n';
    const repeats = Math.floor((targetBytes - header.length) / row.length);
    const content = header + row.repeat(repeats);
    return Buffer.from(content, 'utf-8');
  }
}
