import { useState, useEffect, useMemo } from 'react'
import {
  FileText, FileMinus, Check, CheckCircle, X, ArrowRight, ArrowLeft, Coins,
  Users, ShieldCheck, Trash2, Eye
} from 'lucide-react'
import { useVendorsStore, useCompanyStore } from './stores'
import { useFormDraft } from './hooks/useFormDraft'
import { DataToolbar } from '@/components/ui/data-toolbar'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import { EmptyState } from './components/ui/empty-state'
import { StatusChip } from './components/ui/status-chip'
import { CompactSelect } from './components/CompactSelect'
import { money } from '@/lib/currency'

interface DebitNoteItem {
  id: string
  debitNoteNumber: string
  vendorId: string
  vendorName: string
  date: string
  reason: string
  amount: number
  taxAmount: number
  totalAmount: number
  status: 'Draft' | 'Posted' | 'Void'
}

const statusStyles: Record<string, { label: string; hex: string }> = {
  Draft: { label: 'Draft', hex: '#94a3b8' },
  Posted: { label: 'Posted', hex: '#10b981' },
  Void: { label: 'Void', hex: '#ef4444' }
}

const getNextDebitNoteNumber = (allNotes: DebitNoteItem[] = []): string => {
  let maxSeq = 0
  for (const n of allNotes) {
    if (!n?.debitNoteNumber) continue
    const match = n.debitNoteNumber.match(/DN-(\d+)/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (!isNaN(num) && num > maxSeq && num < 1000000) {
        maxSeq = num
      }
    }
  }
  return `DN-${String(maxSeq + 1).padStart(5, '0')}`
}

