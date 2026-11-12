'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ListMusic, Plus, Loader2, Trash2, Music, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import '@/app/homepage.css';

interface PlaylistDto {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  kind: string;
  createdAt: string;
  updatedAt: string;
  _count: { items: number };
}

interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

export default function PlaylistsPage() {
  const { status } = useSession();
  const [playlists, setPlaylists] = React.useState<PlaylistDto[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async (targetPage = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(`/api/playlists?page=${targetPage}&limit=${PAGE_SIZE}`);
      if (res.status === 401) {
        setError('कृपया लॉगिन करा.');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        playlists: PlaylistDto[];
        pagination: PaginationDto;
      };
      setPlaylists((prev) => (append ? [...prev, ...data.playlists] : data.playlists));
      setPage(data.pagination.page);
      setHasMore(
        data.playlists.length > 0 && data.pagination.page < data.pagination.totalPages
      );
    } catch {
      setError('प्लेलिस्ट लोड करता आल्या नाहीत.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMore = () => {
    if (loadingMore || loading) return;
    void load(page + 1, true);
  };

  React.useEffect(() => {
    if (status === 'authenticated') void load(1, false);
    if (status === 'unauthenticated') {
      setLoading(false);
      setError('कृपया लॉगिन करा.');
    }
  }, [status, load]);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, description: description.trim() || null }),
      });
      if (!res.ok) throw new Error('create failed');
      setName('');
      setDescription('');
      await load(1, false);
    } catch {
      setError('प्लेलिस्ट तयार करता आली नाही.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (pl: PlaylistDto) => {
    if (!window.confirm(`'${pl.name}' हटवायची?`)) return;
    setBusyId(pl.id);
    try {
      const res = await fetch(`/api/playlists/${pl.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      const next = playlists.filter((p) => p.id !== pl.id);
      setPlaylists(next);
      if (next.length === 0 && page > 1) {
        void load(page - 1, false);
      }
    } catch {
      // keep UI stable
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-4xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">माझ्या प्लेलिस्ट</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="vitthalaya-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <ListMusic size={24} className="text-[var(--dp-gold)]" aria-hidden="true" />
            माझ्या भक्ती प्लेलिस्ट
          </h1>
          <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
            रचना आणि ऑडिओ रेकॉर्डिंग्ज एकत्र ठेवा, क्रम लावा आणि एकाच ठिकाणी ऐका.
          </p>
        </header>

        {error && (
          <div className="mb-6 px-4 py-3 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-xs font-marathi text-[var(--dp-ink)] flex items-center gap-2">
            <AlertCircle size={15} className="text-[var(--dp-gold)] shrink-0" aria-hidden="true" />
            <span>{error}</span>
            {status === 'unauthenticated' && (
              <Link
                href="/login"
                className="underline font-bold text-[var(--dp-gold)] ml-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)]"
              >
                लॉगिन करा
              </Link>
            )}
          </div>
        )}

        {/* Create form */}
        {status === 'authenticated' && (
          <div className="mb-8 p-5 rounded vitthalaya-card border border-[var(--dp-rule)]">
            <h2 className="vitthalaya-display text-sm font-bold mb-3">
              नवीन प्लेलिस्ट तयार करा
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="playlist-name-input" className="sr-only">
                प्लेलिस्टचे नाव
              </label>
              <input
                id="playlist-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && create()}
                placeholder="प्लेलिस्टचे नाव (उदा. प्रभात भजन संग्रह)"
                className="flex-1 px-3 py-2 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-xs font-marathi text-[var(--dp-ink)] focus:outline-none focus:border-[var(--dp-gold)] focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={create}
                disabled={creating || !name.trim()}
                className="vitthalaya-btn-primary text-xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <Loader2 size={13} className="motion-safe:animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Plus size={13} aria-hidden="true" />
                )}
                तयार करा
              </button>
            </div>
            <label htmlFor="playlist-desc-input" className="sr-only">
              वर्णन
            </label>
            <input
              id="playlist-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="वर्णन (ऐच्छिक)"
              className="mt-2 w-full px-3 py-2 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-xs font-marathi text-[var(--dp-ink)] focus:outline-none focus:border-[var(--dp-gold)] focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="motion-safe:animate-spin motion-reduce:animate-none text-[var(--dp-gold)]" aria-hidden="true" />
          </div>
        ) : playlists.length === 0 && !error ? (
          <div className="py-16 text-center vitthalaya-card rounded p-8 border border-[var(--dp-rule)]">
            <Music size={36} className="mx-auto text-[var(--dp-muted)] mb-3" aria-hidden="true" />
            <p className="vitthalaya-display text-base font-bold">अजून कोणतीही प्लेलिस्ट नाही</p>
            <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
              नवीन प्लेलिस्ट तयार करून आपल्या आवडीच्या रचना संकलित करा.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="vitthalaya-card rounded p-4 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/playlists/${pl.id}`}
                    className="flex-1 min-w-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)]"
                  >
                    <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] truncate group-hover:text-[var(--dp-gold)] transition-colors">
                      {pl.name}
                    </h3>
                    {pl.description && (
                      <p className="text-xs text-[var(--dp-muted)] font-marathi mt-0.5 line-clamp-1">
                        {pl.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs font-marathi text-[var(--dp-muted)]">
                      <span className="px-2 py-0.5 rounded bg-[var(--dp-ground-well)] text-[var(--dp-gold)] text-[10px] font-bold border border-[var(--dp-rule)]">
                        {pl._count.items} रचना
                      </span>
                      {pl.isPublic && (
                        <span className="text-[10px]">सार्वजनिक</span>
                      )}
                      <ChevronRight size={12} className="ml-auto" aria-hidden="true" />
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(pl)}
                    disabled={busyId === pl.id}
                    className="p-1.5 rounded border border-[var(--dp-rule)] text-[var(--dp-muted)] hover:text-red-500 hover:border-red-300 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                    title="हटवा"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="vitthalaya-btn-secondary text-xs inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <Loader2 size={13} className="motion-safe:animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <ChevronDown size={13} aria-hidden="true" />
              )}
              अधिक लोड करा
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
