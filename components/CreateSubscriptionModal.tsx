import { View, Text, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, Animated, PanResponder, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import dayjs, { type Dayjs } from 'dayjs';
import { icons } from '@/constants/icons';
import { useThemeColors } from '@/constants/theme';
import { posthog } from '@/lib/posthog';
import { findDuplicateSubscriptionByName, nextRenewalDate } from '@/lib/utils';
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
type Category = 'Entertainment' | 'AI Tools' | 'Developer Tools' | 'Design' | 'Productivity' | 'Other';
type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'JPY';

// Plain decimal only: digits with at most one decimal point.
const DECIMAL_PRICE = /^\d*\.?\d+$/;

const FREQUENCIES: Frequency[] = ['Monthly', 'Yearly'];
const CATEGORIES: Category[] = ['Entertainment', 'AI Tools', 'Developer Tools', 'Design', 'Productivity', 'Other'];
const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'JPY'];

// Fixed pastels, not theme tokens - these are data (a category identifier
// that gets persisted on the subscription and rendered as a card
// background), not the app's palette, so they deliberately don't adapt to
// dark mode. They stay light in both themes, and SubscriptionCard/[id].tsx
// paint the ink on top of them with the static light-theme colors for the
// same reason - see docs/DECISIONS.md.
const CATEGORY_COLORS: Record<Category, string> = {
    Entertainment: '#ff6b6b',
    'AI Tools': '#b8d4e3',
    'Developer Tools': '#e8def8',
    Design: '#f5c542',
    Productivity: '#95e1d3',
    Other: '#d4d4d4',
};

const isCategory = (value?: string): value is Category =>
    !!value && (CATEGORIES as string[]).includes(value);

const isCurrency = (value?: string): value is Currency =>
    !!value && (CURRENCIES as string[]).includes(value);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CreateSubscriptionModal = ({ visible, onClose, onSubmit, subscription, existingSubscriptions }: CreateSubscriptionModalProps) => {
    const colors = useThemeColors();
    const isEditing = !!subscription;

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [frequency, setFrequency] = useState<Frequency>('Monthly');
    const [currency, setCurrency] = useState<Currency>('USD');
    const [category, setCategory] = useState<Category>('Other');
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
            // Preserve the existing currency rather than resetting to USD, so
            // editing a non-USD subscription can't silently change its currency.
            setCurrency(isCurrency(subscription.currency) ? subscription.currency : 'USD');
            setCategory(isCategory(subscription.category) ? subscription.category : 'Other');
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

    const isValidForm = name.trim() !== '' && isValidPrice();

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
        setCurrency('USD');
        setCategory('Other');
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
            onMoveShouldSetPanResponder: (_event, gestureState) =>
                gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
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
        // The start date can be backdated, so the first renewal is one billing
        // period after it, rolled forward until it lands in the future.
        const firstRenewal = startDate.add(1, frequency === 'Monthly' ? 'month' : 'year');
        const renewalDate = nextRenewalDate(firstRenewal.toISOString(), frequency) ?? firstRenewal;

        // Keep the existing artwork when editing without renaming, so a manual
        // icon isn't lost to a name that no longer matches anything.
        const icon = matchedIcon ?? (isEditing && trimmedName === subscription.name ? subscription.icon : icons.plus);

        onSubmit({
            ...(subscription ?? {}),
            id: subscription?.id ?? `sub-${Date.now()}`,
            icon,
            name: trimmedName,
            category,
            status: subscription?.status ?? 'active',
            startDate: startDate.toISOString(),
            price: priceValue,
            currency,
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
                                <Pressable className="modal-close" onPress={handleClose} accessibilityLabel="Close">
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
                                        <SubscriptionIcon icon={matchedIcon} className="size-7 rounded-md bg-background" svgSize={16} />
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
                                <View className="picker-row">
                                    {FREQUENCIES.map((option) => (
                                        <Pressable
                                            key={option}
                                            className={clsx('picker-option', frequency === option && 'picker-option-active')}
                                            onPress={() => setFrequency(option)}
                                        >
                                            <Text className={clsx('picker-option-text', frequency === option && 'picker-option-text-active')}>
                                                {option}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View className="auth-field">
                                <Text className="auth-label">Currency</Text>
                                <View className="picker-row">
                                    {CURRENCIES.map((option) => (
                                        <Pressable
                                            key={option}
                                            className={clsx('picker-option', currency === option && 'picker-option-active')}
                                            onPress={() => setCurrency(option)}
                                        >
                                            <Text className={clsx('picker-option-text', currency === option && 'picker-option-text-active')}>
                                                {option}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
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
                                <View className="category-scroll">
                                    {CATEGORIES.map((cat) => (
                                        <Pressable
                                            key={cat}
                                            className={clsx('category-chip', category === cat && 'category-chip-active')}
                                            onPress={() => setCategory(cat)}
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
