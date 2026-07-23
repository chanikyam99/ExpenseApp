// app/join/[inviteCode]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AVATAR_COLORS } from '@/lib/utils'


export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.inviteCode as string

  const [group, setGroup] = useState<{ id: string; name: string } | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [alreadyMember, setAlreadyMember] = useState(false)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // if (!user) {
      //   // Save invite code in session storage and redirect to login
      //   // sessionStorage.setItem('pendingInvite', inviteCode)
      //   // router.push('/')
      //   // router.push(`/?next=/join/${inviteCode}`)
      //   router.push(`/?next=${encodeURIComponent(`/join/${inviteCode}`)}`)
      //   return
      // }
      if (!user) {
        document.cookie = `pending_next=${encodeURIComponent(`/join/${inviteCode}`)}; path=/`
        router.push('/')
        return
      }

      // Find the group
      // const { data: grp } = await supabase
      //   .from('groups')
      //   .select('id, name')
      //   .eq('invite_code', inviteCode)
      //   .single()
      const { data, error } = await supabase
        .rpc('get_group_by_invite', {
          invite: inviteCode,
        })

      const grp = data?.[0]

      if (!grp) {
        setError('This invite link is invalid or has expired.')
        setLoading(false)
        return
      }

      // Check if already a member
      const { data: membership } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', grp.id)
        .eq('user_id', user.id)
        .single()

      if (membership) {
        router.push(`/groups/${grp.id}`)
        return
      }

      setGroup(grp)
      setLoading(false)
    }
    check()
  }, [inviteCode, router])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!group || !displayName.trim()) return

    setJoining(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    const { error: err } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        display_name: displayName.trim(),
        avatar_color: color,
      })

    if (err) {
      setError('Could not join the group. Please try again.')
      setJoining(false)
      return
    }

    router.push(`/groups/${group.id}`)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <p className="text-[#71717a]">Checking invite…</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-2xl mb-3">❌</p>
        <p className="text-white font-medium">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">🏠</p>
          <h1 className="text-2xl font-bold text-white">You're invited!</h1>
          <p className="text-[#71717a] mt-2">
            Join <strong className="text-white">{group?.name}</strong>
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
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
          </div>

          {error && <p className="text-[#ef4444] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={joining || !displayName.trim()}
            className="w-full bg-[#3b82f6] hover:bg-blue-500 text-white rounded-lg
                       px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
          >
            {joining ? 'Joining…' : 'Join group'}
          </button>
        </form>
      </div>
    </div>
  )
}