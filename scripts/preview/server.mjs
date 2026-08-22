/**
 * 미리보기 dev 서버 — 기동·대기·종료의 공용부.
 *
 * 오늘(2026-08-22) 실제로 죽은 자리를 그대로 막는다:
 *  1. `next dev` 가 **exit 134**(메모리 폭주)로 죽음 → `--max-old-space-size=4096` 을 기본으로 준다.
 *  2. `.next/dev/lock` 잔존 → «Unable to acquire lock» 으로 아예 안 뜸 → 기동 전 자동 정리.
 *  3. 포트 충돌 → 미리보기는 **3020** 을 쓴다(다른 세션이 3000·3001 을 쓴다).
 *     🔴 그런데 3020 마저 남이 잡고 있을 수 있다(실측: 다른 워크트리가 `next start -p 3020`).
 *     남의 서버를 죽이지 않고 **다음 빈 포트로 비킨다** — 촬영 스크립트는 실제 주소를 넘겨받는다.
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/** 미리보기 기본 포트 — 3000(dev)·3001(prod 검증)은 다른 세션이 쓴다. */
export const PREVIEW_PORT = Number(process.env.PREVIEW_PORT || 3020)

/** 기본 포트가 막혔을 때 위로 훑어볼 범위. */
const PORT_SCAN_RANGE = 20

/** dev 서버가 첫 컴파일까지 무는 시간 — Next dev 는 요청이 와야 그 라우트를 짓는다. */
const READY_TIMEOUT_MS = 240_000

export function previewUrl(port) {
  return `http://localhost:${port}`
}

/**
 * 남은 dev 락 정리 — 죽은 프로세스가 남긴 락 때문에 다음 기동이 통째로 막힌다.
 * `.next/dev` 는 dev 서버가 다시 만드는 캐시라 지워도 안전하다(빌드 산출물 `.next` 전체가 아님).
 */
export async function cleanDevLock() {
  await rm(path.join(REPO_ROOT, '.next', 'dev', 'lock'), { recursive: true, force: true })
}

/**
 * Turbopack 영속 캐시 폐기 — 「자동 치유」용.
 *
 * 🔴 실측: 서버를 강제 종료(`taskkill /F`)하면 `.next/dev/cache` 가 깨진 채 남고, 다음 기동은
 * 멀쩡히 «Ready» 를 찍은 뒤 **페이지를 컴파일할 때** turbo-persistence 패닉을 수백 줄 쏟는다
 * (`range start index … out of range for slice of length …`). 기동 성공이 곧 정상이 아니라서,
 * 촬영이 통째로 실패하면 이걸 지우고 한 번 더 해 본다. 지워도 재생성되는 캐시다.
 */
export async function cleanDevCache() {
  await rm(path.join(REPO_ROOT, '.next', 'dev', 'cache'), { recursive: true, force: true })
}

/** 이 포트에 **우리 미리보기 서버가** 떠 있는가 — 장면표가 답해야 우리 것이다. */
export async function isServerUp(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/dev-preview/manifest`, { signal: AbortSignal.timeout(3_000) })
    return res.ok
  } catch {
    return false
  }
}

/**
 * 이 포트에 아무도 없는가.
 *
 * 🔴 `listen(port)` 만으로는 Windows 에서 **거짓 «비었음»** 이 나온다 — Node 가 기본으로 켜는
 * SO_REUSEADDR 이 Windows 에선 이미 듣고 있는 포트에도 붙여주기 때문이다(실측: 남의 서버가
 * 3020 을 듣는데 탐침은 통과 → next 가 그제서야 EADDRINUSE 로 죽음).
 * `exclusive: true` 라야 next 와 같은 조건으로 잡아 본다.
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen({ port, exclusive: true })
  })
}

/**
 * 어디에 붙을지 정한다.
 *  - 우리 서버가 이미 떠 있으면 그대로 쓴다(`reused`) → 내리지도 않는다.
 *  - 비어 있으면 거기 띄운다.
 *  - 남이 잡고 있으면 다음 빈 포트로 비킨다(남의 프로세스는 건드리지 않는다).
 */
export async function resolvePreviewTarget() {
  if (await isServerUp(previewUrl(PREVIEW_PORT))) {
    return { port: PREVIEW_PORT, baseUrl: previewUrl(PREVIEW_PORT), reused: true, movedFrom: null }
  }
  if (await isPortFree(PREVIEW_PORT)) {
    return { port: PREVIEW_PORT, baseUrl: previewUrl(PREVIEW_PORT), reused: false, movedFrom: null }
  }
  for (let port = PREVIEW_PORT + 1; port <= PREVIEW_PORT + PORT_SCAN_RANGE; port++) {
    if (await isPortFree(port)) {
      return { port, baseUrl: previewUrl(port), reused: false, movedFrom: PREVIEW_PORT }
    }
  }
  throw new Error(`빈 포트를 못 찾았습니다 (${PREVIEW_PORT}~${PREVIEW_PORT + PORT_SCAN_RANGE}).`)
}

/**
 * `next dev` 기동. npm 을 거치지 않고 next 바이너리를 직접 띄운다 —
 * 중간에 낀 npm 셸이 Windows 에서 종료 신호를 자식에게 안 넘겨 유령 프로세스가 남는다.
 */
export function startPreviewServer(port, { silent = false } = {}) {
  const nextBin = path.join(REPO_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')
  return spawn(process.execPath, [nextBin, 'dev', '--port', String(port)], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      // 🔴 exit 134 재발 방지 — 이미 지정돼 있으면 존중한다.
      NODE_OPTIONS: process.env.NODE_OPTIONS?.includes('max-old-space-size')
        ? process.env.NODE_OPTIONS
        : `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=4096`.trim(),
    },
    stdio: silent ? ['ignore', 'ignore', 'inherit'] : 'inherit',
    shell: false,
  })
}

/**
 * 서버가 실제로 응답할 때까지 대기 — 프로세스 기동 ≠ 라우트 준비.
 * 자식이 먼저 죽으면 기다리지 않고 바로 실패한다(포트 충돌·메모리 폭주를 4분 뒤에 알 이유가 없다).
 */
export async function waitForServer(baseUrl, child, timeoutMs = READY_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) {
      throw new Error(`서버가 기동 중 종료됐습니다 (exit ${child.exitCode}).`)
    }
    if (await isServerUp(baseUrl)) return true
    await new Promise((r) => setTimeout(r, 1_000))
  }
  return false
}

/**
 * 종료 — Windows 는 자식(next 워커)까지 같이 죽여야 포트가 풀린다.
 * `taskkill /T` 가 프로세스 트리를 훑는다. POSIX 는 SIGTERM 이면 충분.
 */
export function stopServer(child) {
  if (!child || child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    child.kill('SIGTERM')
  }
}
