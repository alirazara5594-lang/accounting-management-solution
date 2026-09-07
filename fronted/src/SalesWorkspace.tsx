import { useState, useEffect, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Receipt, Plus, Check, X, ShieldCheck, ArrowRight,
  ArrowLeft, Hash, Users, FileText, Coins, CheckCircle2, Eye,
  Download, Pencil, Ban, ChevronDown, DollarSign
} from 'lucide-react'
import { useSalesStore, useCustomersStore, useProductsStore, useCoaStore, useAssetsInventoryStore } from './stores'
import { useFormDraft } from './hooks/useFormDraft'
import { DataToolbar } from '@/components/ui/data-toolbar'
import { KpiCard, KpiGrid } from './components/ui/kpi-card'
import { StatusChip } from './components/ui/status-chip'
import { EmptyState, TableSkeleton } from './components/ui/empty-state'
import { money } from './lib/currency'
import { getActiveTaxCodes } from './lib/taxLocalization'
import { getGlobalNextInvoiceNumber, formatInvoiceNumber } from './lib/invoiceNumbering'
import { CompactTaxSelect } from './components/CompactTaxSelect'
import { CompactDiscountTypeSelect } from './components/CompactDiscountTypeSelect'
import { CompactProductSelect } from './components/CompactProductSelect'
import { CompactSelect } from './components/CompactSelect'

const statusStyles: Record<string, { label: string; hex: string }> = {
  Draft: { label: 'Draft', hex: '#94a3b8' },
  Sent: { label: 'Approved', hex: '#0ea5e9' },
  Paid: { label: 'Paid', hex: '#10b981' },
  PartiallyPaid: { label: 'Partially Paid', hex: '#f59e0b' },
  Overdue: { label: 'Overdue', hex: '#f43f5e' },
  Void: { label: 'Cancelled / Void', hex: '#ef4444' }
}

