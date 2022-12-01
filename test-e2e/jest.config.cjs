module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['./**.test.js'],
  verbose: false,
  notifyMode: 'always',
  maxWorkers: '50%',
  maxConcurrency: 1,
  moduleNameMapper: {
    // Force module uuid to resolve with the CJS entry point, because Jest does not support package.json.exports
    // See https://github.com/uuidjs/uuid/issues/451
    "uuid": require.resolve('uuid'),
  },
};