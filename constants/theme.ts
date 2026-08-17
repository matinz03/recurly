import { useColorScheme } from "react-native";

/**
 * Warm cream, navy ink, coral accent - see docs/DECISIONS.md for why this
 * file duplicates global.css's `@theme` tokens.
 */
export const lightColors = {
    background: "#fff9e3",
    foreground: "#081126",
    card: "#fff8e7",
    muted: "#f6eecf",
    mutedForeground: "rgba(0, 0, 0, 0.6)",
    primary: "#081126",
    accent: "#ea7a53",
    border: "rgba(0, 0, 0, 0.1)",
    success: "#16a34a",
    destructive: "#dc2626",
    subscription: "#8fd1bd",
    /** TextInput placeholderTextColor - not a NativeWind className prop. */
    placeholder: "rgba(0, 0, 0, 0.4)",
} as const;

/**
 * Not an inversion of `lightColors` - see docs/DECISIONS.md ("Dark mode
 * palette"). Surfaces are warm near-black/brown rather than pure black;
 * `accent` is deliberately darkened (not just desaturated) from the light
 * coral because it is most often used as a *fill* behind the now-light ink
 * text (buttons, the FAB, the home balance card), and a fill needs to stay
 * dark enough for that light text to read at AA - painting it at the light
 * theme's brightness would glow and wreck that contrast.
 */
export const darkColors = {
    background: "#171310",
    foreground: "#f3ecd7",
    card: "#211b14",
    // Deliberately lighter than a "surface" token would usually be: two
    // bundled glyphs (icons.back, icons.add) are baked dark-navy PNGs that
    // cannot be recolored per-theme (see docs/DECISIONS.md), and they render
    // inside `bg-muted`/`bg-accent` tiles. `muted` has to stay light enough
    // for those fixed-dark glyphs to clear the 3:1 non-text contrast floor.
    muted: "#6e6151",
    mutedForeground: "rgba(244, 237, 220, 0.72)",
    primary: "#f3ecd7",
    accent: "#a84c2b",
    border: "rgba(244, 237, 220, 0.14)",
    success: "#4ade80",
    destructive: "#ef4444",
    subscription: "#33564a",
    placeholder: "rgba(244, 237, 220, 0.45)",
} as const;

/**
 * Static light-theme ink, kept under its original name for the call sites
 * that predate dark mode and were never meant to react to it: the fixed
 * category pastels (`CATEGORY_COLORS` in CreateSubscriptionModal, and the
 * `color` persisted on each subscription) are data, not theme - see
 * docs/DECISIONS.md. They stay light in both modes, so text painted
 * directly on one of them must stay this fixed dark ink too, never the
 * theme-reactive palette below, or it goes invisible the moment the app's
 * ink flips light for dark mode.
 */
export const colors = lightColors;

/** Resolves to the palette matching the OS appearance setting. */
export const useThemeColors = () => {
    const scheme = useColorScheme();
    return scheme === "dark" ? darkColors : lightColors;
};

/**
 * Fixed regardless of theme. The tab bar's icon glyphs are baked-color PNGs
 * (white) rendered with no runtime tint, so the bar has to stay the same
 * dark chrome in both themes or the icons disappear into it - see
 * docs/DECISIONS.md.
 */
export const NAV_CHROME_BACKGROUND = "#081126";

export const spacing = {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    14: 56,
    16: 64,
    18: 72,
    20: 80,
    24: 96,
    30: 120,
} as const;

export const components = {
    tabBar: {
        height: spacing[18],
        horizontalInset: spacing[5],
        radius: spacing[8],
        iconFrame: spacing[12],
        itemPaddingVertical: spacing[2],
    },
} as const;

export const theme = {
    colors,
    spacing,
    components,
} as const;
