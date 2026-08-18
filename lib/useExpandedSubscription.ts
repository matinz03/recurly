import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { posthog } from '@/lib/posthog';
import { impactExpand } from '@/lib/haptics';

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
    const collapse = useCallback(() => {
        expandedIdRef.current = null;
        setExpandedId(null);
    }, []);

    const toggleExpanded = useCallback((id: string) => {
        const expanded = expandedIdRef.current !== id;
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
