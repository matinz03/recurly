import { View, Text, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, Animated, PanResponder, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import dayjs, { type Dayjs } from 'dayjs';
import { icons } from '@/constants/icons';
import { CATEGORIES, CATEGORY_COLORS, isCategory, type Category } from '@/constants/categories';
import { usePreferencesStore } from '@/lib/preferencesStore';
import { useThemeColors } from '@/constants/theme';
import { posthog } from '@/lib/posthog';
import { containsCardNumber, findDuplicateSubscriptionByName, nextRenewalDate, resolveSubscriptionCurrency } from '@/lib/utils';
import { matchSubscriptionIcon } from '@/lib/matchSubscriptionIcon';
import SubscriptionIcon from '@/components/SubscriptionIcon';

interface CreateSubscriptionModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (subscription: Subscription) => void;
    /** When set, the form edits this subscription instead of creating one. */
    subscription?: Subscription | null;
    /** Used only to warn on a likely-duplicate name; optional so the modal
        still works if a caller hasn't wired the current list through yet. */
    existingSubscriptions?: Subscription[];
}

type Frequency = 'Monthly' | 'Yearly';

/** Matches the shape paymentMethod is stored in, e.g. "Visa ending in 8530". */
const PAYMENT_METHOD = /^(.*?) ending in (\d{4})$/;


// Plain decimal only: digits with at most one decimal point.
const DECIMAL_PRICE = /^\d*\.?\d+$/;

const FREQUENCIES: Frequency[] = ['Monthly', 'Yearly'];

