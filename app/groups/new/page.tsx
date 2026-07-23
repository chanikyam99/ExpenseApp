// app/groups/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateInviteCode, AVATAR_COLORS } from '@/lib/utils'
import Link from 'next/link'

export default function NewGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !displayName.trim()) return

    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: who, error: whoErr } = await supabase.rpc('who_am_i')

    console.log('who_am_i:', who)
    console.log('who_am_i error:', whoErr)

    // 1. Create the group
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        invite_code: generateInviteCode(),
        created_by: user.id,
      })
      .select()
      .single()

    if (groupErr || !group) {
      setError('Failed to create group. Please try again.')
      setLoading(false)
      return
    }
    // if (groupErr || !group) {
    // console.error("GROUP ERROR:", groupErr)
    // console.error("GROUP DATA:", group)
    // setError(groupErr?.message ?? "Failed to create group")
    // setLoading(false)
    // return
    // }

    // 2. Add creator as first member
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        display_name: displayName.trim(),
        avatar_color: color,
      })

    if (memberErr) {
      setError('Group created but could not add you as a member. Please refresh.')
      setLoading(false)
      return
    }

    router.push(`/groups/${group.id}`)
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Link href="/groups" className="text-[#71717a] hover:text-white text-sm transition-colors">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Create a group</h1>
          <p className="text-[#71717a] mt-1 text-sm">
            You can invite housemates after creating.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-[#71717a] mb-1.5">Group name</label>
            <input
              type="text"
              placeholder="Our House, Goa Trip, Birthday…"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={50}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-4 py-2.5
                         text-white placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#71717a] mb-1.5">
              Your name in this group
            </label>
            <input
              type="text"
              placeholder="Ali, Raj, Priya…"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              maxLength={30}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-4 py-2.5
                         text-white placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6]"
            />
            <p className="text-[#71717a] text-xs mt-1">
              This is how others see you in expenses
            </p>
          </div>

          {error && <p className="text-[#ef4444] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim() || !displayName.trim()}
            className="w-full bg-[#3b82f6] hover:bg-blue-500 text-white rounded-lg
                       px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create group'}
          </button>
        </form>
      </div>
    </div>
  )
}