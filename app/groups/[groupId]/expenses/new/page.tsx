// app/groups/[groupId]/expenses/new/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { equalSplits, CATEGORIES, formatCurrency } from '@/lib/utils'
import type { GroupMember } from '@/types/database'

type SplitMode = 'equal' | 'custom'

export default function NewExpensePage() {
  const params  = useParams()
  const router  = useRouter()
  const groupId = params.groupId as string

  const [members,     setMembers]     = useState<GroupMember[]>([])
  const [myMemberId,  setMyMemberId]  = useState('')
  const [title,       setTitle]       = useState('')
  const [amount,      setAmount]      = useState('')
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10))
  const [category,    setCategory]    = useState('other')
  const [paidBy,      setPaidBy]      = useState('')
  const [splitMode,   setSplitMode]   = useState<SplitMode>('equal')
  const [customSplit, setCustomSplit] = useState<Record<string, string>>({})
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: mems } = await supabase
        .from('group_members')
          .select(`
    id,
    group_id,
    user_id,
    display_name,
    avatar_color,
    joined_at
  `)
        .eq('group_id', groupId)
        .order('joined_at')

      if (mems) {
        setMembers(mems)
        const mine = mems.find(m => {
          // We need to match auth user to member; simplest approach: default to first
          return true
        })
        // Set paidBy to current user's member record
        const { data: myMem } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .single()

        if (myMem) {
          setPaidBy(myMem.id)
          setMyMemberId(myMem.id)
        } else if (mems.length > 0) {
          setPaidBy(mems[0].id)
        }

        // Init custom splits at 0
        const init: Record<string, string> = {}
        mems.forEach(m => { init[m.id] = '' })
        setCustomSplit(init)
      }
      setLoadingData(false)
    }
    load()
  }, [groupId, router])

  const parsedAmount = parseFloat(amount) || 0

  function getEqualSplits() {
    return equalSplits(parsedAmount, members.map(m => m.id))
  }

  function splitSumError() {
    if (splitMode !== 'custom') return ''
    const sum = Object.values(customSplit).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    const diff = Math.abs(sum - parsedAmount)
    if (diff > 0.01) return `Split total is ${formatCurrency(sum)}, must equal ${formatCurrency(parsedAmount)}`
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || parsedAmount <= 0 || !paidBy) return
    const splitErr = splitSumError()
    if (splitErr) { setError(splitErr); return }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    // Resolve splits
    const splits = splitMode === 'equal'
      ? getEqualSplits()
      : Object.fromEntries(
          members.map(m => [m.id, parseFloat(customSplit[m.id] || '0')])
        )

    // Insert expense
    const { data: expense, error: expErr } = await supabase
      .from('expenses')
      .insert({
        group_id:   groupId,
        paid_by:    paidBy,
        title:      title.trim(),
        amount:     parsedAmount,
        category,
        date,
        created_by: myMemberId || paidBy,
      })
      .select()
      .single()

    if (expErr || !expense) {
      setError('Failed to add expense. Please try again.')
      setLoading(false)
      return
    }

    // Insert splits
    const splitRows = members.map(m => ({
      expense_id:   expense.id,
      member_id:    m.id,
      owed_amount:  splits[m.id] ?? 0,
    }))
    await supabase.from('expense_splits').insert(splitRows)

    // Activity log
    const payer = members.find(m => m.id === paidBy)
    const splitDesc = splitMode === 'equal'
      ? `split equally ${members.length} ways`
      : 'custom split'
    await supabase.from('activity_log').insert({
      group_id:    groupId,
      member_id:   myMemberId || paidBy,
      action:      'added_expense',
      entity_id:   expense.id,
      description: `${payer?.display_name ?? 'Someone'} added ${title.trim()} ${formatCurrency(parsedAmount)} · ${splitDesc}`,
    })

    router.push(`/groups/${groupId}`)
  }

  if (loadingData) return (
    <div className="p-6 text-center text-[#71717a]">Loading…</div>
  )

  return (
    <div className="px-4 pt-6 pb-8">
      <h2 className="text-xl font-bold text-white mb-6">Add expense</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount — biggest field, first */}
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

        {/* Title */}
        <div>
          <label className="block text-sm text-[#71717a] mb-1.5">Title</label>
          <input
            type="text"
            placeholder="Groceries, Electricity bill…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={80}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3
                       text-white placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6]"
          />
        </div>

        {/* Category + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#71717a] mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-3
                         text-white focus:outline-none focus:border-[#3b82f6]"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
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

        {/* Paid by */}
        <div>
          <label className="block text-sm text-[#71717a] mb-1.5">Paid by</label>
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

        {/* Split mode */}
        <div>
          <label className="block text-sm text-[#71717a] mb-1.5">Split</label>
          <div className="flex rounded-xl overflow-hidden border border-[#27272a]">
            {(['equal', 'custom'] as SplitMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setSplitMode(mode)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors
                  ${splitMode === mode
                    ? 'bg-[#3b82f6] text-white'
                    : 'bg-[#18181b] text-[#71717a] hover:text-white'}`}
              >
                {mode === 'equal' ? 'Equal' : 'Custom'}
              </button>
            ))}
          </div>

          {splitMode === 'equal' && parsedAmount > 0 && (
            <div className="mt-3 space-y-2">
              {members.map((m, i) => {
                const splits = getEqualSplits()
                return (
                  <div key={m.id} className="flex justify-between text-sm">
                    <span className="text-[#d4d4d8]">{m.display_name}</span>
                    <span className="text-white font-medium">{formatCurrency(splits[m.id] ?? 0)}</span>
                  </div>
                )
              })}
            </div>
          )}

          {splitMode === 'custom' && (
            <div className="mt-3 space-y-3">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-[#d4d4d8] text-sm flex-1">{m.display_name}</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={customSplit[m.id]}
                    onChange={e => setCustomSplit(prev => ({ ...prev, [m.id]: e.target.value }))}
                    className="w-28 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2
                               text-white text-right focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-[#ef4444] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !title.trim() || parsedAmount <= 0}
          className="w-full bg-[#3b82f6] hover:bg-blue-500 text-white rounded-xl
                     py-3 font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Add expense'}
        </button>
      </form>
    </div>
  )
}