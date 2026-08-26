#!/usr/bin/env node
/**
 * 원커맨드 촬영 — `npm run preview:shots [장면...]`.
 *
 * 서버가 떠 있으면 그대로 찍고, 없으면 **띄우고 찍고 내린다**.
 * (남의 세션이 띄워 둔 서버는 찍고 나서도 내리지 않는다 — 내가 띄운 것만 내린다)
 *
 * 내가 띄운 서버에서 촬영이 실패하면 **Turbopack 캐시를 지우고 한 번만 다시 해 본다** —
 * 강제 종료로 깨진 캐시가 다음 촬영을 통째로 무너뜨리는 일이 실제로 있었다(server.mjs 주석).
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import {
  REPO_ROOT,
  cleanDevCache,
  cleanDevLock,
  resolvePreviewTarget,
  startPreviewServer,
  stopServer,
  waitForServer,
} from './server.mjs'

const args = process.argv.slice(2)

function runShoot(baseUrl) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(REPO_ROOT, 'scripts', 'preview', 'shoot.mjs'), ...args], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: { ...process.env, PREVIEW_BASE_URL: baseUrl },
    })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

/** 서버를 띄우고 찍고 내린다. 반환값은 shoot 의 종료코드. */
async function serveAndShoot() {
  const target = await resolvePreviewTarget()

  if (target.reused) {
    console.log(`이미 떠 있는 서버를 씁니다 → ${target.baseUrl}`)
    return { code: await runShoot(target.baseUrl), owned: false }
  }

  if (target.movedFrom) {
    console.log(`포트 ${target.movedFrom} 은 다른 프로세스가 쓰고 있어 ${target.port} 로 비켰습니다.`)
  }
  await cleanDevLock()
  console.log(`▶ 미리보기 서버 기동 → ${target.baseUrl} (첫 컴파일은 시간이 걸립니다)`)

  const child = startPreviewServer(target.port, { silent: true })
  try {
    if (!(await waitForServer(target.baseUrl, child))) {
      throw new Error('서버가 시간 안에 뜨지 않았습니다. `npm run preview:serve` 로 직접 띄워 로그를 보세요.')
    }
    console.log('  서버 준비됨')
    return { code: await runShoot(target.baseUrl), owned: true }
  } finally {
    console.log('■ 미리보기 서버 종료')
    stopServer(child)
  }
}

try {
  const { code, owned } = await serveAndShoot()

  if (code !== 0 && owned) {
    console.log('\n↻ 촬영이 실패했습니다 — Turbopack 캐시를 지우고 한 번 더 해 봅니다.')
    await cleanDevCache()
    ;({ code } = await serveAndShoot())
  }

  process.exitCode = code
} catch (err) {
  console.error(`\n촬영 실패: ${err instanceof Error ? err.message : String(err)}`)
  process.exitCode = 1
}
