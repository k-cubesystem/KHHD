#!/bin/bash
# ================================================================
# 🚀 Claude Code 멀티 에이전트 시스템 v6.0 — 자동 설치
# 사용법: bash setup.sh [프로젝트경로]
# 예시:   bash setup.sh ~/my-project
#         bash setup.sh        (현재 폴더에 설치)
# ================================================================

set -e

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'
C='\033[0;36m'; W='\033[1m'; N='\033[0m'

ok()   { echo -e "${G}  ✅ $1${N}"; }
warn() { echo -e "${Y}  ⚠️  $1${N}"; }
info() { echo -e "${C}  ℹ️  $1${N}"; }
step() { echo -e "\n${B}${W}━━━ $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"; }

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DST="${1:-$(pwd)}"

echo -e "${B}${W}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║   🚀 Claude Code 멀티 에이전트 시스템 v6.0       ║"
echo "║   11개 팀 / 25개 에이전트 / 토큰 최적화 내장     ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${N}"
info "소스: $SRC"
info "대상: $DST"

# ━━━ STEP 1: 폴더 구조 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
step "STEP 1: 폴더 구조 생성"

for d in \
  MEMORY \
  TEAM_G_DESIGN/architecture TEAM_G_DESIGN/prd \
  TEAM_H_SECURITY/architecture TEAM_H_SECURITY/reports \
  TEAM_A_PM/tickets TEAM_A_PM/requirements \
  TEAM_B_FRONTEND/src \
  TEAM_C_BACKEND/src \
  TEAM_D_QA/bugs TEAM_D_QA/tests TEAM_D_QA/deploy \
  TEAM_E_MGMT/MEETING_NOTES \
  TEAM_F_SKILLS/registry TEAM_F_SKILLS/requests TEAM_F_SKILLS/deprecated \
  TEAM_I_REVIEW/reviews TEAM_I_REVIEW/debt \
  TEAM_J_DATA/reports TEAM_J_DATA/dashboards \
  TEAM_K_DEVEX \
  SHARED
do
  mkdir -p "$DST/$d"
done
ok "폴더 구조 생성"

# ━━━ STEP 2: 시스템 파일 복사 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
step "STEP 2: 시스템 파일 복사"

C_OK=0; C_SKIP=0
copy_file() {
  local f="$1"
  local src="$SRC/$f"
  local dst="$DST/$f"
  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    ok "복사: $f"
    C_OK=$((C_OK+1))
  else
    warn "없음(스킵): $f"
    C_SKIP=$((C_SKIP+1))
  fi
}

# 핵심 시스템 파일
copy_file "GUIDE.md"
copy_file "AGENTS.md"
copy_file "PRIME.md"
copy_file "CHANGELOG.md"
copy_file "운영매뉴얼.md"

# 메모리 파일
copy_file "MEMORY/MEMORY.md"
copy_file "MEMORY/DECISION_LOG.md"

# 팀 에이전트 파일
for team in TEAM_G_DESIGN TEAM_H_SECURITY TEAM_A_PM \
            TEAM_B_FRONTEND TEAM_C_BACKEND TEAM_D_QA \
            TEAM_E_MGMT TEAM_F_SKILLS TEAM_I_REVIEW \
            TEAM_J_DATA TEAM_K_DEVEX; do
  copy_file "$team/AGENT.md"
  copy_file "$team/TASKS.md"
done

# 추가 팀 파일
copy_file "TEAM_E_MGMT/TEAM_ROSTER.md"
copy_file "TEAM_E_MGMT/WORK_LOG.md"
copy_file "TEAM_F_SKILLS/registry/INDEX.md"

# SHARED 파일
copy_file "SHARED/CONVENTIONS.md"
copy_file "SHARED/STACK.md"
copy_file "SHARED/TEAM_STATUS.md"
copy_file "SHARED/SKILL_REGISTRY.md"

info "복사: ${C_OK}개 / 스킵: ${C_SKIP}개"

# ━━━ STEP 3: CLAUDE.md ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
step "STEP 3: CLAUDE.md (세션 자동 로드)"

[ -f "$DST/CLAUDE.md" ] && cp "$DST/CLAUDE.md" "$DST/CLAUDE.md.backup" && warn "기존 CLAUDE.md 백업 → CLAUDE.md.backup"

