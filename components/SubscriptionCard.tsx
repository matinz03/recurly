import {View, Text, Pressable} from 'react-native'
import React from 'react'
import {formatCurrency, formatStatusLabel, formatSubscriptionDateTime} from "@/lib/utils";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import clsx from "clsx";

const SubscriptionCard = ({ name, price, currency, icon, billing, color, category, plan, renewalDate, expanded, onPress, onEditPress, onCancelPress, paymentMethod, startDate, status}: SubscriptionCardProps) => {
    const isCancelled = status?.toLowerCase() === 'cancelled';

    return (
        <Pressable onPress={onPress} className={clsx('sub-card', expanded ? 'sub-card-expanded' : 'bg-card')} style={!expanded && color ? { backgroundColor: color } : undefined}>
            <View className="sub-head">
                <View className="sub-main">
                    <SubscriptionIcon icon={icon} className="sub-icon" />
                    <View className="sub-copy">
                        <Text numberOfLines={1} className="sub-title">
                            {name}
                        </Text>
                        <Text numberOfLines={1} ellipsizeMode="tail" className="sub-meta">
                            {category?.trim() || plan?.trim() || (renewalDate ? formatSubscriptionDateTime(renewalDate) : '')}
                        </Text>
                    </View>
                </View>

                <View className="sub-price-box">
                    <Text className="sub-price">{formatCurrency(price, currency)}</Text>
                    <Text className="sub-billing">{billing}</Text>
                </View>
            </View>

            {expanded && (
                <View className="sub-body">
                    <View className="sub-details">
                        <View className="sub-row">
                            <View className="sub-row-copy">
                                <Text className="sub-label">Payment:</Text>
                                <Text className="sub-value" numberOfLines={1} ellipsizeMode="tail">{paymentMethod?.trim() || 'Not provided'}</Text>
                            </View>
                        </View>
                        <View className="sub-row">
                            <View className="sub-row-copy">
                                <Text className="sub-label">Category:</Text>
                                <Text className="sub-value" numberOfLines={1} ellipsizeMode="tail">{category?.trim() || plan?.trim() || 'Not provided'}</Text>
                            </View>
                        </View>
                        <View className="sub-row">
                            <View className="sub-row-copy">
                                <Text className="sub-label">Started:</Text>
                                <Text className="sub-value" numberOfLines={1} ellipsizeMode="tail">{startDate ? formatSubscriptionDateTime(startDate) : 'Not provided'}</Text>
                            </View>
                        </View>
                        <View className="sub-row">
                            <View className="sub-row-copy">
                                <Text className="sub-label">Renewal date:</Text>
                                <Text className="sub-value" numberOfLines={1} ellipsizeMode="tail">{renewalDate ? formatSubscriptionDateTime(renewalDate) : 'Not provided'}</Text>
                            </View>
                        </View>
                        <View className="sub-row">
                            <View className="sub-row-copy">
                                <Text className="sub-label">Status:</Text>
                                <Text className="sub-value" numberOfLines={1} ellipsizeMode="tail">{status ? formatStatusLabel(status) : 'Not provided'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Only rendered where handlers are wired up, so the Home
                        list stays read-only. */}
                    {(onEditPress || onCancelPress) && (
                        <View className="sub-actions">
                            {onEditPress && (
                                <Pressable className="sub-action" onPress={onEditPress} accessibilityLabel={`Edit ${name}`}>
                                    <Text className="sub-action-text">Edit</Text>
                                </Pressable>
                            )}
                            {onCancelPress && (
                                <Pressable
                                    className={clsx('sub-cancel flex-1', isCancelled && 'sub-cancel-disabled')}
                                    onPress={onCancelPress}
                                    disabled={isCancelled}
                                    accessibilityLabel={`Cancel ${name}`}
                                    accessibilityState={{ disabled: isCancelled }}
                                >
                                    <Text className="sub-cancel-text">{isCancelled ? 'Cancelled' : 'Cancel'}</Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>
            )}
        </Pressable>
    )
}
export default SubscriptionCard
