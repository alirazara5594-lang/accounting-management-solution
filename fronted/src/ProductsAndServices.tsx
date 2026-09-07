import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Wrench, Pencil, Trash2, Package, Tag, Archive,
  Receipt, Check, X, Hash, Layers,
  ShieldCheck, ArrowRight, ArrowLeft, Coins, Eye,
  List, LayoutGrid
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataToolbar } from '@/components/ui/data-toolbar'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'

import { useProductsStore, useCoaStore, useTaxStore, useAssetsInventoryStore } from './stores'
import { useFormDraft } from './hooks/useFormDraft'
import { money } from './lib/currency'
import { getActiveTaxCodes, GLOBAL_TAX_STRUCTURES } from './lib/taxLocalization'
import type { Account } from './api/modules/coa.api'
import type { TaxCode } from './api/modules/tax.api'

export type ProductType = 'Physical' | 'Service' | 'NonInventory' | 'Bundle'
export type ProductStatus = 'Active' | 'Inactive' | 'Discontinued'
export type ProductPurpose = 'FinishedGood' | 'RawMaterial' | 'Component' | 'FixedAsset' | 'Consumable'

export type Product = {
  id: string
  code: string
  name: string
  description?: string
  type: ProductType
  purpose: ProductPurpose
  category?: string
  unit: string
  currencyCode?: string
  unitPrice: number
  costPrice: number
  minimumQuantity: number
  incomeAccountId?: string
  expenseAccountId?: string
  inventoryAccountId?: string
  assetAccountId?: string
  taxCodeId?: string
  status: ProductStatus
  barcode?: string
  sku?: string
  reorderPoint?: number
  currentStock?: number
}

export type ProductForm = {
  code: string
  name: string
  description: string
  type: ProductType
  purpose: ProductPurpose
  category: string
  unit: string
  currencyCode: string
  unitPrice: string
  costPrice: string
  minimumQuantity: string
  incomeAccountId: string
  expenseAccountId: string
  inventoryAccountId: string
  assetAccountId: string
  taxCodeId: string
  status: ProductStatus
  barcode: string
  sku: string
  reorderPoint: string
}

const blankForm = (): ProductForm => ({
  code: '',
  name: '',
  description: '',
  type: 'Physical',
  purpose: 'FinishedGood',
  category: 'General',
  unit: 'Unit',
  currencyCode: 'PKR',
  unitPrice: '0',
  costPrice: '0',
  minimumQuantity: '0',
  incomeAccountId: '',
  expenseAccountId: '',
  inventoryAccountId: '',
  assetAccountId: '',
  taxCodeId: '',
  status: 'Active',
  barcode: '',
  sku: '',
  reorderPoint: '0'
})

