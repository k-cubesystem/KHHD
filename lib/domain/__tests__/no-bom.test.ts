/**
 * 소스 파일에 BOM 이 없어야 한다 — **라이브 장애의 회귀선** (2026-08-16).
 *
 * ## 🔴 이 테스트가 막는 사고
 * `app/actions/user/history.ts` 첫 바이트가 `EF BB BF`(UTF-8 BOM)였다. 그러면 바로 뒤의
 * `'use server'` 가 **파일의 첫 토큰이 아니게 되어 지시자가 무효**가 된다. 결과는 조용하다 —
 * 빌드는 통과하고, 타입도 통과하고, **브라우저에서만** 터진다:
 *
 *   서버 전용 모듈(`next/cache`, `@/lib/supabase/server`)이 클라이언트 번들에 딸려 들어가고,
 *   그 화면은 렌더 도중 죽어 에러 바운더리로 떨어진다.
 *
 * 실제로 기록 화면이 「기록 조회 중 문제가 발생했어요」만 반복하고 있었다. 감염된 파일은
 * 여섯이었다 — 기록·관상/손금/풍수(image)·재물·천지인·오늘의 운세·초대. 즉 **유료 기능 다수가
 * 같은 지뢰를 밟고 있었다.**
 *
 * BOM 은 눈에 보이지 않고 diff 에도 잘 드러나지 않는다. 사람의 주의력으로 막을 수 없으니
 * 테스트가 막는다.
 */
import { existsSync, readFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { join } from 'path'

const ROOT = process.cwd()
const BOM = Buffer.from([0xef, 0xbb, 0xbf])

function trackedSourceFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '*.ts', '*.tsx', '*.js', '*.mjs', '*.json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

describe('🔴 BOM 금지', () => {
  it('추적 중인 소스 파일 어디에도 BOM 이 없다', () => {
    const infected: string[] = []

    for (const relative of trackedSourceFiles()) {
      const absolute = join(ROOT, relative)
      if (!existsSync(absolute)) continue

      const head = readFileSync(absolute).subarray(0, 3)
      if (head.equals(BOM)) infected.push(relative)
    }

    // 실패 메시지에 파일 목록이 그대로 나오게 — 「어디가 문제인지」를 찾는 데 시간을 쓰지 않도록.
    expect(infected).toEqual([])
  })

  it('감염됐던 여섯 파일이 특히 깨끗하다', () => {
    // 기록·관상/손금/풍수·재물·천지인·오늘의 운세·초대 — 실제로 BOM 이 붙어 있던 자리들.
    for (const relative of [
      'app/actions/user/history.ts',
      'app/actions/ai/image.ts',
      'app/actions/ai/wealth.ts',
      'app/actions/ai/cheonjiin.ts',
      'app/actions/fortune/daily.ts',
      'app/actions/user/invite.ts',
    ]) {
      const text = readFileSync(join(ROOT, relative), 'utf8')

      // 지시자가 파일의 **첫 글자**부터 시작해야 유효하다.
      expect({ relative, head: text.slice(0, 12) }).toEqual({ relative, head: "'use server'" })
    }
  })
})
