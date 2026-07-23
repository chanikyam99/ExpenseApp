'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOutIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-[#8c7b70] hover:text-[#ef4444]
                 transition-colors disabled:opacity-50"
      title="Sign out"
    >
      <LogOutIcon size={16} />
      <span className="hidden sm:inline">{loading ? 'Signing out…' : 'Sign out'}</span>
    </button>
  )
}
