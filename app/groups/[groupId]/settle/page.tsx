// app/groups/[groupId]/settle/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { GroupMember } from '@/types/database'

export default function SettlePage() {
  const params  = useParams()
  const router  = useRouter()
  const groupId = params.groupId as string

  const [members,     setMembers]     = useState<GroupMember[]>([])
  const [myMemberId,  setMyMemberId]  = useState('')
  const [paidBy,      setPaidBy]      = useState('')
  const [paidTo,      setPaidTo]      = useState('')
  const [amount,      setAmount]      = useState('')
  const [note,        setNote]        = useState('')
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10))
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const [{ data: mems }, { data: myMem }] = await Promise.all([
        supabase.from('group_members')  .select(`
    id,
    group_id,
    user_id,
    display_name,
    avatar_color,
    joined_at
  `).eq('group_id', groupId).order('joined_at'),
        supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', user.id).single(),
      ])

      if (mems) {
        setMembers(mems)
        setMyMemberId(myMem?.id ?? mems[0]?.id ?? '')
        setPaidBy(myMem?.id ?? mems[0]?.id ?? '')
        setPaidTo(mems.find(m => m.id !== (myMem?.id ?? mems[0]?.id))?.id ?? '')
      }
    }
    load()
  }, [groupId, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!paidBy || !paidTo || paidBy === paidTo || parsedAmount <= 0) {
      setError('Please select two different members and enter a valid amount.')
      return
    }

    setLoading(true)
    setError('')
    const supabase = createClient()

    const { error: err } = await supabase.from('settlements').insert({
      group_id: groupId,
      paid_by:  paidBy,
      paid_to:  paidTo,
      amount:   parsedAmount,
      note:     note.trim() || null,
      date,
    })

    if (err) {
      setError('Failed to record settlement. Please try again.')
      setLoading(false)
      return
    }

    const payerName  = members.find(m => m.id === paidBy)?.display_name ?? 'Someone'
    const payeeName  = members.find(m => m.id === paidTo)?.display_name ?? 'someone'
    await supabase.from('activity_log').insert({
      group_id:    groupId,
      member_id:   myMemberId || paidBy,
      action:      'settled',
      entity_id:   null,
      description: `${payerName} paid ${payeeName} ${formatCurrency(parsedAmount)}${note ? ' · ' + note : ''}`,
    })

    router.push(`/groups/${groupId}`)
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h2 className="text-xl font-bold text-white mb-6">Record a settlement</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Paid by */}
        <div>
          <label className="block text-sm text-[#71717a] mb-2">Who paid?</label>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaidBy(m.id)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors
                  ${paidBy === m.id
                    ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                    : 'bg-[#18181b] border-[#27272a] text-[#71717a] hover:border-[#3f3f46]'}`}
              >
                {m.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* Paid to */}
        <div>
          <label className="block text-sm text-[#71717a] mb-2">Paid to?</label>
          <div className="flex flex-wrap gap-2">
            {members.filter(m => m.id !== paidBy).map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaidTo(m.id)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors
                  ${paidTo === m.id
                    ? 'bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]'
                    : 'bg-[#18181b] border-[#27272a] text-[#71717a] hover:border-[#3f3f46]'}`}
              >
                {m.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm text-[#71717a] mb-1.5">Amount (₹)</label>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            min="0.01"
            step="0.01"
            className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3
                       text-white text-2xl font-bold placeholder-[#3f3f46]
                       focus:outline-none focus:border-[#3b82f6]"
          />
        </div>

        {/* Note + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#71717a] mb-1.5">Note (optional)</label>
            <input
              type="text"
              placeholder="Rent, UPI, etc."
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={60}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3
                         text-white placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#71717a] mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-3
                         text-white focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
        </div>

        {error && <p className="text-[#ef4444] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#22c55e] hover:bg-green-500 text-white rounded-xl
                     py-3 font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Record settlement'}
        </button>
      </form>
    </div>
  )
}