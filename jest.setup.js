/* eslint-env jest */
// lib/posthog.ts throws in __DEV__ when the PostHog env vars are missing, and
// constructs a real client when they're present. Neither is wanted in tests, so
// stub the module out - every consumer already treats `posthog` as optional.
jest.mock('@/lib/posthog', () => ({ posthog: undefined }));

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
