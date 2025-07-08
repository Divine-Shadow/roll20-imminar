module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: {
        module: 'CommonJS',
        allowJs: true
      }
    }
  },
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest'
  }
};
