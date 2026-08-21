// 마케팅 영상 스펙 — SNS 광고 크리에이티브 · 랜딩/스토어 히어로 · 기능 설명 영상.
//
// video-spec.mjs(앱 내 앰비언트 루프)와 분리한 이유:
//   앰비언트 = 무음 · 4초 · 720p · seamless 루프 · 검정 위 요소만 · public/videos 배포.
//   마케팅   = 유음 · 15~30초 · 1080×1920 · 자막 번인 · 세이프에어리어 · 앱에 배포하지 않음.
// 규격이 겹치는 지점이 거의 없어 한 파일에 섞으면 둘 다 망가진다.
//
// 톤·색·서체의 단일 출처는 DESIGN.md. 여기에는 ffmpeg 가 필요로 하는 값만 미러링한다.

// ────────────────────────────────────────────────────────────────
// 🔴 미디어 저장 루트 — 반드시 D: 다.
//
// C: 는 232G 중 27G 만 남아 있고(89% 사용) D: 는 871G 가 비어 있다. 영상 원본은 편당 수십~수백 MB,
// 중간 산출물까지 합치면 금세 GB 단위가 된다. C:\Users\...\AppData\Local\Temp 같은 기본 임시 경로에
// 쓰면 조용히 C: 를 채운다 — 작업 파일은 예외 없이 여기로 떨어뜨린다.
//
// 리포 자체는 D:\anti\haehwadang 이라 assets-src/ · public/videos/ 는 이미 D: 다(그대로 써도 안전).
// 리포에 남기지 않을 중간물·다운로드만 이 루트를 쓴다.
// 환경변수 HAEHWADANG_MEDIA_ROOT 로 덮어쓸 수 있다.
// ────────────────────────────────────────────────────────────────
export const MEDIA_ROOT = process.env.HAEHWADANG_MEDIA_ROOT || 'D:/anti/media'

export const MEDIA_DIRS = {
  root: MEDIA_ROOT,
  downloads: `${MEDIA_ROOT}/downloads`, // Higgsfield·Veo 결과 URL 을 받아오는 곳
  raw: `${MEDIA_ROOT}/raw`, // 생성 원본(무편집)
  scratch: `${MEDIA_ROOT}/scratch`, // 중간 산출물 — 언제든 지워도 되는 것
  out: `${MEDIA_ROOT}/out`, // 납품 후보
}

// ────────────────────────────────────────────────────────────────
// 플랫폼 규격
//
// ⚠️ 아래 길이·용량 상한은 요약값이다. 플랫폼 정책은 수시로 바뀌므로
//    실제 캠페인 업로드 직전에 각 플랫폼 고지를 재확인할 것. 해상도·코덱은 안정적.
// ────────────────────────────────────────────────────────────────
export const PLATFORMS = {
  reels: {
    label: 'Instagram Reels',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    fps: 30,
    maxSec: 90,
    vcodec: 'libx264',
    crf: 20,
    acodec: 'aac',
    abitrate: '128k',
    container: 'mp4',
  },
  shorts: {
    label: 'YouTube Shorts',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    fps: 30,
    maxSec: 180,
    vcodec: 'libx264',
    crf: 20,
    acodec: 'aac',
    abitrate: '128k',
    container: 'mp4',
  },
  tiktok: {
    label: 'TikTok',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    fps: 30,
    // 상한은 훨씬 길지만 완주율이 성과를 지배하므로 운영 상한을 60초로 둔다.
    maxSec: 60,
    vcodec: 'libx264',
    crf: 20,
    acodec: 'aac',
    abitrate: '128k',
    container: 'mp4',
  },
  hero: {
    label: '랜딩 히어로(무음 루프)',
    // 랜딩은 480px 단일 컬럼(DESIGN.md Layout)이라 세로 소재가 맞다.
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    fps: 24,
    maxSec: 8,
    vcodec: 'libvpx-vp9',
    crf: 36,
    acodec: null, // 무음 — 자동재생 정책 때문에 오디오 트랙 자체를 넣지 않는다
    abitrate: null,
    container: 'webm',
  },
}

// ────────────────────────────────────────────────────────────────
// 세로 소재 세이프에어리어 (1080×1920 기준, px)
//
// 플랫폼 UI(상단 계정·하단 캡션/CTA/사운드)가 덮는 영역. 자막과 로고는 반드시 이 밖에 둔다.
// 3사 중 가장 보수적인 값을 취했다 — 개별 플랫폼에 맞춰 줄이지 말 것(한 소재를 3곳에 돌린다).
// ────────────────────────────────────────────────────────────────
export const SAFE_AREA = {
  top: 250,
  bottom: 420,
  left: 60,
  right: 60,
}

// ────────────────────────────────────────────────────────────────
// 브랜드 값 — ffmpeg/ASS 가 쓰는 형태로만. 원본은 DESIGN.md.
// ASS 색상은 &HAABBGGRR(BGR 역순, AA=00 이 불투명)이라 hex 를 그대로 못 쓴다.
// ────────────────────────────────────────────────────────────────
export const BRAND = {
  hex: {
    hyeon: '0A0A08', // 玄 배경
    surface: '16140F',
    gold: 'C9A84C', // 액체 골드
    goldLight: 'E8D5A0',
    seal: '9E2B2B', // 도장 레드
    textPrimary: 'E8E4DC',
  },
  ass: {
    textPrimary: '&H00DCE4E8',
    gold: '&H004CA8C9',
    goldLight: '&H00A0D5E8',
    outlineHyeon: '&H00080A0A',
    shadow: '&H80000000',
  },
  // 자막 서체 — DESIGN.md 한글 제목 = Noto Serif KR. 시스템 설치본을 쓴다.
  // 가변폰트(NotoSerifKR-VF.ttf)는 libass 에서 굵기 선택이 불안정해 정적 OTF 를 쓴다.
  font: {
    serifFamily: 'Noto Serif CJK KR',
    serifFile: 'C:/Windows/Fonts/NotoSerifCJKkr-Regular.otf',
    sansFamily: 'Noto Sans CJK KR',
    sansFile: 'C:/Windows/Fonts/NotoSansCJKkr-Regular.otf',
  },
}

// ────────────────────────────────────────────────────────────────
// 크리에이티브 스펙
//
// 타깃(DESIGN.md Product Context): 1차 = 40-50대 가족 사주 관리 여성 / 2차 = 20-30대 커플 궁합.
//
// 표시·광고법 가드레일 (TEAM_A_PM/MARKETING.md 참조) — 스펙 단계에서 걸러야 하는 것:
//   · 적중률·만족도·인원수 등 수치 주장 금지 (실집계 근거 없음)
//   · "용하다/맞춘다/해결된다" 등 효험 단정 금지 — 다루는 주제를 보여주는 데서 멈춘다
//   · 후기 인용 금지 (현재 랜딩 후기는 전부 예시 소재)
//   · 가격 표기 시 formatFeatureCost() 실값과 일치해야 함
//
// 필드:
//   platform  PLATFORMS 키
//   durationSec  Veo 는 4|6|8 만 지원 → 그보다 길면 컷 합성(segments)으로 만든다
//   segments  [{ prompt, sec }] — Veo 생성 단위. 1개면 단일 컷
//   captions  [{ text, startSec, endSec }] — post.mjs caption 이 ASS 로 번인
//   hook  첫 2초 안에 승부가 난다. 여기에 무엇을 보여줄지 한 줄로 적어둘 것
// ────────────────────────────────────────────────────────────────
export const MARKETING_SPECS = []
