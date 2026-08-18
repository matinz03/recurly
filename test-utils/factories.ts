/**
 * Shared fixtures for tests. Lives outside `__tests__` on purpose: jest's
 * default testMatch treats everything under `__tests__` as a suite, and a
 * fixture file with no tests in it fails the run.
 */

/**
 * A minimal valid subscription.
 *
 * `status` defaults to active because most aggregation filters on it, so a
 * default that counts keeps each test's overrides about the thing it's proving.
 */
export const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
    id: 'test',
    icon: 1,
    name: 'Test',
    price: 10,
    billing: 'Monthly',
    status: 'active',
    ...overrides,
});
