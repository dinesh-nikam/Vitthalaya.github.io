'use client';

import * as React from 'react';
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
  ListMusic 
} from 'lucide-react';

interface Track {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  saintName: string;
  audioUrl: string;
  lyrics: { time: number; text: string }[];
}

const DEFAULT_PLAYLIST: Track[] = [
  {
    id: 't1',
    titleMarathi: 'तुज रूप चिती राहो',
    titleTranslit: 'Tuze Rup Chitti Raho',
    saintName: 'संत तुकाराम महाराज',
    // Using a reliable royalty-free tanpura/sitar ambient background loop
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    lyrics: [
      { time: 0, text: '।। विठ्ठल माऊली ।।' },
      { time: 5, text: 'तुज रूप चिती राहो ।' },
      { time: 15, text: 'तुज चरण रमाठी राहो ।' },
      { time: 25, text: 'तुज मन नामी जपाठी राहो ।' },
      { time: 35, text: 'तुज भजन राहो भक्तीनंदना ।।' },
      { time: 48, text: 'तुज पाय चिती धरो ।' },
      { time: 58, text: 'तुज हृदय शुद्ध करो ।' },
      { time: 68, text: 'तुज स्मरण चिती लागो ।' },
      { time: 78, text: 'तुज भक्ती भावने भरो ।।' }
    ]
  },
  {
    id: 't2',
    titleMarathi: 'राम कृष्ण हरीं',
    titleTranslit: 'Ram Krishna Harin',
    saintName: 'संत ज्ञानेश्वर महाराज',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    lyrics: [
      { time: 0, text: '।। हरिपाठ सोहळा ।।' },
      { time: 8, text: 'राम कृष्ण हरीं ।' },
      { time: 18, text: 'जाणीव श्रीहरीं ।।' },
      { time: 28, text: 'स्मरण कर भक्तजन ।' },
      { time: 38, text: 'पुन्हा वर जाणीव ।।' },
      { time: 48, text: 'नामस्मरण चिती लागो ।' },
      { time: 58, text: 'नामरती चिती वाहो ।' },
      { time: 68, text: 'नामस्मरण चिती लागो ।।' }
    ]
  },
  {
    id: 't3',
    titleMarathi: 'पंढरपूरचे देवा',
    titleTranslit: 'Pandharpurche Deva',
    saintName: 'संत तुकाराम महाराज',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    lyrics: [
      { time: 0, text: '।। विठ्ठल वंदन ।।' },
      { time: 6, text: 'पंढरपूरचे देवा ।' },
      { time: 16, text: 'विठ्ठल पांडुरंगा ।।' },
      { time: 26, text: 'पंढरपूरचे देवा ।' },
      { time: 36, text: 'वारकरी चढले कांही ।।' },
      { time: 46, text: 'पांडुरंग हरी विठ्ठल ।' },
      { time: 56, text: 'माऊली माऊली विठ्ठल ।।' }
    ]
  }
];

