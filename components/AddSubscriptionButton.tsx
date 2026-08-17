import { Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { icons } from '@/constants/icons';
import { components, spacing } from '@/constants/theme';

interface AddSubscriptionButtonProps {
    onPress: () => void;
}

const { tabBar } = components;

/**
 * Pinned to the viewport rather than scrolling with the list, so it stays
 * reachable from anywhere in a long list.
 *
 * The tab bar floats at max(insets.bottom, horizontalInset) above the screen
 * edge, but this sits inside a SafeAreaView that has already padded away
 * insets.bottom - hence subtracting it back out to land just above the bar.
 */
const AddSubscriptionButton = ({ onPress }: AddSubscriptionButtonProps) => {
    const insets = useSafeAreaInsets();
    const bottom =
        Math.max(insets.bottom, tabBar.horizontalInset) - insets.bottom + tabBar.height + spacing[4];

    return (
        <Pressable
            className="fab"
            style={{ bottom }}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Add subscription"
        >
            {/* The Pressable's own accessibilityLabel already says "Add
                subscription" - without this the plain-icon Image would also
                be announced as a second, unlabeled image. */}
            <Image
                source={icons.add}
                className="fab-glyph"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
            />
        </Pressable>
    );
};

export default AddSubscriptionButton;
