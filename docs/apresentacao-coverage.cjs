const path = require('node:path');

module.exports = {
  ...require('../jest.config.js'),
  rootDir: path.resolve(__dirname, '..'),
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
    '!src/test-support/**',
  ],
  coverageDirectory: '<rootDir>/node_modules/.cache/ate-apresentacao-coverage',
  coverageReporters: ['text-summary', 'json-summary'],
};
