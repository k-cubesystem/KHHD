'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { KnowledgeGraphViewer } from '@/components/saju/knowledge-graph-viewer'
import { NODES, EDGES, ALL_EDGE_TYPES, EDGE_STYLES } from '@/lib/data/saju-knowledge-graph'

interface Props {
  userNodes: Set<string> | null
}

export function KnowledgeGraphClient({ userNodes }: Props) {
  const [mySajuMode, setMySajuMode] = useState(!!userNodes)

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 상단 통계 바 */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
        <span>노드 {NODES.length}개</span>
        <span>엣지 {EDGES.length}개</span>
        <span>관계 유형 {ALL_EDGE_TYPES.length}가지</span>

        <div className="ml-auto flex items-center gap-2">
          {/* 엣지 범례 */}
          <div className="hidden md:flex items-center gap-3">
            {(['상생', '상극', '천간합', '지지충'] as const).map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 rounded" style={{ background: EDGE_STYLES[t].color }} />
                <span>{EDGE_STYLES[t].label.split('(')[0]}</span>
              </div>
            ))}
          </div>

          {/* 내 사주 토글 */}
          {userNodes && (
            <button
              onClick={() => setMySajuMode((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                mySajuMode
                  ? 'bg-amber-800/40 border-amber-600/50 text-amber-300'
                  : 'bg-gray-800/60 border-gray-700 text-gray-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${mySajuMode ? 'bg-amber-400' : 'bg-gray-600'}`} />내 사주에서
              보기
            </button>
          )}
        </div>
      </div>

      {/* 그래프 */}
      <motion.div
        className="flex-1 min-h-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <KnowledgeGraphViewer highlightNodes={mySajuMode && userNodes ? userNodes : undefined} className="h-full" />
      </motion.div>
    </div>
  )
}
