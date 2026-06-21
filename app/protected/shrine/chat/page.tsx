import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyShrine } from '@/app/actions/shrine/shrine'
import { ShrineChatPanel } from '@/components/shrine/ShrineChatPanel'

export default async function ShrineChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const shrine = await getMyShrine()
  if (!shrine) redirect('/protected/shrine')

  const itemNames = shrine.shrine_items.map((i) => i.shrine_item_catalog.name)

  return (
    <div className="min-h-screen px-4 py-6 space-y-5">
      <div>
        <p className="text-[10px] tracking-[0.4em] text-gold-500/40 font-serif">신당 무당</p>
        <h1 className="text-xl font-serif font-bold text-ink-light">{shrine.name}의 신탁</h1>
        {itemNames.length > 0 && (
          <p className="text-xs text-ink-light/30 font-sans mt-0.5">봉헌물: {itemNames.join(' · ')}</p>
        )}
      </div>

      <ShrineChatPanel />
    </div>
  )
}
