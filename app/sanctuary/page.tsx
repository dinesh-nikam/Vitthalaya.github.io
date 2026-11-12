import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';
import { Vitthalaya3DSanctuary } from '@/components/3d/vitthalaya-3d-sanctuary';

export const metadata: Metadata = {
  title: '३D संगीत मंडप : पवित्र स्वर दर्शन | Digital Pandharpur',
  description:
    'वारकरी अभंग, गवळणी, भारुडे, देवीची आरती, स्तोत्रे व भक्तिगीतांचे ३D व्हर्च्युअल मंदाकिनी स्वर दर्शन. राग, ताल, स्वरसंगती व अधिकृत काव्य.',
  openGraph: {
    title: '३D संगीत मंडप : पवित्र स्वर दर्शन | Digital Pandharpur',
    description:
      'वारकरी अभंग, गवळणी, भारुडे, देवीची आरती, स्तोत्रे व भक्तिगीतांचे ३D व्हर्च्युअल मंदाकिनी स्वर दर्शन.',
    url: 'https://varkari.org/sanctuary',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default function SanctuaryPage() {
  return (
    <main className="min-h-screen bg-[#070503] text-[#fff8ec] flex flex-col">
      {/* Top Breadcrumb & Return Bar */}
      <div className="border-b border-[rgba(201,162,39,0.2)] bg-[#110c08]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-[#c9a227] hover:text-[#fff8ec] transition-colors font-marathi"
          >
            <ArrowLeft size={14} />
            <span>मुख्य मंदिराकडे परत</span>
          </Link>
          <span className="text-[#a89279]">/</span>
          <span className="text-xs text-[#e5d5be] font-marathi">३D संगीत मंडप</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#f6bc55] font-marathi">
          <Compass size={13} />
          <span className="hidden sm:inline">३D व्हर्च्युअल मंडप अनुभव</span>
        </div>
      </div>

      {/* 3D Sanctuary Component Container */}
      <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 max-w-[1600px] w-full mx-auto">
        <Vitthalaya3DSanctuary isStandalone={true} />
      </div>

      {/* Bottom Information Footer */}
      <footer className="border-t border-[rgba(201,162,39,0.15)] bg-[#0d0906] px-6 py-4 text-center text-xs text-[#a89279] font-marathi">
        <p>
          वारकरी संप्रदाय व भारतीय भक्ती साहित्यातील २१ प्रमाणित रचना • राग, ताल, स्वरसंगती व काव्य विवरण • सार्वजनिक वाङ्मय अभिलेखागार
        </p>
      </footer>
    </main>
  );
}
