import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Building2, Clock, Pencil, Trash2, Users, Wallet, ShieldAlert, UserCheck,
  MapPin, Receipt, Globe, Check, X, Mail, Phone, Hash,
  Calendar, ShieldCheck, ArrowRight, ArrowLeft, User, Eye
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DataToolbar } from '@/components/ui/data-toolbar'
import { useVendorsStore, useCoaStore } from './stores'
import { useFormDraft } from './hooks/useFormDraft'

export type VendorStatus = 'Active' | 'Inactive' | 'Blocked'

export type Vendor = {
  id: string
  vendorNumber: string
  name: string
  contactPerson?: string
  contactPhone?: string
  email?: string
  phone?: string
  taxId?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country: string
  currencyCode: string
  paymentTermsDays: number
  defaultExpenseAccountId?: string
  companyId?: string
  status: VendorStatus
  createdAt: string
  updatedAt: string
}

type Account = {
  id: string
  code: string
  name: string
  type: string
}

type Entity = {
  id: string
  name: string
  code?: string
  currencyCode?: string
  country?: string
}

type VendorForm = {
  vendorNumber: string
  name: string
  contactPerson: string
  contactPhone: string
  email: string
  phone: string
  taxId: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  currencyCode: string
  paymentTermsDays: string
  defaultExpenseAccountId: string
  companyId: string
}

export const COUNTRIES = [
  'Pakistan',
  'United Arab Emirates',
  'Saudi Arabia',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'Singapore',
  'Qatar',
  'Kuwait',
  'Oman',
  'Bahrain',
  'China',
  'Japan',
  'India',
  'Bangladesh',
  'Malaysia',
  'Turkey',
  'South Africa',
  'Other / International'
]

const blankForm = (): VendorForm => ({
  vendorNumber: '',
  name: '',
  contactPerson: '',
  contactPhone: '',
  email: '',
  phone: '',
  taxId: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Pakistan',
  currencyCode: 'PKR',
  paymentTermsDays: '30',
  defaultExpenseAccountId: '',
  companyId: ''
})

