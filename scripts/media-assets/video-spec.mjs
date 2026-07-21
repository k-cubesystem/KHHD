// 영상 에셋 스펙 — 1회 생성 대상(runtime 생성 금지, 트래픽과 비용 분리).
// 배치처는 AmbientVideo(components/shared/AmbientVideo.tsx) 로 public/videos/{id}.webm 재생.
// 톤: DESIGN.md — 玄(깊은 흑) 배경 · 액체 골드. 5초 내외 · 720px · seamless loop · 무음 배경.

export const VIDEO_SPECS = [
  {
    id: 'summon-ritual',
    title: '강신 의식 — 금빛 부적 소용돌이',
    placement: 'FamilySummonGate → GangshinOverlay(backgroundVideoId)',
    durationSec: 5,
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
    durationSec: 5,
    resolution: '720p',
    prompt:
      'Deep 玄 black background. Slow flowing black ink tendrils and drifting gold powder forming a calm liquid-gold nebula, ' +
      'meditative and quiet, minimal elegant motion, no text, seamless loop, premium dark aesthetic.',
  },
]
