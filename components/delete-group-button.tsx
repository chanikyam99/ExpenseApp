'use client'
import { useState, useTransition } from 'react'
import { Trash2Icon } from 'lucide-react'
import { archiveGroup } from '@/app/groups/actions'

interface Props {
  groupId: string
  groupName: string
}

export function DeleteGroupButton({ groupId, groupName }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setErrorMsg('')
    startTransition(async () => {
      const result = await archiveGroup(groupId)
      if (result.error) {
        setErrorMsg('Could not archive group.')
        setConfirming(false)
      }
    })
  }

  if (errorMsg) {
    return <span className="text-xs text-[#ef4444]">{errorMsg}</span>
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-[#8c7b70]">Archive?</span>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-[#8c7b70] hover:text-[#faf7f5] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="text-xs font-medium text-[#ef4444] hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {isPending ? '…' : 'Archive'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 rounded-lg text-[#605048] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors shrink-0"
      title={`Archive "${groupName}"`}
    >
      <Trash2Icon size={15} />
    </button>
  )
}
