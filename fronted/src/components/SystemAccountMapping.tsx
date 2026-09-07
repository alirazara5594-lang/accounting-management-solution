import React, { useState, useEffect, useMemo } from 'react';
import { useCoaStore } from '../stores';
import {
  Save, RefreshCw, HelpCircle,
  TrendingUp, ShoppingCart, Package, Building2, Users, Globe,
  Lock, Percent, BookOpen, CheckCircle2, Scale, Layers
} from 'lucide-react';
import { KpiCard, KpiGrid } from './ui/kpi-card';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype?: string;
  parentId?: string;
  currency?: string;
  description?: string;
  isSystem?: boolean;
}

interface SystemAccountMappingProps {
  accounts: Account[];
  close: () => void;
  notify?: (msg: string) => void;
}

export const SystemAccountMapping: React.FC<SystemAccountMappingProps> = ({ accounts, close, notify }) => {
  const fetchMappings = useCoaStore(s => s.fetchMappings);
  const saveMapping = useCoaStore(s => s.saveMapping);

  const [activeCategory, setActiveCategory] = useState<'all' | 'taxes' | 'sales' | 'purchases' | 'inventory' | 'assets' | 'payroll' | 'intercompany'>('all');
  const [saving, setSaving] = useState(false);

  const [mappings, setMappings] = useState<Record<string, string>>({
    // Sales & AR
    arAccountId: '',
    revenueAccountId: '',
    serviceRevenueAccountId: '',
    discountAccountId: '',
    salesReturnsAccountId: '',
    allowanceAccountId: '',
    deferredRevenueAccountId: '',

    // Purchases & AP
    apAccountId: '',
    purchasesAccountId: '',
    purchaseDiscountsAccountId: '',
    purchaseReturnsAccountId: '',
    grniAccrualAccountId: '',
    prepaidAccountId: '',

    // Global Tax Engine (Sales, Expenses, Inventory, Fixed Assets, Corporate, RCM)
    salesTaxAccountId: '',
    expenseInputTaxAccountId: '',
    nonRecoverableTaxAccountId: '',
    inventoryImportTaxAccountId: '',
    importTaxPayableAccountId: '',
    capitalGoodsTaxAccountId: '',
    assetDisposalTaxAccountId: '',
    whtReceivableAccountId: '',
    whtPayableAccountId: '',
    corporateTaxExpenseAccountId: '',
    corporateTaxPayableAccountId: '',
    deferredTaxAssetAccountId: '',
    deferredTaxLiabilityAccountId: '',
    rcmOutputTaxAccountId: '',
    rcmInputTaxAccountId: '',

    // Inventory & Manufacturing
    cogsAccountId: '',
    inventoryAccountId: '',
    rawMaterialsAccountId: '',
    workInProgressAccountId: '',
    finishedGoodsAccountId: '',
    directLaborAccountId: '',
    manufacturingOverheadAccountId: '',

    // Fixed Assets & Leases
    fixedAssetAccountId: '',
    accumulatedDepreciationAccountId: '',
    depreciationExpenseAccountId: '',
    gainLossDisposalAccountId: '',
    rouAssetAccountId: '',
    leaseLiabilityAccountId: '',
    interestExpenseAccountId: '',

    // Payroll & HR
    payrollExpenseAccountId: '',
    employerContribExpenseAccountId: '',
    payrollPayableAccountId: '',
    payrollTaxPayableAccountId: '',
    eobiPayableAccountId: '',
    pensionPayableAccountId: '',

    // Intercompany & Overhead
    icReceivableAccountId: '',
    icClearingAccountId: '',
    icAllocationExpenseId: '',
    overheadAllocationExpenseId: '',
    overheadAllocationPayableId: '',
  });

  useEffect(() => {
    const load = async () => {
      const activeMappings = await fetchMappings();
      const getAccId = (key: string, defaultCode: string) => {
        const found = activeMappings.find(m => m.mappingKey === key);
        if (found?.accountId) return found.accountId;
        const seed = accounts.find(a => a.code === defaultCode);
        return seed?.id || '';
      };

      setMappings({
        // Sales & AR
        arAccountId: getAccId('Customer Receivables', '12000'),
        revenueAccountId: getAccId('Sales', '41100') || getAccId('Product Sales Revenue', '41100'),
        serviceRevenueAccountId: getAccId('Service Revenue', '41200'),
        discountAccountId: getAccId('Sales Discount', '41300'),
        salesReturnsAccountId: getAccId('Sales Returns', '41400'),
        allowanceAccountId: getAccId('Allowance for Doubtful Accounts', '12100'),
        deferredRevenueAccountId: getAccId('Deferred Revenue', '23000'),

        // Purchases & AP
        apAccountId: getAccId('Vendor Payables', '21100'),
        purchasesAccountId: getAccId('Purchases', '61100'),
        purchaseDiscountsAccountId: getAccId('Purchase Discounts', '51100'),
        purchaseReturnsAccountId: getAccId('Purchase Returns', '51200'),
        grniAccrualAccountId: getAccId('GRNI Accrual', '21200'),
        prepaidAccountId: getAccId('Prepaid Expenses', '14000'),

        // Comprehensive Global Tax Engine
        salesTaxAccountId: getAccId('Sales Tax / Output VAT Payable', '22000') || getAccId('Taxes', '22000'),
        expenseInputTaxAccountId: getAccId('Purchase Input VAT / Recoverable Tax', '14100') || getAccId('Input Tax', '14100'),
        nonRecoverableTaxAccountId: getAccId('Non-Recoverable Purchase Tax & Duty Expense', '61700'),
        inventoryImportTaxAccountId: getAccId('Import VAT & Customs Duty Tax Clearing', '14120'),
        importTaxPayableAccountId: getAccId('Import VAT Payable', '22030'),
        capitalGoodsTaxAccountId: getAccId('Capital Goods Input VAT (Fixed Assets)', '14130'),
        assetDisposalTaxAccountId: getAccId('Fixed Asset Disposal Output Tax Payable', '22040'),
        whtReceivableAccountId: getAccId('Withholding Tax Receivable (Advance Tax)', '12200') || getAccId('WHT Receivable', '12200'),
        whtPayableAccountId: getAccId('Withholding Tax (WHT) Payable on Vendors', '22100') || getAccId('WHT Payable', '22100'),
        corporateTaxExpenseAccountId: getAccId('Corporate Income Tax Provision Expense', '61800'),
        corporateTaxPayableAccountId: getAccId('Corporate Income Tax Payable', '22200'),
        deferredTaxAssetAccountId: getAccId('Deferred Tax Asset', '15300'),
        deferredTaxLiabilityAccountId: getAccId('Deferred Tax Liability', '25200'),
        rcmOutputTaxAccountId: getAccId('Reverse Charge Mechanism (RCM) Output Tax Payable', '22050'),
        rcmInputTaxAccountId: getAccId('Reverse Charge Mechanism (RCM) Input Tax', '14150'),

        // Inventory & Manufacturing
        cogsAccountId: getAccId('Cost of Goods Sold', '51000'),
        inventoryAccountId: getAccId('Inventory', '13000'),
        rawMaterialsAccountId: getAccId('Raw Materials Inventory', '13000'),
        workInProgressAccountId: getAccId('Work in Progress', '13000'),
        finishedGoodsAccountId: getAccId('Finished Goods Inventory', '13000'),
        directLaborAccountId: getAccId('Direct Labor', '61200'),
        manufacturingOverheadAccountId: getAccId('Manufacturing Overhead', '61100'),

        // Fixed Assets & Leases
        fixedAssetAccountId: getAccId('Fixed Assets', '15100'),
        accumulatedDepreciationAccountId: getAccId('Accumulated Depreciation', '15200'),
        depreciationExpenseAccountId: getAccId('Depreciation Expense', '61300'),
        gainLossDisposalAccountId: getAccId('Gain/Loss on Disposal', '51000'),
        rouAssetAccountId: getAccId('Right of Use Asset', '15110'),
        leaseLiabilityAccountId: getAccId('Lease Liability', '21600'),
        interestExpenseAccountId: getAccId('Interest Expense', '61400'),

        // Payroll & HR
        payrollExpenseAccountId: getAccId('Payroll Expense', '61200'),
        employerContribExpenseAccountId: getAccId('Employer Payroll Contributions Expense', '61250') || getAccId('Payroll Expense', '61200'),
        payrollPayableAccountId: getAccId('Accrued Salaries', '21300'),
        payrollTaxPayableAccountId: getAccId('Payroll Taxes Accrued', '21400'),
        eobiPayableAccountId: getAccId('EOBI & Social Security Accrued', '21500') || getAccId('Pension Fund Accrued', '21500'),
        pensionPayableAccountId: getAccId('Provident Fund Accrued', '21510') || getAccId('Pension Fund Accrued', '21500'),

        // Intercompany & Allocations
        icReceivableAccountId: getAccId('Intercompany Receivable', '12300'),
        icClearingAccountId: getAccId('Intercompany Clearing', '21700'),
        icAllocationExpenseId: getAccId('Intercompany Allocations', '61500'),
        overheadAllocationExpenseId: getAccId('Overhead Allocation', '61600'),
        overheadAllocationPayableId: getAccId('Overhead Allocation Payable', '21800'),
      });
    };
    load();
  }, [accounts, fetchMappings]);

  // Account helper filters
  const assetAccounts = useMemo(() => accounts.filter(a => a.type === 'Asset' || a.type === 'ContraAsset'), [accounts]);
  const liabilityAccounts = useMemo(() => accounts.filter(a => a.type === 'Liability' || a.type === 'ContraLiability'), [accounts]);
  const revenueAccounts = useMemo(() => accounts.filter(a => a.type === 'Revenue' || a.type === 'ContraRevenue'), [accounts]);
  const expenseAccounts = useMemo(() => accounts.filter(a => a.type === 'Expense' || a.type === 'ContraExpense'), [accounts]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const mappingList = [
        // Sales & AR
        { key: 'Customer Receivables', id: mappings.arAccountId },
        { key: 'Sales', id: mappings.revenueAccountId },
        { key: 'Product Sales Revenue', id: mappings.revenueAccountId },
        { key: 'Service Revenue', id: mappings.serviceRevenueAccountId },
        { key: 'Sales Discount', id: mappings.discountAccountId },
        { key: 'Sales Returns', id: mappings.salesReturnsAccountId },
        { key: 'Allowance for Doubtful Accounts', id: mappings.allowanceAccountId },
        { key: 'Deferred Revenue', id: mappings.deferredRevenueAccountId },

        // Purchases & AP
        { key: 'Vendor Payables', id: mappings.apAccountId },
        { key: 'Purchases', id: mappings.purchasesAccountId },
        { key: 'Purchase Discounts', id: mappings.purchaseDiscountsAccountId },
        { key: 'Purchase Returns', id: mappings.purchaseReturnsAccountId },
        { key: 'GRNI Accrual', id: mappings.grniAccrualAccountId },
        { key: 'Prepaid Expenses', id: mappings.prepaidAccountId },

        // Global Tax Engine
        { key: 'Sales Tax / Output VAT Payable', id: mappings.salesTaxAccountId },
        { key: 'Taxes', id: mappings.salesTaxAccountId },
        { key: 'Purchase Input VAT / Recoverable Tax', id: mappings.expenseInputTaxAccountId },
        { key: 'Non-Recoverable Purchase Tax & Duty Expense', id: mappings.nonRecoverableTaxAccountId },
        { key: 'Import VAT & Customs Duty Tax Clearing', id: mappings.inventoryImportTaxAccountId },
        { key: 'Import VAT Payable', id: mappings.importTaxPayableAccountId },
        { key: 'Capital Goods Input VAT (Fixed Assets)', id: mappings.capitalGoodsTaxAccountId },
        { key: 'Fixed Asset Disposal Output Tax Payable', id: mappings.assetDisposalTaxAccountId },
        { key: 'Withholding Tax Receivable (Advance Tax)', id: mappings.whtReceivableAccountId },
        { key: 'WHT Receivable', id: mappings.whtReceivableAccountId },
        { key: 'Withholding Tax (WHT) Payable on Vendors', id: mappings.whtPayableAccountId },
        { key: 'WHT Payable', id: mappings.whtPayableAccountId },
        { key: 'Corporate Income Tax Provision Expense', id: mappings.corporateTaxExpenseAccountId },
        { key: 'Corporate Income Tax Payable', id: mappings.corporateTaxPayableAccountId },
        { key: 'Deferred Tax Asset', id: mappings.deferredTaxAssetAccountId },
        { key: 'Deferred Tax Liability', id: mappings.deferredTaxLiabilityAccountId },
        { key: 'Reverse Charge Mechanism (RCM) Output Tax Payable', id: mappings.rcmOutputTaxAccountId },
        { key: 'Reverse Charge Mechanism (RCM) Input Tax', id: mappings.rcmInputTaxAccountId },

        // Inventory & Manufacturing
        { key: 'Cost of Goods Sold', id: mappings.cogsAccountId },
        { key: 'Inventory', id: mappings.inventoryAccountId },
        { key: 'Raw Materials Inventory', id: mappings.rawMaterialsAccountId },
        { key: 'Work in Progress', id: mappings.workInProgressAccountId },
        { key: 'Finished Goods Inventory', id: mappings.finishedGoodsAccountId },
        { key: 'Direct Labor', id: mappings.directLaborAccountId },
        { key: 'Manufacturing Overhead', id: mappings.manufacturingOverheadAccountId },

        // Fixed Assets & Leases
        { key: 'Fixed Assets', id: mappings.fixedAssetAccountId },
        { key: 'Accumulated Depreciation', id: mappings.accumulatedDepreciationAccountId },
        { key: 'Depreciation Expense', id: mappings.depreciationExpenseAccountId },
        { key: 'Gain/Loss on Disposal', id: mappings.gainLossDisposalAccountId },
        { key: 'Right of Use Asset', id: mappings.rouAssetAccountId },
        { key: 'Lease Liability', id: mappings.leaseLiabilityAccountId },
        { key: 'Interest Expense', id: mappings.interestExpenseAccountId },

        // Payroll & HR
        { key: 'Payroll Expense', id: mappings.payrollExpenseAccountId },
        { key: 'Employer Payroll Contributions Expense', id: mappings.employerContribExpenseAccountId },
        { key: 'Accrued Salaries', id: mappings.payrollPayableAccountId },
        { key: 'Payroll Taxes Accrued', id: mappings.payrollTaxPayableAccountId },
        { key: 'EOBI & Social Security Accrued', id: mappings.eobiPayableAccountId },
        { key: 'Provident Fund Accrued', id: mappings.pensionPayableAccountId },
        { key: 'Pension Fund Accrued', id: mappings.pensionPayableAccountId },

        // Intercompany & Allocations
        { key: 'Intercompany Receivable', id: mappings.icReceivableAccountId },
        { key: 'Intercompany Clearing', id: mappings.icClearingAccountId },
        { key: 'Intercompany Allocations', id: mappings.icAllocationExpenseId },
        { key: 'Overhead Allocation', id: mappings.overheadAllocationExpenseId },
        { key: 'Overhead Allocation Payable', id: mappings.overheadAllocationPayableId },
      ];

      for (const item of mappingList) {
        if (item.id) {
          await saveMapping(item.key, item.id);
        }
      }

      notify?.('✓ System account posting mappings saved successfully');
    } catch (err: any) {
      notify?.(err.message || 'Error saving account mappings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all operational account mappings back to seeded system defaults?')) {
      const getSeed = (code: string) => accounts.find(a => a.code === code)?.id || '';
      setMappings({
        // Sales & AR
        arAccountId: getSeed('12000'),
        revenueAccountId: getSeed('41100'),
        serviceRevenueAccountId: getSeed('41200'),
        discountAccountId: getSeed('41300'),
        salesReturnsAccountId: getSeed('41400'),
        allowanceAccountId: getSeed('12100'),
        deferredRevenueAccountId: getSeed('23000'),

        // Purchases & AP
        apAccountId: getSeed('21100'),
        purchasesAccountId: getSeed('61100'),
        purchaseDiscountsAccountId: getSeed('51100'),
        purchaseReturnsAccountId: getSeed('51200'),
        grniAccrualAccountId: getSeed('21200'),
        prepaidAccountId: getSeed('14000'),

        // Global Tax Engine
        salesTaxAccountId: getSeed('22000'),
        expenseInputTaxAccountId: getSeed('14100'),
        nonRecoverableTaxAccountId: getSeed('61700'),
        inventoryImportTaxAccountId: getSeed('14120'),
        importTaxPayableAccountId: getSeed('22030'),
        capitalGoodsTaxAccountId: getSeed('14130'),
        assetDisposalTaxAccountId: getSeed('22040'),
        whtReceivableAccountId: getSeed('12200'),
        whtPayableAccountId: getSeed('22100'),
        corporateTaxExpenseAccountId: getSeed('61800'),
        corporateTaxPayableAccountId: getSeed('22200'),
        deferredTaxAssetAccountId: getSeed('15300'),
        deferredTaxLiabilityAccountId: getSeed('25200'),
        rcmOutputTaxAccountId: getSeed('22050'),
        rcmInputTaxAccountId: getSeed('14150'),

        // Inventory & Manufacturing
        cogsAccountId: getSeed('51000'),
        inventoryAccountId: getSeed('13000'),
        rawMaterialsAccountId: getSeed('13000'),
        workInProgressAccountId: getSeed('13000'),
        finishedGoodsAccountId: getSeed('13000'),
        directLaborAccountId: getSeed('61200'),
        manufacturingOverheadAccountId: getSeed('61100'),

        // Fixed Assets & Leases
        fixedAssetAccountId: getSeed('15100'),
        accumulatedDepreciationAccountId: getSeed('15200'),
        depreciationExpenseAccountId: getSeed('61300'),
        gainLossDisposalAccountId: getSeed('51000'),
        rouAssetAccountId: getSeed('15110'),
        leaseLiabilityAccountId: getSeed('21600'),
        interestExpenseAccountId: getSeed('61400'),

        // Payroll & HR
        payrollExpenseAccountId: getSeed('61200'),
        employerContribExpenseAccountId: getSeed('61250') || getSeed('61200'),
        payrollPayableAccountId: getSeed('21300'),
        payrollTaxPayableAccountId: getSeed('21400'),
        eobiPayableAccountId: getSeed('21500'),
        pensionPayableAccountId: getSeed('21510') || getSeed('21500'),

        // Intercompany & Allocations
        icReceivableAccountId: getSeed('12300'),
        icClearingAccountId: getSeed('21700'),
        icAllocationExpenseId: getSeed('61500'),
        overheadAllocationExpenseId: getSeed('61600'),
        overheadAllocationPayableId: getSeed('21800'),
      });
      notify?.('✓ Restored standard IAS/IFRS default account mappings');
    }
  };

  const totalCount = Object.keys(mappings).length;
  const configuredCount = Object.values(mappings).filter(Boolean).length;

  const taxKeys = useMemo(() => [
    'salesTaxAccountId', 'expenseInputTaxAccountId', 'nonRecoverableTaxAccountId',
    'inventoryImportTaxAccountId', 'importTaxPayableAccountId', 'capitalGoodsTaxAccountId',
    'assetDisposalTaxAccountId', 'whtReceivableAccountId', 'whtPayableAccountId',
    'corporateTaxExpenseAccountId', 'corporateTaxPayableAccountId', 'deferredTaxAssetAccountId',
    'deferredTaxLiabilityAccountId', 'rcmOutputTaxAccountId', 'rcmInputTaxAccountId'
  ], []);

  const taxConfigured = useMemo(() => taxKeys.filter(k => !!mappings[k]).length, [mappings, taxKeys]);
  const operationalTotal = totalCount - taxKeys.length;
  const opConfigured = configuredCount - taxConfigured;
  const completionPercentage = totalCount > 0 ? Math.round((configuredCount / totalCount) * 100) : 0;

  const renderField = (label: string, value: string, onChangeKey: string, accountList: Account[], hint: string) => {
    const selectedAcc = accounts.find(a => a.id === value);

    return (
      <div className="p-3 bg-[var(--color-surface-muted)]/50 rounded-xl border border-[var(--color-border)]/80 space-y-2 hover:border-teal-500/50 transition-colors">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="font-bold text-xs text-[var(--color-text-strong)] flex items-center gap-1.5">
            {selectedAcc?.isSystem && <Lock className="w-3 h-3 text-amber-600 shrink-0" />}
            {label}
          </label>
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{hint}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={value}
            onChange={e => setMappings(prev => ({ ...prev, [onChangeKey]: e.target.value }))}
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none text-xs text-[var(--color-text)] transition-colors focus:border-teal-500 font-mono"
          >
            <option value="">-- Select GL Posting Account --</option>
            {accountList.map(a => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name} ({a.type}) {a.isSystem ? '🔒' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in">
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
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">
                  System Chart of Accounts Mapping Engine
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" /> Live GL Engine
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Automate default General Ledger debit/credit postings across Sales, Purchasing, Taxes, Inventory, Fixed Assets, and Payroll.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[var(--color-border)] rounded-xl text-xs font-semibold hover:bg-[var(--color-surface-muted)] text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving Mappings...' : 'Save COA Mapping'}
            </button>
          </div>
        </div>
      </div>

      {/* 4-in-1 Top KPI Cards */}
      <KpiGrid cols={4}>
        <KpiCard
          icon={BookOpen}
          label="System Core GL Accounts"
          value={`${totalCount} Accounts`}
          desc="Standard GL posting keys"
          tone="teal"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Active Mappings"
          value={`${configuredCount} / ${totalCount}`}
          desc={`${completionPercentage}% Automated GL Coverage`}
          tone="emerald"
        />
        <KpiCard
          icon={Scale}
          label="Tax & Statutory Accounts"
          value={`${taxConfigured} / ${taxKeys.length}`}
          desc="VAT, WHT, RCM & Corp Tax"
          tone="indigo"
        />
        <KpiCard
          icon={Layers}
          label="Operational Workflows"
          value={`${opConfigured} / ${operationalTotal}`}
          desc="Sales, AP, COGS, Leases & HR"
          tone="purple"
        />
      </KpiGrid>

      {/* Progress & Category Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-[var(--color-surface-muted)] p-3 rounded-2xl border border-[var(--color-border)]">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'taxes', label: '⚖️ Taxes & Statutory' },
            { id: 'sales', label: 'Sales & AR' },
            { id: 'purchases', label: 'Purchases & AP' },
            { id: 'inventory', label: 'Inventory & COGS' },
            { id: 'assets', label: 'Assets & Leases' },
            { id: 'payroll', label: 'Payroll & HR' },
            { id: 'intercompany', label: 'Intercompany' },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeCategory === c.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-[var(--color-text-muted)]">
          Configured: <strong className="text-teal-600">{configuredCount}</strong> / {totalCount} System Accounts
        </div>
      </div>

      {/* Grid of Modular Mappings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Global Tax Engine & Compliance (IAS 12 / VAT / GST / WHT) */}
        {(activeCategory === 'all' || activeCategory === 'taxes') && (
          <div className="p-5 rounded-2xl border border-teal-500/40 bg-[var(--color-surface)] shadow-sm space-y-4 text-xs md:col-span-2">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
              <Percent className="w-4 h-4 text-teal-600" /> Comprehensive Global Tax Engine (Sales, Expenses, Inventory, Assets & Corporate)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sales & Output Taxes */}
              <div className="space-y-3 p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/60">
                <h4 className="font-bold text-xs text-blue-600 uppercase tracking-wider">📈 Sales Taxes & Customer Withholding</h4>
                {renderField('Sales Tax / Output VAT Payable (Credit)', mappings.salesTaxAccountId, 'salesTaxAccountId', liabilityAccounts, 'Output Tax collected on Sales Invoices | Code 22000')}
                {renderField('Withholding Tax (WHT) Receivable (Debit)', mappings.whtReceivableAccountId, 'whtReceivableAccountId', assetAccounts, 'Advance Tax deducted by Customers at source | Code 12200')}
                {renderField('Fixed Asset Disposal Output Tax (Credit)', mappings.assetDisposalTaxAccountId, 'assetDisposalTaxAccountId', liabilityAccounts, 'Tax collected when selling capitalized fixed assets | Code 22040')}
              </div>

              {/* Purchases, Expenses & Vendor Withholding */}
              <div className="space-y-3 p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/60">
                <h4 className="font-bold text-xs text-emerald-600 uppercase tracking-wider">🛒 Purchases & Expense Input Taxes</h4>
                {renderField('Input VAT / Recoverable Tax on Expenses (Debit)', mappings.expenseInputTaxAccountId, 'expenseInputTaxAccountId', assetAccounts, 'Recoverable Input Tax on Vendor Bills & OPEX | Code 14100')}
                {renderField('Non-Recoverable Purchase Tax Expense (Debit)', mappings.nonRecoverableTaxAccountId, 'nonRecoverableTaxAccountId', expenseAccounts, 'Ineligible / Blocked input tax charged as business expense | Code 61700')}
                {renderField('Vendor Withholding Tax (WHT) Payable (Credit)', mappings.whtPayableAccountId, 'whtPayableAccountId', liabilityAccounts, 'Tax withheld from vendor payments for government remittance | Code 22100')}
              </div>

              {/* Inventory & Import Taxes */}
              <div className="space-y-3 p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/60">
                <h4 className="font-bold text-xs text-purple-600 uppercase tracking-wider">📦 Inventory & Importation Taxes</h4>
                {renderField('Import VAT & Customs Duty Clearing (Debit)', mappings.inventoryImportTaxAccountId, 'inventoryImportTaxAccountId', assetAccounts, 'Tax & duties paid at customs for imported merchandise | Code 14120')}
                {renderField('Import VAT Payable (Credit)', mappings.importTaxPayableAccountId, 'importTaxPayableAccountId', liabilityAccounts, 'Customs authority deferred import tax payable | Code 22030')}
                {renderField('Capital Goods Input VAT on Fixed Assets (Debit)', mappings.capitalGoodsTaxAccountId, 'capitalGoodsTaxAccountId', assetAccounts, 'Input tax on machinery & equipment (Capital Asset Scheme) | Code 14130')}
              </div>

              {/* Corporate Income Tax & Cross-Border RCM */}
              <div className="space-y-3 p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/60">
                <h4 className="font-bold text-xs text-amber-600 uppercase tracking-wider">🏢 Corporate Income Tax (IAS 12) & RCM</h4>
                {renderField('Corporate Income Tax Provision Expense (Debit)', mappings.corporateTaxExpenseAccountId, 'corporateTaxExpenseAccountId', expenseAccounts, 'Annual P&L tax expense | Code 61800')}
                {renderField('Corporate Income Tax Payable (Credit)', mappings.corporateTaxPayableAccountId, 'corporateTaxPayableAccountId', liabilityAccounts, 'Federal / State corporate tax payable | Code 22200')}
                {renderField('Deferred Tax Asset (IAS 12)', mappings.deferredTaxAssetAccountId, 'deferredTaxAssetAccountId', assetAccounts, 'Temporary timing differences asset | Code 15300')}
                {renderField('Deferred Tax Liability (IAS 12)', mappings.deferredTaxLiabilityAccountId, 'deferredTaxLiabilityAccountId', liabilityAccounts, 'Temporary timing differences liability | Code 25200')}
                {renderField('Reverse Charge (RCM) Output Tax Payable (Credit)', mappings.rcmOutputTaxAccountId, 'rcmOutputTaxAccountId', liabilityAccounts, 'Cross-border import of services liability | Code 22050')}
                {renderField('Reverse Charge (RCM) Input Tax Recoverable (Debit)', mappings.rcmInputTaxAccountId, 'rcmInputTaxAccountId', assetAccounts, 'Cross-border import of services recoverable input tax | Code 14150')}
              </div>
            </div>
          </div>
        )}

        {/* 2. Payroll & Statutory Taxes */}
        {(activeCategory === 'all' || activeCategory === 'payroll') && (
          <div className="p-5 rounded-2xl border border-teal-500/30 bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
              <Users className="w-4 h-4 text-teal-600" /> Payroll & Statutory Dissection (IAS 19 / IAS 12)
            </h3>
            {renderField('Gross Salaries & Allowances Expense (Debit)', mappings.payrollExpenseAccountId, 'payrollExpenseAccountId', expenseAccounts, 'Matches Gross Pay (Basic + Additions) | Code 61200')}
            {renderField('Employer Statutory Benefits Expense (Debit)', mappings.employerContribExpenseAccountId, 'employerContribExpenseAccountId', expenseAccounts, 'Matches Company Cost (EOBI 5% + PF Match / GOSI / FICA) | Code 61250')}
            {renderField('Net Salaries Payable Clearing (Credit)', mappings.payrollPayableAccountId, 'payrollPayableAccountId', liabilityAccounts, 'Matches Net Salary (Direct Bank Transfer) | Code 21300')}
            {renderField('Income Tax Withholding Payable (Credit)', mappings.payrollTaxPayableAccountId, 'payrollTaxPayableAccountId', liabilityAccounts, 'Matches Tax Withheld (FBR / PAYE / IRS) | Code 21400')}
            {renderField('EOBI & Social Security Payable (Credit)', mappings.eobiPayableAccountId, 'eobiPayableAccountId', liabilityAccounts, 'Matches EOBI 1% + 5% & Social Security | Code 21500')}
            {renderField('Provident Fund (PF) / Pension Payable (Credit)', mappings.pensionPayableAccountId, 'pensionPayableAccountId', liabilityAccounts, 'Matches PF Employee % + Employer Match | Code 21510')}
          </div>
        )}

        {/* 3. Sales & Receivables */}
        {(activeCategory === 'all' || activeCategory === 'sales') && (
          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Sales & Commercial Receivables (Multi-Sector Revenue)
            </h3>
            {renderField('Customer Receivables (AR) (Debit)', mappings.arAccountId, 'arAccountId', assetAccounts, 'Default Accounts Receivable | Code 12000')}
            {renderField('Product Sales Revenue (Physical Goods) (Credit)', mappings.revenueAccountId, 'revenueAccountId', revenueAccounts, 'Physical inventory sales revenue | Code 41100')}
            {renderField('Service Revenue & Consulting Fees (Credit)', mappings.serviceRevenueAccountId, 'serviceRevenueAccountId', revenueAccounts, 'Hourly, retainer & professional service revenue | Code 41200')}
            {renderField('Sales Discounts & Allowances (Contra-Revenue)', mappings.discountAccountId, 'discountAccountId', revenueAccounts, 'Volume & promotional customer discounts | Code 41300')}
            {renderField('Sales Returns & Concessions (Contra-Revenue)', mappings.salesReturnsAccountId, 'salesReturnsAccountId', revenueAccounts, 'Damaged product returns & allowances | Code 41400')}
            {renderField('Allowance for Doubtful Accounts (Asset)', mappings.allowanceAccountId, 'allowanceAccountId', assetAccounts, 'Expected credit loss provision | Code 12100')}
            {renderField('Deferred / Unearned Revenue (Liability)', mappings.deferredRevenueAccountId, 'deferredRevenueAccountId', liabilityAccounts, 'Advance billing for future service delivery | Code 23000')}
          </div>
        )}

        {/* 4. Procurement & Payables */}
        {(activeCategory === 'all' || activeCategory === 'purchases') && (
          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
              <ShoppingCart className="w-4 h-4 text-emerald-600" /> Procurement & Vendor Payables
            </h3>
            {renderField('Vendor Payables (AP)', mappings.apAccountId, 'apAccountId', liabilityAccounts, 'Code 21100')}
            {renderField('Purchases & Expense Clearing', mappings.purchasesAccountId, 'purchasesAccountId', expenseAccounts, 'Code 61100')}
            {renderField('Purchase Discounts Received', mappings.purchaseDiscountsAccountId, 'purchaseDiscountsAccountId', expenseAccounts, 'Code 51100')}
            {renderField('Purchase Returns', mappings.purchaseReturnsAccountId, 'purchaseReturnsAccountId', expenseAccounts, 'Code 51200')}
            {renderField('GRNI Accrual (Goods Received Not Invoiced)', mappings.grniAccrualAccountId, 'grniAccrualAccountId', liabilityAccounts, 'Code 21200')}
            {renderField('Prepaid Expenses (Asset)', mappings.prepaidAccountId, 'prepaidAccountId', assetAccounts, 'Code 14000')}
          </div>
        )}

        {/* 5. Inventory & Manufacturing */}
        {(activeCategory === 'all' || activeCategory === 'inventory') && (
          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
              <Package className="w-4 h-4 text-purple-600" /> Inventory & Manufacturing (COGS)
            </h3>
            {renderField('Cost of Goods Sold (COGS)', mappings.cogsAccountId, 'cogsAccountId', expenseAccounts, 'Code 51000')}
            {renderField('Merchandise Inventory Asset', mappings.inventoryAccountId, 'inventoryAccountId', assetAccounts, 'Code 13000')}
            {renderField('Raw Materials Inventory', mappings.rawMaterialsAccountId, 'rawMaterialsAccountId', assetAccounts, 'Code 13000')}
            {renderField('Work in Progress (WIP)', mappings.workInProgressAccountId, 'workInProgressAccountId', assetAccounts, 'Code 13000')}
            {renderField('Finished Goods Inventory', mappings.finishedGoodsAccountId, 'finishedGoodsAccountId', assetAccounts, 'Code 13000')}
            {renderField('Direct Labor Expense', mappings.directLaborAccountId, 'directLaborAccountId', expenseAccounts, 'Code 61200')}
            {renderField('Manufacturing Overhead Allocation', mappings.manufacturingOverheadAccountId, 'manufacturingOverheadAccountId', expenseAccounts, 'Code 61100')}
          </div>
        )}

        {/* 6. Fixed Assets & Leases */}
        {(activeCategory === 'all' || activeCategory === 'assets') && (
          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
              <Building2 className="w-4 h-4 text-amber-600" /> Fixed Assets & Factory Plant Machinery (IAS 16 / IFRS 16)
            </h3>
            {renderField('Property, Plant & Equipment (Cost Asset)', mappings.fixedAssetAccountId, 'fixedAssetAccountId', assetAccounts, 'Capitalized gross asset purchase cost | Code 15100')}
            {renderField('Accumulated Depreciation (Contra Asset)', mappings.accumulatedDepreciationAccountId, 'accumulatedDepreciationAccountId', assetAccounts, 'Carrying reduction contra account | Code 15200')}
            {renderField('Administrative Depreciation Expense (OPEX)', mappings.depreciationExpenseAccountId, 'depreciationExpenseAccountId', expenseAccounts, 'Standard office & IT asset depreciation | Code 61300')}
            {renderField('Factory Machinery Overhead (MOH)', mappings.manufacturingOverheadAccountId, 'manufacturingOverheadAccountId', expenseAccounts, 'Direct allocation to production WIP & Job Costing | Code 61100')}
            {renderField('Capital Goods Input VAT (Recoverable)', mappings.capitalGoodsTaxAccountId, 'capitalGoodsTaxAccountId', assetAccounts, 'VAT paid on plant & capital machinery | Code 14130')}
            {renderField('Gain / Loss on Disposal', mappings.gainLossDisposalAccountId, 'gainLossDisposalAccountId', expenseAccounts, 'Profit/loss on asset sale or write-off | Code 51000')}
            {renderField('Right of Use (ROU) Asset (IFRS 16)', mappings.rouAssetAccountId, 'rouAssetAccountId', assetAccounts, 'Leased assets capitalization | Code 15110')}
            {renderField('Lease Liability (Present Value)', mappings.leaseLiabilityAccountId, 'leaseLiabilityAccountId', liabilityAccounts, 'Present value lease debt | Code 21600')}
            {renderField('Lease Interest Expense', mappings.interestExpenseAccountId, 'interestExpenseAccountId', expenseAccounts, 'Accrued lease financing charge | Code 61400')}
          </div>
        )}

        {/* 7. Intercompany & Overhead */}
        {(activeCategory === 'all' || activeCategory === 'intercompany') && (
          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
              <Globe className="w-4 h-4 text-indigo-600" /> Intercompany & Overhead Allocations
            </h3>
            {renderField('Intercompany Receivable (Parent/Subsidiary)', mappings.icReceivableAccountId, 'icReceivableAccountId', assetAccounts, 'Code 12300')}
            {renderField('Intercompany Clearing Ledger', mappings.icClearingAccountId, 'icClearingAccountId', liabilityAccounts, 'Code 21700')}
            {renderField('Intercompany Allocation Expense', mappings.icAllocationExpenseId, 'icAllocationExpenseId', expenseAccounts, 'Code 61500')}
            {renderField('Overhead Allocation Expense', mappings.overheadAllocationExpenseId, 'overheadAllocationExpenseId', expenseAccounts, 'Code 61600')}
            {renderField('Overhead Allocation Payable', mappings.overheadAllocationPayableId, 'overheadAllocationPayableId', liabilityAccounts, 'Code 21800')}
          </div>
        )}
      </div>

      {/* Sticky Bottom Save Action Bar */}
      <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
          <span>All ERP transactions (Sales Invoices, Vendor Bills, Tax Filings, Payroll Runs, Depreciation) automatically hit these mapped General Ledger accounts.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={close}
            className="px-4 py-2 border border-[var(--color-border)] rounded-xl text-xs font-semibold hover:bg-[var(--color-surface-muted)] text-[var(--color-text)] cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving Mappings...' : 'Save COA Mapping'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default SystemAccountMapping;

