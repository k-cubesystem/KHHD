# 미디어 연출(영상·음악) + 신위별 TTS + Gemini 비용 계측 기획 v1 (2026-07-21)

> 작성: Fable(기획) → 실행: Opus. 코드·DB 실측 기반.
> 발주 배경(사용자 요구): ①애니메이션 영상·음악 효과를 중간중간 배치 ②채팅 무료 TTS — 신위마다 다른 목소리 ③무료 음악 제작 소스 조사 → 신당 반영 ④힉스필드·제미나이(Veo)로 영상 제작 셋팅 ⑤사주분석 전 기능의 토큰 사용량·비용 연동 ⑥관리자 페이지에 기능별 Gemini 비용 표시(가격 책정 근거).
>
> **실행 순서: Part C(비용 계측)가 최우선** — P0 버그가 실재하고(아래), 가격 책정이라는 사업 목적에 직결. 그다음 TTS → 음악 → 영상.

---

## 0. 현재 상태 실측 (2026-07-21)

### 비용 계측 — 있는데 죽어 있다

- **P0 버그: 사용량 로깅이 RLS 에 막혀 사실상 전멸.** `logUsage`(`lib/services/gemini-rate-limiter.ts:84-123`)가 **유저 세션 클라이언트**(`createClient`, `:96`)로 `gemini_api_logs`에 insert 하는데, 이 테이블의 RLS 는 관리자 ALL + 유저 SELECT 뿐 — **INSERT 정책이 없다**(`supabase/migrations/ai/20260217_gemini_rate_and_usage.sql:148-156`). 일반 유저 호출은 전부 "new row violates row-level security" 로 실패하고 `:121`에서 console 로 삼켜진다. **프로덕션 실측: 전체 14행, 최근 7일 10행** — 관리자 호출만 남은 것.
- **중앙 경로 미계측**: `generateAIContent`(`lib/services/ai-client.ts:28`)에 로깅이 아예 없다. 이 경로를 쓰는 사주·궁합·천지인·재물·년운·트렌드·셀럽궁합·요약/기억 전부 미계측. 직접 호출 3곳도 미계측: 고민상담 채팅(`app/actions/ai/shaman-chat.ts:556`), 천지인 종합(`lib/services/gemini.ts:118`), 이미지 생성(`app/actions/ai/generate-image.ts`). 현재 로깅되는 것은 `withGeminiRateLimit` 경유 6종뿐(invite_compatibility·deity_oracle·daily_fortune·face/fengshui/palm_destiny).
- 단가표 `MODEL_PRICING`(`gemini-rate-limiter.ts:17-38`)에 텍스트 모델은 있으나 **이미지 모델(`gemini-3.1-flash-image-preview`) 단가 없음**(기본값 폴백 — 이미지는 장당 과금이라 이중 부정확).
- 어드민 대시보드(`components/admin/gemini-usage-dashboard.tsx`)는 오늘 총비용·일별 차트·기능별 **호출 수** 차트까지 있으나 **기능별 비용 차트가 없다** — `get_gemini_action_stats` RPC 가 `total_cost_usd`를 이미 반환하는데 UI 가 안 쓴다(`:204-208`, `:377`). 라벨 맵 `ACTION_LABELS`(`:45-61`)의 태반이 실제로 방출되지 않는 죽은 라벨.
- 복채 단가 3원화: UI(`lib/constants.ts:55-70`) · 실차감(`ai_prompts.talisman_cost` — `wallet.ts:88`) · 이력 기록(각 액션 하드코딩) 이 서로 다른 소스.

### TTS — 기반은 있고 차등이 없다

- `hooks/useTts.ts`: Web Speech API 기반(무료·브라우저 내장), 한국어 보이스 자동 선택, `TtsOptions{rate,pitch,lang}` 지원, `NEXT_PUBLIC_TTS_ENDPOINT` 로 서버 TTS 교체 가능한 추상화까지 완비.
- "듣기" 버튼(`components/ai/shaman-chat-interface.tsx:122-131`) + 자동읽기 토글 존재. **그러나 `onSpeak(msg.content)` 가 opts 를 안 넘겨 모든 신위가 같은 목소리.** `shrine_deities.tone` 은 문체 텍스트일 뿐 음성 파라미터 필드는 없음.

