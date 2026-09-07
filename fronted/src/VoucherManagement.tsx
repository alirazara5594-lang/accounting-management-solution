import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers, Search, Plus, CheckCircle2,
  FileSpreadsheet, Download, Printer, RefreshCw,
  Send, ArrowDownCircle, Wallet, Building2, BookOpen,
  DollarSign, Clock, X, FileText, TrendingUp, Hash
} from 'lucide-react';
import type { Entity } from './EntitySettings';
import { useVendorsStore, useCustomersStore, useVouchersStore, useBankingStore } from './stores';
import { money } from './lib/currency';
import { downloadExcel, downloadCSV } from './lib/exportUtils';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type VoucherType = 'BPV' | 'BRV' | 'CPV' | 'CRV' | 'JV';

export interface VoucherRecord {
  id: string;
  voucherNumber: string;
  voucherType: VoucherType;
  date: string;
  accountName: string;
  partyType: 'Vendor' | 'Customer' | 'General Ledger';
  partyName: string;
  paymentMode: string;
  chequeNumber?: string;
  amount: number;
  currency: string;
  narration: string;
  status: 'Posted' | 'Draft';
}

interface VoucherManagementProps {
  subView?: string;
  activeEntityId: string;
  entities: Entity[];
}

export const VoucherManagement: React.FC<VoucherManagementProps> = ({ activeEntityId, entities }) => {
  const currentEntity = entities.find((e) => e.id === activeEntityId) || entities[0];
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [cashAccounts, setCashAccounts] = useState<{ id: string; code: string; name: string }[]>([]);
  const { vouchers: storeVouchers, fetchVouchers, createVoucher, loading } = useVouchersStore();
  const { bankAccounts: storeBankAccounts, cashAccounts: storeCashAccounts, fetchBankAccounts, fetchCashAccounts } = useBankingStore();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVoucherType, setSelectedVoucherType] = useState<VoucherType>('BPV');
  const [selectedDetailVoucher, setSelectedDetailVoucher] = useState<VoucherRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Form State
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    accountName: '',
    partyName: '',
    paymentMode: 'Wire Transfer',
    chequeNumber: '',
    amount: '',
    currency: currentEntity?.currencyCode || 'PKR',
    narration: '',
  });

  const fetchVendors = useVendorsStore((s) => s.fetchVendors);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);

  const loadData = async () => {
    await Promise.all([
      fetchVouchers(activeEntityId),
      fetchBankAccounts(activeEntityId),
      fetchCashAccounts(activeEntityId),
      fetchVendors(activeEntityId).then((d) => Array.isArray(d) && setVendors(d)),
      fetchCustomers(activeEntityId).then((d) => Array.isArray(d) && setCustomers(d)),
    ]);
  };

  useEffect(() => {
    loadData();
  }, [activeEntityId]);

  useEffect(() => {
    setBankAccounts(storeBankAccounts.map((a) => ({ id: a.id, code: a.code, name: a.name })));
  }, [storeBankAccounts]);

  useEffect(() => {
    setCashAccounts(storeCashAccounts.map((a) => ({ id: a.id, code: a.code, name: a.name })));
  }, [storeCashAccounts]);

  useEffect(() => {
    setVouchers(
      storeVouchers.map((v) => ({
        id: v.id,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        date: v.date,
        accountName: v.accountName,
        partyType: v.partyType,
        partyName: v.partyName,
        paymentMode: v.paymentMode,
        chequeNumber: v.chequeNumber,
        amount: v.amount,
        currency: v.currency || currentEntity?.currencyCode || 'PKR',
        narration: v.narration,
        status: v.status,
      }))
    );
  }, [storeVouchers, currentEntity]);

  const openVoucherModal = (type: VoucherType) => {
    setSelectedVoucherType(type);
    setError('');

    const bankAcc = bankAccounts.length > 0 ? bankAccounts[0].name : 'Commercial Bank Account';
    const cashAcc = cashAccounts.length > 0 ? cashAccounts[0].name : 'Main Cash Register Vault';
    let defaultAcc = bankAcc;
    let defaultMode = 'Wire Transfer';
    let defaultParty = '';

    if (type === 'BPV') {
      defaultAcc = bankAcc;
      defaultMode = 'Wire Transfer';
      defaultParty = vendors.length > 0 ? vendors[0].name : '';
    } else if (type === 'BRV') {
      defaultAcc = bankAcc;
      defaultMode = 'Wire Transfer';
      defaultParty = customers.length > 0 ? customers[0].name : '';
    } else if (type === 'CPV') {
      defaultAcc = cashAcc;
      defaultMode = 'Cash';
      defaultParty = vendors.length > 0 ? vendors[0].name : '';
    } else if (type === 'CRV') {
      defaultAcc = cashAcc;
      defaultMode = 'Cash';
      defaultParty = customers.length > 0 ? customers[0].name : '';
    } else if (type === 'JV') {
      defaultAcc = 'General Ledger Adjustments';
      defaultMode = 'N/A';
      defaultParty = 'General Ledger Adjustment';
    }

    setForm({
      date: new Date().toISOString().slice(0, 10),
      accountName: defaultAcc,
      partyName: defaultParty,
      paymentMode: defaultMode,
      chequeNumber: '',
      amount: '',
      currency: currentEntity?.currencyCode || 'PKR',
      narration: '',
    });

    setIsModalOpen(true);
  };

  const handlePostVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive voucher amount.');
      return;
    }

    const partyTypeMap: Record<VoucherType, 'Vendor' | 'Customer' | 'General Ledger'> = {
      BPV: 'Vendor',
      BRV: 'Customer',
      CPV: 'Vendor',
      CRV: 'Customer',
      JV: 'General Ledger',
    };

    setSaving(true);
    try {
      await createVoucher({
        type: selectedVoucherType,
        date: form.date,
        accountName: form.accountName,
        partyType: partyTypeMap[selectedVoucherType],
        partyName: form.partyName || (selectedVoucherType === 'JV' ? 'General Ledger' : 'Standard Counterparty'),
        paymentMode: form.paymentMode,
        chequeNumber: form.chequeNumber || undefined,
        amount: amt,
        currency: form.currency,
        narration: form.narration || `${selectedVoucherType} Posted Entry`,
        companyId: activeEntityId,
      });

      setIsModalOpen(false);
      await fetchVouchers(activeEntityId);
    } catch (err: any) {
      setError(err?.message || 'Failed to post voucher.');
    } finally {
      setSaving(false);
    }
  };

  const filteredVouchers = useMemo(() => {
    return vouchers
      .filter((v) => {
        if (typeFilter !== 'All' && v.voucherType !== typeFilter) return false;
        if (query.trim()) {
          const lower = query.toLowerCase();
          const matchesNum = v.voucherNumber.toLowerCase().includes(lower);
          const matchesParty = v.partyName.toLowerCase().includes(lower);
          const matchesAcc = v.accountName.toLowerCase().includes(lower);
          const matchesNarr = v.narration.toLowerCase().includes(lower);
          const matchesChq = (v.chequeNumber || '').toLowerCase().includes(lower);
          if (!matchesNum && !matchesParty && !matchesAcc && !matchesNarr && !matchesChq) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const numA = a.voucherNumber || '';
        const numB = b.voucherNumber || '';
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [vouchers, typeFilter, query]);

  // 4 Top Financial KPIs
  const totalDisbursements = filteredVouchers
    .filter((v) => v.voucherType === 'BPV' || v.voucherType === 'CPV')
    .reduce((s, v) => s + v.amount, 0);

  const totalReceipts = filteredVouchers
    .filter((v) => v.voucherType === 'BRV' || v.voucherType === 'CRV')
    .reduce((s, v) => s + v.amount, 0);

  const netLiquidity = totalReceipts - totalDisbursements;
  const totalCount = filteredVouchers.length;

  const getVoucherBadgeStyle = (type: VoucherType) => {
    switch (type) {
      case 'BPV':
        return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
      case 'BRV':
        return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'CPV':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'CRV':
        return 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800';
      case 'JV':
        return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getVoucherFullTitle = (type: VoucherType) => {
    switch (type) {
      case 'BPV': return 'BANK PAYMENT VOUCHER (BPV)';
      case 'BRV': return 'BANK RECEIPT VOUCHER (BRV)';
      case 'CPV': return 'CASH PAYMENT VOUCHER (CPV)';
      case 'CRV': return 'CASH RECEIPT VOUCHER (CRV)';
      case 'JV': return 'JOURNAL VOUCHER (JV)';
    }
  };

  // ─── Branded Official Voucher PDF Generator ─────────────────────────────────
  const generateVoucherPDF = (v: VoucherRecord) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    const isPayment = v.voucherType === 'BPV' || v.voucherType === 'CPV';
    const isReceipt = v.voucherType === 'BRV' || v.voucherType === 'CRV';

    const primaryColor: [number, number, number] = isPayment
      ? [225, 29, 72]
      : isReceipt
      ? [16, 185, 129]
      : [79, 70, 229];

    const darkColor: [number, number, number] = [15, 23, 42];
    const grayColor: [number, number, number] = [100, 116, 139];
    const lightBg: [number, number, number] = [248, 250, 252];
    const borderGray: [number, number, number] = [226, 232, 240];

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(getVoucherFullTitle(v.voucherType), margin, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Voucher Number: ${v.voucherNumber}`, margin, 21);
    doc.text(`Date: ${v.date}`, pageWidth - margin, 14, { align: 'right' });
    doc.text(`Status: ${v.status}`, pageWidth - margin, 21, { align: 'right' });

    // Details Grid
    const boxY = 34;
    const boxH = 38;
    const colW = (contentWidth - 6) / 2;

    // Company Profile Box
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
      doc.text(`Tax Registration / NTN: ${compAny.taxId || compAny.ntn}`, margin + 4, compY);
      compY += 4.5;
    }
    if (compAny?.country || compAny?.legalName) {
      doc.text(`${compAny.legalName || ''} • ${compAny.country || ''}`.trim(), margin + 4, compY);
      compY += 4.5;
    }
    doc.text(`Base Currency: ${currentEntity?.currencyCode || 'PKR'}`, margin + 4, compY);

    // Counterparty & Account Box
    const rightX = margin + colW + 6;
    doc.setFillColor(...lightBg);
    doc.roundedRect(rightX, boxY, colW, boxH, 2, 2, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT & BENEFICIARY INFORMATION', rightX + 4, boxY + 7);

    doc.setTextColor(...darkColor);
    doc.setFontSize(9);
    doc.text(v.partyName, rightX + 4, boxY + 14);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Posting Account: ${v.accountName}`, rightX + 4, boxY + 20);
    doc.text(`Payment Mode: ${v.paymentMode}`, rightX + 4, boxY + 25);
    if (v.chequeNumber) {
      doc.text(`Cheque / Ref #: ${v.chequeNumber}`, rightX + 4, boxY + 30);
    } else {
      doc.text(`Party Classification: ${v.partyType}`, rightX + 4, boxY + 30);
    }

    // Amount Banner
    const bannerY = boxY + boxH + 6;
    doc.setFillColor(isPayment ? 255 : 236, isPayment ? 241 : 253, isPayment ? 242 : 245);
    doc.setDrawColor(isPayment ? 254 : 167, isPayment ? 205 : 243, isPayment ? 211 : 208);
    doc.roundedRect(margin, bannerY, contentWidth, 18, 2, 2, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(
      isPayment ? 'TOTAL AMOUNT DISBURSED' : isReceipt ? 'TOTAL AMOUNT RECEIVED' : 'TOTAL ADJUSTMENT VALUE',
      margin + 4,
      bannerY + 6.5
    );

    doc.setFontSize(14);
    doc.text(money(v.amount, v.currency), margin + 4, bannerY + 14);

    // General Ledger Breakdown Table
    const tableStartY = bannerY + 24;
    const tableHeaders = ['Account Code & Description', 'Narration / Ref', 'Debit', 'Credit'];

    let debitAcc = '';
    let creditAcc = '';
    if (isPayment) {
      debitAcc = `${v.partyType} Account: ${v.partyName}`;
      creditAcc = `Bank / Cash Account: ${v.accountName}`;
    } else if (isReceipt) {
      debitAcc = `Bank / Cash Account: ${v.accountName}`;
      creditAcc = `${v.partyType} Account: ${v.partyName}`;
    } else {
      debitAcc = `Adjustment Debit Account: ${v.partyName}`;
      creditAcc = `Adjustment Credit Account: ${v.accountName}`;
    }

    const tableRows = [
      [debitAcc, v.narration || v.voucherNumber, money(v.amount, v.currency), '—'],
      [creditAcc, v.narration || v.voucherNumber, '—', money(v.amount, v.currency)],
    ];

    autoTable(doc, {
      startY: tableStartY,
      head: [tableHeaders],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3.5, textColor: darkColor },
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        2: { halign: 'right', fontStyle: 'bold', textColor: isReceipt ? [16, 185, 129] : darkColor },
        3: { halign: 'right', fontStyle: 'bold', textColor: isPayment ? [225, 29, 72] : darkColor },
      },
    });

    // Signatures Quadruple Block
    const signY = 200;
    const signColW = (contentWidth - 18) / 4;

    const signLabels = ['Prepared By / Cashier', 'Checked By', 'Verified & Approved', 'Received By / Payee'];
    signLabels.forEach((label, idx) => {
      const curX = margin + idx * (signColW + 6);
      doc.setDrawColor(...borderGray);
      doc.line(curX, signY, curX + signColW, signY);
      doc.setTextColor(...grayColor);
      doc.setFontSize(7);
      doc.text(label, curX, signY + 4);
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setTextColor(...grayColor);
    doc.setFontSize(7);
    doc.text('Official Financial Voucher. Generated from AMS General Ledger & Voucher Module.', margin, pageHeight - 8);

    const safeNum = (v.voucherNumber || 'Voucher').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Voucher_${v.voucherType}_${safeNum}.pdf`);
  };

  // ─── Excel & CSV Exports ───────────────────────────────────────────────────
  const exportVouchersExcel = () => {
    const headers = ['Voucher No', 'Type', 'Date', 'Account / Vault', 'Party Name', 'Party Type', 'Payment Mode', 'Cheque / Ref', 'Amount', 'Currency', 'Narration', 'Status'];
    const rows = filteredVouchers.map((v) => [
      v.voucherNumber,
      v.voucherType,
      v.date,
      v.accountName,
      v.partyName,
      v.partyType,
      v.paymentMode,
      v.chequeNumber || '—',
      v.amount,
      v.currency,
      v.narration,
      v.status,
    ]);
    downloadExcel(`Vouchers_Register_${new Date().toISOString().slice(0, 10)}`, 'Vouchers Register', headers, rows);
  };

  const exportVouchersCSV = () => {
    const headers = ['Voucher No', 'Type', 'Date', 'Account / Vault', 'Party Name', 'Party Type', 'Payment Mode', 'Cheque / Ref', 'Amount', 'Currency', 'Narration', 'Status'];
    const rows = filteredVouchers.map((v) => [
      v.voucherNumber,
      v.voucherType,
      v.date,
      v.accountName,
      v.partyName,
      v.partyType,
      v.paymentMode,
      v.chequeNumber || '—',
      v.amount,
      v.currency,
      v.narration,
      v.status,
    ]);
    downloadCSV(`Vouchers_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
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
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-blue-500 to-teal-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Layers className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Voucher Management &amp; General Ledger Journals</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Create, post, and audit Bank Payment (BPV), Bank Receipt (BRV), Cash Payment (CPV), Cash Receipt (CRV), and Journal Vouchers (JV) for {currentEntity?.name || 'Active Company'}.
              </p>
            </div>
          </div>

          {/* Global Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={exportVouchersExcel}
              className="secondary h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              title="Export vouchers register to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
            </button>
            <button
              onClick={exportVouchersCSV}
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
              title="Refresh vouchers"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => openVoucherModal('BPV')}
              className="primary h-8.5 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Post New Voucher
            </button>
          </div>
        </div>
      </div>

      {/* 5 Quick Voucher Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* BPV */}
        <button
          type="button"
          onClick={() => openVoucherModal('BPV')}
          className="p-3.5 rounded-xl border text-left transition-all cursor-pointer bg-[var(--color-surface)] border-[var(--color-border)] hover:border-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 shadow-2xs group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
              <Send className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200">
              BPV
            </span>
          </div>
          <h3 className="text-xs font-bold text-[var(--color-text-strong)] group-hover:text-rose-600 transition-colors">
            Bank Payment
          </h3>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
            Disburse supplier payments & bills from bank accounts.
          </p>
        </button>

        {/* BRV */}
        <button
          type="button"
          onClick={() => openVoucherModal('BRV')}
          className="p-3.5 rounded-xl border text-left transition-all cursor-pointer bg-[var(--color-surface)] border-[var(--color-border)] hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 shadow-2xs group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              <ArrowDownCircle className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
              BRV
            </span>
          </div>
          <h3 className="text-xs font-bold text-[var(--color-text-strong)] group-hover:text-emerald-600 transition-colors">
            Bank Receipt
          </h3>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
            Collect customer invoice payments directly into bank accounts.
          </p>
        </button>

        {/* CPV */}
        <button
          type="button"
          onClick={() => openVoucherModal('CPV')}
          className="p-3.5 rounded-xl border text-left transition-all cursor-pointer bg-[var(--color-surface)] border-[var(--color-border)] hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 shadow-2xs group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              <Wallet className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
              CPV
            </span>
          </div>
          <h3 className="text-xs font-bold text-[var(--color-text-strong)] group-hover:text-amber-600 transition-colors">
            Cash Payment
          </h3>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
            Pay petty cash expenses or cash purchases from registers.
          </p>
        </button>

        {/* CRV */}
        <button
          type="button"
          onClick={() => openVoucherModal('CRV')}
          className="p-3.5 rounded-xl border text-left transition-all cursor-pointer bg-[var(--color-surface)] border-[var(--color-border)] hover:border-teal-400 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 shadow-2xs group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
              <Building2 className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200">
              CRV
            </span>
          </div>
          <h3 className="text-xs font-bold text-[var(--color-text-strong)] group-hover:text-teal-600 transition-colors">
            Cash Receipt
          </h3>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
            Receive customer cash settlements into physical vaults.
          </p>
        </button>

        {/* JV */}
        <button
          type="button"
          onClick={() => openVoucherModal('JV')}
          className="p-3.5 rounded-xl border text-left transition-all cursor-pointer bg-[var(--color-surface)] border-[var(--color-border)] hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 shadow-2xs group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200">
              JV
            </span>
          </div>
          <h3 className="text-xs font-bold text-[var(--color-text-strong)] group-hover:text-indigo-600 transition-colors">
            Journal Voucher
          </h3>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
            Post General Ledger adjustments & non-cash corrections.
          </p>
        </button>
      </div>

      {/* 4 Financial Metric Cards - 4 in 1 Row */}
      <KpiGrid cols={4}>
        <KpiCard icon={Send} label="PAYMENTS (BPV + CPV)" value={money(totalDisbursements, currentEntity?.currencyCode)} desc="Disbursements to vendors" tone="rose" />
        <KpiCard icon={ArrowDownCircle} label="RECEIPTS (BRV + CRV)" value={money(totalReceipts, currentEntity?.currencyCode)} desc="Collections from customers" tone="emerald" />
        <KpiCard icon={TrendingUp} label="NET VOUCHER LIQUIDITY" value={money(netLiquidity, currentEntity?.currencyCode)} desc={netLiquidity >= 0 ? 'Net positive liquidity' : 'Net disbursement surplus'} tone={netLiquidity >= 0 ? 'blue' : 'amber'} />
        <KpiCard icon={Hash} label="VOUCHERS COUNT" value={totalCount} desc="Posted financial vouchers" tone="purple" />
      </KpiGrid>

      {/* Filter Toolbar & Non-Overlapping Search Box */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] shadow-xs">
        {/* Voucher Type Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-bold text-[var(--color-text-muted)] mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Type:
          </span>
          {(['All', 'BPV', 'BRV', 'CPV', 'CRV', 'JV'] as const).map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`h-7.5 px-2.5 rounded-md text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[var(--color-text)]'
                }`}
              >
                {t === 'All' ? '⚡ All Vouchers' : t}
              </button>
            );
          })}
        </div>

        {/* Robust Search Box - Guaranteed Zero Text/Icon Overlap */}
        <div className="flex items-center h-8 w-64 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 transition-all shadow-2xs">
          <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search voucher #, party, account..."
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

      {/* Vouchers Register Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-blue-500 to-teal-700" />
            Vouchers Register Ledger
          </p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {filteredVouchers.length} vouchers · Click <strong>Voucher PDF</strong> to generate an official double-entry voucher slip.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07] text-[var(--color-text-muted)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Voucher #</th>
                <th className="py-2.5 px-3 text-center">Type</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Posting Account</th>
                <th className="py-2.5 px-3">Party / Beneficiary</th>
                <th className="py-2.5 px-3">Mode & Ref</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <TableSkeleton rows={6} />
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={BookOpen}
                      title="No vouchers found"
                      hint="Post a BPV, BRV, CPV, CRV or JV, or adjust the type filter and search."
                    />
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const isDisbursement = v.voucherType === 'BPV' || v.voucherType === 'CPV';
                  const isCollection = v.voucherType === 'BRV' || v.voucherType === 'CRV';

                  return (
                    <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        <button
                          onClick={() => setSelectedDetailVoucher(v)}
                          className="hover:underline text-left font-mono"
                          title="View voucher audit breakdown"
                        >
                          {v.voucherNumber}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getVoucherBadgeStyle(v.voucherType)}`}>
                          {v.voucherType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--color-text)] whitespace-nowrap">
                        {v.date}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--color-text-strong)]">
                        {v.accountName}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text)] max-w-xs truncate" title={v.partyName}>
                        <span className="font-semibold">{v.partyName}</span>
                        {v.partyType && <span className="text-[10px] text-[var(--color-text-muted)] ml-1">({v.partyType})</span>}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text)] text-[11px]">
                        <span>{v.paymentMode}</span>
                        {v.chequeNumber && (
                          <span className="font-mono text-gray-400 ml-1">#{v.chequeNumber}</span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-extrabold ${
                        isCollection
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isDisbursement
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {money(v.amount, v.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {v.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => generateVoucherPDF(v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-semibold transition-all shadow-2xs"
                          title="Download Official Voucher PDF"
                        >
                          <Download className="w-3 h-3" /> Voucher PDF
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredVouchers.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-900 border-t-2 border-[var(--color-border)] font-bold text-xs">
                <tr>
                  <td colSpan={6} className="py-3 px-3.5 uppercase tracking-wider text-[var(--color-text-muted)] text-right">
                    Total Voucher Volume ({filteredVouchers.length}):
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                    {money(filteredVouchers.reduce((s, v) => s + v.amount, 0), currentEntity?.currencyCode)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ─── Ultra-Modern Institutional Voucher Creation Workspace Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto" onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col my-auto max-h-[92vh] transition-all animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-gray-50/70 dark:bg-gray-900/70">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  selectedVoucherType === 'BPV' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-800' :
                  selectedVoucherType === 'BRV' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800' :
                  selectedVoucherType === 'CPV' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800' :
                  selectedVoucherType === 'CRV' ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 border-teal-200 dark:border-teal-800' :
                  'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border-indigo-200 dark:border-indigo-800'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)]">
                      Post {getVoucherFullTitle(selectedVoucherType)}
                    </h2>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getVoucherBadgeStyle(selectedVoucherType)}`}>
                      {selectedVoucherType}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Authorized double-entry accounting transaction for <strong>{currentEntity?.name || 'Active Company'}</strong>.
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

            {/* Modal Body: 2-Column Responsive Workspace */}
            <form onSubmit={handlePostVoucher} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
                  <span>{error}</span>
                  <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold ml-2">✕</button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ─── Left Column (7 cols): Data Entry Fields ─── */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Date & Currency Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--color-text-strong)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-500" /> Voucher Date *
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
                        <DollarSign className="w-3.5 h-3.5 text-gray-500" /> Currency *
                      </label>
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

                  {/* Posting Source Account */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--color-text-strong)] flex items-center gap-1.5">
                      {selectedVoucherType === 'BPV' || selectedVoucherType === 'BRV' ? (
                        <>
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Commercial Bank Account *</span>
                        </>
                      ) : selectedVoucherType === 'CPV' || selectedVoucherType === 'CRV' ? (
                        <>
                          <Wallet className="w-3.5 h-3.5 text-amber-600" />
                          <span>Cash Register / Vault Account *</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span>General Ledger Balancing Account *</span>
                        </>
                      )}
                    </label>
                    <select
                      value={form.accountName}
                      onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-emerald-500 shadow-2xs"
                      required
                    >
                      {selectedVoucherType === 'BPV' || selectedVoucherType === 'BRV' ? (
                        bankAccounts.length > 0 ? (
                          bankAccounts.map((b) => (
                            <option key={b.id} value={b.name}>{b.code} — {b.name}</option>
                          ))
                        ) : (
                          <option value="Commercial Bank Account">11201 — Commercial Bank Account</option>
                        )
                      ) : selectedVoucherType === 'CPV' || selectedVoucherType === 'CRV' ? (
                        cashAccounts.length > 0 ? (
                          cashAccounts.map((c) => (
                            <option key={c.id} value={c.name}>{c.code} — {c.name}</option>
                          ))
                        ) : (
                          <option value="Main Cash Register Vault">11101 — Main Cash Register Vault</option>
                        )
                      ) : (
                        <option value="General Ledger Adjustments">11000 — General Ledger Adjustments</option>
                      )}
                    </select>
                  </div>

                  {/* Counterparty / Beneficiary */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--color-text-strong)]">
                      {selectedVoucherType === 'BPV' || selectedVoucherType === 'CPV'
                        ? 'Payee / Supplier (Vendor) *'
                        : selectedVoucherType === 'BRV' || selectedVoucherType === 'CRV'
                        ? 'Payer / Client (Customer) *'
                        : 'Adjusting Party / GL Reference *'}
                    </label>
                    {selectedVoucherType === 'BPV' || selectedVoucherType === 'CPV' ? (
                      <select
                        value={form.partyName}
                        onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-emerald-500 shadow-2xs"
                        required
                      >
                        <option value="">-- Select Vendor / Supplier --</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.name}>{v.name} ({v.vendorNumber || 'Vendor'})</option>
                        ))}
                      </select>
                    ) : selectedVoucherType === 'BRV' || selectedVoucherType === 'CRV' ? (
                      <select
                        value={form.partyName}
                        onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-emerald-500 shadow-2xs"
                        required
                      >
                        <option value="">-- Select Customer / Client --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.name}>{c.name} ({c.customerNumber || 'Customer'})</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={form.partyName}
                        onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                        placeholder="e.g. Accrued Payroll / Fixed Asset Depreciation"
                        className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-emerald-500 shadow-2xs"
                        required
                      />
                    )}
                  </div>

                  {/* Payment Mode & Reference */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--color-text-strong)]">Payment Instrument</label>
                      <select
                        value={form.paymentMode}
                        onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                        className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-emerald-500 shadow-2xs"
                      >
                        <option value="Wire Transfer">Wire Transfer</option>
                        <option value="Bank Transfer">Bank Transfer / Online</option>
                        <option value="Cheque">Cheque / Check</option>
                        <option value="Pay Order">Pay Order</option>
                        <option value="Cash">Physical Cash</option>
                        <option value="ACH">ACH Electronic</option>
                        <option value="RTGS">RTGS Real-Time</option>
                        <option value="N/A">N/A (Journal Adjustment)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--color-text-strong)]">Cheque / Reference Number</label>
                      <input
                        type="text"
                        value={form.chequeNumber}
                        onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })}
                        placeholder="e.g. CHQ-99182 / TXN-8172"
                        className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] font-mono outline-none focus:border-emerald-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--color-text-strong)] flex items-center justify-between">
                      <span>Voucher Amount ({form.currency}) *</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                        {money(parseFloat(form.amount) || 0, form.currency)}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] font-mono font-bold outline-none focus:border-emerald-500 shadow-2xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Narration & Quick Memos */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--color-text-strong)]">Narration / Memo</label>
                    <input
                      type="text"
                      value={form.narration}
                      onChange={(e) => setForm({ ...form, narration: e.target.value })}
                      placeholder="e.g. Settlement of Invoice #INV-1092 via bank wire"
                      className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-emerald-500 shadow-2xs"
                    />
                    {/* Quick Suggestions */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-[var(--color-text-muted)] font-semibold">Quick memo:</span>
                      {['Supplier Invoice Settlement', 'Advance Payment', 'Monthly Office Rent', 'Utility Bills', 'Tax Clearance'].map((memo) => (
                        <button
                          key={memo}
                          type="button"
                          onClick={() => setForm({ ...form, narration: memo })}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          {memo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ─── Right Column (5 cols): Live Accounting T-Account & GL Impact ─── */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-gray-50/50 dark:bg-gray-900/50 p-4 rounded-2xl border border-[var(--color-border)]">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-strong)] flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-600" /> Live Double-Entry T-Account
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        IAS 1 Balanced
                      </span>
                    </div>

                    {/* Double-Entry Table */}
                    <div className="mt-3 border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100/60 dark:bg-gray-800/60 text-[10px] font-extrabold text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]">
                            <th className="py-2 px-3 text-left">ACCOUNT / DESCRIPTION</th>
                            <th className="py-2 px-2 text-right">DEBIT (+)</th>
                            <th className="py-2 px-2 text-right">CREDIT (-)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)] font-mono text-[11px]">
                          {/* Row 1: Debit */}
                          <tr>
                            <td className="py-2.5 px-3 font-sans">
                              <span className="font-bold text-[var(--color-text-strong)] block truncate max-w-[140px]">
                                {selectedVoucherType === 'BRV' || selectedVoucherType === 'CRV'
                                  ? form.accountName || 'Cash/Bank Vault'
                                  : form.partyName || 'Accounts Payable / Expense'}
                              </span>
                              <span className="text-[9px] text-[var(--color-text-muted)]">
                                {selectedVoucherType === 'BRV' || selectedVoucherType === 'CRV' ? 'Asset Account' : 'Liability / Expense'}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {money(parseFloat(form.amount) || 0, form.currency)}
                            </td>
                            <td className="py-2.5 px-2 text-right text-gray-400">—</td>
                          </tr>

                          {/* Row 2: Credit */}
                          <tr>
                            <td className="py-2.5 px-3 font-sans">
                              <span className="font-bold text-[var(--color-text-strong)] block truncate max-w-[140px]">
                                {selectedVoucherType === 'BPV' || selectedVoucherType === 'CPV'
                                  ? form.accountName || 'Cash/Bank Vault'
                                  : form.partyName || 'Accounts Receivable / Income'}
                              </span>
                              <span className="text-[9px] text-[var(--color-text-muted)]">
                                {selectedVoucherType === 'BPV' || selectedVoucherType === 'CPV' ? 'Asset Account' : 'Asset / Revenue'}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-right text-gray-400">—</td>
                            <td className="py-2.5 px-2 text-right font-bold text-rose-600 dark:text-rose-400">
                              {money(parseFloat(form.amount) || 0, form.currency)}
                            </td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 dark:bg-gray-900 font-extrabold border-t border-[var(--color-border)]">
                            <td className="py-2 px-3 text-[10px] text-[var(--color-text-strong)]">TOTALS (BALANCED)</td>
                            <td className="py-2 px-2 text-right text-emerald-600 text-[10px]">
                              {money(parseFloat(form.amount) || 0, form.currency)}
                            </td>
                            <td className="py-2 px-2 text-right text-rose-600 text-[10px]">
                              {money(parseFloat(form.amount) || 0, form.currency)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Accounting Standard Notice */}
                    <div className="mt-3.5 p-3 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
                      <p className="font-bold mb-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> GAAP & IAS Double-Entry Audit Trail
                      </p>
                      {selectedVoucherType === 'BPV' && 'Decreases commercial bank balance and debits accounts payable / vendor ledger.'}
                      {selectedVoucherType === 'BRV' && 'Increases commercial bank balance and credits accounts receivable / customer ledger.'}
                      {selectedVoucherType === 'CPV' && 'Decreases cash drawer balance and debits accounts payable / vendor ledger.'}
                      {selectedVoucherType === 'CRV' && 'Increases cash drawer balance and credits accounts receivable / customer ledger.'}
                      {selectedVoucherType === 'JV' && 'Adjusts General Ledger accounts with equal debit and credit journal entries.'}
                    </div>
                  </div>

                  {/* Entity Stamp */}
                  <div className="text-[10px] text-[var(--color-text-muted)] flex items-center justify-between border-t border-[var(--color-border)] pt-2.5">
                    <span>Corporate Entity: <strong>{currentEntity?.name || 'Primary Entity'}</strong></span>
                    <span>Status: <strong>Immediate GL Post</strong></span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="secondary h-9 px-4 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="primary h-9 px-5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Post {selectedVoucherType} Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Ultra-Modern Voucher Detail Audit Modal ─── */}
      {selectedDetailVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 md:p-6" onClick={() => setSelectedDetailVoucher(null)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] transition-all animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] bg-gray-50/70 dark:bg-gray-900/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-strong)]">
                      Voucher #{selectedDetailVoucher.voucherNumber}
                    </h2>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getVoucherBadgeStyle(selectedDetailVoucher.voucherType)}`}>
                      {selectedDetailVoucher.voucherType}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {getVoucherFullTitle(selectedDetailVoucher.voucherType)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailVoucher(null)}
                className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-[var(--color-border)] space-y-2.5">
                <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Voucher Sequence / Type:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md ${getVoucherBadgeStyle(selectedDetailVoucher.voucherType)}`}>
                    {selectedDetailVoucher.voucherNumber} ({selectedDetailVoucher.voucherType})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Effective Posting Date:</span>
                  <span className="font-semibold text-[var(--color-text-strong)] font-mono">{selectedDetailVoucher.date}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Posting Account:</span>
                  <span className="font-semibold text-[var(--color-text-strong)]">{selectedDetailVoucher.accountName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Beneficiary / Counterparty:</span>
                  <span className="font-semibold text-[var(--color-text-strong)]">{selectedDetailVoucher.partyName} ({selectedDetailVoucher.partyType})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Payment Mode & Instrument:</span>
                  <span className="font-medium text-[var(--color-text-strong)]">
                    {selectedDetailVoucher.paymentMode} {selectedDetailVoucher.chequeNumber ? `(Cheque #${selectedDetailVoucher.chequeNumber})` : ''}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Voucher Amount:</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                    {money(selectedDetailVoucher.amount, selectedDetailVoucher.currency)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)]">Narration / Memo:</span>
                  <span className="font-medium text-[var(--color-text-strong)]">{selectedDetailVoucher.narration || '—'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--color-text-muted)]">Audit Status:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Posted & Reconciled
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedDetailVoucher(null)}
                  className="secondary h-9 px-4 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => generateVoucherPDF(selectedDetailVoucher)}
                  className="primary h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
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

export default VoucherManagement;
