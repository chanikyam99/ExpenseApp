// app/groups/[groupId]/settle/page.tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/toast-provider'
import type { GroupMember } from '@/types/database'

function SettleContent() {
  const params        = useParams()
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const { showToast } = useToast()
  const groupId       = params.groupId as string

  const [members,    setMembers]    = useState<GroupMember[]>([])
  const [myMemberId, setMyMemberId] = useState('')
  const [paidBy,     setPaidBy]     = useState('')
  const [paidTo,     setPaidTo]     = useState('')
  const [amount,     setAmount]     = useState('')
  const [note,       setNote]       = useState('')
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const preFrom   = searchParams.get('from')
  const preTo     = searchParams.get('to')
  const preAmount = searchParams.get('amount')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const [{ data: mems }, { data: myMem }] = await Promise.all([
        supabase.from('group_members').select(`
          id, group_id, user_id, display_name, avatar_color, joined_at
        `).eq('group_id', groupId).order('joined_at'),
        supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', user.id).single(),
      ])

      if (mems) {
        setMembers(mems)
        const defaultPaidBy = myMem?.id ?? mems[0]?.id ?? ''
        setMyMemberId(myMem?.id ?? '')

        // Pre-fill from query params if valid member ids
        const validIds = new Set(mems.map(m => m.id))
        const fromId   = preFrom   && validIds.has(preFrom)  ? preFrom  : defaultPaidBy
        const toId     = preTo     && validIds.has(preTo)    ? preTo    : mems.find(m => m.id !== fromId)?.id ?? ''
        setPaidBy(fromId)
        setPaidTo(toId)
        if (preAmount) setAmount(preAmount)
      }
    }
    load()
  }, [groupId, router, preFrom, preTo, preAmount])

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

    const payerName = members.find(m => m.id === paidBy)?.display_name ?? 'Someone'
    const payeeName = members.find(m => m.id === paidTo)?.display_name ?? 'someone'
    await supabase.from('activity_log').insert({
      group_id:    groupId,
      member_id:   myMemberId || paidBy,
      action:      'settled',
      entity_id:   null,
      description: `${payerName} paid ${payeeName} ${formatCurrency(parsedAmount)}${note ? ' · ' + note : ''}`,
    })

    showToast('Settlement recorded!')
    router.push(`/groups/${groupId}`)
    router.refresh()
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#faf7f5]">Record a settlement</h2>
        <Link
          href={`/groups/${groupId}`}
          className="text-sm text-[#8c7b70] hover:text-[#faf7f5] transition-colors"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Paid by */}
        <div>
          <label className="block text-sm text-[#8c7b70] mb-2">Who paid?</label>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setPaidBy(m.id); if (paidTo === m.id) setPaidTo('') }}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors
                  ${paidBy === m.id
                    ? 'bg-[#f97316] border-[#f97316] text-white'
                    : 'bg-[#1a1614] border-[#2c2825] text-[#8c7b70] hover:border-[#3a3330]'}`}
              >
                {m.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* Paid to */}
        <div>
          <label className="block text-sm text-[#8c7b70] mb-2">Paid to?</label>
          <div className="flex flex-wrap gap-2">
            {members.filter(m => m.id !== paidBy).map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaidTo(m.id)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors
                  ${paidTo === m.id
                    ? 'bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]'
                    : 'bg-[#1a1614] border-[#2c2825] text-[#8c7b70] hover:border-[#3a3330]'}`}
              >
                {m.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm text-[#8c7b70] mb-1.5">Amount (₹)</label>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            min="0.01"
            step="0.01"
            className="w-full bg-[#1a1614] border border-[#2c2825] rounded-xl px-4 py-3
                       text-[#faf7f5] text-2xl font-bold placeholder-[#3a3330]
                       focus:outline-none focus:border-[#f97316]"
          />
        </div>

        {/* Note + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#8c7b70] mb-1.5">Note (optional)</label>
            <input
              type="text"
              placeholder="Rent, UPI, etc."
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={60}
              className="w-full bg-[#1a1614] border border-[#2c2825] rounded-xl px-4 py-3
                         text-[#faf7f5] placeholder-[#6b5a52] focus:outline-none focus:border-[#f97316]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#8c7b70] mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#1a1614] border border-[#2c2825] rounded-xl px-3 py-3
                         text-[#faf7f5] focus:outline-none focus:border-[#f97316]"
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

export default function SettlePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-[#8c7b70]">Loading…</div>}>
      <SettleContent />
    </Suspense>
  )
}
