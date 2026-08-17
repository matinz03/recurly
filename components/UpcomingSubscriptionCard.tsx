import {View, Text} from 'react-native'
import React from 'react'
import {formatCurrency} from "@/lib/utils";
import SubscriptionIcon from "@/components/SubscriptionIcon";

const UpcomingSubscriptionCard = ({ name, price, daysLeft, icon, currency }: UpcomingSubscriptionCardProps) => {
    return (
        <View className="upcoming-card">
            <View className="upcoming-row">
                <SubscriptionIcon icon={icon} className="upcoming-icon" svgSize={32} />
                <View>
                    <Text className="upcoming-price">{formatCurrency(price, currency)}</Text>
                    <Text className="upcoming-meta" numberOfLines={1}>
                        {daysLeft === 0 ? 'Renews today' : daysLeft === 1 ? 'Renews tomorrow' : `${daysLeft} days left`}
                    </Text>
                </View>
            </View>

            <Text className="upcoming-name" numberOfLines={1}>{name}</Text>
        </View>
    )
}
export default UpcomingSubscriptionCard
