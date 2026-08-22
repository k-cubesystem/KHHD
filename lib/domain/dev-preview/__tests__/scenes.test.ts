import {
  PREVIEW_RESERVED_SEGMENTS,
  PREVIEW_SCENES,
  PREVIEW_SCENE_ID_PATTERN,
  PREVIEW_VIEWPORTS,
  findPreviewScene,
  isPreviewEnabled,
  isPreviewSceneId,
  previewScenePath,
  previewShotFileName,
} from '../scenes'

describe('dev-preview 장면 표', () => {
  it('장면 id 가 중복되지 않는다', () => {
    const ids = PREVIEW_SCENES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('장면 id 는 소문자·숫자·하이픈만 쓴다 — URL 세그먼트이자 PNG 파일명이라', () => {
    for (const scene of PREVIEW_SCENES) {
      expect(scene.id).toMatch(PREVIEW_SCENE_ID_PATTERN)
    }
  })

  it('고정 세그먼트와 같은 id 는 없다 — 정적 라우트에 가려 죽는 장면을 막는다', () => {
    for (const scene of PREVIEW_SCENES) {
      expect(PREVIEW_RESERVED_SEGMENTS).not.toContain(scene.id)
    }
  })

  it('모든 장면에 라벨과 설명이 있다 — 목록·촬영본 머리글이 비지 않게', () => {
    for (const scene of PREVIEW_SCENES) {
      expect(scene.label.length).toBeGreaterThan(0)
      expect(scene.note.length).toBeGreaterThan(0)
    }
  })

  it('CEO 피드백이 몰린 지점이 전부 등록돼 있다', () => {
    const ids = PREVIEW_SCENES.map((s) => s.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'journey-empty',
        'journey-progress',
        'journey-complete-unclaimed',
        'journey-claimed',
        'wallpaper-free',
        'wallpaper-member',
        'wallpaper-ad-used',
        'wallpaper-purchased',
        'samhap-intro',
      ])
    )
  })

  it('모바일이 본진이라 첫 뷰포트이고 375×812 다', () => {
    expect(Object.keys(PREVIEW_VIEWPORTS)[0]).toBe('mobile')
    expect(PREVIEW_VIEWPORTS.mobile).toEqual({ width: 375, height: 812 })
    expect(PREVIEW_VIEWPORTS.desktop).toEqual({ width: 1280, height: 800 })
  })

  it('경로·파일명 규칙', () => {
    expect(previewScenePath('journey-empty')).toBe('/dev-preview/journey-empty')
    expect(previewShotFileName('journey-empty', 'mobile')).toBe('journey-empty-mobile.png')
    expect(previewShotFileName('samhap-intro', 'desktop')).toBe('samhap-intro-desktop.png')
  })

  it('조회 — 없는 id 는 null(라우트가 notFound 로 바꾼다)', () => {
    expect(findPreviewScene('journey-empty')?.label).toBeTruthy()
    expect(findPreviewScene('없는-장면')).toBeNull()
    expect(isPreviewSceneId('journey-empty')).toBe(true)
    expect(isPreviewSceneId('nope')).toBe(false)
  })
})

describe('프로덕션 가드', () => {
  it('production 에서만 꺼진다', () => {
    expect(isPreviewEnabled('production')).toBe(false)
    expect(isPreviewEnabled('development')).toBe(true)
    expect(isPreviewEnabled('test')).toBe(true)
    // NODE_ENV 미설정이어도 프로덕션으로 오인해 꺼버리지는 않는다(로컬 실행 편의)
    expect(isPreviewEnabled(undefined)).toBe(true)
  })
})
