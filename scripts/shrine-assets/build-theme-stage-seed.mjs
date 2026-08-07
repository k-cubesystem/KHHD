// 표준 와이드 무대 시드 빌더 — 15테마(banga 제외)의 `stage` jsonb 를 마이그레이션 1건으로 찍는다.
// (PLAN-theme-stage-common-v2 §2·§3 P2-c. API 호출 0회 — 좌표만 다루는 순수 생성기다.)
//
// 왜 스크립트인가: 좌표를 테마마다 손으로 적으면 15벌이 서서히 갈라진다(선반장·의식각·앵커·
// 테스트가 그 좌표에 매여 있다). 기하는 **한 벌**만 두고 찍어 낸다.
//
// ⚠️ 기하 정본은 `lib/domain/shrine/theme-stage-geometry.json` 이다. 이 스크립트는 TS 를
//    import 할 수 없어서(빌드 없이 도는 CLI) 같은 JSON 을 읽는다 — 도메인(theme-stage.ts)과
//    숫자가 두 벌이 되지 않게 하는 장치다. 두 산출물의 일치는
//    `lib/domain/shrine/__tests__/theme-stage.test.ts` 가 바이트로 대조한다.
//
// ⚠️ 산출 SQL 은 **생성물**이다. 손으로 고치지 말고 이 스크립트를 다시 돌린다.
//
// 사용:
//   node scripts/shrine-assets/build-theme-stage-seed.mjs            # 마이그레이션 파일 갱신
//   node scripts/shrine-assets/build-theme-stage-seed.mjs --stdout   # 파일을 쓰지 않고 출력만
//   node scripts/shrine-assets/build-theme-stage-seed.mjs --check    # 파일과 다르면 종료코드 1
//
// 산출: supabase/migrations/20260807_theme_stage_wide_all.sql

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const GEO_PATH = path.join(ROOT, 'lib', 'domain', 'shrine', 'theme-stage-geometry.json')
const OUT_PATH = path.join(ROOT, 'supabase', 'migrations', '20260807_theme_stage_wide_all.sql')

/** 반가는 이미 라이브 와이드다 — 다시 찍으면 문간 제거·앵커 정정 이력을 덮어쓴다. */
const SKIP = 'banga'

const GEO = JSON.parse(readFileSync(GEO_PATH, 'utf8'))

/** 테마 코드 규격 — 경로와 SQL 리터럴에 그대로 들어간다(theme-stage.ts THEME_CODE_RE 와 같은 규약). */
const CODE_RE = /^[a-z][a-z0-9-]{0,30}$/

function lightColor(element) {
  return element === null || element === undefined ? GEO.light.neutralColor : GEO.light.elementColor[element]
}

function structures(code) {
  return GEO.structures.map((s) => ({
    code: `${s.code}-${code}`,
    assetUrl: s.assetUrl,
    x: s.x,
    y: s.y,
    w: s.w,
    anchors: s.anchors.map((a) => ({ id: a.id, layer: a.layer, x: a.x, y: a.y, label: a.label })),
  }))
}

/**
 * 테마 코드 → stage jsonb 한 벌.
 * ⚠️ **키 순서가 계약이다** — lib/domain/shrine/theme-stage.ts `buildThemeStage` 와 같은 순서로 적는다.
 */
function buildThemeStage(code) {
  if (!CODE_RE.test(code)) throw new Error(`테마 코드 규격 위반: ${JSON.stringify(code)}`)
  const wallpaperUrl = `${GEO.mural.dir}/${code}/${GEO.mural.wall}`
  const flooringUrl = `${GEO.mural.dir}/${code}/${GEO.mural.floor}`
  return {
    wallpaperUrl,
    flooringUrl,
    structures: structures(code),
    light: {
      color: lightColor(GEO.themeElements[code]),
      intensity: GEO.light.intensity,
      origin: { x: GEO.light.origin.x, y: GEO.light.origin.y },
    },
    width: GEO.worldWidth,
    zones: [
      {
        code: GEO.zone.code,
        label: GEO.zone.label,
        x0: GEO.zone.x0,
        x1: GEO.zone.x1,
        wallpaperUrl,
        flooringUrl,
        structures: structures(code),
      },
    ],
  }
}

