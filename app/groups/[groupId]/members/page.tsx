// app/groups/[groupId]/members/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import { CopyIcon, CheckIcon } from 'lucide-react'

export default function MembersPage() {
  const params  = useParams()
  const groupId = params.groupId as string

  const [members, setMembers] = useState<any[]>([])
  const [group,   setGroup]   = useState<any>(null)
  const [copied,  setCopied]  = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: mems }, { data: grp }] = await Promise.all([
        supabase.from('group_members').select('id, display_name, avatar_color, joined_at').eq('group_id', groupId).order('joined_at'),
        supabase.from('groups').select('name, invite_code').eq('id', groupId).single(),
      ])
      setMembers(mems ?? [])
      setGroup(grp)
      setLoading(false)
    }
    load()
  }, [groupId])

  function copyInviteLink() {
    const url = `${window.location.origin}/join/${group?.invite_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) return <div className="p-6 text-center text-[#8c7b70]">Loading…</div>

  return (
    <div className="px-4 pt-6 pb-8">
      <h2 className="text-xl font-bold text-[#faf7f5] mb-2">Members</h2>
      <p className="text-[#8c7b70] text-sm mb-6">{members.length} people in this group</p>

      <div className="space-y-2 mb-8">
        {members.map(m => (
          <div
            key={m.id}
            className="flex items-center gap-3 bg-[#1a1614] border border-[#2c2825] rounded-xl p-4 shadow-sm"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center
                         text-sm font-bold text-white flex-shrink-0"
              style={{ background: m.avatar_color ?? '#f97316' }}
            >
              {getInitials(m.display_name)}
            </div>
            <div>
              <p className="font-medium text-[#faf7f5]">{m.display_name}</p>
              <p className="text-[#8c7b70] text-xs">
                Joined {new Date(m.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Invite link */}
      <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-[#faf7f5] mb-1">Invite someone</p>
        <p className="text-[#8c7b70] text-xs mb-3">
          Share this link — they click it, log in, and join the group instantly.
        </p>
        <div className="flex items-center gap-2 bg-[#0f0d0c] border border-[#2c2825]
                        rounded-lg px-3 py-2.5">
          <span className="text-[#8c7b70] text-xs flex-1 truncate font-mono">
            {typeof window !== 'undefined'
              ? `${window.location.origin}/join/${group?.invite_code}`
              : `/join/${group?.invite_code}`}
          </span>
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors
                       text-[#f97316] hover:text-[#fb923c] flex-shrink-0"
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