export function FloatingPlayer() {
  const [playlist, setPlaylist] = React.useState<Track[]>(DEFAULT_PLAYLIST);
  const [currentTrackIndex, setCurrentTrackIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(0.8);
  const [isMuted, setIsMuted] = React.useState(false);
  
  // Layout States
  const [visible, setVisible] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [showQueue, setShowQueue] = React.useState(false);
  const [showLyrics, setShowLyrics] = React.useState(true);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  const currentTrack = playlist[currentTrackIndex];

  // Listen to custom play trigger events from page
  React.useEffect(() => {
    const handlePlayTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      const trackSlug = customEvent.detail?.slug;
      
      // Find matching track or keep default
      const matchedIndex = playlist.findIndex(t => t.id === trackSlug || t.titleTranslit.toLowerCase().includes(String(trackSlug).toLowerCase()));
      if (matchedIndex !== -1) {
        setCurrentTrackIndex(matchedIndex);
      }
      setVisible(true);
      setExpanded(true);
      // Play after state sets
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      }, 100);
    };

    window.addEventListener('play-devotional-audio', handlePlayTrigger);
    return () => window.removeEventListener('play-devotional-audio', handlePlayTrigger);
  }, [playlist]);

  // Audio elements event binding
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => handleNext();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentTrackIndex]);

  // Dynamic canvas wave visualizer synced to play state
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
      
      ctx.strokeStyle = '#FF7A1A'; // Saffron
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = canvas.width / 50;
      
      for (let i = 0; i <= 50; i++) {
        const x = i * sliceWidth;
        // Generate a beautiful, multi-layered sine wave
        // Flatten wave when audio is paused
        const amplitude = isPlaying ? 12 : 1.5;
        const speed = isPlaying ? 0.12 : 0.01;
        
        const y = (canvas.height / 2) + 
          Math.sin(i * 0.15 + phase) * amplitude + 
          Math.cos(i * 0.3 - phase * 0.5) * (amplitude * 0.4);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Additional background mirror glow wave
      ctx.strokeStyle = 'rgba(232, 180, 77, 0.3)'; // Temple Gold
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 50; i++) {
        const x = i * sliceWidth;
        const amplitude = isPlaying ? 8 : 1.0;
        const speed = isPlaying ? 0.08 : 0.005;
        const y = (canvas.height / 2) + 
          Math.cos(i * 0.2 + phase * 0.7) * amplitude + 
          Math.sin(i * 0.1 - phase) * (amplitude * 0.5);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      phase += isPlaying ? 0.15 : 0.02;
      localId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(localId);
  }, [isPlaying]);

  // Audio actions
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    setIsPlaying(true);
    // Play after state loads next track source
    setTimeout(() => {
      if (audioRef.current) audioRef.current.play().catch(() => {});
    }, 150);
  };

  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
    setTimeout(() => {
      if (audioRef.current) audioRef.current.play().catch(() => {});
    }, 150);
  };

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

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Find active lyrics line based on current playback time
  const activeLyricsIndex = React.useMemo(() => {
    let activeIdx = -1;
    for (let i = 0; i < currentTrack.lyrics.length; i++) {
      if (currentTime >= currentTrack.lyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [currentTrack.lyrics, currentTime]);

  if (!visible) {
    // Show a tiny floating musical note button if minimized
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full bg-saffron text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform animate-bounce saffron-glow border-2 border-gold"
        title="भक्ती संगीत चालू करा (Audio Player)"
      >
        <Music className="w-5 h-5 animate-pulse" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 left-6 z-40 bg-card border border-saffron/20 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ease-in-out flex flex-col ${
        expanded ? 'w-80 sm:w-96' : 'w-72'
      }`}
    >
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        autoPlay={isPlaying}
      />

      {/* HEADER CONTROL BAR */}
      <div className="bg-saffron/10 px-4 py-3 flex items-center justify-between border-b border-saffron/25 text-maroon dark:text-saffron">
        <div className="flex items-center gap-2 overflow-hidden">
          <Music className={`w-4 h-4 text-saffron ${isPlaying ? 'animate-spin' : ''}`} />
          <div className="truncate">
            <h4 className="text-xs font-bold font-marathiHeading truncate">{currentTrack.titleMarathi}</h4>
            <p className="text-[10px] text-muted-foreground truncate">{currentTrack.saintName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
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

      {/* EXPANDED VIEW PORT PANEL */}
      {expanded && (
        <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto border-b border-saffron/10">
          {/* Synchronized Lyrics Display */}
          {showLyrics && (
            <div className="bg-cream dark:bg-background/50 rounded-xl p-3 border border-saffron/10 h-32 overflow-y-auto flex flex-col gap-2 scroll-smooth text-center">
              {currentTrack.lyrics.map((line, idx) => {
                const isActive = idx === activeLyricsIndex;
                return (
                  <p
                    key={idx}
                    className={`font-marathi text-sm transition-all duration-300 ${
                      isActive 
                        ? 'text-saffron font-bold scale-105 opacity-100' 
                        : 'text-muted-foreground/60 scale-95 opacity-50'
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })}
            </div>
          )}

          {/* Playlist selector / Queue */}
          {showQueue && (
            <div className="bg-background rounded-xl p-2 border border-saffron/10 space-y-1">
              <h5 className="text-[11px] font-bold text-muted-foreground px-2 pb-1 border-b border-border">पुढील गाणी (Queue)</h5>
              {playlist.map((track, idx) => (
                <button
                  key={track.id}
                  onClick={() => setCurrentTrackIndex(idx)}
                  className={`w-full text-left p-2 rounded text-xs font-marathi flex justify-between transition-colors ${
                    idx === currentTrackIndex ? 'bg-saffron/10 text-saffron font-bold' : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span>{track.titleMarathi}</span>
                  <span className="text-[10px] text-muted-foreground">{track.saintName.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Dynamic Waveform Visualizer */}
          <canvas ref={canvasRef} className="w-full h-10 rounded-lg bg-background/20" />
        </div>
      )}

      {/* FOOTER CORE PLAYER STRIP */}
      <div className="p-4 bg-card space-y-3">
        {/* Timeline Slider */}
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

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowQueue(!showQueue)} 
              className={`p-1.5 rounded-lg border transition-colors ${showQueue ? 'bg-saffron/10 border-saffron/30 text-saffron' : 'border-border hover:bg-muted text-foreground'}`}
              title="प्लेलिस्ट दाखवा"
            >
              <ListMusic className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowLyrics(!showLyrics)} 
              className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${showLyrics ? 'bg-saffron/10 border-saffron/30 text-saffron' : 'border-border hover:bg-muted text-foreground'}`}
            >
              मजकूर (Lyrics)
            </button>
          </div>

          {/* Core play triggers */}
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="p-1 hover:bg-muted rounded text-foreground">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-saffron text-white flex items-center justify-center shadow hover:scale-105 active:scale-95 transition-transform"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white text-white" /> : <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />}
            </button>
            <button onClick={handleNext} className="p-1 hover:bg-muted rounded text-foreground">
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Volume controls */}
          <div className="flex items-center gap-2 group/volume relative">
            <button onClick={toggleMute} className="p-1 hover:bg-muted rounded text-foreground">
              {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-saffron" />}
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
