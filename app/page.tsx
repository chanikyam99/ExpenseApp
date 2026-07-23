// app/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-[#0f0d0c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#faf7f5] tracking-tight">
            Split<span className="text-[#f97316]">House</span>
          </h1>
          <p className="text-[#8c7b70] mt-2 text-sm">
            Track house expenses together — free, forever
          </p>
        </div>

        {sent ? (
          <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">📬</div>
            <p className="font-medium text-[#faf7f5]">Check your inbox</p>
            <p className="text-[#8c7b70] text-sm mt-1">
              We sent a login link to <strong>{email}</strong>
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-4 text-sm text-[#f97316] hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="bg-[#1a1614] border border-[#2c2825] rounded-xl p-6 space-y-4">
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div>
                <label className="block text-sm text-[#8c7b70] mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#0f0d0c] border border-[#2c2825] rounded-lg px-4 py-2.5
                             text-[#faf7f5] placeholder-[#6b5a52] focus:outline-none
                             focus:border-[#f97316] transition-colors"
                />
              </div>

              {error && (
                <p className="text-[#ef4444] text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#f97316] hover:bg-[#fb923c] text-white rounded-lg
                           px-4 py-2.5 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending link...' : 'Send magic link'}
              </button>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#2c2825]" />
              <span className="text-[#8c7b70] text-xs uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[#2c2825]" />
            </div>

            <button
              onClick={handleGoogle}
              className="w-full bg-[#0f0d0c] hover:bg-[#2c2825] border border-[#2c2825]
                         text-[#faf7f5] rounded-lg px-4 py-2.5 font-medium transition-colors
                         flex items-center justify-center gap-3"
            >
              {/* Google logo SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.657 14.107 17.64 11.8 17.64 9.2z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
