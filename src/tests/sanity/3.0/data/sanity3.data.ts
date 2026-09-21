import { TEST_USERS, APP_CONFIG } from '../../../../config/constants';

/**
 * Centralized Test Data Contract for Sanity 3.0 Test Suites.
 * Ensures tests reuse consistent, maintainable, and non-rigid data.
 */
export const SANITY_3_DATA = {
  // Authentication & Test Users
  AUTH: {
    PRIMARY_USER: TEST_USERS.DEFAULT_USER,
    PRIMARY_HANDLE: 'm_2094',
    ALLOWED_PEERS: {
      HAPPY_BADGER: 'happy_badger_2312',
      MUGHDA: 'mughdabansal1414',
      SUNNY_COMET: 'sunny_comet_1300',
    },
  },

  // Post Lifecycle Data Generator
  POSTS: {
    CREATE_TITLE: (timestamp: number = Date.now()) => `Sanity 3.0 Test Post [${timestamp}]`,
    EDIT_TITLE: (timestamp: number = Date.now()) => `Sanity 3.0 Updated Content [${timestamp}] - Verified`,
    DEFAULT_FORM: 'posts',
    RICH_BODY: '🚀 Sanity 3.0 Core Workflow Verification: rich text with emojis & links.',
  },

  // Form Lifecycle Data Generator
  FORMS: {
    CREATE_NAME: (timestamp: number = Date.now()) => `Sanity Form ${timestamp.toString().slice(-4)}`,
    CREATE_DESC: 'Automated Sanity 3.0 Form for lifecycle verification.',
    DEFAULT_OWN_FORM: 'posts',
  },

  // Group Chat & Messaging Data
  CHAT: {
    GROUP_NAME: 'QA Alpha Group',
    NEW_GROUP_PREFIX: 'Sanity 3.0 Group',
    DIRECT_MESSAGE: (timestamp: number = Date.now()) => `Sanity 3.0 DM from @m_2094 [${timestamp}]`,
    GROUP_MESSAGE: (timestamp: number = Date.now()) => `Sanity 3.0 Group Broadcast [${timestamp}]`,
    UPDATED_GROUP_NAME: (timestamp: number = Date.now()) => `QA Alpha Group ${timestamp.toString().slice(-4)}`,
  },

  // Subscriptions & Discovery
  SUBSCRIPTIONS: {
    SETTINGS_URL: `${APP_CONFIG.BASE_URL}/settings/subscriptions`,
    KNOWN_FORMS: ['posts', 'Chatter', 'Fixtures', 'Gigs', 'Offers', 'test form'],
  },

  // UI/UX Navigation Targets
  NAV_ROUTES: {
    HOME: '/',
    MESSAGES: '/messages',
    ACTIVITY: '/activity',
    EXPLORE: '/explore',
    SETTINGS: '/settings',
    PROFILE: '/user/gpsi',
  },
};
