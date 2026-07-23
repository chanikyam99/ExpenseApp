'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Props {
  expId: string
  groupId: string
  expenseTitle: string
  expenseAmount: number
  from?: string
}

export function ExpenseActions({ expId, groupId, expenseTitle, expenseAmount, from }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const fromParam = from ? `?from=${from}` : ''
  const editHref = `/groups/${groupId}/expenses/${expId}/edit${fromParam}`

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: myMem } = await supabase
      .from('group_members')
      .select('id, display_name')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    // Log before deleting so title/amount are still meaningful
    await supabase.from('activity_log').insert({
      group_id:    groupId,
      member_id:   myMem?.id ?? '',
      action:      'deleted_expense',
      entity_id:   null,
      description: `${myMem?.display_name ?? 'Someone'} deleted "${expenseTitle}" (${formatCurrency(expenseAmount)})`,
    })

    // FK order: splits before expense
    const { error: splitsErr } = await supabase
      .from('expense_splits')
      .delete()
      .eq('expense_id', expId)

    if (splitsErr) {
      setError('Failed to delete expense.')
      setDeleting(false)
      return
    }

    const { error: expErr } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expId)

    if (expErr) {
      setError('Failed to delete expense.')
      setDeleting(false)
      return
    }

    router.refresh()
    router.push(`/groups/${groupId}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={editHref}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1614] border border-[#2c2825]
                   text-[#8c7b70] hover:text-[#faf7f5] hover:border-[#3a3330] transition-colors text-sm"
      >
        <PencilIcon size={14} />
        Edit
      </Link>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1614] border border-[#2c2825]
                     text-[#8c7b70] hover:text-[#ef4444] hover:border-[#ef4444]/30 transition-colors text-sm"
        >
          <Trash2Icon size={14} />
          Delete
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8c7b70]">Delete?</span>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-[#8c7b70] hover:text-[#faf7f5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-medium text-[#ef4444] hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {deleting ? '…' : 'Confirm'}
          </button>
        </div>
      )}

      {error && <span className="text-xs text-[#ef4444]">{error}</span>}
    </div>
  )
}
