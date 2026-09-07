import React, { useState, useEffect, useMemo } from 'react';
import { useManufacturingStore, useProductsStore, useAssetsInventoryStore } from './stores';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { assetsInventoryApi } from './api/modules/assetsInventory.api';
import type { FixedAsset } from './api/modules/assetsInventory.api';
import { manufacturingApi } from './api/modules/manufacturing.api';
import type { WorkOrder } from './api/modules/manufacturing.api';
import {
  Factory, Plus, Search, CheckCircle2,
  Zap, Layers, Gauge, Cpu, Check,
  ShieldCheck, Activity
} from 'lucide-react';
import { money } from './lib/currency';
import { downloadExcel, downloadCSV } from './lib/exportUtils';
import ExportDropdown from './components/ExportDropdown';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState } from './components/ui/empty-state';
import { CompactProductSelect } from './components/CompactProductSelect';
import { CompactSelect } from './components/CompactSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const statusHex: Record<string, string> = {
  Draft: '#94a3b8',
  Released: '#3b82f6',
  InProgress: '#f59e0b',
  Completed: '#10b981',
  Cancelled: '#ef4444'
};

const FACTORY_WORK_CENTERS = [
  'CNC Machining Center',
  'Assembly & Packaging Line 1',
  'Assembly & Packaging Line 2',
  'Cutting & Stamping Workshop',
  'Surface Finishing & Coating',
  'Quality Testing & Inspection Lab',
];

