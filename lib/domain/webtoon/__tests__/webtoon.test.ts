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
  STORY_FREE_NOTICE,
  STORY_MEMBER_ONLY_NOTICE,
  STORY_NO_EXTRA_COST_NOTICE,
  STORY_REPLY_NOTICE,
  STORY_SUBMIT_COST,
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
import { REPORT_HIDE_THRESHOLD, REPORT_REASONS, REPORT_REASON_INFO, isReportReason } from '../report'
import {
  EPISODE_CUT_MAX_WIDTH,
  EPISODE_PAGE_MAX,
  EPISODE_SIGNED_URL_TTL_SEC,
  episodeBucket,
  episodeCutPath,
  isEpisodeAccess,
  toEpisodeAccess,
  validateEpisode,
} from '../episode'

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION = read('supabase/migrations/20260801_webtoon.sql')
const ACTIONS = read('app/actions/webtoon/webtoon.ts')
const FORM = read('components/webtoon/StoryForm.tsx')
const REPORTS_MIGRATION = read('supabase/migrations/20260801_webtoon_reports.sql')
const PAGES_MIGRATION = read('supabase/migrations/20260801_webtoon_pages_access.sql')
const VIEWER = read('app/protected/webtoon/[no]/page.tsx')
const PAGES_ACTION = ACTIONS.slice(
  ACTIONS.indexOf('export async function getEpisodePages'),
  ACTIONS.indexOf('export interface WebtoonComment')
)
const ADMIN_MIGRATION = read('supabase/migrations/20260803_webtoon_admin.sql')
/** 주석을 걷어내고 `create policy` 문만 통째로 꺼낸다 — drop 문이 섞이면 검사가 헛돈다. */
const createPolicies = (sql: string): string[] =>
  sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.toLowerCase().startsWith('create policy'))
const ADMIN_ACTIONS = read('app/actions/admin/webtoon.ts')
const ADMIN_EPISODES_UI = read('app/admin/webtoon/webtoon-episodes-client.tsx')
const ADMIN_STORIES_UI = read('app/admin/webtoon/stories/stories-client.tsx')

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

describe('자격 — 접수는 누구나, 제작은 멤버십만 (CEO 2026-08-01 재확정)', () => {
  it('★ 접수에 값이 없다 — 그려질 수 없는 사람에게 값을 받는 구조를 없앴다', () => {
    expect(STORY_SUBMIT_COST).toBe(0)
    expect(STORY_FREE_NOTICE).toContain('복채가 들지 않습니다')
    // 과금 경로가 액션에서 통째로 사라졌는지
    const submit = ACTIONS.slice(ACTIONS.indexOf('export async function submitStory'))
    for (const gone of ['spendBokchae', 'refundBokchae', 'confirmPaid', 'NEEDS_PAYMENT']) {
      expect(submit).not.toContain(gone)
    }
  })

  it('★ 제작 자격이 멤버십임을 **보내기 전에** 말한다', () => {
    expect(STORY_MEMBER_ONLY_NOTICE).toContain('멤버십 회원의 사연')
    // 폼에서 자격 안내가 제출 버튼보다 위에 있어야 한다
    const noticeAt = FORM.indexOf('STORY_MEMBER_ONLY_NOTICE')
    const submitAt = FORM.indexOf('비공개로 보내기')
    expect(noticeAt).toBeGreaterThan(-1)
    expect(noticeAt).toBeLessThan(submitAt)
  })

  it('비회원에게는 멤버십으로 가는 길을 함께 준다 (막다른 길을 만들지 않는다)', () => {
    expect(FORM).toContain('/protected/store?tab=membership')
  })

  it('읽었으면 답한다는 약속이 남아 있다 — 값을 받지 않아도 지킨다', () => {
    expect(STORY_REPLY_NOTICE).toContain('선정 여부와 무관하게')
    expect(STORY_NO_EXTRA_COST_NOTICE).toContain('추가로 드는 비용은 없습니다')
  })

  it('회신 한마디가 본인에게만 내려온다', () => {
    const section = ACTIONS.slice(ACTIONS.indexOf('listMyStories'), ACTIONS.indexOf('SubmitStoryResult'))
    expect(section).toContain('reply_note')
    expect(section).toContain(".eq('user_id', user.id)")
  })
})

