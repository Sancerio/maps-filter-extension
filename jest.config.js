module.exports = {
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // A list of paths to directories that Jest should use to search for files in
  roots: [
    "<rootDir>/tests"
  ],

  // The test environment that will be used for testing
  // For unit tests, 'node' is fine. For E2E with Puppeteer, we'll often run Puppeteer's environment.
  // We can override this per test suite if needed or set up a global puppeteer environment.
  // For now, let's default to 'node' and we'll handle Puppeteer specifics in E2E setup.
  testEnvironment: "node",

  // A map from regular expressions to paths to transformers
  // If you use ES modules or TypeScript, you might need babel-jest or ts-jest
  // For now, assuming commonjs and plain JavaScript.
  transform: {},

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    "/node_modules/",
    "/fixtures/"
  ],

  // Indicates whether each individual test should be reported during the run
  verbose: true,

  // We'll need this for Puppeteer later, good to have for async tests
  testTimeout: 30000,
}; 