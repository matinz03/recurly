import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * Placeholder for the gap between first paint and AsyncStorage resolving.
 *
 * The store starts out holding the seed list, so anything rendered before
 * `hasHydrated` is showing data the user doesn't necessarily own. Screens swap
 * this in for that window rather than flashing seed subscriptions - or, worse,
 * an empty state or a "not found" that contradicts what's about to appear.
 */
const HydrationGate = () => (
    <View className="hydration-gate">
        <ActivityIndicator color={colors.accent} />
    </View>
);

export default HydrationGate;
