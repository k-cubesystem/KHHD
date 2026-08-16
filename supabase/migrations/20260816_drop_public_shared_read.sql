-- 🔴 프라이버시 구멍 차단 — 공유 기록 전체 공개 읽기 정책 제거 (2026-08-16). 라이브 적용 완료.
--
-- 있던 정책: analysis_history_shared_read  SELECT  USING (share_token IS NOT NULL)
-- 토큰을 **몰라도** `select * from analysis_history where share_token is not null` 한 줄로
-- anon 키만 있으면 남의 공유 기록 전량(풀이 본문·실명·user_id)을 읽을 수 있었다.
-- 토큰이 «자물쇠»가 아니라 «주소»로만 쓰이고 있었던 셈이다.
--
-- 없애도 공유는 그대로 작동한다: 조회는 SECURITY DEFINER 함수
-- `get_shared_analysis_record(token_input)` 가 `where share_token = token_input` 로 한 행만
-- 돌려준다(RLS 우회). 나머지 share_token 접근은 전부 본인 소유라 analysis_history_all_own 이 덮는다.
--
-- 🔴 되살리지 말 것.

drop policy if exists "analysis_history_shared_read" on analysis_history;
