import { Image, Pressable } from 'react-native';
import { icons } from '@/constants/icons';

interface AddSubscriptionButtonProps {
    onPress: () => void;
}

/**
 * Rendered inline, at the end of a screen's header row, so it sits across from
 * the user's name on Home and the title on Subscriptions.
 *
 * It is NOT absolutely positioned. Anchoring it to the top of the screen put it
 * in the status bar: `edgeToEdgeEnabled` is on, so the window extends behind
 * the system bars and there is no inset to position against. Keeping it inline
 * and lifting the whole header row out of the scrolling list is what makes it
 * both aligned and fixed.
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
