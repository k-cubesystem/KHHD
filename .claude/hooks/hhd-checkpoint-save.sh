#!/usr/bin/env bash
# 해화당 세션 체크포인트 저장 (PreCompact / SessionEnd 훅). jq 불필요.
# 컨텍스트 한도 근접 시 하네스가 auto-compact 하기 직전(PreCompact) 또는 세션 종료 시 호출됨.
DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
CP="$HOME/.claude/hhd-session-checkpoint.md"
mkdir -p "$HOME/.claude" 2>/dev/null

{
  echo "# 해화당 세션 체크포인트 (자동 저장)"
  echo
  echo "- 저장시각: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "- 프로젝트: $DIR"
  echo "- 브랜치: $(git -C "$DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  echo
  echo "## 최근 커밋 (8)"
  git -C "$DIR" log --oneline -8 2>/dev/null || true
  echo
  echo "## 미커밋 변경 (git status --short)"
  s="$(git -C "$DIR" status --short 2>/dev/null)"
  if [ -n "$s" ]; then echo "$s"; else echo "(작업트리 clean)"; fi
  echo
  echo "## 재개 시 먼저 읽을 문서"
  echo "1. WORKLOG-OPUS-20260711.md — 진행상황/게이트/사용자 승인대기 목록"
  echo "2. TEAM_I_REVIEW/REVIEW-20260711-opus-security-shrine.md — 보안 검토·개선현황(R1~R10)"
  echo "3. MEMORY/MEMORY.md + ~/.claude auto-memory — 프로젝트 맥락"
  echo
  echo "## 재개 지침"
  echo "위 문서를 먼저 읽고, WORKLOG의 '남은 것 / 사용자 승인 필요' 항목부터 이어서 진행할 것."
} > "$CP" 2>/dev/null

printf '{"systemMessage":"💾 해화당 세션 체크포인트 저장: %s"}\n' "$CP"
