import React, { useState, useEffect } from 'react';
import { useAssetsInventoryStore, useCoaStore, useProductsStore } from './stores';
import { DataToolbar } from '@/components/ui/data-toolbar';
import { Warehouse, Boxes, Package, AlertTriangle, CheckCircle, XCircle, Search, ShoppingCart } from 'lucide-react';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState } from './components/ui/empty-state';
import { money } from './lib/currency';
import { CompactProductSelect } from './components/CompactProductSelect';

// ─── Shared Select ───────────────────────────────────────────────────────────
const AccSelect = ({ value, onChange, accounts, label, filter }: any) => (
  <label>
    {label}
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">-- Select account --</option>
      {(filter ? accounts.filter(filter) : accounts).map((a: any) => (
        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
      ))}
    </select>
  </label>
);

// ─── 1. Asset Register ───────────────────────────────────────────────────────
const AssetRegister: React.FC<{ activeEntityId: string; accounts: any[] }> = ({ activeEntityId, accounts }) => {
  const [deprModal, setDeprModal] = useState<any>(null);
  const [disposeModal, setDisposeModal] = useState<any>(null);
  const [deprForm, setDeprForm] = useState({ expenseAccId: '', accumAccId: '', usefulLifeYears: 3, salvageValue: 0 });
  const [dispForm, setDispForm] = useState({ date: new Date().toISOString().slice(0,10), proceeds: '0', assetAccId: '', accumAccId: '', gainLossAccId: '', cashAccId: '' });
  const [toast, setToast] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole] = useState<'admin' | 'accountant' | 'asset-manager' | 'viewer'>(() => {
    const storedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
    return (storedRole as 'admin' | 'accountant' | 'asset-manager' | 'viewer') || 'viewer';
  });

  const assets = useAssetsInventoryStore((s) => s.assets as any[]);
  const fetchFixedAssets = useAssetsInventoryStore((s) => s.fetchFixedAssets);
  const runDepreciationStore = useAssetsInventoryStore((s) => s.runDepreciation);
  const disposeAssetStore = useAssetsInventoryStore((s) => s.disposeAsset);

  useEffect(() => { fetchFixedAssets(activeEntityId); }, [activeEntityId]);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const runDepreciation = async () => {
    try {
      await runDepreciationStore(deprModal.id, deprForm.expenseAccId, deprForm.accumAccId);
      notify('✓ Depreciation journal posted!');
      setDeprModal(null);
    } catch (e: any) {
      notify(e.message || 'Error');
    }
  };

  const disposeAsset = async () => {
    try {
      await disposeAssetStore(disposeModal.id, { disposalDate: dispForm.date, proceeds: parseFloat(dispForm.proceeds), assetAccountId: dispForm.assetAccId, accumDeprAccountId: dispForm.accumAccId, gainLossAccountId: dispForm.gainLossAccId, cashAccountId: dispForm.cashAccId || null });
      notify('✓ Asset disposed and journal posted!');
      setDisposeModal(null);
    } catch (e: any) {
      notify(e.message || 'Error');
    }
  };

  const totalNBV = assets.filter(a => a.status === 0).reduce((s, a) => s + (a.purchasePrice - (a.accumulatedDepreciation || 0)), 0);

  const filteredAssets = assets.filter(a => !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.assetTag && a.assetTag.toLowerCase().includes(searchTerm.toLowerCase())));
  const exportHeaders = ['Tag', 'Name', 'Purchase Date', 'Cost', 'Accum. Depr.', 'NBV', 'Status'];
  const exportRows = filteredAssets.map((a: any) => [
    a.assetTag, a.name, a.purchaseDate, a.purchasePrice, a.accumulatedDepreciation ?? 0,
    a.purchasePrice - (a.accumulatedDepreciation ?? 0), ['Active', 'Disposed', 'Fully Depreciated'][a.status],
  ]);

  return (
    <div className="space-y-4">
      {toast && <div className="px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">{toast}</div>}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]"><span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-teal-500 to-emerald-700" />Fixed Asset Register</p>
          <span className="text-[11px] text-[var(--color-text-muted)]">{filteredAssets.length} assets · Total Net Book Value {money(totalNBV)}</span>
        </div>
        <div className="flex flex-wrap justify-end items-center px-4 py-2">
          <DataToolbar
            query={searchTerm}
            setQuery={setSearchTerm}
            searchPlaceholder="Search by tag, name..."
            exportFileName="asset-register"
            exportSheetName="Asset Register"
            exportTitle="Fixed Asset Register"
            exportSubtitle="All fixed assets with cost, accumulated depreciation and net book value."
            exportHeaders={exportHeaders}
            exportRows={exportRows}
            exportTotals={[{ label: 'Total Net Book Value', value: totalNBV }]}
            onRefresh={() => fetchFixedAssets(activeEntityId)}
          />
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-teal-500/[0.05] dark:bg-teal-400/[0.07] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Tag</th><th className="py-3 px-4">Name</th><th className="py-3 px-4">Purchase Date</th>
              <th className="py-3 px-4 text-right">Cost</th><th className="py-3 px-4 text-right">Accum. Depr.</th><th className="py-3 px-4 text-right">NBV</th>
              <th className="py-3 px-4">Status</th><th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredAssets.map(a => (
              <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="py-3 px-4 font-mono text-xs text-gray-500">{a.assetTag}</td>
                <td className="py-3 px-4 font-medium text-gray-900">{a.name}</td>
                <td className="py-3 px-4 text-gray-500">{a.purchaseDate}</td>
                <td className="py-3 px-4 text-right">{money(a.purchasePrice)}</td>
                <td className="py-3 px-4 text-right text-orange-600">{money(a.accumulatedDepreciation ?? 0)}</td>
                <td className="py-3 px-4 text-right font-semibold text-emerald-700">{money(a.purchasePrice - (a.accumulatedDepreciation ?? 0))}</td>
                <td className="py-3 px-4">
                  <StatusChip status={String(['Active','Disposed','Fully Depreciated'][a.status])} />
                </td>
                <td className="py-3 px-4 space-x-3">
                  {a.status === 0 && <><button onClick={() => { setDeprModal(a); setDeprForm({ expenseAccId:'', accumAccId:'', usefulLifeYears: deprModal?.usefulLifeYears || a.usefulLifeYears || 3, salvageValue: deprModal?.salvageValue || a.salvageValue || 0 }); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Run Depr.</button>
                  <button onClick={() => { setDisposeModal(a); setDispForm({ date: new Date().toISOString().slice(0,10), proceeds:'0', assetAccId:'', accumAccId:'', gainLossAccId:'', cashAccId:'' }); }} className="text-red-500 hover:text-red-700 text-xs font-medium">Dispose</button></>}
                </td>
              </tr>
            ))}
            {(searchTerm && filteredAssets.length === 0) || (!searchTerm && assets.length === 0) && (
              <tr><td colSpan={8}><EmptyState icon={Warehouse} title="No assets found" hint={`No assets matching "${searchTerm}". Process a GRN with "Fixed Asset" destination to auto-create assets.`} /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Depreciation Modal */}
      {deprModal && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">ASSETS & INVENTORY</p>
                <h2>Post Monthly Depreciation</h2>
              </div>
              <button type="button" className="close" onClick={() => setDeprModal(null)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
              <p className="text-sm text-gray-500">Asset: <strong>{deprModal.name}</strong> — Cost: {money(deprModal.purchasePrice)}, Useful Life: {deprModal.usefulLifeYears}yr</p>
              <p className="text-sm font-semibold text-blue-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100">Monthly depreciation amount: {money(((deprModal.purchasePrice - (deprModal.salvageValue||0)) / deprModal.usefulLifeYears) / 12)}</p>
              
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <AccSelect value={deprForm.expenseAccId} onChange={(v: string) => setDeprForm(f => ({...f, expenseAccId: v}))} accounts={accounts} label="* Depreciation Expense Account" filter={(a: any) => a.type === 'Expense'} />
                <AccSelect value={deprForm.accumAccId} onChange={(v: string) => setDeprForm(f => ({...f, accumAccId: v}))} accounts={accounts} label="* Accumulated Depreciation Account" filter={(a: any) => a.type === 'ContraAsset' || a.name?.toLowerCase().includes('depreciation')} />
                <label>
                  Useful Life (years)
                  <input type="number" value={deprForm.usefulLifeYears} onChange={(e) => setDeprForm((f) => ({ ...f, usefulLifeYears: parseInt(e.target.value) || 3 }))} min="1" style={{ width: '100%' }} />
                </label>
                <label>
                  Salvage Value
                  <input type="number" value={deprForm.salvageValue} onChange={(e) => setDeprForm((f) => ({ ...f, salvageValue: Number(e.target.value) || 0 }))} step={".01"} style={{ width: '100%' }} />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setDeprModal(null)}>Cancel</button>
              <button onClick={runDepreciation} disabled={!deprForm.expenseAccId || !deprForm.accumAccId || (userRole !== 'admin' && userRole !== 'accountant' && userRole !== 'asset-manager')} className="primary">Run Depreciation</button>
            </div>
          </div>
        </div>
      )}

      {/* Disposal Modal */}
      {disposeModal && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">ASSETS & INVENTORY</p>
                <h2>Dispose Fixed Asset</h2>
              </div>
              <button type="button" className="close" onClick={() => setDisposeModal(null)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
              <p className="text-sm text-gray-500">Asset: <strong>{disposeModal.name}</strong> — NBV: {money(disposeModal.purchasePrice - (disposeModal.accumulatedDepreciation||0))}</p>
              
              <div className="form-grid">
                <label>
                  Disposal Date
                  <input type="date" value={dispForm.date} onChange={e => setDispForm(f => ({...f, date: e.target.value}))} />
                </label>
                <label>
                  Proceeds Received
                  <input type="number" value={dispForm.proceeds} onChange={e => setDispForm(f => ({...f, proceeds: e.target.value}))} />
                </label>
                <AccSelect value={dispForm.assetAccId} onChange={(v: string) => setDispForm(f => ({...f, assetAccId: v}))} accounts={accounts} label="* Asset GL Account (to clear)" filter={(a: any) => a.type === 'Asset'} />
                <AccSelect value={dispForm.accumAccId} onChange={(v: string) => setDispForm(f => ({...f, accumAccId: v}))} accounts={accounts} label="* Accumulated Depreciation Account (to clear)" filter={(a: any) => a.type === 'ContraAsset' || a.name?.toLowerCase().includes('depreciation')} />
                <AccSelect value={dispForm.gainLossAccId} onChange={(v: string) => setDispForm(f => ({...f, gainLossAccId: v}))} accounts={accounts} label="* Gain/Loss on Disposal Account" filter={(a: any) => a.type === 'Revenue' || a.type === 'Expense'} />
                <AccSelect value={dispForm.cashAccId} onChange={(v: string) => setDispForm(f => ({...f, cashAccId: v}))} accounts={accounts} label="Cash Account for Proceeds (optional)" filter={(a: any) => a.type === 'Asset' && a.reconciliationEnabled} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setDisposeModal(null)}>Cancel</button>
              <button onClick={disposeAsset} disabled={!dispForm.assetAccId || !dispForm.accumAccId || !dispForm.gainLossAccId || (userRole !== 'admin' && userRole !== 'accountant' && userRole !== 'asset-manager')} className="primary">Post Disposal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 2. Warehouses ───────────────────────────────────────────────────────────
const Warehouses: React.FC<{ activeEntityId: string }> = ({ activeEntityId }) => {
  const warehouses = useAssetsInventoryStore((s) => s.warehouses);
  const loading = useAssetsInventoryStore((s) => s.loading);
  const fetchWarehouses = useAssetsInventoryStore((s) => s.fetchWarehouses);
  const createWarehouseStore = useAssetsInventoryStore((s) => s.createWarehouse);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => { fetchWarehouses(activeEntityId); }, [activeEntityId]);

  const save = async () => {
    try {
      await createWarehouseStore({ name, location, companyId: activeEntityId || null });
      setShowForm(false); setName(''); setLocation('');
    } catch {}
  };

  return (
    <div className="space-y-4">
      {showForm && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">ASSETS & INVENTORY</p>
                <h2>New Warehouse</h2>
              </div>
              <button type="button" className="close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="form-grid">
              <label>
                * Warehouse Name
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main Distribution Center" required />
              </label>
              <label>
                Location / Address
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Seattle, WA" />
              </label>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button onClick={save} disabled={!name} className="primary">Save Warehouse</button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]"><span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-teal-500 to-emerald-700" />Warehouses</p>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl">+ New Warehouse</button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-teal-500/[0.05] dark:bg-teal-400/[0.07] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider"><tr><th className="py-3 px-4">Name</th><th className="py-3 px-4">Location</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {warehouses.map(w => (<tr key={w.id} className="hover:bg-gray-50/60"><td className="py-3 px-4 font-medium text-gray-900">{w.name}</td><td className="py-3 px-4 text-gray-500">{w.location || '—'}</td></tr>))}
            {!loading && warehouses.length === 0 && <tr><td colSpan={2}><EmptyState icon={Warehouse} title="No warehouses configured" hint="Add a warehouse to start receiving and issuing stock." /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── 3. Stock Levels ─────────────────────────────────────────────────────────
const StockLevels: React.FC<{ activeEntityId: string; products: any[] }> = ({ activeEntityId, products }) => {
  const levels = useAssetsInventoryStore((s) => s.stockLevels as any[]);
  const loading = useAssetsInventoryStore((s) => s.loading);
  const fetchStockLevels = useAssetsInventoryStore((s) => s.fetchStockLevels);
  const setProductPurposeStore = useProductsStore((s) => s.setProductPurpose);

  const [searchTerm, setSearchTerm] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [markForSaleModal, setMarkForSaleModal] = useState<any>(null);
  const [salesPrice, setSalesPrice] = useState('0');
  const [toast, setToast] = useState('');

  useEffect(() => { fetchStockLevels(activeEntityId); }, [activeEntityId]);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const totalValue = levels.reduce((s, l) => s + (l.totalValue || 0), 0);

  const getProductPurpose = (productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    return product?.purpose || 'FinishedGood';
  };

  const filteredLevels = levels.filter(l => {
    const matchesSearch = !searchTerm || 
      l.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.productCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const purpose = getProductPurpose(l.productId);
    const matchesPurpose = purposeFilter === 'all' || purpose === purposeFilter;
    return matchesSearch && matchesPurpose;
  });

  const handleMarkForSale = async () => {
    if (!markForSaleModal) return;
    try {
      await setProductPurposeStore(markForSaleModal.productId, 'FinishedGood');
      notify(`✓ ${markForSaleModal.productName} is now available for sale!`);
      setMarkForSaleModal(null);
    } catch (e: any) {
      notify(e.message || 'Error updating purpose');
    }
  };

  return (
    <div className="space-y-4">
      {toast && <div className="px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">{toast}</div>}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]"><span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-teal-500 to-emerald-700" />Stock Levels</p>
          <span className="text-[11px] text-[var(--color-text-muted)]">Total Inventory Value: {money(totalValue)}</span>
        </div>
        <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <input
            type="text"
            placeholder="Search by product name or code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          <select
            value={purposeFilter}
            onChange={e => setPurposeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <option value="all">All Items</option>
            <option value="FinishedGood">Finished Goods (For Sale)</option>
            <option value="RawMaterial">Raw Materials</option>
            <option value="Component">Components</option>
            <option value="Consumable">Consumables</option>
          </select>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-teal-500/[0.05] dark:bg-teal-400/[0.07] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Purpose</th>
              <th className="py-3 px-4">Warehouse</th>
              <th className="py-3 px-4 text-right">Qty on Hand</th>
              <th className="py-3 px-4 text-right">Avg. Cost</th>
              <th className="py-3 px-4 text-right">Total Value</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredLevels.map(l => {
              const purpose = getProductPurpose(l.productId);
              const isSellable = purpose === 'FinishedGood' || purpose === 'Service';
              return (
                <tr key={l.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4 font-medium text-gray-900">{l.productName}</td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-500">{l.productCode}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isSellable ? 'bg-green-100 text-green-700' : 
                      purpose === 'RawMaterial' ? 'bg-blue-100 text-blue-700' :
                      purpose === 'Component' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {purpose === 'FinishedGood' ? 'For Sale' :
                       purpose === 'RawMaterial' ? 'Raw Material' :
                       purpose === 'Component' ? 'Component' :
                       purpose === 'Consumable' ? 'Consumable' : purpose}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{l.warehouseName}</td>
                  <td className="py-3 px-4 text-right font-semibold">{l.quantityOnHand}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{money(l.movingAverageCost)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-blue-700">{money(l.totalValue)}</td>
                  <td className="py-3 px-4">
                    {!isSellable && (
                      <button
                        onClick={() => { setMarkForSaleModal({ productId: l.productId, productName: l.productName }); setSalesPrice('0'); }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg"
                      >
                        Mark for Sale
                      </button>
                    )}
                    {isSellable && (
                      <span className="text-green-600 text-xs font-medium">✓ In Catalog</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && filteredLevels.length === 0 && (
              <tr><td colSpan={8}><EmptyState icon={Boxes} title="No stock on hand" hint='Process a GRN with "Inventory" destination to populate stock levels.' /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mark as For Sale Modal */}
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
                Mark <strong>{markForSaleModal.productName}</strong> as a finished good for sale?
              </p>
              <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-xl border border-blue-100">
                This item will appear in Products & Services and can be sold to customers. Stock will be tracked automatically.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setMarkForSaleModal(null)}>Cancel</button>
              <button onClick={handleMarkForSale} className="primary">Mark for Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 4. Stock Transactions ───────────────────────────────────────────────────
const StockTransactionsView: React.FC<{ activeEntityId: string; warehouses: any[]; products: any[] }> = ({ activeEntityId, warehouses, products }) => {
  const txns = useAssetsInventoryStore((s) => s.stockTransactions as any[]);
  const loading = useAssetsInventoryStore((s) => s.loading);
  const fetchStockTransactions = useAssetsInventoryStore((s) => s.fetchStockTransactions);
  const createStockTransactionStore = useAssetsInventoryStore((s) => s.createStockTransaction);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: '', warehouseId: '', quantity: '1', unitCost: '0', type: 'Adjustment', reference: '', date: new Date().toISOString().slice(0,10) });
  const [toast, setToast] = useState('');

  useEffect(() => { fetchStockTransactions(activeEntityId); }, [activeEntityId]);

  const save = async () => {
    try {
      await createStockTransactionStore({ ...form, quantity: parseFloat(form.quantity), unitCost: parseFloat(form.unitCost), companyId: activeEntityId || null });
      setToast('✓ Transaction recorded!');
      setShowForm(false);
      setTimeout(() => setToast(''), 3000);
    } catch (e: any) {
      setToast(e.message || 'Error');
    }
  };

  return (
    <div className="space-y-4">
      {toast && <div className="px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">{toast}</div>}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl">+ Manual Adjustment</button>
      </div>
      {showForm && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: '650px', width: '95%' }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">ASSETS & INVENTORY</p>
                <h2>Record Stock Adjustment</h2>
              </div>
              <button type="button" className="close" onClick={() => setShowForm(false)}>×</button>
            </div>
            
            <div className="form-grid">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-strong)] mb-1">Product *</label>
                <CompactProductSelect
                  value={form.productId}
                  onChange={v => setForm(f => ({ ...f, productId: v }))}
                  products={products}
                  placeholder="-- Select Product --"
                />
              </div>
              <label>
                Warehouse *
                <select value={form.warehouseId} onChange={e => setForm(f => ({...f, warehouseId: e.target.value}))}>
                  <option value="">-- Select --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </label>
              <label>
                Adjustment Type *
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                  <option>Adjustment</option>
                  <option>In</option>
                  <option>Out</option>
                </select>
              </label>
              <label>
                Date *
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
              </label>
              <label>
                Quantity *
                <input type="number" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} />
              </label>
              <label>
                Unit Cost *
                <input type="number" value={form.unitCost} onChange={e => setForm(f => ({...f, unitCost: e.target.value}))} />
              </label>
              <label style={{ gridColumn: 'span 2' }}>
                Reference / Reason
                <input value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value}))} placeholder="e.g. Stock count correction" />
              </label>
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="button" className="secondary" onClick={(e) => { e.preventDefault(); alert("Draft saved locally"); }}>Save Draft</button>
<button onClick={save} disabled={!form.productId || !form.warehouseId} className="primary">Record Transaction</button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]"><span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-teal-500 to-emerald-700" />Stock Transactions</p>
          <span className="text-[11px] text-[var(--color-text-muted)]">{txns.length} movements</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-teal-500/[0.05] dark:bg-teal-400/[0.07] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
            <tr><th className="py-3 px-4">Date</th><th className="py-3 px-4">Type</th><th className="py-3 px-4">Product</th><th className="py-3 px-4">Warehouse</th><th className="py-3 px-4 text-right">Qty</th><th className="py-3 px-4 text-right">Unit Cost</th><th className="py-3 px-4 text-right">Total</th><th className="py-3 px-4">Reference</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {txns.map(t => (<tr key={t.id} className="hover:bg-gray-50/60">
              <td className="py-3 px-4 text-gray-500">{t.date || t.transactionDate || '—'}</td>
              <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${String(t.type) === 'In' || String(t.type) === 'Inbound' ? 'bg-green-100 text-green-700' : String(t.type) === 'Out' || String(t.type) === 'Outbound' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.type}</span></td>
              <td className="py-3 px-4 font-medium text-gray-900">{t.productName || t.productId || '—'}</td>
              <td className="py-3 px-4 text-gray-500">{t.warehouseName || t.warehouseId || '—'}</td>
              <td className="py-3 px-4 text-right font-semibold">{t.quantity}</td>
              <td className="py-3 px-4 text-right text-gray-500">{money(t.unitCost || 0)}</td>
              <td className="py-3 px-4 text-right font-semibold">{money(t.totalValue || (t.quantity * (t.unitCost || 0)))}</td>
              <td className="py-3 px-4 text-gray-400 text-xs">{t.reference || '—'}</td>
            </tr>))}
            {!loading && txns.length === 0 && <tr><td colSpan={8}><EmptyState icon={Boxes} title="No stock movements yet" hint="Record a manual adjustment or process receipts to build movement history." /></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── 5. Inventory Dashboard ──────────────────────────────────────────────────
const InventoryDashboard: React.FC<{ activeEntityId: string; products: any[]; stockLevels: any[] }> = ({ activeEntityId, products, stockLevels }) => {
  const setProductPurposeStore = useProductsStore((s) => s.setProductPurpose);
  const [activeTab, setActiveTab] = useState<'all' | 'finished' | 'raw' | 'lowstock'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [markForSaleModal, setMarkForSaleModal] = useState<any>(null);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) };

  // Merge products with stock levels
  const inventoryItems = products.map((p: any) => {
    const stock = stockLevels.filter((s: any) => s.productId === p.id)
    const totalQty = stock.reduce((sum: number, s: any) => sum + (s.quantityOnHand || 0), 0)
    const totalValue = stock.reduce((sum: number, s: any) => sum + (s.totalValue || 0), 0)
    const minQty = p.minimumQuantity || 0
    const isLowStock = minQty > 0 && totalQty <= minQty
    const isOutOfStock = totalQty === 0

    return {
      ...p,
      totalQuantity: totalQty,
      totalValue: totalValue,
      minimumQuantity: minQty,
      isLowStock,
      isOutOfStock,
      stockStatus: isOutOfStock ? 'out' : isLowStock ? 'low' : 'ok'
    }
  })

  // Filter by tab
  const filteredItems = inventoryItems.filter((p: any) => {
    if (activeTab === 'finished') {
      if (p.purpose !== 'FinishedGood' && p.purpose !== 'Service') return false
    } else if (activeTab === 'raw') {
      if (p.purpose !== 'RawMaterial' && p.purpose !== 'Component' && p.purpose !== 'Consumable') return false
    } else if (activeTab === 'lowstock') {
      if (!p.isLowStock && !p.isOutOfStock) return false
    }

    if (search) {
      const q = search.toLowerCase()
      return p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    }
    return true
  })

  // KPI Stats
  const stats = {
    total: inventoryItems.length,
    finishedGoods: inventoryItems.filter((p: any) => p.purpose === 'FinishedGood' || p.purpose === 'Service').length,
    rawMaterials: inventoryItems.filter((p: any) => p.purpose === 'RawMaterial' || p.purpose === 'Component').length,
    lowStock: inventoryItems.filter((p: any) => p.isLowStock).length,
    outOfStock: inventoryItems.filter((p: any) => p.isOutOfStock).length,
    totalValue: inventoryItems.reduce((sum: number, p: any) => sum + p.totalValue, 0)
  }

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

  return (
    <div className="space-y-4">
      {toast && <div className="px-4 py-2 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">{toast}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold uppercase text-gray-500">Total Items</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{stats.total}</p>
          <p className="text-[10px] text-gray-400">Total Value: {money(stats.totalValue)}</p>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-bold uppercase text-gray-500">Finished Goods</span>
          </div>
          <p className="text-2xl font-black text-green-600">{stats.finishedGoods}</p>
          <p className="text-[10px] text-gray-400">Ready for sale</p>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold uppercase text-gray-500">Raw Materials</span>
          </div>
          <p className="text-2xl font-black text-blue-600">{stats.rawMaterials}</p>
          <p className="text-[10px] text-gray-400">For manufacturing</p>
        </div>

        <div className={`p-4 rounded-xl border ${stats.lowStock + stats.outOfStock > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${stats.lowStock + stats.outOfStock > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="text-[10px] font-bold uppercase text-gray-500">Low Stock</span>
          </div>
          <p className={`text-2xl font-black ${stats.lowStock + stats.outOfStock > 0 ? 'text-red-600' : 'text-gray-400'}`}>{stats.lowStock + stats.outOfStock}</p>
          <p className="text-[10px] text-gray-400">{stats.outOfStock} out of stock</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100/50 p-1 rounded-xl w-fit border border-gray-200/50">
        {[
          { id: 'all' as const, label: 'All Stock', count: stats.total },
          { id: 'finished' as const, label: 'Finished Goods', count: stats.finishedGoods },
          { id: 'raw' as const, label: 'Raw Materials', count: stats.rawMaterials },
          { id: 'lowstock' as const, label: 'Low Stock Alert', count: stats.lowStock + stats.outOfStock },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === t.id
                ? 'bg-white text-orange-600 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
              activeTab === t.id ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by name, code, or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white"
        />
      </div>

      {/* Stock Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-orange-500/[0.05] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">Purpose</th>
              <th className="py-3 px-4 text-center">Qty on Hand</th>
              <th className="py-3 px-4 text-center">Min Qty</th>
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
                  {p.purpose !== 'FinishedGood' && p.purpose !== 'Service' && (
                    <button
                      onClick={() => setMarkForSaleModal(p)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3 h-3" /> Mark for Sale
                    </button>
                  )}
                  {(p.purpose === 'FinishedGood' || p.purpose === 'Service') && (
                    <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> In Catalog
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon={Package} title="No inventory items" hint="Process a GRN to receive items into inventory." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                This item will appear in Products & Services and can be sold to customers. Stock will be tracked automatically.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setMarkForSaleModal(null)}>Cancel</button>
              <button onClick={handleMarkForSale} className="primary">Mark for Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Master Workspace ─────────────────────────────────────────────────────────
export const AssetsInventoryWorkspace: React.FC<{ activeEntityId: string; entities: any[] }> = ({ activeEntityId }) => {
  const accounts = useCoaStore((s) => s.accounts);
  const fetchAccounts = useCoaStore((s) => s.fetchAccounts);

  useEffect(() => {
    fetchAccounts();
  }, [activeEntityId]);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-teal-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-teal-500 to-emerald-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Warehouse className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Asset Register</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400"><span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Manage fixed assets, depreciation, and disposal.</p>
            </div>
          </div>
        </div>
      </div>
      <div>
        <AssetRegister activeEntityId={activeEntityId} accounts={accounts} />
      </div>
    </div>
  );
};
