import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeftRight, Search, Download, Printer,
  FileSpreadsheet, RefreshCw, Landmark,
  Clock, X, TrendingUp, TrendingDown, ArrowRightLeft, Hash
} from 'lucide-react';
import type { Entity } from './EntitySettings';
import { useBankingStore } from './stores';
import { money } from './lib/currency';
import { downloadExcel, downloadCSV } from './lib/exportUtils';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BankTransactionRecord {
  id: string;
  date: string;
  ref: string;
  bank: string;
  bankAccountId?: string;
  description: string;
  payee: string;
  mode: string;
  type: string;
  amount: number;
  curr: string;
  status: string;
  journalEntryId?: string;
}

type DatePreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'ytd' | 'all';

function getPresetDates(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  if (preset === 'thisMonth') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: firstDay.toISOString().slice(0, 10), to: todayStr };
  }
  if (preset === 'lastMonth') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: firstDay.toISOString().slice(0, 10), to: lastDay.toISOString().slice(0, 10) };
  }
  if (preset === 'thisQuarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    const firstDay = new Date(now.getFullYear(), qMonth, 1);
    return { from: firstDay.toISOString().slice(0, 10), to: todayStr };
  }
  if (preset === 'ytd') {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    return { from: firstDay.toISOString().slice(0, 10), to: todayStr };
  }
  return { from: '', to: '' };
}

