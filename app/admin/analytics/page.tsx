/**
 * Admin Analytics Dashboard — usage metrics, popular content, conversion funnel.
 *
 * Displays:
 * - Summary cards (page views, searches, book views, unique visitors)
 * - Conversion funnel (page view → add-to-cart → checkout → payment)
 * - Popular books (by view count)
 * - Top search queries
 * - Daily events chart
 * - Top pages
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '../../../src/db/client';
import { getAnalyticsSummary, getPopularContent } from '../../../src/lib/analytics/events';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/');
  }
  const [analytics, popularBooks, totalBooks, totalOrders, totalRevenue] = await Promise.all([
    getAnalyticsSummary(30),
    getPopularContent(30, 10),
    db.bookPublication.count(),
    db.order.count(),
    db.order.aggregate({ _sum: { total: true } }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6">
        <h1 className="text-xl font-bold">📈 विश्लेषण — Analytics</h1>
        <p className="text-sand-200 text-sm mt-1">Last 30 days of usage data</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <SummaryCard label="एकूण पुस्तके" value={totalBooks} />
          <SummaryCard label="एकूण ऑर्डर्स" value={totalOrders} />
          <SummaryCard label="कमाई" value={`₹${Number(totalRevenue._sum.total ?? 0).toLocaleString('en-IN')}`} />
          <SummaryCard label="पृष्ठ दृश्ये" value={analytics.totalPageViews.toLocaleString()} />
          <SummaryCard label="अभ्यागत" value={analytics.uniqueVisitors.toLocaleString()} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <SummaryCard label="शोध" value={analytics.totalSearches.toLocaleString()} />
          <SummaryCard label="पुस्तक दृश्ये" value={analytics.totalBookViews.toLocaleString()} />
          <SummaryCard label="कन्व्हर्शन रेट" value={
            analytics.funnel.pageViews > 0
              ? `${((analytics.funnel.paymentSuccess / analytics.funnel.pageViews) * 100).toFixed(2)}%`
              : '0%'
          } />
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-maroon-800 mb-4">🔄 Conversion Funnel (30 days)</h2>
          <div className="space-y-3">
            <FunnelRow label="👀 Page Views" count={analytics.funnel.pageViews} total={analytics.funnel.pageViews} color="bg-blue-500" />
            <FunnelRow label="🛒 Add to Cart" count={analytics.funnel.addToCart} total={analytics.funnel.pageViews} color="bg-saffron" />
            <FunnelRow label="📝 Checkout Start" count={analytics.funnel.checkoutStart} total={analytics.funnel.pageViews} color="bg-maroon-500" />
            <FunnelRow label="✅ Checkout Complete" count={analytics.funnel.checkoutComplete} total={analytics.funnel.pageViews} color="bg-green-500" />
            <FunnelRow label="💰 Payment Success" count={analytics.funnel.paymentSuccess} total={analytics.funnel.pageViews} color="bg-emerald-600" />
          </div>
          <div className="mt-4 text-xs text-gray-400">
            <p>Overall conversion: {analytics.funnel.pageViews > 0
              ? `${((analytics.funnel.paymentSuccess / analytics.funnel.pageViews) * 100).toFixed(2)}%`
              : '0%'} (page view → payment)</p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Books */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-maroon-800 mb-4">🔥 Popular Books</h2>
            {popularBooks.length === 0 ? (
              <p className="text-gray-400 text-sm">No book view data yet</p>
            ) : (
              <div className="space-y-2">
                {popularBooks.map((book, i) => (
                  <div key={book.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 w-5 flex-shrink-0">#{i + 1}</span>
                      <span className="text-sm truncate">{book.title}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500 flex-shrink-0 ml-2">{book.views} views</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Search Queries */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-maroon-800 mb-4">🔍 Top Search Queries</h2>
            {analytics.topSearchQueries.length === 0 ? (
              <p className="text-gray-400 text-sm">No search data yet</p>
            ) : (
              <div className="space-y-2">
                {analytics.topSearchQueries.slice(0, 10).map((q, i) => (
                  <div key={q.query} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 w-5 flex-shrink-0">#{i + 1}</span>
                      <span className="text-sm truncate">{q.query}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500 flex-shrink-0 ml-2">{q.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily Events Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-maroon-800 mb-4">📊 Daily Events (30 days)</h2>
          {analytics.eventsByDay.length === 0 ? (
            <p className="text-gray-400 text-sm">No event data yet</p>
          ) : (
            <div className="space-y-1">
              {/* Bar chart */}
              <div className="flex items-end gap-0.5 h-32">
                {analytics.eventsByDay.map((day) => {
                  const maxCount = Math.max(...analytics.eventsByDay.map((d) => d.count));
                  const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 bg-saffron/60 hover:bg-saffron rounded-t transition-colors relative group"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${day.count} events`}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {day.count}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Date labels (every 5th day) */}
              <div className="flex gap-0.5 text-[10px] text-gray-400">
                {analytics.eventsByDay.map((day, i) => (
                  <div key={day.date} className="flex-1 text-center truncate">
                    {i % 5 === 0 ? day.date.slice(5) : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Pages */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-maroon-800 mb-4">📄 Top Pages</h2>
          {analytics.topPages.length === 0 ? (
            <p className="text-gray-400 text-sm">No page view data yet</p>
          ) : (
            <div className="space-y-2">
              {analytics.topPages.slice(0, 15).map((p, i) => (
                <div key={p.page} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                    <span className="text-sm truncate font-mono text-gray-600">{p.page}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 flex-shrink-0 ml-2">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-maroon-800">{value}</p>
    </div>
  );
}

function FunnelRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-40 text-gray-600 flex-shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium w-16 text-right text-gray-700">{count.toLocaleString()}</span>
      <span className="text-xs w-12 text-right text-gray-400">{pct.toFixed(1)}%</span>
    </div>
  );
}
