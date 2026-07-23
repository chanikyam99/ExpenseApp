'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function archiveGroup(groupId: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('groups')
    .update({ status: 'archived' })
    .eq('id', groupId)
    .eq('created_by', user.id)

  if (error) return { error: error.message }
  revalidatePath('/groups')
  return {}
}

export async function unarchiveGroup(groupId: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('groups')
    .update({ status: 'active' })
    .eq('id', groupId)
    .eq('created_by', user.id)

  if (error) return { error: error.message }
  revalidatePath('/groups')
  return {}
}