cat > "$DST/CLAUDE.md" << 'CLAUDE_EOF'
# 🧭 멀티 에이전트 시스템 v6.0 — 세션 메모리

## ⚠️ 세션 시작 시 읽을 파일 순서
1. GUIDE.md          → CEO 가이드 + 토큰 최적화 총괄 (★ 최우선)
2. AGENTS.md         → 전체 팀 구조 & 규칙
3. PRIME.md          → CTO 4중 프로토콜
4. MEMORY/MEMORY.md  → 현재 프로젝트 컨텍스트

## 팀 구조 (11개 팀 / 25개 에이전트)
T-7  🏗️  TEAM_G  설계 & PRD
T-8  🔐  TEAM_H  보안 (배포 전 필수 게이트)
T-1  🧭  TEAM_A  PM & 기획
T-2  🎨  TEAM_B  프론트엔드
T-3  ⚙️  TEAM_C  백엔드
T-4  🔍  TEAM_D  QA & 배포
T-5  🗂️  TEAM_E  팀 관리
T-6  🧰  TEAM_F  스킬 & AI
T-9  🔬  TEAM_I  코드 리뷰 (PR 필수 게이트)
T-10 📊  TEAM_J  데이터 & BI
T-11 ⚡  TEAM_K  DX & 자동화

## PRIME 4중 프로토콜 (항상 자동 적용)
1. ZERO-LATENCY: Optimistic UI / Upload First / Background Submit / Presigned URL / Client Compress
2. COMMERCIALIZATION: Observability / Actionable Data / Cost Efficiency
3. SECURITY BY DESIGN: 설계→보안검토→개발→리뷰→보안게이트→배포
4. CODE QUALITY: SRP / DRY / TypeSafe / Test80% / DebtTracking

## 절대 원칙
- 설계(T-7) 없이 개발 금지
- 코드리뷰(T-9) 없이 PR 머지 금지
- 보안승인(T-8) 없이 프로덕션 배포 금지
- console.log 단독 에러 처리 금지 / any 타입 금지
- 작업 완료 시 MEMORY/MEMORY.md 업데이트

## 토큰 원칙 (GUIDE.md 판단 로직 요약)
- 파일 1개 추가 로드 = 600~1,200 토큰 고정 소모
- 작업에 필요한 파일만 로드 (팀 작업 시 PRIME + 해당팀 AGENT.md만)
- 기능 1개 완료 → 새 세션 시작
- 20,000 토큰 초과 예상 작업 → 반드시 세션 분할

## 명령어
/guide /design /security /review /data /docs /sprint /build /audit /scale /skill /status

## 프로젝트 정보 (직접 수정하세요)
- 프로젝트명: [프로젝트명]
- 스택: Next.js 14 + TypeScript + Tailwind + Supabase + Vercel
- 개발: npm run dev  | 빌드: npm run build
- 테스트: npm run test | 린트: npm run lint
CLAUDE_EOF
ok "CLAUDE.md 생성"

# ━━━ STEP 4: .claude/settings.json ━━━━━━━━━━━━━━━━━━━━━━━━
step "STEP 4: .claude 설정 (권한 + 훅)"

mkdir -p "$DST/.claude/commands" "$DST/.claude/agents"

