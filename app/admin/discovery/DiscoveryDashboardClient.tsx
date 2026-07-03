'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Source {
  id: string;
  name: string;
  type: string;
  url: string;
  baseDomain: string;
  scraperType: string | null;
  scrapeInterval: number;
  rateLimitMs: number;
  robotsTxt: string | null;
  allowedPaths: string | null; // JSON string or null
  excludedPaths: string | null; // JSON string or null
  trustScore: number;
  totalCompositions: number;
  verifiedCompositions: number;
  errorRate: number;
  lastFetchAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  consecutiveErrors: number;
  license: string | null;
  requiresAttribution: boolean;
  attributionTemplate: string | null;
  status: string;
  isAutoDiscovered: boolean;
  tags: string | null;
  language: string;
  region: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DiscoveryJob {
  id: string;
  sourceId: string;
  type: string;
  status: string;
  trigger: string;
  itemsFound: number;
  itemsNew: number;
  itemsErrored: number;
  itemsDuplicates: number;
  durationMs: number;
  errorLog: string | null;
  resultSummary: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  source: {
    name: string;
    type: string;
  };
}

interface Alert {
  id: string;
  sourceId: string;
  sourceName: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  createdAt: string;
}

interface Stats {
  totalSources: number;
  activeSources: number;
  totalCompositions: number;
  totalVerified: number;
  avgTrustScore: number;
  statusCounts: Record<string, number>;
  compositionsToday: number;
}

interface DocNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DocNode[];
  fileType?: string;
}

interface ClientProps {
  initialStats: Stats;
  initialSources: Source[];
  initialJobs: DiscoveryJob[];
  initialAlerts: Alert[];
  initialDocTree?: DocNode[];
  initialDocFiles?: Record<string, { content: string; fileType: string }>;
}

