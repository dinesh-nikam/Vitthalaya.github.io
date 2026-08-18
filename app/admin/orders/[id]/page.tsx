'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft, Package, User, MapPin, CreditCard, 
  Truck, CheckCircle, AlertCircle, Save, Loader2 
} from 'lucide-react';
import { GST_LABEL } from '@/src/lib/orders/pricing';

interface OrderItem {
  id: string;
  quantity: number;
  totalPrice: string;
  dedicationText: string | null;
  publication: {
    id: string;
    titleMarathi: string;
    titleEnglish: string | null;
    slug: string;
  };
  edition: {
    id: string;
    format: string;
    price: string;
  };
}

interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
}

interface Order {
  id: string;
  guestEmail: string | null;
  guestName: string | null;
  status: string;
  shippingMethod: string | null;
  shippingCost: string | null;
  trackingNumber: string | null;
  paymentProvider: string | null;
  paymentId: string | null;
  paymentStatus: string | null;
  currency: string;
  subtotal: string;
  tax: string;
  total: string;
  isGift: boolean;
  giftMessage: string | null;
  giftRecipient: string | null;
  dedicationText: string | null;
  printPartnerId: string | null;
  createdAt: string;
  items: OrderItem[];
  shippingAddress: Address | null;
}

export default function AdminOrderDetailPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Edit fields
  const [status, setStatus] = React.useState('');
  const [trackingNumber, setTrackingNumber] = React.useState('');
  const [printPartnerId, setPrintPartnerId] = React.useState('');

  React.useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  const fetchOrder = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch order details');
      }

      setOrder(data.order);
      setStatus(data.order.status);
      setTrackingNumber(data.order.trackingNumber || '');
      setPrintPartnerId(data.order.printPartnerId || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => {
    if (sessionStatus === 'authenticated' && orderId) {
      const role = (session?.user as any)?.role;
      if (role !== 'ADMIN') {
        router.push('/');
      } else {
        fetchOrder();
      }
    }
  }, [sessionStatus, session, orderId, router, fetchOrder]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdating(true);
      setError(null);
      setSuccess(false);

      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          trackingNumber: trackingNumber || null,
          printPartnerId: printPartnerId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      setSuccess(true);
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUpdating(false);
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-850">त्रुटी आढळली</h2>
          <p className="text-gray-600 text-sm mt-1">{error}</p>
          <Link href="/admin/orders" className="text-saffron hover:underline text-sm mt-4 inline-block">
            ऑर्डर सूचीवर परत जा
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-maroon-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/admin/orders" className="text-sand-200 hover:text-white flex items-center gap-1 text-sm mb-3">
            <ArrowLeft className="w-4 h-4" /> ऑर्डर्स वर जा
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-saffron" /> Order Detail
          </h1>
          <p className="text-sand-200 text-xs font-mono mt-1">#{order.id}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-maroon-800 border-b pb-3 mb-4 flex items-center gap-2">
              📦 पुस्तके आणि आवृत्ती
            </h2>
            <div className="divide-y space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 flex justify-between text-sm">
                  <div>
                    <h3 className="font-semibold text-gray-800">{item.publication.titleMarathi}</h3>
                    {item.publication.titleEnglish && (
                      <p className="text-xs text-gray-400">{item.publication.titleEnglish}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Format: <span className="font-medium">{item.edition.format}</span>
                    </p>
                    {item.dedicationText && (
                      <p className="text-xs bg-cream-50 text-maroon-700 p-2 rounded mt-2 border border-sand-100">
                        <strong>समर्पण:</strong> "{item.dedicationText}"
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">₹{Number(item.edition.price).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-400">प्रमाण: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-maroon-800 border-b pb-3 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-saffron" /> पाठवणीचा पत्ता
              </h2>
              <div className="text-sm text-gray-700 space-y-1.5">
                <p className="font-semibold flex items-center gap-1">
                  <User className="w-4 h-4 text-gray-400" /> {order.shippingAddress.fullName}
                </p>
                <p className="text-gray-600">📞 {order.shippingAddress.phone}</p>
                <p className="bg-gray-50 p-3 rounded-lg border text-gray-600">
                  {order.shippingAddress.line1}
                  {order.shippingAddress.line2 && <><br />{order.shippingAddress.line2}</>}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                </p>
              </div>
            </div>
          )}

          {/* Payment Detail */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-maroon-800 border-b pb-3 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-saffron" /> देयक आणि किंमत
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p><span className="text-gray-400">Payment ID:</span> <span className="font-mono text-xs">{order.paymentId || '—'}</span></p>
                <p><span className="text-gray-400">Provider:</span> {order.paymentProvider || '—'}</p>
                <p><span className="text-gray-400">Status:</span> <span className="font-medium text-emerald-600">{order.paymentStatus || '—'}</span></p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 border">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>उप-एकूण (Subtotal):</span>
                  <span>₹{Number(order.subtotal).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>शिपिंग खर्च:</span>
                  <span>{order.shippingCost ? `₹${Number(order.shippingCost).toLocaleString('en-IN')}` : 'मोफत'}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 border-b pb-2">
                  <span>{GST_LABEL}:</span>
                  <span>₹{Number(order.tax).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold text-maroon-800">
                  <span>एकूण (Total):</span>
                  <span>₹{Number(order.total).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Control Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border-t-4 border-maroon-700">
            <h2 className="font-bold text-maroon-800 mb-4 flex items-center gap-2">
              🛠️ व्यवस्थापन पटल
            </h2>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-xs mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> ऑर्डर्स यशस्वीरित्या अद्ययावत केली!
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">ऑर्डरची सद्यस्थिती</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2.5 focus:border-maroon-600 focus:outline-none"
                >
                  <option value="PENDING">PENDING (प्रलंबित)</option>
                  <option value="CONFIRMED">CONFIRMED (पुष्टीकृत)</option>
                  <option value="PROCESSING">PROCESSING (प्रक्रिया सुरू)</option>
                  <option value="PRINTING">PRINTING (मुद्रण सुरू)</option>
                  <option value="SHIPPED">SHIPPED (पाठविले)</option>
                  <option value="DELIVERED">DELIVERED (वितरित)</option>
                  <option value="CANCELLED">CANCELLED (रद्द केले)</option>
                  <option value="REFUNDED">REFUNDED (परतावा दिला)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> ट्रॅकिंग नंबर (Tracking Code)
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="उदा. AW12345678"
                  className="w-full bg-white border border-gray-200 rounded-lg p-2.5 focus:border-maroon-600 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Print Partner ID
                </label>
                <input
                  type="text"
                  value={printPartnerId}
                  onChange={(e) => setPrintPartnerId(e.target.value)}
                  placeholder="उदा. lulu-1029302"
                  className="w-full bg-white border border-gray-200 rounded-lg p-2.5 focus:border-maroon-600 focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full bg-maroon-800 hover:bg-maroon-950 text-white rounded-lg py-2.5 font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> अद्ययावत करत आहे...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> जतन करा (Save)
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 text-xs text-gray-500 space-y-2 border">
            <p><strong>ऑर्डर दिनांक:</strong> {new Date(order.createdAt).toLocaleString('mr-IN')}</p>
            <p><strong>ग्राहक ईमेल:</strong> {order.guestEmail || '—'}</p>
            <p><strong>ग्राहक नाव:</strong> {order.guestName || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
