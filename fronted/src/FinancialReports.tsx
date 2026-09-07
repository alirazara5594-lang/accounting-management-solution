import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp, DollarSign, Calendar,
  RefreshCw, CheckCircle2,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Layers,
  PieChart, Activity, ShieldCheck, Landmark, ChevronDown, ChevronRight,
  ChevronRightSquare, ChevronDownSquare
} from 'lucide-react';
import { useJournalsStore, useCoaStore, useCompanyStore, usePayrollStore, useSalesStore, useProcurementStore } from './stores';
import { type Account } from './api/modules/coa.api';
import { money, getActiveCurrency } from '@/lib/currency';
import { downloadCSV, downloadExcel, downloadPDF, type ExportRow } from '@/lib/exportUtils';
import ExportDropdown from '@/components/ExportDropdown';

interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
}

interface Journal {
  id: string;
  date: string;
  reference: string;
  description: string;
  status?: string | number;
  companyId?: string;
  lines: JournalLine[];
}

interface FinancialReportsProps {
  accounts: Account[];
  entries: Journal[];
  activeEntityId: string;
}

type TabType = 'overview' | 'balancesheet' | 'incomestatement' | 'cashflow' | 'trialbalance' | 'equity' | 'ratios';

const DATE_PRESETS = [
  { label: 'All Time', from: '', to: '' },
  { label: 'This Month', from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) },
  { label: 'This Quarter', from: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1).toISOString().slice(0, 10), to: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3 + 3, 0).toISOString().slice(0, 10) },
  { label: 'Year to Date (YTD)', from: `${new Date().getFullYear()}-01-01`, to: new Date().toISOString().slice(0, 10) },
  { label: 'Last Year', from: `${new Date().getFullYear() - 1}-01-01`, to: `${new Date().getFullYear() - 1}-12-31` },
];

