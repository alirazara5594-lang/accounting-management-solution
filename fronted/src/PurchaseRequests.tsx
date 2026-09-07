import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useProcurementStore, useProductsStore } from './stores';
import { DataToolbar } from '@/components/ui/data-toolbar';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import { StatusChip } from './components/ui/status-chip';
import { CompactProductSelect } from './components/CompactProductSelect';

interface PurchaseRequestLine {
  id?: string;
  productId: string;
  description: string;
  quantity: number;
}

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  requesterName: string;
  date: string;
  status: number; // 0=Draft, 1=Submitted, 2=Approved, 3=Rejected, 4=Ordered
  lines: PurchaseRequestLine[];
}

export const PurchaseRequests: React.FC<{activeEntityId: string, entities: any[], goToPo: () => void, goToRfq: () => void}> = ({activeEntityId, goToPo, goToRfq}) => {
  const requests = useProcurementStore((s) => s.requests as any[]);
  const fetchRequests = useProcurementStore((s) => s.fetchRequests);
  const createPurchaseRequestStore = useProcurementStore((s) => s.createPurchaseRequest);

  const products = useProductsStore((s) => s.products as any[]);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requesterName, setRequesterName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<PurchaseRequestLine[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeEntityId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRequests(activeEntityId),
        fetchProducts(),
      ]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const addLine = () => setLines([...lines, { productId: '', description: '', quantity: 1 }]);

  const updateLine = (index: number, field: keyof PurchaseRequestLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === 'productId') {
      const p = products.find(p => p.id === value);
      if (p) newLines[index].description = p.name;
    }
    setLines(newLines);
  };

  const submitPr = async () => {
    if (!requesterName || lines.length === 0) return alert('Requester Name and at least one line required.');
    try {
      await createPurchaseRequestStore({
        requestNumber: `PR-${Date.now().toString().slice(-6)}`,
        requesterName,
        date,
        lines,
        companyId: activeEntityId || null
      });
      setIsModalOpen(false);
      setRequesterName('');
      setLines([]);
    } catch (e: any) {
      alert(e.message || 'Failed to create PR');
    }
  };

  const approvePr = async (_id: string) => {
    try {
      await useProcurementStore.getState().fetchAllProcurement(activeEntityId);
    } catch (e) {
      console.error(e);
    }
  };

  const convertToPo = (id: string) => {
    localStorage.setItem('draftPrId', id);
    goToPo();
  };

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Request List</h2>
        <div className="flex items-center gap-2">
          <DataToolbar
            exportFileName="purchase-requests"
            exportSheetName="Purchase Requests"
            exportTitle="Purchase Requests"
            exportSubtitle="Internal requisitions from requester through approval to ordering."
            exportHeaders={['Request No.', 'Date', 'Requester', 'Status']}
            exportRows={requests.map((pr: any) => [pr.requestNumber, pr.date, pr.requesterName, ['Draft', 'Submitted', 'Approved', 'Rejected', 'Ordered'][pr.status]])}
            onRefresh={fetchData}
          />
          <button onClick={() => setIsModalOpen(true)} className="h-9 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25">
            + New Request
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-emerald-500/[0.05] dark:bg-emerald-400/[0.07] text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4 font-medium">Request No.</th>
              <th className="py-3 px-4 font-medium">Date</th>
              <th className="py-3 px-4 font-medium">Requester</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {requests.map(pr => (
              <tr key={pr.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-900">{pr.requestNumber}</td>
                <td className="py-3 px-4 text-gray-500">{pr.date}</td>
                <td className="py-3 px-4 text-gray-900">{pr.requesterName}</td>
                <td className="py-3 px-4">
                  <StatusChip
                    status={['draft', 'submitted', 'approved', 'rejected', 'ordered'][pr.status]}
                    label={['Draft', 'Submitted', 'Approved', 'Rejected', 'Ordered'][pr.status]}
                    hex={['#94a3b8', '#f59e0b', '#3b82f6', '#ef4444', '#10b981'][pr.status]}
                  />
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  {pr.status < 2 && (
                    <button onClick={() => approvePr(pr.id)} className="text-blue-600 hover:text-blue-800 font-medium">Approve</button>
                  )}
                  {pr.status === 2 && (
                    <>
                      <button onClick={() => {
                        localStorage.setItem('draftPrIdForRfq', pr.id);
                        goToRfq();
                      }} className="text-purple-600 hover:text-purple-800 font-medium whitespace-nowrap">Create RFQ</button>
                      <button onClick={() => convertToPo(pr.id)} className="text-green-600 hover:text-green-800 font-medium whitespace-nowrap">Convert to PO</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={5}>
                <EmptyState icon={FileText} title="No requests found" hint='Click "+ New Request" to raise an internal purchase requisition.' />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pl-64">
          <div className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h2 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight">New Purchase Request</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] transition-colors">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">Requester Name</label>
                  <input required value={requesterName} onChange={e => setRequesterName(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs outline-none" />
                </div>
              </div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="font-medium">Requested Items</h3>
                <button onClick={addLine} className="text-sm px-3 py-1.5 bg-gray-100 rounded-lg">+ Add Item</button>
              </div>
              {lines.map((line, i) => (
                <div key={i} className="flex gap-4 mb-3 items-center">
                  <div className="flex-1">
                    <CompactProductSelect
                      value={line.productId}
                      onChange={v => updateLine(i, 'productId', v)}
                      products={products}
                      placeholder="Select Product..."
                    />
                  </div>
                  <input type="number" min="1" value={line.quantity} onChange={e => updateLine(i, 'quantity', Number(e.target.value))} className="w-24 border rounded-lg px-3 py-1.5 text-sm text-right h-8" />
                  <button onClick={() => setLines(lines.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">✕</button>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <div></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsModalOpen(false)} className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors">Cancel</button>
                <button onClick={submitPr} className="h-9 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/25">Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
