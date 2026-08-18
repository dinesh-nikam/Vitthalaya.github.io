'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ListMusic, Plus, Loader2, Trash2, Music, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';

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
      // If we just emptied a later page, fall back to the previous one so the
      // list never shows a dead end without a load-more button.
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
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold font-marathiHeading text-foreground flex items-center gap-2">
            <ListMusic className="w-6 h-6 text-saffron" /> माझ्या प्लेलिस्ट
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            रचना आणि रेकॉर्डिंग्स एकत्र ठेवा, क्रम लावा, एकाच वेळी प्ले करा.
          </p>
        </header>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
            {status === 'unauthenticated' && (
              <Link href="/login" className="underline font-bold ml-1">
                लॉगिन करा
              </Link>
            )}
          </div>
        )}

        {/* Create form */}
        {status === 'authenticated' && (
          <div className="mb-6 p-4 rounded-xl border border-saffron/20 bg-card">
            <h2 className="text-sm font-bold text-foreground mb-3">नवीन प्लेलिस्ट तयार करा</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && create()}
                placeholder="प्लेलिस्टचे नाव (उदा. सकाळची भक्ती)"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
              <button
                onClick={create}
                disabled={creating || !name.trim()}
                className="px-4 py-2 rounded-lg bg-saffron text-white text-sm font-bold hover:bg-saffron/90 disabled:opacity-50 flex items-center gap-1 justify-center"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                तयार करा
              </button>
            </div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="वर्णन (ऐच्छिक)"
              className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-saffron" />
          </div>
        ) : playlists.length === 0 && !error ? (
          <div className="py-16 text-center">
            <Music className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-lg font-bold font-marathi text-foreground">अजून प्लेलिस्ट नाही</p>
            <p className="text-sm text-muted-foreground mt-1">वरच्या फॉर्मने पहिली प्लेलिस्ट तयार करा.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="rounded-xl border border-border bg-card p-4 hover:border-saffron/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/playlists/${pl.id}`} className="flex-1 min-w-0">
                    <h3 className="font-bold font-marathi text-foreground truncate group-hover:text-saffron transition-colors">
                      {pl.name}
                    </h3>
                    {pl.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {pl.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-full bg-saffron/10 text-saffron text-[10px] font-bold">
                        {pl._count.items} गाणी
                      </span>
                      {pl.isPublic && (
                        <span className="text-[10px]">सार्वजनिक</span>
                      )}
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    </div>
                  </Link>
                  <button
                    onClick={() => remove(pl)}
                    disabled={busyId === pl.id}
                    className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors flex-shrink-0"
                    title="हटवा"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-5 py-2.5 rounded-lg border border-saffron/30 text-sm font-bold text-saffron hover:bg-saffron/10 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              अधिक लोड करा
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
