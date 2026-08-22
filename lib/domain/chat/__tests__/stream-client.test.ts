import { parseSseBuffer } from '../stream-client'

/**
 * SSE 는 «청크 경계가 이벤트 경계와 무관»한 것이 함정이다 — 네트워크가 문장을 아무 데서나 자른다.
 * 파서가 잔여를 물고 있지 않으면 토큰이 잘리거나 통째로 사라진다.
 */
describe('parseSseBuffer', () => {
  it('완성된 이벤트를 뽑고 잔여는 남긴다', () => {
    const { events, rest } = parseSseBuffer('event: token\ndata: {"t":"안녕"}\n\nevent: token\ndata: {"t":"하')
    expect(events).toEqual([{ event: 'token', data: '{"t":"안녕"}' }])
    expect(rest).toBe('event: token\ndata: {"t":"하')
  })

  it('잔여에 이어 붙이면 다음 호출에서 완성된다', () => {
    const first = parseSseBuffer('event: token\ndata: {"t":"하')
    expect(first.events).toHaveLength(0)
    const second = parseSseBuffer(first.rest + '세요"}\n\n')
    expect(second.events).toEqual([{ event: 'token', data: '{"t":"하세요"}' }])
    expect(second.rest).toBe('')
  })

  it('한 청크에 여러 이벤트가 와도 순서대로 뽑는다', () => {
    const { events } = parseSseBuffer(
      'event: meta\ndata: {"emotion":"smile"}\n\nevent: token\ndata: {"t":"오"}\n\nevent: token\ndata: {"t":"셨"}\n\n'
    )
    expect(events.map((e) => e.event)).toEqual(['meta', 'token', 'token'])
    expect(JSON.parse(events[0].data).emotion).toBe('smile')
  })

  it('data 여러 줄은 개행으로 잇는다 (SSE 규약)', () => {
    const { events } = parseSseBuffer('event: done\ndata: {"full":"첫줄\ndata: 둘째줄"}\n\n')
    expect(events[0].data).toBe('{"full":"첫줄\n둘째줄"}')
  })

  it('data 없는 블록(주석·하트비트)은 이벤트로 세지 않는다', () => {
    const { events, rest } = parseSseBuffer(': keep-alive\n\nevent: token\ndata: {"t":"가"}\n\n')
    expect(events).toHaveLength(1)
    expect(rest).toBe('')
  })

  it('빈 버퍼는 아무것도 만들지 않는다', () => {
    expect(parseSseBuffer('')).toEqual({ events: [], rest: '' })
  })
})
