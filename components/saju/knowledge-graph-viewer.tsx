'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  NODES,
  EDGES,
  NODE_MAP,
  getNeighborIds,
  getNodeEdges,
  ELEMENT_COLORS,
  EDGE_STYLES,
  ALL_EDGE_TYPES,
  type KnowledgeNode,
  type KnowledgeEdge,
  type EdgeType,
  type NodeType,
} from '@/lib/data/saju-knowledge-graph'

// ─── 레이아웃 계산 ─────────────────────────────────────────────────────────────

interface NodePosition {
  id: string
  x: number
  y: number
  r: number // radius
}

function buildLayout(width: number, height: number): Map<string, NodePosition> {
  const cx = width / 2
  const cy = height / 2
  const positions = new Map<string, NodePosition>()

  // 오행: 중앙 원 배치 (오각형)
  const wuxingNodes = NODES.filter((n) => n.type === '오행')
  const wuxingR = Math.min(width, height) * 0.18
  wuxingNodes.forEach((n, i) => {
    const angle = (i / wuxingNodes.length) * Math.PI * 2 - Math.PI / 2
    positions.set(n.id, { id: n.id, x: cx + wuxingR * Math.cos(angle), y: cy + wuxingR * Math.sin(angle), r: 30 })
  })

  // 천간: 중간 원
  const ganNodes = NODES.filter((n) => n.type === '천간')
  const ganR = Math.min(width, height) * 0.35
  ganNodes.forEach((n, i) => {
    const angle = (i / ganNodes.length) * Math.PI * 2 - Math.PI / 2
    positions.set(n.id, { id: n.id, x: cx + ganR * Math.cos(angle), y: cy + ganR * Math.sin(angle), r: 20 })
  })

  // 지지: 바깥 원
  const zhiNodes = NODES.filter((n) => n.type === '지지')
  const zhiR = Math.min(width, height) * 0.46
  zhiNodes.forEach((n, i) => {
    const angle = (i / zhiNodes.length) * Math.PI * 2 - Math.PI / 2
    positions.set(n.id, { id: n.id, x: cx + zhiR * Math.cos(angle), y: cy + zhiR * Math.sin(angle), r: 18 })
  })

  // 십성: 오른쪽 하단 소군집
  const shipseongNodes = NODES.filter((n) => n.type === '십성')
  // 십성은 패널에서 표시 (SVG 위치 없음) - 빈 상태로 처리
  // 레이아웃 미포함 (노드 타입 필터로 대응)

  // 신살: 왼쪽 하단 소군집
  const sinsalNodes = NODES.filter((n) => n.type === '신살')

  return positions
}

// ─── 타입별 노드 색상 ──────────────────────────────────────────────────────────

