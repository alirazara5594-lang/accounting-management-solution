import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ShieldAlert, UserCheck, Users, User, CreditCard, Pencil, Trash2,
  Building2, MapPin, Receipt, Globe, Check, Sparkles, X, Mail,
  Phone, Hash, Calendar, ShieldCheck, ArrowRight, ArrowLeft, Eye,
  DollarSign, Clock
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DataToolbar } from '@/components/ui/data-toolbar'
import type { Entity } from './EntitySettings'
import { useCustomersStore } from './stores'
import { useFormDraft } from './hooks/useFormDraft'
import { KpiCard, KpiGrid } from './components/ui/kpi-card'
import { StatusChip } from './components/ui/status-chip'
import { EmptyState, TableSkeleton } from './components/ui/empty-state'
import { money } from './lib/currency'

export type CustomerStatus = 'Active' | 'Inactive' | 'Blocked'

export type Customer = {
  id: string
  customerNumber: string
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
  country?: string
  currencyCode: string
  creditLimit: number
  paymentTermsDays: number
  companyId?: string
  status: CustomerStatus
  createdAt: string
  updatedAt: string
}

type CustomerForm = {
  customerNumber: string
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
  creditLimit: string
  paymentTermsDays: string
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

const blankForm = (): CustomerForm => ({
  customerNumber: '',
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
  creditLimit: '0',
  paymentTermsDays: '30',
  companyId: ''
})

export default function CustomerManagement({
  entities,
  activeEntityId,
  notify
}: {
  entities: Entity[]
  activeEntityId: string
  notify: (msg: string) => void
}) {
  const customers = useCustomersStore((s) => s.customers as Customer[])
  const loading = useCustomersStore((s) => s.loading)
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers)
  const fetchNextNumber = useCustomersStore((s) => s.fetchNextNumber)
  const saveCustomerStore = useCustomersStore((s) => s.saveCustomer)
  const toggleCustomerStatusStore = useCustomersStore((s) => s.toggleCustomerStatus)
  const deleteCustomerStore = useCustomersStore((s) => s.deleteCustomer)

  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'general' | 'address' | 'financial' | 'tax' | 'preview'>('general')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerForm>(blankForm())
  const { saveDraft, clearDraft } = useFormDraft('customer', form, setForm, modalOpen, !!editingCustomer)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch =
        `${c.customerNumber} ${c.name} ${c.email || ''} ${c.phone || ''} ${c.city || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())

      const matchesCompany =
        companyFilter === 'all'
          ? true
          : companyFilter === 'unassigned'
          ? !c.companyId
          : c.companyId === companyFilter

      const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter

      return matchesSearch && matchesCompany && matchesStatus
    }).sort((a, b) => {
      const numA = a.customerNumber || a.name || ''
      const numB = b.customerNumber || b.name || ''
      return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [customers, search, companyFilter, statusFilter])

  const exportHeaders = ['Number', 'Name', 'Email', 'Phone', 'City', 'Country', 'Currency', 'Credit Limit', 'Payment Terms', 'Status']
  const exportRows = filteredCustomers.map(c => [
    c.customerNumber, c.name, c.email || '', c.phone || '', c.city || '', c.country || '',
    c.currencyCode, c.creditLimit, c.paymentTermsDays, c.status,
  ])

  const stats = useMemo(() => {
    const total = customers.length
    const activeCount = customers.filter(c => c.status === 'Active').length
    const totalCreditLimit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0)
    const avgTerms = total > 0 ? Math.round(customers.reduce((sum, c) => sum + (c.paymentTermsDays || 30), 0) / total) : 30
    return { total, activeCount, totalCreditLimit, avgTerms }
  }, [customers])

  const openCreateModal = async () => {
    setEditingCustomer(null)
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
    if (num) newForm.customerNumber = num

    try {
      const saved = localStorage.getItem('draft_customer')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.currencyCode === 'USD' || !parsed.currencyCode) parsed.currencyCode = 'PKR'
        if (parsed.country === 'United States' || !parsed.country) parsed.country = 'Pakistan'
        localStorage.setItem('draft_customer', JSON.stringify(parsed))
      }
    } catch {}

    setForm(newForm)
    setModalTab('general')
    setModalOpen(true)
  }

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer)
    setForm({
      customerNumber: customer.customerNumber,
      name: customer.name,
      contactPerson: customer.contactPerson || '',
      contactPhone: customer.contactPhone || '',
      email: customer.email || '',
      phone: customer.phone || '',
      taxId: customer.taxId || '',
      addressLine1: customer.addressLine1 || '',
      addressLine2: customer.addressLine2 || '',
      city: customer.city || '',
      state: customer.state || '',
      postalCode: customer.postalCode || '',
      country: customer.country || 'Pakistan',
      currencyCode: customer.currencyCode || 'PKR',
      creditLimit: String(customer.creditLimit || 0),
      paymentTermsDays: String(customer.paymentTermsDays || 30),
      companyId: customer.companyId || ''
    })
    setModalTab('general')
    setModalOpen(true)
  }

  const handleConfirmSave = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!form.name.trim()) {
      notify('Customer name is required.')
      setModalTab('general')
      return
    }

    // Only allow submission when on the preview tab
    if (modalTab !== 'preview') {
      setModalTab('preview')
      return
    }

    const isGuid = (val?: string | null) => !!val && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val)

    const payload = {
      customerNumber: form.customerNumber || null,
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
      currencyCode: form.currencyCode.trim() || 'PKR',
      creditLimit: Number(form.creditLimit) || 0,
      paymentTermsDays: Number(form.paymentTermsDays) || 30,
      companyId: isGuid(form.companyId) ? form.companyId : null
    }

    try {
      await saveCustomerStore(payload, editingCustomer ? editingCustomer.id : undefined)
      clearDraft()
      notify(editingCustomer ? 'Customer updated successfully.' : 'Customer created successfully.')
      setModalOpen(false)
    } catch (err: any) {
      notify(err.message || 'Error saving customer.')
    }
  }

  const handleStatusChange = async (customer: Customer, _newStatus: CustomerStatus) => {
    try {
      await toggleCustomerStatusStore(customer)
      notify(`Customer ${customer.name} status updated.`)
    } catch (err: any) {
      notify(err.message || 'Status change failed.')
    }
  }

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Are you sure you want to delete customer "${customer.name}"?`)) return
    try {
      await deleteCustomerStore(customer.id)
      notify(`Customer ${customer.name} deleted.`)
    } catch (err: any) {
      notify(err.message || 'Could not delete customer.')
    }
  }

  const companyMap = useMemo(() => {
    const map = new Map<string, Entity>()
    entities.forEach(e => map.set(e.id, e))
    return map
  }, [entities])

  const assignedCompany = form.companyId ? companyMap.get(form.companyId) : null

  return (
    <div className="space-y-6">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-indigo-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-indigo-500 to-blue-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Customer Management</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Manage customer records, credit terms, contact directories, and trade receivables.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <DataToolbar
              query={search}
              setQuery={setSearch}
              searchPlaceholder="Search customer #, name..."
              exportFileName="customer-directory"
              exportSheetName="Customers"
              exportTitle="Customer Directory"
              exportSubtitle="Customer accounts, credit limits, and contact records."
              exportHeaders={exportHeaders}
              exportRows={exportRows}
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
              <span>＋</span> Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Header Stats (Row 2) */}
      <div className="px-5">
        <KpiGrid cols={3}>
          {[
            { label: 'Total Customers', value: stats.total, desc: `${stats.activeCount} active in group`, icon: Users, tone: 'blue' },
            { label: 'Total Credit Limit', value: money(stats.totalCreditLimit), desc: 'Allocated credit exposure', icon: DollarSign, tone: 'teal' },
            { label: 'Avg Payment Terms', value: `${stats.avgTerms} Days`, desc: 'Net payment period', icon: Clock, tone: 'purple' },
          ].map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </KpiGrid>
      </div>

      {/* Customer Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-indigo-500 to-blue-700" />
            Customer Directory &amp; Receivables
          </p>
          <span className="text-[11px] text-[var(--color-text-muted)]">Showing {filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            hint="Adjust the search, company, or status filters to see more results."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-indigo-500/[0.05] dark:bg-indigo-400/[0.07]">
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Number</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Name</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Company</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Email</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Phone</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Location</th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Credit Limit</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Terms</th>
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                  <th className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => {
                  const comp = customer.companyId ? companyMap.get(customer.companyId) : null
                  return (
                    <tr key={customer.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-colors">
                      <td className="px-3 py-2 font-mono font-semibold text-[var(--color-text-strong)]">{customer.customerNumber}</td>
                      <td className="px-3 py-2 font-semibold text-[var(--color-text-strong)]">{customer.name}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{comp ? comp.name : '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{customer.email || '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{customer.phone || '—'}</td>
                      <td className="px-3 py-2 text-[var(--color-text-muted)]">{[customer.city, customer.country].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-[var(--color-text-strong)]">{money(customer.creditLimit, customer.currencyCode)}</td>
                      <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">Net {customer.paymentTermsDays}d</td>
                      <td className="px-3 py-2 text-center">
                        <StatusChip
                          status={customer.status}
                          label={customer.status}
                          hex={customer.status === 'Active' ? '#10b981' : customer.status === 'Blocked' ? '#ef4444' : '#f59e0b'}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(customer)} className="h-7 w-7 p-0">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(customer)} className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          {customer.status !== 'Active' && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(customer, 'Active')} className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600" title="Activate">
                              <UserCheck className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {customer.status !== 'Blocked' && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(customer, 'Blocked')} className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600" title="Block">
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

      {/* Professional Customer Modal */}
      {modalOpen && (
        <div className="overlay animate-in fade-in duration-200">
          <form
            className="w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onSubmit={(e) => { e.preventDefault(); }}
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight">
                      {editingCustomer ? 'Edit Customer Account' : 'Register New Customer'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-600 border border-sky-500/20">
                      {editingCustomer ? 'Updating Profile' : 'New Client'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1.5">
                    <span>Assigned Entity:</span>
                    <span className="font-semibold text-[var(--color-text-strong)] inline-flex items-center gap-1">
                      🏢 {assignedCompany ? assignedCompany.name : 'Global Group Customer'}
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
                <CreditCard className="w-3.5 h-3.5" />
                <span>Terms & Credit</span>
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
                        <Users className="w-4 h-4 text-sky-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Customer Account Profile</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 1 of 5</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Customer / Organization Name
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            required
                            placeholder="e.g. Apex Global Logistics LLC"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="erp-form-input pl-10! font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Customer Code / Account #
                        </label>
                        <div className="relative">
                          <Hash className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="Auto-generated if blank (CUST-XXXX)"
                            value={form.customerNumber}
                            onChange={e => setForm({ ...form, customerNumber: e.target.value })}
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
                          <option value="">🌐 All / Group Customer (Global Access)</option>
                          {entities.map(e => (
                            <option key={e.id} value={e.id}>
                              🏢 {e.name} {e.code ? `(${e.code})` : ''} {e.id === activeEntityId ? '★ (Active Workspace)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="erp-form-label">Primary Billing Email</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            placeholder="billing@apexlogistics.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            className="erp-form-input pl-10!"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">Company Landline / Phone</label>
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
                        <label className="erp-form-label">Contact Person Name</label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="e.g. Muhammad Ali"
                            value={form.contactPerson}
                            onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                            className="erp-form-input pl-10!"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="erp-form-label">Contact Person Mobile</label>
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
                        <MapPin className="w-4 h-4 text-sky-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Billing & Physical Address</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 2 of 5</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="erp-form-label">Street Address Line 1</label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            placeholder="e.g. 12-A Main Boulevard, Gulberg III"
                            value={form.addressLine1}
                            onChange={e => setForm({ ...form, addressLine1: e.target.value })}
                            className="erp-form-input pl-10!"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="erp-form-label">Suite / Unit / Floor (Optional)</label>
                        <input
                          placeholder="Floor 2, Office # 204"
                          value={form.addressLine2}
                          onChange={e => setForm({ ...form, addressLine2: e.target.value })}
                          className="erp-form-input"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">City</label>
                        <input
                          placeholder="Lahore / Dubai / London"
                          value={form.city}
                          onChange={e => setForm({ ...form, city: e.target.value })}
                          className="erp-form-input"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">State / Province / Region</label>
                        <input
                          placeholder="Punjab / Dubai"
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
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Payment Terms & Credit Settings</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 3 of 5</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="erp-form-label">Default Billing Currency</label>
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
                          Invoices for this customer default to this currency.
                        </p>
                      </div>

                      <div>
                        <label className="erp-form-label">
                          Max Credit Limit ({form.currencyCode})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-[var(--color-text-muted)]">
                            {form.currencyCode}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="500000"
                            value={form.creditLimit}
                            onChange={e => setForm({ ...form, creditLimit: e.target.value })}
                            className="erp-form-input pl-14! font-mono font-bold"
                          />
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                          Maximum outstanding trade receivables allowed before warning.
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
                          Default invoice due date offset (e.g. 30 = Net 30 days).
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
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Tax Compliance & Registration</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 4 of 5</span>
                    </div>

                    <div>
                      <label className="erp-form-label">
                        Tax Registration ID / NTN / VAT TRN
                      </label>
                      <div className="relative">
                        <Receipt className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          placeholder="e.g. 1234567-8 (FBR NTN/STRN) or TRN"
                          value={form.taxId}
                          onChange={e => setForm({ ...form, taxId: e.target.value })}
                          className="erp-form-input pl-10! font-mono font-semibold"
                        />
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                        Required for automated B2B e-invoicing compliance (FBR, ZATCA, EU VAT).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-[var(--color-text-muted)] flex items-start gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[var(--color-text-strong)] mb-0.5">Automated Global Tax Rules</p>
                        <p className="text-[11px] leading-relaxed">
                          Invoices for this customer inherit tax jurisdiction rates based on their country ({form.country || 'Pakistan'}) and assigned company entity.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'preview' && (
                <div className="space-y-6">
                  {/* Summary Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-indigo-500/10 border border-sky-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0">
                        {form.name ? form.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[var(--color-text-strong)]">
                            {form.name || 'Unnamed Customer'}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Active
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          Assigned Entity: {assignedCompany ? assignedCompany.name : 'Global Group Customer'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-strong)]">
                        Credit Limit: {money(parseFloat(form.creditLimit) || 0, form.currencyCode)}
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
                        <div><span className="text-[var(--color-text-muted)]">Customer Number:</span> <p className="font-semibold font-mono text-[var(--color-text-strong)]">{form.customerNumber || 'Auto-generated'}</p></div>
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
                        <CreditCard className="w-4 h-4 text-violet-500" /> Terms & Financials
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-[var(--color-text-muted)]">Default Currency:</span> <p className="font-semibold text-[var(--color-text-strong)] font-mono">{form.currencyCode || 'PKR'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Credit Limit:</span> <p className="font-semibold text-[var(--color-text-strong)] font-mono">{money(Number(form.creditLimit) || 0, form.currencyCode)}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Payment Terms:</span> <p className="font-semibold text-[var(--color-text-strong)]">Net {form.paymentTermsDays || 30} Days</p></div>
                        <div><span className="text-[var(--color-text-muted)]">Account Status:</span> <p className="font-semibold text-[var(--color-text-strong)]">Active</p></div>
                      </div>
                    </div>

                    {/* Tax & Compliance */}
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                      <h4 className="font-bold text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                        <Receipt className="w-4 h-4 text-amber-500" /> Tax & Compliance
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><span className="text-[var(--color-text-muted)]">Tax / NTN / STRN ID:</span> <p className="font-semibold font-mono text-[var(--color-text-strong)]">{form.taxId || '—'}</p></div>
                        <div><span className="text-[var(--color-text-muted)]">B2B E-Invoicing:</span> <p className="font-semibold text-emerald-600">Eligible</p></div>
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
                    key="btn-modal-next"
                    type="button"
                    onClick={() => {
                      if (modalTab === 'general') {
                        if (!form.name.trim()) {
                          notify('Customer name is required.')
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
                      {modalTab === 'general' ? 'Next: Address & Location' : modalTab === 'address' ? 'Next: Terms & Financials' : modalTab === 'financial' ? 'Next: Tax & Compliance' : 'Preview Customer'}
                    </span>
                    {modalTab === 'tax' ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ) : (
                  <button
                    key="btn-modal-confirm"
                    type="button"
                    onClick={handleConfirmSave}
                    className="h-9 min-h-[36px] px-5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white whitespace-nowrap leading-none shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{editingCustomer ? 'Confirm & Save Changes' : 'Confirm & Create Customer'}</span>
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
