import { useState, useEffect, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  FileText, Plus, Check, X, ArrowRight,
  ArrowLeft, Coins, CheckCircle2, Hash, Users, Eye, Pencil, Ban,
  Download, ChevronDown
} from 'lucide-react'
import { useSalesStore, useCustomersStore, useProductsStore, useCompanyStore } from './stores'
import { useFormDraft } from './hooks/useFormDraft'
import { KpiCard, KpiGrid } from './components/ui/kpi-card'
import { StatusChip } from './components/ui/status-chip'
import { EmptyState, TableSkeleton } from './components/ui/empty-state'
import { getActiveTaxCodes } from './lib/taxLocalization'
import { getGlobalNextInvoiceNumber } from './lib/invoiceNumbering'

import { money } from './lib/currency'
import { CompactTaxSelect } from './components/CompactTaxSelect'
import { CompactDiscountTypeSelect } from './components/CompactDiscountTypeSelect'
import { CompactProductSelect } from './components/CompactProductSelect'
import { CompactSelect } from './components/CompactSelect'

const statusStyles: Record<number, { label: string; hex: string }> = {
  0: { label: 'Draft', hex: '#94a3b8' },
  1: { label: 'Sent', hex: '#0ea5e9' },
  2: { label: 'Finalized', hex: '#10b981' },
  3: { label: 'Cancelled', hex: '#ef4444' },
  4: { label: 'Expired', hex: '#f59e0b' },
  5: { label: 'Invoiced', hex: '#8b5cf6' },
}

export const getNumericStatus = (status: any): number => {
  if (typeof status === 'number') return status
  if (!status) return 0
  const s = String(status).toLowerCase().trim()
  if (s === '2' || s === 'accepted' || s === 'finalized' || s === 'approved') return 2
  if (s === '3' || s === 'rejected' || s === 'cancelled' || s === 'canceled' || s === 'declined') return 3
  if (s === '1' || s === 'sent') return 1
  if (s === '4' || s === 'expired') return 4
  if (s === '5' || s === 'invoiced') return 5
  return 0
}

interface Line {
  productId: string
  productName: string
  description: string
  quantity: string
  unitPrice: string
  discountType: 0 | 1
  discountValue: string
  taxPercent: string
}

const defaultLine = (): Line => ({
  productId: '',
  productName: '',
  description: '',
  quantity: '1',
  unitPrice: '0',
  discountType: 0,
  discountValue: '0',
  taxPercent: '0',
})

