export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'JPY'] as const;

export type Currency = (typeof CURRENCIES)[number];

export const isCurrency = (value?: string): value is Currency =>
    !!value && (CURRENCIES as readonly string[]).includes(value);
