import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { DataToolbar } from '@/components/ui/data-toolbar';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import type { Entity } from './EntitySettings';
import { apiClient } from './api/client';

interface TransferRecord {
  id: string;
  transferNumber: string;
  date: string;
  fromAccountId: string;
  fromAccountName: string;
  fromAccountCode: string;
  toAccountId: string;
  toAccountName: string;
  toAccountCode: string;
  amount: number;
  reference: string;
  status: string;
}

interface TransferAccount { id: string; code: string; name: string; }

const getNextFundTransferReference = (allTransfers: TransferRecord[] = []): string => {
  let maxSeq = 0;
  for (const t of allTransfers) {
    if (!t?.reference) continue;
    const match = t.reference.match(/TRF-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq && num < 1000000) {
        maxSeq = num;
      }
    }
  }
  return `TRF-${String(maxSeq + 1).padStart(5, '0')}`;
};

export const FundTransfersView: React.FC<{ activeEntityId: string; entities: Entity[] }> = ({ activeEntityId, entities }) => {
  const currentEntity = entities.find(e => e.id === activeEntityId);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [accounts, setAccounts] = useState<TransferAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    reference: 'TRF-00001'
  });

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const data = await apiClient<TransferRecord[]>('/fund-transfers', { params: { companyId: activeEntityId || undefined } });
      setTransfers(data);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load fund transfers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
    apiClient<TransferAccount[]>('/fund-transfers/accounts').then(setAccounts).catch(() => {});
  }, [activeEntityId]);

  useEffect(() => {
    if (!isModalOpen) return;
    setForm(f => ({
      ...f,
      fromAccountId: accounts[0]?.id || '',
      toAccountId: accounts[1]?.id || accounts[0]?.id || '',
    }));
  }, [isModalOpen, accounts]);

  const filtered = useMemo(() => {
    return transfers
      .filter(t => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          (t.transferNumber || '').toLowerCase().includes(q) ||
          (t.fromAccountName || '').toLowerCase().includes(q) ||
          (t.toAccountName || '').toLowerCase().includes(q) ||
          (t.reference || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const numA = a.transferNumber || a.reference || '';
        const numB = b.transferNumber || b.reference || '';
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [transfers, query]);

  const exportHeaders = ['Date', 'Transfer #', 'Source Account', 'Target Account', 'Reference', 'Status', 'Amount'];
  const exportRows = filtered.map(t => [t.date, t.transferNumber, `${t.fromAccountCode} — ${t.fromAccountName}`, `${t.toAccountCode} — ${t.toAccountName}`, t.reference || '', t.status, t.amount]);
  const totalTransferred = filtered.reduce((s, t) => s + (t.amount || 0), 0);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const amt = parseFloat(form.amount);
    if (!form.fromAccountId) { setFormError('Please select a source account.'); return; }
    if (!form.toAccountId) { setFormError('Please select a target account.'); return; }
    if (form.fromAccountId === form.toAccountId) { setFormError('Source and target accounts must be different.'); return; }
    if (isNaN(amt) || amt <= 0) { setFormError('Amount must be greater than zero.'); return; }

    setSaving(true);
    try {
      await apiClient('/fund-transfers', {
        method: 'POST',
        body: {
          fromAccountId: form.fromAccountId,
          toAccountId: form.toAccountId,
          amount: amt,
          transferDate: form.date,
          reference: form.reference,
          companyId: activeEntityId || undefined,
        },
      });
      setIsModalOpen(false);
      await loadTransfers();
      setForm(f => ({ ...f, fromAccountId: '', toAccountId: '', date: new Date().toISOString().slice(0, 10), amount: '', reference: getNextFundTransferReference(transfers) }));
    } catch (err: any) {
      setFormError(err?.data?.error || err?.message || 'Failed to create transfer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 p-2 md:p-6">
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
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Fund Transfers</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Internal liquidity bank-to-bank and cash vault transfers for {currentEntity?.name || 'Active Entity'}.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
          <DataToolbar
            query={query}
            setQuery={setQuery}
            searchPlaceholder="Search transfer #, accounts, reference..."
            exportFileName="fund-transfers"
            exportSheetName="Fund Transfers"
            exportTitle="Inter-Account Fund Transfers"
            exportSubtitle="Bank-to-bank and cash vault internal transfers."
            exportHeaders={exportHeaders}
            exportRows={exportRows}
            exportTotals={[{ label: 'Total Transferred', value: totalTransferred }]}
            onRefresh={loadTransfers}
          />
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="h-9 px-4 gap-1.5 text-xs font-semibold text-white bg-[#143e2b]">
            <Plus className="w-4 h-4" /> New Inter-Bank Transfer
          </Button>
          </div>
        </div>
      </div>

      {loading && <TableSkeleton rows={6} />}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07] border-b border-slate-200">
            <TableRow>
              <TableHead className="w-28 text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-4">DATE</TableHead>
              <TableHead className="w-32 text-[11px] font-bold text-slate-500 uppercase tracking-wider">TRANSFER #</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SOURCE ACCOUNT</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TARGET ACCOUNT</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">REFERENCE</TableHead>
              <TableHead className="w-24 text-[11px] font-bold text-slate-500 uppercase tracking-wider">STATUS</TableHead>
              <TableHead className="w-36 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider pr-4">AMOUNT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {transfers.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={ArrowLeftRight}
                    title="No fund transfers recorded yet"
                    hint="Create a transfer between bank or cash accounts to see it here."
                  />
                </TableCell>
              </TableRow>
            )}
            {filtered.map(t => (
              <TableRow key={t.id} className="hover:bg-slate-50/80">
                <TableCell className="py-3.5 pl-4 font-mono text-xs text-slate-600">{t.date}</TableCell>
                <TableCell className="py-3.5 font-mono text-xs font-bold text-slate-800">{t.transferNumber}</TableCell>
                <TableCell className="py-3.5 text-xs text-slate-700 font-medium">{t.fromAccountCode} — {t.fromAccountName}</TableCell>
                <TableCell className="py-3.5 text-xs text-slate-700 font-medium">{t.toAccountCode} — {t.toAccountName}</TableCell>
                <TableCell className="py-3.5 text-xs text-slate-500">{t.reference || '—'}</TableCell>
                <TableCell className="py-3.5">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{t.status}</span>
                </TableCell>
                <TableCell className="py-3.5 text-right font-mono text-xs font-bold text-slate-900 pr-4">{t.amount.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isModalOpen && (
        <div className="overlay">
          <form className="modal" onSubmit={handleCreateTransfer} >
            <div className="modal-head">
              <div>
                <p className="eyebrow">BANKING & PAYMENTS</p>
                <h2>New Inter-Account Transfer</h2>
              </div>
              <button type="button" className="close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="form-grid">
              {formError && <p className="error" style={{ gridColumn: '1 / -1', color: '#c25c5c', fontSize: 13, marginBottom: 10 }}>{formError}</p>}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Source Account (Out)</label>
                <select value={form.fromAccountId} onChange={e => setForm({ ...form, fromAccountId: e.target.value })} className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs">
                  <option value="">— Select Source —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Account (In)</label>
                <select value={form.toAccountId} onChange={e => setForm({ ...form, toAccountId: e.target.value })} className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs">
                  <option value="">— Select Target —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Transfer Date</label>
                  <Input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="h-9 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Amount</label>
                  <Input required type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-9 text-xs font-mono" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reference</label>
                <Input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="h-9 text-xs font-mono" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary" disabled={saving}>{saving ? 'Executing…' : 'Execute Transfer'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};