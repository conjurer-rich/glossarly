module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '@glossarly/shared(.*)': '<rootDir>/../shared/src$1',
    '@glossarly/domain(.*)': '<rootDir>/../domain/src$1',
  },
};