### 신당 오디오 — 전량 합성, 외부 음원 0

- `useShrineAudio`(`components/shrine/scene/useShrineAudio.ts`): 효과음 6종(moktak/chime/bell/water/crackle/bara)을 **오실레이터 합성**으로 재생, 외부 파일 0. **BGM 레이어도 이미 존재** — 절차 국악 앰비언트(드론+펜타토닉, `startBgm:99-177`, 테마별 루트음). 음소거 토글 있음.

### 영상 — 제품 전체 사용처 0

- `<video>`·`.mp4`·`.webm` 앱 코드 사용처 **0건**. 연출은 전부 canvas 파티클(`EffectsCanvas`)·CSS.
- 에셋 생성 파이프라인 골격은 이미 확립: `scripts/shrine-assets/generate.mjs`(신위 이미지)·`generate-themes.mjs`(테마 방) — env 키 폴백→generateContent→inlineData 추출→파일 write→멱등 skip→CLI 타겟 필터. **영상 스크립트는 이 골격을 미러링**하면 된다.

---

## Part C — Gemini 토큰·비용 계측 + 관리자 원가 뷰 (최우선)

### C1. 로깅 수복 (P0)

- `logUsage` 의 클라이언트를 `createAdminClient()` 로 교체(같은 파일 `:61` `acquireToken` 선례). 실패 시 `logger.warn`(로깅은 부가 기능 — 본 기능을 막지 않는다).
- 방어적으로 RLS 에 service_role INSERT 는 이미 우회되므로 정책 추가는 불필요 — 단 마이그레이션으로 **정책 현황 주석 기록**(재구축 대비).

### C2. 전 기능 계측 (요구 ⑤ "모든 기능 토큰·비용 연동")

- **중앙 통합**: `generateAIContent`(`ai-client.ts`) 내부에서 응답의 `usageMetadata`(promptTokenCount/candidatesTokenCount)를 뽑아 `logUsage` 호출. `featureKey` 를 `action_type` 으로 그대로 사용 — **featureKey = action_type 표준화**(대시보드 라벨과 1:1).
- 직접 호출 3곳 계측 추가: ①고민상담 채팅(`shaman-chat.ts` — sendMessage 응답의 usageMetadata) ②천지인 종합(`lib/services/gemini.ts:118`) ③이미지 생성(`generate-image.ts` — 토큰이 아니라 **장수 기록**: output_tokens=0, 별도 필드 대신 metadata 활용 또는 이미지 단가로 cost 산정).
- `withGeminiRateLimit` 기존 6종은 유지(이중 로깅 금지 — generateAIContent 를 안 쓰는 경로임을 확인하고 그대로).
- `ACTION_LABELS` 를 실제 방출 action_type 과 정합화(죽은 라벨 삭제, 신규 추가: saju/cheonjiin/compatibility/wealth/year2026/trend/fortune_theme/shaman_chat/summarizer/memory/image_generation 등 — 구현 시 실제 featureKey 전수 grep 후 확정).

### C3. 단가표 보강

- `MODEL_PRICING` 에 이미지 모델 추가. **이미지는 장당 과금** — `estimateCostUsd` 에 이미지 모델 분기(호출당 고정 단가). 단가 수치는 구현 시점에 Google 공식 가격 페이지를 WebFetch 로 확인해 상수화하고 출처·확인일을 주석으로 남긴다(추측 금지).
- KRW 환산 상수는 대시보드 기존 값 재사용(하드코딩 환율이면 상수 파일로 승격 + 주석).

### C4. 관리자 "기능별 원가" 뷰 (요구 ⑥)

- 위치: 기존 `/admin/gemini-usage` 대시보드 확장(신규 페이지 불필요 — 메뉴 [시스템] 그룹에 이미 있음).
- 추가 ①: 기능별 **비용** 차트(BarChart, `total_cost_usd` — 데이터는 RPC 에 이미 있음, `dataKey` 만 확장).
- 추가 ②: **원가 vs 복채 테이블** — 기능별로 [호출 수 · 호출당 평균 원가(₩) · 현재 복채 가격(`ai_prompts.talisman_cost`) · 복채 1만냥당 원가율]. 가격 책정의 직접 근거. `ai_prompts` 조인은 서버 액션에서.
- 기간 선택(오늘/7일/30일)은 기존 RPC 의 days_back 파라미터 재사용.

