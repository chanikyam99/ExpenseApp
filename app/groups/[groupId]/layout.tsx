// app/groups/[groupId]/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GroupNav } from '@/components/group-nav'

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
    <div className="min-h-screen bg-[#0f0d0c]">
      {/* Top breadcrumb */}
      <div className="sticky top-0 z-10 border-b border-[#2c2825] bg-[#0f0d0c]/95 backdrop-blur">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-2 text-sm">
          <Link href="/groups" className="text-[#8c7b70] hover:text-[#faf7f5] transition-colors">
            Groups
          </Link>
          <span className="text-[#3a3330]">/</span>
          <span className="text-[#faf7f5] font-medium truncate">{group.name}</span>
        </div>
      </div>

      {/* Page content — padded so it doesn't hide behind bottom nav */}
      <div className="max-w-xl mx-auto pb-24">
        {children}
      </div>

      <GroupNav groupId={params.groupId} />
    </div>
  )
}
