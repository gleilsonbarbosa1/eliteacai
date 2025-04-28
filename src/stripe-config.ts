export const STRIPE_PRODUCTS = {
  credits_50: {
    name: 'R$ 50 em Créditos',
    description: 'R$ 50 de Créditos Elite Açaí',
    priceId: 'price_1RIyi7Ps703gVgbAsPscSvNj',
    amount: 50,
    mode: 'payment' as const,
  },
  credits_40: {
    name: 'R$ 40 em Créditos',
    description: 'R$ 40 de Créditos Elite Açaí',
    priceId: 'price_1RIyhkPs703gVgbAmmDLejYY',
    amount: 40,
    mode: 'payment' as const,
  },
  credits_30: {
    name: 'R$ 30 em Créditos',
    description: 'R$ 30 de Créditos Elite Açaí',
    priceId: 'price_1RIgw4Ps703gVgbAsBmeNISf',
    amount: 30,
    mode: 'payment' as const,
  },
  credits_20: {
    name: 'R$ 20 em Créditos',
    description: 'Cashback de R$20',
    priceId: 'price_1RIguDPs703gVgbAoUQHjK6X',
    amount: 20,
    mode: 'payment' as const,
  },
  credits_10: {
    name: 'R$ 10 em Créditos',
    description: 'Venda de créditos para cashback e compras',
    priceId: 'price_1RIFZVPs703gVgbAxV7E1MiP',
    amount: 10,
    mode: 'payment' as const,
  },
} as const;