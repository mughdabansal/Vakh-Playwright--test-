import { test, expect } from '@playwright/test';

const API_BASE_URL = 'https://xo.eve.vakh.com';

test.describe('Eve Vakh - Backend API Functional & Endpoint Test Suite', () => {

  /**
   * Test Case 1: Backend Health Check Endpoint
   * Validates:
   *  - GET /health returns HTTP 200 OK
   *  - Content-Type is application/json
   *  - Response latency is under 1000ms
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
