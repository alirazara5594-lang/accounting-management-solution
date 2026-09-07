import { useState, useEffect } from 'react';
import { useFieldOperationsStore, usePayrollStore, useCustomersStore } from './stores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';

import { KpiCard, KpiGrid } from '@/components/ui/kpi-card';
import { Plus, ClipboardList, CalendarCheck2, ShieldCheck, Wrench, ReceiptText, Save, CheckCircle2, AlertTriangle, TrendingUp, FileBarChart, Clock3, Wallet } from 'lucide-react';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState } from './components/ui/empty-state';
import { money } from './lib/currency';

const today = () => new Date().toISOString().split('T')[0];

const SURVEY_CATEGORIES = ['Customer Satisfaction', 'Quality', 'Market Research', 'Employee Engagement', 'Compliance', 'Product Feedback'];
const VISIT_TYPES = ['Site Visit', 'Support Visit', 'Audit Visit', 'Sales Visit', 'Maintenance Visit'];
const INSPECTION_TYPES = ['Quality', 'Safety', 'Compliance', 'Inventory', 'Facility'];
const WORK_TYPES = ['Repair', 'Installation', 'Maintenance', 'Inspection', 'Delivery'];
const EXPENSE_CATEGORIES = ['Travel', 'Supplies', 'Meals', 'Fuel', 'Accommodation', 'Equipment'];

const surveyStatusHex: Record<string, string> = { Active: '#10b981', Closed: '#94a3b8', Draft: '#94a3b8' };
const visitStatusHex: Record<string, string> = { Scheduled: '#3b82f6', InProgress: '#f59e0b', Completed: '#10b981', Cancelled: '#ef4444' };
const inspectionStatusHex: Record<string, string> = { Scheduled: '#3b82f6', InProgress: '#f59e0b', Passed: '#10b981', Failed: '#ef4444' };
const woStatusHex: Record<string, string> = { Open: '#3b82f6', Assigned: '#3b82f6', InProgress: '#f59e0b', Completed: '#10b981', Cancelled: '#ef4444' };

const EMPTY_SURVEY = { title: '', description: '', category: 'Customer Satisfaction', status: 'Draft', startDate: today(), endDate: '', region: '', assignedTo: '', targetResponses: '100' };
const EMPTY_VISIT = { visitType: 'Site Visit', customerId: '', customerName: '', contactName: '', purpose: '', scheduledDate: today(), startTime: '10:00', durationHours: 2, status: 'Scheduled', location: '', assignedTo: '', findings: '' };
const EMPTY_INSPECTION = { inspectionType: 'Quality', location: '', scheduledDate: today(), inspectorId: '', status: 'Scheduled', score: 0, findings: '', reference: '' };
const EMPTY_WORK_ORDER = { workType: 'Repair', customerId: '', customerName: '', description: '', priority: 'Medium', status: 'Open', assignedTo: '', scheduledDate: today(), laborHours: 0, laborCost: 0, partsCost: 0, location: '' };
const EMPTY_EXPENSE = { workOrderId: '', category: 'Travel', description: '', amount: '0', currency: 'USD', expenseDate: today(), reimbursed: false };

function useFieldData() {
  const store = useFieldOperationsStore();
  const { employees, fetchAll: fetchPayrollAll } = usePayrollStore();
  const { customers, fetchCustomers } = useCustomersStore();
  useEffect(() => { store.fetchAll(); fetchPayrollAll(); fetchCustomers(); }, []);
  return { ...store, employees, customers };
}

const empName = (employees: any[], id?: string) => {
  const e = employees.find(x => x.id === id);
  return e ? `${e.firstName} ${e.lastName}` : 'Unassigned';
};
const custName = (customers: any[], id?: string) => customers.find(c => c.id === id)?.name || '—';

