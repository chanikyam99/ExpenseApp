// app/groups/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon } from 'lucide-react'

export default async function GroupsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: memberships } = await supabase
    .from('group_members')
    .select('id, display_name, group_id, groups(id, name, status)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const active   = memberships?.filter(m => (m.groups as any)?.status === 'active')   ?? []
  const archived = memberships?.filter(m => (m.groups as any)?.status === 'archived') ?? []

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="border-b border-[#27272a] px-4 py-4 sticky top-0 bg-[#09090b] z-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            Split<span className="text-[#3b82f6]">House</span>
          </h1>
          <Link
            href="/groups/new"
            className="flex items-center gap-2 bg-[#3b82f6] hover:bg-blue-500
                       text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PlusIcon size={16} />
            New group
          </Link>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {active.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏠</p>
            <p className="text-white font-medium text-lg">No groups yet</p>
            <p className="text-[#71717a] text-sm mt-1">Create one and invite your housemates.</p>
            <Link
              href="/groups/new"
              className="inline-block mt-6 bg-[#3b82f6] hover:bg-blue-500
                         text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Create your first group
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#71717a] uppercase tracking-wider">
              Active ({active.length})
            </p>
            {active.map(m => (
              <Link
                key={m.group_id}
                href={`/groups/${m.group_id}`}
                className="flex items-center justify-between bg-[#18181b] border border-[#27272a]
                           rounded-xl p-4 hover:border-[#3f3f46] transition-colors group"
              >
                <div>
                  <p className="font-semibold text-white">
                    {(m.groups as any)?.name}
                  </p>
                  <p className="text-[#71717a] text-sm mt-0.5">
                    You are <strong>{m.display_name}</strong>
                  </p>
                </div>
                <span className="text-[#71717a] group-hover:text-white transition-colors">→</span>
              </Link>
            ))}
          </div>
        )}

        {archived.length > 0 && (
          <details className="group/arc">
            <summary className="cursor-pointer list-none flex items-center gap-2
                                text-xs font-semibold text-[#71717a] uppercase tracking-wider">
              <span className="group-open/arc:rotate-90 transition-transform inline-block">›</span>
              Archived ({archived.length})
            </summary>
            <div className="mt-3 space-y-2">
              {archived.map(m => (
                <Link
                  key={m.group_id}
                  href={`/groups/${m.group_id}`}
                  className="flex items-center justify-between bg-[#18181b]/60 border
                             border-[#27272a] rounded-xl p-4 opacity-60 hover:opacity-100
                             transition-opacity"
                >
                  <div>
                    <p className="font-medium text-white">{(m.groups as any)?.name}</p>
                    <p className="text-[#71717a] text-xs mt-0.5">Archived</p>
                  </div>
                  <span className="text-[#71717a]">→</span>
                </Link>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}