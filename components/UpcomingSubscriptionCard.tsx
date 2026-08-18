import {View, Text} from 'react-native'
import React from 'react'
import {formatCurrency} from "@/lib/utils";
import SubscriptionIcon from "@/components/SubscriptionIcon";

const UpcomingSubscriptionCard = ({ name, price, daysLeft, icon, currency }: UpcomingSubscriptionCardProps) => {
    const renewalText = daysLeft === 0 ? 'Renews today' : daysLeft === 1 ? 'Renews tomorrow' : `${daysLeft} days left`;

    return (
        <View
            className="upcoming-card"
            // Same fix as SubscriptionCard's head row: groups the logo/price/
            // cadence/name into one item instead of four disconnected
            // fragments. Safe to group the whole card here (unlike
            // SubscriptionCard) because it has no nested touchables to
            // swallow - this card isn't itself interactive.
            accessible
            accessibilityLabel={`${name}, ${formatCurrency(price, currency)}, ${renewalText}`}
        >
            <View className="upcoming-row">
                <SubscriptionIcon icon={icon} className="upcoming-icon" svgSize={32} />
                <View>
                    <Text className="upcoming-price">{formatCurrency(price, currency)}</Text>
                    <Text className="upcoming-meta" numberOfLines={1}>
                        {renewalText}
                    </Text>
                </View>
            </View>

            <Text className="upcoming-name" numberOfLines={1}>{name}</Text>
        </View>
    )
}
export default UpcomingSubscriptionCard
