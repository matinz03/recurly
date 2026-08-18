import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, LayoutAnimation } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { posthog } from '@/lib/posthog';
import { impactExpand } from '@/lib/haptics';

/**
 * Fades the card body in/out and animates the height change in the same
 * commit - no measuring needed. Duration and opacity-only property are
 * deliberately understated per the "finance app, not a game" brief.
 */
const EXPAND_ANIMATION = LayoutAnimation.create(
    220,
    LayoutAnimation.Types.easeInEaseOut,
    LayoutAnimation.Properties.opacity
);

/**
 * Tracks which subscription card is expanded, and collapses it when the screen
 * loses focus so a card doesn't stay open from a previous visit to the tab.
 *
 * The current id is mirrored in a ref because refs update synchronously: two
 * taps batched into one React update would both read the same stale state value
 * and compute the same "expand" decision, so the card would never collapse and
 * the toggle would be reported twice with expanded: true.
 */
export const useExpandedSubscription = () => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const expandedIdRef = useRef<string | null>(null);
    // Mirrors AccessibilityInfo's reduce-motion setting synchronously, for the
    // same reason expandedIdRef exists: toggleExpanded needs a same-tick read,
    // and isReduceMotionEnabled() only offers an async one.
    const reduceMotionRef = useRef(false);

    useEffect(() => {
        let mounted = true;
        AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
            if (mounted) reduceMotionRef.current = enabled;
        });
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
            reduceMotionRef.current = enabled;
        });
        return () => {
            mounted = false;
            subscription.remove();
        };
    }, []);

    // No animation here: this fires on focus-loss (leaving the tab), when the
    // screen itself is going away - animating a card that's about to be
    // hidden has nothing to show for it.
    const collapse = useCallback(() => {
        expandedIdRef.current = null;
        setExpandedId(null);
    }, []);

    const toggleExpanded = useCallback((id: string) => {
        const expanded = expandedIdRef.current !== id;
        if (!reduceMotionRef.current) LayoutAnimation.configureNext(EXPAND_ANIMATION);
        expandedIdRef.current = expanded ? id : null;
        setExpandedId(expandedIdRef.current);
        // Only on the way open - collapsing (or the initial focus-loss
        // collapse above) isn't a new interaction worth a buzz for.
        if (expanded) impactExpand();
        posthog?.capture('subscription_details_toggled', {
            subscription_id: id,
            expanded,
        });
    }, []);

    useFocusEffect(useCallback(() => collapse, [collapse]));

    return { expandedId, toggleExpanded };
};
