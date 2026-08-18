'use client';

import * as React from 'react';
import {
  cycleRepeatMode,
  generateShuffleOrder as genShuffle,
  nextIndex,
  prevIndex,
  formatPlayerTime,
  type RepeatMode,
} from '@/src/lib/player-logic';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  X,
  Music,
  SkipForward,
  SkipBack,
  ListMusic,
  GripVertical,
  Trash2,
  Shuffle,
  Repeat,
  Repeat1,
  Gauge,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface PlayerTrack {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  saintName: string;
  audioUrl: string;
  /** Optional synced lyrics: [{ time, text }]. Plain text lines (no time) are shown statically. */
  lyrics?: { time?: number; text: string }[];
  /** Optional visual asset for Media Session artwork. */
  artwork?: { src: string; sizes: string; type: string }[];
}

export const PLAYBACK_RATES = [1, 1.25, 1.5, 0.75, 0.5] as const;

const EMPTY_PLAYLIST: PlayerTrack[] = [];

/**
 * Premium floating player.
 *
 * Tracks come from real sources only:
 *  - `add-to-queue`    → append a track (dedup by id) and open the queue
 *  - `play-devotional-audio` → play the matching track by id/slug
 *  - `play-track`      → replace the queue with a single track and play it
 *
 * There is no fake default playlist: nothing renders until a real track is
 * queued. Media Session metadata + handlers keep the OS lock screen in sync.
 */
