import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { clsx } from 'clsx';

interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    message: string;
    /** Verb for the action itself, e.g. "Delete" - never "OK". */
    confirmLabel: string;
    cancelLabel?: string;
    /** Renders the confirm control as destructive. */
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Replaces `Alert.alert` for confirmations.
 *
 * `Alert.alert` renders an OS dialog with no styling surface at all - it can't
 * follow the app's palette, type or corner treatment, and on Android it looks
 * like a different product. This is the same sheet vocabulary used elsewhere.
 *
 * Deliberately controlled rather than promise-based: the caller owns which
 * action is pending, so the dialog can't get out of step with it.
 */
const ConfirmDialog = ({
    visible,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Keep it',
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <Pressable className="dialog-overlay" onPress={onCancel} accessibilityLabel="Dismiss">
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <Pressable
                className="dialog-card"
                onPress={(event) => event.stopPropagation()}
                accessibilityViewIsModal
            >
                <Text className="dialog-title">{title}</Text>
                <Text className="dialog-message">{message}</Text>

                <View className="dialog-actions">
                    <Pressable
                        className="dialog-cancel"
                        onPress={onCancel}
                        accessibilityRole="button"
                        accessibilityLabel={cancelLabel}
                    >
                        <Text className="dialog-cancel-text">{cancelLabel}</Text>
                    </Pressable>
                    <Pressable
                        className={clsx('dialog-confirm', destructive && 'dialog-confirm-destructive')}
                        onPress={onConfirm}
                        accessibilityRole="button"
                        accessibilityLabel={confirmLabel}
                    >
                        <Text
                            className={clsx(
                                'dialog-confirm-text',
                                destructive && 'dialog-confirm-text-destructive'
                            )}
                        >
                            {confirmLabel}
                        </Text>
                    </Pressable>
                </View>
            </Pressable>
        </Pressable>
    </Modal>
);

export default ConfirmDialog;