cat > "$DST/.claude/settings.json" << 'SETTINGS_EOF'
{
  "permissions": {
    "allow": [
      "Bash(npm run *)", "Bash(npx *)", "Bash(node *)",
      "Bash(git status)", "Bash(git diff *)", "Bash(git log *)",
      "Bash(git add *)", "Bash(git commit *)", "Bash(git push *)",
      "Bash(git checkout *)", "Bash(git branch *)", "Bash(git stash *)",
      "Bash(git merge *)", "Bash(git rebase *)",
      "Bash(cat *)", "Bash(ls *)", "Bash(ls -la *)",
      "Bash(mkdir -p *)", "Bash(cp *)", "Bash(mv *)",
      "Bash(grep *)", "Bash(find *)", "Bash(echo *)",
      "Bash(touch *)", "Bash(head *)", "Bash(tail *)",
      "Bash(wc *)", "Bash(make *)", "Bash(which *)"
    ],
    "deny": [
      "Bash(rm -rf /)", "Bash(rm -rf ~)", "Bash(sudo rm *)",
      "Bash(curl * | bash *)", "Bash(wget * | bash *)",
      "Read(.env)", "Read(.env.local)", "Read(.env.production)",
      "Write(.env)", "Write(.env.local)", "Write(.env.production)"
    ]
  },
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '🚀 멀티 에이전트 v6.0 | 11팀 25에이전트 | 토큰 최적화 내장' && echo '📖 GUIDE.md → AGENTS.md → PRIME.md → MEMORY/MEMORY.md' && echo '💡 /guide [요청]  으로 토큰 계획 먼저 받기' && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && git status 2>/dev/null | head -4 || true",
        "timeout": 5
      }]
    }],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "FILE=\"${CLAUDE_FILE_PATHS:-}\"; if [[ \"$FILE\" =~ \\.(ts|tsx)$ ]]; then npx tsc --noEmit --skipLibCheck 2>&1 | grep -E '^.*error TS' | head -5 || echo '✅ TypeScript OK'; fi",
          "timeout": 20
        }]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "FILE=\"${CLAUDE_FILE_PATHS:-}\"; if [[ \"$FILE\" =~ \\.(ts|tsx|js|jsx)$ ]]; then npx prettier --write \"$FILE\" 2>/dev/null && echo \"✅ 포맷: $FILE\" || true; fi",
          "timeout": 10
        }]
      }
    ],
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "CMD=\"${CLAUDE_TOOL_INPUT:-}\"; if [[ \"$CMD\" == *\"rm -rf /\"* ]] || [[ \"$CMD\" == *\"rm -rf ~\"* ]] || [[ \"$CMD\" == *\"| bash\"* ]]; then echo '{\"block\": true, \"message\": \"🚫 위험한 명령어 차단\"}' >&2; exit 2; fi",
        "timeout": 3
      }]
    }]
  }
}
SETTINGS_EOF
ok "settings.json (권한 + TS자동검사 + 자동포맷 + 위험명령 차단)"

# ━━━ STEP 5: 슬래시 명령어 12개 ━━━━━━━━━━━━━━━━━━━━━━━━━━━
step "STEP 5: 슬래시 명령어 12개 생성"

CMD="$DST/.claude/commands"

# /guide — 토큰 최적화 판단 로직 포함
cat > "$CMD/guide.md" << 'CMD_EOF'
GUIDE.md를 읽어. 아래 요청을 받으면 GUIDE의 판단 로직(5단계)을 실행해:
$ARGUMENTS

반드시 이 형식으로 응답:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧭 GUIDE 분석
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 파악된 의도: (1줄)
📊 작업 규모: 소형/중형/대형/초대형
🔋 총 예상 토큰: ~X,000
    └ 시스템 파일: ~X,000 (로드 파일 목록)
    └ 작업 비용:  ~X,000
🗂️ 권장 세션: N개

📋 세션 분할 계획
  세션 1. [팀 T-N] — [범위 한정] — ~X,000 토큰
  세션 2. [팀 T-N] — [범위 한정] — ~X,000 토큰

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ 토큰 절약 포인트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(이 작업에서 낭비 가능한 부분과 해결책)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 세션 1 지시문 (지금 바로 사용)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
로드할 파일: (최소화된 목록)
이번 세션 범위: (할 것)
다음 세션으로: (미룰 것)
완료 기준: (종료 조건)
[지시문]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 코칭
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(더 효율적으로 지시하는 방법)
CMD_EOF

# /design
cat > "$CMD/design.md" << 'CMD_EOF'
PRIME.md, TEAM_G_DESIGN/AGENT.md를 읽어.
ARCHITECT + PRD_MASTER로서 설계해:
$ARGUMENTS

산출물 (반드시 파일로 저장):
- TEAM_G_DESIGN/prd/PRD-[이름]-v1.md
- TEAM_G_DESIGN/architecture/ARCH-[이름]-v1.md
완료 후 MEMORY/MEMORY.md 업데이트.
이번 세션: 설계 문서 작성만. 코드 구현 금지.
CMD_EOF

# /security
cat > "$CMD/security.md" << 'CMD_EOF'
PRIME.md, TEAM_H_SECURITY/AGENT.md를 읽어.
SEC_ARCHITECT + PENTESTER + COMPLIANCE로서 OWASP Top 10 점검:
$ARGUMENTS