const HEADER = `-- ============================================================================
-- 표준 와이드 무대 — 15테마 일괄 시드 (반가 제외 · PLAN-theme-stage-common-v2 §2)
--
-- 테마마다 바뀌는 것은 **장소**(벽·바닥 뮤럴 2장 + 조명색)뿐이고, 단상·제단 상판 같은
-- **살림**은 반가 스프라이트를 그대로 공용한다. 좌표를 테마마다 다시 정하지 않는다 —
-- 정하는 순간 가족 선반장·의식각·앵커·테스트가 테마 수만큼 갈라진다.
--
-- ⚠️ 이 파일은 **생성물**이다. 손으로 고치지 말 것:
--      node scripts/shrine-assets/build-theme-stage-seed.mjs
--    기하 정본  lib/domain/shrine/theme-stage-geometry.json
--    도메인     lib/domain/shrine/theme-stage.ts (buildThemeStage)
--    대조 게이트 lib/domain/shrine/__tests__/theme-stage.test.ts — 파일 ≠ 재생성이면 실패한다
--
-- ⚠️ 적용 전제 — 테마마다 뮤럴 2장이 public/ 에 있어야 한다:
--      public/shrine/stage/<code>/room-wall-mural.webp
--      public/shrine/stage/<code>/room-floor-mural.webp
--    없으면 404 를 StageLayers onError 가 **조용히 숨겨** 어두운 빈 방이 된다(예외도 로그도 없다).
--    그래서 배포 순서는 «코드 → 뮤럴 → 이 시드» 다.
--
-- ⚠️ 시안 1테마만 먼저 켜려면 그 테마의 update 한 문장만 실행한다(종각 등).
--    재실행은 무해하다 — 이미 zones 를 든 행은 where 조건에서 걸러진다(반가도 같은 이유로 안전).
--
-- 원복 — 테마 하나를 단일 무대(레거시 room.webp)로 되돌리기:
--   update public.shrine_theme_packs set stage = null where code = '<code>';
-- 원복 — 두루마리만 걷고 단일 무대 세트는 남기기(폭 100 항등 폴백):
--   update public.shrine_theme_packs set stage = stage - 'zones' - 'width' where code = '<code>';
-- ============================================================================
`

const FOOTER = `
-- 확인 쿼리
--   SELECT code,
--          stage->>'width'                                     AS width,
--          jsonb_array_length(stage->'zones')                  AS zones,
--          stage->'zones'->0->>'wallpaperUrl'                  AS room_wall,
--          jsonb_array_length(stage->'zones'->0->'structures') AS zone_structures,
--          stage->'light'->>'color'                            AS light
--     FROM public.shrine_theme_packs ORDER BY sort_order;
`

function buildSql() {
  const codes = Object.keys(GEO.themeElements).filter((c) => c !== SKIP)
  const blocks = codes.map((code) => {
    const json = JSON.stringify(buildThemeStage(code))
    // 작은따옴표는 SQL 문자열 리터럴을 끊는다 — 라벨에 아포스트로피가 들어오면 여기서 멈춘다
    if (json.includes("'")) throw new Error(`stage JSON 에 작은따옴표가 있다(${code}) — 달러 인용으로 바꿔야 한다`)
    const el = GEO.themeElements[code] ?? '무속성'
    return (
      `-- ${code} (${el} · ${lightColor(GEO.themeElements[code])})\n` +
      `update public.shrine_theme_packs set stage = '${json}'::jsonb\n` +
      `where code = '${code}' and (stage -> 'zones') is null;\n`
    )
  })
  return `${HEADER}\n${blocks.join('\n')}${FOOTER}`
}

const sql = buildSql()
const argv = process.argv.slice(2)

if (argv.includes('--stdout')) {
  process.stdout.write(sql)
} else if (argv.includes('--check')) {
  const same = existsSync(OUT_PATH) && readFileSync(OUT_PATH, 'utf8') === sql
  if (!same) {
    process.stderr.write(`시드가 기하 정본과 어긋난다 — 다시 찍을 것: ${path.relative(ROOT, OUT_PATH)}\n`)
    process.exit(1)
  }
  process.stdout.write('시드 최신\n')
} else {
  writeFileSync(OUT_PATH, sql, 'utf8')
  const themes = Object.keys(GEO.themeElements).filter((c) => c !== SKIP).length
  process.stdout.write(`${path.relative(ROOT, OUT_PATH)} — ${themes}테마 · ${Buffer.byteLength(sql, 'utf8')} bytes\n`)
}
