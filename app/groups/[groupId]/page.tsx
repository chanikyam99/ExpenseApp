// app/groups/[groupId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { simplifyDebts } from '@/lib/balance'
import { formatCurrency, formatDate, getCategoryIcon, getInitials } from '@/lib/utils'

export default async function DashboardPage({
  params,
}: {
  params: { groupId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const groupId = params.groupId

  const [
    { data: members },
    { data: expenses },
    { data: splits },
    { data: settlements },
    { data: recentExpenses },
    { data: recentSettlements },
  ] = await Promise.all([
    supabase.from('group_members').select(`
      id, group_id, user_id, display_name, avatar_color, joined_at
    `).eq('group_id', groupId),
    supabase.from('expenses').select('id, paid_by, amount').eq('group_id', groupId),
    supabase.from('expense_splits').select('expense_id, member_id, owed_amount'),
    supabase.from('settlements').select('paid_by, paid_to, amount').eq('group_id', groupId),
    supabase.from('expenses')
      .select('id, title, amount, category, date, paid_by')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('settlements')
      .select('id, paid_by, paid_to, amount, date, note')
      .eq('group_id', groupId)
      .order('date', { ascending: false })
      .limit(10),
  ])

  const memberMap = new Map((members ?? []).map(m => [m.id, m]))

  const debts = simplifyDebts(
    members ?? [],
    expenses ?? [],
    splits ?? [],
    settlements ?? []
  )

  const totalSpend = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

  const myMember = (members ?? []).find((m: { user_id: string | null; id: string }) => m.user_id === user.id)
  const mySpend  = myMember
    ? (expenses ?? []).filter((e: { paid_by: string }) => e.paid_by === myMember.id)
        .reduce((sum: number, e: { amount: number | string }) => sum + Number(e.amount), 0)
    : 0

  // Build a combined, sorted recent activity list (expenses + settlements), take 5
  type RecentItem =
    | { kind: 'expense'; id: string; title: string; amount: number; category: string; date: string; payerId: string }
    | { kind: 'settlement'; id: string; fromId: string; toId: string; amount: number; date: string; note?: string | null }

  const expItems: RecentItem[] = (recentExpenses ?? []).map(e => ({
    kind: 'expense' as const,
    id: e.id, title: e.title, amount: Number(e.amount),
    category: e.category, date: e.date, payerId: e.paid_by,
  }))
  const settleItems: RecentItem[] = (recentSettlements ?? []).map(s => ({
    kind: 'settlement' as const,
    id: s.id, fromId: s.paid_by, toId: s.paid_to,
    amount: Number(s.amount), date: s.date, note: s.note,
  }))

  const recentItems = [...expItems, ...settleItems]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <div className="px-4 pt-6 space-y-6 pb-6">
      {/* Spend summary */}
      <div className="flex gap-6">
        <div>
          <p className="text-[#8c7b70] text-xs uppercase tracking-wider">Total spend</p>
          <p className="text-3xl font-bold text-[#faf7f5] mt-0.5">{formatCurrency(totalSpend)}</p>
        </div>
        {mySpend > 0 && (
          <div className="border-l border-[#2c2825] pl-6">
            <p className="text-[#8c7b70] text-xs uppercase tracking-wider">My spend</p>
            <p className="text-3xl font-bold text-[#f97316] mt-0.5">{formatCurrency(mySpend)}</p>
          </div>
        )}
      </div>

      {/* Simplified debts */}
      <div>
        <h2 className="text-sm font-semibold text-[#8c7b70] uppercase tracking-wider mb-3">
          Balances
        </h2>
        {debts.length === 0 ? (
          <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-5 text-center shadow-sm">
            <p className="text-[#22c55e] font-medium">✓ All settled up!</p>
            <p className="text-[#8c7b70] text-sm mt-1">No one owes anything right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {debts.map((d, i) => (
              <div
                key={i}
                className="bg-[#1a1614] border border-[#2c2825] rounded-xl px-4 py-3
                           flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[d.fromId, d.toId].map(id => {
                      const m = memberMap.get(id)
                      return (
                        <div
                          key={id}
                          className="w-7 h-7 rounded-full border-2 border-[#1a1614] flex items-center
                                     justify-center text-xs font-bold text-white"
                          style={{ background: m?.avatar_color ?? '#f97316' }}
                        >
                          {getInitials(m?.display_name ?? '?')}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-sm text-[#e8ddd9]">
                    <span className="font-medium text-[#faf7f5]">{d.fromName}</span>
                    {' owes '}
                    <span className="font-medium text-[#faf7f5]">{d.toName}</span>
                  </p>
                </div>
                <span className="font-semibold text-[#ef4444]">
                  {formatCurrency(d.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
        {debts.length > 0 && (
          <Link
            href={`/groups/${groupId}/settle`}
            className="block mt-2 text-center text-sm text-[#f97316] hover:underline"
          >
            Record a settlement →
          </Link>
        )}
      </div>

      {/* Recent activity — expenses + settlements combined */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#8c7b70] uppercase tracking-wider">
            Recent
          </h2>
          <Link
            href={`/groups/${groupId}/history`}
            className="text-xs text-[#f97316] hover:underline"
          >
            View all
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-6 text-center shadow-sm">
            <p className="text-[#8c7b70]">No activity yet.</p>
            <Link
              href={`/groups/${groupId}/expenses/new`}
              className="inline-block mt-3 text-sm text-[#f97316] hover:underline"
            >
              Add the first expense →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentItems.map(item => {
              if (item.kind === 'expense') {
                const payer = memberMap.get(item.payerId)
                return (
                  <Link
                    key={`exp-${item.id}`}
                    href={`/groups/${groupId}/expenses/${item.id}`}
                    className="flex items-center gap-3 bg-[#1a1614] border border-[#2c2825]
                               rounded-xl p-4 hover:border-[#3a3330] transition-colors shadow-sm"
                  >
                    <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#faf7f5] truncate">{item.title}</p>
                      <p className="text-[#8c7b70] text-xs mt-0.5">
                        {payer?.display_name} · {formatDate(item.date)}
                      </p>
                    </div>
                    <span className="font-semibold text-[#faf7f5] whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </span>
                  </Link>
                )
              } else {
                const from = memberMap.get(item.fromId)
                const to   = memberMap.get(item.toId)
                return (
                  <div
                    key={`settle-${item.id}`}
                    className="flex items-center gap-3 bg-[#1a1614] border border-[#2c2825]
                               rounded-xl p-4 shadow-sm"
                  >
                    <span className="text-2xl">✅</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#faf7f5] truncate">
                        {from?.display_name ?? '?'} paid {to?.display_name ?? '?'}
                        {item.note ? ` · ${item.note}` : ''}
                      </p>
                      <p className="text-[#8c7b70] text-xs mt-0.5">
                        Settlement · {formatDate(item.date)}
                      </p>
                    </div>
                    <span className="font-semibold text-[#22c55e] whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                )
              }
            })}
          </div>
        )}
      </div>

    </div>
  )
}