### C-검증

- 배포 후 **실호출 1건**(오늘의운세 등 저비용) → `gemini_api_logs` 행 증가 + action_type·토큰·cost 채워짐을 execute_sql 로 확인.
- 헬스체크 SMOKE_RPCS 에 `get_gemini_action_stats` 이미 포함(세션23) — 추가 불필요.
- 단위: estimateCostUsd 이미지 분기, featureKey→라벨 정합(방출 action_type 전수 ⊆ ACTION_LABELS 키 테스트).

---

## Part T — 채팅 무료 TTS: 신위별 목소리 (요구 ②)

### 무료 TTS 옵션 비교 (조사 결론)

| 옵션                      | 비용                  | 품질                                 | 신위별 차등              | 판정                                                                                                      |
| ------------------------- | --------------------- | ------------------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Web Speech API (현행)** | 0원, 무제한           | 기기 의존(모바일 한국어 보이스 양호) | voice+rate+pitch 로 가능 | **채택** — 유일한 진짜 무료                                                                               |
| Gemini TTS (API)          | 유료(토큰 과금)       | 상                                   | 화자 선택                | 보류 — "무료" 요구에 반함. `NEXT_PUBLIC_TTS_ENDPOINT` 훅이 이미 있어 추후 유료 전환 시 서버 라우트만 추가 |
| 외부 무료 TTS API         | 무료 티어 한도·불안정 | 중                                   | 제한적                   | 제외 — 운영 리스크                                                                                        |

### T1. 신위별 음성 프로파일

- `lib/domain/shrine/voice-profiles.ts` 신설: `deityCode → { rate, pitch, voiceHint }` 상수. 17신위를 **원형(archetype) 5군**으로 묶어 정의(전 신위 개별 튜닝은 과잉):
  - 장군신(최영 등): rate 0.92 / pitch 0.75 — 낮고 묵직
  - 동자신: rate 1.12 / pitch 1.35 — 맑고 높게
  - 선녀·모성신: rate 0.98 / pitch 1.15 — 부드럽게
  - 천신·칠성신: rate 0.88 / pitch 0.95 — 느리고 장중
  - 기본(대감신 등): rate 0.98 / pitch 1.0
  - `voiceHint`: 'male'|'female'|null — 브라우저 보이스 목록에서 이름 휴리스틱(Google 한국의 경우 단일이라 null 허용)으로 선택 시도, 실패 시 기본 한국어 보이스(우아한 폴백).
- 매핑 소스는 코드 상수(시드 아님 — 음성 파라미터는 UI 관심사). deity 아키타입 분류는 `shrine_deities` 시드의 tier/계열 참고해 구현 시 확정.
- `shaman-chat-interface.tsx`: 현재 좌정 신위 코드(`deityCode` 이미 응답에 있음)로 프로파일 조회 → `onSpeak(text, profile)` 전달. `useTts.speak` 는 이미 opts 를 받는다 — **배선만 하면 된다**.
- 가이드(GlobalGuide)·신탁 등 다른 발화 지점은 이번 범위 밖(후속).

### T-검증

- 단위: voice-profiles 전 신위 코드 커버(누락 시 기본 프로파일) + rate/pitch 범위(0.5~2.0) 가드.
- 수동: 채팅에서 신위 2종(장군신/동자신) 듣기 — 피치 차이 체감 확인은 사용자 몫으로 보고.

---

## Part M — 무료 음악·효과음: 소스 조사 + 신당 반영 (요구 ①③)

### 무료 음원 소스 조사 결론 (상업 서비스 사용 가능 기준)