export function FloatingPlayer() {
  const [playlist, setPlaylist] = React.useState<PlayerTrack[]>(EMPTY_PLAYLIST);
  const [currentTrackIndex, setCurrentTrackIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(0.8);
  const [isMuted, setIsMuted] = React.useState(false);
  const [playbackRate, setPlaybackRate] = React.useState<number>(1);
  const [repeatMode, setRepeatMode] = React.useState<RepeatMode>('off');

  // Layout states
  const [visible, setVisible] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showQueue, setShowQueue] = React.useState(false);
  const [showLyrics, setShowLyrics] = React.useState(true);
  const [isShuffle, setIsShuffle] = React.useState(false);
  const [shuffleOrder, setShuffleOrder] = React.useState<number[]>([]);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const playAtRef = React.useRef<{ index: number; autoPlay: boolean }>({ index: 0, autoPlay: true });

  const currentTrack: PlayerTrack | undefined = playlist[currentTrackIndex];

  // ─── Events: add-to-queue, play-devotional-audio, play-track ────────────
  React.useEffect(() => {
    const handlePlayTrigger = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      const slug = detail.slug;
      const idx = playlist.findIndex(
        (t) => t.id === slug || t.titleTranslit.toLowerCase().includes(String(slug).toLowerCase())
      );
      const targetIdx = idx !== -1 ? idx : playlist.length - 1;
      if (playlist.length === 0) return;
      setCurrentTrackIndex(Math.max(0, targetIdx));
      setVisible(true);
      setExpanded(true);
      playAtRef.current = { index: Math.max(0, targetIdx), autoPlay: true };
    };

    const handleAddToQueue = (e: Event) => {
      const track = (e as CustomEvent).detail?.track as PlayerTrack | undefined;
      if (!track || !track.id || !track.audioUrl) return;
      setPlaylist((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
      setVisible(true);
      setShowQueue(true);
    };

    const handlePlayTrack = (e: Event) => {
      const track = (e as CustomEvent).detail?.track as PlayerTrack | undefined;
      if (!track || !track.id || !track.audioUrl) return;
      setPlaylist([track]);
      setCurrentTrackIndex(0);
      setVisible(true);
      setExpanded(true);
      playAtRef.current = { index: 0, autoPlay: true };
    };

    window.addEventListener('play-devotional-audio', handlePlayTrigger);
    window.addEventListener('add-to-queue', handleAddToQueue);
    window.addEventListener('play-track', handlePlayTrack);
    return () => {
      window.removeEventListener('play-devotional-audio', handlePlayTrigger);
      window.removeEventListener('add-to-queue', handleAddToQueue);
      window.removeEventListener('play-track', handlePlayTrack);
    };
  }, [playlist]);

  // ─── Audio element binding ──────────────────────────────────────────────
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      if (repeatMode === 'all') {
        handleNextRef.current();
        return;
      }
      // 'off': advance; stop at the end of the queue.
      if (currentTrackIndex < playlist.length - 1) {
        handleNextRef.current();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentTrackIndex, repeatMode, playlist.length]);

  // Apply speed + volume to the element whenever they change.
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, currentTrackIndex]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted, currentTrackIndex]);

  // Auto-play when the index changes through playAtRef (user actions only).
  React.useEffect(() => {
    const { index, autoPlay } = playAtRef.current;
    if (index !== currentTrackIndex) return;
    if (!autoPlay) return;
    setIsPlaying(true);
    const audio = audioRef.current;
    if (audio) {
      audio.play().catch(() => {});
    }
  }, [currentTrackIndex]);

  // Canvas wave visualizer (kept from the original; cosmetic only).
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.clientWidth;
    canvas.height = 40;

    let localId: number;
    let phase = 0;

    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#FF7A1A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const sliceWidth = canvas.width / 50;
      for (let i = 0; i <= 50; i++) {
        const x = i * sliceWidth;
        const amplitude = isPlaying ? 12 : 1.5;
        const y =
          canvas.height / 2 +
          Math.sin(i * 0.15 + phase) * amplitude +
          Math.cos(i * 0.3 - phase * 0.5) * (amplitude * 0.4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(232, 180, 77, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 50; i++) {
        const x = i * sliceWidth;
        const amplitude = isPlaying ? 8 : 1.0;
        const y =
          canvas.height / 2 +
          Math.cos(i * 0.2 + phase * 0.7) * amplitude +
          Math.sin(i * 0.1 - phase) * (amplitude * 0.5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      phase += isPlaying ? 0.15 : 0.02;
      localId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(localId);
  }, [isPlaying, visible]);

  // ─── Media Session API ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: currentTrack.titleMarathi,
      artist: currentTrack.saintName,
      album: 'विठ्ठलय - Vitthalaya',
      artwork: currentTrack.artwork ?? [],
    });
    ms.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    });
    ms.setActionHandler('pause', () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });
    ms.setActionHandler('previoustrack', handlePrevRef.current);
    ms.setActionHandler('nexttrack', handleNextRef.current);
    ms.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
      }
    });
    ms.setActionHandler('stop', () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });
    return () => {
      ms.setActionHandler('play', null);
      ms.setActionHandler('pause', null);
      ms.setActionHandler('previoustrack', null);
      ms.setActionHandler('nexttrack', null);
      ms.setActionHandler('seekto', null);
      ms.setActionHandler('stop', null);
    };
    // Re-register only when the track changes; handlers read refs for freshness.
  }, [currentTrack]);

  // Report playback state to Media Session.
  React.useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // ─── Keyboard shortcuts (only when the player is visible) ───────────────
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekBy(10);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekBy(-10);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'n' || e.key === 'N') {
        handleNextRef.current();
      } else if (e.key === 'p' || e.key === 'P') {
        handlePrevRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // togglePlay/seekBy/toggleMute are recreated each render; the closure is
    // fresh because this effect re-runs whenever `visible` changes.
  }, [visible]);

  // ─── Actions ────────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const seekBy = (delta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + delta);
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      audioRef.current!.muted = !prev;
      return !prev;
    });
  };

  const cyclePlaybackRate = () => {
    setPlaybackRate((prev) => {
      const idx = PLAYBACK_RATES.indexOf(prev as (typeof PLAYBACK_RATES)[number]);
      const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
      if (audioRef.current) audioRef.current.playbackRate = next;
      return next;
    });
  };

  const cycleRepeat = () => {
    setRepeatMode((prev) => cycleRepeatMode(prev));
  };

  const generateShuffleOrder = React.useCallback(
    (length: number, keepFirst: number) => genShuffle(length, keepFirst),
    []
  );

  const toggleShuffle = () => {
    setIsShuffle((prev) => {
      const next = !prev;
      if (next) {
        setShuffleOrder(generateShuffleOrder(playlist.length, currentTrackIndex));
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (isShuffle) {
      setShuffleOrder(generateShuffleOrder(playlist.length, currentTrackIndex));
    }
    // Intentionally depends only on queue length + shuffle toggle: reshuffling
    // on every track change would defeat a stable upcoming queue.
  }, [playlist.length, isShuffle, currentTrackIndex, generateShuffleOrder]);

  const playAtIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(playlist.length - 1, index));
    setCurrentTrackIndex(clamped);
    playAtRef.current = { index: clamped, autoPlay: true };
  };

  const handleNextRef = React.useRef<() => void>(() => {});
  const handlePrevRef = React.useRef<() => void>(() => {});

  const handleNext = () => {
    if (playlist.length === 0) return;
    playAtIndex(
      nextIndex({
        queueLength: playlist.length,
        currentIndex: currentTrackIndex,
        shuffleOrder,
        isShuffle,
      })
    );
  };
  handleNextRef.current = handleNext;

  const handlePrev = () => {
    if (playlist.length === 0) return;
    playAtIndex(
      prevIndex({
        queueLength: playlist.length,
        currentIndex: currentTrackIndex,
        shuffleOrder,
        isShuffle,
      })
    );
  };
  handlePrevRef.current = handlePrev;

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      audioRef.current.muted = vol === 0;
    }
    setIsMuted(vol === 0);
  };

  const removeFromQueue = (idx: number) => {
    setPlaylist((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (idx < currentTrackIndex) setCurrentTrackIndex((c) => c - 1);
      else if (idx === currentTrackIndex && idx >= next.length) {
        setCurrentTrackIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setPlaylist((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    if (idx === currentTrackIndex) setCurrentTrackIndex(idx - 1);
    else if (idx - 1 === currentTrackIndex) setCurrentTrackIndex(idx);
  };

  const moveDown = (idx: number) => {
    setPlaylist((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    if (idx === currentTrackIndex) setCurrentTrackIndex(idx + 1);
    else if (idx + 1 === currentTrackIndex) setCurrentTrackIndex(idx);
  };

  const formatTime = formatPlayerTime;

  const activeLyricsIndex = React.useMemo(() => {
    if (!currentTrack?.lyrics?.length) return -1;
    let activeIdx = -1;
    for (let i = 0; i < currentTrack.lyrics.length; i++) {
      const line = currentTrack.lyrics[i];
      if (typeof line.time !== 'number') continue;
      if (currentTime >= line.time) activeIdx = i;
      else break;
    }
    return activeIdx;
  }, [currentTrack?.lyrics, currentTime]);

  // Empty state: nothing queued yet — show nothing (no fake tracks).
  if (!visible || playlist.length === 0 || !currentTrack) {
    return null;
  }

  return (
    <div
      className={`fixed z-40 bg-card border border-saffron/20 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ease-in-out flex flex-col ${
        isFullscreen
          ? 'inset-3 sm:inset-8 rounded-3xl'
          : expanded
            ? 'bottom-4 left-4 w-80 sm:w-96'
            : 'bottom-4 left-4 w-72'
      }`}
    >
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        autoPlay={isPlaying}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* HEADER CONTROL BAR */}
      <div className="bg-saffron/10 px-4 py-3 flex items-center justify-between border-b border-saffron/25 text-maroon dark:text-saffron">
        <div className="flex items-center gap-2 overflow-hidden">
          <Music className={`w-4 h-4 text-saffron ${isPlaying ? 'animate-spin' : ''}`} />
          <div className="truncate">
            <h4 className="text-xs font-bold font-marathiHeading truncate">
              {currentTrack.titleMarathi}
            </h4>
            <p className="text-[10px] text-muted-foreground truncate">{currentTrack.saintName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="p-1 hover:bg-saffron/10 rounded transition-colors"
            title={isFullscreen ? 'खाली करा (Minimize)' : 'पूर्ण स्क्रीन (Fullscreen)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-saffron/10 rounded transition-colors"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 hover:bg-saffron/10 rounded transition-colors text-muted-foreground hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* EXPANDED / FULLSCREEN PANEL */}
      {(expanded || isFullscreen) && (
        <div
          className={`p-4 space-y-4 overflow-y-auto border-b border-saffron/10 ${
            isFullscreen ? 'flex-1 max-h-[60vh]' : 'max-h-[300px]'
          }`}
        >
          {/* Synchronized Lyrics */}
          {showLyrics && currentTrack.lyrics && currentTrack.lyrics.length > 0 && (
            <div className="bg-cream dark:bg-background/50 rounded-xl p-3 border border-saffron/10 max-h-48 overflow-y-auto flex flex-col gap-2 scroll-smooth text-center">
              {currentTrack.lyrics.map((line, idx) => {
                const isActive = idx === activeLyricsIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (typeof line.time === 'number' && audioRef.current) {
                        audioRef.current.currentTime = line.time;
                      }
                    }}
                    className={`font-marathi text-sm transition-all duration-300 text-left ${
                      isActive
                        ? 'text-saffron font-bold scale-105 opacity-100'
                        : 'text-muted-foreground/60 scale-95 opacity-50 hover:opacity-90'
                    }`}
                    title={typeof line.time === 'number' ? 'येथून प्ले करा' : undefined}
                  >
                    {line.text}
                  </button>
                );
              })}
            </div>
          )}

          {/* Queue */}
          {showQueue && (
            <div className="bg-background rounded-xl p-2 border border-saffron/10 space-y-1">
              <h5 className="text-[11px] font-bold text-muted-foreground px-2 pb-1 border-b border-border">
                पुढील गाणी (Queue) · {playlist.length}
              </h5>
              {playlist.map((track, idx) => (
                <div
                  key={track.id}
                  className={`flex items-center gap-1 p-1.5 rounded text-xs font-marathi transition-colors group ${
                    idx === currentTrackIndex
                      ? 'bg-saffron/10 text-saffron font-bold'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <GripVertical className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                  <button
                    onClick={() => playAtIndex(idx)}
                    className="flex-1 text-left truncate min-w-0"
                    title={track.titleMarathi}
                  >
                    <span className="block truncate">{track.titleMarathi}</span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {track.saintName}
                    </span>
                  </button>
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveUp(idx)}
                      className="p-0.5 hover:bg-saffron/10 rounded"
                      title="वर स्थानांतरित करा"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      className="p-0.5 hover:bg-saffron/10 rounded"
                      title="खाली स्थानांतरित करा"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromQueue(idx)}
                      className="p-0.5 hover:bg-red-500/10 rounded text-red-400"
                      title="काढा"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Wave visualizer */}
          {!isFullscreen && <canvas ref={canvasRef} className="w-full h-10 rounded-lg bg-background/20" />}
        </div>
      )}

      {/* FOOTER CORE PLAYER STRIP */}
      <div className="p-4 bg-card space-y-3">
        {/* Timeline */}
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleTimelineChange}
            className="w-full h-1 bg-saffron/10 accent-saffron rounded-lg appearance-none cursor-pointer"
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showQueue
                  ? 'bg-saffron/10 border-saffron/30 text-saffron'
                  : 'border-border hover:bg-muted text-foreground'
              }`}
              title="प्लेलिस्ट दाखवा"
            >
              <ListMusic className="w-4 h-4" />
            </button>
            <button
              onClick={toggleShuffle}
              aria-pressed={isShuffle}
              className={`p-1.5 rounded-lg border transition-colors ${
                isShuffle
                  ? 'bg-saffron/10 border-saffron/30 text-saffron'
                  : 'border-border hover:bg-muted text-foreground'
              }`}
              title={isShuffle ? 'शॉफल बंद करा' : 'शॉफल सुरू करा'}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={cycleRepeat}
              aria-pressed={repeatMode !== 'off'}
              className={`p-1.5 rounded-lg border transition-colors ${
                repeatMode !== 'off'
                  ? 'bg-saffron/10 border-saffron/30 text-saffron'
                  : 'border-border hover:bg-muted text-foreground'
              }`}
              title={
                repeatMode === 'off'
                  ? 'रिपीट बंद'
                  : repeatMode === 'all'
                    ? 'सर्व रिपीट करा'
                    : 'एकच गाणे रिपीट करा'
              }
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
            <button
              onClick={cyclePlaybackRate}
              className={`p-1.5 rounded-lg border transition-colors font-bold text-[10px] ${
                playbackRate !== 1
                  ? 'bg-saffron/10 border-saffron/30 text-saffron'
                  : 'border-border hover:bg-muted text-foreground'
              }`}
              title="प्लेबॅक गती (Speed)"
            >
              <Gauge className="w-4 h-4" />
              <span className="ml-1">{playbackRate}×</span>
            </button>
            {currentTrack.lyrics && currentTrack.lyrics.length > 0 && (
              <button
                onClick={() => setShowLyrics(!showLyrics)}
                className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${
                  showLyrics
                    ? 'bg-saffron/10 border-saffron/30 text-saffron'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                मजकूर
              </button>
            )}
          </div>

          {/* Transport */}
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="p-1 hover:bg-muted rounded text-foreground">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-saffron text-white flex items-center justify-center shadow hover:scale-105 active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white text-white" />
              ) : (
                <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
              )}
            </button>
            <button onClick={handleNext} className="p-1 hover:bg-muted rounded text-foreground">
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 group/volume relative">
            <button onClick={toggleMute} className="p-1 hover:bg-muted rounded text-foreground">
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-saffron" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-12 h-1 bg-saffron/10 accent-saffron rounded-lg appearance-none cursor-pointer opacity-0 group-hover/volume:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
export default FloatingPlayer;
