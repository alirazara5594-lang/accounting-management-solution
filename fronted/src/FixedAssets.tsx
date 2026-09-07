import React, { useEffect, useState, useMemo } from 'react';
import { assetsInventoryApi } from './api/modules/assetsInventory.api';
import type { FixedAsset, DepreciationRunResult } from './api/modules/assetsInventory.api';
import { procurementApi } from './api/modules/procurement.api';
import { coaApi } from './api/modules/coa.api';
import type { Account } from './api/modules/coa.api';
import {
  Building, Plus, Search, CheckCircle2,
  RefreshCw, Zap, Trash2,
  FileText, TrendingDown, DollarSign,
  Wrench, Activity, ShoppingCart, Truck, Factory,
  Check, ArrowRight, Gauge, Cpu,
  QrCode, Layers, Pencil
} from 'lucide-react';
import { money } from './lib/currency';
import { downloadExcel, downloadCSV } from './lib/exportUtils';
import ExportDropdown from './components/ExportDropdown';
import { KpiCard } from './components/ui/kpi-card';
import { EmptyState } from './components/ui/empty-state';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ASSET_CATEGORIES = [
  'Plant & Machinery',
  'Factory Equipment & Tools',
  'Heavy Vehicles & Forklifts',
  'Office Equipment',
  'Computer Hardware & IT',
  'Furniture & Fixtures',
  'Land & Buildings',
  'Leasehold Improvements',
];

const FACTORY_WORK_CENTERS = [
  'Factory Floor - CNC Machining Center',
  'Assembly & Packaging Line 1',
  'Assembly & Packaging Line 2',
  'Boiler & Utilities Room',
  'Raw Material Staging & Cutting',
  'Quality Control & Testing Lab',
  'Central Warehouse & Staging',
  'Corporate Head Office',
];