export const DebitNotes: React.FC<{ activeEntityId: string; entities?: any[] }> = ({
  activeEntityId,
  entities = []
}) => {
  const vendors = useVendorsStore(s => s.vendors)
  const fetchVendors = useVendorsStore(s => s.fetchVendors)
  const { entities: companies } = useCompanyStore()

  const [notes, setNotes] = useState<DebitNoteItem[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [modalTab, setModalTab] = useState<'details' | 'items' | 'summary' | 'preview'>('details')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    vendorId: '',
    date: new Date().toISOString().slice(0, 10),
    reason: '',
    amount: '0',
    taxAmount: '0',
    currencyCode: 'PKR'
  })

  const { saveDraft, clearDraft } = useFormDraft('debit_note', form, setForm, showCreate)

  useEffect(() => {
    fetchVendors(activeEntityId)
    // Load local stored debit notes if any
    const stored = localStorage.getItem(`debit_notes_${activeEntityId || 'global'}`)
    if (stored) {
      try {
        setNotes(JSON.parse(stored))
      } catch {}
    }
  }, [activeEntityId])

  const notify = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3500)
  }

  const openCreateModal = () => {
    setForm({
      vendorId: vendors[0]?.id || '',
      date: new Date().toISOString().slice(0, 10),
      reason: 'Purchase return / supplier price overcharge adjustment.',
      amount: '0',
      taxAmount: '0',
      currencyCode: 'PKR'
    })
    setModalTab('details')
    setShowCreate(true)
  }

  const handleCreate = () => {
    if (!form.vendorId) {
      notify('Please select a vendor.')
      return
    }
    const amt = parseFloat(form.amount || '0')
    if (amt <= 0) {
      notify('Please enter a valid debit amount.')
      return
    }

    const vendor = vendors.find(v => v.id === form.vendorId)
    const tax = parseFloat(form.taxAmount || '0')
    const newNote: DebitNoteItem = {
      id: `dn_${Date.now()}`,
      debitNoteNumber: getNextDebitNoteNumber(notes),
      vendorId: form.vendorId,
      vendorName: vendor?.name || 'Vendor',
      date: form.date,
      reason: form.reason,
      amount: amt,
      taxAmount: tax,
      totalAmount: amt + tax,
      status: 'Draft'
    }

    const updated = [newNote, ...notes]
    setNotes(updated)
    localStorage.setItem(`debit_notes_${activeEntityId || 'global'}`, JSON.stringify(updated))
    clearDraft()
    setShowCreate(false)
    notify('✓ Debit Note created as Draft!')
  }

  const handlePost = (id: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, status: 'Posted' as const } : n)
    setNotes(updated)
    localStorage.setItem(`debit_notes_${activeEntityId || 'global'}`, JSON.stringify(updated))
    notify('✓ Debit Note posted to Accounts Payable ledger!')
  }

  const handleVoid = (id: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, status: 'Void' as const } : n)
    setNotes(updated)
    localStorage.setItem(`debit_notes_${activeEntityId || 'global'}`, JSON.stringify(updated))
    notify('Debit Note marked as Void.')
  }

  const filtered = useMemo(() => {
    return notes.filter(n => {
      const matchesQuery = !query.trim()
        ? true
        : `${n.debitNoteNumber} ${n.vendorName} ${n.reason}`.toLowerCase().includes(query.toLowerCase())

      const matchesStatus = statusFilter === 'all' || n.status.toLowerCase() === statusFilter.toLowerCase()

      return matchesQuery && matchesStatus
    })
  }, [notes, query, statusFilter])

  const exportHeaders = ['Debit Note #', 'Vendor', 'Date', 'Reason', 'Principal (Rs)', 'Tax (Rs)', 'Total (Rs)', 'Status']
  const exportRows = filtered.map(n => [
    n.debitNoteNumber,
    n.vendorName,
    n.date,
    n.reason,
    n.amount,
    n.taxAmount,
    n.totalAmount,
    n.status
  ])

  const totalDebit = notes.reduce((s, n) => s + (n.totalAmount || 0), 0)
  const postedCount = notes.filter(n => n.status === 'Posted').length
  const draftCount = notes.filter(n => n.status === 'Draft').length

  const assignedCompany = (companies || entities).find((e: any) => e.id === activeEntityId)

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
              <div className="absolute inset-0 flex items-center justify-center"><FileMinus className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Vendor Debit Notes &amp; Purchase Returns</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Issue debit memos to suppliers for goods returned, rate discrepancies, or purchase claims with AP deduction.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <DataToolbar
            query={query}
            setQuery={setQuery}
            searchPlaceholder="Search vendor, debit #..."
            exportFileName="debit-notes"
            exportSheetName="Debit Notes"
            exportTitle="Vendor Debit Notes"
            exportSubtitle="Supplier debit memos and return records."
            exportHeaders={exportHeaders}
            exportRows={exportRows}
            exportTotals={[{ label: 'Total Debit Value', value: totalDebit }]}
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
            className="h-9 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <span>＋</span> New Debit Note
          </button>
          </div>
        </div>
      </div>

      {/* Stats Cards (Row 2) */}
      <KpiGrid cols={3}>
        <KpiCard icon={Coins} label="TOTAL DEBIT VALUE" value={money(totalDebit)} desc="All supplier claims" tone="blue" />
        <KpiCard icon={CheckCircle} label="POSTED TO AP" value={postedCount} desc="Applied against vendor balances" tone="teal" />
        <KpiCard icon={FileMinus} label="DRAFT CLAIMS" value={draftCount} desc="Pending supplier approval" tone="violet" />
      </KpiGrid>

      {/* Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]"><span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-emerald-500 to-green-700" />Debit Notes Directory</p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Showing {filtered.length} of {notes.length} record{notes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={FileMinus} title="No debit notes found" hint='Click "＋ New Debit Note" to record a purchase return.' />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-emerald-500/[0.05] dark:bg-emerald-400/[0.07]">
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Debit Note #</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Vendor</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Reason</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--color-text-muted)]">Principal</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--color-text-muted)]">Tax Adj</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--color-text-muted)]">Total Amount</th>
                  <th className="text-center px-3 py-2 font-semibold text-[var(--color-text-muted)]">Status</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => {
                  const badge = statusStyles[n.status] || statusStyles.Draft
                  return (
                    <tr key={n.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-colors">
                      <td className="px-3 py-2 font-mono font-semibold text-[var(--color-text-strong)]">{n.debitNoteNumber}</td>
                      <td className="px-3 py-2 font-semibold text-[var(--color-text-strong)]">{n.vendorName}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{n.date}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{n.reason}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--color-text-strong)]">{money(n.amount)}</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-500">{n.taxAmount > 0 ? money(n.taxAmount) : '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-sky-600 font-mono">{money(n.totalAmount)}</td>
                      <td className="px-3 py-2 text-center">
                        <StatusChip status={n.status} label={badge.label} hex={badge.hex} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {n.status === 'Draft' && (
                            <button
                              onClick={() => handlePost(n.id)}
                              className="h-6.5 px-2 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[11px] font-semibold"
                            >
                              Post AP
                            </button>
                          )}
                          {n.status !== 'Void' && (
                            <button
                              onClick={() => handleVoid(n.id)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-500/10"
                              title="Void"
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

      {/* Stepped / Tabbed Debit Note Creation Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight">Create Vendor Debit Note</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Debit Memo
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
                <Users className="w-3 h-3" /> 1. Vendor & Date
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
                <Coins className="w-3 h-3" /> 2. Debit Amount & Tax
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
                <FileText className="w-3 h-3" /> 3. Return Reason & Summary
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
                      <span className="text-rose-500 font-bold mr-1">*</span> Vendor / Supplier
                    </label>
                    <CompactSelect
                      value={form.vendorId}
                      onChange={v => setForm({ ...form, vendorId: v })}
                      placeholder="Select vendor..."
                      searchPlaceholder="Search vendor by name or code..."
                      options={vendors.map((v: any) => ({
                        value: v.id,
                        label: v.name,
                        badge: v.vendorNumber || undefined,
                      }))}
                      className="h-10 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Debit Note Date
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

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Input Tax Reversal (Rs)
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
                        value={form.taxAmount}
                        onChange={e => setForm({ ...form, taxAmount: e.target.value })}
                        className="w-full h-full border-0 outline-none bg-transparent font-mono text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Return Reason & Supplier Claim Remarks
                    </label>
                    <textarea
                      rows={4}
                      value={form.reason}
                      onChange={e => setForm({ ...form, reason: e.target.value })}
                      placeholder="e.g. Returned rejected raw materials from PO-1020 / supplier over-billing correction..."
                      className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] outline-none shadow-2xs resize-none"
                    />
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Posting this note will debit Accounts Payable and adjust supplier outstanding balance.</span>
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-muted)]/60 border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Debit Summary</p>
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Claim Principal</span>
                      <span className="font-semibold font-mono text-[var(--color-text-strong)]">{money(Number(form.amount) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-amber-500 font-mono">
                      <span>Tax Reversal</span>
                      <span>+{money(Number(form.taxAmount) || 0)}</span>
                    </div>
                    <div className="border-t border-[var(--color-border)] pt-2.5 flex justify-between text-sm font-bold text-[var(--color-text-strong)]">
                      <span>Total Debit</span>
                      <span className="text-amber-600 font-mono">{money((Number(form.amount) || 0) + (Number(form.taxAmount) || 0))}</span>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-yellow-500/10 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[var(--color-text-strong)]">Debit Note: Auto-generated</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">Draft Debit Note</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Vendor: <strong>{vendors.find((v: any) => v.id === form.vendorId)?.name || 'Selected Vendor'}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div><span className="text-[var(--color-text-muted)] block text-[11px]">Debit Note Date:</span><strong>{form.date}</strong></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 shadow-2xs">
                      <p className="font-bold text-[var(--color-text-strong)] border-b border-[var(--color-border)] pb-2">Debit Amount Breakdown</p>
                      <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Claim Principal:</span><span className="font-semibold font-mono text-[var(--color-text-strong)]">{money(Number(form.amount) || 0)}</span></div>
                      <div className="flex justify-between text-amber-600 font-mono"><span>Input Tax Reversal:</span><span>+{money(Number(form.taxAmount) || 0)}</span></div>
                      <div className="flex justify-between font-bold text-amber-600 font-mono border-t border-[var(--color-border)] pt-2">
                        <span>Total Debit Claim:</span>
                        <span className="text-base">{money((Number(form.amount) || 0) + (Number(form.taxAmount) || 0))}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
                      <p className="font-bold text-[var(--color-text-strong)] border-b border-[var(--color-border)] pb-2">Return Reason & Journal Impact</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{form.reason || 'Reason not specified.'}</p>
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-700">
                        <strong>GAAP Journal Entry (Auto-posted):</strong><br />
                        Dr Accounts Payable (Reduce Supplier Balance)<br />
                        Cr Purchase Returns / Input Tax Recovery
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
                <button type="button" className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors" onClick={() => setShowCreate(false)}>Cancel</button>
                {modalTab !== 'details' && (
                  <button type="button" onClick={() => { if (modalTab === 'preview') setModalTab('summary'); else if (modalTab === 'summary') setModalTab('items'); else if (modalTab === 'items') setModalTab('details'); }} className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    <span>{modalTab === 'preview' ? 'Back to Edit' : 'Back'}</span>
                  </button>
                )}
                {modalTab !== 'preview' ? (
                  <button type="button" onClick={() => { if (modalTab === 'details') { if (!form.vendorId) { notify('Please select a vendor.'); return } setModalTab('items') } else if (modalTab === 'items') { setModalTab('summary') } else if (modalTab === 'summary') { setModalTab('preview') } }} className="h-9 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5">
                    <span>{modalTab === 'details' ? 'Next: Amount & Tax' : modalTab === 'items' ? 'Next: Reason & Summary' : 'Preview & Review'}</span>
                    {modalTab === 'summary' ? <Eye className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                  </button>
                ) : (
                  <button type="button" onClick={handleCreate} className="h-9 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-lg shadow-amber-500/25 flex items-center gap-1.5">
                    <Check className="w-3 h-3" />
                    <span>Confirm & Create Debit Note</span>
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

export default DebitNotes
