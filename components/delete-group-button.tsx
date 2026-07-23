'use client'
import { useState, useTransition } from 'react'
import { Trash2Icon, ArchiveRestoreIcon } from 'lucide-react'
import { archiveGroup, unarchiveGroup } from '@/app/groups/actions'

interface Props {
  groupId: string
  groupName: string
  isArchived?: boolean
}

export function DeleteGroupButton({ groupId, groupName, isArchived = false }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setErrorMsg('')
    startTransition(async () => {
      const result = isArchived
        ? await unarchiveGroup(groupId)
        : await archiveGroup(groupId)
      if (result.error) {
        setErrorMsg(isArchived ? 'Could not restore group.' : 'Could not archive group.')
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
        <span className="text-xs text-[#8c7b70]">
          {isArchived ? 'Restore?' : 'Archive?'}
        </span>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-[#8c7b70] hover:text-[#faf7f5] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className={`text-xs font-medium transition-colors disabled:opacity-50
            ${isArchived ? 'text-[#f97316] hover:text-[#fb923c]' : 'text-[#ef4444] hover:text-red-400'}`}
        >
          {isPending ? '…' : isArchived ? 'Restore' : 'Archive'}
        </button>
      </div>
    )
  }

  if (isArchived) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="p-1.5 rounded-lg text-[#605048] hover:text-[#f97316] hover:bg-[#f97316]/10 transition-colors shrink-0"
        title={`Restore "${groupName}"`}
      >
        <ArchiveRestoreIcon size={15} />
      </button>
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