취약점 발견 시 → TEAM_H_SECURITY/reports/VULN-[번호]-[팀코드].md 저장
결론: APPROVED / BLOCKED (이유 명시)
이번 세션: 보안 점검만. 수정 코드 작성 금지.
CMD_EOF

# /review
cat > "$CMD/review.md" << 'CMD_EOF'
PRIME.md, TEAM_I_REVIEW/AGENT.md를 읽어.
CODE_REVIEWER + DEBT_HUNTER로서 체크리스트 전체 실행:
$ARGUMENTS

등급: APPROVE / REQUEST_CHANGES / REJECT
기술 부채 발견 시 → TEAM_I_REVIEW/debt/DEBT-REGISTER.md 등록
저장: TEAM_I_REVIEW/reviews/REVIEW-[번호]-[팀].md
이번 세션: 리뷰만. 수정 구현 금지.
CMD_EOF

# /data
cat > "$CMD/data.md" << 'CMD_EOF'
PRIME.md, TEAM_J_DATA/AGENT.md를 읽어.
BI_ANALYST + AB_SCIENTIST로서 AARRR 기반 분석:
$ARGUMENTS

실행 가능한 액션 아이템 필수 포함.
저장: TEAM_J_DATA/reports/DATA-REPORT-[날짜].md
CMD_EOF

# /docs
cat > "$CMD/docs.md" << 'CMD_EOF'
PRIME.md, TEAM_K_DEVEX/AGENT.md를 읽어.
DOC_WRITER로서 문서 자동 생성:
$ARGUMENTS

API → OpenAPI 스펙 (JSDoc 기반)
컴포넌트 → Storybook 문서
전체 → README.md 업데이트
CMD_EOF

# /sprint
cat > "$CMD/sprint.md" << 'CMD_EOF'
PRIME.md, TEAM_A_PM/AGENT.md를 읽어.
PM으로서 스프린트 계획 수립:
$ARGUMENTS

포함: 목표/완료기준 / 팀별 작업 분배 / 티켓 발행 / 우선순위 / 리스크
티켓 → TEAM_A_PM/tickets/ 저장
CMD_EOF

# /build
cat > "$CMD/build.md" << 'CMD_EOF'
PRIME.md를 읽어.
PRIME 4중 프로토콜 완전 적용:
- ZERO-LATENCY 5대 규칙
- COMMERCIALIZATION 3대 표준
- SECURITY BY DESIGN
- CODE QUALITY 5대 표준

Production-ready 코드 구현 (이번 세션 범위만):
$ARGUMENTS
CMD_EOF

# /audit
cat > "$CMD/audit.md" << 'CMD_EOF'
PRIME.md, TEAM_H_SECURITY/AGENT.md, TEAM_I_REVIEW/AGENT.md, TEAM_D_QA/AGENT.md를 읽어.
TEAM_H + TEAM_I + TEAM_D 통합 진단. 심각도 CRITICAL/HIGH/MEDIUM/LOW:

🔐 보안 (OWASP Top 10)
🔬 코드 품질 (SRP, DRY, TypeSafe, 에러핸들링)
⚡ 성능 (Core Web Vitals, 번들, N+1 쿼리)
💰 비용 (캐싱, API 중복)
📋 문서 (API 문서, README)

우선순위 순서로 액션 플랜 제시.
CMD_EOF

# /scale
cat > "$CMD/scale.md" << 'CMD_EOF'
PRIME.md, TEAM_C_BACKEND/AGENT.md, TEAM_D_QA/AGENT.md를 읽어.
TEAM_C + TEAM_D로서 대규모 트래픽 대응:
$ARGUMENTS

고려: CDN / Redis 캐싱 / DB 인덱스 / 서버리스 콜드스타트 / Auto Scaling
CMD_EOF

# /skill
cat > "$CMD/skill.md" << 'CMD_EOF'
PRIME.md, TEAM_F_SKILLS/AGENT.md를 읽어.
ALCHEMIST로서:
$ARGUMENTS

조회 → TEAM_F_SKILLS/registry/INDEX.md 확인
개발 → TEAM_F_SKILLS/registry/SKILL-[이름].md 생성
CMD_EOF

# /status
cat > "$CMD/status.md" << 'CMD_EOF'
TEAM_E_MGMT/AGENT.md, SHARED/TEAM_STATUS.md, MEMORY/MEMORY.md를 읽어.
전체 현황 보고:
📊 팀별 진행 중 작업
🚨 블로킹 이슈 & 리스크
✅ 이번 주 완료
🔜 다음 필요 액션 (우선순위 순)
CMD_EOF

