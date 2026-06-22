'use client';

import { useState, useEffect, useRef } from 'react';
import { GitPullRequest, Send, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  compositionId: string;
  compositionTitle: string;
  /** If user is not logged in, prompt sign-in */
  isAuthenticated: boolean;
}

const VALID_FIELDS = [
  { value: 'fullText', label: 'संपूर्ण मजकूर' },
  { value: 'titleMarathi', label: 'शीर्षक (मराठी)' },
  { value: 'titleTranslit', label: 'शीर्षक (लिप्यंतर)' },
  { value: 'meaning', label: 'अर्थ' },
  { value: 'source', label: 'स्त्रोत' },
];

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function CorrectionPanel({ compositionId, compositionTitle, isAuthenticated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [fieldPath, setFieldPath] = useState('fullText');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleSubmit = async () => {
    if (!newValue.trim()) return;
    setStatus('submitting');
    setErrorMsg('');

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/community/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compositionId,
          fieldPath,
          newValue: newValue.trim(),
          reason: reason.trim() || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit correction');
      }

      setStatus('success');
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
        setStatus('idle');
        setNewValue('');
        setReason('');
      }, 2000);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-saffron/20 text-saffron hover:bg-saffron/5 transition-colors"
      >
        <GitPullRequest className="w-4 h-4" />
        दुरुस्ती सुचवा
      </button>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-card rounded-lg border border-saffron/10 p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-medium text-maroon flex items-center gap-1.5">
            <GitPullRequest className="w-4 h-4 text-saffron" />
            दुरुस्ती सुचवा
          </h3>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          दुरुस्ती सुचविण्यासाठी कृपया लॉगिन करा.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-saffron/10 p-4">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-maroon flex items-center gap-1.5">
          <GitPullRequest className="w-4 h-4 text-saffron" />
          दुरुस्ती सुचवा: {compositionTitle}
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {status === 'success' ? (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3">
          <CheckCircle className="w-5 h-5" />
          दुरुस्ती प्रस्तावित केली! पुनरावलोकनासाठी प्रतीक्षा करा.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Field selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              कोणता भाग दुरुस्त करायचा?
            </label>
            <select
              value={fieldPath}
              onChange={(e) => setFieldPath(e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded-lg border border-saffron/20 bg-background focus:outline-none focus:border-saffron/50"
            >
              {VALID_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>{field.label}</option>
              ))}
            </select>
          </div>

          {/* New value */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              सुधारित मजकूर
            </label>
            <textarea
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              rows={4}
              className="w-full text-sm px-3 py-2 rounded-lg border border-saffron/20 bg-background focus:outline-none focus:border-saffron/50 resize-y"
              placeholder="योग्य मजकूर येथे लिहा..."
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              कारण (वैकल्पिक)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded-lg border border-saffron/20 bg-background focus:outline-none focus:border-saffron/50"
              placeholder="या दुरुस्तीचे कारण..."
            />
          </div>

          {/* Error message */}
          {status === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMsg}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={status === 'submitting' || !newValue.trim()}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 bg-saffron text-white rounded-lg hover:bg-saffron/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            प्रस्तावित करा
          </button>
        </div>
      )}
    </div>
  );
}
