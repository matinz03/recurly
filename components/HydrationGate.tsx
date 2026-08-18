import { ActivityIndicator, View } from 'react-native';
import { useThemeColors } from '@/constants/theme';

/**
 * Placeholder for the gap between first paint and AsyncStorage resolving.
 *
 * The store starts out holding the seed list, so anything rendered before
 * `hasHydrated` is showing data the user doesn't necessarily own. Screens swap
 * this in for that window rather than flashing seed subscriptions - or, worse,
 * an empty state or a "not found" that contradicts what's about to appear.
 */
const HydrationGate = () => {
    const colors = useThemeColors();
    return (
        // The live-region text each screen renders alongside this already
        // announces "Loading..." once, so this only needs a label for anyone
        // who focuses it directly - the ActivityIndicator itself is
        // decorative and would otherwise read as an unlabeled spinner.
        <View className="hydration-gate" accessibilityRole="progressbar" accessibilityLabel="Loading">
            <ActivityIndicator color={colors.accent} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        </View>
    );
};

export default HydrationGate;
