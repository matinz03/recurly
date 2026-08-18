import dayjs from 'dayjs';
import {
    containsCardNumber,
    findDuplicateSubscriptionByName,
    formatCurrency,
    monthlyPrice,
    nextRenewalDate,
    resolveSubscriptionCurrency,
    totalsByCurrency,
} from '@/lib/utils';

const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
    id: 'test',
    icon: 1,
    name: 'Test',
    price: 10,
    billing: 'Monthly',
    // totalsByCurrency filters on status, so the shared factory needs a
    // default that counts - individual tests override it to prove exclusion.
    status: 'active',
    ...overrides,
});

describe('formatCurrency', () => {
    it('formats to two decimal places', () => {
        expect(formatCurrency(9.9)).toBe('$9.90');
    });
});

describe('monthlyPrice', () => {
    it('passes monthly prices through', () => {
        expect(monthlyPrice(subscription({ price: 12, billing: 'Monthly' }))).toBe(12);
    });

    it('spreads a yearly price across twelve months', () => {
        expect(monthlyPrice(subscription({ price: 120, billing: 'Yearly' }))).toBe(10);
    });
});

describe('nextRenewalDate', () => {
    it('rolls a past monthly renewal forward into the future', () => {
        const past = dayjs().subtract(3, 'month').add(2, 'day');
        const next = nextRenewalDate(past.toISOString(), 'Monthly');

        expect(next).not.toBeNull();
        expect(next!.isAfter(dayjs())).toBe(true);
        // Same day-of-month as the original, just a later month.
        expect(next!.date()).toBe(past.date());
    });

    it('leaves a future date alone', () => {
        const future = dayjs().add(10, 'day');
        expect(nextRenewalDate(future.toISOString(), 'Monthly')?.toISOString())
            .toBe(future.toISOString());
    });

    it('returns null for missing or unparseable input', () => {
        expect(nextRenewalDate(undefined, 'Monthly')).toBeNull();
        expect(nextRenewalDate('not a date', 'Monthly')).toBeNull();
    });
});

describe('totalsByCurrency', () => {
    it('collapses a single currency into one entry', () => {
        const subscriptions = [
            subscription({ id: 'a', price: 10, currency: 'USD' }),
            subscription({ id: 'b', price: 5, currency: 'USD' }),
        ];

        expect(totalsByCurrency(subscriptions)).toEqual([
            { currency: 'USD', monthly: 15, yearly: 180, count: 2 },
        ]);
    });

    it('keeps distinct currencies apart and sorts by monthly spend descending', () => {
        const subscriptions = [
            subscription({ id: 'a', price: 5, currency: 'EUR' }),
            subscription({ id: 'b', price: 20, currency: 'USD' }),
        ];

        expect(totalsByCurrency(subscriptions)).toEqual([
            { currency: 'USD', monthly: 20, yearly: 240, count: 1 },
            { currency: 'EUR', monthly: 5, yearly: 60, count: 1 },
        ]);
    });

    it('normalises yearly plans before totalling per currency', () => {
        const subscriptions = [
            subscription({ id: 'a', price: 120, billing: 'Yearly', currency: 'GBP' }),
            subscription({ id: 'b', price: 5, billing: 'Monthly', currency: 'GBP' }),
        ];

        expect(totalsByCurrency(subscriptions)).toEqual([
            { currency: 'GBP', monthly: 15, yearly: 180, count: 2 },
        ]);
    });

    it('treats a missing currency as USD', () => {
        const subscriptions = [subscription({ id: 'a', price: 10, currency: undefined })];

        expect(totalsByCurrency(subscriptions)).toEqual([
            { currency: 'USD', monthly: 10, yearly: 120, count: 1 },
        ]);
    });

    it('excludes paused and cancelled subscriptions', () => {
        const subscriptions = [
            subscription({ id: 'a', price: 10, currency: 'USD', status: 'active' }),
            subscription({ id: 'b', price: 50, currency: 'USD', status: 'paused' }),
            subscription({ id: 'c', price: 100, currency: 'EUR', status: 'cancelled' }),
        ];

        expect(totalsByCurrency(subscriptions)).toEqual([
            { currency: 'USD', monthly: 10, yearly: 120, count: 1 },
        ]);
    });
});

describe('findDuplicateSubscriptionByName', () => {
    it('matches an exact existing name', () => {
        const subscriptions = [subscription({ id: 'a', name: 'Netflix' })];
        expect(findDuplicateSubscriptionByName('Netflix', subscriptions)?.id).toBe('a');
    });

    it('matches case- and punctuation-insensitively', () => {
        const subscriptions = [subscription({ id: 'a', name: 'Netflix' })];
        expect(findDuplicateSubscriptionByName('  NET-FLIX!! ', subscriptions)?.id).toBe('a');
    });

    it('returns undefined when nothing matches', () => {
        const subscriptions = [subscription({ id: 'a', name: 'Netflix' })];
        expect(findDuplicateSubscriptionByName('Spotify', subscriptions)).toBeUndefined();
    });

    it('does not flag a subscription against itself when editing', () => {
        const subscriptions = [subscription({ id: 'a', name: 'Netflix' })];
        expect(findDuplicateSubscriptionByName('Netflix', subscriptions, 'a')).toBeUndefined();
    });

    it('still flags a different subscription with the same name while editing another', () => {
        const subscriptions = [
            subscription({ id: 'a', name: 'Netflix' }),
            subscription({ id: 'b', name: 'Netflix' }),
        ];
        // Editing 'b': 'a' is a genuine duplicate, so it must still surface.
        expect(findDuplicateSubscriptionByName('Netflix', subscriptions, 'b')?.id).toBe('a');
    });

    it('ignores a blank name', () => {
        const subscriptions = [subscription({ id: 'a', name: 'Netflix' })];
        expect(findDuplicateSubscriptionByName('   ', subscriptions)).toBeUndefined();
    });
});

describe('containsCardNumber', () => {
    it('accepts a plain card name', () => {
        expect(containsCardNumber('Personal Amex')).toBe(false);
    });

    it('accepts a name that mentions the last four', () => {
        expect(containsCardNumber('Visa 4242')).toBe(false);
    });

    it('rejects a pasted card number', () => {
        expect(containsCardNumber('4111111111111111')).toBe(true);
    });

    it('rejects a card number with spaces or dashes', () => {
        expect(containsCardNumber('4111 1111 1111 1111')).toBe(true);
        expect(containsCardNumber('4111-1111-1111-1111')).toBe(true);
    });

    it('rejects the shortest real card length', () => {
        // 13 digits is a valid PAN, so the floor has to sit below it.
        expect(containsCardNumber('4222222222222')).toBe(true);
    });

    it('rejects digits hidden among words', () => {
        expect(containsCardNumber('card 4111 1111 1111 1111 personal')).toBe(true);
    });
});

describe('resolveSubscriptionCurrency', () => {
    it('adopts the base currency for a new subscription', () => {
        expect(resolveSubscriptionCurrency(undefined, 'EUR')).toBe('EUR');
    });

    it('keeps what an existing subscription was priced in', () => {
        // Editing an unrelated field must not re-denominate a stored amount.
        expect(resolveSubscriptionCurrency('USD', 'EUR')).toBe('USD');
    });
});
