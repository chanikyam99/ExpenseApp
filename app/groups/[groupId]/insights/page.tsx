'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, CATEGORIES } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const CHART_COLORS = ['#f97316','#ec4899','#8b5cf6','#14b8a6','#f59e0b','#22c55e','#ef4444','#06b6d4']

function pct(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100)
}

export default function InsightsPage() {
  const params  = useParams()
  const groupId = params.groupId as string

  const [expenses, setExpenses] = useState<any[]>([])
  const [members,  setMembers]  = useState<any[]>([])
  const [month,    setMonth]    = useState(new Date().toISOString().slice(0, 7))
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: exps }, { data: mems }] = await Promise.all([
        supabase.from('expenses').select('id, amount, category, paid_by, date, title').eq('group_id', groupId),
        supabase.from('group_members').select('id, display_name, user_id').eq('group_id', groupId),
      ])
      setExpenses(exps ?? [])
      setMembers(mems ?? [])
      setLoading(false)
    }
    load()
  }, [groupId])

  const allMonths = Array.from(new Set(expenses.map(e => e.date?.slice(0, 7)).filter(Boolean)))
    .sort().reverse()

  const monthExpenses  = expenses.filter(e => e.date?.slice(0, 7) === month)
  const totalThisMonth = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)

  // Delta vs previous month
  const prevMonth = (() => {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  })()
  const prevTotal = expenses
    .filter(e => e.date?.slice(0, 7) === prevMonth)
    .reduce((s, e) => s + Number(e.amount), 0)
  const delta = prevTotal > 0 ? ((totalThisMonth - prevTotal) / prevTotal) * 100 : null

  // 6-month trend bar data
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() - (5 - i))
    const ym = d.toISOString().slice(0, 7)
    return {
      month:      d.toLocaleDateString('en-IN', { month: 'short' }),
      total:      expenses.filter(e => e.date?.slice(0, 7) === ym).reduce((s, e) => s + Number(e.amount), 0),
      isSelected: ym === month,
    }
  })

  // Category breakdown (sorted by total desc)
  const categoryData = CATEGORIES
    .map((c, i) => ({
      id:    c.id,
      label: c.icon + ' ' + c.label,
      color: CHART_COLORS[i % CHART_COLORS.length],
      total: monthExpenses.filter(e => e.category === c.id).reduce((s, e) => s + Number(e.amount), 0),
    }))
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total)

  // Per-person paid (sorted by amount desc)
  const personData = members
    .map((m, i) => ({
      name:  m.display_name,
      color: CHART_COLORS[i % CHART_COLORS.length],
      value: monthExpenses.filter(e => e.paid_by === m.id).reduce((s, e) => s + Number(e.amount), 0),
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // Stats
  const expCount   = monthExpenses.length
  const biggestExp = monthExpenses.length > 0
    ? monthExpenses.reduce((max, e) => Number(e.amount) > Number(max.amount) ? e : max, monthExpenses[0])
    : null
  const joinedCount  = members.filter(m => m.user_id !== null).length
  const avgPerPerson = joinedCount > 0 ? totalThisMonth / joinedCount : totalThisMonth

  if (loading) return <div className="p-6 text-center text-[#8c7b70]">Loading…</div>

  return (
    <div className="px-4 pt-6 pb-8 space-y-5">
      {/* Header + month picker */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#faf7f5]">Insights</h2>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="bg-[#1a1614] border border-[#2c2825] text-[#faf7f5] text-sm
                     rounded-lg px-3 py-2 focus:outline-none focus:border-[#f97316]"
        >
          {allMonths.length === 0 && (
            <option value={month}>
              {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </option>
          )}
          {allMonths.map(m => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      {/* Total + delta badge */}
      <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-4 shadow-sm">
        <p className="text-[#8c7b70] text-sm">Total spend</p>
        <div className="flex items-end gap-3 mt-1">
          <p className="text-3xl font-bold text-[#faf7f5]">{formatCurrency(totalThisMonth)}</p>
          {delta !== null && (
            <span
              className={`text-sm font-medium mb-0.5 px-2 py-0.5 rounded-full ${
                delta > 5
                  ? 'text-[#ef4444] bg-[#ef4444]/10'
                  : delta < -5
                  ? 'text-[#22c55e] bg-[#22c55e]/10'
                  : 'text-[#8c7b70] bg-[#2c2825]'
              }`}
            >
              {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta))}% vs last month
            </span>
          )}
        </div>
      </div>

      {/* Stats trio */}
      {expCount > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-[#faf7f5]">{expCount}</p>
            <p className="text-[#8c7b70] text-xs mt-0.5">Expenses</p>
          </div>
          <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-3 text-center shadow-sm">
            <p className="text-base font-bold text-[#faf7f5] leading-tight mt-0.5">
              {formatCurrency(avgPerPerson)}
            </p>
            <p className="text-[#8c7b70] text-xs mt-0.5">Avg / person</p>
          </div>
          <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-3 text-center shadow-sm">
            <p className="text-base font-bold text-[#f97316] leading-tight mt-0.5">
              {biggestExp ? formatCurrency(Number(biggestExp.amount)) : '—'}
            </p>
            <p className="text-[#8c7b70] text-xs mt-0.5">Biggest</p>
          </div>
        </div>
      )}

      {/* 6-month trend */}
      {trendData.some(d => d.total > 0) && (
        <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-[#8c7b70] uppercase tracking-wider mb-4">
            6-month trend
          </p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: '#8c7b70', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Spend']}
                contentStyle={{ background: '#1a1614', border: '1px solid #2c2825', borderRadius: 8 }}
                labelStyle={{ color: '#faf7f5' }}
                itemStyle={{ color: '#fdba74' }}
                cursor={{ fill: '#2c2825' }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {trendData.map((entry, i) => (
                  <Cell key={i} fill={entry.isSelected ? '#f97316' : '#3a3330'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {expCount === 0 ? (
        <p className="text-center text-[#8c7b70] py-8">No expenses this month.</p>
      ) : (
        <>
          {/* Category breakdown — progress bars */}
          {categoryData.length > 0 && (
            <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#8c7b70] uppercase tracking-wider mb-4">
                By category
              </p>
              <div className="space-y-3.5">
                {categoryData.map(c => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-[#e8ddd9]">{c.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8c7b70]">{pct(c.total, totalThisMonth)}%</span>
                        <span className="text-sm font-semibold text-[#faf7f5] w-20 text-right">
                          {formatCurrency(c.total)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#2c2825] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct(c.total, totalThisMonth)}%`, background: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-person paid — horizontal progress bars */}
          {personData.length > 0 && (
            <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#8c7b70] uppercase tracking-wider mb-4">
                Paid by
              </p>
              <div className="space-y-3.5">
                {personData.map(p => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        <span className="text-sm text-[#e8ddd9]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8c7b70]">{pct(p.value, totalThisMonth)}%</span>
                        <span className="text-sm font-semibold text-[#faf7f5] w-20 text-right">
                          {formatCurrency(p.value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#2c2825] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct(p.value, totalThisMonth)}%`, background: p.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Biggest expense callout */}
          {biggestExp && (
            <div className="bg-[#1a1614] border border-[#f97316]/20 rounded-xl p-4 shadow-sm
                            flex items-center justify-between">
              <div>
                <p className="text-xs text-[#8c7b70] uppercase tracking-wider mb-1">Biggest expense</p>
                <p className="font-semibold text-[#faf7f5]">{biggestExp.title}</p>
                <p className="text-xs text-[#8c7b70] mt-0.5">
                  {new Date(biggestExp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <p className="text-xl font-bold text-[#f97316]">{formatCurrency(Number(biggestExp.amount))}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
