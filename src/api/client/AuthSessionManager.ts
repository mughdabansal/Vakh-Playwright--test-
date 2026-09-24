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

  constructor(private apiClient: ApiClient) {}

  public async signIn(credentials: UserCredentials = TEST_USERS.DEFAULT_USER): Promise<{ cookie: string; sessionData: any }> {
    const cacheKey = credentials.email;
    if (this.activeSessions.has(cacheKey)) {
      return this.activeSessions.get(cacheKey)!;
    }

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

    if (response.status === 200) {
      this.activeSessions.set(cacheKey, sessionEntry);
    }

    return sessionEntry;
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
  }
}
