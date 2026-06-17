/**
 * Bookmark management for compositions
 * Uses localStorage for Phase 0 (no auth yet)
 */

const BOOKMARK_KEY = 'pandharpur-bookmarks';

export function getBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(BOOKMARK_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function isBookmarked(slug: string): boolean {
  return getBookmarks().includes(slug);
}

export function toggleBookmark(slug: string): boolean {
  const bookmarks = getBookmarks();
  const index = bookmarks.indexOf(slug);
  let added = false;

  if (index > -1) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(slug);
    added = true;
  }

  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
  return added;
}

export function clearBookmarks(): void {
  localStorage.removeItem(BOOKMARK_KEY);
}