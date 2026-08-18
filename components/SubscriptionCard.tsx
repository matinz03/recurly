import {View, Text, Pressable} from 'react-native'
import React from 'react'
import {Feather} from '@expo/vector-icons'
import {formatCurrency, formatStatusLabel, formatSubscriptionDateTime} from "@/lib/utils";
import SubscriptionIcon from "@/components/SubscriptionIcon";
import Money from "@/components/Money";
import {colors, useThemeColors} from "@/constants/theme";
import { clsx } from "clsx";

const SubscriptionCard = ({ name, price, currency, icon, billing, color, category, plan, renewalDate, expanded, onPress, onEditPress, onCancelPress, onDeletePress, onPauseResumePress, paymentMethod, startDate, status}: SubscriptionCardProps) => {
    const themeColors = useThemeColors();
    const normalizedStatus = status?.toLowerCase();
    const isCancelled = normalizedStatus === 'cancelled';
    const isPaused = normalizedStatus === 'paused';
    // Pausing/resuming a cancelled plan isn't offered - "resume" would mean
    // reactivating it, which is a different action than this one performs.
    const showPauseResume = !!onPauseResumePress && !isCancelled;

    // `color` is the fixed category pastel (CATEGORY_COLORS), not theme - it
    // stays light in both modes (see docs/DECISIONS.md), so text painted
    // directly on it uses the static light ink (`colors`, not
    // `useThemeColors()`) rather than the app's dark-mode ink, or it would
    // vanish against a light pastel once the app's ink flips light.
    const onFixedColor = !expanded && !!color;
    const fixedInkStyle = onFixedColor ? { color: colors.primary } : undefined;
    const fixedMutedStyle = onFixedColor ? { color: colors.mutedForeground } : undefined;

    const metaText = category?.trim() || plan?.trim() || (renewalDate ? formatSubscriptionDateTime(renewalDate) : '');

    // Composed once so the head row reads as one item (name, price, cadence,
    // meta) instead of four disconnected fragments - see the accessible
    // wrapper below.
    const headLabel = [name, `${formatCurrency(price, currency)}, ${billing}`, metaText]
        .filter(Boolean)
        .join(', ');

    return (
        <View className={clsx('sub-card', expanded ? 'sub-card-expanded' : 'bg-card')} style={!expanded && color ? { backgroundColor: color } : undefined}>
            {/* The expand/collapse toggle now lives on the head row alone, not
                the whole card: `accessible` on a wrapper collapses its
                descendants into one node, so putting it on the outer
                container (as before) would have swallowed the nested Edit /
                Pause / Cancel / Delete buttons below and made them
                unreachable to a screen reader. Scoping it to just the head
                also composes cleanly with `accessibilityState.expanded`,
                which announces the toggle's current state. */}
            <Pressable
                onPress={onPress}
                className="sub-head"
                // Reclaims .sub-card's 16px padding, which stopped being
                // tappable when the toggle moved off the outer container. Not
                // extended downward while expanded, or it would steal taps
                // from the top of the details block.
                hitSlop={{ top: 16, left: 16, right: 16, bottom: expanded ? 0 : 16 }}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={headLabel}
            >
                <View className="sub-main">
                    <SubscriptionIcon icon={icon} className="sub-icon" />
                    <View className="sub-copy">
                        <Text numberOfLines={1} className="sub-title" style={fixedInkStyle}>
                            {name}
                        </Text>
                        <Text numberOfLines={1} ellipsizeMode="tail" className="sub-meta" style={fixedMutedStyle}>
                            {metaText}
                        </Text>
                    </View>
                </View>

                <View className="sub-price-box">
                    <Money value={price} currency={currency} className="sub-price" style={fixedInkStyle} />
                    <Text className="sub-billing" style={fixedMutedStyle}>{billing}</Text>
                </View>
            </Pressable>

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
                        list stays read-only. Two rows, not four equal buttons:
                        Edit/Pause are routine and get equal-weight bordered
                        buttons; Cancel/Delete are status-changing, so they sit
                        below, and Delete - the only irreversible one - is a
                        small icon affordance rather than a full-width button,
                        so it never reads as more prominent than Cancel. */}
                    {(onEditPress || showPauseResume) && (
                        <View className="sub-actions">
                            {onEditPress && (
                                <Pressable className="sub-action" onPress={onEditPress} accessibilityRole="button" accessibilityLabel={`Edit ${name}`}>
                                    <Text className="sub-action-text">Edit</Text>
                                </Pressable>
                            )}
                            {showPauseResume && (
                                <Pressable
                                    className="sub-action"
                                    onPress={onPauseResumePress}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${isPaused ? 'Resume' : 'Pause'} ${name}`}
                                >
                                    <Text className="sub-action-text">{isPaused ? 'Resume' : 'Pause'}</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    {(onCancelPress || onDeletePress) && (
                        <View className="sub-actions-secondary">
                            {onCancelPress && (
                                <Pressable
                                    className={clsx('sub-cancel flex-1', isCancelled && 'sub-cancel-disabled')}
                                    onPress={onCancelPress}
                                    disabled={isCancelled}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Cancel ${name}`}
                                    accessibilityState={{ disabled: isCancelled }}
                                >
                                    {/* `sub-cancel-text` is `text-background`, which is fine on
                                        the solid `bg-primary` active fill but drops to ~3.5:1 in
                                        light mode against the disabled state's `bg-primary/35`
                                        blend (checked against the card's actual backdrop) - below
                                        AA for text. The static `colors.primary` ink (not the
                                        theme-reactive one, which goes light in dark mode and would
                                        fail the same check the other way) holds ~5:1 against that
                                        blend in both themes without touching the palette. */}
                                    <Text className="sub-cancel-text" style={isCancelled ? { color: colors.primary } : undefined}>
                                        {isCancelled ? 'Cancelled' : 'Cancel'}
                                    </Text>
                                </Pressable>
                            )}
                            {onDeletePress && (
                                <Pressable className="sub-delete" onPress={onDeletePress} accessibilityRole="button" accessibilityLabel={`Delete ${name}`}>
                                    <Feather name="trash-2" size={18} color={themeColors.destructive} />
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>
            )}
        </View>
    )
}
export default SubscriptionCard
