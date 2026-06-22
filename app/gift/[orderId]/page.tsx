import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '../../../src/db/client';

interface Props {
  params: Promise<{ orderId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function GiftPage({ params }: Props) {
  const { orderId } = await params;

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? (session.user as any).id : null;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { publication: { select: { titleMarathi: true, titleEnglish: true, slug: true } } },
      },
    },
  });

  if (!order || !order.isGift) notFound();

  // Allow access only if the user is the sender (order.userId)
  if (order.userId && order.userId !== currentUserId) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-maroon-900 via-maroon-800 to-cream-50">
      {/* Hero */}
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-white">
        <div className="text-6xl mb-6">🎁</div>
        <h1 className="text-4xl font-bold mb-2">✨ सप्रेम भेट ✨</h1>
        <p className="text-saffron-300 text-lg">A gift with love</p>
      </div>

      {/* Dedication Card */}
      <div className="max-w-lg mx-auto px-4 pb-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6 relative overflow-hidden">
          {/* Decorative border */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-saffron via-gold to-saffron" />

          {order.giftRecipient && (
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider">समर्पित</p>
              <h2 className="text-3xl font-bold text-maroon-800 mt-2">
                {order.giftRecipient}
              </h2>
            </div>
          )}

          <div className="w-16 h-px bg-gold mx-auto" />

          {order.giftMessage && (
            <div className="bg-cream-50 rounded-lg p-6">
              <p className="text-gray-700 italic leading-relaxed text-lg">
                &ldquo;{order.giftMessage}&rdquo;
              </p>
            </div>
          )}

          <div className="w-16 h-px bg-gold mx-auto" />

          {/* Gift Items */}
          <div className="text-left space-y-3">
            <h3 className="font-semibold text-maroon-800 text-sm uppercase tracking-wider">भेट पुस्तके</h3>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-sand-200">
                <span className="text-2xl">📖</span>
                <div className="flex-1">
                  <Link href={`/books/${item.publication.slug}`} className="font-medium text-maroon-700 hover:text-saffron">
                    {item.publication.titleMarathi}
                  </Link>
                  {item.publication.titleEnglish && (
                    <p className="text-xs text-gray-400">{item.publication.titleEnglish}</p>
                  )}
                </div>
                <span className="text-sm text-gray-500">×{item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="w-16 h-px bg-gold mx-auto" />

          {/* From */}
          <p className="text-gray-500">
            <span className="text-gray-400">— </span>
            {order.guestName ?? 'Someone who cares'}
          </p>

          <p className="text-xs text-gray-400">
            {order.createdAt.toLocaleDateString('mr', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          {/* Footer */}
          <div className="pt-4 border-t border-sand-200">
            <p className="text-xs text-gray-400">
              डिजिटल पंढरपूर — Digital Pandharpur
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 text-center">
          <Link
            href="/books"
            className="inline-block px-6 py-2 bg-saffron text-white rounded-lg hover:bg-saffron-600 transition-colors"
          >
            पुस्तके ब्राउझ करा
          </Link>
        </div>
      </div>
    </div>
  );
}
