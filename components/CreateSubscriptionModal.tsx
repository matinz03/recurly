import { View, Text, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, Animated, PanResponder, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import dayjs, { type Dayjs } from 'dayjs';
import { icons } from '@/constants/icons';
import { colors } from '@/constants/theme';
import { posthog } from '@/lib/posthog';
import { matchSubscriptionIcon } from '@/lib/matchSubscriptionIcon';
import SubscriptionIcon from '@/components/SubscriptionIcon';

interface CreateSubscriptionModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (subscription: Subscription) => void;
}

type Frequency = 'Monthly' | 'Yearly';
type Category = 'Entertainment' | 'AI Tools' | 'Developer Tools' | 'Design' | 'Productivity' | 'Other';

const FREQUENCIES: Frequency[] = ['Monthly', 'Yearly'];
const CATEGORIES: Category[] = ['Entertainment', 'AI Tools', 'Developer Tools', 'Design', 'Productivity', 'Other'];

const CATEGORY_COLORS: Record<Category, string> = {
    Entertainment: '#ff6b6b',
    'AI Tools': '#b8d4e3',
    'Developer Tools': '#e8def8',
    Design: '#f5c542',
    Productivity: '#95e1d3',
    Other: '#d4d4d4',
};

// The chosen start date can be in the past, so the first renewal is the first
// occurrence of the billing period that lands after today - not just "start + 1".
const computeNextRenewalDate = (start: Dayjs, frequency: Frequency) => {
    const unit = frequency === 'Monthly' ? 'month' : 'year';
    const now = dayjs();
    let renewal = start.add(1, unit);
    while (renewal.isBefore(now)) {
        renewal = renewal.add(1, unit);
    }
    return renewal;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CreateSubscriptionModal = ({ visible, onClose, onSubmit }: CreateSubscriptionModalProps) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [frequency, setFrequency] = useState<Frequency>('Monthly');
    const [category, setCategory] = useState<Category>('Other');
    const [startDate, setStartDate] = useState<Dayjs>(() => dayjs());
    const [showIosDatePicker, setShowIosDatePicker] = useState(false);

    // The sheet should hug its content, but cap around 85% of the screen and
    // scroll beyond that (e.g. once the iOS inline calendar expands it). A
    // flex-1 ScrollView can't do this on its own - its container's height
    // would depend on it while it depends on the container - so the actual
    // cap is computed from measured header/content heights instead.
    const { height: windowHeight } = useWindowDimensions();
    const [headerHeight, setHeaderHeight] = useState(0);
    const [formHeight, setFormHeight] = useState(0);
    const maxSheetHeight = windowHeight * 0.85;
    const availableFormHeight = maxSheetHeight - headerHeight;
    const scrollViewHeight =
        headerHeight > 0 && formHeight > availableFormHeight ? availableFormHeight : undefined;

    const isValidPrice = () => {
        const trimmedPrice = price.trim();
        if (!trimmedPrice) return false;
        const numValue = Number(trimmedPrice);
        return Number.isFinite(numValue) && numValue > 0;
    };

    const isValidForm = name.trim() !== '' && isValidPrice();

    const matchedIcon = useMemo(() => matchSubscriptionIcon(name), [name]);

    const resetForm = () => {
        setName('');
        setPrice('');
        setFrequency('Monthly');
        setCategory('Other');
        setStartDate(dayjs());
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

        const priceValue = Number(price.trim());
        const renewalDate = computeNextRenewalDate(startDate, frequency);

        onSubmit({
            id: `sub-${Date.now()}`,
            icon: matchedIcon ?? icons.plus,
            name: name.trim(),
            category,
            status: 'active',
            startDate: startDate.toISOString(),
            price: priceValue,
            currency: 'USD',
            billing: frequency,
            renewalDate: renewalDate.toISOString(),
            color: CATEGORY_COLORS[category],
        });

        posthog?.capture('subscription_created', {
            subscription_name: name.trim(),
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
                        <View
                            onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
                            {...panResponder.panHandlers}
                        >
                            <View className="modal-handle-row">
                                <View className="modal-handle" />
                            </View>
                            <View className="modal-header">
                                <Text className="modal-title">New Subscription</Text>
                                <Pressable className="modal-close" onPress={handleClose} accessibilityLabel="Close">
                                    <Text className="modal-close-text">✕</Text>
                                </Pressable>
                            </View>
                        </View>

                        <ScrollView
                            style={scrollViewHeight !== undefined ? { height: scrollViewHeight } : undefined}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View
                                className="modal-body"
                                onLayout={(event) => setFormHeight(event.nativeEvent.layout.height)}
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
                                        placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>

                                <View className="auth-field">
                                    <Text className="auth-label">Price</Text>
                                    <TextInput
                                        className="auth-input"
                                        placeholder="0.00"
                                        placeholderTextColor="rgba(0, 0, 0, 0.4)"
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
                                    <Text className="auth-button-text">Create Subscription</Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </AnimatedPressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default CreateSubscriptionModal;
