import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  COMMENT_MAX,
  COMMENT_MIN,
  COMMENT_PER_EPISODE_LIMIT,
  COMMENT_PUBLIC_NOTICE,
  displayName,
  isCommentValid,
  timeAgo,
  validateComment,
} from '../comment'
import {
  STORY_BODY_MAX,
  STORY_BODY_MIN,
  STORY_CONTACT_NOTICE,
  STORY_DAILY_LIMIT,
  STORY_PRIVACY_NOTICE,
  STORY_SELECTION_NOTICE,
  STORY_STATUS_LABEL,
  STORY_TITLE_MAX,
  isStoryStatus,
  isStoryValid,
  storyMailBody,
  storyMailSubject,
  validateStory,
  type StoryDraft,
} from '../story'

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION = read('supabase/migrations/20260801_webtoon.sql')
const ACTIONS = read('app/actions/webtoon/webtoon.ts')
const FORM = read('components/webtoon/StoryForm.tsx')

const ok: StoryDraft = {
  title: '할머니의 신당',
  body: 'ㄱ'.repeat(STORY_BODY_MIN),
  contactName: '김해화',
  contactPhone: '010-1234-5678',
  contactKakao: 'haehwa',
}

describe('사연 접수 — 비공개가 이 표의 전부다', () => {
  it('하루 상한이 있고 길이 경계가 정해져 있다', () => {
    expect(STORY_DAILY_LIMIT).toBe(3)
    expect(STORY_BODY_MIN).toBeLessThan(STORY_BODY_MAX)
    expect(STORY_TITLE_MAX).toBeGreaterThan(0)
  })

  it('★ 세 가지 약속이 문구로 존재한다 — 비공개·연락 용도·선정 시에만 연락', () => {
    expect(STORY_PRIVACY_NOTICE).toContain('공개되지 않습니다')
    expect(STORY_CONTACT_NOTICE).toContain('연락에만')
    expect(STORY_CONTACT_NOTICE).toContain('선정되신 경우에만')
    expect(STORY_SELECTION_NOTICE).toBeTruthy()
  })

  it('★ 약속이 **입력 위**에 그려진다 — 보내고 나서 알려 주는 것은 약속이 아니다', () => {
    const noticeAt = FORM.indexOf('비공개로 접수됩니다')
    const firstInput = FORM.indexOf('id="story-title"')
    const submitAt = FORM.indexOf('비공개로 보내기')
    expect(noticeAt).toBeGreaterThan(-1)
    expect(noticeAt).toBeLessThan(firstInput)
    expect(firstInput).toBeLessThan(submitAt)
  })

  it('빈 칸·짧은 사연·번호 없음을 각각 잡아낸다', () => {
    expect(isStoryValid(ok)).toBe(true)
    expect(validateStory({ ...ok, title: '' })[0].field).toBe('title')
    expect(validateStory({ ...ok, body: '짧다' })[0].field).toBe('body')
    expect(validateStory({ ...ok, contactName: '' })[0].field).toBe('contactName')
    expect(validateStory({ ...ok, contactPhone: 'abc' })[0].field).toBe('contactPhone')
  })

  it('카카오톡 아이디는 **선택**이다 — 없어도 통과한다', () => {
    expect(isStoryValid({ ...ok, contactKakao: '' })).toBe(true)
  })

  it('전화번호 모양을 좁히지 않는다 — 하이픈·국가번호·공백 다 통과한다', () => {
    for (const phone of ['01012345678', '010-1234-5678', '+82 10 1234 5678', '02) 123-4567']) {
      expect(isStoryValid({ ...ok, contactPhone: phone })).toBe(true)
    }
  })

  it('상태 네 가지와 표시 문구가 짝을 이룬다', () => {
    for (const s of ['received', 'reviewing', 'selected', 'declined']) {
      expect(isStoryStatus(s)).toBe(true)
      expect(STORY_STATUS_LABEL[s as keyof typeof STORY_STATUS_LABEL]).toBeTruthy()
    }
    for (const bad of ['', 'done', null, 3, {}]) expect(isStoryStatus(bad)).toBe(false)
  })
})

describe('★ 알림 메일 — 사연도 연락처도 싣지 않는다', () => {
  it('본문에 접수번호·시각·길이만 담긴다', () => {
    const body = storyMailBody({ submissionId: 'abc-123', receivedAt: '2026-08-01T00:00:00Z', bodyLength: 512 })
    expect(body).toContain('abc-123')
    expect(body).toContain('512자')
    expect(body).toContain('메일에 담지 않습니다')
  })

  it('제목에 사연 제목만 들어가고 길면 잘린다', () => {
    expect(storyMailSubject('할머니의 신당', 2)).toContain('#2')
    expect(storyMailSubject('가'.repeat(80), null).length).toBeLessThan(60)
  })

  it('메일 모듈이 사연 본문·연락처 필드를 만지지 않는다', () => {
    const mail = read('lib/services/story-mail.ts')
    for (const field of ['contact_name', 'contact_phone', 'contact_kakao', 'draft.body']) {
      expect(mail).not.toContain(field)
    }
  })
})

