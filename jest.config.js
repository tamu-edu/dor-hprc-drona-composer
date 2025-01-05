module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'  // Changed this line from babel-loader to babel-jest
  },
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/index.js",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
