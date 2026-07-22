# 해화당 개선 로드맵 v1.1 (2026-07-18 갱신)

> 세션19 분석 + 세션20 어드민 콘솔 전수 분석 반영. 근거: 코드베이스 전수(신당 2.0~가족신당·통합상점·어드민 12메뉴), 발견·수정한 결함 패턴, 미완 기획(PLAN-shrine-guide-membership-v1, project_payment_strategy).
> 우선순위: **P0 안정성 → P1 수익 → P2 리텐션 → P3 확장**. 각 항목에 (예상 규모: 세션 단위) 표기.

---

## P0. 안정성·신뢰 (매출 이전의 전제)

1. **에러 모니터링·헬스체크 경보** (小) — **✅완료 세션21**
   - `/api/cron/health` 신설(매일 05:00 KST): 필수 RPC 22종 실재 여부 + 핵심 테이블 12종 접근성 + 필수 환경변수를 대조하고, 깨지면 `logger.error(Error)` → **Sentry captureException** 으로 경보.
   - `check_missing_rpcs(text[])` RPC — **7/4 재구축 때 RPC 8종이 무음 소실**돼 몇 달 방치됐던 사고 클래스를 24시간 안에 잡는다. 가짜 RPC 주입으로 500 발화까지 역검증 완료.
   - ⚠️ `logger.error` 는 **첫 인자가 Error 일 때만** captureException — 문자열 먼저 넘기면 captureMessage 로 새 나간다.
   - 잔여: Sentry 대시보드 alert rule(급증 임계·수신 채널)은 콘솔 설정이라 사용자 작업.