export const EstimatesAndQuotes: React.FC<{ activeEntityId: string; entities?: any[] }> = ({
  activeEntityId
}) => {
  const allEntities = useCompanyStore((s) => s.entities)
  const estimates = useSalesStore((s) => s.estimates)
  const fetchEstimates = useSalesStore((s) => s.fetchEstimates)
  const fetchInvoices = useSalesStore((s) => s.fetchInvoices)
  const createEstimateStore = useSalesStore((s) => s.createEstimate)
  const updateEstimateStatusStore = useSalesStore((s) => s.updateEstimateStatus)
  const customers = useCustomersStore((s) => s.customers)
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers)
  const products = useProductsStore((s) => s.products)
  const fetchProducts = useProductsStore((s) => s.fetchProducts)

  const applicableTaxCodes = useMemo(() => getActiveTaxCodes(), [activeEntityId])

  const uniqueTaxRates = useMemo(() => {
    const seen = new Set<number>()
    const list: { rate: number; label: string; code: string }[] = []
    for (const tc of applicableTaxCodes) {
      if (!seen.has(tc.rate)) {
        seen.add(tc.rate)
        list.push({ rate: tc.rate, label: tc.label, code: tc.code })
      }
    }
    return list.sort((a, b) => a.rate - b.rate)
  }, [applicableTaxCodes])

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [modalTab, setModalTab] = useState<'details' | 'lines' | 'summary' | 'preview'>('details')
  const [convertModal, setConvertModal] = useState<any>(null)
  const [viewingEstimate, setViewingEstimate] = useState<any>(null)
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editingEstimate, setEditingEstimate] = useState<any>(null)
  const [pendingEstimateNumber, setPendingEstimateNumber] = useState<string>('')

  const [form, setForm] = useState({
    customerId: '',
    estimateDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    reference: '',
    notes: '',
    terms: 'Payment due within 30 days of invoice date.',
    currencyCode: 'PKR'
  })

  const [lines, setLines] = useState<Line[]>([defaultLine()])

  const { saveDraft, clearDraft } = useFormDraft('estimate_quote', { form, lines }, (saved: any) => {
    if (saved.form) setForm(saved.form)
    if (saved.lines) setLines(saved.lines)
  }, showForm, !!editingEstimate)

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchEstimates(activeEntityId),
        fetchInvoices(activeEntityId),
        fetchCustomers(activeEntityId),
        fetchProducts()
      ])
    } catch { /* empty */ }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [activeEntityId])

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const computeNextEstimateNumber = () => {
    let maxNum = 0
    for (const item of estimates) {
      const str = (item.estimateNumber || item.reference || '') + ''
      const match = str.match(/EST-(\d+)/)
      if (match) { const num = parseInt(match[1], 10); if (!isNaN(num) && num < 100000 && num > maxNum) maxNum = num }
    }
    return `EST-${(maxNum + 1).toString().padStart(5, '0')}`
  }

  const openCreateModal = () => {
    setEditingEstimate(null)
    clearDraft()
    // Reuse pending number if exists, otherwise generate new one
    const nextRef = pendingEstimateNumber || computeNextEstimateNumber()
    if (!pendingEstimateNumber) {
      setPendingEstimateNumber(nextRef)
    }
    const today = new Date().toISOString().slice(0, 10)
    setForm({ customerId: customers[0]?.id || '', estimateDate: today, expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), reference: nextRef, notes: 'Quotations valid for 30 days from date of issue.', terms: 'Standard trade terms apply.', currencyCode: 'PKR' })
    setLines([defaultLine()])
    setModalTab('details')
    setShowForm(true)
  }

  const handleCancelForm = () => { clearDraft(); setShowForm(false); setEditingEstimate(null) }

  const openEditModal = (est: any) => {
    setEditingEstimate(est)
    setForm({ customerId: est.customerId || '', estimateDate: est.estimateDate || new Date().toISOString().slice(0, 10), expiryDate: est.expiryDate || '', reference: est.estimateNumber || est.reference || '', notes: est.notes || '', terms: est.terms || '', currencyCode: est.currencyCode || 'PKR' })
    setLines(est.lines && est.lines.length > 0 ? est.lines.map((l: any) => { const prod = products.find((p: any) => p.id === l.productId); return { productId: l.productId || '', productName: l.productName || prod?.name || l.description || '', description: l.description || '', quantity: String(l.quantity || 1), unitPrice: String(l.unitPrice || 0), discountType: l.discountType ?? 0, discountValue: String(l.discountValue || l.discountAmount || 0), taxPercent: String(l.taxPercent || 0) } }) : [defaultLine()])
    setModalTab('details')
    setShowForm(true)
  }

  const finalizeEstimate = async (est: any) => { try { await updateEstimateStatusStore(est.id, '2'); notify(`Quotation ${est.estimateNumber || est.reference} Finalized!`); await fetchData() } catch (e: any) { notify(e.message || 'Failed to finalize') } }
  const cancelEstimate = async (est: any) => { try { await updateEstimateStatusStore(est.id, '3'); notify(`Quotation ${est.estimateNumber || est.reference} Cancelled.`); await fetchData() } catch (e: any) { notify(e.message || 'Failed to cancel') } }

  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...lines]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'productId' && value) { const prod = products.find((p: any) => p.id === value); if (prod) { updated[i].productName = prod.name || ''; updated[i].description = updated[i].description || prod.name || ''; updated[i].unitPrice = String(prod.salesPrice || prod.unitPrice || updated[i].unitPrice) } }
    setLines(updated)
  }

  const addLine = () => setLines([...lines, defaultLine()])
  const removeLine = (idx: number) => setLines(lines.filter((_, j) => j !== idx))

  const calculateLineTotals = () => lines.map(line => {
    const qty = parseFloat(line.quantity) || 0; const price = parseFloat(line.unitPrice) || 0; const gross = qty * price
    const dv = parseFloat(line.discountValue) || 0; const dt = line.discountType || 0
    const da = dt === 0 ? (gross * dv) / 100 : Math.min(dv, gross)
    const taxable = Math.max(0, gross - da); const tp = parseFloat(line.taxPercent) || 0; const ta = (taxable * tp) / 100
    return { gross, discountAmount: da, taxable, taxAmount: ta, total: taxable + ta }
  })

  const calculateTotals = () => {
    const lt = calculateLineTotals()
    return { sub: lt.reduce((s, l) => s + l.gross, 0), disc: lt.reduce((s, l) => s + l.discountAmount, 0), tax: lt.reduce((s, l) => s + l.taxAmount, 0), total: lt.reduce((s, l) => s + l.total, 0) }
  }

  const lineCalculations = calculateLineTotals()
  const totals = calculateTotals()

  const saveEstimate = async () => {
    if (!form.customerId) { notify('Please select a customer.'); return }
    const isGuid = (val?: string | null) => !!val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val)

    const body = {
      estimateNumber: form.reference || null,
      customerId: isGuid(form.customerId) ? form.customerId : form.customerId,
      estimateDate: form.estimateDate || new Date().toISOString().slice(0, 10),
      expiryDate: form.expiryDate || null,
      reference: form.reference || null,
      notes: form.notes || null,
      terms: form.terms || null,
      companyId: isGuid(activeEntityId) ? activeEntityId : null,
      lines: lines.map(l => ({
        productId: isGuid(l.productId) ? l.productId : null,
        description: l.description || l.productName || 'Item',
        quantity: parseFloat(l.quantity || '1') || 1,
        unitPrice: parseFloat(l.unitPrice || '0') || 0,
        discountType: l.discountType === 1 ? 1 : 0,
        discountValue: parseFloat(l.discountValue || '0') || 0,
        taxCodeId: null,
        taxPercent: parseFloat(l.taxPercent || '0') || 0
      }))
    }
    try { 
      await createEstimateStore(body); 
      clearDraft(); 
      setPendingEstimateNumber(''); // Clear pending number after successful save
      notify(editingEstimate ? 'Quotation updated!' : 'Quotation saved as Draft!'); 
      setShowForm(false); 
      fetchData() 
    } catch (e: any) { notify(e.message || 'Error saving quotation') }
  }

  const convertQuoteToInvoice = (est: any) => {
    const quoteLines = (est.lines && est.lines.length > 0)
      ? est.lines.map((l: any) => ({
          productId: l.productId || '',
          productName: l.productName || l.description || '',
          description: l.description || l.productName || '',
          quantity: String(l.quantity || 1),
          unitPrice: String(l.unitPrice || 0),
          discountType: l.discountType ?? 0,
          discountValue: String(l.discountValue ?? l.discountAmount ?? 0),
          taxPercent: String(l.taxPercent ?? 0)
        }))
      : [{
          productId: '',
          productName: est.customerName ? `${est.customerName} - Items` : 'Items',
          description: est.customerName ? `${est.customerName} - Items` : 'Items',
          quantity: '1',
          unitPrice: String(est.totalAmount || est.subtotal || 0),
          discountType: 0,
          discountValue: String(est.discountTotal || 0),
          taxPercent: '0'
        }];

    const nextInvRef = getGlobalNextInvoiceNumber();

    const payload = {
      estimateId: est.id,
      estimateNumber: est.estimateNumber || est.reference,
      customerId: est.customerId || '',
      customerName: est.customerName || '',
      notes: est.notes || '',
      currencyCode: est.currencyCode || 'PKR',
      reference: nextInvRef,
      lines: quoteLines
    };

    localStorage.setItem('ams_pending_invoice_from_quote', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('ams_navigate', { detail: 'Sales & Customers.Sales Invoices' }));
  };

  const filteredEstimates = useMemo(() => {
    return estimates
      .filter((est: any) => {
        const sn = getNumericStatus(est.status);
        const mq = !query.trim() ? true : `${est.estimateNumber || ''} ${est.customerName || ''} ${est.reference || ''}`.toLowerCase().includes(query.toLowerCase());
        const ms = statusFilter === 'all' || String(sn) === statusFilter;
        return mq && ms;
      })
      .sort((a: any, b: any) => {
        const dateA = a.estimateDate || '';
        const dateB = b.estimateDate || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const numA = a.estimateNumber || a.reference || '';
        const numB = b.estimateNumber || b.reference || '';
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [estimates, query, statusFilter]);

  const getFormattedEstimateNumber = (rawNum: string, index: number) => {
    if (!rawNum || rawNum.startsWith('EST-202') || rawNum.length > 10 || rawNum.includes('/')) return `EST-${(index + 1).toString().padStart(5, '0')}`
    return rawNum
  }

  const assignedCompany = allEntities?.find((e: any) => e.id === activeEntityId)

  const stats = useMemo(() => {
    const drafts = estimates.filter((e: any) => getNumericStatus(e.status) === 0)
    const pipeline = estimates.filter((e: any) => getNumericStatus(e.status) === 1)
    const accepted = estimates.filter((e: any) => getNumericStatus(e.status) === 2)
    const cancelled = estimates.filter((e: any) => getNumericStatus(e.status) === 3 || getNumericStatus(e.status) === 4)
    const invoiced = estimates.filter((e: any) => getNumericStatus(e.status) === 5)

    const draftValue = drafts.reduce((s: number, e: any) => s + (parseFloat(e.totalAmount) || 0), 0)
    const pipelineValue = pipeline.reduce((s: number, e: any) => s + (parseFloat(e.totalAmount) || 0), 0)
    const acceptedValue = accepted.reduce((s: number, e: any) => s + (parseFloat(e.totalAmount) || 0), 0)
    const invoicedValue = invoiced.reduce((s: number, e: any) => s + (parseFloat(e.totalAmount) || 0), 0)
    const totalValue = pipelineValue + acceptedValue + invoicedValue

    return {
      draftCount: drafts.length,
      draftValue,
      pipelineCount: pipeline.length,
      pipelineValue,
      acceptedCount: accepted.length,
      acceptedValue,
      cancelledCount: cancelled.length,
      invoicedCount: invoiced.length,
      invoicedValue,
      totalActiveCount: estimates.length - cancelled.length,
      totalValue
    }
  }, [estimates])

  const downloadQuotePdf = (est: any, index?: number) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const quoteNum = getFormattedEstimateNumber(est.estimateNumber || est.reference, index ?? 0)
      const compName = assignedCompany?.name || 'Muhammad Ali Enterprises'
      const statusNum = getNumericStatus(est.status)
      const statusLabel = statusStyles[statusNum]?.label || 'Draft'
      const pageW = doc.internal.pageSize.getWidth()
      const tealDark: [number, number, number] = [1, 72, 113]
      const mintLight: [number, number, number] = [160, 235, 207]
      const tealMid: [number, number, number] = [30, 130, 160]

      // Gradient Header Banner
      for (let x = 0; x < pageW; x++) { const r = x / pageW; doc.setFillColor(Math.round(tealDark[0] + (mintLight[0] - tealDark[0]) * r), Math.round(tealDark[1] + (mintLight[1] - tealDark[1]) * r), Math.round(tealDark[2] + (mintLight[2] - tealDark[2]) * r)); doc.rect(x, 0, 1, 42, 'F') }

      doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text('QUOTATION', 14, 16)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`${quoteNum} | ${statusLabel}`, 14, 23)
      doc.setFontSize(7); doc.text(compName, 14, 30); doc.text(`Date: ${est.estimateDate || '—'} | Expiry: ${est.expiryDate || '—'}`, 14, 36)

      // Customer Section
      const customer = customers.find((c: any) => c.id === est.customerId)
      let yPos = 50
      doc.setFillColor(235, 248, 245)
      doc.rect(14, yPos, pageW - 28, 20, 'F')
      doc.setDrawColor(...tealMid)
      doc.rect(14, yPos, pageW - 28, 20, 'S')
      doc.setTextColor(...tealDark); doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('BILL TO:', 18, yPos + 6)
      doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(customer?.name || est.customerName || '—', 18, yPos + 14)

      // Line Items Table
      let docLines = est.lines && est.lines.length > 0 ? est.lines : [{ description: est.customerName ? `${est.customerName} - Commercial Products & Services` : 'Commercial Products & Services', quantity: 1, unitPrice: est.totalAmount || est.subtotal || 0, discountType: 0, discountValue: 0, taxPercent: 0 }]

      const tableData = docLines.map((l: any, i: number) => {
        const q = parseFloat(l.quantity || '1') || 1
        const p = parseFloat(l.unitPrice || '0') || 0
        const gross = q * p
        const dv = parseFloat(l.discountValue || l.discountAmount || '0') || 0
        const dt = l.discountType ?? 0
        const da = dt === 0 ? (gross * dv) / 100 : Math.min(dv, gross)
        const taxable = Math.max(0, gross - da)
        const tp = parseFloat(l.taxPercent || '0') || 0
        const ta = (taxable * tp) / 100
        const total = taxable + ta
        return [i + 1, l.description || '—', String(q), money(p), money(da), money(ta), money(total)]
      })

      autoTable(doc, {
        startY: yPos + 26,
        head: [['#', 'Description', 'Qty', 'Unit Price', 'Discount', 'Tax', 'Total']],
        body: tableData,
        headStyles: { fillColor: tealDark, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, cellPadding: 2, halign: 'center' },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 2 },
        alternateRowStyles: { fillColor: [235, 248, 245] },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 62, halign: 'left' },
          2: { cellWidth: 16, halign: 'center' },
          3: { cellWidth: 26, halign: 'right' },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
        }
      })

      const finalY = (doc as any).lastAutoTable?.finalY || 100

      // Financial Summary
      const totalsX = 120
      const totalsValX = pageW - 14
      doc.setDrawColor(...tealMid)
      doc.line(totalsX, finalY + 8, totalsValX, finalY + 8)

      // Compute totals
      const subTotal = tableData.reduce((s: number, r: any[]) => s + parseFloat(String(r[3]).replace(/[^0-9.-]/g, '')) * parseFloat(String(r[2])), 0) || est.totalAmount || 0
      const discTotal = tableData.reduce((s: number, r: any[]) => s + parseFloat(String(r[4]).replace(/[^0-9.-]/g, '')), 0)
      const taxTotal = tableData.reduce((s: number, r: any[]) => s + parseFloat(String(r[5]).replace(/[^0-9.-]/g, '')), 0)
      const netTotal = est.totalAmount || (subTotal - discTotal + taxTotal)

      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139)
      doc.text('Subtotal:', totalsX, finalY + 14); doc.setTextColor(30, 41, 59); doc.text(money(subTotal), totalsValX, finalY + 14, { align: 'right' })
      if (discTotal > 0) { doc.setTextColor(225, 29, 72); doc.text('Discount:', totalsX, finalY + 20); doc.text(`-${money(discTotal)}`, totalsValX, finalY + 20, { align: 'right' }) }
      if (taxTotal > 0) { doc.setTextColor(217, 119, 6); doc.text('Tax / VAT:', totalsX, finalY + (discTotal > 0 ? 26 : 20)); doc.text(`+${money(taxTotal)}`, totalsValX, finalY + (discTotal > 0 ? 26 : 20), { align: 'right' }) }

      doc.setDrawColor(...tealDark); doc.setLineWidth(0.5)
      doc.line(totalsX, finalY + (discTotal > 0 ? 30 : 24), totalsValX, finalY + (discTotal > 0 ? 30 : 24))
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...tealDark)
      doc.text('TOTAL:', totalsX, finalY + (discTotal > 0 ? 37 : 31)); doc.text(money(netTotal), totalsValX, finalY + (discTotal > 0 ? 37 : 31), { align: 'right' })

      // Terms & Conditions
      const termsY = finalY + (discTotal > 0 ? 48 : 42)
      doc.setFillColor(235, 248, 245)
      doc.rect(14, termsY, pageW - 28, 28, 'F')
      doc.setDrawColor(...tealMid)
      doc.rect(14, termsY, pageW - 28, 28, 'S')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...tealDark); doc.text('TERMS & CONDITIONS', 18, termsY + 6)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(71, 85, 105)
      doc.text(doc.splitTextToSize(est.terms || 'Standard terms apply.', pageW - 36).slice(0, 4), 18, termsY + 12)

      // Signature Area
      const sigY = 260
      doc.setDrawColor(...tealMid)
      doc.line(14, sigY, 80, sigY)
      doc.line(pageW - 80, sigY, pageW - 14, sigY)
      doc.setFontSize(8); doc.setTextColor(100, 116, 139)
      doc.text('Authorized Signature', 14, sigY + 5)
      doc.text('Customer Signature', pageW - 80, sigY + 5)

      // Footer
      doc.setDrawColor(...tealDark); doc.setLineWidth(0.3); doc.line(14, 280, pageW - 14, 280)
      doc.setFontSize(6.5); doc.setTextColor(100, 116, 139); doc.text(`${compName} | AMS ERP`, 14, 284)
      doc.text('Page 1 of 1', pageW - 14, 284, { align: 'right' })

      doc.save(`${quoteNum}.pdf`); notify(`PDF: ${quoteNum}`)
    } catch { notify('PDF failed') }
  }

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-[9999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg px-4 py-3 text-sm font-medium text-[var(--color-text-strong)]">{toast}</div>}

      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-indigo-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-indigo-500 to-violet-700" />
              <div className="absolute inset-0 flex items-center justify-center"><FileText className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Estimates &amp; Quotations</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Create, manage, and convert commercial quotations into invoices.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={openCreateModal} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30">
              <Plus className="w-4 h-4" /> New Quote
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiGrid cols={5}>
        {[
          { label: 'Active Pipeline', value: money(stats.pipelineValue), desc: `${stats.pipelineCount} issued quotes`, icon: Coins, tone: 'blue' },
          { label: 'Draft Quotes', value: money(stats.draftValue), desc: `${stats.draftCount} pending review`, icon: Users, tone: 'amber' },
          { label: 'Accepted', value: money(stats.acceptedValue), desc: `${stats.acceptedCount} finalized`, icon: CheckCircle2, tone: 'emerald' },
          { label: 'Converted to Invoice', value: money(stats.invoicedValue), desc: `${stats.invoicedCount} billed`, icon: FileText, tone: 'purple' },
          { label: 'Declined / Expired', value: String(stats.cancelledCount), desc: 'Lost opportunities', icon: Ban, tone: 'rose' },
        ].map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </KpiGrid>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input type="text" placeholder="Search by quote #, customer name..." value={query} onChange={e => setQuery(e.target.value)} className="w-full h-10 pl-4 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none">
          <option value="all">All Statuses</option>
          <option value="0">Draft</option>
          <option value="1">Sent</option>
          <option value="2">Finalized</option>
          <option value="3">Cancelled</option>
          <option value="5">Invoiced</option>
        </select>
      </div>

      {/* Quotations Table */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-indigo-500/[0.05] dark:bg-indigo-400/[0.07] border-b border-[var(--color-border)]">
                <th className="px-5 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Quote #</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Expiry</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Subtotal</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Discount</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Tax %</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Net Total</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredEstimates.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-16 text-center">
                  {loading ? (
                    <TableSkeleton rows={6} />
                  ) : (
                    <EmptyState
                      icon={FileText}
                      title="No quotations found"
                      hint='Click "New Quote" to create your first quotation.'
                    />
                  )}
                </td></tr>
              ) : filteredEstimates.map((est: any, idx: number) => {
                const sn = getNumericStatus(est.status); const st = statusStyles[sn]; const customer = customers.find((c: any) => c.id === est.customerId)
                const estLines: any[] = est.lines || []
                const estGross = estLines.length > 0
                  ? estLines.reduce((s: number, l: any) => s + ((parseFloat(l.quantity) || 1) * (parseFloat(l.unitPrice) || 0)), 0)
                  : (est.subtotal ?? est.grossAmount ?? est.totalAmount ?? 0)
                // Compute discount amount from lines
                const estDiscount = estLines.length > 0
                  ? estLines.reduce((s: number, l: any) => {
                      const qty = parseFloat(l.quantity) || 1
                      const price = parseFloat(l.unitPrice) || 0
                      const gross = qty * price
                      const dv = parseFloat(l.discountValue || l.discountAmount) || 0
                      const dt = l.discountType ?? 0
                      // dt=0 is percentage, dt=1 is fixed amount
                      return s + (dt === 0 ? (gross * dv) / 100 : Math.min(dv, gross))
                    }, 0)
                  : (est.discountTotal ?? 0)
                // Compute tax amount from lines (tax is always percentage)
                const estTax = estLines.length > 0
                  ? estLines.reduce((s: number, l: any) => {
                      const qty = parseFloat(l.quantity) || 1
                      const price = parseFloat(l.unitPrice) || 0
                      const gross = qty * price
                      const dv = parseFloat(l.discountValue || l.discountAmount) || 0
                      const dt = l.discountType ?? 0
                      const da = dt === 0 ? (gross * dv) / 100 : Math.min(dv, gross)
                      const taxable = Math.max(0, gross - da)
                      const tp = parseFloat(l.taxPercent) || 0
                      return s + (taxable * tp) / 100
                    }, 0)
                  : (est.taxTotal ?? 0)
                return (
                  <tr key={est.id || idx} className="hover:bg-[var(--color-surface-muted)]/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-indigo-600">{getFormattedEstimateNumber(est.estimateNumber || est.reference, idx)}</td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text-strong)]">{customer?.name || est.customerName || '—'}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-muted)] text-xs">{est.estimateDate || '—'}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text-muted)] text-xs">{est.expiryDate || '—'}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-[var(--color-text-strong)]">{money(estGross)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-rose-500">{estDiscount > 0 ? `-${money(estDiscount)}` : '—'}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-amber-600">{estTax > 0 ? `+${money(estTax)}` : '—'}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-[var(--color-text-strong)]">{money(est.totalAmount || est.netTotal || 0)}</td>
                    <td className="px-5 py-3.5 text-center"><StatusChip status={String(sn)} label={st?.label || 'Draft'} hex={st?.hex} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {sn !== 5 && sn !== 3 && (
                          <button onClick={() => openEditModal(est)} title="Edit Quotation" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-blue-500/10 hover:border-blue-500/30 flex items-center justify-center transition-all"><Pencil className="w-3.5 h-3.5 text-blue-500" /></button>
                        )}
                        <button onClick={() => setViewingEstimate(est)} title="View Quotation" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-sky-500/10 hover:border-sky-500/30 flex items-center justify-center transition-all"><Eye className="w-3.5 h-3.5 text-sky-500" /></button>
                        {(sn === 0 || sn === 1) && (
                          <button onClick={() => finalizeEstimate(est)} title="Approve / Finalize Quotation" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-emerald-500/10 hover:border-emerald-500/30 flex items-center justify-center transition-all"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /></button>
                        )}
                        {sn === 2 && (
                          <button onClick={() => convertQuoteToInvoice(est)} title="Convert to Invoice (Open Full Invoice Wizard)" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-purple-500/10 hover:border-purple-500/30 flex items-center justify-center transition-all cursor-pointer"><ArrowRight className="w-3.5 h-3.5 text-purple-500" /></button>
                        )}
                        <button onClick={() => downloadQuotePdf(est, idx)} title="Download PDF" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-gray-500/10 hover:border-gray-500/30 flex items-center justify-center transition-all"><Download className="w-3.5 h-3.5 text-gray-500" /></button>
                        {sn !== 3 && (
                          <button onClick={() => cancelEstimate(est)} title="Cancel / Decline Quotation" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-rose-500/10 hover:border-rose-500/30 flex items-center justify-center transition-all"><Ban className="w-3.5 h-3.5 text-rose-500" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleCancelForm}>
          <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm"><FileText className="w-5 h-5" /></div>
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-strong)]">{editingEstimate ? 'Edit Quotation' : 'New Quotation'}</h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Ref: <span className="font-mono font-bold text-[var(--color-text-strong)]">{form.reference}</span></p>
                </div>
              </div>
              <button onClick={handleCancelForm} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-muted)] transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Modal Stepper Navigation */}
            <div className="erp-stepper-nav">
              <button
                type="button"
                onClick={() => setModalTab('details')}
                className={`erp-step-pill ${modalTab === 'details' ? 'active' : ''}`}
              >
                <span className="erp-step-num">1</span>
                <Users className="w-3.5 h-3.5" />
                <span>Customer & Dates</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('lines')}
                className={`erp-step-pill ${modalTab === 'lines' ? 'active' : ''}`}
              >
                <span className="erp-step-num">2</span>
                <Coins className="w-3.5 h-3.5" />
                <span>Line Items ({lines.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('summary')}
                className={`erp-step-pill ${modalTab === 'summary' ? 'active' : ''}`}
              >
                <span className="erp-step-num">3</span>
                <FileText className="w-3.5 h-3.5" />
                <span>Terms & Summary</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('preview')}
                className={`erp-step-pill ${modalTab === 'preview' ? 'active' : ''}`}
              >
                <span className="erp-step-num">4</span>
                <Eye className="w-3.5 h-3.5" />
                <span>Review & Preview</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
              {modalTab === 'details' && (
                <div className="space-y-5">
                  <div className="erp-form-card space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Quotation Header & Validity</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 1 of 4</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="erp-form-label">
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
                            sublabel: c.creditLimit ? `Limit: ${money(c.creditLimit, c.currencyCode || form.currencyCode)}` : undefined,
                          }))}
                          className="h-10 text-xs font-semibold"
                        />
                        {(() => {
                          const cust = customers.find((c: any) => c.id === form.customerId)
                          const limit = parseFloat(String(cust?.creditLimit || '0'))
                          if (!cust || limit <= 0) return null
                          const quoteTotal = totals.total
                          const exceeds = quoteTotal > limit
                          return (
                            <div className={`mt-3 p-3.5 rounded-xl border text-xs ${exceeds ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'}`}>
                              <div className="flex justify-between font-bold">
                                <span>{exceeds ? '⚠️ Quotation Exceeds Credit Limit' : '✓ Credit Policy Check'}</span>
                                <span className="font-mono">Configured Limit: {money(limit, form.currencyCode)}</span>
                              </div>
                              {exceeds && (
                                <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                                  Quote total ({money(quoteTotal, form.currencyCode)}) exceeds credit limit by {money(quoteTotal - limit, form.currencyCode)}.
                                </p>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Quote Reference #
                        </label>
                        <div className="relative">
                          <Hash className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            value={form.reference}
                            onChange={e => setForm({ ...form, reference: e.target.value })}
                            className="erp-form-input pl-10! font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Quotation Currency
                        </label>
                        <select
                          value={form.currencyCode}
                          onChange={e => setForm({ ...form, currencyCode: e.target.value })}
                          className="erp-form-select font-bold"
                        >
                          {['PKR', 'USD', 'AED', 'SAR', 'GBP', 'EUR', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Quotation Date
                        </label>
                        <input
                          type="date"
                          value={form.estimateDate}
                          onChange={e => setForm({ ...form, estimateDate: e.target.value })}
                          className="erp-form-input font-medium"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Validity / Expiry Date
                        </label>
                        <input
                          type="date"
                          value={form.expiryDate}
                          onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                          className="erp-form-input font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'lines' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-[var(--color-border)] overflow-x-auto">
                    <table className="w-full text-xs min-w-[800px]">
                      <thead className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border)]">
                        <tr>
                          <th className="p-2.5 text-left w-[170px] min-w-[140px]">Product</th>
                          <th className="p-2.5 text-left min-w-[220px]">Description</th>
                          <th className="p-2.5 text-right w-16 min-w-[55px]">Qty</th>
                          <th className="p-2.5 text-right w-36 min-w-[130px]">Price</th>
                          <th className="p-2.5 text-center w-40 min-w-[145px]">Discount</th>
                          <th className="p-2.5 text-center w-20 min-w-[70px]">Tax</th>
                          <th className="p-2.5 text-right w-24 min-w-[85px]">Total</th>
                          <th className="p-2.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {lines.map((l, i) => (
                          <tr key={i} className="hover:bg-[var(--color-surface-muted)]/30">
                            <td className="p-2">
                              <CompactProductSelect
                                value={l.productId}
                                onChange={v => updateLine(i, 'productId', v)}
                                products={products}
                                filterPurpose={['FinishedGood', 'Service']}
                              />
                            </td>
                            <td className="p-2"><textarea value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} rows={2} placeholder="Item description / details..." className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs outline-none resize-none" /></td>
                            <td className="p-2"><input type="number" min="1" value={l.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} className="w-full h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono outline-none" /></td>
                            <td className="p-2"><input type="number" step="0.01" value={l.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} className="w-full h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono outline-none" /></td>
                            <td className="p-2">
                              <div className="flex items-center gap-1.5 min-w-[130px]">
                                <CompactDiscountTypeSelect
                                  value={l.discountType}
                                  onChange={val => updateLine(i, 'discountType', val)}
                                  currencyCode={form.currencyCode}
                                />
                                <input type="number" min="0" step={l.discountType === 0 ? "1" : "0.01"} value={l.discountValue} onChange={e => updateLine(i, 'discountValue', e.target.value)} className="w-full min-w-[65px] h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono outline-none" />
                              </div>
                            </td>
                            <td className="p-2">
                              <CompactTaxSelect
                                value={l.taxPercent}
                                onChange={v => updateLine(i, 'taxPercent', v)}
                                taxCodes={applicableTaxCodes}
                              />
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-600">{money(lineCalculations[i]?.total || 0)}</td>
                            <td className="p-2 text-center">{lines.length > 1 && <button onClick={() => removeLine(i)} className="text-rose-500 hover:bg-rose-500/10 rounded p-1"><X className="w-3 h-3" /></button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={addLine} className="h-8 px-3 rounded-lg border border-indigo-500 text-indigo-600 text-xs font-semibold hover:bg-indigo-500/10 transition-colors flex items-center gap-1"><Plus className="w-3 h-3" /> Add Line</button>
                </div>
              )}

              {modalTab === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 space-y-4">
                    <div><label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">Terms & Conditions</label><textarea rows={3} value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none resize-none" /></div>
                    <div><label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">Client Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional remarks..." className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] outline-none resize-none" /></div>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Summary</p>
                    <div className="flex justify-between text-xs"><span className="text-[var(--color-text-muted)]">Subtotal</span><span className="font-mono font-semibold">{money(totals.sub)}</span></div>
                    {totals.disc > 0 && <div className="flex justify-between text-xs text-rose-500"><span>Discount</span><span>-{money(totals.disc)}</span></div>}
                    {totals.tax > 0 && <div className="flex justify-between text-xs text-amber-600"><span>Tax</span><span>+{money(totals.tax)}</span></div>}
                    <div className="border-t border-[var(--color-border)] pt-2 flex justify-between text-sm font-bold"><span>Total</span><span className="text-indigo-600 font-mono">{money(totals.total)}</span></div>
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-sky-500/10 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2"><span className="text-lg font-bold text-[var(--color-text-strong)]">{form.reference}</span><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Ready to Submit</span></div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">Client: <strong>{customers.find((c: any) => c.id === form.customerId)?.name || 'N/A'}</strong> | Currency: <span className="font-mono font-bold">{form.currencyCode}</span> | Lines: <strong>{lines.length}</strong></p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border)]">
                        <th className="px-4 py-2.5 text-left font-semibold">#</th>
                        <th className="px-4 py-2.5 text-left font-semibold">Description</th>
                        <th className="px-4 py-2.5 text-center font-semibold">Qty</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Price</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Discount</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Tax</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                      </tr></thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {lines.map((l, i) => { const c = lineCalculations[i]; return (
                          <tr key={i} className="hover:bg-[var(--color-surface-muted)]/30">
                            <td className="px-4 py-2.5 font-mono">{i + 1}</td>
                            <td className="px-4 py-2.5 font-semibold">{l.description || products.find((p: any) => p.id === l.productId)?.name || '—'}</td>
                            <td className="px-4 py-2.5 text-center font-mono">{parseFloat(l.quantity) || 0}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{money(parseFloat(l.unitPrice) || 0)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-rose-500">{c?.discountAmount > 0 ? `-${money(c.discountAmount)}` : '—'}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-amber-600">{c?.taxAmount > 0 ? `+${money(c.taxAmount)}` : '—'}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold">{money(c?.total || 0)}</td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[var(--color-border)] p-4"><p className="text-xs font-bold mb-1">Terms</p><p className="text-xs text-[var(--color-text-muted)]">{form.terms || 'Standard terms.'}</p></div>
                    <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Subtotal</span><span className="font-mono">{money(totals.sub)}</span></div>
                      {totals.disc > 0 && <div className="flex justify-between text-rose-500"><span>Discount</span><span>-{money(totals.disc)}</span></div>}
                      {totals.tax > 0 && <div className="flex justify-between text-amber-600"><span>Tax</span><span>+{money(totals.tax)}</span></div>}
                      <div className="border-t border-[var(--color-border)] pt-2 flex justify-between font-bold text-sm"><span>Total</span><span className="text-indigo-600 font-mono">{money(totals.total)}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{modalTab === 'preview' ? 'Ready to submit' : 'Draft auto-saved'}</div>
              <div className="flex items-center gap-2">
                <button onClick={handleCancelForm} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors">Cancel</button>
                {modalTab !== 'details' && <button onClick={() => { if (modalTab === 'preview') setModalTab('summary'); else if (modalTab === 'summary') setModalTab('lines'); else setModalTab('details'); }} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Back</button>}
                {modalTab !== 'preview' ? (
                  <button onClick={() => { if (modalTab === 'details') { if (!form.customerId) { notify('Select customer.'); return } setModalTab('lines') } else if (modalTab === 'lines') setModalTab('summary'); else setModalTab('preview') }} className="h-9 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 flex items-center gap-1.5">
                    {modalTab === 'details' ? 'Next: Line Items' : modalTab === 'lines' ? 'Next: Summary' : 'Preview'} <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button onClick={saveEstimate} className="h-9 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Confirm & Create</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewingEstimate && (() => {
        const est = viewingEstimate; const customer = customers.find((c: any) => c.id === est.customerId)
        const vLines: any[] = (est.lines && est.lines.length > 0) ? est.lines : [{ description: est.customerName ? `${est.customerName} - Products & Services` : 'Products & Services', quantity: 1, unitPrice: est.totalAmount || est.subtotal || 0, discountType: 0, discountValue: 0, taxPercent: 0 }]
        // Compute values properly
        const vLineCalcs = vLines.map((l: any) => {
          const q = parseFloat(l.quantity || 1)
          const p = parseFloat(l.unitPrice || 0)
          const gross = q * p
          const dv = parseFloat(l.discountValue || l.discountAmount || 0)
          const dt = l.discountType ?? 0
          const da = dt === 0 ? (gross * dv) / 100 : Math.min(dv, gross)
          const taxable = Math.max(0, gross - da)
          const tp = parseFloat(l.taxPercent || '0')
          const ta = (taxable * tp) / 100
          return { gross, da, taxable, ta, total: taxable + ta }
        })
        const sub = vLineCalcs.reduce((s, c) => s + c.gross, 0)
        const disc = vLineCalcs.reduce((s, c) => s + c.da, 0)
        const tax = vLineCalcs.reduce((s, c) => s + c.ta, 0)
        const net = sub - disc + tax; const fmt = (n: number) => `${est.currencyCode || 'PKR'} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingEstimate(null)}>
            <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white"><Eye className="w-5 h-5" /></div>
                  <div><h2 className="text-sm font-bold text-[var(--color-text-strong)]">Quotation: {est.estimateNumber || est.reference}</h2><p className="text-xs text-[var(--color-text-muted)]">Customer: <strong>{customer?.name || 'N/A'}</strong></p></div>
                </div>
                <button onClick={() => setViewingEstimate(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="rounded-xl border border-[var(--color-border)] overflow-hidden mb-4">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border)]">
                      <th className="px-3 py-2 text-left font-semibold">#</th>
                      <th className="px-3 py-2 text-left font-semibold">Description</th>
                      <th className="px-3 py-2 text-right font-semibold">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold">Price</th>
                      <th className="px-3 py-2 text-right font-semibold">Discount</th>
                      <th className="px-3 py-2 text-right font-semibold">Tax</th>
                      <th className="px-3 py-2 text-right font-semibold">Total</th>
                    </tr></thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {vLines.map((l: any, i: number) => { const c = vLineCalcs[i]; return (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{l.description || '—'}</td>
                          <td className="px-3 py-2 text-right font-mono">{c.gross > 0 ? parseFloat(l.quantity || 1) : '—'}</td>
                          <td className="px-3 py-2 text-right font-mono">{fmt(c.gross > 0 ? parseFloat(l.unitPrice || 0) : 0)}</td>
                          <td className="px-3 py-2 text-right font-mono text-rose-500">{c.da > 0 ? `-${fmt(c.da)}` : '—'}</td>
                          <td className="px-3 py-2 text-right font-mono text-amber-600">{c.ta > 0 ? `+${fmt(c.ta)}` : '—'}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{fmt(c.total)}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                <div className="w-64 ml-auto space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Subtotal</span><span className="font-mono font-semibold">{fmt(sub)}</span></div>
                  {disc > 0 && <div className="flex justify-between text-rose-500"><span>Discount</span><span>-{fmt(disc)}</span></div>}
                  {tax > 0 && <div className="flex justify-between text-amber-600"><span>Tax</span><span>+{fmt(tax)}</span></div>}
                  <div className="border-t border-[var(--color-border)] pt-2 flex justify-between font-bold"><span>Total</span><span className="text-indigo-600 font-mono">{fmt(net)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* CONVERT TO INVOICE MODAL */}
      {convertModal && <ConvertToInvoiceModal estimate={convertModal} customers={customers} products={products} onConfirm={convertQuoteToInvoice} onClose={() => setConvertModal(null)} />}
    </div>
  )
}

function ConvertToInvoiceModal({
  estimate,
  products,
  onConfirm,
  onClose
}: {
  estimate: any
  customers: any[]
  products: any[]
  onConfirm: (p: any) => void
  onClose: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const est = estimate
  const applicableTaxCodes = useMemo(() => getActiveTaxCodes(), [])
  const uniqueTaxRates = useMemo(() => {
    const seen = new Set<number>()
    const list: { rate: number; label: string; code: string }[] = []
    for (const tc of applicableTaxCodes) {
      if (!seen.has(tc.rate)) {
        seen.add(tc.rate)
        list.push({ rate: tc.rate, label: tc.label, code: tc.code })
      }
    }
    return list.sort((a, b) => a.rate - b.rate)
  }, [applicableTaxCodes])
  const allInvoices = useSalesStore((s) => s.invoices)

  const computeNextInvNum = () => {
    let maxNum = 0
    for (const item of allInvoices) {
      const str = (item.invoiceNumber || item.reference || '') + ''
      const match = str.match(/INV-(\d+)/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxNum) maxNum = num
      }
    }
    return `INV-${(maxNum + 1).toString().padStart(5, '0')}`
  }

  const [invForm, setInvForm] = useState({
    customerId: est.customerId || '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    reference: computeNextInvNum(),
    notes: est.notes || '',
    currencyCode: est.currencyCode || 'PKR'
  })

  const [invLines, setInvLines] = useState<any[]>(
    est.lines && est.lines.length > 0
      ? est.lines.map((l: any) => ({
          productId: l.productId || '',
          description: l.description || l.productName || '',
          quantity: String(l.quantity || 1),
          unitPrice: String(l.unitPrice || 0),
          discountType: l.discountType ?? 0,
          discountValue: String(l.discountValue ?? l.discountAmount ?? 0),
          taxPercent: String(l.taxPercent ?? 0)
        }))
      : [{
          productId: '',
          description: est.customerName ? `${est.customerName} - Products & Services` : 'Products & Services',
          quantity: '1',
          unitPrice: String(est.totalAmount || est.subtotal || 0),
          discountType: 0,
          discountValue: '0',
          taxPercent: '0'
        }]
  )

  const updateInvLine = (i: number, f: string, v: any) => {
    const u = [...invLines]
    u[i] = { ...u[i], [f]: v }
    if (f === 'productId' && v) {
      const p = products.find((pp: any) => pp.id === v)
      if (p) {
        u[i].description = u[i].description || p.name
        u[i].unitPrice = String(p.unitPrice || p.salesPrice || 0)
      }
    }
    setInvLines(u)
  }

  const addInvLine = () =>
    setInvLines([
      ...invLines,
      { productId: '', description: '', quantity: '1', unitPrice: '0', discountType: 0, discountValue: '0', taxPercent: '0' }
    ])

  const removeInvLine = (i: number) => {
    if (invLines.length > 1) setInvLines(invLines.filter((_, j) => j !== i))
  }

  const lcs = invLines.map(l => {
    const q = parseFloat(l.quantity) || 0
    const p = parseFloat(l.unitPrice) || 0
    const gross = q * p
    const dv = parseFloat(l.discountValue) || 0
    const dt = l.discountType ?? 0
    const da = dt === 0 ? (gross * dv) / 100 : Math.min(dv, gross)
    const taxable = Math.max(0, gross - da)
    const tp = parseFloat(l.taxPercent) || 0
    const ta = (taxable * tp) / 100
    return { gross, da, taxable, ta, total: taxable + ta }
  })

  const invTotals = lcs.reduce(
    (a, c) => ({
      sub: a.sub + c.gross,
      disc: a.disc + c.da,
      tax: a.tax + c.ta,
      total: a.total + c.total
    }),
    { sub: 0, disc: 0, tax: 0, total: 0 }
  )

  const handleSubmit = async () => {
    setSubmitting(true)
    await onConfirm({
      ...invForm,
      companyId: est.companyId || null,
      estimateId: est.id || null,
      lines: invLines.map((l, i) => {
        const c = lcs[i]
        return {
          productId: l.productId || null,
          productName: l.description,
          description: l.description,
          quantity: parseFloat(l.quantity || '1'),
          unitPrice: parseFloat(l.unitPrice || '0'),
          discountType: l.discountType ?? 0,
          discountValue: parseFloat(l.discountValue || '0'),
          discountAmount: c?.da || 0,
          taxCodeId: null,
          taxPercent: parseFloat(l.taxPercent || '0'),
          taxAmount: c?.ta || 0,
          totalAmount: c?.total || 0
        }
      })
    })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <ArrowRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-strong)]">Convert to Invoice (Draft)</h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Assigned Invoice Number: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{invForm.reference}</strong> • (Quotation Ref: {est.estimateNumber || est.reference})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form className="flex-1 overflow-y-auto p-6 space-y-5" onSubmit={e => { e.preventDefault(); handleSubmit() }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--color-text-strong)]">Invoice Number</label>
              <input
                type="text"
                value={invForm.reference}
                onChange={e => setInvForm({ ...invForm, reference: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-mono font-bold text-sky-600 dark:text-sky-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--color-text-strong)]">Invoice Date</label>
              <input type="date" value={invForm.invoiceDate} onChange={e => setInvForm({ ...invForm, invoiceDate: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--color-text-strong)]">Due Date</label>
              <input type="date" value={invForm.dueDate} onChange={e => setInvForm({ ...invForm, dueDate: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] outline-none" />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] overflow-x-auto">
            <table className="w-full text-xs min-w-[750px]">
              <thead className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="p-2.5 text-left min-w-[220px]">Description</th>
                  <th className="p-2.5 text-right w-16 min-w-[55px]">Qty</th>
                  <th className="p-2.5 text-right w-36 min-w-[130px]">Price</th>
                  <th className="p-2.5 text-center w-40 min-w-[145px]">Discount</th>
                  <th className="p-2.5 text-center w-20 min-w-[70px]">Tax</th>
                  <th className="p-2.5 text-right w-24 min-w-[85px]">Total</th>
                  <th className="p-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {invLines.map((l: any, i: number) => (
                  <tr key={i}>
                    <td className="p-2">
                      <input value={l.description} onChange={e => updateInvLine(i, 'description', e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] outline-none" />
                    </td>
                    <td className="p-2">
                      <input type="number" value={l.quantity} onChange={e => updateInvLine(i, 'quantity', e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono text-[var(--color-text-strong)] outline-none" />
                    </td>
                    <td className="p-2">
                      <input type="number" step="0.01" value={l.unitPrice} onChange={e => updateInvLine(i, 'unitPrice', e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono text-[var(--color-text-strong)] outline-none" />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5 min-w-[130px]">
                        <CompactDiscountTypeSelect
                          value={l.discountType}
                          onChange={val => updateInvLine(i, 'discountType', val)}
                          currencyCode={invForm.currencyCode}
                        />
                        <input
                          type="number"
                          min="0"
                          step={l.discountType === 0 ? "1" : "0.01"}
                          value={l.discountValue}
                          onChange={e => updateInvLine(i, 'discountValue', e.target.value)}
                          className="w-full min-w-[65px] h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono text-[var(--color-text-strong)] outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-2">
                      <CompactTaxSelect
                        value={l.taxPercent}
                        onChange={v => updateInvLine(i, 'taxPercent', v)}
                        taxCodes={applicableTaxCodes}
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-[var(--color-text-strong)]">
                      {money(lcs[i]?.total || 0)}
                    </td>
                    <td className="p-2 text-center">
                      {invLines.length > 1 && (
                        <button type="button" onClick={() => removeInvLine(i)} className="text-rose-500 hover:bg-rose-500/10 rounded p-1">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addInvLine} className="h-8 px-3 rounded-lg border border-indigo-500 text-indigo-600 text-xs font-semibold hover:bg-indigo-500/10 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Line
          </button>
          <div className="w-72 ml-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-[var(--color-text-muted)]">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-[var(--color-text-strong)]">{money(invTotals.sub)}</span>
            </div>
            {invTotals.disc > 0 && (
              <div className="flex justify-between text-rose-500">
                <span>Discount</span>
                <span className="font-mono">-{money(invTotals.disc)}</span>
              </div>
            )}
            {invTotals.tax > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Tax</span>
                <span className="font-mono">+{money(invTotals.tax)}</span>
              </div>
            )}
            <div className="border-t border-[var(--color-border)] pt-2 flex justify-between font-bold text-sm text-[var(--color-text-strong)]">
              <span>Total</span>
              <span className="text-emerald-600 font-mono">{money(invTotals.total)}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-xs font-semibold hover:bg-[var(--color-surface-muted)] text-[var(--color-text)]">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="h-9 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              <Check className="w-4 h-4" />
              {submitting ? 'Creating...' : 'Create Sales Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
