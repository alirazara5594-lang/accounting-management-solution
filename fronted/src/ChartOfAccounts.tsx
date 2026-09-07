import React, { useState, useMemo, useEffect } from 'react';
import { useCoaStore, useJournalsStore, useSalesStore, useProcurementStore } from './stores';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Edit3, Plus, 
  ChevronDown, ChevronRight, Lock, Unlock, Folder, FolderOpen, 
  FileText, Shield, ShieldCheck, PieChart, ArrowRight, Eye, Calendar, User, CheckCircle,
  RefreshCw, Upload
} from 'lucide-react';
import { money, getActiveCurrency } from '@/lib/currency';
import { downloadCSV, downloadExcel, downloadPDF } from '@/lib/exportUtils';
import ExportDropdown from '@/components/ExportDropdown';
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

import { type Account } from './api/modules/coa.api';
type AccountType = string;

interface ChartOfAccountsProps {
  accounts: Account[];
  edit: (a: Account) => void;
  status: (a: Account) => void;
  openCreate: () => void;
  setParentIdForNew: (parentId: string) => void;
  reloadAccounts?: () => void;
}

const formatCurrency = (val: number, currency?: string) => {
  const cur = (currency || getActiveCurrency()).toUpperCase();
  const formatted = money(Math.abs(val), cur);
  return val < 0 ? `(${formatted})` : formatted; // GAAP standard parentheses for negative balances
};

export const inferSubtype = (code: string, type: string): string => {
  if (!code) return '';
  const num = parseInt(code, 10);
  
  if (type === 'Asset' || type === 'ContraAsset') {
    if (!isNaN(num)) {
      if (num >= 10000 && num < 15000) return 'Current Assets';
      if (num >= 15000) return 'Non-Current Assets';
    }
    return code.startsWith('11') || code.startsWith('12') || code.startsWith('13') || code.startsWith('14')
      ? 'Current Assets' : 'Non-Current Assets';
  }
  
  if (type === 'Liability' || type === 'ContraLiability') {
    if (!isNaN(num)) {
      if (num >= 20000 && num < 25000) return 'Current Liabilities';
      if (num >= 25000) return 'Non-Current Liabilities';
    }
    return code.startsWith('25') || code.startsWith('26') || code.startsWith('27') || code.startsWith('28')
      ? 'Non-Current Liabilities' : 'Current Liabilities';
  }
  
  if (type === 'Equity' || type === 'ContraEquity') {
    if (!isNaN(num) && num >= 30000 && num < 32000) return 'Share Capital & Premium';
    return 'Retained Earnings & Reserves';
  }
  
  if (type === 'Revenue' || type === 'ContraRevenue') {
    if (!isNaN(num) && num >= 40000 && num < 42000) return 'Operating Revenue';
    return 'Non-Operating Revenue';
  }
  
  if (type === 'Expense' || type === 'ContraExpense') {
    if (!isNaN(num) && num >= 50000 && num < 60000) return 'Cost of Goods Sold';
    if (!isNaN(num) && num >= 60000 && num < 62000) return 'Operating Expenses';
    return 'Non-Operating Expenses';
  }
  
  return '';
};

