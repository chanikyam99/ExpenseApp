// lib/export.ts
// Called from the History page's "Export CSV" button.

interface ExportRow {
  date: string
  title: string
  category: string
  amount: number
  paid_by_name: string
}

export function exportToCSV(rows: ExportRow[], groupName: string): void {
  const headers = ['Date', 'Title', 'Category', 'Amount (INR)', 'Paid By']

  const csvRows = rows.map(r => [
    r.date,
    `"${r.title.replace(/"/g, '""')}"`,
    r.category,
    r.amount.toFixed(2),
    `"${r.paid_by_name.replace(/"/g, '""')}"`,
  ])

  const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${groupName.replace(/\s+/g, '_')}_expenses.csv`
  link.click()
  URL.revokeObjectURL(url)
}