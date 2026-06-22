import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../../src/db/client';

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PRINTING', 'SHIPPED', 'DELIVERED'] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'पुष्टीकरण प्रतीक्षेत',
  CONFIRMED: 'पुष्टीकृत',
  PROCESSING: 'प्रक्रिया सुरू',
  PRINTING: 'मुद्रण सुरू',
  SHIPPED: 'पाठविले',
  DELIVERED: 'वितरित',
  CANCELLED: 'रद्द केले',
  REFUNDED: 'परतावा दिला',
};

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          publication: { select: { titleMarathi: true, titleEnglish: true, slug: true } },
          edition: { select: { id: true, format: true, fileUrl: true } },
        },
      },
      shippingAddress: true,
    },
  });

  if (!order) notFound();

  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const currentStep = isCancelled ? -1 : STATUS_STEPS.indexOf(order.status as any);

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <Link href="/orders" className="text-saffron hover:underline text-sm inline-block">← माझे ऑर्डर्स</Link>

        {/* Status Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-maroon-800">ऑर्डर #{order.id.slice(0, 8)}</h1>
              <p className="text-sm text-gray-500">{order.createdAt.toLocaleDateString('mr', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <span className="text-lg font-semibold text-maroon-800">₹{Number(order.total).toLocaleString('en-IN')}</span>
          </div>

          {/* Progress */}
          {!isCancelled ? (
            <div className="flex items-center gap-1 mt-4">
              {STATUS_STEPS.map((s, i) => (
                <div key={s} className="flex-1 flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i <= currentStep ? 'bg-saffron text-white' : 'bg-gray-200 text-gray-400'
                  }`}>{i < currentStep ? '✓' : i + 1}</div>
                  <span className="text-xs mt-1 text-center text-gray-500">{STATUS_LABELS[s]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-red-600 font-medium mt-2">{STATUS_LABELS[order.status]}</p>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-maroon-800 mb-3">वस्तू</h2>
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="py-3 text-sm">
                <div className="flex justify-between">
                  <div>
                    <Link href={`/books/${item.publication.slug}`} className="font-medium text-maroon-700 hover:text-saffron">
                      {item.publication.titleMarathi}
                    </Link>
                    <p className="text-xs text-gray-400">× {item.quantity}</p>
                    {item.dedicationText && <p className="text-xs text-gray-500 italic mt-1">समर्पण: {item.dedicationText}</p>}
                  </div>
                  <span>₹{Number(item.totalPrice).toLocaleString('en-IN')}</span>
                </div>
                {/* Download links for confirmed digital orders */}
                {(order.status === 'CONFIRMED' || order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED') && item.edition?.id && (
                  <div className="mt-2 flex gap-2">
                    <a
                      href={`/api/books/download/${item.edition.id}?orderId=${order.id}`}
                      download
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-saffron/10 text-saffron-700 rounded-lg text-xs font-medium hover:bg-saffron/20 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download {item.edition.format?.replace('DIGITAL_', '')}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-maroon-800 mb-3">देयक माहिती</h2>
          <div className="space-y-2 text-sm">
            <Row label="उप-एकूण" value={`₹${Number(order.subtotal).toLocaleString('en-IN')}`} />
            <Row label="शिपिंग" value={order.shippingCost ? `₹${Number(order.shippingCost).toLocaleString('en-IN')}` : 'मोफत'} />
            <Row label="कर (GST)" value={`₹${Number(order.tax).toLocaleString('en-IN')}`} />
            <Row label="एकूण" value={`₹${Number(order.total).toLocaleString('en-IN')}`} bold />
            {order.paymentId && <Row label="पेमेंट आयडी" value={order.paymentId} />}
          </div>
        </div>

        {/* Shipping */}
        {order.shippingAddress && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-maroon-800 mb-3">पाठवणीचा पत्ता</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-medium">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.phone}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.postalCode}</p>
            </div>
          </div>
        )}

        {/* Tracking */}
        {order.trackingNumber && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-maroon-800 mb-2">ट्रॅकिंग</h2>
            <p className="text-sm">{order.trackingNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? 'font-bold text-maroon-800' : 'text-gray-800'}>{value}</span>
    </div>
  );
}
