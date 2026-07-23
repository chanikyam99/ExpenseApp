// app/groups/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon } from 'lucide-react'
import { DeleteGroupButton } from '@/components/delete-group-button'
import { LogoutButton } from '@/components/logout-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { formatCurrency } from '@/lib/utils'

export default async function GroupsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')
  const { data: memberships } = await supabase
    .from('group_members')
    .select('id, display_name, group_id, groups(id, name, status, created_by)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const active   = memberships?.filter(m => (m.groups as any)?.status === 'active')   ?? []
  const archived = memberships?.filter(m => (m.groups as any)?.status === 'archived') ?? []

  // Fetch expenses for active groups to compute my spend + group total
  const activeGroupIds = active.map(m => m.group_id)
  const { data: activeExpenses } = activeGroupIds.length > 0
    ? await supabase.from('expenses').select('group_id, paid_by, amount').in('group_id', activeGroupIds)
    : { data: [] }

  const myMemberIdByGroup = new Map(active.map(m => [m.group_id, m.id]))
  const mySpendByGroup    = new Map<string, number>()
  const totalSpendByGroup = new Map<string, number>()
  for (const exp of activeExpenses ?? []) {
    totalSpendByGroup.set(exp.group_id, (totalSpendByGroup.get(exp.group_id) ?? 0) + Number(exp.amount))
    if (exp.paid_by === myMemberIdByGroup.get(exp.group_id)) {
      mySpendByGroup.set(exp.group_id, (mySpendByGroup.get(exp.group_id) ?? 0) + Number(exp.amount))
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[#2c2825] px-4 py-4 sticky top-0 bg-[#0f0d0c] z-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#faf7f5]">
            Split<span className="text-[#f97316]">House</span>
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LogoutButton />
            <Link
              href="/groups/new"
              className="flex items-center gap-2 bg-[#f97316] hover:bg-[#fb923c]
                         text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <PlusIcon size={16} />
              New group
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {active.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏠</p>
            <p className="text-[#faf7f5] font-medium text-lg">No groups yet</p>
            <p className="text-[#8c7b70] text-sm mt-1">Create one and invite your housemates.</p>
            <Link
              href="/groups/new"
              className="inline-block mt-6 bg-[#f97316] hover:bg-[#fb923c]
                         text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Create your first group
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#8c7b70] uppercase tracking-wider">
              Active ({active.length})
            </p>
            {active.map(m => {
              const mySpend    = mySpendByGroup.get(m.group_id) ?? 0
              const totalSpend = totalSpendByGroup.get(m.group_id) ?? 0
              return (
                <div
                  key={m.group_id}
                  className="flex items-center gap-2 bg-[#1a1614] border border-[#2c2825]
                             rounded-xl p-4 hover:border-[#3a3330] transition-colors"
                >
                  <Link
                    href={`/groups/${m.group_id}`}
                    className="flex items-center justify-between flex-1 min-w-0 group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#faf7f5] truncate">
                        {(m.groups as any)?.name}
                      </p>
                      {totalSpend > 0 ? (
                        <p className="text-xs mt-1 text-[#8c7b70]">
                          <span className="text-[#f97316] font-medium">{formatCurrency(mySpend)}</span>
                          {' my spend · '}
                          <span>{formatCurrency(totalSpend)}</span>
                          {' total'}
                        </p>
                      ) : (
                        <p className="text-[#8c7b70] text-xs mt-0.5">No expenses yet</p>
                      )}
                    </div>
                    <span className="text-[#8c7b70] group-hover:text-[#faf7f5] transition-colors mx-3">→</span>
                  </Link>
                  {(m.groups as any)?.created_by === user.id && (
                    <DeleteGroupButton
                      groupId={m.group_id}
                      groupName={(m.groups as any)?.name ?? ''}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {archived.length > 0 && (
          <details className="group/arc">
            <summary className="cursor-pointer list-none flex items-center gap-2
                                text-xs font-semibold text-[#8c7b70] uppercase tracking-wider">
              <span className="group-open/arc:rotate-90 transition-transform inline-block">›</span>
              Archived ({archived.length})
            </summary>
            <div className="mt-3 space-y-2">
              {archived.map(m => (
                <div
                  key={m.group_id}
                  className="flex items-center gap-2 bg-[#1a1614]/60 border border-[#2c2825]
                             rounded-xl p-4 hover:border-[#3a3330] transition-colors"
                >
                  <Link
                    href={`/groups/${m.group_id}`}
                    className="flex items-center justify-between flex-1 min-w-0 group"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#faf7f5] truncate">{(m.groups as any)?.name}</p>
                      <p className="text-[#8c7b70] text-xs mt-0.5">Archived</p>
                    </div>
                    <span className="text-[#8c7b70] group-hover:text-[#faf7f5] transition-colors mx-3">→</span>
                  </Link>
                  {(m.groups as any)?.created_by === user.id && (
                    <DeleteGroupButton
                      groupId={m.group_id}
                      groupName={(m.groups as any)?.name ?? ''}
                      isArchived
                    />
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
