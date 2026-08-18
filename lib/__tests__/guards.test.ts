import { CATEGORIES, CATEGORY_COLORS, CATEGORY_COLORS_DARK, isCategory } from '@/constants/categories';
import { CURRENCIES, isCurrency } from '@/constants/currencies';
import { isLightColor } from '@/lib/utils';

// These guards sit between persisted data and the UI: a stored record can hold
// a category or currency that has since been renamed or removed, and the guard
// is what stops that becoming a crash or a blank tile.

describe('isCategory', () => {
    it('accepts every shipped category', () => {
        for (const category of CATEGORIES) {
            expect(isCategory(category)).toBe(true);
        }
    });

    it('rejects an unknown or renamed category', () => {
        expect(isCategory('Streaming')).toBe(false);
        expect(isCategory('entertainment')).toBe(false);
    });

    it('rejects nothing at all', () => {
        expect(isCategory(undefined)).toBe(false);
        expect(isCategory('')).toBe(false);
    });
});

describe('isCurrency', () => {
    it('accepts every offered currency', () => {
        for (const currency of CURRENCIES) {
            expect(isCurrency(currency)).toBe(true);
        }
    });

    it('rejects a currency the picker does not offer', () => {
        expect(isCurrency('CHF')).toBe(false);
        expect(isCurrency('usd')).toBe(false);
    });

    it('rejects nothing at all', () => {
        expect(isCurrency(undefined)).toBe(false);
        expect(isCurrency('')).toBe(false);
    });
});

describe('category palettes', () => {
    it('defines both themes for every category', () => {
        for (const category of CATEGORIES) {
            expect(CATEGORY_COLORS[category]).toMatch(/^#[0-9a-f]{6}$/i);
            expect(CATEGORY_COLORS_DARK[category]).toMatch(/^#[0-9a-f]{6}$/i);
        }
    });

    it('keeps the light washes light and the dark surfaces dark', () => {
        // The card picks its ink from this test's exact predicate, so a retuned
        // colour that crosses the line would otherwise silently break contrast.
        for (const category of CATEGORIES) {
            expect(isLightColor(CATEGORY_COLORS[category])).toBe(true);
            expect(isLightColor(CATEGORY_COLORS_DARK[category])).toBe(false);
        }
    });
});
