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
//   node scripts/shrine-assets/build-theme-stage-seed.mjs            # 두 마이그레이션 파일 갱신
//   node scripts/shrine-assets/build-theme-stage-seed.mjs --stdout   # v3 확산 SQL 출력만
//   node scripts/shrine-assets/build-theme-stage-seed.mjs --stdout --pilot   # v4 틀 SQL 출력만
//   node scripts/shrine-assets/build-theme-stage-seed.mjs --check    # 둘 중 하나라도 다르면 종료코드 1
//
// 산출: supabase/migrations/20260807_theme_stage_wide_all.sql   (v3 확산 15테마 — **동결**)
//       supabase/migrations/20260810_theme_stage_v4_pilot.sql   (v4 「틀」 시범 3테마)
//
// ⚠️ 0807 은 이미 적용된 이력이라 **바이트가 바뀌면 안 된다**. v4 는 그 파일을 고치는 대신 시범
//    테마의 구역 structures 만 덮어쓰는 별도 파일로 나간다(혼재가 정상 상태 — 13테마는 v3 그대로).

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const GEO_PATH = path.join(ROOT, 'lib', 'domain', 'shrine', 'theme-stage-geometry.json')
const OUT_PATH = path.join(ROOT, 'supabase', 'migrations', '20260807_theme_stage_wide_all.sql')
const PILOT_OUT_PATH = path.join(ROOT, 'supabase', 'migrations', '20260810_theme_stage_v4_pilot.sql')

/** 반가는 이미 라이브 와이드다 — 다시 찍으면 문간 제거·앵커 정정 이력을 덮어쓴다. */
const SKIP = 'banga'

const GEO = JSON.parse(readFileSync(GEO_PATH, 'utf8'))

/** 테마 코드 규격 — 경로와 SQL 리터럴에 그대로 들어간다(theme-stage.ts THEME_CODE_RE 와 같은 규약). */
const CODE_RE = /^[a-z][a-z0-9-]{0,30}$/

function lightColor(element) {
  return element === null || element === undefined ? GEO.light.neutralColor : GEO.light.elementColor[element]
}

