import type { ReactNode } from 'react';

export interface AudioDashboardStats {
  recordings: {
    total: number;
    completed: number;
    transcribing: number;
    failed: number;
    needsReview: number;
  };
  jobs: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  lowConfidence: number;
  rights: {
    total: number;
    withConsent: number;
    withPublicationPermission: number;
    byStatus: Record<string, number>;
  };
  matches: Record<string, number>;
  modelVersions: number;
  corrections: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface AudioRecordingItem {
  id: string;
  originalName: string;
  processingStatus: string;
  processingSteps: string | null;
  extractionConfidence: number | null;
  extractedText: string | null;
  createdAt: string;
  user?: {
    name: string | null;
    email: string | null;
  } | null;
  rightsRecord?: {
    id: string;
    rightsStatus: string;
    consentGranted: boolean;
    publicationPermission: boolean;
    attribution: string | null;
  } | null;
  moderationQueue?: Array<{
    id: string;
    status: string;
    sourceType?: string;
  }>;
}

export interface ProcessingJobItem {
  id: string;
  kind: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  createdAt: string;
  upload?: {
    id: string;
    originalName: string;
  } | null;
}

export interface FailedUploadItem {
  id: string;
  originalName: string;
  processingStatus: string;
  format: string;
  createdAt: string;
  user?: {
    name: string | null;
    email: string | null;
  } | null;
}

export interface LowConfidenceItem {
  id: string;
  originalName: string;
  extractionConfidence: number | null;
  extractedText: string | null;
  createdAt: string;
  user?: {
    name: string | null;
    email: string | null;
  } | null;
}

export interface RightsRecordItem {
  id: string;
  rightsStatus: string;
  consentGranted: boolean;
  publicationPermission: boolean;
  attribution: string | null;
  createdAt: string;
  user?: {
    name: string | null;
    email: string | null;
  } | null;
  upload?: {
    id: string;
    originalName: string;
  } | null;
}

export interface TranscriptCorrectionItem {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  confidence: number | null;
  errorType: string;
  diffJson: string | null;
  originalAsr: string | null;
  correctedText: string | null;
  canonicalText?: string | null;
  modelVersion: string | null;
  createdAt: string;
  notes?: string | null;
  verifier?: {
    name: string | null;
    email: string | null;
  } | null;
  upload?: {
    id: string;
    originalName: string;
    user?: {
      name: string | null;
      email: string | null;
    } | null;
    moderationQueue?: Array<{
      id: string;
      status: string;
      sourceType?: string;
    }>;
  } | null;
}

export interface ModelRegistryData {
  activeAsr?: {
    modelName: string;
    version: string;
  } | null;
  gateThresholds?: {
    wer: number;
    cer: number;
  };
  models: Array<{
    id: string;
    modelName: string;
    version: string;
    versionKey: string;
    modelType: string;
    provider: string;
    notes?: string | null;
    status: 'active' | 'candidate' | 'rolled_back' | 'retired' | string;
    latestRun?: {
      status: 'passed' | 'failed' | 'running' | string;
      wer: number | null;
      cer: number | null;
      samplesEvaluated: number;
      datasetName?: string;
    } | null;
  }>;
  datasets?: Array<{
    id: string;
    name: string;
    version: string;
    status: string;
    datasetType: string;
    sampleCount: number;
    createdAt?: string;
    description?: string | null;
  }>;
  recentRuns?: Array<{
    id: string;
    modelName: string;
    version: string;
    datasetName?: string;
    createdAt: string;
    status: string;
    wer: number | null;
    cer: number | null;
    samplesEvaluated: number;
    baseline?: {
      wer: number;
    } | null;
  }>;
}

export interface AudioDashboardData {
  success: boolean;
  stats: AudioDashboardStats;
  recordings: AudioRecordingItem[];
  processingQueue: ProcessingJobItem[];
  failedUploads: FailedUploadItem[];
  lowConfidence: LowConfidenceItem[];
  rightsRecords: RightsRecordItem[];
  modelVersions: unknown[];
  corrections: TranscriptCorrectionItem[];
  pipelineVersions: string[];
  audioQuality: { analyzedCount: number; avgLoudnessMeanDb: number } | null;
  discovery: {
    compositionsBySource: Record<string, number>;
    topSources: { source: string; count: number }[];
    reviewQueue: { total: number; ocr: number };
    variants: { total: number; ocrVariant: number; byReason: { reason: string; count: number }[] };
  };
  lowConfidenceThreshold: number;
}

export type TabId =
  | 'recordings'
  | 'processing'
  | 'failed'
  | 'lowconfidence'
  | 'rights'
  | 'models'
  | 'corrections'
  | 'discovery';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: ReactNode;
}

export interface WordDiff {
  original: string;
  corrected: string;
}

export interface LineAlignment {
  asr: string;
  canonical?: string;
  similarity?: number;
  corrected?: boolean;
  wordDiffs?: WordDiff[];
}