describe('댓글 신고 (CEO 2026-08-01)', () => {
  it('사유 다섯과 설명이 짝을 이룬다', () => {
    expect([...REPORT_REASONS]).toEqual(['abuse', 'spam', 'privacy', 'sexual', 'other'])
    for (const r of REPORT_REASONS) {
      expect(REPORT_REASON_INFO[r].label).toBeTruthy()
      expect(REPORT_REASON_INFO[r].gloss).toBeTruthy()
      expect(isReportReason(r)).toBe(true)
    }
    for (const bad of ['', 'hate', null, 3, {}]) expect(isReportReason(bad)).toBe(false)
  })

  it('★ 가림 임계가 도메인과 스키마에서 같은 값이다 (갈리면 화면 설명이 거짓이 된다)', () => {
    expect(REPORT_HIDE_THRESHOLD).toBe(3)
    expect(REPORTS_MIGRATION).toContain('v_count >= 3')
  })

  it('★ 신고는 가리는 일이지 지우는 일이 아니다 — 되돌릴 수 있어야 한다', () => {
    expect(REPORTS_MIGRATION).toContain('hidden_at')
    // 트리거가 행을 지우지 않는다
    expect(REPORTS_MIGRATION).not.toMatch(/delete from public\.webtoon_comments/i)
  })

  it('★ 한 사람이 같은 댓글을 여러 번 신고해 수를 부풀릴 수 없다', () => {
    expect(REPORTS_MIGRATION).toMatch(/unique \(comment_id, reporter_id\)/i)
  })

  it('★ 신고자는 본인 신고만 본다 — 남의 신고가 보이면 공격 수단이 된다', () => {
    expect(REPORTS_MIGRATION).toMatch(
      /create policy webtoon_reports_select_own[\s\S]*?using \(auth\.uid\(\) = reporter_id\)/i
    )
    expect(REPORTS_MIGRATION).toMatch(
      /create policy webtoon_reports_insert_own[\s\S]*?with check \(auth\.uid\(\) = reporter_id\)/i
    )
  })

  it('★ 가림 판정을 액션이 하지 않는다 — 동시 신고 두 건이 둘 다 "아직 2건"으로 읽힌다', () => {
    const report = ACTIONS.slice(ACTIONS.indexOf('export async function reportComment'))
    expect(report).not.toContain('REPORT_HIDE_THRESHOLD')
    expect(report).not.toContain('hidden_at')
    // 사용자 클라이언트로 넣어 RLS 가 최종 관문이 되게 한다
    expect(report).not.toContain('createAdminClient')
    expect(report).toContain("supabase.from('webtoon_comment_reports').insert(")
  })

  it('이미 신고한 댓글은 이유를 구분해 알린다', () => {
    const report = ACTIONS.slice(ACTIONS.indexOf('export async function reportComment'))
    expect(report).toContain("error.code === '23505'")
    expect(report).toContain("error: 'ALREADY'")
  })

  it('가려진 댓글은 목록에서 빠진다', () => {
    expect(ACTIONS).toContain(".is('hidden_at', null)")
    expect(REPORTS_MIGRATION).toMatch(/select using \(deleted_at is null and hidden_at is null\)/i)
  })

  it('신고 화면이 남의 댓글에만 뜬다 — 내 글을 신고할 일은 없다', () => {
    const comments = read('components/webtoon/EpisodeComments.tsx')
    expect(comments).toContain('{!c.mine && (')
    expect(comments).toContain('이 댓글 신고하기')
  })
})

