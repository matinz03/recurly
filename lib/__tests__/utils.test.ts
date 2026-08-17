import dayjs from 'dayjs';
import { formatCurrency, monthlyPrice, nextRenewalDate } from '@/lib/utils';

const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
    id: 'test',
    icon: 1,
    name: 'Test',
    price: 10,
    billing: 'Monthly',
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
