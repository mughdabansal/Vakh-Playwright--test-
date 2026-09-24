/**
 * TypeScript types and interfaces for the Vakh API testing framework.
 */

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
  latencyMs: number;
}

export interface ApiErrorResponse {
  code?: string;
  error?: string;
  message?: string;
  details?: any;
  retryAfter?: number;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string;
    twoFactorEnabled?: boolean;
    role?: string;
  } | null;
  session: {
    id: string;
    token: string;
    expiresAt: string;
  } | null;
}

export interface OpenFgaCheckRequest {
  user: string;
  relation: 'can_read' | 'can_get' | 'can_create' | 'can_admin';
  object: string;
}

export interface OpenFgaCheckResponse {
  allowed: boolean;
  resolution?: string;
}

export interface MessageRequestPayload {
  recipientId: string;
  conversationId?: string;
  content: string;
}

export interface MessageConsentState {
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  senderId: string;
  recipientId: string;
}

export interface HeartBatchPayload {
  targetType: 'post' | 'form';
  targetId: string;
  count: number; // 1 to 7
  idempotencyKey?: string;
}

export interface PopularDiscoveryParams {
  windowDays?: number;
  cursor?: string;
  limit?: number;
}

export interface CsvImportJobStatus {
  jobId: string;
  phase: 'validate' | 'import' | 'publish' | 'cleanup';
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
  previewCount?: number;
  error?: string;
}

export interface RestApiProxyRequest {
  formId: string;
  endpointUrl: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
}
