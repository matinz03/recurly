import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { SvgXml } from 'react-native-svg';
import clsx from 'clsx';

interface SubscriptionIconProps {
    icon: ImageSourcePropType | string;
    className?: string;
    svgSize?: number;
}

const SubscriptionIcon = ({ icon, className, svgSize = 36 }: SubscriptionIconProps) => {
    return (
        <View className={clsx('items-center justify-center', className)}>
            {typeof icon === 'string' ? (
                <SvgXml xml={icon} width={svgSize} height={svgSize} />
            ) : (
                <Image source={icon} className="h-full w-full rounded-lg" />
            )}
        </View>
    );
};

export default SubscriptionIcon;
