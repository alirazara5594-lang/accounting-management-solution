import React, { useState, useEffect, useMemo } from 'react';
import { reportsApi } from './api/modules/reports.api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Wallet, CalendarCheck, AlarmClock } from 'lucide-react';
import { DataToolbar } from '@/components/ui/data-toolbar';
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card';
import { EmptyState, TableSkeleton } from './components/ui/empty-state';
import { StatusChip } from './components/ui/status-chip';
import { CompactSelect } from './components/CompactSelect';
import type { Entity } from './EntitySettings';

interface ApBill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  currencyCode: string;
}

interface AccountsPayableViewProps {
  activeEntityId: string;
  entities: Entity[];
}

export const AccountsPayableView: React.FC<AccountsPayableViewProps> = ({ activeEntityId, entities }) => {
  const currentEntity = entities.find(e => e.id === activeEntityId);
  const [bills, setBills] = useState<ApBill[]>([]);
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
      const data = await reportsApi.getApLedger(params);
      setBills(data?.bills || []);
      setCurrent(data?.current || 0);
      setPastDue(data?.pastDue || 0);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load accounts payable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeEntityId]);

  const filtered = useMemo(() => {
    return bills
      .filter(b => {
        if (b.status === 'Draft' || b.status === 'Void' || b.status === 'Cancelled') return false;
        if (statusFilter !== 'All' && b.status !== statusFilter) return false;
        if (query.trim()) {
          const q = query.toLowerCase();
          if (!b.vendorName.toLowerCase().includes(q) && !b.billNumber.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.date || a.dueDate || '';
        const dateB = b.date || b.dueDate || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const numA = a.billNumber || '';
        const numB = b.billNumber || '';
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [bills, query, statusFilter]);

  const activeBills = useMemo(() => bills.filter(b => b.status !== 'Draft' && b.status !== 'Void' && b.status !== 'Cancelled'), [bills]);
  const totalDue = useMemo(() => activeBills.reduce((s, b) => s + (b.amountDue || 0), 0), [activeBills]);

  const exportHeaders = ['Bill #', 'Vendor', 'Date', 'Due Date', 'Total', 'Paid', 'Due', 'Status'];
  const exportRows = filtered.map(b => [b.billNumber, b.vendorName, b.date, b.dueDate, b.totalAmount, b.amountPaid, b.amountDue, b.status]);

  return (
    <div className="space-y-4 font-sans text-slate-800 p-2 md:p-6">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-amber-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-amber-500 to-orange-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Wallet className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Accounts Payable</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Vendor trade payables aged by due date for {currentEntity?.name || 'Active Entity'} (IAS 37 / IAS 32 financial liabilities).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
          <DataToolbar
            exportFileName="accounts-payable"
            exportSheetName="Accounts Payable"
            exportTitle="Accounts Payable"
            exportSubtitle={`Vendor trade payables aged by due date for ${currentEntity?.name || 'Active Entity'} (IAS 37 / IAS 32).`}
            exportHeaders={exportHeaders}
            exportRows={exportRows}
            exportTotals={[{ label: 'Total Due', value: totalDue }]}
            onRefresh={load}
          />
          </div>
        </div>
      </div>

      <KpiGrid cols={3}>
        <KpiCard icon={Wallet} label="Total Payable" value={totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })} tone="blue" />
        <KpiCard icon={CalendarCheck} label="Current (Not Yet Due)" value={current.toLocaleString(undefined, { minimumFractionDigits: 2 })} tone="emerald" />
        <KpiCard icon={AlarmClock} label="Past Due" value={pastDue.toLocaleString(undefined, { minimumFractionDigits: 2 })} tone="rose" />
      </KpiGrid>

      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search vendor, bill #..." value={query} onChange={e => setQuery(e.target.value)} className="pl-9 h-9 bg-white text-xs" />
        </div>
        <CompactSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'All', label: 'All Statuses' },
            { value: 'Open', label: 'Open' },
            { value: 'PartiallyPaid', label: 'Partially Paid' },
          ]}
          placeholder="Filter status..."
          className="w-40 h-9"
        />
      </div>

      {loading && <TableSkeleton rows={6} />}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-amber-500/[0.05] dark:bg-amber-400/[0.07] border-b border-slate-200">
            <TableRow>
              <TableHead className="w-32 text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-4">BILL #</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">VENDOR</TableHead>
              <TableHead className="w-28 text-[11px] font-bold text-slate-500 uppercase tracking-wider">BILL DATE</TableHead>
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
                  <EmptyState icon={Wallet} title="No outstanding vendor bills" hint="Create Purchase Orders / Bills to build payables." />
                </TableCell>
              </TableRow>
            )}
            {filtered.map(b => (
              <TableRow key={b.id} className="hover:bg-slate-50/80">
                <TableCell className="py-3 pl-4 font-mono text-xs font-bold text-slate-800">{b.billNumber}</TableCell>
                <TableCell className="py-3 font-bold text-xs text-slate-800">{b.vendorName}</TableCell>
                <TableCell className="py-3 font-mono text-xs text-slate-600">{b.date}</TableCell>
                <TableCell className={`py-3 font-mono text-xs ${new Date(b.dueDate) < new Date() && b.amountDue > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>{b.dueDate}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-800">{b.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs text-emerald-700">{b.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs font-bold text-rose-600">{b.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="py-3">
                  <StatusChip
                    status={b.status === 'Paid' ? 'paid' : b.status === 'PartiallyPaid' ? 'partial' : 'overdue'}
                    label={b.status}
                    hex={b.status === 'Paid' ? '#10b981' : b.status === 'PartiallyPaid' ? '#f59e0b' : '#f43f5e'}
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