import { useEffect, useMemo, useState } from 'react';
import { useSalesStore, useCustomersStore, useCompanyStore } from './stores';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Users, DollarSign, AlertTriangle, Clock, FileSpreadsheet,
  ArrowLeft, Search, Download, RefreshCw,
  ChevronRight, CheckCircle2, Skull
} from 'lucide-react';
import { downloadExcel } from './lib/exportUtils';
import ExportDropdown from './components/ExportDropdown';
import { money, moneyCompact } from './lib/currency';
import { formatInvoiceNumber } from './lib/invoiceNumbering';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Props = { activeEntityId: string };

const BUCKETS = ['Current', '1-30', '31-60', '61-90', '90+'] as const;
type AgingBucket = typeof BUCKETS[number];

const BUCKET_COLORS: Record<AgingBucket, string> = {
  Current: '#10b981', // Emerald
  '1-30': '#f59e0b',  // Amber
  '31-60': '#f97316', // Orange
  '61-90': '#ef4444', // Red
  '90+': '#b91c1c',   // Dark Red
};

function calculateAgingBucket(dueDateStr: string, asOfDate: Date): AgingBucket {
  if (!dueDateStr) return 'Current';
  const due = new Date(dueDateStr);
  const diffDays = Math.floor((asOfDate.getTime() - due.getTime()) / 86400000);
  if (diffDays <= 0) return 'Current';
  if (diffDays <= 30) return '1-30';
  if (diffDays <= 60) return '31-60';
  if (diffDays <= 90) return '61-90';
  return '90+';
}

function calculateDaysPastDue(dueDateStr: string, asOfDate: Date): number {
  if (!dueDateStr) return 0;
  const due = new Date(dueDateStr);
  return Math.max(0, Math.floor((asOfDate.getTime() - due.getTime()) / 86400000));
}

