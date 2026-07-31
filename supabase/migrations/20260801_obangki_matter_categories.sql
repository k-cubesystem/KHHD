-- 오방기 문복(問卜) 갈래 — CEO 8차b: "실제 오방기 점을 보는 전문가 시스템과 같이".
--
-- 전승에서 오방기는 "무엇을 고를까"를 묻는 제비가 아니라 **한 가지 일(件)**에 대해 신이 답하는
-- 도구다(공수를 확인하거나 처음 공수를 내릴 때 쓴다). 그래서 질문 유형을 선택지 구조
-- (choice/timing/money)에서 전통 문복 갈래 7종으로 바꾼다.
--
-- ⚠️ 옛 값 3종을 CHECK 에 남긴다 — 이미 쌓인 로그를 무효로 만들지 않기 위해서다.
--    새 기록은 7종만 들어오고(코드의 타입 가드가 단일 출처), 옛 값은 읽기 전용으로 남는다.
alter table public.obangki_draws drop constraint if exists obangki_draws_qtype_check;

alter table public.obangki_draws
  add constraint obangki_draws_qtype_check check (
    qtype in (
      -- 문복 갈래 (현행)
      'sinsu',    -- 신수(身數) — 올 한 해 운수
      'jaesu',    -- 재수(財數) — 돈·벌이·사업
      'gwanjae',  -- 관재(官災) — 시비·구설·송사
      'honsa',    -- 혼사(婚事) — 인연·혼인
      'teo',      -- 터(基)    — 집·이사·자리
      'mom',      -- 몸(身)    — 건강
      'jason',    -- 자손(子孫) — 자식·집안 사람
      -- 레거시 (2026-07-30 ~ 08-01 기록 보존용, 새로 쓰지 않는다)
      'choice',
      'timing',
      'money'
    )
  );

comment on column public.obangki_draws.qtype is
  '문복 갈래 — sinsu/jaesu/gwanjae/honsa/teo/mom/jason. choice/timing/money 는 레거시(읽기 전용).';
