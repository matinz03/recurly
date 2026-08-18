import { useColorScheme } from 'react-native';

export const CATEGORIES = [
    'Entertainment',
    'AI Tools',
    'Developer Tools',
    'Design',
    'Productivity',
    'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Light theme: pale washes carrying dark ink.
 *
 * These are the values persisted on a record's `color`, so they stay the
 * canonical set.
 */
export const CATEGORY_COLORS: Record<Category, string> = {
    Entertainment: '#ff6b6b',
    'AI Tools': '#b8d4e3',
    'Developer Tools': '#e8def8',
    Design: '#f5c542',
    Productivity: '#95e1d3',
    Other: '#d4d4d4',
};

/**
 * Dark theme: the same hues taken right down.
 *
 * The light washes are far too loud on a near-black ground - a full-width
 * salmon or chrome-yellow card dominates everything around it. These sit at
 * roughly a sixth of the luminance, so the card still reads as "this category"
 * while behaving like a surface, and the theme's ivory ink clears 7:1 on every
 * one of them.
 */
export const CATEGORY_COLORS_DARK: Record<Category, string> = {
    Entertainment: '#6d2b2b',
    'AI Tools': '#2a4453',
    'Developer Tools': '#3f3750',
    Design: '#5f4a15',
    Productivity: '#234c45',
    Other: '#38342f',
};

export const isCategory = (value?: string): value is Category =>
    !!value && (CATEGORIES as readonly string[]).includes(value);

/**
 * Resolves a subscription's card colour for the active theme.
 *
 * A record persists the light-theme value in `color`, which can't be swapped by
 * a `dark:` variant - it arrives as data, not a class. So the colour is derived
 * from `category` at render time instead, and the stored value is only the
 * fallback for a record whose category isn't one of ours (an import, or a
 * category that has since been renamed).
 */
export const useCategoryColor = () => {
    const isDark = useColorScheme() === 'dark';

    return (category?: string, storedColor?: string): string | undefined => {
        if (isCategory(category)) {
            return isDark ? CATEGORY_COLORS_DARK[category] : CATEGORY_COLORS[category];
        }
        return storedColor;
    };
};
