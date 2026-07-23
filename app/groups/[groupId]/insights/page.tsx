// app/groups/[groupId]/insights/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, CATEGORIES, getCategoryLabel } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const CHART_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f97316','#22c55e','#14b8a6','#f59e0b','#ef4444']

export default function InsightsPage() {
  const params  = useParams()
  const groupId = params.groupId as string

  const [expenses, setExpenses] = useState<any[]>([])
  const [members,  setMembers]  = useState<any[]>([])
  const [month,    setMonth]    = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: exps }, { data: mems }] = await Promise.all([
        supabase.from('expenses').select('amount, category, paid_by, date').eq('group_id', groupId),
        supabase.from('group_members').select('id, display_name').eq('group_id', groupId),
      ])
      setExpenses(exps ?? [])
      setMembers(mems ?? [])
      setLoading(false)
    }
    load()
  }, [groupId])

  const monthExpenses = expenses.filter(e => e.date?.slice(0, 7) === month)
  const totalSpend    = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)

  // Category bar chart data
  const categoryData = CATEGORIES.map(c => ({
    name:  c.icon + ' ' + c.label,
    total: monthExpenses
      .filter(e => e.category === c.id)
      .reduce((s, e) => s + Number(e.amount), 0),
  })).filter(d => d.total > 0)

  // Per-person pie chart data
  const memberMap = new Map(members.map(m => [m.id, m.display_name]))
  const personData = members.map(m => ({
    name:  m.display_name,
    value: monthExpenses
      .filter(e => e.paid_by === m.id)
      .reduce((s, e) => s + Number(e.amount), 0),
  })).filter(d => d.value > 0)

  // Build list of available months
  // const allMonths = [...new Set(expenses.map(e => e.date?.slice(0, 7)))].sort().reverse()
  const allMonths = Array.from(
  new Set(expenses.map(e => e.date?.slice(0, 7)))
  )
  .sort()
  .reverse()

  if (loading) return <div className="p-6 text-center text-[#71717a]">Loading…</div>

  return (
    <div className="px-4 pt-6 pb-8 space-y-6">
      {/* Month picker */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Spending Insights</h2>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="bg-[#18181b] border border-[#27272a] text-white text-sm
                     rounded-lg px-3 py-2 focus:outline-none focus:border-[#3b82f6]"
        >
          {allMonths.map(m => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
      </div>

      {/* Total */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
        <p className="text-[#71717a] text-sm">Total spend</p>
        <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalSpend)}</p>
      </div>

      {categoryData.length === 0 ? (
        <p className="text-center text-[#71717a] py-8">No expenses this month.</p>
      ) : (
        <>
          {/* Category bar chart */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
            <p className="text-sm font-semibold text-[#71717a] uppercase tracking-wider mb-4">
              By category
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis
                  tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  width={45}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                  labelStyle={{ color: '#fafafa' }}
                  itemStyle={{ color: '#93c5fd' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-person pie chart */}
          {personData.length > 0 && (
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
              <p className="text-sm font-semibold text-[#71717a] uppercase tracking-wider mb-4">
                Paid by
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={personData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {personData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}