// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // `landing/` is a self-contained Next.js project with its own toolchain -
    // linting it against the Expo config reports on rules it never opted into.
    ignores: ['dist/*', 'landing/*'],
  },
]);
