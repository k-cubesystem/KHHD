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
    id: 'shrine-theme-banga',
    title: '신당 테마 배경(반가) — 나비·벚꽃 오버레이 [v5: 가지 밀착·나비1·깜빡X]',
    placement: 'ShrineRoomClient 방 배경 (room.webp 위 lighten 오버레이, 편집 중 숨김)',
    durationSec: 4,
    resolution: '720p',
    aspectRatio: '9:16', // 세로형 방 위에 얹는 오버레이
    // v1(room.webp image-to-video 전체 시네마그래프)은 방 전체가 움직여 반려됨.
    // v2~v5: 순수 검정 위 요소만 생성 → 검정 crush + 무이음(xfade) 루프 후 mixBlendMode:lighten 으로 얹어 room.webp 정지 유지.
    // v5 피드백: 가지를 상·하단 끝에 바짝, 나비 1마리·더 작게, 깜빡임 금지(생성 후 seamless 루프 트랜스코드).
    prompt:
      'Pure solid black background (#000000), completely empty. Slender cherry blossom branches hug tightly along ' +
      'the very top edge and the very bottom edge of the vertical frame, only peeking in a little from those edges, ' +
      'gently swaying in a soft breeze. Very small, tiny, fine pale-pink cherry blossom petals slowly drift and ' +
      'fall. A SINGLE small butterfly flutters and playfully hovers only around the blossoms near the top edge, ' +
      'staying up at the top and never crossing the middle or lower area. Everything is small, delicate and ' +
      'understated. Smooth continuous steady motion — no flickering, no blinking, no strobing, nothing suddenly ' +
      'appearing or disappearing, consistent steady lighting throughout. Shallow depth of field, soft bokeh, ' +
      'realistic cinematic lighting. Only the petals, the single butterfly and the blossom branches move — the ' +
      'background stays perfectly black and empty, static camera. No room, no walls, no floor, no people, no text. ' +
      'Seamless loop, subtle graceful motion.',
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
