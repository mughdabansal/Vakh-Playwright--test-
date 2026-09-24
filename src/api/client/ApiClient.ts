import { APIRequestContext, APIResponse } from '@playwright/test';
import { ApiResponse, ApiErrorResponse } from '../types/api.types';
import { APP_CONFIG } from '../../config/constants';

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: any;
  multipart?: Record<string, any>;
  idempotencyKey?: string;
  consistencyToken?: string;
  timeout?: number;
}

export class ApiClient {
  constructor(
    private request: APIRequestContext,
    private baseUrl: string = APP_CONFIG.API_URL,
    private defaultHeaders: Record<string, string> = {}
  ) {}

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  private prepareHeaders(options?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options?.headers || {}),
    };

    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    if (options?.consistencyToken) {
      headers['X-Min-Consistency-Token'] = options.consistencyToken;
    }

    return headers;
  }

  public async get<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();
    const response = await this.request.get(url, {
      headers: this.prepareHeaders(options),
      params: options?.params,
      timeout: options?.timeout || APP_CONFIG.DEFAULT_TIMEOUT,
    });
    return this.formatResponse<T>(response, startTime);
  }

  public async post<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();
    const response = await this.request.post(url, {
      headers: this.prepareHeaders(options),
      params: options?.params,
      data: options?.data,
      multipart: options?.multipart,
      timeout: options?.timeout || APP_CONFIG.DEFAULT_TIMEOUT,
    });
    return this.formatResponse<T>(response, startTime);
  }

  public async put<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();
    const response = await this.request.put(url, {
      headers: this.prepareHeaders(options),
      params: options?.params,
      data: options?.data,
      multipart: options?.multipart,
      timeout: options?.timeout || APP_CONFIG.DEFAULT_TIMEOUT,
    });
    return this.formatResponse<T>(response, startTime);
  }

  public async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();
    const response = await this.request.delete(url, {
      headers: this.prepareHeaders(options),
      params: options?.params,
      data: options?.data,
      timeout: options?.timeout || APP_CONFIG.DEFAULT_TIMEOUT,
    });
    return this.formatResponse<T>(response, startTime);
  }

  public async fetchRaw(endpoint: string, init: Parameters<APIRequestContext['fetch']>[1]): Promise<APIResponse> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return this.request.fetch(url, init);
  }

  private async formatResponse<T>(response: APIResponse, startTime: number): Promise<ApiResponse<T>> {
    const duration = Date.now() - startTime;
    let data: any = null;
    const contentType = response.headers()['content-type'] || '';

    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      try {
        data = await response.text();
      } catch {
        data = null;
      }
    }

    return {
      status: response.status(),
      data,
      headers: response.headers(),
      latencyMs: duration,
    };
  }
}
