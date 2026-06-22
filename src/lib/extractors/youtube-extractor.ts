/**
 * Digital Pandharpur — YouTube Content Extractor
 *
 * Extracts metadata, captions, and transcripts from YouTube URLs.
 *
 * Pipeline:
 *   YouTube URL → Metadata Fetch → Caption Detection →
 *   Transcript Extraction → AI Cleanup (if available)
 *
 * Uses:
 *   - YouTube Data API (via API key) for metadata
 *   - Innertube / yt-dlp for caption extraction
 *   - Whisper/LLM for cleanup when captions are incomplete
 */

import type { IExtractor, ExtractionResult, ExtractionOptions } from './base';

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
  tags: string[];
  publishedAt: string;
  language?: string;
}

export class YouTubeExtractor implements IExtractor {
  readonly id = 'youtube-extractor';
  readonly name = 'YouTube Content Extractor';
  readonly supportedMimeTypes: string[] = []; // URLs, not files

  canHandle(mimeType: string, extension: string): boolean {
    return mimeType.startsWith('youtube/') || extension === '.youtube';
  }

  /**
   * Check if a string is a valid YouTube URL.
   */
  static isYouTubeUrl(url: string): boolean {
    return /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//.test(url);
  }

  /**
   * Extract video ID from various YouTube URL formats.
   */
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^?]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Extract from a YouTube URL (passed as the "filename" with special prefix).
   * The URL can be passed in the buffer as the URL string in utf-8.
   */
  async extract(buffer: Buffer, url: string, _options?: ExtractionOptions): Promise<ExtractionResult> {
    const videoId = YouTubeExtractor.extractVideoId(url);

    if (!videoId) {
      return {
        text: '',
        title: 'Invalid YouTube URL',
        textLength: 0,
        compositionCount: 0,
        metadata: { extractor: this.id, error: 'Invalid YouTube URL' },
        confidence: 0,
        error: 'Could not extract video ID from the provided URL.',
      };
    }

    try {
      // Step 1: Fetch video metadata
      const metadata = await this.fetchMetadata(videoId);

      // Step 2: Fetch captions/transcript
      const captions = await this.fetchCaptions(videoId);

      // Step 3: If no captions, try audio transcription hint
      const captionText = captions ?? '';

      // Step 4: Build the extracted text
      const textParts: string[] = [];

      if (metadata?.description) {
        textParts.push(metadata.description);
      }

      if (captionText) {
        textParts.push('--- लिरिक्स / Transcript ---');
        textParts.push(captionText);
      }

      // If no captions and no useful description, mark for audio processing
      const needsAudioProcessing = !captionText && (!metadata?.description || metadata.description.length < 100);

      const combinedText = textParts.join('\n\n').trim() || '';

      return {
        text: combinedText,
        title: metadata?.title ?? `YouTube Video ${videoId}`,
        textLength: combinedText.length,
        compositionCount: 1,
        metadata: {
          extractor: this.id,
          videoId,
          channelTitle: metadata?.channelTitle ?? null,
          durationSeconds: metadata?.durationSeconds ?? null,
          thumbnailUrl: metadata?.thumbnailUrl ?? null,
          tags: metadata?.tags ?? [],
          publishedAt: metadata?.publishedAt ?? null,
          language: metadata?.language ?? null,
          needsAudioProcessing,
        },
        confidence: combinedText.length > 50 ? 0.8 : 0.3,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        text: '',
        title: `YouTube Video ${videoId}`,
        textLength: 0,
        compositionCount: 0,
        metadata: { extractor: this.id, videoId, error: msg },
        confidence: 0,
        error: `YouTube extraction failed: ${msg}`,
      };
    }
  }

  /**
   * Fetch video metadata using YouTube Data API or oEmbed.
   */
  private async fetchMetadata(videoId: string): Promise<YouTubeMetadata | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;

    // Try YouTube Data API v3 first
    if (apiKey) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

        if (response.ok) {
          const data = await response.json() as any;
          const item = data?.items?.[0];

          if (item) {
            const snippet = item.snippet;
            // Parse ISO 8601 duration
            const durationStr: string = item.contentDetails?.duration ?? 'PT0S';
            const durationMatch = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            const hours = parseInt(durationMatch?.[1] ?? '0');
            const minutes = parseInt(durationMatch?.[2] ?? '0');
            const seconds = parseInt(durationMatch?.[3] ?? '0');

            return {
              videoId,
              title: snippet?.title ?? '',
              description: snippet?.description ?? '',
              channelTitle: snippet?.channelTitle ?? '',
              durationSeconds: hours * 3600 + minutes * 60 + seconds,
              thumbnailUrl: snippet?.thumbnails?.maxres?.url ??
                            snippet?.thumbnails?.high?.url ??
                            snippet?.thumbnails?.default?.url ?? '',
              tags: snippet?.tags ?? [],
              publishedAt: snippet?.publishedAt ?? '',
            };
          }
        }
      } catch {
        // Fall through to oEmbed
      }
    }

    // Fallback: oEmbed (no API key required)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });

      if (response.ok) {
        const data = await response.json() as any;
        return {
          videoId,
          title: data?.title ?? '',
          description: data?.author_name ? `By ${data.author_name}` : '',
          channelTitle: data?.author_name ?? '',
          durationSeconds: 0,
          thumbnailUrl: data?.thumbnail_url ?? '',
          tags: [],
          publishedAt: '',
        };
      }
    } catch {
      // Return minimal metadata
    }

    return {
      videoId,
      title: '',
      description: '',
      channelTitle: '',
      durationSeconds: 0,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      tags: [],
      publishedAt: '',
    };
  }

  /**
   * Fetch captions/subtitles from the video.
   * Uses multiple strategies: YouTube CAPTION API, then yt-dlp if available.
   */
  private async fetchCaptions(videoId: string): Promise<string | null> {
    // Strategy 1: YouTube Caption API
    try {
      const captionUrl = `https://youtubetranscript.com/?v=${videoId}`;
      const response = await fetch(captionUrl, { signal: AbortSignal.timeout(10000) });

      if (response.ok) {
        const text = await response.text();
        // Try to parse as JSON (transcript API format)
        try {
          const transcript = JSON.parse(text) as Array<{ text: string }>;
          if (Array.isArray(transcript)) {
            return transcript.map(t => t.text).join(' ');
          }
        } catch {
          // If not JSON, it might be the raw transcript text
          if (text.length > 50 && !text.includes('<')) {
            return text;
          }
        }
      }
    } catch {
      // Fall through
    }

    // Strategy 2: Try to fetch auto-generated captions via API
    try {
      const apiUrl = `https://youtubetranscriptapi.vercel.app/api?videoId=${videoId}`;
      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });

      if (response.ok) {
        const data = await response.json() as any;
        if (data?.transcript) {
          return data.transcript;
        }
      }
    } catch {
      // Fall through
    }

    // Strategy 3: Try yt-dlp (if installed on system)
    try {
      return await this.fetchCaptionsWithYtDlp(videoId);
    } catch {
      // Fall through
    }

    return null;
  }

  /**
   * Try to extract captions using yt-dlp (external tool).
   */
  private async fetchCaptionsWithYtDlp(videoId: string): Promise<string | null> {
    const { execSync } = await import('node:child_process');

    try {
      // Check if yt-dlp is available
      execSync('yt-dlp --version', { stdio: 'pipe', timeout: 5000 });

      // Download subtitle track (prefer Marathi, then Hindi, then English, then auto-generated)
      const result = execSync(
        `yt-dlp --skip-download --write-auto-subs --sub-langs "mr,hi,en" --print "captions" "https://www.youtube.com/watch?v=${videoId}"`,
        { stdio: 'pipe', timeout: 30000, encoding: 'utf-8' }
      ) as string;

      if (result && result.length > 50) {
        return result;
      }
    } catch {
      // yt-dlp not installed or failed
    }

    return null;
  }
}
