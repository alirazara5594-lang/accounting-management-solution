import React, { useState, useMemo, useEffect } from 'react';
import { journalsApi } from './api/modules/journals.api';
import type { JournalEntry } from './api/modules/journals.api';
import type { Account } from './api/modules/coa.api';
import {
  BookOpen, Plus, Search, X, CheckCircle2, ShieldCheck,
  Download, FileSpreadsheet, RefreshCw, Send, Zap,
  Save, Clock, Layers, FileText, Trash2, Check,
  AlertCircle, Sparkles, Landmark
} from 'lucide-react';
import { money } from './lib/currency';
import { downloadExcel, downloadCSV } from './lib/exportUtils';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState } from './components/ui/empty-state';
import { CompactSelect } from './components/CompactSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface JournalEntriesViewProps {
  accounts: Account[];
  initialEntries: JournalEntry[];
  onEntriesChange: (entries: JournalEntry[]) => void;
}

interface FormLine {
  accountId: string;
  memo: string;
  debit: string;
  credit: string;
}

const TEMPLATE_PRESETS = [
  { name: 'Monthly Depreciation', desc: 'Monthly depreciation expense for fixed assets & equipment' },
  { name: 'Accrued Payroll & Salaries', desc: 'Monthly payroll, employee salaries & tax accrual' },
  { name: 'Prepaid Rent Amortization', desc: 'Amortization of advance office/warehouse rent expense' },
  { name: 'Utility & Vendor Accruals', desc: 'Accrual of electricity, internet, and operational bills' },
  { name: 'Tax & Audit Adjustments', desc: 'Year-end tax provisions and audit adjustments' },
];

const statusStyles: Record<string, { label: string; hex: string }> = {
  Draft: { label: 'Draft', hex: '#94a3b8' },
  Submitted: { label: 'Submitted', hex: '#f59e0b' },
  Approved: { label: 'Approved', hex: '#3b82f6' },
  Posted: { label: 'Posted', hex: '#10b981' }
};

// Generates clean sequential Journal Entry references starting with JE-00001
const getNextJournalReference = (allEntries: JournalEntry[] = []): string => {
  let maxSeq = 0;
  for (const e of allEntries) {
    if (!e?.reference) continue;
    const ref = e.reference.trim();
    const match = ref.match(/^JE-(?:\d{4}-)?(\d+)$/i) || ref.match(/JE-(\d+)/i);
    if (match) {
      const numPart = parseInt(match[1], 10);
      if (!isNaN(numPart) && numPart > maxSeq && numPart < 1000000) {
        maxSeq = numPart;
      }
    }
  }
  return `JE-${String(maxSeq + 1).padStart(5, '0')}`;
};