export const FinancialReports: React.FC<FinancialReportsProps> = ({
  accounts: propAccounts,
  entries: propEntries,
  activeEntityId: propActiveEntityId
}) => {
  const { accounts: storeAccounts, fetchAccounts } = useCoaStore();
  const { entries: storeEntries, fetchJournalEntries } = useJournalsStore();
  const { entities, activeEntityId: storeActiveEntityId } = useCompanyStore();
  const { fetchInvoices } = useSalesStore();
  const { fetchBills } = useProcurementStore();
  const { fetchPayruns } = usePayrollStore();

  const [activeTab, setActiveTab] = useState<TabType>('balancesheet');
  const [viewMode, setViewMode] = useState<'detailed' | 'condensed'>('detailed');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [collapsedAccounts, setCollapsedAccounts] = useState<Record<string, boolean>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tbSearch, setTbSearch] = useState('');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('all');
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [cashFlowMethod, setCashFlowMethod] = useState<'indirect' | 'direct'>('indirect');
  const [tbFilterMode, setTbFilterMode] = useState<'active_only' | 'all_postings'>('active_only');

  useEffect(() => {
    fetchAccounts();
    fetchJournalEntries();
    fetchInvoices();
    fetchBills();
    fetchPayruns();
  }, [fetchAccounts, fetchJournalEntries, fetchInvoices, fetchBills, fetchPayruns]);

  const accounts = storeAccounts.length > 0 ? storeAccounts : propAccounts;
  const entries = storeEntries.length > 0 ? storeEntries : propEntries;
  const activeCompanyId = selectedEntityFilter !== 'all' ? selectedEntityFilter : (storeActiveEntityId || propActiveEntityId);
  const activeCompany = entities.find(e => e.id === activeCompanyId) || { name: 'AMS Enterprise Corp' };

  const activeCurrency = getActiveCurrency();
  const formatCur = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '';
    const num = Number(val);
    const formatted = money(Math.abs(num), activeCurrency);
    return num < 0 ? `(${formatted})` : formatted;
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleAccountNode = (accId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedAccounts(prev => ({ ...prev, [accId]: !prev[accId] }));
  };

  const expandAll = () => {
    setCollapsedGroups({});
    setCollapsedAccounts({});
  };

  const collapseAll = () => {
    const allGroupIds = [
      'cash_bank', 'ar', 'inv', 'prepaid', 'other_ca',
      'ppe', 'rou', 'other_nca',
      'ap', 'grni', 'payroll_liab', 'tax_liab', 'short_lease', 'other_cl',
      'long_lease', 'long_debt', 'other_ncl',
      'share_capital', 'retained_earnings', 'other_eq',
      'op_rev', 'other_rev', 'cogs', 'payroll_exp', 'admin_exp', 'depr_exp', 'fin_tax',
      'tb_asset', 'tb_liability', 'tb_equity', 'tb_revenue', 'tb_expense'
    ];
    const collapsedMap: Record<string, boolean> = {};
    allGroupIds.forEach(id => { collapsedMap[id] = true; });
    setCollapsedGroups(collapsedMap);
  };

  // ── 1. Central Double-Entry Ledger Calculation Engine (IAS 1 / GAAP) ───────────
  const isAccountNormalDebit = (type: string, normalBalance?: string): boolean => {
    if (normalBalance) {
      return normalBalance.toLowerCase() === 'debit';
    }
    const t = String(type).trim();
    switch (t) {
      case 'Asset':
      case 'Expense':
      case 'ContraLiability':
      case 'ContraEquity':
      case 'ContraRevenue':
        return true;
      case 'Liability':
      case 'Equity':
      case 'Revenue':
      case 'ContraAsset':
      case 'ContraExpense':
        return false;
      default:
        return t.toLowerCase().includes('asset') || t.toLowerCase().includes('expense');
    }
  };

  const ledgerState = useMemo(() => {
    const openingBalances: Record<string, number> = {};
    const periodDebits: Record<string, number> = {};
    const periodCredits: Record<string, number> = {};
    const closingBalances: Record<string, number> = {};

    accounts.forEach(a => {
      openingBalances[a.id] = Number(a.openingBalance) || 0;
      periodDebits[a.id] = 0;
      periodCredits[a.id] = 0;
    });

    // Build set of cancelled / reversed references (e.g. "REV-INV-00001" and "INV-00001")
    const reversedRefs = new Set<string>();
    entries.forEach(e => {
      if (e.reference?.startsWith('REV-')) {
        reversedRefs.add(e.reference.substring(4));
        reversedRefs.add(e.reference);
      }
      const statusStr = String(e.status || '').toLowerCase();
      if (statusStr === 'reversed' || statusStr === '4' || statusStr === 'cancelled' || statusStr === '5') {
        if (e.reference) {
          reversedRefs.add(e.reference);
          reversedRefs.add(`REV-${e.reference}`);
        }
      }
    });

    const postedEntries = entries.filter(e => {
      const statusStr = String(e.status || '').toLowerCase();
      // Include both Posted (3) and Reversed (4) entries so GAAP/IAS reversals properly offset original entries
      const isPosted = statusStr === 'posted' || statusStr === '3' || statusStr === 'reversed' || statusStr === '4';
      if (!isPosted) return false;

      // Clean Active Postings Only: In active_only mode, completely exclude cancelled/reversed pairs
      if (tbFilterMode === 'active_only' && e.reference && reversedRefs.has(e.reference)) {
        return false;
      }

      const compId = (e as any).companyId;
      if (activeCompanyId && activeCompanyId !== 'all' && compId && compId !== activeCompanyId) {
        return false;
      }
      return true;
    });

    postedEntries.forEach(entry => {
      const entryDate = entry.date;
      const isPriorToPeriod = dateFrom && entryDate < dateFrom;
      const isAfterPeriod = dateTo && entryDate > dateTo;

      if (isAfterPeriod) return;

      entry.lines?.forEach(line => {
        const acc = accounts.find(a => a.id === line.accountId);
        if (!acc) return;

        const dr = Number(line.debit) || 0;
        const cr = Number(line.credit) || 0;

        if (isPriorToPeriod) {
          if (isAccountNormalDebit(acc.type, acc.normalBalance)) {
            openingBalances[acc.id] = (openingBalances[acc.id] || 0) + (dr - cr);
          } else {
            openingBalances[acc.id] = (openingBalances[acc.id] || 0) + (cr - dr);
          }
        } else {
          periodDebits[acc.id] = (periodDebits[acc.id] || 0) + dr;
          periodCredits[acc.id] = (periodCredits[acc.id] || 0) + cr;
        }
      });
    });

    accounts.forEach(a => {
      const open = openingBalances[a.id] || 0;
      const dr = periodDebits[a.id] || 0;
      const cr = periodCredits[a.id] || 0;

      if (isAccountNormalDebit(a.type, a.normalBalance)) {
        closingBalances[a.id] = open + (dr - cr);
      } else {
        closingBalances[a.id] = open + (cr - dr);
      }
    });

    return {
      openingBalances,
      periodDebits,
      periodCredits,
      closingBalances
    };
  }, [accounts, entries, activeCompanyId, dateFrom, dateTo, tbFilterMode]);

  // ── 2. Helper: Active Posting Accounts ──────────────────────────────────────
  const isLeafAccount = (a: Account) => {
    if (a.isPosting === false) {
      const hasChildren = accounts.some(other => other.parentId === a.id);
      if (hasChildren) return false;
    }
    return true;
  };

  // ── 3. Grouping Builder for Balance Sheet (IAS 1 Classified Structure) ─────
  const balanceSheet = useMemo(() => {
    const postingAccounts = accounts.filter(isLeafAccount);

    const isCurrentAsset = (a: Account) => {
      const t = a.type.toLowerCase();
      if (!t.includes('asset')) return false;
      const sub = (a.subtype || '').toLowerCase();
      if (sub.includes('current') && !sub.includes('non')) return true;
      if (sub.includes('non-current')) return false;
      const num = parseInt(a.code, 10);
      if (!isNaN(num)) return num < 15000;
      return !a.code.startsWith('15');
    };

    const isNonCurrentAsset = (a: Account) => {
      const t = a.type.toLowerCase();
      if (!t.includes('asset')) return false;
      return !isCurrentAsset(a);
    };

    const currentAssetAccounts = postingAccounts.filter(isCurrentAsset);
    const nonCurrentAssetAccounts = postingAccounts.filter(isNonCurrentAsset);

    // Current Assets Groups (IAS 1.66)
    const cashBankAccounts = currentAssetAccounts.filter(a => 
      a.code.startsWith('111') || a.code.startsWith('112') || 
      a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank')
    );
    const arAccounts = currentAssetAccounts.filter(a => 
      !cashBankAccounts.includes(a) && a.code !== '12200' && a.code !== '12300' && (
        a.code.startsWith('12') || a.name.toLowerCase().includes('receivable') || a.name.toLowerCase().includes('doubtful')
      )
    );
    const invAccounts = currentAssetAccounts.filter(a => 
      !cashBankAccounts.includes(a) && !arAccounts.includes(a) && (
        a.code.startsWith('13') || a.name.toLowerCase().includes('inventory') || a.name.toLowerCase().includes('stock')
      )
    );
    const prepaidAccounts = currentAssetAccounts.filter(a => 
      !cashBankAccounts.includes(a) && !arAccounts.includes(a) && !invAccounts.includes(a) && (
        a.code.startsWith('140') || a.name.toLowerCase().includes('prepaid') || a.name.toLowerCase().includes('advance')
      )
    );
    const taxRecoverableAccounts = currentAssetAccounts.filter(a => 
      !cashBankAccounts.includes(a) && !arAccounts.includes(a) && !invAccounts.includes(a) && !prepaidAccounts.includes(a) && (
        a.code.startsWith('141') || a.name.toLowerCase().includes('input vat') || a.name.toLowerCase().includes('tax clearing') || a.name.toLowerCase().includes('wht receivable')
      )
    );
    const otherCurrentAssets = currentAssetAccounts.filter(a => 
      !cashBankAccounts.includes(a) && !arAccounts.includes(a) && !invAccounts.includes(a) && !prepaidAccounts.includes(a) && !taxRecoverableAccounts.includes(a)
    );

    // Non-Current Assets Groups (IAS 1.66 & IAS 16 & IFRS 16)
    const rouLeaseAccounts = nonCurrentAssetAccounts.filter(a => 
      a.name.toLowerCase().includes('lease') || a.name.toLowerCase().includes('right of use') || a.name.toLowerCase().includes('rou')
    );
    const deferredTaxAssetAccounts = nonCurrentAssetAccounts.filter(a => 
      !rouLeaseAccounts.includes(a) && (a.code.startsWith('153') || a.name.toLowerCase().includes('deferred tax'))
    );
    const ppeAccounts = nonCurrentAssetAccounts.filter(a => 
      !rouLeaseAccounts.includes(a) && !deferredTaxAssetAccounts.includes(a) && (
        a.code.startsWith('151') || a.code.startsWith('152') || a.name.toLowerCase().includes('equipment') || 
        a.name.toLowerCase().includes('machinery') || a.name.toLowerCase().includes('furniture') || 
        a.name.toLowerCase().includes('building') || a.name.toLowerCase().includes('vehicle') || 
        a.name.toLowerCase().includes('fixed asset') || a.name.toLowerCase().includes('depreciation')
      )
    );
    const otherNonCurrentAssets = nonCurrentAssetAccounts.filter(a => 
      !rouLeaseAccounts.includes(a) && !deferredTaxAssetAccounts.includes(a) && !ppeAccounts.includes(a)
    );

    // Calculate Asset balances (ContraAsset is deducted)
    const sumAssetList = (list: Account[]) => list.reduce((sum, a) => {
      const bal = ledgerState.closingBalances[a.id] || 0;
      return sum + (a.type === 'ContraAsset' ? -bal : bal);
    }, 0);

    const cashBankTotal = sumAssetList(cashBankAccounts);
    const arTotal = sumAssetList(arAccounts);
    const invTotal = sumAssetList(invAccounts);
    const prepaidTotal = sumAssetList(prepaidAccounts);
    const taxRecoverableTotal = sumAssetList(taxRecoverableAccounts);
    const otherCurrentTotal = sumAssetList(otherCurrentAssets);
    const totalCurrentAssets = cashBankTotal + arTotal + invTotal + prepaidTotal + taxRecoverableTotal + otherCurrentTotal;

    const ppeTotal = sumAssetList(ppeAccounts);
    const rouLeaseTotal = sumAssetList(rouLeaseAccounts);
    const deferredTaxAssetTotal = sumAssetList(deferredTaxAssetAccounts);
    const otherNonCurrentTotal = sumAssetList(otherNonCurrentAssets);
    const totalNonCurrentAssets = ppeTotal + rouLeaseTotal + deferredTaxAssetTotal + otherNonCurrentTotal;

    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    // Liabilities (IAS 1.69)
    const isCurrentLiab = (a: Account) => {
      const t = a.type.toLowerCase();
      if (!t.includes('liability')) return false;
      const sub = (a.subtype || '').toLowerCase();
      if (sub.includes('current') && !sub.includes('non')) return true;
      if (sub.includes('non-current')) return false;
      const num = parseInt(a.code, 10);
      if (!isNaN(num)) return num < 25000;
      return !a.code.startsWith('25');
    };

    const isNonCurrentLiab = (a: Account) => {
      const t = a.type.toLowerCase();
      if (!t.includes('liability')) return false;
      return !isCurrentLiab(a);
    };

    const currentLiabAccounts = postingAccounts.filter(isCurrentLiab);
    const nonCurrentLiabAccounts = postingAccounts.filter(isNonCurrentLiab);

    const apAccounts = currentLiabAccounts.filter(a => 
      a.code.startsWith('211') || a.name.toLowerCase().includes('accounts payable') || 
      (a.name.toLowerCase().includes('payable') && a.name.toLowerCase().includes('vendor'))
    );
    const grniAccounts = currentLiabAccounts.filter(a => 
      !apAccounts.includes(a) && (a.code.startsWith('212') || a.name.toLowerCase().includes('grni') || a.name.toLowerCase().includes('goods received'))
    );
    const payrollLiabAccounts = currentLiabAccounts.filter(a => 
      !apAccounts.includes(a) && !grniAccounts.includes(a) && (
        a.code.startsWith('213') || a.code.startsWith('214') || a.code.startsWith('215') || 
        a.name.toLowerCase().includes('salaries') || a.name.toLowerCase().includes('payroll') || 
        a.name.toLowerCase().includes('eobi') || a.name.toLowerCase().includes('provident') || 
        a.name.toLowerCase().includes('gratuity') || a.name.toLowerCase().includes('pension') || a.name.toLowerCase().includes('eosb')
      )
    );
    const shortLeaseAccounts = currentLiabAccounts.filter(a => 
      !apAccounts.includes(a) && !grniAccounts.includes(a) && !payrollLiabAccounts.includes(a) && (
        a.code.startsWith('216') || a.name.toLowerCase().includes('short-term lease') || a.name.toLowerCase().includes('current lease')
      )
    );
    const taxLiabAccounts = currentLiabAccounts.filter(a => 
      !apAccounts.includes(a) && !grniAccounts.includes(a) && !payrollLiabAccounts.includes(a) && !shortLeaseAccounts.includes(a) && (
        a.code.startsWith('22') || a.name.toLowerCase().includes('vat') || a.name.toLowerCase().includes('sales tax') || a.name.toLowerCase().includes('tax payable') || a.name.toLowerCase().includes('wht payable')
      )
    );
    const deferredRevAccounts = currentLiabAccounts.filter(a => 
      !apAccounts.includes(a) && !grniAccounts.includes(a) && !payrollLiabAccounts.includes(a) && !shortLeaseAccounts.includes(a) && !taxLiabAccounts.includes(a) && (
        a.code.startsWith('23') || a.name.toLowerCase().includes('deferred revenue') || a.name.toLowerCase().includes('unearned')
      )
    );
    const otherCurrentLiab = currentLiabAccounts.filter(a => 
      !apAccounts.includes(a) && !grniAccounts.includes(a) && !payrollLiabAccounts.includes(a) && !shortLeaseAccounts.includes(a) && !taxLiabAccounts.includes(a) && !deferredRevAccounts.includes(a)
    );

    // Non-Current Liabilities
    const longLeaseAccounts = nonCurrentLiabAccounts.filter(a => 
      a.code.startsWith('251') || a.name.toLowerCase().includes('long-term lease') || a.name.toLowerCase().includes('non-current lease')
    );
    const deferredTaxLiabAccounts = nonCurrentLiabAccounts.filter(a => 
      !longLeaseAccounts.includes(a) && (a.code.startsWith('253') || a.code === '25200' || a.name.toLowerCase().includes('deferred tax'))
    );
    const longDebtAccounts = nonCurrentLiabAccounts.filter(a => 
      !longLeaseAccounts.includes(a) && !deferredTaxLiabAccounts.includes(a) && (a.code.startsWith('252') || a.name.toLowerCase().includes('loan') || a.name.toLowerCase().includes('borrowing') || a.name.toLowerCase().includes('notes payable'))
    );
    const otherNonCurrentLiab = nonCurrentLiabAccounts.filter(a => 
      !longLeaseAccounts.includes(a) && !longDebtAccounts.includes(a) && !deferredTaxLiabAccounts.includes(a)
    );

    const sumLiabList = (list: Account[]) => list.reduce((sum, a) => {
      const bal = ledgerState.closingBalances[a.id] || 0;
      return sum + (a.type === 'ContraLiability' ? -bal : bal);
    }, 0);

    const apTotal = sumLiabList(apAccounts);
    const grniTotal = sumLiabList(grniAccounts);
    const payrollLiabTotal = sumLiabList(payrollLiabAccounts);
    const shortLeaseTotal = sumLiabList(shortLeaseAccounts);
    const taxLiabTotal = sumLiabList(taxLiabAccounts);
    const deferredRevTotal = sumLiabList(deferredRevAccounts);
    const otherCurrentLiabTotal = sumLiabList(otherCurrentLiab);
    const totalCurrentLiabilities = apTotal + grniTotal + payrollLiabTotal + shortLeaseTotal + taxLiabTotal + deferredRevTotal + otherCurrentLiabTotal;

    const longLeaseTotal = sumLiabList(longLeaseAccounts);
    const longDebtTotal = sumLiabList(longDebtAccounts);
    const deferredTaxLiabTotal = sumLiabList(deferredTaxLiabAccounts);
    const otherNonCurrentLiabTotal = sumLiabList(otherNonCurrentLiab);
    const totalNonCurrentLiabilities = longLeaseTotal + longDebtTotal + deferredTaxLiabTotal + otherNonCurrentLiabTotal;

    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

    // Equity (IAS 1.78)
    const equityAccounts = postingAccounts.filter(a => a.type.toLowerCase().includes('equity'));
    const shareCapitalAccounts = equityAccounts.filter(a => 
      a.code.startsWith('31') || a.code === '30000' || a.name.toLowerCase().includes('share capital') || 
      a.name.toLowerCase().includes('paid-in') || a.name.toLowerCase().includes('owner investment') || (a.subtype || '').includes('Share Capital')
    );
    const retainedEarningsAccounts = equityAccounts.filter(a => 
      !shareCapitalAccounts.includes(a) && (
        a.code.startsWith('32') || a.name.toLowerCase().includes('retained earnings') || a.name.toLowerCase().includes('reserves') || (a.subtype || '').includes('Retained')
      )
    );
    const otherEquityAccounts = equityAccounts.filter(a => 
      !shareCapitalAccounts.includes(a) && !retainedEarningsAccounts.includes(a)
    );

    const sumEquityList = (list: Account[]) => list.reduce((sum, a) => {
      const bal = ledgerState.closingBalances[a.id] || 0;
      return sum + (a.type === 'ContraEquity' ? -bal : bal);
    }, 0);

    const shareCapitalTotal = sumEquityList(shareCapitalAccounts);
    const retainedEarningsTotal = sumEquityList(retainedEarningsAccounts);
    const otherEquityTotal = sumEquityList(otherEquityAccounts);
    const totalBaseEquity = shareCapitalTotal + retainedEarningsTotal + otherEquityTotal;

    // P&L Net Period Income Flow
    const revenueAccounts = postingAccounts.filter(a => a.type === 'Revenue' || a.type === 'ContraRevenue');
    const expenseAccounts = postingAccounts.filter(a => a.type === 'Expense' || a.type === 'ContraExpense');

    const totalRevenue = revenueAccounts.reduce((sum, a) => {
      const bal = ledgerState.closingBalances[a.id] || 0;
      return sum + (a.type === 'ContraRevenue' ? -bal : bal);
    }, 0);

    const totalExpenses = expenseAccounts.reduce((sum, a) => {
      const bal = ledgerState.closingBalances[a.id] || 0;
      return sum + (a.type === 'ContraExpense' ? -bal : bal);
    }, 0);

    const netPeriodIncome = totalRevenue - totalExpenses;
    const totalEquity = totalBaseEquity + netPeriodIncome;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const variance = totalAssets - totalLiabilitiesAndEquity;
    const isBalanced = Math.abs(variance) < 0.01;

    return {
      currentAssetsGroups: [
        { id: 'cash_bank', title: 'Cash & Cash Equivalents (IAS 7) (11100 / 11200)', total: cashBankTotal, accounts: cashBankAccounts },
        { id: 'ar', title: 'Trade & Other Receivables (Net) (IAS 1) (12000)', total: arTotal, accounts: arAccounts },
        { id: 'inv', title: 'Inventories & Merchandise (IAS 2) (13000)', total: invTotal, accounts: invAccounts },
        { id: 'prepaid', title: 'Prepayments & Short-term Advances (14000)', total: prepaidTotal, accounts: prepaidAccounts },
        ...(taxRecoverableAccounts.length > 0 ? [{ id: 'tax_rec', title: 'VAT / Tax Input Recoverable (14100)', total: taxRecoverableTotal, accounts: taxRecoverableAccounts }] : []),
        ...(otherCurrentAssets.length > 0 ? [{ id: 'other_ca', title: 'Other Current Assets', total: otherCurrentTotal, accounts: otherCurrentAssets }] : [])
      ],
      nonCurrentAssetsGroups: [
        { id: 'ppe', title: 'Property, Plant & Equipment (Net) (IAS 16) (15100-15200)', total: ppeTotal, accounts: ppeAccounts },
        ...(rouLeaseAccounts.length > 0 ? [{ id: 'rou', title: 'Right-of-Use Leased Assets (IFRS 16) (15110)', total: rouLeaseTotal, accounts: rouLeaseAccounts }] : []),
        ...(deferredTaxAssetAccounts.length > 0 ? [{ id: 'dta', title: 'Deferred Tax Assets (IAS 12) (15300)', total: deferredTaxAssetTotal, accounts: deferredTaxAssetAccounts }] : []),
        ...(otherNonCurrentAssets.length > 0 ? [{ id: 'other_nca', title: 'Other Non-Current Assets', total: otherNonCurrentTotal, accounts: otherNonCurrentAssets }] : [])
      ],
      totalCurrentAssets,
      totalNonCurrentAssets,
      totalAssets,

      currentLiabilitiesGroups: [
        { id: 'ap', title: 'Trade Accounts Payable (21100)', total: apTotal, accounts: apAccounts },
        ...(grniAccounts.length > 0 ? [{ id: 'grni', title: 'Goods Received Not Invoiced (GRNI Accruals) (21200)', total: grniTotal, accounts: grniAccounts }] : []),
        { id: 'payroll_liab', title: 'Accrued Payroll & Statutory Liabilities (IAS 19) (21300-21500)', total: payrollLiabTotal, accounts: payrollLiabAccounts },
        { id: 'tax_liab', title: 'Sales Tax / VAT Output & Tax Payable (22000)', total: taxLiabTotal, accounts: taxLiabAccounts },
        ...(shortLeaseAccounts.length > 0 ? [{ id: 'short_lease', title: 'Current Lease Liabilities (IFRS 16) (21600)', total: shortLeaseTotal, accounts: shortLeaseAccounts }] : []),
        ...(deferredRevAccounts.length > 0 ? [{ id: 'def_rev', title: 'Deferred Revenue & Customer Deposits (IFRS 15) (23000)', total: deferredRevTotal, accounts: deferredRevAccounts }] : []),
        ...(otherCurrentLiab.length > 0 ? [{ id: 'other_cl', title: 'Other Current Liabilities', total: otherCurrentLiabTotal, accounts: otherCurrentLiab }] : [])
      ],
      nonCurrentLiabilitiesGroups: [
        ...(longLeaseAccounts.length > 0 ? [{ id: 'long_lease', title: 'Long-Term Lease Liabilities (IFRS 16) (25100)', total: longLeaseTotal, accounts: longLeaseAccounts }] : []),
        ...(longDebtAccounts.length > 0 ? [{ id: 'long_debt', title: 'Long-Term Bank Borrowings & Notes (25200)', total: longDebtTotal, accounts: longDebtAccounts }] : []),
        ...(deferredTaxLiabAccounts.length > 0 ? [{ id: 'dtl', title: 'Deferred Tax Liabilities (IAS 12) (25300)', total: deferredTaxLiabTotal, accounts: deferredTaxLiabAccounts }] : []),
        ...(otherNonCurrentLiab.length > 0 ? [{ id: 'other_ncl', title: 'Other Non-Current Liabilities & Long-Term Provisions', total: otherNonCurrentLiabTotal, accounts: otherNonCurrentLiab }] : [])
      ],
      totalCurrentLiabilities,
      totalNonCurrentLiabilities,
      totalLiabilities,

      equityGroups: [
        { id: 'share_capital', title: 'Share Capital & Paid-In Capital (31000)', total: shareCapitalTotal, accounts: shareCapitalAccounts },
        { id: 'retained_earnings', title: 'Retained Earnings & Reserves (32000)', total: retainedEarningsTotal, accounts: retainedEarningsAccounts },
        ...(otherEquityAccounts.length > 0 ? [{ id: 'other_eq', title: 'Other Capital Reserves', total: otherEquityTotal, accounts: otherEquityAccounts }] : []),
      ],
      totalBaseEquity,
      netPeriodIncome,
      totalEquity,
      totalLiabilitiesAndEquity,
      variance,
      isBalanced
    };
  }, [accounts, ledgerState]);

  // ── 4. Grouping Builder for Income Statement / P&L (IFRS 15 / IAS 1) ───────
  const incomeStatement = useMemo(() => {
    const postingAccounts = accounts.filter(isLeafAccount);

    // Revenue Dissection (IFRS 15)
    const productSalesAccounts = postingAccounts.filter(a => 
      a.type === 'Revenue' && (a.code === '41100' || a.name.toLowerCase().includes('product') || a.name.toLowerCase().includes('sales revenue') || a.name.toLowerCase().includes('merchandise'))
    );
    const serviceSalesAccounts = postingAccounts.filter(a => 
      a.type === 'Revenue' && !productSalesAccounts.includes(a) && (
        a.code === '41200' || a.name.toLowerCase().includes('service') || a.name.toLowerCase().includes('consulting') || a.name.toLowerCase().includes('professional')
      )
    );
    const salesDiscountAccounts = postingAccounts.filter(a => 
      a.type === 'ContraRevenue' || a.code === '41300' || a.code === '41400' ||
      ((a.type === 'Revenue' || a.type === 'ContraRevenue') && (a.name.toLowerCase().includes('discount') || a.name.toLowerCase().includes('return')))
    );
    const otherRevAccounts = postingAccounts.filter(a => 
      a.type === 'Revenue' && !productSalesAccounts.includes(a) && !serviceSalesAccounts.includes(a) && !salesDiscountAccounts.includes(a)
    );

    const productSalesTotal = productSalesAccounts.reduce((sum, a) => sum + (ledgerState.closingBalances[a.id] || 0), 0);
    const serviceSalesTotal = serviceSalesAccounts.reduce((sum, a) => sum + (ledgerState.closingBalances[a.id] || 0), 0);
    const salesDiscountTotal = salesDiscountAccounts.reduce((sum, a) => sum + (ledgerState.closingBalances[a.id] || 0), 0);
    const otherRevTotal = otherRevAccounts.reduce((sum, a) => sum + (ledgerState.closingBalances[a.id] || 0), 0);

    const grossTurnover = productSalesTotal + serviceSalesTotal + otherRevTotal;
    const grossRevenue = grossTurnover - salesDiscountTotal;

    // Cost of Goods Sold (IAS 2)
    const cogsAccounts = postingAccounts.filter(a => 
      (a.type === 'Expense' || a.type === 'ContraExpense') && (
        a.code.startsWith('5') || a.name.toLowerCase().includes('cost of') || a.name.toLowerCase().includes('cogs') || a.name.toLowerCase().includes('direct material') || a.name.toLowerCase().includes('cost of sales')
      )
    );
    const cogsTotal = cogsAccounts.reduce((sum, a) => {
      const bal = ledgerState.closingBalances[a.id] || 0;
      return sum + (a.type === 'ContraExpense' ? -bal : bal);
    }, 0);

    const grossProfit = grossRevenue - cogsTotal;
    const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    // Operating Expenses (IAS 19 / IAS 16)
    const allExpenses = postingAccounts.filter(a => 
      (a.type === 'Expense' || a.type === 'ContraExpense') && !cogsAccounts.includes(a)
    );

    const payrollExpAccounts = allExpenses.filter(a => 
      a.code.startsWith('612') || a.name.toLowerCase().includes('salaries') || a.name.toLowerCase().includes('wages') || 
      a.name.toLowerCase().includes('payroll') || a.name.toLowerCase().includes('eobi') || a.name.toLowerCase().includes('provident') || 
      a.name.toLowerCase().includes('gratuity') || a.name.toLowerCase().includes('hra') || a.name.toLowerCase().includes('allowance')
    );

    const deprExpAccounts = allExpenses.filter(a => 
      !payrollExpAccounts.includes(a) && (a.code.startsWith('613') || a.name.toLowerCase().includes('depreciation') || a.name.toLowerCase().includes('amortization'))
    );

    const financeExpAccounts = allExpenses.filter(a => 
      !payrollExpAccounts.includes(a) && !deprExpAccounts.includes(a) && (
        a.code.startsWith('618') || a.code === '61400' || a.code.startsWith('62') || a.name.toLowerCase().includes('interest') || a.name.toLowerCase().includes('bank charges') || a.name.toLowerCase().includes('tax provision') || a.name.toLowerCase().includes('corporate income tax')
      )
    );

    const adminExpAccounts = allExpenses.filter(a => 
      !payrollExpAccounts.includes(a) && !deprExpAccounts.includes(a) && !financeExpAccounts.includes(a)
    );

    const sumExpList = (list: Account[]) => list.reduce((sum, a) => {
      const bal = ledgerState.closingBalances[a.id] || 0;
      return sum + (a.type === 'ContraExpense' ? -bal : bal);
    }, 0);

    const payrollTotal = sumExpList(payrollExpAccounts);
    const adminTotal = sumExpList(adminExpAccounts);
    const deprTotal = sumExpList(deprExpAccounts);
    const totalOperatingExpenses = payrollTotal + adminTotal + deprTotal;

    const operatingIncomeEbit = grossProfit - totalOperatingExpenses;
    const financeTotal = sumExpList(financeExpAccounts);
    const netProfit = operatingIncomeEbit - financeTotal;
    const netMarginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return {
      revenueGroups: [
        ...(productSalesAccounts.length > 0 ? [{ id: 'prod_rev', title: 'Product Sales Revenue (41100)', total: productSalesTotal, accounts: productSalesAccounts }] : []),
        ...(serviceSalesAccounts.length > 0 ? [{ id: 'serv_rev', title: 'Service Revenue & Professional Fees (41200)', total: serviceSalesTotal, accounts: serviceSalesAccounts }] : []),
        ...(otherRevAccounts.length > 0 ? [{ id: 'other_rev', title: 'Other Operating Income & Gains (41500)', total: otherRevTotal, accounts: otherRevAccounts }] : []),
        ...(salesDiscountAccounts.length > 0 ? [{ id: 'sales_disc', title: 'Less: Sales Discounts & Returns (41300-41400)', total: -salesDiscountTotal, accounts: salesDiscountAccounts }] : [])
      ],
      grossTurnover,
      grossRevenue,
      cogsGroup: { id: 'cogs', title: 'Cost of Goods Sold & Direct Costs (IAS 2) (51000)', total: cogsTotal, accounts: cogsAccounts },
      grossProfit,
      grossMarginPct,
      opexGroups: [
        { id: 'payroll_exp', title: 'Personnel & Employee Benefits Expense (IAS 19) (61200)', total: payrollTotal, accounts: payrollExpAccounts },
        { id: 'admin_exp', title: 'General & Administrative Operating Expenses (61100)', total: adminTotal, accounts: adminExpAccounts },
        ...(deprExpAccounts.length > 0 ? [{ id: 'depr_exp', title: 'Depreciation & Amortization Expense (IAS 16 / IAS 38) (61300)', total: deprTotal, accounts: deprExpAccounts }] : [])
      ],
      totalOperatingExpenses,
      operatingIncomeEbit,
      financeGroup: { id: 'fin_tax', title: 'Finance Costs & Corporate Income Tax Provision (IAS 12) (61800)', total: financeTotal, accounts: financeExpAccounts },
      netProfit,
      netMarginPct
    };
  }, [accounts, ledgerState]);

  // ── 5. Statement of Cash Flows (IAS 7 - Indirect Method) ───────────────────
  const cashFlowStatement = useMemo(() => {
    const postingAccounts = accounts.filter(isLeafAccount);
    const cashAccounts = postingAccounts.filter(a => 
      a.code.startsWith('111') || a.code.startsWith('112') || a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank')
    );

    const openingCash = cashAccounts.reduce((sum, a) => sum + (ledgerState.openingBalances[a.id] || 0), 0);
    const closingCash = cashAccounts.reduce((sum, a) => sum + (ledgerState.closingBalances[a.id] || 0), 0);
    const netCashChange = closingCash - openingCash;

    const netIncome = incomeStatement.netProfit;
    const deprAddback = incomeStatement.opexGroups.find(g => g.id === 'depr_exp')?.total || 0;

    const arAccounts = postingAccounts.filter(a => a.type.toLowerCase().includes('asset') && (a.code.startsWith('12') || a.name.toLowerCase().includes('receivable')));
    const arChange = arAccounts.reduce((sum, a) => sum + ((ledgerState.closingBalances[a.id] || 0) - (ledgerState.openingBalances[a.id] || 0)), 0);

    const invAccounts = postingAccounts.filter(a => a.type.toLowerCase().includes('asset') && (a.code.startsWith('13') || a.name.toLowerCase().includes('inventory')));
    const invChange = invAccounts.reduce((sum, a) => sum + ((ledgerState.closingBalances[a.id] || 0) - (ledgerState.openingBalances[a.id] || 0)), 0);

    const prepaidAccounts = postingAccounts.filter(a => a.type.toLowerCase().includes('asset') && (a.code.startsWith('14') || a.name.toLowerCase().includes('prepaid')));
    const prepaidChange = prepaidAccounts.reduce((sum, a) => sum + ((ledgerState.closingBalances[a.id] || 0) - (ledgerState.openingBalances[a.id] || 0)), 0);

    const apAccounts = postingAccounts.filter(a => a.type.toLowerCase().includes('liability') && (a.code.startsWith('211') || a.code.startsWith('212')));
    const apChange = apAccounts.reduce((sum, a) => sum + ((ledgerState.closingBalances[a.id] || 0) - (ledgerState.openingBalances[a.id] || 0)), 0);

    const taxPayableAccounts = postingAccounts.filter(a => a.type.toLowerCase().includes('liability') && (a.code.startsWith('213') || a.code.startsWith('214') || a.code.startsWith('215') || a.code.startsWith('22')));
    const taxPayableChange = taxPayableAccounts.reduce((sum, a) => sum + ((ledgerState.closingBalances[a.id] || 0) - (ledgerState.openingBalances[a.id] || 0)), 0);

    const netOperatingCashFlow = netIncome + deprAddback - arChange - invChange - prepaidChange + apChange + taxPayableChange;

    const ppeAccounts = postingAccounts.filter(a => a.type === 'Asset' && (a.code.startsWith('151') || a.name.toLowerCase().includes('equipment') || a.name.toLowerCase().includes('fixed asset')));
    const capexPurchases = ppeAccounts.reduce((sum, a) => sum + ((ledgerState.closingBalances[a.id] || 0) - (ledgerState.openingBalances[a.id] || 0)), 0);
    const netInvestingCashFlow = -capexPurchases;

    const netFinancingCashFlow = netCashChange - (netOperatingCashFlow + netInvestingCashFlow);

    return {
      openingCash,
      closingCash,
      netCashChange,
      netIncome,
      deprAddback,
      arChange,
      invChange,
      prepaidChange,
      apChange,
      taxPayableChange,
      netOperatingCashFlow,
      capexPurchases,
      netInvestingCashFlow,
      netFinancingCashFlow,
      cashAccounts
    };
  }, [accounts, ledgerState, incomeStatement]);

  // ── 6. 6-Column Auditor Trial Balance ──────────────────────────────────────
  const trialBalanceRows = useMemo(() => {
    const postingAccounts = accounts.filter(isLeafAccount);
    return postingAccounts
      .filter(a => {
        if (!showZeroBalances && (ledgerState.closingBalances[a.id] || 0) === 0 && (ledgerState.periodDebits[a.id] || 0) === 0 && (ledgerState.periodCredits[a.id] || 0) === 0) {
          return false;
        }
        if (tbSearch && !`${a.code} ${a.name} ${a.type}`.toLowerCase().includes(tbSearch.toLowerCase())) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(a => {
        const bal = ledgerState.closingBalances[a.id] || 0;
        const isDebitNormal = isAccountNormalDebit(a.type, a.normalBalance);
        const finalDebit = isDebitNormal ? (bal > 0 ? bal : 0) : (bal < 0 ? -bal : 0);
        const finalCredit = !isDebitNormal ? (bal > 0 ? bal : 0) : (bal < 0 ? -bal : 0);

        return {
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          opening: ledgerState.openingBalances[a.id] || 0,
          periodDebit: ledgerState.periodDebits[a.id] || 0,
          periodCredit: ledgerState.periodCredits[a.id] || 0,
          closingDebit: finalDebit,
          closingCredit: finalCredit,
          netBalance: bal
        };
      });
  }, [accounts, ledgerState, showZeroBalances, tbSearch]);

  const trialBalanceTotals = useMemo(() => {
    return trialBalanceRows.reduce((acc, row) => ({
      periodDebit: acc.periodDebit + row.periodDebit,
      periodCredit: acc.periodCredit + row.periodCredit,
      closingDebit: acc.closingDebit + row.closingDebit,
      closingCredit: acc.closingCredit + row.closingCredit
    }), { periodDebit: 0, periodCredit: 0, closingDebit: 0, closingCredit: 0 });
  }, [trialBalanceRows]);

  const trialBalanceGrouped = useMemo(() => {
    const categories = [
      { id: 'tb_asset', title: '1. ASSETS (10000s)', rows: trialBalanceRows.filter(r => r.type.toLowerCase().includes('asset')) },
      { id: 'tb_liability', title: '2. LIABILITIES (20000s)', rows: trialBalanceRows.filter(r => r.type.toLowerCase().includes('liability')) },
      { id: 'tb_equity', title: '3. EQUITY (30000s)', rows: trialBalanceRows.filter(r => r.type.toLowerCase().includes('equity')) },
      { id: 'tb_revenue', title: '4. REVENUE (40000s)', rows: trialBalanceRows.filter(r => r.type.toLowerCase().includes('revenue')) },
      { id: 'tb_expense', title: '5. EXPENSES (50000s - 60000s)', rows: trialBalanceRows.filter(r => r.type.toLowerCase().includes('expense')) },
    ];
    return categories.filter(c => c.rows.length > 0);
  }, [trialBalanceRows]);

  // ── 7. Ratios ─────────────────────────────────────────────────────────────
  const ratios = useMemo(() => {
    const currentRatio = balanceSheet.totalCurrentLiabilities > 0 ? (balanceSheet.totalCurrentAssets / balanceSheet.totalCurrentLiabilities) : 0;
    const quickCashAR = balanceSheet.currentAssetsGroups.filter(g => g.id === 'cash_bank' || g.id === 'ar').reduce((s, g) => s + g.total, 0);
    const quickRatio = balanceSheet.totalCurrentLiabilities > 0 ? (quickCashAR / balanceSheet.totalCurrentLiabilities) : 0;
    const debtToEquity = balanceSheet.totalEquity > 0 ? (balanceSheet.totalLiabilities / balanceSheet.totalEquity) : 0;
    const workingCapital = balanceSheet.totalCurrentAssets - balanceSheet.totalCurrentLiabilities;
    const returnOnAssets = balanceSheet.totalAssets > 0 ? (incomeStatement.netProfit / balanceSheet.totalAssets) * 100 : 0;
    const returnOnEquity = balanceSheet.totalEquity > 0 ? (incomeStatement.netProfit / balanceSheet.totalEquity) * 100 : 0;

    return { currentRatio, quickRatio, debtToEquity, workingCapital, returnOnAssets, returnOnEquity };
  }, [balanceSheet, incomeStatement]);

  // ── 8. Hierarchical Account Tree Renderer ─────────────────────────────────
  const renderAccountTree = (groupAccounts: Account[]) => {
    if (!groupAccounts || groupAccounts.length === 0) {
      return (
        <div className="text-[11px] text-muted-foreground italic py-1 pl-6">
          No active ledgers mapped to this classification.
        </div>
      );
    }

    const groupAccountIds = new Set(groupAccounts.map(a => a.id));
    const rootAccounts = groupAccounts.filter(a => !a.parentId || !groupAccountIds.has(a.parentId));

    const renderNode = (acc: Account, depth: number = 0): React.ReactNode => {
      const children = groupAccounts.filter(a => a.parentId === acc.id);
      const hasChildren = children.length > 0;
      const isCollapsed = !!collapsedAccounts[acc.id];
      const bal = ledgerState.closingBalances[acc.id] || 0;
      const isContra = acc.type === 'ContraAsset' || acc.type === 'ContraLiability' || acc.type === 'ContraEquity' || acc.type === 'ContraRevenue' || acc.type === 'ContraExpense';
      const displayBal = isContra ? -bal : bal;

      return (
        <div key={acc.id} className="space-y-0.5">
          <div className="grid grid-cols-12 gap-2 py-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded px-1 text-[11px] items-center transition-colors">
            <div
              className="col-span-6 font-sans flex items-center gap-1.5 truncate"
              style={{ paddingLeft: `${depth * 14}px` }}
            >
              {depth > 0 && <span className="text-muted-foreground/50 font-mono select-none">├─</span>}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => toggleAccountNode(acc.id, e)}
                  className="p-0.5 hover:bg-muted rounded text-teal-600 cursor-pointer shrink-0"
                  title="Expand/Collapse Sub-accounts"
                >
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <span className="w-3 text-muted-foreground/60 text-center shrink-0">•</span>
              )}
              <span className="font-mono font-semibold text-foreground/80">{acc.code}</span>
              <span className="text-muted-foreground truncate">— {acc.name}</span>
              {acc.subtype && (
                <span className="text-[9px] px-1 py-0.2 bg-muted/60 text-muted-foreground rounded ml-1 hidden sm:inline">
                  {acc.subtype}
                </span>
              )}
            </div>
            <div className="col-span-2 text-right font-mono font-medium text-foreground">
              {formatCur(displayBal)}
            </div>
            <div className="col-span-2"></div>
            <div className="col-span-2"></div>
          </div>

          {hasChildren && !isCollapsed && (
            <div className="space-y-0.5 border-l border-muted/80 ml-2">
              {children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-0.5">
        {rootAccounts.map(a => renderNode(a, 0))}
      </div>
    );
  };

  // ── 9. Formatted 3-Column Structured Exports (PDF, Excel, CSV) ─────────────
  const handleExportPDF = () => {
    let title = 'STATEMENT OF FINANCIAL POSITION';
    let subtitle = `${activeCompany.name} — As of ${dateTo || new Date().toISOString().slice(0, 10)} (IAS 1 / GAAP)`;
    let headers: string[] = ['Account Classification', 'Code', 'Detail Line', 'Subtotal', 'Major Total'];
    let rows: ExportRow[] = [];
    let totals: { label: string; value: unknown }[] = [];

    if (activeTab === 'balancesheet') {
      rows.push(['1. ASSETS', '', '', '', '']);
      rows.push(['A. Current Assets', '', '', '', '']);
      balanceSheet.currentAssetsGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', g.total.toFixed(2), '']);
        if (viewMode === 'detailed') {
          g.accounts.forEach(a => {
            rows.push([`      ${a.name}`, a.code, (ledgerState.closingBalances[a.id] || 0).toFixed(2), '', '']);
          });
        }
      });
      rows.push(['TOTAL CURRENT ASSETS', '', '', '', balanceSheet.totalCurrentAssets.toFixed(2)]);
      rows.push(['', '', '', '', '']);

      rows.push(['B. Non-Current Assets', '', '', '', '']);
      balanceSheet.nonCurrentAssetsGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', g.total.toFixed(2), '']);
        if (viewMode === 'detailed') {
          g.accounts.forEach(a => {
            rows.push([`      ${a.name}`, a.code, (ledgerState.closingBalances[a.id] || 0).toFixed(2), '', '']);
          });
        }
      });
      rows.push(['TOTAL NON-CURRENT ASSETS', '', '', '', balanceSheet.totalNonCurrentAssets.toFixed(2)]);
      rows.push(['TOTAL ASSETS', '', '', '', balanceSheet.totalAssets.toFixed(2)]);
      rows.push(['', '', '', '', '']);

      rows.push(['2. LIABILITIES', '', '', '', '']);
      rows.push(['A. Current Liabilities', '', '', '', '']);
      balanceSheet.currentLiabilitiesGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', g.total.toFixed(2), '']);
        if (viewMode === 'detailed') {
          g.accounts.forEach(a => {
            rows.push([`      ${a.name}`, a.code, (ledgerState.closingBalances[a.id] || 0).toFixed(2), '', '']);
          });
        }
      });
      rows.push(['TOTAL CURRENT LIABILITIES', '', '', '', balanceSheet.totalCurrentLiabilities.toFixed(2)]);
      rows.push(['', '', '', '', '']);

      rows.push(['3. SHAREHOLDERS\' EQUITY', '', '', '', '']);
      balanceSheet.equityGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', g.total.toFixed(2), '']);
        if (viewMode === 'detailed') {
          g.accounts.forEach(a => {
            rows.push([`      ${a.name}`, a.code, (ledgerState.closingBalances[a.id] || 0).toFixed(2), '', '']);
          });
        }
      });
      rows.push(['  • Retained Net Income for Period (P&L)', '', '', balanceSheet.netPeriodIncome.toFixed(2), '']);
      rows.push(['TOTAL SHAREHOLDERS\' EQUITY', '', '', '', balanceSheet.totalEquity.toFixed(2)]);
      rows.push(['TOTAL LIABILITIES & EQUITY', '', '', '', balanceSheet.totalLiabilitiesAndEquity.toFixed(2)]);

      totals = [
        { label: 'TOTAL ASSETS', value: formatCur(balanceSheet.totalAssets) },
        { label: 'TOTAL LIABILITIES & EQUITY', value: formatCur(balanceSheet.totalLiabilitiesAndEquity) },
        { label: 'ACCOUNTING STATUS', value: balanceSheet.isBalanced ? 'BALANCED ($0.00 Variance)' : 'OUT OF BALANCE' }
      ];
    } else if (activeTab === 'incomestatement') {
      title = 'STATEMENT OF COMPREHENSIVE INCOME (PROFIT & LOSS)';
      subtitle = `${activeCompany.name} — Period: ${dateFrom || 'Inception'} to ${dateTo || 'Today'} (IFRS 15)`;
      rows.push(['1. OPERATING REVENUE', '', '', '', '']);
      incomeStatement.revenueGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', g.total.toFixed(2), '']);
        if (viewMode === 'detailed') {
          g.accounts.forEach(a => rows.push([`      ${a.name}`, a.code, (ledgerState.closingBalances[a.id] || 0).toFixed(2), '', '']));
        }
      });
      rows.push(['TOTAL OPERATING REVENUE', '', '', '', incomeStatement.grossRevenue.toFixed(2)]);
      rows.push(['', '', '', '', '']);
      rows.push(['2. COST OF GOODS SOLD (COGS)', '', '', (-incomeStatement.cogsGroup.total).toFixed(2), '']);
      if (viewMode === 'detailed') {
        incomeStatement.cogsGroup.accounts.forEach(a => rows.push([`      ${a.name}`, a.code, (-(ledgerState.closingBalances[a.id] || 0)).toFixed(2), '', '']));
      }
      rows.push(['GROSS PROFIT', '', '', '', incomeStatement.grossProfit.toFixed(2)]);
      rows.push(['', '', '', '', '']);
      rows.push(['3. OPERATING EXPENSES (OPEX)', '', '', '', '']);
      incomeStatement.opexGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', (-g.total).toFixed(2), '']);
        if (viewMode === 'detailed') {
          g.accounts.forEach(a => rows.push([`      ${a.name}`, a.code, (-(ledgerState.closingBalances[a.id] || 0)).toFixed(2), '', '']));
        }
      });
      rows.push(['TOTAL OPERATING EXPENSES', '', '', '', (-incomeStatement.totalOperatingExpenses).toFixed(2)]);
      rows.push(['OPERATING PROFIT (EBIT)', '', '', '', incomeStatement.operatingIncomeEbit.toFixed(2)]);
      rows.push(['4. FINANCE COSTS & TAX PROVISION', '', '', (-incomeStatement.financeGroup.total).toFixed(2), '']);
      if (viewMode === 'detailed') {
        incomeStatement.financeGroup.accounts.forEach(a => rows.push([`      ${a.name}`, a.code, (-(ledgerState.closingBalances[a.id] || 0)).toFixed(2), '', '']));
      }
      rows.push(['NET PROFIT / (LOSS)', '', '', '', incomeStatement.netProfit.toFixed(2)]);

      totals = [
        { label: 'GROSS PROFIT', value: formatCur(incomeStatement.grossProfit) },
        { label: 'OPERATING PROFIT (EBIT)', value: formatCur(incomeStatement.operatingIncomeEbit) },
        { label: 'NET PROFIT', value: formatCur(incomeStatement.netProfit) },
        { label: 'NET MARGIN %', value: `${incomeStatement.netMarginPct.toFixed(1)}%` }
      ];
    } else if (activeTab === 'cashflow') {
      title = 'STATEMENT OF CASH FLOWS';
      subtitle = `${activeCompany.name} — IAS 7 Method`;
      rows.push(['1. OPERATING ACTIVITIES', '', '', '', '']);
      rows.push(['  • Net Profit / (Loss) for the Period', '', cashFlowStatement.netIncome.toFixed(2), '', '']);
      rows.push(['  • Non-Cash Depreciation Add-back', '', cashFlowStatement.deprAddback.toFixed(2), '', '']);
      rows.push(['  • Change in Accounts Receivable', '', (-cashFlowStatement.arChange).toFixed(2), '', '']);
      rows.push(['  • Change in Inventories', '', (-cashFlowStatement.invChange).toFixed(2), '', '']);
      rows.push(['  • Change in Accounts Payable & Taxes', '', (cashFlowStatement.apChange + cashFlowStatement.taxPayableChange).toFixed(2), '', '']);
      rows.push(['NET CASH FROM OPERATING ACTIVITIES', '', '', '', cashFlowStatement.netOperatingCashFlow.toFixed(2)]);
      rows.push(['', '', '', '', '']);
      rows.push(['2. INVESTING ACTIVITIES (CapEx)', '', '', '', cashFlowStatement.netInvestingCashFlow.toFixed(2)]);
      rows.push(['3. FINANCING ACTIVITIES', '', '', '', cashFlowStatement.netFinancingCashFlow.toFixed(2)]);
      rows.push(['NET CASH CHANGE', '', '', '', cashFlowStatement.netCashChange.toFixed(2)]);
      rows.push(['CLOSING CASH & BANK BALANCES', '', '', '', cashFlowStatement.closingCash.toFixed(2)]);

      totals = [
        { label: 'OPERATING CASH FLOW', value: formatCur(cashFlowStatement.netOperatingCashFlow) },
        { label: 'CLOSING CASH', value: formatCur(cashFlowStatement.closingCash) }
      ];
    } else {
      title = '6-COLUMN AUDITOR TRIAL BALANCE';
      subtitle = `${activeCompany.name} — Double-Entry Audit Trail`;
      headers = ['Account Code', 'Account Name', 'Major Head', 'Period Debit', 'Period Credit', 'Closing Debit', 'Closing Credit'];
      rows = trialBalanceRows.map(r => [
        r.code, r.name, r.type,
        r.periodDebit > 0 ? r.periodDebit.toFixed(2) : '-',
        r.periodCredit > 0 ? r.periodCredit.toFixed(2) : '-',
        r.closingDebit > 0 ? r.closingDebit.toFixed(2) : '-',
        r.closingCredit > 0 ? r.closingCredit.toFixed(2) : '-'
      ]);
      totals = [
        { label: 'TOTAL CLOSING DEBIT', value: formatCur(trialBalanceTotals.closingDebit) },
        { label: 'TOTAL CLOSING CREDIT', value: formatCur(trialBalanceTotals.closingCredit) }
      ];
    }

    downloadPDF(title, subtitle, headers, rows, totals);
  };

  const handleExportExcel = () => {
    const filename = `Financial_Statement_${activeTab}_${new Date().toISOString().slice(0, 10)}`;
    const headers: string[] = ['Account Classification / Description', 'Code', 'Detail Amount (Dr/Cr)', 'Group Subtotal', 'Section Total'];
    const rows: ExportRow[] = [];

    if (activeTab === 'balancesheet') {
      rows.push(['1. ASSETS', '', '', '', '']);
      rows.push(['A. Current Assets', '', '', '', '']);
      balanceSheet.currentAssetsGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', g.total, '']);
        g.accounts.forEach(a => {
          rows.push([`      ${a.name}`, a.code, ledgerState.closingBalances[a.id] || 0, '', '']);
        });
      });
      rows.push(['TOTAL CURRENT ASSETS', '', '', '', balanceSheet.totalCurrentAssets]);
      rows.push(['', '', '', '', '']);

      rows.push(['B. Non-Current Assets', '', '', '', '']);
      balanceSheet.nonCurrentAssetsGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', g.total, '']);
        g.accounts.forEach(a => {
          rows.push([`      ${a.name}`, a.code, ledgerState.closingBalances[a.id] || 0, '', '']);
        });
      });
      rows.push(['TOTAL NON-CURRENT ASSETS', '', '', '', balanceSheet.totalNonCurrentAssets]);
      rows.push(['TOTAL ASSETS', '', '', '', balanceSheet.totalAssets]);
      rows.push(['', '', '', '', '']);

      rows.push(['2. LIABILITIES', '', '', '', '']);
      rows.push(['A. Current Liabilities', '', '', '', '']);
      balanceSheet.currentLiabilitiesGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', g.total, '']);
        g.accounts.forEach(a => {
          rows.push([`      ${a.name}`, a.code, ledgerState.closingBalances[a.id] || 0, '', '']);
        });
      });
      rows.push(['TOTAL CURRENT LIABILITIES', '', '', '', balanceSheet.totalCurrentLiabilities]);
      rows.push(['', '', '', '', '']);

      rows.push(['3. SHAREHOLDERS\' EQUITY', '', '', '', '']);
      balanceSheet.equityGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', g.total, '']);
        g.accounts.forEach(a => {
          rows.push([`      ${a.name}`, a.code, ledgerState.closingBalances[a.id] || 0, '', '']);
        });
      });
      rows.push(['  • Retained Net Income for Period', '', '', balanceSheet.netPeriodIncome, '']);
      rows.push(['TOTAL SHAREHOLDERS\' EQUITY', '', '', '', balanceSheet.totalEquity]);
      rows.push(['TOTAL LIABILITIES & EQUITY', '', '', '', balanceSheet.totalLiabilitiesAndEquity]);
    } else if (activeTab === 'incomestatement') {
      rows.push(['1. OPERATING REVENUE', '', '', '', '']);
      incomeStatement.revenueGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', g.total, '']);
        g.accounts.forEach(a => rows.push([`    ${a.name}`, a.code, ledgerState.closingBalances[a.id] || 0, '', '']));
      });
      rows.push(['TOTAL OPERATING REVENUE', '', '', '', incomeStatement.grossRevenue]);
      rows.push(['', '', '', '', '']);
      rows.push(['2. COST OF GOODS SOLD (COGS)', '', '', -incomeStatement.cogsGroup.total, '']);
      incomeStatement.cogsGroup.accounts.forEach(a => rows.push([`    ${a.name}`, a.code, -(ledgerState.closingBalances[a.id] || 0), '', '']));
      rows.push(['GROSS PROFIT', '', '', '', incomeStatement.grossProfit]);
      rows.push(['', '', '', '', '']);
      rows.push(['3. OPERATING EXPENSES (OPEX)', '', '', '', '']);
      incomeStatement.opexGroups.forEach(g => {
        rows.push([`  • ${g.title}`, '', '', -g.total, '']);
        g.accounts.forEach(a => rows.push([`      ${a.name}`, a.code, -(ledgerState.closingBalances[a.id] || 0), '', '']));
      });
      rows.push(['TOTAL OPERATING EXPENSES', '', '', '', -incomeStatement.totalOperatingExpenses]);
      rows.push(['OPERATING INCOME (EBIT)', '', '', '', incomeStatement.operatingIncomeEbit]);
      rows.push(['4. FINANCE COSTS & TAX PROVISION', '', '', -incomeStatement.financeGroup.total, '']);
      incomeStatement.financeGroup.accounts.forEach(a => rows.push([`    ${a.name}`, a.code, -(ledgerState.closingBalances[a.id] || 0), '', '']));
      rows.push(['NET PROFIT / (LOSS)', '', '', '', incomeStatement.netProfit]);
    } else {
      headers.length = 0;
      headers.push('Account Code', 'Account Name', 'Major Head', 'Opening Balance', 'Period Debit', 'Period Credit', 'Closing Debit', 'Closing Credit');
      trialBalanceRows.forEach(r => {
        rows.push([r.code, r.name, r.type, r.opening, r.periodDebit, r.periodCredit, r.closingDebit, r.closingCredit]);
      });
    }

    downloadExcel(filename, activeTab.toUpperCase(), headers, rows);
  };

  const handleExportCSV = () => {
    let headers: string[] = ['Classification', 'Code', 'Detail Amount', 'Subtotal', 'Major Total'];
    let rows: ExportRow[] = [];
    let filename = `Financial_Statement_${activeTab}_${new Date().toISOString().slice(0, 10)}`;

    if (activeTab === 'trialbalance') {
      headers = ['Account Code', 'Account Name', 'Major Head', 'Opening', 'Period Debit', 'Period Credit', 'Closing Debit', 'Closing Credit'];
      rows = trialBalanceRows.map(r => [r.code, r.name, r.type, r.opening, r.periodDebit, r.periodCredit, r.closingDebit, r.closingCredit]);
    } else if (activeTab === 'incomestatement') {
      incomeStatement.revenueGroups.forEach(g => {
        rows.push([g.title, '', '', g.total, '']);
        g.accounts.forEach(a => rows.push(['', a.code, ledgerState.closingBalances[a.id] || 0, '', '']));
      });
      rows.push(['TOTAL OPERATING REVENUE', '', '', '', incomeStatement.grossRevenue]);
      rows.push(['COGS', '', '', -incomeStatement.cogsGroup.total, '']);
      rows.push(['GROSS PROFIT', '', '', '', incomeStatement.grossProfit]);
      incomeStatement.opexGroups.forEach(g => {
        rows.push([g.title, '', '', -g.total, '']);
        g.accounts.forEach(a => rows.push(['', a.code, -(ledgerState.closingBalances[a.id] || 0), '', '']));
      });
      rows.push(['TOTAL OPEX', '', '', '', -incomeStatement.totalOperatingExpenses]);
      rows.push(['FINANCE COSTS', '', '', -incomeStatement.financeGroup.total, '']);
      rows.push(['NET PROFIT', '', '', '', incomeStatement.netProfit]);
    } else {
      balanceSheet.currentAssetsGroups.forEach(g => {
        rows.push([g.title, '', '', g.total, '']);
        g.accounts.forEach(a => rows.push(['', a.code, ledgerState.closingBalances[a.id] || 0, '', '']));
      });
      rows.push(['TOTAL CURRENT ASSETS', '', '', '', balanceSheet.totalCurrentAssets]);
      balanceSheet.nonCurrentAssetsGroups.forEach(g => {
        rows.push([g.title, '', '', g.total, '']);
        g.accounts.forEach(a => rows.push(['', a.code, ledgerState.closingBalances[a.id] || 0, '', '']));
      });
      rows.push(['TOTAL NON-CURRENT ASSETS', '', '', '', balanceSheet.totalNonCurrentAssets]);
      rows.push(['TOTAL ASSETS', '', '', '', balanceSheet.totalAssets]);

      balanceSheet.currentLiabilitiesGroups.forEach(g => {
        rows.push([g.title, '', '', g.total, '']);
        g.accounts.forEach(a => rows.push(['', a.code, ledgerState.closingBalances[a.id] || 0, '', '']));
      });
      rows.push(['TOTAL CURRENT LIABILITIES', '', '', '', balanceSheet.totalCurrentLiabilities]);
      balanceSheet.nonCurrentLiabilitiesGroups.forEach(g => {
        rows.push([g.title, '', '', g.total, '']);
        g.accounts.forEach(a => rows.push(['', a.code, ledgerState.closingBalances[a.id] || 0, '', '']));
      });
      rows.push(['TOTAL NON-CURRENT LIABILITIES', '', '', '', balanceSheet.totalNonCurrentLiabilities]);
      rows.push(['TOTAL LIABILITIES', '', '', '', balanceSheet.totalLiabilities]);

      balanceSheet.equityGroups.forEach(g => {
        rows.push([g.title, '', '', g.total, '']);
        g.accounts.forEach(a => rows.push(['', a.code, ledgerState.closingBalances[a.id] || 0, '', '']));
      });
      rows.push(['TOTAL EQUITY', '', '', '', balanceSheet.totalEquity]);
      rows.push(['TOTAL LIABILITIES & EQUITY', '', '', '', balanceSheet.totalLiabilitiesAndEquity]);
    }

    downloadCSV(filename, headers, rows);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in">
      {/* Top Header - Guaranteed Single Line */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="w-5 h-5 text-teal-600 shrink-0" /> Financial Reporting & Statements Suite
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            IAS 1, IAS 7, and IFRS 15 financial statements, multi-level balance sheets, trial balance, and health ratios.
          </p>
        </div>

        {/* Action Buttons in single line */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <ExportDropdown
            label="Export Statement"
            onPDF={handleExportPDF}
            onExcel={handleExportExcel}
            onCSV={handleExportCSV}
            onPrint={() => window.print()}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchAccounts(); fetchJournalEntries(); }}
            className="font-bold text-xs h-9 px-3 gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Global Filter & Preset Control Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-wrap gap-4 items-center justify-between">
        {/* Date Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <span className="text-muted-foreground mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Period:
          </span>
          {DATE_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                dateFrom === p.from && dateTo === p.to
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range & Entity Selector & Condensed View Switcher */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-semibold">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border rounded-xl px-2.5 py-1.5 text-xs bg-background font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-semibold">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border rounded-xl px-2.5 py-1.5 text-xs bg-background font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-semibold">Entity:</span>
            <select
              value={selectedEntityFilter}
              onChange={e => setSelectedEntityFilter(e.target.value)}
              className="border rounded-xl px-3 py-1.5 text-xs bg-background font-bold text-foreground"
            >
              <option value="all">🏢 Consolidated Enterprise (All)</option>
              {entities.map(ent => (
                <option key={ent.id} value={ent.id}>{ent.name}</option>
              ))}
            </select>
          </div>

          {/* VIEW MODE TOGGLE (CONDENSED VS DETAILED TREE) */}
          <div className="flex items-center bg-muted p-0.5 rounded-xl text-xs font-bold border">
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'detailed' ? 'bg-background text-teal-600 shadow-2xs' : 'text-muted-foreground'
              }`}
            >
              🌳 Detailed Tree
            </button>
            <button
              onClick={() => setViewMode('condensed')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'condensed' ? 'bg-background text-teal-600 shadow-2xs' : 'text-muted-foreground'
              }`}
            >
              📑 Condensed Summary
            </button>
          </div>

          {/* Expand / Collapse All Controls */}
          {viewMode === 'detailed' && (
            <div className="flex items-center gap-1">
              <button
                onClick={expandAll}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/70 hover:bg-muted text-foreground border transition-all cursor-pointer flex items-center gap-1"
                title="Expand All Groups & Accounts"
              >
                <ChevronDownSquare className="w-3.5 h-3.5 text-teal-600" /> Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border transition-all cursor-pointer flex items-center gap-1"
                title="Collapse All Groups"
              >
                <ChevronRightSquare className="w-3.5 h-3.5 text-muted-foreground" /> Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Double-Entry Compliance Badge */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
        balanceSheet.isBalanced
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300'
      }`}>
        <div className="flex items-center gap-3">
          {balanceSheet.isBalanced ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div>
            <span className="text-xs font-black uppercase tracking-wide block">
              Accounting Equation Verification (IAS 1 / GAAP):
            </span>
            <span className="text-xs">
              {balanceSheet.isBalanced
                ? `✓ Total Assets (${formatCur(balanceSheet.totalAssets)}) = Total Liabilities (${formatCur(balanceSheet.totalLiabilities)}) + Shareholders' Equity (${formatCur(balanceSheet.totalEquity)}). Variance: $0.00`
                : `⚠️ Out-of-Balance Variance: ${formatCur(balanceSheet.variance)}. Review unposted journals or suspense ledgers.`}
            </span>
          </div>
        </div>
        <div className="text-xs font-mono font-black">
          Net Income Flow: <strong className="text-teal-600 dark:text-teal-400">{formatCur(incomeStatement.netProfit)}</strong>
        </div>
      </div>

      {/* Main Statement Navigation Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-1">
        {[
          { id: 'balancesheet', label: '1. Balance Sheet (IAS 1)', icon: Landmark },
          { id: 'incomestatement', label: '2. Profit & Loss (IFRS 15)', icon: TrendingUp },
          { id: 'cashflow', label: '3. Statement of Cash Flows (IAS 7)', icon: DollarSign },
          { id: 'trialbalance', label: '4. 6-Column Trial Balance', icon: Layers },
          { id: 'overview', label: 'Executive Cockpit', icon: Activity },
          { id: 'equity', label: '5. Changes in Equity', icon: ShieldCheck },
          { id: 'ratios', label: '6. Solvency & Health Ratios', icon: PieChart },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'border-teal-600 text-teal-600 bg-teal-50/50 dark:bg-teal-950/20'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: STATEMENT OF FINANCIAL POSITION / BALANCE SHEET (IAS 1) ───── */}
      {activeTab === 'balancesheet' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {/* Corporate Header */}
            <div className="p-5 bg-muted/40 border-b flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider block">
                  {activeCompany.name}
                </span>
                <h3 className="text-base font-black text-foreground">
                  Statement of Financial Position (Balance Sheet)
                </h3>
                <span className="text-xs text-muted-foreground">
                  Classified Assets, Liabilities, and Equity adhering strictly to IAS 1 & Global GAAP standards.
                </span>
              </div>
              <div className="text-right text-xs font-mono">
                <span className="font-bold text-foreground block">Reporting Date: {dateTo || 'Today'}</span>
                <span className="text-muted-foreground text-[11px]">Format: {viewMode === 'detailed' ? '🌳 Detailed Multi-Level Tree' : '📑 Condensed Summary'}</span>
              </div>
            </div>

            {/* 3-Column Structured Financial Statement Table */}
            <div className="p-6 space-y-6 text-xs font-mono">
              {/* Header Columns Guide */}
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-muted-foreground uppercase border-b-2 pb-2 font-sans">
                <div className="col-span-6">Account Classification / Line Item</div>
                <div className="col-span-2 text-right">Ledger Detail</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-2 text-right text-foreground font-black">Total ({activeCurrency})</div>
              </div>

              {/* 1. ASSETS SECTION */}
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-teal-800 dark:text-teal-300 uppercase tracking-wider border-b border-teal-600 pb-1 font-sans">
                  <div className="col-span-6">1. ASSETS</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono"></div>
                </div>

                {/* Current Assets */}
                <div className="space-y-1 pl-2">
                  <div className="grid grid-cols-12 gap-2 font-bold text-foreground font-sans text-xs py-1 border-b bg-muted/30 px-2 rounded-md">
                    <div className="col-span-6">A. Current Assets</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 text-right font-mono"></div>
                  </div>

                  {balanceSheet.currentAssetsGroups.map(group => (
                    <div key={group.id} className="space-y-0.5 pl-2">
                      <div
                        onClick={() => toggleGroup(group.id)}
                        className="grid grid-cols-12 gap-2 py-1 font-bold text-foreground cursor-pointer hover:text-teal-600 transition-colors"
                      >
                        <div className="col-span-6 font-sans flex items-center gap-1.5">
                          {viewMode === 'detailed' && (
                            collapsedGroups[group.id] ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                          )}
                          {group.title}
                        </div>
                        <div className="col-span-2"></div>
                        <div className="col-span-2 text-right font-mono text-teal-700 dark:text-teal-400">{formatCur(group.total)}</div>
                        <div className="col-span-2"></div>
                      </div>

                      {viewMode === 'detailed' && !collapsedGroups[group.id] && (
                        <div className="space-y-0.5 border-l-2 border-teal-500/20 pl-4 py-1">
                          {renderAccountTree(group.accounts)}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* CURRENT ASSETS SUBTOTAL BAR */}
                  <div className="grid grid-cols-12 gap-2 py-1.5 font-bold text-foreground border-t border-b bg-muted/20 px-2 rounded-md mt-1">
                    <div className="col-span-6 font-sans">TOTAL CURRENT ASSETS</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 text-right font-mono text-teal-700 dark:text-teal-400">{formatCur(balanceSheet.totalCurrentAssets)}</div>
                  </div>
                </div>

                {/* Non-Current Assets */}
                <div className="space-y-1 pl-2 pt-3">
                  <div className="grid grid-cols-12 gap-2 font-bold text-foreground font-sans text-xs py-1 border-b bg-muted/30 px-2 rounded-md">
                    <div className="col-span-6">B. Non-Current Assets (Fixed & Leases)</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 text-right font-mono"></div>
                  </div>

                  {balanceSheet.nonCurrentAssetsGroups.map(group => (
                    <div key={group.id} className="space-y-0.5 pl-2">
                      <div
                        onClick={() => toggleGroup(group.id)}
                        className="grid grid-cols-12 gap-2 py-1 font-bold text-foreground cursor-pointer hover:text-teal-600 transition-colors"
                      >
                        <div className="col-span-6 font-sans flex items-center gap-1.5">
                          {viewMode === 'detailed' && (
                            collapsedGroups[group.id] ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                          )}
                          {group.title}
                        </div>
                        <div className="col-span-2"></div>
                        <div className="col-span-2 text-right font-mono text-teal-700 dark:text-teal-400">{formatCur(group.total)}</div>
                        <div className="col-span-2"></div>
                      </div>

                      {viewMode === 'detailed' && !collapsedGroups[group.id] && (
                        <div className="space-y-0.5 border-l-2 border-teal-500/20 pl-4 py-1">
                          {renderAccountTree(group.accounts)}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* NON-CURRENT ASSETS SUBTOTAL BAR */}
                  <div className="grid grid-cols-12 gap-2 py-1.5 font-bold text-foreground border-t border-b bg-muted/20 px-2 rounded-md mt-1">
                    <div className="col-span-6 font-sans">TOTAL NON-CURRENT ASSETS</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 text-right font-mono text-teal-700 dark:text-teal-400">{formatCur(balanceSheet.totalNonCurrentAssets)}</div>
                  </div>
                </div>

                {/* TOTAL ASSETS BAR */}
                <div className="grid grid-cols-12 gap-2 p-3.5 rounded-xl bg-teal-500/10 text-teal-950 dark:text-teal-200 font-black text-sm border border-teal-500/30 mt-2">
                  <div className="col-span-6 font-sans uppercase">TOTAL ASSETS (A + B):</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono">{formatCur(balanceSheet.totalAssets)}</div>
                </div>
              </div>

              {/* 2. LIABILITIES SECTION */}
              <div className="space-y-3 pt-4">
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider border-b border-rose-600 pb-1 font-sans">
                  <div className="col-span-6">2. LIABILITIES</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono"></div>
                </div>

                {/* Current Liabilities */}
                <div className="space-y-1 pl-2">
                  <div className="grid grid-cols-12 gap-2 font-bold text-foreground font-sans text-xs py-1 border-b bg-muted/30 px-2 rounded-md">
                    <div className="col-span-6">A. Current Liabilities (Trade Payables, Accruals & Taxes)</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 text-right font-mono"></div>
                  </div>

                  {balanceSheet.currentLiabilitiesGroups.map(group => (
                    <div key={group.id} className="space-y-0.5 pl-2">
                      <div
                        onClick={() => toggleGroup(group.id)}
                        className="grid grid-cols-12 gap-2 py-1 font-bold text-foreground cursor-pointer hover:text-rose-600 transition-colors"
                      >
                        <div className="col-span-6 font-sans flex items-center gap-1.5">
                          {viewMode === 'detailed' && (
                            collapsedGroups[group.id] ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          {group.title}
                        </div>
                        <div className="col-span-2"></div>
                        <div className="col-span-2 text-right font-mono text-rose-700 dark:text-rose-400">{formatCur(group.total)}</div>
                        <div className="col-span-2"></div>
                      </div>

                      {viewMode === 'detailed' && !collapsedGroups[group.id] && (
                        <div className="space-y-0.5 border-l-2 border-rose-500/20 pl-4 py-1">
                          {renderAccountTree(group.accounts)}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* CURRENT LIABILITIES SUBTOTAL BAR */}
                  <div className="grid grid-cols-12 gap-2 py-1.5 font-bold text-foreground border-t border-b bg-muted/20 px-2 rounded-md mt-1">
                    <div className="col-span-6 font-sans">TOTAL CURRENT LIABILITIES</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 text-right font-mono text-rose-700 dark:text-rose-400">{formatCur(balanceSheet.totalCurrentLiabilities)}</div>
                  </div>
                </div>

                {/* Non-Current Liabilities */}
                {balanceSheet.nonCurrentLiabilitiesGroups.length > 0 && (
                  <div className="space-y-1 pl-2 pt-3">
                    <div className="grid grid-cols-12 gap-2 font-bold text-foreground font-sans text-xs py-1 border-b bg-muted/30 px-2 rounded-md">
                      <div className="col-span-6">B. Non-Current Liabilities (Long-term Leases & Debt)</div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2 text-right font-mono"></div>
                    </div>

                    {balanceSheet.nonCurrentLiabilitiesGroups.map(group => (
                      <div key={group.id} className="space-y-0.5 pl-2">
                        <div
                          onClick={() => toggleGroup(group.id)}
                          className="grid grid-cols-12 gap-2 py-1 font-bold text-foreground cursor-pointer hover:text-rose-600 transition-colors"
                        >
                          <div className="col-span-6 font-sans flex items-center gap-1.5">
                            {viewMode === 'detailed' && (
                              collapsedGroups[group.id] ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-rose-600" />
                            )}
                            {group.title}
                          </div>
                          <div className="col-span-2"></div>
                          <div className="col-span-2 text-right font-mono text-rose-700 dark:text-rose-400">{formatCur(group.total)}</div>
                          <div className="col-span-2"></div>
                        </div>

                        {viewMode === 'detailed' && !collapsedGroups[group.id] && (
                          <div className="space-y-0.5 border-l-2 border-rose-500/20 pl-4 py-1">
                            {renderAccountTree(group.accounts)}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* NON-CURRENT LIABILITIES SUBTOTAL BAR */}
                    <div className="grid grid-cols-12 gap-2 py-1.5 font-bold text-foreground border-t border-b bg-muted/20 px-2 rounded-md mt-1">
                      <div className="col-span-6 font-sans">TOTAL NON-CURRENT LIABILITIES</div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2 text-right font-mono text-rose-700 dark:text-rose-400">{formatCur(balanceSheet.totalNonCurrentLiabilities)}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-12 gap-2 p-2.5 rounded-xl bg-rose-500/10 text-rose-950 dark:text-rose-200 font-bold border border-rose-500/30 mt-2">
                  <div className="col-span-6 font-sans uppercase">TOTAL LIABILITIES (A + B):</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono">{formatCur(balanceSheet.totalLiabilities)}</div>
                </div>
              </div>

              {/* 3. EQUITY SECTION */}
              <div className="space-y-3 pt-4">
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider border-b border-blue-600 pb-1 font-sans">
                  <div className="col-span-6">3. SHAREHOLDERS' EQUITY</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono"></div>
                </div>

                <div className="space-y-1 pl-2">
                  {balanceSheet.equityGroups.map(group => (
                    <div key={group.id} className="space-y-0.5">
                      <div
                        onClick={() => toggleGroup(group.id)}
                        className="grid grid-cols-12 gap-2 py-1 text-foreground font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        <div className="col-span-6 font-sans flex items-center gap-1.5">
                          {viewMode === 'detailed' && (
                            collapsedGroups[group.id] ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          • {group.title}
                        </div>
                        <div className="col-span-2"></div>
                        <div className="col-span-2 text-right font-mono">{formatCur(group.total)}</div>
                        <div className="col-span-2"></div>
                      </div>

                      {viewMode === 'detailed' && !collapsedGroups[group.id] && (
                        <div className="space-y-0.5 border-l-2 border-blue-500/20 pl-4 py-1">
                          {renderAccountTree(group.accounts)}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="grid grid-cols-12 gap-2 py-1 font-bold text-emerald-600">
                    <div className="col-span-6 font-sans flex items-center gap-1.5">
                      {viewMode === 'detailed' && <span className="w-3.5 inline-block" />}
                      • Retained Net Income for the Period (P&L):
                    </div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 text-right font-mono">{formatCur(balanceSheet.netPeriodIncome)}</div>
                    <div className="col-span-2"></div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 p-2.5 rounded-xl bg-blue-500/10 text-blue-950 dark:text-blue-200 font-bold border border-blue-500/30 mt-2">
                  <div className="col-span-6 font-sans uppercase">TOTAL SHAREHOLDERS' EQUITY:</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono">{formatCur(balanceSheet.totalEquity)}</div>
                </div>
              </div>

              {/* EQUATION TOTAL CHECK */}
              <div className="grid grid-cols-12 gap-2 p-4 rounded-xl bg-slate-900 text-white font-black text-base border-t-2 border-slate-700 mt-3">
                <div className="col-span-6 font-sans uppercase">TOTAL LIABILITIES & EQUITY:</div>
                <div className="col-span-2"></div>
                <div className="col-span-2"></div>
                <div className="col-span-2 text-right text-emerald-400 font-mono">{formatCur(balanceSheet.totalLiabilitiesAndEquity)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: STATEMENT OF COMPREHENSIVE INCOME (IFRS 15) ───────────────── */}
      {activeTab === 'incomestatement' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-5 bg-muted/40 border-b flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider block">
                  {activeCompany.name}
                </span>
                <h3 className="text-base font-black text-foreground">
                  Statement of Comprehensive Income (Profit & Loss)
                </h3>
                <span className="text-xs text-muted-foreground">
                  Multi-Step Gross Margin, Operating Profit (EBIT), Finance Costs, and Net Period Earnings (IFRS 15).
                </span>
              </div>
              <div className="text-right text-xs font-mono">
                <span className="font-bold text-foreground block">Period: {dateFrom || 'Inception'} to {dateTo || 'Today'}</span>
                <span className="text-muted-foreground text-[11px]">Format: {viewMode === 'detailed' ? '🌳 Detailed Tree' : '📑 Condensed Summary'}</span>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs font-mono">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-muted-foreground uppercase border-b-2 pb-2 font-sans">
                <div className="col-span-6">Account Classification / Line Item</div>
                <div className="col-span-2 text-right">Ledger Detail</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-2 text-right text-foreground font-black">Total ({activeCurrency})</div>
              </div>

              {/* 1. Operating Revenue */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-teal-800 dark:text-teal-300 uppercase border-b pb-1 font-sans">
                  <div className="col-span-6">1. OPERATING REVENUE</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono"></div>
                </div>

                {incomeStatement.revenueGroups.map(group => (
                  <div key={group.id} className="space-y-0.5 pl-2">
                    <div
                      onClick={() => toggleGroup(group.id)}
                      className="grid grid-cols-12 gap-2 py-1 font-bold text-foreground cursor-pointer hover:text-teal-600 transition-colors"
                    >
                      <div className="col-span-6 font-sans flex items-center gap-1.5">
                        {viewMode === 'detailed' && (
                          collapsedGroups[group.id] ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                        )}
                        {group.title}
                      </div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2 text-right font-mono text-teal-700">{formatCur(group.total)}</div>
                      <div className="col-span-2"></div>
                    </div>

                    {viewMode === 'detailed' && !collapsedGroups[group.id] && (
                      <div className="space-y-0.5 border-l-2 border-teal-500/20 pl-4 py-1">
                        {renderAccountTree(group.accounts)}
                      </div>
                    )}
                  </div>
                ))}

                {/* TOTAL OPERATING REVENUE BAR */}
                <div className="grid grid-cols-12 gap-2 py-1.5 font-bold text-foreground border-t border-b bg-muted/20 px-2 rounded-md">
                  <div className="col-span-6 font-sans">TOTAL OPERATING REVENUE</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono text-teal-700 dark:text-teal-400">{formatCur(incomeStatement.grossRevenue)}</div>
                </div>
              </div>

              {/* 2. Cost of Goods Sold */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-rose-800 dark:text-rose-300 uppercase border-b pb-1 font-sans">
                  <div className="col-span-6">2. COST OF SALES / DIRECT COSTS (COGS)</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono"></div>
                </div>

                <div className="space-y-0.5 pl-2">
                  <div
                    onClick={() => toggleGroup('cogs')}
                    className="grid grid-cols-12 gap-2 py-1 font-bold text-foreground cursor-pointer hover:text-rose-600 transition-colors"
                  >
                    <div className="col-span-6 font-sans flex items-center gap-1.5">
                      {viewMode === 'detailed' && (
                        collapsedGroups['cogs'] ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      {incomeStatement.cogsGroup.title}
                    </div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 text-right font-mono text-rose-700">-{formatCur(incomeStatement.cogsGroup.total)}</div>
                    <div className="col-span-2"></div>
                  </div>

                  {viewMode === 'detailed' && !collapsedGroups['cogs'] && (
                    <div className="space-y-0.5 border-l-2 border-rose-500/20 pl-4 py-1">
                      {renderAccountTree(incomeStatement.cogsGroup.accounts)}
                    </div>
                  )}
                </div>

                {/* TOTAL COGS BAR */}
                <div className="grid grid-cols-12 gap-2 py-1.5 font-bold text-foreground border-t border-b bg-muted/20 px-2 rounded-md">
                  <div className="col-span-6 font-sans">TOTAL COST OF GOODS SOLD</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono text-rose-700">-{formatCur(incomeStatement.cogsGroup.total)}</div>
                </div>
              </div>

              {/* Gross Profit Subtotal */}
              <div className="grid grid-cols-12 gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 font-black text-sm border border-emerald-500/30">
                <div className="col-span-6 font-sans">GROSS PROFIT (Margin: {incomeStatement.grossMarginPct.toFixed(1)}%):</div>
                <div className="col-span-2"></div>
                <div className="col-span-2"></div>
                <div className="col-span-2 text-right font-mono">{formatCur(incomeStatement.grossProfit)}</div>
              </div>

              {/* 3. Operating Expenses */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-rose-800 dark:text-rose-300 uppercase border-b pb-1 font-sans">
                  <div className="col-span-6">3. OPERATING EXPENSES (OPEX)</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono"></div>
                </div>

                {incomeStatement.opexGroups.map(group => (
                  <div key={group.id} className="space-y-0.5 pl-2">
                    <div
                      onClick={() => toggleGroup(group.id)}
                      className="grid grid-cols-12 gap-2 py-1 font-bold text-foreground cursor-pointer hover:text-rose-600 transition-colors"
                    >
                      <div className="col-span-6 font-sans flex items-center gap-1.5">
                        {viewMode === 'detailed' && (
                          collapsedGroups[group.id] ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        {group.title}
                      </div>
                      <div className="col-span-2"></div>
                      <div className="col-span-2 text-right font-mono text-rose-700">-{formatCur(group.total)}</div>
                      <div className="col-span-2"></div>
                    </div>

                    {viewMode === 'detailed' && !collapsedGroups[group.id] && (
                      <div className="space-y-0.5 border-l-2 border-rose-500/20 pl-4 py-1">
                        {renderAccountTree(group.accounts)}
                      </div>
                    )}
                  </div>
                ))}

                {/* TOTAL OPEX BAR */}
                <div className="grid grid-cols-12 gap-2 py-1.5 font-bold text-foreground border-t border-b bg-muted/20 px-2 rounded-md">
                  <div className="col-span-6 font-sans">TOTAL OPERATING EXPENSES</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono text-rose-700">-{formatCur(incomeStatement.totalOperatingExpenses)}</div>
                </div>
              </div>

              {/* Operating Income / EBIT */}
              <div className="grid grid-cols-12 gap-2 p-3 rounded-xl bg-blue-500/10 text-blue-900 dark:text-blue-300 font-bold border border-blue-500/30">
                <div className="col-span-6 font-sans">OPERATING PROFIT / (EBIT):</div>
                <div className="col-span-2"></div>
                <div className="col-span-2"></div>
                <div className="col-span-2 text-right font-mono">{formatCur(incomeStatement.operatingIncomeEbit)}</div>
              </div>

              {/* 4. Finance Costs & Tax Provision */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-purple-800 dark:text-purple-300 uppercase border-b pb-1 font-sans">
                  <div className="col-span-6">4. FINANCE COSTS & TAX PROVISION (61500)</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono"></div>
                </div>

                <div className="space-y-0.5 pl-2">
                  <div
                    onClick={() => toggleGroup('fin_tax')}
                    className="grid grid-cols-12 gap-2 py-1 font-bold text-foreground cursor-pointer hover:text-purple-600 transition-colors"
                  >
                    <div className="col-span-6 font-sans flex items-center gap-1.5">
                      {viewMode === 'detailed' && (
                        collapsedGroups['fin_tax'] ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-purple-600" />
                      )}
                      {incomeStatement.financeGroup.title}
                    </div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2 text-right font-mono text-purple-700">-{formatCur(incomeStatement.financeGroup.total)}</div>
                    <div className="col-span-2"></div>
                  </div>

                  {viewMode === 'detailed' && !collapsedGroups['fin_tax'] && (
                    <div className="space-y-0.5 border-l-2 border-purple-500/20 pl-4 py-1">
                      {renderAccountTree(incomeStatement.financeGroup.accounts)}
                    </div>
                  )}
                </div>
              </div>

              {/* NET PROFIT TOTAL */}
              <div className="grid grid-cols-12 gap-2 p-4 rounded-xl bg-slate-900 text-white font-black text-base border-t-2 border-slate-700">
                <div className="col-span-6 font-sans uppercase">NET PROFIT / (LOSS) FOR PERIOD:</div>
                <div className="col-span-2"></div>
                <div className="col-span-2"></div>
                <div className={`col-span-2 text-right font-mono ${incomeStatement.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCur(incomeStatement.netProfit)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: STATEMENT OF CASH FLOWS (IAS 7) ───────────────────────────── */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-5 bg-muted/40 border-b flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider block">
                  {activeCompany.name}
                </span>
                <h3 className="text-base font-black text-foreground">
                  Statement of Cash Flows (IAS 7)
                </h3>
                <span className="text-xs text-muted-foreground">
                  Operating, Investing, and Financing Cash Movements and Liquidity Reconciliation.
                </span>
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs font-bold border">
                <button
                  onClick={() => setCashFlowMethod('indirect')}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${cashFlowMethod === 'indirect' ? 'bg-teal-600 text-white shadow-2xs' : 'text-muted-foreground'}`}
                >
                  Indirect Method
                </button>
                <button
                  onClick={() => setCashFlowMethod('direct')}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${cashFlowMethod === 'direct' ? 'bg-teal-600 text-white shadow-2xs' : 'text-muted-foreground'}`}
                >
                  Direct Method
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs font-mono">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-muted-foreground uppercase border-b-2 pb-2 font-sans">
                <div className="col-span-6">Cash Flow Activity</div>
                <div className="col-span-2 text-right">Detail</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-2 text-right text-foreground font-black">Net Cash ({activeCurrency})</div>
              </div>

              {/* 1. Operating Activities */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-teal-800 dark:text-teal-300 uppercase border-b pb-1 font-sans">
                  <div className="col-span-6">1. CASH FLOWS FROM OPERATING ACTIVITIES</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono"></div>
                </div>

                <div className="pl-3 space-y-1">
                  <div className="grid grid-cols-12 gap-2 py-1 font-bold text-foreground">
                    <div className="col-span-6 font-sans">Net Profit / (Loss) for the period:</div>
                    <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.netIncome)}</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-0.5 text-muted-foreground">
                    <div className="col-span-6 font-sans">+ Add: Non-Cash Depreciation & Amortization:</div>
                    <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.deprAddback)}</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-0.5 text-muted-foreground">
                    <div className="col-span-6 font-sans">(Increase) / Decrease in Accounts Receivable:</div>
                    <div className="col-span-2 text-right font-mono">{formatCur(-cashFlowStatement.arChange)}</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-0.5 text-muted-foreground">
                    <div className="col-span-6 font-sans">(Increase) / Decrease in Inventories:</div>
                    <div className="col-span-2 text-right font-mono">{formatCur(-cashFlowStatement.invChange)}</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-0.5 text-muted-foreground">
                    <div className="col-span-6 font-sans">Increase / (Decrease) in Accounts Payable:</div>
                    <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.apChange)}</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 p-2.5 rounded-xl bg-teal-500/10 text-teal-950 dark:text-teal-200 font-bold border border-teal-500/30">
                  <div className="col-span-6 font-sans">NET CASH GENERATED FROM OPERATING ACTIVITIES:</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.netOperatingCashFlow)}</div>
                </div>
              </div>

              {/* 2. Investing Activities */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-purple-800 dark:text-purple-300 uppercase border-b pb-1 font-sans">
                  <div className="col-span-6">2. CASH FLOWS FROM INVESTING ACTIVITIES</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.netInvestingCashFlow)}</div>
                </div>
                <div className="pl-3 space-y-1">
                  <div className="grid grid-cols-12 gap-2 py-1 text-muted-foreground">
                    <div className="col-span-6 font-sans">Capital Expenditures (CapEx - Fixed Assets):</div>
                    <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.netInvestingCashFlow)}</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                  </div>
                </div>
              </div>

              {/* 3. Financing Activities */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-blue-800 dark:text-blue-300 uppercase border-b pb-1 font-sans">
                  <div className="col-span-6">3. CASH FLOWS FROM FINANCING ACTIVITIES</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.netFinancingCashFlow)}</div>
                </div>
                <div className="pl-3 space-y-1">
                  <div className="grid grid-cols-12 gap-2 py-1 text-muted-foreground">
                    <div className="col-span-6 font-sans">Equity Contributions, Dividends & Long-Term Debt:</div>
                    <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.netFinancingCashFlow)}</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                  </div>
                </div>
              </div>

              {/* Reconciliation Check */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border-t-2 border-slate-700">
                <div className="grid grid-cols-12 gap-2 font-bold text-teal-300">
                  <div className="col-span-6 font-sans">NET INCREASE / (DECREASE) IN CASH & CASH EQUIVALENTS:</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.netCashChange)}</div>
                </div>
                <div className="grid grid-cols-12 gap-2 text-muted-foreground text-xs pt-1 border-t border-slate-800">
                  <div className="col-span-6 font-sans">Cash & Bank Balances at Beginning of Period:</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.openingCash)}</div>
                </div>
                <div className="grid grid-cols-12 gap-2 text-sm font-black text-emerald-400">
                  <div className="col-span-6 font-sans uppercase">CASH & BANK BALANCES AT END OF PERIOD:</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right font-mono">{formatCur(cashFlowStatement.closingCash)}</div>
                </div>

                {viewMode === 'detailed' && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block">Detailed Cash & Cash Equivalents Breakdown:</span>
                    {cashFlowStatement.cashAccounts.map(a => (
                      <div key={a.id} className="grid grid-cols-12 gap-2 text-slate-300">
                        <div className="col-span-6">• {a.code} — {a.name}</div>
                        <div className="col-span-2 text-right font-mono text-emerald-400">{formatCur(ledgerState.closingBalances[a.id] || 0)}</div>
                        <div className="col-span-2"></div>
                        <div className="col-span-2"></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: 6-COLUMN TRIAL BALANCE ───────────────────────────────────── */}
      {activeTab === 'trialbalance' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search account code, title, or type..."
                value={tbSearch}
                onChange={e => setTbSearch(e.target.value)}
                className="max-w-xs text-xs h-9"
              />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={showZeroBalances}
                  onChange={e => setShowZeroBalances(e.target.checked)}
                  className="rounded border-border text-teal-600 focus:ring-teal-500"
                />
                Show Zero Balance Accounts
              </label>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex p-0.5 bg-muted rounded-lg border border-border text-xs font-semibold shadow-2xs">
                <button
                  onClick={() => setTbFilterMode('active_only')}
                  className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                    tbFilterMode === 'active_only'
                      ? 'bg-teal-600 text-white font-bold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Filter out voided/reversed pairs so Period Movements reflect only genuine active transactions"
                >
                  🟢 Active Invoices Only (Net Clean)
                </button>
                <button
                  onClick={() => setTbFilterMode('all_postings')}
                  className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer ${
                    tbFilterMode === 'all_postings'
                      ? 'bg-teal-600 text-white font-bold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Show full gross debit and credit movements including cancelled transactions for auditor forensic review"
                >
                  🔍 Full Audit Trail (Include Voids)
                </button>
              </div>

              <div className="text-xs font-bold text-muted-foreground">
                Total Posting Ledgers: <strong className="text-teal-600">{trialBalanceRows.length}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/80 border-b text-[10px] font-black uppercase text-muted-foreground">
                    <th rowSpan={2} className="p-2.5 pl-4 border-r">Code</th>
                    <th rowSpan={2} className="p-2.5 border-r">Account Title</th>
                    <th rowSpan={2} className="p-2.5 border-r">Head Type</th>
                    <th colSpan={2} className="p-2 text-center border-r bg-slate-100 dark:bg-slate-800">
                      PERIOD MOVEMENTS
                    </th>
                    <th colSpan={2} className="p-2 text-center pr-4 bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200">
                      CLOSING TRIAL BALANCE
                    </th>
                  </tr>
                  <tr className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground">
                    <th className="p-2 text-right border-r">Debit (Dr)</th>
                    <th className="p-2 text-right border-r">Credit (Cr)</th>
                    <th className="p-2 text-right text-teal-700 font-black border-r">Debit (Dr)</th>
                    <th className="p-2 pr-4 text-right text-teal-700 font-black">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-[11px]">
                  {viewMode === 'detailed' ? (
                    trialBalanceGrouped.map(cat => (
                      <React.Fragment key={cat.id}>
                        {/* Category Header Row in Detailed Mode */}
                        <tr
                          onClick={() => toggleGroup(cat.id)}
                          className="bg-muted/40 font-bold font-sans text-xs cursor-pointer hover:bg-muted/60 transition-colors"
                        >
                          <td colSpan={7} className="p-2 pl-4 text-teal-700 dark:text-teal-400">
                            <div className="flex items-center gap-1.5">
                              {collapsedGroups[cat.id] ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              <span>{cat.title} ({cat.rows.length} accounts)</span>
                            </div>
                          </td>
                        </tr>
                        {!collapsedGroups[cat.id] && cat.rows.map(r => (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2.5 pl-4 font-bold text-foreground">{r.code}</td>
                            <td className="p-2.5 font-sans font-semibold text-foreground border-r">{r.name}</td>
                            <td className="p-2.5 font-sans text-muted-foreground border-r">{r.type}</td>

                            <td className="p-2 text-right text-muted-foreground border-r">
                              {r.periodDebit > 0 ? r.periodDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </td>
                            <td className="p-2 text-right text-muted-foreground border-r">
                              {r.periodCredit > 0 ? r.periodCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </td>

                            <td className="p-2 text-right font-bold text-teal-800 dark:text-teal-300 border-r bg-teal-50/20">
                              {r.closingDebit > 0 ? r.closingDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </td>
                            <td className="p-2 pr-4 text-right font-bold text-teal-800 dark:text-teal-300 bg-teal-50/20">
                              {r.closingCredit > 0 ? r.closingCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    trialBalanceRows.map(r => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 pl-4 font-bold text-foreground">{r.code}</td>
                        <td className="p-2.5 font-sans font-semibold text-foreground border-r">{r.name}</td>
                        <td className="p-2.5 font-sans text-muted-foreground border-r">{r.type}</td>

                        <td className="p-2 text-right text-muted-foreground border-r">
                          {r.periodDebit > 0 ? r.periodDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="p-2 text-right text-muted-foreground border-r">
                          {r.periodCredit > 0 ? r.periodCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                        </td>

                        <td className="p-2 text-right font-bold text-teal-800 dark:text-teal-300 border-r bg-teal-50/20">
                          {r.closingDebit > 0 ? r.closingDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="p-2 pr-4 text-right font-bold text-teal-800 dark:text-teal-300 bg-teal-50/20">
                          {r.closingCredit > 0 ? r.closingCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-mono text-[11px] font-black border-t-2 border-slate-700">
                    <td colSpan={3} className="p-3 pl-4 text-right font-sans text-xs uppercase text-teal-300 border-r">
                      TRIAL BALANCE TOTALS:
                    </td>
                    <td className="p-3 text-right border-r">
                      {trialBalanceTotals.periodDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right border-r">
                      {trialBalanceTotals.periodCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right text-emerald-400 border-r">
                      {trialBalanceTotals.closingDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 pr-4 text-right text-emerald-400">
                      {trialBalanceTotals.closingCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: EXECUTIVE COCKPIT ─────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 rounded-2xl border bg-card shadow-xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                <span>Total Gross Revenue</span>
                <TrendingUp className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black font-mono text-foreground mt-2">
                {formatCur(incomeStatement.grossRevenue)}
              </div>
              <span className="text-[11px] text-teal-600 font-bold mt-1 block">Operating Revenue</span>
            </Card>

            <Card className="p-4 rounded-2xl border bg-card shadow-xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                <span>Gross Profit Margin</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 mt-2">
                {incomeStatement.grossMarginPct.toFixed(1)}%
              </div>
              <span className="text-[11px] text-muted-foreground font-bold mt-1 block">
                Gross Profit: {formatCur(incomeStatement.grossProfit)}
              </span>
            </Card>

            <Card className="p-4 rounded-2xl border bg-card shadow-xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                <span>Net Period Profit</span>
                {incomeStatement.netProfit >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-rose-600" />}
              </div>
              <div className={`text-2xl font-black font-mono mt-2 ${incomeStatement.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCur(incomeStatement.netProfit)}
              </div>
              <span className="text-[11px] text-muted-foreground font-bold mt-1 block">
                Net Margin: {incomeStatement.netMarginPct.toFixed(1)}%
              </span>
            </Card>

            <Card className="p-4 rounded-2xl border bg-card shadow-xs">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                <span>Operating Cash Flow</span>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black font-mono text-blue-600 mt-2">
                {formatCur(cashFlowStatement.netOperatingCashFlow)}
              </div>
              <span className="text-[11px] text-muted-foreground font-bold mt-1 block">
                Closing Cash: {formatCur(cashFlowStatement.closingCash)}
              </span>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 6: STATEMENT OF CHANGES IN EQUITY ────────────────────────────── */}
      {activeTab === 'equity' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-5 bg-muted/40 border-b flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-foreground">Statement of Changes in Equity (IAS 1)</h3>
                <span className="text-xs text-muted-foreground">Share Capital, Reserves, and Retained Earnings Movements.</span>
              </div>
            </div>
            <div className="p-6 text-xs font-mono">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/80 border-b text-[10px] font-black uppercase text-muted-foreground">
                    <th className="p-3 pl-4">Equity Component</th>
                    <th className="p-3 text-right">Opening Balance</th>
                    <th className="p-3 text-right">Period Movement</th>
                    <th className="p-3 pr-4 text-right font-black text-blue-800">Ending Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/30">
                    <td className="p-3 pl-4 font-bold text-foreground font-sans">Share Capital / Paid-In Capital (31000)</td>
                    <td className="p-3 text-right">{formatCur(balanceSheet.totalBaseEquity)}</td>
                    <td className="p-3 text-right">{formatCur(0)}</td>
                    <td className="p-3 pr-4 text-right font-bold">{formatCur(balanceSheet.totalBaseEquity)}</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="p-3 pl-4 font-bold text-foreground font-sans">Retained Net Income for Period (P&L)</td>
                    <td className="p-3 text-right">{formatCur(0)}</td>
                    <td className="p-3 text-right text-emerald-600 font-bold">{formatCur(balanceSheet.netPeriodIncome)}</td>
                    <td className="p-3 pr-4 text-right font-bold text-emerald-600">{formatCur(balanceSheet.netPeriodIncome)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-mono text-[11px] font-black border-t-2 border-slate-700">
                    <td className="p-3.5 pl-4 uppercase font-sans text-teal-300">TOTAL SHAREHOLDERS' EQUITY:</td>
                    <td className="p-3.5 text-right">{formatCur(balanceSheet.totalBaseEquity)}</td>
                    <td className="p-3.5 text-right text-teal-300">{formatCur(balanceSheet.netPeriodIncome)}</td>
                    <td className="p-3.5 pr-4 text-right text-emerald-400">{formatCur(balanceSheet.totalEquity)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 7: FINANCIAL HEALTH RATIOS ───────────────────────────────────── */}
      {activeTab === 'ratios' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Card className="p-5 rounded-2xl border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Current Ratio (Liquidity)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ratios.currentRatio >= 1.5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {ratios.currentRatio >= 1.5 ? 'Healthy (≥ 1.5x)' : 'Monitor'}
                </span>
              </div>
              <div className="text-3xl font-black font-mono text-foreground">{ratios.currentRatio.toFixed(2)}x</div>
              <p className="text-[11px] text-muted-foreground">Current Assets / Current Liabilities. Short-term solvency.</p>
            </Card>

            <Card className="p-5 rounded-2xl border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Quick Ratio (Acid Test)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ratios.quickRatio >= 1.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {ratios.quickRatio >= 1.0 ? 'Strong (≥ 1.0x)' : 'Low'}
                </span>
              </div>
              <div className="text-3xl font-black font-mono text-foreground">{ratios.quickRatio.toFixed(2)}x</div>
              <p className="text-[11px] text-muted-foreground">(Cash + Receivables) / Current Liabilities.</p>
            </Card>

            <Card className="p-5 rounded-2xl border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Debt-to-Equity (Leverage)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Solvency</span>
              </div>
              <div className="text-3xl font-black font-mono text-foreground">{ratios.debtToEquity.toFixed(2)}x</div>
              <p className="text-[11px] text-muted-foreground">Total Liabilities / Total Equity.</p>
            </Card>

            <Card className="p-5 rounded-2xl border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Net Working Capital</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">Buffer</span>
              </div>
              <div className="text-2xl font-black font-mono text-teal-700 dark:text-teal-400">{formatCur(ratios.workingCapital)}</div>
              <p className="text-[11px] text-muted-foreground">Current Assets minus Current Liabilities.</p>
            </Card>

            <Card className="p-5 rounded-2xl border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Return on Assets (ROA)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Efficiency</span>
              </div>
              <div className="text-3xl font-black font-mono text-foreground">{ratios.returnOnAssets.toFixed(1)}%</div>
              <p className="text-[11px] text-muted-foreground">Net Profit / Total Assets.</p>
            </Card>

            <Card className="p-5 rounded-2xl border bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Return on Equity (ROE)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Shareholder Value</span>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-600">{ratios.returnOnEquity.toFixed(1)}%</div>
              <p className="text-[11px] text-muted-foreground">Net Profit / Shareholders' Equity.</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
export default FinancialReports;
