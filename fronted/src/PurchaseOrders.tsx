import React, { useState, useEffect } from 'react';
import { useProcurementStore, useVendorsStore, useProductsStore, useTaxStore } from './stores';
import { DataToolbar } from '@/components/ui/data-toolbar';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import { StatusChip } from './components/ui/status-chip';
import { formatPONumber } from './lib/invoiceNumbering';
import { Package, Info, X, ShoppingCart, FileText } from 'lucide-react';
import { CompactProductSelect } from './components/CompactProductSelect';
import { CompactSelect } from './components/CompactSelect';

interface TaxRate {
  percentage: number;
}
interface TaxCode {
  id: string;
  code: string;
  name: string;
  rates: TaxRate[];
}

interface Product {
  id: string;
  code: string;
  name: string;
  unitPrice: number;
  taxCodeId?: string;
}

interface Vendor {
  id: string;
  vendorNumber: string;
  name: string;
}

interface PurchaseOrderLine {
  id?: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxCodeId?: string;
  taxAmount: number;
  destination: number; // 0 = Inventory, 1 = FixedAsset, 2 = Expense
  totalAmount?: number;
  receivedQuantity?: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  date: string;
  status: number; // 0=Draft, 1=Issued, 2=PartiallyReceived, 3=Fulfilled
  lines: PurchaseOrderLine[];
}

interface GoodsReceiptNoteLine {
  purchaseOrderLineId: string;
  quantityReceived: number;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  dateReceived: string;
  lines: GoodsReceiptNoteLine[];
  isProcessed: boolean;
}

