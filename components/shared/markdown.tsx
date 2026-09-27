import type { Nodes, PhrasingContent, Root } from 'mdast'
import ReactMarkdown from 'react-markdown'

type PhrasingParent = Extract<Nodes, { children: PhrasingContent[] }>

const PHRASING_PARENT_TYPES: ReadonlySet<Nodes['type']> = new Set<PhrasingParent['type']>([
  'paragraph',
  'heading',
  'tableCell',
  'emphasis',
  'strong',
  'delete',
  'link',
  'linkReference',
])

const LEFTOVER_STRONG = /\*\*([^\s*](?:[^*\n]*[^\s*])?)\*\*/g

const isPhrasingParent = (node: Nodes): node is PhrasingParent => PHRASING_PARENT_TYPES.has(node.type)

function splitLeftoverStrong(node: PhrasingContent): PhrasingContent[] {
  if (node.type !== 'text') return [node]
  const parts: PhrasingContent[] = []
  let cursor = 0
  for (const match of node.value.matchAll(LEFTOVER_STRONG)) {
    const start = match.index ?? 0
    if (start > cursor) parts.push({ type: 'text', value: node.value.slice(cursor, start) })
    parts.push({ type: 'strong', children: [{ type: 'text', value: match[1] }] })
    cursor = start + match[0].length
  }
  if (parts.length === 0) return [node]
  if (cursor < node.value.length) parts.push({ type: 'text', value: node.value.slice(cursor) })
  return parts
}

function visit(node: Nodes): void {
  if (!('children' in node)) return
  if (isPhrasingParent(node)) node.children = node.children.flatMap(splitLeftoverStrong)
  for (const child of node.children) visit(child)
}

/**
 * CommonMark 는 닫는 `**` 앞이 문장부호이고 뒤에 글자가 붙으면 닫지 않는다(right-flanking 규칙).
 * 조사가 바로 붙는 한국어 — `**갑목(甲木)**은` — 에서는 별표가 그대로 화면에 남는다.
 * 파서가 짝짓지 못하고 글자로 남긴 `**…**` 만 굵게 노드로 바꾼다. 코드·HTML 은 text 노드가 아니라 손대지 않는다.
 */
export function remarkCjkStrong() {
  return (tree: Root) => visit(tree)
}

const REMARK_PLUGINS = [remarkCjkStrong]

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{children}</ReactMarkdown>
}
