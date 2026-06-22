'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { diffLines, DiffChunk } from '@/src/lib/diff';
import {
  Shield, Check, X, AlertTriangle, MessageSquare, Award, Clock,
  Sparkles, User, Hash, BookOpen, Layers, Search, Filter,
  ChevronLeft, ChevronRight, RotateCw, Loader2,
  BarChart3, Send, Trash2, Reply, ListOrdered
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────

interface ModerationItem {
  id: string;
  sourceType: 'ocr' | 'suggestion';
  sourceId: string;
  draftTitle: string;
  draftText: string;
  draftMeaning: string | null;
  tier: number;
  consensusScore: number;
  status: string;
  statusReason: string | null;
  reviewCount: number;
  volunteer: { name: string; reputation: number };
  original: { title: string; text: string; meaning: string };
  classification: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ModStats {
  queue: { pending: number; approved: number; rejected: number; flagged: number; total: number };
  activity: { approvedToday: number; approvedThisWeek: number; approvedThisMonth: number; totalReviews: number };
  reviewers: { reviewerId: string; name: string; reputationScore: number; reviewCount: number }[];
  dailyTrend: { date: string; approved: number; rejected: number }[];
}

interface EditorialNote {
  id: string;
  queueId: string;
  authorId: string;
  content: string;
  parentNoteId: string | null;
  createdAt: string;
  author: { id: string; name: string | null; email: string; role: string };
}

// ── Helper Components ─────────────────────────────────

const Spinner = () => (
  <Loader2 className="h-4 w-4 animate-spin inline" />
);

const ConfidenceBadge = ({ level }: { level: string | null }) => {
  if (!level || level === 'null') return <span className="text-[10px] text-[#e5a93c]/40">—</span>;
  const colors: Record<string, string> = {
    high: 'bg-emerald-900/60 text-emerald-400 border-emerald-700',
    medium: 'bg-amber-900/60 text-amber-400 border-amber-700',
    low: 'bg-rose-900/60 text-rose-400 border-rose-700',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${colors[level] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {level}
    </span>
  );
};

// ── Main Dashboard ────────────────────────────────────

export default function ModerationDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'stats'>('queue');

  // Queue state
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    status: '',
    sourceType: '',
    q: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Batch select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [voteNotes, setVoteNotes] = useState('');
  const [notesPanel, setNotesPanel] = useState<EditorialNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Stats state
  const [stats, setStats] = useState<ModStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // History state
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyPagination, setHistoryPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Data Fetching ──────────────────────────────────

  const fetchQueue = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('limit', '20');
      if (filters.status) params.set('status', filters.status);
      if (filters.sourceType) params.set('sourceType', filters.sourceType);
      if (filters.q) params.set('q', filters.q);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const res = await fetch(`/api/acquire/moderation/list?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.items);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (items.length > 0) {
      const exists = items.find((i: ModerationItem) => i.id === selectedItem?.id);
      if (!exists) {
        setSelectedItem(items[0]);
      }
    } else {
      setSelectedItem(null);
    }
  }, [items, selectedItem?.id]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetch('/api/acquire/moderation/stats');
      const data = await res.json();
      if (res.ok && data.success) setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (pageNum = 1) => {
    try {
      setHistoryLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('limit', '20');
      if (filters.status && filters.status !== 'pending') params.set('status', filters.status);
      if (filters.sourceType) params.set('sourceType', filters.sourceType);
      if (filters.q) params.set('q', filters.q);

      const res = await fetch(`/api/acquire/moderation/history?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryItems(data.items);
        setHistoryPagination(data.pagination);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [filters]);

  // Fetch on mount
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    const role = (session?.user as any)?.role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) return;
    fetchQueue();
    fetchStats();
  }, [sessionStatus, session, fetchQueue, fetchStats]);

  // ── Notes ──────────────────────────────────────────

  const fetchNotes = useCallback(async (queueId: string) => {
    try {
      setNotesLoading(true);
      const res = await fetch(`/api/acquire/moderation/notes?queueId=${queueId}`);
      const data = await res.json();
      if (res.ok && data.success) setNotesPanel(data.notes);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  const handleAddNote = async () => {
    if (!selectedItem || !noteContent.trim()) return;
    try {
      const res = await fetch('/api/acquire/moderation/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId: selectedItem.id, content: noteContent.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotesPanel(prev => [...prev, data.note]);
        setNoteContent('');
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const handleReplyNote = async (parentNoteId: string) => {
    if (!selectedItem || !replyText.trim()) return;
    try {
      const res = await fetch('/api/acquire/moderation/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId: selectedItem.id, content: replyText.trim(), parentNoteId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotesPanel(prev => [...prev, data.note]);
        setReplyText('');
        setReplyToId(null);
      }
    } catch (err) {
      console.error('Error replying:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/acquire/moderation/notes?id=${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotesPanel(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // ── Vote / Batch Actions ──────────────────────────

  const handleVote = async (vote: 'approve' | 'reject' | 'flag') => {
    if (!selectedItem) return;
    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch('/api/acquire/moderation/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId: selectedItem.id, vote, notes: voteNotes }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `मत यशस्वीरित्या नोंदवले (${vote === 'approve' ? 'मंजूर' : vote === 'reject' ? 'अस्वीकृत' : 'चिन्हांकित'}).` });
        setVoteNotes('');
        setSelectedIds(prev => { const n = new Set(prev); n.delete(selectedItem.id); return n; });
        await fetchQueue(pagination.page);
        await fetchStats();
      } else {
        setMessage({ type: 'error', text: data.error || 'मत नोंदवताना त्रुटी.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'नेटवर्क जोडणी अयशस्वी.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchAction = async (action: 'approve' | 'reject' | 'flag') => {
    if (selectedIds.size === 0) return;
    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch('/api/acquire/moderation/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueIds: Array.from(selectedIds), action, notes: 'Batch action' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Batch ${action}: ${data.summary}` });
        setSelectedIds(new Set());
        await fetchQueue(pagination.page);
        await fetchStats();
      } else {
        setMessage({ type: 'error', text: data.error || 'Batch action failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'नेटवर्क जोडणी अयशस्वी.' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Selection Helpers ─────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  // ── Auth Gate ─────────────────────────────────────

  if (sessionStatus === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1c080b] text-[#f7e8cf]">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#e35f24] border-t-transparent mx-auto" />
          <p className="mt-4 font-semibold text-lg">द्वार उघडत आहे...</p>
        </div>
      </div>
    );
  }

  const role = (session?.user as any)?.role;
  const isAuthorized = ['MODERATOR', 'ADMIN'].includes(role);

  if (sessionStatus === 'unauthenticated' || !isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1c080b] px-4">
        <div className="max-w-md w-full rounded-2xl bg-[#2d1115] border border-[#e5a93c]/20 p-8 text-center shadow-2xl">
          <Shield className="h-16 w-16 text-[#e35f24] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#f7e8cf] mb-2">प्रवेश मर्यादित (Access Denied)</h1>
          <p className="text-sm text-[#e5a93c]/80 mb-6">संपादक किंवा प्रशासक अधिकार आवश्यक आहेत.</p>
          <button onClick={() => router.push('/auth/signin')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e35f24] to-[#c84615] text-[#f7e8cf] font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all">
            लॉगिन करा (Sign In)
          </button>
        </div>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────

  const renderTextDiff = (original: string, draft: string) => {
    const diffs = diffLines(original, draft);
    return (
      <div className="font-mono text-sm leading-relaxed p-4 rounded-xl bg-[#1c080b]/60 border border-[#e5a93c]/10 max-h-[500px] overflow-y-auto whitespace-pre-wrap">
        {diffs.map((chunk: DiffChunk, idx: number) => {
          let lineClass = 'text-[#f7e8cf]/80';
          let prefix = '  ';
          if (chunk.type === 'added') {
            lineClass = 'bg-[#153a21] text-[#76e897] px-2 py-0.5 rounded border-l-4 border-emerald-500';
            prefix = '+ ';
          } else if (chunk.type === 'removed') {
            lineClass = 'bg-[#401217] text-[#e87680] px-2 py-0.5 rounded border-l-4 border-rose-500 line-through';
            prefix = '- ';
          }
          return (
            <div key={idx} className={`${lineClass} my-0.5`}>
              {prefix}{chunk.value}
            </div>
          );
        })}
      </div>
    );
  };

  const renderClassification = (cls: Record<string, unknown> | null) => {
    if (!cls) return null;
    const typedCls = cls as Record<string, unknown> & {
      saintName?: string; compositionType?: string; deityName?: string;
      suggestedCategories?: string[]; associatedFestivals?: string[];
      language?: string; reasoning?: string;
      confidence?: { saint?: string; type?: string; deity?: string };
    };
    const hasData = typedCls.saintName || typedCls.compositionType || typedCls.deityName ||
      (typedCls.suggestedCategories?.length ?? 0) > 0;
    if (!hasData) return null;

    return (
      <div className="p-4 rounded-xl bg-[#1a0f2e]/80 border border-[#c9a227]/20 space-y-3">
        <h3 className="text-sm font-extrabold uppercase text-[#c9a227] tracking-wider flex items-center">
          <Sparkles className="h-4 w-4 mr-2 text-[#c9a227]" /> AI वर्गीकरण सूचना
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {typedCls.saintName && (
            <div className="flex items-center space-x-2 bg-[#130406]/60 p-2 rounded-lg border border-[#c9a227]/10">
              <User className="h-3.5 w-3.5 text-[#c9a227]/70 flex-shrink-0" />
              <span className="text-[#f7e8cf]/80">संत:</span>
              <span className="font-bold text-[#c9a227]">{typedCls.saintName}</span>
              <ConfidenceBadge level={typedCls.confidence?.saint ?? null} />
            </div>
          )}
          {typedCls.compositionType && (
            <div className="flex items-center space-x-2 bg-[#130406]/60 p-2 rounded-lg border border-[#c9a227]/10">
              <BookOpen className="h-3.5 w-3.5 text-[#c9a227]/70 flex-shrink-0" />
              <span className="text-[#f7e8cf]/80">प्रकार:</span>
              <span className="font-bold text-[#c9a227]">{typedCls.compositionType}</span>
              <ConfidenceBadge level={typedCls.confidence?.type ?? null} />
            </div>
          )}
          {typedCls.deityName && (
            <div className="flex items-center space-x-2 bg-[#130406]/60 p-2 rounded-lg border border-[#c9a227]/10">
              <Hash className="h-3.5 w-3.5 text-[#c9a227]/70 flex-shrink-0" />
              <span className="text-[#f7e8cf]/80">देवता:</span>
              <span className="font-bold text-[#c9a227]">{typedCls.deityName}</span>
              <ConfidenceBadge level={typedCls.confidence?.deity ?? null} />
            </div>
          )}
          {typedCls.language && typedCls.language !== 'other' && (
            <div className="flex items-center space-x-2 bg-[#130406]/60 p-2 rounded-lg border border-[#c9a227]/10">
              <span className="text-[#c9a227]/70 flex-shrink-0">🌐</span>
              <span className="text-[#f7e8cf]/80">भाषा:</span>
              <span className="font-bold text-[#c9a227]">{typedCls.language}</span>
            </div>
          )}
        </div>
        {(typedCls.suggestedCategories?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Layers className="h-3.5 w-3.5 text-[#c9a227]/70" />
            {typedCls.suggestedCategories!.map((cat, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[#c9a227]/10 border border-[#c9a227]/20 text-[#c9a227] font-medium">
                {cat}
              </span>
            ))}
          </div>
        )}
        {typedCls.reasoning && (
          <p className="text-[11px] text-[#f7e8cf]/50 italic border-t border-[#c9a227]/10 pt-2 mt-1">
            💡 {typedCls.reasoning}
          </p>
        )}
      </div>
    );
  };

  // ── Render Stats Tab ──────────────────────────────

  const renderStatsPanel = () => (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-bold text-[#e5a93c] flex items-center">
        <BarChart3 className="h-5 w-5 mr-2" /> पडताळणी आकडेवारी (Moderation Stats)
      </h2>

      {!stats && statsLoading && (
        <div className="text-center py-12 text-[#e5a93c]/60"><Spinner /> लोड करत आहे...</div>
      )}

      {stats && (
        <>
          {/* Queue Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#1c080b]/60 border border-[#e5a93c]/10">
              <p className="text-xs text-[#e5a93c]/60 uppercase tracking-wider">प्रलंबित</p>
              <p className="text-3xl font-bold text-[#e5a93c]">{stats.queue.pending}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1c080b]/60 border border-emerald-700/30">
              <p className="text-xs text-emerald-500/60 uppercase tracking-wider">मंजूर</p>
              <p className="text-3xl font-bold text-emerald-400">{stats.queue.approved}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1c080b]/60 border border-rose-700/30">
              <p className="text-xs text-rose-500/60 uppercase tracking-wider">नाकारले</p>
              <p className="text-3xl font-bold text-rose-400">{stats.queue.rejected}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1c080b]/60 border border-amber-700/30">
              <p className="text-xs text-amber-500/60 uppercase tracking-wider">चिन्हांकित</p>
              <p className="text-3xl font-bold text-amber-400">{stats.queue.flagged}</p>
            </div>
          </div>

          {/* Activity Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/5">
              <p className="text-xs text-[#f7e8cf]/60">आज मंजूर</p>
              <p className="text-2xl font-bold text-[#f7e8cf]">{stats.activity.approvedToday}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/5">
              <p className="text-xs text-[#f7e8cf]/60">आठवड्यात मंजूर</p>
              <p className="text-2xl font-bold text-[#f7e8cf]">{stats.activity.approvedThisWeek}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/5">
              <p className="text-xs text-[#f7e8cf]/60">महिन्यात मंजूर</p>
              <p className="text-2xl font-bold text-[#f7e8cf]">{stats.activity.approvedThisMonth}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/5">
              <p className="text-xs text-[#f7e8cf]/60">एकूण पुनरावलोकने</p>
              <p className="text-2xl font-bold text-[#f7e8cf]">{stats.activity.totalReviews}</p>
            </div>
          </div>

          {/* Daily Trend */}
          <div className="p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/10">
            <h3 className="text-sm font-bold text-[#e5a93c] mb-3">मागील 14 दिवसांचा कल (14-Day Trend)</h3>
            <div className="flex items-end gap-1 h-24">
              {stats.dailyTrend.map((day) => {
                const maxVal = Math.max(1, ...stats.dailyTrend.map(d => d.approved + d.rejected));
                const totalHeight = ((day.approved + day.rejected) / maxVal) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center justify-end relative group">
                    <div className="absolute -top-6 text-[9px] text-[#f7e8cf]/40 whitespace-nowrap hidden group-hover:block bg-[#1c080b] px-1 rounded">
                      {day.date}: +{day.approved}/-{day.rejected}
                    </div>
                    <div className="w-full flex flex-col items-center" style={{ height: `${Math.max(totalHeight, 2)}%` }}>
                      <div className="w-full bg-emerald-600/60 rounded-t-sm" style={{ height: `${(day.approved / maxVal) * 100}%` }} />
                      <div className="w-full bg-rose-600/60 rounded-b-sm" style={{ height: `${(day.rejected / maxVal) * 100}%` }} />
                    </div>
                    <span className="text-[8px] text-[#f7e8cf]/30 mt-0.5">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px]">
              <span className="flex items-center text-emerald-400"><span className="w-2 h-2 bg-emerald-500 rounded-sm mr-1" /> मंजूर</span>
              <span className="flex items-center text-rose-400"><span className="w-2 h-2 bg-rose-500 rounded-sm mr-1" /> नाकारले</span>
            </div>
          </div>

          {/* Top Reviewers */}
          {stats.reviewers.length > 0 && (
            <div className="p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/10">
              <h3 className="text-sm font-bold text-[#e5a93c] mb-3">शीर्ष पुनरावलोकनकर्ते (Top Reviewers)</h3>
              <div className="space-y-2">
                {stats.reviewers.map((r, i) => (
                  <div key={r.reviewerId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#130406]/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#e5a93c]/50 font-mono">#{i + 1}</span>
                      <span className="text-sm font-medium text-[#f7e8cf]">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-emerald-500"><Award className="h-3 w-3 inline mr-1" />{r.reputationScore}</span>
                      <span className="text-xs font-bold text-[#e5a93c]">{r.reviewCount} पुनरावलोकने</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Render History Tab ─────────────────────────────

  const renderHistoryPanel = () => (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold text-[#e5a93c] flex items-center">
        <Clock className="h-5 w-5 mr-2" /> पडताळणी इतिहास (Moderation History)
      </h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-3 py-1.5 rounded-lg bg-[#1c080b] border border-[#e5a93c]/20 text-[#f7e8cf] text-xs"
        >
          <option value="">सर्व स्थिती</option>
          <option value="approved">मंजूर</option>
          <option value="rejected">नाकारले</option>
          <option value="flagged">चिन्हांकित</option>
        </select>
        <input
          type="text"
          placeholder="शोधा..."
          value={filters.q}
          onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
          className="px-3 py-1.5 rounded-lg bg-[#1c080b] border border-[#e5a93c]/20 text-[#f7e8cf] text-xs w-48"
        />
        <button onClick={() => fetchHistory(1)}
          className="px-3 py-1.5 rounded-lg bg-[#e35f24]/10 hover:bg-[#e35f24]/20 border border-[#e35f24]/20 text-[#e35f24] text-xs transition-all">
          <Search className="h-3 w-3 inline mr-1" /> शोधा
        </button>
      </div>

      {historyLoading ? (
        <div className="text-center py-12 text-[#e5a93c]/60"><Spinner /> लोड करत आहे...</div>
      ) : historyItems.length === 0 ? (
        <div className="text-center py-12 text-[#e5a93c]/60">कोणतीही नोंद आढळली नाही.</div>
      ) : (
        <div className="space-y-2">
          {historyItems.map((item: any) => (
            <div key={item.id}
              className="p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/10 flex items-center justify-between hover:bg-[#1c080b]/60 transition-all">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#f7e8cf] text-sm truncate">{item.draftTitle}</h3>
                <p className="text-xs text-[#f7e8cf]/50 truncate">
                  {item.sourceType === 'ocr' ? '📄 Manuscript OCR' : '✏️ Edit Suggestion'} | स्वीकारले: {item.consensusScore}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  item.status === 'approved' ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700' :
                  item.status === 'rejected' ? 'bg-rose-900/60 text-rose-400 border border-rose-700' :
                  'bg-amber-900/60 text-amber-400 border border-amber-700'
                }`}>
                  {item.status === 'approved' ? 'मंजूर' : item.status === 'rejected' ? 'नाकारले' : 'चिन्हांकित'}
                </span>
                <span className="text-[10px] text-[#f7e8cf]/40">
                  {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString('mr-IN') : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Pagination */}
      {historyPagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={historyPagination.page <= 1}
            onClick={() => fetchHistory(historyPagination.page - 1)}
            className="px-3 py-1.5 rounded-lg bg-[#1c080b] border border-[#e5a93c]/20 text-[#f7e8cf] text-xs disabled:opacity-40">
            <ChevronLeft className="h-3 w-3 inline" /> मागील
          </button>
          <span className="text-xs text-[#e5a93c]/60">
            {historyPagination.page} / {historyPagination.totalPages}
          </span>
          <button disabled={historyPagination.page >= historyPagination.totalPages}
            onClick={() => fetchHistory(historyPagination.page + 1)}
            className="px-3 py-1.5 rounded-lg bg-[#1c080b] border border-[#e5a93c]/20 text-[#f7e8cf] text-xs disabled:opacity-40">
            पुढील <ChevronRight className="h-3 w-3 inline" />
          </button>
        </div>
      )}
    </div>
  );

  // ── Main Layout ────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#130406] text-[#f7e8cf] font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#1c080b]/90 backdrop-blur-md border-b border-[#e35f24]/20 px-6 py-4 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-[#e35f24]/10 border border-[#e35f24]/20">
            <Shield className="h-6 w-6 text-[#e35f24]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#e35f24] to-[#e5a93c]">
              वारकरी साहित्य पडताळणी कक्ष
            </h1>
            <p className="text-xs text-[#e5a93c]/70 font-medium">Digital Pandharpur Moderation Panel</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs px-3 py-1 rounded-full bg-[#e35f24]/20 border border-[#e35f24]/30 text-[#e35f24] font-bold">
            {role === 'ADMIN' ? 'प्रशासक' : 'संपादक'}
          </span>
          <span className="text-sm font-semibold">{session?.user?.name}</span>
          <button onClick={() => { fetchQueue(); fetchStats(); }}
            className="text-xs px-2.5 py-1 rounded bg-[#e35f24]/10 hover:bg-[#e35f24]/20 border border-[#e35f24]/20 text-[#e35f24] transition-all">
            <RotateCw className="h-3 w-3 inline mr-1" /> रीफ्रेश
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="px-6 pt-4 pb-0 border-b border-[#e5a93c]/10 bg-[#1c080b]/30">
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('queue')}
            className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'queue' ? 'text-[#e5a93c] border-[#e5a93c]' : 'text-[#f7e8cf]/50 border-transparent hover:text-[#f7e8cf]/80'
            }`}>
            <ListOrdered className="h-4 w-4 inline mr-1.5" /> प्रलंबित कामे ({pagination.total})
          </button>
          <button onClick={() => { setActiveTab('history'); fetchHistory(); }}
            className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'history' ? 'text-[#e5a93c] border-[#e5a93c]' : 'text-[#f7e8cf]/50 border-transparent hover:text-[#f7e8cf]/80'
            }`}>
            <Clock className="h-4 w-4 inline mr-1.5" /> इतिहास
          </button>
          <button onClick={() => { setActiveTab('stats'); fetchStats(); }}
            className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'stats' ? 'text-[#e5a93c] border-[#e5a93c]' : 'text-[#f7e8cf]/50 border-transparent hover:text-[#f7e8cf]/80'
            }`}>
            <BarChart3 className="h-4 w-4 inline mr-1.5" /> आकडेवारी
          </button>
        </div>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && renderStatsPanel()}

      {/* History Tab */}
      {activeTab === 'history' && renderHistoryPanel()}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <>
          {/* Stats Bar */}
          {stats && (
            <div className="px-6 py-3 bg-[#1c080b]/20 border-b border-[#e5a93c]/5">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="text-[#e5a93c] font-bold">📊 द्रुत आकडेवारी:</span>
                <span className="text-[#f7e8cf]/70">प्रलंबित: <strong className="text-[#e5a93c]">{stats.queue.pending}</strong></span>
                <span className="text-emerald-400">आज मंजूर: <strong>{stats.activity.approvedToday}</strong></span>
                <span className="text-rose-400">नाकारले: <strong>{stats.queue.rejected}</strong></span>
                <span className="text-amber-400">चिन्हांकित: <strong>{stats.queue.flagged}</strong></span>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="px-6 py-3 bg-[#1c080b]/30 border-b border-[#e5a93c]/5">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[#e5a93c]/60" />
              <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-2.5 py-1.5 rounded-lg bg-[#130406] border border-[#e5a93c]/15 text-[#f7e8cf] text-xs">
                <option value="">सर्व</option>
                <option value="pending">प्रलंबित</option>
                <option value="flagged">चिन्हांकित</option>
              </select>
              <select value={filters.sourceType} onChange={(e) => setFilters(prev => ({ ...prev, sourceType: e.target.value }))}
                className="px-2.5 py-1.5 rounded-lg bg-[#130406] border border-[#e5a93c]/15 text-[#f7e8cf] text-xs">
                <option value="">सर्व प्रकार</option>
                <option value="ocr">Manuscript OCR</option>
                <option value="suggestion">Edit Suggestion</option>
              </select>
              <input type="text" placeholder="शीर्षक किंवा मजकूर शोधा..."
                value={filters.q}
                onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                className="px-2.5 py-1.5 rounded-lg bg-[#130406] border border-[#e5a93c]/15 text-[#f7e8cf] text-xs w-48"
              />
              <button onClick={() => fetchQueue(1)}
                className="px-3 py-1.5 rounded-lg bg-[#e35f24]/10 hover:bg-[#e35f24]/20 border border-[#e35f24]/20 text-[#e35f24] text-xs transition-all">
                <Search className="h-3 w-3 inline mr-1" /> शोधा
              </button>
              <span className="text-[10px] text-[#e5a93c]/40 ml-auto">
                1-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
              </span>
            </div>
          </div>

          {/* Batch Action Bar */}
          {selectedIds.size > 0 && (
            <div className="px-6 py-2 bg-[#e35f24]/5 border-b border-[#e35f24]/20">
              <span className="text-xs text-[#f7e8cf]/80 mr-3">{selectedIds.size} निवडले:</span>
              <button disabled={actionLoading} onClick={() => handleBatchAction('approve')}
                className="px-2.5 py-1 rounded bg-emerald-700/40 hover:bg-emerald-700/60 text-emerald-300 text-xs mr-1 transition-all disabled:opacity-50">
                <Check className="h-3 w-3 inline mr-1" /> Batch Approve
              </button>
              <button disabled={actionLoading} onClick={() => handleBatchAction('reject')}
                className="px-2.5 py-1 rounded bg-rose-700/40 hover:bg-rose-700/60 text-rose-300 text-xs mr-1 transition-all disabled:opacity-50">
                <X className="h-3 w-3 inline mr-1" /> Batch Reject
              </button>
              <button disabled={actionLoading} onClick={() => handleBatchAction('flag')}
                className="px-2.5 py-1 rounded bg-amber-700/40 hover:bg-amber-700/60 text-amber-300 text-xs transition-all disabled:opacity-50">
                <AlertTriangle className="h-3 w-3 inline mr-1" /> Batch Flag
              </button>
              {actionLoading && <Spinner />}
            </div>
          )}

          {/* Main Split Grid */}
          <div className="flex h-[calc(100vh-73px-120px)] overflow-hidden">
            {/* Left Sidebar - Queue list */}
            <aside className="w-80 border-r border-[#e5a93c]/10 bg-[#1c080b]/40 flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-[#e5a93c]/10 bg-[#1c080b]/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedIds.size === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-[#e5a93c]/30 bg-[#130406] text-[#e35f24] focus:ring-0 cursor-pointer"
                  />
                  <h2 className="font-bold text-sm text-[#e5a93c] uppercase tracking-wider">
                    प्रलंबित कामे ({pagination.total})
                  </h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#e5a93c]/5">
                {loading ? (
                  <div className="p-8 text-center text-sm text-[#e5a93c]/60"><Spinner /> लोड करत आहे...</div>
                ) : items.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#e5a93c]/60">सध्या कोणतीही विनंती प्रलंबित नाही.</div>
                ) : (
                  items.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const isChecked = selectedIds.has(item.id);
                    return (
                      <div key={item.id}
                        className={`relative flex items-start p-3 hover:bg-[#e35f24]/5 transition-all duration-150 cursor-pointer ${
                          isSelected ? 'bg-[#e35f24]/10 border-l-4 border-[#e35f24]' : ''
                        }`}
                        onClick={() => { setSelectedItem(item); setMessage(null); setReplyToId(null); fetchNotes(item.id); }}
                      >
                        <input type="checkbox" checked={isChecked}
                          onChange={() => toggleSelect(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-3.5 h-3.5 mt-1 mr-2 rounded border-[#e5a93c]/30 bg-[#130406] text-[#e35f24] focus:ring-0 cursor-pointer flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              item.sourceType === 'ocr'
                                ? 'bg-blue-950/80 text-blue-400 border border-blue-900/50'
                                : 'bg-amber-950/80 text-amber-400 border border-amber-900/50'
                            }`}>
                              {item.sourceType === 'ocr' ? '📄 OCR' : '✏️ Edit'}
                            </span>
                            <span className="text-[9px] text-[#e5a93c]/50">
                              {new Date(item.createdAt).toLocaleDateString('mr-IN')}
                            </span>
                          </div>
                          <h3 className="font-bold text-[#f7e8cf] text-sm truncate mb-0.5">{item.draftTitle}</h3>
                          <div className="flex items-center justify-between text-xs text-[#e5a93c]/70">
                            <span className="truncate">{item.volunteer.name}</span>
                            <span className="flex items-center text-[9px] text-emerald-500 font-bold flex-shrink-0 ml-1">
                              <Award className="h-2.5 w-2.5 mr-0.5" /> {item.volunteer.reputation}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-3 border-t border-[#e5a93c]/10 bg-[#1c080b]/60 flex items-center justify-between">
                  <button disabled={pagination.page <= 1}
                    onClick={() => fetchQueue(pagination.page - 1)}
                    className="px-2 py-1 rounded bg-[#130406] border border-[#e5a93c]/15 text-[#f7e8cf] text-xs disabled:opacity-40">
                    <ChevronLeft className="h-3 w-3 inline" />
                  </button>
                  <span className="text-xs text-[#e5a93c]/60">{pagination.page} / {pagination.totalPages}</span>
                  <button disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchQueue(pagination.page + 1)}
                    className="px-2 py-1 rounded bg-[#130406] border border-[#e5a93c]/15 text-[#f7e8cf] text-xs disabled:opacity-40">
                    <ChevronRight className="h-3 w-3 inline" />
                  </button>
                </div>
              )}
            </aside>

            {/* Right Panel */}
            <main className="flex-1 overflow-y-auto p-6 bg-[#130406]/90">
              {selectedItem ? (
                <div className="space-y-6">
                  {/* Item Info + Toast */}
                  <div className="p-4 rounded-xl bg-[#2d1115]/50 border border-[#e5a93c]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-[#e5a93c] mb-1">{selectedItem.draftTitle}</h2>
                      <p className="text-xs text-[#f7e8cf]/60">
                        सादरकर्ता: <strong className="text-[#f7e8cf]">{selectedItem.volunteer.name}</strong> | प्रतिष्ठा: <strong className="text-emerald-400">{selectedItem.volunteer.reputation}</strong> | टप्पा: <strong className="text-[#e35f24]">Tier {selectedItem.tier}</strong> | स्वीकारले: <strong className="text-[#e5a93c]">{selectedItem.consensusScore}</strong>
                        {selectedItem.reviewCount > 0 && <> | पुनरावलोकने: <strong className="text-[#e5a93c]">{selectedItem.reviewCount}</strong></>}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedItem.statusReason && (
                        <span className="text-[10px] px-2 py-1 rounded bg-[#130406] border border-rose-800/30 text-rose-400 max-w-[200px] truncate" title={selectedItem.statusReason}>
                          ⚠️ {selectedItem.statusReason}
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedItem.status === 'flagged' ? 'bg-rose-950 text-rose-400 border border-rose-900' : 'bg-amber-950 text-amber-400 border border-amber-900'
                      }`}>
                        {selectedItem.status === 'flagged' ? '🚩 AI Flagged' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-xl text-sm font-semibold border ${
                      message.type === 'success' ? 'bg-emerald-950/80 border-emerald-900 text-emerald-400' : 'bg-rose-950/80 border-rose-900 text-rose-400'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  {/* Text Comparison */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-extrabold uppercase text-[#e5a93c] tracking-wider">मूळ प्रत</h3>
                      {selectedItem.sourceType === 'ocr' ? (
                        <div className="flex flex-col items-center justify-center text-center p-8 h-[250px] border border-dashed border-[#e5a93c]/20 rounded-2xl bg-[#1c080b]/30">
                          <p className="text-sm text-[#e5a93c]/50 italic">नवीन अपलोड — मूळ प्रत नाही.</p>
                        </div>
                      ) : (
                        <div className="font-mono text-sm leading-relaxed p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/5 max-h-[500px] overflow-y-auto whitespace-pre-wrap text-[#f7e8cf]/60">
                          {selectedItem.original.text || 'रिकामी मजकूर'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-extrabold uppercase text-emerald-400 tracking-wider">सुधारित मसुदा</h3>
                      {selectedItem.sourceType === 'ocr' ? (
                        <div className="font-mono text-sm leading-relaxed p-4 rounded-xl bg-[#1c080b]/60 border border-emerald-500/20 max-h-[500px] overflow-y-auto whitespace-pre-wrap text-emerald-300">
                          {selectedItem.draftText}
                        </div>
                      ) : (
                        renderTextDiff(selectedItem.original.text, selectedItem.draftText)
                      )}
                    </div>
                  </div>

                  {/* AI Classification */}
                  {renderClassification(selectedItem.classification)}

                  {/* Meaning */}
                  {selectedItem.draftMeaning && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-extrabold uppercase text-[#e5a93c] tracking-wider">अर्थ मसुदा</h3>
                      <div className="p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/10 text-sm">
                        {selectedItem.draftMeaning}
                      </div>
                    </div>
                  )}

                  {/* Editorial Notes Panel */}
                  <div className="p-4 rounded-2xl bg-[#1c080b]/80 border border-[#c9a227]/20">
                    <h3 className="text-base font-bold text-[#e5a93c] flex items-center mb-3">
                      <MessageSquare className="h-5 w-5 mr-2 text-[#e35f24]" /> संपादकीय नोंदी (Notes)
                    </h3>

                    {/* Add Note */}
                    <div className="flex gap-2 mb-4">
                      <input type="text" placeholder="नोंद लिहा..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#130406] border border-[#e5a93c]/20 text-[#f7e8cf] text-sm focus:outline-none focus:border-[#e35f24]"
                      />
                      <button onClick={handleAddNote} disabled={!noteContent.trim()}
                        className="px-4 py-2 rounded-lg bg-[#e35f24]/20 hover:bg-[#e35f24]/30 border border-[#e35f24]/30 text-[#e35f24] font-bold text-sm transition-all disabled:opacity-40">
                        <Send className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Notes List */}
                    {notesLoading ? (
                      <div className="text-center py-4 text-xs text-[#e5a93c]/60"><Spinner /> लोड करत आहे...</div>
                    ) : notesPanel.length === 0 ? (
                      <p className="text-center py-4 text-xs text-[#e5a93c]/40">अद्याप कोणत्याही नोंदी नाहीत.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {notesPanel.map((note) => (
                          <div key={note.id} className={`p-3 rounded-xl bg-[#130406]/60 border border-[#e5a93c]/10 ${note.parentNoteId ? 'ml-8 border-l-2 border-l-[#e35f24]/40' : ''}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-[#e5a93c]">
                                {note.author.name || 'Unknown'} {note.author.role === 'ADMIN' ? '(प्रशासक)' : ''}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-[#f7e8cf]/40">{new Date(note.createdAt).toLocaleString('mr-IN')}</span>
                                <button onClick={() => { setReplyToId(replyToId === note.id ? null : note.id); }}
                                  className="text-[10px] text-[#e5a93c]/60 hover:text-[#e5a93c]">
                                  <Reply className="h-3 w-3" />
                                </button>
                                <button onClick={() => handleDeleteNote(note.id)}
                                  className="text-[10px] text-rose-600/60 hover:text-rose-400">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-[#f7e8cf]/90">{note.content}</p>

                            {/* Reply input */}
                            {replyToId === note.id && (
                              <div className="flex gap-2 mt-2">
                                <input type="text" placeholder="उत्तर लिहा..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#130406] border border-[#e5a93c]/15 text-[#f7e8cf] text-xs focus:outline-none focus:border-[#e35f24]"
                                />
                                <button onClick={() => handleReplyNote(note.id)} disabled={!replyText.trim()}
                                  className="px-3 py-1.5 rounded-lg bg-[#e35f24]/10 border border-[#e35f24]/20 text-[#e35f24] text-xs transition-all disabled:opacity-40">
                                  <Reply className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vote Actions */}
                  <div className="p-6 rounded-2xl bg-[#1c080b]/80 border border-[#e35f24]/20 space-y-4">
                    <h3 className="text-base font-bold text-[#e5a93c] flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2 text-[#e35f24]" /> पुनरावलोकन आणि मतदान
                    </h3>
                    <textarea value={voteNotes}
                      onChange={(e) => setVoteNotes(e.target.value)}
                      placeholder="सुधारणेबद्दल आपले मत किंवा त्रुटींची नोंद लिहा..."
                      className="w-full h-24 p-3 rounded-xl bg-[#130406] border border-[#e5a93c]/20 text-[#f7e8cf] focus:outline-none focus:border-[#e35f24] transition-all text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button disabled={actionLoading} onClick={() => handleVote('approve')}
                        className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold flex items-center shadow-lg transition-all text-sm disabled:opacity-50">
                        {actionLoading ? <Spinner /> : <Check className="h-4 w-4 mr-2" />} मंजूर करा
                      </button>
                      <button disabled={actionLoading} onClick={() => handleVote('reject')}
                        className="px-6 py-3 rounded-xl bg-[#5a1218] hover:bg-[#721b22] active:scale-95 text-white font-bold flex items-center shadow-lg transition-all text-sm disabled:opacity-50">
                        {actionLoading ? <Spinner /> : <X className="h-4 w-4 mr-2" />} नाकारून टाका
                      </button>
                      <button disabled={actionLoading} onClick={() => handleVote('flag')}
                        className="px-6 py-3 rounded-xl bg-[#b0700d] hover:bg-[#c98314] active:scale-95 text-white font-bold flex items-center shadow-lg transition-all text-sm disabled:opacity-50">
                        {actionLoading ? <Spinner /> : <AlertTriangle className="h-4 w-4 mr-2" />} चिन्हांकित करा
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-full max-w-md mx-auto py-12">
                  <Shield className="h-16 w-16 text-[#e5a93c]/30 mb-4" />
                  <h2 className="text-lg font-bold text-[#e5a93c]/80 mb-2">कोणतेही प्रलंबित काम निवडलेले नाही</h2>
                  <p className="text-xs text-[#e5a93c]/50">डाव्या बाजूच्या सूचीमधील कोणत्याही कामावर क्लिक करा.</p>
                </div>
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
}