export const JournalEntriesView: React.FC<JournalEntriesViewProps> = ({ accounts, initialEntries, onEntriesChange }) => {
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Submitted' | 'Approved' | 'Posted'>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetailEntry, setSelectedDetailEntry] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Journal Entry Form State
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    reference: getNextJournalReference(initialEntries),
    description: '',
    currency: 'PKR',
    lines: [
      { accountId: '', memo: '', debit: '', credit: '' },
      { accountId: '', memo: '', debit: '', credit: '' },
    ] as FormLine[],
  });

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await journalsApi.getJournalEntries();
      setEntries(data);
      onEntriesChange(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh journal entries.');
    } finally {
      setLoading(false);
    }
  };

  const [draftRestored, setDraftRestored] = useState(false);

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    if (isModalOpen && form.lines.some(l => l.accountId || l.debit || l.credit || l.memo || form.description)) {
      localStorage.setItem('ams_journal_draft', JSON.stringify(form));
    }
  }, [form, isModalOpen]);

  // Open Creation Modal (Restores saved draft if available)
  const openNewEntryModal = () => {
    setError('');
    setDraftRestored(false);
    try {
      const savedDraft = localStorage.getItem('ams_journal_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && Array.isArray(parsed.lines) && parsed.lines.length >= 2) {
          setForm(parsed);
          setDraftRestored(true);
          setIsModalOpen(true);
          return;
        }
      }
    } catch {}

    const defaultDate = new Date().toISOString().slice(0, 10);
    setForm({
      date: defaultDate,
      reference: getNextJournalReference(entries),
      description: '',
      currency: 'PKR',
      lines: [
        { accountId: accounts[0]?.id || '', memo: '', debit: '', credit: '' },
        { accountId: accounts[1]?.id || '', memo: '', debit: '', credit: '' },
      ],
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handleOpen = () => openNewEntryModal();
    window.addEventListener('open-new-journal-entry', handleOpen);
    return () => window.removeEventListener('open-new-journal-entry', handleOpen);
  }, [entries, accounts]);

  const handleDiscardDraft = () => {
    localStorage.removeItem('ams_journal_draft');
    setDraftRestored(false);
    const defaultDate = new Date().toISOString().slice(0, 10);
    setForm({
      date: defaultDate,
      reference: getNextJournalReference(entries),
      description: '',
      currency: 'PKR',
      lines: [
        { accountId: accounts[0]?.id || '', memo: '', debit: '', credit: '' },
        { accountId: accounts[1]?.id || '', memo: '', debit: '', credit: '' },
      ],
    });
  };

  // Calculate live debit/credit totals
  const formTotals = useMemo(() => {
    return form.lines.reduce(
      (acc, l) => ({
        debit: acc.debit + (parseFloat(l.debit) || 0),
        credit: acc.credit + (parseFloat(l.credit) || 0),
      }),
      { debit: 0, credit: 0 }
    );
  }, [form.lines]);

  const isBalanced = Math.abs(formTotals.debit - formTotals.credit) < 0.001 && formTotals.debit > 0;
  const balanceDifference = Math.abs(formTotals.debit - formTotals.credit);

  const updateLine = (idx: number, field: keyof FormLine, value: string) => {
    const updated = [...form.lines];
    updated[idx] = { ...updated[idx], [field]: value };
    // If user enters debit, clear credit on the same line if both were present
    if (field === 'debit' && parseFloat(value) > 0) {
      updated[idx].credit = '';
    } else if (field === 'credit' && parseFloat(value) > 0) {
      updated[idx].debit = '';
    }
    setForm({ ...form, lines: updated });
  };

  const addLine = () => {
    setForm({
      ...form,
      lines: [...form.lines, { accountId: '', memo: '', debit: '', credit: '' }],
    });
  };

  const removeLine = (idx: number) => {
    if (form.lines.length <= 2) return;
    setForm({
      ...form,
      lines: form.lines.filter((_, i) => i !== idx),
    });
  };

  // Auto-balance button: Automatically calculates and inserts or updates balancing line
  const handleAutoBalance = () => {
    const { debit, credit } = formTotals;
    const diff = debit - credit;
    if (Math.abs(diff) < 0.001) return;

    const updated = [...form.lines];
    const lastIdx = updated.length - 1;
    const lastLine = updated[lastIdx];

    if (diff > 0) {
      // Need more credit
      if (!lastLine.credit && !lastLine.debit) {
        updated[lastIdx].credit = diff.toFixed(2);
      } else {
        updated.push({ accountId: '', memo: 'Balancing Credit', debit: '', credit: diff.toFixed(2) });
      }
    } else {
      // Need more debit
      const needed = Math.abs(diff);
      if (!lastLine.credit && !lastLine.debit) {
        updated[lastIdx].debit = needed.toFixed(2);
      } else {
        updated.push({ accountId: '', memo: 'Balancing Debit', debit: needed.toFixed(2), credit: '' });
      }
    }
    setForm({ ...form, lines: updated });
  };

  // Handle Form Submission (Draft, Submit, or Immediate Post)
  const handleSaveEntry = async (e: React.FormEvent, action: 'draft' | 'submit' | 'post' = 'post') => {
    e.preventDefault();
    setError('');

    if (action !== 'draft' && !isBalanced) {
      setError('Entry must strictly balance (Debits must equal Credits) before posting or submitting.');
      return;
    }

    if (!form.reference.trim() || !form.description.trim()) {
      setError('Reference ID and Narration Description are required.');
      return;
    }

    const validLines = form.lines.filter(
      (l) => l.accountId && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0)
    );

    if (validLines.length < 2) {
      setError('A valid double-entry journal voucher requires at least two account lines.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date: form.date,
        reference: form.reference,
        description: form.description,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          memo: l.memo || undefined,
        })),
      };

      const created = await journalsApi.postJournalEntry(payload);

      if (action === 'submit') {
        await journalsApi.submit(created.id, 'Submitted for managerial approval');
      } else if (action === 'post') {
        await journalsApi.post(created.id, 'Posted directly to General Ledger');
      }

      localStorage.removeItem('ams_journal_draft');
      setIsModalOpen(false);
      await refresh();
    } catch (err: any) {
      setError(err?.data?.message || err?.data?.error || err?.message || 'Failed to save journal entry.');
    } finally {
      setSaving(false);
    }
  };

  // Lifecycle transitions (Submit, Approve, Post)
  const handleLifecycle = async (id: string, action: 'submit' | 'approve' | 'post') => {
    setActingId(id);
    setError('');
    try {
      if (action === 'submit') await journalsApi.submit(id, 'Submitted for approval');
      if (action === 'approve') await journalsApi.approve(id, 'Approved by controller');
      if (action === 'post') await journalsApi.post(id, 'Posted to General Ledger');
      await refresh();
    } catch (err: any) {
      setError(err?.data?.message || err?.data?.error || err?.message || 'Action failed.');
    } finally {
      setActingId(null);
    }
  };

  // 4 Top Financial KPIs
  const totalPostedCount = entries.filter((e) => e.status === 'Posted').length;
  const totalPendingCount = entries.filter((e) => e.status === 'Submitted' || e.status === 'Approved').length;
  const totalDraftCount = entries.filter((e) => !e.status || e.status === 'Draft').length;

  const totalJournalTurnover = entries.reduce((sum, e) => {
    const entryTotal = (e.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
    return sum + entryTotal;
  }, 0);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        if (statusFilter !== 'All') {
          const s = e.status || 'Draft';
          if (s !== statusFilter) return false;
        }
        if (query.trim()) {
          const q = query.toLowerCase();
          const matchesRef = (e.reference || '').toLowerCase().includes(q);
          const matchesDesc = (e.description || '').toLowerCase().includes(q);
          const matchesStatus = (e.status || '').toLowerCase().includes(q);
          const matchesLines = (e.lines || []).some((l) => {
            const acc = accounts.find((a) => a.id === l.accountId);
            return (
              (acc?.code || '').toLowerCase().includes(q) ||
              (acc?.name || '').toLowerCase().includes(q) ||
              (l.memo || '').toLowerCase().includes(q)
            );
          });
          if (!matchesRef && !matchesDesc && !matchesStatus && !matchesLines) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.date || a.createdAt || '';
        const dateB = b.date || b.createdAt || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const numA = (a as any).entryNumber || a.reference || '';
        const numB = (b as any).entryNumber || b.reference || '';
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [entries, statusFilter, query, accounts]);

  // ─── Branded Official IAS 1 Journal Voucher PDF Generator ───────────────────
  const generateJournalPDF = (entry: JournalEntry) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    const primaryColor: [number, number, number] = [20, 62, 43]; // Institutional Deep Forest
    const grayColor: [number, number, number] = [100, 116, 139];

    // Banner Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('GENERAL JOURNAL VOUCHER (JV)', margin, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reference: ${entry.reference}`, margin, 21);
    doc.text(`Effective Date: ${entry.date?.slice(0, 10)}`, pageWidth - margin, 14, { align: 'right' });
    doc.text(`Status: ${entry.status || 'Draft'} | IAS 1 Double-Entry`, pageWidth - margin, 21, { align: 'right' });

    let yPos = 36;

    // Voucher Memo Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, contentWidth, 14, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('DESCRIPTION / MEMO:', margin + 4, yPos + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(entry.description || 'General Journal Adjustment', margin + 4, yPos + 10.5);

    yPos += 20;

    // Table Lines
    const tableBody: any[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    (entry.lines || []).forEach((line, idx) => {
      const acc = accounts.find((a) => a.id === line.accountId);
      const accText = acc ? `${acc.code} — ${acc.name}` : `Account ID: ${line.accountId}`;
      totalDebit += line.debit || 0;
      totalCredit += line.credit || 0;

      tableBody.push([
        String(idx + 1),
        accText,
        line.memo || '—',
        line.debit > 0 ? money(line.debit) : '—',
        line.credit > 0 ? money(line.credit) : '—',
      ]);
    });

    tableBody.push([
      { content: 'TOTALS (BALANCED DOUBLE-ENTRY)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: money(totalDebit), styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249], textColor: [16, 100, 75] } },
      { content: money(totalCredit), styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249], textColor: [16, 100, 75] } },
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'ACCOUNT CODE & TITLE', 'LINE MEMO', 'DEBIT (PKR)', 'CREDIT (PKR)']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 46 },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 220;

    // Signatures
    if (finalY < 245) {
      const sigY = Math.max(finalY + 16, 250);
      const colW = contentWidth / 3;

      ['Prepared By (Accountant)', 'Verified By (Auditor)', 'Approved By (CFO / Controller)'].forEach((title, idx) => {
        const x = margin + idx * colW + 4;
        doc.setDrawColor(180, 180, 180);
        doc.line(x, sigY, x + colW - 8, sigY);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...grayColor);
        doc.text(title, x + (colW - 8) / 2, sigY + 4.5, { align: 'center' });
      });
    }

    doc.save(`Journal_Voucher_${entry.reference}_${entry.date?.slice(0, 10)}.pdf`);
  };

  // ─── Export Excel & CSV ───────────────────────────────────────────────────
  const exportData = (type: 'excel' | 'csv') => {
    const headers = ['Date', 'Reference ID', 'Description / Narration', 'Lines Count', 'Debit Total', 'Credit Total', 'Status'];
    const rows = filteredEntries.map((e) => {
      const debitTotal = (e.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
      const creditTotal = (e.lines || []).reduce((s, l) => s + (l.credit || 0), 0);
      return [
        e.date?.slice(0, 10) || '',
        e.reference,
        e.description,
        e.lines?.length || 0,
        debitTotal,
        creditTotal,
        e.status || 'Draft',
      ];
    });

    if (type === 'excel') {
      downloadExcel('General_Journal_Entries', 'Journals', headers, rows);
    } else {
      downloadCSV('General_Journal_Entries', headers, rows);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 p-2 md:p-6 min-h-screen">
      {/* ─── Page Header — AMS Signature Hero Band ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-violet-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-violet-500 to-purple-700" />
              <div className="absolute inset-0 flex items-center justify-center"><BookOpen className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">General Journal Entries</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400"><span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" /> Live Ledger</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">IAS 1 / IAS 8 / GAAP</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Record multi-line double-entry general journal vouchers with full debit-credit balancing and audit verification.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="journal-form"
            onClick={openNewEntryModal}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Post New Entry
          </button>
          <button
            onClick={() => exportData('excel')}
            className="inline-flex items-center gap-1.5 h-9 px-3 bg-[var(--color-surface)] hover:bg-gray-50 dark:hover:bg-gray-800 text-[var(--color-text)] border border-[var(--color-border)] rounded-xl text-xs font-semibold transition-all shadow-2xs"
            title="Export to Excel (.xls)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
          </button>
          <button
            onClick={() => exportData('csv')}
            className="inline-flex items-center gap-1.5 h-9 px-3 bg-[var(--color-surface)] hover:bg-gray-50 dark:hover:bg-gray-800 text-[var(--color-text)] border border-[var(--color-border)] rounded-xl text-xs font-semibold transition-all shadow-2xs"
            title="Export to CSV (.csv)"
          >
            CSV
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center bg-[var(--color-surface)] hover:bg-gray-50 dark:hover:bg-gray-800 text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-xl transition-all shadow-2xs"
            title="Refresh Entries"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          </div>
        </div>
      </div>

      {/* ─── 4-in-1 Top Financial KPI Cards ─── */}
      <KpiGrid cols={4}>
        {/* Total Posted */}
        <KpiCard
          icon={CheckCircle2}
          label="POSTED GENERAL JOURNALS"
          value={`${totalPostedCount}`}
          desc="Entries · Active & verified in General Ledger"
          tone="emerald"
        />

        {/* Pending Approval */}
        <KpiCard
          icon={Clock}
          label="PENDING APPROVAL & WORKFLOW"
          value={`${totalPendingCount}`}
          desc="Entries · Submitted & awaiting final review"
          tone="blue"
        />

        {/* Draft Workpapers */}
        <KpiCard
          icon={Layers}
          label="DRAFT WORKPAPERS"
          value={`${totalDraftCount}`}
          desc="Drafts · Unposted preparation adjustments"
          tone="purple"
        />

        {/* Journal Turnover */}
        <KpiCard
          icon={Landmark}
          label="JOURNAL TRANSACTION VOLUME"
          value={money(totalJournalTurnover)}
          desc="Cumulative double-entry volume"
          tone="teal"
        />
      </KpiGrid>

      {/* ─── Search & Status Filter Toolbar (Zero Overlap Guaranteed) ─── */}
      <div className="bg-[var(--color-surface)] p-3 rounded-2xl border border-[var(--color-border)] shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Zero Overlap Search Box */}
        <div className="inline-flex items-center h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:border-emerald-500 w-full sm:w-80 shadow-2xs">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search reference, description, account..."
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

        {/* Status Filter Tabs & Integrity Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl border border-[var(--color-border)] text-xs font-semibold">
            {(['All', 'Draft', 'Submitted', 'Approved', 'Posted'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === s
                    ? 'bg-[var(--color-surface)] text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Double-Entry Verified</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
        </div>
      )}

      {/* ─── Journal Entries Table ─── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-violet-500/[0.05] dark:bg-violet-400/[0.07] text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-extrabold">
                <th className="py-3.5 px-4">EFFECTIVE DATE</th>
                <th className="py-3.5 px-4">REFERENCE ID</th>
                <th className="py-3.5 px-4">DESCRIPTION / MEMO</th>
                <th className="py-3.5 px-4 text-center">LINES COUNT</th>
                <th className="py-3.5 px-4 text-right">TOTAL AMOUNT</th>
                <th className="py-3.5 px-4 text-center">LIFECYCLE STATUS</th>
                <th className="py-3.5 px-4 text-right pr-6">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={BookOpen}
                      title="No journal entries found"
                      hint='Click "Post New Entry" to create a balanced general journal voucher.'
                    />
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const debitTotal = (entry.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
                  const status = entry.status || 'Draft';
                  const isRev = entry.reference?.startsWith('REV-');
                  const hasReversal = !isRev && entries.some(e => e.reference === `REV-${entry.reference}`);
                  const originalRef = isRev && entry.reference ? entry.reference.replace('REV-', '') : null;

                  return (
                    <tr 
                      key={entry.id} 
                      className={`transition-colors ${
                        isRev 
                          ? 'bg-rose-500/[0.03] dark:bg-rose-500/[0.06] hover:bg-rose-500/[0.08]' 
                          : hasReversal 
                          ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.06] hover:bg-amber-500/[0.08]' 
                          : 'hover:bg-gray-50/50 dark:hover:bg-gray-900/30'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[var(--color-text)]">
                        {entry.date?.slice(0, 10)}
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
                        ) : hasReversal ? (
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
                              Reversed by REV-{entry.reference}
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                            {entry.reference}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--color-text-strong)] max-w-xs truncate">
                        <div className={isRev ? 'text-rose-700 dark:text-rose-300 font-medium' : ''}>
                          {entry.description}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md font-bold text-[10px]">
                          {entry.lines?.length || 0} lines
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {money(debitTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusChip status={status} label={statusStyles[status]?.label ?? status} hex={statusStyles[status]?.hex ?? '#94a3b8'} />
                      </td>
                      <td className="py-3 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedDetailEntry(entry)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-[var(--color-text-strong)] transition-all"
                            title="View Journal Voucher Details & T-Account"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => generateJournalPDF(entry)}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg text-emerald-600 transition-all"
                            title="Download IAS 1 PDF Voucher"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {status === 'Draft' && (
                            <button
                              disabled={actingId === entry.id}
                              onClick={() => handleLifecycle(entry.id, 'submit')}
                              className="h-7 px-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-bold transition-all"
                            >
                              Submit
                            </button>
                          )}
                          {status === 'Submitted' && (
                            <button
                              disabled={actingId === entry.id}
                              onClick={() => handleLifecycle(entry.id, 'approve')}
                              className="h-7 px-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[11px] font-bold transition-all"
                            >
                              Approve
                            </button>
                          )}
                          {status === 'Approved' && (
                            <button
                              disabled={actingId === entry.id}
                              onClick={() => handleLifecycle(entry.id, 'post')}
                              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1"
                            >
                              <Zap className="w-3 h-3" /> Post GL
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

      {/* ─── Ultra-Modern Multi-Line Journal Entry Creation Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto" onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col my-auto max-h-[94vh] transition-all animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-gray-50/70 dark:bg-gray-900/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)]">
                      New General Journal Entry
                    </h2>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      IAS 1 Double-Entry
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Record double-entry adjustments with automated ledger balancing & audit verification.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => handleSaveEntry(e, 'post')} className="flex-1 overflow-y-auto p-6 space-y-5">
              {draftRestored && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><b>Unsaved Draft Restored:</b> Resumed your previously typed journal entry.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-200/60 dark:bg-amber-900/60 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer text-amber-900 dark:text-amber-200"
                  >
                    Discard Draft
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
                  <span>{error}</span>
                  <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
                </div>
              )}

              {/* Transaction Meta Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50/60 dark:bg-gray-900/60 rounded-2xl border border-[var(--color-border)]">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-strong)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" /> Effective Date *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] font-mono outline-none focus:border-emerald-500 shadow-2xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-strong)] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-gray-500" /> Reference Number *
                  </label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="e.g. JE-00001"
                    className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] font-mono font-bold outline-none focus:border-emerald-500 shadow-2xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--color-text-strong)]">Accounting Currency *</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-emerald-500 shadow-2xs"
                    required
                  >
                    <option value="PKR">PKR — Pakistani Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="SAR">SAR — Saudi Riyal</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="CAD">CAD — Canadian Dollar</option>
                  </select>
                </div>
              </div>

              {/* Description & Quick Templates */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--color-text-strong)]">Narration / Transaction Description *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Monthly fixed assets depreciation adjustment for machinery and computing equipment"
                  className="w-full h-9 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-emerald-500 shadow-2xs"
                  required
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-[var(--color-text-muted)] font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Templates:
                  </span>
                  {TEMPLATE_PRESETS.map((tmpl) => (
                    <button
                      key={tmpl.name}
                      type="button"
                      onClick={() => setForm({ ...form, description: tmpl.desc })}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Multi-Line Accounting Ledger Grid ─── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-strong)] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" /> Accounting Ledger Lines (Debits & Credits)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoBalance}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold transition-all"
                      title="Auto-calculate and add the balancing credit/debit amount"
                    >
                      <Zap className="w-3 h-3 text-amber-600" /> Auto-Balance Entry
                    </button>
                    <button
                      type="button"
                      onClick={addLine}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold transition-all"
                    >
                      <Plus className="w-3 h-3 text-emerald-600" /> Add Line
                    </button>
                  </div>
                </div>

                <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)] shadow-2xs">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100/70 dark:bg-gray-800/70 text-[10px] font-extrabold text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]">
                        <th className="py-2.5 px-3 text-center w-10">#</th>
                        <th className="py-2.5 px-3 text-left w-1/3">ACCOUNT (CODE — TITLE) *</th>
                        <th className="py-2.5 px-3 text-left">LINE MEMO</th>
                        <th className="py-2.5 px-3 text-right w-32">DEBIT (+)</th>
                        <th className="py-2.5 px-3 text-right w-32">CREDIT (-)</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {form.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/30">
                          <td className="py-2 px-3 text-center font-mono font-bold text-[var(--color-text-muted)]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <CompactSelect
                              value={line.accountId}
                              onChange={v => updateLine(idx, 'accountId', v)}
                              placeholder="-- Select Chart of Account --"
                              searchPlaceholder="Search account code or title..."
                              options={accounts.map((a) => ({
                                value: a.id,
                                label: `${a.code} — ${a.name}`,
                                badge: String(a.type)
                              }))}
                              className="h-8 text-xs font-medium"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={line.memo}
                              onChange={(e) => updateLine(idx, 'memo', e.target.value)}
                              placeholder="Line reference/note"
                              className="w-full h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.debit}
                              onChange={(e) => updateLine(idx, 'debit', e.target.value)}
                              placeholder="0.00"
                              className="w-full h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.credit}
                              onChange={(e) => updateLine(idx, 'credit', e.target.value)}
                              placeholder="0.00"
                              className="w-full h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-right font-mono font-bold text-rose-600 dark:text-rose-400 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            {form.lines.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-400 hover:text-rose-600 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50/80 dark:bg-gray-900/80 font-extrabold border-t-2 border-[var(--color-border)]">
                        <td colSpan={3} className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isBalanced ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold">
                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Perfectly Balanced (IAS 1 Double-Entry)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Out of Balance by {money(balanceDifference, form.currency)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                          {money(formTotals.debit, form.currency)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-sm text-rose-600 dark:text-rose-400">
                          {money(formTotals.credit, form.currency)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="secondary h-9 px-4 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={(e) => handleSaveEntry(e, 'draft')}
                    className="inline-flex items-center gap-1.5 h-9 px-4 bg-[var(--color-surface)] hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--color-text)] border border-[var(--color-border)] rounded-xl text-xs font-semibold shadow-2xs"
                  >
                    <Save className="w-3.5 h-3.5 text-gray-500" /> Save as Draft
                  </button>
                  <button
                    type="button"
                    disabled={saving || !isBalanced}
                    onClick={(e) => handleSaveEntry(e, 'submit')}
                    className="inline-flex items-center gap-1.5 h-9 px-4 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit for Approval
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !isBalanced}
                    className="primary h-9 px-5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Post Entry to GL
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Ultra-Modern Journal Entry Detail & T-Account Modal ─── */}
      {selectedDetailEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6" onClick={() => setSelectedDetailEntry(null)}>
          <div
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] bg-gray-50/70 dark:bg-gray-900/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)]">
                      Journal Voucher #{selectedDetailEntry.reference}
                    </h2>
                    <StatusChip status={selectedDetailEntry.status || 'Draft'} label={statusStyles[selectedDetailEntry.status || 'Draft']?.label} hex={statusStyles[selectedDetailEntry.status || 'Draft']?.hex ?? '#94a3b8'} />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Effective Date: <strong>{selectedDetailEntry.date?.slice(0, 10)}</strong> | IAS 1 Verified
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailEntry(null)}
                className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Narration Memo Box */}
              <div className="p-3.5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-[var(--color-border)]">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                  Narration & Purpose
                </span>
                <p className="font-semibold text-[var(--color-text-strong)] text-xs">
                  {selectedDetailEntry.description || 'General Journal Adjustment'}
                </p>
              </div>

              {/* T-Account Lines Breakdown */}
              <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100/60 dark:bg-gray-800/60 text-[10px] font-extrabold text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]">
                      <th className="py-2.5 px-3 text-left">ACCOUNT CODE & TITLE</th>
                      <th className="py-2.5 px-3 text-left">LINE MEMO</th>
                      <th className="py-2.5 px-3 text-right">DEBIT (+)</th>
                      <th className="py-2.5 px-3 text-right">CREDIT (-)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] font-mono">
                    {(selectedDetailEntry.lines || []).map((line, i) => {
                      const acc = accounts.find((a) => a.id === line.accountId);
                      return (
                        <tr key={i} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/30">
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-bold text-[var(--color-text-strong)] block">
                              {acc ? `${acc.code} — ${acc.name}` : `Account ID: ${line.accountId}`}
                            </span>
                            {acc && <span className="text-[9px] text-[var(--color-text-muted)]">{acc.type}</span>}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-gray-500">{line.memo || '—'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {line.debit > 0 ? money(line.debit) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                            {line.credit > 0 ? money(line.credit) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-900 font-extrabold border-t border-[var(--color-border)]">
                      <td colSpan={2} className="py-2.5 px-3 text-xs text-[var(--color-text-strong)]">
                        TOTALS (BALANCED)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-emerald-600">
                        {money((selectedDetailEntry.lines || []).reduce((s, l) => s + (l.debit || 0), 0))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-rose-600">
                        {money((selectedDetailEntry.lines || []).reduce((s, l) => s + (l.credit || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedDetailEntry(null)}
                  className="secondary h-9 px-4 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => generateJournalPDF(selectedDetailEntry)}
                  className="primary h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download IAS 1 PDF Voucher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntriesView;