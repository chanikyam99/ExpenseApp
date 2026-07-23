// app/groups/[groupId]/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, PlusIcon } from 'lucide-react'
import { GroupNav } from '@/components/group-nav'
import { LogoutButton } from '@/components/logout-button'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { groupId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', params.groupId)
    .single()

  if (!group) redirect('/groups')

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', params.groupId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/groups')

  return (
    <div className="min-h-screen">
      {/* Top header — prominent back navigation */}
      <div className="sticky top-0 z-10 border-b border-[#2c2825] bg-[#0f0d0c]/95 backdrop-blur">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/groups"
            className="flex items-center gap-1.5 text-[#8c7b70] hover:text-[#f97316]
                       transition-colors shrink-0 py-1 pr-2"
          >
            <ArrowLeftIcon size={16} />
            <span className="text-sm font-medium">Groups</span>
          </Link>
          <span className="text-[#2c2825]">|</span>
          <span className="text-[#faf7f5] font-semibold text-sm truncate flex-1">{group.name}</span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-xl mx-auto pb-24">
        {children}
      </div>

      {/* FAB — visible on every tab */}
      <Link
        href={`/groups/${params.groupId}/expenses/new`}
        className="fixed bottom-20 right-4 z-20 w-14 h-14 rounded-full
                   bg-[#f97316] hover:bg-[#fb923c] text-white
                   flex items-center justify-center shadow-xl
                   transition-all active:scale-95"
        aria-label="Add expense"
      >
        <PlusIcon size={24} />
      </Link>

      <GroupNav groupId={params.groupId} />
    </div>
  )
}
