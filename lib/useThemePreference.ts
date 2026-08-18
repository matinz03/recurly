import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { usePreferencesStore } from '@/lib/preferencesStore';

/**
 * Applies the saved light/system/dark choice to the whole app.
 *
 * `Appearance.setColorScheme` is the single lever that covers everything:
 * `global.css`'s dark styles are `prefers-color-scheme` media queries, and the
 * JS-side colours read React Native's `useColorScheme()` - both follow the
 * appearance override, so nothing else needs to know a preference exists.
 * Passing null hands control back to the OS, which is what 'system' means.
 *
 * NativeWind exposes its own setColorScheme, but it's deprecated and only
 * delegates here, so this goes straight to the source.
 *
 * Waits for hydration, or the stored choice would be overwritten by the default
 * on every launch.
 */
export const useThemePreference = (): void => {
    const themePreference = usePreferencesStore((state) => state.themePreference);
    const hasHydrated = usePreferencesStore((state) => state.hasHydrated);

    useEffect(() => {
        if (!hasHydrated) return;
        Appearance.setColorScheme(themePreference === 'system' ? null : themePreference);
    }, [themePreference, hasHydrated]);
};
