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
import { AudioExtractor } from './audio-extractor';

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
  async extract(buffer: Buffer, url: string, options?: ExtractionOptions): Promise<ExtractionResult> {
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
      let captionText = captions ?? '';
      let transcriptionMethod: string | null = captionText ? 'captions' : null;
      let audioUrl: string | null = null;

      // Step 3: No captions available — optionally fall back to downloading
      // the audio track and running it through speech-to-text. This is
      // OFF by default: yt-dlp + Whisper can take minutes, so the request
      // path returns immediately with needsAudioProcessing instead, and the
      // background worker (src/lib/audio-processing.ts) performs the fallback
      // with transcribeAudioFallback: true.
      if (!captionText && options?.transcribeAudioFallback) {
        const fallback = await this.transcribeWithAudioFallback(videoId, options?.language ?? ['mr', 'hi', 'en']);
        if (fallback) {
          captionText = fallback.text;
          transcriptionMethod = fallback.method;
          audioUrl = fallback.audioUrl;
        }
      }

      // Step 4: Build the extracted text
      const textParts: string[] = [];

      if (metadata?.description) {
        textParts.push(metadata.description);
      }

      if (captionText) {
        textParts.push('--- लिरिक्स / Transcript ---');
        textParts.push(captionText);
      }

      // If still no text and no useful description, flag for manual review
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
          transcriptionMethod,
          audioUrl,
        },
        confidence: transcriptionMethod === 'captions' ? 0.8 : (combinedText.length > 50 ? 0.65 : 0.3),
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
   * Download the video's audio track (yt-dlp) and run it through the
   * speech-to-text pipeline (OpenAI/Groq Whisper — same engine used for
   * direct audio uploads).
   *
   * This is the expensive path (audio download + transcription can take
   * minutes), so it is invoked off the request path by the background worker
   * (see src/lib/audio-processing.ts). Returns null — never throws — when
   * yt-dlp is unavailable, the download fails, or no usable speech is
   * detected, so callers can degrade gracefully.
   */
  async transcribeWithAudioFallback(
    videoId: string,
    language: string[] = ['mr', 'hi', 'en']
  ): Promise<{ text: string; method: string; audioUrl: string | null } | null> {
    try {
      const downloaded = await this.downloadAudio(videoId);
      if (!downloaded) return null;

      const audioExtractor = new AudioExtractor();
      const transcribed = await audioExtractor.transcribeBuffer(downloaded.buffer, language);

      if (!transcribed.text || transcribed.text.trim().length < 10) {
        return null;
      }

      return {
        text: transcribed.text.trim(),
        method: transcribed.method,
        audioUrl: downloaded.storedUrl ?? null,
      };
    } catch (audioErr) {
      // Best-effort — the caller decides how to handle empty text.
      console.warn(`[YouTubeExtractor] Audio fallback failed for ${videoId}:`, audioErr);
      return null;
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

  /**
   * Download the best available audio track for a video using yt-dlp, for
   * use as speech-to-text input when no captions exist. Requires yt-dlp to
   * be installed on the host (same tool already used for caption fetching
   * above). Returns null (rather than throwing) when yt-dlp is unavailable
   * or the download fails, so callers can fall back gracefully.
   */
  private async downloadAudio(videoId: string): Promise<{ buffer: Buffer; storedUrl: string | null } | null> {
    const { execFileSync } = await import('node:child_process');
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');

    try {
      execFileSync('yt-dlp', ['--version'], { stdio: 'pipe', timeout: 5000 });
    } catch {
      console.warn('[YouTubeExtractor] yt-dlp is not installed — cannot download audio for transcription fallback.');
      return null;
    }

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'yt-audio-'));
    const outputTemplate = path.join(tmpDir, `${videoId}.%(ext)s`);

    try {
      execFileSync(
        'yt-dlp',
        [
          '--no-playlist',
          '-f', 'bestaudio',
          '--extract-audio',
          '--audio-format', 'mp3',
          '--audio-quality', '5',
          '-o', outputTemplate,
          `https://www.youtube.com/watch?v=${videoId}`,
        ],
        { stdio: 'pipe', timeout: 120000 }
      );

      const files = await fs.promises.readdir(tmpDir);
      const audioFile = files.find((f) => f.endsWith('.mp3'));
      if (!audioFile) return null;

      const fullPath = path.join(tmpDir, audioFile);
      const buffer = await fs.promises.readFile(fullPath);

      // Persist the downloaded audio so a listenable link can be attached
      // to the composition later (best-effort — transcription still proceeds
      // even if this fails).
      let storedUrl: string | null = null;
      try {
        const { storage } = await import('../storage');
        const storagePath = await storage.save(`youtube-${videoId}.mp3`, buffer, 'audio/mpeg');
        storedUrl = storage.getUrl(storagePath);
      } catch (storeErr) {
        console.warn(`[YouTubeExtractor] Failed to persist downloaded audio for ${videoId}:`, storeErr);
      }

      return { buffer, storedUrl };
    } catch (err) {
      console.warn(`[YouTubeExtractor] yt-dlp audio download failed for ${videoId}:`, err);
      return null;
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
