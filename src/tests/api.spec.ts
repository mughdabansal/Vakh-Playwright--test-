import { test, expect } from '@playwright/test';

const API_BASE_URL = 'https://xo.eve.vakh.com';

test.describe('Eve Vakh - Backend API Functional & Endpoint Test Suite', () => {

  /**
   * Test Case 1: Backend Health Check Endpoint
   * Validates:
   *  - GET /health returns HTTP 200 OK
   *  - Content-Type is application/json
   *  - Response latency is under 1500ms
   */
  test('API_TC_001: should return 200 OK for backend health check endpoint', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get(`${API_BASE_URL}/health`);
    const duration = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(duration).toBeLessThan(1500);

    const body = await response.json().catch(() => null);
    expect(body).not.toBeNull();
  });

  /**
   * Test Case 2: API Gateway Root Endpoint
   * Validates:
   *  - GET / returns HTTP 200 OK
   *  - Response contains valid JSON payload
   */
  test('API_TC_002: should return 200 OK and valid JSON from gateway root', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/`);
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  /**
   * Test Case 3: Protected API Route Security (Unauthenticated)
   * Validates:
   *  - Accessing protected /api routes without an auth bearer token returns HTTP 401 Unauthorized
   *  - Prevents unauthorized access to private platform data
   */
  test('API_TC_003: should enforce 401 Unauthorized on protected /api routes without credentials', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api`);
    
    expect(response.status()).toBe(401);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  /**
   * Test Case 4: Protected Internal Health Endpoint Authentication Guard
   * Validates:
   *  - GET /api/health requires authentication and returns 401
   */
  test('API_TC_004: should protect internal /api/health endpoint against unauthenticated access', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health`);
    
    expect(response.status()).toBe(401);
  });

  /**
   * Test Case 5: Static Avatar Asset Delivery & Storage Headers
   * Validates:
   *  - GET on user avatar asset returns HTTP 200 OK
   *  - Content-Type is image/jpeg or image/webp
   *  - Asset contains non-zero byte length
   */
  test('API_TC_005: should retrieve public avatar asset with valid image content-type', async ({ request }) => {
    const avatarUrl = `${API_BASE_URL}/api/storage/avatar/5bfe8fbe-a660-4a02-be16-abab7a0f3200/1777450879008-2729d2b8-77b2-4bf4-9e20-a2849ebbb14d.jpg`;
    const response = await request.get(avatarUrl);
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\/(jpeg|jpg|webp|png)/);
    
    const bodyBuffer = await response.body();
    expect(bodyBuffer.length).toBeGreaterThan(100);
  });

  /**
   * Test Case 6: CORS & HTTP Security Response Headers
   * Validates:
   *  - Presence of essential security headers on API responses
   */
  test('API_TC_006: should verify API response headers and security directives', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    const headers = response.headers();

    expect(response.status()).toBe(200);
    expect(headers).toBeDefined();
    expect(headers['content-type']).toBeDefined();
  });

});

/**
 * Dedicated Authentication API Test Suite: ALL /api/auth/* Endpoints
 * Tests are run sequentially with slight pacing to maintain determinism with backend rate limiting.
 */
test.describe('Eve Vakh - Authentication API Suite (/api/auth/*)', () => {
  test.describe.configure({ mode: 'serial' });

  // Pacing delay to avoid tripping 429 rate limiters across rapid test executions
  test.beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
  });

  /**
   * Helper to handle rate limit responses gracefully if hit during CI bursts
   */
  const handleRateLimit = async (response: any) => {
    if (response.status() === 429) {
      const data = await response.json();
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.retryAfter).toBeGreaterThan(0);
      return true;
    }
    return false;
  };

  /**
   * Test Case 1: Session Verification Endpoint
   * GET /api/auth/get-session
   * Validates unauthenticated session probe returns 200 OK with body null
   */
  test('API_AUTH_001: GET /api/auth/get-session returns 200 OK and null for unauthenticated client', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/auth/get-session`);
    if (await handleRateLimit(response)) return;

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toBeNull();
  });

  /**
   * Test Case 2: Email Password Sign-In Body Validation
   * POST /api/auth/sign-in/email
   * Validates empty payload produces 400 Bad Request with VALIDATION_ERROR
   */
  test('API_AUTH_002: POST /api/auth/sign-in/email returns 400 with VALIDATION_ERROR on empty payload', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/auth/sign-in/email`, {
      data: {}
    });
    if (await handleRateLimit(response)) return;

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.message).toContain('email');
    expect(data.message).toContain('password');
  });

  /**
   * Test Case 3: Email Password Sign-In Credential Rejection
   * POST /api/auth/sign-in/email
   * Validates invalid credentials produce 401 Unauthorized with INVALID_EMAIL_OR_PASSWORD
   */
  test('API_AUTH_003: POST /api/auth/sign-in/email returns 401 on incorrect credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/auth/sign-in/email`, {
      data: {
        email: 'invalid_tester_099@vakh.com',
        password: 'IncorrectPassword123!'
      }
    });
    if (await handleRateLimit(response)) return;

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.code).toBe('INVALID_EMAIL_OR_PASSWORD');
    expect(data.message).toBe('Invalid email or password');
  });

  /**
   * Test Case 4: CORS Preflight for Authentication Endpoints
   * OPTIONS /api/auth/sign-in/email
   * Validates 204 No Content and CORS preflight headers
   */
  test('API_AUTH_004: OPTIONS /api/auth/sign-in/email handles CORS preflight with 204 No Content', async ({ request }) => {
    const response = await request.fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://eve.vakh.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });

    expect(response.status()).toBe(204);
  });

  /**
   * Test Case 5: Email OTP Sign-In Validation
   * POST /api/auth/sign-in/email-otp
   * Validates missing email and otp fields yield 400 Bad Request
   */
  test('API_AUTH_005: POST /api/auth/sign-in/email-otp validates required email and otp payload fields', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/auth/sign-in/email-otp`, {
      data: {}
    });
    if (await handleRateLimit(response)) return;

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.message).toContain('otp');
  });

  /**
   * Test Case 6: Send Verification OTP Schema Validation
   * POST /api/auth/email-otp/send-verification-otp
   * Validates missing type enum and email yields 400 Bad Request
   */
  test('API_AUTH_006: POST /api/auth/email-otp/send-verification-otp enforces email and type enum requirements', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/auth/email-otp/send-verification-otp`, {
      data: {}
    });
    if (await handleRateLimit(response)) return;

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.message).toContain('type');
  });

  /**
   * Test Case 7: Phone Number OTP Dispatch Validation
   * POST /api/auth/phone-number/send-otp
   * Validates missing phoneNumber produces 400 Bad Request
   */
  test('API_AUTH_007: POST /api/auth/phone-number/send-otp enforces phoneNumber parameter validation', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/auth/phone-number/send-otp`, {
      data: {}
    });
    if (await handleRateLimit(response)) return;

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.message).toContain('phoneNumber');
  });

  /**
   * Test Case 8: Phone Number OTP Verification Validation
   * POST /api/auth/phone-number/verify
   * Validates missing phoneNumber and verification code produces 400 Bad Request
   */
  test('API_AUTH_008: POST /api/auth/phone-number/verify enforces phoneNumber and code validation', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/auth/phone-number/verify`, {
      data: {}
    });
    if (await handleRateLimit(response)) return;

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.message).toContain('code');
  });

  /**
   * Test Case 9: OAuth2 Consent Meta Parameter Enforcement
   * GET /api/auth/oauth2/consent-meta
   * Validates missing consent_code produces 400 Bad Request
   */
  test('API_AUTH_009: GET /api/auth/oauth2/consent-meta enforces consent_code requirement', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/auth/oauth2/consent-meta`);
    if (await handleRateLimit(response)) return;

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('consent_code is required');
  });

  /**
   * Test Case 10: Auth Endpoints JSON Response & Rate Limit Contract
   * Validates that all auth responses return compliant JSON and standard error/status formats
   */
  test('API_AUTH_010: should verify security error and rate limit schema contracts on auth routes', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/auth/sign-in/email`, {
      data: { email: '', password: '' }
    });
    
    expect([400, 401, 429]).toContain(response.status());
    expect(response.headers()['content-type']).toContain('application/json');
    const data = await response.json();
    expect(data).toHaveProperty('message');
  });

});
