import React, { useState, useEffect, useMemo } from 'react'
import { useVendorsStore } from './stores'
import { vendorPaymentsApi, type VendorPayment, type WithdrawAccount, type VendorBillLite } from './api/modules/vendorPayments.api'
import { useFormDraft } from './hooks/useFormDraft'
import {
  Check, X, ArrowRight, ArrowLeft, Coins,
  Users, CreditCard, ShieldCheck, FileText, Eye, Download,
  DollarSign, Zap, BarChart3
} from 'lucide-react'
import { DataToolbar } from '@/components/ui/data-toolbar'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import { EmptyState, TableSkeleton } from './components/ui/empty-state'
import { StatusChip } from './components/ui/status-chip'
import { CompactSelect } from './components/CompactSelect'
import { money } from '@/lib/currency'
import type { Entity } from './EntitySettings'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type PaymentMode = 'ACH' | 'Wire Transfer' | 'Cheque / Pay Order' | 'SWIFT' | 'RTGS' | 'Credit Card' | 'Direct Debit' | 'Online Banking'

const MODE_METHOD: Record<string, string> = {
  'Wire Transfer': 'WireTransfer',
  'ACH': 'ACH',
  'Cheque / Pay Order': 'Cheque',
  'SWIFT': 'WireTransfer',
  'RTGS': 'BankTransfer',
  'Credit Card': 'CreditCard',
  'Direct Debit': 'DirectDebit',
  'Online Banking': 'OnlineBanking',
}

const statusStyles: Record<string, { label: string; hex: string }> = {
  Completed: { label: 'Completed', hex: '#10b981' },
  Pending: { label: 'Pending', hex: '#f59e0b' },
  Failed: { label: 'Failed', hex: '#ef4444' }
}

const getNextPaymentReference = (allPayments: VendorPayment[] = []): string => {
  let maxSeq = 0;
  for (const p of allPayments) {
    if (!p?.reference) continue;
    const match = p.reference.match(/PAY-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq && num < 1000000) {
        maxSeq = num;
      }
    }
  }
  return `PAY-${String(maxSeq + 1).padStart(5, '0')}`;
};

interface VendorPaymentsViewProps {
  activeEntityId: string
  entities?: Entity[]
}

