import React, { useState, useEffect } from 'react';
import { useProcurementStore, useVendorsStore, useProductsStore, useCoaStore } from './stores';
import { DataToolbar } from '@/components/ui/data-toolbar';
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card';
import { EmptyState } from './components/ui/empty-state';
import { money } from './lib/currency';
import { formatBillNumber } from './lib/invoiceNumbering';
import {
  FileText, Receipt, CheckCircle, Plus, X, Eye, ArrowRight,
  CreditCard, Truck, Trash2, Building2
} from 'lucide-react';
import { CompactSelect } from './components/CompactSelect';
import { CompactProductSelect } from './components/CompactProductSelect';

export const VendorBills: React.FC<{ activeEntityId: string }> = ({ activeEntityId }) => {
  const bills = useProcurementStore((s) => s.bills);
  const orders = useProcurementStore((s) => s.orders);
  const loading = useProcurementStore((s) => s.loading);
  const fetchBills = useProcurementStore((s) => s.fetchBills);
  const fetchOrders = useProcurementStore((s) => s.fetchOrders);
  const createVendorBillStore = useProcurementStore((s) => s.createVendorBill);
  const validateThreeWayMatchStore = useProcurementStore((s) => s.validateThreeWayMatch);

  const vendors = useVendorsStore((s) => s.vendors);
  const fetchVendors = useVendorsStore((s) => s.fetchVendors);

  const products = useProductsStore((s) => s.products);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);
  const accounts = useCoaStore((s) => s.accounts);
  const fetchAccounts = useCoaStore((s) => s.fetchAccounts);

  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [showBillModal, setShowBillModal] = useState(false);
  const [entryMode, setEntryMode] = useState<'direct' | 'procurement'>('direct');
  const [modalTab, setModalTab] = useState<'details' | 'lines' | 'preview'>('details');

  const [billForm, setBillForm] = useState({
    purchaseOrderId: '',
    vendorId: '',
    billNumber: '',
    vendorInvoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    paymentTermsDays: '30',
    currencyCode: 'PKR',
    notes: '',
    taxAmount: '0'
  });

  const [billLines, setBillLines] = useState<any[]>([]);
  const [matchModal, setMatchModal] = useState<any>(null);

  useEffect(() => {
    fetchBills(activeEntityId);
    fetchOrders(activeEntityId);
    fetchVendors(activeEntityId);
    fetchProducts();
    fetchAccounts();
  }, [activeEntityId]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const computeNextBillNumber = () => {
    let maxNum = 0;
    for (const item of bills) {
      const str = (item.billNumber || '') + '';
      if (str.startsWith('BILL-202') || str.length > 11) continue;
      const match = str.match(/BILL-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num < 100000 && num > maxNum) maxNum = num;
      }
    }
    return `BILL-${(maxNum + 1).toString().padStart(5, '0')}`;
  };

  const openDirectBill = () => {
    setEntryMode('direct');
    setBillForm({
      purchaseOrderId: '',
      vendorId: vendors[0]?.id || '',
      billNumber: computeNextBillNumber(),
      vendorInvoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      paymentTermsDays: '30',
      currencyCode: 'PKR',
      notes: '',
      taxAmount: '0'
    });
    setBillLines([{ description: '', quantity: 1, unitPrice: 0, accountId: '', destination: 'Expense', taxAmount: 0 }]);
    setModalTab('details');
    setShowBillModal(true);
  };

  const openPOBill = () => {
    setEntryMode('procurement');
    setBillForm({
      purchaseOrderId: '',
      vendorId: vendors[0]?.id || '',
      billNumber: computeNextBillNumber(),
      vendorInvoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      paymentTermsDays: '30',
      currencyCode: 'PKR',
      notes: '',
      taxAmount: '0'
    });
    setBillLines([{ description: '', quantity: 1, unitPrice: 0, accountId: '', destination: 'Expense', taxAmount: 0 }]);
    setModalTab('details');
    setShowBillModal(true);
  };

  const handlePOSelect = (poId: string) => {
    const po = orders.find((o: any) => o.id === poId);
    if (po) {
      setBillForm(prev => ({ ...prev, purchaseOrderId: poId, vendorId: po.vendorId || prev.vendorId }));
      if (po.lines && po.lines.length > 0) {
        setBillLines(po.lines.map((l: any) => ({
          description: l.description || '',
          productId: l.productId || null,
          quantity: l.quantity || 1,
          unitPrice: l.unitPrice || 0,
          accountId: l.expenseAccountId || accounts[0]?.id || '',
          destination: l.destination || 'Expense',
          taxAmount: l.taxAmount || 0
        })));
      }
    }
  };

  const handlePayBill = (bill: any) => {
    const total = bill.lines?.reduce((acc: number, l: any) => acc + ((l.quantity || 1) * (l.unitPrice || 0)), 0) || 0;
    const payload = {
      vendorId: bill.vendorId,
      billId: bill.id,
      amount: total
    };
    localStorage.setItem('ams_pending_vendor_payment', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('ams_navigate', { detail: 'Procurement.Vendor Payments' }));
  };

  const saveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForm.vendorId) { notify('Please select a vendor.'); return; }
    if (!billForm.vendorInvoiceNumber) { notify('Please enter supplier invoice number.'); return; }
    if (billForm.dueDate && billForm.date && billForm.dueDate < billForm.date) {
      notify('⚠️ Due Date cannot be earlier than the Bill Date.');
      return;
    }
    const body = {
      purchaseOrderId: entryMode === 'procurement' ? (billForm.purchaseOrderId || null) : null,
      vendorId: billForm.vendorId,
      billNumber: billForm.billNumber,
      vendorInvoiceNumber: billForm.vendorInvoiceNumber,
      date: billForm.date,
      dueDate: billForm.dueDate,
      paymentTermsDays: parseInt(billForm.paymentTermsDays || '30'),
      currencyCode: billForm.currencyCode,
      notes: billForm.notes,
      companyId: activeEntityId || null,
      lines: billLines.map(l => ({
        description: l.description,
        productId: l.productId || null,
        quantity: parseFloat(String(l.quantity) || '1'),
        unitPrice: parseFloat(String(l.unitPrice) || '0'),
        taxAmount: parseFloat(String(l.taxAmount) || '0'),
        destination: l.destination || 'Expense',
        accountId: l.accountId || null
      }))
    };
    try {
      await createVendorBillStore(body, activeEntityId);
      notify(entryMode === 'direct' ? '✓ Direct bill posted to Accounts Payable!' : '✓ PO bill saved & 3-way match updated!');
      setShowBillModal(false);
    } catch (err: any) {
      notify(err.message || 'Error saving bill');
    }
  };

  const inspectMatch = async (poId: string) => {
    if (!poId) { notify('Direct bill has no PO reference.'); return; }
    const res = await validateThreeWayMatchStore(poId);
    setMatchModal(res);
  };

  const isDraftBill = (b: any) => b.status === 0 || b.status === '0' || String(b.status).toLowerCase() === 'draft';
  const isVoidBill = (b: any) => b.status === 4 || b.status === '4' || String(b.status).toLowerCase() === 'void' || String(b.status).toLowerCase() === 'cancelled';
  const isPaidBill = (b: any) => b.status === 3 || b.status === '3' || String(b.status).toLowerCase() === 'paid';

  const activeBills = (bills as any[]).filter(b => !isDraftBill(b) && !isVoidBill(b));
  const openBills = activeBills.filter(b => !isPaidBill(b) && (b.amountDue ?? (b.totalAmount - (b.amountPaid || 0))) > 0);
  const draftBills = (bills as any[]).filter(b => isDraftBill(b));

  const totalOutstanding = openBills.reduce((sum: number, b: any) => {
    const due = b.amountDue ?? (b.totalAmount ? (b.totalAmount - (b.amountPaid || 0)) : b.lines?.reduce((s: number, l: any) => s + ((l.quantity || 1) * (l.unitPrice || 0)), 0) || 0);
    return sum + due;
  }, 0);

  const draftBillsTotal = draftBills.reduce((sum: number, b: any) => {
    const tot = b.totalAmount ?? (b.lines?.reduce((s: number, l: any) => s + ((l.quantity || 1) * (l.unitPrice || 0)), 0) || 0);
    return sum + tot;
  }, 0);

  const directCount = activeBills.filter((b: any) => !b.purchaseOrderId).length;
  const poCount = activeBills.filter((b: any) => b.purchaseOrderId).length;

  const filteredBills = (bills as any[]).filter((bill: any) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const vendor = vendors.find(v => v.id === bill.vendorId);
    return (
      (bill.billNumber || '').toLowerCase().includes(q) ||
      (bill.vendorInvoiceNumber || bill.vendorBillNumber || '').toLowerCase().includes(q) ||
      (vendor?.name || bill.vendorName || '').toLowerCase().includes(q) ||
      (bill.date || '').includes(q)
    );
  });

  const exportHeaders = ['Bill Number', 'Supplier Invoice #', 'Entry Type', 'Vendor Name', 'Bill Date', 'Due Date', 'Total Amount'];
  const exportRows = filteredBills.map((bill: any) => {
    const vendor = vendors.find(v => v.id === bill.vendorId);
    const total = bill.lines?.reduce((acc: number, l: any) => acc + ((l.quantity || 1) * (l.unitPrice || 0)), 0) || 0;
    return [bill.billNumber, bill.vendorInvoiceNumber || bill.vendorBillNumber || '', bill.purchaseOrderId ? 'PO Bill' : 'Direct Bill', vendor?.name || bill.vendorName || 'Vendor', bill.date, bill.dueDate, total];
  });

  const billSubtotal = billLines.reduce((sum: number, l: any) => sum + ((parseFloat(String(l.quantity) || '0') || 0) * (parseFloat(String(l.unitPrice) || '0') || 0)), 0);
  const billTax = billLines.reduce((sum: number, l: any) => sum + (parseFloat(String(l.taxAmount) || '0') || 0), 0);
  const billTotal = billSubtotal + billTax;

  return (
    <div className="space-y-5">
      {toast && <div className="fixed top-4 right-4 z-[9999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg px-4 py-3 text-sm font-medium text-[var(--color-text-strong)]">{toast}</div>}

      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-amber-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-amber-500 to-orange-700" />
              <div className="absolute inset-0 flex items-center justify-center"><CreditCard className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Vendor Bills</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Manage supplier invoices and procurement-linked bills</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
          <DataToolbar
            query={query} setQuery={setQuery}
            searchPlaceholder="Search bill #, vendor..."
            exportFileName="vendor-bills" exportSheetName="Vendor Bills"
            exportTitle="Vendor Bills" exportSubtitle="Supplier invoices and bills."
            exportHeaders={exportHeaders} exportRows={exportRows}
            exportTotals={[{ label: 'Total Outstanding', value: totalOutstanding }]}
            onRefresh={() => { fetchBills(activeEntityId); fetchOrders(activeEntityId); }}
          >
            <button onClick={openDirectBill} className="h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-strong)] hover:bg-[var(--color-surface-muted)] transition-colors flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-500" /> Direct Bill
            </button>
            <button onClick={openPOBill} className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2">
              <Truck className="w-4 h-4" /> PO Bill
            </button>
          </DataToolbar>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiGrid cols={4}>
        <KpiCard icon={FileText} label="Total Outstanding" value={money(totalOutstanding)} desc={`${openBills.length} approved payables`} tone="amber" />
        <KpiCard icon={FileText} label="Draft Bills" value={String(draftBills.length)} desc={draftBills.length > 0 ? `${money(draftBillsTotal)} pending` : 'Ready for approval'} tone="blue" />
        <KpiCard icon={CreditCard} label="Direct Bills" value={String(directCount)} desc="Posted to AP directly" tone="emerald" />
        <KpiCard icon={Truck} label="PO Linked Bills" value={String(poCount)} desc="3-way match active" tone="purple" />
      </KpiGrid>

      {/* Bills Table */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]"><span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-amber-500 to-orange-700" />All Vendor Bills</p>
          <span className="text-[11px] text-[var(--color-text-muted)]">{filteredBills.length} bills</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--color-border)]">
            <tr>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Bill #</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Supplier Invoice</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Type</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Vendor</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Date</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Due Date</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] text-right">Amount</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filteredBills.map((bill: any, idx: number) => {
              const vendor = vendors.find(v => v.id === bill.vendorId);
              const total = bill.lines?.reduce((acc: number, l: any) => acc + ((l.quantity || 1) * (l.unitPrice || 0)), 0) || 0;
              const isDirect = !bill.purchaseOrderId;
              return (
                <tr key={bill.id} className="hover:bg-[var(--color-surface-muted)]/50 transition-colors">
                  <td className="px-5 py-3 font-mono font-bold text-[var(--color-text-strong)]">{formatBillNumber(bill.billNumber || bill.reference, idx + 1)}</td>
                  <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono text-[10px] font-bold">{bill.vendorInvoiceNumber || bill.vendorBillNumber}</span></td>
                  <td className="px-5 py-3">
                    {isDirect ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20">Direct</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">PO Bill</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium text-[var(--color-text-strong)]">{vendor?.name || bill.vendorName || 'Vendor'}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{bill.date}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{bill.dueDate}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-[var(--color-text-strong)]">{money(total, bill.currencyCode || 'PKR')}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {bill.purchaseOrderId ? (
                        <button onClick={() => inspectMatch(bill.purchaseOrderId)} className="h-7 px-2.5 rounded-lg border border-[var(--color-border)] text-[10px] font-semibold text-blue-500 hover:bg-blue-500/10 transition-colors flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Match
                        </button>
                      ) : (
                        <span className="text-[10px] text-[var(--color-text-muted)] font-medium">Direct AP</span>
                      )}
                      <button
                        onClick={() => handlePayBill(bill)}
                        title="Record Payment / Pay Bill"
                        className="h-7 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CreditCard className="w-3 h-3" /> Pay
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredBills.length === 0 && (
              <tr><td colSpan={8}>
                <EmptyState icon={Receipt} title="No vendor bills yet" hint='Click "Direct Bill" or "PO Bill" to create one' />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowBillModal(false)}>
          <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${entryMode === 'direct' ? 'from-blue-500 to-indigo-600' : 'from-amber-500 to-orange-600'} flex items-center justify-center text-white shadow-sm`}>
                  {entryMode === 'direct' ? <CreditCard className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-strong)]">{entryMode === 'direct' ? 'Direct Vendor Bill' : 'Procurement Vendor Bill'}</h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Ref: <span className="font-mono font-bold text-[var(--color-text-strong)]">{billForm.billNumber}</span></p>
                </div>
              </div>
              <button onClick={() => setShowBillModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-muted)] transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Modal Stepper Navigation */}
            <div className="erp-stepper-nav">
              <button
                type="button"
                onClick={() => setModalTab('details')}
                className={`erp-step-pill ${modalTab === 'details' ? 'active' : ''}`}
              >
                <span className="erp-step-num">1</span>
                <FileText className="w-3.5 h-3.5" />
                <span>Vendor & Dates</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('lines')}
                className={`erp-step-pill ${modalTab === 'lines' ? 'active' : ''}`}
              >
                <span className="erp-step-num">2</span>
                <Receipt className="w-3.5 h-3.5" />
                <span>Line Items ({billLines.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('preview')}
                className={`erp-step-pill ${modalTab === 'preview' ? 'active' : ''}`}
              >
                <span className="erp-step-num">3</span>
                <Eye className="w-3.5 h-3.5" />
                <span>Review & Submit</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
              {/* TAB: Details */}
              {modalTab === 'details' && (
                <div className="space-y-5">
                  {entryMode === 'procurement' && (
                    <div className="erp-form-card-muted space-y-2">
                      <label className="erp-form-label">Linked Purchase Order</label>
                      <CompactSelect
                        value={billForm.purchaseOrderId}
                        onChange={v => handlePOSelect(v)}
                        options={orders.map((p: any) => ({
                          value: p.id,
                          label: p.orderNumber || p.poNumber,
                          badge: p.poNumber
                        }))}
                        placeholder="-- Select Purchase Order --"
                        className="h-10"
                      />
                    </div>
                  )}

                  {entryMode === 'direct' && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
                      <p className="font-bold text-blue-600 dark:text-blue-400">Direct AP Liability Entry</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">This bill posts directly to Accounts Payable ledger without a prior PO.</p>
                    </div>
                  )}

                  <div className="erp-form-card space-y-4">
                    <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">Supplier & Invoice Metadata</h4>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">Step 1 of 3</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Vendor / Supplier
                        </label>
                        <CompactSelect
                          value={billForm.vendorId}
                          onChange={v => setBillForm({ ...billForm, vendorId: v })}
                          options={vendors.map(v => ({ value: v.id, label: v.name }))}
                          placeholder="-- Select Vendor --"
                          className="h-10"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Supplier Invoice # / Ref
                        </label>
                        <input
                          required
                          placeholder="e.g. INV-SUP-9982"
                          value={billForm.vendorInvoiceNumber}
                          onChange={e => setBillForm({ ...billForm, vendorInvoiceNumber: e.target.value })}
                          className="erp-form-input font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">System Bill Number</label>
                        <input
                          value={billForm.billNumber}
                          onChange={e => setBillForm({ ...billForm, billNumber: e.target.value })}
                          className="erp-form-input bg-[var(--color-surface-muted)] font-mono font-bold text-[var(--color-text-strong)]"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">Transaction Currency</label>
                        <CompactSelect
                          value={billForm.currencyCode}
                          onChange={c => setBillForm({ ...billForm, currencyCode: c })}
                          options={['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD'].map(c => ({ value: c, label: c }))}
                          placeholder="Currency"
                          className="h-10"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Invoice / Bill Date
                        </label>
                        <input
                          type="date"
                          required
                          value={billForm.date}
                          onChange={e => setBillForm({ ...billForm, date: e.target.value })}
                          className="erp-form-input font-medium"
                        />
                      </div>

                      <div>
                        <label className="erp-form-label">
                          <span className="text-rose-500 font-bold mr-1">*</span> Payment Due Date
                        </label>
                        <input
                          type="date"
                          required
                          value={billForm.dueDate}
                          onChange={e => setBillForm({ ...billForm, dueDate: e.target.value })}
                          className="erp-form-input font-medium"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="erp-form-label">Payment & Remittance Notes</label>
                        <input
                          placeholder="Payment instructions, bank wire info, or reference tags"
                          value={billForm.notes}
                          onChange={e => setBillForm({ ...billForm, notes: e.target.value })}
                          className="erp-form-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Line Items */}
              {modalTab === 'lines' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[var(--color-text-strong)] uppercase tracking-wider">Line Items & GL Distributions</h3>
                    <button type="button" onClick={() => setBillLines([...billLines, { description: '', quantity: 1, unitPrice: 0, accountId: '', destination: 'Expense', taxAmount: 0 }])} className="h-8 px-3 rounded-lg border border-amber-500 text-amber-600 text-xs font-semibold hover:bg-amber-500/10 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Line
                    </button>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border)]">
                        <tr>
                          <th className="p-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Description</th>
                          {entryMode === 'direct' && <th className="p-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">GL Account</th>}
                          <th className="p-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] w-16">Qty</th>
                          <th className="p-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] w-24">Unit Price</th>
                          <th className="p-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] w-24">Tax</th>
                          <th className="p-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] w-28">Amount</th>
                          <th className="p-2.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {billLines.map((l: any, i: number) => {
                          const qty = parseFloat(String(l.quantity) || '0') || 0;
                          const price = parseFloat(String(l.unitPrice) || '0') || 0;
                          const tax = parseFloat(String(l.taxAmount) || '0') || 0;
                          const lineTotal = qty * price + tax;
                          return (
                            <tr key={i} className="hover:bg-[var(--color-surface-muted)]/30">
                              <td className="p-2"><input value={l.description} onChange={e => { const u = [...billLines]; u[i].description = e.target.value; setBillLines(u); }} placeholder="Item description" className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs outline-none" /></td>
                              {entryMode === 'direct' && (
                                <td className="p-2 min-w-[180px]">
                                  <CompactSelect
                                    value={l.accountId}
                                    onChange={v => { const u = [...billLines]; u[i].accountId = v; setBillLines(u); }}
                                    options={accounts.map(a => ({ value: a.id, label: `${a.code} - ${a.name}`, badge: a.code }))}
                                    placeholder="Select GL Account..."
                                  />
                                </td>
                              )}
                              <td className="p-2"><input type="number" value={l.quantity} onChange={e => { const u = [...billLines]; u[i].quantity = e.target.value; setBillLines(u); }} className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-center font-mono outline-none" /></td>
                              <td className="p-2"><input type="number" step="0.01" value={l.unitPrice} onChange={e => { const u = [...billLines]; u[i].unitPrice = e.target.value; setBillLines(u); }} className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-center font-mono outline-none" /></td>
                              <td className="p-2"><input type="number" step="0.01" value={l.taxAmount} onChange={e => { const u = [...billLines]; u[i].taxAmount = e.target.value; setBillLines(u); }} className="w-full px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-center font-mono outline-none" /></td>
                              <td className="p-2 text-right font-mono font-bold text-[var(--color-text-strong)]">{money(lineTotal, billForm.currencyCode)}</td>
                              <td className="p-2 text-center">{billLines.length > 1 && <button type="button" onClick={() => setBillLines(billLines.filter((_, j) => j !== i))} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-3 h-3" /></button>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  {billLines.length > 0 && (
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 space-y-2">
                      <div className="flex justify-between text-xs"><span className="text-[var(--color-text-muted)]">Subtotal</span><span className="font-mono font-bold text-[var(--color-text-strong)]">{money(billSubtotal, billForm.currencyCode)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-rose-500 font-semibold">Tax</span><span className="font-mono font-bold text-rose-600">{money(billTax, billForm.currencyCode)}</span></div>
                      <div className="flex justify-between text-sm pt-2 border-t border-[var(--color-border)]"><span className="font-bold text-[var(--color-text-strong)]">Grand Total</span><span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">{money(billTotal, billForm.currencyCode)}</span></div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Preview */}
              {modalTab === 'preview' && (
                <div className="space-y-5">
                  <div className={`p-5 rounded-xl border ${entryMode === 'direct' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{entryMode === 'direct' ? 'Direct Bill' : 'PO Linked Bill'}</p>
                        <p className="text-lg font-bold font-mono text-[var(--color-text-strong)] mt-1">{billForm.billNumber}</p>
                      </div>
                      <span className={`w-12 h-12 rounded-xl bg-gradient-to-br ${entryMode === 'direct' ? 'from-blue-500 to-indigo-600' : 'from-amber-500 to-orange-600'} flex items-center justify-center text-white shadow-lg`}>
                        {entryMode === 'direct' ? <CreditCard className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div><span className="text-[var(--color-text-muted)]">Vendor</span><p className="font-bold text-[var(--color-text-strong)]">{vendors.find(v => v.id === billForm.vendorId)?.name || 'Not selected'}</p></div>
                      <div><span className="text-[var(--color-text-muted)]">Supplier Invoice</span><p className="font-bold font-mono text-[var(--color-text-strong)]">{billForm.vendorInvoiceNumber || 'Not entered'}</p></div>
                      <div><span className="text-[var(--color-text-muted)]">Bill Date</span><p className="font-bold text-[var(--color-text-strong)]">{billForm.date}</p></div>
                      <div><span className="text-[var(--color-text-muted)]">Due Date</span><p className="font-bold text-[var(--color-text-strong)]">{billForm.dueDate}</p></div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border)]">
                        <tr>
                          <th className="p-2.5 text-left">#</th>
                          <th className="p-2.5 text-left">Description</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-center">Price</th>
                          <th className="p-2.5 text-center">Tax</th>
                          <th className="p-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {billLines.map((l: any, i: number) => {
                          const qty = parseFloat(String(l.quantity) || '0') || 0;
                          const price = parseFloat(String(l.unitPrice) || '0') || 0;
                          const tax = parseFloat(String(l.taxAmount) || '0') || 0;
                          return (
                            <tr key={i}>
                              <td className="p-2.5 text-[var(--color-text-muted)]">{i + 1}</td>
                              <td className="p-2.5 font-medium text-[var(--color-text-strong)]">{l.description || '-'}</td>
                              <td className="p-2.5 text-center font-mono">{qty}</td>
                              <td className="p-2.5 text-center font-mono">{money(price, billForm.currencyCode)}</td>
                              <td className="p-2.5 text-center font-mono">{money(tax, billForm.currencyCode)}</td>
                              <td className="p-2.5 text-right font-mono font-bold">{money(qty * price + tax, billForm.currencyCode)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-[var(--color-text-muted)]">Subtotal</span><span className="font-mono font-bold">{money(billSubtotal, billForm.currencyCode)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-rose-500 font-semibold">Tax</span><span className="font-mono font-bold text-rose-600">{money(billTax, billForm.currencyCode)}</span></div>
                    <div className="flex justify-between text-sm pt-2 border-t border-[var(--color-border)]"><span className="font-bold">Grand Total</span><span className="font-mono font-bold text-emerald-600 text-lg">{money(billTotal, billForm.currencyCode)}</span></div>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--color-surface-muted)]/30 border border-[var(--color-border)]">
                    <p className="text-xs font-bold text-[var(--color-text-strong)] mb-1">Notes</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{billForm.notes || 'No notes added.'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <div className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{modalTab === 'preview' ? 'Ready to post' : 'Draft auto-saved'}</div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowBillModal(false)} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors">Cancel</button>
                {modalTab !== 'preview' && (
                  <button type="button" onClick={() => { if (modalTab === 'details') { if (!billForm.vendorId) { notify('Select vendor.'); return; } setModalTab('lines'); } else { setModalTab('preview'); } }} className="h-9 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold shadow-lg shadow-amber-500/25 flex items-center gap-1.5">
                    {modalTab === 'details' ? 'Next: Line Items' : 'Preview'} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {modalTab === 'preview' && (
                  <button type="button" onClick={saveBill} className="h-9 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> {entryMode === 'direct' ? 'Post Direct AP Liability' : 'Save & Validate Match'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-Way Match Modal */}
      {matchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setMatchModal(null)}>
          <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${matchModal.isMatched ? 'from-emerald-500 to-green-600' : 'from-rose-500 to-red-600'} flex items-center justify-center text-white shadow-sm`}>
                  {matchModal.isMatched ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--color-text-strong)]">3-Way Match Audit</h2>
                  <p className="text-xs text-[var(--color-text-muted)]">PO #{matchModal.purchaseOrderNumber}</p>
                </div>
              </div>
              <button onClick={() => setMatchModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              <div className={`p-4 rounded-xl border ${matchModal.isMatched ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[var(--color-text-strong)]">{matchModal.status}</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">{matchModal.details}</p>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-[var(--color-border)] text-xs">
                  <div><span className="text-[var(--color-text-muted)]">Ordered</span><p className="font-bold font-mono text-[var(--color-text-strong)]">{money(matchModal.orderedAmount)}</p></div>
                  <div><span className="text-[var(--color-text-muted)]">Received</span><p className="font-bold font-mono text-[var(--color-text-strong)]">{money(matchModal.receivedAmount)}</p></div>
                  <div><span className="text-[var(--color-text-muted)]">Billed</span><p className="font-bold font-mono text-[var(--color-text-strong)]">{money(matchModal.billedAmount)}</p></div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end">
              <button onClick={() => setMatchModal(null)} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
