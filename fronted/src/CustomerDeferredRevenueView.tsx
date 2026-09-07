import React, { useState, useEffect } from 'react';
import {
  DollarSign, Plus, CheckCircle2, Clock,
  Play, RefreshCw, X, Trash2, Sparkles, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState } from './components/ui/empty-state';

const formatCurrency = (val: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2
  }).format(val || 0);
};

interface PrepaymentLine {
  periodIndex: number;
  dueDate: string;
  amount: number;
  posted: boolean;
  postedDate?: string;
  journalEntryId?: string;
  journalVoucherNumber?: string;
}

interface PrepaymentSchedule {
  id: string;
  scheduleNumber: string;
  title: string;
  type: 'VendorPrepaidExpense' | 'CustomerDeferredRevenue' | 'VendorAdvance' | 'CustomerAdvance';
  status: 'Active' | 'Completed' | 'Cancelled';
  companyId?: string;
  counterpartyId?: string;
  counterpartyName: string;
  referenceNumber: string;
  totalAmount: number;
  recognizedAmount: number;
  remainingAmount: number;
  currencyCode: string;
  startDate: string;
  endDate: string;
  frequencyMonths: number;
  balanceSheetAccountId: string;
  profitLossAccountId: string;
  notes: string;
  createdAt: string;
  lines: PrepaymentLine[];
}

interface Props {
  activeEntityId?: string;
  accounts?: any[];
  customers?: any[];
}