function getNodeColor(node: KnowledgeNode, highlighted: boolean, dimmed: boolean) {
  const base =
    node.element && ELEMENT_COLORS[node.element]
      ? ELEMENT_COLORS[node.element]
      : node.type === '오행' && ELEMENT_COLORS[node.id]
        ? ELEMENT_COLORS[node.id]
        : { fill: '#374151', stroke: '#6b7280', text: '#d1d5db' }

  if (dimmed) return { fill: '#1f2937', stroke: '#374151', text: '#4b5563' }
  if (highlighted) return { ...base, stroke: '#fbbf24' }
  return base
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface KnowledgeGraphViewerProps {
  highlightNodes?: Set<string> // 내 사주에서 보기 모드
  className?: string
}

export function KnowledgeGraphViewer({ highlightNodes, className = '' }: KnowledgeGraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 700 })
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: KnowledgeNode } | null>(null)
  const [activeEdgeTypes, setActiveEdgeTypes] = useState<Set<EdgeType>>(
    new Set(['상생', '상극', '천간합', '천간충', '지지육합', '지지삼합', '지지충'])
  )
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<NodeType>>(new Set(['오행', '천간', '지지']))

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
    update()
    const ro = new ResizeObserver(update)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const positions = buildLayout(dimensions.width, dimensions.height)

  // 표시할 노드: 타입 필터 + 레이아웃에 위치 존재
  const visibleNodes = NODES.filter((n) => visibleNodeTypes.has(n.type) && positions.has(n.id))

  // 표시할 엣지: 양 끝 노드가 보임 + 엣지 타입 활성
  const visibleEdges = EDGES.filter(
    (e) =>
      activeEdgeTypes.has(e.type) &&
      positions.has(e.source) &&
      positions.has(e.target) &&
      visibleNodeTypes.has(NODE_MAP.get(e.source)?.type ?? ('오행' as NodeType)) &&
      visibleNodeTypes.has(NODE_MAP.get(e.target)?.type ?? ('오행' as NodeType))
  )

  const focusNode = selectedNode ?? hoveredNode
  const neighborIds = focusNode ? getNeighborIds(focusNode, activeEdgeTypes) : null
  const activeEdgeIds = focusNode ? new Set(getNodeEdges(focusNode, activeEdgeTypes).map((e) => e.id)) : null

  const toggleEdgeType = useCallback((type: EdgeType) => {
    setActiveEdgeTypes((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }, [])

  const toggleNodeType = useCallback((type: NodeType) => {
    setVisibleNodeTypes((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }, [])

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode((prev) => (prev === nodeId ? null : nodeId))
    setTooltip(null)
  }, [])

  const handleNodeHover = useCallback((nodeId: string | null, svgX?: number, svgY?: number) => {
    setHoveredNode(nodeId)
    if (nodeId && svgX !== undefined && svgY !== undefined) {
      const node = NODE_MAP.get(nodeId)
      if (node) setTooltip({ x: svgX, y: svgY, node })
    } else {
      setTooltip(null)
    }
  }, [])

  const selectedNodeData = selectedNode ? NODE_MAP.get(selectedNode) : null
  const selectedEdges = selectedNode ? getNodeEdges(selectedNode, activeEdgeTypes) : []

  return (
    <div className={`flex h-full gap-3 ${className}`}>
      {/* SVG 그래프 */}
      <div
        ref={containerRef}
        className="relative flex-1 rounded-xl border border-amber-900/30 bg-gray-950 overflow-hidden"
        onClick={() => {
          setSelectedNode(null)
          setTooltip(null)
        }}
      >
        <svg width={dimensions.width} height={dimensions.height} className="absolute inset-0">
          <defs>
            {/* 마커: 화살표 */}
            {(['상생', '상극', '천간합', '천간충', '지지충'] as EdgeType[]).map((t) => (
              <marker key={t} id={`arrow-${t}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={EDGE_STYLES[t].color} opacity="0.8" />
              </marker>
            ))}
            {/* 방사형 그라디언트 배경 */}
            <radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#111827" />
              <stop offset="100%" stopColor="#030712" />
            </radialGradient>
          </defs>

          {/* 배경 */}
          <rect width={dimensions.width} height={dimensions.height} fill="url(#bg-grad)" />

          {/* 동심원 가이드 */}
          {[0.18, 0.35, 0.46].map((ratio, i) => (
            <circle
              key={i}
              cx={dimensions.width / 2}
              cy={dimensions.height / 2}
              r={Math.min(dimensions.width, dimensions.height) * ratio}
              fill="none"
              stroke="#1f2937"
              strokeWidth="1"
              strokeDasharray="4,6"
            />
          ))}

          {/* 엣지 */}
          {visibleEdges.map((edge) => {
            const sp = positions.get(edge.source)
            const tp = positions.get(edge.target)
            if (!sp || !tp) return null

            const style = EDGE_STYLES[edge.type]
            const isActive = !activeEdgeIds || activeEdgeIds.has(edge.id)
            const opacity = isActive ? (edge.weight === 3 ? 0.8 : 0.5) : 0.06

            // 약간 곡선
            const dx = tp.x - sp.x
            const dy = tp.y - sp.y
            const mx = (sp.x + tp.x) / 2 - dy * 0.1
            const my = (sp.y + tp.y) / 2 + dx * 0.1

            const hasArrow = edge.type === '상생' || edge.type === '상극'

            return (
              <path
                key={edge.id}
                d={`M${sp.x},${sp.y} Q${mx},${my} ${tp.x},${tp.y}`}
                fill="none"
                stroke={style.color}
                strokeWidth={edge.weight === 3 ? 2 : 1.5}
                strokeDasharray={style.dash}
                opacity={opacity}
                markerEnd={hasArrow ? `url(#arrow-${edge.type})` : undefined}
              />
            )
          })}

          {/* 노드 */}
          {visibleNodes.map((node) => {
            const pos = positions.get(node.id)
            if (!pos) return null

            const isFocused = focusNode === node.id
            const isNeighbor = neighborIds?.has(node.id) ?? false
            const isDimmed = focusNode !== null && !isFocused && !isNeighbor
            const isHighlighted = highlightNodes?.has(node.id) ?? false

            const color = getNodeColor(node, isFocused || isHighlighted, isDimmed)
            const scale = isFocused ? 1.3 : isNeighbor ? 1.1 : 1

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y}) scale(${scale})`}
                style={{ cursor: 'pointer', transformOrigin: `${pos.x}px ${pos.y}px`, transition: 'transform 0.2s' }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleNodeClick(node.id)
                }}
                onMouseEnter={(e) => handleNodeHover(node.id, pos.x, pos.y)}
                onMouseLeave={() => handleNodeHover(null)}
              >
                <circle
                  r={pos.r}
                  fill={color.fill}
                  stroke={isFocused ? '#fbbf24' : isHighlighted ? '#f59e0b' : color.stroke}
                  strokeWidth={isFocused ? 3 : isHighlighted ? 2.5 : 1.5}
                  opacity={isDimmed ? 0.2 : 1}
                />
                {/* 오행 노드 추가 광채 */}
                {node.type === '오행' && !isDimmed && (
                  <circle
                    r={pos.r + 5}
                    fill="none"
                    stroke={color.stroke}
                    strokeWidth="1"
                    opacity="0.3"
                    strokeDasharray="3,3"
                  />
                )}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={node.type === '오행' ? 16 : node.type === '십성' || node.type === '신살' ? 9 : 13}
                  fontWeight={node.type === '오행' ? '700' : '500'}
                  fill={isDimmed ? '#374151' : color.text}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {node.label}
                </text>
                {/* 한글 서브라벨 */}
                {node.korean && node.type !== '신살' && node.type !== '십성' && (
                  <text
                    y={pos.r + 11}
                    textAnchor="middle"
                    fontSize={9}
                    fill={isDimmed ? '#1f2937' : '#6b7280'}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {node.korean}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* 툴팁 */}
        <AnimatePresence>
          {tooltip && !selectedNode && (
            <motion.div
              key="tooltip"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-20 pointer-events-none"
              style={{
                left: Math.min(tooltip.x + 16, dimensions.width - 220),
                top: Math.max(tooltip.y - 80, 8),
              }}
            >
              <div className="bg-gray-900 border border-amber-800/50 rounded-lg p-3 shadow-xl max-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-400 font-bold text-base">{tooltip.node.label}</span>
                  {tooltip.node.korean && <span className="text-gray-400 text-xs">{tooltip.node.korean}</span>}
                  <span className="text-xs text-gray-500 ml-auto">{tooltip.node.type}</span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">{tooltip.node.description}</p>
                {tooltip.node.detail && (
                  <p className="text-amber-200/60 text-xs mt-1 leading-relaxed">{tooltip.node.detail}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 빈 상태 안내 */}
        {visibleNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-600 text-sm">표시할 노드가 없습니다. 필터를 조정하세요.</p>
          </div>
        )}

        {/* 레이어 레이블 */}
        <div className="absolute top-3 left-3 space-y-1 opacity-50 pointer-events-none">
          <div className="text-xs text-gray-500">● 안쪽: 오행</div>
          <div className="text-xs text-gray-500">● 중간: 천간</div>
          <div className="text-xs text-gray-500">● 바깥: 지지</div>
        </div>
      </div>

      {/* 사이드바 */}
      <div className="w-72 flex flex-col gap-3 overflow-y-auto">
        {/* 노드 타입 필터 */}
        <div className="rounded-xl border border-amber-900/30 bg-gray-900/80 p-4">
          <h3 className="text-amber-400 text-sm font-semibold mb-3">노드 표시</h3>
          <div className="flex flex-wrap gap-2">
            {(['오행', '천간', '지지'] as NodeType[]).map((t) => (
              <button
                key={t}
                onClick={() => toggleNodeType(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  visibleNodeTypes.has(t)
                    ? 'bg-amber-700 text-amber-100 border border-amber-600'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 엣지 타입 필터 */}
        <div className="rounded-xl border border-amber-900/30 bg-gray-900/80 p-4">
          <h3 className="text-amber-400 text-sm font-semibold mb-3">관계 표시</h3>
          <div className="space-y-2">
            {ALL_EDGE_TYPES.map((type) => {
              const style = EDGE_STYLES[type]
              return (
                <button
                  key={type}
                  onClick={() => toggleEdgeType(type)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all text-left ${
                    activeEdgeTypes.has(type)
                      ? 'bg-gray-800 border border-gray-700'
                      : 'bg-gray-950 border border-gray-800 opacity-40'
                  }`}
                >
                  <span
                    className="w-12 h-0.5 flex-shrink-0 rounded"
                    style={{
                      background: style.color,
                      opacity: activeEdgeTypes.has(type) ? 1 : 0.3,
                    }}
                  />
                  <span className="text-gray-300">{style.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 선택된 노드 상세 */}
        <AnimatePresence>
          {selectedNodeData && (
            <motion.div
              key="node-detail"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rounded-xl border border-amber-600/50 bg-gray-900/90 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300 font-bold text-xl">{selectedNodeData.label}</span>
                    {selectedNodeData.korean && (
                      <span className="text-gray-400 text-sm">{selectedNodeData.korean}</span>
                    )}
                  </div>
                  <span className="text-xs text-amber-700 bg-amber-900/30 rounded px-1.5 py-0.5">
                    {selectedNodeData.type}
                    {selectedNodeData.element ? ` · ${selectedNodeData.element}` : ''}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-600 hover:text-gray-400 text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed mb-2">{selectedNodeData.description}</p>
              {selectedNodeData.detail && (
                <p className="text-amber-200/60 text-xs leading-relaxed mb-3">{selectedNodeData.detail}</p>
              )}

              {selectedEdges.length > 0 && (
                <>
                  <h4 className="text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wider">연결 관계</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedEdges.map((edge) => {
                      const style = EDGE_STYLES[edge.type]
                      const otherId = edge.source === selectedNode ? edge.target : edge.source
                      const other = NODE_MAP.get(otherId)
                      return (
                        <button
                          key={edge.id}
                          onClick={() => handleNodeClick(otherId)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-left"
                        >
                          <span className="text-xs" style={{ color: style.color }}>
                            {style.emoji}
                          </span>
                          <span className="text-amber-300 font-medium text-xs w-5">{otherId}</span>
                          <span className="text-gray-500 text-xs">{edge.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 사용 안내 */}
        {!selectedNodeData && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
            <h3 className="text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wider">사용법</h3>
            <ul className="text-gray-600 text-xs space-y-1">
              <li>· 노드 클릭 → 관계 하이라이트</li>
              <li>· 노드 호버 → 설명 툴팁</li>
              <li>· 다시 클릭 → 선택 해제</li>
              <li>· 관계 토글로 원하는 관계만 표시</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default KnowledgeGraphViewer
