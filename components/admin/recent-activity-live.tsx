'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getRecentActivities } from '@/app/actions/admin/dashboard'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, User, CreditCard, Sparkles, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ActivityItem {
  id: string
  user_name: string
  user_email: string
  activity_type: string
  description: string
  metadata: any
  created_at: string
}

export function RecentActivityLive() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 초기 로드
    loadActivities()

    // Supabase Realtime 구독
    const supabase = createClient()
    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
        },
        (payload) => {
          console.log('New activity:', payload)
          // 새 활동 추가
          loadActivities()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadActivities = async () => {
    const result = await getRecentActivities(20)
    if (result.success && result.activities) {
      setActivities(result.activities)
    }
    setLoading(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'signup':
        return <User className="w-4 h-4" />
      case 'purchase':
        return <CreditCard className="w-4 h-4" />
      case 'analysis':
        return <Sparkles className="w-4 h-4" />
      case 'upgrade':
        return <TrendingUp className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getColor = (type: string) => {
    switch (type) {
      case 'signup':
        return 'text-blue-400 bg-blue-500/10'
      case 'purchase':
        return 'text-gold-400 bg-gold-500/10'
      case 'analysis':
        return 'text-purple-400 bg-purple-500/10'
      case 'upgrade':
        return 'text-green-400 bg-green-500/10'
      default:
        return 'text-ink-light/60 bg-surface/30'
    }
  }

  if (loading) {
    return <div className="text-ink-light/50">Loading...</div>
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
      <AnimatePresence mode="popLayout">
        {activities.map((activity, idx) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-3 p-3 bg-surface/30 border border-primary/10 rounded hover:border-primary/20 transition-colors"
          >
            <div className={`p-2 rounded-full ${getColor(activity.activity_type)}`}>
              {getIcon(activity.activity_type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-light font-medium truncate">{activity.description}</p>
              <p className="text-xs text-ink-light/50 mt-1">
                {activity.user_name || activity.user_email || '시스템'} ·{' '}
                {formatDistanceToNow(new Date(activity.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </p>
              {activity.metadata?.amount && (
                <p className="text-xs text-primary/70 mt-1">
                  ₩{activity.metadata.amount.toLocaleString()}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