describe('댓글 — 공개 표라 규율이 정반대다', () => {
  it('길이 경계와 회차당 상한이 있다', () => {
    expect(COMMENT_MIN).toBe(1)
    expect(COMMENT_MAX).toBe(500)
    expect(COMMENT_PER_EPISODE_LIMIT).toBeGreaterThan(0)
  })

  it('빈 글·너무 긴 글을 잡는다', () => {
    expect(validateComment('   ')).not.toBeNull()
    expect(validateComment('ㄱ'.repeat(COMMENT_MAX + 1))).not.toBeNull()
    expect(isCommentValid('잘 봤습니다')).toBe(true)
  })

  it('공개라는 사실을 문구가 먼저 말한다', () => {
    expect(COMMENT_PUBLIC_NOTICE).toContain('누구나')
    expect(COMMENT_PUBLIC_NOTICE).toContain('개인정보')
  })

  it('표시 이름이 없으면 「독자」 — 이메일·아이디를 대신 쓰지 않는다', () => {
    expect(displayName(null)).toBe('독자')
    expect(displayName('  ')).toBe('독자')
    expect(displayName('김해화')).toBe('김해화')
  })

  it('timeAgo 는 주입된 시각만 쓴다 (렌더 중 시계를 읽지 않기 위한 계약)', () => {
    const now = 1_700_000_000_000
    expect(timeAgo(now, now)).toBe('방금 전')
    expect(timeAgo(now - 90_000, now)).toBe('1분 전')
    expect(timeAgo(now - 7_200_000, now)).toBe('2시간 전')
    // 미래 시각(시계 어긋남)도 깨지지 않는다
    expect(timeAgo(now + 60_000, now)).toBe('방금 전')
  })
})

describe('스키마 — 세 표의 공개 범위가 서로 다르다', () => {
  it('★ 사연 표에 공개 정책이 없다 (본인 조회 하나뿐)', () => {
    const block = MIGRATION.slice(MIGRATION.indexOf('webtoon_story_submissions'))
    expect(block).toMatch(/create policy webtoon_story_select_own[\s\S]*?using \(auth\.uid\(\) = user_id\)/i)
    // 쓰기 정책을 주면 하루 상한을 우회할 수 있고, 공개 select 를 주면 남의 사연이 새어 나간다
    expect(block).not.toMatch(/create policy[\s\S]*?for\s+(insert|update|delete)/i)
  })

  it('★ 댓글 insert 정책에 auth.uid() = user_id 가 있다 (사칭 삽입 차단)', () => {
    expect(MIGRATION).toMatch(
      /create policy webtoon_comments_insert_own[\s\S]*?with check \(\s*auth\.uid\(\) = user_id/i
    )
    // 미공개 회차에 다는 길도 같은 정책이 막는다
    expect(MIGRATION).toMatch(/webtoon_comments_insert_own[\s\S]*?published_at is not null/i)
  })

  it('댓글 수정 정책이 using·with check 를 모두 건다', () => {
    const upd = /create policy webtoon_comments_update_own([\s\S]*?);/i.exec(MIGRATION)?.[1] ?? ''
    expect(upd).toContain('using (auth.uid() = user_id)')
    expect(upd).toContain('with check (auth.uid() = user_id)')
  })

  it('회차는 공개된 것만 읽힌다', () => {
    expect(MIGRATION).toMatch(/webtoon_episodes_select_published[\s\S]*?published_at is not null/i)
  })

  it('접수 RPC 는 service_role 전용이고 어드바이저리 잠금을 쥔다', () => {
    expect(MIGRATION).toMatch(/create or replace function public\.submit_webtoon_story/i)
    expect(MIGRATION).toMatch(/security definer/i)
    expect(MIGRATION).toMatch(/pg_advisory_xact_lock/i)
    expect(MIGRATION).toMatch(
      /revoke all on function public\.submit_webtoon_story[\s\S]*?from public, anon, authenticated/i
    )
    expect(MIGRATION).toMatch(/grant execute on function public\.submit_webtoon_story[\s\S]*?to service_role/i)
  })
})

describe('서버 액션 계약', () => {
  it('★ 사연은 언제나 본인 것만 조회한다 — 남의 사연은 개수조차 나오지 않는다', () => {
    const section = ACTIONS.slice(ACTIONS.indexOf('listMyStories'))
    expect(section).toContain(".eq('user_id', user.id)")
    // 목록에 연락처 컬럼을 실으면 접수 확인 화면에서 어깨너머로 읽힌다
    for (const col of ['contact_name', 'contact_phone', 'contact_kakao']) {
      expect(section.slice(0, section.indexOf('SubmitStoryResult'))).not.toContain(col)
    }
  })

  it('★ 댓글은 admin 이 아니라 사용자 클라이언트로 넣는다 (RLS 가 최종 관문)', () => {
    const add = ACTIONS.slice(ACTIONS.indexOf('export async function addComment'), ACTIONS.indexOf('removeComment'))
    expect(add).toContain("supabase\n    .from('webtoon_comments')\n    .insert(")
    expect(add).not.toContain('createAdminClient')
    expect(add).not.toContain('admin.')
  })

  it('★ 저장이 알림보다 먼저다 — 메일 실패로 사연이 사라지면 안 된다', () => {
    const submit = ACTIONS.slice(ACTIONS.indexOf('export async function submitStory'))
    const rpc = submit.indexOf("admin.rpc('submit_webtoon_story'")
    const mail = submit.indexOf('notifyStorySubmission(')
    expect(rpc).toBeGreaterThan(-1)
    expect(mail).toBeGreaterThan(rpc)
    // 알림 결과로 성공을 뒤집지 않는다
    expect(submit).toContain('return { success: true, notified }')
  })

  it('댓글에 rate limit 과 회차당 상한이 함께 걸린다', () => {
    expect(ACTIONS).toContain('rateLimit(`webtoon-comment:${user.id}`')
    expect(ACTIONS).toContain('COMMENT_PER_EPISODE_LIMIT')
  })
})
