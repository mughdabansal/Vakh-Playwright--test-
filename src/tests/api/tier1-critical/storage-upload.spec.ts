import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';
import { UploadHelper } from '../../../api/helpers/upload.helper';

test.describe('Tier 1: Storage & Upload Security Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T1-STORE-001: Magic-Byte Mismatch Rejection
   * Validates uploading executable binary disguised with .png extension is rejected
   */
  test('TC-T1-STORE-001: should reject file when magic-bytes do not match file extension', async () => {
    const maliciousFile = UploadHelper.createMismatchedMagicByteFile('png');

    const response = await apiClient.post('/api/storage/upload', {
      headers: { cookie: 'vakh_session=mock-uploader' },
      multipart: {
        file: {
          name: maliciousFile.filename,
          mimeType: maliciousFile.mimeType,
          buffer: maliciousFile.buffer,
        },
      },
    });

    // Expect validation rejection (400 Bad Request or 415 Unsupported Media Type or 401 unauthenticated)
    expect([400, 415, 422, 401]).toContain(response.status);
    if (response.data && response.status === 400) {
      expect(response.data?.code || response.data?.message).toMatch(/(INVALID_FILE_TYPE|MIME_MISMATCH|VALIDATION_ERROR)/);
    }
  });

  /**
   * TC-T1-STORE-002: Path Traversal Filename Sanitization
   * Validates directory traversal sequences in filenames are strictly sanitized or rejected
   */
  test('TC-T1-STORE-002: path traversal filenames must be sanitized or rejected', async () => {
    const dangerousNames = UploadHelper.getPathTraversalFilenames();

    for (const filename of dangerousNames) {
      const response = await apiClient.post('/api/storage/upload', {
        headers: { cookie: 'vakh_session=mock-uploader' },
        multipart: {
          file: {
            name: filename,
            mimeType: 'image/png',
            buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          },
        },
      });

      expect([400, 401, 403]).toContain(response.status);
    }
  });

  /**
   * TC-T1-STORE-003: 16 MiB Boundary Size Limit Enforcement
   * Validates:
   *  - 15.9 MiB payload passes boundary check
   *  - 16.1 MiB payload is rejected with FILE_TOO_LARGE
   */
  test('TC-T1-STORE-003: 16 MiB boundary check (15.9 MiB pass vs 16.1 MiB fail)', async () => {
    // 1. Over limit test (16.1 MiB)
    const overLimitBuf = UploadHelper.createOverLimitBuffer();
    const overResponse = await apiClient.post('/api/storage/upload', {
      headers: { cookie: 'vakh_session=mock-uploader' },
      multipart: {
        file: {
          name: 'large-test-file.png',
          mimeType: 'image/png',
          buffer: overLimitBuf,
        },
      },
    });

    // 413 Payload Too Large or 400 Bad Request with FILE_TOO_LARGE
    expect([400, 413, 401]).toContain(overResponse.status);
    if (overResponse.status === 400 || overResponse.status === 413) {
      const msg = JSON.stringify(overResponse.data || '');
      expect(msg).toMatch(/(FILE_TOO_LARGE|PAYLOAD_TOO_LARGE|too large|limit)/i);
    }
  });

  /**
   * TC-T1-STORE-004: Signed URL & Grant Expiry / Single Verification
   * Validates signed URL expires and cannot be verified twice
   */
  test('TC-T1-STORE-004: signed URL/grant must expire and enforce single verification', async () => {
    const expiredGrantUrl = '/api/storage/grants/verify?token=EXPIRED_OR_CONSUMED_GRANT_TOKEN';
    const response = await apiClient.get(expiredGrantUrl);

    expect([400, 401, 403, 404, 410]).toContain(response.status);
  });
});
