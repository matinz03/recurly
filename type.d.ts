import type { ImageSourcePropType } from "react-native";

declare global {
    interface AppTab {
        name: string;
        title: string;
        icon: ImageSourcePropType;
    }

    interface TabIconProps {
        focused: boolean;
        icon: ImageSourcePropType;
    }

    interface Subscription {
        id: string;
        /** Bundled asset for known icons, or raw SVG markup for icons matched at creation time. */
        icon: ImageSourcePropType | string;
        name: string;
        plan?: string;
        category?: string;
        paymentMethod?: string;
        status?: string;
        startDate?: string;
        price: number;
        currency?: string;
        billing: string;
        renewalDate?: string;
        color?: string;
    }

    interface SubscriptionCardProps extends Omit<Subscription, "id"> {
        expanded: boolean;
        onPress: () => void;
        /** Action buttons render only where a handler is supplied. */
        onEditPress?: () => void;
        onCancelPress?: () => void;
    }

    interface UpcomingSubscription {
        id: string;
        /** Same union as Subscription.icon - these are derived from real subscriptions. */
        icon: ImageSourcePropType | string;
        name: string;
        price: number;
        currency?: string;
        daysLeft: number;
    }

    interface UpcomingSubscriptionCardProps
        extends Omit<UpcomingSubscription, "id"> {}

    interface ListHeadingProps {
        title: string;
        onPress?: () => void;
    }
}

export {};