/** `{code}` 토큰은 테마 코드로 치환된다 — 공용 살림(단상·상판)은 토큰이 없어 치환이 항등이다. */
function structures(code, defs = GEO.structures) {
  return defs.map((s) => ({
    code: `${s.code}-${code}`,
    assetUrl: s.assetUrl.replaceAll('{code}', code),
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

// ── 무대 기하 v4.1 「틀(壇)」 시범 (2026-08-10) ──────────────────────────────

const PILOT_HEADER = `-- ============================================================================
-- 무대 기하 v4.1 「틀(壇)」 — 시범 3테마 (PLAN-stage-harmony-v1 추기 4~6)
--
-- CEO 지시(4차): "각각 멋있는 틀을 만들어 액자 있는 부분에 신위를 배치, 마루바닥은 줄이고,
-- 제단은 더 크고 웅장하게, 그 상 위에 아이템을 많이 놓을 수 있게."
-- CEO 지시(5차): "틀 사이즈를 더 크게 웅장하게 만들어주고 마루를 좀 줄여도 될 것 같아."
-- 단상(platform)+상판(altar-top) 2종 → 닫집·감실·제단이 한 장으로 붙은 **틀 1종**으로 교체한다.
--
-- 불변: 신위 접지 = stage.ts PODIUM_TOP_Y 45.3. 틀은 위(닫집 y≈1.4)·옆(w 44→60)·아래(접지 y**73**)로만
-- 커진다.
--
-- ── 접지 수복 (2026-08-10 · CEO 실기기 검수) ────────────────────────────────
-- "틀과 선반들이 공중에 떠 있어. 마루 라인에 맞춰서 내려와야 해."
-- v4.1 은 «상자»가 마루선을 덮었을 뿐, **그려진 받침**은 스프라이트 하단 투명 여백 때문에 마루선보다
-- banga 3.22%p · daljip 1.79%p 위에서 끝나고 있었다(seolbit 만 맞아 있었다). 좌표로는 못 고친다 —
-- 세 줄(감실 바닥 45.3 · 제물 밑변 60.98 · 접지 73)의 «픽셀 거리비»가 그림에 박혀 있기 때문이다.
-- 그래서 스프라이트를 세로 3구간(닫집~감실 / 감실~상판 / 상판~접지)으로 끊어 상판 아래 구간만 늘렸다:
--   node scripts/shrine-assets/stage-grand-altar-ground.mjs --compose   (API 0회 · 픽셀 수술)
-- 산출이 **grand-altar-v2.webp** 이고 시드 y 가 38.5 → **37.22** 로 따라 내려온 것이 그 결과다.
-- 감실 바닥·상판 앞턱은 제자리라 **신위·제단 앵커·이미 놓인 제물이 하나도 안 움직인다.**
--
-- 앵커는 v3 한 줄 3점(45/50/55 · y53.5) → **깊이 2열 5점**이다 (2026-08-10 정렬 패스 · 합성판 실측):
--   · 뒷줄 3점  x 45.7 / 50 / 54.3   · y 52.4   (id 는 v3 그대로 승계)
--   · 앞줄 2점  x 47.85 / 52.15      · y 55     (altar-front-left / altar-front-right)
-- 한 줄 5점을 그대로 구웠더니 틀 상판 실폭 밖으로 바깥 두 점이 떨어졌고, 안쪽에 다섯을 세우면
-- 아이템이 절반씩 겹쳤다. x 는 그 라운드 스프라이트의 **상판 실측 폭**에서 파생한다(v4.1: 세 테마
-- 최솟값 상판 70% × 틀 폭 60% → 세계 x43.4~56.6). 전부 ZONES.altar(x24~76 · y48~58) 안이다.
--
-- ⚠️ «저장된 배치 이동 0» 의 근거는 앵커 좌표가 아니라 **배치가 절대 좌표라는 것**이다 —
--    앵커는 «다음에 놓을 자리»만 정한다. 이미 놓인 신물은 앵커가 옮겨도 어제 자리에 그대로 있다.
--
-- ⚠️ 제단층 아이템 배율(0.88 → 0.54)과 신위 머리 여백(테마별 감실 윗턱)은 **렌더 상수**라
--    이 시드에 실리지 않는다 — lib/domain/shrine/stage.ts(depthScale · deityHeadRoomY)가 정본이다.
--
-- ⚠️ 이 파일은 **생성물**이다. 손으로 고치지 말 것:
--      node scripts/shrine-assets/build-theme-stage-seed.mjs
--    기하 정본  lib/domain/shrine/theme-stage-geometry.json (grandAltar 블록)
--    대조 게이트 lib/domain/shrine/__tests__/theme-stage.test.ts
--
-- ⚠️ 적용 전제 — 시범 테마마다 틀 스프라이트가 public/ 에 있어야 한다:
--      public/shrine/stage/<code>/grand-altar-v2.webp
--    없으면 404 를 StageLayers onError 가 **조용히 숨겨** 살림 없는 빈 방이 된다(예외도 로그도 없다).
--    그래서 배포 순서는 «코드 → 틀 스프라이트 → 이 시드» 다.
--    ⚠️ 파일명이 -v2 인 것은 캐시 때문이다 — 같은 이름 덮어쓰기는 폰·엣지가 옛 그림을 재사용한다
--       (2026-08-10 뮤럴에서 실증). 구본 grand-altar.webp 는 원복 레버로 public/ 에 그대로 둔다.
--
-- ⚠️ 마루선 이동(벽 75% · 바닥 27% → 마루선 y73)은 **렌더 상수**라 이 시드에 실리지 않는다 —
--    StageLayers 가 theme-stage.ts STAGE_BANDS 를 읽는다. 시드만 적용하고 코드를 배포하지 않으면
--    틀만 커지고 마루는 그대로다(그 반대도 성립한다 — 두 배포는 서로를 기다리지 않는다).
--
-- 최상위 structures 는 건드리지 않는다 — 그 자리가 \`stage - 'zones'\` 원복 레버의 착지점이다.
--
-- 원복 — 한 테마를 v3(단상+상판)로 되돌리기: 20260807 시드의 그 테마 update 문을
--   \`(stage -> 'zones') is null\` 조건을 지운 채 한 번 실행한다(반가는 20260806b 를 다시 실행).
-- ============================================================================
`

const PILOT_FOOTER = `
-- 확인 쿼리
--   SELECT code,
--          jsonb_array_length(stage->'zones'->0->'structures')                  AS zone_structures,
--          stage->'zones'->0->'structures'->0->>'code'                          AS first_code,
--          stage->'zones'->0->'structures'->0->>'assetUrl'                      AS frame_asset,
--          jsonb_array_length(stage->'zones'->0->'structures'->0->'anchors')    AS anchors
--     FROM public.shrine_theme_packs WHERE code IN ('banga','daljip','seolbit') ORDER BY sort_order;
`

/** 달러 인용 태그 — 블록 안에는 순수 JSON 만 둔다(대조 테스트가 구분자 2개를 전제한다). */
const PILOT_TAG = '$grandaltar$'

function buildPilotSql() {
  const codes = GEO.grandAltar.themes
  const blocks = codes.map((code) => {
    if (!CODE_RE.test(code)) throw new Error(`테마 코드 규격 위반: ${JSON.stringify(code)}`)
    const json = JSON.stringify(structures(code, GEO.grandAltar.structures), null, 2)
    if (json.includes(PILOT_TAG)) throw new Error(`구조물 JSON 이 달러 태그를 품었다(${code})`)
    // 뮤럴은 -v3 파일명으로 갈아탄다 — 같은 이름 덮어쓰기는 폰·엣지 캐시가 옛 그림을 재사용한다
    // (틀 스프라이트는 새 이름이라 즉시 떴고 뮤럴만 안 바뀌어 보인 2026-08-10 실증).
    // -v3 접미사는 StageLayers muralSrcSet 의 srcset 계약(-v3-sd 형제 실재)도 함께 켠다.
    const wallV3 = `${GEO.mural.dir}/${code}/${GEO.grandAltar.muralV3.wall}`
    const floorV3 = `${GEO.mural.dir}/${code}/${GEO.grandAltar.muralV3.floor}`
    return (
      `-- ${code} — 틀 1종(닫집+감실+제단) · 앵커 2열 5점 · 뮤럴 -v3(캐시 무효화+srcset)\n` +
      `update public.shrine_theme_packs\n` +
      `set stage = jsonb_set(jsonb_set(jsonb_set(stage,\n` +
      `    '{zones,0,structures}', ${PILOT_TAG}${json}${PILOT_TAG}::jsonb),\n` +
      `    '{zones,0,wallpaperUrl}', to_jsonb('${wallV3}'::text)),\n` +
      `    '{zones,0,flooringUrl}', to_jsonb('${floorV3}'::text))\n` +
      `where code = '${code}'\n` +
      `  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;\n`
    )
  })
  return `${PILOT_HEADER}\n${blocks.join('\n')}${PILOT_FOOTER}`
}

const sql = buildSql()
const pilotSql = buildPilotSql()
const argv = process.argv.slice(2)
const pilot = argv.includes('--pilot')

/** [산출 경로, SQL, 라벨] — --pilot 이 대상 하나를 고른다 */
const TARGETS = [
  [OUT_PATH, sql, `${Object.keys(GEO.themeElements).filter((c) => c !== SKIP).length}테마 v3`],
  [PILOT_OUT_PATH, pilotSql, `${GEO.grandAltar.themes.length}테마 v4 틀`],
]

if (argv.includes('--stdout')) {
  process.stdout.write(pilot ? pilotSql : sql)
} else if (argv.includes('--check')) {
  for (const [file, want] of TARGETS) {
    if (existsSync(file) && readFileSync(file, 'utf8') === want) continue
    process.stderr.write(`시드가 기하 정본과 어긋난다 — 다시 찍을 것: ${path.relative(ROOT, file)}\n`)
    process.exit(1)
  }
  process.stdout.write('시드 최신\n')
} else {
  for (const [file, want, label] of TARGETS) {
    writeFileSync(file, want, 'utf8')
    process.stdout.write(`${path.relative(ROOT, file)} — ${label} · ${Buffer.byteLength(want, 'utf8')} bytes\n`)
  }
}
