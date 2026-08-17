import { Image, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { icons } from '@/constants/icons';
import { useThemeColors } from '@/constants/theme';

interface EmptySubscriptionsProps {
    /** Optional so this still renders sensibly on a screen that hasn't wired
        up an add action - the callers live outside this task's scope. */
    onAddPress?: () => void;
}

/**
 * First-run placeholder for a genuinely empty store (see
 * lib/subscriptionStore.ts - it persists now, so "no subscriptions" is a real
 * state a brand-new account lands in, not just a loading flash). Explains
 * what the screen is for and points at the way to add the first one, instead
 * of the bare "No subscriptions yet" that left no path forward.
 */
const EmptySubscriptions = ({ onAddPress }: EmptySubscriptionsProps) => {
    const colors = useThemeColors();
    return (
        <View className="empty-subs">
            <View className="empty-subs-icon-wrap">
                <Image source={icons.wallet} className="empty-subs-icon" />
            </View>

            <Text className="empty-subs-title">No subscriptions yet</Text>
            <Text className="empty-subs-copy">
                Add what you pay for and Recurly will track renewals and monthly spend for you.
            </Text>

            {onAddPress && (
                <Pressable
                    className="empty-subs-button"
                    onPress={onAddPress}
                    accessibilityRole="button"
                    accessibilityLabel="Add your first subscription"
                >
                    <Feather name="plus" size={18} color={colors.primary} />
                    <Text className="empty-subs-button-text">Add a subscription</Text>
                </Pressable>
            )}
        </View>
    );
};

export default EmptySubscriptions;
