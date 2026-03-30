module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: { '@glossarly/shared(.*)': '<rootDir>/../shared/src$1' },
};
