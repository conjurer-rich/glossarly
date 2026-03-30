module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@glossarly/shared(.*)$': '<rootDir>/../../packages/shared/src$1',
    '^@glossarly/domain(.*)$': '<rootDir>/../../packages/domain/src$1',
    '^@glossarly/infra-adapters(.*)$': '<rootDir>/../../packages/infra-adapters/src$1',
  },
};
