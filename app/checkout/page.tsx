'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCart, getCartSummary, clearCart } from '../../src/lib/orders/cart';

// Razorpay global type
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutForm {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

const INITIAL_FORM: CheckoutForm = {
  fullName: '', phone: '', line1: '', line2: '', city: '', state: 'Maharashtra', postalCode: '',
};

export default function CheckoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const cart = getCart();
  const { subtotal, itemCount } = getCartSummary(cart);

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-cream-50 py-8">
        <div className="max-w-xl mx-auto px-4 text-center">
          <p className="text-gray-500 mb-4">टोपली रिकामी आहे</p>
          <Link href="/books" className="text-saffron hover:underline">पुस्तके पहा</Link>
        </div>
      </div>
    );
  }

  function updateField<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePlaceOrder() {
    setLoading(true);
    setError(null);

    try {
      // 1. Create order via API
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((i) => ({
            publicationId: i.publicationId,
            editionId: i.editionId,
            quantity: i.quantity,
          })),
          shippingAddress: form,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Order creation failed');

      // 2. Check if real Razorpay keys configured
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        // Dev mode — simulate successful payment
        console.warn('[Dev] No Razorpay Key — simulating payment success');

        // Mark the order as confirmed by calling the verification endpoint with mock data
        await fetch('/api/orders/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: data.orderId,
            razorpayOrderId: data.razorpayOrderId || `order_mock_${Date.now()}`,
            razorpayPaymentId: `pay_mock_${Date.now()}`,
            razorpaySignature: 'mock_signature',
          }),
        });

        clearCart();
        router.push(`/orders/${data.orderId}`);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: data.amountPaise,
        currency: data.currency ?? 'INR',
        name: 'Digital Pandharpur',
        description: `Books (${itemCount} items)`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: form.fullName,
          contact: form.phone,
        },
        handler: async function (response: any) {
          // 3. Payment success — verify signature on server
          try {
            const verifyRes = await fetch('/api/orders/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error ?? 'Payment verification failed');
            }
            clearCart();
            router.push(`/orders/${data.orderId}`);
          } catch (e: any) {
            setError(e instanceof Error ? e.message : 'Payment verification failed');
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please refresh the page and try again.');
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-saffron focus:border-transparent outline-none';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <h1 className="text-3xl font-bold text-maroon-800">चेकआउट</h1>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-maroon-800 mb-3">ऑर्डर सारांश</h2>
          {cart.items.map((item) => (
            <div key={item.editionId} className="flex justify-between text-sm py-2 border-b border-gray-50">
              <span>{item.titleMarathi} × {item.quantity}</span>
              <span>₹{item.unitPrice * item.quantity}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold mt-3 text-lg">
            <span>एकूण</span><span>₹{subtotal}</span>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-maroon-800">शिपिंग पत्ता</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>पूर्ण नाव</label>
              <input className={inputClass} value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass}>मोबाईल नंबर</label>
              <input className={inputClass} value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>पत्ता ओळ 1</label>
              <input className={inputClass} value={form.line1} onChange={(e) => updateField('line1', e.target.value)} required />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>पत्ता ओळ 2</label>
              <input className={inputClass} value={form.line2} onChange={(e) => updateField('line2', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>शहर</label>
              <input className={inputClass} value={form.city} onChange={(e) => updateField('city', e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>राज्य</label>
              <input className={inputClass} value={form.state} onChange={(e) => updateField('state', e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>पिन कोड</label>
              <input className={inputClass} value={form.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} required />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <button
          onClick={handlePlaceOrder}
          disabled={loading || !form.fullName || !form.phone}
          className="w-full py-3 bg-saffron text-white rounded-lg hover:bg-saffron-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'प्रक्रिया होत आहे...' : `₹${subtotal} भरा`}
        </button>
      </div>
    </div>
  );
}
