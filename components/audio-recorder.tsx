'use client';

import * as React from 'react';
import { Mic, Square, Play, Pause, Trash2, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  /** Called with the finished recording once the user stops. */
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  /** Called when the user discards a recording before submitting it. */
  onDiscard?: () => void;
  disabled?: boolean;
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * In-browser voice recorder using the native MediaRecorder API.
 * Start → live level meter + timer → Stop → local playback preview →
 * caller decides when to submit (upload) or discard.
 */
export function AudioRecorder({ onRecordingComplete, onDiscard, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [level, setLevel] = React.useState(0);
  const [recordedBlob, setRecordedBlob] = React.useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = React.useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [permissionState, setPermissionState] = React.useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const levelFrameRef = React.useRef<number | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const cleanupStream = React.useCallback(() => {
    if (levelFrameRef.current) cancelAnimationFrame(levelFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  }, []);

  React.useEffect(() => () => cleanupStream(), [cleanupStream]);

  const monitorLevel = React.useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
    setLevel(Math.min(1, avg / 128));
    levelFrameRef.current = requestAnimationFrame(monitorLevel);
  }, []);

  const startRecording = async () => {
    setError(null);
    setPermissionState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionState('granted');

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      monitorLevel();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        cleanupStream();
        // Lift the finished recording to the parent immediately — the parent
        // page's own submit button (not a second button here) triggers upload.
        setElapsedSecondsSnapshotAndNotify(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setElapsedSeconds(0);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setPermissionState('denied');
      setError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'मायक्रोफोन परवानगी नाकारली गेली. कृपया ब्राउझर सेटिंग्जमध्ये परवानगी द्या.'
          : 'मायक्रोफोन सुरू करता आले नाही. कृपया पुन्हा प्रयत्न करा.'
      );
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Captures elapsedSeconds at the moment recording stops (state updates from
  // the interval may lag one tick behind the onstop event) and notifies the
  // parent that a finished recording is ready to be submitted.
  const elapsedSecondsRef = React.useRef(0);
  React.useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
  const setElapsedSecondsSnapshotAndNotify = (blob: Blob) => {
    onRecordingComplete(blob, elapsedSecondsRef.current);
  };

  const togglePause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (isPaused) {
      recorder.resume();
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else {
      recorder.pause();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setIsPaused((p) => !p);
  };

  const togglePreviewPlayback = () => {
    if (!previewAudioRef.current) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play().catch(() => {});
    }
  };

  const discard = () => {
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setElapsedSeconds(0);
    setIsPreviewPlaying(false);
    onDiscard?.();
  };

  // ── Recorded preview state ──
  if (recordedBlob && recordedUrl) {
    return (
      <div className="bg-card border border-saffron/10 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePreviewPlayback}
            className="w-12 h-12 rounded-full bg-saffron text-white flex items-center justify-center hover:bg-saffron/90 transition-colors flex-shrink-0"
            aria-label={isPreviewPlaying ? 'थांबवा' : 'ऐका'}
          >
            {isPreviewPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">रेकॉर्डिंग तयार आहे — खालील "अपलोड करा" बटनाने सादर करा</p>
            <p className="text-xs text-muted-foreground">कालावधी: {formatSeconds(elapsedSeconds)}</p>
          </div>
          <button
            type="button"
            onClick={discard}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors"
            aria-label="रेकॉर्डिंग काढून टाका"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
        <audio
          ref={previewAudioRef}
          src={recordedUrl}
          onPlay={() => setIsPreviewPlaying(true)}
          onPause={() => setIsPreviewPlaying(false)}
          onEnded={() => setIsPreviewPlaying(false)}
          className="hidden"
        />
      </div>
    );
  }

  // ── Recording / idle state ──
  return (
    <div className="bg-card border border-saffron/10 rounded-2xl p-6 space-y-5 shadow-sm text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isRecording ? 'bg-red-500/10' : 'bg-saffron/10'
            }`}
            style={
              isRecording
                ? { boxShadow: `0 0 0 ${8 + level * 20}px rgba(239, 68, 68, ${0.05 + level * 0.15})` }
                : undefined
            }
          >
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled || permissionState === 'requesting'}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${
                isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-saffron hover:bg-saffron/90'
              } text-white shadow-lg`}
              aria-label={isRecording ? 'रेकॉर्डिंग थांबवा' : 'रेकॉर्डिंग सुरू करा'}
            >
              {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-7 h-7" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-mono font-bold text-foreground tabular-nums">
            {formatSeconds(elapsedSeconds)}
          </p>
          <p className="text-sm text-muted-foreground">
            {permissionState === 'requesting'
              ? 'मायक्रोफोन परवानगीची वाट पाहत आहे...'
              : isRecording
                ? isPaused ? 'थांबवले आहे' : 'रेकॉर्डिंग चालू आहे...'
                : 'रेकॉर्डिंग सुरू करण्यासाठी मायक्रोफोन बटण दाबा'}
          </p>
        </div>

        {isRecording && (
          <button
            type="button"
            onClick={togglePause}
            className="text-sm font-medium text-saffron hover:underline flex items-center gap-1"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'सुरू ठेवा' : 'थांबवा (Pause)'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 flex gap-2 items-start text-sm text-red-600 dark:text-red-400 text-left">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        तुमचा आवाज फक्त रेकॉर्डिंग सुरू असताना कॅप्चर होतो. सबमिट केल्यानंतर, लिरिक्स आपोआप मजकुरात रूपांतरित होतील
        आणि पुनरावलोकनासाठी पाठवले जातील.
      </p>
    </div>
  );
}
