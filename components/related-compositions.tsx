'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2 } from 'lucide-react';

interface RelatedComposition {
  id: string;
  titleMarathi: string;
  slug: string;
  type: string;
  saintName: string | null;
  relevance: number;
  via: string;
}

interface RelatedCompositionsProps {
  compositionId: string;
  limit?: number;
}

const VIA_LABELS: Record<string, string> = {
  'same-saint': 'त्याच संताचे (Same Saint)',
  'same-deity': 'त्याच देवतेचे (Same Deity)',
  'same-festival': 'त्याच सणाचे (Same Festival)',
  'same-category': 'त्याच वर्गातील (Same Category)',
  'related': 'संबंधित (Related)',
};

export default function RelatedCompositions({ compositionId, limit = 6 }: RelatedCompositionsProps) {
  const [compositions, setCompositions] = useState<RelatedComposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/graph/related?compositionId=${compositionId}&limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.compositions) {
          setCompositions(data.compositions);
        } else {
          setCompositions([]);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load related compositions');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [compositionId, limit]);

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/10">
        <h3 className="text-sm font-extrabold uppercase text-[#e5a93c] tracking-wider flex items-center mb-4">
          <BookOpen className="h-4 w-4 mr-2" /> संबंधित अभंग
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#e5a93c]/60" />
        </div>
      </div>
    );
  }

  if (error || compositions.length === 0) {
    return null; // Hide section entirely if nothing to show
  }

  return (
    <div className="p-6 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/10">
      <h3 className="text-sm font-extrabold uppercase text-[#e5a93c] tracking-wider flex items-center mb-4">
        <BookOpen className="h-4 w-4 mr-2" /> संबंधित अभंग (Related Compositions)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {compositions.map((comp) => (
          <Link
            key={comp.id}
            href={`/abhang/${comp.slug}`}
            className="block p-3 rounded-xl bg-[#130406]/60 border border-[#e5a93c]/10 hover:border-[#e35f24]/30 hover:bg-[#1c080b]/80 transition-all group"
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1B6E8C]/20 text-[#1B6E8C] border border-[#1B6E8C]/30 font-bold">
                {comp.type}
              </span>
              <span className="text-[9px] text-[#e5a93c]/40">{VIA_LABELS[comp.via] || comp.via}</span>
            </div>
            <p className="text-sm font-bold text-[#f7e8cf] group-hover:text-[#e5a93c] transition-colors line-clamp-2">
              {comp.titleMarathi}
            </p>
            {comp.saintName && (
              <p className="text-[10px] text-[#f7e8cf]/50 mt-1 truncate">
                {comp.saintName}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
