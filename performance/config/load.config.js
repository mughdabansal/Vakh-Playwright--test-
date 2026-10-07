const path = require('path');

/**
 * Eve Vakh Load Testing Suite Configuration
 */
const LOAD_CONFIG = {
  // Target Hostnames
  TARGET_URL: process.env.APP_URL || 'https://eve.vakh.com',
  API_URL: process.env.API_URL || 'https://xo.eve.vakh.com',
  WS_URL: process.env.WS_URL || 'wss://xo.eve.vakh.com/ws',

  // Reporting Directories
  OUTPUT_DIR: path.join(__dirname, '..', '..', 'test-reports', 'load'),

  // Test User Credentials (strictly loaded from environment variables)
  AUTH_USER: {
    email: process.env.VAKH_TEST_EMAIL || '',
    password: process.env.VAKH_TEST_PASSWORD || '',
    username: process.env.VAKH_TEST_USERNAME || 'm_2094',
  },

  // Service Level Objectives (SLOs) & Thresholds
  SLO: {
    FRONTEND: {
      p95LatencyMs: 400,
      p99LatencyMs: 700,
      maxErrorRatePercent: 1.0,
      targetThroughputRps: 150,
    },
    API_READ: {
      p95LatencyMs: 650,
      p99LatencyMs: 950,
      max5xxRatePercent: 0.5,
      targetThroughputRps: 100,
    },
    API_WRITE: {
      p95LatencyMs: 900,
      p99LatencyMs: 1400,
      max5xxRatePercent: 0.5,
      targetThroughputRps: 30,
    },
    WEBSOCKET: {
      p95HandshakeMs: 1800,
      maxTimeouts: 0,
    },
    SPIKE_STRESS: {
      max5xxRatePercent: 0.5,
    },
    ENDURANCE: {
      p95MaxVariancePercent: 25,
      maxErrorRatePercent: 2.0,
    },
  },

  // Scenario Specific Settings (Mode-Aware: Smoke vs Stress)
  SCENARIOS: {
    FRONTEND: {
      smoke: {
        connections: 25,
        overallRate: 100,
        duration: 10,
        routes: [
          '/',
          '/auth/sign-in',
          '/explore',
          '/activity',
        ],
      },
      stress: {
        connections: 60,
        overallRate: 250,
        duration: 20,
        routes: [
          '/',
          '/auth/sign-in',
          '/explore',
          '/activity',
        ],
      },
      get connections() { return this.smoke.connections; },
      get overallRate() { return this.smoke.overallRate; },
      get duration() { return this.smoke.duration; },
      get routes() { return this.smoke.routes; },
    },
    API_READ: {
      smoke: {
        connections: 25,
        overallRate: 100,
        duration: 10,
        endpoints: [
          '/api/posts/popular',
          '/api/profiles/explore/nearby',
          '/api/init/users/m_2094',
        ],
      },
      stress: {
        connections: 60,
        overallRate: 220,
        duration: 20,
        endpoints: [
          '/api/posts/popular',
          '/api/profiles/explore/nearby',
          '/api/init/users/m_2094',
        ],
      },
      get connections() { return this.smoke.connections; },
      get overallRate() { return this.smoke.overallRate; },
      get duration() { return this.smoke.duration; },
      get endpoints() { return this.smoke.endpoints; },
    },
    API_WRITE: {
      smoke: {
        connections: 10,
        overallRate: 25,
        duration: 8,
      },
      stress: {
        connections: 25,
        overallRate: 50,
        duration: 15,
      },
      get connections() { return this.smoke.connections; },
      get overallRate() { return this.smoke.overallRate; },
      get duration() { return this.smoke.duration; },
    },
    RATE_LIMIT: {
      smoke: {
        USER_QUOTA: {
          amount: 120,
          connections: 15,
          baselineCount: 3,
          cleanWindowMinRemaining: 25,
        },
        IP_BARRIER: {
          amount: 500,
          connections: 40,
        },
        IDENTITY_ISOLATION: {
          userAAmount: 120,
          userAConnections: 15,
          userBAmount: 15,
          userBConnections: 3,
          cleanWindowMinRemaining: 30,
        },
      },
      stress: {
        USER_QUOTA: {
          amount: 250,
          connections: 25,
          baselineCount: 3,
          cleanWindowMinRemaining: 25,
        },
        IP_BARRIER: {
          amount: 1200,
          connections: 80,
        },
        IDENTITY_ISOLATION: {
          userAAmount: 250,
          userAConnections: 25,
          userBAmount: 30,
          userBConnections: 5,
          cleanWindowMinRemaining: 30,
        },
      },
      get USER_QUOTA() { return this.smoke.USER_QUOTA; },
      get IP_BARRIER() { return this.smoke.IP_BARRIER; },
      get IDENTITY_ISOLATION() { return this.smoke.IDENTITY_ISOLATION; },
    },
    WEBSOCKET: {
      smoke: {
        numConnections: 30,
        handshakeTimeoutMs: 5000,
      },
      stress: {
        numConnections: 100,
        handshakeTimeoutMs: 8000,
      },
      get numConnections() { return this.smoke.numConnections; },
      get handshakeTimeoutMs() { return this.smoke.handshakeTimeoutMs; },
    },
    SPIKE: {
      smoke: {
        stages: [
          { connections: 10, rate: 30, duration: 4 },
          { connections: 25, rate: 80, duration: 4 },
          { connections: 50, rate: 150, duration: 5 },
          { connections: 15, rate: 40, duration: 3 },
        ],
      },
      stress: {
        stages: [
          { connections: 10, rate: 30, duration: 4 },
          { connections: 50, rate: 150, duration: 5 },
          { connections: 100, rate: 300, duration: 5 },
          { connections: 20, rate: 50, duration: 4 },
        ],
      },
      get stages() { return this.smoke.stages; },
    },
    SOAK: {
      smoke: {
        connections: 15,
        overallRate: 40,
        duration: 30,
      },
      stress: {
        connections: 25,
        overallRate: 60,
        duration: 120,
      },
      get connections() { return this.smoke.connections; },
      get overallRate() { return this.smoke.overallRate; },
      get duration() { return this.smoke.duration; },
    },
  },

  /**
   * Resolves mode-specific scenario configuration ('smoke' or 'stress').
   */
  getScenarioConfig(scenarioName, mode = 'smoke') {
    const normMode = (mode || 'smoke').toLowerCase() === 'stress' ? 'stress' : 'smoke';
    const scenario = this.SCENARIOS[scenarioName];
    if (!scenario) return {};
    return scenario[normMode] || scenario;
  },

  /**
   * Resolves rate-limit suite configuration ('smoke' or 'stress').
   */
  getRateLimitConfig(mode = 'smoke') {
    const normMode = (mode || 'smoke').toLowerCase() === 'stress' ? 'stress' : 'smoke';
    return this.SCENARIOS.RATE_LIMIT[normMode] || this.SCENARIOS.RATE_LIMIT.smoke;
  },
};

module.exports = { LOAD_CONFIG };
