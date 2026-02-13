import { createClient } from '@/lib/supabase/server'
import { EventBanners } from '@/components/events/event-banners'

export async function EventBannersSection() {
  const supabase = await createClient()
  const { data: eventBanners } = await supabase
    .from('event_banners')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(1)

  if (!eventBanners || eventBanners.length === 0) return null

  return (
    <div className="px-4 pb-8">
      <EventBanners banners={eventBanners} />
    </div>
  )
}