2. **프로덕션 스모크 자동화** (小) — **✅완료 세션21**
   - `.github/workflows/prod-smoke.yml` — 매일 09:30 KST + 수동 실행(workflow_dispatch), 실패 시 아티팩트 업로드. 유저 스펙 6종 실행.
   - 어드민 스펙은 마스터 권한이 필요해 제외(프로덕션 계정을 상시 admin 으로 두지 않기 위함).
   - ⚠️ **활성화하려면 저장소 시크릿 필요**: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` (선택 `E2E_BASE_URL`).
3. **재화 경로 전수 감사** (中) — **부분 완료(세션19)**
   - ✅ 완료: 코드 호출 RPC 34종 vs pg_proc 전수 대조 → 소실 8종 발견, 7종 복원(add_bokchae·추천 2종·운세저널 3종·분석통계). 테스트충전 upsert 버그, 빌링 cron 무존재 RPC 호출 수정.
   - 잔여: `wallets` 직접 쓰기 잔존 경로 grep(admin users 잔액 설정 등 — 아래 A3) + 구세대 뷰 대조(`pg_views` vs 코드 계약).
4. **어드민 작성 데이터 시드화 원칙 지속** (小) — 7/4 DB 재구축 소실 패턴 재발 방지. 공지(announcements)는 운영 데이터라 예외, 나머지 신규 카탈로그는 마이그레이션 시드로만.

## A. 어드민 콘솔 (마스터 계정 관리자 페이지) 분석 · 개선 — 2026-07-18 전수 분석

### 현황 판정 (12메뉴)

| 메뉴            | 판정                    | 근거                                                                                                                                       |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 대시보드        | 유지·개선               | 동작. 총회원이 `listUsers(perPage:1000)` 캡이라 1천명 초과 시 부정확, 매출 합산도 행 전량 로드 후 클라 합산                                |
| 회원 관리       | 유지·개선·**버그 수정** | 검색·역할변경·잔액설정·구독변경·삭제 갖춤. ✅잔액 증감+감사(A3). ✅회원 상세 params await 누락(Next16)으로 상세 전량 404던 것 수정(세션20) |
| 결제 내역       | 유지                    | 동작. 테스트충전 필터 포함(세션19 CHECK 확장으로 로그도 정상 축적)                                                                         |
| 구독 관리       | 유지                    | 동작                                                                                                                                       |
| 멤버십/스토어   | 유지                    | 플랜 편집 동작. ⚠️ 어드민 편집값은 재구축 소실 패턴 대상 — 변경 시 시드 마이그레이션 동기(P0-4)                                            |
| 알림 자동화     | 유지·**버그 수정**      | 구독자 조회가 `status='active'`(소문자) — 규약은 대문자라 **항상 0명 매칭** → 수동 발송이 헛돌던 버그, ✅수정(2026-07-18)                  |
| 공지사항        | 유지                    | 세션19 신설 — 신 가이드 말풍선으로 전 회원 전달                                                                                            |
| 서비스 제어     | 유지                    | system_settings 플래그 — feature-flags·cron이 실제로 읽음                                                                                  |
| 모니터링        | 유지                    | 결제·분석·Gemini 로그 집계 동작. Sentry 에러 뷰는 없음(P0-1과 연결)                                                                        |
| Gemini 사용량   | 유지                    | RPC 실존·동작                                                                                                                              |
| ~~룰렛 확률~~   | **삭제(✅실행)**        | 유저측 룰렛 UI가 어디에도 렌더되지 않음 — 죽은 기능의 설정판                                                                               |
| ~~기능별 복채~~ | **삭제(✅실행)**        | `feature_costs` 0행 + 과금 1순위는 `ai_prompts.talisman_cost`(시드 관리) — 편집해도 효과 없음                                              |

### 개선안

- **A1 (P0, ✅완료 세션20)** 알림 자동화 구독자 status 대소문자 버그 수정.
- **A2 (P1, ✅완료 세션20)** 대시보드 지표 정확도: `get_admin_dashboard_stats` RPC 1콜(총회원 count·매출 SUM·이번달 매출·활성구독·MRR·오늘가입·총분석). 1000명 캡 제거.
- **A3 (P1, ✅완료 세션20)** 회원 잔액 조정: `adjustUserBalance(delta, reason)` — ±증감 입력 + 사유 필수, add/deduct_wallet_balance RPC 경유(음수·레이스 방지), 감사 로그에 전/후 잔액 기록. UI도 증감+미리보기+사유로 개편.
- **A6 (P2, ✅완료 세션20)** admin_audit_log 테이블 + `/admin/audit` 뷰어 + logAdminAction 헬퍼. 잔액조정·역할변경·구독변경·회원삭제 4종 기록(회원삭제는 삭제 전 스냅샷, FK 없어 삭제 후에도 보존).
- **A4 (P2, ✅완료 세션21)** 회원 상세에 **복채 내역**(wallet_transactions 50건, 증감·사유·시각)과 **신당**(본인/가족별 主神·테마·배치 신물 수·공개여부) 탭 추가 → CS 대응 시 DB 직접 조회 불필요.
- **A5 (P2, ✅완료 세션21)** 공지 등록 시 「전 회원 알림함에도 발송」 체크 → notifications 일괄 발행(알림 센터 + 가이드 말풍선). 미체크 시 기존대로 말풍선만. 알림 실패는 부분실패로 구분 표시.
- **A7 (P2, ✅완료 세션21)** 룰렛 죽은 코드 3종 삭제(lucky-roulette·lucky-roulette-button·actions/payment/roulette.ts — 어디서도 렌더되지 않음). **테이블(roulette_config·roulette_history)은 유지** — 0행이라 비용 없고, 드롭은 비가역이며 deleteUser 정리 코드가 참조 중. 부활 시 UI만 붙이면 됨.

## P1. 수익 (상점 개편의 후속)

5. **복채 실결제 퍼널 완성** (中) — **✅완료 세션22**. GA4 퍼널 4단(`store_view`→`store_tab`→`checkout_start`→`bokchae_charge`/`checkout_fail`) 계측. 이탈 지점은 GA4에서 store_view→checkout_start 전환율로 확인. 실패 사유도 라벨로 남김(sdk_unavailable 등).
   - 잔여: 첫충 2배 이벤트를 가이드 말풍선과 연동(공지 채널 재사용).
6. **멤버십별 무료신 패키지** (中) — **✅완료 세션22** (보류 해제, 권장안 A 채택). `lib/services/membership-deity.ts` — SINGLE→대감신(명신) / FAMILY→최영 장군(장군신) / BUSINESS→칠성신(천신). 구독 첫 결제·어드민 등급 부여 시 증정, **멱등**(보유 시 재지급 없음), 해지해도 보유 유지. 좌정은 하지 않음(기존 좌정을 덮지 않기 위해) — 알림으로 신위전 방문 유도.
7. **보존기간 만료 예고 → 기억함 업셀** (小) — **✅완료 세션21**
   - `notify_expiring_chat_sessions` RPC + chat_sessions.expiry_notified_at(멱등). retention cron이 **삭제보다 먼저** D-7 예고 → 예고 없이 지워지는 일 방지.
   - 전달 채널: 알림 센터(`/protected/notifications`, 이번에 신설 — 프로필 링크가 404였음) + 신 가이드 말풍선(개인 알림 우선순위 최상) + 기억의 함 CTA.
8. **결제 전략 결정 실행** (待) — project_payment_strategy의 사용자 결정 4건(채널·복채팩 가격·전환장치·법무) 대기 중. 결정되면 상점 충전 탭에 반영.

## P2. 리텐션·경험

9. **신규 테마 room.webp 이미지 4종** (小) — **✅완료 세션21**. `generate-themes.mjs` 신설(기존 generate.mjs는 신위 전용이라 테마 룸 생성 경로가 아예 없었음). spec-data.mjs themes 단일 소스, 멱등, 512폭 webp. 4종 생성·배포·적용 확인.
10. **가이드 투어 고도화** (中) — **✅완료 세션21**
    - 진행률을 `profiles.guide_progress` JSONB 로 승격(기기 바뀌어도 유지). 구버전 localStorage 값은 **읽기 전용 폴백으로 max 병합** — 이미 본 안내가 다시 뜨지 않는다. 저장은 max 병합이라 다른 기기 진행을 덮어쓰지 않음.
    - 온보딩 넛지: 사주 입력 → 신당 강신 → 첫 상담. 다음 미완료 1건만 "첫걸음 N/3"으로 안내(우선순위: 개인알림 > 공지 > 온보딩 > 투어).
    - 잔여: 공지 다건 롤테이션·등급 타겟팅(무료 유저에게만 업셀 공지 등).
11. **unlock_effect 2~4호** (中) — **✅완료 세션21**. `lib/services/shrine-effects.ts` 신설(카탈로그 JSONB 해석·max_stack 적용·전 신당 합산) + 4종 배선: 향로=신탁 간격 48→24h·주간상한+2(oracle.ts), 초롱=오늘의 운세 '행운의 시간' 프롬프트(daily.ts), 놋방울=입장 시 이름 인사(scene→ShrineRoomClient), 복부적=출석 보상 +10%(attendance.ts, 사유 문구에 내역 표기).
    - 덤: 신규 테마 4종 인사말이 없어 초가 인사로 폴백되던 것 추가(keeper-lines).
12. **과거 세션 검색·페이지네이션** (小) — **✅완료 세션22**. 제목·요지 부분일치 검색(디바운스 300ms) + 20건 페이지 「더 보기」. PostgREST `or` 필터에 쉼표·괄호가 들어가면 파싱이 깨져 문법 문자는 제거한다.
13. **가족 신당 심화** (中) — **✅완료 세션23** (보정 파이프라인 전 구간 연결)
    - ✅ `user_energy_profile` 을 가족 스코프로 확장(PK→UNIQUE NULLS NOT DISTINCT). 본인·가족 모두 관상·손금 보정을 저장·적용할 수 있게 됨.
    - ✅ `applyModifiers()` 신설 — **face_modifier/palm_modifier 는 설계만 되고 적용 코드가 아예 없던 죽은 컬럼**이었다. 이제 값이 들어오면 즉시 기운·용신에 반영된다.
    - ✅ **오행형 생산자 연결(세션23)**: `face_reading`·`palm_reading` 템플릿에 `[[ELEMENT_FORM: 木/火/土/金/水, 근거 한 문장]]` 태그 추가(마이그레이션 `20260719_element_form_tag.sql`, `NOT LIKE '%ELEMENT_FORM%'` 가드로 멱등). **확신이 없으면 태그를 생략**하도록 지시해 억지 분류를 막는다.
      - 후방호환: `image.ts` 파서는 태그를 개별 정규식으로 하나씩 뽑으므로 신규 태그가 기존 파싱에 영향 없음. DB 검증으로 기존 태그 무손상 확인(`legacy_tags_intact=true`).
      - 배선: `parseElementForm()`(단위 9종) → `saveElementFormModifier()` → `user_energy_profile.face/palm_modifier` → `scene.ts` 의 `applyModifiers()`. 보정 +8, 5~90 클램프. 부가 기능이라 실패해도 분석 자체는 성공 처리(경고 로깅).
    - ✅ **우리 가족 기운 지도(세션24)** — `/protected/family/map`. 본인+가족 전원의 오행을 한 화면에 나란히 두고, 가족 평균·전체 용신·「서로 메워주는 인연」을 낸다. 가족 관리 페이지에 입구.
      - 보완 관계는 **A 의 최강 오행 = B 의 최약 오행 + 격차 15 이상**일 때만(`COMPLEMENT_MIN_GAP`). 기준 없이 붙이면 아무 짝이나 인연으로 읽혀 숫자 전체의 신뢰가 깎인다.
      - 액션은 **읽기 전용** — `getSceneData` 와 달리 신당·기운 프로필을 생성하지 않는다(지도를 열었다고 신당이 생기면 안 된다). 프로필 없는 대상은 사주에서 즉석 유도만.
      - ⚠️ `family_members` 에 `avatar_url` 은 없다(`avatar_id`=오행 정령 키). 처음 그렇게 짰다가 42703 으로 지도가 통째로 죽을 뻔했다.
      - 남은 관찰: 자기 자신을 `relationship='본인'` 으로 가족 등록해 둔 계정이 흔해 같은 이름이 두 줄 나온다. 계정 쪽을 '내 계정' 으로 표기해 구분만 해둠 — 병합 여부는 제품 결정 필요.

## P3. 확장

14. **i18n(E6)** (大) — **진행 중 (1/N 화면 완결)**
    - ✅ 세션22: **언어 전환 UI가 어디서도 렌더되지 않던 것**을 프로필 설정 섹션에 배선. `locale-switcher.tsx` 는 완성돼 있었으나 미사용이라, 번역이 있어도 **유저가 언어를 바꿀 방법 자체가 없었다**.
    - ✅ 세션23: **상점 화면 완결**(`store` 섹션 22키 ko/en). `store/page.tsx`(서버=`getTranslations`) + `ThemeShopGrid.tsx`(클라=`useTranslations`). 탭 라벨은 하드코딩 대신 `labelKey`로 바꿔 상수 배열에서 번역을 분리.
    - 실측: 인프라 완비(ko/en 각 15섹션, 쿠키 로케일, 47개 파일이 `useTranslations` 사용). 하드코딩 한글이 tsx 에 약 1,200곳 남아 있다.
    - 잔여 = 문자열 추출 본작업. 절반만 하면 혼재로 더 나빠지므로 **화면 단위 완결 유지**. 다음 순서: 신당 → 고민상담.
15. **신탁 선톡 → 푸시 채널** (中) — deity_oracles를 웹푸시/카카오 알림으로 확장, 재방문 트리거.
16. **공유 신당 소셜 루프** (中) — **부분 완료 세션22**. 가족 신당 공개 옵션 구현: RLS 가 가족 신당을 공개에서 **무조건 제외**하고 있어 소유자가 공개로 바꿔도 효과가 없던 것을 수정. 기본은 비공개(opt-in), 공개 전 **"가족 이름이 신당 이름으로 드러난다"** 확인 다이얼로그. 잔여: 초대 링크 → 가족 구성원 실계정 연결(멀티 계정 가족).

---

## 권장 착수 순서 (다음 세션)

1. ✅완료(세션20): A1·A2·A3·A6 어드민 개선 일괄.
2. ✅완료(세션21): P1-7 만료 예고 업셀 + 알림 센터. P1-6은 사용자 보류.
3. ✅완료(세션21): P2-9 테마 이미지 4종.
4. ✅완료(세션21): A4 회원 상세 신당·복채내역 탭, A5 공지↔알림, A7 룰렛 코드 정리.
5. ✅완료(세션21): P2-10 가이드 서버 저장·온보딩, P2-11 unlock_effect 2~4호.
6. ✅완료(세션21): P0-1 헬스체크 경보 + P0-2 prod e2e 자동화.
   ⚠️ 사용자 작업 2건: ①GitHub 시크릿 등록(E2E_USER_EMAIL/PASSWORD) ②Sentry alert rule 설정.
7. ✅완료(세션22): P2-12 세션 검색, P2-13 가족 신당 심화(부분), P3-14 언어 전환 배선(부분).
8. ✅완료(세션22): P1-6 무료신 패키지, P1-5 결제 퍼널 계측, P3-16 가족 신당 공개 옵션.
9. ✅완료(세션23): P2-13 오행형 프롬프트 태그(승인 후 적용) + i18n 상점 화면.
10. ✅완료(세션24): 우리 가족 기운 지도(항목 13 잔여 해소).

## 남은 것 (세션23 기준)

**사용자 결정 필요 2건**

- ⛔ **결제 전략 §4 법무** — 복채가 선불전자지급수단 등록 대상인지(폐쇄형 예외 가능성). 변호사 자문 영역.
- ⚙️ **운영 설정 2건** — GitHub 시크릿(E2E_USER_EMAIL/PASSWORD), Sentry alert rule.

**신규 기획 (세션25) — ✅완료·배포 (2026-07-21)**

- ✅ **궁합 관계별 맞춤 분석 + 분석 기록 신뢰성 개편** → `PLAN-compatibility-relationship-v1.md` (Part B→A 순 전 단계 실행).
  - **Part B(기록 신뢰성)**: image.ts 관상·손금·풍수 + 사업궁합에 `analysis_history` 저장 배선(재방문마다 재분석·재과금되던 문제 해소 — 프로덕션 FACE 행 0→생성 확인), 저장 실패 관측화(`saveAnalysisHistoryObserved` 래퍼, 라이브 9곳), 히스토리 상세 raw JSON 덤프 제거 → 공용 `CategoryResultBody`(공유 화면과 동일 렌더)·궁합은 `compatibility-result` 읽기전용 재사용, 재분석 404 5건 교정(`reanalyze-routes` 단일화 + 실존 라우트 테스트), 목업/고아 코드 정리, 카카오 공유 배선(JS키 미설정 시 자동 숨김).
  - **Part A(궁합 개편)**: 8 FocusGroup 관계군 분기 + 군별 단골 질문 5개에 직접 답하는 `focusAnswers`, 8대 궁합 쉬운 풀이(라벨 이중화·"이게 뭐냐" 3줄 카드·엔진 details 문장 리라이트), `siblings` 가중치 신설(합=1), 프롬프트 코드 빌더 분리(§9), `engineVersion v3` 캐시(focusGroup 포함 — 같은 두 사람 다른 관계 오재사용 버그 수정), 죽은 시드(R3)·레거시 스튜디오(R4) 삭제, 질문 미리보기 칩 + 관계 자동 프리셋.
  - **대기**: 카카오 JS 키(`NEXT_PUBLIC_KAKAO_JS_KEY`) 설정, 관계별 유료화 여부(§13).

**신규 기획 (세션26) — ✅완료·배포 (2026-07-21)**

- ✅ **미디어·TTS·비용계측** → `PLAN-media-tts-cost-v1.md` (C-1→C-2→T-1→M-1→V-1 순 전 단계 실행·배포).
  - **C(비용 계측)**: P0 수복 — `logUsage` 를 `createAdminClient`(service_role)로 전환(유저세션 insert → RLS 위반 해소), 실호출 검증(gemini_api_logs **14→15**, 신규 `shaman_chat` 행 토큰·비용·유저 채워짐). `generateAIContent` 중앙 계측 + 직접 호출 3곳(shaman_chat·cheonjiin_report·image_generation) + actionType 표준화(`lib/domain/gemini/actions`). 이미지 장당 단가($0.067, Google 공식 확인) + estimateCostUsd 이미지 분기(`lib/domain/gemini/pricing`). 어드민: 기능별 비용(₩) 차트 + **원가 vs 복채** 테이블(가격 책정 근거). RLS 정책 주석 마이그레이션.
  - **T(TTS)**: 17신위 원형 5군 음성 프로파일(rate/pitch/voiceHint, `lib/domain/shrine/voice-profiles`) + 채팅 배선. Web Speech 무료 유지.
  - **M(음원)**: 실음원 레이어(파일 있으면 실음원, 없으면 오실레이터 합성 폴백) + 전역 음소거(localStorage) + 효과음 배치 2곳(사주결과 chime·궁합 focusAnswers bara) + `public/sounds/shrine/CREDITS.md`.
  - **V(영상)**: `AmbientVideo`(영상 없어도 폴백) + 배치 2곳(강신·분석로딩) + `scripts/media-assets` 생성 파이프라인(Veo 3.1 단가 상수화, dry-run 예상 $1.00, higgsfield 스텁).
  - **대기**: 신당 BGM 선곡(국립국악원), 영상 실생성(`--run`) 승인, `HIGGSFIELD_API_KEY`, TTS 유료 업그레이드 여부.

**신규 기획 (세션28) — ✅완료·배포 (2026-07-22)**

- ✅ **디테일: 탄탄함(신뢰)·재미** → `PLAN-detail-trust-fun-v1.md` (R1→R2→R3→F1→F2 전 단계 실행·배포, prod 회귀 0실패).
  - **R1 복채 정합**: `lib/domain/payment/feature-costs.ts` 단일 소스(표시=실차감) — MISSION_CATEGORIES·FORTUNE_MISSIONS·TALISMAN_COSTS_DISPLAY·스튜디오 하드코딩 전부 참조로 교체(관상 목록 5만냥→2만냥). 무료 기능 "무료" 배지, "N복채"→"복채 N만냥" 통일, 신당·상점 "구매"→"봉헌". ai_prompts.talisman_cost 시드 정정(face/palm/fengshui→2, 무료군→0, wealth·image=5) + ACTION_TO_PROMPT_KEY 로 어드민 원가vs복채 '—' 제거. **AI 실패 시 복채 환불**: wealth refundBokchae(마스터 제외)·JSON 파싱 보강, 스튜디오 3종 refundStudioCost(5분 차감검증·멱등).
  - **R2 음력 윤달**: profiles·family_members `is_leap_month` 컬럼 + v_destiny_targets 뷰. getSajuData/calculateDaeun 에 isLeapMonth → `Lunar` 음(-)월(month<0=闰月, lunar.js 소스로 확정). 골든 테스트(2020 윤4월·2023 윤2월, 만세력 교차검증 — 윤달이 월주 교정 단언). 엔진(PersonInfo) 전파(cheonjiin·wealth·core·manse). 출생시간 모름 옵션 + 프롬프트 시주 보류 고지, 서버 기본값 '00:00'→'12:00' 통일. ⚠️가족 등록 폼 윤달 저장은 보호파일(family.ts) 충돌로 보류(폼·컬럼·계산은 완료).
  - **R3 근거·면책**: PillarsStrip(명식 4주, 사주·오늘운세 상단), ServiceDisclaimer(전 결과 하단). 정합: 스튜디오 이미지 이력 실대상 귀속, gemini-rate-limiter console.error→logger, destiny-utils 달력 라벨 isSolarCalendar. 오펀 삭제(app/actions/ai/saju.ts·image.ts checkAndDeductCredits·onboarding-tour). #418 e2e 마스킹 필터 제거(prod 회귀 통과 확인).
  - **F 재미**: 신탁 도착 알림(oracle→notifications deity_oracle) · 오너 신당 소원/방명록/wishCount · 강신 Veo 영상(summon-ritual) · 보상 연출(출석 chime·충전 컨페티·레벨업 bara) · 미사용 파티클 3종(petals/ripple/resonance). 오늘의 정성 대시보드 허브(getDailyRitualStatus 1액션 3상태) · 오늘의 운세 구조화(daily-lucky.ts 결정적 파생 + 단위테스트, AI 계약 불변) · 테마 N/8 수집 표시.
  - **대기**: 무료 기능(사주·궁합·신년) 유료 전환 시점, F-6 카드명 "오늘의 정성", 가족 윤달 저장(family.ts 보호 해제 시), 분석 '合' 로더 미사용(활성 시 sparkle+bell).

**신규 기획 (세션29) — ✅완료·배포 (2026-07-22)**

- ✅ **디테일 v2: 사주영상·명식개편·가족관리·지식가이드** → `PLAN-detail-v2-manse-family-knowledge.md` (V1→V2→V3→V4 전 단계 실행, 단계별 tsc·jest·build 게이트 통과, prod 배포).
  - **V1 가족관리 4종**: 본인 레코드(relationship='본인') 목록·카운트·기운지도 입구에서 숨김(DB 삭제 없음), 기운지도 targets 에서 본인 가족행 제외(profiles self 이중계상 방지). 프로필 라벨 "인연 관리"→"가족·인연 관리". `lib/domain/family/avatars.ts` 신설(오행정령5+신위17=22종 통합 카탈로그, findFamilyAvatar) + FiveAvatarSelector 2구획 UI(기존 avatar_id 하위호환 재노출). 기운지도 진입카드 채도↑·N명 배지, 「오행이란?」 접이식 설명(saju-knowledge-graph 재사용), 막대 오행 한글 병기. 단위테스트 avatars.test(정령·신위·하위호환).
  - **V2 지식 팁**: `lib/domain/guide/knowledge-tips.ts` 신설(오행 그래프 재사용 + 십성·신살·운흐름·용신·궁합·풍수 평문 풀 44개, todayTipIndex 날짜 결정적). GlobalGuide 'knowledge' Bubble 추가 → hasContent 포함(전 페이지 접힌 바 유지), 자동노출 최하위(투어 없는 페이지), 접힌 바 탭 시 (idx+1)%len 회전. 단위테스트 knowledge-tips.test.
  - **V3 사주영상**: 유휴 `analysis-ambient` 영상을 SajuLoadingContent 배경 + 天→地 시네마틱 디바이더에 배선(AmbientVideo, 폴백 유지), 로딩→결과 framer-motion 크로스페이드(0.5s). 신규 영상 생성 없음($0).
  - **V4 명식개편(大)**: 13개 엔진 useMemo(다이얼로그 토글마다 전체 재계산 제거, 계산값 불변). report 탭 AdvancedManseDisplay 제거로 상시노출 중복 5종(신살·십이운성·합충형·공망·세운) 일소 + 운세흐름 신살·개운법 색방위직업 중복 제거. 지장간(藏干) 섹션 신설, 신살·대운·십이운성 SECTION_DESCRIPTIONS 노출, 신강신약 한 줄 해설. 죽은코드 삭제(SINSAL_ADVICE·GONGMANG_SOLUTION·sinsalList·고급만세력 dialog). golden 253/253 통과.
  - **보류(보호파일)**: S3-a 관계 한도 count 정정(`membership.ts`)은 타 세션 보호파일이라 미적용. **판단유지**: 종합 dialog 요약·물상론 실천조언·warnings 공망은 opt-in/가치부가로 유지.
  - **대기**: 신위 아바타 프로필(본인) 확장 여부, 풍수 지식 팁 톤/범위 조정.

**코드 잔여**

- i18n 문자열 추출 약 1,200곳 — 화면 단위 완결(✅상점 → 신당 → 고민상담).
- 가족 초대 링크(멀티 계정), 공지 다건 롤테이션·등급 타겟팅, 첫충 2배 가이드 연동, P3-15 신탁 푸시 채널.

## 사용자 결정 대기

- 결제 전략 4건 (P1-8)
- 무료신 패키지 구성(tier별 어떤 신위) (P1-6)
- 가족 신당 공개/초대 정책 (P3-16)
- 무료 기능(사주·궁합·신년) 유료 전환 시점 (세션28 — 현재 "무료" 정직 표기로 진행)
- F-6 대시보드 허브 카드 명칭 "오늘의 정성" 확정 (세션28)
