'use client';

import { useState, useEffect } from 'react';
import { History, Loader2, ChevronDown, ChevronUp, User, Clock } from 'lucide-react';
import Link from 'next/link';

interface Version {
  id: string;
  versionNumber: number;
  changeReason: string;
  createdAt: string;
  createdBy: { id: string; name: string | null } | null;
  correction: {
    id: string;
    fieldPath: string;
    oldValue: string | null;
    newValue: string;
    reason: string | null;
  } | null;
}

interface Props {
  compositionId: string;
}

const REASON_LABELS: Record<string, string> = {
  initial: 'प्रारंभिक आवृत्ती',
  correction: 'दुरुस्ती',
  editorial: 'संपादकीय बदल',
  revert: 'परतावा',
};

const FIELD_LABELS: Record<string, string> = {
  fullText: 'संपूर्ण मजकूर',
  titleMarathi: 'शीर्षक (मराठी)',
  titleTranslit: 'शीर्षक (लिप्यंतर)',
  meaning: 'अर्थ',
  source: 'स्त्रोत',
};

export default function VersionHistory({ compositionId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || versions.length > 0) return;
    setIsLoading(true);
    setErrorMsg('');
    fetch(`/api/community/versions/${compositionId}?limit=50`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || 'Failed to fetch versions');
        }
        return r.json();
      })
      .then((data) => {
        setVersions(data.items || []);
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'माहिती मिळवताना त्रुटी आली');
        setIsLoading(false);
      });
  }, [isOpen, compositionId, versions.length]);

  return (
    <div className="bg-card rounded-lg border border-saffron/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-sm font-medium text-maroon"
      >
        <span className="flex items-center gap-2">
          <History className="w-4 h-4 text-saffron" />
          आवृत्ती इतिहास
          {versions.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({versions.length})</span>
          )}
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="border-t border-saffron/10 px-4 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-saffron" />
            </div>
          ) : errorMsg ? (
            <p className="text-sm text-red-600 py-6 text-center">
              {errorMsg}
            </p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              अद्याप कोणत्याही आवृत्त्या नाहीत
            </p>
          ) : (
            <div className="space-y-0 mt-3">
              {versions.map((version, index) => (
                <div key={version.id} className="relative pl-6 pb-4 last:pb-0">
                  {/* Timeline line */}
                  {index < versions.length - 1 && (
                    <div className="absolute left-[7px] top-4 bottom-0 w-px bg-saffron/20" />
                  )}
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 w-[15px] h-[15px] rounded-full bg-saffron/20 border-2 border-saffron flex items-center justify-center">
                    <div className="w-[5px] h-[5px] rounded-full bg-saffron" />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground">
                          v{version.versionNumber}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-saffron/5 text-saffron">
                          {REASON_LABELS[version.changeReason] || version.changeReason}
                        </span>
                      </div>

                      {/* Correction detail */}
                      {version.correction && (
                        <p className="text-xs text-muted-foreground mt-1">
                          क्षेत्र: {FIELD_LABELS[version.correction.fieldPath] || version.correction.fieldPath}
                          {version.correction.reason && ` — ${version.correction.reason}`}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {version.createdBy && (
                          <Link
                            href={`/profile/${version.createdBy.id}`}
                            className="inline-flex items-center gap-1 hover:text-saffron transition-colors"
                          >
                            <User className="w-3 h-3" />
                            {version.createdBy.name || 'अज्ञात'}
                          </Link>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(version.createdAt).toLocaleDateString('mr-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
