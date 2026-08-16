-- 인연 갈래 — 가족/지인 분리 (CEO 지시 2026-08-16). 라이브 적용 완료, 재적용 무해.
--
-- 파일로 남기는 이유: 7/4 재구축 때 DB 에만 있던 것이 통째로 사라진 전례(project_db_rebuild_gaps).
-- 🔴 뷰는 drop 후 재생성한다 — 컬럼을 중간에 끼우면 create or replace 가 42P16 으로 막힌다.

alter table family_members
  add column if not exists member_category text not null default 'family';

alter table family_members
  drop constraint if exists family_members_member_category_check;

alter table family_members
  add constraint family_members_member_category_check
  check (member_category in ('family', 'acquaintance'));

comment on column family_members.member_category is
  '인연 갈래 — family(가족) / acquaintance(지인). 관계(relationship)와 별개로 관리·집계를 가른다.';

create index if not exists idx_family_members_user_category
  on family_members (user_id, member_category);

drop view if exists v_destiny_targets;

create view v_destiny_targets as
  select p.id, p.id as owner_id, p.full_name as name, '본인'::text as relation_type,
         p.birth_date, p.birth_time, p.calendar_type, p.gender, p.avatar_url,
         null::text as face_image_url, null::text as hand_image_url, p.home_address,
         'self'::text as target_type, 'family'::text as member_category,
         p.updated_at as created_at, p.updated_at, p.is_leap_month
  from profiles p
  union all
  select fm.id, fm.user_id as owner_id, fm.name, fm.relationship as relation_type,
         fm.birth_date, fm.birth_time, fm.calendar_type, fm.gender, null::text as avatar_url,
         fm.face_image_url, fm.hand_image_url, fm.home_address,
         'family'::text as target_type, fm.member_category,
         fm.created_at, fm.created_at as updated_at, fm.is_leap_month
  from family_members fm;
