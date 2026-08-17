import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { clsx } from 'clsx';

interface SubscriptionIconProps {
    icon: ImageSourcePropType | string;
    className?: string;
    svgSize?: number;
}

const SubscriptionIcon = ({ icon, className, svgSize = 36 }: SubscriptionIconProps) => {
    return (
        <View
            className={clsx('items-center justify-center', className)}
            // Always a brand logo sitting next to a name Text a screen reader
            // already announces - every call site is decorative. Hiding it
            // here, once, covers every usage instead of relying on whichever
            // parent happens to already be an accessible-grouped button (not
            // all of them are, e.g. the Upcoming carousel and the detail hero
            // are plain Views, so without this the logo would be announced
            // as a bare, unlabeled image).
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            {typeof icon === 'string' ? (
                <SvgXml xml={icon} width={svgSize} height={svgSize} />
            ) : (
                <Image source={icon} className="h-full w-full rounded-lg" />
            )}
        </View>
    );
};

export default SubscriptionIcon;
