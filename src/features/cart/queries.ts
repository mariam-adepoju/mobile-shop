import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';

import { addCartItem, fetchCart, removeCartItem, updateCartItem } from './api';
import type { Cart } from './schemas';

export const cartKey = ['cart'] as const;
export const cartQueryOptions = () => ({ queryKey: cartKey, queryFn: ({ signal }: { signal: AbortSignal }) => fetchCart(signal) });
export const useCart = (options: { enabled?: boolean; refetchInterval?: number } = {}) => useQuery({ ...cartQueryOptions(), ...options });

export function optimisticQuantity(cart: Cart, productId: string, quantity: number): Cart {
  return { ...cart, items: cart.items.map((line) => line.productId === productId ? { ...line, quantity } : line) };
}

export function optimisticRemoval(cart: Cart, productId: string): Cart {
  const removed = cart.items.find((line) => line.productId === productId);
  return {
    ...cart,
    items: cart.items.filter((line) => line.productId !== productId),
    totalQuantity: Math.max(0, cart.totalQuantity - (removed?.quantity ?? 0)),
  };
}

export function setCartFromServer(queryClient: ReturnType<typeof useQueryClient>, cart: Cart) {
  queryClient.setQueryData(cartKey, cart);
}

function replaceAndReconcile(queryClient: ReturnType<typeof useQueryClient>, cart: Cart) {
  setCartFromServer(queryClient, cart);
  void queryClient.invalidateQueries({ queryKey: cartKey });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => addCartItem(productId, quantity),
    onSuccess: (cart) => replaceAndReconcile(queryClient, cart),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation(updateCartItemMutationOptions(queryClient));
}

export function updateCartItemMutationOptions(queryClient: ReturnType<typeof useQueryClient>): UseMutationOptions<Cart, Error, { productId: string; quantity: number }, { previous: Cart | undefined }> {
  return {
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => updateCartItem(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKey });
      const previous = queryClient.getQueryData<Cart>(cartKey);
      if (previous) queryClient.setQueryData(cartKey, optimisticQuantity(previous, productId, quantity));
      return { previous };
    },
    onError: (_error, _variables, context) => { if (context?.previous) queryClient.setQueryData(cartKey, context.previous); },
    onSuccess: (cart) => queryClient.setQueryData(cartKey, cart),
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: cartKey }); },
  };
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation(removeCartItemMutationOptions(queryClient));
}

export function removeCartItemMutationOptions(queryClient: ReturnType<typeof useQueryClient>): UseMutationOptions<Cart, Error, { productId: string }, { previous: Cart | undefined }> {
  return {
    mutationFn: ({ productId }: { productId: string }) => removeCartItem(productId),
    onMutate: async ({ productId }) => {
      await queryClient.cancelQueries({ queryKey: cartKey });
      const previous = queryClient.getQueryData<Cart>(cartKey);
      if (previous) queryClient.setQueryData(cartKey, optimisticRemoval(previous, productId));
      return { previous };
    },
    onError: (_error, _variables, context) => { if (context?.previous) queryClient.setQueryData(cartKey, context.previous); },
    onSuccess: (cart) => queryClient.setQueryData(cartKey, cart),
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: cartKey }); },
  };
}