ok "슬래시 명령어 12개: /guide /design /security /review /data /docs /sprint /build /audit /scale /skill /status"

# ━━━ STEP 6: 서브에이전트 11개 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
step "STEP 6: 서브에이전트 11개 생성"

AG="$DST/.claude/agents"

cat > "$AG/team-g-design.md" << 'CMD_EOF'
---
name: team-g-design
description: 시스템 설계 & PRD 전문가. 새 프로젝트/기능 시작 전 반드시 먼저 호출. 키워드: 설계, PRD, 아키텍처, 요구사항, 새로 만들고 싶어, ERD, API 설계, 구조
---
PRIME.md, TEAM_G_DESIGN/AGENT.md를 읽고 ARCHITECT + PRD_MASTER로서 작업.
산출물은 TEAM_G_DESIGN/ 에 저장. 완료 후 MEMORY/MEMORY.md 업데이트.
CMD_EOF

cat > "$AG/team-h-security.md" << 'CMD_EOF'
---
name: team-h-security
description: 보안 전문가. 설계 후/배포 전 필수 게이트. 키워드: 보안, 취약점, 해킹, 인증, 권한, OWASP, 암호화, 개인정보, JWT, SQL Injection, XSS
---
PRIME.md, TEAM_H_SECURITY/AGENT.md를 읽고 SEC_ARCHITECT + PENTESTER + COMPLIANCE로서 작업.
취약점 리포트 → TEAM_H_SECURITY/reports/ 저장.
CMD_EOF

cat > "$AG/team-a-pm.md" << 'CMD_EOF'
---
name: team-a-pm
description: PM & 기획 전문가. 키워드: 기획, 티켓, 우선순위, 일정, SEO, 마케팅 카피, 스프린트, 요구사항, 유저 스토리
---
PRIME.md, TEAM_A_PM/AGENT.md를 읽고 POET + VIRAL 포함 PM으로서 작업.
티켓 → TEAM_A_PM/tickets/ 저장.
CMD_EOF

cat > "$AG/team-b-frontend.md" << 'CMD_EOF'
---
name: team-b-frontend
description: 프론트엔드 개발 전문가. 키워드: 화면, UI, 버튼, 컴포넌트, 디자인, 인터랙션, 프론트, 페이지, 레이아웃, React, Next.js, 상태관리
---
PRIME.md, TEAM_B_FRONTEND/AGENT.md를 읽고 FE_LOGIC + FE_VISUAL + PERF_HACKER로서 작업.
ZERO-LATENCY 5대 규칙 반드시 체크.
CMD_EOF

cat > "$AG/team-c-backend.md" << 'CMD_EOF'
---
name: team-c-backend
description: 백엔드 개발 전문가. 키워드: API, DB, 서버, 백엔드, 스키마, 쿼리, Supabase, 데이터 저장, 인증 서버, 비즈니스 로직
---
PRIME.md, TEAM_C_BACKEND/AGENT.md를 읽고 BE_SYSTEM + DB_MASTER + DATA_OPS + FIN_OPS로서 작업.
COMMERCIALIZATION 3대 표준 반드시 체크.
CMD_EOF

cat > "$AG/team-d-qa.md" << 'CMD_EOF'
---
name: team-d-qa
description: QA & 배포 전문가. 키워드: 배포, 테스트, 버그, 오류, 인프라, 느려, 서버 다운, CI/CD, 모니터링, Vercel
---
PRIME.md, TEAM_D_QA/AGENT.md를 읽고 SRE_MASTER + SHERLOCK + FIN_OPS로서 작업.
TEAM_H 보안 승인 + TEAM_I 코드리뷰 확인 후 프로덕션 배포.
CMD_EOF

cat > "$AG/team-e-mgmt.md" << 'CMD_EOF'
---
name: team-e-mgmt
description: 팀 관리 & 운영 전문가. 키워드: 현황, 상태, 진행, 팀 관리, 어디까지, 전체 확인, 스프린트 현황, 블로킹
---
TEAM_E_MGMT/AGENT.md, SHARED/TEAM_STATUS.md, MEMORY/MEMORY.md를 읽고 팀 관리자로서 조율.
완료 후 TEAM_STATUS.md + MEMORY.md 업데이트.
CMD_EOF

