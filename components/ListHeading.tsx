import {View, Text, TouchableOpacity} from 'react-native'

const ListHeading = ({ title, onPress }: ListHeadingProps) => {
    return (
        <View className="list-head">
            <Text className="list-title">{title}</Text>

            {/* Only rendered when a destination is wired up, so there's no
                control that looks tappable but does nothing. */}
            {onPress && (
                <TouchableOpacity
                    className="list-action"
                    onPress={onPress}
                    accessibilityRole="button"
                    // `.list-action` is ~36pt tall (px-4 py-1 around text-lg) -
                    // under the 44pt minimum. The pill is sized to sit
                    // comfortably next to the section title, so hitSlop
                    // extends the tap target instead of growing the chip.
                    hitSlop={{ top: 4, bottom: 4 }}
                >
                    <Text className="list-action-text">View all</Text>
                </TouchableOpacity>
            )}
        </View>
    )
}

export default ListHeading