export default function DiscoveryDashboardClient({
  initialStats,
  initialSources,
  initialJobs,
  initialAlerts,
  initialDocTree = [],
  initialDocFiles = {},
}: ClientProps) {
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'history' | 'docs'>('overview');

  // Core Data States
  const [stats, setStats] = useState<Stats>(initialStats);
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [jobs, setJobs] = useState<DiscoveryJob[]>(initialJobs);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

  // Docs Explorer States
  const [selectedDocPath, setSelectedDocPath] = useState<string>('autonomous-discovery-flow.md');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    openapi: true, // Expand openapi by default
  });
  const [docFiles] = useState(initialDocFiles);

  // Action Loading States
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog/Modal States
  const [selectedJob, setSelectedJob] = useState<DiscoveryJob | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  // Form State for Add Source
  const [addForm, setAddForm] = useState({
    name: '',
    url: '',
    type: 'SITEMAP',
    scraperType: '',
    scrapeInterval: 6,
    rateLimitMs: 2000,
    license: 'Public Domain',
    requiresAttribution: true,
    tags: '',
    language: 'mr',
    notes: '',
    allowedPaths: '',
    excludedPaths: '',
  });

  // Toast message state
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // ─── Data Refresh & Actions ───────────────────────────────────

  const refreshData = async () => {
    try {
      const [statsRes, sourcesRes, jobsRes, alertsRes] = await Promise.all([
        fetch('/api/admin/discovery/stats'),
        fetch('/api/admin/discovery/sources'),
        fetch('/api/admin/discovery/history?limit=20'),
        fetch('/api/admin/discovery/alerts'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        setSources(data.sources);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs);
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const urlObj = new URL(addForm.url);
      const baseDomain = urlObj.hostname.replace(/^www\./, '');

      const payload = {
        name: addForm.name,
        url: addForm.url,
        type: addForm.type,
        baseDomain,
        scraperType: addForm.scraperType || null,
        scrapeInterval: Number(addForm.scrapeInterval),
        rateLimitMs: Number(addForm.rateLimitMs),
        license: addForm.license || null,
        requiresAttribution: addForm.requiresAttribution,
        language: addForm.language,
        notes: addForm.notes || null,
        tags: addForm.tags ? addForm.tags.split(',').map((t) => t.trim()) : [],
        allowedPaths: addForm.allowedPaths ? addForm.allowedPaths.split(',').map((p) => p.trim()) : [],
        excludedPaths: addForm.excludedPaths ? addForm.excludedPaths.split(',').map((p) => p.trim()) : [],
      };

      const res = await fetch('/api/admin/discovery/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add source');
      }

      showMessage('नवीन स्त्रोत यशस्वीरित्या जोडला गेला!');
      setShowAddModal(false);
      setAddForm({
        name: '',
        url: '',
        type: 'SITEMAP',
        scraperType: '',
        scrapeInterval: 6,
        rateLimitMs: 2000,
        license: 'Public Domain',
        requiresAttribution: true,
        tags: '',
        language: 'mr',
        notes: '',
        allowedPaths: '',
        excludedPaths: '',
      });
      await refreshData();
    } catch (err: any) {
      showMessage(err.message || 'Error adding source', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;
    setActionLoading(true);
    try {
      const urlObj = new URL(editingSource.url);
      const baseDomain = urlObj.hostname.replace(/^www\./, '');

      let parsedAllowed: string[] | undefined;
      let parsedExcluded: string[] | undefined;
      let parsedTags: string[] | undefined;

      if (typeof editingSource.allowedPaths === 'string' && !editingSource.allowedPaths.startsWith('[')) {
        parsedAllowed = editingSource.allowedPaths.split(',').map((p) => p.trim()).filter(Boolean);
      }
      if (typeof editingSource.excludedPaths === 'string' && !editingSource.excludedPaths.startsWith('[')) {
        parsedExcluded = editingSource.excludedPaths.split(',').map((p) => p.trim()).filter(Boolean);
      }
      if (typeof editingSource.tags === 'string' && !editingSource.tags.startsWith('[')) {
        parsedTags = editingSource.tags.split(',').map((t) => t.trim()).filter(Boolean);
      }

      const payload = {
        name: editingSource.name,
        url: editingSource.url,
        type: editingSource.type,
        baseDomain,
        scraperType: editingSource.scraperType || null,
        scrapeInterval: Number(editingSource.scrapeInterval),
        rateLimitMs: Number(editingSource.rateLimitMs),
        license: editingSource.license || null,
        requiresAttribution: editingSource.requiresAttribution,
        status: editingSource.status,
        trustScore: Number(editingSource.trustScore),
        language: editingSource.language,
        notes: editingSource.notes || null,
        ...(parsedAllowed !== undefined && { allowedPaths: parsedAllowed }),
        ...(parsedExcluded !== undefined && { excludedPaths: parsedExcluded }),
        ...(parsedTags !== undefined && { tags: parsedTags }),
      };

      const res = await fetch(`/api/admin/discovery/sources/${editingSource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update source');
      }

      showMessage('स्त्रोत यशस्वीरित्या सुधारित केला गेला!');
      setEditingSource(null);
      await refreshData();
    } catch (err: any) {
      showMessage(err.message || 'Error updating source', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (source: Source) => {
    const newStatus = source.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/discovery/sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to toggle status');

      showMessage(`स्त्रोत स्थिती ${newStatus} केली.`);
      await refreshData();
    } catch (err: any) {
      showMessage(err.message || 'Error toggling status', 'error');
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('तुम्हाला खात्री आहे की हा स्त्रोत हटवायचा आहे? संकलित डेटा सुरक्षित राहील परंतु पुढील संकलन थांबेल.')) return;
    try {
      const res = await fetch(`/api/admin/discovery/sources/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete source');

      showMessage('स्त्रोत यशस्वीरित्या हटविला गेला.');
      await refreshData();
    } catch (err: any) {
      showMessage(err.message || 'Error deleting source', 'error');
    }
  };

  const handleRunSingle = async (sourceId: string) => {
    setSyncingSourceId(sourceId);
    try {
      const res = await fetch('/api/admin/discovery/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to run discovery');
      }

      const data = await res.json();
      const newItems = data.result?.itemsNew ?? 0;
      const totalFound = data.result?.itemsFound ?? 0;
      showMessage(`संकलन यशस्वी! ${totalFound} रचेना सापडल्या, ज्यापैकी ${newItems} नवीन आहेत.`);
      await refreshData();
    } catch (err: any) {
      showMessage(err.message || 'Error running discovery', 'error');
    } finally {
      setSyncingSourceId(null);
    }
  };

  const handleRunAll = async () => {
    if (!confirm('तुम्हाला सर्व सक्रिय स्त्रोतांवर नवीन रचना शोधण्याची खात्री आहे? यात काही मिनिटे लागू शकतात.')) return;
    setIsSyncingAll(true);
    try {
      const res = await fetch('/api/admin/discovery/run', {
        method: 'POST',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to run full cycle');
      }

      const data = await res.json();
      const report = data.report;
      showMessage(`पूर्ण चक्र यशस्वी! ${report?.totalItemsFound ?? 0} रचेना तपासल्या, ज्यापैकी ${report?.totalItemsNew ?? 0} नवीन संकलित झाल्या.`);
      await refreshData();
    } catch (err: any) {
      showMessage(err.message || 'Error running full cycle', 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const formatPathArray = (jsonStr: string | null): string => {
    if (!jsonStr) return '';
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) return parsed.join(', ');
      return String(jsonStr);
    } catch {
      return String(jsonStr);
    }
  };

  // ─── Docs Tree Navigation Helper ───────────────────────────────

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  const matchesSearch = (name: string, pathStr: string): boolean => {
    if (!docSearchQuery) return true;
    const q = docSearchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || pathStr.toLowerCase().includes(q);
  };

  const filterTree = (nodes: DocNode[]): DocNode[] => {
    return nodes
      .map((node) => {
        if (node.type === 'directory') {
          const filteredChildren = filterTree(node.children || []);
          if (filteredChildren.length > 0 || matchesSearch(node.name, node.path)) {
            return { ...node, children: filteredChildren };
          }
        } else if (matchesSearch(node.name, node.path)) {
          return node;
        }
        return null;
      })
      .filter((n): n is DocNode => n !== null);
  };

  const filteredDocTree = filterTree(initialDocTree);

  const renderNode = (node: DocNode, depth = 0) => {
    const isFolder = node.type === 'directory';
    const isExpanded = expandedFolders[node.path];
    const isSelected = selectedDocPath === node.path;

    return (
      <div key={node.path} style={{ paddingLeft: `${depth * 10}px` }}>
        {isFolder ? (
          <div className="my-0.5">
            <button
              onClick={() => toggleFolder(node.path)}
              className="flex items-center gap-1.5 w-full text-left py-1 text-gray-700 hover:text-gray-900 font-semibold text-xs md:text-sm"
            >
              <span>{isExpanded ? '📂' : '📁'}</span>
              <span>{node.name}</span>
            </button>
            {isExpanded && (
              <div className="border-l border-gray-200 ml-2.5 pl-1.5">
                {node.children?.map((child) => renderNode(child, depth + 1))}
              </div>
            )}
          </div>
        ) : (
          <div className="my-0.5">
            <button
              onClick={() => setSelectedDocPath(node.path)}
              className={`flex items-center gap-1.5 w-full text-left py-1 px-2 rounded text-xs md:text-sm transition-colors ${
                isSelected
                  ? 'bg-saffron-50 text-saffron font-bold border-l-2 border-saffron'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{node.fileType === 'yaml' ? '📝' : node.fileType === 'sql' ? '🗄️' : '📄'}</span>
              <span className="truncate">{node.name}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Markdown Renderer ──────────────────────────────────────────

  const renderMarkdownText = (md: string) => {
    const lines = md.split('\n');
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLang = '';

    return lines
      .map((line, idx) => {
        if (line.trim().startsWith('```')) {
          if (inCodeBlock) {
            inCodeBlock = false;
            const code = codeContent.join('\n');
            codeContent = [];
            return (
              <pre
                key={idx}
                className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto text-xs font-mono my-3 border border-gray-800"
              >
                <code className={`language-${codeLang}`}>{code}</code>
              </pre>
            );
          } else {
            inCodeBlock = true;
            codeLang = line.trim().substring(3);
            return null;
          }
        }

        if (inCodeBlock) {
          codeContent.push(line);
          return null;
        }

        // Headers
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-xl md:text-2xl font-bold text-maroon-800 border-b pb-2 mt-6 mb-3">
              {line.substring(2)}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-lg md:text-xl font-bold text-maroon-700 mt-5 mb-2">
              {line.substring(3)}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-md md:text-lg font-bold text-gray-800 mt-4 mb-2">
              {line.substring(4)}
            </h3>
          );
        }

        // Horizontal Rule
        if (line.trim() === '---') {
          return <hr key={idx} className="my-4 border-gray-200" />;
        }

        // List items
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <li key={idx} className="ml-5 list-disc text-gray-700 text-xs md:text-sm my-1 leading-relaxed">
              {line.trim().substring(2)}
            </li>
          );
        }
        if (line.match(/^\d+\.\s/)) {
          return (
            <li key={idx} className="ml-5 list-decimal text-gray-700 text-xs md:text-sm my-1 leading-relaxed">
              {line.replace(/^\d+\.\s/, '')}
            </li>
          );
        }

        // Table headers/rows (very basic check)
        if (line.trim().startsWith('|') && !line.trim().includes('---')) {
          const cells = line
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c !== '');
          const isHeader = idx > 0 && md.split('\n')[idx + 1]?.trim().includes('---');

          return (
            <div
              key={idx}
              className={`grid grid-flow-col auto-cols-fr p-2 border-b text-xs md:text-sm ${
                isHeader ? 'bg-gray-100 font-bold text-gray-800' : 'bg-white text-gray-700'
              }`}
            >
              {cells.map((cell, cidx) => (
                <div key={cidx} className="p-1 truncate" title={cell}>
                  {cell}
                </div>
              ))}
            </div>
          );
        }

        // Empty lines
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }

        // Normal paragraph
        return (
          <p key={idx} className="text-gray-700 text-xs md:text-sm leading-relaxed my-2">
            {line}
          </p>
        );
      })
      .filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans">
      {/* Header */}
      <div className="bg-maroon-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/admin" className="text-sand-200 hover:text-white transition-colors text-sm">📊 प्रशासन पटल</Link>
              <span className="text-sand-400 text-xs">/</span>
              <span className="text-sand-200 text-sm">शोध व संकलन</span>
            </div>
            <h1 className="text-2xl font-bold mt-1">🌐 शोध व संकलन नियंत्रण केंद्र</h1>
            <p className="text-sand-200 text-xs mt-0.5">Autonomous Content Discovery & Growth Engine Dashboard</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRunAll}
              disabled={isSyncingAll}
              className={`px-4 py-2 bg-saffron text-white rounded-lg shadow-sm hover:bg-saffron-600 transition-colors font-medium text-sm flex items-center gap-2 ${
                isSyncingAll ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSyncingAll ? '🔄 संकलन सुरु आहे...' : '⚡ पूर्ण चक्र चालवा'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-maroon-700 border border-maroon-500 text-white rounded-lg hover:bg-maroon-600 transition-colors font-medium text-sm flex items-center gap-1"
            >
              ➕ नवीन स्त्रोत जोडा
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-maroon-900/55 border-t border-maroon-700/50">
          <div className="max-w-7xl mx-auto px-4 flex gap-6">
            {[
              { id: 'overview', label: '📊 मुख्य नियंत्रण (Overview)' },
              { id: 'sources', label: '📁 स्त्रोत व्यवस्थापन (Sources)' },
              { id: 'history', label: '📜 संकलन इतिहास (Logs)' },
              { id: 'docs', label: '📖 प्रणाली दस्तऐवजीकरण (Docs)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-1 border-b-2 font-semibold text-xs md:text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-saffron text-saffron'
                    : 'border-transparent text-sand-300 hover:text-white hover:border-sand-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* Toast Messages */}
        {message && (
          <div
            className={`p-4 rounded-xl shadow-sm border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{message.type === 'success' ? '✅' : '❌'}</span>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        )}

        {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Critical Alerts */}
            {alerts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-red-600 text-white px-4 py-2.5 flex items-center gap-2 font-bold text-sm">
                  <span>⚠️</span>
                  <span>सक्रिय आरोग्य चेतावणी (Active Scraper Alerts)</span>
                  <span className="ml-auto bg-red-800 text-red-100 text-xs px-2 py-0.5 rounded-full">{alerts.length}</span>
                </div>
                <div className="divide-y divide-red-100 max-h-60 overflow-y-auto">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 text-xs md:text-sm flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-red-100/50 transition-colors"
                    >
                      <div>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 ${
                            alert.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="font-bold text-gray-800">{alert.sourceName}</span>
                        <p className="text-gray-600 mt-1">{alert.message}</p>
                      </div>
                      <div className="text-right text-gray-400 text-xs shrink-0">
                        {new Date(alert.createdAt).toLocaleString('mr-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium">एकूण स्त्रोत</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalSources}</h3>
                <div className="flex gap-2 mt-2 text-[10px] text-gray-400 font-semibold">
                  <span className="text-green-600">सक्रिय: {stats.statusCounts?.ACTIVE ?? 0}</span>
                  <span className="text-yellow-600">थांबलेले: {stats.statusCounts?.PAUSED ?? 0}</span>
                  <span className="text-red-500">बंद: {stats.statusCounts?.DISABLED ?? 0}</span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium">आज शोधलेल्या रचना</p>
                <h3 className="text-2xl font-bold text-saffron mt-1">+{stats.compositionsToday}</h3>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Discovery Queue</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium">एकूण संकलित रचना</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalCompositions.toLocaleString()}</h3>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Gross Compositions</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium">प्रकाशित/सत्यापित रचना</p>
                <h3 className="text-2xl font-bold text-green-600 mt-1">{stats.totalVerified.toLocaleString()}</h3>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                  सत्यापन दर: {stats.totalCompositions > 0 ? ((stats.totalVerified / stats.totalCompositions) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium">सरासरी विश्वासार्हता</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{(stats.avgTrustScore * 100).toFixed(0)}%</h3>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Average Trust Index</p>
              </div>
            </div>

            {/* Recent activity summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Health Status */}
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 space-y-4">
                <h3 className="font-bold text-maroon-800">📊 स्त्रोत श्रेणी वितरण</h3>
                <div className="space-y-2 mt-2">
                  {Object.entries(stats.statusCounts ?? {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center text-sm border-b pb-1.5">
                      <span className="text-gray-500 font-medium">{key}</span>
                      <span className="font-bold text-gray-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Jobs summary */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-maroon-800">📜 अलीकडील ५ संकलन जॉब्स</h3>
                  <button onClick={() => setActiveTab('history')} className="text-xs text-saffron hover:underline font-semibold">
                    सर्व पहा →
                  </button>
                </div>
                <div className="divide-y text-xs md:text-sm">
                  {jobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-bold text-gray-700">{job.source?.name}</span>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{job.type} • {job.trigger}</div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {job.status}
                        </span>
                        <div className="text-[10px] text-green-600 font-bold mt-1">+{job.itemsNew} रचना</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: SOURCES REGISTRY ─────────────────────────────────── */}
        {activeTab === 'sources' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-maroon-800 text-lg">📁 ट्रॅक केलेले साहित्य स्त्रोत ({sources.length})</h2>
              <button
                onClick={refreshData}
                className="text-xs text-saffron hover:underline font-semibold"
              >
                🔄 रीफ्रेश करा
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs font-semibold uppercase">
                  <tr>
                    <th className="p-4">नाव / डोमेन</th>
                    <th className="p-4">प्रकार</th>
                    <th className="p-4 text-center">विश्वासार्हता</th>
                    <th className="p-4 text-center">एकूण रचना</th>
                    <th className="p-4 text-center">स्थिती</th>
                    <th className="p-4">शेवटचे संकलन</th>
                    <th className="p-4 text-right">कृती</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sources.map((source) => {
                    const statusColors: Record<string, string> = {
                      ACTIVE: 'bg-green-100 text-green-800 border-green-200',
                      PAUSED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                      DISABLED: 'bg-red-100 text-red-800 border-red-200',
                      BLOCKED: 'bg-gray-100 text-gray-800 border-gray-200',
                    };

                    const isSyncing = syncingSourceId === source.id;

                    return (
                      <tr key={source.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-800">{source.name}</div>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-saffron underline truncate block max-w-xs md:max-w-md mt-0.5"
                          >
                            {source.url}
                          </a>
                        </td>
                        <td className="p-4 font-mono text-xs text-gray-500">
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 border">
                            {source.type}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              source.trustScore >= 0.9
                                ? 'bg-emerald-50 text-emerald-700'
                                : source.trustScore >= 0.7
                                ? 'bg-blue-50 text-blue-700'
                                : source.trustScore >= 0.4
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {(source.trustScore * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="p-4 text-center text-gray-700 font-medium">
                          {source.totalCompositions}
                          {source.verifiedCompositions > 0 && (
                            <span className="text-[10px] text-green-600 block">
                              सत्यापित: {source.verifiedCompositions}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${statusColors[source.status] ?? 'bg-gray-100'}`}>
                            {source.status}
                          </span>
                          {source.consecutiveErrors > 0 && (
                            <span className="text-[10px] text-red-500 block mt-1 font-semibold">
                              त्रुटी: {source.consecutiveErrors}/3
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-gray-500">
                          {source.lastFetchAt ? (
                            <>
                              <div>{new Date(source.lastFetchAt).toLocaleDateString('mr-IN')}</div>
                              <div className="text-[10px] text-gray-400">
                                {new Date(source.lastFetchAt).toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-300">कधीही नाही</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRunSingle(source.id)}
                              disabled={source.status !== 'ACTIVE' || isSyncing}
                              className={`px-2.5 py-1 bg-saffron-50 text-saffron border border-saffron-200 hover:bg-saffron hover:text-white rounded text-xs font-semibold transition-all ${
                                source.status !== 'ACTIVE' || isSyncing ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400' : ''
                              }`}
                            >
                              {isSyncing ? '🔄' : '⚡ चालवा'}
                            </button>
                            <button
                              onClick={() => handleToggleStatus(source)}
                              title={source.status === 'ACTIVE' ? 'काम थांबवा (Pause)' : 'काम सुरु करा (Resume)'}
                              className="p-1 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 border rounded text-xs animate-none"
                            >
                              {source.status === 'ACTIVE' ? '⏸️' : '▶️'}
                            </button>
                            <button
                              onClick={() => setEditingSource(source)}
                              title="सुधारित करा"
                              className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteSource(source.id)}
                              title="हटवा"
                              className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sources.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">
                        कोणतेही स्त्रोत आढळले नाहीत. नवीन स्त्रोत जोडण्यासाठी वरील बटणावर क्लिक करा.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: RUN HISTORIES ────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-maroon-800 text-lg">📜 संकलन इतिहास (Job Run Logs)</h2>
              <button
                onClick={refreshData}
                className="text-xs text-saffron hover:underline font-semibold"
              >
                🔄 रीफ्रेश करा
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs font-semibold uppercase">
                  <tr>
                    <th className="p-4">स्त्रोत</th>
                    <th className="p-4">प्रकार / ट्रिगर</th>
                    <th className="p-4 text-center">स्थिती</th>
                    <th className="p-4 text-center">नवीन रचना</th>
                    <th className="p-4 text-center">वेळ (ms)</th>
                    <th className="p-4">दिनांक</th>
                    <th className="p-4 text-right">त्रुटी</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job) => {
                    const statusColors: Record<string, string> = {
                      COMPLETED: 'bg-green-100 text-green-800 font-bold',
                      FAILED: 'bg-red-100 text-red-800 font-bold',
                      RUNNING: 'bg-blue-100 text-blue-800 font-bold animate-pulse',
                      PENDING: 'bg-gray-100 text-gray-800',
                    };

                    return (
                      <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-700">{job.source?.name || 'Unknown Source'}</div>
                          <span className="text-[10px] text-gray-400 font-mono">{job.id.slice(0, 8)}</span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-xs text-gray-600">{job.type}</div>
                          <div className="text-[10px] text-gray-400">ट्रिगर: {job.trigger}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs border ${statusColors[job.status] ?? 'bg-gray-100'}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="font-bold text-gray-800">+{job.itemsNew}</div>
                          <div className="text-[10px] text-gray-400">एकूण शोध: {job.itemsFound} | दुप्पट: {job.itemsDuplicates}</div>
                        </td>
                        <td className="p-4 text-center text-gray-500 font-mono">
                          {job.durationMs.toLocaleString()}ms
                        </td>
                        <td className="p-4 text-xs text-gray-500">
                          {new Date(job.createdAt).toLocaleString('mr-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-4 text-right">
                          {job.errorLog || job.status === 'FAILED' ? (
                            <button
                              onClick={() => setSelectedJob(job)}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200 transition-colors font-medium"
                            >
                              त्रुटी अहवाल
                            </button>
                          ) : (
                            <span className="text-gray-300 text-xs">कोणतीही नाही</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">
                        संकलन इतिहास अद्याप उपलब्ध नाही.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: SYSTEM DOCUMENTATION ─────────────────────────────── */}
        {activeTab === 'docs' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 grid grid-cols-1 md:grid-cols-4 min-h-[70vh]">
            {/* Left Sidebar: Document Explorer */}
            <div className="md:col-span-1 border-r border-gray-200 bg-gray-50/50 p-4 flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">📁 दस्तऐवज एक्सप्लोरर</h3>
                <div className="relative">
                  <input
                    type="text"
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    placeholder="दस्तऐवज शोधा..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron outline-none bg-white"
                  />
                  <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 max-h-[60vh] md:max-h-none">
                {filteredDocTree.map((node) => renderNode(node))}
                {filteredDocTree.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-6">कोणतेही दस्तऐवज आढळले नाहीत.</p>
                )}
              </div>
            </div>

            {/* Right Pane: Document Viewer */}
            <div className="md:col-span-3 p-6 overflow-y-auto flex flex-col h-[70vh] md:h-auto max-h-[75vh]">
              {selectedDocPath && docFiles[selectedDocPath] ? (
                <div className="space-y-4 flex-1">
                  <div className="border-b pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">{selectedDocPath.split('/').pop()}</h2>
                      <span className="text-[10px] text-gray-400 font-mono">मार्ग: docs/{selectedDocPath}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(docFiles[selectedDocPath].content);
                        alert('दस्तऐवज क्लिपबोर्डवर कॉपी केला गेला!');
                      }}
                      className="px-2.5 py-1 text-xs border bg-gray-50 text-gray-600 hover:bg-gray-100 rounded transition-colors font-medium"
                    >
                      📋 मजकूर कॉपी करा
                    </button>
                  </div>

                  <div className="prose max-w-none">
                    {docFiles[selectedDocPath].fileType === 'md' ? (
                      <div className="space-y-3">{renderMarkdownText(docFiles[selectedDocPath].content)}</div>
                    ) : (
                      <pre className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto text-xs md:text-sm font-mono leading-relaxed border border-gray-800 h-full max-h-[60vh] whitespace-pre-wrap">
                        <code>{docFiles[selectedDocPath].content}</code>
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                  <span>📖</span>
                  <p className="text-sm font-medium mt-2">वाचण्यासाठी डाव्या बाजूला दस्तऐवज निवडा.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADD SOURCE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-maroon-800 text-white p-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">➕ नवीन साहित्य स्त्रोत जोडा</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white hover:text-sand-200 text-xl font-bold">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSource} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">स्त्रोत नाव *</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="उदा. तुकाराम गाथा पोर्टल"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">प्रकार *</label>
                  <select
                    value={addForm.type}
                    onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  >
                    <option value="SITEMAP">SITEMAP (साइटमॅप)</option>
                    <option value="RSS">RSS Feed (आरएसएस फीड)</option>
                    <option value="WEBSITE">WEBSITE (थेट वेबसाईट BFS)</option>
                    <option value="YOUTUBE">YOUTUBE (युट्यूब चॅनेल)</option>
                    <option value="COMMUNITY">COMMUNITY (समुदाय टिप)</option>
                    <option value="SEARCH">SEARCH (शोध इंजिन)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">मूळ युआरएल (URL) *</label>
                <input
                  type="url"
                  required
                  value={addForm.url}
                  onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
                  placeholder="https://example.com/abhang-lyrics"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">स्क्रॅपर मोड्यूल</label>
                  <input
                    type="text"
                    value={addForm.scraperType}
                    onChange={(e) => setAddForm({ ...addForm, scraperType: e.target.value })}
                    placeholder="उदा. gatha-scrp (null=auto)"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">संकलन वारंवारता (तास)</label>
                  <input
                    type="number"
                    min={1}
                    value={addForm.scrapeInterval}
                    onChange={(e) => setAddForm({ ...addForm, scrapeInterval: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">दर मर्यादा (ms)</label>
                  <input
                    type="number"
                    min={100}
                    value={addForm.rateLimitMs}
                    onChange={(e) => setAddForm({ ...addForm, rateLimitMs: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">अनुमती दिलेले मार्ग</label>
                  <input
                    type="text"
                    value={addForm.allowedPaths}
                    onChange={(e) => setAddForm({ ...addForm, allowedPaths: e.target.value })}
                    placeholder="/abhang/* (स्वल्पविरामाने वेगळे करा)"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">वगळलेले मार्ग</label>
                  <input
                    type="text"
                    value={addForm.excludedPaths}
                    onChange={(e) => setAddForm({ ...addForm, excludedPaths: e.target.value })}
                    placeholder="/search (स्वल्पविरामाने वेगळे करा)"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">परवाना (License)</label>
                  <input
                    type="text"
                    value={addForm.license}
                    onChange={(e) => setAddForm({ ...addForm, license: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={addForm.requiresAttribution}
                      onChange={(e) => setAddForm({ ...addForm, requiresAttribution: e.target.checked })}
                      className="rounded text-saffron focus:ring-saffron border-gray-300 w-4 h-4"
                    />
                    श्रेय आवश्यक
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">टॅग्ज</label>
                  <input
                    type="text"
                    value={addForm.tags}
                    onChange={(e) => setAddForm({ ...addForm, tags: e.target.value })}
                    placeholder="संत, आरती (स्वल्पविरामाने वेगळे करा)"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">टीप / नोट्स</label>
                <textarea
                  rows={3}
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="अतिरिक्त संदर्भ माहिती..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none resize-none bg-white text-gray-800"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-100 font-medium"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-saffron text-white rounded-lg text-sm font-medium hover:bg-saffron-600 transition-colors"
                >
                  {actionLoading ? 'जोडत आहे...' : 'स्त्रोत जोडा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SOURCE MODAL */}
      {editingSource && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-maroon-800 text-white p-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">✏️ स्त्रोत संपादन: {editingSource.name}</h3>
              <button onClick={() => setEditingSource(null)} className="text-white hover:text-sand-200 text-xl font-bold">
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateSource} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">स्त्रोत नाव *</label>
                  <input
                    type="text"
                    required
                    value={editingSource.name}
                    onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">स्थिती</label>
                  <select
                    value={editingSource.status}
                    onChange={(e) => setEditingSource({ ...editingSource, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  >
                    <option value="ACTIVE">ACTIVE (सक्रिय)</option>
                    <option value="PAUSED">PAUSED (थांबवलेले)</option>
                    <option value="DISABLED">DISABLED (बंद केलेले)</option>
                    <option value="BLOCKED">BLOCKED (प्रतिबंधित)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">मूळ युआरएल (URL) *</label>
                <input
                  type="url"
                  required
                  value={editingSource.url}
                  onChange={(e) => setEditingSource({ ...editingSource, url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">स्क्रॅपर मोड्यूल</label>
                  <input
                    type="text"
                    value={editingSource.scraperType || ''}
                    onChange={(e) => setEditingSource({ ...editingSource, scraperType: e.target.value || null })}
                    placeholder="null = auto"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">संकलन वारंवारता (तास)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingSource.scrapeInterval}
                    onChange={(e) => setEditingSource({ ...editingSource, scrapeInterval: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">दर मर्यादा (ms)</label>
                  <input
                    type="number"
                    min={100}
                    value={editingSource.rateLimitMs}
                    onChange={(e) => setEditingSource({ ...editingSource, rateLimitMs: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">अनुमती दिलेले मार्ग</label>
                  <input
                    type="text"
                    value={
                      typeof editingSource.allowedPaths === 'string' && editingSource.allowedPaths.startsWith('[')
                        ? formatPathArray(editingSource.allowedPaths)
                        : editingSource.allowedPaths || ''
                    }
                    onChange={(e) => setEditingSource({ ...editingSource, allowedPaths: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">वगळलेले मार्ग</label>
                  <input
                    type="text"
                    value={
                      typeof editingSource.excludedPaths === 'string' && editingSource.excludedPaths.startsWith('[')
                        ? formatPathArray(editingSource.excludedPaths)
                        : editingSource.excludedPaths || ''
                    }
                    onChange={(e) => setEditingSource({ ...editingSource, excludedPaths: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">विश्वासार्हता (0.0 - 1.0)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={editingSource.trustScore}
                    onChange={(e) => setEditingSource({ ...editingSource, trustScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none font-mono bg-white text-gray-800"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={editingSource.requiresAttribution}
                      onChange={(e) => setEditingSource({ ...editingSource, requiresAttribution: e.target.checked })}
                      className="rounded text-saffron focus:ring-saffron border-gray-300 w-4 h-4"
                    />
                    श्रेय देणे आवश्यक
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">टॅग्ज</label>
                  <input
                    type="text"
                    value={
                      typeof editingSource.tags === 'string' && editingSource.tags.startsWith('[')
                        ? formatPathArray(editingSource.tags)
                        : editingSource.tags || ''
                    }
                    onChange={(e) => setEditingSource({ ...editingSource, tags: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none bg-white text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">टीप / नोट्स</label>
                <textarea
                  rows={3}
                  value={editingSource.notes || ''}
                  onChange={(e) => setEditingSource({ ...editingSource, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-saffron focus:border-saffron text-sm outline-none resize-none bg-white text-gray-800"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingSource(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-100 font-medium"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-saffron text-white rounded-lg text-sm font-medium hover:bg-saffron-600 transition-colors"
                >
                  {actionLoading ? 'जतन करत आहे...' : 'बदल जतन करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ERROR LOG DETAIL MODAL / DRAWER */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-red-600 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">❌ त्रुटी अहवाल (Error Logs & Result Summary)</h3>
                <p className="text-xs text-red-100 mt-0.5">जॉब आयडी: {selectedJob.id} | {selectedJob.source?.name}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-white hover:text-red-100 text-xl font-bold">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5 flex-1 font-sans">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">परिणाम सारांश (Result Summary)</h4>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border">
                  {selectedJob.resultSummary || 'सारांश उपलब्ध नाही.'}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">त्रुटी नोंदी (Error Logs)</h4>
                <div className="p-4 bg-gray-900 text-red-400 font-mono text-xs rounded-lg overflow-x-auto max-h-80 border border-gray-800 whitespace-pre-wrap">
                  {selectedJob.errorLog ? (
                    (() => {
                      try {
                        const parsed = JSON.parse(selectedJob.errorLog);
                        if (Array.isArray(parsed)) return parsed.join('\n');
                        return String(selectedJob.errorLog);
                      } catch {
                        return String(selectedJob.errorLog);
                      }
                    })()
                  ) : (
                    'कोणत्याही तपशीलवार एरर लॉग नोंदी उपलब्ध नाहीत.'
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-gray-50 p-3 rounded-lg border">
                <div>
                  <span className="text-gray-400 block font-semibold uppercase">रचना शोधल्या</span>
                  <span className="font-bold text-gray-800 text-sm">{selectedJob.itemsFound}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold uppercase">नवीन जोडल्या</span>
                  <span className="font-bold text-green-600 text-sm">{selectedJob.itemsNew}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold uppercase">त्रुटी</span>
                  <span className="font-bold text-red-600 text-sm">{selectedJob.itemsErrored}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold uppercase">कालावधी</span>
                  <span className="font-bold text-gray-800 text-sm font-mono">{selectedJob.durationMs}ms</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
