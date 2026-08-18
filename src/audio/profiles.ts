/**
 * Digital Pandharpur — Audio Enhancement Profiles
 *
 * Eight configurable processing profiles (spec §3). Each is a real ffmpeg
 * `-af` filter chain: noise reduction (afftdn), dereverberation approach
 * (highpass/lowpass shaping + deesser), volume normalization (loudnorm,
 * EBU R128), compression for dense group vocals, and a limiter for hot
 * outdoor recordings. Output is always 16 kHz mono PCM WAV — the optimal
 * shape for the Whisper ASR path.
 *
 * No profile claims "perfect" restoration; the pipeline reports what it did
 * and every result carries confidence + review instead.
 */

export interface EnhancementProfile {
  id: string;
  labelMarathi: string;
  labelEnglish: string;
  description: string;
  /** ffmpeg -af filter chain, applied in order. */
  filterChain: string;
}

const LOUD_CLEAN = 'loudnorm=I=-16:TP=-1.5:LRA=11';
const LOUD_LIVE = 'loudnorm=I=-14:TP=-1.5:LRA=13';

export const ENHANCEMENT_PROFILES: EnhancementProfile[] = [
  {
    id: 'clean_voice',
    labelMarathi: 'स्वच्छ आवाज',
    labelEnglish: 'Clean Voice',
    description: 'Balanced denoise + loudness for a clean solo voice recording.',
    filterChain: [
      'highpass=f=80',
      'lowpass=f=8000',
      'afftdn=nf=-25',
      'alimiter=limit=0.95',
      LOUD_CLEAN,
    ].join(','),
  },
  {
    id: 'temple_recording',
    labelMarathi: 'मंदिर रेकॉर्डिंग',
    labelEnglish: 'Temple Recording',
    description: 'Reduces roomy reverb tail and crowd murmur typical of temple recordings.',
    filterChain: [
      'highpass=f=120',
      'afftdn=nf=-18',
      'lowpass=f=9000',
      'deesser=i=20',
      LOUD_CLEAN,
    ].join(','),
  },
  {
    id: 'live_bhajan',
    labelMarathi: 'लाइव्ह भजन',
    labelEnglish: 'Live Bhajan',
    description: 'Keeps ambience, tames bleed and feedback-prone highs.',
    filterChain: [
      'highpass=f=90',
      'afftdn=nf=-15',
      'lowpass=f=9500',
      'alimiter=limit=0.9',
      LOUD_LIVE,
    ].join(','),
  },
  {
    id: 'kirtan',
    labelMarathi: 'कीर्तन',
    labelEnglish: 'Kirtan',
    description: 'Compresses dynamic call-and-response so soft and loud parts stay audible.',
    filterChain: [
      'highpass=f=85',
      'afftdn=nf=-17',
      'lowpass=f=10000',
      'acompressor=threshold=0.05:ratio=2:attack=20:release=250',
      LOUD_LIVE,
    ].join(','),
  },
  {
    id: 'group_singing',
    labelMarathi: 'समूह गायन',
    labelEnglish: 'Group Singing',
    description: 'Gentle compression for many voices; keeps the blend natural.',
    filterChain: [
      'highpass=f=80',
      'afftdn=nf=-12',
      'lowpass=f=11000',
      'acompressor=threshold=0.06:ratio=1.5:attack=20:release=250',
      LOUD_LIVE,
    ].join(','),
  },
  {
    id: 'outdoor_wari',
    labelMarathi: 'वारी (मोकळ्या हवेत)',
    labelEnglish: 'Outdoor Wari',
    description: 'Aggressive low-cut for wind/rumble plus a safety limiter for loud outdoor peaks.',
    filterChain: [
      'highpass=f=110',
      'afftdn=nf=-25',
      'lowpass=f=8000',
      'alimiter=limit=0.9',
      LOUD_CLEAN,
    ].join(','),
  },
  {
    id: 'home_recording',
    labelMarathi: 'घरगुती रेकॉर्डिंग',
    labelEnglish: 'Home Recording',
    description: 'Handles fan hum, room noise and plosives from built-in mics.',
    filterChain: [
      'highpass=f=100',
      'afftdn=nf=-22',
      'lowpass=f=9000',
      'deesser=i=15',
      LOUD_CLEAN,
    ].join(','),
  },
  {
    id: 'low_quality',
    labelMarathi: 'कमी दर्जाची रेकॉर्डिंग',
    labelEnglish: 'Low Quality Recording',
    description: 'Most aggressive restoration for very noisy captures; strongest noise reduction.',
    filterChain: [
      'highpass=f=130',
      'afftdn=nf=-30:nt=w',
      'lowpass=f=7500',
      'alimiter=limit=0.85',
      'loudnorm=I=-16:TP=-1.5:LRA=10',
    ].join(','),
  },
];

const PROFILE_MAP = new Map(ENHANCEMENT_PROFILES.map((p) => [p.id, p]));

export const DEFAULT_PROFILE_ID = 'clean_voice';

export function getProfile(profileId: string | null | undefined): EnhancementProfile {
  if (profileId && PROFILE_MAP.has(profileId)) {
    return PROFILE_MAP.get(profileId)!;
  }
  return PROFILE_MAP.get(DEFAULT_PROFILE_ID)!;
}
