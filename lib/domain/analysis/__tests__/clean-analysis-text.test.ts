import { cleanAnalysisText, stripAnalysisTags, escapeHtml } from '../clean-analysis-text'

describe('escapeHtml', () => {
  it('&, <, > 를 엔티티로 변환하며 & 를 먼저 처리', () => {
    expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d')
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })
})

describe('stripAnalysisTags', () => {
  it('[[...]] 태그를 제거하고 텍스트만 남긴다', () => {
    expect(stripAnalysisTags('앞 [[EARS: 8, 귀가 크다]] 뒤')).toBe('앞  뒤')
  })

  it('[[SHOPPING_LIST]] 블록 전체를 제거한다', () => {
    const raw = '설명\n[[SHOPPING_LIST]]\n- 화분\n- 조명\n[[/SHOPPING_LIST]]\n끝'
    const out = stripAnalysisTags(raw)
    expect(out).not.toContain('SHOPPING_LIST')
    expect(out).not.toContain('화분')
    expect(out).toContain('설명')
    expect(out).toContain('끝')
  })

  it('빈 문자열/타입 방어', () => {
    expect(stripAnalysisTags('')).toBe('')
  })
})

describe('cleanAnalysisText — 태그 제거', () => {
  it('인라인 [[TAG]] 제거', () => {
    const out = cleanAnalysisText('[[FIRST_IMPRESSION: 신뢰감]]안녕하세요')
    expect(out).toContain('안녕하세요')
    expect(out).not.toContain('[[')
    expect(out).not.toContain('FIRST_IMPRESSION')
  })

  it('SHOPPING_LIST 블록 제거', () => {
    const raw = '본문\n[[SHOPPING_LIST]]\n- 아이템1\n- 아이템2\n[[/SHOPPING_LIST]]'
    const out = cleanAnalysisText(raw)
    expect(out).not.toContain('SHOPPING_LIST')
    expect(out).not.toContain('아이템1')
    expect(out).toContain('본문')
  })

  it('여러 태그가 섞인 줄에서 태그만 제거', () => {
    const out = cleanAnalysisText('[[EARS: 8, x]][[EYES: 6, y]]핵심 문장')
    expect(out).toBe('핵심 문장')
  })
})

describe('cleanAnalysisText — 마크다운 변환', () => {
  it('**굵게** → <b>', () => {
    expect(cleanAnalysisText('이것은 **중요** 합니다')).toBe('이것은 <b>중요</b> 합니다')
  })

  it('## 소제목 → <h4>', () => {
    expect(cleanAnalysisText('## 종합 평가')).toBe('<h4>종합 평가</h4>')
  })

  it('### 도 <h4>로 정규화', () => {
    expect(cleanAnalysisText('### 개운법')).toBe('<h4>개운법</h4>')
  })

  it('소제목 안의 굵게도 처리', () => {
    expect(cleanAnalysisText('## **핵심** 정리')).toBe('<h4><b>핵심</b> 정리</h4>')
  })

  it('- 리스트를 <ul><li>로 묶는다', () => {
    const out = cleanAnalysisText('- 첫째\n- 둘째')
    expect(out).toBe('<ul>\n<li>첫째</li>\n<li>둘째</li>\n</ul>')
  })

  it('* 와 • 도 리스트로 인식', () => {
    expect(cleanAnalysisText('* 별표\n• 불릿')).toBe('<ul>\n<li>별표</li>\n<li>불릿</li>\n</ul>')
  })

  it('연속 텍스트 줄은 <br>로 이어붙인다', () => {
    expect(cleanAnalysisText('첫 줄\n둘째 줄')).toBe('첫 줄\n<br>둘째 줄')
  })

  it('빈 줄에서 문단이 끊긴다(불필요한 <br> 없음)', () => {
    const out = cleanAnalysisText('문단1\n\n문단2')
    expect(out).toBe('문단1\n문단2')
    expect(out).not.toContain('<br>')
  })

  it('리스트 뒤 텍스트가 오면 <ul>이 닫힌다', () => {
    const out = cleanAnalysisText('- 항목\n다음 문장')
    expect(out).toBe('<ul>\n<li>항목</li>\n</ul>\n다음 문장')
  })
})

describe('cleanAnalysisText — XSS 안전', () => {
  it('입력의 HTML을 이스케이프하여 스크립트 실행을 차단', () => {
    const out = cleanAnalysisText('<script>alert(1)</script>')
    expect(out).toContain('&lt;script&gt;')
    expect(out).not.toContain('<script>')
  })

  it('img onerror 같은 속성 주입도 이스케이프', () => {
    const out = cleanAnalysisText('<img src=x onerror=alert(1)>')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img')
  })

  it('허용 태그(<b>)는 정상 생성되지만 입력의 < 는 무력화', () => {
    const out = cleanAnalysisText('**굵게** 그리고 <b>주입</b>')
    // 우리가 만든 <b>는 존재
    expect(out).toContain('<b>굵게</b>')
    // 입력에 있던 <b> 는 이스케이프됨
    expect(out).toContain('&lt;b&gt;주입&lt;/b&gt;')
  })

  it('빈 입력 방어', () => {
    expect(cleanAnalysisText('')).toBe('')
  })
})
