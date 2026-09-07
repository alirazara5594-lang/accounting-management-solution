import React, { useState, useEffect, useMemo } from 'react'
import {
  Package, AlertTriangle, CheckCircle, XCircle, Search,
  TrendingDown, ShoppingCart, ArrowRight, Filter, Plus,
  Minus, RefreshCw, Download, Upload, BarChart3, ArrowUpDown
} from 'lucide-react'
import { useProductsStore, useAssetsInventoryStore } from './stores'
import { EmptyState } from './components/ui/empty-state'
import { money } from './lib/currency'

type Tab = 'overview' | 'finished' | 'raw' | 'lowstock' | 'transactions'

export const InventoryWorkspace: React.FC<{ activeEntityId: string }> = ({ activeEntityId }) => {
  const products = useProductsStore((s: any) => s.products as any[])
  const fetchProducts = useProductsStore((s: any) => s.fetchProducts)
  const setProductPurposeStore = useProductsStore((s: any) => s.setProductPurpose)

  const stockLevels = useAssetsInventoryStore((s: any) => s.stockLevels as any[])
  const fetchStockLevels = useAssetsInventoryStore((s) => s.fetchStockLevels)
  const warehouses = useAssetsInventoryStore((s: any) => s.warehouses)
  const fetchWarehouses = useAssetsInventoryStore((s) => s.fetchWarehouses)
  const stockTransactions = useAssetsInventoryStore((s: any) => s.stockTransactions as any[])
  const fetchStockTransactions = useAssetsInventoryStore((s) => s.fetchStockTransactions)
  const createStockTransaction = useAssetsInventoryStore((s) => s.createStockTransaction)

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')
  const [purposeFilter, setPurposeFilter] = useState<string>('all')
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all')
  const [toast, setToast] = useState('')
  const [markForSaleModal, setMarkForSaleModal] = useState<any>(null)
  const [adjustStockModal, setAdjustStockModal] = useState<any>(null)
  const [adjustForm, setAdjustForm] = useState({ type: 'In', quantity: '1', unitCost: '0', reference: '', warehouseId: '' })
  const [addItemModal, setAddItemModal] = useState(false)
  const [addItemForm, setAddItemForm] = useState({ productId: '', warehouseId: '', quantity: '1', unitCost: '0', reference: '' })

  useEffect(() => {
    fetchProducts()
    fetchStockLevels(activeEntityId)
    fetchWarehouses(activeEntityId)
    fetchStockTransactions(activeEntityId)
  }, [activeEntityId])

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  const handleAddItem = async () => {
    if (!addItemForm.productId || !addItemForm.warehouseId) {
      notify('Please select a product and warehouse')
      return
    }
    const qty = parseFloat(addItemForm.quantity) || 0
    if (qty <= 0) {
      notify('Quantity must be greater than 0')
      return
    }
    try {
      await createStockTransaction({
        productId: addItemForm.productId,
        warehouseId: addItemForm.warehouseId,
        type: 'In',
        quantity: qty,
        unitCost: parseFloat(addItemForm.unitCost) || 0,
        reference: addItemForm.reference || 'Manual Entry',
        entityId: activeEntityId
      })
      notify('Item added to inventory successfully')
      setAddItemModal(false)
      setAddItemForm({ productId: '', warehouseId: '', quantity: '1', unitCost: '0', reference: '' })
      fetchStockLevels(activeEntityId)
      fetchStockTransactions(activeEntityId)
    } catch (e) {
      notify('Failed to add item')
    }
  }

  // Merge products with stock levels — ONLY include items that have actual stock
  const inventoryItems = useMemo(() => {
    const items = products
      .map((p: any) => {
        const stock = stockLevels.filter((s: any) => s.productId === p.id)
        const totalQty = stock.reduce((sum: number, s: any) => sum + (s.quantityOnHand || 0), 0)
        const totalValue = stock.reduce((sum: number, s: any) => sum + (s.totalValue || 0), 0)
        const avgCost = totalQty > 0 ? totalValue / totalQty : 0
        const minQty = p.minimumQuantity || 0
        const isLowStock = minQty > 0 && totalQty <= minQty
        const isOutOfStock = totalQty === 0
        const stockByWarehouse = stock.map((s: any) => ({
          warehouseId: s.warehouseId,
          warehouseName: s.warehouseName,
          quantity: s.quantityOnHand,
          value: s.totalValue
        }))

        return {
          ...p,
          totalQuantity: totalQty,
          totalValue: totalValue,
          averageCost: avgCost,
          minimumQuantity: minQty,
          isLowStock,
          isOutOfStock,
          stockStatus: isOutOfStock ? 'out' : isLowStock ? 'low' : 'ok',
          stockByWarehouse,
          hasStock: stock.length > 0
        }
      })
      // Only include products that have stock records (received via GRN or added directly)
      .filter((p: any) => p.hasStock)
    return items
  }, [products, stockLevels])

  // Filter items
  const filteredItems = useMemo(() => {
    let items = inventoryItems

    // Tab filter
    if (activeTab === 'finished') {
      items = items.filter((p: any) => p.purpose === 'FinishedGood' || p.purpose === 'Service')
    } else if (activeTab === 'raw') {
      items = items.filter((p: any) => p.purpose === 'RawMaterial' || p.purpose === 'Component' || p.purpose === 'Consumable')
    } else if (activeTab === 'lowstock') {
      items = items.filter((p: any) => p.isLowStock || p.isOutOfStock)
    }

    // Purpose filter
    if (purposeFilter !== 'all') {
      items = items.filter((p: any) => p.purpose === purposeFilter)
    }

    // Warehouse filter
    if (warehouseFilter !== 'all') {
      items = items.filter((p: any) => p.stockByWarehouse.some((w: any) => w.warehouseId === warehouseFilter))
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      )
    }

    return items
  }, [inventoryItems, activeTab, purposeFilter, warehouseFilter, search])

  // KPI Stats
  const stats = useMemo(() => {
    const total = inventoryItems.length
    const finishedGoods = inventoryItems.filter((p: any) => p.purpose === 'FinishedGood' || p.purpose === 'Service').length
    const rawMaterials = inventoryItems.filter((p: any) => p.purpose === 'RawMaterial' || p.purpose === 'Component').length
    const lowStock = inventoryItems.filter((p: any) => p.isLowStock).length
    const outOfStock = inventoryItems.filter((p: any) => p.isOutOfStock).length
    const totalValue = inventoryItems.reduce((sum: number, p: any) => sum + p.totalValue, 0)
    const totalQty = inventoryItems.reduce((sum: number, p: any) => sum + p.totalQuantity, 0)

    return { total, finishedGoods, rawMaterials, lowStock, outOfStock, totalValue, totalQty }
  }, [inventoryItems])

  const handleMarkForSale = async () => {
    if (!markForSaleModal) return
    try {
      await setProductPurposeStore(markForSaleModal.id, 'FinishedGood')
      notify(`✓ ${markForSaleModal.name} is now available for sale!`)
      setMarkForSaleModal(null)
    } catch (e: any) {
      notify(e.message || 'Error')
    }
  }

  const handleAdjustStock = async () => {
    if (!adjustStockModal) return
    try {
      await createStockTransaction({
        productId: adjustStockModal.id,
        warehouseId: adjustForm.warehouseId || warehouses[0]?.id,
        type: adjustForm.type,
        quantity: parseFloat(adjustForm.quantity),
        unitCost: parseFloat(adjustForm.unitCost),
        reference: adjustForm.reference,
        companyId: activeEntityId
      })
      notify(`✓ Stock adjusted for ${adjustStockModal.name}!`)
      setAdjustStockModal(null)
      setAdjustForm({ type: 'In', quantity: '1', unitCost: '0', reference: '', warehouseId: '' })
    } catch (e: any) {
      notify(e.message || 'Error')
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" />, count: stats.total },
    { id: 'finished', label: 'Finished Goods', icon: <CheckCircle className="w-3.5 h-3.5" />, count: stats.finishedGoods },
    { id: 'raw', label: 'Raw Materials', icon: <Package className="w-3.5 h-3.5" />, count: stats.rawMaterials },
    { id: 'lowstock', label: 'Low Stock', icon: <AlertTriangle className="w-3.5 h-3.5" />, count: stats.lowStock + stats.outOfStock },
    { id: 'transactions', label: 'Transactions', icon: <ArrowUpDown className="w-3.5 h-3.5" />, count: stockTransactions.length },
  ]

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {toast && <div className="px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">{toast}</div>}

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-orange-500/[0.03] to-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-orange-500 to-amber-600" />
              <div className="absolute inset-0 flex items-center justify-center"><Package className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Inventory</h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Stock management, alerts, and reorder tracking</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => setAddItemModal(true)} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-xl flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Total Items</span>
          </div>
          <p className="text-2xl font-black text-[var(--color-text-strong)]">{stats.total}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">{stats.totalQty} units total</p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Finished Goods</span>
          </div>
          <p className="text-2xl font-black text-green-600">{stats.finishedGoods}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">Ready for sale</p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Raw Materials</span>
          </div>
          <p className="text-2xl font-black text-blue-600">{stats.rawMaterials}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">For manufacturing</p>
        </div>

        <div className={`p-4 rounded-xl border ${stats.lowStock + stats.outOfStock > 0 ? 'border-red-200 bg-red-50' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${stats.lowStock + stats.outOfStock > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Low Stock</span>
          </div>
          <p className={`text-2xl font-black ${stats.lowStock + stats.outOfStock > 0 ? 'text-red-600' : 'text-gray-400'}`}>{stats.lowStock + stats.outOfStock}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">{stats.outOfStock} out of stock</p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Total Value</span>
          </div>
          <p className="text-xl font-black text-emerald-600">{money(stats.totalValue)}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">Inventory worth</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100/50 p-1 rounded-xl w-fit border border-gray-200/50">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === t.id
                ? 'bg-white text-orange-600 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                activeTab === t.id ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      {activeTab !== 'transactions' && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, code, or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          </div>
          <select
            value={warehouseFilter}
            onChange={e => setWarehouseFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <option value="all">All Warehouses</option>
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ═══ Overview Tab ═══ */}
      {activeTab === 'overview' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-orange-500/[0.05] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4 text-center">Qty on Hand</th>
                  <th className="py-3 px-4 text-center">Min Qty</th>
                  <th className="py-3 px-4 text-right">Avg. Cost</th>
                  <th className="py-3 px-4 text-right">Total Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((p: any) => (
                  <tr key={p.id} className={`hover:bg-gray-50/60 ${p.isOutOfStock ? 'bg-red-50/30' : p.isLowStock ? 'bg-yellow-50/30' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-[10px] font-mono text-gray-500">{p.code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.purpose === 'FinishedGood' ? 'bg-green-100 text-green-700' :
                        p.purpose === 'Service' ? 'bg-purple-100 text-purple-700' :
                        p.purpose === 'RawMaterial' ? 'bg-blue-100 text-blue-700' :
                        p.purpose === 'Component' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {p.purpose === 'FinishedGood' ? 'For Sale' :
                         p.purpose === 'RawMaterial' ? 'Raw Material' :
                         p.purpose === 'Component' ? 'Component' :
                         p.purpose === 'Consumable' ? 'Consumable' :
                         p.purpose === 'Service' ? 'Service' : p.purpose}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">{p.totalQuantity}</td>
                    <td className="py-3 px-4 text-center font-mono text-gray-500">{p.minimumQuantity || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-500">{money(p.averageCost)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">{money(p.totalValue)}</td>
                    <td className="py-3 px-4 text-center">
                      {p.isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          <XCircle className="w-3 h-3" /> OUT
                        </span>
                      ) : p.isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                          <AlertTriangle className="w-3 h-3" /> LOW
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" /> OK
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setAdjustStockModal(p)
                            setAdjustForm({ type: 'In', quantity: '1', unitCost: String(p.averageCost || 0), reference: '', warehouseId: warehouses[0]?.id || '' })
                          }}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                        >
                          Adjust
                        </button>
                        {p.purpose !== 'FinishedGood' && p.purpose !== 'Service' && (
                          <button
                            onClick={() => setMarkForSaleModal(p)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg"
                          >
                            Sell
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState icon={Package} title="No inventory items" hint="Process a GRN to receive items into inventory." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Finished Goods Tab ═══ */}
      {activeTab === 'finished' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
            <h3 className="font-bold text-green-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Finished Goods Ready for Sale</h3>
            <p className="text-sm text-green-700 mt-1">These items are available to sell and appear in Products & Services.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-green-500/[0.05] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4 text-center">Qty on Hand</th>
                    <th className="py-3 px-4 text-right">Avg. Cost</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-[10px] font-mono text-gray-500">{p.code}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">{p.totalQuantity}</td>
                      <td className="py-3 px-4 text-right font-mono text-gray-500">{money(p.averageCost)}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">{money(p.totalValue)}</td>
                      <td className="py-3 px-4 text-center">
                        {p.isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : p.isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setAdjustStockModal(p)
                            setAdjustForm({ type: 'In', quantity: '1', unitCost: String(p.averageCost || 0), reference: '', warehouseId: warehouses[0]?.id || '' })
                          }}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState icon={Package} title="No finished goods in inventory" hint="Move items from manufacturing or mark products for sale." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Raw Materials Tab ═══ */}
      {activeTab === 'raw' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
            <h3 className="font-bold text-blue-800 flex items-center gap-2"><Package className="w-5 h-5" /> Raw Materials & Components</h3>
            <p className="text-sm text-blue-700 mt-1">Track raw materials, components, and consumables used in manufacturing.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-blue-500/[0.05] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-center">Qty on Hand</th>
                    <th className="py-3 px-4 text-center">Min Qty</th>
                    <th className="py-3 px-4 text-right">Avg. Cost</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.map((p: any) => (
                    <tr key={p.id} className={`hover:bg-gray-50/60 ${p.isLowStock ? 'bg-yellow-50/30' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-[10px] font-mono text-gray-500">{p.code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          p.purpose === 'RawMaterial' ? 'bg-blue-100 text-blue-700' :
                          p.purpose === 'Component' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {p.purpose === 'RawMaterial' ? 'Raw Material' :
                           p.purpose === 'Component' ? 'Component' : 'Consumable'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">{p.totalQuantity}</td>
                      <td className="py-3 px-4 text-center font-mono text-gray-500">{p.minimumQuantity || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono text-gray-500">{money(p.averageCost)}</td>
                      <td className="py-3 px-4 text-center">
                        {p.isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3" /> OK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setAdjustStockModal(p)
                              setAdjustForm({ type: 'In', quantity: '1', unitCost: String(p.averageCost || 0), reference: '', warehouseId: warehouses[0]?.id || '' })
                            }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => setMarkForSaleModal(p)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg"
                          >
                            Sell
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState icon={Package} title="No raw materials found" hint="Add raw materials through Purchase Requests." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Low Stock Tab ═══ */}
      {activeTab === 'lowstock' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 rounded-2xl p-4">
            <h3 className="font-bold text-yellow-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Low Stock Alerts</h3>
            <p className="text-sm text-yellow-700 mt-1">Items below minimum quantity or out of stock. Reorder these items to avoid shortages.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-yellow-500/[0.05] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4 text-center">Qty on Hand</th>
                    <th className="py-3 px-4 text-center">Min Required</th>
                    <th className="py-3 px-4 text-center">Shortage</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.map((p: any) => (
                    <tr key={p.id} className={`hover:bg-gray-50/60 ${p.isOutOfStock ? 'bg-red-50/50' : 'bg-yellow-50/30'}`}>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-[10px] font-mono text-gray-500">{p.code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          p.purpose === 'FinishedGood' ? 'bg-green-100 text-green-700' :
                          p.purpose === 'RawMaterial' ? 'bg-blue-100 text-blue-700' :
                          p.purpose === 'Component' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {p.purpose === 'FinishedGood' ? 'For Sale' :
                           p.purpose === 'RawMaterial' ? 'Raw Material' :
                           p.purpose === 'Component' ? 'Component' : p.purpose}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-red-600">{p.totalQuantity}</td>
                      <td className="py-3 px-4 text-center font-mono text-gray-500">{p.minimumQuantity || 0}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-red-600">
                        {p.minimumQuantity ? Math.max(0, p.minimumQuantity - p.totalQuantity) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {p.isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="text-center py-12">
                          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                          <p className="font-medium text-gray-600">All Stocked Up!</p>
                          <p className="text-sm text-gray-500">No items are below minimum quantity.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Transactions Tab ═══ */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-orange-500/[0.05] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stockTransactions.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4 text-gray-500">{t.date || t.transactionDate || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      String(t.type) === 'In' || String(t.type) === 'Inbound' ? 'bg-green-100 text-green-700' :
                      String(t.type) === 'Out' || String(t.type) === 'Outbound' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{t.type}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">{t.productName || '—'}</td>
                  <td className="py-3 px-4 text-gray-500">{t.warehouseName || '—'}</td>
                  <td className="py-3 px-4 text-right font-semibold">{t.quantity}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{money(t.unitCost || 0)}</td>
                  <td className="py-3 px-4 text-right font-semibold">{money(t.totalValue || (t.quantity * (t.unitCost || 0)))}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{t.reference || '—'}</td>
                </tr>
              ))}
              {stockTransactions.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={ArrowUpDown} title="No transactions yet" hint="Record stock adjustments to see transaction history." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Mark for Sale Modal */}
      {markForSaleModal && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: '450px', width: '95%' }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">INVENTORY</p>
                <h2>Mark as For Sale</h2>
              </div>
              <button type="button" className="close" onClick={() => setMarkForSaleModal(null)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
              <p className="text-sm text-gray-600">
                Mark <strong>{markForSaleModal.name}</strong> as a finished good for sale?
              </p>
              <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-xl border border-blue-100">
                This item will appear in Products & Services and can be sold to customers.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setMarkForSaleModal(null)}>Cancel</button>
              <button onClick={handleMarkForSale} className="primary">Mark for Sale</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustStockModal && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">INVENTORY</p>
                <h2>Adjust Stock</h2>
              </div>
              <button type="button" className="close" onClick={() => setAdjustStockModal(null)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
              <p className="text-sm text-gray-600">
                Product: <strong>{adjustStockModal.name}</strong>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Adjustment Type *</label>
                  <select
                    value={adjustForm.type}
                    onChange={e => setAdjustForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200"
                  >
                    <option value="In">Stock In (+)</option>
                    <option value="Out">Stock Out (-)</option>
                    <option value="Adjustment">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Warehouse *</label>
                  <select
                    value={adjustForm.warehouseId}
                    onChange={e => setAdjustForm(f => ({ ...f, warehouseId: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    value={adjustForm.quantity}
                    onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjustForm.unitCost}
                    onChange={e => setAdjustForm(f => ({ ...f, unitCost: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reference / Reason</label>
                  <input
                    type="text"
                    value={adjustForm.reference}
                    onChange={e => setAdjustForm(f => ({ ...f, reference: e.target.value }))}
                    placeholder="e.g. Stock count correction"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setAdjustStockModal(null)}>Cancel</button>
              <button onClick={handleAdjustStock} disabled={!adjustForm.warehouseId || !adjustForm.quantity} className="primary">
                Record Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Add Item Modal ═══ */}
      {addItemModal && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">INVENTORY</p>
                <h2>Add Item to Inventory</h2>
              </div>
              <button type="button" className="close" onClick={() => setAddItemModal(false)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
              <p className="text-sm text-gray-600">
                Manually add a product to inventory. Use this for initial stock setup or direct additions.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Product *</label>
                <select
                  value={addItemForm.productId}
                  onChange={e => setAddItemForm(f => ({ ...f, productId: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200"
                >
                  <option value="">Select a product...</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Warehouse *</label>
                <select
                  value={addItemForm.warehouseId}
                  onChange={e => setAddItemForm(f => ({ ...f, warehouseId: e.target.value }))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200"
                >
                  <option value="">Select a warehouse...</option>
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={addItemForm.quantity}
                    onChange={e => setAddItemForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addItemForm.unitCost}
                    onChange={e => setAddItemForm(f => ({ ...f, unitCost: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reference / Notes</label>
                <input
                  type="text"
                  value={addItemForm.reference}
                  onChange={e => setAddItemForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="e.g. Initial stock setup"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setAddItemModal(false)}>Cancel</button>
              <button onClick={handleAddItem} disabled={!addItemForm.productId || !addItemForm.warehouseId} className="primary">
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
