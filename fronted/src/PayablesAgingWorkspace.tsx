import { useEffect, useMemo, useState } from 'react';
import { useVendorsStore, useCompanyStore, useProcurementStore } from './stores';
import {
  Download, ArrowLeft,
  Search, Printer, FileSpreadsheet,
  CheckCircle2, ChevronRight, RefreshCw,
  CalendarCheck, Hourglass, History, AlertTriangle, ShieldAlert, Wallet
} from 'lucide-react';
import { money } from './lib/currency';
import { formatBillNumber } from './lib/invoiceNumbering';
import { downloadExcel, downloadCSV } from './lib/exportUtils';
import ExportDropdown from './components/ExportDropdown';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import { StatusChip } from './components/ui/status-chip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type PayablesAgingProps = { activeEntityId: string };

interface AgingBucketItem {
  vendorId: string;
  vendorName: string;
  vendorNumber: string;
  email?: string;
  phone?: string;
  current: number;    // Not due
  days30: number;     // 1 - 30 days
  days60: number;     // 31 - 60 days
  days90: number;     // 61 - 90 days
  days90Plus: number; // 90+ days
  totalDue: number;
  openBillsCount: number;
  oldestOverdueDays: number;
  riskCategory: 'current' | 'low' | 'medium' | 'high' | 'critical';
}

interface OpenBillDetail {
  id: string;
  billNumber: string;
  date: string;
  dueDate: string;
  daysOverdue: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  bucket: 'Current' | '1-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';
  status: string;
  currencyCode?: string;
}

