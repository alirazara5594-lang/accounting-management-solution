import { useState, useEffect, useMemo } from 'react';
import { useManufacturingStore, useProductsStore, useAssetsInventoryStore } from './stores';
import { ManufacturingWorkspace } from './ManufacturingWorkspace';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { assetsInventoryApi } from './api/modules/assetsInventory.api';
import type { FixedAsset } from './api/modules/assetsInventory.api';
import {
  Factory, CheckCircle2, Layers, Gauge, Cpu,
  Activity, ClipboardList, Wallet, Hammer
} from 'lucide-react';
import { money } from './lib/currency';

const FACTORY_WORK_CENTERS = [
  'CNC Machining Center',
  'Assembly & Packaging Line 1',
  'Assembly & Packaging Line 2',
  'Cutting & Stamping Workshop',
  'Surface Finishing & Coating',
  'Quality Testing & Inspection Lab',
];

function useMfgData(activeEntityId?: string) {
  const store = useManufacturingStore();
  const productsStore = useProductsStore();
  const assetsStore = useAssetsInventoryStore();
  const [machines, setMachines] = useState<FixedAsset[]>([]);

  useEffect(() => {
    store.fetchAllManufacturing(activeEntityId || '');
    productsStore.fetchProducts();
    if (activeEntityId) {
      assetsStore.fetchWarehouses(activeEntityId);
      assetsInventoryApi.getFixedAssets(activeEntityId).then(data => {
        const factoryEquip = (data || []).filter(a =>
          a.category?.includes('Plant') ||
          a.category?.includes('Machinery') ||
          a.category?.includes('Equipment') ||
          a.costAllocation === 'ManufacturingOverhead'
        );
        setMachines(factoryEquip);
      }).catch(() => {});
    }
  }, [activeEntityId]);

  return {
    ...store,
    products: productsStore.products,
    warehouses: assetsStore.warehouses,
    machines
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MANUFACTURING SUMMARY VIEW (Executive Production Command Center)
// ─────────────────────────────────────────────────────────────────────────────
export function ManufacturingSummaryView({ activeEntityId }: { activeEntityId?: string }) {
  const { boms, workOrders, machines } = useMfgData(activeEntityId);

  const inProgress = useMemo(() => workOrders.filter(w => String(w.status) === 'InProgress' || String(w.status) === '2'), [workOrders]);
  const completed = useMemo(() => workOrders.filter(w => String(w.status) === 'Completed' || String(w.status) === '3'), [workOrders]);
  const wipValue = useMemo(() => inProgress.reduce((s, w) => s + (Number(w.totalMaterialCost) + Number(w.directLaborCost) + Number(w.overheadCost)), 0), [inProgress]);
  const totalMaterialCost = useMemo(() => workOrders.reduce((s, w) => s + (Number(w.totalMaterialCost) || 0), 0), [workOrders]);
  const totalLaborCost = useMemo(() => workOrders.reduce((s, w) => s + (Number(w.directLaborCost) || 0), 0), [workOrders]);
  const totalMOHCost = useMemo(() => workOrders.reduce((s, w) => s + (Number(w.overheadCost) || 0), 0), [workOrders]);
  const totalFinishedCapitalized = useMemo(() => completed.reduce((s, w) => s + (Number(w.totalCost) || 0), 0), [completed]);
  const totalUnitsProduced = useMemo(() => workOrders.reduce((s, w) => s + (Number(w.quantityProduced) || 0), 0), [workOrders]);

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6 animate-in fade-in">
      {/* Signature Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-amber-500/[0.04] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-60 h-60 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[4px] rotate-45 rounded-[14px] shadow-xl bg-gradient-to-br from-orange-500 to-amber-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Factory className="w-7 h-7 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Manufacturing &amp; Production</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" /> Live Ledger
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-semibold">
                  IAS 2 / IAS 16
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Executive production metrics, shop floor WIP valuation, BOM recipes, and full IAS 2 absorption costing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <KpiGrid cols={4}>
        <KpiCard icon={ClipboardList} label="BOM Studio Recipes" value={boms.length} desc="Active Production Formulas" tone="teal" />
        <KpiCard icon={Activity} label="Active WIP Work Orders" value={inProgress.length} desc={`${money(wipValue)} in Production`} tone="amber" />
        <KpiCard icon={Cpu} label="Plant Machines Engaged" value={machines.length} desc="Fixed Assets Connected" tone="purple" />
        <KpiCard icon={CheckCircle2} label="Completed Runs" value={completed.length} desc={`${money(totalFinishedCapitalized)} Capitalized`} tone="emerald" />
      </KpiGrid>

      {/* Executive Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pipeline & Throughput */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-sm text-[var(--color-text-strong)]">Production Pipeline</h3>
              </div>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">{workOrders.length} Total Orders</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-center">
                <p className="text-xl font-black text-[var(--color-text-strong)]">{inProgress.length}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">In Progress (WIP)</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-center">
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{completed.length}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Completed Runs</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-center">
                <p className="text-xl font-black text-[var(--color-text-strong)]">{boms.reduce((s, b) => s + (b.lines?.length || 0), 0)}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Raw Material Lines</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-center">
                <p className="text-xl font-black text-[var(--color-text-strong)]">{totalUnitsProduced}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Units Finished</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
            <span>Overall Shopfloor Capacity</span>
            <span className="font-semibold text-emerald-600">Optimal (88%)</span>
          </div>
        </div>

        {/* IAS 2 Absorption Cost Structure */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-[var(--color-text-strong)]">IAS 2 Absorption Costing</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-teal-50 dark:bg-teal-950 text-teal-700 rounded-md font-semibold">Inventory Valuation</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface-muted)] text-xs">
                <span className="text-[var(--color-text-muted)] flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-blue-500" /> Direct Materials Issued</span>
                <span className="font-mono font-bold text-[var(--color-text-strong)]">{money(totalMaterialCost)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface-muted)] text-xs">
                <span className="text-[var(--color-text-muted)] flex items-center gap-1.5"><Hammer className="w-3.5 h-3.5 text-amber-500" /> Direct Labor Applied</span>
                <span className="font-mono font-bold text-[var(--color-text-strong)]">{money(totalLaborCost)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface-muted)] text-xs">
                <span className="text-[var(--color-text-muted)] flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-purple-500" /> Manufacturing Overhead (MOH)</span>
                <span className="font-mono font-bold text-[var(--color-text-strong)]">{money(totalMOHCost)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--color-text-muted)]">Active Work-in-Progress (WIP)</span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">{money(wipValue)}</span>
          </div>
        </div>

        {/* Work Centers & Plant Status */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-[var(--color-text-strong)]">Work Centers &amp; Plant Assets</h3>
              </div>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">{FACTORY_WORK_CENTERS.length} Stations</span>
            </div>
            <div className="space-y-2">
              {FACTORY_WORK_CENTERS.slice(0, 3).map((center, idx) => {
                const count = workOrders.filter(w => w.workCenterName === center && (String(w.status) === 'InProgress' || String(w.status) === '2')).length;
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-[var(--color-border)] text-xs">
                    <span className="font-medium text-[var(--color-text-strong)]">{center}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${count > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {count > 0 ? `${count} Active Jobs` : 'Available'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
            <span>Plant Machines Linked (IAS 16)</span>
            <span className="font-mono font-bold text-[var(--color-text-strong)]">{machines.length} Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DEDICATED MANUFACTURING WORKSPACE (Live Shop Floor Command Center)
// ─────────────────────────────────────────────────────────────────────────────
export function ManufacturingWorkspaceView({ activeEntityId, entities }: { activeEntityId?: string; entities?: any[] }) {
  return <ManufacturingWorkspace key="mfg-workspace-shopfloor" activeEntityId={activeEntityId || ''} entities={entities} initialTab="shopfloor" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DEDICATED BILL OF MATERIALS VIEW (BOM Studio & Recipe Designer)
// ─────────────────────────────────────────────────────────────────────────────
export function BillOfMaterialsView({ activeEntityId, entities }: { activeEntityId?: string; entities?: any[] }) {
  return <ManufacturingWorkspace key="mfg-view-boms" activeEntityId={activeEntityId || ''} entities={entities} initialTab="boms" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DEDICATED WORK ORDERS VIEW (Production Scheduling & Release Register)
// ─────────────────────────────────────────────────────────────────────────────
export function WorkOrdersMfgView({ activeEntityId, entities }: { activeEntityId?: string; entities?: any[] }) {
  return <ManufacturingWorkspace key="mfg-view-orders" activeEntityId={activeEntityId || ''} entities={entities} initialTab="orders" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DEDICATED JOB COSTING VIEW (IAS 2 Full Absorption Ledger)
// ─────────────────────────────────────────────────────────────────────────────
export function JobCostingView({ activeEntityId, entities }: { activeEntityId?: string; entities?: any[] }) {
  return <ManufacturingWorkspace key="mfg-view-costing" activeEntityId={activeEntityId || ''} entities={entities} initialTab="costing" />;
}