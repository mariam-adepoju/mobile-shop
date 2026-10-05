import { getApiClient } from '@/lib/api';

import { CartEnvelopeDataSchema, type Cart } from './schemas';

export async function fetchCart(signal?: AbortSignal): Promise<Cart> {
  return (await getApiClient().get('/cart', CartEnvelopeDataSchema, { auth: true, signal, liveOnly: true })).data.cart;
}

export async function addCartItem(productId: string, quantity = 1): Promise<Cart> {
  return (await getApiClient().post('/cart/items', CartEnvelopeDataSchema, {
    auth: true,
    liveOnly: true,
    body: { productId, quantity },
  })).data.cart;
}

export async function updateCartItem(productId: string, quantity: number): Promise<Cart> {
  return (await getApiClient().patch(`/cart/items/${encodeURIComponent(productId)}`, CartEnvelopeDataSchema, {
    auth: true,
    liveOnly: true,
    body: { quantity },
  })).data.cart;
}

export async function removeCartItem(productId: string): Promise<Cart> {
  return (await getApiClient().delete(`/cart/items/${encodeURIComponent(productId)}`, CartEnvelopeDataSchema, {
    auth: true,
    liveOnly: true,
  })).data.cart;
}
