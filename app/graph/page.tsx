'use client';

import * as React from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Search, Loader2, ZoomIn, ZoomOut, RotateCw, Filter, X, ExternalLink } from 'lucide-react';

interface GraphNode {
  id: string;
  type: string;
  name: string;
  marathiName?: string;
  slug?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const NODE_COLORS: Record<string, string> = {
  saint: '#FF7A1A',
  composition: '#1B6E8C',
  deity: '#3E6B3E',
  festival: '#C9A227',
  category: '#6B1E1E',
  region: '#8B5CF6',
};

const NODE_TYPES = ['saint', 'composition', 'deity', 'festival', 'category', 'region'] as const;
const TYPE_LABELS: Record<string, string> = {
  saint: 'संत (Saint)',
  composition: 'अभंग (Composition)',
  deity: 'देवता (Deity)',
  festival: 'सण (Festival)',
  category: 'वर्ग (Category)',
  region: 'प्रदेश (Region)',
};

export default function GraphPage() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const networkRef = React.useRef<Network | null>(null);

  const [graph, setGraph] = React.useState<KnowledgeGraph>({ nodes: [], edges: [] });
  const [loading, setLoading] = React.useState(true);
  const [selectedNode, setSelectedNode] = React.useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilters, setTypeFilters] = React.useState<Set<string>>(new Set(NODE_TYPES));
  const [error, setError] = React.useState<string | null>(null);

  // Load graph data
  const loadGraph = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('limit', '1000');
      params.set('types', Array.from(typeFilters).join(','));

      const res = await fetch(`/api/graph/explore?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.nodes) {
        setGraph(data);
      } else {
        setError(data.error || 'Failed to load graph');
      }
    } catch {
      setError('Network error loading graph');
    } finally {
      setLoading(false);
    }
  }, [typeFilters]);

  React.useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Initialize vis-network when graph data changes
  React.useEffect(() => {
    if (!containerRef.current || graph.nodes.length === 0 || loading) return;

    // Filter by type and search
    const filteredNodes = graph.nodes.filter((n) => {
      if (!typeFilters.has(n.type)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return n.name.toLowerCase().includes(q) || n.marathiName?.includes(searchQuery) || false;
      }
      return true;
    });

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graph.edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    if (filteredNodes.length === 0) return;

    // Build vis datasets
    const visNodes = new DataSet(
      filteredNodes.map((n) => ({
        id: n.id,
        label: n.marathiName || n.name,
        title: `${TYPE_LABELS[n.type] || n.type}\n${n.marathiName || n.name}`,
        color: {
          background: NODE_COLORS[n.type] || '#666',
          border: '#ffffff',
          highlight: { background: NODE_COLORS[n.type] || '#666', border: '#FF7A1A' },
        },
        shape: 'dot',
        size: n.type === 'saint' ? 30 : n.type === 'composition' ? 20 : n.type === 'deity' ? 25 : 18,
        font: {
          color: '#F7E8CF',
          size: 12,
          strokeWidth: 2,
          strokeColor: '#130406',
        },
        borderWidth: 2,
        group: n.type,
      }))
    );

    const visEdges = new DataSet(
      filteredEdges.map((e) => ({
        from: e.source,
        to: e.target,
        label: '',
        color: { color: '#C9A227', opacity: 0.4, highlight: '#FF7A1A' },
        width: e.weight ? Math.min(e.weight * 2, 6) : 1,
        smooth: { type: 'continuous' },
      })) as any[]
    );

    const options = {
      physics: {
        solver: 'forceAtlas2Based' as const,
        forceAtlas2Based: {
          gravitationalConstant: -40,
          centralGravity: 0.005,
          springLength: 180,
          springConstant: 0.02,
          damping: 0.4,
        },
        stabilization: { iterations: 100 },
      },
      edges: {
        arrows: { to: { enabled: false } },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        navigationButtons: true,
        keyboard: true,
      },
      groups: Object.fromEntries(
        NODE_TYPES.map((t) => [
          t,
          { color: { background: NODE_COLORS[t], border: '#fff' }, shape: 'dot' },
        ])
      ),
    };

    const network = new Network(containerRef.current, { nodes: visNodes, edges: visEdges }, options);
    networkRef.current = network;

    // Click handler
    network.on('click', (params: { nodes: string[] }) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (node) setSelectedNode(node);
      } else {
        setSelectedNode(null);
      }
    });

    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [graph, loading, typeFilters, searchQuery]);

  const toggleTypeFilter = (type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#130406] text-[#f7e8cf] font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#1c080b]/90 backdrop-blur-md border-b border-[#e35f24]/20 px-6 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#e35f24] to-[#e5a93c]">
              भक्ती ज्ञान ग्राफ
            </h1>
            <p className="text-xs text-[#e5a93c]/70 font-medium">Digital Pandharpur Knowledge Graph</p>
          </div>
          <button onClick={loadGraph} className="text-xs px-3 py-1.5 rounded bg-[#e35f24]/10 hover:bg-[#e35f24]/20 border border-[#e35f24]/20 text-[#e35f24] transition-all">
            <RotateCw className="h-3 w-3 inline mr-1" /> रीफ्रेश
          </button>
        </div>
      </header>

      {/* Controls */}
      <div className="px-6 py-3 bg-[#1c080b]/30 border-b border-[#e5a93c]/5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#e5a93c]/40" />
            <input
              type="text"
              placeholder="शोधा..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#130406] border border-[#e5a93c]/15 text-[#f7e8cf] text-xs focus:outline-none focus:border-[#e35f24]"
            />
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap gap-1.5">
            {NODE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => toggleTypeFilter(type)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
                  typeFilters.has(type)
                    ? 'text-white border-current'
                    : 'text-[#f7e8cf]/30 border-transparent bg-[#130406]'
                }`}
                style={typeFilters.has(type) ? { backgroundColor: NODE_COLORS[type] + '40', borderColor: NODE_COLORS[type] } : {}}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Stats */}
          <span className="text-[10px] text-[#e5a93c]/40 ml-auto">
            {graph.nodes.length} नोड्स | {graph.edges.length} कड्या
          </span>
        </div>
      </div>

      {/* Main Grid: Graph + Details Panel */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Graph Canvas */}
        <div className="flex-1 relative">
          {/* Loading State */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#130406]/80 z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#e5a93c] mx-auto" />
                <p className="mt-2 text-sm text-[#e5a93c]/60">ग्राफ लोड करत आहे...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#130406]/80 z-10">
              <div className="text-center p-8 rounded-xl bg-[#2d1115] border border-rose-800/40">
                <p className="text-rose-400 font-bold mb-2">त्रुटी</p>
                <p className="text-sm text-[#f7e8cf]/70 mb-4">{error}</p>
                <button onClick={loadGraph} className="px-4 py-2 rounded-lg bg-[#e35f24]/20 border border-[#e35f24]/30 text-[#e35f24] text-sm">
                  पुन्हा प्रयत्न करा
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && graph.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-[#e5a93c]/60 mb-2">ग्राफमध्ये कोणताही डेटा नाही.</p>
                <p className="text-xs text-[#f7e8cf]/40">प्रथम संबंध तयार करण्यासाठी `bun run graph:build` चालवा.</p>
              </div>
            </div>
          )}

          {/* vis-network Container */}
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Details Panel */}
        {selectedNode && (
          <aside className="w-80 border-l border-[#e5a93c]/10 bg-[#1c080b]/60 overflow-y-auto flex-shrink-0">
            <div className="p-4 border-b border-[#e5a93c]/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#e5a93c]">नोड माहिती</h3>
              <button onClick={() => setSelectedNode(null)} className="text-[#e5a93c]/50 hover:text-[#e5a93c]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Node type badge */}
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: NODE_COLORS[selectedNode.type] || '#666' }}
                />
                <span className="text-xs font-bold text-[#f7e8cf]/60 uppercase">
                  {TYPE_LABELS[selectedNode.type] || selectedNode.type}
                </span>
              </div>

              {/* Name */}
              <h2 className="text-lg font-bold text-[#f7e8cf]">
                {selectedNode.marathiName || selectedNode.name}
              </h2>

              {/* Connections count */}
              <div className="text-xs text-[#f7e8cf]/50">
                Connections:{' '}
                {graph.edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length}
              </div>

              {/* Links */}
              {selectedNode.slug && (
                <div className="space-y-2 pt-2 border-t border-[#e5a93c]/10">
                  <a
                    href={selectedNode.type === 'saint' ? `/sant/${selectedNode.slug}` :
                          selectedNode.type === 'composition' ? `/abhang/${selectedNode.slug}` :
                          selectedNode.type === 'festival' ? `/festival/${selectedNode.slug}` :
                          selectedNode.type === 'category' ? `/category/${selectedNode.slug}` :
                          '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e35f24]/10 hover:bg-[#e35f24]/20 border border-[#e35f24]/20 text-[#e35f24] text-sm transition-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                    पान उघडा (Open Page)
                  </a>
                </div>
              )}

              {/* Connected entities */}
              <div className="pt-2 border-t border-[#e5a93c]/10">
                <h4 className="text-xs font-bold text-[#e5a93c]/60 uppercase mb-2">जोडलेले घटक</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {graph.edges
                    .filter((e) => e.source === selectedNode.id)
                    .slice(0, 20)
                    .map((edge) => {
                      const target = graph.nodes.find((n) => n.id === edge.target);
                      if (!target) return null;
                      return (
                        <div key={edge.source + edge.target} className="flex items-center gap-2 px-2 py-1 rounded bg-[#130406]/60 text-xs">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_COLORS[target.type] || '#666' }} />
                          <span className="truncate text-[#f7e8cf]/70">{target.marathiName || target.name}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Legend (bottom, always visible) */}
      {!selectedNode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1c080b]/90 backdrop-blur-sm rounded-full px-6 py-2 border border-[#e5a93c]/10 shadow-lg">
          <div className="flex items-center gap-4 text-xs">
            {NODE_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }} />
                <span className="text-[#f7e8cf]/50">{TYPE_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