| 소스                                        | 라이선스                                 | 상업 사용         | 국악/전통 적합도                    | 비고                                              |
| ------------------------------------------- | ---------------------------------------- | ----------------- | ----------------------------------- | ------------------------------------------------- |
| **국립국악원 (gugak.go.kr)**                | 공공누리 1유형(출처표시)                 | ✅                | **최상** — 정악·산조·풍류 실연 음원 | 신당 BGM 1순위. 출처 표기 필요                    |
| **공유마당 (gongu.copyright.or.kr)**        | 기증저작물·만료저작물(CC0/CC-BY 등 건별) | ✅(건별 확인)     | 상 — 전통음악 다수                  | 건별 라이선스 확인 필수                           |
| **Pixabay Music/SFX**                       | Pixabay License(표기 불요)               | ✅(재배포만 금지) | 중 — asian/meditation 계열          | 효과음 보강에 적합                                |
| FreePD                                      | CC0                                      | ✅                | 하                                  | 폴백                                              |
| freesound.org                               | 건별(CC0 필터 사용)                      | ✅(CC0 만)        | 중 — 목탁·풍경·종 실녹음            | 효과음 1순위                                      |
| YouTube Audio Library                       | 유튜브 외 사용 제약 건별                 | ⚠️                | 중                                  | 제외 권장                                         |
| Suno/Udio 무료 티어                         | **상업 사용 불가**                       | ❌                | —                                   | **제외 명시**                                     |
| Stable Audio Open / MusicGen (로컬 AI 생성) | 오픈 모델(생성물 상업 가능)              | ✅                | 중                                  | "제작 소스" — 로컬 GPU 필요, 후순위 옵션으로 기록 |

### M1. 실음원 레이어 (합성 폴백 유지)

- `public/sounds/shrine/` 규약 신설: `bgm-{theme}.mp3`(테마별 BGM), `fx-{soundKey}.mp3`(효과음 6종). **파일이 있으면 실음원, 없으면 현행 오실레이터 합성** — `useShrineAudio` 에 파일 존재 시 `HTMLAudioElement`(BGM, loop)·Web Audio buffer(FX) 재생 분기. 폴백 덕에 음원 수급과 무관하게 배포 안전.
- BGM 음량 낮게(0.25) + 기존 muted 토글 존중 + 페이지 이탈 시 정지(기존 stopBgm 배선 재사용).
- 라이선스 대장: `public/sounds/shrine/CREDITS.md` — 파일별 출처·라이선스·확인일 기록(공공누리 출처표시 의무 이행). 앱 설정/크레딧 화면 노출은 후속.
- **음원 수급**: Opus 는 freesound CC0·Pixabay 에서 효과음(목탁·종·풍경 등) 확보를 시도하되, **다운로드가 로그인·API 키로 막히면 구조까지만 완성하고 "사용자 선곡 대기" 로 보고**(취향 영역이기도 함). 국립국악원 BGM 은 트랙 선곡이 취향 문제라 사용자 선곡 대기 기본.

### M2. 효과음 "중간중간" 배치 확장 (요구 ①의 음악 효과)

- 이미 있는 재생 지점(신당 탭·공명·강신)은 유지. 추가 배선 2곳: ①분석 결과 공개 순간(saju-result 최초 렌더 시 chime 1회) ②궁합 focusAnswers 섹션 등장 시(bara 1회). **전역 음소거 설정을 존중**하고, 최초 사용자 제스처 이전엔 재생 금지(브라우저 정책).

---

## Part V — 영상 연출: 생성 파이프라인 + 재생 구조 (요구 ①④)

### 원칙: 런타임 생성 금지, 1회 생성 에셋

영상 AI(Veo·Higgsfield)는 **초당 과금이라 런타임 생성은 원가 폭탄**. 이미지 파이프라인과 동일하게 **스크립트로 1회 생성 → `public/` 저장 → `<video>` 재생**. 유저 트래픽과 생성 비용이 완전히 분리된다.

### V1. 재생 구조 (영상이 없어도 안전)

- `components/shared/AmbientVideo.tsx` 신설: `<video autoPlay muted loop playsInline>` + `prefers-reduced-motion` 시 정적 포스터 + **파일 404/미존재 시 기존 canvas/CSS 연출로 폴백**(onError). webm(vp9) 우선 + mp4 폴백 소스.
- 배치 지점 2곳(과잉 금지 — 성능·몰입 균형):
  - ① **강신 의식**(`FamilySummonGate`): 강신 순간 3~5초 루프 영상 오버레이
  - ② **분석 로딩**(`SajuLoadingOverlay`): 기존 core-pulse 위에 은은한 앰비언트 루프
  - (신당 방 배경 영상은 EffectsCanvas 와 겹쳐 과부하 — 이번 범위 제외, 후속 검토)
