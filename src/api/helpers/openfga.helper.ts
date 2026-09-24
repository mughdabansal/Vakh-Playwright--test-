import { ApiClient } from '../client/ApiClient';

export type FgaRelation = 'can_read' | 'can_get' | 'can_create' | 'can_admin';

export interface FgaCheckAssertion {
  user: string;
  relation: FgaRelation;
  object: string;
  expectedAllowed: boolean;
}

export class OpenFgaHelper {
  constructor(private apiClient: ApiClient) {}

  /**
   * Asserts whether a given user identity has a specific permission on a resource.
   * Can evaluate via backend endpoints or direct check endpoints if exposed.
   */
  public async checkPermission(
    userTokenOrCookie: string,
    resourceType: 'form' | 'post' | 'conversation',
    resourceId: string,
    action: 'read' | 'create' | 'admin' | 'delete'
  ): Promise<{ allowed: boolean; status: number; body: any }> {
    const headers = { cookie: userTokenOrCookie };

    let endpoint = `/api/${resourceType}s/${resourceId}`;
    let method: 'get' | 'post' | 'delete' = 'get';

    if (action === 'create') {
      endpoint = `/api/${resourceType}s`;
      method = 'post';
    } else if (action === 'delete') {
      method = 'delete';
    }

    let response;
    if (method === 'get') {
      response = await this.apiClient.get(endpoint, { headers });
    } else if (method === 'post') {
      response = await this.apiClient.post(endpoint, { headers, data: { test: true } });
    } else {
      response = await this.apiClient.delete(endpoint, { headers });
    }

    const allowed = response.status >= 200 && response.status < 300;
    return {
      allowed,
      status: response.status,
      body: response.data,
    };
  }

  /**
   * Verifies the revoke-then-access race condition:
   * When purgeFormPermissions is called, subsequent concurrent read/create requests
   * must NEVER yield a stale allow.
   */
  public async verifyRevokeThenAccessRace(
    formId: string,
    revokedUserCookie: string,
    adminCookie: string
  ): Promise<{ raceDetected: boolean; statuses: number[] }> {
    // 1. Fire revoke permission request
    const revokePromise = this.apiClient.post(`/api/forms/${formId}/permissions/revoke`, {
      headers: { cookie: adminCookie },
      data: { targetUserId: 'revoked-user-id' },
    });

    // 2. Immediately fire concurrent read & write from the revoked identity
    const attempts = await Promise.all([
      this.apiClient.get(`/api/forms/${formId}`, { headers: { cookie: revokedUserCookie } }),
      this.apiClient.post(`/api/posts`, { headers: { cookie: revokedUserCookie }, data: { formId, content: 'race' } }),
      this.apiClient.get(`/api/forms/${formId}/posts`, { headers: { cookie: revokedUserCookie } }),
    ]);

    await revokePromise;

    // Check if any request after revocation succeeded with 200/201 when it should be 403
    const statuses = attempts.map(a => a.status);
    const staleAllows = statuses.filter(s => s === 200 || s === 201);

    return {
      raceDetected: staleAllows.length > 0,
      statuses,
    };
  }
}
