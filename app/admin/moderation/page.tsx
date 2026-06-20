'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { diffLines, DiffChunk } from '@/src/lib/diff';
import { Shield, Check, X, AlertTriangle, MessageSquare, Award, Clock } from 'lucide-react';

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
  volunteer: {
    name: string;
    reputation: number;
  };
  original: {
    title: string;
    text: string;
    meaning: string;
  };
  createdAt: string;
}

export default function ModerationDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<ModerationItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch pending queue list
  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/acquire/moderation/list');
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.items);
        if (data.items.length > 0) {
          setSelectedItem(data.items[0]);
        } else {
          setSelectedItem(null);
        }
      } else {
        console.error('Failed to load queue:', data.error);
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (!['MODERATOR', 'ADMIN'].includes(role)) {
        // Gated: not permitted
        return;
      }
      fetchQueue();
    }
  }, [sessionStatus, session]);

  // 2. Auth Gate Handler
  if (sessionStatus === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1c080b] text-[#f7e8cf]">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#e35f24] border-t-transparent mx-auto"></div>
          <p className="mt-4 font-semibold text-lg">द्वार उघडत आहे (लोड होत आहे)...</p>
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
          <Shield className="h-16 w-16 text-[#e35f24] mx-auto mb-4 animate-bounce" />
          <h1 className="text-2xl font-bold text-[#f7e8cf] mb-2">प्रवेश मर्यादित आहे (Access Denied)</h1>
          <p className="text-sm text-[#e5a93c]/80 mb-6">
            या पानावर प्रवेश करण्यासाठी तुमच्याकडे संपादक किंवा प्रशासक अधिकार असणे आवश्यक आहे.
          </p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e35f24] to-[#c84615] text-[#f7e8cf] font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all duration-200"
          >
            लॉगिन करा (Sign In)
          </button>
        </div>
      </div>
    );
  }

  // 3. Cast Peer Vote Action Handler
  const handleVote = async (vote: 'approve' | 'reject' | 'flag') => {
    if (!selectedItem) return;
    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch('/api/acquire/moderation/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId: selectedItem.id,
          vote,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `तुमचे मत यशस्वीरित्या नोंदवले गेले (${vote === 'approve' ? 'मंजूर' : vote === 'reject' ? 'अस्वीकृत' : 'चिन्हांकित'}).` });
        setNotes('');
        // Refresh queue
        await fetchQueue();
      } else {
        setMessage({ type: 'error', text: data.error || 'मत नोंदवताना त्रुटी आढळली.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'नेटवर्क जोडणी अयशस्वी झाली.' });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Render Diff Text Blocks helper
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

  return (
    <div className="min-h-screen bg-[#130406] text-[#f7e8cf] font-sans antialiased">
      {/* Top Banner Header */}
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
        </div>
      </header>

      {/* Main Split Grid */}
      <div className="flex h-[calc(100vh-73px)] overflow-hidden">
        {/* Left Sidebar - Queue list */}
        <aside className="w-80 border-r border-[#e5a93c]/10 bg-[#1c080b]/40 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-[#e5a93c]/10 bg-[#1c080b]/60 flex items-center justify-between">
            <h2 className="font-bold text-sm text-[#e5a93c] uppercase tracking-wider flex items-center">
              <Clock className="h-4 w-4 mr-2" /> प्रलंबित कामे ({items.length})
            </h2>
            <button
              onClick={fetchQueue}
              className="text-xs px-2.5 py-1 rounded bg-[#e35f24]/10 hover:bg-[#e35f24]/20 border border-[#e35f24]/20 text-[#e35f24] transition-all"
            >
              रीफ्रेश
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#e5a93c]/5">
            {loading ? (
              <div className="p-8 text-center text-sm text-[#e5a93c]/60">पडताळणी सूची उघडत आहे...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#e5a93c]/60">सध्या पडताळणीसाठी कोणतीही विनंती प्रलंबित नाही.</div>
            ) : (
              items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setMessage(null);
                    }}
                    className={`w-full text-left p-4 hover:bg-[#e35f24]/5 transition-all duration-150 relative ${
                      isSelected ? 'bg-[#e35f24]/10 border-l-4 border-[#e35f24]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        item.sourceType === 'ocr' 
                          ? 'bg-blue-950/80 text-blue-400 border border-blue-900/50' 
                          : 'bg-amber-950/80 text-amber-400 border border-amber-900/50'
                      }`}>
                        {item.sourceType === 'ocr' ? 'Manuscript OCR' : 'Edit Suggestion'}
                      </span>
                      <span className="text-[10px] text-[#e5a93c]/50">
                        {new Date(item.createdAt).toLocaleDateString('mr-IN')}
                      </span>
                    </div>
                    <h3 className="font-bold text-[#f7e8cf] text-sm truncate mb-1">{item.draftTitle}</h3>
                    <div className="flex items-center justify-between text-xs text-[#e5a93c]/70">
                      <span>{item.volunteer.name}</span>
                      <span className="flex items-center text-[10px] text-emerald-500 font-bold">
                        <Award className="h-3 w-3 mr-0.5" /> Rep: {item.volunteer.reputation}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Main Panel - Selected Item Diff & Actions */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#130406]/90 flex flex-col justify-between">
          {selectedItem ? (
            <div className="space-y-6">
              {/* Item Info Header */}
              <div className="p-4 rounded-xl bg-[#2d1115]/50 border border-[#e5a93c]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#e5a93c] mb-1">{selectedItem.draftTitle}</h2>
                  <p className="text-xs text-[#f7e8cf]/60">
                    सादरकर्ता: <strong className="text-[#f7e8cf]">{selectedItem.volunteer.name}</strong> | प्रतिष्ठा गुण: <strong className="text-emerald-400">{selectedItem.volunteer.reputation}</strong> | पडताळणी टप्पा: <strong className="text-[#e35f24]">Tier {selectedItem.tier} (Consensus Score: {selectedItem.consensusScore})</strong>
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedItem.status === 'flagged' ? 'bg-rose-950 text-rose-400 border border-rose-900' : 'bg-amber-950 text-amber-400 border border-amber-900'
                  }`}>
                    {selectedItem.status === 'flagged' ? 'AI Flagged' : 'Pending Verification'}
                  </span>
                </div>
              </div>

              {/* Toast Message Notification */}
              {message && (
                <div className={`p-4 rounded-xl text-sm font-semibold border ${
                  message.type === 'success' ? 'bg-emerald-950/80 border-emerald-900 text-emerald-400' : 'bg-rose-950/80 border-rose-900 text-rose-400'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Side-by-Side Comparison Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: Current Database Content */}
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold uppercase text-[#e5a93c] tracking-wider flex items-center">
                    मूळ प्रत (Current Database)
                  </h3>
                  {selectedItem.sourceType === 'ocr' ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 h-[250px] border border-dashed border-[#e5a93c]/20 rounded-2xl bg-[#1c080b]/30">
                      <p className="text-sm text-[#e5a93c]/50 italic">
                        नवीन ओसीआर हस्तलिखित अपलोड आहे. डेटाबेसमध्ये कोणतीही मूळ आवृत्ती अस्तित्वात नाही.
                      </p>
                    </div>
                  ) : (
                    <div className="font-mono text-sm leading-relaxed p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/5 max-h-[500px] overflow-y-auto whitespace-pre-wrap text-[#f7e8cf]/60">
                      {selectedItem.original.text || 'रिकामी मजकूर'}
                    </div>
                  )}
                </div>

                {/* Right Side: Proposed Draft with Diff Highlighting */}
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold uppercase text-emerald-400 tracking-wider flex items-center">
                    सुधारित मसुदा (Proposed Draft Visual Diff)
                  </h3>
                  {selectedItem.sourceType === 'ocr' ? (
                    <div className="font-mono text-sm leading-relaxed p-4 rounded-xl bg-[#1c080b]/60 border border-emerald-500/20 max-h-[500px] overflow-y-auto whitespace-pre-wrap text-emerald-300">
                      {selectedItem.draftText}
                    </div>
                  ) : (
                    renderTextDiff(selectedItem.original.text, selectedItem.draftText)
                  )}
                </div>
              </div>

              {/* Meaning difference section */}
              {selectedItem.draftMeaning && (
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold uppercase text-[#e5a93c] tracking-wider">
                    अर्थ मसुदा (Meaning / Translation Draft)
                  </h3>
                  <div className="p-4 rounded-xl bg-[#1c080b]/40 border border-[#e5a93c]/10 text-sm">
                    {selectedItem.draftMeaning}
                  </div>
                </div>
              )}

              {/* Voting and review section */}
              <div className="p-6 rounded-2xl bg-[#1c080b]/80 border border-[#e35f24]/20 space-y-4">
                <h3 className="text-base font-bold text-[#e5a93c] flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-[#e35f24]" /> पुनरावलोकन अभिप्राय (Submit Review & Vote)
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="सुधारणेबद्दल आपले मत किंवा त्रुटींची नोंद लिहा..."
                  className="w-full h-24 p-3 rounded-xl bg-[#130406] border border-[#e5a93c]/20 text-[#f7e8cf] focus:outline-none focus:border-[#e35f24] transition-all text-sm"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleVote('approve')}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold flex items-center shadow-lg transition-all text-sm disabled:opacity-50"
                  >
                    <Check className="h-4 w-4 mr-2" /> मंजूर करा (Approve)
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleVote('reject')}
                    className="px-6 py-3 rounded-xl bg-[#5a1218] hover:bg-[#721b22] active:scale-95 text-white font-bold flex items-center shadow-lg transition-all text-sm disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-2" /> नाकारून टाका (Reject)
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleVote('flag')}
                    className="px-6 py-3 rounded-xl bg-[#b0700d] hover:bg-[#c98314] active:scale-95 text-white font-bold flex items-center shadow-lg transition-all text-sm disabled:opacity-50"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" /> चिन्हांकित करा (Flag)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full max-w-md mx-auto py-12">
              <Shield className="h-16 w-16 text-[#e5a93c]/30 mb-4" />
              <h2 className="text-lg font-bold text-[#e5a93c]/80 mb-2">कोणतेही प्रलंबित काम निवडलेले नाही</h2>
              <p className="text-xs text-[#e5a93c]/50">
                पडताळणी सुरू करण्यासाठी डाव्या बाजूच्या सूचीमधील कोणत्याही कामावर क्लिक करा.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
