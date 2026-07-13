-- 레거시 도깨비 아바타 URL 정리 (2026-07-13)
-- 도깨비 아바타 폐지(fed3800) 이후 profiles.avatar_url에 남은 '/avatars/dokkaebi-*' 값은
-- 렌더에서 무시되는 죽은 참조 → null로 정리해 자동 아바타(主神>엠블럼>소셜>모노그램)로 폴백.
-- family_members.avatar_id(…_dokkaebi)는 오행 정령 아바타가 동일 id를 재사용하므로 정리 불필요.
UPDATE profiles SET avatar_url = NULL WHERE avatar_url LIKE '/avatars/dokkaebi-%';