export default function ProductsAndServices({
  entities = [],
  activeEntityId,
  notify
}: {
  entities?: any[]
  activeEntityId: string
  notify: (msg: string) => void
}) {
  const products = useProductsStore((s: any) => s.products as Product[])
  const loading = useProductsStore((s: any) => s.loading)
  const fetchProducts = useProductsStore((s: any) => s.fetchProducts)
  const fetchNextCode = useProductsStore((s: any) => s.fetchNextCode)
  const saveProductStore = useProductsStore((s: any) => s.saveProduct)
  const deleteProductStore = useProductsStore((s: any) => s.deleteProduct)

  const accounts = useCoaStore((s: any) => s.accounts as Account[])
  const fetchAccounts = useCoaStore((s: any) => s.fetchAccounts)

  const taxCodes = useTaxStore((s: any) => s.taxCodes as TaxCode[])
  const fetchTaxCodes = useTaxStore((s: any) => s.fetchTaxCodes)

  const stockLevels = useAssetsInventoryStore((s: any) => s.stockLevels as any[])
  const fetchStockLevels = useAssetsInventoryStore((s: any) => s.fetchStockLevels)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'info' | 'pricing' | 'accounting' | 'tax' | 'preview'>('info')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(blankForm())
  const { saveDraft, clearDraft } = useFormDraft('product', form, setForm, modalOpen, !!editingProduct)

  useEffect(() => {
    fetchProducts()
    fetchAccounts()
    fetchTaxCodes()
    fetchStockLevels(activeEntityId)
  }, [activeEntityId])

  const applicableTaxCodes = useMemo(() => {
    return getActiveTaxCodes()
  }, [activeEntityId])

  const activeCountry = useMemo(() => {
    const code = localStorage.getItem('onboarding_country') || 'PK'
    return GLOBAL_TAX_STRUCTURES[code] || GLOBAL_TAX_STRUCTURES.PK
  }, [activeEntityId])

  const getTaxRatePercent = (taxCode: any) => {
    if (!taxCode) return null
    if (typeof taxCode.rate === 'number') return taxCode.rate
    if (taxCode.rates && taxCode.rates.length > 0) {
      const last = taxCode.rates[taxCode.rates.length - 1]
      return typeof last.percentage === 'number' ? last.percentage : typeof last.ratePercent === 'number' ? last.ratePercent : null
    }
    return null
  }

  const getTaxCodeDisplay = (taxCodeId?: string) => {
    if (!taxCodeId) return { label: 'No Tax (0%)', code: 'None', rate: 0 }
    // Check localized active country tax codes
    const localMatch = applicableTaxCodes.find(tc => tc.code === taxCodeId || String(tc.rate) === taxCodeId)
    if (localMatch) {
      return {
        label: `${localMatch.label} (${localMatch.rate}%)`,
        code: localMatch.code,
        rate: localMatch.rate
      }
    }
    // Check API tax codes
    const taxCode = taxCodes.find((t: any) => t.id === taxCodeId || t.code === taxCodeId)
    if (taxCode) {
      const rate = getTaxRatePercent(taxCode)
      return {
        label: rate !== null ? `${taxCode.code} (${rate}%)` : taxCode.code,
        code: taxCode.code,
        rate: rate ?? 0
      }
    }
    return { label: 'No Tax (0%)', code: 'None', rate: 0 }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchesSearch = `${p.code} ${p.name} ${p.category || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || p.type === typeFilter
      const isSellable = p.purpose === 'FinishedGood' || p.purpose === 'Service'
      return matchesSearch && matchesType && isSellable
    })
  }, [products, search, typeFilter])

  // Compute stock quantities per product
  const stockMap = useMemo(() => {
    const map: Record<string, number> = {}
    stockLevels.forEach((s: any) => {
      map[s.productId] = (map[s.productId] || 0) + (s.quantityOnHand || 0)
    })
    return map
  }, [stockLevels])

  const exportHeaders = ['Code', 'Name', 'Description', 'Type', 'Category', 'Unit', 'Unit Price', 'Cost Price', 'Status']
  const exportRows = filteredProducts.map((p: any) => [
    p.code, p.name, p.description || '', p.type, p.category || '', p.unit, p.unitPrice, p.costPrice, p.status,
  ])

  const stats = useMemo(() => {
    const total = products.length
    const physical = products.filter((p: any) => p.type === 'Physical').length
    const services = products.filter((p: any) => p.type === 'Service').length
    const nonInv = products.filter((p: any) => p.type === 'NonInventory' || p.type === 'Bundle').length
    return { total, physical, services, nonInv }
  }, [products])

  const openCreateModal = async () => {
    setEditingProduct(null)
    const newForm = blankForm()
    const code = await fetchNextCode()
    if (code) newForm.code = code

    try {
      const saved = localStorage.getItem('draft_product')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.currencyCode === 'USD' || !parsed.currencyCode) parsed.currencyCode = 'PKR'
        localStorage.setItem('draft_product', JSON.stringify(parsed))
      }
    } catch {}

    setForm(newForm)
    setModalTab('info')
    setModalOpen(true)
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setForm({
      code: p.code,
      name: p.name,
      description: p.description || '',
      type: p.type,
      purpose: p.purpose || 'FinishedGood',
      category: p.category || '',
      unit: p.unit || 'Each',
      currencyCode: 'PKR',
      unitPrice: String(p.unitPrice || 0),
      costPrice: String(p.costPrice || 0),
      minimumQuantity: String(p.minimumQuantity || 0),
      taxCodeId: p.taxCodeId || '',
      incomeAccountId: p.incomeAccountId || '',
      expenseAccountId: p.expenseAccountId || '',
      inventoryAccountId: p.inventoryAccountId || '',
      assetAccountId: p.assetAccountId || '',
      status: p.status || 'Active',
      barcode: p.barcode || '',
      sku: p.sku || '',
      reorderPoint: String(p.reorderPoint || 0)
    })
    setModalTab('info')
    setModalOpen(true)
  }

  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!form.name.trim()) {
      notify('Product name is required.')
      setModalTab('info')
      return
    }

    // If not already on preview tab, open preview tab first
    if (modalTab !== 'preview') {
      setModalTab('preview')
      return
    }

    const isGuid = (val?: string | null) => !!val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val)

    // Match API tax code if available, otherwise save null
    const matchingApiTaxCode = taxCodes.find((t: any) => t.id === form.taxCodeId || t.code === form.taxCodeId)
    const finalTaxCodeId = (matchingApiTaxCode && isGuid(matchingApiTaxCode.id)) ? matchingApiTaxCode.id : (isGuid(form.taxCodeId) ? form.taxCodeId : null)

    const payload = {
      code: form.code || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      purpose: form.purpose,
      category: form.category.trim() || null,
      unit: form.unit.trim() || 'Each',
      unitPrice: Number(form.unitPrice) || 0,
      costPrice: Number(form.costPrice) || 0,
      minimumQuantity: Number(form.minimumQuantity) || 0,
      taxCodeId: finalTaxCodeId,
      incomeAccountId: isGuid(form.incomeAccountId) ? form.incomeAccountId : null,
      expenseAccountId: isGuid(form.expenseAccountId) ? form.expenseAccountId : null,
      assetAccountId: isGuid(form.assetAccountId) ? form.assetAccountId : null
    }

    try {
      await saveProductStore(payload, editingProduct ? editingProduct.id : undefined)
      clearDraft()
      notify(editingProduct ? 'Product updated successfully.' : 'Product created successfully.')
      setModalOpen(false)
    } catch (err: any) {
      notify(err.message || 'Error saving product.')
    }
  }

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${p.name}"?`)) return
    try {
      await deleteProductStore(p.id)
      notify('Product deleted.')
    } catch (err: any) {
      notify(err.message || 'Could not delete product.')
    }
  }

  return (
    <div className="space-y-6">
      {/* AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-amber-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-amber-500 to-orange-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Package className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Products &amp; Services Catalog</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Manage physical inventory goods, billable services, kits, and GAAP GL mappings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <DataToolbar
              query={search}
              setQuery={setSearch}
              searchPlaceholder="Search item name, SKU..."
              exportFileName="products-and-services"
              exportSheetName="Products & Services"
              exportTitle="Product & Service Catalog"
              exportSubtitle={`Master catalog (${filteredProducts.length} items).`}
              exportHeaders={exportHeaders}
              exportRows={exportRows}
            >
              <select
                className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors shadow-2xs box-border"
                style={{ paddingTop: 0, paddingBottom: 0 }}
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">⚡ All Item Types</option>
                <option value="Physical">📦 Physical Goods</option>
                <option value="Service">🛠️ Services</option>
                <option value="NonInventory">📑 Non-Inventory Supplies</option>
                <option value="Bundle">🎁 Bundles / Kits</option>
              </select>
            </DataToolbar>
            <div className="flex items-center border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
                title="Table Rows View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rows</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-[var(--color-primary)] text-white shadow-2xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            <button onClick={openCreateModal} className="primary h-9 px-4 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 shadow-sm">
              <span>＋</span> Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards (Row 2) */}
      <KpiGrid cols={3}>
        <KpiCard icon={Package} label="Total Catalog Items" value={stats.total} desc="Active products & services" tone="blue" />
        <KpiCard icon={Archive} label="Physical Goods" value={stats.physical} desc="Inventory tracked in warehouse" tone="teal" />
        <KpiCard icon={Wrench} label="Billable Services" value={stats.services} desc="Non-inventory consulting & labor" tone="purple" />
      </KpiGrid>

      {/* Products & Services View */}
      {viewMode === 'table' ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--color-surface-muted)]/80 text-[var(--color-text-muted)] border-b border-[var(--color-border)] text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Code & Type</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Item Name & Category</th>
                  <th className="py-3.5 px-4 text-center">Unit</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
                  <th className="py-3.5 px-4 text-right">Sales Price</th>
                  <th className="py-3.5 px-4 text-right">Cost Price</th>
                  <th className="py-3.5 px-4 text-right">Margin</th>
                  <th className="py-3.5 px-4 text-center">Tax Code & Rate</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                  {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[var(--color-text-muted)]">
                      Loading catalog items...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[var(--color-text-muted)]">
                      No products or services found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const margin = p.unitPrice > 0 ? (((p.unitPrice - p.costPrice) / p.unitPrice) * 100).toFixed(0) : '0';
                    return (
                      <tr key={p.id} className="hover:bg-[var(--color-surface-muted)]/50 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-[var(--color-text-strong)]">{p.code}</div>
                          <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            p.type === 'Physical'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : p.type === 'Service'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : p.type === 'Bundle'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {p.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-sm text-[var(--color-text-strong)]">{p.name}</div>
                          {p.description && (
                            <div className="text-[11px] text-[var(--color-text-muted)] line-clamp-1 mt-0.5">{p.description}</div>
                          )}
                          {p.category && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-[var(--color-text-muted)] font-medium">
                              <Tag className="w-2.5 h-2.5" /> {p.category}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap font-medium text-[var(--color-text-muted)]">
                          {p.unit || 'Each'}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {p.type === 'Service' ? (
                            <span className="text-[var(--color-text-muted)] text-xs">N/A</span>
                          ) : (stockMap[p.id] || 0) === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                              Out of Stock
                            </span>
                          ) : (stockMap[p.id] || 0) <= (p.reorderPoint || 0) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                              {stockMap[p.id]} Low
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                              {stockMap[p.id]} In Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {money(p.unitPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-[var(--color-text-muted)]">
                          {money(p.costPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className={`font-mono text-xs font-semibold ${Number(margin) >= 30 ? 'text-emerald-600' : Number(margin) > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {(() => {
                            const tc = getTaxCodeDisplay(p.taxCodeId)
                            if (!p.taxCodeId) {
                              return <span className="px-2 py-0.5 bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] rounded border border-[var(--color-border)] font-mono text-[11px]">No Tax (0%)</span>
                            }
                            return (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded border border-amber-500/20 font-mono text-[11px]">
                                {tc.code} ({tc.rate}%)
                              </span>
                            )
                          })()}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                            p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => openEditModal(p)} className="h-7.5 px-2.5 text-xs">
                              <Pencil className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(p)} className="h-7.5 w-7.5 p-0 text-rose-600 hover:text-rose-700">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Products & Services Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-12 text-center text-xs text-[var(--color-text-muted)]">Loading catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
              No products or services found matching your criteria.
            </div>
          ) : (
            filteredProducts.map(p => (
              <Card key={p.id} className="relative flex flex-col justify-between border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] uppercase tracking-wider font-mono">
                        {p.code} • {p.type}
                      </span>
                      <CardTitle className="mt-1 text-sm font-bold text-[var(--color-text-strong)]">{p.name}</CardTitle>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                      p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  {p.category && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-[var(--color-text-muted)]">
                      <Tag className="w-3 h-3" /> {p.category}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 text-xs pb-4">
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-[var(--color-surface-muted)]/60 rounded-xl border border-[var(--color-border)]">
                    <div>
                      <small className="text-[var(--color-text-muted)] block text-[10px] uppercase font-bold">Sales Price</small>
                      <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">{money(p.unitPrice)}</span>
                    </div>
                    <div>
                      <small className="text-[var(--color-text-muted)] block text-[10px] uppercase font-bold">Cost Price</small>
                      <span className="font-semibold font-mono text-rose-600 dark:text-rose-400">{money(p.costPrice)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <small className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Tax & Compliance</small>
                    <div className="flex justify-between text-[var(--color-text-muted)]">
                      <span>Tax Code:</span>
                      {(() => {
                        const tc = getTaxCodeDisplay(p.taxCodeId)
                        if (!p.taxCodeId) {
                          return <span className="font-medium text-[var(--color-text-muted)]">No Tax (0%)</span>
                        }
                        return (
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            {tc.code} ({tc.rate}%)
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-1 justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(p)} className="h-7.5 px-2.5 text-xs">
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(p)} className="h-7.5 w-7.5 p-0 text-rose-600 hover:text-rose-700">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Professional Product / Service Modal */}
      {modalOpen && (
        <div className="overlay animate-in fade-in duration-200">
          <form
            className="w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onSubmit={handleSave}
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight">
                      {editingProduct ? 'Edit Catalog Item' : 'Create Product / Service Item'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {form.type === 'Physical' ? 'Physical Good' : form.type === 'Service' ? 'Service' : form.type === 'NonInventory' ? 'Non-Inventory' : 'Bundle'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Configure sales price, cost price, GAAP general ledger mappings, and tax codes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-muted)] transition-colors"
                onClick={() => setModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Stepper Navigation */}
            <div className="erp-stepper-nav">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`erp-step-pill ${modalTab === 'info' ? 'active' : ''}`}
              >
                <span className="erp-step-num">1</span>
                <Package className="w-3.5 h-3.5" />
                <span>Item Info</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('pricing')}
                className={`erp-step-pill ${modalTab === 'pricing' ? 'active' : ''}`}
              >
                <span className="erp-step-num">2</span>
                <Coins className="w-3.5 h-3.5" />
                <span>Pricing & Cost</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('accounting')}
                className={`erp-step-pill ${modalTab === 'accounting' ? 'active' : ''}`}
              >
                <span className="erp-step-num">3</span>
                <Layers className="w-3.5 h-3.5" />
                <span>GAAP GL Accounts</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('tax')}
                className={`erp-step-pill ${modalTab === 'tax' ? 'active' : ''}`}
              >
                <span className="erp-step-num">4</span>
                <Receipt className="w-3.5 h-3.5" />
                <span>Tax & Compliance</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('preview')}
                className={`erp-step-pill ${modalTab === 'preview' ? 'active' : ''}`}
              >
                <span className="erp-step-num">5</span>
                <Eye className="w-3.5 h-3.5" />
                <span>Review & Preview</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
              {modalTab === 'info' && (
                <div className="space-y-5">
                  <div className="erp-form-card space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">General Identification</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 1 of 5</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Item Classification
                        </label>
                        <select
                          value={form.type}
                          onChange={e => {
                            const newType = e.target.value as ProductType
                            const newPurpose: ProductPurpose = 'FinishedGood'
                            setForm({ ...form, type: newType, purpose: newPurpose })
                          }}
                          className="erp-form-select cursor-pointer font-medium"
                        >
                          <optgroup label="📦 Sellable Items (Appear in Products & Services)">
                            <option value="Physical">Physical Good — Inventory Tracked</option>
                            <option value="Service">Service — Consulting, Labor, Hours</option>
                          </optgroup>
                          <optgroup label="📑 Other Items">
                            <option value="NonInventory">Non-Inventory — Consumables, Office Supplies</option>
                            <option value="Bundle">Bundle / Kit — Composite Items</option>
                          </optgroup>
                        </select>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                          Physical & Service items appear in Products & Services for sale
                        </p>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Item SKU / Code
                        </label>
                        <div className="relative">
                          <Hash className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="Auto-generated if blank"
                            value={form.code}
                            onChange={e => setForm({ ...form, code: e.target.value })}
                            className="erp-form-input pl-10! font-mono"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Item Name / Title
                        </label>
                        <div className="relative">
                          <Package className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            required
                            placeholder="e.g. Enterprise Accounting Consultation or Industrial Bearing #402"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="erp-form-input pl-10! font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">Category</label>
                        <div className="relative">
                          <Tag className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="e.g. Professional Services, Hardware, Raw Materials"
                            value={form.category}
                            onChange={e => setForm({ ...form, category: e.target.value })}
                            className="erp-form-input pl-10!"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">Unit of Measure (UoM)</label>
                        <input
                          placeholder="Each, Hour, Kg, Meter, Box, Day"
                          value={form.unit}
                          onChange={e => setForm({ ...form, unit: e.target.value })}
                          className="erp-form-input"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="erp-form-label">Description / Customer Invoice Notes</label>
                        <textarea
                          rows={3}
                          placeholder="Detailed line item specifications, scope of work, or standard customer-facing notes..."
                          value={form.description}
                          onChange={e => setForm({ ...form, description: e.target.value })}
                          className="erp-form-textarea"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'pricing' && (
                <div className="space-y-5">
                  <div className="erp-form-card space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Unit Pricing & Costing</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 2 of 5</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Unit Sales Price (Revenue)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-[var(--color-text-muted)]">
                            PKR
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={form.unitPrice}
                            onChange={e => setForm({ ...form, unitPrice: e.target.value })}
                            className="erp-form-input pl-14! font-mono font-bold text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                          Standard rate automatically billed on sales invoices & quotes.
                        </p>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Unit Cost Price (COGS / Expense)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-[var(--color-text-muted)]">
                            PKR
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={form.costPrice}
                            onChange={e => setForm({ ...form, costPrice: e.target.value })}
                            className="erp-form-input pl-14! font-mono font-bold text-rose-600 dark:text-rose-400"
                          />
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                          Purchase or landed standard cost per unit for margin tracking.
                        </p>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Minimum Stock Quantity (Reorder Point)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={form.minimumQuantity}
                            onChange={e => setForm({ ...form, minimumQuantity: e.target.value })}
                            className="erp-form-input font-mono font-bold"
                          />
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                          Alert when stock falls below this level. Set to 0 to disable alert.
                        </p>
                      </div>
                    </div>

                    {/* Live Margin Calculation Card */}
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 flex items-center justify-between">
                      <div>
                        <small className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">Estimated Gross Margin</small>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {(() => {
                            const p = parseFloat(form.unitPrice) || 0;
                            const c = parseFloat(form.costPrice) || 0;
                            if (p <= 0) return '0.00% (No Sales Price)';
                            const margin = ((p - c) / p) * 100;
                            const profit = p - c;
                            return `+${margin.toFixed(1)}% (Profit: ${money(profit)} per unit)`;
                          })()}
                        </span>
                      </div>
                      <div className="text-right">
                        <small className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">Markup Rate</small>
                        <span className="text-xs font-semibold text-[var(--color-text-strong)] font-mono">
                          {(() => {
                            const p = parseFloat(form.unitPrice) || 0;
                            const c = parseFloat(form.costPrice) || 0;
                            if (c <= 0) return '—';
                            return `${(((p - c) / c) * 100).toFixed(1)}% markup`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'accounting' && (
                <div className="space-y-5">
                  <div className="erp-form-card space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-violet-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">GAAP Chart of Accounts Mapping</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 3 of 5</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[var(--color-text-muted)] flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span><b>Double-Entry Compliance:</b> Invoices, Bills, and Inventory movements using this catalog item will post directly to these General Ledger accounts.</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="md:col-span-2">
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Sales Revenue GL Account
                        </label>
                        <select
                          required
                          value={form.incomeAccountId}
                          onChange={e => setForm({ ...form, incomeAccountId: e.target.value })}
                          className="erp-form-select font-medium"
                        >
                          <option value="">Select Revenue Account...</option>
                          {accounts.filter((a: any) => a.type === 'Revenue').map((a: any) => (
                            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                          ))}
                        </select>
                      </div>

                      {form.type !== 'Service' && (
                        <div>
                          <label className="erp-form-label">
                            COGS / Expense GL Account
                          </label>
                          <select
                            value={form.expenseAccountId}
                            onChange={e => setForm({ ...form, expenseAccountId: e.target.value })}
                            className="erp-form-select font-medium"
                          >
                            <option value="">Select Expense / COGS Account...</option>
                            {accounts.filter((a: any) => a.type === 'Expense').map((a: any) => (
                              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {form.type === 'Physical' && (
                        <div>
                          <label className="erp-form-label">
                            Inventory Asset GL Account
                          </label>
                          <select
                            value={form.assetAccountId}
                            onChange={e => setForm({ ...form, assetAccountId: e.target.value })}
                            className="erp-form-select font-medium"
                          >
                            <option value="">Select Inventory Asset Account...</option>
                            {accounts.filter((a: any) => a.type === 'Asset').map((a: any) => (
                              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'tax' && (
                <div className="space-y-5">
                  <div className="erp-form-card space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Global Tax & VAT Classification</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 4 of 5</span>
                    </div>

                    <div>
                      <label className="erp-form-label">
                        Default Tax Code ({activeCountry.flag} {activeCountry.name})
                      </label>
                      <select
                        value={form.taxCodeId}
                        onChange={e => setForm({ ...form, taxCodeId: e.target.value })}
                        className="erp-form-select font-medium"
                      >
                        <option value="">🚫 No Tax (0%) — Exempt / Non-Taxable Item</option>
                        <optgroup label={`${activeCountry.flag} Localized Regional Tax Rates (${activeCountry.name})`}>
                          {applicableTaxCodes.map(tc => (
                            <option key={tc.code} value={tc.code}>
                              ✅ {tc.label} ({tc.rate}%) — {tc.authority}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-[var(--color-text-muted)] flex items-start gap-2.5">
                      <Receipt className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-600 dark:text-amber-400 mb-0.5">Tax Calculation Behavior</p>
                        <p className="text-[11px]">When added to invoices or bills, this item will automatically apply this tax rate while still allowing transaction-level overrides.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-6">
                  {/* Summary Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-yellow-500/10 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[var(--color-text-strong)]">
                            {form.name || 'Unnamed Item'}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            {form.type} Item
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-mono">
                          SKU / Code: {form.code || 'Auto-generated'} • Category: {form.category || 'General'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-emerald-600 font-mono">
                        Selling Price: {money(parseFloat(form.unitPrice) || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Basic Info */}
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                      <h4 className="font-bold text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <Package className="w-4 h-4 text-sky-500" /> Item Identification & Description
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-[var(--color-text-muted)]">Item Classification:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.type === 'Physical' ? 'Physical Good (Inventory Tracked)' : form.type === 'Service' ? 'Service' : form.type === 'NonInventory' ? 'Non-Inventory' : 'Bundle / Kit'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Item Purpose:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.purpose === 'FinishedGood' ? 'Finished Good (For Selling)' : 'Service (For Selling)'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">UoM (Unit of Measure):</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.unit || 'Unit'}</p></div>
                        <div className="col-span-2"><span className="text-[var(--color-text-muted)]">Description:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.description || '—'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Status:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.status}</p></div>
                      </div>
                    </div>

                    {/* Pricing & Cost */}
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                      <h4 className="font-bold text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <Coins className="w-4 h-4 text-emerald-500" /> Pricing & Profit Margin
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-[var(--color-text-muted)]">Selling Price:</span> <p className="font-semibold font-mono text-[var(--color-text-strong)]">{money(parseFloat(form.unitPrice) || 0)}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Purchase / Standard Cost:</span> <p className="font-semibold font-mono text-[var(--color-text-strong)]">{money(parseFloat(form.costPrice) || 0)}</p></div>
                        <div className="col-span-2">
                          <span className="text-[var(--color-text-muted)]">Gross Margin:</span>
                          <p className="font-semibold text-emerald-600 font-mono">
                            {(() => {
                              const p = parseFloat(form.unitPrice) || 0;
                              const c = parseFloat(form.costPrice) || 0;
                              return p > 0 ? `${(((p - c) / p) * 100).toFixed(1)}% (Markup: ${(c > 0 ? (((p - c) / c) * 100).toFixed(1) : 0)}%)` : '—';
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* GAAP GL Accounts */}
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                      <h4 className="font-bold text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <Layers className="w-4 h-4 text-violet-500" /> General Ledger Accounts
                      </h4>
                      <div className="grid grid-cols-1 gap-2 text-[11px]">
                        <div><span className="text-[var(--color-text-muted)]">Income / Revenue GL Account:</span> <p className="font-semibold text-[var(--color-text-strong)]">{accounts.find((a: any) => a.id === form.incomeAccountId)?.name || 'Default Sales Revenue'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">COGS / Expense GL Account:</span> <p className="font-semibold text-[var(--color-text-strong)]">{accounts.find((a: any) => a.id === form.expenseAccountId)?.name || 'Default Cost of Goods Sold'}</p></div>
                        {form.type === 'Physical' && (
                          <div><span className="text-[var(--color-text-muted)]">Inventory Asset Account:</span> <p className="font-semibold text-[var(--color-text-strong)]">{accounts.find((a: any) => a.id === form.inventoryAccountId)?.name || 'Default Merchandise Inventory'}</p></div>
                        )}
                      </div>
                    </div>

                    {/* Tax & Compliance */}
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                      <h4 className="font-bold text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <Receipt className="w-4 h-4 text-amber-500" /> Tax & Classification
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[var(--color-text-muted)]">Default Tax Code:</span>
                          <p className="font-semibold text-[var(--color-text-strong)]">
                            {(() => {
                              const tc = getTaxCodeDisplay(form.taxCodeId)
                              return form.taxCodeId ? (
                                <span className="text-amber-600 dark:text-amber-400">{tc.code} ({tc.rate}%)</span>
                              ) : (
                                <span className="text-[var(--color-text-muted)]">No Tax (0%)</span>
                              )
                            })()}
                          </p>
                        </div>
                        <div><span className="text-[var(--color-text-muted)]">Inventory Valuation:</span> <p className="font-semibold text-[var(--color-text-strong)]">FIFO / Weighted Average</p></div>
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
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>

                {modalTab !== 'info' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalTab === 'preview') setModalTab('tax')
                      else if (modalTab === 'tax') setModalTab('accounting')
                      else if (modalTab === 'accounting') setModalTab('pricing')
                      else if (modalTab === 'pricing') setModalTab('info')
                    }}
                    className="h-9 min-h-[36px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap leading-none shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>Back</span>
                  </button>
                )}

                {modalTab !== 'preview' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'info') {
                          if (!form.name.trim()) {
                            notify('Item name is required.')
                            return
                          }
                          setModalTab('pricing')
                        } else if (modalTab === 'pricing') {
                          setModalTab('accounting')
                        } else if (modalTab === 'accounting') {
                          setModalTab('tax')
                        } else if (modalTab === 'tax') {
                          setModalTab('preview')
                        }
                      }}
                      className="h-9 min-h-[36px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap leading-none shrink-0"
                    >
                      <span>
                        {modalTab === 'info' ? 'Next: Pricing & Costing' : modalTab === 'pricing' ? 'Next: GAAP GL Accounts' : modalTab === 'accounting' ? 'Next: Tax & Classification' : 'Preview Item'}
                      </span>
                      {modalTab === 'tax' ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                    <button
                      type="submit"
                      className="h-9 min-h-[36px] px-5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white whitespace-nowrap leading-none shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>{editingProduct ? 'Save Changes' : 'Create Item'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    className="h-9 min-h-[36px] px-5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white whitespace-nowrap leading-none shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{editingProduct ? 'Confirm & Save Changes' : 'Confirm & Create Item'}</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
