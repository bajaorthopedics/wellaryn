// To run tests, install: npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
});
