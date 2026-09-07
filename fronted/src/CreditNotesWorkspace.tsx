import { useState, useEffect, useMemo } from 'react'
import type { FormEvent } from 'react'
import {
  FileText, Check, X, ArrowRight, ArrowLeft, Coins,
  CheckCircle2, Users, Trash2, Send, ShieldCheck, Eye, CreditCard
} from 'lucide-react'
import { useCreditNotesStore } from './stores/useCreditNotesStore'
import { useCustomersStore, useCompanyStore } from './stores'
import { useFormDraft } from './hooks/useFormDraft'
import { DataToolbar } from '@/components/ui/data-toolbar'
import { KpiCard, KpiGrid } from './components/ui/kpi-card'
import { StatusChip } from './components/ui/status-chip'
import { EmptyState } from './components/ui/empty-state'
import { money } from '@/lib/currency'
import { CompactSelect } from './components/CompactSelect'

const statusStyles: Record<string, { label: string; hex: string }> = {
  Draft: { label: 'Draft', hex: '#94a3b8' },
  Posted: { label: 'Posted', hex: '#10b981' },
  Void: { label: 'Void', hex: '#ef4444' }
}

export function CreditNotesWorkspace({
  activeEntityId,
  entities = []
}: {
  activeEntityId?: string
  entities?: any[]
}) {
  const { creditNotes, fetchAll, create, post, void: voidNote } = useCreditNotesStore()
  const customers = useCustomersStore((s) => s.customers as any[])
  const { entities: companies, fetchCompanies, activeEntityId: storeEntityId } = useCompanyStore()

  const currentEntityId = activeEntityId || storeEntityId || ''
  const [showCreate, setShowCreate] = useState(false)
  const [modalTab, setModalTab] = useState<'details' | 'items' | 'summary' | 'preview'>('details')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    companyId: currentEntityId,
    customerId: '',
    creditNoteDate: new Date().toISOString().slice(0, 10),
    notes: '',
    amount: '0',
    tax: '0',
    currencyCode: 'PKR'
  })

  const { saveDraft, clearDraft } = useFormDraft('credit_note', form, setForm, showCreate)

  useEffect(() => {
    fetchCompanies()
    fetchAll(currentEntityId)
  }, [currentEntityId])

  const notify = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3500)
  }

  const openCreateModal = () => {
    setForm({
      companyId: currentEntityId,
      customerId: customers[0]?.id || '',
      creditNoteDate: new Date().toISOString().slice(0, 10),
      notes: 'Customer return / pricing adjustment credit note.',
      amount: '0',
      tax: '0',
      currencyCode: 'PKR'
    })
    setModalTab('details')
    setShowCreate(true)
  }

  const handleCreate = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!form.customerId) {
      notify('Please select a customer.')
      return
    }
    if (Number(form.amount) <= 0) {
      notify('Please enter a credit amount greater than 0.')
      return
    }

    try {
      await create({
        companyId: form.companyId || currentEntityId,
        customerId: form.customerId,
        creditNoteDate: form.creditNoteDate,
        notes: form.notes,
        lines: [{
          description: form.notes || 'Credit Note Adjustment',
          quantity: 1,
          unitPrice: Number(form.amount),
          discountAmount: 0,
          taxAmount: Number(form.tax)
        }]
      })
      clearDraft()
      setShowCreate(false)
      notify('✓ Credit Note created successfully!')
      fetchAll(currentEntityId)
    } catch {
      notify('Error creating Credit Note')
    }
  }

  const formatDate = (dateStr: string) => (dateStr ? new Date(dateStr).toLocaleDateString() : '—')

  const filtered = useMemo(() => {
    return creditNotes
      .filter((cn: any) => {
        const cust = customers.find(c => c.id === cn.customerId)
        const custName = cust?.name || cn.customerId || ''
        const matchesQuery = !query.trim()
          ? true
          : `${cn.creditNoteNumber || ''} ${custName} ${cn.notes || ''} ${cn.status || ''}`.toLowerCase().includes(query.toLowerCase())

        const matchesStatus = statusFilter === 'all' || (cn.status || '').toLowerCase() === statusFilter.toLowerCase()

        return matchesQuery && matchesStatus
      })
      .sort((a: any, b: any) => {
        const dateA = a.creditNoteDate || a.createdAt || ''
        const dateB = b.creditNoteDate || b.createdAt || ''
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA)
        }
        const numA = a.creditNoteNumber || a.reference || ''
        const numB = b.creditNoteNumber || b.reference || ''
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' })
      })
  }, [creditNotes, customers, query, statusFilter])

  const exportHeaders = ['Date', 'Customer', 'Reason', 'Amount', 'Status']
  const exportRows = filtered.map((cn: any) => {
    const cust = customers.find(c => c.id === cn.customerId)
    return [
      formatDate(cn.creditNoteDate || cn.createdAt),
      cust?.name || cn.customerId || '—',
      cn.notes || '',
      cn.totalAmount,
      cn.status
    ]
  })

  const totalCredit = creditNotes.reduce((s: number, cn: any) => s + (cn.totalAmount || 0), 0)
  const draftCount = creditNotes.filter((cn: any) => cn.status === 'Draft').length
  const postedCount = creditNotes.filter((cn: any) => cn.status === 'Posted').length

  const assignedCompany = (companies || entities).find((e: any) => e.id === currentEntityId)

  return (
    <div className="space-y-6">
      {toast && (
        <div className="z-[9999] px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold">
          {toast}
        </div>
      )}

      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-emerald-500 to-green-700" />
              <div className="absolute inset-0 flex items-center justify-center"><FileText className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Credit Notes &amp; Returns</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Issue sales credit memos, return adjustments, and customer refund vouchers with automated AR posting.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <DataToolbar
              query={query}
              setQuery={setQuery}
              searchPlaceholder="Search customer, note..."
              exportFileName="credit-notes"
              exportSheetName="Credit Notes"
              exportTitle="Credit Notes Register"
              exportSubtitle="Customer credit memos and returns."
              exportHeaders={exportHeaders}
              exportRows={exportRows}
              exportTotals={[{ label: 'Total Credit Value', value: totalCredit }]}
            >
              <select
                className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors shadow-2xs box-border"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">⚡ All Statuses</option>
                <option value="draft">⚪ Draft</option>
                <option value="posted">🟢 Posted</option>
                <option value="void">🔴 Void</option>
              </select>
            </DataToolbar>
            <button
              onClick={openCreateModal}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25"
            >
              <span>＋</span> Create Credit Note
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards (Row 2) */}
      <KpiGrid cols={3}>
        {[
          { label: 'Total Credit Value', value: money(totalCredit), desc: 'Issued customer credits', icon: CreditCard, tone: 'blue' },
          { label: 'Posted to Ledger', value: postedCount, desc: 'Applied to customer AR', icon: CheckCircle2, tone: 'emerald' },
          { label: 'Draft Credit Notes', value: draftCount, desc: 'Pending manager approval', icon: FileText, tone: 'violet' },
        ].map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </KpiGrid>

      {/* Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-emerald-500 to-green-700" />
            Credit Notes Directory
          </p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Showing {filtered.length} of {creditNotes.length} record{creditNotes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No credit notes found"
            hint="Adjust the search or status filters to see more results."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-emerald-500/[0.05] dark:bg-emerald-400/[0.07]">
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Customer</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Reason / Note</th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Credit Amount</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cn: any) => {
                  const cust = customers.find(c => c.id === cn.customerId)
                  const badge = statusStyles[cn.status] || statusStyles.Draft

                  return (
                    <tr key={cn.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-colors">
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{formatDate(cn.creditNoteDate || cn.createdAt)}</td>
                      <td className="px-3 py-2 font-semibold text-[var(--color-text-strong)]">{cust?.name || cn.customerId || '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{cn.notes || '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-sky-600 font-mono">{money(cn.totalAmount)}</td>
                      <td className="px-3 py-2 text-center">
                        <StatusChip status={cn.status} label={badge.label} hex={badge.hex} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {cn.status === 'Draft' && (
                            <button
                              onClick={() => post(cn.id)}
                              className="h-6.5 px-2 rounded bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> Post
                            </button>
                          )}
                          {cn.status !== 'Void' && (
                            <button
                              onClick={() => voidNote(cn.id)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-500/10"
                              title="Void Note"
                            >
                              <Trash2 className="w-3 h-3" />
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

      {/* Stepped / Tabbed Credit Note Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight">Create Customer Credit Note</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                      Credit Memo
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1.5">
                    <span>Assigned Entity:</span>
                    <span className="font-semibold text-[var(--color-text-strong)]">
                      🏢 {assignedCompany ? assignedCompany.name : 'Global Group Book'}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] transition-colors"
                onClick={() => setShowCreate(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <button
                type="button"
                onClick={() => setModalTab('details')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  modalTab === 'details'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <Users className="w-3 h-3" /> 1. Customer & Date
              </button>

              <button
                type="button"
                onClick={() => setModalTab('items')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  modalTab === 'items'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <Coins className="w-3 h-3" /> 2. Credit Amount & Tax
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
                <FileText className="w-3 h-3" /> 3. Reason & Confirmation
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
              {modalTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      <span className="text-rose-500 font-bold mr-1">*</span> Customer / Client
                    </label>
                    <CompactSelect
                      value={form.customerId}
                      onChange={v => setForm({ ...form, customerId: v })}
                      placeholder="Select customer..."
                      searchPlaceholder="Search customer by name or code..."
                      options={customers.map((c: any) => ({
                        value: c.id,
                        label: c.name,
                        badge: c.customerNumber || undefined,
                      }))}
                      className="h-10 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Credit Note Date
                    </label>
                    <input
                      type="date"
                      value={form.creditNoteDate}
                      onChange={e => setForm({ ...form, creditNoteDate: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Currency
                    </label>
                    <select
                      value={form.currencyCode}
                      onChange={e => setForm({ ...form, currencyCode: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    >
                      {['PKR', 'USD', 'AED', 'SAR', 'GBP', 'EUR', 'CAD', 'AUD'].map(curr => (
                        <option key={curr} value={curr}>{curr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {modalTab === 'items' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      <span className="text-rose-500 font-bold mr-1">*</span> Credit Principal Amount (Rs)
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
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs outline-none font-mono text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Tax Reversal Amount (Rs)
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
                        value={form.tax}
                        onChange={e => setForm({ ...form, tax: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs outline-none font-mono text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Reason for Credit Note / Return Remarks
                    </label>
                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="e.g. Return of damaged stock from Invoice INV-1002 / rate adjustment..."
                      className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] outline-none shadow-2xs resize-none"
                    />
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Posting this note will automatically credit customer AR and reverse sales tax liability.</span>
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-muted)]/60 border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Credit Note Total</p>
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Principal Amount</span>
                      <span className="font-semibold font-mono text-[var(--color-text-strong)]">{money(Number(form.amount) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-amber-500 font-mono">
                      <span>Tax Reversal</span>
                      <span>+{money(Number(form.tax) || 0)}</span>
                    </div>
                    <div className="border-t border-[var(--color-border)] pt-2.5 flex justify-between text-sm font-bold text-[var(--color-text-strong)]">
                      <span>Total Credit</span>
                      <span className="text-rose-600 font-mono">{money((Number(form.amount) || 0) + (Number(form.tax) || 0))}</span>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-orange-500/10 border border-rose-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[var(--color-text-strong)]">Credit Note: Auto-generated</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">Draft Credit Note</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Customer: <strong className="text-[var(--color-text-strong)]">{customers.find((c: any) => c.id === form.customerId)?.name || 'Selected Customer'}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div><span className="text-[var(--color-text-muted)] block text-[11px]">Credit Note Date:</span><strong>{form.creditNoteDate}</strong></div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 shadow-2xs">
                      <p className="font-bold text-[var(--color-text-strong)] border-b border-[var(--color-border)] pb-2">Credit Amount Breakdown</p>
                      <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Principal Credit Amount:</span><span className="font-semibold font-mono text-[var(--color-text-strong)]">{money(Number(form.amount) || 0)}</span></div>
                      <div className="flex justify-between text-amber-600 font-mono"><span>Tax Reversal (VAT/Sales Tax):</span><span>+{money(Number(form.tax) || 0)}</span></div>
                      <div className="flex justify-between font-bold text-rose-600 font-mono border-t border-[var(--color-border)] pt-2">
                        <span>Total Credit to Customer:</span>
                        <span className="text-base">{money((Number(form.amount) || 0) + (Number(form.tax) || 0))}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
                      <p className="font-bold text-[var(--color-text-strong)] border-b border-[var(--color-border)] pb-2">Reason & Journal Impact</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{form.notes || 'Reason not specified.'}</p>
                      <div className="mt-2 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20 text-[10px] text-rose-600">
                        <strong>GAAP Journal Entry (Auto-posted):</strong><br />
                        Dr Sales Revenue / AR Reversal<br />
                        Cr Accounts Receivable (Customer Balance Reduced)
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
                <span>{modalTab === 'preview' ? 'Ready for final verification & creation' : 'Auto-draft protection active'}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>

                {modalTab !== 'details' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalTab === 'preview') setModalTab('summary')
                      else if (modalTab === 'summary') setModalTab('items')
                      else if (modalTab === 'items') setModalTab('details')
                    }}
                    className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>{modalTab === 'preview' ? 'Back to Edit' : 'Back'}</span>
                  </button>
                )}

                {modalTab !== 'preview' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalTab === 'details') {
                        if (!form.customerId) { notify('Please select a customer.'); return }
                        setModalTab('items')
                      } else if (modalTab === 'items') {
                        setModalTab('summary')
                      } else if (modalTab === 'summary') {
                        setModalTab('preview')
                      }
                    }}
                    className="h-9 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                  >
                    <span>{modalTab === 'details' ? 'Next: Amount & Tax' : modalTab === 'items' ? 'Next: Reason & Confirmation' : 'Preview & Review'}</span>
                    {modalTab === 'summary' ? <Eye className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreate as any}
                    className="h-9 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3" />
                    <span>Confirm & Issue Credit Note</span>
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

export default CreditNotesWorkspace
