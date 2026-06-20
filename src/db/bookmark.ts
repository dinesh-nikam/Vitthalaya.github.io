/**
 * Bookmark Management for Digital Pandharpur
 * Uses localStorage for Phase 1 (will integrate with auth in Phase 2)
 */

const BOOKMARK_KEY = 'pandharpur-bookmarks';

export interface Bookmark {
  slug: string;
  title: string;
  savedAt: string;
}

export function getBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(BOOKMARK_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function getBookmarkSlugs(): string[] {
  return getBookmarks().map((b) => b.slug);
}

export function isBookmarked(slug: string): boolean {
  return getBookmarkSlugs().includes(slug);
}

export function addBookmark(slug: string, title: string): void {
  const bookmarks = getBookmarks();

  if (bookmarks.some((b) => b.slug === slug)) return;

  bookmarks.push({
    slug,
    title,
    savedAt: new Date().toISOString(),
  });

  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
}

export function removeBookmark(slug: string): void {
  const bookmarks = getBookmarks().filter((b) => b.slug !== slug);
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
}

export function toggleBookmark(slug: string, title: string): boolean {
  if (isBookmarked(slug)) {
    removeBookmark(slug);
    return false;
  } else {
    addBookmark(slug, title);
    return true;
  }
}

export function clearBookmarks(): void {
  localStorage.removeItem(BOOKMARK_KEY);
}

export function getBookmarkCount(): number {
  return getBookmarks().length;
}