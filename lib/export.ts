// lib/export.ts
// Called from the History page's "Export CSV" button.

interface ExportRow {
  date: string
  title: string
  category: string
  amount: number
  paid_by_name: string
}

interface BalanceSummaryRow {
  fromName: string
  toName: string
  amount: number
}

export function exportToCSV(
  rows: ExportRow[],
  groupName: string,
  balances?: BalanceSummaryRow[]
): void {
  const lines: string[] = []

  // ── Section 1: Expenses ──
  lines.push('--- Expenses ---')
  lines.push('Date,Title,Category,Amount (INR),Paid By')
  rows.forEach(r => {
    lines.push([
      r.date,
      `"${r.title.replace(/"/g, '""')}"`,
      r.category,
      r.amount.toFixed(2),
      `"${r.paid_by_name.replace(/"/g, '""')}"`,
    ].join(','))
  })

  // ── Section 2: Net Balance Summary ──
  lines.push('')
  lines.push('--- Net Balance Summary ---')
  if (!balances || balances.length === 0) {
    lines.push('All settled up — no outstanding balances.')
  } else {
    lines.push('From,Owes To,Amount (INR)')
    balances.forEach(b => {
      lines.push([
        `"${b.fromName.replace(/"/g, '""')}"`,
        `"${b.toName.replace(/"/g, '""')}"`,
        b.amount.toFixed(2),
      ].join(','))
    })
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${groupName.replace(/\s+/g, '_')}_expenses.csv`
  link.click()
  URL.revokeObjectURL(url)
}
