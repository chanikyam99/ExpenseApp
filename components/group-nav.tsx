// components/group-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, ClockIcon, BarChart3Icon, ActivityIcon, UsersIcon } from 'lucide-react'

const NAV = [
  { href: '',          label: 'Home',     Icon: HomeIcon },
  { href: '/history',  label: 'History',  Icon: ClockIcon },
  { href: '/insights', label: 'Insights', Icon: BarChart3Icon },
  { href: '/activity', label: 'Activity', Icon: ActivityIcon },
  { href: '/members',  label: 'Members',  Icon: UsersIcon },
]

export function GroupNav({ groupId }: { groupId: string }) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-[#0f0d0c]/95
                    backdrop-blur border-t border-[#2c2825]">
      <div className="max-w-xl mx-auto flex px-2 py-1">
        {NAV.map(item => {
          const href = `/groups/${groupId}${item.href}`
          const isActive = item.href === ''
            ? pathname === href
            : pathname.startsWith(href)

          return (
            <Link
              key={item.href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl
                          flex-1 transition-colors
                          ${isActive
                            ? 'text-[#f97316] bg-[#f97316]/10'
                            : 'text-[#8c7b70] hover:text-[#c4b5ad]'}`}
            >
              <item.Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
