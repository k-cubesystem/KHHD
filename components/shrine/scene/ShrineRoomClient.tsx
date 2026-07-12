'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
} from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Volume2, VolumeX, Wrench, Check, Settings, MessageCircle, Sparkles } from 'lucide-react'
import type { CatalogItem, Element, Placement, SceneData, ThemePack } from '@/lib/domain/shrine/types'
import { computeEnergy, indexCatalog, ELEMENTS, EL_KO, EL_COLOR } from '@/lib/domain/shrine/energy'
import { ZONES, clampPct, initialSpot, KEEPER_POS, KEEPER_GIVE_RADIUS, ZONE_LABEL } from '@/lib/domain/shrine/zones'
import {
  greetingFor,
  litLine,
  tapLine,
  giveLine,
  keeperTapLine,
  resonanceLine,
  idleLine,
  KEEPER_SNEEZE,
  KEEPER_TAP_LIMIT,
} from './keeper-lines'
import { useShrineAudio } from './useShrineAudio'
import { EffectsCanvas, type EffectsHandle } from './EffectsCanvas'
import { saveShrineLayout, activateThemePack, setPlacementLit } from '@/app/actions/shrine/scene'
import { recordKeeperGift } from '@/app/actions/shrine/keeper'
import { trackEvent } from '@/lib/analytics/ga4'

/** 촛불 불꽃은 아이템 상단에서 피어오르도록 y를 살짝 위로 */
const FLAME_Y_OFFSET = 5

interface Props {
  scene: SceneData
}

interface Ring {
  id: number
  x: number
  y: number
  color: string
}

let localSeq = 0
const nextLocalId = () => `local-${++localSeq}`

const themeVars = (pack: ThemePack | undefined): CSSProperties => {
  const a = pack?.assets ?? {}
  return {
    '--th-wall': a.wall ?? 'linear-gradient(180deg,#2b2214,#1d1810)',
    '--th-floor': a.floor ?? 'linear-gradient(180deg,#1a1308,#0f0b05)',
    '--th-accent': a.accent ?? '#c9a84c',
    '--th-glow': a.glow ?? 'rgba(201,168,76,0.14)',
    '--th-particle': a.particle ?? '#c9a84c',
    '--th-top': a.top ?? 'linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent)',
  } as CSSProperties
}