export const BankTransactionsView = ({
  activeEntityId,
  entities,
}: {
  activeEntityId: string;
  entities: Entity[];
}) => {
  const currentEntity = entities.find((e) => e.id === activeEntityId) || entities[0];
  const { transactions, bankAccounts, cashAccounts, fetchTransactions, fetchBankAccounts, fetchCashAccounts, loading } = useBankingStore();

  const [query, setQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [flowFilter, setFlowFilter] = useState<'all' | 'in' | 'out'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [preset, setPreset] = useState<DatePreset>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedTxn, setSelectedTxn] = useState<BankTransactionRecord | null>(null);

  const loadData = async () => {
    await Promise.all([
      fetchTransactions(undefined, activeEntityId),
      fetchBankAccounts(activeEntityId),
      fetchCashAccounts(activeEntityId),
    ]);
  };

  useEffect(() => {
    loadData();
  }, [activeEntityId]);

  const handlePresetChange = (p: DatePreset) => {
    setPreset(p);
    const { from, to } = getPresetDates(p);
    setFromDate(from);
    setToDate(to);
  };

  // Normalized transaction records
  const transactionsData: BankTransactionRecord[] = useMemo(() => {
    return transactions.map((t: any) => ({
      id: String(t.id),
      date: t.date || '',
      ref: t.ref || 'TXN',
      bank: t.bank || 'Main Bank',
      bankAccountId: t.bankAccountId,
      description: t.description || '',
      payee: t.payee || t.description || '—',
      mode: t.mode || (t.amount >= 0 ? 'Cash In' : 'Cash Out'),
      type: t.type || (t.amount >= 0 ? 'Receipt' : 'Payment'),
      amount: t.amount || 0,
      curr: t.curr || currentEntity?.currencyCode || 'PKR',
      status: t.status || 'Posted',
      journalEntryId: t.journalEntryId,
    }));
  }, [transactions, currentEntity]);

  // Combined Account Options
  const accountOptions = useMemo(() => {
    const banks = bankAccounts.map((b) => ({ id: b.id, name: `${b.name} (${b.code})`, type: 'Bank' }));
    const cash = cashAccounts.map((c) => ({ id: c.id, name: `${c.name} (${c.code})`, type: 'Cash' }));
    return [...banks, ...cash];
  }, [bankAccounts, cashAccounts]);

  // Unique Transaction Types
  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    transactionsData.forEach((t) => { if (t.type) set.add(t.type); });
    return Array.from(set);
  }, [transactionsData]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactionsData.filter((t) => {
      // Date filter
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;

      // Account filter
      if (accountFilter !== 'all') {
        if (t.bankAccountId && t.bankAccountId !== accountFilter) return false;
        if (!t.bankAccountId && !t.bank.toLowerCase().includes(accountFilter.toLowerCase())) return false;
      }

      // Flow filter (Inflow vs Outflow)
      if (flowFilter === 'in' && t.amount < 0) return false;
      if (flowFilter === 'out' && t.amount >= 0) return false;

      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Text query
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesDate = t.date.includes(q);
        const matchesRef = t.ref.toLowerCase().includes(q);
        const matchesBank = t.bank.toLowerCase().includes(q);
        const matchesPayee = t.payee.toLowerCase().includes(q);
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesType = t.type.toLowerCase().includes(q);
        if (!matchesDate && !matchesRef && !matchesBank && !matchesPayee && !matchesDesc && !matchesType) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      const refA = a.ref || '';
      const refB = b.ref || '';
      return refB.localeCompare(refA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [transactionsData, fromDate, toDate, accountFilter, flowFilter, typeFilter, query]);

  // 4 Top Financial KPIs
  const totalInflow = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOutflow = filtered.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const netMovement = totalInflow - totalOutflow;
  const totalCount = filtered.length;

  // ─── Branded Bank Voucher PDF Generator ─────────────────────────────────────
  const generateVoucherPDF = (t: BankTransactionRecord) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    const isInflow = t.amount >= 0;
    const primaryColor: [number, number, number] = isInflow ? [16, 185, 129] : [15, 76, 129];
    const darkColor: [number, number, number] = [15, 23, 42];
    const grayColor: [number, number, number] = [100, 116, 139];
    const lightBg: [number, number, number] = [248, 250, 252];
    const borderGray: [number, number, number] = [226, 232, 240];

    // Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(isInflow ? 'BANK RECEIPT / DEPOSIT VOUCHER' : 'BANK PAYMENT / DISBURSEMENT VOUCHER', margin, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Voucher Ref: ${t.ref || 'TXN'}`, margin, 21);
    doc.text(`Transaction Date: ${t.date}`, pageWidth - margin, 14, { align: 'right' });
    doc.text(`Status: ${t.status || 'Posted'}`, pageWidth - margin, 21, { align: 'right' });

    // Details Grid (Company & Bank Account)
    const boxY = 34;
    const boxH = 34;
    const colW = (contentWidth - 6) / 2;

    // Company Box
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(margin, boxY, colW, boxH, 2, 2, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(currentEntity?.name || 'Company ERP', margin + 4, boxY + 7);

    doc.setTextColor(...darkColor);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const compAny = currentEntity as any;
    let compY = boxY + 13;
    if (compAny?.taxId || compAny?.ntn) {
      doc.text(`Tax ID / NTN: ${compAny.taxId || compAny.ntn}`, margin + 4, compY);
      compY += 4.5;
    }
    if (compAny?.country || compAny?.legalName) {
      doc.text(`${compAny.legalName || ''} • ${compAny.country || ''}`.trim(), margin + 4, compY);
      compY += 4.5;
    }
    doc.text(`Base Currency: ${currentEntity?.currencyCode || 'PKR'}`, margin + 4, compY);

    // Bank / Cash Account Box
    const bankX = margin + colW + 6;
    doc.setFillColor(...lightBg);
    doc.roundedRect(bankX, boxY, colW, boxH, 2, 2, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT & COUNTERPARTY DETAILS', bankX + 4, boxY + 7);

    doc.setTextColor(...darkColor);
    doc.setFontSize(9.5);
    doc.text(t.bank, bankX + 4, boxY + 14);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Party / Payee: ${t.payee}`, bankX + 4, boxY + 20);
    doc.text(`Classification: ${t.type}`, bankX + 4, boxY + 25);
    doc.text(`Movement Mode: ${t.mode}`, bankX + 4, boxY + 30);

    // Amount Banner
    const bannerY = boxY + boxH + 6;
    doc.setFillColor(isInflow ? 236 : 239, isInflow ? 253 : 246, isInflow ? 245 : 255);
    doc.setDrawColor(isInflow ? 167 : 199, isInflow ? 243 : 210, isInflow ? 208 : 254);
    doc.roundedRect(margin, bannerY, contentWidth, 18, 2, 2, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(isInflow ? 'TOTAL AMOUNT DEPOSITED / RECEIVED' : 'TOTAL AMOUNT DISBURSED / PAID', margin + 4, bannerY + 6.5);

    doc.setFontSize(14);
    doc.text(money(Math.abs(t.amount), t.curr), margin + 4, bannerY + 14);

    // General Ledger Breakdown Table
    const tableStartY = bannerY + 24;
    const tableHeaders = ['Account Description', 'Reference', 'Type', 'Debit (Cash In)', 'Credit (Cash Out)'];
    const tableRows = [
      [
        t.bank,
        t.ref,
        t.type,
        isInflow ? money(Math.abs(t.amount), t.curr) : '—',
        !isInflow ? money(Math.abs(t.amount), t.curr) : '—',
      ],
      [
        `Offset Account: ${t.payee || t.description}`,
        t.ref,
        t.type,
        !isInflow ? money(Math.abs(t.amount), t.curr) : '—',
        isInflow ? money(Math.abs(t.amount), t.curr) : '—',
      ],
    ];

    autoTable(doc, {
      startY: tableStartY,
      head: [tableHeaders],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, textColor: darkColor },
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
    });

    // Signature Block
    const signY = 190;
    const signW = 55;

    doc.setDrawColor(...borderGray);
    doc.line(margin, signY, margin + signW, signY);
    doc.line(pageWidth - margin - signW, signY, pageWidth - margin, signY);

    doc.setTextColor(...grayColor);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Prepared By / Cashier', margin, signY + 4);
    doc.text('Authorized Signatory / Approver', pageWidth - margin - signW, signY + 4);

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.text('Official Banking Transaction Voucher. Generated from AMS General Ledger Module.', margin, pageHeight - 8);

    const cleanRef = (t.ref || 'Voucher').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Bank_Voucher_${cleanRef}.pdf`);
  };

  // ─── Excel & CSV Exports ───────────────────────────────────────────────────
  const exportTxnsExcel = () => {
    const headers = ['Date', 'Reference', 'Bank / Cash Account', 'Payee / Counterparty', 'Mode', 'Type', 'Debit (Inflow)', 'Credit (Outflow)', 'Currency', 'Status'];
    const rows = filtered.map((t) => [
      t.date,
      t.ref,
      t.bank,
      t.payee,
      t.mode,
      t.type,
      t.amount > 0 ? t.amount : 0,
      t.amount < 0 ? Math.abs(t.amount) : 0,
      t.curr,
      t.status,
    ]);
    downloadExcel(`Bank_Transactions_${new Date().toISOString().slice(0, 10)}`, 'Transactions', headers, rows);
  };

  const exportTxnsCSV = () => {
    const headers = ['Date', 'Reference', 'Bank / Cash Account', 'Payee / Counterparty', 'Mode', 'Type', 'Debit (Inflow)', 'Credit (Outflow)', 'Currency', 'Status'];
    const rows = filtered.map((t) => [
      t.date,
      t.ref,
      t.bank,
      t.payee,
      t.mode,
      t.type,
      t.amount > 0 ? t.amount : 0,
      t.amount < 0 ? Math.abs(t.amount) : 0,
      t.curr,
      t.status,
    ]);
    downloadCSV(`Bank_Transactions_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-blue-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-blue-500 to-indigo-700" />
              <div className="absolute inset-0 flex items-center justify-center"><ArrowLeftRight className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Bank &amp; Cash Transactions</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                General ledger bank movements, cash deposits, disbursements, and inter-account transfers for {currentEntity?.name || 'Active Company'}.
              </p>
            </div>
          </div>

          {/* Global Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={exportTxnsExcel}
              className="secondary h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              title="Export transactions register to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
            </button>
            <button
              onClick={exportTxnsCSV}
              className="secondary h-8.5 px-2.5 rounded-lg text-xs font-semibold"
            >
              CSV
            </button>
            <button
              onClick={() => window.print()}
              className="secondary h-8.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={loadData}
              className="secondary h-8.5 w-8.5 rounded-lg flex items-center justify-center text-xs text-[var(--color-text)]"
              title="Refresh transactions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Financial Metric Cards - Modern KPI Design */}
      <KpiGrid cols={4}>
        <KpiCard icon={TrendingUp} label="TOTAL INFLOW (+)" value={money(totalInflow, currentEntity?.currencyCode)} desc="Deposits & customer receipts" tone="emerald" />
        <KpiCard icon={TrendingDown} label="TOTAL OUTFLOW (-)" value={money(totalOutflow, currentEntity?.currencyCode)} desc="Disbursements & payments" tone="rose" />
        <KpiCard icon={ArrowRightLeft} label="NET CASH MOVEMENT" value={money(netMovement, currentEntity?.currencyCode)} desc={netMovement >= 0 ? 'Net positive liquidity' : 'Net liquidity contraction'} tone={netMovement >= 0 ? 'blue' : 'amber'} />
        <KpiCard icon={Hash} label="TRANSACTIONS COUNT" value={totalCount} desc="Ledger movement records" tone="purple" />
      </KpiGrid>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] shadow-xs">
        {/* Date Presets */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-bold text-[var(--color-text-muted)] mr-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Period:
          </span>
          {(['thisMonth', 'lastMonth', 'thisQuarter', 'ytd', 'all'] as DatePreset[]).map((p) => {
            const labels: Record<DatePreset, string> = {
              thisMonth: 'This Month',
              lastMonth: 'Last Month',
              thisQuarter: 'This Quarter',
              ytd: 'YTD',
              all: 'All Time',
            };
            const active = preset === p;
            return (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                className={`h-7.5 px-2.5 rounded-md text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[var(--color-text)]'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Filters and Non-Overlapping Search Box */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">🏦 All Bank & Cash Accounts</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Flow Filter */}
          <select
            value={flowFilter}
            onChange={(e) => setFlowFilter(e.target.value as any)}
            className="h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">⚡ All Flows</option>
            <option value="in">⬇ Inflow (Deposits)</option>
            <option value="out">⬆ Outflow (Withdrawals)</option>
          </select>

          {/* Type Filter */}
          {uniqueTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-blue-500 transition-colors"
            >
              <option value="all">📋 All Types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          {/* Search Box - Guaranteed Zero Text/Icon Overlap */}
          <div className="flex items-center h-8 w-56 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 transition-all shadow-2xs">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ref, payee, bank..."
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: '0 !important',
                width: '100%',
                fontSize: '12px',
                color: 'var(--color-text)',
                boxShadow: 'none',
              }}
              className="!p-0 !border-0 !outline-none !bg-transparent w-full text-xs text-[var(--color-text)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-gray-400 hover:text-gray-600 text-sm px-1 leading-none font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-blue-500 to-indigo-700" />
            Bank &amp; Cash Transactions Ledger
          </p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {filtered.length} records · Click <strong>Voucher PDF</strong> to generate an official transaction advice slip.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07] text-[var(--color-text-muted)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Date</th>
                <th className="py-2.5 px-3">Reference #</th>
                <th className="py-2.5 px-3">Bank Account</th>
                <th className="py-2.5 px-3">Payee / Description</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3 text-right">Debit (Inflow)</th>
                <th className="py-2.5 px-3 text-right">Credit (Outflow)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-right">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <TableSkeleton rows={6} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={ArrowLeftRight}
                      title="No bank or cash movements found"
                      hint="Adjust the period, account or flow filters to see transactions."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isInflow = t.amount > 0;
                  const isOutflow = t.amount < 0;

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono text-[var(--color-text)] whitespace-nowrap">
                        {t.date}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        <button
                          onClick={() => setSelectedTxn(t)}
                          className="hover:underline text-left"
                          title="View transaction details"
                        >
                          {t.ref}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--color-text-strong)]">
                        {t.bank}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text)] max-w-xs truncate" title={t.payee}>
                        {t.payee}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[var(--color-text)] font-semibold text-[10px]">
                          {t.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        {isInflow ? money(t.amount, t.curr) : <span className="text-gray-300 dark:text-gray-700 font-normal">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400">
                        {isOutflow ? money(Math.abs(t.amount), t.curr) : <span className="text-gray-300 dark:text-gray-700 font-normal">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => generateVoucherPDF(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-semibold transition-all shadow-2xs"
                          title="Download Voucher PDF"
                        >
                          <Download className="w-3 h-3" /> Voucher PDF
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-900 border-t-2 border-[var(--color-border)] font-bold text-xs">
                <tr>
                  <td colSpan={5} className="py-3 px-3.5 uppercase tracking-wider text-[var(--color-text-muted)] text-right">
                    Movement Totals:
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    {money(totalInflow, currentEntity?.currencyCode)}
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                    {money(totalOutflow, currentEntity?.currencyCode)}
                  </td>
                  <td colSpan={2} className="py-3 px-3.5 text-right font-bold text-blue-600">
                    Net: {money(netMovement, currentEntity?.currencyCode)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setSelectedTxn(null)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-gray-50/50 dark:bg-gray-900/50">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-strong)] flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-600" /> Transaction Advice #{selectedTxn.ref}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Audit log & general ledger breakdown</p>
              </div>
              <button onClick={() => setSelectedTxn(null)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-[var(--color-border)] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Date:</span>
                  <span className="font-semibold text-[var(--color-text-strong)]">{selectedTxn.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Bank / Cash Account:</span>
                  <span className="font-semibold text-[var(--color-text-strong)]">{selectedTxn.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Payee / Beneficiary:</span>
                  <span className="font-semibold text-[var(--color-text-strong)]">{selectedTxn.payee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Classification:</span>
                  <span className="font-semibold text-blue-600">{selectedTxn.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Amount:</span>
                  <span className={`font-mono font-extrabold text-sm ${selectedTxn.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {money(Math.abs(selectedTxn.amount), selectedTxn.curr)} ({selectedTxn.amount >= 0 ? 'Inflow / Debit' : 'Outflow / Credit'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Status:</span>
                  <span className="font-bold text-emerald-600">{selectedTxn.status}</span>
                </div>
              </div>

              {/* Double-Entry Preview Box */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800 text-xs space-y-1.5">
                <span className="font-bold text-blue-800 dark:text-blue-300 block text-[11px] uppercase tracking-wider">
                  General Ledger Entry Mechanics
                </span>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-blue-200 text-[var(--color-text-muted)] text-[10px]">
                      <th className="text-left pb-1">Account</th>
                      <th className="text-right pb-1">Debit</th>
                      <th className="text-right pb-1">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1 text-[var(--color-text)]">{selectedTxn.bank}</td>
                      <td className="py-1 text-right font-mono font-bold text-emerald-600">
                        {selectedTxn.amount >= 0 ? money(Math.abs(selectedTxn.amount), selectedTxn.curr) : '—'}
                      </td>
                      <td className="py-1 text-right font-mono font-bold text-rose-600">
                        {selectedTxn.amount < 0 ? money(Math.abs(selectedTxn.amount), selectedTxn.curr) : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-[var(--color-text)]">Offset: {selectedTxn.payee}</td>
                      <td className="py-1 text-right font-mono font-bold text-emerald-600">
                        {selectedTxn.amount < 0 ? money(Math.abs(selectedTxn.amount), selectedTxn.curr) : '—'}
                      </td>
                      <td className="py-1 text-right font-mono font-bold text-rose-600">
                        {selectedTxn.amount >= 0 ? money(Math.abs(selectedTxn.amount), selectedTxn.curr) : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedTxn(null)}
                  className="secondary h-9 px-4 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => generateVoucherPDF(selectedTxn)}
                  className="primary h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download Voucher PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankTransactionsView;
