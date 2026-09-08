# 🧠 MEMORY — 프로젝트 컨텍스트 기억 시스템

> **이 파일은 세션이 바뀌어도 프로젝트의 맥락이 유지되도록 합니다.**
> 에이전트는 작업 전 이 파일을 읽고, 작업 후 내용을 업데이트합니다.
> 버전: v4.1 | 관리: 전체 팀 (TEAM_E 총괄)

---

## 🎯 프로젝트 정보

```yaml
프로젝트명: [프로젝트명 기입]
서비스 설명: [한 줄 설명]
타겟 사용자: [누구를 위한 서비스인가]
현재 단계: [아이디어 / 설계 / 개발 / 테스트 / 런치 / 운영]
런치 목표일: [YYYY-MM-DD]
```

---

## 📌 확정된 기술 스택

```yaml
프론트엔드: []
백엔드: []
데이터베이스: []
인증: []
스토리지: []
배포: []
모니터링: []
분석: []
```

> 확정 전: SHARED/STACK.md 초안 참고

---

## ✅ 완료된 주요 작업

| 날짜       | 팀     | 완료 내용                                                                                                                                                                                                                                                                                     | 산출물                                                  |
| ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 2026-08-22 | TEAM_G+B+C | 고민상담 → 「속풀이」 P0 **프로덕션 라이브** — 리네이밍 전면·이어 여쭙기 칩 복원·PC 480px 수복·질문권 환급 RPC·GA4 챗 계측(커밋 4bf6f07·73fa86b·7e8d397·ef0e287, 상세 docs/HANDOFF.md 22차) | PRD/ARCH-counsel-sokpuri-v1.md · P1=쿠팡 광고 리워드(파트너스 가입 선행) |
| 2026-08-26 | TEAM_C | 관리자 **메인 대시보드 지표 수복** — 최근 결제 내역이 payments→profiles 임베드(PGRST200) 실패로 항상 비어 있던 것을 별도 프로필 조회로 교체, 총 분석 횟수 집계를 빈 테이블 saju_records→analysis_history로 이관, 총 회원수는 listUsers 배열 길이→Pagination.total, 조회 에러 전부 logger 기록 | app/admin/page.tsx · components/admin/traffic-chart.tsx |
| 2026-08-26 | TEAM_C | 어드민 사용자 상세 **멤버십 등급 설정 수복** — `subscriptions`에 user_id 유니크 제약이 없어 `upsert(onConflict:'user_id')`가 항상 42P10으로 실패하던 것을 ACTIVE 행 UPDATE / 없으면 INSERT로 교체. NOT NULL인 `customer_key` 누락·존재하지 않는 `profiles.is_subscribed` 갱신도 함께 제거     | app/admin/users/actions.ts `updateUserSubscription`     |
| 2026-09-05 | TEAM_G | **웹툰 페이지 운영·성장 로드맵 v1 설계** — 실측(가입 10·웹툰 이벤트 0·리포 원격 없음) 기반 3 Phase(문 열기→머물게→벌게)+상시 2 Track(연재·확산), 공개 read path=SECURITY DEFINER RPC(잠금 구조 차단), CEO 결정 5건에 권장안 부여. 🔴결정 전 코드 착수 금지·구현 브랜치는 determined-yonath | TEAM_G_DESIGN/prd/PRD-webtoon-page-roadmap-v1.md · architecture/ARCH-webtoon-page-roadmap-v1.md |
| 2026-09-08 | TEAM_G+B+C+D | **웹툰 공개 전환+간이 진맥 라이브** (로드맵 Phase 1, CEO 결정①~⑤ 권장안 승인) — /webtoon 공개 라우트(비로그인 무료 열람·OG·사이트맵), webtoon.html→/webtoon/0 301, 간이 진맥 위젯(회차 중간·생년월일→결정론 오행, 무저장·localStorage, 업계 선례 없음), WEBTOON_FUNNEL 4단 계측, 등급 플립 가드, «매주 금요일» 고지. jest 4,757·lint 0/0. 🔴라이브 = feature/webtoon-public(bf5f3153+, restore/design-merge-0908 상위집합, hhd-at90sc6ew). 🔴main 루트 .vercel 제거됨 — 배포는 워크트리에 project.json 복사 후 vercel deploy --prod --yes. 잔여 W6=웹툰 리포 GitHub private 생성(CEO 1클릭) | app/webtoon/* · lib/domain/webtoon/jinmaek.ts · components/webtoon/{JinmaekWidget,WebtoonTrack,WebtoonCta}.tsx |
| —          | —      | —                                                                                                                                                                                                                                                                                             | —                                                       |

---

## 🚧 현재 진행 중

| 팀  | 작업 내용 | 예상 완료 | 블로커 |
| --- | --------- | --------- | ------ |
| —   | —         | —         | —      |

---

## 🧩 핵심 설계 결정 사항 (ADR)

> ADR = Architecture Decision Record
> "왜 이 기술/구조를 선택했는가"를 기록합니다.

| #   | 결정 | 이유 | 날짜 | 재검토 시점 |
| --- | ---- | ---- | ---- | ----------- |
| 001 | —    | —    | —    | —           |

---

## 🐛 알려진 이슈 & 기술 부채

| #   | 유형 | 내용 | 영향도 | 담당팀 | 상태   |
| --- | ---- | ---- | ------ | ------ | ------ |
| —   | —    | —    | —      | —      | 미착수 |

---

## 📋 반복되는 패턴 & 관례

> 이 프로젝트에서 자주 쓰이는 패턴을 기록합니다.
> 새 에이전트가 빠르게 컨텍스트를 잡는 데 사용합니다.

```
[예: API 응답 형식]
{ success: boolean, data: T | null, error: string | null }

[예: 에러 코드 체계]
AUTH_001: 토큰 만료
AUTH_002: 권한 없음
...

[예: 브랜치 전략]
main → 프로덕션
dev  → 통합 개발
feat/[기능명] → 기능 개발
```
### 브랜치·워크트리 관례 (2026-08-24 확정)

- 새 작업 시작 시 **`worktree-start` 스킬**을 먼저 실행 → `.claude/skills/worktree-start/SKILL.md`
- 워크트리 경로 고정: `.claude/worktrees/<주제>` (`.git/info/exclude`로 제외됨)
- 생성은 **항상 `-b`와 함께** — `git worktree add -b feature/<주제> .claude/worktrees/<주제> <base>`
  · `--detach` 금지 (이름표 없는 커밋은 회수 불가)
- base 브랜치는 **추측 금지**, 최근 커밋순으로 확인 후 확답받고 진행 (세션 4개 동시작업 충돌 이력)
- 코드 수정·배포 전 **`git rev-parse --show-toplevel`로 위치 확인** (cwd 리셋 → main 오배포 이력)
- 폴더는 탐색기로 옮기거나 지우지 말 것 — `git worktree remove` / `move`만 사용 (`.git` 포인터 파일 소실 이력)
- `remove --force`는 git-무시 산출물(`assets-src/video`, `wallpapers`, `preview-shots`, `.vercel`)을
  **영구 삭제**한다. 제거 전 `D:\anti\assets-archive\`로 이동할 것
- 권한: `Bash(git worktree add|remove|prune|list)` → `.claude/settings.local.json`에 등록됨


---

## 💬 CEO 주요 결정 이력

> CEO가 내린 중요한 의사결정을 기록합니다.
> "왜 이렇게 됐는지"를 나중에 추적하기 위해.

| 날짜 | 결정 내용 | 배경 |
| ---- | --------- | ---- |
| —    | —         | —    |

---

## 📚 참고 문서 인덱스

| 문서            | 경로                          | 최종 수정 |
| --------------- | ----------------------------- | --------- |
| 시스템 아키텍처 | TEAM_G_DESIGN/architecture/   | —         |
| PRD             | TEAM_G_DESIGN/prd/            | —         |
| API 명세        | SHARED/                       | —         |
| 보안 아키텍처   | TEAM_H_SECURITY/architecture/ | —         |
| 스킬 레지스트리 | TEAM_F_SKILLS/registry/       | —         |

---

## 🔄 업데이트 규칙

```
언제 업데이트하는가:
✅ 기술 스택 확정 시 → "확정된 기술 스택" 섹션
✅ 주요 기능 완료 시 → "완료된 주요 작업" 섹션
✅ 설계 결정 시      → "핵심 설계 결정 사항(ADR)" 섹션
✅ 버그 발견 시      → "알려진 이슈 & 기술 부채" 섹션
✅ CEO 결정 시       → "CEO 주요 결정 이력" 섹션

누가 업데이트하는가:
- 각 팀: 자신의 작업 결과를 완료 섹션에 추가
- TEAM_E: 전체 현황 취합 및 관리
```

---

_파일: MEMORY.md | 관리: TEAM_E(총괄) + 각팀(자신 영역) | 버전: v4.1_