export function ShrineRoomClient({ scene }: Props) {
  const catalogById = useMemo(() => indexCatalog(scene.catalog), [scene.catalog])
  const { play, muted, toggleMute } = useShrineAudio()

  const [placements, setPlacements] = useState<Placement[]>(scene.placements)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeCode, setActiveCode] = useState(scene.activePackCode)
  const [bubble, setBubble] = useState<string>(greetingFor(scene.activePackCode))
  const [bounce, setBounce] = useState(0)
  const [rings, setRings] = useState<Ring[]>([])
  const seenResonance = useRef<Set<Element>>(new Set())
  const keeperTaps = useRef(0)
  const dirty = useRef(false)
  const effectsRef = useRef<EffectsHandle>(null)

  // 저장된 점화 상태 → 불꽃 등록
  useEffect(() => {
    scene.placements.forEach((p) => {
      if (p.state.lit) effectsRef.current?.setFlame(p.id, p.x, p.y - FLAME_Y_OFFSET, true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isOwner = scene.isOwner
  const activePack = scene.themes.find((t) => t.code === activeCode)

  // 기운 실시간 계산
  const { energy, yongsin, resonant } = useMemo(
    () => computeEnergy(scene.profile.base, placements, catalogById),
    [scene.profile.base, placements, catalogById]
  )
  const displayYongsin: Element = scene.profile.yongsin ?? yongsin

  // 보관함 가용 수량 = 보유 - 배치
  const available = useMemo(() => {
    const placed = new Map<string, number>()
    placements.forEach((p) => placed.set(p.catalogItemId, (placed.get(p.catalogItemId) ?? 0) + 1))
    return scene.inventory
      .map((inv) => ({ item: catalogById.get(inv.catalogItemId), qty: inv.qty - (placed.get(inv.catalogItemId) ?? 0) }))
      .filter((e): e is { item: CatalogItem; qty: number } => !!e.item && e.qty > 0)
  }, [placements, scene.inventory, catalogById])

  const lastActivity = useRef(Date.now())
  const keeperSay = useCallback((html: string, doBounce = true) => {
    lastActivity.current = Date.now()
    setBubble(html)
    if (doBounce) setBounce((b) => b + 1)
  }, [])

  // 신당지기 idle — 75초 무활동 시 잔잔한 혼잣말
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (editing) return
      if (Date.now() - lastActivity.current > 75000) {
        lastActivity.current = Date.now()
        keeperSay(idleLine(Date.now()), true)
      }
    }, 15000)
    return () => window.clearInterval(iv)
  }, [editing, keeperSay])

  const spawnRing = useCallback((x: number, y: number, color: string) => {
    const id = ++localSeq
    setRings((r) => [...r, { id, x, y, color }])
    window.setTimeout(() => setRings((r) => r.filter((k) => k.id !== id)), 1400)
  }, [])

  // 공명 판정 (배치 변경 시)
  const checkResonance = useCallback(() => {
    resonant.forEach((hit) => {
      if (seenResonance.current.has(hit.element)) return
      seenResonance.current.add(hit.element)
      spawnRing(hit.cx, hit.cy, EL_COLOR[hit.element])
      effectsRef.current?.emit('sparkle', hit.cx, hit.cy)
      play('bara')
      toast.success(`⚡ 오행 공명! ${EL_KO[hit.element]} 기운 +5`)
      keeperSay(resonanceLine(hit.element))
      trackEvent({ action: 'shrine_combo', category: 'shrine', label: hit.element })
    })
  }, [resonant, spawnRing, play, keeperSay])

  // ── 아이템 탭 (보기 모드) ──
  const onTapItem = useCallback(
    (p: Placement) => {
      if (editing) return
      const item = catalogById.get(p.catalogItemId)
      if (!item) return
      const b = item.behavior
      if (b.tap === 'toggleLit') {
        const lit = !p.state.lit
        setPlacements((prev) => prev.map((q) => (q.id === p.id ? { ...q, state: { ...q.state, lit } } : q)))
        dirty.current = true
        // 보기 모드 점화는 즉시 저장 (편집 저장을 거치지 않아도 유지)
        if (isOwner && !p.id.startsWith('local-')) void setPlacementLit(p.id, lit)
        play(b.sound ?? 'crackle')
        effectsRef.current?.setFlame(p.id, p.x, p.y - FLAME_Y_OFFSET, lit)
        if (lit) {
          effectsRef.current?.emit('flame', p.x, p.y - FLAME_Y_OFFSET)
          if (item.element) keeperSay(litLine(item.name, item.element))
        }
      } else {
        play(b.sound ?? 'moktak')
        if (b.tap === 'smoke') effectsRef.current?.emit('smoke', p.x, p.y - FLAME_Y_OFFSET)
        if (item.element) keeperSay(tapLine(item.element, Date.now()))
      }
      trackEvent({ action: 'shrine_tap', category: 'shrine', label: item.type })
    },
    [editing, catalogById, play, keeperSay, isOwner]
  )

  // ── 드래그 종료 (편집 모드) ──
  const onDragEnd = useCallback(
    (p: Placement, x: number, y: number) => {
      setPlacements((prev) => prev.map((q) => (q.id === p.id ? { ...q, x, y } : q)))
      dirty.current = true
      const item = catalogById.get(p.catalogItemId)
      if (item?.behavior.give && Math.hypot(x - KEEPER_POS.x, y - KEEPER_POS.y) < KEEPER_GIVE_RADIUS) {
        play('bell')
        setBounce((b) => b + 1)
        effectsRef.current?.emit('sparkle', KEEPER_POS.x, KEEPER_POS.y)
        toast(`🔮 신당지기가 ${item.name}을(를) 받았습니다`)
        keeperSay(giveLine(Date.now()))
        if (isOwner) void recordKeeperGift(item.name)
        trackEvent({ action: 'keeper_give', category: 'shrine', label: item.type })
      }
      window.setTimeout(checkResonance, 0)
    },
    [catalogById, play, keeperSay, checkResonance, isOwner]
  )

  // ── 수납 (편집 모드) ──
  const onRemove = useCallback(
    (p: Placement) => {
      setPlacements((prev) => prev.filter((q) => q.id !== p.id))
      dirty.current = true
      effectsRef.current?.setFlame(p.id, 0, 0, false)
      play('moktak')
    },
    [play]
  )

  // ── 보관함에서 꺼내기 ──
  const onPlaceFromTray = useCallback(
    (item: CatalogItem) => {
      const spot = initialSpot(item.layer, Math.random())
      setPlacements((prev) => [
        ...prev,
        { id: nextLocalId(), catalogItemId: item.id, layer: item.layer, x: spot.x, y: spot.y, flip: false, state: {} },
      ])
      dirty.current = true
      play('moktak')
      window.setTimeout(checkResonance, 0)
    },
    [play, checkResonance]
  )

  // ── 꾸미기 토글 + 저장 ──
  const toggleEdit = useCallback(async () => {
    if (!isOwner) return
    if (editing) {
      // 완료 → 저장
      if (dirty.current) {
        setSaving(true)
        const res = await saveShrineLayout(
          placements.map((p) => ({
            catalogItemId: p.catalogItemId,
            layer: p.layer,
            x: p.x,
            y: p.y,
            flip: p.flip,
            state: p.state,
          }))
        )
        setSaving(false)
        if (res.success) {
          dirty.current = false
          play('bell')
          toast.success('신당이 저장되었습니다')
          trackEvent({ action: 'placement_save', category: 'shrine' })
        } else {
          toast.error(res.error === 'NOT_ENOUGH_OWNED' ? '보유하지 않은 아이템입니다' : '저장 실패')
          return
        }
      }
      setEditing(false)
    } else {
      setEditing(true)
    }
  }, [editing, placements, play, isOwner])

  // ── 신당지기 탭 ──
  const onTapKeeper = useCallback(() => {
    if (editing) return
    play('moktak')
    keeperTaps.current += 1
    if (keeperTaps.current >= KEEPER_TAP_LIMIT) {
      keeperSay(KEEPER_SNEEZE)
      keeperTaps.current = 0
      return
    }
    keeperSay(keeperTapLine(keeperTaps.current))
  }, [editing, play, keeperSay])

  // ── 테마 전환 ──
  const onSelectTheme = useCallback(
    async (pack: ThemePack) => {
      if (!pack.owned) {
        toast(`${pack.name} — 상점에서 구매 후 사용할 수 있어요`)
        return
      }
      const prev = activeCode
      setActiveCode(pack.code)
      keeperSay(greetingFor(pack.code))
      play('chime')
      const res = await activateThemePack(pack.code)
      if (!res.success) {
        setActiveCode(prev)
        toast.error('테마 변경 실패')
      } else {
        trackEvent({ action: 'pack_activate', category: 'shrine', label: pack.code })
      }
    },
    [activeCode, keeperSay, play]
  )

  return (
    <div className="w-full max-w-[430px] mx-auto" style={themeVars(activePack)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-1 pb-2.5">
        <div>
          <p className="text-[9px] tracking-[0.32em] text-gold-dim font-serif">나 의 신 당</p>
          <h1 className="text-base font-serif font-bold text-ink-primary">{scene.shrineName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Link
              href="/protected/shrine/deities"
              className="h-8 px-2.5 rounded-[10px] flex items-center gap-1.5 bg-gold-500/[0.12] border border-gold-500/40 text-gold-200 text-[11.5px] font-serif font-bold"
              aria-label="신위 판테온"
            >
              <Sparkles className="w-3.5 h-3.5" />
              신위
            </Link>
          )}
          <button
            onClick={toggleMute}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
            className="w-8 h-8 rounded-[10px] grid place-items-center bg-surface border border-gold-500/25 text-gold-300"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {isOwner && (
            <Link
              href="/protected/shrine/setup"
              className="w-8 h-8 rounded-[10px] grid place-items-center bg-surface border border-gold-500/25 text-gold-300"
              aria-label="설정"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* 룸 */}
      <div
        className={`room relative rounded-[18px] overflow-hidden ${editing ? 'editing' : ''}`}
        style={{
          height: 'min(46vh, 380px)',
          border: '1px solid var(--th-frame, rgba(201,168,76,0.3))',
          touchAction: 'none',
        }}
      >
        <div className="absolute inset-x-0 top-0 bottom-[40%]" style={{ background: 'var(--th-wall)' }} />
        <div className="absolute inset-x-0 top-0 h-[3px] z-[2]" style={{ background: 'var(--th-top)' }} />
        <div className="absolute inset-x-0 top-[60%] bottom-0" style={{ background: 'var(--th-floor)' }} />
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{ top: '77%', width: '64%', height: '16%', background: 'var(--th-glow)', filter: 'blur(7px)' }}
        />

        {/* 제단 */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '47%', width: '62%', height: '20%' }}>
          <div
            className="absolute inset-x-0 top-0 bottom-[62%] rounded-t"
            style={{
              background: 'linear-gradient(180deg,#4a3620,#33240f)',
              border: '1px solid rgba(201,168,76,0.35)',
              borderBottom: 0,
            }}
          />
          <div
            className="absolute top-[38%] inset-x-[4%] bottom-0 rounded-b grid place-items-center"
            style={{
              background: 'linear-gradient(180deg,#2a1d0c,#1a1207)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderTop: 0,
            }}
          >
            <span className="font-serif text-[13px] opacity-55" style={{ color: 'var(--th-accent)' }}>
              福
            </span>
          </div>
        </div>

        {/* 존 가이드 (편집) */}
        {editing &&
          (Object.keys(ZONES) as Array<keyof typeof ZONES>).map((layer) => {
            const z = ZONES[layer]
            return (
              <div
                key={layer}
                className="absolute rounded-lg pointer-events-none"
                style={{
                  left: `${z.x[0]}%`,
                  right: `${100 - z.x[1]}%`,
                  top: `${z.y[0]}%`,
                  bottom: `${100 - z.y[1]}%`,
                  border: '1.5px dashed rgba(201,168,76,0.32)',
                }}
              >
                <span className="absolute -top-px left-1.5 text-[8px] tracking-[0.15em] text-gold-300 px-1 rounded-sm bg-black/80">
                  {ZONE_LABEL[layer]}
                </span>
              </div>
            )
          })}

        {/* 파티클 이펙트 */}
        <EffectsCanvas ref={effectsRef} />

        {/* 신당지기 */}
        <button
          onClick={onTapKeeper}
          className="absolute z-[12] text-center"
          style={{ left: `${KEEPER_POS.x}%`, top: `${KEEPER_POS.y}%` }}
          aria-label="신당지기"
        >
          <div
            key={bounce}
            className="w-[38px] h-[38px] rounded-full grid place-items-center text-[19px] shrine-keeper-orb"
            style={{
              background: 'radial-gradient(circle at 35% 30%, var(--th-glow), rgba(0,0,0,0.45))',
              border: '1px solid var(--th-accent)',
              boxShadow: '0 0 16px var(--th-glow)',
            }}
          >
            🔮
          </div>
          <div className="w-[26px] h-[6px] mx-auto mt-0.5 rounded-full bg-black/40 blur-[2px]" />
        </button>

        {/* 말풍선 */}
        {!editing && (
          <div
            className="absolute z-[26] text-[11.5px] leading-relaxed px-3 py-2 rounded-[3px_12px_12px_12px] backdrop-blur-sm"
            style={{
              left: '22%',
              top: '24%',
              right: '7%',
              background: 'rgba(10,10,8,0.74)',
              border: '1px solid var(--th-accent)',
            }}
          >
            <div className="text-[9px] tracking-[0.24em] mb-0.5" style={{ color: 'var(--th-accent)' }}>
              신당지기
            </div>
            <span dangerouslySetInnerHTML={{ __html: bubble }} />
          </div>
        )}

        {/* 아이템 */}
        {placements.map((p) => {
          const item = catalogById.get(p.catalogItemId)
          if (!item) return null
          return (
            <Sprite
              key={p.id}
              placement={p}
              item={item}
              editing={editing}
              onTap={() => onTapItem(p)}
              onRemove={() => onRemove(p)}
              onDragEnd={(x, y) => onDragEnd(p, x, y)}
            />
          )
        })}

        {/* 공명 링 */}
        {rings.map((r) => (
          <span
            key={r.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-[50] shrine-ring"
            style={{ left: `${r.x}%`, top: `${r.y}%`, border: `2px solid ${r.color}` }}
          />
        ))}

        {/* 상단 컨트롤 */}
        {isOwner && (
          <button
            onClick={toggleEdit}
            disabled={saving}
            className="absolute top-2.5 left-2.5 z-30 text-[10.5px] font-bold tracking-[0.05em] px-3 py-1.5 rounded-full flex items-center gap-1 disabled:opacity-50"
            style={{ background: 'rgba(201,168,76,0.16)', border: '1px solid rgba(201,168,76,0.55)', color: '#f4e4ba' }}
          >
            {editing ? <Check className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
            {editing ? (saving ? '저장 중…' : '완료') : '꾸미기'}
          </button>
        )}
        <div
          className="absolute top-2.5 right-2.5 z-30 text-[8.5px] tracking-[0.06em] px-2 py-[3px] rounded-full text-ink-primary/75 tabular-nums"
          style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          TODAY <b style={{ color: 'var(--th-accent)' }}>{scene.visitorCount}</b>
        </div>
        {editing && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 text-[9px] tracking-[0.08em] text-gold-300 px-2.5 py-[3px] rounded-full whitespace-nowrap"
            style={{ background: 'rgba(10,10,8,0.75)', border: '1px solid rgba(201,168,76,0.4)' }}
          >
            드래그로 배치 · ✕로 수납 · 공물은 신당지기에게
          </div>
        )}
      </div>

      {/* 테마 칩 */}
      {isOwner && (
        <div className="flex gap-2 px-1 pt-3 overflow-x-auto no-scrollbar">
          {scene.themes.map((t) => (
            <button
              key={t.code}
              onClick={() => onSelectTheme(t)}
              className={`flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full font-sans transition-all ${
                t.code === activeCode
                  ? 'bg-gold-500/[0.14] border border-gold-500 text-gold-300'
                  : 'bg-surface border border-white/10 text-ink-light/50'
              }`}
            >
              {t.name}
              <span className="text-[9.5px] opacity-70 ml-1 tabular-nums">
                {t.owned ? '보유' : t.priceBokchae > 0 ? `${t.priceBokchae}복채` : '무료'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 기운 게이지 */}
      {isOwner && (
        <div className="mt-3 px-1">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-serif text-[13px] font-bold tracking-[0.1em] text-ink-primary">氣運 균형</span>
            <span className="text-[10.5px] px-2 py-[3px] rounded-sm bg-gold-500/[0.12] border border-gold-500/35 text-gold-300">
              필요 기운 <b className="font-serif text-gold-500">{EL_KO[displayYongsin]}</b>
            </span>
          </div>
          <div className="flex gap-1.5">
            {ELEMENTS.map((el) => {
              const low = el === displayYongsin
              return (
                <div key={el} className="flex-1 text-center">
                  <div
                    className="h-[46px] rounded-md relative overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: low ? '1px solid rgba(201,168,76,0.55)' : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: low ? '0 0 10px rgba(201,168,76,0.15)' : 'none',
                    }}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-md transition-[height] duration-500"
                      style={{ height: `${energy[el]}%`, background: EL_COLOR[el] }}
                    />
                  </div>
                  <div className="font-serif text-[12px] mt-1 text-ink-primary/75">{EL_KO[el]}</div>
                  <div className="text-[10px] text-ink-light/40 tabular-nums">{energy[el]}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 하단 독 */}
      {isOwner ? (
        <div className="mt-3 px-1 pb-6 relative min-h-[104px]">
          {editing ? (
            <div
              className="rounded-[14px] p-3"
              style={{ background: '#1e1b15', border: '1px solid rgba(201,168,76,0.4)' }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] tracking-[0.14em] text-gold-dim">보관함 — 탭하여 꺼내기</span>
                <Link
                  href="/protected/shrine/shop"
                  className="text-[10px] font-bold text-gold-300 border border-gold-500/40 rounded-full px-2.5 py-1"
                >
                  ＋ 신물 구하기
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1.5">
                {available.length === 0 && (
                  <span className="text-[11px] text-ink-light/30 py-3">
                    보관함이 비었어요 · 상점에서 신물을 구해보세요
                  </span>
                )}
                {available.map(({ item, qty }) => (
                  <button
                    key={item.id}
                    onClick={() => onPlaceFromTray(item)}
                    className="relative flex-shrink-0 w-[46px] h-[46px] rounded-[10px] grid place-items-center text-[22px] bg-black/30 border border-gold-500/25"
                    title={`${item.name} (${ZONE_LABEL[item.layer]})`}
                  >
                    {item.emoji}
                    {item.element && (
                      <span
                        className="absolute -top-1.5 -right-1.5 w-[13px] h-[13px] rounded-full text-[7.5px] font-serif grid place-items-center font-bold"
                        style={{
                          background: EL_COLOR[item.element],
                          color: item.element === 'fire' || item.element === 'water' ? '#f2dcdc' : '#0a0a08',
                        }}
                      >
                        {EL_KO[item.element]}
                      </span>
                    )}
                    <span
                      className="absolute -bottom-1 -right-1 text-[8.5px] font-bold min-w-[15px] text-center rounded-full px-1 tabular-nums text-[#f2dcdc]"
                      style={{ background: '#9e2b2b' }}
                    >
                      ×{qty}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
                {['오늘 조심할 것은?', '금 기운 올리는 법', '이번 주 재물운'].map((q) => (
                  <Link
                    key={q}
                    href="/protected/shrine/chat"
                    className="flex-shrink-0 text-[10.5px] px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{
                      background: 'rgba(201,168,76,0.07)',
                      border: '1px solid rgba(201,168,76,0.18)',
                      color: 'rgba(201,168,76,0.85)',
                    }}
                  >
                    {q}
                  </Link>
                ))}
              </div>
              <Link
                href="/protected/shrine/chat"
                className="flex gap-2 items-center rounded-[14px] px-3.5 py-3 bg-surface border border-gold-500/20"
              >
                <MessageCircle className="w-4 h-4 text-gold-500/60" />
                <span className="flex-1 text-[12.5px] text-ink-light/35">신당지기에게 말을 건네보세요…</span>
                <span
                  className="w-[30px] h-[30px] rounded-[9px] grid place-items-center text-gold-500 text-[13px]"
                  style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)' }}
                >
                  ➤
                </span>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 px-1 pb-6">
          <Link
            href="/protected/shrine"
            className="flex items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 bg-gold-500/[0.1] border border-gold-500/30 text-gold-300 text-sm font-serif font-bold"
          >
            🏮 나만의 신당 만들기
          </Link>
        </div>
      )}

      <style jsx>{`
        .shrine-keeper-orb {
          animation: shrineBounce 0.55s ease;
        }
        @keyframes shrineBounce {
          0%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-6px) scale(1.06);
          }
        }
        .shrine-ring {
          animation: shrineRing 1.3s ease-out forwards;
        }
        @keyframes shrineRing {
          0% {
            width: 20px;
            height: 20px;
            opacity: 0.95;
          }
          100% {
            width: 150px;
            height: 150px;
            opacity: 0;
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .shrine-keeper-orb,
          .shrine-ring {
            animation-duration: 0.01ms;
          }
        }
      `}</style>
    </div>
  )
}

// ─── 개별 아이템 스프라이트 ──────────────────────────────────
interface SpriteProps {
  placement: Placement
  item: CatalogItem
  editing: boolean
  onTap: () => void
  onRemove: () => void
  onDragEnd: (x: number, y: number) => void
}

const SIZE_PX: Record<string, string> = { sm: '23px', md: '29px', lg: '35px' }

function Sprite({ placement, item, editing, onTap, onRemove, onDragEnd }: SpriteProps) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const moved = useRef(false)
  const posRef = useRef({ x: placement.x, y: placement.y })

  const onPointerDown = useCallback(
    (e: RPointerEvent<HTMLDivElement>) => {
      if (!editing) return
      e.preventDefault()
      const el = ref.current
      const room = el?.parentElement
      if (!el || !room) return
      dragging.current = true
      moved.current = false
      el.setPointerCapture(e.pointerId)
      el.style.zIndex = '60'
      const zone = ZONES[item.layer]
      const rect = room.getBoundingClientRect()

      const move = (ev: PointerEvent) => {
        if (!dragging.current) return
        moved.current = true
        const x = clampPct(((ev.clientX - rect.left) / rect.width) * 100, zone.x)
        const y = clampPct(((ev.clientY - rect.top) / rect.height) * 100, zone.y)
        posRef.current = { x, y }
        el.style.left = `${x}%`
        el.style.top = `${y}%`
        if (item.layer === 'floor') el.style.zIndex = String(10 + Math.round(y))
      }
      const up = () => {
        dragging.current = false
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', up)
        if (moved.current) onDragEnd(posRef.current.x, posRef.current.y)
      }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
    },
    [editing, item.layer, onDragEnd]
  )

  const lit = placement.state.lit === true
  const zIndex = item.layer === 'floor' ? 10 + Math.round(placement.y) : 10

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onClick={() => {
        if (!editing && !moved.current) onTap()
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
      style={{
        left: `${placement.x}%`,
        top: `${placement.y}%`,
        fontSize: SIZE_PX[item.size] ?? '29px',
        lineHeight: 1,
        zIndex,
        cursor: editing ? 'grab' : 'pointer',
        filter: lit
          ? 'drop-shadow(0 0 7px rgba(244,228,186,0.95)) drop-shadow(0 0 15px rgba(201,168,76,0.5))'
          : 'drop-shadow(0 3px 3px rgba(0,0,0,0.55))',
      }}
    >
      <span style={{ display: 'inline-block' }}>{item.emoji}</span>
      {item.layer !== 'wall' && item.layer !== 'hanging' && (
        <span
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{ bottom: '-5px', width: '26px', height: '7px', background: 'rgba(0,0,0,0.45)', filter: 'blur(2px)' }}
        />
      )}
      {editing && (
        <span
          role="button"
          aria-label="수납"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute -top-2.5 -left-2.5 w-[17px] h-[17px] rounded-full grid place-items-center text-[9px] cursor-pointer text-[#f2dcdc] leading-none"
          style={{ background: '#9e2b2b', border: '1px solid rgba(0,0,0,0.4)' }}
        >
          ✕
        </span>
      )}
    </div>
  )
}
