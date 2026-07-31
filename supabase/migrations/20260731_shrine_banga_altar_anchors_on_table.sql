-- 배치 자유도 v2 · 진단 D-3 (부록 P-2, 2026-07-31) — 반가 와이드 상판 앵커를 **상 위로** 이설.
--
-- 안2.3 시드가 앵커 y 만 상판 면(53.5)으로 옮기고 x 는 좁은 방 시절 값(34/66)을 승계했다.
-- 와이드 룸에서 상판(altar-banga, w58)은 대청 로컬 x 40.9~59.1 뿐이라 「제단 왼편/오른편」
-- 자석이 **상 밖 허공**으로 끌어당겼다 — 시스템이 공중에 공물을 놓게 만들던 경로다.
-- 34/66 → 45/55 (y 53.5 유지, 상판 안). 가운데(50)는 그대로.
--
-- 코드 의존 없음(앵커는 시드 데이터) — 코드 배포 전후 어느 시점에 적용해도 안전하다.
-- 라이브에 좌·우 앵커로 스냅된 배치(anchor_id='altar-left'|'altar-right') 0건 실측 — 이관 불요.
-- 원복: 아래 45→34, 55→66 으로 같은 문장 재실행.

update public.shrine_theme_packs
set stage = jsonb_set(
  stage,
  '{zones,0,structures}',
  (
    select jsonb_agg(
      case
        when s->>'code' = 'altar-banga' then jsonb_set(
          s,
          '{anchors}',
          (
            select jsonb_agg(
              case
                when a->>'id' = 'altar-left'  then jsonb_set(a, '{x}', to_jsonb(45))
                when a->>'id' = 'altar-right' then jsonb_set(a, '{x}', to_jsonb(55))
                else a
              end
              order by ord
            )
            from jsonb_array_elements(s->'anchors') with ordinality t(a, ord)
          )
        )
        else s
      end
      order by ord
    )
    from jsonb_array_elements(stage->'zones'->0->'structures') with ordinality t(s, ord)
  )
)
where code = 'banga'
  and jsonb_typeof(stage->'zones'->0->'structures') = 'array';
