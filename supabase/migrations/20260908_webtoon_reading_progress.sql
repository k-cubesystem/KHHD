-- 웹툰 이어보기(2026-09-08 Phase 2 R1) — 유저당 «마지막으로 읽은 회차» 한 줄.
-- 스크롤 위치까지는 담지 않는다(회차 단위면 충분, 과한 상태는 관리 비용만 남긴다).
create table if not exists public.webtoon_reading_progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  episode_no integer not null check (episode_no >= 0),
  updated_at timestamptz not null default now()
);

alter table public.webtoon_reading_progress enable row level security;

-- 본인 것만 — 남의 독서 진행은 조회조차 되지 않는다.
create policy webtoon_progress_own on public.webtoon_reading_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
