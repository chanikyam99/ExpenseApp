// types/database.ts
// These mirror your Supabase tables exactly.

export interface Group {
  id: string
  name: string
  invite_code: string
  status: 'active' | 'archived'
  created_by: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  display_name: string
  avatar_color: string | null
  joined_at: string
}

export interface Expense {
  id: string
  group_id: string
  paid_by: string
  title: string
  amount: number
  category: string
  date: string
  created_by: string
  created_at: string
}

export interface ExpenseSplit {
  id: string
  expense_id: string
  member_id: string
  owed_amount: number
}

export interface Settlement {
  id: string
  group_id: string
  paid_by: string
  paid_to: string
  amount: number
  note: string | null
  date: string
  created_at: string
}

export interface ActivityLog {
  id: string
  group_id: string
  member_id: string
  action: string
  entity_id: string | null
  description: string
  created_at: string
}