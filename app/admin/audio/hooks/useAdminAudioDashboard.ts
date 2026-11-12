import * as React from 'react';
import type {
  AudioDashboardData,
  ModelRegistryData,
  TabId,
  TranscriptCorrectionItem,
} from '../types';

export function useAdminAudioDashboard(sessionStatus: 'authenticated' | 'loading' | 'unauthenticated') {
  const [data, setData] = React.useState<AudioDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabId>('recordings');
  const [retrying, setRetrying] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [corrFilter, setCorrFilter] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewing, setReviewing] = React.useState<TranscriptCorrectionItem | null>(null);
  const [verifyBusy, setVerifyBusy] = React.useState(false);
  const [verifyNotes, setVerifyNotes] = React.useState('');
  const [modelsData, setModelsData] = React.useState<ModelRegistryData | null>(null);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [modelsAction, setModelsAction] = React.useState<string | null>(null);

  const showToast = React.useCallback((message: string, durationMs = 4000) => {
    setToast(message);
    setTimeout(() => setToast(null), durationMs);
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/audio');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
        setError(null);
      } else {
        setError(json.error || 'डेटा मिळवता आला नाही.');
      }
    } catch {
      setError('नेटवर्क त्रुटी — पुन्हा प्रयत्न करा.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchData();
    }
  }, [sessionStatus, fetchData]);

  const fetchModels = React.useCallback(async () => {
    try {
      setModelsLoading(true);
      const res = await fetch('/api/admin/models');
      const json = await res.json();
      if (res.ok && json.success) {
        setModelsData(json);
      } else {
        showToast(json.error || 'मॉडेल डेटा मिळवता आला नाही.');
      }
    } catch {
      showToast('मॉडेल डेटा मिळवताना नेटवर्क त्रुटी.');
    } finally {
      setModelsLoading(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    if (sessionStatus === 'authenticated' && activeTab === 'models') {
      fetchModels();
    }
  }, [sessionStatus, activeTab, fetchModels]);

  const handleModelLifecycle = async (action: string, modelVersionId?: string) => {
    const key = `${action}:${modelVersionId ?? ''}`;
    setModelsAction(key);
    try {
      const res = await fetch('/api/admin/models/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          modelVersionId,
          modelName: 'candidate-asr',
          modelType: 'asr',
          version: '0',
          provider: 'custom',
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (action === 'activate') {
          showToast('मॉडेल सक्रिय — मूल्यांकन गेट उत्तीर्ण झाल्यानंतरच (कधीही आपोआप नाही).', 6000);
        } else if (action === 'rollback') {
          showToast('रोलबॅक झाला — मागील सक्रिय मॉडेल पुनर्स्थापित.', 6000);
        } else if (action === 'seed') {
          const g = json.golden?.created ?? [];
          const r = json.regression?.created ?? [];
          const gs = json.golden?.skipped ?? [];
          const rs = json.regression?.skipped ?? [];
          showToast(
            `डेटासेट: ${[...g, ...r].join(', ') || 'कोणतेही नवीन नाही'}${[...gs, ...rs].length ? ' · ' + [...gs, ...rs].join('; ') : ''}`,
            6000
          );
        } else {
          showToast('मॉडेल ऑपरेशन पूर्ण.', 6000);
        }
        fetchModels();
      } else {
        showToast(json.error || 'ऑपरेशन अयशस्वी.', 6000);
      }
    } catch {
      showToast('ऑपरेशन करताना त्रुटी.', 6000);
    } finally {
      setModelsAction(null);
    }
  };

  const handleEvaluate = async (modelVersionId: string) => {
    const key = `evaluate:${modelVersionId}`;
    setModelsAction(key);
    try {
      const res = await fetch('/api/admin/models/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelVersionId, mode: 'regression' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const ab = json.ab
          ? ` · A/B vs बेसलाइन: WER ${(json.ab.baselineWer * 100).toFixed(1)}% → ${(json.ab.candidateWer * 100).toFixed(1)}% (${json.ab.werDelta >= 0 ? '+' : ''}${(json.ab.werDelta * 100).toFixed(1)}%)`
          : '';
        showToast(
          `मूल्यांकन: ${json.status} — ${json.aggregate.samplesEvaluated} नमुने, WER ${(json.aggregate.wer * 100).toFixed(1)}%, CER ${(json.aggregate.cer * 100).toFixed(1)}%${ab}`,
          6000
        );
        fetchModels();
      } else {
        showToast(json.error || 'मूल्यांकन अयशस्वी.', 6000);
      }
    } catch {
      showToast('मूल्यांकन करताना त्रुटी.', 6000);
    } finally {
      setModelsAction(null);
    }
  };

  const handleRetry = async (jobId: string) => {
    setRetrying(jobId);
    try {
      const res = await fetch('/api/admin/audio/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast('जॉब पुन्हा रांगेत टाकला — प्रोसेसर लवकरच उचलेल.');
        fetchData();
      } else {
        showToast(json.error || 'रीट्राय अयशस्वी.');
      }
    } catch {
      showToast('रीट्राय करताना त्रुटी.');
    } finally {
      setRetrying(null);
    }
  };

  const handleVerify = async (action: 'approve' | 'reject') => {
    if (!reviewing) return;
    setVerifyBusy(true);
    try {
      const res = await fetch(`/api/admin/audio/corrections/${reviewing.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: verifyNotes.trim() || null }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          action === 'approve'
            ? 'सुधारणा मंजूर — आता प्रशिक्षण/मूल्यांकन लूपसाठी पात्र.'
            : 'सुधारणा नाकारली.'
        );
        setReviewing(null);
        setVerifyNotes('');
        fetchData();
      } else {
        showToast(json.error || 'पडताळणी अयशस्वी.');
      }
    } catch {
      showToast('पडताळणी करताना त्रुटी.');
    } finally {
      setVerifyBusy(false);
    }
  };

  return {
    data,
    loading,
    error,
    toast,
    activeTab,
    setActiveTab,
    retrying,
    corrFilter,
    setCorrFilter,
    reviewing,
    setReviewing,
    verifyBusy,
    verifyNotes,
    setVerifyNotes,
    modelsData,
    modelsLoading,
    modelsAction,
    fetchData,
    fetchModels,
    handleModelLifecycle,
    handleEvaluate,
    handleRetry,
    handleVerify,
  };
}
