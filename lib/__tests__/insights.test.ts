import { computeInsights } from '@/lib/insights';
import { subscription } from '@/test-utils/factories';

describe('computeInsights', () => {
    it('reports zeroes for an empty list without inventing a currency', () => {
        const insights = computeInsights([]);

        expect(insights.monthlyTotal).toBe(0);
        expect(insights.yearlyTotal).toBe(0);
        expect(insights.activeCount).toBe(0);
        expect(insights.averageCost).toBe(0);
        expect(insights.currency).toBe('USD');
        expect(insights.categories).toEqual([]);
        expect(insights.top).toEqual([]);
        expect(insights.otherTotals).toEqual([]);
    });

    it('normalises a yearly plan to a monthly figure', () => {
        const insights = computeInsights([
            subscription({ id: 'a', price: 120, billing: 'Yearly' }),
        ]);

        expect(insights.monthlyTotal).toBe(10);
        expect(insights.yearlyTotal).toBe(120);
    });

    it('excludes paused and cancelled plans from the money figures', () => {
        const insights = computeInsights([
            subscription({ id: 'a', price: 10 }),
            subscription({ id: 'b', price: 99, status: 'paused' }),
            subscription({ id: 'c', price: 99, status: 'cancelled' }),
        ]);

        expect(insights.monthlyTotal).toBe(10);
        expect(insights.activeCount).toBe(1);
        expect(insights.top.map((entry) => entry.id)).toEqual(['a']);
    });

    it('scopes the money figures to one currency and reports the rest separately', () => {
        const insights = computeInsights([
            subscription({ id: 'a', price: 30, currency: 'USD' }),
            subscription({ id: 'b', price: 20, currency: 'USD' }),
            subscription({ id: 'c', price: 15, currency: 'EUR' }),
        ]);

        // 50 not 65 - mixing currencies would produce a meaningless number.
        expect(insights.currency).toBe('USD');
        expect(insights.monthlyTotal).toBe(50);
        expect(insights.activeCount).toBe(2);
        expect(insights.otherTotals).toEqual([
            expect.objectContaining({ currency: 'EUR', monthly: 15 }),
        ]);
    });

    it('picks the largest currency as the dominant one, not the first seen', () => {
        const insights = computeInsights([
            subscription({ id: 'a', price: 5, currency: 'USD' }),
            subscription({ id: 'b', price: 80, currency: 'GBP' }),
        ]);

        expect(insights.currency).toBe('GBP');
        expect(insights.monthlyTotal).toBe(80);
    });

    it('treats a missing currency as USD', () => {
        const insights = computeInsights([
            subscription({ id: 'a', price: 10, currency: undefined }),
            subscription({ id: 'b', price: 10, currency: 'USD' }),
        ]);

        expect(insights.currency).toBe('USD');
        expect(insights.monthlyTotal).toBe(20);
        expect(insights.otherTotals).toEqual([]);
    });

    it('counts every status across every currency', () => {
        // Regression: counts were once scoped to the dominant currency, so an
        // account whose plans are all cancelled in EUR fell back to USD and
        // reported zero of everything - the records vanished from the screen.
        const insights = computeInsights([
            subscription({ id: 'a', status: 'cancelled', currency: 'EUR' }),
            subscription({ id: 'b', status: 'cancelled', currency: 'EUR' }),
            subscription({ id: 'c', status: 'paused', currency: 'GBP' }),
        ]);

        expect(insights.counts).toEqual([
            { status: 'active', count: 0 },
            { status: 'paused', count: 1 },
            { status: 'cancelled', count: 2 },
        ]);
    });

    it('matches status case-insensitively', () => {
        // The type is lowercase-only, but persisted records predate it - hence
        // the cast, and hence the lowercasing in the code under test.
        const insights = computeInsights([
            subscription({ id: 'a', status: 'Active' as Subscription['status'], price: 7 }),
        ]);

        expect(insights.monthlyTotal).toBe(7);
        expect(insights.counts).toEqual([
            { status: 'active', count: 1 },
            { status: 'paused', count: 0 },
            { status: 'cancelled', count: 0 },
        ]);
    });

    it('groups spend by category, largest first', () => {
        const insights = computeInsights([
            subscription({ id: 'a', price: 5, category: 'Design' }),
            subscription({ id: 'b', price: 12, category: 'AI Tools' }),
            subscription({ id: 'c', price: 8, category: 'Design' }),
        ]);

        expect(insights.categories).toEqual([
            { label: 'Design', amount: 13 },
            { label: 'AI Tools', amount: 12 },
        ]);
    });

    it('falls back to the plan name, then to Uncategorised', () => {
        const insights = computeInsights([
            subscription({ id: 'a', price: 5, category: '   ', plan: 'Pro' }),
            subscription({ id: 'b', price: 4, category: undefined, plan: undefined }),
        ]);

        expect(insights.categories).toEqual([
            { label: 'Pro', amount: 5 },
            { label: 'Uncategorised', amount: 4 },
        ]);
    });

    it('caps the top list at five and orders it by monthly cost', () => {
        const insights = computeInsights(
            [3, 1, 6, 2, 5, 4].map((price, index) =>
                subscription({ id: `s${index}`, name: `S${price}`, price })
            )
        );

        expect(insights.top).toHaveLength(5);
        expect(insights.top.map((entry) => entry.amount)).toEqual([6, 5, 4, 3, 2]);
    });

    it('compares a yearly plan against monthly ones on the same basis', () => {
        const insights = computeInsights([
            subscription({ id: 'yearly', price: 240, billing: 'Yearly' }),
            subscription({ id: 'monthly', price: 15, billing: 'Monthly' }),
        ]);

        // 240/year is 20/month, so it outranks the 15/month plan.
        expect(insights.top.map((entry) => entry.id)).toEqual(['yearly', 'monthly']);
    });

    it('averages over the dominant currency only', () => {
        const insights = computeInsights([
            subscription({ id: 'a', price: 30, currency: 'USD' }),
            subscription({ id: 'b', price: 10, currency: 'USD' }),
            subscription({ id: 'c', price: 7, currency: 'JPY' }),
        ]);

        // (30 + 10) / 2 - the JPY plan is neither summed nor counted.
        expect(insights.averageCost).toBe(20);
    });

    it('does not mutate the list it is given', () => {
        const subscriptions = [
            subscription({ id: 'a', price: 5 }),
            subscription({ id: 'b', price: 50 }),
        ];

        computeInsights(subscriptions);

        expect(subscriptions.map((entry) => entry.id)).toEqual(['a', 'b']);
    });
});
