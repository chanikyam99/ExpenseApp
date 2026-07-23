'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInitials, AVATAR_COLORS } from '@/lib/utils'
import { CopyIcon, CheckIcon, PlusIcon, ClockIcon } from 'lucide-react'

type Member = {
  id: string
  display_name: string
  avatar_color: string | null
  joined_at: string | null
  user_id: string | null
}

export default function MembersPage() {
  const params  = useParams()
  const groupId = params.groupId as string

  const [members,  setMembers]  = useState<Member[]>([])
  const [group,    setGroup]    = useState<{ name: string; invite_code: string } | null>(null)
  const [copied,   setCopied]   = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [addName,  setAddName]  = useState('')
  const [adding,   setAdding]   = useState(false)
  const [addError, setAddError] = useState('')

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const [{ data: mems }, { data: grp }] = await Promise.all([
      supabase.from('group_members')
        .select('id, display_name, avatar_color, joined_at, user_id')
        .eq('group_id', groupId),
      supabase.from('groups').select('name, invite_code').eq('id', groupId).single(),
    ])
    // joined first (sorted by date), pending after
    const joined  = (mems ?? [])
      .filter((m: any) => m.user_id !== null)
      .sort((a: any, b: any) => (a.joined_at ?? '').localeCompare(b.joined_at ?? ''))
    const pending = (mems ?? []).filter((m: any) => m.user_id === null)
    setMembers([...joined, ...pending] as Member[])
    setGroup(grp)
    setLoading(false)
  }, [groupId])

  useEffect(() => { loadData() }, [loadData])

  function copyInviteLink() {
    const url = `${window.location.origin}/join/${group?.invite_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!addName.trim()) return
    setAdding(true)
    setAddError('')

    const supabase = createClient()
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

    const { error } = await supabase.rpc('add_unclaimed_member', {
      p_group_id:     groupId,
      p_display_name: addName.trim(),
      p_avatar_color: color,
    })

    if (error) {
      setAddError('Could not add member. Make sure the name is unique in this group.')
    } else {
      setAddName('')
      await loadData()
    }
    setAdding(false)
  }

  const joinedMembers  = members.filter(m => m.user_id !== null)
  const pendingMembers = members.filter(m => m.user_id === null)

  if (loading) return <div className="p-6 text-center text-[#8c7b70]">Loading…</div>

  return (
    <div className="px-4 pt-6 pb-8">
      <h2 className="text-xl font-bold text-[#faf7f5] mb-1">Members</h2>
      <p className="text-[#8c7b70] text-sm mb-6">
        {joinedMembers.length} joined
        {pendingMembers.length > 0 && ` · ${pendingMembers.length} waiting`}
      </p>

      {/* Joined members */}
      {joinedMembers.length > 0 && (
        <div className="space-y-2 mb-6">
          {joinedMembers.map(m => (
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
                {m.joined_at && (
                  <p className="text-[#8c7b70] text-xs">
                    Joined {new Date(m.joined_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending / unclaimed members */}
      {pendingMembers.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#8c7b70] uppercase tracking-wider mb-3">
            Waiting to join ({pendingMembers.length})
          </p>
          <div className="space-y-2">
            {pendingMembers.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-[#1a1614] border border-[#2c2825]
                           border-dashed rounded-xl p-4"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center
                             text-sm font-bold text-white flex-shrink-0 opacity-50"
                  style={{ background: m.avatar_color ?? '#f97316' }}
                >
                  {getInitials(m.display_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#faf7f5]">{m.display_name}</p>
                  <p className="text-[#8c7b70] text-xs flex items-center gap-1 mt-0.5">
                    <ClockIcon size={11} />
                    Invite pending
                  </p>
                </div>
                <span className="text-xs font-medium text-[#f97316] bg-[#f97316]/10
                                 border border-[#f97316]/20 rounded-full px-2 py-0.5 flex-shrink-0">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-add member form */}
      <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-4 mb-4 shadow-sm">
        <p className="text-sm font-medium text-[#faf7f5] mb-1">Pre-add a member</p>
        <p className="text-[#8c7b70] text-xs mb-3">
          Add someone by name now. When they get the invite link they can claim their slot
          instead of creating a duplicate.
        </p>
        <form onSubmit={handleAddMember} className="flex gap-2">
          <input
            type="text"
            placeholder="Raj, Priya…"
            value={addName}
            onChange={e => setAddName(e.target.value)}
            maxLength={30}
            className="flex-1 bg-[#0f0d0c] border border-[#2c2825] rounded-lg px-3 py-2 text-sm
                       text-white placeholder-[#6b5a52] focus:outline-none focus:border-[#f97316]"
          />
          <button
            type="submit"
            disabled={adding || !addName.trim()}
            className="flex items-center gap-1.5 bg-[#f97316] hover:bg-[#fb923c] text-white
                       rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <PlusIcon size={14} />
            {adding ? '…' : 'Add'}
          </button>
        </form>
        {addError && <p className="text-[#ef4444] text-xs mt-2">{addError}</p>}
      </div>

      {/* Invite link */}
      <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-4 shadow-sm">
        <p className="text-sm font-medium text-[#faf7f5] mb-1">Invite link</p>
        <p className="text-[#8c7b70] text-xs mb-3">
          Share this with everyone — they'll see pre-added names and can claim their slot.
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