- 모바일 480px 셸 기준 720px 폭·5초 내외·2MB 이하 가이드.

### V2. 생성 파이프라인 `scripts/media-assets/generate-videos.mjs`

- `generate.mjs` 골격 미러링: env 키 폴백 → 스펙 파일(`video-spec.mjs`: id·프롬프트·길이·배치처) → 생성 → `assets-src/video/raw/` → 후처리(ffmpeg 있으면 webm 트랜스코드, 없으면 원본) → `public/videos/{id}.webm` → 멱등 skip → CLI 타겟 필터.
- **어댑터 2종**:
  - `veo`(기본): Gemini API 영상 생성 — 구현 시점에 공식 문서를 WebFetch 로 확인해 모델명·요청 형식·단가를 상수화(출처·확인일 주석). 기존 `GEMINI_API_KEY` 재사용.
  - `higgsfield`: 어댑터 인터페이스 + 스텁 — **API 키(`HIGGSFIELD_API_KEY`) 미설정 시 명확한 안내 후 종료**. 힉스필드 API 공개 여부·형식도 구현 시점 확인, 미공개면 스텁 + 사용자 안내로 마감.
- **⚠️ 생성 실행은 자동 진행 금지**: 스크립트에 `--dry-run`(프롬프트·예상 비용만 출력) 기본. **실제 생성(`--run`)은 예상 비용을 보고한 뒤 사용자 승인 후** — Opus 는 dry-run 까지만 수행하고 예상 비용을 최종 보고서에 명시한다.
- 스펙 초안 2건: `summon-ritual`(강신 — 금빛 부적 소용돌이, 한지 질감, 어두운 배경), `analysis-ambient`(분석 — 느리게 흐르는 먹·금가루). 프롬프트 상세는 DESIGN.md 톤(玄 배경·액체 골드) 준수.

---

## 실행 순서 (Opus — 전부 자동, 각 단계 게이트 통과 후 다음)

| 단계     | 내용                                                                                | 게이트                                                                                         |
| -------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **C-1**  | 로깅 RLS 수복 + generateAIContent 중앙 계측 + 직접 호출 3곳 + actionType 표준화     | tsc·jest·build → 커밋 → **배포 → 실호출 1건 → DB 행 증가 확인**                                |
| **C-2**  | 이미지 단가 + 기능별 비용 차트 + 원가 vs 복채 테이블                                | tsc·jest·build → 커밋 → 배포(어드민 화면은 빌드·단위로 검증, prod e2e 어드민 스펙은 제외 관례) |
| **T-1**  | 신위별 TTS 프로파일 + 채팅 배선                                                     | tsc·jest·build → 커밋 → 배포                                                                   |
| **M-1**  | 실음원 레이어(폴백 유지) + CREDITS.md + 효과음 배치 2곳 + (가능 시) CC0 효과음 수급 | tsc·build → 커밋 → 배포                                                                        |
| **V-1**  | AmbientVideo + 배치 2곳(영상 없음 폴백 동작) + 생성 파이프라인(dry-run 까지)        | tsc·build → 커밋 → 배포                                                                        |
| **마감** | 로드맵·MEMORY 갱신 + 전체 prod 회귀(기존 스펙 직렬 `--workers=1`) + 최종 보고서     | 회귀 0 실패                                                                                    |

**공통 규율**: `git add` 명시 파일만(-A 금지), 타 세션 미커밋 파일 무손상, 각 단계 실패 시 수정 후 재시도.

## 사용자 결정·설정 대기 (구현과 무관하게 진행 가능한 것만 진행)

1. **신당 BGM 트랙 선곡** — 국립국악원 음원 중 취향 선곡(구조는 파일만 넣으면 적용되게 완성됨).
2. **영상 실제 생성 실행** — dry-run 예상 비용 보고 후 승인 시 `--run`.
3. **힉스필드 API 키** — 계정·키 발급 시 `HIGGSFIELD_API_KEY` 설정(어댑터는 준비됨).
4. **TTS 유료 업그레이드 여부** — 브라우저 TTS 품질이 부족하면 Gemini TTS 서버 라우트 추가(비용 발생, 훅은 이미 있음).
