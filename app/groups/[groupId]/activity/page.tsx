// app/groups/[groupId]/activity/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'

interface ActivityEntry {
  id: string
  description: string
  created_at: string
  action: string
}

export default function ActivityPage() {
  const params  = useParams()
  const groupId = params.groupId as string
  const [log,     setLog]     = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('activity_log')
      .select('id, description, created_at, action')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLog(data ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel(`activity:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log', filter: `group_id=eq.${groupId}` },
        payload => {
          setLog(prev => [payload.new as ActivityEntry, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId])

  function actionIcon(action: string) {
    if (action.includes('expense')) return '💸'
    if (action.includes('settle'))  return '✅'
    return '📝'
  }

  if (loading) return <div className="p-6 text-center text-[#8c7b70]">Loading…</div>

  return (
    <div className="px-4 pt-6">
      <h2 className="text-lg font-bold text-[#faf7f5] mb-4">Activity</h2>

      {log.length === 0 ? (
        <p className="text-center text-[#8c7b70] py-12">No activity yet.</p>
      ) : (
        <div className="space-y-2">
          {log.map(entry => (
            <div
              key={entry.id}
              className="flex items-start gap-3 bg-[#1a1614] border border-[#2c2825]
                         rounded-xl p-4 shadow-sm"
            >
              <span className="text-xl flex-shrink-0">{actionIcon(entry.action)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[#e8ddd9] text-sm leading-relaxed">{entry.description}</p>
                <p className="text-[#6b5a52] text-xs mt-1">{timeAgo(entry.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
