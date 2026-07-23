'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { equalSplits, CATEGORIES, formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/toast-provider'
import type { GroupMember } from '@/types/database'

type SplitMode = 'equal' | 'custom'

function EditExpenseContent() {
  const params         = useParams()
  const router         = useRouter()
  const searchParams   = useSearchParams()
  const { showToast }  = useToast()
  const groupId      = params.groupId as string
  const expId        = params.expId as string
  const from         = searchParams.get('from') ?? ''
  const fromParam    = from ? `?from=${from}` : ''

  const [members,     setMembers]     = useState<GroupMember[]>([])
  const [myMemberId,  setMyMemberId]  = useState('')
  const [title,       setTitle]       = useState('')
  const [amount,      setAmount]      = useState('')
  const [date,        setDate]        = useState('')
  const [category,    setCategory]    = useState('other')
  const [paidBy,      setPaidBy]      = useState('')
  const [splitMode,   setSplitMode]   = useState<SplitMode>('equal')
  const [customSplit,  setCustomSplit]  = useState<Record<string, string>>({})
  const [lockedSplit,  setLockedSplit]  = useState<Set<string>>(new Set())
  const [clearedSplit, setClearedSplit] = useState<Set<string>>(new Set())
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const [
        { data: expense },
        { data: mems },
        { data: myMem },
      ] = await Promise.all([
        supabase.from('expenses').select('*').eq('id', expId).single(),
        supabase.from('group_members').select('id, group_id, user_id, display_name, avatar_color, joined_at').eq('group_id', groupId).order('joined_at'),
        supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', user.id).single(),
      ])

      if (!expense || !mems) { router.push(`/groups/${groupId}`); return }

      // Fetch existing splits
      const { data: splits } = await supabase
        .from('expense_splits')
        .select('member_id, owed_amount')
        .eq('expense_id', expId)

      // Pre-fill expense fields
      setTitle(expense.title)
      setAmount(String(expense.amount))
      setDate(expense.date)
      setCategory(expense.category)
      setPaidBy(expense.paid_by)
      setMembers(mems)
      if (myMem) setMyMemberId(myMem.id)

      // Detect equal vs custom split
      const expectedEqual = equalSplits(Number(expense.amount), mems.map(m => m.id))
      const isEqual = (splits ?? []).every(s =>
        Math.abs(Number(s.owed_amount) - (expectedEqual[s.member_id] ?? 0)) < 0.01
      )
      setSplitMode(isEqual ? 'equal' : 'custom')

      // Init custom splits from stored values
      const init: Record<string, string> = {}
      mems.forEach(m => {
        const stored = splits?.find(s => s.member_id === m.id)
        init[m.id] = stored ? String(stored.owed_amount) : ''
      })
      setCustomSplit(init)
      setLoadingData(false)
    }
    load()
  }, [groupId, expId, router])

  const parsedAmount = parseFloat(amount) || 0

  function getEqualSplits() {
    return equalSplits(parsedAmount, members.map(m => m.id))
  }

  function handleSplitModeSwitch(mode: SplitMode) {
    setSplitMode(mode)
    if (mode === 'custom' && parsedAmount > 0 && members.length > 0) {
      const splits = equalSplits(parsedAmount, members.map(m => m.id))
      const init: Record<string, string> = {}
      members.forEach(m => { init[m.id] = splits[m.id]?.toFixed(2) ?? '0.00' })
      setCustomSplit(init)
      setLockedSplit(new Set())
      setClearedSplit(new Set())
    }
  }

  function handleCustomChange(memberId: string, rawValue: string) {
    const newLocked  = new Set(lockedSplit)
    const newCleared = new Set(clearedSplit)

    if (rawValue === '') {
      newLocked.delete(memberId)
      newCleared.add(memberId)
    } else {
      newLocked.add(memberId)
      newCleared.delete(memberId)
    }

    const newCustom = { ...customSplit, [memberId]: rawValue }

    const lockedTotal = members
      .filter(m => newLocked.has(m.id))
      .reduce((sum, m) => sum + (parseFloat(newCustom[m.id]) || 0), 0)

    const remaining = parsedAmount - lockedTotal
    const autoIds = members.filter(m => !newLocked.has(m.id) && !newCleared.has(m.id)).map(m => m.id)

    if (autoIds.length > 0) {
      if (remaining > 0) {
        const autoSplits = equalSplits(remaining, autoIds)
        autoIds.forEach(id => { newCustom[id] = autoSplits[id].toFixed(2) })
      } else {
        autoIds.forEach(id => { newCustom[id] = '0.00' })
      }
    }

    setClearedSplit(newCleared)
    setLockedSplit(newLocked)
    setCustomSplit(newCustom)
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

    const splits = splitMode === 'equal'
      ? getEqualSplits()
      : Object.fromEntries(members.map(m => [m.id, parseFloat(customSplit[m.id] || '0')]))

    // 1. Update expense
    const { error: expErr } = await supabase
      .from('expenses')
      .update({ title: title.trim(), amount: parsedAmount, category, date, paid_by: paidBy })
      .eq('id', expId)

    if (expErr) {
      setError('Failed to update expense. Please try again.')
      setLoading(false)
      return
    }

    // 2. Delete existing splits
    await supabase.from('expense_splits').delete().eq('expense_id', expId)

    // 3. Re-insert fresh splits
    const splitRows = members.map(m => ({
      expense_id:  expId,
      member_id:   m.id,
      owed_amount: splits[m.id] ?? 0,
    }))
    await supabase.from('expense_splits').insert(splitRows)

    // 4. Activity log
    const payer = members.find(m => m.id === paidBy)
    const editor = members.find(m => m.id === myMemberId)
    const splitDesc = splitMode === 'equal' ? `split equally ${members.length} ways` : 'custom split'
    await supabase.from('activity_log').insert({
      group_id:    groupId,
      member_id:   myMemberId || paidBy,
      action:      'edited_expense',
      entity_id:   expId,
      description: `${editor?.display_name ?? 'Someone'} edited "${title.trim()}" — ${formatCurrency(parsedAmount)} paid by ${payer?.display_name ?? 'Unknown'} (${splitDesc})`,
    })

    showToast('Expense updated!')
    router.refresh()
    router.push(`/groups/${groupId}/expenses/${expId}${fromParam}`)
  }

  const cancelHref = `/groups/${groupId}/expenses/${expId}${fromParam}`

  if (loadingData) return (
    <div className="px-4 pt-6 pb-8 space-y-5 animate-pulse">
      <div className="h-9 w-36 bg-[#1a1614] rounded-lg" />
      <div className="h-14 bg-[#1a1614] rounded-xl" />
      <div className="h-12 bg-[#1a1614] rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 bg-[#1a1614] rounded-xl" />
        <div className="h-12 bg-[#1a1614] rounded-xl" />
      </div>
      <div className="h-12 bg-[#1a1614] rounded-xl" />
      <div className="h-12 bg-[#1a1614] rounded-xl" />
      <div className="h-12 bg-[#f97316]/20 rounded-xl" />
    </div>
  )

  return (
    <div className="px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#faf7f5]">Edit expense</h2>
        <Link href={cancelHref} className="text-sm text-[#8c7b70] hover:text-[#faf7f5] transition-colors">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        {/* Title */}
        <div>
          <label className="block text-sm text-[#8c7b70] mb-1.5">Title</label>
          <input
            type="text"
            placeholder="Groceries, Electricity bill…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={80}
            className="w-full bg-[#1a1614] border border-[#2c2825] rounded-xl px-4 py-3
                       text-[#faf7f5] placeholder-[#6b5a52] focus:outline-none focus:border-[#f97316]"
          />
        </div>

        {/* Category + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#8c7b70] mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#1a1614] border border-[#2c2825] rounded-xl px-3 py-3
                         text-[#faf7f5] focus:outline-none focus:border-[#f97316]"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
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

        {/* Paid by */}
        <div>
          <label className="block text-sm text-[#8c7b70] mb-1.5">Paid by</label>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaidBy(m.id)}
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

        {/* Split mode */}
        <div>
          <label className="block text-sm text-[#8c7b70] mb-1.5">Split</label>
          <div className="flex rounded-full p-0.5 bg-[#1a1614] border border-[#2c2825]">
            {(['equal', 'custom'] as SplitMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => handleSplitModeSwitch(mode)}
                className={`flex-1 py-2 text-sm font-medium rounded-full transition-all
                  ${splitMode === mode
                    ? 'bg-[#f97316] text-white shadow-sm'
                    : 'text-[#8c7b70] hover:text-[#faf7f5]'}`}
              >
                {mode === 'equal' ? 'Equal' : 'Custom'}
              </button>
            ))}
          </div>

          {splitMode === 'equal' && parsedAmount > 0 && (
            <div className="mt-3 space-y-2">
              {members.map(m => {
                const s = getEqualSplits()
                return (
                  <div key={m.id} className="flex justify-between text-sm">
                    <span className="text-[#e8ddd9]">{m.display_name}</span>
                    <span className="text-[#faf7f5] font-medium">{formatCurrency(s[m.id] ?? 0)}</span>
                  </div>
                )
              })}
            </div>
          )}

          {splitMode === 'custom' && (
            <div className="mt-3 space-y-3">
              {members.map(m => {
                const isLocked = lockedSplit.has(m.id)
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-[#e8ddd9] text-sm flex-1">{m.display_name}</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={customSplit[m.id] ?? ''}
                      onChange={e => handleCustomChange(m.id, e.target.value)}
                      className={`w-28 bg-[#1a1614] rounded-lg px-3 py-2 text-right
                                 focus:outline-none focus:border-[#f97316]
                                 ${isLocked
                                   ? 'border border-[#2c2825] text-[#faf7f5]'
                                   : 'border border-[#f97316]/20 text-[#a89080]'}`}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {error && <p className="text-[#ef4444] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !title.trim() || parsedAmount <= 0}
          className="w-full bg-[#f97316] hover:bg-[#fb923c] text-white rounded-xl
                     py-3 font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}

export default function EditExpensePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-[#8c7b70]">Loading…</div>}>
      <EditExpenseContent />
    </Suspense>
  )
}
