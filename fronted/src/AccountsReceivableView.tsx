import React, { useState, useEffect, useMemo } from 'react';
import { reportsApi } from './api/modules/reports.api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, ReceiptText, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DataToolbar } from '@/components/ui/data-toolbar';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import { CompactSelect } from './components/CompactSelect';
import type { Entity } from './EntitySettings';

interface ArInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  currency: string;
}

interface AccountsReceivableViewProps {
  activeEntityId: string;
  entities: Entity[];
}

export const AccountsReceivableView: React.FC<AccountsReceivableViewProps> = ({ activeEntityId, entities }) => {
  const currentEntity = entities.find(e => e.id === activeEntityId);
  const [invoices, setInvoices] = useState<ArInvoice[]>([]);
  const [current, setCurrent] = useState(0);
  const [pastDue, setPastDue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (activeEntityId) params.companyId = activeEntityId;
      const data = await reportsApi.getArLedger(params);
      setInvoices(data?.invoices || []);
      setCurrent(data?.current || 0);
      setPastDue(data?.pastDue || 0);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load accounts receivable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeEntityId]);

  const filtered = useMemo(() => {
    return invoices
      .filter(i => {
        if (i.status === 'Draft' || i.status === 'Void') return false;
        if (statusFilter !== 'All') {
          if (statusFilter === 'Unpaid' && i.status !== 'Sent' && i.status !== 'Overdue') return false;
          else if (statusFilter === 'PartiallyPaid' && i.status !== 'PartiallyPaid') return false;
          else if (statusFilter === 'Paid' && i.status !== 'Paid') return false;
          else if (statusFilter !== 'Unpaid' && statusFilter !== 'PartiallyPaid' && statusFilter !== 'Paid' && i.status !== statusFilter) return false;
        }
        if (query.trim()) {
          const q = query.toLowerCase();
          if (!i.customerName.toLowerCase().includes(q) && !i.invoiceNumber.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.date || a.dueDate || '';
        const dateB = b.date || b.dueDate || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const numA = a.invoiceNumber || '';
        const numB = b.invoiceNumber || '';
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [invoices, query, statusFilter]);

  const activeInvoices = useMemo(() => invoices.filter(i => i.status !== 'Draft' && i.status !== 'Void'), [invoices]);
  const totalDue = useMemo(() => activeInvoices.reduce((s, i) => s + (i.amountDue || 0), 0), [activeInvoices]);

  const exportHeaders = ['Invoice #', 'Customer', 'Date', 'Due Date', 'Total', 'Paid', 'Due', 'Status'];
  const exportRows = filtered.map(i => [i.invoiceNumber, i.customerName, i.date, i.dueDate, i.totalAmount, i.amountPaid, i.amountDue, i.status]);

  return (
    <div className="space-y-4 font-sans text-slate-800 p-2 md:p-6">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-sky-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-sky-500 to-blue-700" />
              <div className="absolute inset-0 flex items-center justify-center"><ReceiptText className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Accounts Receivable</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400"><span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Customer trade receivables aged by due date for {currentEntity?.name || 'Active Entity'} (IAS 39/IFRS 9 financial assets).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DataToolbar
              exportFileName="accounts-receivable"
              exportSheetName="Accounts Receivable"
              exportTitle="Accounts Receivable"
              exportSubtitle={`Customer trade receivables aged by due date for ${currentEntity?.name || 'Active Entity'} (IAS 39/IFRS 9).`}
              exportHeaders={exportHeaders}
              exportRows={exportRows}
              exportTotals={[{ label: 'Total Due', value: totalDue }]}
              onRefresh={load}
            />
          </div>
        </div>
      </div>

      <KpiGrid cols={3}>
        <KpiCard icon={DollarSign} label="Total Receivable" value={totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })} tone="blue" />
        <KpiCard icon={CheckCircle2} label="Current (Not Yet Due)" value={current.toLocaleString(undefined, { minimumFractionDigits: 2 })} tone="emerald" />
        <KpiCard icon={AlertTriangle} label="Past Due" value={pastDue.toLocaleString(undefined, { minimumFractionDigits: 2 })} tone="rose" />
      </KpiGrid>

      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search customer, invoice #..." value={query} onChange={e => setQuery(e.target.value)} className="pl-9 h-9 bg-white text-xs" />
        </div>
        <CompactSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'All', label: 'All Statuses' },
            { value: 'Unpaid', label: 'Unpaid' },
            { value: 'PartiallyPaid', label: 'Partially Paid' },
            { value: 'Paid', label: 'Paid' },
          ]}
          placeholder="Filter status..."
          className="w-40 h-9"
        />
      </div>

      {loading && <TableSkeleton rows={6} />}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-sky-500/[0.05] dark:bg-sky-400/[0.07] border-b border-slate-200">
            <TableRow>
              <TableHead className="w-32 text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-4">INVOICE #</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CUSTOMER</TableHead>
              <TableHead className="w-28 text-[11px] font-bold text-slate-500 uppercase tracking-wider">INVOICE DATE</TableHead>
              <TableHead className="w-28 text-[11px] font-bold text-slate-500 uppercase tracking-wider">DUE DATE</TableHead>
              <TableHead className="w-32 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL</TableHead>
              <TableHead className="w-28 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">PAID</TableHead>
              <TableHead className="w-32 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">AMOUNT DUE</TableHead>
              <TableHead className="w-28 text-[11px] font-bold text-slate-500 uppercase tracking-wider">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    icon={ReceiptText}
                    title="No outstanding customer invoices"
                    hint="Create Sales Invoices to build receivables."
                  />
                </TableCell>
              </TableRow>
            )}
            {filtered.map(i => (
              <TableRow key={i.id} className="hover:bg-slate-50/80">
                <TableCell className="py-3 pl-4 font-mono text-xs font-bold text-slate-800">{i.invoiceNumber}</TableCell>
                <TableCell className="py-3 font-bold text-xs text-slate-800">{i.customerName}</TableCell>
                <TableCell className="py-3 font-mono text-xs text-slate-600">{i.date}</TableCell>
                <TableCell className={`py-3 font-mono text-xs ${new Date(i.dueDate) < new Date() && i.amountDue > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>{i.dueDate}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-800">{i.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs text-emerald-700">{i.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs font-bold text-rose-600">{i.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="py-3">
                  <StatusChip
                    status={i.status}
                    label={i.status}
                    hex={i.status === 'Paid' ? '#10b981' : i.status === 'PartiallyPaid' ? '#f59e0b' : '#f43f5e'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};