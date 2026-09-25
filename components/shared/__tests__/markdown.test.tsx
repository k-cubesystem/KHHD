import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import { Markdown } from '@/components/shared/markdown'

const plain = (source: string) => renderToStaticMarkup(<ReactMarkdown>{source}</ReactMarkdown>)
const fixed = (source: string) => renderToStaticMarkup(<Markdown>{source}</Markdown>)

const MISSED_BY_COMMONMARK = [
  [
    '두 분은 **목(木)과 화(火)**가 서로를 살리는 관계입니다',
    '<p>두 분은 <strong>목(木)과 화(火)</strong>가 서로를 살리는 관계입니다</p>',
  ],
  ['**갑목(甲木)**은 곧게 뻗는 나무입니다', '<p><strong>갑목(甲木)</strong>은 곧게 뻗는 나무입니다</p>'],
]

describe('문장부호로 끝나는 굵게 뒤에 한글이 바로 붙는 경우', () => {
  it.each(MISSED_BY_COMMONMARK)('CommonMark 만으로는 별표가 글자로 남는다 — %s', (source) => {
    expect(plain(source)).not.toContain('<strong>')
  })

  it.each([
    ...MISSED_BY_COMMONMARK,
    ['**목(木)**과 **화(火)**가 만난다', '<p><strong>목(木)</strong>과 <strong>화(火)</strong>가 만난다</p>'],
    ['**木**과 **火(화)**가 만난다', '<p><strong>木</strong>과 <strong>火(화)</strong>가 만난다</p>'],
    ['## **재물운(財物運)**은', '<h2><strong>재물운(財物運)</strong>은</h2>'],
  ])('공용 Markdown 은 굵게로 그린다 — %s', (source, expected) => {
    expect(fixed(source)).toBe(expected)
  })
})

describe('CommonMark 가 이미 맞게 읽는 입력은 바꾸지 않는다', () => {
  it.each([
    '오늘은 **중요** 합니다',
    '굵게가 없는 평범한 문장입니다',
    '2 * 3 * 4',
    '2 ** 3 ** 4',
    '- **재물운**: 좋음\n- **건강운**(주의): 보통',
    '코드 `**갑목(甲木)**은` 는 그대로',
  ])('%s', (source) => {
    expect(fixed(source)).toBe(plain(source))
  })
})

it('굵게로 바꾼 글자도 HTML 이 아니라 이스케이프된 글자로 나간다', () => {
  expect(fixed('**&lt;script&gt;(木)**가')).toBe('<p><strong>&lt;script&gt;(木)</strong>가</p>')
})
