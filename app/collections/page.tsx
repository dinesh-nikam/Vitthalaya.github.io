'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bookmark, Trash2 } from 'lucide-react';
import { getBookmarks, clearBookmarks } from '@/src/db/bookmark';

export default function CollectionsPage() {
  const [bookmarks, setBookmarks] = React.useState<Array<{ slug: string; title: string }>>([]);
  const [compositions, setCompositions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const stored = getBookmarks();
    setBookmarks(stored);

    // Fetch compositions from database
    if (stored.length > 0) {
      fetchCompositions(stored);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCompositions = async (saved: Array<{ slug: string; title: string }>) => {
    try {
      // In real implementation, call API to get compositions by slugs
      // This is client-side, so we'll just show the slugs
      setCompositions(
        saved.map((b) => ({
          slug: b.slug,
          titleMarathi: b.title,
          titleTranslit: b.slug,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    if (confirm('सर्व वाचले याला नकळा कायम होईल?')) {
      clearBookmarks();
      setBookmarks([]);
      setCompositions([]);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-marathiHeading text-maroon mb-6">
          वाचले याला
        </h1>
        <p className="text-muted-foreground">लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-marathiHeading text-maroon">
          वाचले याला ({bookmarks.length})
        </h1>

        {bookmarks.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/20 text-sm text-destructive hover:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive"
          >
            <Trash2 className="w-4 h-4" />
            <span>सर्व कायम नकळा</span>
          </button>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-foreground">
            अजून कोणतेही वाचले याला नाही.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            अभंग वाचताना बुकमार्क बटन क्लिक करा.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {compositions.map((comp: any) => (
            <Link
              key={comp.slug}
              href={`/abhang/${comp.slug}`}
              className="flex items-center justify-between rounded-lg border border-saffron/10 bg-card p-5 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              <div>
                <p className="font-marathi font-medium text-foreground">
                  {comp.titleMarathi || comp.slug}
                </p>
                <p className="text-sm text-muted-foreground">{comp.titleTranslit}</p>
              </div>
              <Bookmark className="w-5 h-5 text-saffron" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}