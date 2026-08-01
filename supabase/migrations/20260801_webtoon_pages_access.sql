-- 웹툰 본문 페이지 + 무료/멤버십 게이팅 (예고편 = 0화).
--
-- ⚠️ 본문 이미지 경로는 **RLS 로 읽을 수 없는 별도 표**에 둔다.
--    회차 표에 두면 로그인 유저가 supabase 클라이언트로 멤버십 회차의 이미지 URL 을
--    직접 읽어갈 수 있다 — 게이트는 서버 액션 한 곳(getEpisodePages)만 통과시킨다.

-- 0화(예고편) 허용
alter table public.webtoon_episodes drop constraint if exists webtoon_episodes_no_check;
alter table public.webtoon_episodes add constraint webtoon_episodes_no_check check (no >= 0);

-- 무료/멤버십 접근 등급 (기본 free · 11화+ 는 업로드 파이프라인이 membership 으로 넣는다)
alter table public.webtoon_episodes
  add column if not exists access text not null default 'free'
  check (access in ('free', 'membership'));

-- 본문 페이지 — 스토리지 경로만 저장(전체 URL 금지: 버킷 이전·서명 URL 전환을 막지 않기 위해)
create table if not exists public.webtoon_episode_pages (
  episode_id uuid not null references public.webtoon_episodes(id) on delete cascade,
  idx        integer not null check (idx >= 0),
  path       text not null,
  w          integer not null check (w > 0),
  h          integer not null check (h > 0),
  primary key (episode_id, idx)
);

-- RLS: 켜되 정책을 만들지 않는다 = 클라이언트 직접 조회 전면 차단.
-- 읽기는 service_role(서버 액션)만 — 멤버십 판정 후에만 내려간다.
alter table public.webtoon_episode_pages enable row level security;

-- 스토리지 버킷: 무료 회차 = 공개 / 멤버십 회차 = 비공개(서명 URL 전용)
insert into storage.buckets (id, name, public)
values ('webtoon', 'webtoon', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('webtoon-locked', 'webtoon-locked', false)
on conflict (id) do nothing;
