// app/groups/[groupId]/history/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, getCategoryIcon, CATEGORIES } from '@/lib/utils'
import { exportToCSV } from '@/lib/export'
import { simplifyDebts } from '@/lib/balance'

interface ExpenseRow {
  id: string
  date: string
  title: string
  category: string
  amount: number
  paid_by: string
  paid_by_name: string
}

export default function HistoryPage() {
  const params  = useParams()
  const groupId = params.groupId as string

  const [expenses,        setExpenses]        = useState<ExpenseRow[]>([])
  const [members,         setMembers]         = useState<{ id: string; display_name: string }[]>([])
  const [allSplits,       setAllSplits]       = useState<any[]>([])
  const [allSettlements,  setAllSettlements]  = useState<any[]>([])
  const [groupName,       setGroupName]       = useState('')
  const [filterMember,    setFilterMember]    = useState('')
  const [filterCategory,  setFilterCategory]  = useState('')
  const [loading,         setLoading]         = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [
        { data: exps },
        { data: mems },
        { data: rawSettlements },
        { data: grp },
      ] = await Promise.all([
        supabase.from('expenses')
          .select('id, date, title, category, amount, paid_by')
          .eq('group_id', groupId)
          .order('date', { ascending: false }),
        supabase.from('group_members')
          .select('id, display_name')
          .eq('group_id', groupId),
        supabase.from('settlements')
          .select('paid_by, paid_to, amount, date, note')
          .eq('group_id', groupId)
          .order('date', { ascending: false }),
        supabase.from('groups')
          .select('name')
          .eq('id', groupId)
          .single(),
      ])

      const memberMap = new Map((mems ?? []).map(m => [m.id, m.display_name]))
      setExpenses((exps ?? []).map(e => ({
        ...e,
        amount: Number(e.amount),
        paid_by_name: memberMap.get(e.paid_by) ?? 'Unknown',
      })))
      setMembers(mems ?? [])
      setAllSettlements(rawSettlements ?? [])
      setGroupName(grp?.name ?? 'Group')

      // Fetch splits (guard against empty array)
      const expenseIds = (exps ?? []).map(e => e.id)
      if (expenseIds.length > 0) {
        const { data: rawSplits } = await supabase
          .from('expense_splits')
          .select('expense_id, member_id, owed_amount')
          .in('expense_id', expenseIds)
        setAllSplits(rawSplits ?? [])
      }

      setLoading(false)
    }
    load()
  }, [groupId])

  const filtered = expenses.filter(e => {
    if (filterMember   && e.paid_by  !== filterMember)   return false
    if (filterCategory && e.category !== filterCategory) return false
    return true
  })

  // Group by YYYY-MM
  const grouped = filtered.reduce<Record<string, ExpenseRow[]>>((acc, e) => {
    const key = e.date.slice(0, 7)
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {})

  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function monthLabel(ym: string) {
    return new Date(ym + '-01').toLocaleDateString('en-IN', {
      month: 'long', year: 'numeric',
    })
  }

  function handleExport() {
    const debts = simplifyDebts(
      members,
      expenses.map(e => ({ id: e.id, paid_by: e.paid_by, amount: e.amount })),
      allSplits,
      allSettlements,
    )

    exportToCSV(
      filtered.map(e => ({
        date:         e.date,
        title:        e.title,
        category:     e.category,
        amount:       e.amount,
        paid_by_name: e.paid_by_name,
      })),
      groupName,
      debts.map(d => ({ fromName: d.fromName, toName: d.toName, amount: d.amount }))
    )
  }

  if (loading) return <div className="p-6 text-center text-[#8c7b70]">Loading…</div>

  return (
    <div className="px-4 pt-6">
      {/* Filter bar */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <select
          value={filterMember}
          onChange={e => setFilterMember(e.target.value)}
          className="bg-[#1a1614] border border-[#2c2825] text-[#faf7f5] text-sm
                     rounded-lg px-3 py-2 focus:outline-none focus:border-[#f97316]"
        >
          <option value="">All members</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.display_name}</option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-[#1a1614] border border-[#2c2825] text-[#faf7f5] text-sm
                     rounded-lg px-3 py-2 focus:outline-none focus:border-[#f97316]"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
          ))}
        </select>

        <button
          onClick={handleExport}
          className="ml-auto text-sm text-[#8c7b70] hover:text-[#faf7f5] border border-[#2c2825]
                     hover:border-[#3a3330] px-3 py-2 rounded-lg transition-colors"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Expense list */}
      {sortedMonths.length === 0 ? (
        <p className="text-center text-[#8c7b70] py-12">No expenses match your filters.</p>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map(month => {
            const monthTotal = grouped[month].reduce((s, e) => s + e.amount, 0)
            return (
              <div key={month}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#8c7b70] uppercase tracking-wider">
                    {monthLabel(month)}
                  </p>
                  <p className="text-xs text-[#8c7b70]">{formatCurrency(monthTotal)}</p>
                </div>
                <div className="space-y-2">
                  {grouped[month].map(e => (
                    <Link
                      key={e.id}
                      href={`/groups/${groupId}/expenses/${e.id}?from=history`}
                      className="flex items-center gap-3 bg-[#1a1614] border border-[#2c2825]
                                 rounded-xl p-4 hover:border-[#3a3330] transition-colors"
                    >
                      <span className="text-2xl">{getCategoryIcon(e.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#faf7f5] truncate">{e.title}</p>
                        <p className="text-[#8c7b70] text-xs mt-0.5">
                          {e.paid_by_name} · {formatDate(e.date)}
                        </p>
                      </div>
                      <span className="font-semibold text-[#faf7f5] whitespace-nowrap">
                        {formatCurrency(e.amount)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Settlements section */}
      {allSettlements.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold text-[#8c7b70] uppercase tracking-wider mb-3">
            Settlements
          </p>
          <div className="space-y-2">
            {allSettlements
              .slice()
              .sort((a: any, b: any) => b.date?.localeCompare(a.date ?? '') ?? 0)
              .map((s: any, i: number) => {
                const memberMap = new Map(members.map(m => [m.id, m.display_name]))
                const fromName = memberMap.get(s.paid_by) ?? 'Unknown'
                const toName   = memberMap.get(s.paid_to)  ?? 'Unknown'
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-[#1a1614] border border-[#2c2825] rounded-xl p-4"
                  >
                    <span className="text-2xl">✅</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#faf7f5] truncate">
                        {fromName} paid {toName}
                        {s.note ? ` · ${s.note}` : ''}
                      </p>
                      <p className="text-[#8c7b70] text-xs mt-0.5">
                        Settlement · {s.date ? formatDate(s.date) : ''}
                      </p>
                    </div>
                    <span className="font-semibold text-[#22c55e] whitespace-nowrap">
                      {formatCurrency(Number(s.amount))}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
