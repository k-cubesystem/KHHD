'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Bell, CheckCheck, Archive, Megaphone, Sparkles } from 'lucide-react'
import {
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotification,
} from '@/app/actions/core/user-notifications'

/** 알림 종류별 아이콘·CTA (기억함 업셀 등 행동 유도) */
const KIND: Record<string, { icon: typeof Bell; cta?: { label: string; href: string } }> = {
  chat_expiry_notice: {
    icon: Archive,
    cta: { label: '기억의 함 보러가기', href: '/protected/store?tab=items' },
  },
  admin_announcement: { icon: Megaphone },
}

export function NotificationsClient({ initialItems }: { initialItems: UserNotification[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const unread = items.filter((n) => !n.isRead).length

  const readOne = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    await markNotificationRead(id)
    router.refresh()
  }

  const readAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    await markAllNotificationsRead()
    router.refresh()
  }

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto px-3 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/protected/profile"
          className="inline-flex items-center gap-1 text-[12px] text-ink-light/50 hover:text-gold-300 font-serif"
        >
          <ChevronLeft className="w-4 h-4" />내 서재로
        </Link>
        {unread > 0 && (
          <button
            onClick={() => void readAll()}
            className="inline-flex items-center gap-1 text-[11px] text-gold-300 border border-gold-500/30 rounded-lg px-2.5 py-1"
          >
            <CheckCheck className="w-3.5 h-3.5" /> 모두 읽음
          </button>
        )}
      </div>

      <header className="text-center space-y-1.5 mb-5">
        <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">消 息</p>
        <h1 className="text-2xl font-serif font-bold text-ink-light">알림</h1>
        <p className="text-sm text-ink-light/50 font-sans">
          {unread > 0 ? `읽지 않은 소식 ${unread}건` : '신이 전한 소식이 이곳에 쌓입니다'}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-gold-500/15 bg-surface/30 py-12 text-center space-y-2">
          <Bell className="w-8 h-8 mx-auto text-ink-light/25" strokeWidth={1} />
          <p className="text-sm text-ink-light/45">아직 받은 알림이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const kind = KIND[n.type] ?? { icon: Sparkles }
            const Icon = kind.icon
            return (
              <div
                key={n.id}
                className={`rounded-xl border p-3.5 transition-colors ${
                  n.isRead ? 'border-white/8 bg-surface/25' : 'border-gold-500/35 bg-gold-500/[0.06]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`w-8 h-8 rounded-full grid place-items-center flex-shrink-0 ${
                      n.isRead ? 'bg-white/5 text-ink-light/40' : 'bg-gold-500/15 text-gold-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-[13px] font-serif font-bold truncate ${
                          n.isRead ? 'text-ink-light/60' : 'text-gold-200'
                        }`}
                      >
                        {n.title}
                      </p>
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-seal flex-shrink-0" />}
                    </div>
                    <p className="text-[11.5px] text-ink-light/70 leading-snug mt-1 whitespace-pre-wrap">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-ink-light/35">
                        {new Date(n.createdAt).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {kind.cta && (
                        <Link href={kind.cta.href} className="text-[11px] font-bold text-gold-400">
                          {kind.cta.label} →
                        </Link>
                      )}
                      {!n.isRead && (
                        <button
                          onClick={() => void readOne(n.id)}
                          className="ml-auto text-[10.5px] text-ink-light/40 hover:text-ink-light/70"
                        >
                          읽음 처리
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
