import { Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { icons } from '@/constants/icons';
import { spacing } from '@/constants/theme';

interface AddSubscriptionButtonProps {
    onPress: () => void;
}

/** Avatar row height on Home; the title row on Subscriptions matches it. */
const HEADER_ROW_HEIGHT = spacing[16];
const BUTTON_SIZE = spacing[12];

/**
 * Holds its screen position while the list scrolls underneath, landing across
 * from the user's name on Home and the title on Subscriptions.
 *
 * The insets have to be added manually. `SafeAreaView` pads its normal-flow
 * children but not absolutely positioned ones, so `top: 0` put this behind the
 * status bar while the name row sat correctly below it. Screen evidence, not a
 * guess - the first attempt shipped exactly that bug.
 */
const AddSubscriptionButton = ({ onPress }: AddSubscriptionButtonProps) => {
    const insets = useSafeAreaInsets();

    return (
        <Pressable
            className="add-button"
            style={{
                // Centred on the header row rather than aligned to its top edge.
                top: insets.top + spacing[5] + (HEADER_ROW_HEIGHT - BUTTON_SIZE) / 2,
                right: spacing[5],
            }}
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
};

export default AddSubscriptionButton;
