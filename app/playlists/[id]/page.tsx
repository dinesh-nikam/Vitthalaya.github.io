'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Loader2,
  Play,
  Pause,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Music,
  AlertCircle,
  ArrowLeft,
  Search,
  PenLine,
  Check,
  X,
  ListMusic,
  FileAudio,
} from 'lucide-react';

interface ItemDto {
  id: string;
  sortOrder: number;
  composition: {
    id: string;
    titleMarathi: string;
    titleTranslit: string;
    slug: string;
  } | null;
  uploadedFile: {
    id: string;
    originalName: string;
    extractedMetadata: unknown;
  } | null;
}

interface PlaylistDto {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  kind: string;
  createdAt: string;
  items: ItemDto[];
}

interface RecordingDto {
  id: string;
  originalName: string;
  audioUrl: string | null;
}

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { status } = useSession();
  const [playlist, setPlaylist] = React.useState<PlaylistDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [nowPlayingId, setNowPlayingId] = React.useState<string | null>(null);

  // Add-item picker state
  const [showPicker, setShowPicker] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<NonNullable<ItemDto['composition']>[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [recordings, setRecordings] = React.useState<RecordingDto[]>([]);

  // Rename state
  const [renaming, setRenaming] = React.useState(false);
  const [nameValue, setNameValue] = React.useState('');
  const [descValue, setDescValue] = React.useState('');

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists/${id}`);
      if (res.status === 401) {
        setError('कृपया लॉगिन करा.');
        return;
      }
      if (res.status === 404) {
        setError('प्लेलिस्ट सापडली नाही.');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { playlist: PlaylistDto };
      setPlaylist(data.playlist);
      setNameValue(data.playlist.name);
      setDescValue(data.playlist.description ?? '');
    } catch {
      setError('प्लेलिस्ट लोड करता आली नाही.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadRecordings = async () => {
    try {
      const res = await fetch('/api/library/recordings');
      if (!res.ok) return;
      const data = (await res.json()) as { recordings: RecordingDto[] };
      setRecordings(data.recordings.filter((r) => r.audioUrl));
    } catch {
      // picker still works for compositions
    }
  };

  const openPicker = () => {
    setShowPicker(true);
    void loadRecordings();
  };

  const searchCompositions = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=8`);
      if (!res.ok) throw new Error('search failed');
      const data = (await res.json()) as {
        results: Array<{ id: string; titleMarathi: string; titleTranslit: string; slug: string }>;
      };
      setSearchResults(data.results);

    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addComposition = async (comp: ItemDto['composition']) => {
    if (!comp) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/playlists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compositionId: comp.id }),
      });
      if (!res.ok) throw new Error('add failed');
      await load();
    } catch {
      // keep UI stable
    } finally {
      setBusy(false);
    }
  };

  const addRecording = async (rec: RecordingDto) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/playlists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadedFileId: rec.id }),
      });
      if (!res.ok) throw new Error('add failed');
      await load();
    } catch {
      // keep UI stable
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (item: ItemDto) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/playlists/${id}/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('remove failed');
      await load();
    } catch {
      // keep UI stable
    } finally {
      setBusy(false);
    }
  };

  const moveItem = async (item: ItemDto, delta: number) => {
    if (!playlist) return;
    const idx = playlist.items.findIndex((i) => i.id === item.id);
    const target = idx + delta;
    if (target < 0 || target >= playlist.items.length) return;
    const next = [...playlist.items];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPlaylist({ ...playlist, items: next }); // optimistic
    try {
      await fetch(`/api/playlists/${id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: next.map((i) => i.id) }),
      });
      await load();
    } catch {
      await load(); // revert on failure
    }
  };

  const saveRename = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameValue.trim() || undefined,
          description: descValue.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('rename failed');
      await load();
      setRenaming(false);
    } catch {
      // keep UI stable
    } finally {
      setBusy(false);
    }
  };

  const itemTitle = (item: ItemDto) =>
    item.composition?.titleMarathi ?? item.uploadedFile?.originalName ?? 'अज्ञात';

  const itemSubtitle = (item: ItemDto) => {
    if (item.composition) return item.composition.titleTranslit;
    return 'माझी रेकॉर्डिंग';
  };

  const playItem = (item: ItemDto) => {
    const title = itemTitle(item);
    const audioUrl = item.composition
      ? undefined // compositions resolve their audio on their own page
      : (item.uploadedFile?.extractedMetadata as { audioUrl?: string } | null)?.audioUrl;
    if (!audioUrl) {
      if (item.composition) {
        window.location.href = `/abhang/${item.composition.slug}`;
        return;
      }
      return;
    }
    window.dispatchEvent(
      new CustomEvent('play-track', {
        detail: {
          track: {
            id: `${item.id}-${item.uploadedFile?.id ?? ''}`,
            titleMarathi: title,
            titleTranslit: itemSubtitle(item),
            saintName: 'माझी रेकॉर्डिंग',
            audioUrl,
          },
        },
      })
    );
    setNowPlayingId(item.id);
  };

  const playAll = () => {
    if (!playlist || playlist.items.length === 0) return;
    const firstWithAudio = playlist.items.find(
      (i) => (i.uploadedFile?.extractedMetadata as { audioUrl?: string } | null)?.audioUrl
    );
    if (firstWithAudio) {
      playItem(firstWithAudio);
    } else if (playlist.items[0]?.composition) {
      window.location.href = `/abhang/${playlist.items[0].composition.slug}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/playlists"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> सर्व प्लेलिस्ट
        </Link>

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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-saffron" />
          </div>
        ) : playlist ? (
          <>
            <header className="mb-6">
              {renaming ? (
                <div className="space-y-2">
                  <input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-saffron/40 bg-background font-bold font-marathi"
                    autoFocus
                  />
                  <input
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    placeholder="वर्णन"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveRename}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-md bg-saffron text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> जतन करा
                    </button>
                    <button
                      onClick={() => setRenaming(false)}
                      className="px-3 py-1.5 rounded-md border border-border text-xs"
                    >
                      रद्द
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold font-marathiHeading text-foreground flex items-center gap-2">
                      <ListMusic className="w-6 h-6 text-saffron" /> {playlist.name}
                    </h1>
                    {playlist.description && (
                      <p className="text-sm text-muted-foreground mt-1">{playlist.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {playlist.items.length} गाणी ·{' '}
                      {playlist.isPublic ? 'सार्वजनिक' : 'खाजगी'}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setRenaming(true)}
                      className="p-2 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
                      title="नाव/वर्णन बदला"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`'${playlist.name}' हटवायची?`)) {
                          void fetch(`/api/playlists/${id}`, { method: 'DELETE' }).then((res) => {
                            if (res.ok) window.location.href = '/playlists';
                          });
                        }
                      }}
                      className="p-2 rounded-md border border-border text-muted-foreground hover:text-red-500 transition-colors"
                      title="प्लेलिस्ट हटवा"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </header>

            <div className="mb-5 flex items-center gap-2">
              <button
                onClick={playAll}
                disabled={playlist.items.length === 0}
                className="px-4 py-2 rounded-lg bg-saffron text-white text-sm font-bold hover:bg-saffron/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-white" /> सर्व प्ले करा
              </button>
              <button
                onClick={openPicker}
                className="px-4 py-2 rounded-lg border border-saffron/40 text-saffron text-sm font-bold hover:bg-saffron/10 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> गाणी जोडा
              </button>
            </div>

            {showPicker && (
              <div className="mb-6 p-4 rounded-xl border border-saffron/20 bg-card space-y-4">
                <h3 className="text-sm font-bold text-foreground">गाणी जोडा</h3>

                {/* Composition search */}
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchCompositions()}
                    placeholder="रचना शोधा (उदा. तुकाराम, आरती)"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <button
                    onClick={searchCompositions}
                    disabled={searching || !query.trim()}
                    className="px-3 py-2 rounded-lg bg-saffron text-white text-sm disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-1">
                    {searchResults.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                      >
                        <div className="min-w-0">
                          <p className="font-marathi text-sm truncate">{comp.titleMarathi}</p>
                          <p className="text-xs text-muted-foreground truncate">{comp.titleTranslit}</p>
                        </div>
                        <button
                          onClick={() => addComposition(comp)}
                          disabled={busy}
                          className="px-2.5 py-1 rounded-md border border-saffron/40 text-saffron text-xs font-bold hover:bg-saffron/10"
                        >
                          जोडा
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Own recordings */}
                {recordings.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground mb-1.5">
                      माझ्या रेकॉर्डिंग्ज
                    </h4>
                    <div className="space-y-1">
                      {recordings.map((rec) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <FileAudio className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <p className="font-marathi text-sm truncate">{rec.originalName}</p>
                          </div>
                          <button
                            onClick={() => addRecording(rec)}
                            disabled={busy}
                            className="px-2.5 py-1 rounded-md border border-saffron/40 text-saffron text-xs font-bold hover:bg-saffron/10"
                          >
                            जोडा
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {recordings.length === 0 && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    रचना शोधा किंवा तुमच्या रेकॉर्डिंग्जमधून जोडा.
                  </p>
                )}
              </div>
            )}

            {playlist.items.length === 0 ? (
              <div className="py-16 text-center">
                <Music className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="font-bold font-marathi text-foreground">ही प्लेलिस्ट रिकामी आहे</p>
                <p className="text-sm text-muted-foreground mt-1">
                  'गाणी जोडा' बटणाने रचना किंवा रेकॉर्डिंग जोडा.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {playlist.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-saffron/30 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}</span>
                    <button
                      onClick={() => playItem(item)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.composition
                          ? 'bg-muted text-muted-foreground hover:bg-saffron hover:text-white'
                          : 'bg-saffron text-white hover:scale-105'
                      }`}
                      title={item.composition ? 'रचना उघडा' : 'प्ले करा'}
                    >
                      {nowPlayingId === item.id ? (
                        <Pause className="w-3.5 h-3.5 fill-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-marathi text-sm font-bold text-foreground truncate">
                        {itemTitle(item)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{itemSubtitle(item)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveItem(item, -1)}
                        disabled={idx === 0}
                        className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
                        title="वर"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveItem(item, 1)}
                        disabled={idx === playlist.items.length - 1}
                        className="p-1 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
                        title="खाली"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item)}
                        disabled={busy}
                        className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500"
                        title="काढा"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