export const PurchaseOrders: React.FC<{activeEntityId?: string, entities?: any[]}> = ({activeEntityId, entities}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'grns'>('pos');

  const pos = useProcurementStore((s) => s.orders as PurchaseOrder[]);
  const grns = useProcurementStore((s) => s.receipts as any[]);
  const fetchOrders = useProcurementStore((s) => s.fetchOrders);
  const fetchReceipts = useProcurementStore((s) => s.fetchReceipts);
  const createPOStore = useProcurementStore((s) => s.createPurchaseOrder);
  const createGRNStore = useProcurementStore((s) => s.createGoodsReceipt);

  const vendors = useVendorsStore((s) => s.vendors as Vendor[]);
  const fetchVendors = useVendorsStore((s) => s.fetchVendors);

  const products = useProductsStore((s) => s.products as Product[]);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);

  const taxCodes = useTaxStore((s) => s.taxCodes as TaxCode[]);
  const fetchTaxCodes = useTaxStore((s) => s.fetchTaxCodes);

  const [loading, setLoading] = useState(true);
  
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);

  // New PO State
  const [poVendorId, setPoVendorId] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [poLines, setPoLines] = useState<PurchaseOrderLine[]>([]);

  // New GRN State
  const [grnPoId, setGrnPoId] = useState('');
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [grnLines, setGrnLines] = useState<GoodsReceiptNoteLine[]>([]);
  const [selectedPoForGrn, setSelectedPoForGrn] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    fetchData().then(() => {
      const draftPrId = localStorage.getItem('draftPrId');
      if (draftPrId) {
        loadDraftPr(draftPrId);
        localStorage.removeItem('draftPrId');
      }
    });
  }, []);

  const loadDraftPr = async (id: string) => {
    try {
      const prs = await useProcurementStore.getState().fetchRequests(activeEntityId);
      const pr = prs.find((x: any) => x.id === id);
      if (pr && pr.lines) {
        setIsPoModalOpen(true);
        setPoLines(pr.lines.map((l: any) => ({
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: 0,
          taxCodeId: undefined,
          taxAmount: 0,
          destination: 2
        })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOrders(activeEntityId),
        fetchReceipts(activeEntityId),
        fetchVendors(activeEntityId),
        fetchProducts(),
        fetchTaxCodes(),
      ]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getTaxPercentage = (taxCodeId?: string) => {
    if (!taxCodeId) return 0;
    const code = taxCodes.find(c => c.id === taxCodeId);
    if (!code || code.rates.length === 0) return 0;
    return code.rates[code.rates.length - 1].percentage;
  };

  const defaultTaxAuthorityId = React.useMemo(() => {
    return entities?.find((e: any) => e.id === activeEntityId)?.taxAuthorityId || '';
  }, [entities, activeEntityId]);

  const groupedTaxCodes = React.useMemo(() => {
    return {
      default: taxCodes.filter(t => (t as any).taxAuthorityId === defaultTaxAuthorityId),
      other: taxCodes.filter(t => (t as any).taxAuthorityId !== defaultTaxAuthorityId)
    };
  }, [taxCodes, defaultTaxAuthorityId]);

  const addPoLine = () => {
    setPoLines([...poLines, { productId: '', description: '', quantity: 1, unitPrice: 0, taxCodeId: undefined, taxAmount: 0, destination: 2 }]);
  };

  const updatePoLine = (index: number, field: keyof PurchaseOrderLine, value: any) => {
    const newLines = [...poLines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        newLines[index].unitPrice = prod.unitPrice;
        newLines[index].taxCodeId = prod.taxCodeId;
        newLines[index].description = prod.name;
        
        const rate = getTaxPercentage(prod.taxCodeId);
        newLines[index].taxAmount = (newLines[index].quantity * newLines[index].unitPrice * rate) / 100;
      }
    } else if (field === 'quantity' || field === 'unitPrice' || field === 'taxCodeId') {
      const rate = getTaxPercentage(newLines[index].taxCodeId);
      newLines[index].taxAmount = (newLines[index].quantity * newLines[index].unitPrice * rate) / 100;
    }
    
    setPoLines(newLines);
  };

  // Re-calculate prices for PR items when PO is opened
  useEffect(() => {
    if (poLines.length > 0 && products.length > 0 && poLines.some(l => l.unitPrice === 0 && l.productId)) {
      setPoLines(curr => curr.map(l => {
        if (l.unitPrice === 0 && l.productId) {
          const prod = products.find(p => p.id === l.productId);
          if (prod) {
            const rate = getTaxPercentage(prod.taxCodeId);
            return {
              ...l,
              unitPrice: prod.unitPrice,
              taxCodeId: prod.taxCodeId,
              description: l.description || prod.name,
              taxAmount: (l.quantity * prod.unitPrice * rate) / 100
            };
          }
        }
        return l;
      }));
    }
  }, [poLines, products, taxCodes]);

  const submitPo = async () => {
    if (!poVendorId || poLines.length === 0) return alert('Vendor and at least one line required.');
    try {
      await createPOStore({
        vendorId: poVendorId,
        date: poDate,
        lines: poLines,
        companyId: activeEntityId || null
      });
      setIsPoModalOpen(false);
      setPoVendorId('');
      setPoLines([]);
    } catch (e: any) {
      alert(e.message || 'Failed to create PO');
    }
  };

  const handleGrnPoChange = (id: string) => {
    setGrnPoId(id);
    const po = pos.find(p => p.id === id);
    setSelectedPoForGrn(po || null);
    if (po) {
      setGrnLines(po.lines.filter(l => l.receivedQuantity! < l.quantity).map(l => ({
        purchaseOrderLineId: l.id!,
        quantityReceived: l.quantity - l.receivedQuantity!
      })));
    } else {
      setGrnLines([]);
    }
  };

  const updateGrnLine = (id: string, qty: number) => {
    setGrnLines(grnLines.map(l => l.purchaseOrderLineId === id ? { ...l, quantityReceived: qty } : l));
  };

  const submitGrn = async () => {
    if (!grnPoId || grnLines.length === 0) return alert('PO and at least one line required.');
    try {
      await createGRNStore({
        purchaseOrderId: grnPoId,
        dateReceived: grnDate,
        lines: grnLines,
        companyId: activeEntityId || null
      });
      setIsGrnModalOpen(false);
      setGrnPoId('');
      setGrnLines([]);
    } catch (e: any) {
      alert(e.message || 'Failed to create Goods Receipt');
    }
  };

  const getStatusString = (s: number) => ['Draft', 'Issued', 'Partially Rcvd', 'Fulfilled'][s];
  const getDestString = (d: number) => ['Inventory', 'Fixed Asset', 'Expense'][d];

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" /> Purchase Orders & GRN
        </h2>
        <div className="flex items-center gap-1.5 shrink-0">
          <DataToolbar
            exportFileName="purchase-orders-grns"
            exportSheetName="Purchase Orders & GRNs"
            exportTitle="Purchase Orders & Goods Receipts"
            exportSubtitle="Procurement purchase orders and goods receipt notes."
            exportHeaders={['PO Number', 'Date', 'Vendor', 'Total Amount', 'Status']}
            exportRows={pos.map((po: any) => {
              const vendor = vendors.find(v => v.id === po.vendorId);
              const total = po.lines.reduce((s: number, l: any) => s + (l.totalAmount || 0), 0);
              return [po.poNumber, po.date, vendor?.name || 'Unknown', total, getStatusString(po.status)];
            })}
            exportTotals={[{ label: 'Total PO Value', value: pos.reduce((s: number, po: any) => s + po.lines.reduce((a: number, l: any) => a + (l.totalAmount || 0), 0), 0) }]}
            onRefresh={fetchData}
          />
          <button onClick={() => setIsPoModalOpen(true)}
            className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg shrink-0 whitespace-nowrap">
            + New PO
          </button>
          <button onClick={() => setIsGrnModalOpen(true)}
            className="h-8 px-2.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold rounded-lg shrink-0 whitespace-nowrap">
            + GRN
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button onClick={() => setActiveTab('pos')} className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'pos' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'}`}>Purchase Orders</button>
          <button onClick={() => setActiveTab('grns')} className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'grns' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'}`}>Goods Receipts (GRN)</button>
        </div>
        <div className="p-6">
          {activeTab === 'pos' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="pb-3 font-medium">PO Number</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Vendor</th>
                    <th className="pb-3 font-medium text-right">Total Amount</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pos.map((po, idx) => {
                    const vendor = vendors.find(v => v.id === po.vendorId);
                    const total = po.lines.reduce((s, l) => s + (l.totalAmount || 0), 0);
                    return (
                      <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 font-medium text-gray-900 font-mono">{formatPONumber(po.poNumber, idx + 1)}</td>
                        <td className="py-4 text-gray-500">{po.date}</td>
                        <td className="py-4 text-gray-700">{vendor?.name || 'Unknown'}</td>
                        <td className="py-4 text-gray-900 font-medium text-right">${total.toFixed(2)}</td>
                        <td className="py-4 text-center">
                          <StatusChip
                            status={['draft', 'open', 'partial', 'posted'][po.status]}
                            label={getStatusString(po.status)}
                            hex={['#94a3b8', '#3b82f6', '#f59e0b', '#10b981'][po.status]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {pos.length === 0 && (
                    <tr><td colSpan={5}>
                      <EmptyState icon={Package} title="No purchase orders found" hint='Award a vendor quote or click "+ New PO" to raise a purchase order.' />
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'grns' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="pb-3 font-medium">GRN Number</th>
                    <th className="pb-3 font-medium">Date Received</th>
                    <th className="pb-3 font-medium">PO Reference</th>
                    <th className="pb-3 font-medium text-center">Lines Received</th>
                    <th className="pb-3 font-medium text-center">Processed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grns.map(grn => {
                    const po = pos.find(p => p.id === grn.purchaseOrderId);
                    return (
                      <tr key={grn.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 font-medium text-gray-900">{grn.grnNumber}</td>
                        <td className="py-4 text-gray-500">{grn.dateReceived}</td>
                        <td className="py-4 text-blue-600">{po?.poNumber || 'Unknown'}</td>
                        <td className="py-4 text-gray-900 text-center">{grn.lines.length} lines</td>
                        <td className="py-4 text-center">
                          <StatusChip
                            status={grn.isProcessed ? 'posted' : 'pending'}
                            label={grn.isProcessed ? 'Processed to Inventory/Asset' : 'Pending'}
                            hex={grn.isProcessed ? '#10b981' : '#f59e0b'}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {grns.length === 0 && (
                    <tr><td colSpan={5}>
                      <EmptyState icon={FileText} title="No goods receipts found" hint='Click "+ GRN" to receive items against an issued purchase order.' />
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text)]">Create Purchase Order</h2>
              </div>
              <button onClick={() => setIsPoModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">Vendor</label>
                  <CompactSelect
                    value={poVendorId}
                    onChange={v => setPoVendorId(v)}
                    options={vendors.map(v => ({ value: v.id, label: v.name, badge: v.vendorNumber }))}
                    placeholder="Select Vendor..."
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">PO Date</label>
                  <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
              </div>

              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
                <button onClick={addPoLine} className="h-9 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25">
                  + Add Line
                </button>
              </div>

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium w-1/4">Product/Service</th>
                    <th className="pb-2 font-medium w-1/6">Destination</th>
                    <th className="pb-2 font-medium w-1/12 text-right">Qty</th>
                    <th className="pb-2 font-medium w-1/6 text-right">Price</th>
                    <th className="pb-2 font-medium w-1/6 text-right">Tax Code</th>
                    <th className="pb-2 font-medium w-1/6 text-right">Total</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {poLines.map((line, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-2">
                        <CompactProductSelect
                          value={line.productId}
                          onChange={v => updatePoLine(i, 'productId', v)}
                          products={products}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <select value={line.destination} onChange={e => updatePoLine(i, 'destination', parseInt(e.target.value))} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                          <option value={0}>Inventory (Resale)</option>
                          <option value={1}>Fixed Asset (Internal)</option>
                          <option value={2}>Expense</option>
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min="1" value={line.quantity} onChange={e => updatePoLine(i, 'quantity', parseFloat(e.target.value))} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" step="0.01" value={line.unitPrice} onChange={e => updatePoLine(i, 'unitPrice', parseFloat(e.target.value))} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right" />
                      </td>
                      <td className="py-2 pr-2">
                        <select value={line.taxCodeId || ''} onChange={e => updatePoLine(i, 'taxCodeId', e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                          <option value="">No Tax</option>
                          {groupedTaxCodes.default.length > 0 && (
                            <optgroup label="Default Tax Authority">
                              {groupedTaxCodes.default.map(c => <option key={c.id} value={c.id}>{c.code} ({c.rates.length > 0 ? c.rates[c.rates.length - 1].percentage : 0}%)</option>)}
                            </optgroup>
                          )}
                          {groupedTaxCodes.other.length > 0 && (
                            <optgroup label="Other Tax Authorities">
                              {groupedTaxCodes.other.map(c => <option key={c.id} value={c.id}>{c.code} ({c.rates.length > 0 ? c.rates[c.rates.length - 1].percentage : 0}%)</option>)}
                            </optgroup>
                          )}
                        </select>
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900 pr-4">
                        ${((line.quantity * line.unitPrice) + line.taxAmount).toFixed(2)}
                      </td>
                      <td className="py-2 text-right">
                        <button type="button" onClick={() => setPoLines(poLines.filter((_, idx) => idx !== i))} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                  {poLines.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-gray-400">No lines added. Click "+ Add Line" to begin.</td></tr>}
                </tbody>
              </table>

                {poLines.length > 0 && (() => {
                  const subtotal = poLines.reduce((sum, l) => sum + ((l.quantity || 0) * (l.unitPrice || 0)), 0);
                  const taxTotal = poLines.reduce((sum, l) => sum + (l.taxAmount || 0), 0);
                  const grandTotal = subtotal + taxTotal;
                  return (
                    <div className="mt-4 px-4 py-3 bg-[var(--color-surface-muted)] rounded-xl border border-[var(--color-border)]">
                      <div className="flex justify-end gap-10">
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Subtotal</span>
                          <p className="text-sm font-bold text-[var(--color-text)] font-mono mt-0.5">${subtotal.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Tax (VAT/GST/Sales Tax)</span>
                          <p className="text-sm font-bold text-red-500 font-mono mt-0.5">${taxTotal.toFixed(2)}</p>
                        </div>
                        <div className="text-right border-l-2 border-[var(--color-border)] pl-5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Grand Total</span>
                          <p className="text-lg font-extrabold text-emerald-600 font-mono mt-0.5">${grandTotal.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

            </div>
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <button onClick={() => setIsPoModalOpen(false)} className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors">Cancel</button>
              <button onClick={submitPo} className="h-9 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25">Issue Purchase Order</button>
            </div>
          </div>
        </div>
      )}

      {isGrnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text)]">Receive Goods (GRN)</h2>
              </div>
              <button onClick={() => setIsGrnModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 flex gap-3 text-sm text-blue-800">
                <Info className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                <p>Processing a GRN will automatically increase Inventory quantities or create Fixed Assets in the Asset Register, depending on the destination selected during PO creation.</p>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">Purchase Order</label>
                  <CompactSelect
                    value={grnPoId}
                    onChange={v => handleGrnPoChange(v)}
                    options={pos.filter(p => p.status === 1 || p.status === 2).map(p => ({
                      value: p.id,
                      label: `${p.poNumber} (${vendors.find(v => v.id === p.vendorId)?.name || 'Unknown'})`,
                      badge: p.poNumber
                    }))}
                    placeholder="Select PO..."
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">Date Received</label>
                  <input type="date" value={grnDate} onChange={e => setGrnDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" />
                </div>
              </div>

              {selectedPoForGrn && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Items to Receive</h3>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-100">
                        <th className="pb-2 font-medium">Product/Description</th>
                        <th className="pb-2 font-medium">Destination</th>
                        <th className="pb-2 font-medium text-right">Ordered Qty</th>
                        <th className="pb-2 font-medium text-right">Previously Rcvd</th>
                        <th className="pb-2 font-medium text-right w-32">Receiving Now</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedPoForGrn.lines.map(line => {
                        const grnLine = grnLines.find(l => l.purchaseOrderLineId === line.id);
                        if (!grnLine) return null;
                        const p = products.find(prod => prod.id === line.productId);
                        return (
                          <tr key={line.id}>
                            <td className="py-3 pr-2 text-gray-900">{p?.code} - {p?.name}</td>
                            <td className="py-3 pr-2 text-gray-500">{getDestString(line.destination)}</td>
                            <td className="py-3 pr-2 text-right">{line.quantity}</td>
                            <td className="py-3 pr-2 text-right text-gray-500">{line.receivedQuantity || 0}</td>
                            <td className="py-3 text-right">
                              <input 
                                type="number" 
                                min="0" 
                                max={line.quantity - (line.receivedQuantity || 0)} 
                                value={grnLine.quantityReceived} 
                                onChange={e => updateGrnLine(line.id!, parseFloat(e.target.value) || 0)} 
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right focus:bg-white focus:border-blue-500" 
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <button onClick={() => setIsGrnModalOpen(false)} className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors">Cancel</button>
              <button onClick={submitGrn} disabled={!grnPoId} className="h-9 px-5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-bold shadow-lg shadow-green-500/25 disabled:opacity-50">Process Goods Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
