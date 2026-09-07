import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Check, X, ArrowRight, ArrowLeft, Coins,
  CheckCircle2, Hash, Users, Truck, Eye, XCircle,
  FileText, ArrowUpRight, TrendingUp
} from 'lucide-react'
import { useSalesOrdersStore, useCustomersStore, useProductsStore, useAssetsInventoryStore } from './stores'
import { useFormDraft } from './hooks/useFormDraft'
import { DataToolbar } from '@/components/ui/data-toolbar'
import { money } from './lib/currency'
import { StatusChip } from './components/ui/status-chip'
import { EmptyState, TableSkeleton } from './components/ui/empty-state'
import { getActiveTaxCodes } from './lib/taxLocalization'
import { CompactTaxSelect } from './components/CompactTaxSelect'
import { CompactProductSelect } from './components/CompactProductSelect'
import { CompactSelect } from './components/CompactSelect'

const statusStyles: Record<string, { label: string; hex: string }> = {
  Draft: { label: 'Draft', hex: '#94a3b8' },
  Confirmed: { label: 'Confirmed', hex: '#0ea5e9' },
  Invoiced: { label: 'Invoiced', hex: '#10b981' },
  Cancelled: { label: 'Cancelled', hex: '#ef4444' }
}

export const SalesOrdersWorkspace: React.FC<{ activeEntityId: string; entities?: any[] }> = ({
  activeEntityId,
  entities = []
}) => {
  const applicableTaxCodes = useMemo(() => getActiveTaxCodes(), [activeEntityId])
  const orders = useSalesOrdersStore(s => s.orders)
  const fetchOrders = useSalesOrdersStore(s => s.fetchOrders)
  const createOrder = useSalesOrdersStore(s => s.createOrder)
  const updateOrderStatus = useSalesOrdersStore(s => s.updateOrderStatus)
  const convertToInvoice = useSalesOrdersStore(s => s.convertToInvoice)
  const fetchNextNumber = useSalesOrdersStore(s => s.fetchNextNumber)

  const customers = useCustomersStore(s => s.customers)
  const fetchCustomers = useCustomersStore(s => s.fetchCustomers)

  const products = useProductsStore(s => s.products)
  const fetchProducts = useProductsStore(s => s.fetchProducts)

  const warehouses = useAssetsInventoryStore(s => s.warehouses)
  const fetchWarehouses = useAssetsInventoryStore(s => s.fetchWarehouses)
  const stockLevels = useAssetsInventoryStore(s => s.stockLevels)
  const fetchStockLevels = useAssetsInventoryStore(s => s.fetchStockLevels)
  const createStockTransaction = useAssetsInventoryStore(s => s.createStockTransaction)

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [modalTab, setModalTab] = useState<'details' | 'lines' | 'summary' | 'preview'>('details')
  const [activeOrderDetails, setActiveOrderDetails] = useState<any | null>(null)
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [form, setForm] = useState({
    customerId: '',
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    reference: '',
    notes: '',
    terms: 'Delivery within agreed schedule upon confirmation.',
    currencyCode: 'PKR'
  })

  const [lines, setLines] = useState<any[]>([
    { productId: '', description: '', quantity: '1', unitPrice: '0', discountAmount: '0', taxAmount: '0', warehouseId: '' }
  ])

  const { saveDraft, clearDraft } = useFormDraft('sales_order', { form, lines }, (saved: any) => {
    if (saved.form) setForm(saved.form)
    if (saved.lines) setLines(saved.lines)
  }, showForm)

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchOrders(activeEntityId),
        fetchCustomers(activeEntityId),
        fetchProducts(),
        fetchWarehouses(activeEntityId),
        fetchStockLevels(activeEntityId),
      ])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [activeEntityId])

  const notify = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3500)
  }

  const openCreateModal = async () => {
    const nextRef = await fetchNextNumber()
    setForm({
      customerId: customers[0]?.id || '',
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      reference: nextRef || 'SO-00001',
      notes: 'Please expedite delivery according to schedule.',
      terms: 'Standard commercial delivery terms apply.',
      currencyCode: 'PKR'
    })
    setLines([{ productId: '', description: '', quantity: '1', unitPrice: '0', discountAmount: '0', taxAmount: '0' }])
    setModalTab('details')
    setShowForm(true)
  }

  const addLine = () =>
    setLines([...lines, { productId: '', description: '', quantity: '1', unitPrice: '0', discountAmount: '0', taxAmount: '0', warehouseId: '' }])

  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i))

  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...lines]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'productId' && value) {
      const prod = products.find((p: any) => p.id === value)
      if (prod) {
        updated[i] = {
          ...updated[i],
          description: prod.name,
          unitPrice: String(prod.unitPrice || prod.salesPrice || 0)
        }
      }
    }
    setLines(updated)
  }

  const subTotal = lines.reduce((s, l) => s + parseFloat(l.quantity || '0') * parseFloat(l.unitPrice || '0'), 0)
  const discountTotal = lines.reduce((s, l) => s + parseFloat(l.discountAmount || '0'), 0)
  const taxTotal = lines.reduce((s, l) => s + parseFloat(l.taxAmount || '0'), 0)
  const grandTotal = subTotal - discountTotal + taxTotal

  const handleSave = async () => {
    if (!form.customerId) {
      notify('Please select a customer.')
      return
    }
    if (lines.some(l => !l.productId)) {
      notify('Please select a product for all line items.')
      return
    }

    const payload = {
      customerId: form.customerId,
      orderDate: form.orderDate,
      expectedDeliveryDate: form.expectedDeliveryDate || undefined,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
      terms: form.terms || undefined,
      companyId: activeEntityId || undefined,
      lines: lines.map(l => ({
        productId: l.productId,
        productName: l.productName || l.description || '',
        description: l.description,
        quantity: parseFloat(l.quantity || '1'),
        unitPrice: parseFloat(l.unitPrice || '0'),
        discountAmount: parseFloat(l.discountAmount || '0'),
        taxAmount: parseFloat(l.taxAmount || '0'),
        warehouseId: l.warehouseId || undefined
      }))
    }

    try {
      await createOrder(payload)
      clearDraft()
      notify('✓ Sales Order created successfully.')
      setShowForm(false)
      loadData()
    } catch (err: any) {
      notify(err.message || 'Error creating sales order')
    }
  }

  const handleConfirm = async (id: string) => {
    try {
      const order = orders.find((o: any) => o.id === id)
      if (order?.lines) {
        for (const line of order.lines) {
          const qty = Number(line.quantity) || 0
          const whId = (line as any).warehouseId
          if (qty > 0 && whId) {
            await createStockTransaction({
              productId: line.productId,
              warehouseId: whId,
              type: 'Out',
              quantity: qty,
              unitCost: Number(line.unitPrice) || 0,
              reference: `SO-${order.orderNumber || id}`,
              entityId: activeEntityId
            })
          }
        }
      }
      await updateOrderStatus(id, 'Confirmed')
      notify('✓ Sales Order confirmed. Inventory deducted.')
      loadData()
    } catch (err: any) {
      notify(err.message || 'Error confirming order')
    }
  }

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this Sales Order?')) {
      try {
        await updateOrderStatus(id, 'Cancelled')
        notify('✓ Sales Order cancelled.')
        loadData()
      } catch (err: any) {
        notify(err.message || 'Error cancelling order')
      }
    }
  }

  const handleConvertToInvoice = async (id: string) => {
    try {
      const res = await convertToInvoice(id)
      notify(`✓ Sales Order converted to draft Invoice: ${res.invoiceNumber}`)
      loadData()
    } catch (err: any) {
      notify(err.message || 'Failed to convert order to invoice')
    }
  }

  const filteredOrders = useMemo(() => {
    return orders
      .filter(o => {
        const cust = customers.find(c => c.id === o.customerId)
        const matchesQuery = !query.trim()
          ? true
          : `${o.orderNumber} ${o.reference || ''} ${cust?.name || ''}`
              .toLowerCase()
              .includes(query.toLowerCase())

        const matchesStatus = statusFilter === 'all' || o.status.toLowerCase() === statusFilter.toLowerCase()

        return matchesQuery && matchesStatus
      })
      .sort((a, b) => {
        const dateA = a.orderDate || ''
        const dateB = b.orderDate || ''
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA)
        }
        const numA = a.orderNumber || a.reference || ''
        const numB = b.orderNumber || b.reference || ''
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' })
      })
  }, [orders, customers, query, statusFilter])

  const metrics = useMemo(() => ({
    total: orders.length,
    draft: orders.filter(o => o.status === 'Draft').length,
    confirmed: orders.filter(o => o.status === 'Confirmed').length,
    invoiced: orders.filter(o => o.status === 'Invoiced').length,
    totalVal: orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  }), [orders])

  const exportHeaders = ['Order Number', 'Order Date', 'Customer', 'Expected Delivery', 'Reference', 'Total Amount', 'Status']
  const exportRows = filteredOrders.map(o => {
    const cust = customers.find(c => c.id === o.customerId)
    return [o.orderNumber, o.orderDate, cust?.name || 'Unknown', o.expectedDeliveryDate || '', o.reference || '', o.totalAmount, o.status]
  })

  const assignedCompany = entities.find(e => e.id === activeEntityId)

  return (
    <div className="space-y-6">
      {toast && (
        <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-semibold z-[9999]">
          {toast}
        </div>
      )}

      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-sky-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-sky-500 to-blue-700" />
              <div className="absolute inset-0 flex items-center justify-center"><FileText className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Sales Orders Management</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" /> Live Ledger
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Manage sales order confirmations, warehouse fulfillment schedules, and seamless invoice conversion.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <DataToolbar
              query={query}
              setQuery={setQuery}
              searchPlaceholder="Search order #, customer..."
              exportFileName="sales-orders"
              exportSheetName="Sales Orders"
              exportTitle="Sales Orders Register"
              exportSubtitle="Sales orders, confirmations, and fulfillment tracking."
              exportHeaders={exportHeaders}
              exportRows={exportRows}
              exportTotals={[{ label: 'Active Value', value: metrics.totalVal }]}
            >
              <select
                className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors shadow-2xs box-border"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">⚡ All Statuses</option>
                <option value="draft">⚪ Draft</option>
                <option value="confirmed">🔵 Confirmed</option>
                <option value="invoiced">🟢 Invoiced</option>
                <option value="cancelled">🔴 Cancelled</option>
              </select>
            </DataToolbar>
            <button
              onClick={openCreateModal}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <span>＋</span> New Order
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards (Row 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'ACTIVE PIPELINE VALUE', value: money(metrics.totalVal), desc: 'Non-cancelled orders', icon: TrendingUp, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-950/30', textColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'PENDING DELIVERY', value: metrics.confirmed, desc: 'Confirmed sales orders', icon: Truck, color: 'from-teal-500 to-emerald-600', bg: 'bg-teal-50 dark:bg-teal-950/30', textColor: 'text-teal-600 dark:text-teal-400' },
          { label: 'INVOICED ORDERS', value: metrics.invoiced, desc: 'Billed to customers', icon: CheckCircle2, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-950/30', textColor: 'text-violet-600 dark:text-violet-400' },
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

      {/* Orders Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-sky-500 to-blue-700" />
            Sales Orders Directory
          </p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            Showing {filteredOrders.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No sales orders found"
            hint="Adjust the search or status filters to see more results."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-sky-500/[0.05] dark:bg-sky-400/[0.07]">
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Order #</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Customer</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Date</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Expected Delivery</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Reference</th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Total</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => {
                  const cust = customers.find(c => c.id === o.customerId)
                  const badge = statusStyles[o.status] || statusStyles.Draft

                  return (
                    <tr key={o.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-colors">
                      <td className="px-3 py-2 font-mono font-semibold text-[var(--color-text-strong)]">{o.orderNumber}</td>
                      <td className="px-3 py-2 font-semibold text-[var(--color-text-strong)]">{cust?.name || '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{o.orderDate}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{o.expectedDeliveryDate || '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)] font-mono">{o.reference || '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-sky-600 font-mono">{money(o.totalAmount)}</td>
                      <td className="px-3 py-2 text-center">
                        <StatusChip status={o.status} label={badge.label} hex={badge.hex} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setActiveOrderDetails(o)}
                            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-muted)]"
                            title="View Details"
                          >
                            <Eye className="w-3 h-3" />
                          </button>

                          {o.status === 'Draft' && (
                            <>
                              <button
                                onClick={() => handleConfirm(o.id)}
                                className="h-6.5 px-2 rounded bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 text-[11px] font-semibold"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => handleCancel(o.id)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-500/10"
                                title="Cancel Order"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </>
                          )}

                          {o.status === 'Confirmed' && (
                            <button
                              onClick={() => handleConvertToInvoice(o.id)}
                              className="h-6.5 px-2 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[11px] font-semibold flex items-center gap-1"
                            >
                              <ArrowUpRight className="w-3 h-3" /> Invoice
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

      {/* Stepped Order Creation Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-strong)]">New Sales Order</h2>
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
                onClick={() => setShowForm(false)}
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
                <Users className="w-3 h-3" /> 1. Customer & Delivery
              </button>

              <button
                type="button"
                onClick={() => setModalTab('lines')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  modalTab === 'lines'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <Coins className="w-3 h-3" /> 2. Items & Quantities ({lines.length})
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
                <FileText className="w-3 h-3" /> 3. Terms & Confirmation
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
                      Order Reference / PO #
                    </label>
                    <div className="flex items-center gap-2.5 h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] transition-colors shadow-2xs">
                      <Hash className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                      <input
                        placeholder="e.g. SO-00001"
                        value={form.reference}
                        onChange={e => setForm({ ...form, reference: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs outline-none"
                      />
                    </div>
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

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Order Date
                    </label>
                    <input
                      type="date"
                      value={form.orderDate}
                      onChange={e => setForm({ ...form, orderDate: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      value={form.expectedDeliveryDate}
                      onChange={e => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] focus:border-[var(--color-primary)] outline-none shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'lines' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-strong)]">Order Items</p>
                  </div>

                  <div className="border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs min-w-[900px]">
                      <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] font-semibold border-b border-[var(--color-border)]">
                        <tr>
                          <th className="p-2.5 text-left w-[170px] min-w-[140px]">Product</th>
                          <th className="p-2.5 text-left min-w-[180px]">Description</th>
                          <th className="p-2.5 text-left w-[140px] min-w-[120px]">Warehouse</th>
                          <th className="p-2.5 text-right w-16 min-w-[55px]">Qty</th>
                          <th className="p-2.5 text-right w-36 min-w-[130px]">Price</th>
                          <th className="p-2.5 text-right w-28 min-w-[90px]">Discount</th>
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
                              <input
                                placeholder="Item description / details..."
                                value={l.description}
                                onChange={e => updateLine(i, 'description', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] outline-none"
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
                              <input
                                type="number"
                                step="0.01"
                                value={l.discountAmount}
                                onChange={e => updateLine(i, 'discountAmount', e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono text-[var(--color-text-strong)] outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <CompactTaxSelect
                                value={(() => {
                                  const match = applicableTaxCodes.find(tc => tc.code === l.taxCode);
                                  return match ? match.rate : (applicableTaxCodes[0]?.rate ?? 0);
                                })()}
                                onChange={newRate => {
                                  const match = applicableTaxCodes.find(tc => tc.rate === parseFloat(newRate)) || applicableTaxCodes[0];
                                  const rate = match ? match.rate : 0;
                                  const taxable = Math.max(0, (parseFloat(l.quantity || '0') * parseFloat(l.unitPrice || '0')) - parseFloat(l.discountAmount || '0'));
                                  const taxVal = (taxable * rate) / 100;
                                  const u = [...lines];
                                  u[i].taxCode = match?.code || '';
                                  u[i].taxAmount = String(taxVal);
                                  setLines(u);
                                }}
                                taxCodes={applicableTaxCodes}
                              />
                            </td>
                            <td className="p-2 text-right font-mono font-semibold text-[var(--color-text-strong)]">
                              {money(
                                parseFloat(l.quantity || '0') * parseFloat(l.unitPrice || '0') -
                                  parseFloat(l.discountAmount || '0') +
                                  parseFloat(l.taxAmount || '0')
                              )}
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
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                        Fulfillment Terms & Delivery Schedule
                      </label>
                      <textarea
                        rows={3}
                        value={form.terms}
                        onChange={e => setForm({ ...form, terms: e.target.value })}
                        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] outline-none shadow-2xs resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1.5">
                        Internal Notes
                      </label>
                      <textarea
                        rows={2}
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="Internal notes, customer delivery instructions..."
                        className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] outline-none shadow-2xs resize-none"
                      />
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-muted)]/60 border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Order Summary</p>
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>Gross Subtotal</span>
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
                      <span>Total Order Amount</span>
                      <span className="text-blue-600 font-mono">{money(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-6">
                  {/* Order Header */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-sky-500/5 to-cyan-500/10 border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[var(--color-text-strong)]">Sales Order: {form.reference || 'Auto-generated'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">Pending Confirmation</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        Customer: <strong className="text-[var(--color-text-strong)]">{customers.find((c: any) => c.id === form.customerId)?.name || 'Selected Customer'}</strong> • Currency: <span className="font-mono font-bold">{form.currencyCode || 'PKR'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div><span className="text-[var(--color-text-muted)] block text-[11px]">Order Date:</span><strong className="text-[var(--color-text-strong)]">{form.orderDate}</strong></div>
                      <div><span className="text-[var(--color-text-muted)] block text-[11px]">Delivery Date:</span><strong className="text-[var(--color-text-strong)]">{form.expectedDeliveryDate}</strong></div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xs">
                    <div className="px-4 py-2.5 bg-[var(--color-surface-muted)] border-b border-[var(--color-border)] text-xs font-bold text-[var(--color-text-strong)]">
                      Ordered Items & Quantities
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]">
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
                          const q = parseFloat(l.quantity) || 0;
                          const p = parseFloat(l.unitPrice) || 0;
                          const d = parseFloat(l.discountAmount) || 0;
                          const t = parseFloat(l.taxAmount) || 0;
                          const total = q * p - d + t;
                          return (
                            <tr key={i} className="hover:bg-[var(--color-surface-muted)]/50">
                              <td className="px-3.5 py-2 text-[var(--color-text-muted)] font-mono">{i + 1}</td>
                              <td className="px-3.5 py-2 font-semibold text-[var(--color-text-strong)]">{l.description || '—'}</td>
                              <td className="px-3.5 py-2 text-center font-mono">{q}</td>
                              <td className="px-3.5 py-2 text-right font-mono">{money(p)}</td>
                              <td className="px-3.5 py-2 text-right font-mono text-rose-500">{d > 0 ? `-${money(d)}` : '—'}</td>
                              <td className="px-3.5 py-2 text-right font-mono text-amber-600">{t > 0 ? `+${money(t)}` : '—'}</td>
                              <td className="px-3.5 py-2 text-right font-mono font-bold text-[var(--color-text-strong)]">{money(total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
                      <p className="font-bold text-[var(--color-text-strong)]">Delivery Terms & Internal Notes</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{form.terms || 'Standard commercial delivery terms.'}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed italic">{form.notes}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 shadow-2xs">
                      <div className="flex justify-between text-[11px] text-[var(--color-text-muted)]"><span>Gross Subtotal:</span><span className="font-mono font-semibold text-[var(--color-text-strong)]">{money(subTotal)}</span></div>
                      {discountTotal > 0 && <div className="flex justify-between text-[11px] text-rose-500 font-mono"><span>Total Discount:</span><span>-{money(discountTotal)}</span></div>}
                      {taxTotal > 0 && <div className="flex justify-between text-[11px] text-amber-600 font-mono"><span>Sales Tax / VAT:</span><span>+{money(taxTotal)}</span></div>}
                      <div className="border-t border-[var(--color-border)] pt-2 flex justify-between text-sm font-bold text-[var(--color-text-strong)]">
                        <span>Total Order Amount:</span>
                        <span className="text-blue-600 font-mono text-base">{money(grandTotal)}</span>
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
                  onClick={() => setShowForm(false)}
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
                        setModalTab('lines')
                      } else if (modalTab === 'lines') {
                        setModalTab('summary')
                      } else if (modalTab === 'summary') {
                        setModalTab('preview')
                      }
                    }}
                    className="h-9 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-1.5"
                  >
                    <span>{modalTab === 'details' ? 'Next: Order Lines' : modalTab === 'lines' ? 'Next: Terms & Confirmation' : 'Preview & Review'}</span>
                    {modalTab === 'summary' ? <Eye className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="h-9 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3" />
                    <span>Confirm & Create Sales Order</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Order Details Slideover/Modal */}
      {activeOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-strong)]">{activeOrderDetails.orderNumber}</h3>
                <p className="text-xs text-[var(--color-text-muted)]">Sales Order Details</p>
              </div>
              <button
                onClick={() => setActiveOrderDetails(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Order Date:</span>
                <span className="font-semibold text-[var(--color-text-strong)]">{activeOrderDetails.orderDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Expected Delivery:</span>
                <span className="font-semibold text-[var(--color-text-strong)]">{activeOrderDetails.expectedDeliveryDate || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Total Amount:</span>
                <span className="font-bold text-sky-600 font-mono">{money(activeOrderDetails.totalAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">Status:</span>
                <StatusChip
                  status={activeOrderDetails.status}
                  label={statusStyles[activeOrderDetails.status]?.label ?? activeOrderDetails.status}
                  hex={statusStyles[activeOrderDetails.status]?.hex}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveOrderDetails(null)}
                className="w-full h-9 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