cat > "$AG/team-f-skills.md" << 'CMD_EOF'
---
name: team-f-skills
description: 스킬 & AI 전문가. 키워드: AI, LLM, GPT, Claude API, 프롬프트, RAG, 챗봇, 임베딩, 자동화, 스킬 개발
---
PRIME.md, TEAM_F_SKILLS/AGENT.md를 읽고 ALCHEMIST로서 작업.
스킬 → TEAM_F_SKILLS/registry/ 에 등록.
CMD_EOF

cat > "$AG/team-i-review.md" << 'CMD_EOF'
---
name: team-i-review
description: 코드 리뷰 & 기술 부채 전문가. PR 머지 전 필수 게이트. 키워드: 코드 리뷰, PR, 리팩토링, 기술 부채, 코드 품질, 중복 코드, 클린 코드, SRP
---
PRIME.md, TEAM_I_REVIEW/AGENT.md를 읽고 CODE_REVIEWER + DEBT_HUNTER + REFACTOR_LEAD로서 작업.
리뷰 → TEAM_I_REVIEW/reviews/ | 부채 → TEAM_I_REVIEW/debt/ 저장.
CMD_EOF

cat > "$AG/team-j-data.md" << 'CMD_EOF'
---
name: team-j-data
description: 데이터 & BI 전문가. 키워드: 데이터 분석, KPI, 대시보드, A/B 테스트, 퍼널, 코호트, 리텐션, 전환율, Mixpanel, GA4
---
PRIME.md, TEAM_J_DATA/AGENT.md를 읽고 PIPELINE + BI_ANALYST + AB_SCIENTIST로서 작업.
리포트 → TEAM_J_DATA/reports/ 저장.
CMD_EOF

cat > "$AG/team-k-devex.md" << 'CMD_EOF'
---
name: team-k-devex
description: DX & 자동화 전문가. 키워드: 문서화, README, API 문서, CI/CD, GitHub Actions, Makefile, 개발환경, 자동화, 온보딩, .devcontainer
---
PRIME.md, TEAM_K_DEVEX/AGENT.md를 읽고 DOC_WRITER + AUTOMATION_ENGINEER + ONBOARDING_MASTER로서 작업.
CMD_EOF

ok "서브에이전트 11개: G H A B C D E F I J K"

# ━━━ STEP 7: 전역 설정 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
step "STEP 7: 전역 Claude 설정"

mkdir -p ~/.claude

if [ ! -f ~/.claude/CLAUDE.md ]; then
cat > ~/.claude/CLAUDE.md << 'GLOBAL_EOF'
# 전역 원칙 (모든 Claude Code 세션 적용)
- TypeScript strict 모드 항상 사용
- 에러 처리: console.log 단독 금지, Sentry급 추적
- 코드: 즉시 실행 가능한 완성 형태
- 결론 먼저, 불필요한 설명 생략
- Production-ready 기준으로만 작성
GLOBAL_EOF
  ok "~/.claude/CLAUDE.md 생성"
else
  warn "~/.claude/CLAUDE.md 이미 존재 (스킵)"
fi

if [ ! -f ~/.claude/settings.json ]; then
  echo '{"permissions":{"allow":["Bash(git *)","Bash(npm run *)","Bash(npx *)","Bash(ls *)","Bash(cat *)","Bash(grep *)"],"deny":["Bash(rm -rf /)","Bash(rm -rf ~)"]}}' > ~/.claude/settings.json
  ok "~/.claude/settings.json 생성"
else
  warn "~/.claude/settings.json 이미 존재 (스킵)"
fi

# ━━━ STEP 8: Makefile ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
step "STEP 8: Makefile 생성"

if [ ! -f "$DST/Makefile" ]; then
cat > "$DST/Makefile" << 'MAKE_EOF'
.PHONY: help dev build test lint type-check security audit agents

help: ## 명령어 목록
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

dev: ## 개발 서버 시작
	npm run dev

build: ## 프로덕션 빌드
	npm run build

test: ## 테스트 (커버리지 포함)
	npm run test -- --coverage

lint: ## ESLint 실행
	npm run lint

type-check: ## TypeScript 타입 검사
	npx tsc --noEmit

security: ## 보안 취약점 스캔
	npm audit --audit-level=moderate

