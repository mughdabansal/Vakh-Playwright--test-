import { ApiClient } from '../client/ApiClient';
import { TEST_USERS } from '../../config/constants';

export interface TestFixturePool {
  primaryUser: { email: string; cookie: string };
  secondaryUser: { email: string; cookie: string };
  adminUser: { email: string; cookie: string };
  activePublicFormId: string;
  activePrivateFormId: string;
  archivedFormId: string;
}

export class SeedHelper {
  constructor(private apiClient: ApiClient) {}

  /**
   * Generates a unique test run tag to namespace ephemeral test resources
   */
  public static generateRunTag(): string {
    return `test-api-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Provisions or validates seeded test entities for the API test suite
   */
  public async ensureTestEntities(primaryCookie: string): Promise<{ formId: string; postId: string }> {
    const runTag = SeedHelper.generateRunTag();

    // Create a disposable test form if permissions allow
    const formResponse = await this.apiClient.post('/api/forms', {
      headers: { cookie: primaryCookie },
      data: {
        title: `Test Form ${runTag}`,
        description: 'Automated API Test Form',
        isPublic: true,
      },
    });

    const formId = formResponse.data?.id || `seeded-form-${runTag}`;

    // Create a disposable post inside the form
    const postResponse = await this.apiClient.post('/api/posts', {
      headers: { cookie: primaryCookie },
      data: {
        formId,
        content: `Automated test post ${runTag}`,
      },
    });

    const postId = postResponse.data?.id || `seeded-post-${runTag}`;

    return { formId, postId };
  }

  /**
   * Cleans up tagged test entities created during test execution
   */
  public async teardownTestEntities(primaryCookie: string, entityIds: { forms?: string[]; posts?: string[] }): Promise<void> {
    if (entityIds.posts) {
      for (const postId of entityIds.posts) {
        try {
          await this.apiClient.delete(`/api/posts/${postId}`, {
            headers: { cookie: primaryCookie },
          });
        } catch {}
      }
    }

    if (entityIds.forms) {
      for (const formId of entityIds.forms) {
        try {
          await this.apiClient.delete(`/api/forms/${formId}`, {
            headers: { cookie: primaryCookie },
          });
        } catch {}
      }
    }
  }
}
