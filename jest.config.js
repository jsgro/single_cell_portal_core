module.exports = {
  verbose: true,
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  transformIgnorePatterns: [
    // Bard client exports native ES6.
    // Jest can't import that without this line, but all modern browsers can.
    // This prevents SCP JavaScript tests from all throwing false positives.
    //
    // TODO (SCP-2705): Transpile Bard client to ease reuse
    // TODO (SCP-2688): Update Bard client docs to note dependents need this line
    'node_modules/(?!@databiosphere/bard-client)',
    '\\.png'
  ],
  setupFilesAfterEnv: ['./test/js/setup-tests.js'],
  testPathIgnorePatterns: [
    'config/webpack/test.js'
  ],
  moduleDirectories: [
    'app/javascript',
    'app/assets',
    'node_modules'
  ],
  moduleNameMapper: {
    "\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/test/js/jest-mocks/file-mock.js"
  }
}
