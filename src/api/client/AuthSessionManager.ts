import { ApiClient } from './ApiClient';
import { AuthSession } from '../types/api.types';
import { TEST_USERS } from '../../config/constants';

export interface UserCredentials {
  email: string;
  password?: string;
  role?: 'admin' | 'owner' | 'member' | 'unauthorized';
}

export class AuthSessionManager {
  private activeSessions: Map<string, { cookie: string; sessionData: AuthSession | null }> = new Map();
  private activeRefreshPromise: Promise<{ cookie: string; sessionData: any }> | null = null;
  private credentialEpoch = 0;

  constructor(private apiClient: ApiClient) {}

  public async signIn(credentials: UserCredentials = TEST_USERS.DEFAULT_USER): Promise<{ cookie: string; sessionData: any }> {
    const cacheKey = credentials.email;
    if (this.activeSessions.has(cacheKey)) {
      return this.activeSessions.get(cacheKey)!;
    }

    const currentEpoch = ++this.credentialEpoch;

    const response = await this.apiClient.post('/api/auth/sign-in/email', {
      data: {
        email: credentials.email,
        password: credentials.password || 'M@12345678',
      },
    });

    const rawSetCookie = response.headers['set-cookie'] || '';
    const cookie = this.formatCookieForRequest(rawSetCookie);
    const sessionData = response.data;

    const sessionEntry = {
      cookie,
      sessionData,
    };

    // Stale flight guard: only persist if credentialEpoch has not been superseded
    if (response.status === 200 && currentEpoch === this.credentialEpoch) {
      this.activeSessions.set(cacheKey, sessionEntry);
    }

    return sessionEntry;
  }

  /**
   * Refreshes the auth session token.
   * Concurrently rejected requests share a single refresh promise to avoid duplicate refresh storms.
   */
  public refreshToken(existingCookie?: string): Promise<{ cookie: string; sessionData: any }> {
    if (this.activeRefreshPromise) {
      return this.activeRefreshPromise;
    }

    const currentEpoch = ++this.credentialEpoch;
    this.activeRefreshPromise = (async () => {
      try {
        const headers = existingCookie ? { cookie: existingCookie } : undefined;
        const response = await this.apiClient.post('/api/auth/refresh', {
          headers,
          data: {},
        });

        const rawSetCookie = response.headers['set-cookie'] || '';
        const cookie = this.formatCookieForRequest(rawSetCookie) || existingCookie || '';
        const sessionData = response.data;

        const sessionEntry = { cookie, sessionData };

        // Guard against stale refresh overwriting newer valid sign-in
        if (response.status === 200 && currentEpoch === this.credentialEpoch) {
          this.activeSessions.set('refreshed_session', sessionEntry);
        }

        return sessionEntry;
      } finally {
        this.activeRefreshPromise = null;
      }
    })();

    return this.activeRefreshPromise;
  }

  /**
   * Safe native/local storage recovery:
   * Handles corrupted or malformed JSON payloads gracefully without throwing uncaught exceptions.
   */
  public recoverSessionFromStorage(rawStorage: string | null): { success: boolean; session: any | null; recovered: boolean } {
    if (!rawStorage || typeof rawStorage !== 'string') {
      return { success: false, session: null, recovered: false };
    }

    try {
      const parsed = JSON.parse(rawStorage);
      if (parsed && typeof parsed === 'object' && (parsed.token || parsed.user || parsed.cookie)) {
        return { success: true, session: parsed, recovered: true };
      }
      return { success: false, session: null, recovered: false };
    } catch {
      // Malformed JSON caught cleanly: returns unrecovered so caller can safely reset state
      return { success: false, session: null, recovered: false };
    }
  }

  /**
   * Sanitizes request or log payloads to redact authorization tokens, passwords, and secrets
   */
  public static redactCredentials(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveKeys = ['authorization', 'cookie', 'password', 'token', 'refresh_token', 'secret', 'key'];
    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && /[?&](x-amz-signature|signature|sig)=/i.test(value)) {
        sanitized[key] = value.replace(/([?&](?:x-amz-signature|signature|sig)=)[^&]+/gi, '$1[REDACTED]');
      } else if (value && typeof value === 'object') {
        sanitized[key] = AuthSessionManager.redactCredentials(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private formatCookieForRequest(rawSetCookie: string): string {
    if (!rawSetCookie) return '';
    return rawSetCookie
      .replace(/\r/g, '')
      .split('\n')
      .map(line => line.split(';')[0].trim())
      .filter(part => part && part.includes('=') && !/^(path|expires|samesite|domain|httponly|max-age)=/i.test(part))
      .join('; ');
  }

  public async getSession(cookie?: string): Promise<any> {
    const headers = cookie ? { cookie } : undefined;
    const response = await this.apiClient.get('/api/auth/get-session', { headers });
    return response.data;
  }

  public async signOut(cookie?: string): Promise<boolean> {
    const headers = cookie ? { cookie } : undefined;
    const response = await this.apiClient.post('/api/auth/sign-out', { headers, data: {} });
    return response.status === 200 || response.status === 204;
  }

  public clearSessionCache(): void {
    this.activeSessions.clear();
    this.activeRefreshPromise = null;
  }
}
