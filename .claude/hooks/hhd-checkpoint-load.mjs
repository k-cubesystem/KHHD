// 해화당 세션 체크포인트 복원 (SessionStart 훅). node로 JSON 출력(jq 미설치 대응).
// 새 세션/compact/resume 시작 시 체크포인트를 additionalContext 로 모델에 주입 → 작업 자동 이어받기.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const cp = path.join(os.homedir(), '.claude', 'hhd-session-checkpoint.md')
if (!fs.existsSync(cp)) process.exit(0)

const ctx = fs.readFileSync(cp, 'utf8').trim()
if (!ctx) process.exit(0)

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        '이전 세션에서 저장된 해화당 작업 체크포인트입니다(자동 복원). 이 기준으로 작업을 이어가세요:\n\n' + ctx,
    },
  })
)
