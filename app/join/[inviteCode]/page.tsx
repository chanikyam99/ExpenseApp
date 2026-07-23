'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AVATAR_COLORS, getInitials } from '@/lib/utils'

type UnclaimedSlot = { id: string; display_name: string; avatar_color: string | null }

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.inviteCode as string

  const [group,          setGroup]          = useState<{ id: string; name: string } | null>(null)
  const [unclaimedSlots, setUnclaimedSlots] = useState<UnclaimedSlot[]>([])
  const [displayName,    setDisplayName]    = useState('')
  const [loading,        setLoading]        = useState(true)
  const [joining,        setJoining]        = useState(false)
  const [joiningSlotId,  setJoiningSlotId]  = useState<string | null>(null)
  const [joinAsNew,      setJoinAsNew]      = useState(false)
  const [error,          setError]          = useState('')

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        document.cookie = `pending_next=${encodeURIComponent(`/join/${inviteCode}`)}; path=/`
        router.push('/')
        return
      }

      const { data } = await supabase.rpc('get_group_by_invite', { invite: inviteCode })
      const grp = data?.[0]

      if (!grp) {
        setError('This invite link is invalid or has expired.')
        setLoading(false)
        return
      }

      // Already a claimed member?
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

      // Fetch unclaimed slots for this group
      const { data: slots } = await supabase.rpc('get_unclaimed_members', {
        p_group_id: grp.id,
      })

      setGroup(grp)
      setUnclaimedSlots(slots ?? [])
      setLoading(false)
    }
    check()
  }, [inviteCode, router])

  async function claimSlot(slot: UnclaimedSlot) {
    setJoiningSlotId(slot.id)
    setError('')
    const supabase = createClient()

    const { data: success } = await supabase.rpc('claim_member_slot', {
      p_slot_id: slot.id,
    })

    if (success) {
      router.push(`/groups/${group!.id}`)
    } else {
      // Race: slot was taken by someone else
      setError('That slot was just claimed — please pick another.')
      const { data: fresh } = await supabase.rpc('get_unclaimed_members', {
        p_group_id: group!.id,
      })
      setUnclaimedSlots(fresh ?? [])
      setJoiningSlotId(null)
    }
  }

  async function handleJoinAsNew(e: React.FormEvent) {
    e.preventDefault()
    if (!group || !displayName.trim()) return
    setJoining(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    const { error: err } = await supabase.from('group_members').insert({
      group_id:     group.id,
      user_id:      user.id,
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
    <div className="min-h-screen bg-[#0f0d0c] flex items-center justify-center">
      <p className="text-[#8c7b70]">Checking invite…</p>
    </div>
  )

  if (error && !group) return (
    <div className="min-h-screen bg-[#0f0d0c] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-2xl mb-3">❌</p>
        <p className="text-white font-medium">{error}</p>
      </div>
    </div>
  )

  const showSlotPicker = unclaimedSlots.length > 0 && !joinAsNew

  return (
    <div className="min-h-screen bg-[#0f0d0c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">🏠</p>
          <h1 className="text-2xl font-bold text-white">You're invited!</h1>
          <p className="text-[#8c7b70] mt-2">
            Join <strong className="text-white">{group?.name}</strong>
          </p>
        </div>

        {error && (
          <p className="text-[#ef4444] text-sm text-center mb-4 bg-[#ef4444]/10
                        border border-[#ef4444]/20 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        {showSlotPicker ? (
          <div>
            <p className="text-sm text-[#8c7b70] text-center mb-4">
              Are you one of these people?
            </p>
            <div className="space-y-2 mb-4">
              {unclaimedSlots.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => claimSlot(slot)}
                  disabled={joiningSlotId !== null}
                  className="w-full flex items-center gap-3 bg-[#1a1614] border border-[#2c2825]
                             hover:border-[#f97316]/50 hover:bg-[#1f1b18] rounded-xl p-4
                             transition-colors disabled:opacity-50 text-left group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center
                               text-sm font-bold text-white flex-shrink-0"
                    style={{ background: slot.avatar_color ?? '#f97316' }}
                  >
                    {getInitials(slot.display_name)}
                  </div>
                  <span className="font-medium text-[#faf7f5] flex-1">
                    {slot.display_name}
                  </span>
                  {joiningSlotId === slot.id
                    ? <span className="text-[#8c7b70] text-sm">Joining…</span>
                    : <span className="text-[#f97316]">→</span>
                  }
                </button>
              ))}
            </div>
            <button
              onClick={() => { setJoinAsNew(true); setError('') }}
              className="w-full text-center text-sm text-[#8c7b70] hover:text-[#faf7f5]
                         transition-colors py-3 border border-[#2c2825] rounded-xl
                         hover:border-[#3a3330]"
            >
              I'm not listed — join as someone new
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoinAsNew} className="space-y-4">
            {unclaimedSlots.length > 0 && (
              <button
                type="button"
                onClick={() => { setJoinAsNew(false); setError('') }}
                className="flex items-center gap-1 text-sm text-[#8c7b70] hover:text-[#f97316]
                           transition-colors"
              >
                ← Back to member list
              </button>
            )}
            <div>
              <label className="block text-sm text-[#8c7b70] mb-1.5">
                Your name in this group
              </label>
              <input
                type="text"
                placeholder="Ali, Raj, Priya…"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                maxLength={30}
                className="w-full bg-[#1a1614] border border-[#2c2825] rounded-lg px-4 py-2.5
                           text-white placeholder-[#6b5a52] focus:outline-none focus:border-[#f97316]"
              />
            </div>
            <button
              type="submit"
              disabled={joining || !displayName.trim()}
              className="w-full bg-[#f97316] hover:bg-[#fb923c] text-white rounded-lg
                         px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
            >
              {joining ? 'Joining…' : 'Join group'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
