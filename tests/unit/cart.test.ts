import { QueryClient } from '@tanstack/react-query';

import {
  CartEnvelopeDataSchema,
  cartKey,
  optimisticQuantity,
  removeCartItemMutationOptions,
  setCartFromServer,
  shouldPollCart,
  updateCartItemMutationOptions,
} from '@/features/cart';
import type { Cart } from '@/features/cart';
import { removeCartItem, updateCartItem } from '@/features/cart/api';

jest.mock('@/features/cart/api', () => ({
  updateCartItem: jest.fn(), removeCartItem: jest.fn(), fetchCart: jest.fn(), addCartItem: jest.fn(),
}));

const line = {
  productId: '22222222-2222-4222-8222-222222222222', slug: 'paracetamol', name: 'Paracetamol',
  brand: null, imageUrl: '/images/paracetamol.png', department: 'pharmacy', unitPriceMinor: 150000,
  quantity: 2, lineTotalMinor: 300000, stock: 10, maxPerOrder: 5, requiresPrescription: false, isActive: true,
} as const;
const cart: Cart = { items: [line], totalQuantity: 2, subtotalMinor: 300000, currency: 'NGN' };

describe('cart contract and cache updates', () => {
  beforeEach(() => jest.clearAllMocks());
  it('parses the cart presenter shape and rejects the earlier guessed shape', () => {
    expect(CartEnvelopeDataSchema.safeParse({ cart }).success).toBe(true);
    expect(CartEnvelopeDataSchema.safeParse({ lines: [], itemCount: 0, subtotalMinor: 0, currency: 'NGN' }).success).toBe(false);
  });

  it('polls only when focused and active', () => {
    expect(shouldPollCart(true, true)).toBe(true);
    expect(shouldPollCart(true, false)).toBe(false);
    expect(shouldPollCart(false, true)).toBe(false);
    expect(shouldPollCart(false, false)).toBe(false);
  });

  it('optimistically changes quantity without calculating money', () => {
    const updated = optimisticQuantity(cart, line.productId, 3);
    expect(updated.items[0]?.quantity).toBe(3);
    expect(updated.subtotalMinor).toBe(cart.subtotalMinor);
    expect(updated.items[0]?.lineTotalMinor).toBe(cart.items[0]?.lineTotalMinor);
  });

  it('optimistically removes a line and rolls it back after failure', async () => {
    let rejectMutation: ((error: Error) => void) | undefined;
    jest.mocked(removeCartItem).mockImplementation(() => new Promise((_resolve, reject) => { rejectMutation = reject; }));
    const queryClient = new QueryClient();
    queryClient.setQueryData(cartKey, cart);
    const mutation = queryClient.getMutationCache().build(queryClient, removeCartItemMutationOptions(queryClient));
    const execution = mutation.execute({ productId: line.productId });
    const rejected = expect(execution).rejects.toThrow('offline');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(queryClient.getQueryData(cartKey)).toMatchObject({ items: [], totalQuantity: 0, subtotalMinor: 300000 });
    rejectMutation?.(new Error('offline'));
    await rejected;
    expect(queryClient.getQueryData(cartKey)).toEqual(cart);
  });

  it('replaces cache from the server and rolls quantity back after failure', async () => {
    let rejectMutation: ((error: Error) => void) | undefined;
    jest.mocked(updateCartItem).mockImplementation(() => new Promise((_resolve, reject) => { rejectMutation = reject; }));
    const queryClient = new QueryClient();
    queryClient.setQueryData(cartKey, cart);
    const mutation = queryClient.getMutationCache().build(queryClient, updateCartItemMutationOptions(queryClient));
    const execution = mutation.execute({ productId: line.productId, quantity: 4 });
    const rejected = expect(execution).rejects.toThrow('stock changed');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(queryClient.getQueryData<Cart>(cartKey)?.items[0]?.quantity).toBe(4);
    rejectMutation?.(new Error('stock changed'));
    await rejected;
    expect(queryClient.getQueryData(cartKey)).toEqual(cart);

    const fresh: Cart = { ...cart, totalQuantity: 3, subtotalMinor: 450000, items: [{ ...line, quantity: 3, lineTotalMinor: 450000 }] };
    jest.mocked(updateCartItem).mockResolvedValue(fresh);
    await queryClient.getMutationCache().build(queryClient, updateCartItemMutationOptions(queryClient))
      .execute({ productId: line.productId, quantity: 3 });
    expect(queryClient.getQueryData(cartKey)).toEqual(fresh);
  });

  it('replaces cache data with a complete mutation response', () => {
    const queryClient = new QueryClient();
    const fresh: Cart = { ...cart, totalQuantity: 3, subtotalMinor: 450000, items: [{ ...line, quantity: 3, lineTotalMinor: 450000 }] };
    setCartFromServer(queryClient, fresh);
    expect(queryClient.getQueryData(cartKey)).toEqual(fresh);
  });

  it('preserves the last successful cart when a refetch fails', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(cartKey, cart);
    await expect(queryClient.fetchQuery({ queryKey: cartKey, queryFn: async () => { throw new Error('offline'); } })).rejects.toThrow('offline');
    expect(queryClient.getQueryData(cartKey)).toEqual(cart);
  });
});
