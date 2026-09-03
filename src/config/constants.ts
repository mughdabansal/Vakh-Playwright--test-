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

export const TEST_USERS = {
  DEFAULT_USER: {
    email: 'mughdabansal1414@gmail.com',
  },
};

export const PERF_CONFIG = {
  TARGET_THROUGHPUT: 200, // req/sec
  CONCURRENT_CONNECTIONS: 50,
  DURATION_SECONDS: 15,
};
