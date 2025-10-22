module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/integration/skillFlow.test.js',
    '/tests/unit/services/nutrisliceService.test.js',
    '/tests/integration/serviceIntegration.test.js'
  ],
  verbose: true,
  testTimeout: 10000
};