audit: lint type-check security ## 전체 품질 검사 (lint + type + security)

agents: ## 팀 구조 출력
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🤖 멀티 에이전트 시스템 v6.0  11팀 25에이전트"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "T-7  🏗️  TEAM_G   설계 & PRD"
	@echo "T-8  🔐  TEAM_H   보안 (배포 전 필수 게이트)"
	@echo "T-1  🧭  TEAM_A   PM & 기획"
	@echo "T-2  🎨  TEAM_B   프론트엔드"
	@echo "T-3  ⚙️   TEAM_C   백엔드"
	@echo "T-4  🔍  TEAM_D   QA & 배포"
	@echo "T-5  🗂️   TEAM_E   팀 관리"
	@echo "T-6  🧰  TEAM_F   스킬 & AI"
	@echo "T-9  🔬  TEAM_I   코드 리뷰 (PR 필수 게이트)"
	@echo "T-10 📊  TEAM_J   데이터 & BI"
	@echo "T-11 ⚡  TEAM_K   DX & 자동화"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
MAKE_EOF
  ok "Makefile 생성 (make help / dev / build / test / audit / agents)"
else
  warn "Makefile 이미 존재 (스킵)"
fi

# ━━━ 완료 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ""
echo -e "${G}${W}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║              ✅ 설치 완료! v6.0                   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${N}"

echo -e "${C}생성된 구조:${N}"
echo ""
echo "  CLAUDE.md                    ← 세션 시작 시 자동 로드"
echo "  .claude/settings.json        ← 권한 + TS검사 + 자동포맷 + 차단 훅"
echo "  .claude/commands/ (12개)     ← /guide /design /security /review /data"
echo "                                  /docs /sprint /build /audit /scale /skill /status"
echo "  .claude/agents/  (11개)      ← team-g ~ team-k 서브에이전트"
echo "  Makefile                     ← make help / dev / build / audit / agents"
echo ""
echo -e "${Y}다음 단계:${N}"
echo ""
echo "  1. CLAUDE.md 열어서 [프로젝트명], 스택 정보 수정"
echo "  2. cd $DST && claude"
echo "  3. /guide 로그인 기능 만들고 싶어   ← 첫 테스트 (토큰 계획 자동 생성됨)"
echo ""
echo -e "${Y}alias 등록 (선택, ~/.zshrc 또는 ~/.bashrc에 추가):${N}"
echo ""
echo "  # 팀별 터미널 단축키"
echo "  alias t7='claude --system-prompt \"\$(cat GUIDE.md) \$(cat PRIME.md) \$(cat TEAM_G_DESIGN/AGENT.md)\"'"
echo "  alias t8='claude --system-prompt \"\$(cat GUIDE.md) \$(cat PRIME.md) \$(cat TEAM_H_SECURITY/AGENT.md)\"'"
echo "  alias t1='claude --system-prompt \"\$(cat GUIDE.md) \$(cat PRIME.md) \$(cat TEAM_A_PM/AGENT.md)\"'"
echo "  alias t2='claude --system-prompt \"\$(cat GUIDE.md) \$(cat PRIME.md) \$(cat TEAM_B_FRONTEND/AGENT.md)\"'"
echo "  alias t3='claude --system-prompt \"\$(cat GUIDE.md) \$(cat PRIME.md) \$(cat TEAM_C_BACKEND/AGENT.md)\"'"
echo "  alias t4='claude --system-prompt \"\$(cat GUIDE.md) \$(cat PRIME.md) \$(cat TEAM_D_QA/AGENT.md)\"'"
echo "  alias t9='claude --system-prompt \"\$(cat GUIDE.md) \$(cat PRIME.md) \$(cat TEAM_I_REVIEW/AGENT.md)\"'"
echo "  alias t10='claude --system-prompt \"\$(cat GUIDE.md) \$(cat PRIME.md) \$(cat TEAM_J_DATA/AGENT.md)\"'"
echo "  alias t11='claude --system-prompt \"\$(cat GUIDE.md) \$(cat PRIME.md) \$(cat TEAM_K_DEVEX/AGENT.md)\"'"
echo ""
echo "  등록 후: t7  → 설계팀 터미널"
echo "           t8  → 보안팀 터미널"
echo "           t3  → 백엔드팀 터미널"
echo ""
