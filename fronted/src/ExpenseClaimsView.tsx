import { useEffect, useMemo, useState } from 'react'
import {
  ReceiptText, Check, X, ArrowRight, ArrowLeft, Coins,
  Users, FileText, ShieldCheck, Eye,
  Receipt, CheckCircle, Clock
} from 'lucide-react'
import { useCoaStore, useExpenseClaimsStore } from './stores'
import { useFormDraft } from './hooks/useFormDraft'
import { DataToolbar } from '@/components/ui/data-toolbar'
import { CompactSelect } from './components/CompactSelect'
import { money } from '@/lib/currency'
import type { Entity } from './EntitySettings'

const statusStyles: Record<string, { label: string; class: string }> = {
  Submitted: { label: 'Submitted', class: 'bg-sky-500/10 text-sky-600 border border-sky-500/20' },
  Approved: { label: 'Approved', class: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' },
  Paid: { label: 'Paid & Posted', class: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' },
  Rejected: { label: 'Rejected', class: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' }
}

export const ExpenseClaimsView: React.FC<{ activeEntityId: string; entities?: Entity[] }> = ({
  activeEntityId,
  entities = []
}) => {
  const currentEntity = entities.find(e => e.id === activeEntityId)
  const { claims, fetchClaims, createClaim, setStatus } = useExpenseClaimsStore()
  const accounts = useCoaStore((s) => s.accounts)
  const fetchAccounts = useCoaStore((s) => s.fetchAccounts)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [modalTab, setModalTab] = useState<'employee' | 'expense' | 'summary' | 'preview'>('employee')
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    employeeName: '',
    department: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'Travel & Lodging',
    amount: '',
    notes: '',
    accountId: '',
    currency: 'PKR'
  })

  const { saveDraft, clearDraft } = useFormDraft('expense_claim', form, setForm, showForm)

  useEffect(() => {
    fetchClaims(activeEntityId)
    fetchAccounts()
  }, [activeEntityId])

  const notify = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3500)
  }

  const openCreateModal = () => {
    setForm({
      employeeName: '',
      department: 'Finance & Operations',
      date: new Date().toISOString().slice(0, 10),
      category: 'Travel & Lodging',
      amount: '',
      notes: 'Out-of-pocket business expense reimbursement.',
      accountId: '',
      currency: 'PKR'
    })
    setModalTab('employee')
    setShowForm(true)
  }

  const expenseAccounts = accounts.filter(a => a.type === 'Expense' && a.status === 'Active')

  const submitClaim = async () => {
    if (!form.employeeName) {
      notify('Please enter employee name.')
      return
    }
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      notify('Enter a valid expense amount.')
      return
    }

    try {
      await createClaim({
        employeeName: form.employeeName,
        department: form.department || 'General',
        date: form.date,
        currency: 'PKR',
        notes: form.notes,
        companyId: activeEntityId,
        lines: [{
          accountId: form.accountId || undefined,
          category: form.category,
          description: form.notes || form.category,
          amount,
          currency: 'PKR'
        }],
      })
      clearDraft()
      setShowForm(false)
      notify('✓ Expense claim submitted for manager review!')
      fetchClaims(activeEntityId)
    } catch {
      notify('Failed to submit expense claim.')
    }
  }

  const filtered = useMemo(() => {
    return claims
      .filter(c => {
        const matchesQuery = !query.trim()
          ? true
          : `${c.claimNumber} ${c.employeeName} ${c.department} ${c.notes || ''}`.toLowerCase().includes(query.toLowerCase())

        const matchesStatus = statusFilter === 'all' || c.status.toLowerCase() === statusFilter.toLowerCase()

        return matchesQuery && matchesStatus
      })
      .sort((a, b) => {
        const dateA = a.date || a.createdAt || ''
        const dateB = b.date || b.createdAt || ''
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA)
        }
        const numA = a.claimNumber || ''
        const numB = b.claimNumber || ''
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' })
      })
  }, [claims, query, statusFilter])

  const exportHeaders = ['Claim #', 'Date', 'Employee', 'Department', 'Amount', 'Currency', 'Status', 'Notes']
  const exportRows = filtered.map(c => [
    c.claimNumber,
    c.date,
    c.employeeName,
    c.department,
    c.totalAmount,
    c.currency || 'PKR',
    c.status,
    c.notes || ''
  ])

  const totalClaims = filtered.reduce((s, c) => s + (c.totalAmount || 0), 0)
  const pendingCount = filtered.filter(c => c.status === 'Submitted').length
  const paidCount = filtered.filter(c => c.status === 'Paid').length

  return (
    <div className="space-y-6">
      {toast && (
        <div className="z-[9999] px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold">
          {toast}
        </div>
      )}

      {/* Submodule Heading Banner (Row 1) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[var(--color-surface)] p-3.5 rounded-xl border border-[var(--color-border)] shadow-sm">
        <div>
          <h1 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight flex items-center gap-2">
            <span className="text-lg">🧾</span> Employee Expense Claims
          </h1>
          <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
            Submit and review staff out-of-pocket expenses, travel advances, and general employee reimbursement vouchers.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <DataToolbar
            query={query}
            setQuery={setQuery}
            searchPlaceholder="Search employee, claim #..."
            exportFileName="expense-claims"
            exportSheetName="Expense Claims"
            exportTitle="Expense Claims Register"
            exportSubtitle="Staff reimbursements and expense vouchers."
            exportHeaders={exportHeaders}
            exportRows={exportRows}
            exportTotals={[{ label: 'Total Claims', value: totalClaims }]}
          >
            <select
              className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors shadow-2xs box-border"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">⚡ All Statuses</option>
              <option value="submitted">🔵 Submitted</option>
              <option value="approved">🟡 Approved</option>
              <option value="paid">🟢 Paid & Posted</option>
              <option value="rejected">🔴 Rejected</option>
            </select>
          </DataToolbar>
          <button
            onClick={openCreateModal}
            className="h-9 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <span>＋</span> New Claim
          </button>
        </div>
      </div>

      {/* Stats Cards (Row 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'TOTAL EXPENSE VALUE', value: money(totalClaims), desc: 'All recorded vouchers', icon: Receipt, color: 'from-sky-500 to-blue-600', bg: 'bg-sky-50 dark:bg-sky-950/30', textColor: 'text-sky-600 dark:text-sky-400' },
          { label: 'PAID & SETTLED', value: paidCount, desc: 'Posted to GL ledger', icon: CheckCircle, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'AWAITING APPROVAL', value: pendingCount, desc: 'Pending manager sign-off', icon: Clock, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-950/30', textColor: 'text-violet-600 dark:text-violet-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{kpi.label}</p>
                <p className={`text-lg font-semibold mt-1 ${kpi.textColor}`}>{kpi.value}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{kpi.desc}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full ${kpi.bg} opacity-50`} />
          </div>
        ))}
      </div>

      {/* Claims Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--color-text-strong)]">Expense Claims Directory</p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Showing {filtered.length} of {claims.length} claim{claims.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">No expense claims found matching your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Claim #</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Employee</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Department</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Description</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--color-text-muted)]">Amount (Rs)</th>
                  <th className="text-center px-3 py-2 font-semibold text-[var(--color-text-muted)]">Status</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const badge = statusStyles[c.status] || statusStyles.Submitted
                  return (
                    <tr key={c.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-colors">
                      <td className="px-3 py-2 font-mono font-semibold text-[var(--color-text-strong)]">{c.claimNumber}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{c.date}</td>
                      <td className="px-3 py-2 font-semibold text-[var(--color-text-strong)]">{c.employeeName}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{c.department}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{c.notes || '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-sky-600 font-mono">{money(c.totalAmount)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.class}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.status === 'Submitted' && (
                            <button
                              onClick={() => { setStatus(c.id, 'Approved', activeEntityId); notify('✓ Claim approved'); }}
                              className="h-6.5 px-2 rounded bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-[11px] font-semibold"
                            >
                              Approve
                            </button>
                          )}
                          {c.status === 'Approved' && (
                            <button
                              onClick={() => { setStatus(c.id, 'Paid', activeEntityId); notify('✓ Claim settled & posted to GL'); }}
                              className="h-6.5 px-2 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[11px] font-semibold"
                            >
                              Pay & Post
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stepped / Tabbed Claim Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight">Submit Expense Reimbursement</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Staff Claim
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1.5">
                    <span>Operating Unit:</span>
                    <span className="font-semibold text-[var(--color-text-strong)]">
                      🏢 {currentEntity ? currentEntity.name : 'Global Group Book'}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-muted)] transition-colors"
                onClick={() => setShowForm(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <button
                type="button"
                onClick={() => setModalTab('employee')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  modalTab === 'employee'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <Users className="w-3 h-3" /> 1. Staff & Department
              </button>

              <button
                type="button"
                onClick={() => setModalTab('expense')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  modalTab === 'expense'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <Coins className="w-3 h-3" /> 2. Category & Amount
              </button>

              <button
                type="button"
                onClick={() => setModalTab('summary')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  modalTab === 'summary'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <FileText className="w-3 h-3" /> 3. Verification & Submit
              </button>

              <button
                type="button"
                onClick={() => setModalTab('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  modalTab === 'preview'
                    ? 'border-emerald-600 text-emerald-600 bg-emerald-500/10'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-5">
              {modalTab === 'employee' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      <span className="text-rose-500 font-bold mr-1">*</span> Employee Name
                    </label>
                    <input
                      placeholder="e.g. Tariq Mehmood"
                      value={form.employeeName}
                      onChange={e => setForm({ ...form, employeeName: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Department
                    </label>
                    <input
                      placeholder="e.g. Sales, Marketing, Logistics"
                      value={form.department}
                      onChange={e => setForm({ ...form, department: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Expense Date
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Currency
                    </label>
                    <select
                      value={form.currency}
                      onChange={e => setForm({ ...form, currency: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    >
                      {['PKR', 'USD', 'AED', 'SAR', 'GBP', 'EUR', 'CAD', 'AUD'].map(curr => (
                        <option key={curr} value={curr}>{curr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {modalTab === 'expense' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Expense Category
                    </label>
                    <input
                      placeholder="e.g. Travel, Fuel, Client Entertainment"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      GL Expense Account (Optional)
                    </label>
                    <CompactSelect
                      value={form.accountId}
                      onChange={v => setForm({ ...form, accountId: v })}
                      placeholder="-- General Operating Expense --"
                      searchPlaceholder="Search expense account..."
                      clearLabel="-- General Operating Expense --"
                      options={expenseAccounts.map(a => ({
                        value: a.id,
                        label: `${a.code} — ${a.name}`,
                        badge: 'Expense'
                      }))}
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      <span className="text-rose-500 font-bold mr-1">*</span> Claim Amount (Rs)
                    </label>
                    <div className="flex items-center gap-2.5 h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] transition-colors shadow-2xs">
                      <span className="text-[11px] font-bold font-mono text-[var(--color-text-muted)] shrink-0 px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)]">
                        Rs
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={e => setForm({ ...form, amount: e.target.value })}
                        className="w-full h-full border-0 outline-none bg-transparent font-mono text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                        Receipt Details / Business Justification
                      </label>
                      <textarea
                        rows={4}
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="Attach or describe receipts, purpose of visit, trip dates..."
                        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] outline-none shadow-2xs resize-none"
                      />
                    </div>
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Approved claims will generate Dr Travel & Operating Expense / Cr Accounts Payable Employee.</span>
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-muted)]/60 border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Reimbursement Summary</p>
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Employee</span>
                      <span className="font-semibold text-[var(--color-text-strong)]">{form.employeeName || 'Staff'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Category</span>
                      <span className="font-semibold text-[var(--color-text-strong)]">{form.category}</span>
                    </div>
                    <div className="border-t border-[var(--color-border)] pt-2.5 flex justify-between text-sm font-bold text-[var(--color-text-strong)]">
                      <span>Claim Total</span>
                      <span className="text-emerald-600 font-mono">{money(parseFloat(form.amount || '0'))}</span>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-indigo-500/10 border border-violet-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[var(--color-text-strong)]">Expense Claim: Auto-generated</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 border border-violet-500/20">Pending Approval</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Employee: <strong>{form.employeeName || 'Employee'}</strong> • Department: <span>{form.department || 'N/A'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div><span className="text-[var(--color-text-muted)] block text-[11px]">Expense Date:</span><strong>{form.date}</strong></div>
                      <div><span className="text-[var(--color-text-muted)] block text-[11px]">Currency:</span><strong className="font-mono">{form.currency}</strong></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 shadow-2xs">
                      <p className="font-bold text-[var(--color-text-strong)] border-b border-[var(--color-border)] pb-2">Claim Details</p>
                      <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Category:</span><span className="font-semibold">{form.category}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">GL Account:</span><span className="font-mono text-xs">{form.accountId || '—'}</span></div>
                      <div className="flex justify-between font-bold text-violet-600 font-mono border-t border-[var(--color-border)] pt-2">
                        <span>Total Claim Amount:</span>
                        <span className="text-base">{money(parseFloat(form.amount || '0'))}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
                      <p className="font-bold text-[var(--color-text-strong)] border-b border-[var(--color-border)] pb-2">Business Justification & Journal</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{form.notes || 'No justification provided.'}</p>
                      <div className="mt-2 p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/20 text-[10px] text-violet-700">
                        <strong>GAAP Journal Entry (On Approval):</strong><br />
                        Dr {form.category || 'Operating'} Expense Account<br />
                        Cr Accounts Payable — Employee
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>{modalTab === 'preview' ? 'Ready for final verification & submission' : 'Auto-draft protection active'}</span>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors" onClick={() => setShowForm(false)}>Cancel</button>

                {modalTab !== 'employee' && (
                  <button type="button" onClick={() => { if (modalTab === 'preview') setModalTab('summary'); else if (modalTab === 'summary') setModalTab('expense'); else if (modalTab === 'expense') setModalTab('employee'); }} className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    <span>{modalTab === 'preview' ? 'Back to Edit' : 'Back'}</span>
                  </button>
                )}

                {modalTab !== 'preview' ? (
                  <button type="button" onClick={() => {
                    if (modalTab === 'employee') { if (!form.employeeName) { notify('Please enter employee name.'); return } setModalTab('expense') }
                    else if (modalTab === 'expense') { if (!form.amount || parseFloat(form.amount) <= 0) { notify('Please enter a valid amount.'); return } setModalTab('summary') }
                    else if (modalTab === 'summary') { setModalTab('preview') }
                  }} className="h-8.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5">
                    <span>{modalTab === 'employee' ? 'Next: Category & Amount' : modalTab === 'expense' ? 'Next: Verification & Submit' : 'Preview & Review'}</span>
                    {modalTab === 'summary' ? <Eye className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                  </button>
                ) : (
                  <button type="button" onClick={submitClaim} className="h-8.5 px-5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5">
                    <Check className="w-3 h-3" />
                    <span>Confirm & Submit Claim</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