// Fixed pastels, not theme tokens - these are data (a category identifier
// that gets persisted on the subscription and rendered as a card
// background), not the app's palette, so they deliberately don't adapt to
// dark mode. They stay light in both themes, and SubscriptionCard/[id].tsx
// paint the ink on top of them with the static light-theme colors for the
// same reason - see docs/DECISIONS.md.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CreateSubscriptionModal = ({ visible, onClose, onSubmit, subscription, existingSubscriptions }: CreateSubscriptionModalProps) => {
    const colors = useThemeColors();
    const isEditing = !!subscription;
    // One base currency for the whole app, chosen in Settings - amounts are
    // entered and stored in it rather than each subscription carrying its own.
    const baseCurrency = usePreferencesStore((state) => state.baseCurrency);

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [frequency, setFrequency] = useState<Frequency>('Monthly');
    const [category, setCategory] = useState<Category>('Other');
    const [cardLabel, setCardLabel] = useState('');
    const [cardLast4, setCardLast4] = useState('');
    const [startDate, setStartDate] = useState<Dayjs>(() => dayjs());
    const [showIosDatePicker, setShowIosDatePicker] = useState(false);

    // Load the edited subscription into the form when the sheet opens. Keyed on
    // visible as well so reopening the same row discards any half-made edits.
    useEffect(() => {
        if (!visible) return;
        if (subscription) {
            setName(subscription.name);
            setPrice(String(subscription.price));
            setFrequency(subscription.billing?.toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly');
            setCategory(isCategory(subscription.category) ? subscription.category : 'Other');
            // Stored as a single string ("Visa ending in 8530"). Split it back
            // apart when it matches; otherwise treat the whole thing as the
            // label so an imported value isn't silently dropped on save.
            const parsed = PAYMENT_METHOD.exec(subscription.paymentMethod?.trim() ?? '');
            setCardLabel(parsed ? parsed[1] : subscription.paymentMethod?.trim() ?? '');
            setCardLast4(parsed ? parsed[2] : '');
            setStartDate(subscription.startDate ? dayjs(subscription.startDate) : dayjs());
        }
        setShowIosDatePicker(false);
    }, [visible, subscription]);

    // Number() alone would accept exponential and hex literals, turning a
    // pasted "1e5" into a $100,000 subscription - so check the shape first.
    const isValidPrice = () => {
        const trimmedPrice = price.trim();
        if (!DECIMAL_PRICE.test(trimmedPrice)) return false;
        const numValue = Number(trimmedPrice);
        return Number.isFinite(numValue) && numValue > 0;
    };

    const cardLabelRejected = containsCardNumber(cardLabel);
    const isValidForm = name.trim() !== '' && isValidPrice() && !cardLabelRejected;

    const matchedIcon = useMemo(() => matchSubscriptionIcon(name), [name]);

    // Excludes the record being edited by id, not by name - otherwise editing
    // "Netflix" without renaming it would always "find" itself as a duplicate.
    // This only ever warns; a second Netflix plan is a legitimate thing to
    // create, so it never blocks submit.
    const duplicateSubscription = useMemo(
        () => findDuplicateSubscriptionByName(name, existingSubscriptions ?? [], subscription?.id),
        [name, existingSubscriptions, subscription?.id]
    );

    const resetForm = () => {
        setName('');
        setPrice('');
        setFrequency('Monthly');
        setCategory('Other');
        setCardLabel('');
        setCardLast4('');
        setStartDate(dayjs());
        // Otherwise an iOS calendar left open is still expanded on reopen.
        setShowIosDatePicker(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Drag-to-dismiss for the handle/header area. Only claims the gesture once
    // there's clear downward intent, so a plain tap on the close button still
    // reaches it untouched.
    const dragY = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(
        PanResponder.create({
            // Claiming on touch-down is what makes this work at all. The sheet
            // container is a Pressable, so it claimed the responder on start
            // and the move negotiation below was never reached - the drag could
            // never begin. This view is deeper than that container so it wins
            // the start negotiation, while the close button (deeper still) keeps
            // its own taps.
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_event, gestureState) =>
                gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
            // Don't hand the gesture to the ScrollView mid-drag.
            onPanResponderTerminationRequest: () => false,
            onPanResponderMove: (_event, gestureState) => {
                if (gestureState.dy > 0) dragY.setValue(gestureState.dy);
            },
            onPanResponderRelease: (_event, gestureState) => {
                if (gestureState.dy > 120 || gestureState.vy > 1.2) {
                    dragY.setValue(0);
                    handleClose();
                } else {
                    Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowIosDatePicker(false);
        if (selectedDate) setStartDate(dayjs(selectedDate));
    };

    const handleStartDatePress = () => {
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                value: startDate.toDate(),
                mode: 'date',
                display: 'calendar',
                onChange: handleDateChange,
            });
        } else {
            setShowIosDatePicker(true);
        }
    };

    const handleSubmit = () => {
        if (!isValidForm) return;

        const trimmedName = name.trim();
        const priceValue = Number(price.trim());
        // Only recompute when the anchor actually moved. A stored renewalDate
        // isn't necessarily derived from startDate (the seeded records aren't),
        // so recomputing on an unrelated edit - a rename, say - would silently
        // shift the next renewal, and with it the scheduled reminder.
        const anchorUnchanged =
            isEditing &&
            subscription.billing === frequency &&
            !!subscription.startDate &&
            // By day, not by millisecond: only a calendar day is selectable,
            // and reselecting the same day carries a different time-of-day,
            // which would defeat the very guard this is.
            dayjs(subscription.startDate).isSame(startDate, 'day') &&
            !!subscription.renewalDate;

        const firstRenewal = startDate.add(1, frequency === 'Monthly' ? 'month' : 'year');
        const renewalDate = anchorUnchanged
            ? dayjs(subscription.renewalDate)
            : nextRenewalDate(firstRenewal.toISOString(), frequency) ?? firstRenewal;

        // Keep the existing artwork when editing without renaming, so a manual
        // icon isn't lost to a name that no longer matches anything.
        const icon = matchedIcon ?? (isEditing && trimmedName === subscription.name ? subscription.icon : icons.plus);

        // Only a label and the last four digits are ever collected - never a
        // full card number. That's all this needs to identify which card pays
        // for what, and storing more would make this a payment-data problem.
        const trimmedCard = cardLabel.trim();
        const paymentMethod = trimmedCard
            ? cardLast4.length === 4
                ? `${trimmedCard} ending in ${cardLast4}`
                : trimmedCard
            : undefined;

        onSubmit({
            ...(subscription ?? {}),
            paymentMethod,
            id: subscription?.id ?? `sub-${Date.now()}`,
            icon,
            name: trimmedName,
            category,
            status: subscription?.status ?? 'active',
            startDate: startDate.toISOString(),
            price: priceValue,
            currency: resolveSubscriptionCurrency(subscription?.currency, baseCurrency),
            billing: frequency,
            renewalDate: renewalDate.toISOString(),
            color: CATEGORY_COLORS[category],
        });

        posthog?.capture(isEditing ? 'subscription_updated' : 'subscription_created', {
            subscription_name: trimmedName,
            subscription_price: priceValue,
            subscription_frequency: frequency,
            subscription_category: category,
        });

        resetForm();
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <Pressable className="modal-overlay" onPress={handleClose}>
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    <AnimatedPressable
                        className="modal-container"
                        style={{ transform: [{ translateY: dragY }] }}
                        onPress={(event) => event.stopPropagation()}
                    >
                        <View {...panResponder.panHandlers}>
                            <View className="modal-handle-row">
                                <View className="modal-handle" />
                            </View>
                            <View className="modal-header">
                                <Text className="modal-title">{isEditing ? 'Edit Subscription' : 'New Subscription'}</Text>
                                <Pressable
                                    className="modal-close"
                                    onPress={handleClose}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close"
                                    // `.modal-close` is a fixed 32pt circle - under the 44pt
                                    // minimum. Growing the chip would crowd the header next to
                                    // the title, so extend the tap target instead.
                                    hitSlop={6}
                                >
                                    <Text className="modal-close-text">✕</Text>
                                </Pressable>
                            </View>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerClassName="modal-body"
                        >
                            <View className="auth-field">
                                <View className="flex-row items-center justify-between">
                                    <Text className="auth-label">Name</Text>
                                    {matchedIcon && (
                                        <SubscriptionIcon icon={matchedIcon} className="name-match-icon" svgSize={16} />
                                    )}
                                </View>
                                <TextInput
                                    className="auth-input"
                                    placeholder="Subscription name"
                                    placeholderTextColor={colors.placeholder}
                                    value={name}
                                    onChangeText={setName}
                                />
                                {duplicateSubscription && (
                                    <Text className="auth-warning">
                                        You already have a subscription named &quot;{duplicateSubscription.name}&quot;. This will be tracked as a separate one.
                                    </Text>
                                )}
                            </View>

                            <View className="auth-field">
                                <Text className="auth-label">Price</Text>
                                <TextInput
                                    className="auth-input"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.placeholder}
                                    value={price}
                                    onChangeText={setPrice}
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            <View className="auth-field">
                                <Text className="auth-label">Frequency</Text>
                                <View className="picker-row" accessibilityRole="radiogroup">
                                    {FREQUENCIES.map((option) => (
                                        <Pressable
                                            key={option}
                                            className={clsx('picker-option', frequency === option && 'picker-option-active')}
                                            onPress={() => setFrequency(option)}
                                            accessibilityRole="radio"
                                            accessibilityLabel={option}
                                            accessibilityState={{ selected: frequency === option }}
                                        >
                                            <Text className={clsx('picker-option-text', frequency === option && 'picker-option-text-active')}>
                                                {option}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View className="auth-field">
                                <Text className="auth-label">Paid with</Text>
                                <TextInput
                                    className="auth-input"
                                    placeholder="Card name, e.g. Visa or Personal Amex"
                                    placeholderTextColor={colors.placeholder}
                                    value={cardLabel}
                                    onChangeText={setCardLabel}
                                />
                                {/* Says what to do instead, rather than only
                                    greying out Save with no explanation. */}
                                {cardLabelRejected && (
                                    <Text className="auth-warning">
                                        Remove the card number - name the card instead, and put its last four digits below.
                                    </Text>
                                )}
                                {/* Last four only - enough to tell cards apart,
                                    without holding card numbers. */}
                                <TextInput
                                    className="auth-input"
                                    placeholder="Last 4 digits (optional)"
                                    placeholderTextColor={colors.placeholder}
                                    value={cardLast4}
                                    onChangeText={(text) => setCardLast4(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                />
                            </View>

                            <View className="auth-field">
                                <Text className="auth-label">Start Date</Text>
                                <Pressable
                                    className="auth-input flex-row items-center justify-between"
                                    onPress={handleStartDatePress}
                                    accessibilityLabel="Choose start date"
                                >
                                    <Text className="text-base font-sans-medium text-primary">
                                        {startDate.format('MM/DD/YYYY')}
                                    </Text>
                                    <Feather name="calendar" size={18} color={colors.mutedForeground} />
                                    {/* colors here is useThemeColors()'s reactive palette, not the
                                        static export - this icon sits on `.auth-input`'s themed
                                        bg-background, so it should follow the app theme. */}
                                </Pressable>
                                {Platform.OS === 'ios' && showIosDatePicker && (
                                    <DateTimePicker
                                        value={startDate.toDate()}
                                        mode="date"
                                        display="inline"
                                        onChange={handleDateChange}
                                    />
                                )}
                            </View>

                            <View className="auth-field">
                                <Text className="auth-label">Category</Text>
                                <View className="category-scroll" accessibilityRole="radiogroup">
                                    {CATEGORIES.map((cat) => (
                                        <Pressable
                                            key={cat}
                                            className={clsx('category-chip', category === cat && 'category-chip-active')}
                                            onPress={() => setCategory(cat)}
                                            accessibilityRole="radio"
                                            accessibilityLabel={cat}
                                            accessibilityState={{ selected: category === cat }}
                                            // `.category-chip` is ~36pt tall (px-4 py-2 around
                                            // text-sm) - under the 44pt minimum. The chips sit in a
                                            // flex-wrap row with an 8px gap, so 4pt of hitSlop per
                                            // side extends the tap target right up to (not past)
                                            // the neighbouring chip's own hitSlop.
                                            hitSlop={{ top: 4, bottom: 4 }}
                                        >
                                            <Text className={clsx('category-chip-text', category === cat && 'category-chip-text-active')}>
                                                {cat}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <Pressable
                                className={clsx('auth-button', !isValidForm && 'auth-button-disabled')}
                                onPress={handleSubmit}
                                disabled={!isValidForm}
                            >
                                <Text className="auth-button-text">{isEditing ? 'Save Changes' : 'Create Subscription'}</Text>
                            </Pressable>
                        </ScrollView>
                    </AnimatedPressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default CreateSubscriptionModal;
