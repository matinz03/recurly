import {View, Text, TouchableOpacity} from 'react-native'

const ListHeading = ({ title, onPress }: ListHeadingProps) => {
    return (
        <View className="list-head">
            <Text className="list-title">{title}</Text>

            {/* Only rendered when a destination is wired up, so there's no
                control that looks tappable but does nothing. */}
            {onPress && (
                <TouchableOpacity className="list-action" onPress={onPress}>
                    <Text className="list-action-text">View all</Text>
                </TouchableOpacity>
            )}
        </View>
    )
}

export default ListHeading
