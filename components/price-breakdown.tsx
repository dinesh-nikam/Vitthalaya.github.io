import { GST_LABEL } from '@/src/lib/orders/pricing';

interface PriceBreakdownProps {
  subtotal: number;
  /** Shipping cost; 0 (or omitted) renders as "मोफत" (free). */
  shippingCost?: number;
  tax: number;
  total: number;
}

/**
 * Subtotal / shipping / GST / total rows — the exact breakdown shown before
 * payment (cart + checkout) and after (order detail page). Shared so every
 * screen displays identical math and the GST label stays in sync with
 * src/lib/orders/pricing.ts.
 */
export function PriceBreakdown({ subtotal, shippingCost = 0, tax, total }: PriceBreakdownProps) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-500">उप-एकूण</span>
        <span>₹{subtotal.toLocaleString('en-IN')}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">शिपिंग</span>
        <span>{shippingCost ? `₹${shippingCost.toLocaleString('en-IN')}` : 'मोफत'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">{GST_LABEL}</span>
        <span>₹{tax.toLocaleString('en-IN')}</span>
      </div>
      <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-50">
        <span>एकूण</span>
        <span>₹{total.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}