export function CustomerAgingWorkspace({ activeEntityId }: Props) {
  const invoices = useSalesStore((s) => s.invoices as any[]);
  const fetchInvoices = useSalesStore((s) => s.fetchInvoices);
  const customers = useCustomersStore((s) => s.customers as any[]);
  const fetchCustomers = useCustomersStore((s) => s.fetchCustomers);
  const { entities, fetchCompanies } = useCompanyStore();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | AgingBucket>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [asOfDateStr, setAsOfDateStr] = useState(new Date().toISOString().slice(0, 10));

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCompanies(),
        fetchInvoices(activeEntityId),
        fetchCustomers(activeEntityId),
      ]);
    } catch (e) {
      console.error('Failed to load aging data', e);
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

  const asOfDate = useMemo(() => {
    return asOfDateStr ? new Date(asOfDateStr) : new Date();
  }, [asOfDateStr]);

  const fmt = (n?: number) => money(n || 0);

  // Compute aging data per customer based on asOfDate
  const customerAgingList = useMemo(() => {
    const map: Record<string, {
      customerId: string;
      customerCode: string;
      customerName: string;
      email?: string;
      phone?: string;
      outstanding: number;
      buckets: Record<AgingBucket, number>;
      oldestDays: number;
      invoiceCount: number;
      worstBucket: AgingBucket;
    }> = {};

    // Filter open/unpaid posted invoices (exclude Draft 0 and Void 3)
    const openInvoices = invoices.filter(
      (i: any) =>
        i.status !== 0 &&
        i.status !== '0' &&
        String(i.status).toLowerCase() !== 'draft' &&
        i.status !== 2 &&
        i.status !== 3 &&
        String(i.status).toLowerCase() !== 'void' &&
        (i.amountDue || 0) > 0
    );

    openInvoices.forEach((inv: any) => {
      const cid = inv.customerId || 'unknown';
      const custRecord = customers.find((c: any) => c.id === cid);

      if (!map[cid]) {
        map[cid] = {
          customerId: cid,
          customerCode: custRecord?.customerNumber || 'CUST',
          customerName: custRecord?.name || inv.customerName || cid,
          email: custRecord?.email,
          phone: custRecord?.phone,
          outstanding: 0,
          buckets: { Current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 },
          oldestDays: 0,
          invoiceCount: 0,
          worstBucket: 'Current',
        };
      }

      const bucket = calculateAgingBucket(inv.dueDate || inv.invoiceDate, asOfDate);
      const amountDue = inv.amountDue || (inv.totalAmount - (inv.paidAmount || 0)) || 0;
      
      map[cid].outstanding += amountDue;
      map[cid].buckets[bucket] += amountDue;
      map[cid].invoiceCount += 1;

      const days = calculateDaysPastDue(inv.dueDate || inv.invoiceDate, asOfDate);
      if (days > map[cid].oldestDays) {
        map[cid].oldestDays = days;
      }
    });

    // Derive worst bucket per customer
    return Object.values(map).map((c) => {
      let worst: AgingBucket = 'Current';
      if (c.buckets['90+'] > 0) worst = '90+';
      else if (c.buckets['61-90'] > 0) worst = '61-90';
      else if (c.buckets['31-60'] > 0) worst = '31-60';
      else if (c.buckets['1-30'] > 0) worst = '1-30';

      return {
        ...c,
        worstBucket: worst,
      };
    }).sort((a, b) => b.outstanding - a.outstanding);
  }, [invoices, customers, asOfDate]);

  // Overall KPI & bucket totals
  const totalOutstanding = useMemo(() => {
    return customerAgingList.reduce((s, c) => s + c.outstanding, 0);
  }, [customerAgingList]);

  const bucketTotals = useMemo(() => {
    const totals: Record<AgingBucket, number> = { Current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    customerAgingList.forEach((c) => {
      BUCKETS.forEach((b) => {
        totals[b] += c.buckets[b];
      });
    });
    return totals;
  }, [customerAgingList]);

  const overdueAmount = useMemo(() => {
    return bucketTotals['1-30'] + bucketTotals['31-60'] + bucketTotals['61-90'] + bucketTotals['90+'];
  }, [bucketTotals]);

  const criticalCount = useMemo(() => {
    return customerAgingList.filter((c) => c.buckets['90+'] > 0).length;
  }, [customerAgingList]);

  // Filtered customer aging list
  const filteredCustomerAging = useMemo(() => {
    return customerAgingList.filter((c) => {
      const q = query.toLowerCase().trim();
      const matchesQuery =
        !q ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q);

      if (!matchesQuery) return false;

      if (selectedRiskFilter !== 'all') {
        return c.buckets[selectedRiskFilter] > 0;
      }

      return true;
    });
  }, [customerAgingList, query, selectedRiskFilter]);

  // Selected customer details
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customerAgingList.find((c) => c.customerId === selectedCustomerId) || null;
  }, [selectedCustomerId, customerAgingList]);

  const selectedCustomerInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    const open = invoices.filter(
      (i: any) =>
        i.customerId === selectedCustomerId &&
        i.status !== 0 &&
        i.status !== '0' &&
        String(i.status).toLowerCase() !== 'draft' &&
        i.status !== 2 &&
        i.status !== 3 &&
        String(i.status).toLowerCase() !== 'void' &&
        (i.amountDue || 0) > 0
    );

    return open.map((inv: any) => {
      const bucket = calculateAgingBucket(inv.dueDate || inv.invoiceDate, asOfDate);
      const daysPastDue = calculateDaysPastDue(inv.dueDate || inv.invoiceDate, asOfDate);
      return {
        ...inv,
        bucket,
        daysPastDue,
        amountDue: inv.amountDue || (inv.totalAmount - (inv.paidAmount || 0)) || 0,
      };
    }).sort((a: any, b: any) => b.daysPastDue - a.daysPastDue);
  }, [selectedCustomerId, invoices, asOfDate]);

  // Chart data for visualization
  const chartData = useMemo(() => {
    return BUCKETS.map((b) => ({
      name: b === 'Current' ? 'Current' : `${b} Days`,
      value: bucketTotals[b],
      fill: BUCKET_COLORS[b],
    }));
  }, [bucketTotals]);

  // ─── PDF Report Generator ──────────────────────────────────────────────────
  const downloadCustomerPDF = (c: typeof customerAgingList[0]) => {
    const custInvs = invoices.filter(
      (i: any) =>
        i.customerId === c.customerId &&
        i.status !== 0 &&
        i.status !== '0' &&
        String(i.status).toLowerCase() !== 'draft' &&
        i.status !== 2 &&
        i.status !== 3 &&
        String(i.status).toLowerCase() !== 'void' &&
        (i.amountDue || 0) > 0
    );

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    const primaryColor: [number, number, number] = [15, 76, 129];
    const darkColor: [number, number, number] = [30, 41, 59];
    const borderGray: [number, number, number] = [226, 232, 240];

    // Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER AGING REPORT', margin, 14);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`As of Date: ${asOfDate.toLocaleDateString()}`, margin, 21);

    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 14, { align: 'right' });
    doc.text(`Entity: ${activeCompany?.name || 'Main Entity'}`, pageWidth - margin, 21, { align: 'right' });

    // Customer Info Card
    const boxY = 34;
    const boxH = 26;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(margin, boxY, contentWidth, boxH, 2, 2, 'FD');

    doc.setTextColor(...primaryColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(c.customerName, margin + 4, boxY + 8);

    doc.setTextColor(...darkColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer ID: ${c.customerCode}`, margin + 4, boxY + 14);
    if (c.email || c.phone) {
      doc.text(`${c.phone || ''} ${c.email ? `• ${c.email}` : ''}`.trim(), margin + 4, boxY + 20);
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Outstanding Due: ${fmt(c.outstanding)}`, pageWidth - margin - 4, boxY + 8, { align: 'right' });

    // Aging Buckets Summary Table
    const bucketHeaders = ['Current (Not Due)', '1 - 30 Days', '31 - 60 Days', '61 - 90 Days', '90+ Days (Critical)', 'Total Due'];
    const bucketRow = [
      fmt(c.buckets.Current),
      fmt(c.buckets['1-30']),
      fmt(c.buckets['31-60']),
      fmt(c.buckets['61-90']),
      fmt(c.buckets['90+']),
      fmt(c.outstanding),
    ];

    autoTable(doc, {
      startY: boxY + boxH + 4,
      head: [bucketHeaders],
      body: [bucketRow],
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 2.5, halign: 'right', textColor: darkColor },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', halign: 'right' },
    });

    // Invoices breakdown
    const invHeaders = ['Invoice #', 'Date', 'Due Date', 'Days Overdue', 'Aging Bucket', 'Total Amount', 'Paid', 'Amount Due'];
    const invRows = custInvs.map((i: any, idx: number) => {
      const b = calculateAgingBucket(i.dueDate || i.invoiceDate, asOfDate);
      const days = calculateDaysPastDue(i.dueDate || i.invoiceDate, asOfDate);
      const amountDue = i.amountDue || (i.totalAmount - (i.paidAmount || 0)) || 0;
      const cleanInvNum = formatInvoiceNumber(i.invoiceNumber || i.reference, idx + 1);

      return [
        cleanInvNum,
        (i.invoiceDate || i.date || '').slice(0, 10),
        (i.dueDate || '').slice(0, 10) || '-',
        days > 0 ? `${days} d` : '0 d',
        b === 'Current' ? 'Current' : `${b} Days`,
        fmt(i.totalAmount || 0),
        fmt(i.paidAmount || i.amountPaid || 0),
        fmt(amountDue),
      ];
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Outstanding Invoices Breakdown', margin, finalY + 4);

    autoTable(doc, {
      startY: finalY + 6,
      head: [invHeaders],
      body: invRows.length ? invRows : [['No open invoices found', '', '', '', '', '', '', '']],
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 2.2, textColor: darkColor },
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' },
      },
    });

    const safeName = c.customerName.replace(/[^a-zA-Z0-9-_]/g, '_');
    doc.save(`Aging_${safeName}_${asOfDateStr}.pdf`);
  };

  // ─── Individual Excel Export ───────────────────────────────────────────────
  const downloadCustomerExcel = (c: typeof customerAgingList[0]) => {
    const custInvs = invoices.filter(
      (i: any) =>
        i.customerId === c.customerId &&
        i.status !== 2 &&
        i.status !== 3 &&
        String(i.status).toLowerCase() !== 'void' &&
        (i.amountDue || 0) > 0
    );

    const headers = ['Invoice Number', 'Invoice Date', 'Due Date', 'Days Overdue', 'Aging Bucket', 'Total Amount', 'Amount Paid', 'Amount Due'];
    const rows = custInvs.map((i: any) => {
      const b = calculateAgingBucket(i.dueDate || i.invoiceDate, asOfDate);
      const days = calculateDaysPastDue(i.dueDate || i.invoiceDate, asOfDate);
      const amountDue = i.amountDue || (i.totalAmount - (i.paidAmount || 0)) || 0;

      return [
        i.invoiceNumber || '',
        (i.invoiceDate || i.date || '').slice(0, 10),
        (i.dueDate || '').slice(0, 10),
        days,
        b,
        i.totalAmount || 0,
        i.paidAmount || i.amountPaid || 0,
        amountDue,
      ];
    });

    const safeName = c.customerName.replace(/[^a-zA-Z0-9-_]/g, '_');
    downloadExcel(`Aging_${safeName}_${asOfDateStr}`, 'Customer Aging', headers, rows);
  };

  // ─── Global Export All Customers Aging ────────────────────────────────────
  const exportAllAgingExcel = () => {
    const headers = ['Customer Code', 'Customer Name', 'Total Outstanding', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Oldest Overdue (Days)', 'Risk Status'];
    const rows = filteredCustomerAging.map((c) => [
      c.customerCode,
      c.customerName,
      c.outstanding,
      c.buckets.Current,
      c.buckets['1-30'],
      c.buckets['31-60'],
      c.buckets['61-90'],
      c.buckets['90+'],
      c.oldestDays,
      c.worstBucket === 'Current' ? 'Current' : c.worstBucket === '90+' ? 'Critical' : 'Overdue',
    ]);

    downloadExcel(`Receivables_Aging_Report_${asOfDateStr}`, 'Aging Report', headers, rows);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ─── VIEW 2: INDIVIDUAL CUSTOMER DETAILED AGING VIEW ───────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedCustomer) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto pb-10">
        {/* Detail Header Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[var(--color-surface)] p-3.5 rounded-xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="h-8.5 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Aging Summary
            </button>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <h1 className="text-base font-bold text-[var(--color-text-strong)] tracking-tight flex items-center gap-2">
                <span className="text-lg">👤</span> {selectedCustomer.customerName}
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
                  {selectedCustomer.customerCode}
                </span>
              </h1>
              <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                Receivables aging schedule and overdue open invoices breakdown.
              </p>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <ExportDropdown
              label="Export Aging"
              onPDF={() => downloadCustomerPDF(selectedCustomer)}
              onExcel={() => downloadCustomerExcel(selectedCustomer)}
              onPrint={() => window.print()}
            />
          </div>
        </div>

        {/* Customer Aging Bucket Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] shadow-2xs">
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Total Due</p>
            <p className="text-sm font-extrabold text-[var(--color-text-strong)] mt-1">{fmt(selectedCustomer.outstanding)}</p>
          </div>
          <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-2xs">
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Current</p>
            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{fmt(selectedCustomer.buckets.Current)}</p>
          </div>
          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-2xs">
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">1-30 Days</p>
            <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-1">{fmt(selectedCustomer.buckets['1-30'])}</p>
          </div>
          <div className="p-3 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 shadow-2xs">
            <p className="text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider">31-60 Days</p>
            <p className="text-sm font-extrabold text-orange-600 dark:text-orange-400 mt-1">{fmt(selectedCustomer.buckets['31-60'])}</p>
          </div>
          <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 shadow-2xs">
            <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">61-90 Days</p>
            <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-1">{fmt(selectedCustomer.buckets['61-90'])}</p>
          </div>
          <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-100/60 dark:bg-rose-950/40 shadow-2xs">
            <p className="text-[10px] font-bold text-rose-800 dark:text-rose-200 uppercase tracking-wider">90+ Days (Critical)</p>
            <p className="text-sm font-extrabold text-rose-700 dark:text-rose-300 mt-1">{fmt(selectedCustomer.buckets['90+'])}</p>
          </div>
        </div>

        {/* Customer Open Invoices Table */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
              <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-rose-500 to-red-700" />
              Open Unpaid Invoices
            </p>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {selectedCustomerInvoices.length} invoices · Ranked by days overdue
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-500/[0.05] dark:bg-rose-400/[0.07] text-[var(--color-text-muted)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-center">Days Overdue</th>
                  <th className="py-2.5 px-3 text-center">Aging Bucket</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3.5 text-right">Amount Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {selectedCustomerInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[var(--color-text-muted)]">
                      <EmptyState
                        icon={CheckCircle2}
                        title="No open invoices found"
                        hint="All invoices are settled — no open balances remain for this customer."
                      />
                    </td>
                  </tr>
                ) : (
                  selectedCustomerInvoices.map((inv: any) => (
                    <tr key={inv.id || inv.invoiceNumber} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-[var(--color-text-strong)]">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-[var(--color-text-muted)]">{(inv.invoiceDate || inv.date || '').slice(0, 10)}</td>
                      <td className="py-2.5 px-3 text-[var(--color-text-muted)]">{(inv.dueDate || '').slice(0, 10) || '-'}</td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {inv.daysPastDue > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">{inv.daysPastDue} days</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">On time</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusChip
                          status={inv.bucket}
                          label={inv.bucket === 'Current' ? 'Current' : `${inv.bucket} Days`}
                          hex={BUCKET_COLORS[inv.bucket as keyof typeof BUCKET_COLORS]}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right text-[var(--color-text)]">{fmt(inv.totalAmount)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">{fmt(inv.paidAmount || inv.amountPaid || 0)}</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-rose-600 dark:text-rose-400 text-sm">{fmt(inv.amountDue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ─── VIEW 1: AGING SUMMARY & DIRECT DOWNLOAD DIRECTORY ─────────────────────
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-rose-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-rose-500 to-red-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Clock className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Receivables Aging Schedule</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400"><span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Monitor receivables by maturity, overdue risk buckets, and download customer aging schedules.
              </p>
            </div>
          </div>

          {/* Search, As-Of Date & Global Export Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Robust Search Box - Icon and Input in normal flow */}
          <div className="flex items-center h-8.5 w-60 px-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 transition-all shadow-2xs">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer, ID, phone..."
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
                title="Clear"
              >
                ×
              </button>
            )}
          </div>

          {/* As Of Date Picker */}
          <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 h-8.5 text-xs shadow-2xs">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">As of:</span>
            <input
              type="date"
              value={asOfDateStr}
              onChange={(e) => setAsOfDateStr(e.target.value)}
              className="bg-transparent border-0 text-xs text-[var(--color-text)] outline-none cursor-pointer"
            />
          </div>

          {/* Export All Report */}
          <button
            onClick={exportAllAgingExcel}
            className="secondary h-8.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            title="Export aging report to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Aging
          </button>

          {/* Refresh Data */}
          <button
            onClick={loadData}
            className="secondary h-8.5 w-8.5 rounded-lg flex items-center justify-center text-xs text-[var(--color-text)]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          </div>
        </div>
      </div>

      {/* KPI Stats - Modern Cards */}
      <KpiGrid cols={4}>
        {[
          { label: 'Total Receivables', value: fmt(totalOutstanding), desc: 'Outstanding customer balances', icon: DollarSign, tone: 'blue' },
          { label: 'Customers with Balance', value: customerAgingList.length, desc: 'Active debtors', icon: Users, tone: 'teal' },
          { label: 'Total Overdue', value: fmt(overdueAmount), desc: 'Past invoice due dates', icon: AlertTriangle, tone: 'amber' },
          { label: 'Critical (90+ Days)', value: criticalCount, desc: 'High delinquency accounts', icon: Skull, tone: 'rose' },
        ].map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </KpiGrid>

      {/* Aging Distribution Chart & Bucket Chips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Horizontal Bar Chart */}
        <div className="lg:col-span-2 bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[var(--color-text-strong)] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Aging Exposure Distribution
            </h3>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {totalOutstanding > 0 ? '100% of outstanding receivables' : 'No receivables'}
            </span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v: number) => moneyCompact(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" width={80} />
                <Tooltip
                  formatter={(value) => [fmt(Number(value)), 'Amount Due']}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interactive Bucket Cards Filter */}
        <div className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-2">
          <div>
            <h3 className="text-xs font-bold text-[var(--color-text-strong)] mb-2">Filter by Aging Risk</h3>
            <div className="space-y-1.5">
              <button
                onClick={() => setSelectedRiskFilter('all')}
                className={`w-full flex items-center justify-between p-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedRiskFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                }`}
              >
                <span>⚡ All Accounts</span>
                <span>{customerAgingList.length}</span>
              </button>

              {BUCKETS.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedRiskFilter(b)}
                  className={`w-full flex items-center justify-between p-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedRiskFilter === b
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BUCKET_COLORS[b] }} />
                    {b === 'Current' ? 'Current' : `${b} Days`}
                  </span>
                  <span className="font-bold">{fmt(bucketTotals[b])}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Aging Schedule Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-rose-500 to-red-700" />
            Customer Aging Schedule
          </p>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {filteredCustomerAging.length} customers · Click any row or export action to download an individual customer aging report.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-rose-500/[0.05] dark:bg-rose-400/[0.07] text-[var(--color-text-muted)] border-b border-[var(--color-border)] text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Customer &amp; ID</th>
                <th className="py-2.5 px-3 text-right">Total Outstanding</th>
                <th className="py-2.5 px-3 text-right">Current</th>
                <th className="py-2.5 px-3 text-right">1-30 Days</th>
                <th className="py-2.5 px-3 text-right">31-60 Days</th>
                <th className="py-2.5 px-3 text-right">61-90 Days</th>
                <th className="py-2.5 px-3 text-right">90+ Days</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-right">Individual Export & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <TableSkeleton rows={6} />
                  </td>
                </tr>
              ) : filteredCustomerAging.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[var(--color-text-muted)]">
                    <EmptyState
                      icon={Users}
                      title="No outstanding receivables found"
                      hint="No customer balances match the current filters and as-of date."
                    />
                  </td>
                </tr>
              ) : (
                filteredCustomerAging.map((c) => (
                  <tr
                    key={c.customerId}
                    onClick={() => setSelectedCustomerId(c.customerId)}
                    className="hover:bg-gray-50/60 dark:hover:bg-gray-900/40 transition-colors group cursor-pointer"
                  >
                    {/* Customer Info */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {c.customerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-[var(--color-text-strong)] group-hover:text-blue-600 transition-colors block">
                            {c.customerName}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                            {c.customerCode} • {c.invoiceCount} Open Inv
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Total Outstanding */}
                    <td className="py-3 px-3 text-right font-bold text-[var(--color-text-strong)] text-sm">
                      {fmt(c.outstanding)}
                    </td>

                    {/* Current */}
                    <td className="py-3 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {c.buckets.Current > 0 ? fmt(c.buckets.Current) : '—'}
                    </td>

                    {/* 1-30 */}
                    <td className="py-3 px-3 text-right font-medium text-amber-600 dark:text-amber-400">
                      {c.buckets['1-30'] > 0 ? fmt(c.buckets['1-30']) : '—'}
                    </td>

                    {/* 31-60 */}
                    <td className="py-3 px-3 text-right font-medium text-orange-600 dark:text-orange-400">
                      {c.buckets['31-60'] > 0 ? fmt(c.buckets['31-60']) : '—'}
                    </td>

                    {/* 61-90 */}
                    <td className="py-3 px-3 text-right font-medium text-rose-600 dark:text-rose-400">
                      {c.buckets['61-90'] > 0 ? fmt(c.buckets['61-90']) : '—'}
                    </td>

                    {/* 90+ */}
                    <td className="py-3 px-3 text-right font-bold text-rose-700 dark:text-rose-300">
                      {c.buckets['90+'] > 0 ? fmt(c.buckets['90+']) : '—'}
                    </td>

                    {/* Risk Badge */}
                    <td className="py-3 px-3 text-center">
                      <StatusChip
                        status={c.worstBucket}
                        label={
                          c.worstBucket === 'Current'
                            ? 'Current'
                            : c.worstBucket === '1-30'
                            ? 'Overdue'
                            : c.worstBucket === '31-60'
                            ? 'Delinquent'
                            : c.worstBucket === '61-90'
                            ? 'Severe'
                            : 'Critical'
                        }
                        hex={BUCKET_COLORS[c.worstBucket]}
                      />
                    </td>

                    {/* Individual Download Buttons */}
                    <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => downloadCustomerPDF(c)}
                          className="h-7.5 px-2.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-2xs"
                          title="Download Aging PDF"
                        >
                          <Download className="w-3 h-3" /> PDF
                        </button>
                        <button
                          onClick={() => downloadCustomerExcel(c)}
                          className="h-7.5 px-2 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-2xs"
                          title="Download Aging Excel"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setSelectedCustomerId(c.customerId)}
                          className="h-7.5 px-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Open details"
                        >
                          View <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CustomerAgingWorkspace;
