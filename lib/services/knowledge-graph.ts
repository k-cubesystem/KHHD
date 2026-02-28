/**
 * 해화지기 명리학 지식그래프 서비스
 * Supabase kg_nodes / kg_edges / kg_rules 테이블 CRUD + 그래프 탐색
 */

import { createClient } from '@/lib/supabase/server'

// ===================== 타입 =====================

export interface KGNode {
  id: string
  node_type: string
  code: string
  label_ko: string
  label_hanja: string | null
  category: string | null
  properties: Record<string, unknown>
  description: string | null
}

export interface KGEdge {
  id: string
  source_id: string
  target_id: string
  relation_type: string
  weight: number
  properties: Record<string, unknown>
  description: string | null
}

export interface KGRule {
  id: string
  rule_code: string
  name: string
  source_text: string | null
  category: string
  conditions: unknown[]
  conclusion: Record<string, unknown>
  weight: number
  is_active: boolean
}

export interface GraphNeighbor {
  node: KGNode
  edge: KGEdge
  direction: 'outgoing' | 'incoming'
}

// ===================== 서비스 =====================

export class KnowledgeGraphService {
  /**
   * 코드로 노드 조회
   */
  static async getNodeByCode(code: string): Promise<KGNode | null> {
    const supabase = await createClient()
    const { data } = await supabase.from('kg_nodes').select('*').eq('code', code).single()
    return data
  }

  /**
   * 타입별 노드 목록
   */
  static async getNodesByType(nodeType: string): Promise<KGNode[]> {
    const supabase = await createClient()
    const { data } = await supabase.from('kg_nodes').select('*').eq('node_type', nodeType).order('created_at')
    return data || []
  }

  /**
   * 노드의 이웃(관계) 탐색 - 1-hop
   */
  static async getNeighbors(nodeCode: string, relationTypes?: string[]): Promise<GraphNeighbor[]> {
    const node = await this.getNodeByCode(nodeCode)
    if (!node) return []

    const supabase = await createClient()
    const neighbors: GraphNeighbor[] = []

    // outgoing edges
    let outQuery = supabase
      .from('kg_edges')
      .select('*, target:kg_nodes!kg_edges_target_id_fkey(*)')
      .eq('source_id', node.id)
    if (relationTypes?.length) {
      outQuery = outQuery.in('relation_type', relationTypes)
    }
    const { data: outEdges } = await outQuery
    if (outEdges) {
      for (const edge of outEdges) {
        const target = (edge as unknown as { target: KGNode }).target
        neighbors.push({
          node: target,
          edge: edge as unknown as KGEdge,
          direction: 'outgoing',
        })
      }
    }

    // incoming edges
    let inQuery = supabase
      .from('kg_edges')
      .select('*, source:kg_nodes!kg_edges_source_id_fkey(*)')
      .eq('target_id', node.id)
    if (relationTypes?.length) {
      inQuery = inQuery.in('relation_type', relationTypes)
    }
    const { data: inEdges } = await inQuery
    if (inEdges) {
      for (const edge of inEdges) {
        const source = (edge as unknown as { source: KGNode }).source
        neighbors.push({
          node: source,
          edge: edge as unknown as KGEdge,
          direction: 'incoming',
        })
      }
    }

    return neighbors
  }

  /**
   * 두 노드 간 관계 조회
   */
  static async getRelation(code1: string, code2: string): Promise<KGEdge | null> {
    const [n1, n2] = await Promise.all([this.getNodeByCode(code1), this.getNodeByCode(code2)])
    if (!n1 || !n2) return null

    const supabase = await createClient()
    const { data } = await supabase
      .from('kg_edges')
      .select('*')
      .or(`and(source_id.eq.${n1.id},target_id.eq.${n2.id}),and(source_id.eq.${n2.id},target_id.eq.${n1.id})`)
      .limit(1)
      .single()
    return data
  }

  /**
   * 카테고리별 활성 규칙 조회
   */
  static async getRulesByCategory(category: string): Promise<KGRule[]> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('kg_rules')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('weight', { ascending: false })
    return data || []
  }

  /**
   * 전체 활성 규칙 조회
   */
  static async getAllActiveRules(): Promise<KGRule[]> {
    const supabase = await createClient()
    const { data } = await supabase.from('kg_rules').select('*').eq('is_active', true).order('category')
    return data || []
  }

  /**
   * 오행 상생/상극 경로 탐색
   */
  static async getElementPath(
    fromElement: string,
    toElement: string
  ): Promise<{ path: KGNode[]; relations: KGEdge[] }> {
    // BFS for shortest path between two ohang nodes
    const visited = new Set<string>()
    const queue: { code: string; path: KGNode[]; rels: KGEdge[] }[] = []

    const startNode = await this.getNodeByCode(fromElement)
    if (!startNode) return { path: [], relations: [] }

    queue.push({ code: fromElement, path: [startNode], rels: [] })
    visited.add(fromElement)

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current.code === toElement) {
        return { path: current.path, relations: current.rels }
      }

      const neighbors = await this.getNeighbors(current.code, ['generates', 'controls'])
      for (const n of neighbors) {
        if (n.direction === 'outgoing' && !visited.has(n.node.code)) {
          visited.add(n.node.code)
          queue.push({
            code: n.node.code,
            path: [...current.path, n.node],
            rels: [...current.rels, n.edge],
          })
        }
      }
    }

    return { path: [], relations: [] }
  }
}
