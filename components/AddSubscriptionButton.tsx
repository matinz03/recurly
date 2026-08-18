import { Image, Pressable } from 'react-native';
import { icons } from '@/constants/icons';

interface AddSubscriptionButtonProps {
    onPress: () => void;
}

/**
 * Sits at the top right, where the add control originally lived, but pinned to
 * the viewport rather than scrolling away inside a list header.
 *
 * Positioned absolutely against the screen's padded content box, so both
 * screens place it identically: over the header row on Home, over the title
 * row on Subscriptions.
 */
const AddSubscriptionButton = ({ onPress }: AddSubscriptionButtonProps) => (
    <Pressable
        className="add-button"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Add subscription"
    >
        {/* The Pressable's own accessibilityLabel already says "Add
            subscription" - without this the plain-icon Image would also
            be announced as a second, unlabeled image. */}
        <Image
            source={icons.add}
            className="add-button-glyph"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        />
    </Pressable>
);

export default AddSubscriptionButton;