// ── Summary (module overview) ─────────────────────────────────────────────────
export function FieldOperationsSummaryView() {
  const { dashboard, surveys, expenses } = useFieldData();
  const responses = surveys.reduce((s, x) => s + x.responseCount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 via-lime-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-lime-400 to-green-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Wrench className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Survey & Field Operations</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-lime-500/25 bg-lime-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" /> Live Ledger
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Manage surveys, field visits, inspections, field work orders, and expenses.</p>
            </div>
          </div>
        </div>
      </div>

      <KpiGrid cols={4}>
        <KpiCard icon={ClipboardList} label="Active Surveys" value={dashboard?.activeSurveys ?? 0} desc="Currently running" tone="teal" />
        <KpiCard icon={CalendarCheck2} label="Upcoming Visits" value={dashboard?.upcomingVisits ?? 0} desc="Scheduled field visits" tone="blue" />
        <KpiCard icon={Wrench} label="Open Work Orders" value={dashboard?.openOrders ?? 0} desc="Awaiting completion" tone="amber" />
        <KpiCard icon={ShieldCheck} label="Pending Inspections" value={dashboard?.pendingInspections ?? 0} desc="Scheduled inspections" tone="purple" />
      </KpiGrid>
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Performance</p>
          <div className="space-y-2">
            {[
              { label: 'Survey Responses', value: responses },
              { label: 'Completed Visits', value: dashboard?.completedVisits ?? 0 },
              { label: 'Failed Inspections', value: dashboard?.failedInspections ?? 0 },
              { label: 'Field Expenses', value: money(totalExpenses) },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-mono font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2"><Wrench className="h-4 w-4" /> Activity Overview</p>
          <div className="space-y-2">
            {[
              { label: 'Total Surveys', value: dashboard?.surveys ?? 0 },
              { label: 'Total Visits', value: dashboard?.visits ?? 0 },
              { label: 'Total Work Orders', value: dashboard?.workOrders ?? 0 },
              { label: 'Work Order Cost', value: money(dashboard?.totalOrderCost ?? 0) },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-mono font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Surveys ───────────────────────────────────────────────────────────────────
export function SurveysView({ activeEntityId }: { activeEntityId?: string }) {
  const { surveys, employees, createSurvey, setSurveyStatus } = useFieldData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_SURVEY);
  const [saving, setSaving] = useState(false);
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await createSurvey({ title: form.title, description: form.description, category: form.category, status: form.status, startDate: form.startDate, endDate: form.endDate || null, region: form.region, assignedTo: form.assignedTo || null, targetResponses: Number(form.targetResponses) || 0, companyId: activeEntityId || null });
      setForm(EMPTY_SURVEY);
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const active = surveys.filter(s => s.status === 'Active').length;
  const responses = surveys.reduce((s, x) => s + x.responseCount, 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 via-lime-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-lime-400 to-green-700" />
              <div className="absolute inset-0 flex items-center justify-center"><ClipboardList className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Surveys</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-lime-500/25 bg-lime-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" /> Live Ledger
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Launch and track customer and field surveys</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => setShowForm(v => !v)}><Plus className="mr-2 h-4 w-4" /> New Survey</Button>
          </div>
        </div>
      </div>

      <KpiGrid cols={4}>
        <KpiCard icon={ClipboardList} label="Total Surveys" value={surveys.length} desc="All time surveys" tone="teal" />
        <KpiCard icon={TrendingUp} label="Active" value={active} desc="Currently running" tone="blue" />
        <KpiCard icon={CheckCircle2} label="Closed" value={surveys.filter(s => s.status === 'Closed').length} desc="Completed surveys" tone="emerald" />
        <KpiCard icon={AlertTriangle} label="Responses" value={responses} desc="Total responses" tone="amber" />
      </KpiGrid>
      {showForm && (
        <Card className="p-5 border border-[var(--color-border)] shadow-md bg-[var(--color-surface)] rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-lime-600 dark:text-lime-400" /> Create New Field Survey
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <FormField label="Survey Title">
                <Input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Q3 Customer Satisfaction & Field Support Feedback" />
              </FormField>
            </div>

            <FormField label="Category">
              <Select value={form.category} onValueChange={v => v !== null && setF('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SURVEY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>

            <FormField label="Target Responses">
              <Input type="number" value={form.targetResponses} onChange={e => setF('targetResponses', e.target.value)} placeholder="100" />
            </FormField>

            <FormField label="Region / Territory">
              <Input value={form.region} onChange={e => setF('region', e.target.value)} placeholder="e.g. North Zone / Islamabad" />
            </FormField>

            <FormField label="Start Date">
              <Input type="date" value={form.startDate} onChange={e => setF('startDate', e.target.value)} />
            </FormField>

            <FormField label="End Date (Optional)">
              <Input type="date" value={form.endDate} onChange={e => setF('endDate', e.target.value)} />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Assigned Lead / Supervisor">
                <Select value={form.assignedTo} onValueChange={v => v !== null && setF('assignedTo', v)}>
                  <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === 'Active').map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({(e as any).role || (e as any).jobTitle || 'Staff'})</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Survey Scope / Description">
                <Input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="e.g. Measure on-site response time, equipment reliability, and satisfaction" />
              </FormField>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || !form.title} className="bg-lime-600 hover:bg-lime-700 text-white">
              <Save className="mr-1.5 h-4 w-4" /> Create Survey
            </Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden border border-[var(--color-border)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-lime-500/[0.05] dark:bg-lime-400/[0.07]">
                <th className="text-left p-3.5 font-semibold min-w-[240px] w-[30%]">Survey</th>
                <th className="text-left p-3.5 font-semibold min-w-[140px]">Category</th>
                <th className="text-left p-3.5 font-semibold min-w-[120px]">Region</th>
                <th className="text-left p-3.5 font-semibold min-w-[180px] w-[20%]">Assigned Lead</th>
                <th className="text-right p-3.5 font-semibold min-w-[110px]">Responses</th>
                <th className="text-center p-3.5 font-semibold min-w-[130px]">Progress</th>
                <th className="text-center p-3.5 font-semibold min-w-[100px]">Status</th>
                <th className="text-right p-3.5 font-semibold min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map(s => {
                const pct = s.targetResponses > 0 ? Math.min(100, Math.round((s.responseCount / s.targetResponses) * 100)) : 0;
                return (
                  <tr key={s.id} className="border-b border-[var(--color-border-subtle)] hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 min-w-[240px]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center shrink-0 text-xs">
                          <ClipboardList size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--color-text-strong)]">{s.title}</p>
                          <p className="font-mono text-xs text-[var(--color-text-muted)] mt-0.5">{s.surveyNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5"><Badge variant="outline">{s.category}</Badge></td>
                    <td className="p-3.5 text-xs text-[var(--color-text-muted)]">{s.region || 'All Territories'}</td>
                    <td className="p-3.5 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {empName(employees, s.assignedTo)?.[0] || 'U'}
                        </div>
                        <span className="font-medium text-xs text-[var(--color-text-strong)]">{empName(employees, s.assignedTo)}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-semibold">{s.responseCount}/{s.targetResponses}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
                        <span className="text-xs text-muted-foreground font-mono">{pct}%</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-center"><StatusChip status={s.status} label={s.status} hex={surveyStatusHex[s.status] ?? '#94a3b8'} /></td>
                    <td className="p-3.5 text-right">
                      {s.status === 'Draft' && <Button size="sm" variant="outline" className="h-7 text-xs border-teal-500/30 text-teal-600 hover:bg-teal-50" onClick={() => setSurveyStatus(s.id, 'Active')}>Launch</Button>}
                      {s.status === 'Active' && <Button size="sm" variant="outline" className="h-7 text-xs border-slate-500/30 text-slate-600 hover:bg-slate-50" onClick={() => setSurveyStatus(s.id, 'Closed')}>Close</Button>}
                    </td>
                  </tr>
                );
              })}
              {surveys.length === 0 && <tr><td colSpan={8}><EmptyState icon={ClipboardList} title="No surveys found" hint="Launch a survey to start collecting field and customer responses." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Field Visits ─────────────────────────────────────────────────────────────
export function FieldVisitsView({ activeEntityId }: { activeEntityId?: string }) {
  const { visits, customers, employees, createVisit, setVisitStatus } = useFieldData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_VISIT);
  const [saving, setSaving] = useState(false);
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await createVisit({ visitType: form.visitType, customerId: form.customerId || null, customerName: form.customerName, contactName: form.contactName, purpose: form.purpose, scheduledDate: form.scheduledDate, startTime: form.startTime || null, durationHours: Number(form.durationHours) || 0, status: form.status, location: form.location, assignedTo: form.assignedTo || null, findings: form.findings, companyId: activeEntityId || null });
      setForm(EMPTY_VISIT);
      setShowForm(false);
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 via-lime-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-lime-400 to-green-700" />
              <div className="absolute inset-0 flex items-center justify-center"><CalendarCheck2 className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Field Visits</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-lime-500/25 bg-lime-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" /> Live Ledger
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Schedule and complete on-site field visits</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => setShowForm(v => !v)}><Plus className="mr-2 h-4 w-4" /> Schedule Visit</Button>
          </div>
        </div>
      </div>

      <KpiGrid cols={4}>
        <KpiCard icon={CalendarCheck2} label="Total Visits" value={visits.length} desc="All time visits" tone="teal" />
        <KpiCard icon={Clock3} label="Upcoming" value={visits.filter(v => v.status === 'Scheduled').length} desc="Scheduled visits" tone="blue" />
        <KpiCard icon={TrendingUp} label="In Progress" value={visits.filter(v => v.status === 'InProgress').length} desc="Currently active" tone="amber" />
        <KpiCard icon={CheckCircle2} label="Completed" value={visits.filter(v => v.status === 'Completed').length} desc="Finished visits" tone="emerald" />
      </KpiGrid>
      {showForm && (
        <Card className="p-5 border border-[var(--color-border)] shadow-md bg-[var(--color-surface)] rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-lime-600 dark:text-lime-400" /> Schedule On-Site Field Visit
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <FormField label="Customer / Client">
                <Select value={form.customerId} onValueChange={v => { if (v !== null) { setF('customerId', v); setF('customerName', custName(customers, v)); } }}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Visit Type">
              <Select value={form.visitType} onValueChange={v => v !== null && setF('visitType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VISIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>

            <FormField label="Contact Person">
              <Input value={form.contactName} onChange={e => setF('contactName', e.target.value)} placeholder="e.g. John Smith" />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Purpose / Scope">
                <Input value={form.purpose} onChange={e => setF('purpose', e.target.value)} placeholder="e.g. Quarterly equipment inspection & routine maintenance" />
              </FormField>
            </div>

            <FormField label="Scheduled Date">
              <Input type="date" value={form.scheduledDate} onChange={e => setF('scheduledDate', e.target.value)} />
            </FormField>

            <FormField label="Location / Site Address">
              <Input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="e.g. Plant 4, Sector I-9" />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Assigned Technician / Lead">
                <Select value={form.assignedTo} onValueChange={v => v !== null && setF('assignedTo', v)}>
                  <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === 'Active').map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({(e as any).role || (e as any).jobTitle || 'Field Engineer'})</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Preliminary Notes / Checklist">
                <Input value={form.findings} onChange={e => setF('findings', e.target.value)} placeholder="e.g. Bring safety harness, multimeters, and calibration kit" />
              </FormField>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || !form.purpose} className="bg-lime-600 hover:bg-lime-700 text-white">
              <Save className="mr-1.5 h-4 w-4" /> Schedule Visit
            </Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden border border-[var(--color-border)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-lime-500/[0.05] dark:bg-lime-400/[0.07]">
                <th className="text-left p-3.5 font-semibold w-[120px]">Visit #</th>
                <th className="text-left p-3.5 font-semibold min-w-[220px] w-[26%]">Customer / Client</th>
                <th className="text-left p-3.5 font-semibold min-w-[200px]">Purpose & Scope</th>
                <th className="text-left p-3.5 font-semibold min-w-[120px]">Date</th>
                <th className="text-left p-3.5 font-semibold min-w-[180px] w-[20%]">Assigned Technician</th>
                <th className="text-center p-3.5 font-semibold w-[110px]">Status</th>
                <th className="text-right p-3.5 font-semibold w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visits.map(v => (
                <tr key={v.id} className="border-b border-[var(--color-border-subtle)] hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-mono font-medium text-xs">{v.visitNumber}</td>
                  <td className="p-3.5 min-w-[220px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs">
                        {v.customerName?.[0] || 'C'}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--color-text-strong)]">{v.customerName || '—'}</p>
                        <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-blue-600 dark:text-blue-400">{v.visitType}</span>
                          {v.contactName && <span>· {v.contactName}</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 min-w-[200px]">
                    <p className="line-clamp-2 text-xs font-medium text-[var(--color-text)]">{v.purpose}</p>
                    {v.location && <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">📍 {v.location}</p>}
                  </td>
                  <td className="p-3.5 text-xs font-medium text-[var(--color-text)]">{v.scheduledDate}</td>
                  <td className="p-3.5 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {empName(employees, v.assignedTo)?.[0] || 'U'}
                      </div>
                      <span className="font-medium text-xs text-[var(--color-text-strong)]">{empName(employees, v.assignedTo)}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-center"><StatusChip status={v.status} label={v.status} hex={visitStatusHex[v.status] ?? '#94a3b8'} /></td>
                  <td className="p-3.5 text-right">
                    {v.status === 'Scheduled' && <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-50" onClick={() => setVisitStatus(v.id, 'InProgress')}>Start</Button>}
                    {v.status === 'InProgress' && <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50" onClick={() => setVisitStatus(v.id, 'Completed')}>Complete</Button>}
                  </td>
                </tr>
              ))}
              {visits.length === 0 && <tr><td colSpan={7}><EmptyState icon={CalendarCheck2} title="No field visits found" hint="Schedule an on-site visit to dispatch field teams." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Inspections ──────────────────────────────────────────────────────────────
export function InspectionsView({ activeEntityId }: { activeEntityId?: string }) {
  const { inspections, employees, createInspection, setInspectionStatus } = useFieldData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_INSPECTION);
  const [saving, setSaving] = useState(false);
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await createInspection({ inspectionType: form.inspectionType, location: form.location, scheduledDate: form.scheduledDate, inspectorId: form.inspectorId || null, status: form.status, score: Number(form.score) || 0, findings: form.findings, reference: form.reference || null, companyId: activeEntityId || null });
      setForm(EMPTY_INSPECTION);
      setShowForm(false);
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 via-lime-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-lime-400 to-green-700" />
              <div className="absolute inset-0 flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Inspections</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-lime-500/25 bg-lime-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" /> Live Ledger
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Schedule and record field inspection results</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => setShowForm(v => !v)}><Plus className="mr-2 h-4 w-4" /> Schedule Inspection</Button>
          </div>
        </div>
      </div>

      <KpiGrid cols={4}>
        <KpiCard icon={ShieldCheck} label="Total Inspections" value={inspections.length} desc="All time inspections" tone="teal" />
        <KpiCard icon={Clock3} label="Scheduled" value={inspections.filter(i => i.status === 'Scheduled').length} desc="Awaiting inspection" tone="blue" />
        <KpiCard icon={CheckCircle2} label="Passed" value={inspections.filter(i => i.status === 'Passed').length} desc="Passed inspections" tone="emerald" />
        <KpiCard icon={AlertTriangle} label="Failed" value={inspections.filter(i => i.status === 'Failed').length} desc="Failed inspections" tone="rose" />
      </KpiGrid>
      {showForm && (
        <Card className="p-5 border border-[var(--color-border)] shadow-md bg-[var(--color-surface)] rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-lime-600 dark:text-lime-400" /> Schedule Field Inspection
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <FormField label="Inspection Type">
              <Select value={form.inspectionType} onValueChange={v => v !== null && setF('inspectionType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INSPECTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>

            <FormField label="Location / Facility">
              <Input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="e.g. Warehouse 3 / Site A" />
            </FormField>

            <FormField label="Scheduled Date">
              <Input type="date" value={form.scheduledDate} onChange={e => setF('scheduledDate', e.target.value)} />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Assigned Inspector / Engineer">
                <Select value={form.inspectorId} onValueChange={v => v !== null && setF('inspectorId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select inspector" /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === 'Active').map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({(e as any).role || (e as any).jobTitle || 'Inspector'})</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Reference / Work Order / Asset">
                <Input value={form.reference} onChange={e => setF('reference', e.target.value)} placeholder="e.g. WO-2026-0042 or Asset #AST-882" />
              </FormField>
            </div>

            <div className="md:col-span-4">
              <FormField label="Inspection Scope / Initial Findings">
                <Input value={form.findings} onChange={e => setF('findings', e.target.value)} placeholder="e.g. ISO 9001 quality check and safety seal verification" />
              </FormField>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || !form.location} className="bg-lime-600 hover:bg-lime-700 text-white">
              <Save className="mr-1.5 h-4 w-4" /> Schedule Inspection
            </Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden border border-[var(--color-border)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-lime-500/[0.05] dark:bg-lime-400/[0.07]">
                <th className="text-left p-3.5 font-semibold w-[120px]">Inspection #</th>
                <th className="text-left p-3.5 font-semibold min-w-[140px]">Type</th>
                <th className="text-left p-3.5 font-semibold min-w-[200px] w-[26%]">Location & Reference</th>
                <th className="text-left p-3.5 font-semibold min-w-[120px]">Date</th>
                <th className="text-left p-3.5 font-semibold min-w-[180px] w-[20%]">Inspector</th>
                <th className="text-right p-3.5 font-semibold min-w-[90px]">Score</th>
                <th className="text-center p-3.5 font-semibold w-[110px]">Status</th>
                <th className="text-right p-3.5 font-semibold w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map(i => (
                <tr key={i.id} className="border-b border-[var(--color-border-subtle)] hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-mono font-medium text-xs">{i.inspectionNumber}</td>
                  <td className="p-3.5"><Badge variant="outline">{i.inspectionType}</Badge></td>
                  <td className="p-3.5 min-w-[200px]">
                    <p className="font-bold text-[var(--color-text-strong)]">{i.location || '—'}</p>
                    {i.reference && <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">Ref: {i.reference}</p>}
                  </td>
                  <td className="p-3.5 text-xs font-medium text-[var(--color-text)]">{i.scheduledDate}</td>
                  <td className="p-3.5 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {empName(employees, i.inspectorId)?.[0] || 'U'}
                      </div>
                      <span className="font-medium text-xs text-[var(--color-text-strong)]">{empName(employees, i.inspectorId)}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-right font-mono font-semibold">{i.score > 0 ? `${i.score}%` : '—'}</td>
                  <td className="p-3.5 text-center"><StatusChip status={i.status} label={i.status} hex={inspectionStatusHex[i.status] ?? '#94a3b8'} /></td>
                  <td className="p-3.5 text-right">
                    {i.status === 'Scheduled' && <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-50" onClick={() => setInspectionStatus(i.id, 'InProgress')}>Start</Button>}
                    {i.status === 'InProgress' && <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50" onClick={() => setInspectionStatus(i.id, 'Passed')}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Pass</Button>}
                    {i.status === 'InProgress' && <Button size="sm" variant="outline" className="h-7 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-50" onClick={() => setInspectionStatus(i.id, 'Failed')}>Fail</Button>}
                  </td>
                </tr>
              ))}
              {inspections.length === 0 && <tr><td colSpan={8}><EmptyState icon={ShieldCheck} title="No inspections found" hint="Schedule field inspections to track quality and compliance." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Work Orders ──────────────────────────────────────────────────────────────
export function WorkOrdersView({ activeEntityId }: { activeEntityId?: string }) {
  const { workOrders, customers, employees, createWorkOrder, setWorkOrderStatus } = useFieldData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_WORK_ORDER);
  const [saving, setSaving] = useState(false);
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await createWorkOrder({ workType: form.workType, customerId: form.customerId || null, customerName: form.customerName, description: form.description, priority: form.priority, status: form.status, assignedTo: form.assignedTo || null, scheduledDate: form.scheduledDate, completedDate: null, laborHours: Number(form.laborHours) || 0, laborCost: Number(form.laborCost) || 0, partsCost: Number(form.partsCost) || 0, location: form.location, companyId: activeEntityId || null });
      setForm(EMPTY_WORK_ORDER);
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const totalCost = workOrders.reduce((s, w) => s + w.totalCost, 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 via-lime-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-lime-400 to-green-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Wrench className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Work Orders</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-lime-500/25 bg-lime-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" /> Live Ledger
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Create, assign, and complete field work orders</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => setShowForm(v => !v)}><Plus className="mr-2 h-4 w-4" /> New Work Order</Button>
          </div>
        </div>
      </div>

      <KpiGrid cols={4}>
        <KpiCard icon={Wrench} label="Total Orders" value={workOrders.length} desc="All time orders" tone="teal" />
        <KpiCard icon={Clock3} label="Open" value={workOrders.filter(w => w.status === 'Open').length} desc="Awaiting assignment" tone="blue" />
        <KpiCard icon={TrendingUp} label="In Progress" value={workOrders.filter(w => w.status === 'Assigned' || w.status === 'InProgress').length} desc="Currently active" tone="amber" />
        <KpiCard icon={Wallet} label="Total Cost" value={money(totalCost)} desc="Combined costs" tone="purple" />
      </KpiGrid>
      {showForm && (
        <Card className="p-5 border border-[var(--color-border)] shadow-md bg-[var(--color-surface)] rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-lime-600 dark:text-lime-400" /> Create Field Work Order
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <FormField label="Customer / Client">
                <Select value={form.customerId} onValueChange={v => { if (v !== null) { setF('customerId', v); setF('customerName', custName(customers, v)); } }}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Work Type">
              <Select value={form.workType} onValueChange={v => v !== null && setF('workType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WORK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>

            <FormField label="Priority">
              <Select value={form.priority} onValueChange={v => v !== null && setF('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Work Description">
                <Input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="e.g. Hydraulic pump overhaul and gasket replacement" />
              </FormField>
            </div>

            <FormField label="Scheduled Date">
              <Input type="date" value={form.scheduledDate} onChange={e => setF('scheduledDate', e.target.value)} />
            </FormField>

            <FormField label="Location / Site">
              <Input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="e.g. Unit 4, Industrial Zone" />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Assigned Technician / Specialist">
                <Select value={form.assignedTo} onValueChange={v => v !== null && setF('assignedTo', v)}>
                  <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === 'Active').map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({(e as any).role || (e as any).jobTitle || 'Technician'})</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Est. Labor Hours">
              <Input type="number" value={form.laborHours} onChange={e => setF('laborHours', e.target.value)} placeholder="4" />
            </FormField>

            <FormField label="Est. Labor Cost">
              <Input type="number" value={form.laborCost} onChange={e => setF('laborCost', e.target.value)} placeholder="250.00" />
            </FormField>

            <FormField label="Est. Parts Cost">
              <Input type="number" value={form.partsCost} onChange={e => setF('partsCost', e.target.value)} placeholder="120.00" />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || !form.description} className="bg-lime-600 hover:bg-lime-700 text-white">
              <Save className="mr-1.5 h-4 w-4" /> Create Work Order
            </Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden border border-[var(--color-border)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-lime-500/[0.05] dark:bg-lime-400/[0.07]">
                <th className="text-left p-3.5 font-semibold w-[120px]">Work Order #</th>
                <th className="text-left p-3.5 font-semibold min-w-[220px] w-[26%]">Customer / Client</th>
                <th className="text-left p-3.5 font-semibold min-w-[200px]">Description & Scope</th>
                <th className="text-center p-3.5 font-semibold w-[100px]">Priority</th>
                <th className="text-right p-3.5 font-semibold min-w-[100px]">Est. Cost</th>
                <th className="text-left p-3.5 font-semibold min-w-[180px] w-[18%]">Assigned Lead</th>
                <th className="text-center p-3.5 font-semibold w-[110px]">Status</th>
                <th className="text-right p-3.5 font-semibold w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map(w => (
                <tr key={w.id} className="border-b border-[var(--color-border-subtle)] hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-mono font-medium text-xs">{w.workOrderNumber}</td>
                  <td className="p-3.5 min-w-[220px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">
                        {w.customerName?.[0] || 'C'}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--color-text-strong)]">{w.customerName || '—'}</p>
                        <p className="text-xs text-[var(--color-text-muted)] font-medium text-amber-600 dark:text-amber-400 mt-0.5">{w.workType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 min-w-[200px]">
                    <p className="line-clamp-2 text-xs font-medium text-[var(--color-text)]">{w.description}</p>
                    {w.location && <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">📍 {w.location}</p>}
                  </td>
                  <td className="p-3.5 text-center"><Badge variant={w.priority === 'High' || w.priority === 'Critical' ? 'destructive' : 'outline'}>{w.priority}</Badge></td>
                  <td className="p-3.5 text-right font-mono font-bold">{money(w.totalCost)}</td>
                  <td className="p-3.5 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {empName(employees, w.assignedTo)?.[0] || 'U'}
                      </div>
                      <span className="font-medium text-xs text-[var(--color-text-strong)]">{empName(employees, w.assignedTo)}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-center"><StatusChip status={w.status} label={w.status} hex={woStatusHex[w.status] ?? '#94a3b8'} /></td>
                  <td className="p-3.5 text-right">
                    {w.status === 'Open' && <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-50" onClick={() => setWorkOrderStatus(w.id, 'Assigned')}>Assign</Button>}
                    {w.status === 'Assigned' && <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-50" onClick={() => setWorkOrderStatus(w.id, 'InProgress')}>Start</Button>}
                    {w.status === 'InProgress' && <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50" onClick={() => setWorkOrderStatus(w.id, 'Completed')}>Complete</Button>}
                  </td>
                </tr>
              ))}
              {workOrders.length === 0 && <tr><td colSpan={8}><EmptyState icon={Wrench} title="No work orders found" hint="Create a field work order to assign and track jobs." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Field Expenses ────────────────────────────────────────────────────────────
export function FieldExpensesView({ activeEntityId }: { activeEntityId?: string }) {
  const { workOrders, expenses, createExpense } = useFieldData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await createExpense({ workOrderId: form.workOrderId || null, category: form.category, description: form.description, amount: Number(form.amount) || 0, currency: form.currency, expenseDate: form.expenseDate, reimbursed: form.reimbursed, companyId: activeEntityId || null });
      setForm(EMPTY_EXPENSE);
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const getWo = (id?: string) => workOrders.find(w => w.id === id);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 via-lime-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-lime-400 to-green-700" />
              <div className="absolute inset-0 flex items-center justify-center"><ReceiptText className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Field Expenses</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-lime-500/25 bg-lime-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" /> Live Ledger
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Log and reimburse field operation expenses</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => setShowForm(v => !v)}><Plus className="mr-2 h-4 w-4" /> Log Expense</Button>
          </div>
        </div>
      </div>

      <KpiGrid cols={4}>
        <KpiCard icon={ReceiptText} label="Total Expenses" value={expenses.length} desc="All time expenses" tone="teal" />
        <KpiCard icon={Wallet} label="Total Amount" value={money(total)} desc="Combined expenses" tone="blue" />
        <KpiCard icon={CheckCircle2} label="Reimbursed" value={expenses.filter(e => e.reimbursed).length} desc="Processed expenses" tone="emerald" />
        <KpiCard icon={AlertTriangle} label="Pending" value={expenses.filter(e => !e.reimbursed).length} desc="Awaiting reimbursement" tone="amber" />
      </KpiGrid>
      {showForm && (
        <Card className="p-5 border border-[var(--color-border)] shadow-md bg-[var(--color-surface)] rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-lime-600 dark:text-lime-400" /> Log Field Operation Expense
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <FormField label="Linked Work Order (Optional)">
                <Select value={form.workOrderId} onValueChange={v => v !== null && setF('workOrderId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select work order" /></SelectTrigger>
                  <SelectContent>{workOrders.map(w => <SelectItem key={w.id} value={w.id}>{w.workOrderNumber} · {w.workType} ({w.customerName})</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Expense Category">
              <Select value={form.category} onValueChange={v => v !== null && setF('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>

            <FormField label="Amount">
              <Input type="number" value={form.amount} onChange={e => setF('amount', e.target.value)} placeholder="0.00" />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Description / Merchant / Purpose">
                <Input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="e.g. Fuel receipt for site dispatch to Apex Industrial" />
              </FormField>
            </div>

            <FormField label="Expense Date">
              <Input type="date" value={form.expenseDate} onChange={e => setF('expenseDate', e.target.value)} />
            </FormField>

            <FormField label="Reimbursement Status">
              <Select value={form.reimbursed ? 'yes' : 'no'} onValueChange={v => setF('reimbursed', v === 'yes')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Pending Reimbursement</SelectItem>
                  <SelectItem value="yes">Reimbursed</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || !form.description} className="bg-lime-600 hover:bg-lime-700 text-white">
              <Save className="mr-1.5 h-4 w-4" /> Log Expense
            </Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden border border-[var(--color-border)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-lime-500/[0.05] dark:bg-lime-400/[0.07]">
                <th className="text-left p-3.5 font-semibold w-[120px]">Expense #</th>
                <th className="text-left p-3.5 font-semibold min-w-[200px] w-[24%]">Linked Work Order</th>
                <th className="text-left p-3.5 font-semibold min-w-[120px]">Category</th>
                <th className="text-left p-3.5 font-semibold min-w-[220px]">Description & Merchant</th>
                <th className="text-left p-3.5 font-semibold min-w-[120px]">Date</th>
                <th className="text-right p-3.5 font-semibold min-w-[100px]">Amount</th>
                <th className="text-center p-3.5 font-semibold w-[120px]">Reimbursed</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="border-b border-[var(--color-border-subtle)] hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-mono font-medium text-xs">{e.expenseNumber}</td>
                  <td className="p-3.5 min-w-[200px]">
                    {getWo(e.workOrderId) ? (
                      <div>
                        <p className="font-bold text-[var(--color-text-strong)]">{getWo(e.workOrderId)!.workOrderNumber}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{getWo(e.workOrderId)!.workType} · {getWo(e.workOrderId)!.customerName}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">General Field Cost</span>
                    )}
                  </td>
                  <td className="p-3.5"><Badge variant="outline">{e.category}</Badge></td>
                  <td className="p-3.5 text-xs text-[var(--color-text-strong)] font-medium min-w-[220px]">{e.description}</td>
                  <td className="p-3.5 text-xs text-[var(--color-text-muted)]">{e.expenseDate}</td>
                  <td className="p-3.5 text-right font-mono font-bold">{money(e.amount)}</td>
                  <td className="p-3.5 text-center">{e.reimbursed ? <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Reimbursed</Badge> : <Badge variant="outline" className="text-amber-600 border-amber-500/30">Pending</Badge>}</td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={7}><EmptyState icon={ReceiptText} title="No field expenses found" hint="Log travel, supplies, and other reimbursable field costs." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Field Reports ─────────────────────────────────────────────────────────────
export function FieldReportsView() {
  const { dashboard, surveys, visits, workOrders, inspections, expenses } = useFieldData();
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalCost = workOrders.reduce((s, w) => s + w.totalCost, 0);
  const responses = surveys.reduce((s, x) => s + x.responseCount, 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 via-lime-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-lime-400 to-green-700" />
              <div className="absolute inset-0 flex items-center justify-center"><FileBarChart className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Field Reports</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-lime-500/25 bg-lime-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" /> Live Ledger
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Field operations performance and reporting</p>
            </div>
          </div>
        </div>
      </div>

      <KpiGrid cols={4}>
        <KpiCard icon={ClipboardList} label="Total Surveys" value={surveys.length} desc="All time surveys" tone="teal" />
        <KpiCard icon={CalendarCheck2} label="Total Visits" value={visits.length} desc="All time visits" tone="blue" />
        <KpiCard icon={Wrench} label="Work Order Cost" value={money(totalCost)} desc="Combined costs" tone="amber" />
        <KpiCard icon={ReceiptText} label="Field Expenses" value={money(totalExpenses)} desc="Combined expenses" tone="purple" />
      </KpiGrid>
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Performance Overview</p>
          <div className="space-y-2">
            {[
              { label: 'Survey Responses', value: responses },
              { label: 'Completed Visits', value: dashboard?.completedVisits ?? 0 },
              { label: 'Passed Inspections', value: inspections.filter(i => i.status === 'Passed').length },
              { label: 'Failed Inspections', value: inspections.filter(i => i.status === 'Failed').length },
              { label: 'Open Work Orders', value: dashboard?.openOrders ?? 0 },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-mono font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2"><FileBarChart className="h-4 w-4" /> Cost & Activity</p>
          <div className="space-y-2">
            {[
              { label: 'Total Work Order Cost', value: money(totalCost) },
              { label: 'Total Field Expenses', value: money(totalExpenses) },
              { label: 'Total Visit Cost', value: '—' },
              { label: 'Active Surveys', value: dashboard?.activeSurveys ?? 0 },
              { label: 'Pending Inspections', value: dashboard?.pendingInspections ?? 0 },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-mono font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}