export const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({
  accounts: propAccounts,
  edit,
  status,
  openCreate,
  setParentIdForNew,
  reloadAccounts
}) => {
  // Direct store subscription for real-time reactivity
  const storeAccounts = useCoaStore(s => s.accounts as Account[]);
  const accounts = storeAccounts.length > 0 ? storeAccounts : propAccounts;

  // Store subscriptions
  const journalEntries = useJournalsStore(s => s.entries);
  const fetchJournalEntries = useJournalsStore(s => s.fetchJournalEntries);
  const salesInvoices = useSalesStore(s => s.invoices);
  const fetchInvoices = useSalesStore(s => s.fetchInvoices);
  const vendorBills = useProcurementStore(s => s.bills);
  const fetchBills = useProcurementStore(s => s.fetchBills);
  const fetchAccounts = useCoaStore(s => s.fetchAccounts);
  const toggleAccountSecurity = useCoaStore(s => s.toggleAccountSecurity);

  // Drill-down audit explorer states
  const [selectedMainHead, setSelectedMainHead] = useState<string | null>(null);
  const [selectedSubHead, setSelectedSubHead] = useState<string | null>(null);
  const [selectedGLAccountId, setSelectedGLAccountId] = useState<string | null>(null);
  const [activeSourceTx, setActiveSourceTx] = useState<any | null>(null);
  const [glSearchQuery, setGlSearchQuery] = useState('');

  // Primary list view states
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedSecurity, setSelectedSecurity] = useState<string>('All');
  const [showDeactivated, setShowDeactivated] = useState<boolean>(true);
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});

  // Fetch audit trail dependencies on load
  useEffect(() => {
    fetchAccounts();
    fetchJournalEntries();
    fetchInvoices();
    fetchBills();
  }, [fetchAccounts, fetchJournalEntries, fetchInvoices, fetchBills]);

  // Centralized balance calculation engine mapping all transaction records to their specific account IDs
  const accountBalances = useMemo(() => {
    const balances: Record<string, { debits: number; credits: number; net: number }> = {};
    
    // Initialize account balances
    accounts.forEach(a => {
      balances[a.id] = { debits: 0, credits: 0, net: a.openingBalance };
    });

    // Traverse all posted journal entries
    const posted = journalEntries.filter(e => String(e.status) === 'Posted' || String(e.status) === '3');
    
    posted.forEach(entry => {
      entry.lines?.forEach(line => {
        if (balances[line.accountId]) {
          balances[line.accountId].debits += line.debit || 0;
          balances[line.accountId].credits += line.credit || 0;
        }
      });
    });

    // Compute net balance based on normal balance type
    accounts.forEach(a => {
      const b = balances[a.id];
      const isDebitNormal = ['Asset', 'Expense', 'ContraLiability', 'ContraEquity', 'ContraRevenue'].includes(a.type);
      if (isDebitNormal) {
        b.net = a.openingBalance + b.debits - b.credits;
      } else {
        b.net = a.openingBalance + b.credits - b.debits;
      }
    });

    return balances;
  }, [accounts, journalEntries]);

  // Recursive balance resolver for rolled-up parent headers
  const getAccountBalancesRecursive = (accId: string): { opening: number; debits: number; credits: number; current: number } => {
    const account = accounts.find(a => a.id === accId);
    if (!account) return { opening: 0, debits: 0, credits: 0, current: 0 };

    const direct = accountBalances[accId] || { debits: 0, credits: 0, net: account.openingBalance };
    
    let opening = account.openingBalance;
    let debits = direct.debits;
    let credits = direct.credits;
    let current = direct.net;

    // Traverse children
    const children = accounts.filter(a => a.parentId === accId);
    for (const child of children) {
      const childBal = getAccountBalancesRecursive(child.id);
      opening += childBal.opening;
      debits += childBal.debits;
      credits += childBal.credits;
      current += childBal.current;
    }

    return { opening, debits, credits, current };
  };

  // New filter and pagination states matching mockup
  const [selectedSubtype, setSelectedSubtype] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Derive unique subtypes and header accounts for filter dropdowns
  const allSubtypes = useMemo(() => {
    const subs = accounts.map(a => a.subtype || inferSubtype(a.code, a.type)).filter(Boolean) as string[];
    return Array.from(new Set(subs)).sort();
  }, [accounts]);

  const headerAccounts = useMemo(() => {
    return accounts.filter(a => !a.isPosting).sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts]);

  const isFiltering = !!query.trim() || selectedType !== 'All' || selectedSubtype !== 'All' || selectedStatus !== 'All' || selectedGroup !== 'All' || selectedSecurity !== 'All';

  // Flat account view for searching
  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      // 1. Status Filter
      if (selectedStatus !== 'All') {
        if (a.status !== selectedStatus) return false;
      } else {
        if (!showDeactivated && a.status === 'Inactive') return false;
      }
      
      // 2. Security / Protection Filter
      if (selectedSecurity === 'Secured') {
        if (!a.isSystem) return false;
      } else if (selectedSecurity === 'Custom') {
        if (a.isSystem) return false;
      }

      // 3. Type Filter
      if (selectedType !== 'All') {
        const baseType = a.type.replace('Contra', '');
        if (baseType !== selectedType) return false;
      }
      
      // 4. Subtype Filter
      if (selectedSubtype !== 'All') {
        const sub = a.subtype || inferSubtype(a.code, a.type) || 'General';
        if (sub !== selectedSubtype) return false;
      }

      // 5. Group Filter (Parent Account ID)
      if (selectedGroup !== 'All') {
        if (a.parentId !== selectedGroup) return false;
      }

      // 6. Search query
      if (query.trim()) {
        const lower = query.toLowerCase();
        return (
          a.code.toLowerCase().includes(lower) ||
          a.name.toLowerCase().includes(lower) ||
          (a.subtype || '').toLowerCase().includes(lower) ||
          a.type.toLowerCase().includes(lower)
        );
      }
      return true;
    }).sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, query, selectedType, selectedSubtype, selectedStatus, selectedGroup, selectedSecurity, showDeactivated]);

  // Pre-order traversal tree builder
  const treeCategories = useMemo(() => {
    if (isFiltering) return [];

    const categories = [
      { name: 'Assets', typeKeys: ['Asset', 'ContraAsset'] },
      { name: 'Liabilities', typeKeys: ['Liability', 'ContraLiability'] },
      { name: 'Equity', typeKeys: ['Equity', 'ContraEquity'] },
      { name: 'Revenue', typeKeys: ['Revenue', 'ContraRevenue'] },
      { name: 'Expenses', typeKeys: ['Expense', 'ContraExpense'] }
    ];

    return categories.map(cat => {
      const topLevel = accounts.filter(a => 
        cat.typeKeys.includes(a.type) && 
        (!a.parentId || !accounts.some(parent => parent.id === a.parentId)) &&
        (showDeactivated || a.status === 'Active')
      ).sort((a, b) => a.code.localeCompare(b.code));

      const flattened: { account: Account; depth: number; hasChildren: boolean }[] = [];
      const traverse = (nodeList: Account[], depth: number) => {
        for (const node of nodeList) {
          const children = accounts.filter(a => a.parentId === node.id && (showDeactivated || a.status === 'Active'));
          flattened.push({
            account: node,
            depth,
            hasChildren: children.length > 0
          });

          if (!collapsedIds[node.id]) {
            const sortedChildren = [...children].sort((a, b) => a.code.localeCompare(b.code));
            traverse(sortedChildren, depth + 1);
          }
        }
      };

      traverse(topLevel, 0);

      return {
        name: cat.name,
        items: flattened
      };
    }).filter(c => c.items.length > 0);
  }, [accounts, collapsedIds, showDeactivated, isFiltering]);

  const categoryTotals = useMemo(() => {
    const getCategoryTotal = (typeKeys: string[]): number => {
      return accounts
        .filter(a => typeKeys.includes(a.type) && (!a.parentId || !accounts.some(p => p.id === a.parentId)))
        .reduce((sum, a) => sum + getAccountBalancesRecursive(a.id).current, 0);
    };

    return {
      Asset: getCategoryTotal(['Asset', 'ContraAsset']),
      Liability: getCategoryTotal(['Liability', 'ContraLiability']),
      Equity: getCategoryTotal(['Equity', 'ContraEquity']),
      Revenue: getCategoryTotal(['Revenue', 'ContraRevenue']),
      Expense: getCategoryTotal(['Expense', 'ContraExpense']),
    };
  }, [accounts, accountBalances]);

  // Unified list of all tree items, in hierarchical preorder, for pagination support
  const flattenedTreeList = useMemo(() => {
    const list: { account: Account; depth: number; hasChildren: boolean }[] = [];
    
    // If user is searching or using advanced filters, show flat results
    if (query.trim() || selectedType !== 'All' || selectedSubtype !== 'All' || selectedStatus !== 'All' || selectedGroup !== 'All' || selectedSecurity !== 'All') {
      filteredAccounts.forEach(acc => {
        list.push({
          account: acc,
          depth: 0,
          hasChildren: false
        });
      });
      return list;
    }

    // Otherwise, build structural list by stitching together flattened tree categories
    treeCategories.forEach(cat => {
      list.push(...cat.items);
    });
    return list;
  }, [treeCategories, filteredAccounts, query, selectedType, selectedSubtype, selectedStatus, selectedGroup, selectedSecurity]);

  // Paginated window
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return flattenedTreeList.slice(start, start + itemsPerPage);
  }, [flattenedTreeList, currentPage, itemsPerPage]);

  const totalEntries = flattenedTreeList.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedType, selectedSubtype, selectedStatus, selectedGroup, selectedSecurity, showDeactivated]);

  // Direct toggle security handler
  const handleToggleSecurity = async (acc: Account) => {
    try {
      await toggleAccountSecurity(acc);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle account security.');
    }
  };

  // Export actions via ExportDropdown
  const listToExport = isFiltering ? filteredAccounts : accounts;

  const handleExportPDF = () => {
    const title = 'CHART OF ACCOUNTS REGISTER';
    const subtitle = `Complete ledger structure, classification, and normal balances (${listToExport.length} accounts)`;
    const headers = ['Code', 'Account Name', 'Major Type', 'Subtype', 'Currency', 'Security', 'Status'];
    const rows = listToExport.map(a => [
      a.code,
      a.name,
      a.type,
      a.subtype || 'General',
      a.currency || 'USD',
      a.isSystem ? '🔒 Secured' : 'Custom',
      a.status
    ]);
    const totals = [
      { label: 'TOTAL ACCOUNTS', value: listToExport.length },
      { label: 'SECURED SYSTEM CONTROL LEDGERS', value: listToExport.filter(a => a.isSystem).length }
    ];
    downloadPDF(title, subtitle, headers, rows, totals);
  };

  const handleExportExcel = () => {
    const filename = `Chart_of_Accounts_${new Date().toISOString().slice(0, 10)}`;
    const headers = ['Account Code', 'Account Name', 'Major Type', 'Subtype', 'Posting Leaf', 'Normal Balance', 'Currency', 'Security Status', 'Status'];
    const rows = listToExport.map(a => [
      a.code,
      a.name,
      a.type,
      a.subtype || 'General',
      a.isPosting ? 'Yes' : 'No',
      a.normalBalance,
      a.currency || 'USD',
      a.isSystem ? 'Secured / System' : 'Custom',
      a.status
    ]);
    downloadExcel(filename, 'ChartOfAccounts', headers, rows);
  };

  const handleExportCSV = () => {
    const filename = `Chart_of_Accounts_${new Date().toISOString().slice(0, 10)}.csv`;
    const headers = ['Code', 'Name', 'Type', 'Subtype', 'Posting', 'NormalBalance', 'Currency', 'Security', 'Status'];
    const rows = listToExport.map(a => [
      a.code,
      a.name,
      a.type,
      a.subtype || 'General',
      a.isPosting ? 'Yes' : 'No',
      a.normalBalance,
      a.currency || 'USD',
      a.isSystem ? 'Secured' : 'Custom',
      a.status
    ]);
    downloadCSV(filename, headers, rows);
  };

  const handleImportCSV = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      let createdCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (parts.length >= 6) {
          const code = parts[0].replace(/"/g, '').trim();
          const name = parts[1].replace(/"/g, '').trim();
          const type = parts[2].replace(/"/g, '').trim() as AccountType;
          const subtype = parts[3].replace(/"/g, '').trim();
          const currency = parts[7]?.replace(/"/g, '').trim() || 'USD';
          const openingBalance = parseFloat(parts[8]) || 0;

          try {
            await useCoaStore.getState().saveAccount({
              code,
              name,
              type,
              subtype,
              currency,
              openingBalance,
              parentId: null,
              reconciliationEnabled: false,
              isSystem: false
            });
            createdCount++;
          } catch (err) {
            console.error('Import error for row', i, err);
          }
        }
      }

      alert(`Successfully imported ${createdCount} accounts from CSV!`);
      if (reloadAccounts) reloadAccounts();
    };
    reader.readAsText(file);
  };

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // General Ledger detail loader
  const glAccount = useMemo(() => {
    if (!selectedGLAccountId) return null;
    return accounts.find(a => a.id === selectedGLAccountId) || null;
  }, [selectedGLAccountId, accounts]);

  const glLines = useMemo(() => {
    if (!selectedGLAccountId || !glAccount) return [];
    
    const lines: any[] = [];
    const posted = journalEntries.filter(e => {
      const s = String(e.status || '').toLowerCase();
      return s === 'posted' || s === '3' || s === 'reversed' || s === '4' || !e.status;
    });

    posted.forEach(entry => {
      entry.lines?.forEach(line => {
        if (line.accountId === selectedGLAccountId) {
          lines.push({
            date: entry.date,
            reference: entry.reference,
            description: line.memo || entry.description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            entry
          });
        }
      });
    });

    // Sort chronologically
    lines.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balances
    let running = glAccount.openingBalance;
    const isDebitNormal = ['Asset', 'Expense', 'ContraLiability', 'ContraEquity', 'ContraRevenue'].includes(glAccount.type);

    return lines.map(l => {
      if (isDebitNormal) {
        running = running + l.debit - l.credit;
      } else {
        running = running + l.credit - l.debit;
      }
      return { ...l, runningBalance: running };
    });
  }, [selectedGLAccountId, glAccount, journalEntries]);

  const reversedGLRefsSet = useMemo(() => {
    const set = new Set<string>();
    journalEntries.forEach(e => {
      if (e.reference && e.reference.startsWith('REV-')) {
        set.add(e.reference.replace('REV-', ''));
      }
    });
    return set;
  }, [journalEntries]);

  // Filtered GL lines based on text query
  const filteredGLLines = useMemo(() => {
    return glLines.filter(line => {
      if (!glSearchQuery.trim()) return true;
      const lower = glSearchQuery.toLowerCase();
      return (
        line.reference?.toLowerCase().includes(lower) ||
        line.description?.toLowerCase().includes(lower) ||
        line.date.includes(lower)
      );
    });
  }, [glLines, glSearchQuery]);

  // Source transaction finder
  const sourceTxDetails = useMemo(() => {
    if (!activeSourceTx) return null;
    
    const ref = activeSourceTx.reference || '';
    
    // Look for matching Sales Invoice
    const inv = salesInvoices.find(i => i.invoiceNumber === ref || ref.includes(i.invoiceNumber));
    if (inv) {
      return { type: 'Invoice', data: inv };
    }

    // Look for matching Vendor Bill
    const bill = vendorBills.find(b => b.billNumber === ref || ref.includes(b.billNumber));
    if (bill) {
      return { type: 'Bill', data: bill };
    }

    return { type: 'Journal', data: activeSourceTx };
  }, [activeSourceTx, salesInvoices, vendorBills]);

  // Renders a visual row in the COA explorer list
  const renderRow = (acc: Account, depth = 0, hasChildren = false) => {
    const isDeactivated = acc.status === 'Inactive';
    const parentAccount = accounts.find(p => p.id === acc.parentId);

    const baseType = acc.type.replace('Contra', '');
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      Asset: { bg: 'bg-blue-50 text-blue-700 border-blue-200/50', text: 'text-blue-700 border-blue-200/50', border: 'border-blue-200/50' },
      Liability: { bg: 'bg-rose-50 text-rose-700 border-rose-200/50', text: 'text-rose-700 border-rose-200/50', border: 'border-rose-200/50' },
      Equity: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/50', text: 'text-emerald-700 border-emerald-200/50', border: 'border-emerald-200/50' },
      Revenue: { bg: 'bg-purple-50 text-purple-700 border-purple-200/50', text: 'text-purple-700 border-purple-200/50', border: 'border-purple-200/50' },
      Expense: { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200/50', text: 'text-cyan-700 border-cyan-200/50', border: 'border-cyan-200/50' }
    };
    
    const theme = colorMap[baseType] || { bg: 'bg-slate-50 text-slate-700 border-slate-200/50', text: 'text-slate-700 border-slate-200/50', border: 'border-slate-200/50' };
    const displaySubtype = acc.subtype || inferSubtype(acc.code, acc.type) || (acc.isPosting ? 'General' : 'Header');

    return (
      <TableRow
        key={acc.id}
        className={`group transition-all hover:bg-slate-50/80 ${isDeactivated ? 'opacity-50 bg-slate-50/20' : ''}`}
      >
        {/* 1. Account Code */}
        <TableCell className="py-2.5 pl-4 font-mono text-xs font-semibold">
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: depth * 16 }}>
            {depth > 0 && (
              <span className="text-slate-300 font-mono mr-2 select-none" style={{ fontSize: 13 }}>
                ├─
              </span>
            )}
            
            {hasChildren && !isFiltering ? (
              <button 
                onClick={(e) => toggleCollapse(acc.id, e)} 
                className="p-1 mr-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer flex items-center justify-center transition-colors"
              >
                {collapsedIds[acc.id] ? <ChevronRight size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-600" />}
              </button>
            ) : (
              !isFiltering && <span style={{ width: 22, display: 'inline-block' }} />
            )}
            
            {!isFiltering && (
              <span className="mr-2 text-slate-400">
                {hasChildren ? (
                  collapsedIds[acc.id] ? <Folder size={14} className="fill-slate-100" /> : <FolderOpen size={14} className="fill-slate-100 text-slate-500" />
                ) : (
                  <FileText size={14} />
                )}
              </span>
            )}
            <span className="text-slate-700 font-mono">{acc.code}</span>
          </div>
        </TableCell>

        {/* 2. Account Name */}
        <TableCell className="py-2.5">
          <div className="flex items-center gap-2">
            <span
              onClick={() => edit(acc)}
              className={`text-xs text-blue-700 tracking-tight hover:underline cursor-pointer transition-colors ${!acc.isPosting ? 'font-bold text-blue-700' : 'font-medium'}`}
            >
              {acc.name}
            </span>
            {acc.isSystem ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                <Lock className="w-2.5 h-2.5" />
                Secured
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-medium text-slate-500">
                Custom
              </span>
            )}
          </div>
        </TableCell>

        {/* 3. Account Type */}
        <TableCell className="py-2.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${theme.bg} border ${theme.border}`}>
            {acc.type}
          </span>
        </TableCell>

        {/* 4. Account Sub Type */}
        <TableCell className="py-2.5 text-xs text-slate-500 font-medium">
          {displaySubtype}
        </TableCell>

        {/* 5. Parent Account */}
        <TableCell className="py-2.5 text-xs text-slate-500 font-medium">
          {parentAccount ? `${parentAccount.code} - ${parentAccount.name}` : '—'}
        </TableCell>

        {/* 6. Currency */}
        <TableCell className="py-2.5 text-xs text-slate-600 font-mono uppercase">
          {acc.currency || 'USD'}
        </TableCell>

        {/* 7. Status */}
        <TableCell className="py-2.5">
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${isDeactivated ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            {acc.status}
          </span>
        </TableCell>

        {/* 8. Action (View GL, Edit, Toggle Security, Toggle Status) */}
        <TableCell className="py-2.5 text-right pr-4">
          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {acc.isPosting && (
              <button
                onClick={() => setSelectedGLAccountId(acc.id)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="View General Ledger"
              >
                <Eye size={14} />
              </button>
            )}
            <button 
              onClick={() => edit(acc)} 
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Edit Account Properties"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => handleToggleSecurity(acc)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                acc.isSystem
                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
              }`}
              title={acc.isSystem ? "🔒 Secured Account (Click to Unlock/Unsecure)" : "🛡️ Custom Account (Click to Secure as Core Ledger)"}
            >
              {acc.isSystem ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            <button 
              onClick={() => status(acc)} 
              disabled={acc.isSystem}
              className={`p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ${acc.isSystem ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={acc.isSystem ? "Protected System Account: Cannot deactivate" : "Toggle Status (Active / Inactive)"}
            >
              <Shield size={14} />
            </button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // DRILL-DOWN SUMMARY CALCULATIONS
  const drillDownData = useMemo(() => {
    const getSub = (a: Account) => a.subtype || inferSubtype(a.code, a.type) || 'General';

    // 1. Level 1: Main Heads
    if (!selectedMainHead) {
      const heads = [
        { name: 'Assets', typeKeys: ['Asset', 'ContraAsset'] },
        { name: 'Liabilities', typeKeys: ['Liability', 'ContraLiability'] },
        { name: 'Equity', typeKeys: ['Equity', 'ContraEquity'] },
        { name: 'Revenue', typeKeys: ['Revenue', 'ContraRevenue'] },
        { name: 'Expenses', typeKeys: ['Expense', 'ContraExpense'] }
      ];

      return heads.map(h => {
        let opening = 0;
        let debits = 0;
        let credits = 0;
        let current = 0;
        let count = 0;

        const categoryAccounts = accounts.filter(a => h.typeKeys.includes(a.type));
        count = categoryAccounts.length;

        // Group root/top accounts for recursive hierarchy balance calculation
        const rootCategoryAccounts = categoryAccounts.filter(a => !a.parentId || !accounts.some(p => p.id === a.parentId));
        rootCategoryAccounts.forEach(a => {
          const rec = getAccountBalancesRecursive(a.id);
          opening += rec.opening;
          debits += rec.debits;
          credits += rec.credits;
          current += rec.current;
        });

        return {
          key: h.name,
          name: h.name,
          accountsCount: count,
          opening,
          debits,
          credits,
          current
        };
      });
    }

    // 2. Level 2: Sub Heads
    if (selectedMainHead && !selectedSubHead) {
      const typeKeys = selectedMainHead === 'Assets' ? ['Asset', 'ContraAsset'] :
                       selectedMainHead === 'Liabilities' ? ['Liability', 'ContraLiability'] :
                       selectedMainHead === 'Equity' ? ['Equity', 'ContraEquity'] :
                       selectedMainHead === 'Revenue' ? ['Revenue', 'ContraRevenue'] : ['Expense', 'ContraExpense'];

      const categoryAccounts = accounts.filter(a => typeKeys.includes(a.type));
      const uniqueSubtypes = Array.from(new Set(categoryAccounts.map(getSub))).sort();

      return uniqueSubtypes.map(sub => {
        let opening = 0;
        let debits = 0;
        let credits = 0;
        let current = 0;
        let count = 0;

        const subAccounts = categoryAccounts.filter(a => getSub(a) === sub);
        subAccounts.forEach(a => {
          count++;
          const direct = accountBalances[a.id] || { debits: 0, credits: 0, net: a.openingBalance };
          opening += Number(a.openingBalance) || 0;
          debits += direct.debits || 0;
          credits += direct.credits || 0;
          current += direct.net || 0;
        });

        return {
          key: sub,
          name: sub,
          accountsCount: count,
          opening,
          debits,
          credits,
          current
        };
      });
    }

    // 3. Level 3: Posting Accounts & Ledgers
    if (selectedMainHead && selectedSubHead) {
      const typeKeys = selectedMainHead === 'Assets' ? ['Asset', 'ContraAsset'] :
                       selectedMainHead === 'Liabilities' ? ['Liability', 'ContraLiability'] :
                       selectedMainHead === 'Equity' ? ['Equity', 'ContraEquity'] :
                       selectedMainHead === 'Revenue' ? ['Revenue', 'ContraRevenue'] : ['Expense', 'ContraExpense'];

      const matchedAccounts = accounts.filter(a => 
        typeKeys.includes(a.type) && 
        getSub(a) === selectedSubHead
      ).sort((a, b) => a.code.localeCompare(b.code));

      return matchedAccounts.map(a => {
        const direct = accountBalances[a.id] || { debits: 0, credits: 0, net: a.openingBalance };
        return {
          key: a.id,
          code: a.code,
          name: a.name,
          normalBalance: a.normalBalance || (['Asset', 'Expense', 'ContraLiability', 'ContraEquity', 'ContraRevenue'].includes(a.type) ? 'Debit' : 'Credit'),
          opening: Number(a.openingBalance) || 0,
          debits: direct.debits || 0,
          credits: direct.credits || 0,
          current: direct.net || 0
        };
      });
    }

    return [];
  }, [selectedMainHead, selectedSubHead, accounts, accountBalances]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 animate-fade-in">
      {/* 1. Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-violet-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-violet-500 to-purple-700" />
              <div className="absolute inset-0 flex items-center justify-center"><FileText className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Chart of Accounts</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400"><span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">IAS / GAAP compliant multi-level ledgers with secured accounts protection and real-time drill-down.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ExportDropdown
            label="Export COA"
            onPDF={handleExportPDF}
            onExcel={handleExportExcel}
            onCSV={handleExportCSV}
            onPrint={() => window.print()}
          />
          <label className="secondary h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs" title="Import Chart of Accounts CSV">
            <Upload className="w-3.5 h-3.5" /> Import
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportCSV(file);
              }}
            />
          </label>
          {reloadAccounts && (
            <button
              onClick={reloadAccounts}
              className="secondary h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              title="Refresh Accounts"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => { setParentIdForNew(''); openCreate(); }}
            className="primary h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Account
          </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <KpiGrid cols={5} className="sm:!grid-cols-3 lg:!grid-cols-6">
        {/* Card 1: Total Accounts */}
        <KpiCard
          icon={FileText}
          label="Total Accounts"
          value={accounts.length}
          desc="All ledger heads"
          tone="blue"
        />

        {/* Card 2: Active Accounts */}
        <KpiCard
          icon={CheckCircle}
          label="Active Accounts"
          value={accounts.filter(a => a.status === 'Active').length}
          desc={`${accounts.length ? ((accounts.filter(a => a.status === 'Active').length / accounts.length) * 100).toFixed(1) : 0}% of total`}
          tone="emerald"
        />

        {/* Card 3: Secured Accounts */}
        <KpiCard
          icon={ShieldCheck}
          label="Secured Ledgers"
          value={accounts.filter(a => a.isSystem).length}
          desc="Protected Control"
          tone="amber"
        />

        {/* Card 4: Header Accounts */}
        <KpiCard
          icon={FolderOpen}
          label="Header Accounts"
          value={accounts.filter(a => !a.isPosting).length}
          desc="Top level groups"
          tone="indigo"
        />

        {/* Card 5: Detail Accounts */}
        <KpiCard
          icon={Folder}
          label="Detail Accounts"
          value={accounts.filter(a => a.isPosting).length}
          desc="Posting sub-accounts"
          tone="teal"
        />

        {/* Card 6: Inactive Accounts */}
        <KpiCard
          icon={Lock}
          label="Inactive Accounts"
          value={accounts.filter(a => a.status === 'Inactive').length}
          desc={`${accounts.length ? ((accounts.filter(a => a.status === 'Inactive').length / accounts.length) * 100).toFixed(1) : 0}% of total`}
          tone="rose"
        />
      </KpiGrid>

      {/* 3. Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search code, name, subtype..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9 h-10 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-400"
          />
        </div>

        {/* Account Type */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="h-10 text-xs px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#143e2b]"
          >
            <option value="All">Account Type: All</option>
            {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Account Sub Type */}
        <div className="flex flex-col gap-1 min-w-[170px]">
          <select
            value={selectedSubtype}
            onChange={e => setSelectedSubtype(e.target.value)}
            className="h-10 text-xs px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#143e2b]"
          >
            <option value="All">Account Sub Type: All</option>
            {allSubtypes.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Security Level Filter */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <select
            value={selectedSecurity}
            onChange={e => setSelectedSecurity(e.target.value)}
            className="h-10 text-xs px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#143e2b]"
          >
            <option value="All">Security: All</option>
            <option value="Secured">🔒 Secured / System</option>
            <option value="Custom">✏️ Custom Accounts</option>
          </select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="h-10 text-xs px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#143e2b]"
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Account Group */}
        <div className="flex flex-col gap-1 min-w-[170px]">
          <select
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
            className="h-10 text-xs px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#143e2b]"
          >
            <option value="All">Account Group: All</option>
            {headerAccounts.map(h => (
              <option key={h.id} value={h.id}>{h.code} - {h.name}</option>
            ))}
          </select>
        </div>

        {/* More Filters */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeactivated(p => !p)}
          className={`h-10 px-4 text-xs font-semibold rounded-xl border ${showDeactivated ? 'bg-slate-200 text-slate-800' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
        >
          More Filters
        </Button>

        {/* Reset / Refresh */}
        <button
          onClick={() => {
            setQuery('');
            setSelectedType('All');
            setSelectedSubtype('All');
            setSelectedSecurity('All');
            setSelectedStatus('All');
            setSelectedGroup('All');
          }}
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 cursor-pointer flex items-center justify-center"
          title="Reset Filters"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>
      </div>

      {/* 4. Main Accounts Table Layout */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-violet-500/[0.05] dark:bg-violet-400/[0.07] border-b border-slate-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-52 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-4">Account Code</TableHead>
              <TableHead className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Account Name</TableHead>
              <TableHead className="w-36 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Account Type</TableHead>
              <TableHead className="w-40 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Account Sub Type</TableHead>
              <TableHead className="w-44 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Parent Account</TableHead>
              <TableHead className="w-24 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Currency</TableHead>
              <TableHead className="w-28 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status</TableHead>
              <TableHead className="w-28 text-right text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pr-4">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {paginatedItems.map(item => renderRow(item.account, item.depth, item.hasChildren))}

            {paginatedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    icon={Folder}
                    title="No matching accounts found"
                    hint="Adjust the filters or import accounts via CSV."
                    action={
                      <Button
                        size="sm"
                        onClick={() => { setParentIdForNew(''); openCreate(); }}
                        className="mt-2 h-9 text-xs bg-[#143e2b] text-white hover:bg-[#0b291c] rounded-xl"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add Account
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 5. Pagination Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-white rounded-2xl border border-slate-200 mt-[-12px]">
        <span className="text-xs text-slate-500 font-medium">
          Showing {totalEntries === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(totalEntries, currentPage * itemsPerPage)} of {totalEntries} entries
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#143e2b]"
            >
              {[10, 25, 50, 100].map(val => (
                <option key={val} value={val}>{val} per page</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 disabled:opacity-40"
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 disabled:opacity-40"
            >
              ‹
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum = currentPage;
              if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = Math.max(1, totalPages - 4 + i);
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              if (pageNum <= 0 || pageNum > totalPages) return null;
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 p-0 font-bold ${currentPage === pageNum ? 'bg-[#143e2b] text-white hover:bg-[#0c2a1d]' : 'text-slate-600'}`}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 disabled:opacity-40"
            >
              ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 disabled:opacity-40"
            >
              »
            </Button>
          </div>
        </div>
      </div>

      {/* ACCOUNT BALANCE SUMMARY (GAAP AUDIT ENGINE) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-700" />
              GAAP Audit Trail Balance Summary
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verify the Double-Entry bookkeeping ledger trial status. Drill down from major classifications to source journal entries.
            </p>
          </div>
          
          {/* Breadcrumb navigator */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
            <button onClick={() => { setSelectedMainHead(null); setSelectedSubHead(null); }} className="hover:text-[#143e2b]">Summary</button>
            {selectedMainHead && (
              <>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <button onClick={() => { setSelectedSubHead(null); }} className="hover:text-[#143e2b]">{selectedMainHead}</button>
              </>
            )}
            {selectedSubHead && (
              <>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-slate-800 font-bold">{selectedSubHead}</span>
              </>
            )}
          </div>
        </div>

        {/* Drill-down grid or table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-violet-500/[0.05] dark:bg-violet-400/[0.07]">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider pl-4">
                  {selectedSubHead ? 'ACCOUNT CODE & NAME' : selectedMainHead ? 'REPORTING SUB-HEAD' : 'MAJOR HEAD'}
                </TableHead>
                {!selectedSubHead && (
                  <TableHead className="w-32 text-center text-[10px] font-bold uppercase tracking-wider">REGISTERS</TableHead>
                )}
                {selectedSubHead && (
                  <TableHead className="w-32 text-[10px] font-bold uppercase tracking-wider">NORMAL BALANCE</TableHead>
                )}
                <TableHead className="w-40 text-right text-[10px] font-bold uppercase tracking-wider">OPENING BALANCE</TableHead>
                <TableHead className="w-40 text-right text-[10px] font-bold uppercase tracking-wider">DEBIT (+)</TableHead>
                <TableHead className="w-40 text-right text-[10px] font-bold uppercase tracking-wider">CREDIT (-)</TableHead>
                <TableHead className="w-44 text-right text-[10px] font-bold uppercase tracking-wider pr-4">CURRENT BALANCE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {drillDownData.map((row) => (
                <TableRow 
                  key={row.key} 
                  onClick={() => {
                    if (!selectedMainHead) {
                      setSelectedMainHead(row.name);
                    } else if (!selectedSubHead) {
                      setSelectedSubHead(row.name);
                    } else {
                      setSelectedGLAccountId(row.key);
                    }
                  }}
                  className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                >
                  <TableCell className="py-3 pl-4">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      {selectedSubHead && <span className="font-mono text-slate-400 text-[11px] font-normal">{(row as any).code} — </span>}
                      {row.name}
                      <ArrowRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 ml-1 transition-opacity" />
                    </span>
                  </TableCell>
                  {!selectedSubHead && (
                    <TableCell className="py-3 text-center text-xs font-semibold text-slate-500">
                      {(row as any).accountsCount} accounts
                    </TableCell>
                  )}
                  {selectedSubHead && (
                    <TableCell className="py-3 text-xs font-medium text-slate-500 font-mono">
                      {(row as any).normalBalance}
                    </TableCell>
                  )}
                  <TableCell className="py-3 text-right font-mono text-xs text-slate-600">
                    {formatCurrency(row.opening)}
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono text-xs text-emerald-600 font-semibold">
                    {formatCurrency(row.debits)}
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono text-xs text-rose-600 font-semibold">
                    {formatCurrency(row.credits)}
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono text-xs font-extrabold text-slate-900 pr-4">
                    {formatCurrency(row.current)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* GENERAL LEDGER SLIDE OVERLAY PANEL */}
      {selectedGLAccountId && glAccount && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
          <div className="bg-white w-[850px] h-full shadow-2xl flex flex-col p-6 animate-slide-in relative border-l border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Ledger Audit Trial</span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  General Ledger: {glAccount.code} — {glAccount.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type: {glAccount.type} ({glAccount.normalBalance} Normal) | Subtype: {glAccount.subtype}
                </p>
              </div>
              <button 
                onClick={() => setSelectedGLAccountId(null)} 
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Quick Cards */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Opening Balance', val: glAccount.openingBalance, color: 'text-slate-700' },
                { label: 'Debit Postings', val: glLines.reduce((sum, l) => sum + l.debit, 0), color: 'text-emerald-700' },
                { label: 'Credit Postings', val: glLines.reduce((sum, l) => sum + l.credit, 0), color: 'text-rose-700' },
                { label: 'Current Balance', val: getAccountBalancesRecursive(glAccount.id).current, color: 'text-[#143e2b] font-extrabold' }
              ].map(card => (
                <div key={card.label} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{card.label}</span>
                  <p className={`text-sm font-bold font-mono mt-1 ${card.color}`}>{formatCurrency(card.val)}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search by reference, memo, date..."
                value={glSearchQuery}
                onChange={e => setGlSearchQuery(e.target.value)}
                className="pl-9 h-10 border border-slate-200 rounded-xl text-xs bg-slate-50/50"
              />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-24 text-[10px] font-bold">DATE</TableHead>
                    <TableHead className="w-28 text-[10px] font-bold">REFERENCE</TableHead>
                    <TableHead className="text-[10px] font-bold">DESCRIPTION / MEMO</TableHead>
                    <TableHead className="w-24 text-right text-[10px] font-bold">DEBIT</TableHead>
                    <TableHead className="w-24 text-right text-[10px] font-bold">CREDIT</TableHead>
                    <TableHead className="w-28 text-right text-[10px] font-bold">BALANCE</TableHead>
                    <TableHead className="w-20 text-center text-[10px] font-bold">AUDIT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 font-mono text-[11px]">
                  <TableRow className="bg-slate-50/40 text-slate-500">
                    <TableCell className="py-2.5 font-sans">—</TableCell>
                    <TableCell className="py-2.5">OPENING</TableCell>
                    <TableCell className="py-2.5 font-sans">Initial pre-seeded opening register balance</TableCell>
                    <TableCell className="py-2.5 text-right">—</TableCell>
                    <TableCell className="py-2.5 text-right">—</TableCell>
                    <TableCell className="py-2.5 text-right font-bold">{formatCurrency(glAccount.openingBalance)}</TableCell>
                    <TableCell className="py-2.5 text-center">—</TableCell>
                  </TableRow>
                  {filteredGLLines.map((line, idx) => {
                    const isRev = line.reference?.startsWith('REV-');
                    const isCancelled = line.reference && reversedGLRefsSet.has(line.reference);
                    return (
                      <TableRow key={idx} className={`transition-colors ${isRev ? 'bg-rose-50/50 hover:bg-rose-50' : isCancelled ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50/50'}`}>
                        <TableCell className="py-2.5 text-slate-500">{line.date}</TableCell>
                        <TableCell className="py-2.5">
                          {isRev ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-rose-600 flex items-center gap-1">
                                <span className="bg-rose-100 text-rose-700 text-[8px] font-black px-1 rounded">REV</span>
                                {line.reference}
                              </span>
                              <span className="text-[9px] text-slate-400 font-sans">Reverses: {line.reference.replace('REV-', '')}</span>
                            </div>
                          ) : isCancelled ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-700 flex items-center gap-1">
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1 rounded">VOID</span>
                                {line.reference}
                              </span>
                              <span className="text-[9px] text-amber-600 font-sans">Reversed by REV-{line.reference}</span>
                            </div>
                          ) : (
                            <span className="font-bold text-slate-700">{line.reference}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 font-sans text-slate-600 max-w-[200px] truncate" title={line.description}>{line.description}</TableCell>
                        <TableCell className="py-2.5 text-right text-emerald-600 font-semibold">{line.debit > 0 ? formatCurrency(line.debit) : '—'}</TableCell>
                        <TableCell className="py-2.5 text-right text-rose-600 font-semibold">{line.credit > 0 ? formatCurrency(line.credit) : '—'}</TableCell>
                        <TableCell className="py-2.5 text-right font-bold text-slate-800">{formatCurrency(line.runningBalance)}</TableCell>
                        <TableCell className="py-2.5 text-center">
                          <button
                            onClick={() => setActiveSourceTx(line.entry)}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer"
                            title="Audit Source Transaction Document"
                          >
                            <Shield size={12.5} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredGLLines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        No transactions posted to this account.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <Button size="sm" onClick={() => setSelectedGLAccountId(null)} className="h-9 px-4 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 rounded-xl">
                Close Register
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SOURCE TRANSACTION DOCUMENT VIEWER OVERLAY MODAL */}
      {activeSourceTx && sourceTxDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-51 animate-fade-in">
          <div className="bg-white rounded-3xl w-[700px] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col p-6 animate-scale-up border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 rounded-xl text-emerald-800">
                  <Shield className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Source Document Audit Viewer
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest">
                    Posted Transaction Ledger Record
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveSourceTx(null)} 
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Document Render Switch */}
            <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-4">
              {sourceTxDetails.type === 'Invoice' && (() => {
                const inv = sourceTxDetails.data;
                return (
                  <div className="space-y-4 font-sans">
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16 }} className="p-4 flex justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Document Class</span>
                        <h4 className="text-base font-extrabold text-[#143e2b]">{inv.invoiceNumber}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Date: {inv.invoiceDate}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Customer Entity</span>
                        <p className="text-xs font-bold text-slate-800">{inv.customerName || inv.customerId}</p>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Posted
                        </span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-[10px] font-bold">PRODUCT / DESCRIPTION</TableHead>
                            <TableHead className="w-16 text-center text-[10px] font-bold">QTY</TableHead>
                            <TableHead className="w-24 text-right text-[10px] font-bold">PRICE</TableHead>
                            <TableHead className="w-28 text-right text-[10px] font-bold">AMOUNT</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100 text-xs">
                          {inv.lines?.map((line: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="py-2.5 font-semibold text-slate-700">
                                {line.productName || line.productId}
                                {line.description && <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{line.description}</span>}
                              </TableCell>
                              <TableCell className="py-2.5 text-center text-slate-600">{line.quantity}</TableCell>
                              <TableCell className="py-2.5 text-right font-mono text-slate-600">{formatCurrency(line.unitPrice)}</TableCell>
                              <TableCell className="py-2.5 text-right font-mono font-bold text-slate-800">{formatCurrency(line.lineTotal)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end">
                      <div className="w-60 bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2 text-xs font-semibold">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal:</span>
                          <span className="font-mono">{formatCurrency(inv.subTotal)}</span>
                        </div>
                        {inv.discountTotal > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Discounts:</span>
                            <span className="font-mono">-{formatCurrency(inv.discountTotal)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-500">
                          <span>Tax Total:</span>
                          <span className="font-mono">{formatCurrency(inv.taxTotal)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-900 font-extrabold text-sm">
                          <span>Total Amount:</span>
                          <span className="font-mono text-[#143e2b]">{formatCurrency(inv.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {sourceTxDetails.type === 'Bill' && (() => {
                const bill = sourceTxDetails.data;
                return (
                  <div className="space-y-4 font-sans">
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16 }} className="p-4 flex justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Document Class</span>
                        <h4 className="text-base font-extrabold text-amber-700">{bill.billNumber}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Date: {bill.billDate}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Supplier Entity</span>
                        <p className="text-xs font-bold text-slate-800">{bill.vendorName || bill.vendorId}</p>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-100">
                          Posted
                        </span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-[10px] font-bold">ITEM / DESCRIPTION</TableHead>
                            <TableHead className="w-16 text-center text-[10px] font-bold">QTY</TableHead>
                            <TableHead className="w-24 text-right text-[10px] font-bold">PRICE</TableHead>
                            <TableHead className="w-28 text-right text-[10px] font-bold">AMOUNT</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100 text-xs">
                          {bill.lines?.map((line: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="py-2.5 font-semibold text-slate-700">
                                {line.productName || line.itemId || 'Procured Goods/Services'}
                                {line.description && <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{line.description}</span>}
                              </TableCell>
                              <TableCell className="py-2.5 text-center text-slate-600">{line.quantity}</TableCell>
                              <TableCell className="py-2.5 text-right font-mono text-slate-600">{formatCurrency(line.unitPrice)}</TableCell>
                              <TableCell className="py-2.5 text-right font-mono font-bold text-slate-800">{formatCurrency(line.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end">
                      <div className="w-60 bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2 text-xs font-semibold">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal:</span>
                          <span className="font-mono">{formatCurrency(bill.subTotal || bill.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Tax Total:</span>
                          <span className="font-mono">{formatCurrency(bill.taxTotal || 0)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-900 font-extrabold text-sm">
                          <span>Total Amount:</span>
                          <span className="font-mono text-amber-700">{formatCurrency(bill.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {sourceTxDetails.type === 'Journal' && (() => {
                const entry = sourceTxDetails.data;
                const debitsTotal = entry.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0) || 0;
                const creditsTotal = entry.lines?.reduce((s: number, l: any) => s + (l.credit || 0), 0) || 0;
                return (
                  <div className="space-y-4">
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16 }} className="p-4 grid grid-cols-2 gap-4 text-xs font-semibold">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Document Class</span>
                        <h4 className="text-sm font-extrabold text-slate-900">{entry.reference || 'Manual Ledger Adjustment'}</h4>
                        <div className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Date: {entry.date}</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Audit Status</span>
                        <p className="text-xs text-slate-500 flex items-center justify-end gap-1 font-bold">
                          <User className="w-3.5 h-3.5" /> Submitted: {entry.submittedBy || 'System Engine'}
                        </p>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#edf7f3] text-[#143e2b]">
                          Fully Posted
                        </span>
                      </div>
                      <div className="col-span-2 border-t border-slate-150 pt-2 mt-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Transaction Memo / Description</span>
                        <p className="text-xs text-slate-600 mt-1 font-sans font-medium">{entry.description || 'No descriptive memo logged.'}</p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-[10px] font-bold">ACCOUNT REGISTER</TableHead>
                            <TableHead className="text-[10px] font-bold">LINE REMARKS</TableHead>
                            <TableHead className="w-28 text-right text-[10px] font-bold">DEBIT</TableHead>
                            <TableHead className="w-28 text-right text-[10px] font-bold">CREDIT</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {entry.lines?.map((line: any, idx: number) => {
                            const acc = accounts.find(a => a.id === line.accountId);
                            return (
                              <TableRow key={idx}>
                                <TableCell className="py-2.5 font-bold text-slate-700">
                                  {acc ? `${acc.code} — ${acc.name}` : line.accountId}
                                </TableCell>
                                <TableCell className="py-2.5 font-sans text-slate-500">{line.memo || '—'}</TableCell>
                                <TableCell className="py-2.5 text-right text-emerald-600 font-semibold">{line.debit > 0 ? formatCurrency(line.debit) : '—'}</TableCell>
                                <TableCell className="py-2.5 text-right text-rose-600 font-semibold">{line.credit > 0 ? formatCurrency(line.credit) : '—'}</TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                            <TableCell colSpan={2} className="py-3 pl-4 font-sans text-xs">Total Ledger Distribution:</TableCell>
                            <TableCell className="py-3 text-right">{formatCurrency(debitsTotal)}</TableCell>
                            <TableCell className="py-3 text-right">{formatCurrency(creditsTotal)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-150 flex justify-end gap-2">
              <Button size="sm" onClick={() => setActiveSourceTx(null)} className="h-9 px-4 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 rounded-xl">
                Done Audit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Accounting Equation Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mt-6 space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          📊 Accounting Equation Balance Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Assets Box */}
          <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 text-center">
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Total Assets</span>
            <p className="text-xl font-extrabold text-blue-900 mt-1 font-mono">{formatCurrency(categoryTotals.Asset)}</p>
          </div>

          {/* Equals Operator and status indicator */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-400">=</span>
            {Math.abs(categoryTotals.Asset - (categoryTotals.Liability + categoryTotals.Equity)) < 0.01 ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold mt-2">
                ✓ Equation in Balance
              </span>
            ) : (
              <div className="text-center mt-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                  ⚠ Equation Out of Balance
                </span>
                <span className="text-[10px] text-rose-500 block mt-1 font-semibold font-mono">
                  Diff: {formatCurrency(categoryTotals.Asset - (categoryTotals.Liability + categoryTotals.Equity))}
                </span>
              </div>
            )}
          </div>

          {/* Liabilities + Equity Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Liabilities + Equity</span>
            <p className="text-xl font-extrabold text-slate-800 mt-1 font-mono">{formatCurrency(categoryTotals.Liability + categoryTotals.Equity)}</p>
            <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px] text-slate-500 font-semibold">
              <span>L: {formatCurrency(categoryTotals.Liability)}</span>
              <span>+</span>
              <span>E: {formatCurrency(categoryTotals.Equity)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// End of Chart of Accounts component
