-- 반가 왼쪽 문 제거 — 벽 전체를 가족 선반장 자리로 (2026-08-06 지시)
--
-- 문간(door-banga)은 신당지기(오브) 입장 연출의 시작점이었다. 배회 주체가 신수로 바뀌었고
-- (입장은 이제 왼쪽 벽 밖에서 스르륵 — ShrineRoomClient KEEPER_ENTRANCE_FROM 주석), 왼벽은
-- 가족 선반장(FamilyShelfWall) 자리가 된다. 안2.3 과 같은 방식으로 구역 구조물 배열을 통째로
-- 갈아끼운다 — 대조 테스트(banga-wide-seed.test)가 이 파일의 structures2 달러 블록을 **정본**으로
-- 읽으므로, 블록 안에는 순수 JSON 만 둔다(주석·트레일링 콤마 금지. 달러 태그 문자열을 주석에
-- 그대로 쓰면 구분자 수가 어긋나 테스트가 파싱 단계에서 깨진다 — 의도된 계약이다).
--
-- ⚠️ 앵커 x 45/50/55 · y 53.5 는 2026-07-31 앵커 시드 정정(부록 P-2) 이후의 **라이브 실값**이다.
--    0730 안2.3 시드의 34/66 으로 되돌리면 와이드 룸에서 "상 밖 허공" 스냅이 재발한다.
-- ⚠️ 되돌리기: 아래 배열에 door-banga 항목을 다시 넣으면 끝이다 —
--    {"code":"door-banga","assetUrl":"/shrine/stage/banga/room-door.webp","x":10,"y":37,"w":36,"anchors":[]}
--    room-door.webp 자산은 지우지 않는다.

update public.shrine_theme_packs
set stage = jsonb_set(stage, '{zones,0,structures}', $structures2$[
  {
    "code": "platform-banga",
    "assetUrl": "/shrine/stage/banga/platform.webp",
    "x": 50,
    "y": 51,
    "w": 44,
    "anchors": []
  },
  {
    "code": "altar-banga",
    "assetUrl": "/shrine/stage/banga/altar-top.webp",
    "x": 50,
    "y": 58,
    "w": 58,
    "anchors": [
      { "id": "altar-left", "layer": "altar", "x": 45, "y": 53.5, "label": "제단 왼편" },
      { "id": "altar-center", "layer": "altar", "x": 50, "y": 53.5, "label": "제단 가운데" },
      { "id": "altar-right", "layer": "altar", "x": 55, "y": 53.5, "label": "제단 오른편" }
    ]
  }
]$structures2$::jsonb)
where code = 'banga'
  and jsonb_array_length(coalesce(stage -> 'zones', '[]'::jsonb)) = 1;