export const VendorPaymentsView: React.FC<VendorPaymentsViewProps> = ({
  activeEntityId,
  entities = []
}) => {
  const currentEntity = entities.find(e => e.id === activeEntityId)
  const [payments, setPayments] = useState<VendorPayment[]>([])
  const [loading, setLoading] = useState(false)
  const vendors = useVendorsStore((s) => s.vendors)
  const fetchVendors = useVendorsStore((s) => s.fetchVendors)
  const [query, setQuery] = useState('')
  const [selectedMode, setSelectedMode] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'vendor' | 'account' | 'summary' | 'preview'>('vendor')
  const [withdrawAccounts, setWithdrawAccounts] = useState<WithdrawAccount[]>([])
  const [bills, setBills] = useState<VendorBillLite[]>([])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    vendorId: '',
    billId: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Wire Transfer' as PaymentMode,
    withdrawFromAccountId: '',
    amount: '',
    currency: 'PKR',
    reference: 'PAY-00001',
    description: 'Vendor invoice payment disbursement.'
  })

  // Listen for 1-click 'Pay Bill' from Vendor Bills Workspace
  useEffect(() => {
    const raw = localStorage.getItem('ams_pending_vendor_payment');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        localStorage.removeItem('ams_pending_vendor_payment');
        if (parsed.vendorId) {
          setForm(prev => ({
            ...prev,
            vendorId: parsed.vendorId,
            billId: parsed.billId || '',
            amount: parsed.amount ? String(parsed.amount) : prev.amount
          }));
          setIsModalOpen(true);
        }
      } catch {}
    }
  }, []);

  const { saveDraft, clearDraft } = useFormDraft('vendor_payment', form, setForm, isModalOpen)

  const loadPayments = async () => {
    setLoading(true)
    try {
      const data = await vendorPaymentsApi.getAll(activeEntityId || undefined)
      setPayments(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadPayments()
    fetchVendors(activeEntityId)
    vendorPaymentsApi.getWithdrawAccounts().then(setWithdrawAccounts).catch(() => {})
  }, [activeEntityId])

  useEffect(() => {
    if (!isModalOpen) return
    vendorPaymentsApi.getBills().then(setBills).catch(() => {})
  }, [isModalOpen])

  const notify = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3500)
  }

  const openCreateModal = () => {
    setForm({
      vendorId: vendors[0]?.id || '',
      billId: '',
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMode: 'Wire Transfer',
      withdrawFromAccountId: withdrawAccounts[0]?.id || '',
      amount: '',
      currency: 'PKR',
      reference: getNextPaymentReference(payments),
      description: 'Vendor invoice payment disbursement.'
    })
    setModalTab('vendor')
    setFormError('')
    setIsModalOpen(true)
  }

  const onVendorChange = (vendorId: string) => {
    setForm({ ...form, vendorId, billId: '', amount: '' })
    vendorPaymentsApi.getBills(vendorId).then(b => {
      setBills(b)
      if (b.length > 0) {
        setForm(prev => ({ ...prev, vendorId, billId: b[0].id, amount: String(b[0].amountDue) }))
      }
    }).catch(() => {})
  }

  const onBillChange = (billId: string) => {
    const bill = bills.find(b => b.id === billId)
    setForm({
      ...form,
      billId,
      vendorId: bill ? bill.vendorId : form.vendorId,
      amount: bill ? String(bill.amountDue) : form.amount,
    })
  }

  const handleCreatePayment = async () => {
    setFormError('')
    const amt = parseFloat(form.amount)
    if (!form.vendorId) { setFormError('Please select a vendor.'); return }
    if (isNaN(amt) || amt <= 0) { setFormError('Amount must be greater than zero.'); return }
    if (!form.withdrawFromAccountId) { setFormError('Please select a funding bank account.'); return }

    setSaving(true)
    try {
      await vendorPaymentsApi.create({
        vendorId: form.vendorId,
        billId: form.billId || undefined,
        paymentDate: form.paymentDate,
        amount: amt,
        paymentMethod: MODE_METHOD[form.paymentMode] || 'BankTransfer',
        withdrawFromAccountId: form.withdrawFromAccountId,
        reference: form.reference || undefined,
        memo: form.description || undefined,
        companyId: activeEntityId || undefined,
      })
      clearDraft()
      setIsModalOpen(false)
      notify('✓ Vendor payment recorded & AP liability settled!')
      loadPayments()
    } catch (e: any) {
      setFormError(e?.message || 'Failed to record payment.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => {
    return payments.filter(p => {
      if (selectedMode !== 'All' && p.paymentMethod !== selectedMode) return false
      if (query.trim()) {
        const lower = query.toLowerCase()
        const matchesVendor = (p.vendorName || '').toLowerCase().includes(lower)
        const matchesRef = (p.reference || p.paymentNumber || '').toLowerCase().includes(lower)
        const matchesBank = (p.withdrawFromAccountName || p.bankAccountName || '').toLowerCase().includes(lower)
        if (!matchesVendor && !matchesRef && !matchesBank) return false
      }
      return true
    })
  }, [payments, query, selectedMode])

  const exportHeaders = ['Payment Number', 'Date', 'Vendor', 'Bill', 'Amount', 'Mode', 'Bank Account', 'Reference', 'Status']
  const exportRows = filtered.map(p => [
    p.paymentNumber || '',
    p.date,
    p.vendorName || '',
    p.billNumber || '',
    p.amount,
    p.paymentMethod,
    p.withdrawFromAccountName || p.bankAccountName || '',
    p.reference || '',
    p.status,
  ])

  const totalDisbursed = filtered.reduce((s, p) => s + (p.amount || 0), 0)
  const bankPaymentsCount = filtered.filter(p => p.paymentMethod === 'WireTransfer' || p.paymentMethod === 'BankTransfer' || p.paymentMethod === 'ACH').length

  const generateRemittancePDF = (p: VendorPayment) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    const darkColor: [number, number, number] = [15, 23, 42];
    const grayColor: [number, number, number] = [100, 116, 139];
    const lightBg: [number, number, number] = [248, 250, 252];
    const borderGray: [number, number, number] = [226, 232, 240];

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT REMITTANCE ADVICE', margin, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Ref: ${p.paymentNumber || p.reference || 'PAY'}`, margin, 21);
    doc.text(`Disbursement Date: ${p.date}`, pageWidth - margin, 14, { align: 'right' });
    doc.text(`Entity: ${currentEntity?.name || 'Company ERP'}`, pageWidth - margin, 21, { align: 'right' });

    // Details Grid
    const boxY = 34;
    const boxH = 36;
    const colW = (contentWidth - 6) / 2;

    // Supplier Box
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(margin, boxY, colW, boxH, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BENEFICIARY / SUPPLIER', margin + 4, boxY + 7);

    doc.setFontSize(10);
    doc.text(p.vendorName || 'Supplier', margin + 4, boxY + 14);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Supplier ID: ${p.vendorId.slice(0, 12)}`, margin + 4, boxY + 20);
    doc.text(`Status: ${p.status || 'Completed'}`, margin + 4, boxY + 25);

    // Payment Channel Box
    const chanX = margin + colW + 6;
    doc.setFillColor(...lightBg);
    doc.roundedRect(chanX, boxY, colW, boxH, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('DISBURSEMENT CHANNEL & BANK', chanX + 4, boxY + 7);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Funding Account: ${p.withdrawFromAccountName || p.bankAccountName || 'Main Operating Account'}`, chanX + 4, boxY + 14);
    doc.text(`Payment Method: ${p.paymentMethod}`, chanX + 4, boxY + 20);
    doc.text(`Transaction Reference: ${p.reference || 'N/A'}`, chanX + 4, boxY + 26);

    // Amount Banner
    const bannerY = boxY + boxH + 6;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, bannerY, contentWidth, 18, 2, 2, 'FD');

    doc.setTextColor(22, 101, 52);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT DISBURSED', margin + 4, bannerY + 6.5);

    doc.setFontSize(14);
    doc.text(money(p.amount), margin + 4, bannerY + 14);

    // Settled Invoices Table
    const tableStartY = bannerY + 24;
    const tableHeaders = ['Bill Reference #', 'Payment Date', 'Payment Mode', 'Funding Bank Account', 'Amount Settled'];
    const tableRows = [[
      p.billNumber || 'Unallocated / On-Account',
      p.date,
      p.paymentMethod,
      p.withdrawFromAccountName || p.bankAccountName || 'Operating Bank',
      money(p.amount),
    ]];

    autoTable(doc, {
      startY: tableStartY,
      head: [tableHeaders],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, textColor: darkColor },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold' },
      },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setTextColor(...grayColor);
    doc.setFontSize(7);
    doc.text('Official Disbursement Remittance Advice. Generated from ERP Accounts Payable Module.', margin, pageHeight - 9);

    const cleanRef = (p.paymentNumber || p.reference || 'Payment').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Remittance_Advice_${cleanRef}.pdf`);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="z-[9999] px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold">
          {toast}
        </div>
      )}

      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-teal-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-teal-500 to-emerald-700" />
              <div className="absolute inset-0 flex items-center justify-center"><CreditCard className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Vendor Payments &amp; Disbursements</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400"><span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Disburse payments to suppliers, reconcile bank withdrawals, and extinguish Accounts Payable liabilities.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <DataToolbar
            query={query}
            setQuery={setQuery}
            searchPlaceholder="Search vendor, reference, bank..."
            exportFileName="vendor-payments"
            exportSheetName="Vendor Payments"
            exportTitle="Vendor Payments Register"
            exportSubtitle="Supplier payments and bank disbursement records."
            exportHeaders={exportHeaders}
            exportRows={exportRows}
            exportTotals={[{ label: 'Total Disbursed', value: totalDisbursed }]}
          >
            <select
              className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors shadow-2xs box-border"
              value={selectedMode}
              onChange={e => setSelectedMode(e.target.value)}
            >
              <option value="All">⚡ All Payment Modes</option>
              <option value="WireTransfer">🏦 Wire Transfer / SWIFT</option>
              <option value="BankTransfer">⚡ RTGS / 1Link</option>
              <option value="Cheque">📜 Cheque / Pay Order</option>
              <option value="ACH">💳 ACH / Direct Debit</option>
              <option value="CreditCard">💳 Credit Card</option>
            </select>
          </DataToolbar>
          <button
            onClick={openCreateModal}
            className="h-9 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <span>＋</span> Record Payment
          </button>
          </div>
        </div>
      </div>

      {/* Stats Cards (KPI Design) */}
      <KpiGrid cols={3}>
        <KpiCard icon={DollarSign} label="TOTAL DISBURSED" value={money(totalDisbursed)} desc="Settled vendor liabilities" tone="emerald" />
        <KpiCard icon={Zap} label="ELECTRONIC TRANSFERS" value={bankPaymentsCount} desc="Bank wires & RTGS settlements" tone="teal" />
        <KpiCard icon={BarChart3} label="TOTAL TRANSACTIONS" value={filtered.length} desc="All recorded payments" tone="violet" />
      </KpiGrid>

      {/* Payments Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]"><span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-teal-500 to-emerald-700" />Disbursements Register</p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Showing {filtered.length} of {payments.length} record{payments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Coins} title="No payments found" hint="No payments found matching your criteria. Adjust your search or payment mode filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-teal-500/[0.05] dark:bg-teal-400/[0.07]">
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Payment #</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Vendor</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Bill Ref</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Funding Account</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Mode</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--color-text-muted)]">Amount (Rs)</th>
                  <th className="text-center px-3 py-2 font-semibold text-[var(--color-text-muted)]">Status</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--color-text-muted)]">Remittance Advice</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const badge = statusStyles[p.status] || statusStyles.Completed
                  return (
                    <tr key={p.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-colors">
                      <td className="px-3 py-2 font-mono font-semibold text-[var(--color-text-strong)]">{p.paymentNumber || p.reference || '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)] whitespace-nowrap">{p.date}</td>
                      <td className="px-3 py-2 font-semibold text-[var(--color-text-strong)]">{p.vendorName || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[var(--color-text-muted)]">{p.billNumber || '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{p.withdrawFromAccountName || p.bankAccountName || 'Bank Account'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{p.paymentMethod}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">{money(p.amount)}</td>
                      <td className="px-3 py-2 text-center">
                        <StatusChip status={p.status} label={badge.label} hex={badge.hex} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => generateRemittancePDF(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold transition-all shadow-2xs"
                          title="Download Remittance Advice PDF"
                        >
                          <Download className="w-3 h-3" /> Remittance PDF
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stepped / Tabbed Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight">Record Supplier Payment</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Disbursement
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
                onClick={() => setIsModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <button
                type="button"
                onClick={() => setModalTab('vendor')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  modalTab === 'vendor'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <Users className="w-3 h-3" /> 1. Vendor & Bill Reference
              </button>

              <button
                type="button"
                onClick={() => setModalTab('account')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  modalTab === 'account'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <Coins className="w-3 h-3" /> 2. Bank Account & Amount
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
                <FileText className="w-3 h-3" /> 3. Verification & Settle
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
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              {modalTab === 'vendor' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      <span className="text-rose-500 font-bold mr-1">*</span> Vendor / Supplier
                    </label>
                    <CompactSelect
                      value={form.vendorId}
                      onChange={v => onVendorChange(v)}
                      placeholder="Select a vendor..."
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
                      Apply to Open Bill (Optional)
                    </label>
                    <CompactSelect
                      value={form.billId}
                      onChange={v => onBillChange(v)}
                      placeholder="-- Direct Advance / On-Account Payment --"
                      searchPlaceholder="Search bill by number..."
                      clearLabel="-- Direct Advance / On-Account Payment --"
                      options={bills.map(b => ({
                        value: b.id,
                        label: b.billNumber,
                        sublabel: `Due: ${money(b.amountDue)}`,
                      }))}
                      className="h-10 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={form.paymentDate}
                      onChange={e => setForm({ ...form, paymentDate: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'account' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      <span className="text-rose-500 font-bold mr-1">*</span> Withdraw From Bank / Cash Account
                    </label>
                    <CompactSelect
                      value={form.withdrawFromAccountId}
                      onChange={v => setForm({ ...form, withdrawFromAccountId: v })}
                      placeholder="Select funding account..."
                      searchPlaceholder="Search bank / cash account..."
                      options={withdrawAccounts.map(acc => ({
                        value: acc.id,
                        label: `${acc.code} — ${acc.name}`,
                        badge: 'Bank/Cash'
                      }))}
                      className="h-10 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Payment Method
                    </label>
                    <select
                      value={form.paymentMode}
                      onChange={e => setForm({ ...form, paymentMode: e.target.value as PaymentMode })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    >
                      <option value="Wire Transfer">Wire Transfer / SWIFT</option>
                      <option value="ACH">RTGS / 1Link / Bank Transfer</option>
                      <option value="Cheque / Pay Order">Cheque / Pay Order</option>
                      <option value="Credit Card">Corporate Credit Card</option>
                      <option value="Direct Debit">Direct Debit</option>
                      <option value="Online Banking">Online Banking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      <span className="text-rose-500 font-bold mr-1">*</span> Disbursement Amount (Rs)
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
                        Payment Reference / Cheque #
                      </label>
                      <input
                        placeholder="e.g. CHQ-9901, FT-88219"
                        value={form.reference}
                        onChange={e => setForm({ ...form, reference: e.target.value })}
                        className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                        Memo / Description
                      </label>
                      <textarea
                        rows={3}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="Payment details, invoice reference..."
                        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] outline-none shadow-2xs resize-none"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Posting automatically debits Accounts Payable (20000) and credits the Funding Bank Account (10100).</span>
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-muted)]/60 border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Payment Voucher</p>
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Method</span>
                      <span className="font-semibold text-[var(--color-text-strong)]">{form.paymentMode}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Currency</span>
                      <span className="font-semibold text-[var(--color-text-strong)]">{form.currency}</span>
                    </div>
                    <div className="border-t border-[var(--color-border)] pt-2.5 flex justify-between text-sm font-bold text-[var(--color-text-strong)]">
                      <span>Total Paid</span>
                      <span className="text-emerald-600 font-mono">{money(parseFloat(form.amount || '0'))}</span>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-green-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[var(--color-text-strong)]">Vendor Payment Voucher</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Pending Confirmation</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Vendor: <strong>{vendors.find((v: any) => v.id === form.vendorId)?.name || 'Selected Vendor'}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div><span className="text-[var(--color-text-muted)] block text-[11px]">Payment Date:</span><strong>{form.paymentDate}</strong></div>
                      <div><span className="text-[var(--color-text-muted)] block text-[11px]">Currency:</span><strong className="font-mono">{form.currency}</strong></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 shadow-2xs">
                      <p className="font-bold text-[var(--color-text-strong)] border-b border-[var(--color-border)] pb-2">Payment Details</p>
                      <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Payment Method:</span><span className="font-semibold">{form.paymentMode}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Reference / Cheque #:</span><span className="font-mono">{form.reference || '—'}</span></div>
                      {form.billId && <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Applied to Bill:</span><span className="font-mono">{bills.find(b => b.id === form.billId)?.billNumber || form.billId}</span></div>}
                      <div className="flex justify-between font-bold text-emerald-600 font-mono border-t border-[var(--color-border)] pt-2">
                        <span>Total Amount Paid:</span>
                        <span className="text-base">{money(parseFloat(form.amount || '0'))}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
                      <p className="font-bold text-[var(--color-text-strong)] border-b border-[var(--color-border)] pb-2">Memo & Journal Impact</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{form.description || 'No memo provided.'}</p>
                      <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] text-emerald-700">
                        <strong>GAAP Journal Entry (Auto-posted):</strong><br />
                        Dr Accounts Payable 20000<br />
                        Cr Funding Bank Account 10100
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
                <button type="button" className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors" onClick={() => setIsModalOpen(false)}>Cancel</button>

                {modalTab !== 'vendor' && (
                  <button type="button" onClick={() => { if (modalTab === 'preview') setModalTab('summary'); else if (modalTab === 'summary') setModalTab('account'); else if (modalTab === 'account') setModalTab('vendor'); }} className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    <span>{modalTab === 'preview' ? 'Back to Edit' : 'Back'}</span>
                  </button>
                )}

                {modalTab !== 'preview' ? (
                  <button type="button" onClick={() => {
                    if (modalTab === 'vendor') { if (!form.vendorId) { setFormError('Please select a vendor.'); return } setModalTab('account') }
                    else if (modalTab === 'account') { if (!form.withdrawFromAccountId) { setFormError('Please select a bank account.'); return } if (parseFloat(form.amount || '0') <= 0) { setFormError('Please enter a valid amount.'); return } setModalTab('summary') }
                    else if (modalTab === 'summary') { setModalTab('preview') }
                  }} className="h-8.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5">
                    <span>{modalTab === 'vendor' ? 'Next: Funding Bank' : modalTab === 'account' ? 'Next: Verification & Settle' : 'Preview & Review'}</span>
                    {modalTab === 'summary' ? <Eye className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                  </button>
                ) : (
                  <button type="button" onClick={handleCreatePayment} disabled={saving} className="h-8.5 px-5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5 disabled:opacity-40">
                    <Check className="w-3 h-3" />
                    <span>{saving ? 'Recording...' : 'Confirm & Record Payment'}</span>
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
