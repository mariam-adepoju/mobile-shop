import { z } from 'zod';

/** The web API cart line projection (server/db integer minor units). */
export const CartLineSchema = z.object({
  productId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().nullable(),
  imageUrl: z.string().nullable(),
  department: z.enum(['pharmacy', 'supermarket']),
  unitPriceMinor: z.number().int(),
  quantity: z.number().int().min(1),
  lineTotalMinor: z.number().int(),
  stock: z.number().int(),
  maxPerOrder: z.number().int(),
  requiresPrescription: z.boolean(),
  isActive: z.boolean(),
});

export const CartSchema = z.object({
  items: z.array(CartLineSchema),
  totalQuantity: z.number().int().min(0),
  subtotalMinor: z.number().int().min(0),
  currency: z.string().min(3),
});

export const CartEnvelopeDataSchema = z.object({ cart: CartSchema });
export type CartLine = z.infer<typeof CartLineSchema>;
export type Cart = z.infer<typeof CartSchema>;
