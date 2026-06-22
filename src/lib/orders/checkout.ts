/**
 * Checkout Orchestration — creates orders, integrates payment gateway,
 * and manages the full checkout flow.
 *
 * Flow:
 *   1. Validate cart items (pricing, editions exist)
 *   2. Create Order + OrderItems in DB (status: PENDING)
 *   3. Create Razorpay order for payment
 *   4. Return order + payment details to frontend
 */

import { db } from '../../db/client';
import { computePrice } from './pricing';
import { createRazorpayOrder } from '../payments/razorpay';
import type { CartItem } from './cart';

// ── Checkout Input ───────────────────────────────────────────────────────────

export interface CheckoutInput {
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  items: Array<{
    publicationId: string;
    editionId: string;
    quantity: number;
    dedicationText?: string;
  }>;
  shippingAddressId?: string;
  shippingAddress?: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  isGift?: boolean;
  giftMessage?: string;
  giftRecipient?: string;
}

// ── Checkout Result ──────────────────────────────────────────────────────────

export interface CheckoutResult {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  receiptId: string;
}

// ── Main Checkout ─────────────────────────────────────────────────────────────

export async function processCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  // 1. Resolve shipping address
  let addressId = input.shippingAddressId;

  if (!addressId && input.shippingAddress) {
    const address = await db.address.create({
      data: {
        userId: input.userId,
        fullName: input.shippingAddress.fullName,
        phone: input.shippingAddress.phone,
        line1: input.shippingAddress.line1,
        line2: input.shippingAddress.line2,
        city: input.shippingAddress.city,
        state: input.shippingAddress.state,
        postalCode: input.shippingAddress.postalCode,
        country: input.shippingAddress.country ?? 'IN',
      },
    });
    addressId = address.id;
  }

  // 2. Resolve item pricing
  const resolvedItems: Array<{
    publicationId: string;
    editionId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    dedicationText?: string;
  }> = [];

  let subtotal = 0;

  for (const item of input.items) {
    const edition = await db.bookEdition.findUnique({
      where: { id: item.editionId },
      include: { publication: { select: { bookType: true } } },
    });

    if (!edition) {
      throw new Error(`Edition not found: ${item.editionId}`);
    }

    const pricing = computePrice({
      bookType: edition.publication.bookType as any,
      format: edition.format as any,
      pageCount: edition.pageCount ?? 100,
    });

    const unitPrice = pricing.basePrice;
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    resolvedItems.push({
      publicationId: item.publicationId,
      editionId: item.editionId,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      dedicationText: item.dedicationText,
    });
  }

  // 3. Calculate final totals
  const shippingCost = 0; // Phase 2: real shipping calc
  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
  const total = subtotal + shippingCost + tax;

  // 4. Create Order in DB
  const order = await db.order.create({
    data: {
      userId: input.userId,
      guestEmail: input.guestEmail,
      guestName: input.guestName,
      status: 'PENDING',
      shippingAddressId: addressId,
      isGift: input.isGift ?? false,
      giftMessage: input.giftMessage,
      giftRecipient: input.giftRecipient,
      subtotal,
      shippingCost,
      tax,
      total,
      currency: 'INR',
      items: {
        create: resolvedItems.map((ri) => ({
          publicationId: ri.publicationId,
          editionId: ri.editionId,
          quantity: ri.quantity,
          unitPrice: ri.unitPrice,
          totalPrice: ri.totalPrice,
          dedicationText: ri.dedicationText,
        })),
      },
    },
  });

  // 5. Create Razorpay order
  const amountPaise = Math.round(total * 100);
  const razorpayOrder = await createRazorpayOrder({
    amountPaise,
    receiptId: order.id,
    notes: {
      userId: input.userId ?? 'guest',
      itemCount: String(input.items.length),
    },
  });

  return {
    orderId: order.id,
    razorpayOrderId: razorpayOrder.id,
    amountPaise,
    currency: 'INR',
    receiptId: order.id,
  };
}
