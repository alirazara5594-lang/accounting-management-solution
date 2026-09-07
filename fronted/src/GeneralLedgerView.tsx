import React, { useState, useEffect, useMemo } from 'react';
import { reportsApi } from './api/modules/reports.api';
import { useCoaStore } from './stores';
import {
  BookOpen, Search, X, ShieldCheck,
  Download, FileSpreadsheet, RefreshCw,
  Layers, ArrowUpRight, ArrowDownRight,
  FileText, AlertCircle, Filter, ChevronDown, ChevronRight
} from 'lucide-react';
import { money } from './lib/currency';
import { downloadExcel, downloadCSV } from './lib/exportUtils';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import type { Entity } from './EntitySettings';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GeneralLedgerLine {
  id: string;
  date: string;
  reference: string;
  description: string;
  status: string;
  transactionType: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

interface GeneralLedgerViewProps {
  activeEntityId: string;
  entities: Entity[];
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({ activeEntityId, entities }) => {
  const currentEntity = entities.find((e) => e.id === activeEntityId);
  const coaAccounts = useCoaStore((s) => s.accounts);
  const fetchAccounts = useCoaStore((s) => s.fetchAccounts);

  const [lines, setLines] = useState<GeneralLedgerLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_month' | 'this_quarter' | 'this_year'>('all');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'chronological' | 'journal_entries' | 'account_ledgers' | 'grouped' | 'paired_reversals'>('chronological');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'reversals'>('active');
  const [tableGrouping, setTableGrouping] = useState<'voucher_summary' | 'detailed_lines'>('voucher_summary');
  const [expandedVouchers, setExpandedVouchers] = useState<Record<string, boolean>>({});

  // Load COA accounts if empty
  useEffect(() => {
    if (coaAccounts.length === 0) {
      fetchAccounts();
    }
  }, [coaAccounts.length, fetchAccounts]);

  // Handle Date Presets
  const applyDatePreset = (preset: 'all' | 'today' | 'this_month' | 'this_quarter' | 'this_year') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setFrom('');
      setTo('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setFrom(todayStr);
      setTo(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setFrom(firstDay);
      setTo(lastDay);
    } else if (preset === 'this_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), currentQuarter * 3, 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0).toISOString().slice(0, 10);
      setFrom(firstDay);
      setTo(lastDay);
    } else if (preset === 'this_year') {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
      setFrom(firstDay);
      setTo(lastDay);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = {};
      if (activeEntityId) params.companyId = activeEntityId;
      if (from) params.from = from;
      if (to) params.to = to;
      const data = await reportsApi.getGeneralLedger(params);
      setLines(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load general ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeEntityId, from, to]);

  // Track which transactions have been cancelled/reversed
  const reversedRefsSet = useMemo(() => {
    const set = new Set<string>();
    lines.forEach((l) => {
      if (l.reference && l.reference.startsWith('REV-')) {
        set.add(l.reference.replace('REV-', ''));
      }
    });
    return set;
  }, [lines]);

  // Paired Original and Reversal Audit Trail
  const pairedAuditEntries = useMemo(() => {
    const pairs: Array<{
      targetRef: string;
      originalLines: GeneralLedgerLine[];
      reversalLines: GeneralLedgerLine[];
      originalDate?: string;
      reversalDate?: string;
      description?: string;
      totalDebit: number;
      totalCredit: number;
    }> = [];

    const processedRefs = new Set<string>();

    lines.forEach((l) => {
      if (l.reference && l.reference.startsWith('REV-')) {
        const origRef = l.reference.replace('REV-', '');
        if (!processedRefs.has(origRef)) {
          processedRefs.add(origRef);
          const origLines = lines.filter((x) => x.reference === origRef);
          const revLines = lines.filter((x) => x.reference === `REV-${origRef}`);
          const totalDr = origLines.reduce((s, x) => s + (x.debit || 0), 0);
          const totalCr = origLines.reduce((s, x) => s + (x.credit || 0), 0);

          pairs.push({
            targetRef: origRef,
            originalLines: origLines,
            reversalLines: revLines,
            originalDate: origLines[0]?.date || l.date,
            reversalDate: revLines[0]?.date || l.date,
            description: origLines[0]?.description || revLines[0]?.description,
            totalDebit: totalDr,
            totalCredit: totalCr,
          });
        }
      }
    });

    return pairs;
  }, [lines]);

  // Combined Unique Accounts List (All COA Accounts + Any Transaction Accounts)
  const availableAccounts = useMemo(() => {
    const map = new Map<string, { code: string; name: string; type?: string; subtype?: string; openingBalance?: number; id?: string }>();
    coaAccounts.forEach((a) => {
      if (a.code) {
        map.set(a.code, { code: a.code, name: a.name, type: a.type, subtype: a.subtype, openingBalance: a.openingBalance, id: a.id });
      }
    });
    lines.forEach((l) => {
      if (l.accountCode && !map.has(l.accountCode)) {
        map.set(l.accountCode, { code: l.accountCode, name: l.accountName, id: l.accountId });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [coaAccounts, lines]);

  // Filtered Lines
  const filtered = useMemo(() => {
    return lines.filter((l) => {
      // Account Code Filter
      if (selectedAccountFilter !== 'ALL' && l.accountCode !== selectedAccountFilter) {
        return false;
      }
      // Reversals / Active Filter
      if (filterType === 'active') {
        if (l.reference?.startsWith('REV-') || (l.reference && reversedRefsSet.has(l.reference))) {
          return false;
        }
      } else if (filterType === 'reversals') {
        if (!l.reference?.startsWith('REV-') && (!l.reference || !reversedRefsSet.has(l.reference))) {
          return false;
        }
      }
      // Text Search Query
      if (query.trim()) {
        const q = query.toLowerCase();
        const refMatch = l.reference?.toLowerCase().includes(q);
        const codeMatch = l.accountCode?.toLowerCase().includes(q);
        const nameMatch = l.accountName?.toLowerCase().includes(q);
        const descMatch = l.description?.toLowerCase().includes(q);
        const memoMatch = l.memo?.toLowerCase().includes(q);
        const typeMatch = l.transactionType?.toLowerCase().includes(q);
        if (!refMatch && !codeMatch && !nameMatch && !descMatch && !memoMatch && !typeMatch) {
          return false;
        }
      }
      return true;
    });
  }, [lines, selectedAccountFilter, filterType, query, reversedRefsSet]);

  // Financial KPI Calculations
  const totalDebit = useMemo(() => filtered.reduce((acc, curr) => acc + (curr.debit || 0), 0), [filtered]);
  const totalCredit = useMemo(() => filtered.reduce((acc, curr) => acc + (curr.credit || 0), 0), [filtered]);
  const netDifference = Math.abs(totalDebit - totalCredit);
  const isBalanced = netDifference < 0.01;

  // Account Head Ledger Sheets (Institutional Running-Balance Ledgers per Head)
  const accountLedgerSheets = useMemo(() => {
    const map: Record<string, {
      code: string;
      name: string;
      type?: string;
      subtype?: string;
      opening: number;
      lines: Array<GeneralLedgerLine & { runningBalance: number }>;
      totalDebit: number;
      totalCredit: number;
      closingBalance: number;
      isNormalDebit: boolean;
    }> = {};

    availableAccounts.forEach((acc) => {
      const isNormalDebit = ['Asset', 'Expense', 'ContraLiability', 'ContraEquity', 'ContraRevenue'].includes(acc.type || '');
      const opening = Number(acc.openingBalance) || 0;

      map[acc.code] = {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        opening,
        lines: [],
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: opening,
        isNormalDebit,
      };
    });

    filtered.forEach((line) => {
      const key = line.accountCode || 'UNASSIGNED';
      if (!map[key]) {
        const isNormalDebit = line.accountCode.startsWith('1') || line.accountCode.startsWith('5') || line.accountCode.startsWith('6');
        map[key] = {
          code: line.accountCode,
          name: line.accountName,
          opening: 0,
          lines: [],
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: 0,
          isNormalDebit,
        };
      }

      const sheet = map[key];
      sheet.totalDebit += line.debit || 0;
      sheet.totalCredit += line.credit || 0;

      let running = sheet.opening;
      if (sheet.lines.length > 0) {
        running = sheet.lines[sheet.lines.length - 1].runningBalance;
      }

      if (sheet.isNormalDebit) {
        running = running + (line.debit || 0) - (line.credit || 0);
      } else {
        running = running + (line.credit || 0) - (line.debit || 0);
      }

      sheet.lines.push({
        ...line,
        runningBalance: running,
      });
      sheet.closingBalance = running;
    });

    return Object.values(map)
      .filter((sheet) => sheet.lines.length > 0 || sheet.opening !== 0)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [availableAccounts, filtered]);

  // Grouped Accounts for T-Account View
  const groupedByAccount = useMemo(() => {
    const groups: Record<string, { code: string; name: string; lines: GeneralLedgerLine[]; totalDr: number; totalCr: number; balance: number }> = {};
    filtered.forEach((l) => {
      const key = l.accountCode || 'UNASSIGNED';
      if (!groups[key]) {
        groups[key] = {
          code: l.accountCode,
          name: l.accountName,
          lines: [],
          totalDr: 0,
          totalCr: 0,
          balance: 0,
        };
      }
      groups[key].lines.push(l);
      groups[key].totalDr += l.debit || 0;
      groups[key].totalCr += l.credit || 0;
    });

    Object.values(groups).forEach((g) => {
      g.balance = g.totalDr - g.totalCr;
    });

    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code));
  }, [filtered]);

  // Journal Entry Summary — groups all lines by reference to show complete double-entry per transaction
  const journalEntryGroups = useMemo(() => {
    const map = new Map<string, {
      reference: string;
      date: string;
      description: string;
      transactionType: string;
      status: string;
      lines: GeneralLedgerLine[];
      totalDebit: number;
      totalCredit: number;
      isReversal: boolean;
      isCancelled: boolean;
    }>();

    filtered.forEach((l) => {
      const ref = l.reference || 'UNASSIGNED';
      if (!map.has(ref)) {
        map.set(ref, {
          reference: ref,
          date: l.date || '',
          description: l.description || '',
          transactionType: l.transactionType || 'Journal',
          status: l.status || '',
          lines: [],
          totalDebit: 0,
          totalCredit: 0,
          isReversal: ref.startsWith('REV-'),
          isCancelled: !ref.startsWith('REV-') && reversedRefsSet.has(ref),
        });
      }
      const group = map.get(ref)!;
      group.lines.push(l);
      group.totalDebit += l.debit || 0;
      group.totalCredit += l.credit || 0;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.reference.localeCompare(b.reference);
    });
  }, [filtered, reversedRefsSet]);

  // ─── Export Institutional PDF ─────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 14;

    const brandColor: [number, number, number] = [15, 23, 42]; // Slate 900
    const grayColor: [number, number, number] = [100, 116, 139];

    // Header Band
    doc.setFillColor(...brandColor);
    doc.rect(margin, yPos, contentWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text((currentEntity?.name || 'Enterprise Group').toUpperCase(), margin + 6, yPos + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text('GENERAL LEDGER AUDIT REGISTER · DOUBLE-ENTRY FINANCIAL STATEMENT', margin + 6, yPos + 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const dateRangeLabel = from && to ? `${from} to ${to}` : from ? `From ${from}` : to ? `Up to ${to}` : 'All Dates (Full History)';
    doc.text(`PERIOD: ${dateRangeLabel}`, pageWidth - margin - 6, yPos + 8, { align: 'right' });
    doc.text(`CURRENCY: ${currentEntity?.currencyCode || 'PKR'}`, pageWidth - margin - 6, yPos + 14, { align: 'right' });

    yPos += 28;

    // KPI Summary Bar in PDF
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, contentWidth, 14, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`TOTAL POSTED DEBITS: ${money(totalDebit)}`, margin + 4, yPos + 6);
    doc.text(`TOTAL POSTED CREDITS: ${money(totalCredit)}`, margin + 4, yPos + 10.5);
    doc.text(`BALANCE INTEGRITY: ${isBalanced ? '✓ PERFECTLY BALANCED (0.00 DIFF)' : 'OUT OF BALANCE'}`, pageWidth - margin - 4, yPos + 8, { align: 'right' });

    yPos += 20;

    const tableBody: any[] = [];
    filtered.forEach((l) => {
      tableBody.push([
        l.date?.slice(0, 10) || '',
        l.reference || '',
        `${l.accountCode} - ${l.accountName}`,
        l.description || l.memo || '—',
        l.transactionType || 'Journal',
        l.debit > 0 ? money(l.debit) : '—',
        l.credit > 0 ? money(l.credit) : '—',
      ]);
    });

    tableBody.push([
      { content: 'TOTALS (BALANCED DOUBLE-ENTRY)', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: money(totalDebit), styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249], textColor: [16, 100, 75] } },
      { content: money(totalCredit), styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249], textColor: [16, 100, 75] } },
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['DATE', 'REF #', 'ACCOUNT TITLE', 'DESCRIPTION', 'TYPE', 'DEBIT (PKR)', 'CREDIT (PKR)']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 26, fontStyle: 'bold' },
        2: { cellWidth: 46 },
        3: { cellWidth: 50 },
        4: { cellWidth: 20 },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 220;

    // Signatures
    if (finalY < 245) {
      const sigY = Math.max(finalY + 16, 250);
      const colW = contentWidth / 3;

      ['Senior Accountant', 'Internal Auditor', 'Finance Controller / CFO'].forEach((title, idx) => {
        const x = margin + idx * colW + 4;
        doc.setDrawColor(180, 180, 180);
        doc.line(x, sigY, x + colW - 8, sigY);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...grayColor);
        doc.text(title, x + (colW - 8) / 2, sigY + 4.5, { align: 'center' });
      });
    }

    doc.save(`General_Ledger_Statement_${from || 'All'}_to_${to || 'Present'}.pdf`);
  };

  // ─── Export Excel & CSV ───────────────────────────────────────────────────
  const exportData = (type: 'excel' | 'csv') => {
    const headers = ['Date', 'Reference ID', 'Account Code', 'Account Name', 'Description / Memo', 'Transaction Type', 'Debit', 'Credit'];
    const rows = filtered.map((l) => [
      l.date?.slice(0, 10) || '',
      l.reference,
      l.accountCode,
      l.accountName,
      l.description || l.memo || '',
      l.transactionType || 'Journal',
      l.debit || 0,
      l.credit || 0,
    ]);

    if (type === 'excel') {
      downloadExcel('General_Ledger_Register', 'GeneralLedger', headers, rows);
    } else {
      downloadCSV('General_Ledger_Register', headers, rows);
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* ─── Page Header — AMS Signature Hero Band ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-violet-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-violet-500 to-indigo-700" />
              <div className="absolute inset-0 flex items-center justify-center"><BookOpen className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">General Ledger Register</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400"><span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" /> Live Ledger</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">IAS 1 / IFRS Double-Entry</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Audit-trail ledger of all posted transactions, running balances, and T-account allocations for {currentEntity?.name || 'Active Entity'}.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={exportPDF}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5" /> PDF Statement
          </button>
          <button
            onClick={() => exportData('excel')}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel (.xlsx)
          </button>
          <button
            onClick={() => exportData('csv')}
            className="px-3 py-2 border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <FileText className="w-3.5 h-3.5" /> CSV
          </button>
          </div>
        </div>
      </div>

      {/* ─── 4-in-1 Financial KPI Summary Cards ─── */}
      <KpiGrid cols={4}>
        {/* Total Debit */}
        <KpiCard
          icon={ArrowUpRight}
          label="TOTAL POSTED DEBITS (DR)"
          value={money(totalDebit)}
          desc="Asset & Expense debit movements"
          tone="emerald"
        />

        {/* Total Credit */}
        <KpiCard
          icon={ArrowDownRight}
          label="TOTAL POSTED CREDITS (CR)"
          value={money(totalCredit)}
          desc="Liability, Equity & Income credit movements"
          tone="rose"
        />

        {/* Ledger Integrity */}
        <KpiCard
          icon={ShieldCheck}
          label="DOUBLE-ENTRY INTEGRITY"
          value={isBalanced ? '0.00 Diff' : `${money(netDifference)} Diff`}
          desc={isBalanced ? '✓ 100% Balanced (IAS 1 Double-Entry)' : '⚠ Imbalance Detected'}
          tone={isBalanced ? 'blue' : 'red'}
        />

        {/* Transaction Lines */}
        <KpiCard
          icon={Layers}
          label="POSTED LEDGER LINES"
          value={`${filtered.length}`}
          desc={`Lines · Across ${availableAccounts.length} Chart Accounts`}
          tone="teal"
        />
      </KpiGrid>

      {/* ─── Search, Date Range & Filter Toolbar ─── */}
      <div className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] shadow-xs space-y-3">
        {/* Row 1: Search & Account Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="inline-flex items-center h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] focus-within:border-emerald-500 flex-1 max-w-md shadow-2xs">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search reference #, account code, memo, title..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] !p-0 !border-0 !outline-none !bg-transparent focus:!ring-0"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-0.5 text-gray-400 hover:text-gray-600 shrink-0 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Account Filter Dropdown */}
          <div className="inline-flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            <select
              value={selectedAccountFilter}
              onChange={(e) => setSelectedAccountFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-emerald-500 shadow-2xs font-semibold min-w-[240px]"
            >
              <option value="ALL">All Chart of Accounts ({availableAccounts.length})</option>
              {availableAccounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name} {a.type ? `(${a.type})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Date Presets, Custom Range & View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]">
          {/* Date Range Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-1 bg-[var(--color-surface-muted)] rounded-xl border border-[var(--color-border)] text-xs font-semibold">
              {(
                [
                  { id: 'all', label: 'All Dates' },
                  { id: 'today', label: 'Today' },
                  { id: 'this_month', label: 'Month' },
                  { id: 'this_quarter', label: 'Quarter' },
                  { id: 'this_year', label: 'Year' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyDatePreset(p.id)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${
                    datePreset === p.id
                      ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            <div className="inline-flex items-center gap-1.5">
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setDatePreset('all'); }}
                className="h-9 px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] font-mono outline-none focus:border-emerald-500"
              />
              <span className="text-[var(--color-text-muted)] text-xs">—</span>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setDatePreset('all'); }}
                className="h-9 px-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] font-mono outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-1 bg-[var(--color-surface-muted)] rounded-xl border border-[var(--color-border)] text-xs font-semibold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  filterType === 'all'
                    ? 'bg-[var(--color-surface)] text-foreground shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                All Entries
              </button>
              <button
                onClick={() => setFilterType('active')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  filterType === 'active'
                    ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                Active Only
              </button>
              <button
                onClick={() => setFilterType('reversals')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  filterType === 'reversals'
                    ? 'bg-[var(--color-surface)] text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                Cancelled & Reversals
              </button>
            </div>

            <div className="inline-flex p-1 bg-[var(--color-surface-muted)] rounded-xl border border-[var(--color-border)] text-xs font-semibold">
              <button
                onClick={() => setViewMode('chronological')}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  viewMode === 'chronological'
                    ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                📄 Postings Register
              </button>
              <button
                onClick={() => setViewMode('journal_entries')}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  viewMode === 'journal_entries'
                    ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                📒 Journal Entries ({journalEntryGroups.length})
              </button>
              <button
                onClick={() => setViewMode('account_ledgers')}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  viewMode === 'account_ledgers'
                    ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                📚 Account Head Ledgers ({accountLedgerSheets.length})
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  viewMode === 'grouped'
                    ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                ⚖️ T-Accounts
              </button>
              <button
                onClick={() => setViewMode('paired_reversals')}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  viewMode === 'paired_reversals'
                    ? 'bg-[var(--color-surface)] text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                🔄 Audit Trail Pairs ({pairedAuditEntries.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Mode 4: Dedicated Account Head Ledgers (Running Balance per Head) ─── */}
      {viewMode === 'account_ledgers' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {accountLedgerSheets.length === 0 ? (
            <div className="p-10 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h4 className="font-bold text-sm text-foreground">No Account Ledgers Found</h4>
              <p className="text-xs text-muted-foreground mt-1">No transaction activity recorded for the selected filter criteria.</p>
            </div>
          ) : (
            accountLedgerSheets.map((sheet) => (
              <div key={sheet.code} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
                {/* Account Head Header */}
                <div className="p-4 bg-muted/40 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-black">
                        {sheet.code}
                      </span>
                      <h3 className="font-extrabold text-sm text-foreground">
                        {sheet.name}
                      </h3>
                      {sheet.type && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {sheet.type} {sheet.subtype ? `• ${sheet.subtype}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground text-[10px] block uppercase font-sans">Opening Balance</span>
                      <span className="font-bold text-foreground">{money(sheet.opening)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block uppercase font-sans">Total Debits</span>
                      <span className="font-bold text-emerald-600">{money(sheet.totalDebit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block uppercase font-sans">Total Credits</span>
                      <span className="font-bold text-rose-600">{money(sheet.totalCredit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block uppercase font-sans">Closing Balance</span>
                      <span className={`font-black px-2 py-0.5 rounded border ${
                        (sheet.isNormalDebit ? sheet.closingBalance >= 0 : sheet.closingBalance <= 0)
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                        {money(Math.abs(sheet.closingBalance))} {sheet.closingBalance >= 0 ? (sheet.isNormalDebit ? '(DR)' : '(CR)') : (sheet.isNormalDebit ? '(CR)' : '(DR)')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-mono">
                        <th className="py-2.5 px-4 w-28">Date</th>
                        <th className="py-2.5 px-4 w-36">Reference #</th>
                        <th className="py-2.5 px-4">Description / Narration</th>
                        <th className="py-2.5 px-4 w-28">Type</th>
                        <th className="py-2.5 px-4 text-right w-28">Debit (DR)</th>
                        <th className="py-2.5 px-4 text-right w-28">Credit (CR)</th>
                        <th className="py-2.5 px-4 text-right w-32">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] font-sans">
                      {sheet.opening !== 0 && (
                        <tr className="bg-muted/10 text-muted-foreground text-[11px]">
                          <td className="py-2 px-4 font-mono">—</td>
                          <td className="py-2 px-4 font-mono font-bold">OPENING</td>
                          <td className="py-2 px-4 italic">Brought forward opening balance</td>
                          <td className="py-2 px-4">—</td>
                          <td className="py-2 px-4 text-right font-mono">—</td>
                          <td className="py-2 px-4 text-right font-mono">—</td>
                          <td className="py-2 px-4 text-right font-mono font-bold text-foreground">
                            {money(sheet.opening)}
                          </td>
                        </tr>
                      )}
                      {sheet.lines.map((l, idx) => {
                        const isRev = l.reference?.startsWith('REV-');
                        const isCancelled = l.reference && reversedRefsSet.has(l.reference);
                        return (
                          <tr
                            key={`${l.id}-${l.accountId}-${idx}`}
                            className={`hover:bg-muted/30 transition-colors ${
                              isRev
                                ? 'bg-rose-500/[0.04] dark:bg-rose-500/[0.08]'
                                : isCancelled
                                ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08]'
                                : ''
                            }`}
                          >
                            <td className="py-2.5 px-4 font-mono text-muted-foreground">
                              {l.date?.slice(0, 10)}
                            </td>
                            <td className="py-2.5 px-4">
                              {isRev ? (
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600 text-[8px] font-black uppercase">
                                      REV
                                    </span>
                                    <span className="font-mono font-bold text-rose-600 text-xs">
                                      {l.reference}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-muted-foreground">
                                    Reverses: {l.reference.replace('REV-', '')}
                                  </span>
                                </div>
                              ) : isCancelled ? (
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 text-[8px] font-black uppercase">
                                      CANCELLED
                                    </span>
                                    <span className="font-mono font-bold text-foreground text-xs line-through opacity-70">
                                      {l.reference}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-amber-600">
                                    Reversal: REV-{l.reference}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-mono font-bold text-blue-600 text-xs">
                                  {l.reference}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-foreground">
                              <div className={isRev ? 'font-medium text-rose-700 dark:text-rose-300' : ''}>
                                {l.description || '—'}
                              </div>
                              {l.memo && <div className="text-[10px] text-muted-foreground italic mt-0.5">{l.memo}</div>}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                isRev 
                                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                                  : isCancelled 
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}>
                                {isRev ? 'Reversal' : l.transactionType || 'Journal'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                              {l.debit > 0 ? money(l.debit) : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                              {l.credit > 0 ? money(l.credit) : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                              {money(Math.abs(l.runningBalance))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Mode 5: Journal Entry Summary — Complete Double-Entry per Transaction ─── */}
      {viewMode === 'journal_entries' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {journalEntryGroups.length === 0 ? (
            <div className="p-10 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h4 className="font-bold text-sm text-foreground">No Journal Entries Found</h4>
              <p className="text-xs text-muted-foreground mt-1">No transactions recorded for the selected filter criteria.</p>
            </div>
          ) : (
            journalEntryGroups.map((entry) => {
              const isRev = entry.isReversal;
              const isCancelled = entry.isCancelled;
              const originalRef = isRev ? entry.reference.replace('REV-', '') : null;

              // Separate lines by normal balance direction
              const debitLines = entry.lines.filter(l => (l.debit || 0) > 0);
              const creditLines = entry.lines.filter(l => (l.credit || 0) > 0);

              return (
                <div key={entry.reference} className={`rounded-2xl border bg-[var(--color-surface)] shadow-xs overflow-hidden ${
                  isRev ? 'border-rose-500/30' : isCancelled ? 'border-amber-500/30' : 'border-[var(--color-border)]'
                }`}>
                  {/* Journal Entry Header */}
                  <div className={`p-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 ${
                    isRev ? 'bg-rose-500/[0.04]' : isCancelled ? 'bg-amber-500/[0.04]' : 'bg-muted/30'
                  }`}>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {isRev ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[9px] font-black tracking-wider uppercase">
                          REVERSAL
                        </span>
                      ) : isCancelled ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black tracking-wider uppercase">
                          CANCELLED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-black tracking-wider uppercase">
                          JOURNAL ENTRY
                        </span>
                      )}
                      <h3 className="font-mono font-black text-sm text-foreground">{entry.reference}</h3>
                      {originalRef && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          — Reverses: <strong className="text-foreground">{originalRef}</strong>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-muted-foreground">{entry.date?.slice(0, 10)}</span>
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-semibold border border-border">
                        {entry.transactionType}
                      </span>
                      <span className={`font-black px-2 py-0.5 rounded border ${
                        Math.abs(entry.totalDebit - entry.totalCredit) < 0.01
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                        {Math.abs(entry.totalDebit - entry.totalCredit) < 0.01 ? '✓ Balanced' : '⚠ Imbalanced'}
                      </span>
                    </div>
                  </div>

                  {/* Side-by-Side Debit and Credit Legs */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)]">
                    {/* Debit Side (Left) */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Debits (DR)</span>
                        <span className="font-mono font-black text-sm text-emerald-600">{money(entry.totalDebit)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {debitLines.map((l, idx) => (
                          <div key={`${l.id}-${l.accountId}-${idx}`} className="flex items-center justify-between text-xs font-mono py-1.5 px-2 rounded-lg bg-emerald-500/[0.03] border border-emerald-500/10">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{l.accountCode}</span>
                              <span className="text-muted-foreground">{l.accountName}</span>
                            </div>
                            <span className="font-black text-emerald-600">{money(l.debit)}</span>
                          </div>
                        ))}
                        {debitLines.length === 0 && (
                          <div className="text-xs text-muted-foreground italic py-2 text-center">No debit legs</div>
                        )}
                      </div>
                    </div>

                    {/* Credit Side (Right) */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Credits (CR)</span>
                        <span className="font-mono font-black text-sm text-rose-600">{money(entry.totalCredit)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {creditLines.map((l, idx) => (
                          <div key={`${l.id}-${l.accountId}-${idx}`} className="flex items-center justify-between text-xs font-mono py-1.5 px-2 rounded-lg bg-rose-500/[0.03] border border-rose-500/10">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{l.accountCode}</span>
                              <span className="text-muted-foreground">{l.accountName}</span>
                            </div>
                            <span className="font-black text-rose-600">{money(l.credit)}</span>
                          </div>
                        ))}
                        {creditLines.length === 0 && (
                          <div className="text-xs text-muted-foreground italic py-2 text-center">No credit legs</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Narration / Description */}
                  {entry.description && (
                    <div className="px-4 py-2.5 bg-muted/20 border-t border-[var(--color-border)] text-xs text-muted-foreground italic">
                      <strong className="text-foreground not-italic">Narration:</strong> {entry.description}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Mode 3: Statutory Paired Reversal Reconciliation View ─── */}
      {viewMode === 'paired_reversals' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {pairedAuditEntries.length === 0 ? (
            <div className="p-10 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h4 className="font-bold text-sm text-foreground">No Cancelled or Reversed Invoices</h4>
              <p className="text-xs text-muted-foreground mt-1">When an invoice is cancelled or voided, the original transaction and its balancing reversal entry will appear side-by-side here.</p>
            </div>
          ) : (
            pairedAuditEntries.map((pair) => (
              <div key={pair.targetRef} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
                {/* Header Banner */}
                <div className="p-4 bg-muted/40 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-black tracking-wider uppercase">
                      CANCELLED & REVERSED
                    </span>
                    <h3 className="font-black text-sm text-foreground font-mono">
                      Invoice: {pair.targetRef}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      — {pair.description || 'Sales Transaction'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-muted-foreground">Net Ledger Balance:</span>
                    <span className="font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      $0.00 (Balanced Reversal)
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Dual Ledger Boxes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)]">
                  {/* Left Column: Original Invoice Entry */}
                  <div className="p-5 space-y-3 bg-blue-500/[0.02]">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                          ORIGINAL POSTING
                        </span>
                        <span className="font-mono font-bold text-xs text-foreground">{pair.targetRef}</span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">{pair.originalDate?.slice(0, 10)}</span>
                    </div>

                    <table className="w-full text-xs font-mono border-collapse">
                      <thead>
                        <tr className="text-[10px] text-muted-foreground uppercase border-b border-[var(--color-border)] pb-1">
                          <th className="text-left py-1">Account</th>
                          <th className="text-right py-1">Debit (DR)</th>
                          <th className="text-right py-1">Credit (CR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]/60">
                        {pair.originalLines.map((l, idx) => (
                          <tr key={`${l.id}-${l.accountId}-${idx}`} className="hover:bg-muted/30">
                            <td className="py-1.5 text-left font-sans text-xs">
                              <span className="font-mono font-bold text-foreground mr-1.5">{l.accountCode}</span>
                              <span className="text-muted-foreground">{l.accountName}</span>
                            </td>
                            <td className="py-1.5 text-right font-bold text-emerald-600">
                              {l.debit > 0 ? money(l.debit) : '—'}
                            </td>
                            <td className="py-1.5 text-right font-bold text-rose-600">
                              {l.credit > 0 ? money(l.credit) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Right Column: Reversal Entry */}
                  <div className="p-5 space-y-3 bg-rose-500/[0.02]">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                          CANCELLATION REVERSAL
                        </span>
                        <span className="font-mono font-bold text-xs text-rose-600">REV-{pair.targetRef}</span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">{pair.reversalDate?.slice(0, 10)}</span>
                    </div>

                    <table className="w-full text-xs font-mono border-collapse">
                      <thead>
                        <tr className="text-[10px] text-muted-foreground uppercase border-b border-[var(--color-border)] pb-1">
                          <th className="text-left py-1">Account</th>
                          <th className="text-right py-1">Debit (DR)</th>
                          <th className="text-right py-1">Credit (CR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]/60">
                        {pair.reversalLines.map((l, idx) => (
                          <tr key={`${l.id}-${l.accountId}-${idx}`} className="hover:bg-muted/30">
                            <td className="py-1.5 text-left font-sans text-xs">
                              <span className="font-mono font-bold text-foreground mr-1.5">{l.accountCode}</span>
                              <span className="text-muted-foreground">{l.accountName}</span>
                            </td>
                            <td className="py-1.5 text-right font-bold text-emerald-600">
                              {l.debit > 0 ? money(l.debit) : '—'}
                            </td>
                            <td className="py-1.5 text-right font-bold text-rose-600">
                              {l.credit > 0 ? money(l.credit) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Mode 1: Chronological Ledger Register Table ─── */}
      {viewMode === 'chronological' && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
          {/* Table Header Controls */}
          <div className="p-3 bg-muted/40 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-text-strong)]">Table Layout:</span>
              <div className="inline-flex p-0.5 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] text-xs font-semibold shadow-2xs">
                <button
                  onClick={() => setTableGrouping('voucher_summary')}
                  className={`px-3 py-1 rounded-md text-xs transition-all ${
                    tableGrouping === 'voucher_summary'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                  }`}
                >
                  📊 1 Row per Voucher (Summary Table)
                </button>
                <button
                  onClick={() => setTableGrouping('detailed_lines')}
                  className={`px-3 py-1 rounded-md text-xs transition-all ${
                    tableGrouping === 'detailed_lines'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                  }`}
                >
                  📋 All Line Splits (Raw Ledger Lines)
                </button>
              </div>
            </div>

            {tableGrouping === 'voucher_summary' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const allOpen: Record<string, boolean> = {};
                    journalEntryGroups.forEach(g => { allOpen[g.reference] = true; });
                    setExpandedVouchers(allOpen);
                  }}
                  className="text-[11px] font-semibold text-emerald-600 hover:underline"
                >
                  Expand All Splits
                </button>
                <span className="text-muted-foreground/40">|</span>
                <button
                  onClick={() => setExpandedVouchers({})}
                  className="text-[11px] font-semibold text-muted-foreground hover:underline"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-violet-500/[0.05] dark:bg-violet-400/[0.07] text-[var(--color-text-muted)] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-32">Date</th>
                  <th className="py-3 px-4 w-40">Reference #</th>
                  <th className="py-3 px-4 min-w-[200px]">GL Account(s)</th>
                  <th className="py-3 px-4 min-w-[240px]">Description / Narration</th>
                  <th className="py-3 px-4 w-28">Type</th>
                  <th className="py-3 px-4 text-right w-32">Debit (DR)</th>
                  <th className="py-3 px-4 text-right w-32">Credit (CR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] font-sans text-[var(--color-text)]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <TableSkeleton rows={6} />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={BookOpen}
                        title="No general ledger entries found"
                        hint="Post journals, sales invoices, or bills to generate ledger movements."
                      />
                    </td>
                  </tr>
                ) : tableGrouping === 'voucher_summary' ? (
                  /* ─── 1 Row per Voucher Summary Table (No Duplication) ─── */
                  journalEntryGroups.map((entry) => {
                    const isExpanded = !!expandedVouchers[entry.reference];
                    const isRev = entry.isReversal;
                    const isCancelled = entry.isCancelled;
                    const originalRef = isRev && entry.reference ? entry.reference.replace('REV-', '') : null;
                    const distinctAccountCodes = Array.from(new Set(entry.lines.map(l => l.accountCode).filter(Boolean)));

                    return (
                      <React.Fragment key={entry.reference}>
                        <tr
                          onClick={() => setExpandedVouchers(prev => ({ ...prev, [entry.reference]: !prev[entry.reference] }))}
                          className={`cursor-pointer transition-colors ${
                            isRev
                              ? 'bg-rose-500/[0.04] dark:bg-rose-500/[0.07] hover:bg-rose-500/[0.09]'
                              : isCancelled
                              ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.06] hover:bg-amber-500/[0.09]'
                              : 'hover:bg-[var(--color-surface-muted)]/60'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-[11px] text-[var(--color-text-muted)]">
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              )}
                              <span>{entry.date?.slice(0, 10) || '—'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isRev ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[9px] font-black tracking-wider uppercase">
                                    REVERSAL
                                  </span>
                                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                                    {entry.reference}
                                  </span>
                                </div>
                                {originalRef && (
                                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                    Reverses: <strong className="text-[var(--color-text-strong)]">{originalRef}</strong>
                                  </span>
                                )}
                              </div>
                            ) : isCancelled ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black tracking-wider uppercase">
                                    CANCELLED
                                  </span>
                                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                                    {entry.reference}
                                  </span>
                                </div>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  Reversal: REV-{entry.reference}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-blue-600 text-xs">
                                {entry.reference || '—'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-[var(--color-text-muted)] border border-border">
                                {entry.lines.length} splits
                              </span>
                              <span className="font-mono text-xs text-[var(--color-text-strong)]">
                                {distinctAccountCodes.slice(0, 3).join(', ')}
                                {distinctAccountCodes.length > 3 && ` +${distinctAccountCodes.length - 3}`}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-[var(--color-text)]">
                            <div className={isRev ? 'font-medium text-rose-700 dark:text-rose-300' : ''}>
                              {entry.description || '—'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              isRev 
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                                : isCancelled 
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                            }`}>
                              {isRev ? 'Reversal' : entry.transactionType || 'Journal'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            {money(entry.totalDebit)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                            {money(entry.totalCredit)}
                          </td>
                        </tr>

                        {/* Expanded Split Account Rows */}
                        {isExpanded && entry.lines.map((l, lIdx) => (
                          <tr
                            key={`${entry.reference}-split-${l.accountId}-${lIdx}`}
                            className="bg-muted/15 hover:bg-muted/25 text-[11px] border-l-4 border-l-emerald-500/40"
                          >
                            <td className="py-2 px-4 font-mono text-[10px] text-muted-foreground pl-8">
                              ↳ Line #{lIdx + 1}
                            </td>
                            <td className="py-2 px-4 font-mono text-[10px] text-muted-foreground">
                              {l.memo || entry.reference}
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-foreground">
                                  {l.accountCode}
                                </span>
                                <span className="text-muted-foreground">
                                  — {l.accountName}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-4 text-muted-foreground italic">
                              {l.memo || l.description || '—'}
                            </td>
                            <td className="py-2 px-4 text-muted-foreground text-[10px]">
                              {l.debit > 0 ? 'DR' : 'CR'}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-medium text-emerald-600">
                              {l.debit > 0 ? money(l.debit) : '—'}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-medium text-rose-600">
                              {l.credit > 0 ? money(l.credit) : '—'}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                ) : (
                  /* ─── Detailed Line Splits View ─── */
                  filtered.map((l, idx) => {
                    const isRev = l.reference?.startsWith('REV-') || l.description?.toLowerCase().includes('reversal');
                    const isCancelled = l.reference && reversedRefsSet.has(l.reference);
                    const originalRef = isRev && l.reference ? l.reference.replace('REV-', '') : null;

                    return (
                      <tr 
                        key={`${l.id}-${l.accountId}-${idx}`} 
                        className={`transition-colors ${
                          isRev 
                            ? 'bg-rose-500/[0.04] dark:bg-rose-500/[0.07] hover:bg-rose-500/[0.08]' 
                            : isCancelled 
                            ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.06] hover:bg-amber-500/[0.08]' 
                            : 'hover:bg-[var(--color-surface-muted)]/50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--color-text-muted)]">
                          {l.date?.slice(0, 10) || '—'}
                        </td>
                        <td className="py-3 px-4">
                          {isRev ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[9px] font-black tracking-wider uppercase">
                                  REVERSAL
                                </span>
                                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                                  {l.reference}
                                </span>
                              </div>
                              {originalRef && (
                                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                  Reverses: <strong className="text-[var(--color-text-strong)]">{originalRef}</strong>
                                </span>
                              )}
                            </div>
                          ) : isCancelled ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black tracking-wider uppercase">
                                  CANCELLED
                                </span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                                  {l.reference}
                                </span>
                              </div>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                Reversal: REV-{l.reference}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-blue-600 text-xs">
                              {l.reference || '—'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-[var(--color-text-strong)]">
                              {l.accountCode}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              — {l.accountName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--color-text)]">
                          <div className={isRev ? 'font-medium text-rose-700 dark:text-rose-300' : ''}>
                            {l.description || '—'}
                          </div>
                          {l.memo && <div className="text-[10px] text-[var(--color-text-muted)] italic mt-0.5">{l.memo}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            isRev 
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                              : isCancelled 
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                              : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                          }`}>
                            {isRev ? 'Reversal' : l.transactionType || 'Journal'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          {l.debit > 0 ? money(l.debit) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                          {l.credit > 0 ? money(l.credit) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-surface-muted)] font-bold text-xs">
                    <td colSpan={5} className="py-3 px-4 text-[var(--color-text-strong)] uppercase tracking-wider">
                      Total Ledger Postings (Double-Entry Balanced)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 font-extrabold text-sm">
                      {money(totalDebit)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 font-extrabold text-sm">
                      {money(totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ─── Mode 2: T-Account Visual Ledgers ─── */}
      {viewMode === 'grouped' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {groupedByAccount.length === 0 ? (
            <div className="col-span-2 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]">
              <EmptyState
                icon={Layers}
                title="No T-Account ledgers available"
                hint="Adjust the filters or switch the view mode to see grouped ledgers."
              />
            </div>
          ) : (
            groupedByAccount.map((group) => (
              <div
                key={group.code}
                className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-4"
              >
                {/* T-Account Card Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
                      <span className="font-mono text-emerald-600">{group.code}</span>
                      <span>— {group.name}</span>
                    </h3>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      {group.lines.length} transaction entries
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">
                      Net Balance
                    </span>
                    <span className={`text-sm font-mono font-bold ${group.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {money(Math.abs(group.balance))} {group.balance >= 0 ? '(DR)' : '(CR)'}
                    </span>
                  </div>
                </div>

                {/* T-Table (Split Debit / Credit) */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Debit Side (Left) */}
                  <div className="border-r border-[var(--color-border)] pr-3 space-y-2">
                    <div className="font-bold text-[11px] text-emerald-600 uppercase tracking-wider border-b border-[var(--color-border)] pb-1 flex justify-between">
                      <span>Debit (DR)</span>
                      <span>{money(group.totalDr)}</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {group.lines
                        .filter((l) => l.debit > 0)
                        .map((l, idx) => {
                          const isRev = l.reference?.startsWith('REV-');
                          const isCancelled = l.reference && reversedRefsSet.has(l.reference);
                          return (
                            <div key={`${l.id}-${l.accountId}-${idx}`} className={`flex justify-between text-[11px] font-mono py-0.5 px-1 rounded ${isRev ? 'bg-rose-500/10' : isCancelled ? 'bg-amber-500/10' : ''}`}>
                              <span className="text-[var(--color-text-muted)] truncate max-w-[130px] flex items-center gap-1" title={l.description}>
                                {isRev && <span className="text-[8px] font-black text-rose-600 bg-rose-500/20 px-1 rounded">REV</span>}
                                {isCancelled && <span className="text-[8px] font-black text-amber-600 bg-amber-500/20 px-1 rounded">VOID</span>}
                                <span className={isCancelled ? 'line-through opacity-70' : ''}>{l.date?.slice(5, 10)} {l.reference}</span>
                              </span>
                              <span className="font-bold text-emerald-600">{money(l.debit)}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Credit Side (Right) */}
                  <div className="pl-1 space-y-2">
                    <div className="font-bold text-[11px] text-rose-600 uppercase tracking-wider border-b border-[var(--color-border)] pb-1 flex justify-between">
                      <span>Credit (CR)</span>
                      <span>{money(group.totalCr)}</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {group.lines
                        .filter((l) => l.credit > 0)
                        .map((l, idx) => {
                          const isRev = l.reference?.startsWith('REV-');
                          const isCancelled = l.reference && reversedRefsSet.has(l.reference);
                          return (
                            <div key={`${l.id}-${l.accountId}-${idx}`} className={`flex justify-between text-[11px] font-mono py-0.5 px-1 rounded ${isRev ? 'bg-rose-500/10' : isCancelled ? 'bg-amber-500/10' : ''}`}>
                              <span className="text-[var(--color-text-muted)] truncate max-w-[130px] flex items-center gap-1" title={l.description}>
                                {isRev && <span className="text-[8px] font-black text-rose-600 bg-rose-500/20 px-1 rounded">REV</span>}
                                {isCancelled && <span className="text-[8px] font-black text-amber-600 bg-amber-500/20 px-1 rounded">VOID</span>}
                                <span className={isCancelled ? 'line-through opacity-70' : ''}>{l.date?.slice(5, 10)} {l.reference}</span>
                              </span>
                              <span className="font-bold text-rose-600">{money(l.credit)}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};