export const ManufacturingWorkspace: React.FC<{ activeEntityId: string; entities?: any[]; initialTab?: 'shopfloor' | 'orders' | 'boms' | 'qc' | 'costing' }> = ({ activeEntityId, initialTab = 'shopfloor' }) => {
  const [activeTab, setActiveTab] = useState<'shopfloor' | 'orders' | 'boms' | 'qc' | 'costing'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [toast, setToast] = useState('');
  const [machines, setMachines] = useState<FixedAsset[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [workCenterFilter, setWorkCenterFilter] = useState('All');

  const boms = useManufacturingStore((s) => s.boms);
  const workOrders = useManufacturingStore((s) => s.workOrders);
  const fetchAllManufacturing = useManufacturingStore((s) => s.fetchAllManufacturing);
  const createBomStore = useManufacturingStore((s) => s.createBom);
  const createWorkOrderStore = useManufacturingStore((s) => s.createWorkOrder);
  const startWorkOrderStore = useManufacturingStore((s) => s.startWorkOrder);

  const products = useProductsStore((s) => s.products);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);

  const warehouses = useAssetsInventoryStore((s) => s.warehouses);
  const fetchWarehouses = useAssetsInventoryStore((s) => s.fetchWarehouses);

  const fetchFixedAssetMachines = async () => {
    try {
      const data = await assetsInventoryApi.getFixedAssets(activeEntityId);
      const factoryEquip = (data || []).filter(a =>
        a.category?.includes('Plant') ||
        a.category?.includes('Machinery') ||
        a.category?.includes('Equipment') ||
        a.costAllocation === 'ManufacturingOverhead'
      );
      setMachines(factoryEquip);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAllManufacturing(activeEntityId);
    fetchProducts();
    fetchWarehouses(activeEntityId);
    fetchFixedAssetMachines();
  }, [activeEntityId]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // Modals
  const [showBomModal, setShowBomModal] = useState(false);
  const [showWoModal, setShowWoModal] = useState(false);
  const [qcModalWo, setQcModalWo] = useState<WorkOrder | null>(null);
  const [machineHoursModalWo, setMachineHoursModalWo] = useState<WorkOrder | null>(null);
  const [completeModalWo, setCompleteModalWo] = useState<WorkOrder | null>(null);

  // Forms
  const [bomForm, setBomForm] = useState({ finishedProductId: '', quantityProduced: '1', estimatedLaborHours: '2', estimatedMachineHours: '3', notes: '' });
  const [bomLines, setBomLines] = useState([{ rawMaterialProductId: '', quantityRequired: '1', wastePercentage: '0' }]);

  const [woForm, setWoForm] = useState({
    bomId: '',
    rawMaterialWarehouseId: '',
    finishedGoodsWarehouseId: '',
    quantityToProduce: '10',
    workCenterName: FACTORY_WORK_CENTERS[0],
    machineAssetId: '',
    assignedTechnicianName: '',
    laborHourlyRate: '25',
    machineHourlyRate: '35',
  });

  const [qcForm, setQcForm] = useState({
    inspectorName: 'Chief QC Inspector',
    quantityInspected: '',
    quantityPassed: '',
    quantityRejected: '0',
    defectReason: '',
    notes: 'Meets ISO/GMP specifications',
    status: 'Passed',
  });

  const [machineHoursForm, setMachineHoursForm] = useState({
    additionalHours: '4',
    hourlyRate: '35',
  });

  const [completeForm, setCompleteForm] = useState({
    actualProducedQty: '',
    directLabor: '0',
    overhead: '0',
  });

  // KPI Computations
  const activeJobsCount = useMemo(() => workOrders.filter(w => String(w.status) === 'InProgress' || String(w.status) === '2').length, [workOrders]);
  const completedJobsCount = useMemo(() => workOrders.filter(w => String(w.status) === 'Completed' || String(w.status) === '3').length, [workOrders]);
  const totalProductionCost = useMemo(() => workOrders.reduce((sum, w) => sum + (Number(w.totalCost) || 0), 0), [workOrders]);
  const totalWipValuation = useMemo(() => workOrders.filter(w => String(w.status) === 'InProgress' || String(w.status) === '2').reduce((sum, w) => sum + (Number(w.totalMaterialCost) + Number(w.directLaborCost) + Number(w.overheadCost)), 0), [workOrders]);

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(w => {
      const matchQ = !query ||
        w.workOrderNumber?.toLowerCase().includes(query.toLowerCase()) ||
        (w.finishedProductName || (w as any).productName || '')?.toLowerCase().includes(query.toLowerCase()) ||
        w.machineAssetName?.toLowerCase().includes(query.toLowerCase()) ||
        (w as any).assignedTechnicianName?.toLowerCase().includes(query.toLowerCase());

      const matchStatus = statusFilter === 'All' || String(w.status) === statusFilter;
      const matchCenter = workCenterFilter === 'All' || w.workCenterName === workCenterFilter;

      return matchQ && matchStatus && matchCenter;
    }).sort((a, b) => {
      const dateA = (a as any).startDate || a.createdAt || '';
      const dateB = (b as any).startDate || b.createdAt || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      const numA = a.workOrderNumber || '';
      const numB = b.workOrderNumber || '';
      return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [workOrders, query, statusFilter, workCenterFilter]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleSaveBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomForm.finishedProductId) return alert('Please select a finished good product.');
    const finishedProd = products.find(p => p.id === bomForm.finishedProductId);

    const body = {
      finishedProductId: bomForm.finishedProductId,
      finishedProductName: finishedProd?.name || '',
      quantityProduced: parseFloat(bomForm.quantityProduced) || 1,
      estimatedLaborHours: parseFloat(bomForm.estimatedLaborHours) || 0,
      estimatedMachineHours: parseFloat(bomForm.estimatedMachineHours) || 0,
      notes: bomForm.notes,
      companyId: activeEntityId || null,
      lines: bomLines.map(l => {
        const rawMat = products.find(p => p.id === l.rawMaterialProductId);
        return {
          rawMaterialProductId: l.rawMaterialProductId,
          rawMaterialProductName: rawMat?.name || '',
          unitOfMeasure: (rawMat as any)?.unitOfMeasure || (rawMat as any)?.unit || 'Pcs',
          quantityRequired: parseFloat(l.quantityRequired) || 1,
          wastePercentage: parseFloat(l.wastePercentage || '0')
        };
      })
    };
    try {
      await createBomStore(body as any);
      notify('✓ Bill of Materials (BOM) recipe created!');
      setShowBomModal(false);
      setBomLines([{ rawMaterialProductId: '', quantityRequired: '1', wastePercentage: '0' }]);
    } catch (e: any) {
      notify(e.message || 'Error creating BOM');
    }
  };

  const handleSaveWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woForm.bomId || !woForm.rawMaterialWarehouseId || !woForm.finishedGoodsWarehouseId) return alert('Please select BOM and Warehouses.');
    const bom = boms.find(b => b.id === woForm.bomId);
    if (!bom) return;

    const selectedMachine = machines.find(m => m.id === woForm.machineAssetId);

    const body = {
      bomId: bom.id,
      finishedProductId: bom.finishedProductId,
      finishedProductName: bom.finishedProductName,
      rawMaterialWarehouseId: woForm.rawMaterialWarehouseId,
      finishedGoodsWarehouseId: woForm.finishedGoodsWarehouseId,
      quantityToProduce: parseFloat(woForm.quantityToProduce) || 10,
      workCenterName: woForm.workCenterName,
      machineAssetId: selectedMachine?.id || undefined,
      machineAssetTag: selectedMachine?.assetTag || undefined,
      machineAssetName: selectedMachine?.name || undefined,
      assignedTechnicianName: woForm.assignedTechnicianName,
      laborHourlyRate: parseFloat(woForm.laborHourlyRate) || 20,
      machineHourlyRate: parseFloat(woForm.machineHourlyRate) || 25,
      companyId: activeEntityId || null,
      lines: bom.lines?.map(l => ({
        rawMaterialProductId: l.rawMaterialProductId,
        rawMaterialProductName: l.rawMaterialProductName,
        quantityRequired: l.quantityRequired,
        quantityIssued: 0,
        unitCost: 0,
        totalCost: 0
      })) || []
    };
    try {
      await createWorkOrderStore(body as any);
      notify('✓ Work Order released to Shop Floor!');
      setShowWoModal(false);
      fetchAllManufacturing(activeEntityId);
    } catch (e: any) {
      notify(e.message || 'Error creating Work Order');
    }
  };

  const handleStartWorkOrder = async (id: string) => {
    try {
      await startWorkOrderStore(id);
      notify('✓ Work Order started. Raw materials issued to WIP.');
      fetchAllManufacturing(activeEntityId);
    } catch (e: any) {
      notify(e.message || 'Error starting work order');
    }
  };

  const handleSaveMachineHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineHoursModalWo) return;
    try {
      const hours = parseFloat(machineHoursForm.additionalHours) || 0;
      const rate = parseFloat(machineHoursForm.hourlyRate) || 35;
      await (manufacturingApi as any).logMachineHours(machineHoursModalWo.id, hours, rate);
      notify(`✓ Logged ${hours} machine run hours into Fixed Assets meter & absorbed overhead.`);
      setMachineHoursModalWo(null);
      fetchAllManufacturing(activeEntityId);
      fetchFixedAssetMachines();
    } catch (e: any) {
      notify(e.message || 'Error logging machine hours');
    }
  };

  const handleSaveQc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcModalWo) return;
    try {
      const inspected = parseFloat(qcForm.quantityInspected) || (qcModalWo.quantityToProduce || 0);
      const passed = parseFloat(qcForm.quantityPassed) || inspected;
      const rejected = parseFloat(qcForm.quantityRejected) || 0;

      await (manufacturingApi as any).performQcInspection(qcModalWo.id, {
        workOrderId: qcModalWo.id,
        inspectorName: qcForm.inspectorName,
        quantityInspected: inspected,
        quantityPassed: passed,
        quantityRejected: rejected,
        defectReason: qcForm.defectReason,
        status: qcForm.status as any,
        notes: qcForm.notes
      });

      notify('✓ Quality Control Inspection logged successfully!');
      setQcModalWo(null);
      fetchAllManufacturing(activeEntityId);
    } catch (e: any) {
      notify(e.message || 'Error recording QC inspection');
    }
  };

  const handleCompleteWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalWo) return;
    try {
      const actualQty = parseFloat(completeForm.actualProducedQty) || completeModalWo.acceptedQuantity || (completeModalWo.quantityToProduce || 0);
      const labor = parseFloat(completeForm.directLabor) || (completeModalWo.directLaborCost || 0);
      const overhead = parseFloat(completeForm.overhead) || (completeModalWo.overheadCost || 0);

      await (manufacturingApi as any).completeWorkOrder(completeModalWo.id, {
        actualProducedQty: actualQty,
        directLabor: labor,
        overhead: overhead
      });

      notify('✓ Work order completed. Finished goods received into warehouse.');
      setCompleteModalWo(null);
      fetchAllManufacturing(activeEntityId);
      fetchFixedAssetMachines();
    } catch (e: any) {
      notify(e.message || 'Error completing work order');
    }
  };

  // ─── Exports ───────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Manufacturing Work Orders & Shop Floor Costing', 14, 15);
    doc.setFontSize(9);
    doc.text(`Active Jobs: ${activeJobsCount} | WIP Valuation: ${money(totalWipValuation)} | As of ${new Date().toLocaleDateString()}`, 14, 22);

    const tableData = filteredWorkOrders.map(w => [
      w.workOrderNumber || '',
      w.finishedProductName || (w as any).productName || '',
      w.workCenterName || 'Shop Floor',
      w.machineAssetName || 'N/A',
      `${w.quantityProduced || 0} / ${w.quantityToProduce || (w as any).quantityOrdered || 0}`,
      money(w.totalMaterialCost || 0),
      money(w.directLaborCost || 0),
      money(w.overheadCost || 0),
      money(w.totalCost || (w as any).totalActualCost || 0),
      money(w.unitCost || 0),
      String(w.status),
    ]);

    autoTable(doc, {
      startY: 26,
      head: [['WO #', 'Finished Product', 'Work Center', 'Plant Machine', 'Progress', 'Materials', 'Labor', 'Overhead', 'Total Cost', 'Unit Cost', 'Status']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 118, 110] },
    });

    doc.save(`Work_Orders_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportExcel = () => {
    const headers = ['WO #', 'Finished Good', 'Work Center', 'Machine', 'Target Qty', 'Produced Qty', 'Materials Cost', 'Labor Cost', 'MOH Cost', 'Total Cost', 'Unit Cost', 'Status'];
    const rows = filteredWorkOrders.map(w => [
      w.workOrderNumber,
      w.finishedProductName,
      w.workCenterName || '',
      w.machineAssetName || '',
      w.quantityToProduce,
      w.quantityProduced || 0,
      w.totalMaterialCost || 0,
      w.directLaborCost || 0,
      w.overheadCost || 0,
      w.totalCost || 0,
      w.unitCost || 0,
      String(w.status)
    ]);
    downloadExcel('Work_Orders_Job_Costing', 'Shop Floor', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['WorkOrderNumber', 'FinishedProduct', 'WorkCenter', 'Machine', 'QuantityToProduce', 'QuantityProduced', 'TotalCost', 'UnitCost', 'Status'];
    const rows = filteredWorkOrders.map(w => [
      w.workOrderNumber,
      w.finishedProductName,
      w.workCenterName || '',
      w.machineAssetName || '',
      w.quantityToProduce,
      w.quantityProduced || 0,
      w.totalCost || 0,
      w.unitCost || 0,
      String(w.status)
    ]);
    downloadCSV('Work_Orders_Register', headers, rows);
  };

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6 animate-in fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-teal-600 text-white px-4 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-orange-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-orange-500 to-amber-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Factory className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Factory Work Orders &amp; Real-time Shop Floor Job Costing</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400"><span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" /> Live Ledger</span>
                <span className="hidden md:inline-flex text-[9px] font-mono font-normal px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                  IAS 2 / IAS 16
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Live shop floor operations, plant machinery runtime meter integration, QC inspections, and direct overhead absorption.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
          <ExportDropdown
            label="Export Shop Floor"
            onPDF={handleExportPDF}
            onExcel={handleExportExcel}
            onCSV={handleExportCSV}
            onPrint={() => window.print()}
          />
          <button
            onClick={() => setShowBomModal(true)}
            className="px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)] rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-purple-600" /> Create BOM Recipe
          </button>
          <button
            onClick={() => setShowWoModal(true)}
            className="primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Release Work Order
          </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiGrid cols={4}>
        <KpiCard icon={Activity} label="Active Shop Floor Jobs" value={activeJobsCount} desc="In-Production Work Centers" tone="amber" />
        <KpiCard icon={Layers} label="WIP Valuation (IAS 2)" value={money(totalWipValuation)} desc="Materials + Labor + Overhead" tone="teal" />
        <KpiCard icon={Cpu} label="Plant Machines Engaged" value={machines.length} desc="Fixed Assets Linked" tone="purple" />
        <KpiCard icon={CheckCircle2} label="Completed Work Orders" value={completedJobsCount} desc={`${money(totalProductionCost)} Capitalized`} tone="emerald" />
      </KpiGrid>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-[var(--color-surface-muted)] p-1.5 rounded-2xl border border-[var(--color-border)] overflow-x-auto text-xs font-semibold">
        {[
          { id: 'shopfloor', label: '🏭 Shop Floor Live Monitor', count: activeJobsCount },
          { id: 'orders', label: '📋 Work Order Register', count: workOrders.length },
          { id: 'boms', label: '📐 BOM Studio Recipes', count: boms.length },
          { id: 'qc', label: '🔍 Quality Control (QC) Hub' },
          { id: 'costing', label: '📊 IAS 2 Job Costing Breakdown' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: SHOP FLOOR LIVE MONITOR ─────────────────────────────────── */}
      {activeTab === 'shopfloor' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workOrders.filter(w => String(w.status) === 'InProgress' || String(w.status) === 'Released' || String(w.status) === '1' || String(w.status) === '2').map(wo => {
              const isRunning = String(wo.status) === 'InProgress' || String(wo.status) === '2';

              return (
                <div key={wo.id} className="p-5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs space-y-4 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-teal-600">{wo.workOrderNumber}</span>
                      <h3 className="font-bold text-sm text-[var(--color-text-strong)]">{wo.finishedProductName}</h3>
                      <p className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                        <Factory className="w-3 h-3 text-purple-600" /> {wo.workCenterName || 'CNC Center'}
                      </p>
                    </div>
                    <StatusChip status={String(wo.status)} label={String(wo.status)} hex={statusHex[String(wo.status)] ?? '#94a3b8'} />
                  </div>

                  {/* Machine & Technician Link */}
                  <div className="p-3 bg-[var(--color-surface-muted)]/50 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-teal-600" /> Machine:
                      </span>
                      <span className="font-semibold text-[var(--color-text-strong)] font-mono text-[11px]">
                        {wo.machineAssetName || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-blue-600" /> Machine Run Hours:
                      </span>
                      <span className="font-bold text-blue-600 font-mono">{wo.machineRunHours || 0} hrs</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1.5">
                      <span className="text-[11px] text-[var(--color-text-muted)]">Target Qty:</span>
                      <span className="font-bold text-[var(--color-text-strong)] font-mono">{wo.quantityToProduce} Units</span>
                    </div>
                  </div>

                  {/* Live Cost Accumulation Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] font-mono">
                      <span>WIP Cost: <strong>{money(wo.totalMaterialCost + (wo.directLaborCost || 0) + (wo.overheadCost || 0))}</strong></span>
                      <span>MOH Absorbed: <strong>{money(wo.overheadCost || 0)}</strong></span>
                    </div>
                  </div>

                  {/* Operational Action Controls */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)]">
                    {!isRunning ? (
                      <button
                        onClick={() => handleStartWorkOrder(wo.id)}
                        className="col-span-2 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" /> Start Production & Issue Stock
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setMachineHoursModalWo(wo);
                            setMachineHoursForm({ additionalHours: '4', hourlyRate: String(wo.machineHourlyRate || 35) });
                          }}
                          className="py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Gauge className="w-3 h-3" /> Log Run Hours
                        </button>
                        <button
                          onClick={() => {
                            setQcModalWo(wo);
                            setQcForm({
                              inspectorName: 'Quality Lead',
                              quantityInspected: String(wo.quantityToProduce),
                              quantityPassed: String(wo.quantityToProduce),
                              quantityRejected: '0',
                              defectReason: '',
                              notes: 'Approved',
                              status: 'Passed'
                            });
                          }}
                          className="py-2 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ShieldCheck className="w-3 h-3" /> QC Inspection
                        </button>
                        <button
                          onClick={() => {
                            setCompleteModalWo(wo);
                            setCompleteForm({
                              actualProducedQty: String(wo.acceptedQuantity || wo.quantityToProduce),
                              directLabor: String(wo.directLaborCost || (wo.laborHours || 2) * (wo.laborHourlyRate || 20)),
                              overhead: String(wo.overheadCost || (wo.machineRunHours || 2) * (wo.machineHourlyRate || 25)),
                            });
                          }}
                          className="col-span-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Complete & Receive Finished Goods
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 2: WORK ORDER REGISTER ──────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="p-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search WO #, product, machine, technician..."
                className="w-full pl-9 pr-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text)] outline-none focus:border-teal-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl text-xs font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Released">Released</option>
              <option value="InProgress">InProgress</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              value={workCenterFilter}
              onChange={e => setWorkCenterFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl text-xs font-semibold"
            >
              <option value="All">All Work Centers</option>
              {FACTORY_WORK_CENTERS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-orange-500/[0.05] dark:bg-orange-400/[0.07] border-b border-[var(--color-border)] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">WO Number</th>
                  <th className="py-3 px-3">Finished Good</th>
                  <th className="py-3 px-3">Work Center & Machine</th>
                  <th className="py-3 px-3 text-right">Target / Produced</th>
                  <th className="py-3 px-3 text-right">Materials</th>
                  <th className="py-3 px-3 text-right">Labor</th>
                  <th className="py-3 px-3 text-right">MOH (61100)</th>
                  <th className="py-3 px-3 text-right">Total Cost</th>
                  <th className="py-3 px-3 text-right">Unit Cost</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <EmptyState icon={Factory} title="No manufacturing work orders found" hint="Release a work order from a BOM recipe to start production." />
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map(wo => (
                    <tr key={wo.id} className="hover:bg-[var(--color-surface-muted)]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700 dark:text-teal-300">{wo.workOrderNumber}</td>
                      <td className="py-3 px-3 font-bold text-[var(--color-text-strong)]">{wo.finishedProductName}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-[var(--color-text-strong)]">{wo.workCenterName || 'Shop Floor'}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-mono">{wo.machineAssetName || 'No Machine'}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        {wo.quantityProduced || 0} / {wo.quantityToProduce}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[var(--color-text-strong)]">{money(wo.totalMaterialCost || 0)}</td>
                      <td className="py-3 px-3 text-right font-mono text-blue-600">{money(wo.directLaborCost || 0)}</td>
                      <td className="py-3 px-3 text-right font-mono text-purple-600">{money(wo.overheadCost || 0)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-teal-600">{money(wo.totalCost || 0)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[var(--color-text-strong)]">{money(wo.unitCost || 0)}</td>
                      <td className="py-3 px-3 text-center">
                        <StatusChip status={String(wo.status)} label={String(wo.status)} hex={statusHex[String(wo.status)] ?? '#94a3b8'} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: BOM STUDIO ──────────────────────────────────────────────── */}
      {activeTab === 'boms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boms.map(b => (
              <div key={b.id} className="p-5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-purple-600">{b.bomNumber}</span>
                    <h3 className="font-bold text-sm text-[var(--color-text-strong)]">{b.finishedProductName}</h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Output: {b.quantityProduced} Units</p>
                  </div>
                  <button
                    onClick={() => {
                      setWoForm(f => ({ ...f, bomId: b.id }));
                      setShowWoModal(true);
                    }}
                    className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Create Order
                  </button>
                </div>

                <div className="space-y-1.5 border-t border-[var(--color-border)] pt-2 text-xs">
                  <p className="font-bold text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Raw Materials Required:</p>
                  {b.lines?.map((line, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-[var(--color-border)]/40">
                      <span className="text-[var(--color-text-strong)]">{line.rawMaterialProductName}</span>
                      <span className="font-mono font-semibold text-teal-600">{line.quantityRequired} {line.unitOfMeasure}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: QC & INSPECTION HUB ──────────────────────────────────────── */}
      {activeTab === 'qc' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Quality Control (QC) & Inspection Checkpoints
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Audit logs of tested finished goods, scrap rates, and inspector authorizations before inventory capitalization.
              </p>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-orange-500/[0.05] dark:bg-orange-400/[0.07] border-b border-[var(--color-border)] text-[var(--color-text-muted)] font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">WO Number & Product</th>
                  <th className="py-3 px-3">Inspector</th>
                  <th className="py-3 px-3 text-right">Accepted Qty</th>
                  <th className="py-3 px-3 text-right">Scrap / Defect Qty</th>
                  <th className="py-3 px-3">Defect Reason</th>
                  <th className="py-3 px-3 text-center">QC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {workOrders.filter(w => w.qcStatus && w.qcStatus !== 'Pending').map(wo => (
                  <tr key={wo.id} className="hover:bg-[var(--color-surface-muted)]/40">
                    <td className="py-3 px-4">
                      <p className="font-bold text-[var(--color-text-strong)]">{wo.finishedProductName}</p>
                      <p className="text-[10px] text-teal-600 font-mono">{wo.workOrderNumber}</p>
                    </td>
                    <td className="py-3 px-3 text-[var(--color-text-strong)]">{wo.inspectorName || 'Lead QC'}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">{wo.acceptedQuantity || wo.quantityToProduce}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">{wo.scrapQuantity || 0}</td>
                    <td className="py-3 px-3 text-[var(--color-text-muted)]">{wo.scrapReason || 'None (100% Passed)'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {String(wo.qcStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: IAS 2 JOB COSTING BREAKDOWN ───────────────────────────────── */}
      {activeTab === 'costing' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900/60">
            <h3 className="font-bold text-sm text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" /> Absorption Costing & General Ledger Allocation (IAS 2)
            </h3>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
              Breakdown of Raw Materials, Direct Labor (Code 61200), and Factory Machine Overhead (Code 61100) absorbed into Inventory.
            </p>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-teal-50/50 dark:bg-teal-950/30 rounded-xl border border-teal-200/60">
                <p className="text-xs text-[var(--color-text-muted)] font-semibold">Total Raw Materials Issued</p>
                <p className="text-lg font-bold text-teal-700 font-mono">{money(workOrders.reduce((s, w) => s + (Number(w.totalMaterialCost) || 0), 0))}</p>
              </div>
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200/60">
                <p className="text-xs text-[var(--color-text-muted)] font-semibold">Direct Labor Absorbed (61200)</p>
                <p className="text-lg font-bold text-blue-700 font-mono">{money(workOrders.reduce((s, w) => s + (Number(w.directLaborCost) || 0), 0))}</p>
              </div>
              <div className="p-4 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl border border-purple-200/60">
                <p className="text-xs text-[var(--color-text-muted)] font-semibold">Manufacturing Overhead Absorbed (61100)</p>
                <p className="text-lg font-bold text-purple-700 font-mono">{money(workOrders.reduce((s, w) => s + (Number(w.overheadCost) || 0), 0))}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE BOM RECIPE ────────────────────────────────────────── */}
      {showBomModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-strong)] flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" /> Create Bill of Materials (BOM) Recipe
              </h3>
              <button onClick={() => setShowBomModal(false)} className="text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveBom} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Finished Product to Produce</label>
                  <CompactProductSelect
                    value={bomForm.finishedProductId}
                    onChange={v => setBomForm(f => ({ ...f, finishedProductId: v }))}
                    products={products}
                    placeholder="Select Finished Product..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Batch Quantity Produced</label>
                  <input
                    type="number"
                    required
                    value={bomForm.quantityProduced}
                    onChange={e => setBomForm(f => ({ ...f, quantityProduced: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              {/* Raw Material Lines */}
              <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[var(--color-text-strong)]">Raw Materials & Ingredients</h4>
                  <button
                    type="button"
                    onClick={() => setBomLines([...bomLines, { rawMaterialProductId: '', quantityRequired: '1', wastePercentage: '0' }])}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Material
                  </button>
                </div>

                {bomLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <CompactProductSelect
                        value={line.rawMaterialProductId}
                        onChange={v => {
                          const updated = [...bomLines];
                          updated[idx].rawMaterialProductId = v;
                          setBomLines(updated);
                        }}
                        products={products}
                        placeholder="Select Raw Material..."
                      />
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Qty"
                        required
                        value={line.quantityRequired}
                        onChange={e => {
                          const updated = [...bomLines];
                          updated[idx].quantityRequired = e.target.value;
                          setBomLines(updated);
                        }}
                        className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Waste %"
                        value={line.wastePercentage}
                        onChange={e => {
                          const updated = [...bomLines];
                          updated[idx].wastePercentage = e.target.value;
                          setBomLines(updated);
                        }}
                        className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => setBomLines(bomLines.filter((_, i) => i !== idx))}
                        className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowBomModal(false)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Save BOM Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE WORK ORDER ────────────────────────────────────────── */}
      {showWoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-strong)] flex items-center gap-2">
                <Factory className="w-5 h-5 text-teal-600" /> Release New Work Order
              </h3>
              <button onClick={() => setShowWoModal(false)} className="text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveWorkOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">BOM Recipe</label>
                  <CompactSelect
                    value={woForm.bomId}
                    onChange={v => setWoForm(f => ({ ...f, bomId: v }))}
                    placeholder="Select BOM Recipe..."
                    searchPlaceholder="Search BOM recipe..."
                    options={boms.map(b => ({
                      value: b.id,
                      label: b.finishedProductName,
                      badge: b.bomNumber
                    }))}
                    className="h-10 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Quantity to Produce</label>
                  <input
                    type="number"
                    required
                    value={woForm.quantityToProduce}
                    onChange={e => setWoForm(f => ({ ...f, quantityToProduce: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono font-bold"
                  />
                </div>
              </div>

              {/* Work Center & Plant Machine Selection */}
              <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl border border-teal-200/60 space-y-3">
                <h4 className="font-bold text-xs text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-teal-600" /> Shop Floor Machine & Work Center Assignment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[var(--color-text-strong)]">Work Center</label>
                    <select
                      value={woForm.workCenterName}
                      onChange={e => setWoForm(f => ({ ...f, workCenterName: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none"
                    >
                      {FACTORY_WORK_CENTERS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[var(--color-text-strong)]">Assign Plant Machine (from Fixed Assets)</label>
                    <CompactSelect
                      value={woForm.machineAssetId}
                      onChange={v => setWoForm(f => ({ ...f, machineAssetId: v }))}
                      placeholder="Select Machine..."
                      searchPlaceholder="Search machine by tag or name..."
                      clearLabel="-- No Machine Assigned --"
                      options={machines.map(m => ({
                        value: m.id,
                        label: `${m.assetTag} — ${m.name}`,
                        badge: String(m.machineHealth || 'Operating')
                      }))}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Warehouses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Raw Materials Source Warehouse</label>
                  <CompactSelect
                    value={woForm.rawMaterialWarehouseId}
                    onChange={v => setWoForm(f => ({ ...f, rawMaterialWarehouseId: v }))}
                    placeholder="Select Warehouse..."
                    searchPlaceholder="Search warehouse..."
                    options={warehouses.map(w => ({
                      value: w.id,
                      label: w.name,
                      badge: 'Warehouse'
                    }))}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Finished Goods Target Warehouse</label>
                  <CompactSelect
                    value={woForm.finishedGoodsWarehouseId}
                    onChange={v => setWoForm(f => ({ ...f, finishedGoodsWarehouseId: v }))}
                    placeholder="Select Warehouse..."
                    searchPlaceholder="Search warehouse..."
                    options={warehouses.map(w => ({
                      value: w.id,
                      label: w.name,
                      badge: 'Warehouse'
                    }))}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setShowWoModal(false)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Release Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: LOG MACHINE HOURS ────────────────────────────────────────── */}
      {machineHoursModalWo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <p className="text-[10px] font-mono font-bold text-blue-600">{machineHoursModalWo.workOrderNumber}</p>
                <h3 className="text-base font-bold text-[var(--color-text-strong)]">Log Machine Run Hours</h3>
              </div>
              <button onClick={() => setMachineHoursModalWo(null)} className="text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveMachineHours} className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl space-y-1 text-blue-800 dark:text-blue-300 font-mono">
                <p>Machine: <strong>{machineHoursModalWo.machineAssetName || 'Shop Floor Machine'}</strong></p>
                <p>Current Run Hours: <strong>{machineHoursModalWo.machineRunHours || 0} hrs</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Additional Run Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={machineHoursForm.additionalHours}
                    onChange={e => setMachineHoursForm(f => ({ ...f, additionalHours: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">MOH Rate ($/hr)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={machineHoursForm.hourlyRate}
                    onChange={e => setMachineHoursForm(f => ({ ...f, hourlyRate: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setMachineHoursModalWo(null)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Save & Update Meter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: QUALITY CONTROL INSPECTION ────────────────────────────────── */}
      {qcModalWo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <p className="text-[10px] font-mono font-bold text-amber-600">{qcModalWo.workOrderNumber}</p>
                <h3 className="text-base font-bold text-[var(--color-text-strong)]">Quality Control Checkpoint</h3>
              </div>
              <button onClick={() => setQcModalWo(null)} className="text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveQc} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Tested / Inspected Qty</label>
                  <input
                    type="number"
                    required
                    value={qcForm.quantityInspected}
                    onChange={e => setQcForm(f => ({ ...f, quantityInspected: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Passed / Accepted Qty</label>
                  <input
                    type="number"
                    required
                    value={qcForm.quantityPassed}
                    onChange={e => setQcForm(f => ({ ...f, quantityPassed: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Scrapped / Rejected Qty</label>
                  <input
                    type="number"
                    value={qcForm.quantityRejected}
                    onChange={e => setQcForm(f => ({ ...f, quantityRejected: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono font-bold text-rose-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Inspector Name</label>
                  <input
                    value={qcForm.inspectorName}
                    onChange={e => setQcForm(f => ({ ...f, inspectorName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--color-text-strong)]">Defect Reason (if any)</label>
                <input
                  value={qcForm.defectReason}
                  onChange={e => setQcForm(f => ({ ...f, defectReason: e.target.value }))}
                  placeholder="e.g. Dimensional tolerance off by 0.2mm"
                  className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setQcModalWo(null)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Save QC Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: COMPLETE WORK ORDER ──────────────────────────────────────── */}
      {completeModalWo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <p className="text-[10px] font-mono font-bold text-emerald-600">{completeModalWo.workOrderNumber}</p>
                <h3 className="text-base font-bold text-[var(--color-text-strong)]">Capitalize Finished Goods</h3>
              </div>
              <button onClick={() => setCompleteModalWo(null)} className="text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCompleteWorkOrder} className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl space-y-1 text-emerald-800 dark:text-emerald-300 font-mono">
                <p>Finished Good: <strong>{completeModalWo.finishedProductName}</strong></p>
                <p>Materials Cost: <strong>{money(completeModalWo.totalMaterialCost)}</strong></p>
                <p>Accepted Qty: <strong>{completeModalWo.acceptedQuantity || completeModalWo.quantityToProduce} Units</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Direct Labor Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={completeForm.directLabor}
                    onChange={e => setCompleteForm(f => ({ ...f, directLabor: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Machine Overhead ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={completeForm.overhead}
                    onChange={e => setCompleteForm(f => ({ ...f, overhead: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setCompleteModalWo(null)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Complete & Receive into Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturingWorkspace;