export const FixedAssets: React.FC<{ activeEntityId: string }> = ({ activeEntityId }) => {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [procurementBills, setProcurementBills] = useState<any[]>([]);
  const [procurementOrders, setProcurementOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'UnderMaintenance' | 'FullyDepreciated' | 'Disposed'>('All');
  const [allocationFilter, setAllocationFilter] = useState<'All' | 'Admin' | 'FactoryMOH'>('All');

  // Active Tab: register, factory, procurement, maintenance, depreciation
  const [activeTab, setActiveTab] = useState<'register' | 'factory' | 'procurement' | 'maintenance' | 'depreciation'>('register');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [deprModal, setDeprModal] = useState<FixedAsset | null>(null);
  const [disposeModal, setDisposeModal] = useState<FixedAsset | null>(null);
  const [detailModal, setDetailModal] = useState<FixedAsset | null>(null);
  const [maintenanceModal, setMaintenanceModal] = useState<FixedAsset | null>(null);
  const [transferModal, setTransferModal] = useState<FixedAsset | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchResults, setBatchResults] = useState<DepreciationRunResult[] | null>(null);

  // Forms
  const [assetForm, setAssetForm] = useState({
    assetTag: '',
    name: '',
    description: '',
    category: ASSET_CATEGORIES[0],
    serialNumber: '',
    modelNumber: '',
    manufacturer: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchasePrice: '',
    salvageValue: '0',
    usefulLifeYears: '5',
    depreciationMethod: 'StraightLine',
    costAllocation: 'AdministrativeExpense',
    status: 'Active',
    // Procurement
    vendorName: '',
    purchaseOrderNumber: '',
    vendorBillNumber: '',
    grnNumber: '',
    warrantyExpiryDate: '',
    // Factory
    location: 'Main Plant Floor',
    department: 'Manufacturing',
    workCenterName: FACTORY_WORK_CENTERS[0],
    assignedCustodianName: '',
    machineHealth: 'Operating',
    currentMeterHours: '0',
    totalCapacityUnits: '0',
    // Accounts
    assetAccountId: '',
    accumulatedDepreciationAccountId: '',
    depreciationExpenseAccountId: '',
  });

  const [maintForm, setMaintForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    maintenanceType: 'Preventive',
    description: '',
    cost: '0',
    technicianName: '',
    downTimeHours: '0',
    partsReplaced: '',
    nextServiceDueDate: '',
  });

  const [transferForm, setTransferForm] = useState({
    transferDate: new Date().toISOString().slice(0, 10),
    toLocation: '',
    toWorkCenter: FACTORY_WORK_CENTERS[0],
    authorizedBy: '',
    remarks: '',
  });

  const [deprForm, setDeprForm] = useState({
    expenseAccId: '',
    accumAccId: '',
  });

  const [disposeForm, setDisposeForm] = useState({
    disposalDate: new Date().toISOString().slice(0, 10),
    proceeds: '0',
    cashAccountId: '',
    assetAccountId: '',
    accumDeprAccountId: '',
    gainLossAccountId: '',
  });

  const fetchAssets = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await assetsInventoryApi.getFixedAssets(activeEntityId);
      setAssets(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch fixed assets register.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await coaApi.getAccounts();
      setAccounts(data.filter((a: any) => a.status === 'Active' || !a.status));
    } catch {
      // ignore
    }
  };

  const fetchProcurementData = async () => {
    try {
      const [bills, orders] = await Promise.all([
        procurementApi.getBills(activeEntityId).catch(() => []),
        procurementApi.getOrders(activeEntityId).catch(() => []),
      ]);
      setProcurementBills(bills || []);
      setProcurementOrders(orders || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchAccounts();
    fetchProcurementData();
  }, [activeEntityId]);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Helper filters
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchQuery =
        !query ||
        a.name?.toLowerCase().includes(query.toLowerCase()) ||
        a.assetTag?.toLowerCase().includes(query.toLowerCase()) ||
        a.serialNumber?.toLowerCase().includes(query.toLowerCase()) ||
        a.workCenterName?.toLowerCase().includes(query.toLowerCase()) ||
        a.vendorName?.toLowerCase().includes(query.toLowerCase());

      const matchCat = categoryFilter === 'All' || a.category === categoryFilter;
      const matchStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && (a.status === 'Active' || String(a.status) === '0')) ||
        (statusFilter === 'UnderMaintenance' && (a.status === 'UnderMaintenance' || a.machineHealth === 'UnderMaintenance' || a.machineHealth === 'Breakdown')) ||
        (statusFilter === 'FullyDepreciated' && (a.status === 'Depreciated' || a.status === 'FullyDepreciated' || String(a.status) === '2')) ||
        (statusFilter === 'Disposed' && (a.status === 'Disposed' || String(a.status) === '1'));

      const matchAlloc =
        allocationFilter === 'All' ||
        (allocationFilter === 'FactoryMOH' && a.costAllocation === 'ManufacturingOverhead') ||
        (allocationFilter === 'Admin' && a.costAllocation !== 'ManufacturingOverhead');

      return matchQuery && matchCat && matchStatus && matchAlloc;
    }).sort((a, b) => {
      const tagA = a.assetTag || (a as any).code || a.name || '';
      const tagB = b.assetTag || (b as any).code || b.name || '';
      return tagA.localeCompare(tagB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [assets, query, categoryFilter, statusFilter, allocationFilter]);

  // KPI calculations
  const totalCost = useMemo(() => assets.reduce((sum, a) => sum + (Number(a.purchasePrice || a.cost) || 0), 0), [assets]);
  const totalAccumDepr = useMemo(() => assets.reduce((sum, a) => sum + (Number(a.accumulatedDepreciation) || 0), 0), [assets]);
  const totalNBV = useMemo(() => Math.max(0, totalCost - totalAccumDepr), [totalCost, totalAccumDepr]);
  const plantMachineryCount = useMemo(() => assets.filter(a => a.category?.includes('Plant') || a.category?.includes('Machinery') || a.costAllocation === 'ManufacturingOverhead').length, [assets]);
  const underMaintenanceCount = useMemo(() => assets.filter(a => a.machineHealth === 'UnderMaintenance' || a.machineHealth === 'Breakdown' || a.status === 'UnderMaintenance').length, [assets]);

  // Procurement items destined for Fixed Assets
  const uncapitalizedProcurementLines = useMemo(() => {
    const lines: Array<{
      source: string;
      docNumber: string;
      date: string;
      vendorName: string;
      description: string;
      amount: number;
      poId?: string;
      billId?: string;
    }> = [];

    procurementBills.forEach((b: any) => {
      b.lines?.forEach((l: any) => {
        if (l.destination === 'FixedAsset' || l.description?.toLowerCase().includes('machine') || l.description?.toLowerCase().includes('equipment')) {
          lines.push({
            source: 'Vendor Bill',
            docNumber: b.billNumber,
            date: b.date,
            vendorName: b.vendorName || 'Vendor',
            description: l.description,
            amount: Number(l.totalAmount || (l.quantity * l.unitPrice) || 0),
            billId: b.id,
          });
        }
      });
    });

    procurementOrders.forEach((p: any) => {
      p.lines?.forEach((l: any) => {
        if (l.destination === 'FixedAsset') {
          lines.push({
            source: 'Purchase Order',
            docNumber: p.poNumber,
            date: p.date,
            vendorName: p.vendorName || 'Vendor',
            description: l.description,
            amount: Number(l.totalAmount || (l.quantity * l.unitPrice) || 0),
            poId: p.id,
          });
        }
      });
    });

    return lines;
  }, [procurementBills, procurementOrders]);

  const getNextAssetTag = (allAssets: any[] = []): string => {
    let maxSeq = 0;
    for (const a of allAssets) {
      if (!a?.assetTag) continue;
      const match = a.assetTag.match(/AST-(\d+)/i) || a.assetTag.match(/AST-\d{4}-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq && num < 1000000) maxSeq = num;
      }
    }
    return `AST-${String(maxSeq + 1).padStart(5, '0')}`;
  };

  // ─── Modal Openers ─────────────────────────────────────────────────────────
  const openCreateModal = (prefill?: Partial<typeof assetForm>) => {
    setError('');
    setEditingAsset(null);
    setAssetForm({
      assetTag: prefill?.assetTag || getNextAssetTag(assets),
      name: prefill?.name || '',
      description: prefill?.description || '',
      category: prefill?.category || ASSET_CATEGORIES[0],
      serialNumber: prefill?.serialNumber || '',
      modelNumber: prefill?.modelNumber || '',
      manufacturer: prefill?.manufacturer || '',
      purchaseDate: prefill?.purchaseDate || new Date().toISOString().slice(0, 10),
      purchasePrice: prefill?.purchasePrice || '',
      salvageValue: prefill?.salvageValue || '0',
      usefulLifeYears: prefill?.usefulLifeYears || '5',
      depreciationMethod: 'StraightLine',
      costAllocation: prefill?.category?.includes('Plant') || prefill?.category?.includes('Machinery') ? 'ManufacturingOverhead' : 'AdministrativeExpense',
      status: 'Active',
      vendorName: prefill?.vendorName || '',
      purchaseOrderNumber: prefill?.purchaseOrderNumber || '',
      vendorBillNumber: prefill?.vendorBillNumber || '',
      grnNumber: prefill?.grnNumber || '',
      warrantyExpiryDate: prefill?.warrantyExpiryDate || '',
      location: 'Main Factory Plant Floor',
      department: 'Manufacturing',
      workCenterName: FACTORY_WORK_CENTERS[0],
      assignedCustodianName: '',
      machineHealth: 'Operating',
      currentMeterHours: '0',
      totalCapacityUnits: '10000',
      assetAccountId: accounts.find(a => a.code === '15100' || a.name?.toLowerCase().includes('fixed assets'))?.id || '',
      accumulatedDepreciationAccountId: accounts.find(a => a.code === '15200' || a.name?.toLowerCase().includes('accumulated'))?.id || '',
      depreciationExpenseAccountId: accounts.find(a => a.code === '61300' || a.code === '61100')?.id || '',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (asset: FixedAsset) => {
    setError('');
    setEditingAsset(asset);
    setAssetForm({
      assetTag: asset.assetTag,
      name: asset.name,
      description: asset.description || '',
      category: asset.category || ASSET_CATEGORIES[0],
      serialNumber: asset.serialNumber || '',
      modelNumber: asset.modelNumber || '',
      manufacturer: asset.manufacturer || '',
      purchaseDate: asset.purchaseDate,
      purchasePrice: String(asset.purchasePrice || asset.cost || 0),
      salvageValue: String(asset.salvageValue || 0),
      usefulLifeYears: String(asset.usefulLifeYears || 5),
      depreciationMethod: String(asset.depreciationMethod || 'StraightLine'),
      costAllocation: String(asset.costAllocation || 'AdministrativeExpense'),
      status: String(asset.status || 'Active'),
      vendorName: asset.vendorName || '',
      purchaseOrderNumber: asset.purchaseOrderNumber || '',
      vendorBillNumber: asset.vendorBillNumber || '',
      grnNumber: asset.grnNumber || '',
      warrantyExpiryDate: asset.warrantyExpiryDate || '',
      location: asset.location || 'Main Factory Plant Floor',
      department: asset.department || 'Manufacturing',
      workCenterName: asset.workCenterName || FACTORY_WORK_CENTERS[0],
      assignedCustodianName: asset.assignedCustodianName || '',
      machineHealth: String(asset.machineHealth || 'Operating'),
      currentMeterHours: String(asset.currentMeterHours || 0),
      totalCapacityUnits: String(asset.totalCapacityUnits || 0),
      assetAccountId: asset.assetAccountId || '',
      accumulatedDepreciationAccountId: asset.accumulatedDepreciationAccountId || '',
      depreciationExpenseAccountId: asset.depreciationExpenseAccountId || '',
    });
    setIsCreateOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cost = parseFloat(assetForm.purchasePrice);
    if (!assetForm.name.trim()) { setError('Asset name is required.'); return; }
    if (isNaN(cost) || cost <= 0) { setError('Valid purchase cost is required.'); return; }

    setLoading(true);
    try {
      const payload: any = {
        assetTag: assetForm.assetTag,
        name: assetForm.name,
        description: assetForm.description,
        category: assetForm.category,
        serialNumber: assetForm.serialNumber,
        modelNumber: assetForm.modelNumber,
        manufacturer: assetForm.manufacturer,
        purchaseDate: assetForm.purchaseDate,
        purchasePrice: cost,
        salvageValue: parseFloat(assetForm.salvageValue) || 0,
        usefulLifeYears: parseInt(assetForm.usefulLifeYears) || 5,
        depreciationMethod: assetForm.depreciationMethod,
        costAllocation: assetForm.costAllocation,
        status: assetForm.status,
        vendorName: assetForm.vendorName,
        purchaseOrderNumber: assetForm.purchaseOrderNumber,
        vendorBillNumber: assetForm.vendorBillNumber,
        grnNumber: assetForm.grnNumber,
        warrantyExpiryDate: assetForm.warrantyExpiryDate || undefined,
        location: assetForm.location,
        department: assetForm.department,
        workCenterName: assetForm.workCenterName,
        assignedCustodianName: assetForm.assignedCustodianName,
        machineHealth: assetForm.machineHealth,
        currentMeterHours: parseFloat(assetForm.currentMeterHours) || 0,
        totalCapacityUnits: parseFloat(assetForm.totalCapacityUnits) || 0,
        assetAccountId: assetForm.assetAccountId || undefined,
        accumulatedDepreciationAccountId: assetForm.accumulatedDepreciationAccountId || undefined,
        depreciationExpenseAccountId: assetForm.depreciationExpenseAccountId || undefined,
        companyId: activeEntityId || undefined,
      };

      if (editingAsset) {
        await assetsInventoryApi.updateFixedAsset(editingAsset.id, payload);
        notify(`✓ Updated asset ${assetForm.assetTag} - ${assetForm.name}`);
      } else {
        await assetsInventoryApi.createFixedAsset(payload);
        notify(`✓ Capitalized new fixed asset ${assetForm.assetTag}`);
      }

      setIsCreateOpen(false);
      fetchAssets();
    } catch (err: any) {
      setError(err?.message || 'Failed to save fixed asset.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Machine Status Quick Toggle ───────────────────────────────────────────
  const handleToggleMachineHealth = async (asset: FixedAsset, newHealth: string) => {
    try {
      await assetsInventoryApi.updateMachineStatus(asset.id, newHealth, asset.currentMeterHours || 0);
      notify(`✓ Equipment ${asset.assetTag} status changed to ${newHealth}`);
      fetchAssets();
    } catch (err: any) {
      setError(err?.message || 'Failed to update machine health status');
    }
  };

  // ─── Log Maintenance Record ───────────────────────────────────────────────
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceModal) return;
    try {
      await assetsInventoryApi.logMaintenance(maintenanceModal.id, {
        date: maintForm.date,
        maintenanceType: maintForm.maintenanceType as any,
        description: maintForm.description,
        cost: parseFloat(maintForm.cost) || 0,
        technicianName: maintForm.technicianName,
        downTimeHours: parseFloat(maintForm.downTimeHours) || 0,
        partsReplaced: maintForm.partsReplaced,
        nextServiceDueDate: maintForm.nextServiceDueDate || undefined,
      });
      notify(`✓ Maintenance service logged for ${maintenanceModal.assetTag}`);
      setMaintenanceModal(null);
      fetchAssets();
    } catch (err: any) {
      setError(err?.message || 'Failed to log maintenance record');
    }
  };

  // ─── Transfer Asset ────────────────────────────────────────────────────────
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModal) return;
    try {
      await assetsInventoryApi.transferAsset(transferModal.id, {
        transferDate: transferForm.transferDate,
        toLocation: transferForm.toLocation,
        toWorkCenter: transferForm.toWorkCenter,
        authorizedBy: transferForm.authorizedBy,
        remarks: transferForm.remarks,
      });
      notify(`✓ Asset ${transferModal.assetTag} relocated to ${transferForm.toLocation}`);
      setTransferModal(null);
      fetchAssets();
    } catch (err: any) {
      setError(err?.message || 'Failed to transfer asset');
    }
  };

  // ─── Run Depreciation Single & Batch ──────────────────────────────────────
  const handleRunSingleDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deprModal) return;
    setActingId(deprModal.id);
    try {
      await assetsInventoryApi.runDepreciation(deprModal.id, deprForm.expenseAccId, deprForm.accumAccId);
      notify(`✓ Monthly depreciation posted to General Ledger for ${deprModal.name}`);
      setDeprModal(null);
      fetchAssets();
    } catch (err: any) {
      setError(err?.message || 'Failed to post depreciation');
    } finally {
      setActingId(null);
    }
  };

  const handleRunBatchDepreciation = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await assetsInventoryApi.runBatchDepreciation();
      setBatchResults(res.results || []);
      setBatchModalOpen(true);
      notify(res.message || 'Batch depreciation run posted successfully');
      fetchAssets();
    } catch (err: any) {
      setError(err?.message || 'Failed to run batch depreciation');
    } finally {
      setLoading(false);
    }
  };

  // ─── Disposal ─────────────────────────────────────────────────────────────
  const handleDisposeAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposeModal) return;
    setActingId(disposeModal.id);
    try {
      await assetsInventoryApi.disposeAsset(disposeModal.id, {
        disposalDate: disposeForm.disposalDate,
        proceeds: parseFloat(disposeForm.proceeds) || 0,
        cashAccountId: disposeForm.cashAccountId || undefined,
        assetAccountId: disposeForm.assetAccountId || undefined,
        accumDeprAccountId: disposeForm.accumDeprAccountId || undefined,
        gainLossAccountId: disposeForm.gainLossAccountId || undefined,
      });
      notify(`✓ Asset ${disposeModal.name} disposed and gain/loss journal posted.`);
      setDisposeModal(null);
      fetchAssets();
    } catch (err: any) {
      setError(err?.message || 'Failed to dispose asset.');
    } finally {
      setActingId(null);
    }
  };

  // ─── Exports ──────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Fixed Assets & Equipment Register (IAS 16)', 14, 15);
    doc.setFontSize(9);
    doc.text(`Total Assets: ${assets.length} | Capitalized: ${money(totalCost)} | NBV: ${money(totalNBV)} | As of ${new Date().toLocaleDateString()}`, 14, 22);

    const tableData = filteredAssets.map(a => [
      a.assetTag,
      a.name,
      a.category || 'Plant',
      a.workCenterName || a.location || '-',
      a.purchaseDate,
      money(a.purchasePrice || a.cost || 0),
      money(a.accumulatedDepreciation || 0),
      money(a.netBookValue || a.bookValue || ((a.purchasePrice || 0) - (a.accumulatedDepreciation || 0))),
      a.costAllocation === 'ManufacturingOverhead' ? 'Factory MOH' : 'Admin OPEX',
      String(a.machineHealth || a.status || 'Active'),
    ]);

    autoTable(doc, {
      startY: 26,
      head: [['Tag', 'Asset Name', 'Category', 'Work Center / Location', 'Acquired', 'Cost', 'Accum. Depr', 'Net Book Value', 'Allocation', 'Health']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] },
    });

    doc.save(`Fixed_Assets_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportExcel = () => {
    const headers = ['Tag', 'Name', 'Category', 'Work Center', 'Cost', 'Accum. Depr', 'Net Book Value', 'Allocation', 'Status'];
    const rows = filteredAssets.map(a => [
      a.assetTag,
      a.name,
      a.category || '',
      a.workCenterName || a.location || '',
      a.purchasePrice || a.cost || 0,
      a.accumulatedDepreciation || 0,
      a.netBookValue || a.bookValue || ((a.purchasePrice || 0) - (a.accumulatedDepreciation || 0)),
      String(a.costAllocation || 'AdministrativeExpense'),
      String(a.status || 'Active'),
    ]);
    downloadExcel('Fixed_Assets_Schedule', 'Fixed Assets', headers, rows);
  };

  const handleExportCSV = () => {
    const headers = ['AssetTag', 'Name', 'Category', 'WorkCenter', 'Cost', 'AccumulatedDepreciation', 'NetBookValue', 'Allocation', 'Status'];
    const rows = filteredAssets.map(a => [
      a.assetTag,
      a.name,
      a.category || '',
      a.workCenterName || a.location || '',
      a.purchasePrice || a.cost || 0,
      a.accumulatedDepreciation || 0,
      a.netBookValue || a.bookValue || ((a.purchasePrice || 0) - (a.accumulatedDepreciation || 0)),
      String(a.costAllocation || 'AdministrativeExpense'),
      String(a.status || 'Active'),
    ]);
    downloadCSV('Fixed_Assets_Register', headers, rows);
  };

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6 animate-in fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-teal-600 text-white px-4 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-teal-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-teal-500 to-cyan-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Factory className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Fixed Assets & Factory Equipment Hub</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400"><span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" /> Live Ledger</span>
                <span className="hidden md:inline-flex text-[9px] font-mono font-normal px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                  IAS 16 / IFRS 16
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Integrated capital asset register, plant machine runtime health, procurement bridge, and MOH depreciation routing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ExportDropdown
            label="Export Assets"
            onPDF={handleExportPDF}
            onExcel={handleExportExcel}
            onCSV={handleExportCSV}
            onPrint={() => window.print()}
          />
          <button
            onClick={handleRunBatchDepreciation}
            disabled={loading}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Execute monthly depreciation run across all assets"
          >
            <Zap className="w-3.5 h-3.5" /> Batch Depreciation
          </button>
          <button
            onClick={() => openCreateModal()}
            className="primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Capitalize New Asset
          </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={DollarSign} label="Capitalized Cost" value={money(totalCost)} desc={`${assets.length} Total Assets`} tone="blue" />
        <KpiCard icon={TrendingDown} label="Accum. Depreciation" value={money(totalAccumDepr)} desc="Contra-Asset Balance" tone="amber" />
        <KpiCard icon={Building} label="Net Book Value (NBV)" value={money(totalNBV)} desc="Carrying Value" tone="teal" />
        <KpiCard icon={Cpu} label="Factory Machinery" value={plantMachineryCount} desc="MOH Cost Centers" tone="purple" />
        <KpiCard icon={Wrench} label="Under Maintenance" value={underMaintenanceCount} desc="Service Tickets" tone="rose" />
        <KpiCard icon={ShoppingCart} label="Procurement Pending" value={uncapitalizedProcurementLines.length} desc="Capital Goods Lines" tone="emerald" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-[var(--color-surface-muted)] p-2 rounded-2xl border border-[var(--color-border)]">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'register', label: '🏢 Asset Register & Schedule', count: assets.length },
            { id: 'factory', label: '🏭 Factory & Machine Health', count: plantMachineryCount },
            { id: 'procurement', label: '🛒 Procurement Integration Bridge', count: uncapitalizedProcurementLines.length },
            { id: 'maintenance', label: '🔧 Maintenance & Service Logs', count: underMaintenanceCount },
            { id: 'depreciation', label: '⚡ Depreciation Engine' },
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

        <button
          onClick={fetchAssets}
          className="p-2 border border-[var(--color-border)] rounded-xl text-xs hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-pointer"
          title="Refresh Assets"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ─── TAB 1: ASSET REGISTER & SCHEDULE ─────────────────────────────────── */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search tag, asset name, serial number, work center, vendor..."
                className="w-full pl-9 pr-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text)] outline-none focus:border-teal-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text)] outline-none focus:border-teal-500 font-semibold"
            >
              <option value="All">All Categories</option>
              {ASSET_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text)] outline-none focus:border-teal-500 font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Operating</option>
              <option value="UnderMaintenance">Under Maintenance</option>
              <option value="FullyDepreciated">Fully Depreciated</option>
              <option value="Disposed">Disposed / Sold</option>
            </select>

            <select
              value={allocationFilter}
              onChange={e => setAllocationFilter(e.target.value as any)}
              className="px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text)] outline-none focus:border-teal-500 font-semibold"
            >
              <option value="All">All Allocations</option>
              <option value="FactoryMOH">🏭 Factory MOH</option>
              <option value="Admin">🏢 Admin OPEX</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-teal-500/[0.05] dark:bg-teal-400/[0.07] border-b border-[var(--color-border)] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Asset Tag & Name</th>
                    <th className="py-3 px-3">Category & Location</th>
                    <th className="py-3 px-3">Acquired</th>
                    <th className="py-3 px-3 text-right">Capitalized Cost</th>
                    <th className="py-3 px-3 text-right">Accum. Depr</th>
                    <th className="py-3 px-3 text-right">Net Book Value</th>
                    <th className="py-3 px-3 text-center">Cost Allocation</th>
                    <th className="py-3 px-3 text-center">Health & Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState icon={Building} title="No fixed assets found" hint="Adjust the search, category, status, or allocation filters to locate capital assets." />
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map(asset => {
                      const cost = asset.purchasePrice || asset.cost || 0;
                      const accum = asset.accumulatedDepreciation || 0;
                      const nbv = asset.netBookValue || asset.bookValue || (cost - accum);
                      const isDisposed = asset.status === 'Disposed' || String(asset.status) === '1';

                      return (
                        <tr key={asset.id} className="hover:bg-[var(--color-surface-muted)]/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="p-2 bg-teal-50 dark:bg-teal-950/50 text-teal-600 rounded-xl font-mono text-[10px] font-bold shrink-0">
                                <QrCode className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <p className="font-bold text-[var(--color-text-strong)]">{asset.name}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-mono font-semibold">
                                  {asset.assetTag} {asset.serialNumber ? `• S/N: ${asset.serialNumber}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-semibold text-[var(--color-text-strong)]">{asset.category || 'Plant & Machinery'}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[180px]">
                              {asset.workCenterName || asset.location || 'Main Factory Floor'}
                            </p>
                          </td>

                          <td className="py-3 px-3 text-[var(--color-text-muted)] font-mono">
                            {asset.purchaseDate}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-[var(--color-text-strong)]">
                            {money(cost)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-amber-600">
                            {money(accum)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-teal-600">
                            {money(nbv)}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              asset.costAllocation === 'ManufacturingOverhead'
                                ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}>
                              {asset.costAllocation === 'ManufacturingOverhead' ? '🏭 Factory MOH' : '🏢 Admin OPEX'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isDisposed
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                : asset.machineHealth === 'Breakdown'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 animate-pulse'
                                : asset.machineHealth === 'UnderMaintenance'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {isDisposed ? 'Disposed' : asset.machineHealth || asset.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setDetailModal(asset)}
                                className="p-1.5 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-teal-600 rounded-lg transition-colors cursor-pointer"
                                title="View Asset Card & Maintenance Logs"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditModal(asset)}
                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                title="Edit Asset Properties"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setMaintenanceModal(asset);
                                  setMaintForm({
                                    date: new Date().toISOString().slice(0, 10),
                                    maintenanceType: 'Preventive',
                                    description: '',
                                    cost: '0',
                                    technicianName: '',
                                    downTimeHours: '0',
                                    partsReplaced: '',
                                    nextServiceDueDate: '',
                                  });
                                }}
                                className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-600 rounded-lg transition-colors cursor-pointer"
                                title="Log Maintenance Ticket"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setTransferModal(asset);
                                  setTransferForm({
                                    transferDate: new Date().toISOString().slice(0, 10),
                                    toLocation: '',
                                    toWorkCenter: FACTORY_WORK_CENTERS[0],
                                    authorizedBy: '',
                                    remarks: '',
                                  });
                                }}
                                className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-purple-600 rounded-lg transition-colors cursor-pointer"
                                title="Transfer to another Factory Work Center"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>
                              {!isDisposed && (
                                <button
                                  onClick={() => {
                                    setDeprModal(asset);
                                    setDeprForm({
                                      expenseAccId: asset.depreciationExpenseAccountId || '',
                                      accumAccId: asset.accumulatedDepreciationAccountId || '',
                                    });
                                  }}
                                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                  title="Run Monthly Depreciation"
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!isDisposed && (
                                <button
                                  onClick={() => {
                                    setDisposeModal(asset);
                                    setDisposeForm({
                                      disposalDate: new Date().toISOString().slice(0, 10),
                                      proceeds: '0',
                                      cashAccountId: accounts.find(a => a.code === '11100' || a.code === '11200')?.id || '',
                                      assetAccountId: asset.assetAccountId || '',
                                      accumDeprAccountId: asset.accumulatedDepreciationAccountId || '',
                                      gainLossAccountId: accounts.find(a => a.name?.toLowerCase().includes('gain/loss') || a.code === '51000')?.id || '',
                                    });
                                  }}
                                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Dispose / Sell Asset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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
        </div>
      )}

      {/* ─── TAB 2: FACTORY & MACHINERY CENTER ─────────────────────────────────── */}
      {activeTab === 'factory' && (
        <div className="space-y-4">
          <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-2xl border border-teal-200 dark:border-teal-900/60 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-sm text-teal-900 dark:text-teal-200 flex items-center gap-2">
                <Factory className="w-4 h-4 text-teal-600" /> Plant Equipment & Production Work Centers
              </h3>
              <p className="text-xs text-teal-700 dark:text-teal-400 mt-0.5">
                Real-time machine health, runtime meter hours, and overhead cost allocation into Manufacturing Work Orders.
              </p>
            </div>
            <button
              onClick={() => openCreateModal({ category: 'Plant & Machinery', costAllocation: 'ManufacturingOverhead' })}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Register Factory Machine
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.filter(a => a.category?.includes('Plant') || a.category?.includes('Machinery') || a.costAllocation === 'ManufacturingOverhead').map(machine => {
              const cost = machine.purchasePrice || machine.cost || 0;
              const accum = machine.accumulatedDepreciation || 0;
              const nbv = machine.netBookValue || machine.bookValue || (cost - accum);

              return (
                <div key={machine.id} className="p-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-mono font-bold text-teal-600">{machine.assetTag}</p>
                      <h4 className="font-bold text-sm text-[var(--color-text-strong)]">{machine.name}</h4>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{machine.workCenterName || 'CNC Workshop'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 ${
                      machine.machineHealth === 'Breakdown'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : machine.machineHealth === 'UnderMaintenance'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      <Activity className="w-3 h-3" />
                      {machine.machineHealth || 'Operating'}
                    </span>
                  </div>

                  {/* Machine Metrics */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-[var(--color-border)] text-center text-xs">
                    <div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Meter Hours</p>
                      <p className="font-mono font-bold text-[var(--color-text-strong)] flex items-center justify-center gap-1">
                        <Gauge className="w-3 h-3 text-blue-600" />
                        {machine.currentMeterHours || 0} hrs
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Net Book Value</p>
                      <p className="font-mono font-bold text-teal-600">
                        {money(nbv)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Useful Life</p>
                      <p className="font-mono font-bold text-[var(--color-text-strong)]">{machine.usefulLifeYears} Yrs</p>
                    </div>
                  </div>

                  {/* Quick Machine Health Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">Live Machine Status:</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleMachineHealth(machine, 'Operating')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          machine.machineHealth === 'Operating'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-emerald-50'
                        }`}
                      >
                        🟢 Running
                      </button>
                      <button
                        onClick={() => handleToggleMachineHealth(machine, 'UnderMaintenance')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          machine.machineHealth === 'UnderMaintenance'
                            ? 'bg-amber-600 text-white'
                            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-amber-50'
                        }`}
                      >
                        🟡 Service
                      </button>
                      <button
                        onClick={() => handleToggleMachineHealth(machine, 'Breakdown')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          machine.machineHealth === 'Breakdown'
                            ? 'bg-rose-600 text-white'
                            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-rose-50'
                        }`}
                      >
                        🔴 Down
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: PROCUREMENT INTEGRATION BRIDGE ───────────────────────────── */}
      {activeTab === 'procurement' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" /> Procurement Integration Bridge (Capital Goods Ingestion)
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Detects capital machinery & equipment line items from Purchase Orders and Vendor Bills for 1-click capitalization.
              </p>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-teal-500/[0.05] dark:bg-teal-400/[0.07] border-b border-[var(--color-border)] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Document Type & Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Vendor / Supplier</th>
                  <th className="py-3 px-3">Item Description</th>
                  <th className="py-3 px-3 text-right">Procured Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {uncapitalizedProcurementLines.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={Check} title="Procurement bridge fully capitalized" hint="All capital equipment purchase orders and bills are capitalized." />
                    </td>
                  </tr>
                ) : (
                  uncapitalizedProcurementLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-[var(--color-surface-muted)]/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--color-text-strong)] flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 rounded-lg text-[10px]">
                          {line.source}
                        </span>
                        {line.docNumber}
                      </td>
                      <td className="py-3 px-3 text-[var(--color-text-muted)] font-mono">{line.date}</td>
                      <td className="py-3 px-3 font-semibold text-[var(--color-text-strong)]">{line.vendorName}</td>
                      <td className="py-3 px-3 text-[var(--color-text-muted)]">{line.description}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">{money(line.amount)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            openCreateModal({
                              name: line.description,
                              description: `Procured via ${line.source} ${line.docNumber}`,
                              purchasePrice: String(line.amount),
                              purchaseDate: line.date,
                              vendorName: line.vendorName,
                              purchaseOrderNumber: line.source === 'Purchase Order' ? line.docNumber : undefined,
                              vendorBillNumber: line.source === 'Vendor Bill' ? line.docNumber : undefined,
                            });
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 ml-auto shadow-2xs cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> Capitalize as Asset
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: MAINTENANCE & SERVICE SCHEDULE ───────────────────────────── */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" /> Equipment Maintenance & Calibration Schedules
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Preventive servicing, emergency breakdown repairs, technician assignments, and overhaul records.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.filter(a => a.maintenanceHistory && a.maintenanceHistory.length > 0).map(asset => (
              <div key={asset.id} className="p-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                  <div>
                    <h4 className="font-bold text-xs text-[var(--color-text-strong)]">{asset.name}</h4>
                    <p className="text-[10px] text-teal-600 font-mono font-bold">{asset.assetTag} • {asset.workCenterName}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMaintenanceModal(asset);
                      setMaintForm({
                        date: new Date().toISOString().slice(0, 10),
                        maintenanceType: 'Preventive',
                        description: '',
                        cost: '0',
                        technicianName: '',
                        downTimeHours: '0',
                        partsReplaced: '',
                        nextServiceDueDate: '',
                      });
                    }}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Log Service
                  </button>
                </div>

                <div className="space-y-2">
                  {asset.maintenanceHistory?.map((m, idx) => (
                    <div key={idx} className="p-2.5 bg-[var(--color-surface-muted)]/50 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-700 dark:text-amber-300 font-mono text-[11px]">{m.maintenanceType}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{m.date}</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-strong)]">{m.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]/50 font-mono">
                        <span>Technician: <strong>{m.technicianName || 'Internal Team'}</strong></span>
                        <span>Cost: <strong>{money(m.cost)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 5: DEPRECIATION ENGINE ──────────────────────────────────────── */}
      {activeTab === 'depreciation' && (
        <div className="space-y-4">
          <div className="p-5 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" /> Automated Monthly Depreciation Engine
              </h3>
              <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-1 max-w-xl">
                Executes Straight-Line & Declining-Balance depreciation schedules. Automatically routes Plant Machinery wear & tear to <strong>Manufacturing Overhead (61100)</strong> and Office Assets to <strong>Administrative Depreciation (61300)</strong>.
              </p>
            </div>
            <button
              onClick={handleRunBatchDepreciation}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4" /> Run Monthly Depreciation Now
            </button>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden p-4 space-y-3">
            <h4 className="font-bold text-xs text-[var(--color-text-strong)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" /> Live Asset Depreciation Projections
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-teal-500/[0.05] dark:bg-teal-400/[0.07] text-[var(--color-text-muted)] text-[10px] uppercase">
                    <th className="py-2.5 px-3">Asset Tag & Name</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Allocation</th>
                    <th className="py-2.5 px-3 text-right">Cost</th>
                    <th className="py-2.5 px-3 text-right">Monthly Charge</th>
                    <th className="py-2.5 px-3 text-right">Projected NBV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {assets.filter(a => a.status === 'Active' || String(a.status) === '0').map(asset => {
                    const cost = asset.purchasePrice || asset.cost || 0;
                    const accum = asset.accumulatedDepreciation || 0;
                    const annual = (cost - (asset.salvageValue || 0)) / (asset.usefulLifeYears || 5);
                    const monthly = Math.round(annual / 12);
                    const currentNbv = asset.netBookValue || asset.bookValue || (cost - accum);
                    const projectedNbv = Math.max(0, currentNbv - monthly);

                    return (
                      <tr key={asset.id} className="hover:bg-[var(--color-surface-muted)]/30">
                        <td className="py-2 px-3 font-semibold text-[var(--color-text-strong)]">{asset.assetTag} — {asset.name}</td>
                        <td className="py-2 px-3 font-mono">{asset.depreciationMethod || 'StraightLine'}</td>
                        <td className="py-2 px-3 font-mono text-[10px]">{asset.costAllocation === 'ManufacturingOverhead' ? '🏭 Factory MOH (61100)' : '🏢 Admin OPEX (61300)'}</td>
                        <td className="py-2 px-3 text-right font-mono">{money(cost)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">{money(monthly)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-teal-600">{money(projectedNbv)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT FIXED ASSET ─────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider font-mono">
                  {editingAsset ? 'Edit Capital Ledger' : 'Capital Asset Ingestion (IAS 16)'}
                </p>
                <h3 className="text-lg font-bold text-[var(--color-text-strong)]">
                  {editingAsset ? `Edit Asset: ${editingAsset.name}` : 'Register / Capitalize Fixed Asset'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveAsset} className="space-y-4 text-xs">
              {/* Row 1: Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Asset Tag #</label>
                  <input
                    required
                    value={assetForm.assetTag}
                    onChange={e => setAssetForm(f => ({ ...f, assetTag: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono font-bold text-teal-700 dark:text-teal-300"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Asset Name / Title</label>
                  <input
                    required
                    value={assetForm.name}
                    onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. 5-Axis CNC Milling Machine Model X"
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-semibold text-[var(--color-text)]"
                  />
                </div>
              </div>

              {/* Row 2: Category & Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Category</label>
                  <select
                    value={assetForm.category}
                    onChange={e => setAssetForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none"
                  >
                    {ASSET_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Serial Number</label>
                  <input
                    value={assetForm.serialNumber}
                    onChange={e => setAssetForm(f => ({ ...f, serialNumber: e.target.value }))}
                    placeholder="e.g. SN-993821-K"
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Manufacturer / Brand</label>
                  <input
                    value={assetForm.manufacturer}
                    onChange={e => setAssetForm(f => ({ ...f, manufacturer: e.target.value }))}
                    placeholder="e.g. Haas Automation / Caterpillar"
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Financials */}
              <div className="p-3 bg-teal-50/40 dark:bg-teal-950/20 rounded-xl border border-teal-200/60 dark:border-teal-900/40 space-y-3">
                <h4 className="font-bold text-xs text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                  💰 Financial Valuation & Depreciation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[var(--color-text-strong)]">Capitalized Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={assetForm.purchasePrice}
                      onChange={e => setAssetForm(f => ({ ...f, purchasePrice: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none font-mono font-bold text-teal-700 dark:text-teal-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[var(--color-text-strong)]">Acquisition Date</label>
                    <input
                      type="date"
                      required
                      value={assetForm.purchaseDate}
                      onChange={e => setAssetForm(f => ({ ...f, purchaseDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[var(--color-text-strong)]">Useful Life (Years)</label>
                    <input
                      type="number"
                      required
                      value={assetForm.usefulLifeYears}
                      onChange={e => setAssetForm(f => ({ ...f, usefulLifeYears: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[var(--color-text-strong)]">Cost Allocation</label>
                    <select
                      value={assetForm.costAllocation}
                      onChange={e => setAssetForm(f => ({ ...f, costAllocation: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none font-semibold text-purple-700 dark:text-purple-300"
                    >
                      <option value="AdministrativeExpense">🏢 Administrative OPEX (61300)</option>
                      <option value="ManufacturingOverhead">🏭 Factory MOH (61100)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 4: Factory Assignment */}
              <div className="p-3 bg-[var(--color-surface-muted)]/50 rounded-xl border border-[var(--color-border)] space-y-3">
                <h4 className="font-bold text-xs text-[var(--color-text-strong)] uppercase tracking-wider flex items-center gap-1.5">
                  <Factory className="w-3.5 h-3.5 text-teal-600" /> Factory Location & Work Center
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[var(--color-text-strong)]">Factory Work Center</label>
                    <select
                      value={assetForm.workCenterName}
                      onChange={e => setAssetForm(f => ({ ...f, workCenterName: e.target.value }))}
                      className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none"
                    >
                      {FACTORY_WORK_CENTERS.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[var(--color-text-strong)]">Physical Location / Bay</label>
                    <input
                      value={assetForm.location}
                      onChange={e => setAssetForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Bay 4 - Plant A"
                      className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[var(--color-text-strong)]">Assigned Custodian / Operator</label>
                    <input
                      value={assetForm.assignedCustodianName}
                      onChange={e => setAssetForm(f => ({ ...f, assignedCustodianName: e.target.value }))}
                      placeholder="e.g. Lead Machinist / John Doe"
                      className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Procurement Bridge Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Vendor / Supplier</label>
                  <input
                    value={assetForm.vendorName}
                    onChange={e => setAssetForm(f => ({ ...f, vendorName: e.target.value }))}
                    placeholder="e.g. Machinery Supply Corp"
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Purchase Order / Bill #</label>
                  <input
                    value={assetForm.purchaseOrderNumber || assetForm.vendorBillNumber}
                    onChange={e => setAssetForm(f => ({ ...f, purchaseOrderNumber: e.target.value }))}
                    placeholder="e.g. PO-2026-0042"
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Warranty Expiry Date</label>
                  <input
                    type="date"
                    value={assetForm.warrantyExpiryDate}
                    onChange={e => setAssetForm(f => ({ ...f, warrantyExpiryDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-xl font-semibold hover:bg-[var(--color-surface-muted)] text-[var(--color-text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {loading ? 'Saving...' : editingAsset ? 'Update Asset' : 'Capitalize Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: MAINTENANCE LOGGING ─────────────────────────────────────── */}
      {maintenanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <p className="text-[10px] font-mono font-bold text-amber-600">{maintenanceModal.assetTag}</p>
                <h3 className="text-base font-bold text-[var(--color-text-strong)]">Log Service & Repair</h3>
              </div>
              <button onClick={() => setMaintenanceModal(null)} className="text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Date</label>
                  <input
                    type="date"
                    required
                    value={maintForm.date}
                    onChange={e => setMaintForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Maintenance Type</label>
                  <select
                    value={maintForm.maintenanceType}
                    onChange={e => setMaintForm(f => ({ ...f, maintenanceType: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-semibold"
                  >
                    <option value="Preventive">Preventive Service</option>
                    <option value="BreakdownRepair">Breakdown Repair</option>
                    <option value="Calibration">Calibration & Inspection</option>
                    <option value="Overhaul">Major Overhaul</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--color-text-strong)]">Work Performed</label>
                <textarea
                  required
                  value={maintForm.description}
                  onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Replaced hydraulic seal, calibrated spindle alignment"
                  className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Repair Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={maintForm.cost}
                    onChange={e => setMaintForm(f => ({ ...f, cost: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Technician Name</label>
                  <input
                    value={maintForm.technicianName}
                    onChange={e => setMaintForm(f => ({ ...f, technicianName: e.target.value }))}
                    placeholder="e.g. Master Tech Alex"
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Downtime (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={maintForm.downTimeHours}
                    onChange={e => setMaintForm(f => ({ ...f, downTimeHours: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--color-text-strong)]">Next Service Due Date</label>
                  <input
                    type="date"
                    value={maintForm.nextServiceDueDate}
                    onChange={e => setMaintForm(f => ({ ...f, nextServiceDueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setMaintenanceModal(null)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Save Service Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ASSET TRANSFER ───────────────────────────────────────────── */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <p className="text-[10px] font-mono font-bold text-purple-600">{transferModal.assetTag}</p>
                <h3 className="text-base font-bold text-[var(--color-text-strong)]">Transfer Equipment Location</h3>
              </div>
              <button onClick={() => setTransferModal(null)} className="text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--color-text-strong)]">Transfer Date</label>
                <input
                  type="date"
                  required
                  value={transferForm.transferDate}
                  onChange={e => setTransferForm(f => ({ ...f, transferDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--color-text-strong)]">Target Factory Work Center</label>
                <select
                  value={transferForm.toWorkCenter}
                  onChange={e => setTransferForm(f => ({ ...f, toWorkCenter: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-semibold"
                >
                  {FACTORY_WORK_CENTERS.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--color-text-strong)]">Destination Plant / Location</label>
                <input
                  required
                  value={transferForm.toLocation}
                  onChange={e => setTransferForm(f => ({ ...f, toLocation: e.target.value }))}
                  placeholder="e.g. Plant B - Assembly Workshop 2"
                  className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--color-text-strong)]">Authorized By</label>
                <input
                  value={transferForm.authorizedBy}
                  onChange={e => setTransferForm(f => ({ ...f, authorizedBy: e.target.value }))}
                  placeholder="e.g. Operations Director"
                  className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setTransferModal(null)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: SINGLE DEPRECIATION ───────────────────────────────────────── */}
      {deprModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <p className="text-[10px] font-mono font-bold text-indigo-600">{deprModal.assetTag}</p>
                <h3 className="text-base font-bold text-[var(--color-text-strong)]">Post Monthly Depreciation</h3>
              </div>
              <button onClick={() => setDeprModal(null)} className="text-lg cursor-pointer">✕</button>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-xs space-y-1 text-indigo-800 dark:text-indigo-300 font-mono">
              <p>Asset: <strong>{deprModal.name}</strong></p>
              <p>Cost: <strong>{money(deprModal.purchasePrice || deprModal.cost || 0)}</strong></p>
              <p>Net Book Value: <strong>{money(deprModal.netBookValue || deprModal.bookValue || ((deprModal.purchasePrice || 0) - (deprModal.accumulatedDepreciation || 0)))}</strong></p>
              <p>Cost Allocation: <strong>{deprModal.costAllocation === 'ManufacturingOverhead' ? '🏭 Factory MOH (61100)' : '🏢 Admin OPEX (61300)'}</strong></p>
            </div>

            <form onSubmit={handleRunSingleDepreciation} className="space-y-3 text-xs">
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setDeprModal(null)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actingId === deprModal.id}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actingId === deprModal.id ? 'Posting...' : 'Post Depreciation Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DISPOSAL ─────────────────────────────────────────────────── */}
      {disposeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <p className="text-[10px] font-mono font-bold text-rose-600">{disposeModal.assetTag}</p>
                <h3 className="text-base font-bold text-[var(--color-text-strong)]">Dispose / Sell Fixed Asset</h3>
              </div>
              <button onClick={() => setDisposeModal(null)} className="text-lg cursor-pointer">✕</button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-xs space-y-1 text-amber-800 dark:text-amber-300">
              <p>Cost: <strong>{money(disposeModal.purchasePrice || disposeModal.cost || 0)}</strong></p>
              <p>Accumulated Depr: <strong>{money(disposeModal.accumulatedDepreciation || 0)}</strong></p>
              <p>Carrying NBV: <strong>{money(disposeModal.netBookValue || disposeModal.bookValue || ((disposeModal.purchasePrice || 0) - (disposeModal.accumulatedDepreciation || 0)))}</strong></p>
            </div>

            <form onSubmit={handleDisposeAsset} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--color-text-strong)]">Disposal Date</label>
                <input
                  type="date"
                  required
                  value={disposeForm.disposalDate}
                  onChange={e => setDisposeForm(f => ({ ...f, disposalDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--color-text-strong)]">Proceeds / Sale Price</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={disposeForm.proceeds}
                  onChange={e => setDisposeForm(f => ({ ...f, proceeds: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none font-mono font-bold text-teal-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setDisposeModal(null)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actingId === disposeModal.id}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actingId === disposeModal.id ? 'Processing...' : 'Confirm Disposal & Post Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: BATCH DEPRECIATION RESULTS ─────────────────────────────────── */}
      {batchModalOpen && batchResults && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-text-strong)] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-600" /> Batch Depreciation Execution Summary
              </h3>
              <button onClick={() => setBatchModalOpen(false)} className="text-lg cursor-pointer">✕</button>
            </div>

            <div className="divide-y divide-[var(--color-border)] text-xs">
              {batchResults.map((r, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[var(--color-text-strong)]">{r.assetTag} — {r.assetName}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-mono">GL Expense Code: {r.expenseAccountCode || '61300'}</p>
                  </div>
                  <div className="text-right font-mono">
                    <p className="font-bold text-amber-600">{money(r.amountPosted)}</p>
                    <p className="text-[10px] text-teal-600 font-semibold">New NBV: {money(r.netBookValue)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
              <button
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ASSET DETAILS DRAWER ─────────────────────────────────────── */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div>
                <p className="text-[10px] font-mono font-bold text-teal-600">{detailModal.assetTag}</p>
                <h3 className="text-base font-bold text-[var(--color-text-strong)]">{detailModal.name}</h3>
              </div>
              <button onClick={() => setDetailModal(null)} className="text-lg cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-[var(--color-surface-muted)]/50 rounded-xl">
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)]">Cost Allocation</p>
                <p className="font-bold text-[var(--color-text-strong)]">{detailModal.costAllocation === 'ManufacturingOverhead' ? '🏭 Factory MOH (61100)' : '🏢 Admin OPEX (61300)'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)]">Work Center</p>
                <p className="font-bold text-[var(--color-text-strong)]">{detailModal.workCenterName || 'Main Factory Floor'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)]">Capitalized Cost</p>
                <p className="font-bold text-[var(--color-text-strong)] font-mono">{money(detailModal.purchasePrice || detailModal.cost || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)]">Net Book Value</p>
                <p className="font-bold text-teal-600 font-mono">{money(detailModal.netBookValue || detailModal.bookValue || ((detailModal.purchasePrice || 0) - (detailModal.accumulatedDepreciation || 0)))}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)]">Vendor</p>
                <p className="font-semibold text-[var(--color-text-strong)]">{detailModal.vendorName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)]">Warranty Until</p>
                <p className="font-mono text-[var(--color-text-strong)]">{detailModal.warrantyExpiryDate || 'N/A'}</p>
              </div>
            </div>

            {/* Maintenance History */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[var(--color-text-strong)] flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-600" /> Maintenance & Repair Records
              </h4>
              {(!detailModal.maintenanceHistory || detailModal.maintenanceHistory.length === 0) ? (
                <p className="text-[11px] text-[var(--color-text-muted)]">No maintenance history recorded for this asset.</p>
              ) : (
                detailModal.maintenanceHistory.map((m, idx) => (
                  <div key={idx} className="p-2 border border-[var(--color-border)] rounded-lg space-y-0.5">
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="font-bold text-amber-600">{m.maintenanceType}</span>
                      <span className="text-[var(--color-text-muted)]">{m.date}</span>
                    </div>
                    <p className="text-[11px]">{m.description}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
              <button
                onClick={() => setDetailModal(null)}
                className="px-4 py-2 border border-[var(--color-border)] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedAssets;