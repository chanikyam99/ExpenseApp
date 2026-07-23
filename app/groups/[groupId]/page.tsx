// app/groups/[groupId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { simplifyDebts } from '@/lib/balance'
import { formatCurrency, formatDate, getCategoryIcon } from '@/lib/utils'
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

  // Fetch all data in parallel
  const [
    { data: members },
    { data: expenses },
    { data: splits },
    { data: settlements },
    { data: recentExpenses },
  ] = await Promise.all([
    supabase.from('group_members').select('id, display_name, avatar_color').eq('group_id', groupId),
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
  const currentMember = members?.find(m => {
    // We'd need to join with auth.users — simplification: show all debts
    return true
  })

  const debts = simplifyDebts(
    members ?? [],
    expenses ?? [],
    splits ?? [],
    settlements ?? []
  )

  const totalSpend = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Total spend chip */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#71717a] text-sm">Total group spend</p>
          <p className="text-2xl font-bold text-white mt-0.5">{formatCurrency(totalSpend)}</p>
        </div>
        <Link
          href={`/groups/${groupId}/expenses/new`}
          className="flex items-center gap-2 bg-[#3b82f6] hover:bg-blue-500
                     text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
        >
          <PlusIcon size={18} />
          Add
        </Link>
      </div>

      {/* Simplified debts */}
      <div>
        <h2 className="text-sm font-semibold text-[#71717a] uppercase tracking-wider mb-3">
          Balances
        </h2>
        {debts.length === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 text-center">
            <p className="text-[#22c55e] font-medium">✓ All settled up!</p>
            <p className="text-[#71717a] text-sm mt-1">No one owes anything right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {debts.map((d, i) => (
              <div
                key={i}
                className="bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3
                           flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[d.fromId, d.toId].map(id => {
                      const m = memberMap.get(id)
                      return (
                        <div
                          key={id}
                          className="w-7 h-7 rounded-full border-2 border-[#18181b] flex items-center
                                     justify-center text-xs font-bold text-white"
                          style={{ background: m?.avatar_color ?? '#3b82f6' }}
                        >
                          {m?.display_name?.[0]?.toUpperCase()}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-sm text-[#d4d4d8]">
                    <span className="font-medium text-white">{d.fromName}</span>
                    {' owes '}
                    <span className="font-medium text-white">{d.toName}</span>
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
            className="block mt-2 text-center text-sm text-[#3b82f6] hover:underline"
          >
            Record a settlement →
          </Link>
        )}
      </div>

      {/* Recent expenses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#71717a] uppercase tracking-wider">
            Recent
          </h2>
          <Link
            href={`/groups/${groupId}/history`}
            className="text-xs text-[#3b82f6] hover:underline"
          >
            View all
          </Link>
        </div>

        {(recentExpenses ?? []).length === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 text-center">
            <p className="text-[#71717a]">No expenses yet.</p>
            <Link
              href={`/groups/${groupId}/expenses/new`}
              className="inline-block mt-3 text-sm text-[#3b82f6] hover:underline"
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
                  className="flex items-center gap-3 bg-[#18181b] border border-[#27272a]
                             rounded-xl p-4 hover:border-[#3f3f46] transition-colors"
                >
                  <span className="text-2xl">{getCategoryIcon(exp.category)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{exp.title}</p>
                    <p className="text-[#71717a] text-xs mt-0.5">
                      {payer?.display_name} · {formatDate(exp.date)}
                    </p>
                  </div>
                  <span className="font-semibold text-white whitespace-nowrap">
                    {formatCurrency(Number(exp.amount))}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}