export default function VendorManagement({
  entities = [],
  activeEntityId,
  notify
}: {
  entities?: Entity[]
  activeEntityId: string
  notify: (msg: string) => void
}) {
  const vendors = useVendorsStore((s) => s.vendors as unknown as Vendor[])
  const loading = useVendorsStore((s) => s.loading)
  const fetchVendors = useVendorsStore((s) => s.fetchVendors)
  const fetchNextNumber = useVendorsStore((s) => s.fetchNextNumber)
  const saveVendorStore = useVendorsStore((s) => s.saveVendor)
  const deleteVendorStore = useVendorsStore((s) => s.deleteVendor)
  const toggleVendorStatusStore = (useVendorsStore as any)((s: any) => s.toggleVendorStatus)

  const accounts = useCoaStore((s) => s.accounts as unknown as Account[])
  const fetchAccounts = useCoaStore((s) => s.fetchAccounts)

  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'general' | 'address' | 'financial' | 'tax' | 'preview'>('general')
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [form, setForm] = useState<VendorForm>(blankForm())
  const { saveDraft, clearDraft } = useFormDraft('vendor', form, setForm, modalOpen, !!editingVendor)

  useEffect(() => {
    fetchVendors(activeEntityId)
    fetchAccounts()
  }, [activeEntityId])

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchesSearch = `${v.vendorNumber} ${v.name} ${v.email || ''} ${v.phone || ''} ${v.city || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())

      const matchesCompany =
        companyFilter === 'all'
          ? true
          : companyFilter === 'unassigned'
          ? !v.companyId
          : v.companyId === companyFilter

      const matchesStatus = statusFilter === 'all' ? true : v.status === statusFilter

      return matchesSearch && matchesCompany && matchesStatus
    }).sort((a, b) => {
      const numA = a.vendorNumber || a.name || ''
      const numB = b.vendorNumber || b.name || ''
      return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
    })
  }, [vendors, search, companyFilter, statusFilter])

  const exportHeaders = ['Number', 'Name', 'Email', 'Phone', 'City', 'Country', 'Currency', 'Payment Terms', 'Status']
  const exportRows = filteredVendors.map(v => [
    v.vendorNumber, v.name, v.email || '', v.phone || '', v.city || '', v.country || '',
    v.currencyCode, v.paymentTermsDays, v.status,
  ])

  const stats = useMemo(() => {
    const total = vendors.length
    const active = vendors.filter(v => v.status === 'Active').length
    const avgTerms = total > 0 ? Math.round(vendors.reduce((sum, v) => sum + (v.paymentTermsDays || 30), 0) / total) : 30
    return { total, active, avgTerms }
  }, [vendors])

  const openCreateModal = async () => {
    setEditingVendor(null)
    const newForm = blankForm()
    
    // Automatically assign to the entity currently selected in the top header
    const targetEntityId = activeEntityId || (entities[0]?.id || '')
    if (targetEntityId) {
      newForm.companyId = targetEntityId
      const matchedEntity = entities.find(e => e.id === targetEntityId)
      if (matchedEntity) {
        newForm.currencyCode = matchedEntity.currencyCode || (matchedEntity as any)?.functionalCurrency || 'PKR'
        newForm.country = matchedEntity.country || 'Pakistan'
      }
    }

    const num = await fetchNextNumber()
    if (num) newForm.vendorNumber = num

    try {
      const saved = localStorage.getItem('draft_vendor')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.currencyCode === 'USD' || !parsed.currencyCode) parsed.currencyCode = 'PKR'
        if (parsed.country === 'United States' || !parsed.country) parsed.country = 'Pakistan'
        localStorage.setItem('draft_vendor', JSON.stringify(parsed))
      }
    } catch {}

    setForm(newForm)
    setModalTab('general')
    setModalOpen(true)
  }

  const openEditModal = (v: Vendor) => {
    setEditingVendor(v)
    setForm({
      vendorNumber: v.vendorNumber,
      name: v.name,
      contactPerson: v.contactPerson || '',
      contactPhone: v.contactPhone || '',
      email: v.email || '',
      phone: v.phone || '',
      taxId: v.taxId || '',
      addressLine1: v.addressLine1 || '',
      addressLine2: v.addressLine2 || '',
      city: v.city || '',
      state: v.state || '',
      postalCode: v.postalCode || '',
      country: v.country || 'Pakistan',
      currencyCode: v.currencyCode || 'PKR',
      paymentTermsDays: String(v.paymentTermsDays || 30),
      defaultExpenseAccountId: v.defaultExpenseAccountId || '',
      companyId: v.companyId || ''
    })
    setModalTab('general')
    setModalOpen(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      notify('Vendor name is required.')
      return
    }

    const payload = {
      vendorNumber: form.vendorNumber || null,
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      taxId: form.taxId.trim() || null,
      addressLine1: form.addressLine1.trim() || null,
      addressLine2: form.addressLine2.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      postalCode: form.postalCode.trim() || null,
      country: form.country.trim() || 'Pakistan',
      currencyCode: form.currencyCode.trim().toUpperCase() || 'PKR',
      paymentTermsDays: Number(form.paymentTermsDays) || 30,
      defaultExpenseAccountId: form.defaultExpenseAccountId || null,
      companyId: form.companyId || activeEntityId || null
    }

    try {
      await saveVendorStore(payload, editingVendor ? editingVendor.id : undefined)
      clearDraft()
      notify(editingVendor ? 'Vendor updated successfully.' : 'Vendor created successfully.')
      setModalOpen(false)
    } catch (err: any) {
      notify(err.message || 'Error saving vendor.')
    }
  }

  const handleStatusChange = async (vendor: Vendor, newStatus: VendorStatus) => {
    try {
      if (toggleVendorStatusStore) {
        await toggleVendorStatusStore(vendor.id, newStatus)
      } else {
        await saveVendorStore({ ...vendor, status: newStatus }, vendor.id)
      }
      notify(`Vendor ${vendor.name} status updated to ${newStatus}.`)
    } catch (err: any) {
      notify(err.message || 'Status change failed.')
    }
  }

  const handleDelete = async (v: Vendor) => {
    if (!window.confirm(`Are you sure you want to delete vendor "${v.name}"?`)) return
    try {
      await deleteVendorStore(v.id)
      notify('Vendor deleted.')
    } catch (err: any) {
      notify(err.message || 'Could not delete vendor.')
    }
  }

  const companyMap = useMemo(() => {
    const map = new Map<string, Entity>()
    entities.forEach(e => map.set(e.id, e))
    return map
  }, [entities])

  const assignedCompany = form.companyId ? companyMap.get(form.companyId) : null

  const getAccountName = (id?: string) => {
    if (!id) return 'Not mapped'
    const acc = accounts.find(a => a.id === id)
    return acc ? `${acc.code} ${acc.name}` : 'Unknown'
  }

  return (
    <div className="space-y-6">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-teal-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-teal-500 to-emerald-700" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Vendor & Supplier Management</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" /> Live Payables
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Manage supplier directory, vendor payment terms, default expense accounts, and trade payables.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <DataToolbar
              query={search}
              setQuery={setSearch}
              searchPlaceholder="Search vendor #, name..."
              exportFileName="vendor-directory"
              exportSheetName="Vendors"
              exportTitle="Vendor Directory"
              exportSubtitle="Supplier accounts, payment terms, and GL account mappings."
              exportHeaders={exportHeaders}
              exportRows={exportRows}
              onRefresh={() => fetchVendors(activeEntityId)}
            >
              <select
                className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors shadow-2xs box-border"
                style={{ paddingTop: 0, paddingBottom: 0 }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">⚡ All Statuses</option>
                <option value="Active">🟢 Active</option>
                <option value="Inactive">⚪ Inactive</option>
                <option value="Blocked">🔴 Blocked</option>
              </select>

              {entities && entities.length > 1 && (
                <select
                  className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors shadow-2xs box-border"
                  style={{ paddingTop: 0, paddingBottom: 0 }}
                  value={companyFilter}
                  onChange={e => setCompanyFilter(e.target.value)}
                >
                  <option value="all">🏢 All Companies</option>
                  <option value="unassigned">🌐 Global</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>
                      🏢 {e.name} {e.code ? `(${e.code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </DataToolbar>
            <button onClick={openCreateModal} className="primary h-9 px-4 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1.5 shadow-sm">
              <span>＋</span> Add Vendor
            </button>
          </div>
        </div>
      </div>

      {/* Header Stats (Row 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'TOTAL VENDORS', value: stats.total, desc: 'Registered supplier partners', icon: Building2, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50 dark:bg-blue-950/30', textColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'ACTIVE SUPPLIERS', value: stats.active, desc: 'Approved for purchase orders', icon: Users, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'AVG PAYMENT TERMS', value: `${stats.avgTerms} Days`, desc: 'Standard credit period', icon: Clock, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-950/30', textColor: 'text-violet-600 dark:text-violet-400' },
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

      {/* Vendor Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--color-text-strong)]">Supplier Directory & Accounts</p>
          <span className="text-[11px] text-[var(--color-text-muted)]">Showing {filteredVendors.length} of {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">Loading suppliers...</div>
        ) : filteredVendors.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">No suppliers found matching your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Number</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Company</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Email</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Phone</th>
                  <th className="text-left px-3 py-2 font-semibold text-[var(--color-text-muted)]">Location</th>
                  <th className="text-center px-3 py-2 font-semibold text-[var(--color-text-muted)]">Terms</th>
                  <th className="text-center px-3 py-2 font-semibold text-[var(--color-text-muted)]">Currency</th>
                  <th className="text-center px-3 py-2 font-semibold text-[var(--color-text-muted)]">Expense Account</th>
                  <th className="text-center px-3 py-2 font-semibold text-[var(--color-text-muted)]">Status</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map(vendor => {
                  const comp = vendor.companyId ? companyMap.get(vendor.companyId) : null
                  return (
                    <tr key={vendor.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-colors">
                      <td className="px-3 py-2 font-mono font-semibold text-[var(--color-text-strong)]">{vendor.vendorNumber}</td>
                      <td className="px-3 py-2 font-semibold text-[var(--color-text-strong)]">{vendor.name}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{comp ? comp.name : '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{vendor.email || '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{vendor.phone || '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{[vendor.city, vendor.country].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">Net {vendor.paymentTermsDays}d</td>
                      <td className="px-3 py-2 text-center font-mono font-semibold text-[var(--color-text-strong)]">{vendor.currencyCode || 'PKR'}</td>
                      <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">{getAccountName(vendor.defaultExpenseAccountId)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          vendor.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          vendor.status === 'Blocked' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                          'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>{vendor.status}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(vendor)} className="h-7 w-7 p-0">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(vendor)} className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          {vendor.status !== 'Active' && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(vendor, 'Active')} className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600" title="Activate">
                              <UserCheck className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {vendor.status !== 'Blocked' && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(vendor, 'Blocked')} className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600" title="Block">
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </Button>
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

      {/* Professional Vendor Modal */}
      {modalOpen && (
        <div className="overlay animate-in fade-in duration-200">
          <form
            className="w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onSubmit={handleSave}
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight">
                      {editingVendor ? 'Edit Vendor Account' : 'Register New Vendor / Supplier'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                      {editingVendor ? 'Updating Profile' : 'New Supplier'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1.5">
                    <span>Assigned Entity:</span>
                    <span className="font-semibold text-[var(--color-text-strong)] inline-flex items-center gap-1">
                      🏢 {assignedCompany ? assignedCompany.name : 'Global Group Supplier'}
                    </span>
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
                onClick={() => setModalTab('general')}
                className={`erp-step-pill ${modalTab === 'general' ? 'active' : ''}`}
              >
                <span className="erp-step-num">1</span>
                <Users className="w-3.5 h-3.5" />
                <span>General & Contact</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('address')}
                className={`erp-step-pill ${modalTab === 'address' ? 'active' : ''}`}
              >
                <span className="erp-step-num">2</span>
                <MapPin className="w-3.5 h-3.5" />
                <span>Address & Location</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('financial')}
                className={`erp-step-pill ${modalTab === 'financial' ? 'active' : ''}`}
              >
                <span className="erp-step-num">3</span>
                <Wallet className="w-3.5 h-3.5" />
                <span>Terms & Accounting</span>
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

            {/* Modal Body / Tab Content */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
              {modalTab === 'general' && (
                <div className="space-y-5">
                  <div className="erp-form-card space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Vendor & Supplier Profile</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 1 of 5</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Vendor / Supplier Name
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            required
                            placeholder="e.g. Atlas Industrial Supplies Ltd"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="erp-form-input pl-10! font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Vendor Number / Code
                        </label>
                        <div className="relative">
                          <Hash className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="Auto-generated if blank (VEND-XXXX)"
                            value={form.vendorNumber}
                            onChange={e => setForm({ ...form, vendorNumber: e.target.value })}
                            className="erp-form-input pl-10! font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Assigned Business Entity
                        </label>
                        <select
                          value={form.companyId}
                          onChange={e => setForm({ ...form, companyId: e.target.value })}
                          className="erp-form-select font-medium"
                        >
                          <option value="">🌐 All / Group Supplier (Global)</option>
                          {entities.map(e => (
                            <option key={e.id} value={e.id}>
                              🏢 {e.name} {e.code ? `(${e.code})` : ''} {e.id === activeEntityId ? '★ (Active Workspace)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="erp-form-label">Accounts Payable Email</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            placeholder="invoices@atlas-supplies.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            className="erp-form-input pl-10!"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">Company Phone / Landline</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="+92 (42) 35789000"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            className="erp-form-input pl-10!"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">Account Representative Name</label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="e.g. Tariq Mehmood"
                            value={form.contactPerson}
                            onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                            className="erp-form-input pl-10!"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">Representative Mobile</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="+92 (300) 1234567"
                            value={form.contactPhone}
                            onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                            className="erp-form-input pl-10!"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'address' && (
                <div className="space-y-5">
                  <div className="erp-form-card space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Supplier Physical / Dispatch Address</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 2 of 5</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="erp-form-label">Address Line 1</label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="e.g. 45 Industrial Area, Sector I-9"
                            value={form.addressLine1}
                            onChange={e => setForm({ ...form, addressLine1: e.target.value })}
                            className="erp-form-input pl-10!"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="erp-form-label">Address Line 2 (Optional)</label>
                        <input
                          placeholder="Warehouse # 4, Gate 2"
                          value={form.addressLine2}
                          onChange={e => setForm({ ...form, addressLine2: e.target.value })}
                          className="erp-form-input"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">City</label>
                        <input
                          placeholder="Lahore / Karachi"
                          value={form.city}
                          onChange={e => setForm({ ...form, city: e.target.value })}
                          className="erp-form-input"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">State / Province / Region</label>
                        <input
                          placeholder="Punjab / Sindh"
                          value={form.state}
                          onChange={e => setForm({ ...form, state: e.target.value })}
                          className="erp-form-input"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">Postal / ZIP Code</label>
                        <input
                          placeholder="54000"
                          value={form.postalCode}
                          onChange={e => setForm({ ...form, postalCode: e.target.value })}
                          className="erp-form-input font-mono"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">Country</label>
                        <div className="relative">
                          <Globe className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <select
                            value={form.country}
                            onChange={e => setForm({ ...form, country: e.target.value })}
                            className="erp-form-select pl-10! font-medium"
                          >
                            {COUNTRIES.map(country => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'financial' && (
                <div className="space-y-5">
                  <div className="erp-form-card space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Payment Terms & Expense Ledger Mapping</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 3 of 5</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="erp-form-label">Default Currency</label>
                        <select
                          value={form.currencyCode}
                          onChange={e => setForm({ ...form, currencyCode: e.target.value })}
                          className="erp-form-select font-bold"
                        >
                          {['PKR', 'USD', 'AED', 'SAR', 'GBP', 'EUR', 'CAD', 'AUD'].map(curr => (
                            <option key={curr} value={curr}>
                              {curr}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                          Bills & POs from this vendor default to this currency.
                        </p>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Payment Terms (Net Days)
                        </label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            placeholder="30"
                            value={form.paymentTermsDays}
                            onChange={e => setForm({ ...form, paymentTermsDays: e.target.value })}
                            className="erp-form-input pl-10! font-mono"
                          />
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                          Default bill payment due date offset (e.g. 30 = Net 30 days).
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="erp-form-label">
                          Default Expense GL Account
                        </label>
                        <select
                          value={form.defaultExpenseAccountId}
                          onChange={e => setForm({ ...form, defaultExpenseAccountId: e.target.value })}
                          className="erp-form-select font-medium"
                        >
                          <option value="">Select Default COA Expense Account (Optional)</option>
                          {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} — {acc.name} ({acc.type})
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                          Auto-fills ledger expense line on vendor bills for this supplier.
                        </p>
                      </div>
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
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Supplier Tax & Withholding Compliance</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 4 of 5</span>
                    </div>

                    <div>
                      <label className="erp-form-label">
                        Tax Registration / NTN / STRN / TRN
                      </label>
                      <div className="relative">
                        <Receipt className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          placeholder="e.g. 1234567-8 (FBR NTN / STRN) or TRN"
                          value={form.taxId}
                          onChange={e => setForm({ ...form, taxId: e.target.value })}
                          className="erp-form-input pl-10! font-mono font-semibold"
                        />
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                        Required for automated B2B procurement withholding tax and e-invoicing verification.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[var(--color-text-muted)] flex items-start gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[var(--color-text-strong)] mb-0.5">Procurement Compliance</p>
                        <p className="text-[11px] leading-relaxed">
                          Vendor bills will verify Active Taxpayer status and auto-calculate applicable withholding tax deductions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-6">
                  {/* Summary Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-sky-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0">
                        {form.name ? form.name.charAt(0).toUpperCase() : 'V'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[var(--color-text-strong)]">
                            {form.name || 'Unnamed Vendor'}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Active Supplier
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          Assigned Entity: {assignedCompany ? assignedCompany.name : 'Global Group Supplier'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-strong)]">
                        Terms: Net {form.paymentTermsDays || 30} Days ({form.currencyCode || 'PKR'})
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* General & Primary Contact */}
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                      <h4 className="font-bold text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <Users className="w-4 h-4 text-sky-500" /> General & Primary Contact
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-[var(--color-text-muted)]">Vendor Number:</span> <p className="font-semibold font-mono text-[var(--color-text-strong)]">{form.vendorNumber || 'Auto-generated'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Company Assignment:</span> <p className="font-semibold text-[var(--color-text-strong)]">{assignedCompany?.name || 'Global'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Email:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.email || '—'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Phone:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.phone || '—'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Contact Person:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.contactPerson || '—'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Contact Person Phone:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.contactPhone || '—'}</p></div>
                      </div>
                    </div>

                    {/* Address & Location */}
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                      <h4 className="font-bold text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <MapPin className="w-4 h-4 text-emerald-500" /> Address & Location
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="col-span-2"><span className="text-[var(--color-text-muted)]">Address:</span> <p className="font-semibold text-[var(--color-text-strong)]">{[form.addressLine1, form.addressLine2].filter(Boolean).join(', ') || '—'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">City:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.city || '—'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">State / Province:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.state || '—'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Postal / ZIP Code:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.postalCode || '—'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Country:</span> <p className="font-semibold text-[var(--color-text-strong)]">{form.country || 'Pakistan'}</p></div>
                      </div>
                    </div>

                    {/* Financial Terms */}
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                      <h4 className="font-bold text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <Wallet className="w-4 h-4 text-violet-500" /> Terms & Financials
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-[var(--color-text-muted)]">Billing Currency:</span> <p className="font-semibold text-[var(--color-text-strong)] font-mono">{form.currencyCode || 'PKR'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Payment Terms:</span> <p className="font-semibold text-[var(--color-text-strong)]">Net {form.paymentTermsDays || 30} Days</p></div>
                        <div className="col-span-2"><span className="text-[var(--color-text-muted)]">Default Expense Account:</span> <p className="font-semibold text-[var(--color-text-strong)]">{accounts.find(a => a.id === form.defaultExpenseAccountId)?.name || 'Default Procurement Expense'}</p></div>
                      </div>
                    </div>

                    {/* Tax & Compliance */}
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                      <h4 className="font-bold text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <Receipt className="w-4 h-4 text-amber-500" /> Tax & Compliance
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-[var(--color-text-muted)]">Tax / NTN / STRN ID:</span> <p className="font-semibold font-mono text-[var(--color-text-strong)]">{form.taxId || '—'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">WHT Status:</span> <p className="font-semibold text-emerald-600">Active Filer Compliant</p></div>
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

                {modalTab !== 'general' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalTab === 'preview') setModalTab('tax')
                      else if (modalTab === 'tax') setModalTab('financial')
                      else if (modalTab === 'financial') setModalTab('address')
                      else if (modalTab === 'address') setModalTab('general')
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
                      if (modalTab === 'general') {
                        if (!form.name.trim()) {
                          notify('Please enter vendor name before proceeding.')
                          return
                        }
                        setModalTab('address')
                      } else if (modalTab === 'address') {
                        setModalTab('financial')
                      } else if (modalTab === 'financial') {
                        setModalTab('tax')
                      } else if (modalTab === 'tax') {
                        setModalTab('preview')
                      }
                    }}
                    className="h-9 min-h-[36px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap leading-none shrink-0"
                  >
                    <span>
                      {modalTab === 'general' ? 'Next: Address & Location' : modalTab === 'address' ? 'Next: Terms & Financials' : modalTab === 'financial' ? 'Next: Tax & Compliance' : 'Preview Vendor'}
                    </span>
                    {modalTab === 'tax' ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="h-9 min-h-[36px] px-5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white whitespace-nowrap leading-none shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{editingVendor ? 'Confirm & Save Changes' : 'Confirm & Create Vendor'}</span>
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
