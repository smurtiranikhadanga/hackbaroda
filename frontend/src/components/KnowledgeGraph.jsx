import { useEffect, useRef, useState } from 'react'
import { FiShare2, FiLoader } from 'react-icons/fi'
import { getKnowledgeGraph } from '../api'

export default function KnowledgeGraph() {
  const svgRef = useRef(null)
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getKnowledgeGraph()
      .then(({ data }) => setGraphData(data))
      .catch(() => setError('Could not load knowledge graph'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="glass rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
          <FiShare2 className="text-purple-400" size={16} />
        </div>
        <div>
          <h3 className="font-semibold text-white">Knowledge Graph</h3>
          <p className="text-xs text-slate-400">Causal relationships from resolved incidents</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <FiLoader className="animate-spin mr-2" size={20} />
          Loading graph...
        </div>
      )}
      {error && (
        <div className="text-center py-8 text-slate-500 text-sm">{error}</div>
      )}
      {!loading && !error && graphData && (
        <GraphVisualization data={graphData} />
      )}
    </div>
  )
}

function GraphVisualization({ data }) {
  const { nodes = [], edges = [] } = data

  if (nodes.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <FiShare2 size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No resolved incidents yet.</p>
        <p className="text-xs mt-1 text-slate-600">Resolve incidents to build the knowledge graph.</p>
      </div>
    )
  }

  // Simple force-layout approximation using static positions in a circle
  const W = 500, H = 320
  const cx = W / 2, cy = H / 2
  const R = Math.min(W, H) * 0.35

  const nodePositions = {}
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
    nodePositions[node.id] = {
      x: cx + R * Math.cos(angle),
      y: cy + R * Math.sin(angle),
    }
  })

  const SEVERITY_COLORS = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#eab308',
    Low: '#22c55e',
    Unknown: '#6366f1',
  }

  return (
    <div className="overflow-x-auto">
      <svg
        ref={null}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="rounded-xl"
        style={{ background: 'rgba(15,15,26,0.6)', minWidth: 320 }}
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const src = nodePositions[edge.source]
          const tgt = nodePositions[edge.target]
          if (!src || !tgt) return null
          const color = SEVERITY_COLORS[edge.severity] || '#6366f1'
          return (
            <line
              key={i}
              x1={src.x} y1={src.y}
              x2={tgt.x} y2={tgt.y}
              stroke={color}
              strokeOpacity={0.4}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = nodePositions[node.id]
          if (!pos) return null
          const isCause = node.type === 'cause'
          const r = isCause ? 22 : 18
          const fillColor = isCause ? 'rgba(99,102,241,0.3)' : 'rgba(168,85,247,0.2)'
          const strokeColor = isCause ? '#6366f1' : '#a855f7'
          const label = node.label.length > 14 ? node.label.substring(0, 13) + '…' : node.label

          return (
            <g key={node.id}>
              <circle
                cx={pos.x} cy={pos.y} r={r}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={1.5}
              />
              {node.count > 1 && (
                <circle
                  cx={pos.x + r * 0.6} cy={pos.y - r * 0.6} r={8}
                  fill={isCause ? '#ef4444' : '#f97316'}
                  stroke="rgba(15,15,26,0.8)"
                  strokeWidth={1.5}
                />
              )}
              {node.count > 1 && (
                <text
                  x={pos.x + r * 0.6} y={pos.y - r * 0.6 + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize={9}
                  fontWeight="bold"
                >
                  {node.count}
                </text>
              )}
              <text
                x={pos.x}
                y={pos.y + r + 14}
                textAnchor="middle"
                fill={isCause ? '#a5b4fc' : '#c084fc'}
                fontSize={10}
                fontWeight="500"
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        <LegendItem color="bg-brand-500/40 border-brand-500" label="Root Cause" />
        <LegendItem color="bg-purple-500/30 border-purple-500" label="Incident Type" />
        <LegendItem color="bg-red-500/30 border-red-500" label="Count badge" />
      </div>
    </div>
  )
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full border ${color}`} />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}
