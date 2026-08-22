-- 복 배경화면 — 해금 기록(구매·광고)과 「이달의 복」 월간 판(版)
-- PK(user_id, wallpaper_id) 가 중복 해금 방어선. 쓰기는 전부 service_role 전용
-- (클라 INSERT/UPDATE 정책 없음 — 자가발행 차단). 광고 하루 1장 상한은 서버 액션이 KST 로 강제한다.
--
-- ⚠️ 적용 상태: 라이브 DB 적용 완료 (2026-08-22, Supabase MCP, 공개 Storage 버킷 `wallpapers` 포함).
--    이 리포에는 마이그레이션 자동 적용 파이프라인이 없다(CI = prod-smoke 뿐) — 적용 경로는
--    사람이 MCP/SQL 로 거는 것 하나뿐이다. 파일만 보고 미적용으로 판단해 중복 적용하지 말 것
--    (if not exists / drop policy if exists 라 재실행은 무해하지만, 판단 근거는 DB 실측으로).

create table if not exists public.wallpaper_unlocks (
  user_id      uuid not null references auth.users(id) on delete cascade,
  wallpaper_id text not null,
  source       text not null check (source in ('purchase', 'ad')),
  created_at   timestamptz not null default now(),
  primary key (user_id, wallpaper_id)
);

alter table public.wallpaper_unlocks enable row level security;

drop policy if exists wallpaper_unlocks_select_own on public.wallpaper_unlocks;
create policy wallpaper_unlocks_select_own on public.wallpaper_unlocks
  for select using (auth.uid() = user_id);

-- 「이달의 복」 판 — 매월 1·2·3일 크론(/api/cron/wallpaper-monthly)이 ym 1건씩 넣는다.
-- ym PK 가 곧 멱등 열쇠다(같은 달 재실행 = no-op). 그림은 공개 URL 이라 select 는 전원 허용.
create table if not exists public.wallpaper_monthly (
  ym         text primary key,
  image_url  text not null,
  created_at timestamptz not null default now()
);

alter table public.wallpaper_monthly enable row level security;

drop policy if exists wallpaper_monthly_select_all on public.wallpaper_monthly;
create policy wallpaper_monthly_select_all on public.wallpaper_monthly
  for select using (true);
