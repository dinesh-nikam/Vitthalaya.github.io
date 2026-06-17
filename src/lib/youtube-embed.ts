/**
 * YouTube Embed Utilities for Digital Pandharpur
 * Parses YouTube URLs and generates embed links
 */

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractYouTubeId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^?]+)/,
  ];

  for const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate embed URL from YouTube video ID
 */
export function getEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Generate thumbnail URL from YouTube video ID
 */
export function getThumbnailUrl(videoId: string, quality: 'default' | 'hq' | 'mq' | 'hqdefault' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Generate full embed URL from any YouTube URL
 */
export function getEmbedUrlFromUrl(url: string): string | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return getEmbedUrl(videoId);
}

/**
 * Get the first valid YouTube embed URL from an array of links
 */
export function getFirstValidEmbed(links: string[]): string | null {
  for (const link of links) {
    if (link.trim()) {
      const embed = getEmbedUrlFromUrl(link);
      if (embed) return embed;
    }
  }
  return null;
}

/**
 * Check if any audio links are present
 */
export function hasAudioLinks(links: string[] | null | undefined): boolean {
  if (!links || !Array.isArray(links)) return false;
  return links.some((link) => link && link.trim() !== '');
}