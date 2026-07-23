import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, getCategoryIcon, getCategoryLabel, timeAgo, getInitials } from '@/lib/utils'
import { ArrowLeftIcon } from 'lucide-react'
import { ExpenseActions } from '@/components/expense-actions'

export default async function ExpenseDetailPage({
  params,
  searchParams,
}: {
  params: { groupId: string; expId: string }
  searchParams?: { from?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const from     = searchParams?.from ?? ''
  const backHref = from === 'history'
    ? `/groups/${params.groupId}/history`
    : `/groups/${params.groupId}`
  const backLabel = from === 'history' ? 'History' : 'Back'

  const [
    { data: expense },
    { data: splits },
    { data: members },
    { data: activity },
  ] = await Promise.all([
    supabase.from('expenses').select('*').eq('id', params.expId).single(),
    supabase.from('expense_splits').select('member_id, owed_amount').eq('expense_id', params.expId),
    supabase.from('group_members').select(`
      id, group_id, user_id, display_name, avatar_color, joined_at
    `).eq('group_id', params.groupId),
    supabase.from('activity_log')
      .select('description, created_at, action')
      .eq('entity_id', params.expId)
      .order('created_at', { ascending: true }),
  ])

  if (!expense) redirect(`/groups/${params.groupId}`)

  const memberMap = new Map((members ?? []).map(m => [m.id, m]))
  const payer = memberMap.get(expense.paid_by)

  return (
    <div className="px-4 pt-6 pb-8">
      {/* Header row: back + actions */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-[#8c7b70] hover:text-[#faf7f5] text-sm transition-colors"
        >
          <ArrowLeftIcon size={16} />
          {backLabel}
        </Link>
        <ExpenseActions
          expId={params.expId}
          groupId={params.groupId}
          expenseTitle={expense.title}
          expenseAmount={Number(expense.amount)}
          createdBy={expense.created_by}
          from={from}
        />
      </div>

      {/* Expense header */}
      <div className="bg-[#1a1614] border border-[#2c2825] rounded-2xl p-5 mb-4 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{getCategoryIcon(expense.category)}</span>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#faf7f5]">{expense.title}</h1>
            <p className="text-[#8c7b70] text-sm mt-1">
              {getCategoryLabel(expense.category)} · {formatDate(expense.date)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#faf7f5]">{formatCurrency(Number(expense.amount))}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#2c2825]">
          <p className="text-sm text-[#8c7b70]">
            Paid by <span className="text-[#faf7f5] font-medium">{payer?.display_name ?? 'Unknown'}</span>
          </p>
        </div>
      </div>

      {/* Splits */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-[#8c7b70] uppercase tracking-wider mb-3">
          Splits
        </h2>
        <div className="space-y-2">
          {splits?.map(s => {
            const member = memberMap.get(s.member_id)
            const isPayer = s.member_id === expense.paid_by
            return (
              <div
                key={s.member_id}
                className="flex items-center justify-between bg-[#1a1614] border
                           border-[#2c2825] rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center
                               text-xs font-bold text-white"
                    style={{ background: member?.avatar_color ?? '#f97316' }}
                  >
                    {getInitials(member?.display_name ?? '?')}
                  </div>
                  <span className="text-[#faf7f5] font-medium">{member?.display_name}</span>
                  {isPayer && (
                    <span className="text-xs bg-[#22c55e]/10 text-[#22c55e] px-2 py-0.5 rounded-full">
                      paid
                    </span>
                  )}
                </div>
                <span className="text-[#faf7f5] font-semibold">
                  {formatCurrency(Number(s.owed_amount))}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Audit trail */}
      {activity && activity.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#8c7b70] uppercase tracking-wider mb-3">
            History
          </h2>
          <div className="space-y-2">
            {activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-[#8c7b70] whitespace-nowrap">{timeAgo(a.created_at)}</span>
                <span className="text-[#e8ddd9]">{a.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
