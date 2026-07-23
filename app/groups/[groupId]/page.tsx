// app/groups/[groupId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { simplifyDebts } from '@/lib/balance'
import { formatCurrency, formatDate, getCategoryIcon, getInitials } from '@/lib/utils'
import { PlusIcon } from 'lucide-react'

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
      .limit(5),
  ])

  const memberMap = new Map((members ?? []).map(m => [m.id, m]))

  const debts = simplifyDebts(
    members ?? [],
    expenses ?? [],
    splits ?? [],
    settlements ?? []
  )

  const totalSpend = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="px-4 pt-6 space-y-6 pb-6">
      {/* Total spend */}
      <div>
        <p className="text-[#8c7b70] text-sm">Total group spend</p>
        <p className="text-3xl font-bold text-[#faf7f5] mt-0.5">{formatCurrency(totalSpend)}</p>
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

      {/* Recent expenses */}
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

        {(recentExpenses ?? []).length === 0 ? (
          <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-6 text-center shadow-sm">
            <p className="text-[#8c7b70]">No expenses yet.</p>
            <Link
              href={`/groups/${groupId}/expenses/new`}
              className="inline-block mt-3 text-sm text-[#f97316] hover:underline"
            >
              Add the first one →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentExpenses?.map(exp => {
              const payer = memberMap.get(exp.paid_by)
              return (
                <Link
                  key={exp.id}
                  href={`/groups/${groupId}/expenses/${exp.id}`}
                  className="flex items-center gap-3 bg-[#1a1614] border border-[#2c2825]
                             rounded-xl p-4 hover:border-[#3a3330] transition-colors shadow-sm"
                >
                  <span className="text-2xl">{getCategoryIcon(exp.category)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#faf7f5] truncate">{exp.title}</p>
                    <p className="text-[#8c7b70] text-xs mt-0.5">
                      {payer?.display_name} · {formatDate(exp.date)}
                    </p>
                  </div>
                  <span className="font-semibold text-[#faf7f5] whitespace-nowrap">
                    {formatCurrency(Number(exp.amount))}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB — fixed above bottom nav */}
      <Link
        href={`/groups/${groupId}/expenses/new`}
        className="fixed bottom-20 right-4 z-20 w-14 h-14 rounded-full
                   bg-[#f97316] hover:bg-[#fb923c] text-white
                   flex items-center justify-center shadow-xl
                   transition-all active:scale-95"
      >
        <PlusIcon size={24} />
      </Link>
    </div>
  )
}
