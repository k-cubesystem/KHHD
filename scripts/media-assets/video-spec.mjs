// 영상 에셋 스펙 — 1회 생성 대상(runtime 생성 금지, 트래픽과 비용 분리).
// 배치처는 AmbientVideo(components/shared/AmbientVideo.tsx) 로 public/videos/{id}.webm 재생.
// 톤: DESIGN.md — 玄(깊은 흑) 배경 · 액체 골드. 4초(Veo 지원: 4|6|8s) · 720p · seamless loop · 무음.

export const VIDEO_SPECS = [
  {
    id: 'summon-ritual',
    title: '강신 의식 — 금빛 부적 소용돌이',
    placement: 'FamilySummonGate → GangshinOverlay(backgroundVideoId)',
    durationSec: 4,
    resolution: '720p',
    prompt:
      'Deep 玄 black background. A slow cinematic vortex of golden Korean talisman (부적) glyphs and rising gold dust, ' +
      'aged hanji paper texture, liquid-gold particles swirling inward toward a faint divine light, reverent and mystical, ' +
      'no text, no characters, seamless loop, subtle motion, luxurious dark-gold palette.',
  },
  {
    id: 'analysis-ambient',
    title: '분석 앰비언트 — 흐르는 먹·금가루',
    placement: 'SajuLoadingOverlay (core-pulse 위 은은한 루프)',
    durationSec: 4,
    resolution: '720p',
    prompt:
      'Deep 玄 black background. Slow flowing black ink tendrils and drifting gold powder forming a calm liquid-gold nebula, ' +
      'meditative and quiet, minimal elegant motion, no text, seamless loop, premium dark aesthetic.',
  },
  {
    id: 'compatibility-ambient',
    title: '궁합 앰비언트 — 두 기운의 어우러짐',
    placement: 'compatibility-result 헤더 배경 (AmbientVideo)',
    durationSec: 4,
    resolution: '720p',
    // 궁합 전용: 금색 베이스에 은은한 홍조(로맨스) — 두 갈래 빛 실이 서로 얽히며 하나로.
    // DESIGN.md 玄 배경 유지하되 seal(도장 레드) 계열을 은은히 섞어 금색 일변도 탈피.
    prompt:
      'Deep 玄 black background. Two elegant flowing threads of light — one warm gold, one soft rose-crimson — ' +
      'slowly intertwining and weaving toward each other like two destinies meeting, drifting gold and rose particles, ' +
      'aged hanji paper texture, tender and auspicious, no text, no characters, seamless loop, ' +
      'subtle graceful motion, luxurious dark palette with gold and muted rose accents.',
  },
]
