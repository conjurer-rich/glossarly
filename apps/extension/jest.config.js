module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '@glossarly/shared(.*)': '<rootDir>/../../packages/shared/src$1'
  }
};
