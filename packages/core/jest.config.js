export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.jsx', '.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^ioredis$': '<rootDir>/src/__tests__/__mocks__/ioredis.js',
    '^bullmq$': '<rootDir>/src/__tests__/__mocks__/bullmq.js',
    '^playwright$': '<rootDir>/src/__tests__/__mocks__/playwright.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(bullmq|ioredis)/)',
  ],
  testMatch: [
    '**/src/__tests__/**/*.test.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__mocks__/',
  ],
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
};