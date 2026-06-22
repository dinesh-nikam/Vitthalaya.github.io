'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User, Trophy, GitPullRequest, BookOpen,
  Clock, CheckCircle, XCircle, Loader2, ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProfileData {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    imageUrl: string | null;
    bio: string | null;
    role: string;
    reputationScore: number;
    memberSince: string;
    totalCorrections: number;
    totalVersions: number;
    collectionsCount: number;
    correctionStats: Record<string, number>;
  };
  corrections: {
    id: string;
    fieldPath: string;
    oldValue: string | null;
    newValue: string;
    reason: string | null;
    status: string;
    createdAt: string;
    reviewedAt: string | null;
    composition: { id: string; titleMarathi: string; slug: string } | null;
    reviewer: { id: string; name: string | null } | null;
  }[];
  versions: {
    id: string;
    versionNumber: number;
    changeReason: string;
    createdAt: string;
    composition: { id: string; titleMarathi: string; slug: string } | null;
  }[];
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'मसुदा', className: 'bg-gray-100 text-gray-600' },
  submitted: { label: 'प्रस्तावित', className: 'bg-blue-100 text-blue-700' },
  in_review: { label: 'पुनरावलोकनाधीन', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'मंजूर', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'नाकारले', className: 'bg-red-100 text-red-700' },
};

const REASON_LABELS: Record<string, string> = {
  initial: 'प्रारंभिक',
  correction: 'दुरुस्ती',
  editorial: 'संपादकीय',
  revert: 'परतावा',
};

export default function ProfileClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/community/profile/${userId}?limit=50`)
      .then((r) => {
        if (!r.ok) throw new Error('Profile not found');
        return r.json();
      })
      .then((json) => {
        setData(json);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{error || 'प्रोफाइल आढळले नाही'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-saffron hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> मागे जा
        </button>
      </div>
    );
  }

  const { user, corrections, versions } = data;
  const approvedCount = user.correctionStats?.approved || 0;
  const submittedCount = user.correctionStats?.submitted || 0;

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="text-sm text-muted-foreground hover:text-saffron inline-flex items-center gap-1 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> मागे
      </button>

      {/* Profile header */}
      <div className="bg-card rounded-xl border border-saffron/10 p-6 mb-8">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-saffron/10 flex items-center justify-center shrink-0 overflow-hidden">
            {user.imageUrl ? (
              <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-saffron" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-marathiHeading text-maroon mb-1">
              {user.name || 'अज्ञात वापरकर्ता'}
            </h1>
            {user.bio && <p className="text-sm text-muted-foreground mb-2">{user.bio}</p>}
            {user.role === 'ADMIN' && (
              <span className="inline-flex text-xs px-2 py-0.5 rounded bg-saffron/10 text-saffron">
                प्रशासक
              </span>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              <Clock className="w-3 h-3 inline mr-1" />
              {new Date(user.memberSince).toLocaleDateString('mr-IN')} पासून सदस्य
            </p>
          </div>

          {/* Reputation score */}
          <div className="text-center shrink-0">
            <div className="text-3xl font-bold text-maroon">{user.reputationScore}</div>
            <div className="text-xs text-muted-foreground">गुण</div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<GitPullRequest />} label="एकूण दुरुस्त्या" value={user.totalCorrections} />
        <StatCard icon={<CheckCircle />} label="मंजूर" value={approvedCount} />
        <StatCard icon={<BookOpen />} label="आवृत्त्या" value={user.totalVersions} />
        <StatCard icon={<Trophy />} label="संग्रह" value={user.collectionsCount} />
      </div>

      {/* Tabs: Corrections + Versions */}
      <div className="space-y-8">
        {/* Recent corrections */}
        <section>
          <h2 className="text-lg font-marathiHeading text-maroon mb-4 flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-saffron" />
            अलीकडील दुरुस्त्या
          </h2>
          {corrections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">अद्याप कोणतीही दुरुस्ती नाही</p>
          ) : (
            <div className="space-y-2">
              {corrections.map((c) => (
                <div key={c.id} className="bg-card rounded-lg border border-saffron/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/abhang/${c.composition?.slug}`}
                        className="text-sm font-medium text-foreground hover:text-saffron truncate block"
                      >
                        {c.composition?.titleMarathi || 'अज्ञात रचना'}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        क्षेत्र: {c.fieldPath}
                        {c.reason && ` — ${c.reason}`}
                      </p>
                      {c.reviewer && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          पुनरावलोकन: {c.reviewer.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                          STATUS_BADGES[c.status]?.className || 'bg-gray-100'
                        }`}
                      >
                        {STATUS_BADGES[c.status]?.label || c.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(c.createdAt).toLocaleDateString('mr-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Versions contributed */}
        <section>
          <h2 className="text-lg font-marathiHeading text-maroon mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-saffron" />
            आवृत्ती योगदाने
          </h2>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">अद्याप कोणतेही आवृत्ती योगदान नाही</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="bg-card rounded-lg border border-saffron/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/abhang/${v.composition?.slug}`}
                        className="text-sm font-medium text-foreground hover:text-saffron truncate block"
                      >
                        {v.composition?.titleMarathi || 'अज्ञात रचना'}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        v{v.versionNumber} — {REASON_LABELS[v.changeReason] || v.changeReason}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(v.createdAt).toLocaleDateString('mr-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-card rounded-lg border border-saffron/10 p-4 text-center">
      <div className="w-6 h-6 mx-auto mb-1.5 text-saffron">{icon}</div>
      <div className="text-xl font-bold text-maroon">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
