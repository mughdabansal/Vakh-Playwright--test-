/**
 * Centralized Application & Test Constants
 */
export const APP_CONFIG = {
  BASE_URL: 'https://eve.vakh.com',
  SIGN_IN_URL: 'https://eve.vakh.com/auth/sign-in',
  MFA_URL: 'https://eve.vakh.com/auth/mfa-challenge',
  API_URL: 'https://xo.eve.vakh.com',
  DEFAULT_TIMEOUT: 15000,
  NAVIGATION_TIMEOUT: 30000,
};

// Single designated test account: m@2094 (Do not alter or delete other accounts)
export const TEST_USERS = {
  DEFAULT_USER: {
    email: 'mughdabansal2094@gmail.com',
    password: 'M@12345678',
    username: 'm_2094',
  },
};

export const PERF_CONFIG = {
  TARGET_THROUGHPUT: 200, // req/sec
  CONCURRENT_CONNECTIONS: 50,
  DURATION_SECONDS: 15,
};
