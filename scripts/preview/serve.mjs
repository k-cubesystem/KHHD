#!/usr/bin/env node
/**
 * 미리보기 서버 기동 — `npm run preview:serve`.
 * 락 정리 + 메모리 상향 + 포트 확보를 한 번에 두른다(자세한 이유는 server.mjs 주석).
 * Ctrl+C 로 내린다.
 */

import { cleanDevLock, resolvePreviewTarget, startPreviewServer, stopServer } from './server.mjs'

const target = await resolvePreviewTarget()

if (target.reused) {
  console.log(`이미 떠 있습니다 → ${target.baseUrl}/dev-preview`)
  process.exit(0)
}

if (target.movedFrom) {
  console.log(`포트 ${target.movedFrom} 은 다른 프로세스가 쓰고 있어 ${target.port} 로 비켰습니다.`)
}

await cleanDevLock()
console.log(`▶ 미리보기 서버 기동 → ${target.baseUrl}/dev-preview`)
console.log(`  찍기: npm run preview:shots -- --base=${target.baseUrl}`)

const child = startPreviewServer(target.port)

const shutdown = () => {
  stopServer(child)
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

child.on('exit', (code) => {
  if (code === 134) {
    console.error('\n서버가 exit 134(메모리 폭주)로 죽었습니다 — NODE_OPTIONS 상향이 먹었는지 확인하세요.')
  }
  process.exit(code ?? 0)
})