export default function CustomerDeferredRevenueView({ activeEntityId, accounts = [] }: Props) {
  const [schedules, setSchedules] = useState<PrepaymentSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<PrepaymentSchedule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCutoff, setBatchCutoff] = useState(new Date().toISOString().split('T')[0]);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [form, setForm] = useState({
    title: '',
    counterpartyName: '',
    referenceNumber: '',
    totalAmount: '',
    currencyCode: 'USD',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    frequencyMonths: 1,
    balanceSheetAccountId: '',
    profitLossAccountId: '',
    notes: ''
  });

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5124/api/v1/prepayments?type=CustomerDeferredRevenue');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
        if (selectedSchedule) {
          const updated = data.find((s: PrepaymentSchedule) => s.id === selectedSchedule.id);
          if (updated) setSelectedSchedule(updated);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [activeEntityId]);

  // Filter liability accounts (23000 Deferred Revenue) and Revenue accounts (4xxxx)
  const deferredLiabilityAccounts = accounts.filter(a =>
    a.isPosting !== false && (a.code?.startsWith('23') || a.name?.toLowerCase().includes('deferred') || a.name?.toLowerCase().includes('unearned') || a.type === 'Liability')
  );
  const revenueAccounts = accounts.filter(a =>
    a.isPosting !== false && (a.code?.startsWith('4') || a.type === 'Revenue')
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setActionLoading(true);

    try {
      const payload = {
        title: form.title,
        type: 'CustomerDeferredRevenue',
        companyId: activeEntityId,
        counterpartyName: form.counterpartyName,
        referenceNumber: form.referenceNumber,
        totalAmount: parseFloat(form.totalAmount) || 0,
        currencyCode: form.currencyCode,
        startDate: form.startDate,
        endDate: form.endDate,
        frequencyMonths: Number(form.frequencyMonths) || 1,
        balanceSheetAccountId: form.balanceSheetAccountId || deferredLiabilityAccounts[0]?.id,
        profitLossAccountId: form.profitLossAccountId || revenueAccounts[0]?.id,
        notes: form.notes
      };

      const res = await fetch('http://localhost:5124/api/v1/prepayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`✓ Created Deferred Revenue Contract ${data.scheduleNumber}`);
        setShowCreateModal(false);
        setForm({
          title: '',
          counterpartyName: '',
          referenceNumber: '',
          totalAmount: '',
          currencyCode: 'USD',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          frequencyMonths: 1,
          balanceSheetAccountId: '',
          profitLossAccountId: '',
          notes: ''
        });
        loadSchedules();
      } else {
        setErrorMsg(data.error || 'Failed to create contract schedule');
      }
    } catch {
      setErrorMsg('Network error while saving contract');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostLine = async (scheduleId: string, periodIndex: number) => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`http://localhost:5124/api/v1/prepayments/${scheduleId}/post-line/${periodIndex}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`✓ Recognized Revenue Journal ${data.reference || ''}`);
        loadSchedules();
      } else {
        setErrorMsg(data.error || 'Failed to recognize revenue period');
      }
    } catch {
      setErrorMsg('Network error while posting revenue');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchRun = async () => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:5124/api/v1/prepayments/batch-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cutoffDate: batchCutoff,
          type: 'CustomerDeferredRevenue'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Batch revenue recognition completed');
        setShowBatchModal(false);
        loadSchedules();
      } else {
        setErrorMsg(data.error || 'Batch run failed');
      }
    } catch {
      setErrorMsg('Network error during batch revenue recognition');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this unposted contract?')) return;
    try {
      const res = await fetch(`http://localhost:5124/api/v1/prepayments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('✓ Contract schedule deleted.');
        if (selectedSchedule?.id === id) setSelectedSchedule(null);
        loadSchedules();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete');
      }
    } catch {}
  };

  // Metrics
  const totalDeferred = schedules.reduce((s, x) => s + x.totalAmount, 0);
  const totalRecognized = schedules.reduce((s, x) => s + x.recognizedAmount, 0);
  const totalPending = schedules.reduce((s, x) => s + x.remainingAmount, 0);
  const activeCount = schedules.filter(s => s.status === 'Active').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-violet-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-violet-500 to-purple-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Customer Advances &amp; Deferred Revenue</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400"><span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Track customer upfront retainers, annual subscription billing, and service contracts with automated monthly revenue recognition journal postings.
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/25 whitespace-nowrap">
                  Sales &amp; Recurring Revenue
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] whitespace-nowrap">IFRS 15 &amp; ASC 606 Compliance</span>
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center gap-2 flex-nowrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBatchModal(true)}
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
            >
              <Play className="w-3.5 h-3.5 text-teal-600 fill-teal-600 mr-1" />
              <span>Recognize Revenue (Batch Run)</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>New Deferred Revenue Contract</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
          <span className="font-semibold">{successMsg}</span>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
          <span className="font-semibold">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <KpiGrid cols={4}>
        {[
          { label: 'Total Contract Value', value: formatCurrency(totalDeferred), desc: `${schedules.length} customer contracts`, icon: DollarSign, tone: 'teal' },
          { label: 'Recognized Revenue (Earned)', value: formatCurrency(totalRecognized), desc: `${totalDeferred > 0 ? Math.round((totalRecognized / totalDeferred) * 100) : 0}% recognized`, icon: CheckCircle2, tone: 'emerald' },
          { label: 'Deferred Revenue Liability', value: formatCurrency(totalPending), desc: 'Current Liability (23000)', icon: Clock, tone: 'indigo' },
          { label: 'Active Subscriptions', value: activeCount, desc: 'Ongoing amortization', icon: UserCheck, tone: 'teal' },
        ].map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </KpiGrid>

      {/* Schedules Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-[var(--color-surface-muted)] flex items-center justify-between flex-wrap gap-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-strong)]">
            <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-gradient-to-br from-violet-500 to-purple-700" />
            Customer Deferred Revenue Contracts
          </p>
          <button
            onClick={loadSchedules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-violet-500/[0.05] dark:bg-violet-400/[0.07] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Contract #</th>
                <th className="py-3 px-4">Service Description</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Total Contract</th>
                <th className="py-3 px-4">Recognized Revenue</th>
                <th className="py-3 px-4">Deferred Liability</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12">
                    <EmptyState
                      icon={Sparkles}
                      title="No deferred revenue contracts found"
                      hint="Click New Deferred Revenue Contract to create your first IFRS 15 schedule."
                    />
                  </td>
                </tr>
              ) : (
                schedules.map(sched => {
                  const pct = sched.totalAmount > 0 ? Math.round((sched.recognizedAmount / sched.totalAmount) * 100) : 0;
                  return (
                    <tr
                      key={sched.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                        {sched.scheduleNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{sched.title}</div>
                        {sched.referenceNumber && (
                          <div className="text-[10px] text-slate-400">Ref: {sched.referenceNumber}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {sched.counterpartyName || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(sched.totalAmount, sched.currencyCode)}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatCurrency(sched.recognizedAmount, sched.currencyCode)}
                        <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(sched.remainingAmount, sched.currencyCode)}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {sched.startDate} → {sched.endDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusChip
                          status={sched.status}
                          label={sched.status}
                          hex={sched.status === 'Completed' ? '#10b981' : sched.status === 'Cancelled' ? '#ef4444' : '#0ea5e9'}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSchedule(sched)}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-700 dark:text-teal-300 font-bold text-[11px] border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                          >
                            View Breakdown ({sched.lines.filter(l => l.posted).length}/{sched.lines.length})
                          </button>
                          {sched.recognizedAmount === 0 && (
                            <button
                              onClick={() => handleDelete(sched.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete Contract"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Schedule Detail Drawer */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl p-6 space-y-5 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800">
                      {selectedSchedule.scheduleNumber}
                    </span>
                    <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {selectedSchedule.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {selectedSchedule.title}
                  </h2>
                  <p className="text-xs text-slate-500">Customer: <b>{selectedSchedule.counterpartyName || 'N/A'}</b></p>
                </div>
                <button
                  onClick={() => setSelectedSchedule(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Contract</span>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {formatCurrency(selectedSchedule.totalAmount, selectedSchedule.currencyCode)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 uppercase font-bold">Recognized Revenue</span>
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedSchedule.recognizedAmount, selectedSchedule.currencyCode)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-600 uppercase font-bold">Remaining Deferred</span>
                  <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(selectedSchedule.remainingAmount, selectedSchedule.currencyCode)}
                  </div>
                </div>
              </div>

              {/* Monthly Breakdown Table */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-2">IFRS 15 Revenue Recognition Schedule</h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Period</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Journal Ref</th>
                        <th className="py-2.5 px-3 text-right">Status / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {selectedSchedule.lines.map(line => (
                        <tr key={line.periodIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold font-mono">#{line.periodIndex}</td>
                          <td className="py-2.5 px-3">{line.dueDate}</td>
                          <td className="py-2.5 px-3 font-bold">{formatCurrency(line.amount, selectedSchedule.currencyCode)}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-teal-600 dark:text-teal-400">
                            {line.journalVoucherNumber || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {line.posted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                Recognized ({line.postedDate})
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePostLine(selectedSchedule.id, line.periodIndex)}
                                disabled={actionLoading}
                                className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                              >
                                Recognize Now
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Contract Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Deferred Revenue Contract</h3>
                <p className="text-xs text-slate-500">Amortizes customer upfront advance into earned sales revenue.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)}><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold block mb-1">Contract / Retainer Title *</label>
                <input
                  required
                  placeholder="e.g. Annual Cloud Enterprise Retainer, 12-Month Support Contract"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Customer / Client</label>
                  <input
                    placeholder="e.g. Global Logistics Corp"
                    value={form.counterpartyName}
                    onChange={e => setForm({ ...form, counterpartyName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Contract / Order Ref #</label>
                  <input
                    placeholder="e.g. SO-00001"
                    value={form.referenceNumber}
                    onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Total Contract Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="24000.00"
                    value={form.totalAmount}
                    onChange={e => setForm({ ...form, totalAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Currency</label>
                  <select
                    value={form.currencyCode}
                    onChange={e => setForm({ ...form, currencyCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    <option value="PKR">PKR (₨)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="SAR">SAR (﷼)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Deferred Revenue (Liability 23000)</label>
                  <select
                    value={form.balanceSheetAccountId}
                    onChange={e => setForm({ ...form, balanceSheetAccountId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {deferredLiabilityAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Earned Revenue Account (P&L Credit)</label>
                  <select
                    value={form.profitLossAccountId}
                    onChange={e => setForm({ ...form, profitLossAccountId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {revenueAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Generate Contract Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Run Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Run Revenue Recognition Batch</h3>
                <p className="text-xs text-slate-500">Recognizes earned revenue across all active customer contracts.</p>
              </div>
              <button onClick={() => setShowBatchModal(false)}><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Recognition Cutoff Date</label>
                <input
                  type="date"
                  value={batchCutoff}
                  onChange={e => setBatchCutoff(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                The system will calculate earned revenue up to the cutoff date and generate balanced General Journal entries:
                <br />
                <code className="text-teal-600 dark:text-teal-400 font-mono mt-1 block">Dr. Deferred Revenue (23000) / Cr. Sales & Service Revenue (4xxxx)</code>
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchRun}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                {actionLoading ? 'Executing Batch...' : 'Execute Revenue Recognition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