export function PayablesAgingWorkspace({ activeEntityId }: PayablesAgingProps) {
  const vendors = useVendorsStore((s) => s.vendors as any[]);
  const fetchVendors = useVendorsStore((s) => s.fetchVendors);

  const bills = useProcurementStore((s) => s.bills as any[]);
  const fetchBills = useProcurementStore((s) => s.fetchBills);

  const { entities, fetchCompanies } = useCompanyStore();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCompanies(),
        fetchVendors(activeEntityId),
        fetchBills(activeEntityId),
      ]);
    } catch (e) {
      console.error('Failed to load payables aging data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeEntityId]);

  const activeCompany = useMemo(() => {
    return entities.find((e) => e.id === activeEntityId) || entities[0];
  }, [entities, activeEntityId]);

  const fmt = (n?: number) => money(n || 0);

  // Compute aging buckets for all vendors based on dynamic `asOfDate`
  const agingData = useMemo(() => {
    const asOfTime = new Date(asOfDate).getTime();

    return vendors.map((v) => {
      // Filter open posted bills for this vendor (exclude Draft 0 and Void)
      const vendorBills = bills.filter(
        (b: any) =>
          b.vendorId === v.id &&
          b.status !== 0 &&
          b.status !== '0' &&
          String(b.status).toLowerCase() !== 'draft' &&
          (b.amountDue == null || b.amountDue > 0.01) &&
          String(b.status).toLowerCase() !== 'void' &&
          String(b.status).toLowerCase() !== 'cancelled'
      );

      let current = 0;
      let days30 = 0;
      let days60 = 0;
      let days90 = 0;
      let days90Plus = 0;
      let totalDue = 0;
      let oldestDays = 0;

      vendorBills.forEach((b: any) => {
        const dueStr = b.dueDate || b.date || asOfDate;
        const dueTime = new Date(dueStr).getTime();
        const diffDays = Math.floor((asOfTime - dueTime) / 86400000);
        const dueAmt = b.amountDue != null ? Number(b.amountDue) : (b.totalAmount || 0) - (b.amountPaid || 0);

        if (dueAmt <= 0) return;

        totalDue += dueAmt;

        if (diffDays <= 0) {
          current += dueAmt;
        } else if (diffDays <= 30) {
          days30 += dueAmt;
          if (diffDays > oldestDays) oldestDays = diffDays;
        } else if (diffDays <= 60) {
          days60 += dueAmt;
          if (diffDays > oldestDays) oldestDays = diffDays;
        } else if (diffDays <= 90) {
          days90 += dueAmt;
          if (diffDays > oldestDays) oldestDays = diffDays;
        } else {
          days90Plus += dueAmt;
          if (diffDays > oldestDays) oldestDays = diffDays;
        }
      });

      let riskCategory: 'current' | 'low' | 'medium' | 'high' | 'critical' = 'current';
      if (days90Plus > 0) riskCategory = 'critical';
      else if (days90 > 0) riskCategory = 'high';
      else if (days60 > 0) riskCategory = 'medium';
      else if (days30 > 0) riskCategory = 'low';

      const item: AgingBucketItem = {
        vendorId: v.id,
        vendorName: v.name || v.companyName || 'Supplier',
        vendorNumber: v.vendorNumber || 'VEND',
        email: v.email,
        phone: v.phone,
        current,
        days30,
        days60,
        days90,
        days90Plus,
        totalDue,
        openBillsCount: vendorBills.length,
        oldestOverdueDays: oldestDays,
        riskCategory,
      };

      return item;
    });
  }, [vendors, bills, asOfDate]);

  // Overall Organization Totals
  const overallTotals = useMemo(() => {
    return agingData.reduce(
      (acc, curr) => {
        acc.current += curr.current;
        acc.days30 += curr.days30;
        acc.days60 += curr.days60;
        acc.days90 += curr.days90;
        acc.days90Plus += curr.days90Plus;
        acc.totalDue += curr.totalDue;
        if (curr.totalDue > 0.01) acc.vendorsWithBalances++;
        return acc;
      },
      { current: 0, days30: 0, days60: 0, days90: 0, days90Plus: 0, totalDue: 0, vendorsWithBalances: 0 }
    );
  }, [agingData]);

  // Filtered Aging List
  const filteredData = useMemo(() => {
    return agingData.filter((item) => {
      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.vendorName.toLowerCase().includes(q) ||
        item.vendorNumber.toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.phone || '').toLowerCase().includes(q);

      if (!matchesQuery) return false;

      if (selectedRiskFilter === 'outstanding') return item.totalDue > 0.01;
      if (selectedRiskFilter === 'current') return item.current > 0 && item.days30 === 0 && item.days60 === 0 && item.days90 === 0 && item.days90Plus === 0;
      if (selectedRiskFilter === 'days30') return item.days30 > 0;
      if (selectedRiskFilter === 'days60') return item.days60 > 0;
      if (selectedRiskFilter === 'days90') return item.days90 > 0;
      if (selectedRiskFilter === 'days90Plus') return item.days90Plus > 0;
      if (selectedRiskFilter === 'settled') return item.totalDue <= 0.01;

      return true;
    });
  }, [agingData, query, selectedRiskFilter]);

  // Single Vendor Drilldown Details
  const selectedVendorAging = useMemo(() => {
    if (!selectedVendorId) return null;
    const vendorSummary = agingData.find((a) => a.vendorId === selectedVendorId);
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    if (!vendorSummary || !vendor) return null;

    const asOfTime = new Date(asOfDate).getTime();
    const vendorBills = bills.filter(
      (b: any) =>
        b.vendorId === selectedVendorId &&
        b.status !== 0 &&
        b.status !== '0' &&
        String(b.status).toLowerCase() !== 'draft' &&
        (b.amountDue == null || b.amountDue > 0.01) &&
        String(b.status).toLowerCase() !== 'void' &&
        String(b.status).toLowerCase() !== 'cancelled'
    );

    const billDetails: OpenBillDetail[] = (vendorBills || []).map((b: any, idx: number) => {
      const dueStr = b.dueDate || b.date || asOfDate;
      const dueTime = new Date(dueStr).getTime();
      const diffDays = Math.floor((asOfTime - dueTime) / 86400000);
      const dueAmt = b.amountDue != null ? Number(b.amountDue) : (b.totalAmount || 0) - (b.amountPaid || 0);

      let bucket: OpenBillDetail['bucket'] = 'Current';
      if (diffDays <= 0) bucket = 'Current';
      else if (diffDays <= 30) bucket = '1-30 Days';
      else if (diffDays <= 60) bucket = '31-60 Days';
      else if (diffDays <= 90) bucket = '61-90 Days';
      else bucket = '90+ Days';

      const cleanBillNum = formatBillNumber(b.billNumber || b.reference, idx + 1);

      return {
        id: b.id || b.billNumber,
        billNumber: cleanBillNum,
        date: (b.date || b.billDate || '').slice(0, 10),
        dueDate: (b.dueDate || '').slice(0, 10),
        daysOverdue: Math.max(0, diffDays),
        totalAmount: b.totalAmount || 0,
        amountPaid: b.amountPaid || 0,
        amountDue: dueAmt,
        bucket,
        status: b.status || 'Open',
        currencyCode: b.currencyCode,
      };
    });

    // Sort by oldest overdue first
    billDetails.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return {
      vendor,
      summary: vendorSummary,
      bills: billDetails,
    };
  }, [selectedVendorId, agingData, vendors, bills, asOfDate]);

  // ─── PDF Report Generator ──────────────────────────────────────────────────
  const generateVendorAgingPDF = (vendorId: string) => {
    const item = agingData.find((a) => a.vendorId === vendorId);
    const ven = vendors.find((v) => v.id === vendorId);
    if (!item || !ven) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
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
    doc.text('ACCOUNTS PAYABLE AGING REPORT', margin, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`As of Date: ${new Date(asOfDate).toLocaleDateString()}`, margin, 21);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 14, { align: 'right' });
    doc.text(`Currency: ${activeCompany?.currencyCode || ven.currencyCode || 'PKR'}`, pageWidth - margin, 21, {
      align: 'right',
    });

    // Supplier Info Card
    const boxY = 34;
    const boxH = 26;
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(margin, boxY, contentWidth, boxH, 2, 2, 'FD');

    doc.setTextColor(...darkColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(ven.name || ven.companyName || 'Supplier', margin + 4, boxY + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let infoStr = `Vendor Code: ${ven.vendorNumber || 'VEND'}`;
    if (ven.taxNumber) infoStr += `  •  Tax ID/NTN: ${ven.taxNumber}`;
    if (ven.phone) infoStr += `  •  Phone: ${ven.phone}`;
    if (ven.email) infoStr += `  •  Email: ${ven.email}`;
    doc.text(infoStr, margin + 4, boxY + 15);

    doc.text(`Entity: ${activeCompany?.name || 'Company ERP'}`, margin + 4, boxY + 21);

    // Aging Buckets Summary Table
    const bucketTableY = boxY + boxH + 6;
    const bucketHeaders = ['Current (Not Due)', '1 - 30 Days', '31 - 60 Days', '61 - 90 Days', '90+ Days (Critical)', 'Total Outstanding'];
    const bucketRows = [[
      fmt(item.current),
      fmt(item.days30),
      fmt(item.days60),
      fmt(item.days90),
      fmt(item.days90Plus),
      fmt(item.totalDue),
    ]];

    autoTable(doc, {
      startY: bucketTableY,
      head: [bucketHeaders],
      body: bucketRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 3, halign: 'right', textColor: darkColor },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', halign: 'right' },
    });

    // Open Bills Breakdown
    const asOfTime = new Date(asOfDate).getTime();
    const vendorBills = bills.filter(
      (b: any) =>
        b.vendorId === vendorId &&
        (b.amountDue == null || b.amountDue > 0.01) &&
        String(b.status).toLowerCase() !== 'void'
    );

    const billsTableY = (doc as any).lastAutoTable.finalY + 8;
    doc.setTextColor(...darkColor);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEMIZED UNPAID BILLS SCHEDULE', margin, billsTableY - 2);

    const billHeaders = ['Bill Number', 'Bill Date', 'Due Date', 'Days Overdue', 'Total Amount', 'Paid Amount', 'Balance Due'];
    const billRows = vendorBills.map((b: any) => {
      const dueStr = b.dueDate || b.date || asOfDate;
      const dueTime = new Date(dueStr).getTime();
      const diff = Math.max(0, Math.floor((asOfTime - dueTime) / 86400000));
      const dueAmt = b.amountDue != null ? Number(b.amountDue) : (b.totalAmount || 0) - (b.amountPaid || 0);

      return [
        b.billNumber || 'BILL',
        (b.date || '').slice(0, 10),
        dueStr.slice(0, 10),
        `${diff} days`,
        fmt(b.totalAmount),
        fmt(b.amountPaid),
        fmt(dueAmt),
      ];
    });

    autoTable(doc, {
      startY: billsTableY,
      head: [billHeaders],
      body: billRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 2.2, textColor: darkColor, lineColor: borderGray, lineWidth: 0.1 },
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setTextColor(...grayColor);
    doc.setFontSize(7);
    doc.text('Accounts Payable Aging Schedule. Confidential & Proprietary.', margin, pageHeight - 9);

    const cleanName = (ven.name || 'Vendor').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Payables_Aging_${cleanName}_${asOfDate}.pdf`);
  };

  // ─── Individual Excel Export ───────────────────────────────────────────────
  const exportVendorAgingExcel = (vendorId: string) => {
    const item = agingData.find((a) => a.vendorId === vendorId);
    const ven = vendors.find((v) => v.id === vendorId);
    if (!item || !ven) return;

    const headers = ['Bill Number', 'Bill Date', 'Due Date', 'Days Overdue', 'Aging Bucket', 'Total Amount', 'Amount Paid', 'Balance Due', 'Status'];
    const asOfTime = new Date(asOfDate).getTime();
    const vendorBills = bills.filter((b: any) => b.vendorId === vendorId && (b.amountDue == null || b.amountDue > 0.01));

    const rows = vendorBills.map((b: any) => {
      const dueStr = b.dueDate || b.date || asOfDate;
      const dueTime = new Date(dueStr).getTime();
      const diff = Math.max(0, Math.floor((asOfTime - dueTime) / 86400000));
      const dueAmt = b.amountDue != null ? Number(b.amountDue) : (b.totalAmount || 0) - (b.amountPaid || 0);

      let bucket = 'Current';
      if (diff <= 0) bucket = 'Current';
      else if (diff <= 30) bucket = '1-30 Days';
      else if (diff <= 60) bucket = '31-60 Days';
      else if (diff <= 90) bucket = '61-90 Days';
      else bucket = '90+ Days';

      return [b.billNumber, b.date, dueStr, diff, bucket, b.totalAmount, b.amountPaid, dueAmt, b.status];
    });

    const cleanName = (ven.name || 'Vendor').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadExcel(`Payables_Aging_${cleanName}_${asOfDate}`, 'Aging Schedule', headers, rows);
  };

  // ─── Global All Vendors Aging Export ───────────────────────────────────────
  const exportAllAgingExcel = () => {
    const headers = [
      'Vendor Code',
      'Vendor Name',
      'Current (Not Due)',
      '1 - 30 Days',
      '31 - 60 Days',
      '61 - 90 Days',
      '90+ Days (Critical)',
      'Total Outstanding',
      'Open Bills',
      'Oldest Overdue (Days)',
      'Risk Status',
    ];

    const rows = filteredData.map((a) => [
      a.vendorNumber,
      a.vendorName,
      a.current,
      a.days30,
      a.days60,
      a.days90,
      a.days90Plus,
      a.totalDue,
      a.openBillsCount,
      a.oldestOverdueDays,
      a.riskCategory.toUpperCase(),
    ]);

    downloadExcel(`All_Vendors_Payables_Aging_${asOfDate}`, 'AP Aging', headers, rows);
  };

  const exportAllAgingCSV = () => {
    const headers = [
      'Vendor Code',
      'Vendor Name',
      'Current (Not Due)',
      '1 - 30 Days',
      '31 - 60 Days',
      '61 - 90 Days',
      '90+ Days (Critical)',
      'Total Outstanding',
      'Open Bills',
      'Oldest Overdue (Days)',
      'Risk Status',
    ];

    const rows = filteredData.map((a) => [
      a.vendorNumber,
      a.vendorName,
      a.current,
      a.days30,
      a.days60,
      a.days90,
      a.days90Plus,
      a.totalDue,
      a.openBillsCount,
      a.oldestOverdueDays,
      a.riskCategory.toUpperCase(),
    ]);

    downloadCSV(`All_Vendors_Payables_Aging_${asOfDate}.csv`, headers, rows);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ─── VIEW 2: SINGLE VENDOR DETAILED AGING VIEW ─────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedVendorId && selectedVendorAging) {
    const { vendor, summary, bills: openBills } = selectedVendorAging;

    return (
      <div className="space-y-4 max-w-7xl mx-auto pb-10">
        {/* Top Breadcrumb Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[var(--color-surface)] p-3.5 rounded-xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedVendorId(null)}
              className="h-8.5 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Aging Schedule
            </button>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <h1 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight flex items-center gap-2">
                <span className="text-lg">📊</span> {vendor.name || vendor.companyName}
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
                  {vendor.vendorNumber || 'VEND'}
                </span>
              </h1>
              <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                Itemized unpaid bills aging breakdown as of {new Date(asOfDate).toLocaleDateString()}.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              onClick={() => generateVendorAgingPDF(vendor.id)}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
            <button
              onClick={() => exportVendorAgingExcel(vendor.id)}
              className="h-8.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={() => window.print()}
              className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Aging Bucket Metric Cards */}
        <KpiGrid cols={3}>
          <KpiCard icon={CalendarCheck} label="Current" value={fmt(summary.current)} desc="Not yet due" tone="emerald" />
          <KpiCard icon={Hourglass} label="1 - 30 Days" value={fmt(summary.days30)} desc="Past due" tone="amber" />
          <KpiCard icon={History} label="31 - 60 Days" value={fmt(summary.days60)} desc="Overdue" tone="amber" />
          <KpiCard icon={AlertTriangle} label="61 - 90 Days" value={fmt(summary.days90)} desc="High Risk" tone="rose" />
          <KpiCard icon={ShieldAlert} label="90+ Days" value={fmt(summary.days90Plus)} desc="Critical" tone="red" />
          <KpiCard icon={Wallet} label="Total Balance" value={fmt(summary.totalDue)} desc={`${summary.openBillsCount} open bills`} tone="blue" />
        </KpiGrid>

        {/* Itemized Open Bills Table */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]"><span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-rose-500 to-red-700" />Open Vendor Bills Schedule</p>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {openBills.length} bills • Ranked from oldest overdue bill to newest
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-500/[0.05] dark:bg-rose-400/[0.07] text-[var(--color-text-muted)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5">Bill Number</th>
                  <th className="py-2.5 px-3">Bill Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-center">Days Overdue</th>
                  <th className="py-2.5 px-3">Aging Bucket</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  <th className="py-2.5 px-3.5 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {openBills.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState icon={CheckCircle2} title="All bills are fully settled!" hint="Zero outstanding payable for this supplier." />
                    </td>
                  </tr>
                ) : (
                  openBills.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-[var(--color-text-strong)]">
                        {b.billNumber}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text)] whitespace-nowrap">{b.date}</td>
                      <td className="py-2.5 px-3 text-[var(--color-text-muted)] whitespace-nowrap">{b.dueDate || '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.daysOverdue > 90
                              ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200'
                              : b.daysOverdue > 0
                              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                              : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                          }`}
                        >
                          {b.daysOverdue > 0 ? `${b.daysOverdue} days` : 'Current'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-xs text-[var(--color-text)]">{b.bucket}</td>
                      <td className="py-2.5 px-3 text-right text-[var(--color-text)]">{fmt(b.totalAmount)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">{fmt(b.amountPaid)}</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                        {fmt(b.amountDue)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusChip status={b.status} label={b.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {openBills.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-900 border-t-2 border-[var(--color-border)] font-bold text-xs">
                  <tr>
                    <td colSpan={5} className="py-3 px-3.5 text-right uppercase tracking-wider text-[var(--color-text-muted)]">
                      Total Open Payables:
                    </td>
                    <td className="py-3 px-3 text-right text-[var(--color-text)]">
                      {fmt(openBills.reduce((s, b) => s + b.totalAmount, 0))}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      {fmt(openBills.reduce((s, b) => s + b.amountPaid, 0))}
                    </td>
                    <td className="py-3 px-3.5 text-right text-base text-rose-600 dark:text-rose-400 font-extrabold">
                      {fmt(summary.totalDue)}
                    </td>
                    <td className="py-3 px-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ─── VIEW 1: ALL VENDORS PAYABLES AGING SCHEDULE ───────────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-rose-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-rose-500 to-red-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Hourglass className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Payables Aging Schedule</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400"><span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Accounts Payable aging exposure analyzed into 30, 60, 90, and 90+ days maturity buckets.
              </p>
            </div>
          </div>

          {/* Controls: Search, As-Of Date Picker & Export */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Robust Search Box */}
          <div className="flex items-center h-8.5 w-60 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 transition-all shadow-2xs">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendor or ID..."
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

          {/* As-Of Date Picker */}
          <div className="flex items-center gap-1.5 h-8.5 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)]">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">As of:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-xs text-[var(--color-text)] outline-none border-none cursor-pointer"
            />
          </div>

          {/* Export All Dropdown */}
          <ExportDropdown
            label="Export Aging"
            onExcel={exportAllAgingExcel}
            onCSV={exportAllAgingCSV}
            onPrint={() => window.print()}
          />

          {/* Refresh */}
          <button
            onClick={loadData}
            className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium hover:bg-[var(--color-surface-muted)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          </div>
        </div>
      </div>

      {/* Top Aging Exposure Breakdown Grid */}
      <KpiGrid cols={3}>
        <KpiCard icon={CalendarCheck} label="Current (Not Due)" value={fmt(overallTotals.current)} desc="Within credit terms" tone="emerald" />
        <KpiCard icon={Hourglass} label="1 - 30 Days" value={fmt(overallTotals.days30)} desc="Grace period" tone="amber" />
        <KpiCard icon={History} label="31 - 60 Days" value={fmt(overallTotals.days60)} desc="Overdue" tone="amber" />
        <KpiCard icon={AlertTriangle} label="61 - 90 Days" value={fmt(overallTotals.days90)} desc="Immediate action" tone="rose" />
        <KpiCard icon={ShieldAlert} label="90+ Days" value={fmt(overallTotals.days90Plus)} desc="Critical risk" tone="red" />
        <KpiCard icon={Wallet} label="Total AP Due" value={fmt(overallTotals.totalDue)} desc={`${overallTotals.vendorsWithBalances} suppliers`} tone="blue" />
      </KpiGrid>

      {/* Aging Risk Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All Suppliers (${agingData.length})` },
          { id: 'outstanding', label: `Outstanding Due (${overallTotals.vendorsWithBalances})` },
          { id: 'current', label: 'Current Only' },
          { id: 'days30', label: '1-30 Days' },
          { id: 'days60', label: '31-60 Days' },
          { id: 'days90', label: '61-90 Days' },
          { id: 'days90Plus', label: '90+ Days (Critical)' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedRiskFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedRiskFilter === f.id
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Vendors Aging Schedule Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]"><span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-rose-500 to-red-700" />Supplier Payables Aging Matrix</p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {filteredData.length} suppliers • Click <strong>Download PDF</strong> on any vendor row to export their schedule.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-rose-500/[0.05] dark:bg-rose-400/[0.07] text-[var(--color-text-muted)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Vendor</th>
                <th className="py-2.5 px-2.5 text-right">Current</th>
                <th className="py-2.5 px-2.5 text-right">1 - 30 Days</th>
                <th className="py-2.5 px-2.5 text-right">31 - 60 Days</th>
                <th className="py-2.5 px-2.5 text-right">61 - 90 Days</th>
                <th className="py-2.5 px-2.5 text-right">90+ Days</th>
                <th className="py-2.5 px-3 text-right">Total Outstanding</th>
                <th className="py-2.5 px-3 text-center">Oldest Overdue</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <TableSkeleton rows={6} />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState icon={CheckCircle2} title="No suppliers matched your filter criteria" />
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const hasOverdue = item.days30 > 0 || item.days60 > 0 || item.days90 > 0 || item.days90Plus > 0;

                  return (
                    <tr
                      key={item.vendorId}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-900/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedVendorId(item.vendorId)}
                    >
                      {/* Vendor Info */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {item.vendorName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-[var(--color-text-strong)] hover:text-blue-600 transition-colors block">
                              {item.vendorName}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                              {item.vendorNumber} • {item.openBillsCount} open bill{item.openBillsCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Current */}
                      <td className="py-3 px-2.5 text-right font-medium text-[var(--color-text)]">
                        {item.current > 0 ? fmt(item.current) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                      </td>

                      {/* 1 - 30 Days */}
                      <td className="py-3 px-2.5 text-right font-medium">
                        {item.days30 > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">{fmt(item.days30)}</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700">—</span>
                        )}
                      </td>

                      {/* 31 - 60 Days */}
                      <td className="py-3 px-2.5 text-right font-medium">
                        {item.days60 > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">{fmt(item.days60)}</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700">—</span>
                        )}
                      </td>

                      {/* 61 - 90 Days */}
                      <td className="py-3 px-2.5 text-right font-medium">
                        {item.days90 > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">{fmt(item.days90)}</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700">—</span>
                        )}
                      </td>

                      {/* 90+ Days */}
                      <td className="py-3 px-2.5 text-right font-bold">
                        {item.days90Plus > 0 ? (
                          <span className="text-rose-700 dark:text-rose-300 font-extrabold">{fmt(item.days90Plus)}</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700">—</span>
                        )}
                      </td>

                      {/* Total Outstanding */}
                      <td className="py-3 px-3 text-right font-bold">
                        <span
                          className={
                            item.totalDue > 0
                              ? hasOverdue
                                ? 'text-rose-600 dark:text-rose-400 text-sm'
                                : 'text-blue-600 dark:text-blue-400'
                              : 'text-emerald-600'
                          }
                        >
                          {fmt(item.totalDue)}
                        </span>
                      </td>

                      {/* Oldest Overdue Days */}
                      <td className="py-3 px-3 text-center">
                        {item.oldestOverdueDays > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
                            {item.oldestOverdueDays} days
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                            Current
                          </span>
                        )}
                      </td>

                      {/* 1-Click Action Buttons */}
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => generateVendorAgingPDF(item.vendorId)}
                            className="h-7.5 px-2.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-2xs"
                            title="Download PDF schedule for this vendor"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </button>

                          <button
                            onClick={() => exportVendorAgingExcel(item.vendorId)}
                            className="h-7.5 px-2 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-2xs"
                            title="Download Excel schedule for this vendor"
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => setSelectedVendorId(item.vendorId)}
                            className="h-7.5 px-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            Details <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-900 border-t-2 border-[var(--color-border)] font-bold text-xs">
                <tr>
                  <td className="py-3 px-3.5 uppercase tracking-wider text-[var(--color-text-muted)]">
                    Schedule Totals:
                  </td>
                  <td className="py-3 px-2.5 text-right font-bold text-[var(--color-text)]">
                    {fmt(filteredData.reduce((s, i) => s + i.current, 0))}
                  </td>
                  <td className="py-3 px-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                    {fmt(filteredData.reduce((s, i) => s + i.days30, 0))}
                  </td>
                  <td className="py-3 px-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                    {fmt(filteredData.reduce((s, i) => s + i.days60, 0))}
                  </td>
                  <td className="py-3 px-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
                    {fmt(filteredData.reduce((s, i) => s + i.days90, 0))}
                  </td>
                  <td className="py-3 px-2.5 text-right font-extrabold text-rose-700 dark:text-rose-300">
                    {fmt(filteredData.reduce((s, i) => s + i.days90Plus, 0))}
                  </td>
                  <td className="py-3 px-3 text-right text-base font-extrabold text-blue-600 dark:text-blue-400">
                    {fmt(filteredData.reduce((s, i) => s + i.totalDue, 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export default PayablesAgingWorkspace;