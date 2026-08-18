import { Text, type TextProps } from 'react-native';
import { formatCurrency } from '@/lib/utils';

interface MoneyProps extends TextProps {
    value: number;
    currency?: string;
}

/**
 * Every amount in the app goes through here, for one reason: tabular figures.
 *
 * Plus Jakarta Sans is proportionally spaced by default, so a 1 is narrower
 * than a 4 and a column of prices in a list wanders - the decimal points don't
 * line up, which is exactly the comparison this app exists to support.
 * `fontVariant: ['tabular-nums']` locks every digit to the same advance width.
 *
 * It can't be a NativeWind class: react-native-css compiles
 * `font-variant-caps` but not `font-variant-numeric`, so this has to be a style
 * prop. Centralising it in a component is also how a future amount can't
 * silently forget it.
 */
const Money = ({ value, currency, style, ...textProps }: MoneyProps) => (
    <Text {...textProps} style={[{ fontVariant: ['tabular-nums'] }, style]}>
        {formatCurrency(value, currency)}
    </Text>
);

export default Money;
