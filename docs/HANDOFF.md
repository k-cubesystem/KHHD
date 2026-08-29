# HANDOFF — 다른 기기에서 이어가기

마지막 갱신 **2026-08-29**

> 세션 대화·체크포인트·개인 메모리는 **그 컴퓨터에만** 남는다. 기기를 옮기면 통째로 사라진다.
> 그래서 이 파일이 유일한 인수인계다. **기기를 옮기기 전에 여기를 갱신하고 커밋한다.**

---

## 1. 지금 어디까지 왔나

### 진행 중 — 스레드 마케팅 (브랜치 `claude/marketing-video`)

🔴 **`main` 에는 이 작업이 없다.** 이어가려면 반드시 브랜치를 바꿔야 한다.

| 산출물               | 위치                                                 | 상태                                   |
| -------------------- | ---------------------------------------------------- | -------------------------------------- |
| 「3초 사주」 도구    | `app/saju3/`, `lib/domain/saju/saju3.ts`             | ✅ 완성·실기동 (테스트 31건)           |
| 계정 첫 글           | `TEAM_A_PM/threads-week0-intro.md`                   | ✅ 원고 완성                           |
| 1주차 원고 25편      | `TEAM_A_PM/threads-week1-{mon-wed,thu-sat}.md`       | ✅ 원고 완성                           |
| 페르소나·프로필      | `TEAM_A_PM/threads-persona.md`, `threads-profile.md` | ✅ 확정 (계정 = 「해담 · 청담해화당」) |
| 나침반 멘트 뱅크     | `TEAM_A_PM/threads-compass-lines.md`                 | ✅ 23줄                                |
| 전체 기획            | `TEAM_G_DESIGN/prd/PLAN-threads-marketing-v3.md`     | ✅ v3.2                                |
| 이벤트 자동화 시스템 | `app/admin/threads/`, 크론 4종                       | ✅ 코드 완성 (DB 라이브 적용)          |

**막혀 있는 것 — 전부 사람이 해야 한다**

1. 🔴 **스레드 계정 인증(S1)** — Meta 개발자 앱 · Threads Tester · OAuth. 절차는 `docs/THREADS-SETUP.md`.
   계정 소유자만 가능하고, 이게 끝나야 발행이 된다
2. 해담 본인 이야기 4줄 (수요일 밤 편 빈칸)
3. 지인 동의 사연 (토요일 밤 편)
4. **발행일이 정해지면 한줄형 6편만 그날 일진으로 재계산** — 나머지 20편은 날짜와 무관
   (원고는 2026-08-24~30 기준으로 써둠, 그 주는 이미 지남)

**아직 배포 안 함** — CEO 지시: "다 완성하고 API 연동해서 배포". `/saju3` 는 로컬에서만 돈다.

---

## 2. 다른 PC에서 이어가는 법

### 코드는 따라온다 / 대화는 안 따라온다

| 따라오는 것                  | 안 따라오는 것                                      |
| ---------------------------- | --------------------------------------------------- |
| 코드·문서 (git)              | 세션 대화 내용                                      |
| 저장소 안 `MEMORY/MEMORY.md` | 개인 메모리 `~/.claude/projects/*/memory/`          |
|                              | 체크포인트 훅 `~/.claude/hhd-session-checkpoint.md` |
|                              | gstack 상태 `~/.gstack/`                            |
|                              | Vercel CLI 로그인 · `.vercel/` (gitignore)          |

### 절차

```bash
git clone https://github.com/k-cubesystem/KHHD.git
cd KHHD
git checkout claude/marketing-video   # 🔴 main 아님
npm ci
```

그리고 Claude Code 를 열어 **이 파일부터 읽으라고** 하면 된다 (`CLAUDE.md` 머리에 포인터가 박혀 있어 대개 자동으로 걸린다).

### 옵션 비교

| 방법                              | 되는 것                                       | 안 되는 것                                                                 |
| --------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| **claude.ai/code (웹)**           | 어느 PC·브라우저에서든 접속. 계정만 있으면 됨 | 이 PC 로컬 파일·로컬 dev 서버엔 못 붙음                                    |
| **다른 PC에 clone + Claude Code** | 코드 작업 전부                                | 대화 맥락 없음 → 이 파일로 복구                                            |
| **모바일 앱**                     | 수정·커밋·push·테스트·빌드·Supabase MCP       | 🔴 **프로덕션 배포 불가** (`.vercel` 이 gitignore, CLI 로그인이 기기 로컬) |
| **Remote Control**                | 다른 PC에서 이 PC 세션에 직접 붙기            | **현재 이 세션엔 연결돼 있지 않음** — 쓰려면 먼저 설정 필요                |

### 🔴 재개 전에 반드시

```bash
git pull
```

이 저장소는 **여러 세션이 같은 브랜치에 동시에 커밋한다.** pull 은 선택이 아니다.
워크트리에서 작업할 땐 `git rev-parse --show-toplevel` 로 **어디를 가리키는지 먼저 확인** —
워크트리가 사라지면 git 이 조용히 `main` 을 가리켜서 엉뚱한 데 커밋된다(실제로 두 번 났다).

---

## 3. 이 PC(상시 켜둔 서버)에서 하는 일

- **프로덕션 배포** — 여기서만 된다. `cd <워크트리> && vercel deploy --prod --yes`
- 로컬 dev 서버 — 워크트리엔 `node_modules` 가 없으므로 상위 것을 절대경로로 쓴다:
  `node D:/anti/haehwadang/node_modules/next/dist/bin/next dev -p <포트>`
  (env 는 `D:/anti/haehwadang/.env.local`)
- 대용량 자산 — `assets-src/`(138MB)는 **커밋 안 함**. 영상·이미지는 D 드라이브에 둔다

---

## 4. 손대기 전에 알아야 할 함정

- **배포 브랜치는 `claude/determined-yonath`** — `main` 이 아니다
- OG 카드는 Google Fonts 응답 형식이 바뀌면 통째로 죽는다(2026-08-21에 4곳 수복). 배포 후 카톡 링크 미리보기로 한 번 확인
- 날짜 검증에 `new Date(...).toISOString()` 비교를 쓰면 KST 서버에서 하루가 밀려 전부 거절된다 → UTC 성분으로 검사
- Satori(OG): 자식이 둘 이상인 요소는 `display:flex` 필수 → 텍스트 조각은 한 문자열로 합칠 것
