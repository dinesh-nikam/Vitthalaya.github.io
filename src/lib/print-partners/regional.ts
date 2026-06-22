/**
 * Regional Printer Integration (Maharashtra).
 *
 * For faster, cheaper local delivery within Maharashtra, this module manages
 * a list of regional print shops. Orders are routed as manual notifications
 * to the admin dashboard for fulfillment.
 */

import { db } from '../../db/client';

// ── Regional Printer Database ─────────────────────────────────────────────────

interface RegionalPrinter {
  id: string;
  name: string;
  city: string;
  state: string;
  capabilities: string[];
  contactEmail?: string;
  contactPhone?: string;
  maxPages: number;
  supportsColor: boolean;
  supportsHardcover: boolean;
  baseCostPerPage: number;
  currency: string;
  turnaroundDays: number;
}

const REGIONAL_PRINTERS: RegionalPrinter[] = [
  {
    id: 'pune-print-01',
    name: 'Pune Mudran Kendra',
    city: 'Pune',
    state: 'Maharashtra',
    capabilities: ['paperback', 'saddle-stitch', 'spiral'],
    contactEmail: 'info@punemudran.example.com',
    maxPages: 500,
    supportsColor: true,
    supportsHardcover: false,
    baseCostPerPage: 0.35,
    currency: 'INR',
    turnaroundDays: 5,
  },
  {
    id: 'mumbai-digital-01',
    name: 'Mumbai Digital Printers',
    city: 'Mumbai',
    state: 'Maharashtra',
    capabilities: ['paperback', 'hardcover', 'digital'],
    contactEmail: 'orders@mumbaidigital.example.com',
    maxPages: 800,
    supportsColor: true,
    supportsHardcover: true,
    baseCostPerPage: 0.50,
    currency: 'INR',
    turnaroundDays: 7,
  },
  {
    id: 'nagpur-print-01',
    name: 'Nagpur Granth Mudran',
    city: 'Nagpur',
    state: 'Maharashtra',
    capabilities: ['paperback', 'hardcover'],
    contactEmail: 'contact@nagpurgranth.example.com',
    maxPages: 600,
    supportsColor: true,
    supportsHardcover: true,
    baseCostPerPage: 0.40,
    currency: 'INR',
    turnaroundDays: 6,
  },
];

// ── Find Regional Printer ─────────────────────────────────────────────────────

export function findRegionalPrinter(
  city: string,
  pageCount: number,
  hardcover: boolean,
  color: boolean,
): RegionalPrinter | null {
  const cityLower = city.toLowerCase();

  // Try exact city match first
  let printers = REGIONAL_PRINTERS.filter(
    (p) => p.city.toLowerCase() === cityLower
      && p.maxPages >= pageCount
      && (!hardcover || p.supportsHardcover)
      && (!color || p.supportsColor),
  );

  if (printers.length > 0) {
    printers.sort((a, b) => a.baseCostPerPage - b.baseCostPerPage);
    return printers[0];
  }

  // Fallback to state-wide
  printers = REGIONAL_PRINTERS.filter(
    (p) => p.state === 'Maharashtra'
      && p.maxPages >= pageCount
      && (!hardcover || p.supportsHardcover)
      && (!color || p.supportsColor),
  );

  if (printers.length > 0) {
    printers.sort((a, b) => a.baseCostPerPage - b.baseCostPerPage);
    return printers[0];
  }

  return null;
}

// ── Notify Admin for Regional Order ───────────────────────────────────────────

export interface RegionalOrderNotification {
  orderId: string;
  printer: RegionalPrinter;
  bookTitle: string;
  copies: number;
  totalCost: number;
  printReadyPdfUrl: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
}

export async function notifyRegionalPrinter(
  notification: RegionalOrderNotification,
): Promise<void> {
  // Create a notification record in the database
  await db.order.update({
    where: { id: notification.orderId },
    data: {
      printPartnerId: notification.printer.id,
      status: 'PROCESSING',
    },
  });

  // Log the notification
  console.log(`
[Regional Printer Notification]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Printer: ${notification.printer.name} (${notification.printer.city})
Book: ${notification.bookTitle}
Copies: ${notification.copies}
Total Cost: ₹${notification.totalCost}
Contact: ${notification.printer.contactEmail ?? 'N/A'}
Customer: ${notification.customerName} (${notification.customerPhone})
Address: ${notification.shippingAddress}
PDF: ${notification.printReadyPdfUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

// ── Cost Estimation for Regional Printing ──────────────────────────────────────

export function estimateRegionalCost(
  pageCount: number,
  copies: number,
  printer?: RegionalPrinter,
): { perUnitCost: number; totalCost: number; currency: string } {
  const p = printer ?? REGIONAL_PRINTERS[0];
  const perUnitCost = Math.round(pageCount * p.baseCostPerPage * 100) / 100;
  const totalCost = perUnitCost * copies;

  return { perUnitCost, totalCost, currency: p.currency };
}
