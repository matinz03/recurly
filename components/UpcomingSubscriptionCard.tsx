import {View, Text} from 'react-native'
import React from 'react'
import {formatCurrency} from "@/lib/utils";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import Money from "@/components/Money";

const UpcomingSubscriptionCard = ({ name, price, daysLeft, icon, currency }: UpcomingSubscriptionCardProps) => {
    // Short enough for a 176px card. "Renews tomorrow" overran the boundary;
    // the fuller wording is kept for the screen reader below, where length
    // costs nothing.
    const renewalText = daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days left`;
    const renewalLabel = daysLeft === 0 ? 'Renews today' : daysLeft === 1 ? 'Renews tomorrow' : `Renews in ${daysLeft} days`;

    return (
        <View
            className="upcoming-card"
            // Same fix as SubscriptionCard's head row: groups the logo/price/
            // cadence/name into one item instead of four disconnected
            // fragments. Safe to group the whole card here (unlike
            // SubscriptionCard) because it has no nested touchables to
            // swallow - this card isn't itself interactive.
            accessible
            accessibilityLabel={`${name}, ${formatCurrency(price, currency)}, ${renewalLabel}`}
        >
            <View className="upcoming-row">
                <SubscriptionIcon icon={icon} className="upcoming-icon" svgSize={32} />
                <View className="min-w-0 flex-1">
                    <Money value={price} currency={currency} className="upcoming-price" />
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
