'use client';

import * as React from 'react';

interface GraphNode {
  id: string;
  type: 'saint' | 'composition' | 'deity' | 'festival' | 'category';
  name: string;
  marathiName?: string;
  slug?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'composed' | 'worships' | 'celebrates' | 'belongs_to' | 'knows';
}

interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function GraphPage() {
  const [graph, setGraph] = React.useState<KnowledgeGraph>({ nodes: [], edges: [] });
  const [loading, setLoading] = React.useState(true);
  const [selectedNode, setSelectedNode] = React.useState<GraphNode | null>(null);

  React.useEffect(() => {
    // Load graph data from API (server-side SQLite)
    fetch('/api/graph/explore')
      .then((res) => res.json())
      .then((data) => {
        setGraph(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-marathiHeading text-maroon mb-6">
          भक्ती ज्ञान ग्राफ
        </h1>
        <p className="text-muted-foreground">लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-marathiHeading text-maroon mb-6">
        भक्ती ज्ञान ग्राफ
      </h1>

      <div className="bg-card rounded-lg p-6 border border-saffron/10 mb-8">
        <p className="text-foreground leading-relaxed">
          हे ग्राफ तुमच्या मार्गदर्शक संत, अभंग, देवता आणि सणांमधील नाते दाखवते.
          कोणत्याही नोंदवाचा क्लिक करा त्याच्या संबंधित साहित्य किंवा संत पाहा.
        </p>
      </div>

      {/* Graph Visualization */}
      <div className="bg-card rounded-lg p-6 border border-saffron/10 min-h-[500px] relative overflow-hidden">
        <svg
          viewBox="0 0 800 500"
          className="w-full h-full"
          aria-label="भक्ती ज्ञान ग्राफ"
        >
          {/* Edges */}
          {graph.edges.map((edge, i) => {
            const source = graph.nodes.find((n) => n.id === edge.source);
            const target = graph.nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            // Calculate positions dynamically
            const sx = hashPosition(source.id) % 800;
            const sy = (hashPosition(source.id + 'y') % 500) + 50;
            const tx = hashPosition(target.id) % 800;
            const ty = (hashPosition(target.id + 'y') % 500) + 50;

            return (
              <line
                key={`edge-${i}`}
                x1={sx}
                y1={sy}
                x2={tx}
                y2={ty}
                stroke="#C9A227"
                strokeWidth="2"
                opacity="0.5"
              />
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const x = hashPosition(node.id) % 800;
            const y = (hashPosition(node.id + 'y') % 500) + 50;

            return (
              <g key={node.id} transform={`translate(${x}, ${y})`}>
                <circle
                  r={getNodeSize(node.type)}
                  fill={getNodeColor(node.type)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedNode(node)}
                />
                <text
                  y={getNodeSize(node.type) + 15}
                  textAnchor="middle"
                  className="text-xs font-marathi fill-foreground"
                >
                  {node.marathiName}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <LegendItem color="fill-saffron" label="संत" />
        <LegendItem color="fill-peacock" label="अभंग" />
        <LegendItem color="fill-tulsi" label="देवता" />
        <LegendItem color="fill-gold" label="सण" />
      </div>
    </div>
  );
}

// Simple hash-based position for consistent layout
function hashPosition(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  }
  return Math.abs(hash);
}

function getNodeColor(type: GraphNode['type']): string {
  const colors: Record<string, string> = {
    saint: '#FF7A1A', // Saffron
    composition: '#1B6E8C', // Peacock
    deity: '#3E6B3E', // Tulsi
    festival: '#C9A227', // Gold
    category: '#6B1E1E', // Maroon
  };
  return colors[type] || '#666';
}

function getNodeSize(type: GraphNode['type']): number {
  const sizes: Record<string, number> = {
    saint: 25,
    composition: 20,
    deity: 18,
    festival: 16,
    category: 14,
  };
  return sizes[type] || 15;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full ${color}`} />
      <span className="text-sm font-marathi">{label}</span>
    </div>
  );
}