describe('회차 본문 — 게이트는 한 곳, 서명 주소는 값이 든다', () => {
  it('★ 본문 경로 표는 RLS 를 켜고 정책을 하나도 만들지 않는다 (클라이언트 직접 조회 차단)', () => {
    expect(PAGES_MIGRATION).toMatch(/alter table public\.webtoon_episode_pages enable row level security/i)
    // 정책이 하나라도 생기면 게이트가 서버 액션 밖으로 새어 나간다
    expect(PAGES_MIGRATION).not.toMatch(/create policy/i)
  })

  it('★ 자격을 확인하기 전에 주소를 만들지 않는다 — 잠긴 사람에겐 URL 자체가 없다', () => {
    const gate = PAGES_ACTION.indexOf('getCurrentUserMembership()')
    const sign = PAGES_ACTION.indexOf('createSignedUrls(')
    expect(gate).toBeGreaterThan(-1)
    expect(sign).toBeGreaterThan(gate)
    expect(PAGES_ACTION).toContain('return { locked: true, signed: false, pages: [] }')
  })

  it('★ 모르는 접근 등급은 잠근다 — 오타 하나가 유료 회차를 공짜로 열면 안 된다', () => {
    expect(toEpisodeAccess('free')).toBe('free')
    expect(toEpisodeAccess('membership')).toBe('membership')
    for (const v of ['premium', 'FREE', '', null, undefined, 0, {}]) {
      expect(toEpisodeAccess(v)).toBe('membership')
      expect(isEpisodeAccess(v)).toBe(false)
    }
    // 뱃지와 게이트가 같은 함수를 본다 — 판정이 갈라지면 한쪽만 고쳐진다
    expect(ACTIONS).toContain('access: toEpisodeAccess(row.access)')
    expect(PAGES_ACTION).toContain("toEpisodeAccess(ep.access) === 'membership'")
  })

  it('★ 서명 주소를 한 번에 받는다 — 한 장씩 발급하면 컷 수만큼 왕복한다', () => {
    expect(PAGES_ACTION).toContain('createSignedUrls(')
    // 단수형이 돌아오면 50컷짜리 한 화가 50번 왕복한다
    expect(PAGES_ACTION).not.toMatch(/createSignedUrl\(/)
  })

  it('★ 서명 주소는 이미지 최적화를 타지 않는다 — 캐시가 한 번도 맞지 않아 한도를 갉는다', () => {
    // 주소가 요청마다 달라 최적화 캐시의 열쇠가 매번 바뀐다(100명 × 5컷 = 최적화 500회)
    expect(VIEWER).toContain('unoptimized={signed}')
    expect(ACTIONS).toContain('signed: boolean')
  })

  it('★ 유효기간은 한 화를 읽을 만큼만 길다 — 주소 하나가 오래 열려 있으면 회원제가 샌다', () => {
    expect(EPISODE_SIGNED_URL_TTL_SEC).toBeGreaterThanOrEqual(300)
    expect(EPISODE_SIGNED_URL_TTL_SEC).toBeLessThanOrEqual(900)
    // 기간은 도메인 상수 한 곳에서만 나온다
    expect(PAGES_ACTION).toContain('EPISODE_SIGNED_URL_TTL_SEC')
    expect(PAGES_ACTION).not.toMatch(/\b3600\b/)
  })

  it('무료 회차는 공개 URL 그대로 — 서명도 최적화 해제도 하지 않는다', () => {
    expect(PAGES_ACTION).toContain('/storage/v1/object/public/webtoon/')
    expect(PAGES_ACTION).toContain('return { locked: false, signed: false, pages }')
  })
})

describe('운영 화면 — 권한은 RLS 가 지고, 사연만 예외다', () => {
  it('★ 본문 경로 표에 생긴 정책은 전부 is_admin() 을 건다 (회원에게는 여전히 닫혀 있다)', () => {
    const pages = createPolicies(ADMIN_MIGRATION).filter((s) => s.includes('on public.webtoon_episode_pages'))
    expect(pages.length).toBeGreaterThan(0)
    for (const block of pages) {
      expect(block).toMatch(/using \(public\.is_admin\(\)\)/)
      expect(block).toMatch(/with check \(public\.is_admin\(\)\)/)
    }
  })

  it('★ 사연 표에는 어드민 정책을 만들지 않는다 — 브라우저 세션으로 전체를 긁는 길을 안 만든다', () => {
    expect(ADMIN_MIGRATION).not.toContain('webtoon_story_submissions')
    // 그래서 사연 조회는 service_role 이어야 한다
    const list = ADMIN_ACTIONS.slice(
      ADMIN_ACTIONS.indexOf('export async function listAdminStories'),
      ADMIN_ACTIONS.indexOf('export async function updateStory')
    )
    expect(list).toContain('createAdminClient()')
  })

  it('★ 스토리지 정책은 웹툰 버킷 둘에만, 그것도 운영자에게만 열린다', () => {
    const storage = createPolicies(ADMIN_MIGRATION).filter((s) => s.includes('on storage.objects'))
    expect(storage.length).toBeGreaterThanOrEqual(4) // select · insert · update · delete
    for (const block of storage) {
      expect(block).toContain("bucket_id in ('webtoon', 'webtoon-locked')")
      expect(block).toContain('public.is_admin()')
    }
  })

  it('★ 액션 export 가 하나도 빠짐없이 권한을 확인한다 — 어드민 화면 안이라는 사실은 아무것도 안 막는다', () => {
    const fns = ADMIN_ACTIONS.split('export async function').slice(1)
    expect(fns.length).toBeGreaterThanOrEqual(8)
    for (const fn of fns) {
      const name = fn.slice(0, fn.indexOf('(')).trim()
      expect([name, fn.includes('await requireAdmin()')]).toEqual([name, true])
    }
  })

  it('★ 본문 교체는 넣기가 먼저다 — 지우기가 먼저면 넣기 실패에 회차가 통째로 빈다', () => {
    const fn = ADMIN_ACTIONS.slice(ADMIN_ACTIONS.indexOf('export async function saveEpisodePages'))
    const upsert = fn.indexOf('.upsert(rows')
    const del = fn.indexOf('.delete()')
    expect(upsert).toBeGreaterThan(-1)
    expect(del).toBeGreaterThan(upsert)
  })

  it('★ 컷은 올리기 전에 가로를 줄인다 — 최적화를 안 타므로 여기서 안 줄이면 원본이 나간다', () => {
    expect(ADMIN_EPISODES_UI).toContain('resizeImageToWidth(file, EPISODE_CUT_MAX_WIDTH, EPISODE_CUT_QUALITY)')
    // 서버 액션으로 중계하지 않는다(페이로드 한도) — 버킷에 직접 올린다
    expect(ADMIN_EPISODES_UI).toContain('.upload(path, blob')
    expect(EPISODE_CUT_MAX_WIDTH).toBeGreaterThanOrEqual(720)
    expect(EPISODE_CUT_MAX_WIDTH).toBeLessThanOrEqual(1440)
  })

  it('★ 연락처는 접혀 있다 — 운영 화면이라고 전화번호를 늘어놓으면 어깨너머는 똑같다', () => {
    expect(ADMIN_STORIES_UI).toContain('showContact === row.id')
    expect(ADMIN_STORIES_UI).toContain('연락처 보기')
  })

  it('등급과 버킷은 한 짝이다 — 어긋나면 게이트가 통째로 무의미해진다', () => {
    expect(episodeBucket('free')).toBe('webtoon')
    expect(episodeBucket('membership')).toBe('webtoon-locked')
  })

  it('컷 경로는 회차·순번으로 결정된다 — 무작위 이름이면 옛 파일이 버킷에 쌓인다', () => {
    expect(episodeCutPath(0, 0)).toBe('ep-000/000.jpg')
    expect(episodeCutPath(12, 7)).toBe('ep-012/007.jpg')
    // 음수·소수가 경로를 망가뜨리지 않는다
    expect(episodeCutPath(-3, -1)).toBe('ep-000/000.jpg')
    expect(episodeCutPath(2.7, 1.9)).toBe('ep-002/001.jpg')
  })

  it('회차 입력 검증 — 0화(예고편)는 되고 음수·소수는 안 된다', () => {
    const base = { title: '첫 화', summary: '', access: 'free' as const, publishedAt: '' }
    expect(validateEpisode({ ...base, no: 0 })).toHaveLength(0)
    expect(validateEpisode({ ...base, no: -1 })[0].field).toBe('no')
    expect(validateEpisode({ ...base, no: 1.5 })[0].field).toBe('no')
    expect(validateEpisode({ ...base, no: 1, title: 'ㄱ' })[0].field).toBe('title')
    expect(validateEpisode({ ...base, no: 1, summary: 'ㄱ'.repeat(400) })[0].field).toBe('summary')
  })

  it('한 화 컷 상한이 서버와 화면에서 같은 값이다', () => {
    expect(ADMIN_ACTIONS).toContain('EPISODE_PAGE_MAX')
    expect(ADMIN_EPISODES_UI).toContain('EPISODE_PAGE_MAX')
    expect(EPISODE_PAGE_MAX).toBeGreaterThan(0)
  })
})
