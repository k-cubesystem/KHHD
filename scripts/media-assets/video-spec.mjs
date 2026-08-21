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
    id: 'journey-night',
    title: '운세 별자리 — 밤하늘·별자리·달·별똥별',
    placement: 'JourneyCard full 변형 + /studio/samhap 소개 카드 배경 (opacity ~0.5 screen)',
    durationSec: 8,
    resolution: '720p',
    // CEO 지시(08-21): 밤하늘 별자리·달·별똥별. 사주 카드(먹·금가루)와 다른 세계관으로 기능 구별.
    // 깜빡임 금지 교훈 유지 — 별 반짝임은 아주 완만하게, 스트로브 금지. 별똥별 1회 통과.
    prompt:
      'A deep midnight navy-blue night sky, calm and luxurious. Many tiny warm golden-white stars, with a few ' +
      'faint constellations connected by very thin delicate golden lines. An elegant slender crescent moon glows ' +
      'softly in the upper area. The star field drifts extremely slowly. One single shooting star streaks ' +
      'gracefully across the sky leaving a thin fading golden trail. Stars shimmer very gently and slowly — ' +
      'no strobing, no rapid blinking, no flickering, consistent steady soft lighting. No clouds, no landscape, ' +
      'no horizon, no people, no text. Static camera, premium dark navy-and-gold palette, meditative subtle ' +
      'motion, seamless loop.',
  },
  {
    id: 'journey-ambient',
    title: '종합운수 여정 — 오상 향로(금빛 향 연기)',
    placement: 'JourneyCard full 변형 배경 (screen-blend, opacity ~0.2)',
    durationSec: 8,
    resolution: '720p',
    // 여정 카드 전용: 위 사주 카드(analysis-ambient 먹·금가루)와 같은 계보의 자매 톤 — 향 연기 한 줄기.
    // 교훈 반영(신당 v5): 깜빡임·명멸 금지, 정적 카메라, 순검정 위 요소만(screen 블렌드 전제).
    prompt:
      'Pure solid black background (#000000), completely empty. A single slender wisp of incense smoke rises ' +
      'slowly from the bottom center, rendered as faint glowing liquid gold, curling and unfurling in graceful ' +
      'meditative slow motion. Very fine golden dust particles drift gently upward around it. The smoke stays ' +
      'soft, dim and understated — luxurious, mystical, reverent. Smooth continuous steady motion — no ' +
      'flickering, no blinking, no strobing, nothing suddenly appearing or disappearing, consistent steady ' +
      'lighting throughout. Only the golden smoke and dust are visible on pure black. Static camera, no text, ' +
      'no people, no objects, no incense stick visible. Seamless loop, subtle graceful motion, premium ' +
      'dark-gold aesthetic.',
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
    id: 'physiognomy-ambient',
    title: '관상 스튜디오 히어로 — 금빛 선묘 얼굴',
    placement: 'studio/face 업로드 히어로 (screen-blend 오버레이)',
    durationSec: 4,
    resolution: '720p',
    // 관상 전용: 검정 위 금빛 라인만 → 玄 히어로 카드에 screen 블렌드로 얹는다(방식은 신당 오버레이 계보).
    prompt:
      'Pure solid black background, completely empty. An elegant continuous thin golden line slowly draws the ' +
      'serene side-profile silhouette of a human face, like master calligraphy brush strokes in liquid gold ink. ' +
      'Fine golden dust particles drift softly, and a subtle warm glow breathes along the drawn line. Minimal, ' +
      'luxurious, mystical, premium dark aesthetic. Only the golden lines and particles are visible on pure black. ' +
      'Abstract line art, not a realistic person, no text, static camera, seamless loop, very subtle motion.',
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