export const SalesWorkspace: React.FC<{ activeEntityId: string; entities?: any[] }> = ({
  activeEntityId,
  entities = []
}) => {
  const invoices = useSalesStore((s) => s.invoices)
  const fetchInvoices = useSalesStore((s) => s.fetchInvoices)
  const createInvoiceStore = useSalesStore((s) => s.createInvoice)
  const updateInvoiceStore = useSalesStore((s) => s.updateInvoice)
  const updateInvoiceStatusStore = useSalesStore((s) => s.updateInvoiceStatus)
  const postInvoiceStore = useSalesStore((s) => s.postInvoice)
  const updateEstimateStatusStore = useSalesStore((s) => s.updateEstimateStatus)

  const customers = useCustomersStore((s) => s.customers)
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers)

  const products = useProductsStore((s) => s.products)
  const fetchProducts = useProductsStore((s) => s.fetchProducts)

  const accounts = useCoaStore((s) => s.accounts)
  const fetchAccounts = useCoaStore((s) => s.fetchAccounts)
  const coaMappings = useCoaStore((s) => s.mappings)
  const fetchMappings = useCoaStore((s) => s.fetchMappings)

  const warehouses = useAssetsInventoryStore((s) => s.warehouses)
  const fetchWarehouses = useAssetsInventoryStore((s) => s.fetchWarehouses)
  const stockLevels = useAssetsInventoryStore((s) => s.stockLevels)
  const fetchStockLevels = useAssetsInventoryStore((s) => s.fetchStockLevels)
  const createStockTransaction = useAssetsInventoryStore((s) => s.createStockTransaction)

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<any>(null)
  const [modalTab, setModalTab] = useState<'details' | 'lines' | 'summary' | 'preview'>('details')
  const [postModal, setPostModal] = useState<any>(null)
  const [postForm, setPostForm] = useState({ arAccId: '', revenueAccId: '', taxLiabilityAccId: '' })
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pendingInvoiceNumber, setPendingInvoiceNumber] = useState<string>('')
  const [convertedEstimateId, setConvertedEstimateId] = useState<string | null>(null)
  const [creditOverride, setCreditOverride] = useState(false)

  // Active Regional Tax Codes
  const applicableTaxCodes = useMemo(() => {
    return getActiveTaxCodes()
  }, [activeEntityId])

  const defaultTaxRate = String(applicableTaxCodes[0]?.rate ?? 0)

  // Form state
  const [form, setForm] = useState({
    customerId: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    reference: '',
    notes: '',
    currencyCode: 'PKR'
  })

  const [lines, setLines] = useState([
    { productId: '', productName: '', description: '', quantity: '1', unitPrice: '0', discountType: 0, discountValue: '0', taxPercent: defaultTaxRate, warehouseId: '' }
  ])

  const { saveDraft, clearDraft } = useFormDraft('sales_invoice', { form, lines }, (saved: any) => {
    if (saved.form) setForm(saved.form)
    if (saved.lines) setLines(saved.lines)
  }, showForm, !!editingInvoice)

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchInvoices(activeEntityId),
        fetchCustomers(activeEntityId),
        fetchProducts(),
        fetchAccounts(),
        fetchWarehouses(activeEntityId),
        fetchStockLevels(activeEntityId)
      ])
    } catch {}
    setLoading(false)
  }

  const checkPendingQuoteConversion = () => {
    try {
      const raw = localStorage.getItem('ams_pending_invoice_from_quote')
      if (raw) {
        const data = JSON.parse(raw)
        localStorage.removeItem('ams_pending_invoice_from_quote')

        const nextRef = computeNextInvoiceNumber()
        setPendingInvoiceNumber(nextRef)
        setConvertedEstimateId(data.estimateId || null)

        setForm({
          customerId: data.customerId || customers[0]?.id || '',
          invoiceDate: new Date().toISOString().slice(0, 10),
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          reference: nextRef,
          notes: data.notes || (data.estimateNumber ? `Converted from quotation ${data.estimateNumber}` : ''),
          currencyCode: data.currencyCode || 'PKR'
        })

        if (data.lines && data.lines.length > 0) {
          setLines(data.lines)
        }

        setEditingInvoice(null)
        setModalTab('details')
        setShowForm(true)
        notify(`✓ Pre-filled from Quote ${data.estimateNumber || ''}! Review each tab and confirm.`)
      }
    } catch {}
  }

  useEffect(() => {
    fetchData().then(() => {
      checkPendingQuoteConversion()
    })
  }, [activeEntityId])

  useEffect(() => {
    if (coaMappings.length === 0) {
      fetchMappings()
    }
  }, [coaMappings.length, fetchMappings])

  useEffect(() => {
    const handleHash = () => {
      checkPendingQuoteConversion()
    }
    window.addEventListener('hashchange', handleHash)
    // Also check on interval/mount
    const t = setTimeout(checkPendingQuoteConversion, 300)
    return () => {
      window.removeEventListener('hashchange', handleHash)
      clearTimeout(t)
    }
  }, [])

  const notify = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3500)
  }

  const computeNextInvoiceNumber = () => {
    return getGlobalNextInvoiceNumber()
  }

  const getFormattedInvoiceNumber = (rawNum: string, index: number) => {
    if (!rawNum || rawNum.startsWith('EST-') || rawNum.startsWith('INV-202') || rawNum.length > 10) {
      return `INV-${(index + 1).toString().padStart(5, '0')}`
    }
    const match = rawNum.match(/INV-(\d+)/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (!isNaN(num) && num < 100000) {
        return `INV-${num.toString().padStart(5, '0')}`
      }
    }
    return `INV-${(index + 1).toString().padStart(5, '0')}`
  }

  const openCreateModal = () => {
    setEditingInvoice(null)
    clearDraft()
    // Reuse pending number if exists, otherwise generate new one
    const nextRef = pendingInvoiceNumber || computeNextInvoiceNumber()
    if (!pendingInvoiceNumber) {
      setPendingInvoiceNumber(nextRef)
    }
    setForm({
      customerId: customers[0]?.id || '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      reference: nextRef,
      notes: 'Payment is due within invoice terms. Thank you for your business.',
      currencyCode: 'PKR'
    })
    setLines([{ productId: '', productName: '', description: '', quantity: '1', unitPrice: '0', discountType: 0, discountValue: '0', taxPercent: defaultTaxRate, warehouseId: '' }])
    setModalTab('details')
    setShowForm(true)
  }

  const openEditModal = (inv: any) => {
    setEditingInvoice(inv)
    setForm({
      customerId: inv.customerId || '',
      invoiceDate: inv.invoiceDate || new Date().toISOString().slice(0, 10),
      dueDate: inv.dueDate || '',
      reference: inv.invoiceNumber || inv.reference || '',
      notes: inv.notes || '',
      currencyCode: inv.currencyCode || 'PKR'
    })
    setLines(
      inv.lines && inv.lines.length > 0
        ? inv.lines.map((l: any) => {
            const prod = products.find((p: any) => p.id === l.productId)
            return {
              productId: l.productId || '',
              productName: l.productName || prod?.name || l.description || '',
              description: l.description || '',
              quantity: String(l.quantity || 1),
              unitPrice: String(l.unitPrice || 0),
              discountType: l.discountType ?? 0,
              discountValue: String(l.discountValue || l.discountAmount || 0),
              taxPercent: String(l.taxPercent || 0),
              warehouseId: l.warehouseId || ''
            }
          })
        : [{ productId: '', productName: '', description: inv.notes || inv.reference || 'Commercial Tax Invoice Items', quantity: '1', unitPrice: String(inv.subTotal || inv.totalAmount || 0), discountType: 0, discountValue: String(inv.discountTotal || 0), taxPercent: '0', warehouseId: '' }]
    )
    setModalTab('details')
    setShowForm(true)
  }

  const handleCancelForm = () => {
    clearDraft()
    setShowForm(false)
    setEditingInvoice(null)
  }

  const cancelInvoice = async (inv: any) => {
    try {
      await updateInvoiceStatusStore(inv.id, 3) // 3 = Void / Cancelled
      try {
        const allLocal = JSON.parse(localStorage.getItem('ams_local_invoices_list') || '[]');
        const updated = allLocal.map((x: any) => (x.id === inv.id || x.invoiceNumber === inv.invoiceNumber ? { ...x, status: 3 } : x));
        localStorage.setItem('ams_local_invoices_list', JSON.stringify(updated));
      } catch {}
      notify(`✓ Invoice ${inv.invoiceNumber || inv.reference} marked as Cancelled / Void. Reversal posted to General Ledger.`);
      await fetchData();
    } catch (e: any) {
      notify(e.message || 'Failed to cancel invoice');
    }
  };

  const openPostModal = async (inv: any) => {
    if (!inv) return
    if (!accounts || accounts.length === 0) {
      try { fetchAccounts() } catch {}
    }
    let liveMappings = coaMappings
    if (!liveMappings || liveMappings.length === 0) {
      try { liveMappings = await fetchMappings() } catch {}
    }
    const getMappedId = (key: string, fallbackCode: string) => {
      const found = liveMappings?.find((m: any) => m.mappingKey === key)
      if (found?.accountId) return found.accountId
      const fallback = accs.find((a: any) => a.code === fallbackCode)
      return fallback?.id || ''
    }
    const accs = Array.isArray(accounts) ? accounts.filter((a: any) => a && typeof a === 'object') : []
    const arAccount = accs.find((a: any) => a.id === getMappedId('Customer Receivables', '12000')) || accs.find((a: any) => a.code === '12000' || a.name?.toLowerCase().includes('receivable'))
    const revAccount = accs.find((a: any) => a.id === getMappedId('Sales', '41100')) || accs.find((a: any) => a.code === '41100' || a.name?.toLowerCase().includes('revenue'))
    const taxAccount = accs.find((a: any) => a.id === getMappedId('Taxes', '22000')) || accs.find((a: any) => a.code === '22000' || a.name?.toLowerCase().includes('tax'))

    setPostModal(inv)
    setPostForm({
      arAccId: arAccount?.id || '',
      revenueAccId: revAccount?.id || '',
      taxLiabilityAccId: taxAccount?.id || ''
    })
  }

  const addLine = () =>
    setLines([...lines, { productId: '', productName: '', description: '', quantity: '1', unitPrice: '0', discountType: 0, discountValue: '0', taxPercent: defaultTaxRate, warehouseId: '' }])
  
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...lines]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'productId' && value) {
      const prod = products.find((p: any) => p.id === value)
      if (prod) {
        updated[i] = {
          ...updated[i],
          productName: prod.name,
          description: prod.name,
          unitPrice: String(prod.unitPrice || prod.salesPrice || 0)
        }
      }
    }
    setLines(updated)
  }

  const calculateLineTotals = () => {
    return lines.map(line => {
      const qty = parseFloat(line.quantity) || 0;
      const price = parseFloat(line.unitPrice) || 0;
      const gross = qty * price;
      // Calculate discount based on discountType (0=percentage, 1=fixed)
      const dv = parseFloat(line.discountValue) || 0;
      const dt = line.discountType || 0;
      const discountAmount = dt === 0 ? (gross * dv) / 100 : Math.min(dv, gross);
      const taxable = Math.max(0, gross - discountAmount);
      // Calculate tax based on tax percentage
      const tp = parseFloat(line.taxPercent) || 0;
      const taxAmount = (taxable * tp) / 100;
      const total = taxable + taxAmount;
      return { gross, discountAmount, taxable, taxAmount, total };
    });
  };

  const calculateTotals = () => {
    const lineTotals = calculateLineTotals();
    const sub = lineTotals.reduce((sum, l) => sum + l.gross, 0);
    const disc = lineTotals.reduce((sum, l) => sum + l.discountAmount, 0);
    const tax = lineTotals.reduce((sum, l) => sum + l.taxAmount, 0);
    const total = lineTotals.reduce((sum, l) => sum + l.total, 0);
    return { sub, disc, tax, total };
  };

  const lineCalculations = calculateLineTotals();
  const totals = calculateTotals();
  const subTotal = totals.sub
  const discountTotal = totals.disc
  const taxTotal = totals.tax
  const netTotal = totals.total

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === form.customerId)
  }, [customers, form.customerId])

  const customerCreditLimit = parseFloat(String(selectedCustomer?.creditLimit || '0'))

  const currentCustomerBalance = useMemo(() => {
    if (!form.customerId) return 0
    return invoices
      .filter((inv: any) =>
        inv.customerId === form.customerId &&
        inv.id !== editingInvoice?.id &&
        inv.status !== 0 &&
        inv.status !== '0' &&
        String(inv.status).toLowerCase() !== 'draft' &&
        inv.status !== 3 &&
        String(inv.status).toLowerCase() !== 'void'
      )
      .reduce((sum: number, inv: any) => sum + (parseFloat(inv.amountDue ?? inv.totalAmount) || 0), 0)
  }, [invoices, form.customerId, editingInvoice])

  const totalCreditExposure = currentCustomerBalance + netTotal
  const isCreditLimitExceeded = customerCreditLimit > 0 && totalCreditExposure > customerCreditLimit
  const excessCreditAmount = Math.max(0, totalCreditExposure - customerCreditLimit)

  const handleRecordPayment = (inv: any) => {
    const payload = {
      customerId: inv.customerId,
      invoiceId: inv.id,
      amount: inv.amountDue ?? inv.totalAmount ?? 0
    };
    localStorage.setItem('ams_pending_customer_payment', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('ams_navigate', { detail: 'Sales & Customers.Customer Payments' }));
  };

  const saveInvoice = async () => {
    if (!form.customerId) {
      notify('Please select a customer.')
      return
    }
    if (form.dueDate && form.invoiceDate && form.dueDate < form.invoiceDate) {
      notify('⚠️ Invoice Due Date cannot be earlier than the Invoice Date.')
      return
    }
    if (isCreditLimitExceeded && !creditOverride) {
      if (!window.confirm(`⚠️ Credit Limit Warning:\nCustomer's credit limit is ${money(customerCreditLimit, form.currencyCode)}.\nCurrent AR Balance is ${money(currentCustomerBalance, form.currencyCode)}.\nThis invoice of ${money(netTotal, form.currencyCode)} brings total exposure to ${money(totalCreditExposure, form.currencyCode)} (Exceeds credit limit by ${money(excessCreditAmount, form.currencyCode)}).\n\nDo you want to apply Manager Override and proceed?`)) {
        return
      }
    }
    const isGuid = (val?: string | null) => !!val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val)

    const body = {
      invoiceNumber: form.reference || null,
      customerId: isGuid(form.customerId) ? form.customerId : form.customerId,
      invoiceDate: form.invoiceDate || new Date().toISOString().slice(0, 10),
      dueDate: form.dueDate || new Date().toISOString().slice(0, 10),
      reference: form.reference || null,
      notes: form.notes || null,
      currencyCode: form.currencyCode || 'PKR',
      companyId: isGuid(activeEntityId) ? activeEntityId : null,
      lines: lines.map(l => {
        const qty = parseFloat(l.quantity || '1') || 1
        const price = parseFloat(l.unitPrice || '0') || 0
        const gross = qty * price
        const dv = parseFloat(l.discountValue || '0') || 0
        const dt = l.discountType || 0
        const discountAmount = dt === 0 ? (gross * dv) / 100 : Math.min(dv, gross)
        const taxable = Math.max(0, gross - discountAmount)
        const tp = parseFloat(l.taxPercent || '0') || 0
        const taxAmount = (taxable * tp) / 100
        return {
          productId: isGuid(l.productId) ? l.productId : null,
          description: l.description || l.productName || 'Item',
          quantity: qty,
          unitPrice: price,
          discountAmount: discountAmount,
          taxCodeId: null,
          taxAmount: taxAmount,
          warehouseId: l.warehouseId || null
        }
      })
    }
    try {
      if (editingInvoice) {
        await updateInvoiceStore(editingInvoice.id, body)
        notify('✓ Sales invoice updated successfully!')
      } else {
        await createInvoiceStore(body)
        notify('✓ Sales invoice created as Draft')
        // Clear pending number after successful save
        setPendingInvoiceNumber('')
        const refMatch = String(body.reference || '').match(/INV-(\d+)/i)
        if (refMatch) {
          const num = parseInt(refMatch[1], 10)
          if (!isNaN(num) && num < 100000) {
            const cur = parseInt(localStorage.getItem('ams_last_used_inv_sequence') || '0', 10)
            if (num > cur) {
              localStorage.setItem('ams_last_used_inv_sequence', String(num))
            }
          }
        }
        if (convertedEstimateId) {
          try {
            await updateEstimateStatusStore(convertedEstimateId, '5')
          } catch {}
          setConvertedEstimateId(null)
        }
      }
      clearDraft()
      setShowForm(false)
      setEditingInvoice(null)
      fetchData()
    } catch (e: any) {
      notify(e.message || 'Error saving invoice')
    }
  }

  const downloadInvoicePdf = (inv: any) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const invNum = formatInvoiceNumber(inv.invoiceNumber || inv.reference || 'INV-00001')
      const compName = assignedCompany?.name || 'Muhammad Ali Enterprises'
      const statusText = typeof inv.status === 'number'
        ? ['Draft', 'Approved', 'Paid', 'Cancelled / Void', 'Partially Paid', 'Overdue'][inv.status] || 'Draft'
        : String(inv.status || 'Draft')
      const currency = inv.currencyCode || 'PKR'
      const pageW = doc.internal.pageSize.getWidth()

      const tealDark: [number, number, number] = [1, 72, 113]
      const mintLight: [number, number, number] = [160, 235, 207]
      const tealMid: [number, number, number] = [30, 130, 160]

      // ── Gradient Header Banner ──
      for (let x = 0; x < pageW; x++) {
        const ratio = x / pageW
        const r = Math.round(tealDark[0] + (mintLight[0] - tealDark[0]) * ratio)
        const g = Math.round(tealDark[1] + (mintLight[1] - tealDark[1]) * ratio)
        const b = Math.round(tealDark[2] + (mintLight[2] - tealDark[2]) * ratio)
        doc.setFillColor(r, g, b)
        doc.rect(x, 0, 1, 38, 'F')
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.text('TAX INVOICE', 14, 18)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(220, 245, 235)
      doc.text(compName, 14, 26)

      doc.setFontSize(8)
      doc.text('Official Commercial Tax Invoice', 14, 33)

      // Invoice meta (right side of header)
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'normal')
      doc.text('Invoice Number:', pageW - 80, 14)
      doc.setFont('helvetica', 'bold')
      doc.text(invNum, pageW - 80, 20)
      doc.setFont('helvetica', 'normal')
      doc.text('Issue Date:', pageW - 80, 26)
      doc.text(inv.invoiceDate || '—', pageW - 80, 32)
      doc.text('Due Date:', pageW - 42, 26)
      doc.text(inv.dueDate || '—', pageW - 42, 32)
      doc.text('Status:', pageW - 42, 14)
      doc.setFont('helvetica', 'bold')
      doc.text(statusText.toUpperCase(), pageW - 42, 20)

      // ── Customer Section ──
      const custY = 44
      doc.setFillColor(235, 248, 245)
      doc.rect(14, custY, pageW - 28, 26, 'F')
      doc.setDrawColor(...tealMid)
      doc.rect(14, custY, pageW - 28, 26, 'S')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...tealDark)
      doc.text('BILL TO', 18, custY + 6)
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text(inv.customerName || 'Valued Customer', 18, custY + 14)
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      if (inv.customerEmail) doc.text(inv.customerEmail, 18, custY + 19)
      if (inv.reference) doc.text(`Ref / PO: ${inv.reference}`, 18, custY + 23)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...tealDark)
      doc.text('CURRENCY', pageW - 80, custY + 6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(15, 23, 42)
      doc.text(currency, pageW - 80, custY + 14)

      // ── Line Items Table ──
      const tableStartY = custY + 32

      if (products.length === 0) {
        fetchProducts()
      }

      let lines = inv.lines && inv.lines.length > 0 ? inv.lines : null;
      if (!lines || lines.length === 0) {
        lines = [{
          description: inv.notes || inv.reference || 'Commercial Tax Invoice Items',
          quantity: 1,
          unitPrice: inv.subTotal || inv.totalAmount || 0,
          discountAmount: inv.discountTotal || 0,
          taxAmount: inv.taxTotal || 0,
          totalAmount: inv.totalAmount || 0
        }];
      }

      const linesData = lines.map((l: any, idx: number) => {
        const qty = parseFloat(l.quantity || '1') || 1
        const price = parseFloat(l.unitPrice || l.price || l.unit_price || '0') || 0
        const gross = qty * price
        
        // Calculate discount based on discountType (0=percentage, 1=fixed) or stored amount
        const discAmt = (l.discountAmount !== undefined && l.discountAmount !== null && Number(l.discountAmount) > 0)
          ? (parseFloat(l.discountAmount) || 0)
          : (() => {
              const dv = parseFloat(l.discountValue || l.discount || '0') || 0
              const dt = l.discountType ?? 0
              return dt === 0 ? (gross * dv / 100) : Math.min(dv, gross)
            })()
        
        // Calculate tax based on tax percentage or stored amount
        const taxable = Math.max(0, gross - discAmt)
        const taxAmt = (l.taxAmount !== undefined && l.taxAmount !== null && Number(l.taxAmount) > 0)
          ? (parseFloat(l.taxAmount) || 0)
          : (() => {
              const tp = parseFloat(l.taxPercent || l.taxPercentage || l.taxRate || '0') || 0
              return (taxable * tp) / 100
            })()
        const total = (l.lineTotalWithTax !== undefined && l.lineTotalWithTax !== null)
          ? Number(l.lineTotalWithTax)
          : (taxable + taxAmt)
        
        const desc = l.description || l.itemDescription || l.desc || l.productName || l.itemName || l.name || 'Commercial Tax Invoice Items'

        return [
          idx + 1,
          desc,
          String(qty),
          money(price),
          money(discAmt),
          money(taxAmt),
          money(total)
        ]
      })

      autoTable(doc, {
        startY: tableStartY,
        head: [['#', 'Description', 'Qty', 'Unit Price', 'Discount', 'Tax', 'Total']],
        body: linesData,
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

      const finalY = (doc as any).lastAutoTable?.finalY || 120

      // ── Financial Summary ──
      const totalsX = 120
      const totalsValX = pageW - 14

      doc.setDrawColor(...tealMid)
      doc.line(totalsX, finalY + 8, totalsValX, finalY + 8)

      // Canonical totals for PDF
      const subTotal = inv.subTotal !== undefined && inv.subTotal !== null
        ? Number(inv.subTotal)
        : lines.reduce((s: number, l: any) => s + ((parseFloat(l.quantity) || 1) * (parseFloat(l.unitPrice) || 0)), 0)

      const discTotal = inv.discountTotal !== undefined && inv.discountTotal !== null
        ? Number(inv.discountTotal)
        : lines.reduce((s: number, l: any) => {
            if (l.discountAmount !== undefined && l.discountAmount !== null) return s + (parseFloat(l.discountAmount) || 0)
            const q = parseFloat(l.quantity || '1') || 1
            const p = parseFloat(l.unitPrice || '0') || 0
            const gross = q * p
            const dv = parseFloat(l.discountValue || '0') || 0
            const dt = l.discountType ?? 0
            return s + (dt === 0 ? (gross * dv / 100) : Math.min(dv, gross))
          }, 0)

      const taxTotal = inv.taxTotal !== undefined && inv.taxTotal !== null
        ? Number(inv.taxTotal)
        : lines.reduce((s: number, l: any) => {
            if (l.taxAmount !== undefined && l.taxAmount !== null) return s + (parseFloat(l.taxAmount) || 0)
            const q = parseFloat(l.quantity || '1') || 1
            const p = parseFloat(l.unitPrice || '0') || 0
            const gross = q * p
            const da = l.discountAmount !== undefined && l.discountAmount !== null
              ? (parseFloat(l.discountAmount) || 0)
              : ((l.discountType ?? 0) === 0 ? (gross * (parseFloat(l.discountValue) || 0)) / 100 : Math.min(parseFloat(l.discountValue) || 0, gross))
            const taxable = Math.max(0, gross - da)
            const tp = parseFloat(l.taxPercent || '0') || 0
            return s + (taxable * tp) / 100
          }, 0)

      const netTotal = inv.totalAmount !== undefined && inv.totalAmount !== null
        ? Number(inv.totalAmount)
        : (subTotal - discTotal + taxTotal)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Subtotal:', totalsX, finalY + 14)
      doc.setTextColor(30, 41, 59)
      doc.text(money(subTotal), totalsValX, finalY + 14, { align: 'right' })

      if (discTotal > 0) {
        doc.setTextColor(225, 29, 72)
        doc.text('Discount:', totalsX, finalY + 20)
        doc.text(`-${money(discTotal)}`, totalsValX, finalY + 20, { align: 'right' })
      }

      if (taxTotal > 0) {
        doc.setTextColor(217, 119, 6)
        doc.text('Tax / VAT:', totalsX, finalY + (discTotal > 0 ? 26 : 20))
        doc.text(`+${money(taxTotal)}`, totalsValX, finalY + (discTotal > 0 ? 26 : 20), { align: 'right' })
      }

      doc.setDrawColor(...tealDark)
      doc.setLineWidth(0.5)
      doc.line(totalsX, finalY + (discTotal > 0 ? 30 : 24), totalsValX, finalY + (discTotal > 0 ? 30 : 24))

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...tealDark)
      doc.text(`TOTAL (${currency}):`, totalsX, finalY + (discTotal > 0 ? 37 : 31))
      doc.text(money(netTotal), totalsValX, finalY + (discTotal > 0 ? 37 : 31), { align: 'right' })

      if (inv.paidAmount > 0) {
        const paidY = discTotal > 0 ? 40 : 34
        doc.setDrawColor(...tealMid)
        doc.line(totalsX, finalY + paidY, totalsValX, finalY + paidY)
        doc.setFontSize(9)
        doc.setTextColor(16, 185, 129)
        doc.text('Amount Paid:', totalsX, finalY + paidY + 6)
        doc.text(money(inv.paidAmount), totalsValX, finalY + paidY + 6, { align: 'right' })

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(225, 29, 72)
        doc.text('Balance Due:', totalsX, finalY + paidY + 12)
        doc.text(money(inv.amountDue != null ? inv.amountDue : netTotal), totalsValX, finalY + paidY + 12, { align: 'right' })
      }

      // ── Terms & Conditions ──
      const termsY = finalY + (inv.paidAmount > 0 ? 58 : 48)
      doc.setFillColor(235, 248, 245)
      doc.rect(14, termsY, pageW - 28, 32, 'F')
      doc.setDrawColor(...tealMid)
      doc.rect(14, termsY, pageW - 28, 32, 'S')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...tealDark)
      doc.text('TERMS & CONDITIONS', 18, termsY + 6)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(71, 85, 105)
      const terms = inv.terms || '1. Payment is due within 30 days of invoice date.\n2. Late payments are subject to a 1.5% monthly interest charge.\n3. All goods remain property of seller until fully paid.\n4. Returns accepted within 14 days of delivery with original packaging.\n5. Any dispute shall be resolved under local jurisdiction.'
      const splitTerms = doc.splitTextToSize(terms, pageW - 36)
      doc.text(splitTerms.slice(0, 6), 18, termsY + 12)

      // ── Notes ──
      if (inv.notes) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...tealDark)
        doc.text('NOTES:', 14, termsY + 38)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(71, 85, 105)
        const splitNotes = doc.splitTextToSize(inv.notes, pageW - 28)
        doc.text(splitNotes.slice(0, 3), 14, termsY + 43)
      }

      // ── Signature Area ──
      const sigY = 260
      doc.setDrawColor(...tealMid)
      doc.line(14, sigY, 80, sigY)
      doc.line(pageW - 80, sigY, pageW - 14, sigY)

      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('Authorized Signature', 14, sigY + 5)
      doc.text('Customer Signature', pageW - 80, sigY + 5)

      // ── Footer ──
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(`Generated by ${compName} • AMS ERP • Tax Invoice`, 14, 287)
      doc.text(`Page 1 of 1`, pageW - 14, 287, { align: 'right' })

      doc.save(`Invoice_${invNum}.pdf`)
      notify(`✓ Invoice ${invNum} PDF downloaded successfully!`)
    } catch (err: any) {
      notify(`PDF generation error: ${err.message}`)
    }
  }

  const postInvoice = async () => {
    try {
      if (!postModal) return
      // Deduct inventory for each line item
      if (postModal.lines) {
        for (const line of postModal.lines) {
          const qty = parseFloat(line.quantity) || 0
          if (qty > 0 && line.warehouseId) {
            await createStockTransaction({
              productId: line.productId,
              warehouseId: line.warehouseId,
              type: 'Out',
              quantity: qty,
              unitCost: parseFloat(line.unitPrice) || 0,
              reference: `INV-${postModal.invoiceNumber || postModal.id}`,
              entityId: activeEntityId
            })
          }
        }
      }
      await postInvoiceStore(postModal.id, {
        arAccountId: postForm.arAccId || null,
        revenueAccountId: postForm.revenueAccId || null,
        taxLiabilityAccountId: postForm.taxLiabilityAccId || null
      })
      notify(`✓ Invoice ${postModal.invoiceNumber || postModal.reference} approved, posted & inventory deducted!`)
      setPostModal(null)
      await fetchData()
    } catch (e: any) {
      notify(e.message || 'Error posting invoice')
    }
  }

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv: any) => {
        const statusText = typeof inv.status === 'number'
          ? ['Draft', 'Sent', 'Paid', 'Void', 'Partly Paid', 'Overdue'][inv.status] || ''
          : String(inv.status || '')

        const matchesQuery = !query.trim()
          ? true
          : `${inv.invoiceNumber || ''} ${inv.customerName || ''} ${statusText}`
              .toLowerCase()
              .includes(query.toLowerCase())

        const matchesStatus = statusFilter === 'all' || statusText.toLowerCase() === statusFilter.toLowerCase()

        return matchesQuery && matchesStatus
      })
      .sort((a: any, b: any) => {
        const dateA = a.invoiceDate || a.date || ''
        const dateB = b.invoiceDate || b.date || ''
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA)
        }
        const numA = a.invoiceNumber || a.reference || ''
        const numB = b.invoiceNumber || b.reference || ''
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' })
      })
  }, [invoices, query, statusFilter])

  const exportHeaders = ['Invoice #', 'Customer', 'Date', 'Due Date', 'Discount', 'Tax', 'Total', 'Due', 'Status']
  const exportRows = filteredInvoices.map((inv: any) => [
    inv.invoiceNumber,
    inv.customerName,
    inv.invoiceDate,
    inv.dueDate,
    inv.discountTotal || 0,
    inv.taxTotal || 0,
    inv.totalAmount || 0,
    inv.amountDue || 0,
    typeof inv.status === 'number'
      ? ['Draft', 'Sent', 'Paid', 'Void', 'Partly Paid', 'Overdue'][inv.status]
      : inv.status
  ])

  const isDraftInv = (i: any) => i.status === 0 || i.status === '0' || String(i.status).toLowerCase() === 'draft'
  const isVoidInv = (i: any) => i.status === 3 || i.status === '3' || String(i.status).toLowerCase() === 'void' || String(i.status).toLowerCase() === 'cancelled'
  const isPaidInv = (i: any) => i.status === 2 || i.status === '2' || String(i.status).toLowerCase() === 'paid'

  const activeInvoices = invoices.filter((i: any) => !isDraftInv(i) && !isVoidInv(i))
  const openInvoicesList = activeInvoices.filter((i: any) => !isPaidInv(i) && (i.amountDue ?? (i.totalAmount - (i.paidAmount || 0))) > 0)

  const totalOutstanding = openInvoicesList.reduce((s: number, i: any) => s + ((i.amountDue ?? (i.totalAmount - (i.paidAmount || 0))) || 0), 0)
  const totalPaid = invoices.filter((i: any) => !isVoidInv(i)).reduce((s: number, i: any) => s + (Number(i.paidAmount || (isPaidInv(i) ? i.totalAmount : 0)) || 0), 0)
  
  const draftInvoicesList = invoices.filter((i: any) => isDraftInv(i))
  const draftCount = draftInvoicesList.length
  const draftTotalAmount = draftInvoicesList.reduce((s: number, i: any) => s + (Number(i.totalAmount) || 0), 0)

  const assignedCompany = entities.find(e => e.id === activeEntityId)

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-[9999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg px-4 py-3 text-sm font-medium text-[var(--color-text-strong)]">{toast}</div>}

      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-sky-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-sky-400 to-blue-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Receipt className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Sales Invoices &amp; Billing</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" /> Live Ledger
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Manage customer sales invoices, automated GAAP general ledger posting, and accounts receivable.</p>
            </div>
          </div>
        <div className="flex items-center gap-2 shrink-0">
          <DataToolbar
            query={query}
            setQuery={setQuery}
            searchPlaceholder="Search invoice #, customer..."
            exportFileName="sales-invoices"
            exportSheetName="Sales Invoices"
            exportTitle="Sales Invoices"
            exportSubtitle="Sales invoice register with posting to the general ledger."
            exportHeaders={exportHeaders}
            exportRows={exportRows}
            exportTotals={[{ label: 'Total Outstanding', value: totalOutstanding }]}
          >
            <select
              className="h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] outline-none focus:border-[var(--color-primary)]"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="partly paid">Partially Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </DataToolbar>
          <button onClick={openCreateModal} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30 hover:-translate-y-0.5">
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
          </div>
        </div>
      </div>

      {/* Modern KPI Cards */}
      <KpiGrid cols={4}>
        {[
          { label: 'Total Outstanding', value: money(totalOutstanding), desc: `${openInvoicesList.length} approved receivables`, icon: Coins, tone: 'blue' },
          { label: 'Paid Collections', value: money(totalPaid), desc: `${invoices.filter((i: any) => isPaidInv(i)).length} settled invoices`, icon: CheckCircle2, tone: 'emerald' },
          { label: 'Draft Invoices', value: String(draftCount), desc: draftCount > 0 ? `${money(draftTotalAmount)} pending` : 'Ready for posting', icon: FileText, tone: 'amber' },
          { label: 'Total Invoices', value: String(invoices.filter((i: any) => !isVoidInv(i)).length), desc: `${invoices.filter((i: any) => isVoidInv(i)).length} cancelled/void`, icon: Receipt, tone: 'purple' },
        ].map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </KpiGrid>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-sky-500 to-blue-600" />
            Invoice Register
          </p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Showing {filteredInvoices.length} of {invoices.length} record{invoices.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No sales invoices found"
            hint="Create your first invoice or adjust the search and status filters."
            action={
              <button onClick={openCreateModal} className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white text-xs font-bold shadow-lg shadow-sky-500/25">
                <Plus className="w-4 h-4" /> Create Invoice
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-sky-500/[0.05] dark:bg-sky-400/[0.07] border-b border-[var(--color-border)]">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Invoice #</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Due Date</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Subtotal</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Discount</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Tax</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Net Total</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Due</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredInvoices.map((inv: any, idx: number) => {
                  const statusKey = typeof inv.status === 'number'
                    ? ['Draft', 'Sent', 'Paid', 'Void', 'PartiallyPaid', 'Overdue'][inv.status] || 'Draft'
                    : String(inv.status || 'Draft')
                  const badge = statusStyles[statusKey] || statusStyles.Draft
                  const lines: any[] = inv.lines || []
                  
                  // Canonical subtotal / gross
                  const grossAmount = inv.subTotal !== undefined && inv.subTotal !== null
                    ? Number(inv.subTotal)
                    : (lines.length > 0
                        ? lines.reduce((s, l) => s + ((parseFloat(l.quantity) || 1) * (parseFloat(l.unitPrice) || 0)), 0)
                        : (inv.grossAmount ?? inv.totalAmount ?? 0))

                  // Canonical discount
                  const discountAmount = inv.discountTotal !== undefined && inv.discountTotal !== null
                    ? Number(inv.discountTotal)
                    : (lines.length > 0
                        ? lines.reduce((s, l) => {
                            if (l.discountAmount !== undefined && l.discountAmount !== null) {
                              return s + (parseFloat(l.discountAmount) || 0)
                            }
                            const qty = parseFloat(l.quantity) || 1
                            const price = parseFloat(l.unitPrice) || 0
                            const gross = qty * price
                            const dv = parseFloat(l.discountValue) || 0
                            const dt = l.discountType ?? 0
                            return s + (dt === 0 ? (gross * dv) / 100 : Math.min(dv, gross))
                          }, 0)
                        : 0)

                  // Canonical tax
                  const taxAmount = inv.taxTotal !== undefined && inv.taxTotal !== null
                    ? Number(inv.taxTotal)
                    : (lines.length > 0
                        ? lines.reduce((s, l) => {
                            if (l.taxAmount !== undefined && l.taxAmount !== null) {
                              return s + (parseFloat(l.taxAmount) || 0)
                            }
                            const qty = parseFloat(l.quantity) || 1
                            const price = parseFloat(l.unitPrice) || 0
                            const gross = qty * price
                            const da = l.discountAmount !== undefined && l.discountAmount !== null
                              ? (parseFloat(l.discountAmount) || 0)
                              : ((l.discountType ?? 0) === 0 ? (gross * (parseFloat(l.discountValue) || 0)) / 100 : Math.min(parseFloat(l.discountValue) || 0, gross))
                            const taxable = Math.max(0, gross - da)
                            const tp = parseFloat(l.taxPercent) || 0
                            return s + (taxable * tp) / 100
                          }, 0)
                        : 0)

                  const netTotal = inv.totalAmount !== undefined && inv.totalAmount !== null
                    ? Number(inv.totalAmount)
                    : (grossAmount - discountAmount + taxAmount)

                  const amountDue = inv.amountDue !== undefined && inv.amountDue !== null
                    ? Number(inv.amountDue)
                    : (netTotal - (Number(inv.paidAmount || inv.amountPaid) || 0))

                  return (
                    <tr key={inv.id} className="hover:bg-[var(--color-surface-muted)]/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-sky-600">{getFormattedInvoiceNumber(inv.invoiceNumber || inv.reference, idx)}</td>
                      <td className="px-5 py-3.5 font-medium text-[var(--color-text-strong)]">{inv.customerName || '—'}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-muted)] text-xs">{inv.invoiceDate}</td>
                      <td className="px-5 py-3.5 text-[var(--color-text-muted)] text-xs">{inv.dueDate}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-[var(--color-text-strong)]">{money(grossAmount)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-rose-500">{discountAmount > 0 ? `-${money(discountAmount)}` : '—'}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-amber-600">{taxAmount > 0 ? `+${money(taxAmount)}` : '—'}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-[var(--color-text-strong)]">{money(netTotal)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-rose-600">{money(amountDue)}</td>
                      <td className="px-5 py-3 text-center"><StatusChip status={statusKey} label={badge.label} hex={badge.hex} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => downloadInvoicePdf(inv)} title="Download PDF" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-sky-500/10 hover:border-sky-500/30 flex items-center justify-center transition-all"><Download className="w-3.5 h-3.5 text-sky-500" /></button>
                          {inv.status !== 3 && inv.status !== 'Void' && <button onClick={() => cancelInvoice(inv)} title="Cancel / Void Invoice" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-rose-500/10 hover:border-rose-500/30 flex items-center justify-center transition-all"><Ban className="w-3.5 h-3.5 text-rose-500" /></button>}
                          {(inv.status === 0 || inv.status === 'Draft') && <button onClick={() => openPostModal(inv)} title="Approve & Post to Ledger" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-emerald-500/10 hover:border-emerald-500/30 flex items-center justify-center transition-all"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /></button>}
                          {(inv.status === 0 || inv.status === 'Draft') && <button onClick={() => openEditModal(inv)} title="Edit Invoice" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-blue-500/10 hover:border-blue-500/30 flex items-center justify-center transition-all"><Pencil className="w-3.5 h-3.5 text-blue-500" /></button>}
                          {amountDue > 0 && inv.status !== 0 && inv.status !== 'Draft' && inv.status !== 3 && inv.status !== 'Void' && (
                            <button onClick={() => handleRecordPayment(inv)} title="Record Customer Payment" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-emerald-500/10 hover:border-emerald-500/30 flex items-center justify-center transition-all cursor-pointer">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                          <button onClick={() => { openEditModal(inv); setModalTab('preview'); }} title="View Invoice" className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-indigo-500/10 hover:border-indigo-500/30 flex items-center justify-center transition-all"><Eye className="w-3.5 h-3.5 text-indigo-500" /></button>
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

      {/* Tabbed / Stepped Invoice Creation Modal */}
      {showForm && (
        <div className="overlay animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-sm"><Receipt className="w-5 h-5" /></div>
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-strong)]">{editingInvoice ? 'Edit Sales Invoice' : 'Create Sales Invoice'}</h2>
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
                <span>Customer & Details</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('lines')}
                className={`erp-step-pill ${modalTab === 'lines' ? 'active' : ''}`}
              >
                <span className="erp-step-num">2</span>
                <Receipt className="w-3.5 h-3.5" />
                <span>Line Items ({lines.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('summary')}
                className={`erp-step-pill ${modalTab === 'summary' ? 'active' : ''}`}
              >
                <span className="erp-step-num">3</span>
                <Coins className="w-3.5 h-3.5" />
                <span>Summary & Posting</span>
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

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
              {modalTab === 'details' && (
                <div className="space-y-5">
                  <div className="erp-form-card space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-sky-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Invoice Header & Terms</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 1 of 4</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Customer Account
                        </label>
                        <CompactSelect
                          value={form.customerId}
                          onChange={v => setForm({ ...form, customerId: v })}
                          placeholder="Select a customer..."
                          searchPlaceholder="Search customer by name or code..."
                          options={customers.map((c: any) => ({
                            value: c.id,
                            label: c.name,
                            badge: c.customerNumber || undefined,
                            sublabel: c.creditLimit ? `Limit: ${money(c.creditLimit, c.currencyCode || form.currencyCode)}` : undefined,
                          }))}
                          className="h-10 text-xs font-semibold"
                        />

                        {selectedCustomer && (
                          <div className={`mt-3 p-4 rounded-xl border text-xs transition-all ${
                            isCreditLimitExceeded
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                              : customerCreditLimit > 0
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                              : 'bg-[var(--color-surface-muted)]/50 border-[var(--color-border)] text-[var(--color-text-muted)]'
                          }`}>
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1.5">
                                {isCreditLimitExceeded ? '⚠️ Credit Limit Warning' : customerCreditLimit > 0 ? '✓ Credit Policy Verified' : 'ℹ️ Customer Terms'}
                              </span>
                              <span className="font-mono">
                                Limit: {customerCreditLimit > 0 ? money(customerCreditLimit, form.currencyCode) : 'Unlimited'}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] gap-2">
                              <span>Outstanding AR: <strong>{money(currentCustomerBalance, form.currencyCode)}</strong></span>
                              <span>This Invoice Total: <strong>{money(netTotal, form.currencyCode)}</strong></span>
                              <span>Post-Invoice Exposure: <strong className={isCreditLimitExceeded ? 'text-rose-600 dark:text-rose-400 font-mono font-bold' : 'font-mono'}>{money(totalCreditExposure, form.currencyCode)}</strong></span>
                            </div>
                            {isCreditLimitExceeded && (
                              <p className="mt-2 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                                ⚠️ This invoice exceeds the customer's credit limit by <strong>{money(excessCreditAmount, form.currencyCode)}</strong>.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Invoice Reference #
                        </label>
                        <div className="relative">
                          <Hash className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="e.g. INV-0001 (Auto-generated)"
                            value={form.reference}
                            onChange={e => setForm({ ...form, reference: e.target.value })}
                            className="erp-form-input pl-10! font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Billing Currency
                        </label>
                        <select
                          value={form.currencyCode}
                          onChange={e => setForm({ ...form, currencyCode: e.target.value })}
                          className="erp-form-select font-bold"
                        >
                          {['PKR', 'USD', 'AED', 'SAR', 'GBP', 'EUR', 'CAD', 'AUD'].map(curr => (
                            <option key={curr} value={curr}>{curr}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Invoice Date
                        </label>
                        <input
                          type="date"
                          value={form.invoiceDate}
                          onChange={e => setForm({ ...form, invoiceDate: e.target.value })}
                          className="erp-form-input font-medium"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Payment Due Date
                        </label>
                        <input
                          type="date"
                          value={form.dueDate}
                          onChange={e => setForm({ ...form, dueDate: e.target.value })}
                          className="erp-form-input font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'lines' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-strong)]">Invoice Items & Quantities</p>
                  </div>

                  <div className="border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs min-w-[950px]">
                      <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] font-semibold border-b border-[var(--color-border)]">
                        <tr>
                          <th className="p-2.5 text-left w-[170px] min-w-[140px]">Product / Service</th>
                          <th className="p-2.5 text-left min-w-[180px]">Description</th>
                          <th className="p-2.5 text-left w-[140px] min-w-[120px]">Warehouse</th>
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
                          <tr key={i} className="hover:bg-[var(--color-surface-muted)]/50">
                            <td className="p-2">
                              <CompactProductSelect
                                value={l.productId}
                                onChange={v => updateLine(i, 'productId', v)}
                                products={products}
                                filterPurpose={['FinishedGood', 'Service']}
                              />
                            </td>
                            <td className="p-2">
                              <textarea
                                placeholder="Item description / details..."
                                value={l.description}
                                onChange={e => updateLine(i, 'description', e.target.value)}
                                rows={2}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] outline-none resize-none"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={l.warehouseId}
                                onChange={e => updateLine(i, 'warehouseId', e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] outline-none"
                              >
                                <option value="">Select...</option>
                                {warehouses.map((w: any) => (
                                  <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                value={l.quantity}
                                onChange={e => updateLine(i, 'quantity', e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono text-[var(--color-text-strong)] outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={l.unitPrice}
                                onChange={e => updateLine(i, 'unitPrice', e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono text-[var(--color-text-strong)] outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1.5 min-w-[130px]">
                                <CompactDiscountTypeSelect
                                  value={l.discountType}
                                  onChange={val => updateLine(i, 'discountType', val)}
                                  currencyCode={form.currencyCode}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  step={l.discountType === 0 ? "1" : "0.01"}
                                  value={l.discountValue}
                                  onChange={e => updateLine(i, 'discountValue', e.target.value)}
                                  className="w-full min-w-[65px] h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono text-[var(--color-text-strong)] outline-none"
                                />
                              </div>
                            </td>
                            <td className="p-2">
                              <CompactTaxSelect
                                value={l.taxPercent}
                                onChange={v => updateLine(i, 'taxPercent', v)}
                                taxCodes={applicableTaxCodes}
                              />
                            </td>
                            <td className="p-2 text-right font-mono font-semibold text-[var(--color-text-strong)]">
                              {money(lineCalculations[i]?.total || 0)}
                            </td>
                            <td className="p-2 text-center">
                              {lines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLine(i)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-rose-500 hover:bg-rose-500/10"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-start pt-1">
                    <button
                      type="button"
                      onClick={addLine}
                      className="h-8 px-3.5 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-xs font-semibold hover:bg-[var(--color-primary)]/10 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" /> Add Line
                    </button>
                  </div>
                </div>
              )}

              {modalTab === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 space-y-4">
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Invoice Notes & Payment Instructions
                    </label>
                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Payment terms, bank transfer details, delivery notes..."
                      className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] outline-none shadow-2xs resize-none"
                    />
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Saving as Draft creates the audit record. You can post to the GL at any time.</span>
                    </div>

                    {isCreditLimitExceeded && (
                      <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs space-y-2">
                        <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                          <span>⚠️ Manager Credit Override Required</span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                          Customer limit is <strong>{money(customerCreditLimit, form.currencyCode)}</strong>. Total exposure will be <strong>{money(totalCreditExposure, form.currencyCode)}</strong> (Exceeds by <strong>{money(excessCreditAmount, form.currencyCode)}</strong>).
                        </p>
                        <label className="flex items-center gap-2 pt-1 cursor-pointer font-semibold text-rose-600 dark:text-rose-400">
                          <input
                            type="checkbox"
                            checked={creditOverride}
                            onChange={e => setCreditOverride(e.target.checked)}
                            className="rounded border-amber-500 text-amber-600 focus:ring-amber-500 w-4 h-4"
                          />
                          <span>Acknowledge & Authorize Credit Limit Override</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="bg-[var(--color-surface-muted)]/60 border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Invoice Breakdown</p>
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Subtotal</span>
                      <span className="font-semibold font-mono text-[var(--color-text-strong)]">{money(subTotal)}</span>
                    </div>
                    {discountTotal > 0 && (
                      <div className="flex justify-between text-xs text-rose-500 font-mono">
                        <span>Total Discount</span>
                        <span>-{money(discountTotal)}</span>
                      </div>
                    )}
                    {taxTotal > 0 && (
                      <div className="flex justify-between text-xs text-amber-500 font-mono">
                        <span>Sales Tax / VAT</span>
                        <span>+{money(taxTotal)}</span>
                      </div>
                    )}
                    <div className="border-t border-[var(--color-border)] pt-2.5 flex justify-between text-sm font-bold text-[var(--color-text-strong)]">
                      <span>Net Total</span>
                      <span className="text-sky-600 font-mono">{money(netTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-indigo-500/10 border border-sky-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2"><span className="text-lg font-bold text-[var(--color-text-strong)]">{form.reference}</span><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20">Ready to Submit</span></div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">Client: <strong>{customers.find((c: any) => c.id === form.customerId)?.name || 'N/A'}</strong> | Currency: <span className="font-mono font-bold">{form.currencyCode}</span> | Lines: <strong>{lines.length}</strong></p>
                    </div>
                  </div>

                  <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                          <th className="text-left px-3.5 py-2 font-semibold">#</th>
                          <th className="text-left px-3.5 py-2 font-semibold">Description</th>
                          <th className="text-center px-3.5 py-2 font-semibold">Qty</th>
                          <th className="text-right px-3.5 py-2 font-semibold">Unit Price</th>
                          <th className="text-right px-3.5 py-2 font-semibold">Discount</th>
                          <th className="text-right px-3.5 py-2 font-semibold">Tax</th>
                          <th className="text-right px-3.5 py-2 font-semibold">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {lines.map((l, i) => {
                          const calc = lineCalculations[i] || { gross: 0, discountAmount: 0, taxAmount: 0, total: 0 };
                          const qty = parseFloat(l.quantity) || 0;
                          const price = parseFloat(l.unitPrice) || 0;
                          return (
                            <tr key={i} className="hover:bg-[var(--color-surface-muted)]/50">
                              <td className="px-3.5 py-2 font-mono">{i + 1}</td>
                              <td className="px-3.5 py-2 font-semibold">
                                {l.description || products.find((p: any) => p.id === l.productId)?.name || '—'}
                              </td>
                              <td className="px-3.5 py-2 text-center font-mono">{qty}</td>
                              <td className="px-3.5 py-2 text-right font-mono">{money(price)}</td>
                              <td className="px-3.5 py-2 text-right font-mono text-rose-500">
                                {calc.discountAmount > 0 ? `-${money(calc.discountAmount)}` : '—'}
                              </td>
                              <td className="px-3.5 py-2 text-right font-mono text-amber-600">
                                {calc.taxAmount > 0 ? `+${money(calc.taxAmount)}` : '—'}
                              </td>
                              <td className="px-3.5 py-2 text-right font-mono font-bold">
                                {money(calc.total)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-[var(--color-border)]">
                      <p className="font-bold">Notes & Payment Instructions</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                        {form.notes || 'Standard payment terms.'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--color-border)] space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-mono">{money(totals.sub)}</span>
                      </div>
                      {totals.disc > 0 && (
                        <div className="flex justify-between text-rose-500">
                          <span>Discount:</span>
                          <span>-{money(totals.disc)}</span>
                        </div>
                      )}
                      {totals.tax > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Tax:</span>
                          <span>+{money(totals.tax)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-bold text-sm">
                        <span>Total:</span>
                        <span className="text-sky-600 font-mono">{money(totals.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 flex items-center justify-between gap-3">
              <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>{modalTab === 'preview' ? 'Ready for final verification & creation' : 'Auto-draft protection active'}</span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
                <button
                  type="button"
                  className="h-9 min-h-[36px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors whitespace-nowrap leading-none flex items-center justify-center shrink-0"
                  onClick={handleCancelForm}
                >
                  Cancel
                </button>

                {modalTab !== 'details' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalTab === 'preview') setModalTab('summary')
                      else if (modalTab === 'summary') setModalTab('lines')
                      else if (modalTab === 'lines') setModalTab('details')
                    }}
                    className="h-9 min-h-[36px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap leading-none shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>{modalTab === 'preview' ? 'Back to Edit' : 'Back'}</span>
                  </button>
                )}

                {modalTab !== 'preview' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalTab === 'details') {
                        if (!form.customerId) {
                          notify('Please select a customer.')
                          return
                        }
                        setModalTab('lines')
                      } else if (modalTab === 'lines') {
                        setModalTab('summary')
                      } else if (modalTab === 'summary') {
                        setModalTab('preview')
                      }
                    }}
                    className="h-9 min-h-[36px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap leading-none shrink-0"
                  >
                    <span>
                      {modalTab === 'details' ? 'Next: Line Items' : modalTab === 'lines' ? 'Next: Summary & Posting' : 'Preview Invoice'}
                    </span>
                    {modalTab === 'summary' ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveInvoice}
                    className="h-9 min-h-[36px] px-5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white whitespace-nowrap leading-none shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{editingInvoice ? 'Confirm & Save Changes' : 'Confirm & Create Invoice (Draft)'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Invoice Modal */}
      {postModal && (
        <div className="overlay animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight">Post Invoice to Ledger</h3>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3.5 text-xs">
              <p className="font-semibold text-[var(--color-text-strong)]">{formatInvoiceNumber(postModal?.invoiceNumber || postModal?.reference)} — {postModal?.customerName || 'Customer'}</p>
              <p className="text-[var(--color-text-muted)] mt-1">Total Amount: <strong className="text-sky-600 font-mono">{money(postModal?.totalAmount || 0)}</strong></p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                Posting generates GAAP double entries: <strong>Dr Accounts Receivable</strong> and <strong>Cr Revenue / Sales Tax</strong>.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                Accounts Receivable Account
              </label>
              <CompactSelect
                value={postForm.arAccId}
                onChange={v => setPostForm({ ...postForm, arAccId: v })}
                placeholder="Default (Customer Receivables 12000)"
                searchPlaceholder="Search AR account..."
                clearLabel="Default (Customer Receivables 12000)"
                options={((Array.isArray(accounts) ? accounts : []).filter((a: any) => a && (a.type === 'Asset' || a.type === 0 || String(a.type).toLowerCase() === 'asset' || a.code?.startsWith('1'))).length > 0
                  ? (Array.isArray(accounts) ? accounts : []).filter((a: any) => a && (a.type === 'Asset' || a.type === 0 || String(a.type).toLowerCase() === 'asset' || a.code?.startsWith('1')))
                  : (Array.isArray(accounts) ? accounts : [])
                ).map((a: any) => ({
                  value: a?.id,
                  label: `${a?.code} — ${a?.name}`,
                  badge: 'Asset'
                }))}
                className="h-10 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                Revenue Account
              </label>
              <CompactSelect
                value={postForm.revenueAccId}
                onChange={v => setPostForm({ ...postForm, revenueAccId: v })}
                placeholder="Default (Sales Revenue 41100)"
                searchPlaceholder="Search Revenue account..."
                clearLabel="Default (Sales Revenue 41100)"
                options={((Array.isArray(accounts) ? accounts : []).filter((a: any) => a && (a.type === 'Revenue' || a.type === 3 || String(a.type).toLowerCase() === 'revenue' || a.code?.startsWith('4'))).length > 0
                  ? (Array.isArray(accounts) ? accounts : []).filter((a: any) => a && (a.type === 'Revenue' || a.type === 3 || String(a.type).toLowerCase() === 'revenue' || a.code?.startsWith('4')))
                  : (Array.isArray(accounts) ? accounts : [])
                ).map((a: any) => ({
                  value: a?.id,
                  label: `${a?.code} — ${a?.name}`,
                  badge: 'Revenue'
                }))}
                className="h-10 text-xs"
              />
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={postInvoice}
                className="flex-1 h-8.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors"
              >
                Post to Ledger
              </button>
              <button
                type="button"
                onClick={() => setPostModal(null)}
                className="h-8.5 px-4 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
