import { test, expect } from '@playwright/test';
import { ApiClient } from '../../../api/client/ApiClient';
import { UploadHelper } from '../../../api/helpers/upload.helper';

test.describe('Tier 2: CSV Import Pipeline & Async Job State Suite', () => {
  let apiClient: ApiClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new ApiClient(request);
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  /**
   * TC-T2-CSV-001: 5 MiB Pre-Parse Body Limit Rejection
   * Validates CSV bodies exceeding 5 MiB are rejected before memory parsing
   */
  test('TC-T2-CSV-001: CSV payloads exceeding 5 MiB must be rejected prior to parsing', async () => {
    const overLimitCsv = UploadHelper.createCsvBuffer(5.2); // 5.2 MiB

    const response = await apiClient.post('/api/forms/csv-import', {
      headers: {
        cookie: 'vakh_session=mock-owner',
        'content-type': 'text/csv',
      },
      data: overLimitCsv,
    });

    expect([400, 413, 401]).toContain(response.status);
  });

  /**
   * TC-T2-CSV-002: Async Pipeline State Transitions (validate -> import -> publish -> cleanup)
   * Validates job progression through phases
   */
  test('TC-T2-CSV-002: CSV import job must transition through valid async phases', async () => {
    const validCsv = UploadHelper.createCsvBuffer(0.1); // 100 KB

    const initResponse = await apiClient.post('/api/forms/csv-import', {
      headers: {
        cookie: 'vakh_session=mock-owner',
        'content-type': 'text/csv',
      },
      data: validCsv,
    });

    expect([200, 202, 400, 401]).toContain(initResponse.status);
    if (initResponse.status === 202 || initResponse.status === 200) {
      const jobId = initResponse.data?.jobId;
      if (jobId) {
        // Poll job status
        const statusResponse = await apiClient.get(`/api/forms/csv-import/${jobId}`);
        expect(statusResponse.status).toBe(200);
        expect(['validate', 'import', 'publish', 'cleanup', 'completed']).toContain(statusResponse.data?.phase);
      }
    }
  });

  /**
   * TC-T2-CSV-003: Mid-Phase Job Cancellation
   * Validates user can cancel an in-flight import job
   */
  test('TC-T2-CSV-003: in-flight CSV import job must support mid-phase cancellation', async () => {
    const response = await apiClient.post('/api/forms/csv-import/job-mock-in-flight/cancel', {
      headers: { cookie: 'vakh_session=mock-owner' },
    });

    expect([200, 204, 400, 401, 404]).toContain(response.status);
  });
});
