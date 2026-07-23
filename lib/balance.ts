// lib/balance.ts

export interface Member {
  id: string
  display_name: string
}

export interface Expense {
  id: string
  paid_by: string
  amount: number
}

export interface Split {
  expense_id: string
  member_id: string
  owed_amount: number
}

export interface Settlement {
  paid_by: string
  paid_to: string
  amount: number
}

export interface BalancePair {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number   // how much fromId owes toId
}

// ─── Equal split with exact integer arithmetic ────────────────────────────────
// Distributes total exactly across memberIds.
// The first (total_cents % count) members each get 1 extra paisa.
export function equalSplits(
  total: number,
  memberIds: string[]
): Record<string, number> {
  if (memberIds.length === 0) return {}

  const cents = Math.round(total * 100)     // work in integer paise
  const base = Math.floor(cents / memberIds.length)
  const remainder = cents % memberIds.length

  return Object.fromEntries(
    memberIds.map((id, i) => [id, (base + (i < remainder ? 1 : 0)) / 100])
  )
}

// ─── Pairwise balance ─────────────────────────────────────────────────────────
// Returns a positive value if A owes B, negative if B owes A.
export function computePairBalance(
  memberId_A: string,
  memberId_B: string,
  expenses: Expense[],
  splits: Split[],
  settlements: Settlement[]
): number {
  let net = 0

  for (const exp of expenses) {
    const splitA = splits.find(
      s => s.expense_id === exp.id && s.member_id === memberId_A
    )
    const splitB = splits.find(
      s => s.expense_id === exp.id && s.member_id === memberId_B
    )

    if (exp.paid_by === memberId_B && splitA) {
      net += Number(splitA.owed_amount)   // A owes B for this expense
    }
    if (exp.paid_by === memberId_A && splitB) {
      net -= Number(splitB.owed_amount)   // B owes A → A owes B less
    }
  }

  for (const s of settlements) {
    if (s.paid_by === memberId_A && s.paid_to === memberId_B) {
      net -= Number(s.amount)   // A already paid B
    }
    if (s.paid_by === memberId_B && s.paid_to === memberId_A) {
      net += Number(s.amount)   // B paid A → A owes B more
    }
  }

  // Round only at the final step — never accumulate rounded values
  return Math.round(net * 100) / 100
}

// ─── Net balance per member ───────────────────────────────────────────────────
// Positive net = this person is owed money overall.
// Negative net = this person owes money overall.
export function computeNetBalances(
  members: Member[],
  expenses: Expense[],
  splits: Split[],
  settlements: Settlement[]
): Array<{ memberId: string; memberName: string; net: number }> {
  const nets: Record<string, number> = {}
  for (const m of members) nets[m.id] = 0

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const A = members[i].id
      const B = members[j].id
      const pair = computePairBalance(A, B, expenses, splits, settlements)
      nets[A] -= pair   // pair > 0 means A owes B → A's net goes down
      nets[B] += pair   // B is owed → B's net goes up
    }
  }

  return members.map(m => ({
    memberId: m.id,
    memberName: m.display_name,
    net: Math.round(nets[m.id] * 100) / 100,
  }))
}

// ─── Simplified debts ─────────────────────────────────────────────────────────
// Reduces N*(N-1) pairwise debts to the minimum number of transactions
// needed to make everyone whole. Uses a greedy creditor-debtor algorithm.
export function simplifyDebts(
  members: Member[],
  expenses: Expense[],
  splits: Split[],
  settlements: Settlement[]
): BalancePair[] {
  const balances = computeNetBalances(members, expenses, splits, settlements)

  // Make mutable copies
  const creditors = balances.filter(b => b.net > 0.005).map(b => ({ ...b }))
  const debtors   = balances.filter(b => b.net < -0.005).map(b => ({ ...b }))

  const result: BalancePair[] = []
  let i = 0, j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor   = debtors[i]
    const creditor = creditors[j]
    const amount   = Math.min(Math.abs(debtor.net), creditor.net)

    if (amount > 0.005) {
      result.push({
        fromId:   debtor.memberId,
        fromName: debtor.memberName,
        toId:     creditor.memberId,
        toName:   creditor.memberName,
        amount:   Math.round(amount * 100) / 100,
      })
    }

    debtor.net   += amount
    creditor.net -= amount

    if (Math.abs(debtor.net)   < 0.005) i++
    if (creditor.net           < 0.005) j++
  }

  return result
}