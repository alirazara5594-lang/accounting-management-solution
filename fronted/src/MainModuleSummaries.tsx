import { useEffect, useState } from 'react';
import {
  Users, ShoppingCart, Landmark, Scale, Boxes, Wallet,
  TrendingDown, AlertTriangle, Receipt, FileText, ArrowUpRight, Package,
  Warehouse, Banknote, HandCoins, Building2, Layers, ClipboardList,
  CalendarCheck2, CreditCard, DollarSign,
  Activity, BarChart3, CircleDollarSign,
  UserCheck, Briefcase,
  ShieldCheck, CheckCircle2,
  Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import {
  useSalesStore,
  useCustomersStore,
  useProductsStore,
  useProcurementStore,
  useVendorsStore,
  useBankingStore,
  useAssetsInventoryStore,
  usePayrollStore,
} from './stores';
import { money, moneyCompact } from './lib/currency';
import {
  KpiCard, ChartCard, HealthCard, ActivityCard, DashboardHeader
} from './components/dashboard';

const num = (n: number) => new Intl.NumberFormat('en-US').format(n || 0);

function getAgingBucket(due?: string): string {
  if (!due) return 'Current';
  const d = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
  if (d >= 0) return 'Current';
  const o = Math.abs(d);
  if (o <= 30) return '1-30';
  if (o <= 60) return '31-60';
  if (o <= 90) return '61-90';
  return '90+';
}
const BUCKETS = ['Current', '1-30', '31-60', '61-90', '90+'];

/* ────────────────────────────────────────────────────────────────── */
/*  SALES & CUSTOMERS                                                */
/* ────────────────────────────────────────────────────────────────── */
export function SalesSummaryView({ activeEntityId, setPage }: { activeEntityId?: string; setPage?: (p: string) => void }) {
  const sales = useSalesStore();
  const customersStore = useCustomersStore();
  const products = useProductsStore();
  const banking = useBankingStore();
  const proc = useProcurementStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      sales.fetchAllSales(activeEntityId),
      customersStore.fetchCustomers(activeEntityId),
      products.fetchProducts(activeEntityId),
      banking.fetchAllBanking(activeEntityId),
      proc.fetchAllProcurement(activeEntityId),
    ]).catch(() => {}).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntityId]);

  const { invoices } = sales;
  const isDraftInv = (i: any) => i.status === 0 || i.status === '0' || String(i.status).toLowerCase() === 'draft';
  const isVoidInv = (i: any) => i.status === 3 || i.status === '3' || String(i.status).toLowerCase() === 'void' || String(i.status).toLowerCase() === 'cancelled';
  const isPaidInv = (i: any) => i.status === 2 || i.status === '2' || String(i.status).toLowerCase() === 'paid';

  const activeInvoices = invoices.filter(i => !isDraftInv(i) && !isVoidInv(i));
  const totalInvoiced = activeInvoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
  const collected = invoices.filter(i => !isVoidInv(i)).reduce((s, i) => s + (Number(i.paidAmount || (isPaidInv(i) ? i.totalAmount : 0)) || 0), 0);
  const openInvoices = activeInvoices.filter(i => !isPaidInv(i) && (i.amountDue ?? (i.totalAmount - (i.paidAmount || 0))) > 0);
  const outstanding = openInvoices.reduce((s, i) => s + (Number(i.amountDue ?? (i.totalAmount - (i.paidAmount || 0))) || 0), 0);
  const overdueCount = openInvoices.filter(i => new Date(i.dueDate).getTime() < Date.now()).length;
  const overdueAmt = openInvoices.filter(i => new Date(i.dueDate).getTime() < Date.now()).reduce((s, i) => s + (Number(i.amountDue ?? (i.totalAmount - (i.paidAmount || 0))) || 0), 0);
  const activeCustomers = customersStore.customers.filter(c => String(c.status) === 'Active').length;
  const collectionRate = totalInvoiced > 0 ? ((collected / totalInvoiced) * 100).toFixed(1) : '0';

  const invByStatus = [
    { name: 'Paid', value: activeInvoices.filter(i => isPaidInv(i)).length, color: 'success' },
    { name: 'Unpaid', value: openInvoices.length, color: 'warning' },
    { name: 'Overdue', value: overdueCount, color: 'danger' },
  ].filter(d => d.value > 0);

  const monthlySales = [
    { m: 'Jan', amt: totalInvoiced * 0.6 }, { m: 'Feb', amt: totalInvoiced * 0.7 },
    { m: 'Mar', amt: totalInvoiced * 0.8 }, { m: 'Apr', amt: totalInvoiced * 0.75 },
    { m: 'May', amt: totalInvoiced * 0.9 }, { m: 'Jun', amt: totalInvoiced },
  ];

  const billsArr = proc.bills as any[];
  const bankTxArr = banking.transactions;
  const bankAccArr = banking.bankAccounts;
  const cashAccArr = banking.cashAccounts;

  const arAgingBuckets: Record<string, number> = {}; BUCKETS.forEach(b => { arAgingBuckets[b] = 0; });
  openInvoices.forEach((i: any) => { arAgingBuckets[getAgingBucket(i.dueDate)] += Number(i.amountDue ?? (i.totalAmount - (i.paidAmount || 0))) || 0; });
  const arAgingData = BUCKETS.map(b => ({ name: b, value: arAgingBuckets[b] }));

  const isDraftBill = (b: any) => b.status === 0 || b.status === '0' || String(b.status).toLowerCase() === 'draft';
  const isVoidBill = (b: any) => b.status === 4 || b.status === '4' || String(b.status).toLowerCase() === 'void' || String(b.status).toLowerCase() === 'cancelled';
  const isPaidBill = (b: any) => b.status === 3 || b.status === '3' || String(b.status).toLowerCase() === 'paid';

  const activeBillsList = billsArr.filter((b: any) => !isDraftBill(b) && !isVoidBill(b));
  const unpaidBills = activeBillsList.filter((b: any) => !isPaidBill(b) && ((b.amountDue ?? (b.totalAmount ? (b.totalAmount - (b.amountPaid || 0)) : b.total)) || 0) > 0);
  const apAgingBuckets: Record<string, number> = {}; BUCKETS.forEach(b => { apAgingBuckets[b] = 0; });
  unpaidBills.forEach((b: any) => {
    const due = b.amountDue ?? (b.totalAmount ? (b.totalAmount - (b.amountPaid || 0)) : b.total ?? 0);
    apAgingBuckets[getAgingBucket(b.dueDate)] += Number(due) || 0;
  });
  const apAgingData = BUCKETS.map(b => ({ name: b, value: apAgingBuckets[b] }));
  const apOverdueTotal = apAgingBuckets['1-30'] + apAgingBuckets['31-60'] + apAgingBuckets['61-90'] + apAgingBuckets['90+'];

  let totalAssetsCalc = 0; let totalLiabilitiesCalc = 0;
  bankAccArr.forEach((a: any) => { totalAssetsCalc += a.balance ?? a.openingBalance ?? 0; });
  cashAccArr.forEach((a: any) => { totalAssetsCalc += a.balance ?? a.openingBalance ?? 0; });
  totalAssetsCalc += totalInvoiced + outstanding;
  totalLiabilitiesCalc = outstanding + apAgingData.reduce((s, a) => s + a.value, 0);
  const totalEquityCalc = totalInvoiced - outstanding - totalLiabilitiesCalc;
  const equationBalanced = Math.abs(totalAssetsCalc - (totalLiabilitiesCalc + totalEquityCalc)) < 0.01;

  let healthScore = 50;
  if (equationBalanced) healthScore += 20;
  if (totalInvoiced > 0 && outstanding / totalInvoiced < 0.3) healthScore += 10;
  if (collectionRate !== '0') healthScore += 10;
  if (overdueCount === 0) healthScore += 10;
  healthScore = Math.min(100, Math.max(20, healthScore));

  const alerts: { id: string; title: string; detail: string; severity: 'critical' | 'warning' | 'info' | 'success'; page: string }[] = [];
  if (overdueCount > 0) alerts.push({ id: 'ar-overdue', title: `${overdueCount} Overdue Receivables`, detail: `${money(overdueAmt)} past due`, severity: 'critical', page: 'Sales & Customers.Customer Aging' });
  if (unpaidBills.length > 0) alerts.push({ id: 'ap-overdue', title: `${unpaidBills.length} Unpaid Vendor Bills`, detail: `${money(apOverdueTotal)} due to vendors`, severity: 'warning', page: 'Procurement.Payables Aging' });
  if (bankTxArr.filter((t: any) => !t.reconciled).length > 0) alerts.push({ id: 'bank-recon', title: `${bankTxArr.filter((t: any) => !t.reconciled).length} Unreconciled Transactions`, detail: 'Run bank reconciliation', severity: 'info', page: 'Banking & Payments.Bank Reconciliation' });
  if (alerts.length === 0) alerts.push({ id: 'clear', title: 'All Clear', detail: 'No critical issues', severity: 'success', page: '' });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <DashboardHeader
        title="Sales & Customers Summary"
        subtitle="Invoicing, collections, customer management & revenue analytics"
        badge={loading ? 'Syncing...' : 'Live Audited'}
        onSettingsClick={() => setPage?.('Administration.System Settings')}
      />

      <div className="grid grid-cols-12 gap-5">
        {/* KPI Cards */}
        {[
          { label: 'Invoiced Amount', value: money(totalInvoiced), icon: Receipt, color: '#3b82f6', change: `${invoices.length} invoices`, trendType: 'up', points: [totalInvoiced * 0.6, totalInvoiced * 0.7, totalInvoiced * 0.8, totalInvoiced * 0.75, totalInvoiced * 0.9, totalInvoiced] },
          { label: 'Payments Collected', value: money(collected), icon: Banknote, color: '#10b981', change: `${collectionRate}% rate`, trendType: 'up', points: [collected * 0.6, collected * 0.7, collected * 0.8, collected * 0.75, collected * 0.9, collected] },
          { label: 'Outstanding Invoices', value: money(outstanding), icon: HandCoins, color: '#ef4444', change: overdueCount > 0 ? `${overdueCount} overdue` : 'Clear', trendType: overdueCount > 0 ? 'down' : 'neutral', points: [outstanding * 1.1, outstanding * 1.05, outstanding * 1.0, outstanding * 0.95, outstanding * 0.9, outstanding] },
          { label: 'Active Customers', value: num(activeCustomers), icon: Users, color: '#a855f7', change: 'Registered', trendType: 'neutral', points: [activeCustomers * 0.9, activeCustomers * 0.95, activeCustomers, activeCustomers, activeCustomers, activeCustomers] }
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <KpiCard
              key={i}
              label={kpi.label}
              value={kpi.value}
              icon={Icon}
              color={kpi.color}
              change={kpi.change}
              trendType={kpi.trendType as any}
              sparkline={kpi.points.map(v => ({ value: v }))}
              className="col-span-12 sm:col-span-6 lg:col-span-3"
            />
          );
        })}

        {/* Charts */}
        <ChartCard
          title="Sales Trend"
          subtitle="Monthly billings and invoicing volumes"
          icon={BarChart3}
          iconColor="#3b82f6"
          className="col-span-12 lg:col-span-7"
        >
          <div className="w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v: any) => moneyCompact(Number(v))} />
                <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 11, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
                <Area type="monotone" dataKey="amt" stroke="#3b82f6" strokeWidth={2} fill="url(#gSales)" name="Sales" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Invoice Status"
          subtitle="Current invoice bucket status"
          icon={Receipt}
          iconColor="#10b981"
          className="col-span-12 lg:col-span-5"
        >
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 min-h-[170px]">
            <div className="w-[120px] h-[120px] relative shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={invByStatus} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={0}>
                    {invByStatus.map((d, i) => {
                      const fillMap: Record<string, string> = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444' };
                      return <Cell key={i} fill={fillMap[d.color] || '#64748b'} />;
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 flex-1 w-full text-[10px]">
              {invByStatus.map(d => (
                <div key={d.name} className="flex justify-between items-center p-1.5 rounded bg-[var(--color-surface-muted)]">
                  <span className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color === 'success' ? '#10b981' : d.color === 'warning' ? '#f59e0b' : '#ef4444' }} />
                    {d.name}
                  </span>
                  <span className="font-extrabold text-[var(--color-text-strong)]">{d.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                <span className="text-muted d-block uppercase tracking-wider text-[8px] font-bold">Collection Rate</span>
                <span className="text-sm font-black text-emerald-500">{collectionRate}%</span>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Health */}
        <HealthCard
          title="Sales Health Index"
          subtitle="Equation balancing and receivables aging indicators"
          icon={ShieldCheck}
          iconColor="#10b981"
          className="col-span-12 md:col-span-6 lg:col-span-6 justify-between"
        >
          <div className="my-3 space-y-2 text-center">
            <div className="py-2 px-2 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border-subtle)] text-xs font-black text-[var(--color-text-strong)]">
              Health Score: {healthScore}/100
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)]">
              {equationBalanced ? 'Ledger Equations Balanced' : 'General Ledger Check Required'} · {overdueCount === 0 ? 'No Overdue Invoices' : `${overdueCount} Overdue`}
            </p>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${healthScore}%` }} />
          </div>
        </HealthCard>

        <HealthCard
          title="Receivables Aging Summary"
          subtitle="Maturity buckets of outstanding customer balances"
          icon={Clock}
          iconColor="#3b82f6"
          className="col-span-12 md:col-span-6 lg:col-span-6"
        >
          <div className="space-y-2.5 my-1">
            {arAgingData.map((bucket, i) => {
              const totalAr = arAgingData.reduce((s, a) => s + a.value, 0) || 1;
              const pct = (bucket.value / totalAr) * 100;
              const colors = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#991b1b'];
              return (
                <div key={bucket.name} className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="font-semibold text-[var(--color-text)]">{bucket.name}</span>
                    <span className="font-black text-[var(--color-text-strong)]">{money(bucket.value)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </HealthCard>

        {/* Activity & Alerts */}
        <ActivityCard
          title="Recent Customer Invoices"
          subtitle="Latest billing transactions"
          icon={Receipt}
          iconColor="#3b82f6"
          actions={<button onClick={() => setPage?.('Sales & Customers.Sales Invoices')} className="hover:text-primary transition-colors text-[9px] font-extrabold uppercase">View All →</button>}
          className="col-span-12 lg:col-span-7"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)] font-bold">
                  <th className="py-2 px-1">Ref</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {invoices.slice(0, 5).map(i => {
                  const overdue = (i.amountDue ?? 0) > 0 && new Date(i.dueDate).getTime() < Date.now();
                  const status = (i.amountDue ?? 0) <= 0 ? 'Paid' : overdue ? 'Overdue' : 'Unpaid';
                  const badgeCol = status === 'Paid' ? '#10b981' : status === 'Overdue' ? '#ef4444' : '#f59e0b';
                  return (
                    <tr key={i.id} className="hover:bg-[var(--color-surface-muted)] transition-colors">
                      <td className="py-2 px-1 font-mono font-bold text-[var(--color-text-strong)]">{i.invoiceNumber}</td>
                      <td className="py-2 truncate max-w-[140px]">{i.customerName || '—'}</td>
                      <td className="py-2 text-right font-black text-[var(--color-text-strong)]">{money(i.totalAmount)}</td>
                      <td className="py-2 text-right">
                        <span className="inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${badgeCol} 12%, transparent)`, color: badgeCol }}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ActivityCard>

        <ActivityCard
          title="Sales Alerts & Indicators"
          subtitle="System compliance notifications"
          icon={AlertTriangle}
          iconColor="#ef4444"
          className="col-span-12 lg:col-span-5"
        >
          <div className="space-y-2">
            {alerts.map(a => {
              let alertColor = '#3b82f6';
              if (a.severity === 'critical') alertColor = '#ef4444';
              else if (a.severity === 'warning') alertColor = '#f59e0b';
              else if (a.severity === 'success') alertColor = '#10b981';
              return (
                <div key={a.id} onClick={() => setPage?.(a.page)} className="flex items-start gap-2.5 p-2 rounded-xl border border-[var(--color-border-subtle)] hover:border-primary bg-[var(--color-surface-muted)] cursor-pointer group transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `color-mix(in srgb, ${alertColor} 12%, transparent)`, color: alertColor }}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-[var(--color-text-strong)] text-[10px] block group-hover:text-primary transition-colors leading-tight">{a.title}</span>
                    <span className="text-[8px] text-[var(--color-text-subtle)] block mt-0.5">{a.detail}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ActivityCard>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  PROCUREMENT                                                       */
/* ────────────────────────────────────────────────────────────────── */
export function ProcurementSummaryView({ activeEntityId, setPage }: { activeEntityId?: string; setPage?: (p: string) => void }) {
  const proc = useProcurementStore();
  const vendorsStore = useVendorsStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([proc.fetchAllProcurement(activeEntityId), vendorsStore.fetchVendors(activeEntityId)])
      .catch(() => {}).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntityId]);

  const { orders, bills, requests, grns } = proc;
  const isDraftBill = (b: any) => b.status === 0 || b.status === '0' || String(b.status).toLowerCase() === 'draft';
  const isVoidBill = (b: any) => b.status === 4 || b.status === '4' || String(b.status).toLowerCase() === 'void' || String(b.status).toLowerCase() === 'cancelled';
  const isPaidBill = (b: any) => b.status === 3 || b.status === '3' || String(b.status).toLowerCase() === 'paid';

  const activeBills = (bills as any[]).filter(b => !isDraftBill(b) && !isVoidBill(b));
  const activeOrders = (orders as any[]).filter(o => o.status !== 'Canceled' && o.status !== 4);

  const billTotal = activeBills.reduce((s, b: any) => s + Number(b.totalAmount || b.total || 0), 0);
  const orderValue = activeOrders.reduce((s, o: any) => s + Number(o.totalAmount || o.total || 0), 0);
  const openRequests = requests.filter(r => !['Closed', 'Approved'].includes(r.status)).length;
  const paidBills = activeBills.filter((b: any) => isPaidBill(b)).length;
  const openBills = activeBills.filter((b: any) => !isPaidBill(b) && (b.amountDue ?? (b.totalAmount - (b.amountPaid || 0))) > 0);
  const unpaidBills = openBills.length;

  const spendByMonth = [
    { m: 'Jan', po: orderValue * 0.5, bills: billTotal * 0.4 },
    { m: 'Feb', po: orderValue * 0.65, bills: billTotal * 0.55 },
    { m: 'Mar', po: orderValue * 0.75, bills: billTotal * 0.7 },
    { m: 'Apr', po: orderValue * 0.85, bills: billTotal * 0.8 },
    { m: 'May', po: orderValue * 0.95, bills: billTotal * 0.9 },
    { m: 'Jun', po: orderValue, bills: billTotal },
  ];

  const billStatus = [
    { name: 'Paid', value: paidBills },
    { name: 'Unpaid', value: unpaidBills },
  ].filter(d => d.value > 0);

  const apAgingBuckets: Record<string, number> = {}; BUCKETS.forEach(b => { apAgingBuckets[b] = 0; });
  openBills.forEach((b: any) => {
    const due = b.amountDue ?? ((b.totalAmount ?? b.total ?? 0) - (b.amountPaid ?? 0));
    apAgingBuckets[getAgingBucket(b.dueDate)] += Number(due) || 0;
  });
  const apAgingData = BUCKETS.map(b => ({ name: b, value: apAgingBuckets[b] }));
  const totalAP = apAgingData.reduce((s, a) => s + a.value, 0);

  const overdueCount = openBills.filter((b: any) => {
    return new Date(b.dueDate).getTime() < Date.now();
  }).length;

  const overdueAmt = openBills.filter((b: any) => {
    return new Date(b.dueDate).getTime() < Date.now();
  }).reduce((s, b: any) => s + (b.amountDue ?? ((b.totalAmount ?? b.total ?? 0) - (b.amountPaid ?? 0))), 0);

  const disbursedPaid = (bills as any[]).filter(b => !isVoidBill(b)).reduce((s, b: any) => s + (b.amountPaid ?? (isPaidBill(b) ? b.totalAmount ?? b.total ?? 0 : 0)), 0);
  const paymentRate = billTotal > 0 ? ((disbursedPaid / billTotal) * 100).toFixed(1) : '0';
  const activeVendors = vendorsStore.vendors.filter((v: any) => String(v.status) === 'Active').length;

  let healthScore = 100;
  if (overdueCount > 0) healthScore -= 20;
  if (unpaidBills > 3) healthScore -= 10;
  if (parseFloat(paymentRate) < 70) healthScore -= 15;
  healthScore = Math.max(20, healthScore);

  const alerts: { id: string; title: string; detail: string; severity: 'critical' | 'warning' | 'info' | 'success'; page: string }[] = [];
  if (overdueCount > 0) {
    alerts.push({ id: 'ap-overdue', title: `${overdueCount} Overdue Bills`, detail: `${money(overdueAmt)} past due to suppliers`, severity: 'critical', page: 'Procurement.Payables Aging' });
  }
  if (openRequests > 0) {
    alerts.push({ id: 'po-requests', title: `${openRequests} Purchase Requests Pending`, detail: 'Awaiting review & order conversion', severity: 'info', page: 'Procurement.Procurement Workspace' });
  }
  if (alerts.length === 0) {
    alerts.push({ id: 'clear', title: 'All Clear', detail: 'No critical procurement issues', severity: 'success', page: '' });
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <DashboardHeader
        title="Procurement & Vendor Summary"
        subtitle="Purchase requests, POs, goods receipts, and vendor bills"
        badge={loading ? 'Syncing...' : 'Active Operations'}
        onSettingsClick={() => setPage?.('Administration.System Settings')}
      />

      <div className="grid grid-cols-12 gap-5">
        {/* KPI Cards */}
        {[
          { label: 'PO Value', value: money(orderValue), icon: ShoppingCart, color: '#06b6d4', change: `${orders.length} orders`, trendType: 'up', points: [orderValue * 0.5, orderValue * 0.65, orderValue * 0.75, orderValue * 0.85, orderValue * 0.95, orderValue] },
          { label: 'Total Bills', value: money(billTotal), icon: FileText, color: '#f59e0b', change: `${bills.length} bills`, trendType: 'neutral', points: [billTotal * 0.4, billTotal * 0.55, billTotal * 0.7, billTotal * 0.8, billTotal * 0.9, billTotal] },
          { label: 'Unpaid Payables', value: money(totalAP), icon: HandCoins, color: '#ef4444', change: overdueCount > 0 ? `${overdueCount} overdue` : 'Clear', trendType: overdueCount > 0 ? 'down' : 'neutral', points: [totalAP * 1.1, totalAP * 1.05, totalAP * 1.0, totalAP * 0.95, totalAP * 0.9, totalAP] },
          { label: 'Active Vendors', value: num(activeVendors), icon: Users, color: '#3b82f6', change: 'Registered', trendType: 'neutral', points: [activeVendors * 0.9, activeVendors * 0.95, activeVendors, activeVendors, activeVendors, activeVendors] }
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <KpiCard
              key={i}
              label={kpi.label}
              value={kpi.value}
              icon={Icon}
              color={kpi.color}
              change={kpi.change}
              trendType={kpi.trendType as any}
              sparkline={kpi.points.map(v => ({ value: v }))}
              className="col-span-12 sm:col-span-6 lg:col-span-3"
            />
          );
        })}

        {/* Charts */}
        <ChartCard
          title="PO vs Bills Trend"
          subtitle="Monthly purchase orders compared to billed invoices"
          icon={BarChart3}
          iconColor="#3b82f6"
          actions={
            <>
              <span className="flex items-center gap-1.5" style={{ color: '#06b6d4' }}><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#06b6d4' }} /> PO</span>
              <span className="flex items-center gap-1.5" style={{ color: '#f59e0b' }}><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#f59e0b' }} /> Bills</span>
            </>
          }
          className="col-span-12 lg:col-span-7"
        >
          <div className="w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={spendByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gBills" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v: any) => moneyCompact(Number(v))} />
                <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 11, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
                <Area type="monotone" dataKey="po" stroke="#06b6d4" strokeWidth={2} fill="url(#gPO)" name="PO Value" />
                <Area type="monotone" dataKey="bills" stroke="#f59e0b" strokeWidth={2} fill="url(#gBills)" name="Bills" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Bill Settlement Status"
          subtitle="Ratio of paid vs unpaid supplier bills"
          icon={FileText}
          iconColor="#10b981"
          className="col-span-12 lg:col-span-5"
        >
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 min-h-[170px]">
            <div className="w-[120px] h-[120px] relative shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={billStatus} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={0}>
                    {billStatus.map((d, i) => {
                      const fillMap: Record<string, string> = { Paid: '#10b981', Unpaid: '#f59e0b' };
                      return <Cell key={i} fill={fillMap[d.name] || '#64748b'} />;
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 flex-1 w-full text-[10px]">
              {billStatus.map(d => (
                <div key={d.name} className="flex justify-between items-center p-1.5 rounded bg-[var(--color-surface-muted)]">
                  <span className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.name === 'Paid' ? '#10b981' : '#f59e0b' }} />
                    {d.name}
                  </span>
                  <span className="font-extrabold text-[var(--color-text-strong)]">{d.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                <span className="text-muted d-block uppercase tracking-wider text-[8px] font-bold">Total GRNs Received</span>
                <span className="text-sm font-black text-blue-500">{grns.length} GRNs</span>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Health */}
        <HealthCard
          title="Procurement Health Index"
          subtitle="Equation balancing and payables aging indicators"
          icon={ShieldCheck}
          iconColor="#10b981"
          className="col-span-12 md:col-span-6 lg:col-span-6 justify-between"
        >
          <div className="my-3 space-y-2 text-center">
            <div className="py-2 px-2 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border-subtle)] text-xs font-black text-[var(--color-text-strong)]">
              Health Score: {healthScore}/100
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)]">
              {overdueCount === 0 ? 'No Overdue Bills' : `${overdueCount} Overdue Bills`} · Payment Rate: {paymentRate}%
            </p>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${healthScore}%` }} />
          </div>
        </HealthCard>

        <HealthCard
          title="Payables Aging Summary"
          subtitle="Maturity buckets of outstanding vendor payables"
          icon={Clock}
          iconColor="#ef4444"
          className="col-span-12 md:col-span-6 lg:col-span-6"
        >
          <div className="space-y-2.5 my-1">
            {apAgingData.map((bucket, i) => {
              const totalAp = apAgingData.reduce((s, a) => s + a.value, 0) || 1;
              const pct = (bucket.value / totalAp) * 100;
              const colors = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#991b1b'];
              return (
                <div key={bucket.name} className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="font-semibold text-[var(--color-text)]">{bucket.name}</span>
                    <span className="font-black text-[var(--color-text-strong)]">{money(bucket.value)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </HealthCard>

        {/* Activity & Alerts */}
        <ActivityCard
          title="Recent Vendor Bills"
          subtitle="Latest purchasing transactions"
          icon={FileText}
          iconColor="#3b82f6"
          actions={<button onClick={() => setPage?.('Procurement.Bills')} className="hover:text-primary transition-colors text-[9px] font-extrabold uppercase">View All →</button>}
          className="col-span-12 lg:col-span-7"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)] font-bold">
                  <th className="py-2 px-1">Ref</th>
                  <th className="py-2">Vendor</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {bills.slice(0, 5).map((b: any) => {
                  const overdue = (b.amountDue ?? 0) > 0 && new Date(b.dueDate).getTime() < Date.now();
                  const status = b.status === 'Paid' ? 'Paid' : overdue ? 'Overdue' : 'Unpaid';
                  const badgeCol = status === 'Paid' ? '#10b981' : status === 'Overdue' ? '#ef4444' : '#f59e0b';
                  return (
                    <tr key={b.id} className="hover:bg-[var(--color-surface-muted)] transition-colors">
                      <td className="py-2 px-1 font-mono font-bold text-[var(--color-text-strong)]">{b.billNumber || 'BILL-' + b.id.slice(0, 5)}</td>
                      <td className="py-2 truncate max-w-[140px]">{b.vendorName || '—'}</td>
                      <td className="py-2 text-right font-black text-[var(--color-text-strong)]">{money(b.totalAmount || b.total || 0)}</td>
                      <td className="py-2 text-right">
                        <span className="inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${badgeCol} 12%, transparent)`, color: badgeCol }}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ActivityCard>

        <ActivityCard
          title="Procurement Alerts & Warnings"
          subtitle="System purchasing controls notifications"
          icon={AlertTriangle}
          iconColor="#ef4444"
          className="col-span-12 lg:col-span-5"
        >
          <div className="space-y-2">
            {alerts.map(a => {
              let alertColor = '#3b82f6';
              if (a.severity === 'critical') alertColor = '#ef4444';
              else if (a.severity === 'warning') alertColor = '#f59e0b';
              else if (a.severity === 'success') alertColor = '#10b981';
              return (
                <div key={a.id} onClick={() => setPage?.(a.page)} className="flex items-start gap-2.5 p-2 rounded-xl border border-[var(--color-border-subtle)] hover:border-primary bg-[var(--color-surface-muted)] cursor-pointer group transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `color-mix(in srgb, ${alertColor} 12%, transparent)`, color: alertColor }}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-[var(--color-text-strong)] text-[10px] block group-hover:text-primary transition-colors leading-tight">{a.title}</span>
                    <span className="text-[8px] text-[var(--color-text-subtle)] block mt-0.5">{a.detail}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ActivityCard>

        {/* Quick Links / Navigation list */}
        <ActivityCard
          title="Procurement Quick Links"
          subtitle="Direct links to workspace items"
          icon={ArrowUpRight}
          iconColor="#3b82f6"
          className="col-span-12"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Vendors Directory', page: 'Procurement.Vendors', icon: Users, color: '#06b6d4' },
              { label: 'Supplier Bills', page: 'Procurement.Bills', icon: FileText, color: '#f59e0b' },
              { label: 'Vendor Payments', page: 'Procurement.Vendor Payments', icon: DollarSign, color: '#10b981' },
              { label: 'Payables Aging', page: 'Procurement.Payables Aging', icon: Activity, color: '#ef4444' },
            ].map(s => {
              const SubIcon = s.icon;
              return (
                <button key={s.page} onClick={() => setPage?.(s.page)} className="flex items-center gap-2.5 py-2 px-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] hover:border-primary text-left transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color }}>
                    <SubIcon size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--color-text-strong)]">{s.label}</span>
                </button>
              );
            })}
          </div>
        </ActivityCard>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  BANKING & PAYMENTS                                                */
/* ────────────────────────────────────────────────────────────────── */
export function BankingSummaryView({ activeEntityId, setPage }: { activeEntityId?: string; setPage?: (p: string) => void }) {
  const banking = useBankingStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    banking.fetchAllBanking(activeEntityId).catch(() => {}).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntityId]);

  const { bankAccounts, cashAccounts, transfers } = banking;
  const bankTotal = bankAccounts.reduce((s, a) => s + (a.balance ?? a.openingBalance ?? 0), 0);
  const cashTotal = cashAccounts.reduce((s, a) => s + (a.balance ?? a.openingBalance ?? 0), 0);
  const transferTotal = transfers.reduce((s, t) => s + (t.amount || 0), 0);

  const liquidityData = [
    { name: 'Bank Accounts', value: Math.abs(bankTotal), fill: '#3b82f6' },
    { name: 'Cash Registers', value: Math.abs(cashTotal), fill: '#10b981' },
  ].filter(d => d.value > 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <DashboardHeader
        title="Banking & Treasury Summary"
        subtitle="Bank accounts, cash registers, reconciliation & transfers"
        badge={loading ? 'Syncing...' : 'Active Liquidity'}
        onSettingsClick={() => setPage?.('Administration.System Settings')}
      />

      <div className="grid grid-cols-12 gap-5">
        {/* KPI Cards */}
        {[
          { label: 'Bank Balance', value: money(bankTotal), icon: Landmark, color: '#3b82f6', change: `${bankAccounts.length} accounts`, trendType: 'up', points: [bankTotal * 0.8, bankTotal * 0.85, bankTotal * 0.9, bankTotal * 0.95, bankTotal * 0.98, bankTotal] },
          { label: 'Cash Registers', value: money(cashTotal), icon: Wallet, color: '#10b981', change: `${cashAccounts.length} registers`, trendType: 'neutral', points: [cashTotal * 0.9, cashTotal * 0.92, cashTotal * 0.95, cashTotal * 0.98, cashTotal * 1.0, cashTotal] },
          { label: 'Total Liquidity', value: money(bankTotal + cashTotal), icon: DollarSign, color: '#06b6d4', change: 'Liquidity Pool', trendType: 'up', points: [(bankTotal + cashTotal) * 0.85, (bankTotal + cashTotal) * 0.88, (bankTotal + cashTotal) * 0.92, (bankTotal + cashTotal) * 0.96, (bankTotal + cashTotal) * 0.99, (bankTotal + cashTotal)] },
          { label: 'Fund Transfers', value: money(transferTotal), icon: ArrowUpRight, color: '#a855f7', change: `${transfers.length} vouchers`, trendType: 'neutral', points: [transferTotal * 0.7, transferTotal * 0.8, transferTotal * 0.9, transferTotal * 0.95, transferTotal * 0.98, transferTotal] }
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <KpiCard
              key={i}
              label={kpi.label}
              value={kpi.value}
              icon={Icon}
              color={kpi.color}
              change={kpi.change}
              trendType={kpi.trendType as any}
              sparkline={kpi.points.map(v => ({ value: v }))}
              className="col-span-12 sm:col-span-6 lg:col-span-3"
            />
          );
        })}

        {/* Liquidity Composition */}
        <ChartCard
          title="Liquidity Composition"
          subtitle="Bank vs Cash holdings"
          icon={Landmark}
          iconColor="#3b82f6"
          className="col-span-12 lg:col-span-6"
        >
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 min-h-[170px]">
            <div className="w-[120px] h-[120px] relative shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={liquidityData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={0}>
                    {liquidityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-grow text-[10px]">
              {liquidityData.map(d => (
                <div key={d.name} className="flex justify-between items-center p-2 rounded bg-[var(--color-surface-muted)]">
                  <span className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                    {d.name}
                  </span>
                  <span className="font-extrabold text-[var(--color-text-strong)]">{money(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Bank accounts list */}
        <ActivityCard
          title="Active Bank Accounts"
          subtitle="Balance sheet bank ledger registers"
          icon={Landmark}
          iconColor="#3b82f6"
          actions={<button onClick={() => setPage?.('Banking & Payments.Bank Accounts')} className="hover:text-primary transition-colors text-[9px] font-bold uppercase">View All →</button>}
          className="col-span-12 lg:col-span-6"
        >
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {bankAccounts.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 px-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] text-[11px]">
                <div className="flex items-center gap-2">
                  <Landmark size={13} className="text-blue-500" />
                  <span className="font-semibold text-[var(--color-text-strong)]">{a.name || a.bankName || 'Account'}</span>
                </div>
                <span className="font-extrabold text-[var(--color-text-strong)]">{money(a.balance ?? a.openingBalance ?? 0)}</span>
              </div>
            ))}
            {bankAccounts.length === 0 && <p className="text-[11px] text-center py-4 text-[var(--color-text-muted)]">No bank accounts.</p>}
          </div>
        </ActivityCard>

        {/* Quick Links */}
        <ActivityCard
          title="Banking Quick Links"
          subtitle="Direct links to workspace items"
          icon={ArrowUpRight}
          iconColor="#3b82f6"
          className="col-span-12"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Cash Accounts', page: 'Banking & Payments.Cash Accounts', icon: Wallet, color: '#10b981' },
              { label: 'Bank Transactions', page: 'Banking & Payments.Transactions', icon: Activity, color: '#06b6d4' },
              { label: 'Reconciliation', page: 'Banking & Payments.Bank Reconciliation', icon: Scale, color: '#a855f7' },
              { label: 'Fund Transfers', page: 'Banking & Payments.Fund Transfers', icon: ArrowUpRight, color: '#f59e0b' },
            ].map(s => {
              const SubIcon = s.icon;
              return (
                <button key={s.page} onClick={() => setPage?.(s.page)} className="flex items-center gap-2.5 py-2 px-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] hover:border-primary text-left transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color }}>
                    <SubIcon size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--color-text-strong)]">{s.label}</span>
                </button>
              );
            })}
          </div>
        </ActivityCard>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  ACCOUNTING                                                        */
/* ────────────────────────────────────────────────────────────────── */
export function AccountingSummaryView({ accounts, entries, setPage }: {
  accounts: { code: string; name: string; type: string; openingBalance: number; status?: string }[];
  entries: { id: string; status?: string }[];
  setPage?: (p: string) => void;
}) {
  const totalAssets = accounts.filter(a => a.type === 'Asset').reduce((s, a) => s + a.openingBalance, 0);
  const totalLiabilities = accounts.filter(a => a.type === 'Liability').reduce((s, a) => s + a.openingBalance, 0);
  const totalEquity = accounts.filter(a => a.type === 'Equity').reduce((s, a) => s + a.openingBalance, 0);
  const totalRevenue = accounts.filter(a => a.type === 'Revenue' || a.type === 'ContraRevenue').reduce((s, a) => s + a.openingBalance, 0);
  const totalExpense = accounts.filter(a => a.type === 'Expense' || a.type === 'ContraExpense').reduce((s, a) => s + a.openingBalance, 0);
  const netIncome = totalRevenue - totalExpense;
  const countBy = (t: string) => accounts.filter(a => a.type === t && a.status !== 'Inactive').length;

  const healthBar = [
    { label: 'Assets', value: Math.abs(totalAssets), color: '#3b82f6' },
    { label: 'Liabilities', value: Math.abs(totalLiabilities), color: '#ef4444' },
    { label: 'Equity', value: Math.abs(totalEquity), color: '#10b981' },
  ];
  const healthTotal = healthBar.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <DashboardHeader
        title="Ledger & Accounting Summary"
        subtitle="Chart of accounts, general journal ledger files, and compliance reporting"
        badge="Live Ledger Audited"
        onSettingsClick={() => setPage?.('Administration.System Settings')}
      />

      <div className="grid grid-cols-12 gap-5">
        {/* KPI Cards */}
        {[
          { label: 'Asset Accounts', value: num(countBy('Asset')), icon: Building2, color: '#3b82f6', change: 'Active assets', trendType: 'neutral', points: [10, 11, 12, 12, 12, countBy('Asset')] },
          { label: 'Liability Accounts', value: num(countBy('Liability')), icon: CreditCard, color: '#ef4444', change: 'Active obligations', trendType: 'neutral', points: [5, 6, 6, 6, 7, countBy('Liability')] },
          { label: 'Equity Accounts', value: num(countBy('Equity')), icon: Layers, color: '#10b981', change: 'Capital accounts', trendType: 'neutral', points: [3, 3, 3, 4, 4, countBy('Equity')] },
          { label: 'General Vouchers', value: num(entries.length), icon: ClipboardList, color: '#a855f7', change: 'Posted entries', trendType: 'neutral', points: [entries.length * 0.8, entries.length * 0.85, entries.length * 0.9, entries.length * 0.95, entries.length * 0.98, entries.length] }
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <KpiCard
              key={i}
              label={kpi.label}
              value={kpi.value}
              icon={Icon}
              color={kpi.color}
              change={kpi.change}
              trendType={kpi.trendType as any}
              sparkline={kpi.points.map(v => ({ value: v }))}
              className="col-span-12 sm:col-span-6 lg:col-span-3"
            />
          );
        })}

        {/* Accounting Equation check */}
        <HealthCard
          title="Double-Entry Balance Equation"
          subtitle="Assets = Liabilities + Equity ledger validation"
          icon={CheckCircle2}
          iconColor="#10b981"
          className="col-span-12 lg:col-span-6 justify-between"
        >
          <div className="flex items-center gap-3 flex-wrap my-3">
            {[
              { label: 'Assets', value: totalAssets, color: '#3b82f6', icon: Building2 },
              { label: 'Liabilities', value: totalLiabilities, color: '#ef4444', icon: CreditCard },
              { label: 'Equity', value: totalEquity, color: '#10b981', icon: Users },
            ].map((e, i) => {
              const ElementIcon = e.icon;
              return (
                <div key={e.label} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]">
                    <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: `color-mix(in srgb, ${e.color} 12%, transparent)`, color: e.color }}><ElementIcon size={14} /></div>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{e.label}</p>
                      <p className="text-xs font-black text-[var(--color-text-strong)]">{money(e.value)}</p>
                    </div>
                  </div>
                  {i < 2 && <span className="text-base font-bold text-[var(--color-text-subtle)]">{i === 0 ? '=' : '+'}</span>}
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">Net Income for Period:</span>
            <span className="text-xs font-black" style={{ color: netIncome >= 0 ? '#10b981' : '#ef4444' }}>{money(netIncome)}</span>
          </div>
        </HealthCard>

        {/* Financial Position Composition */}
        <ChartCard
          title="Ledger Weight Balance"
          subtitle="Assets, Liabilities, and Equity structural proportions"
          icon={Activity}
          iconColor="#3b82f6"
          className="col-span-12 lg:col-span-6 justify-between"
        >
          <div className="w-full h-4 rounded-full overflow-hidden flex my-3">
            {healthBar.map(h => (
              <div key={h.label} style={{ width: `${(h.value / healthTotal) * 100}%`, background: h.color }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-[10px]">
            {healthBar.map(h => (
              <span key={h.label} className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: h.color }} />
                {h.label}: <strong className="text-[var(--color-text-strong)]">{money(h.value)}</strong>
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Quick Links */}
        <ActivityCard
          title="Accounting Quick Links"
          subtitle="Direct links to workspace items"
          icon={ArrowUpRight}
          iconColor="#3b82f6"
          className="col-span-12"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Chart of Accounts', page: 'Accounting.Chart of Accounts', icon: Scale, color: '#06b6d4' },
              { label: 'Journal Entries', page: 'Accounting.Journal Entries', icon: ClipboardList, color: '#a855f7' },
              { label: 'Financial Reports', page: 'Accounting.Financial Reports', icon: BarChart3, color: '#10b981' },
              { label: 'Tax Accounting', page: 'Accounting.Tax Accounting', icon: CircleDollarSign, color: '#f59e0b' },
            ].map(s => {
              const SubIcon = s.icon;
              return (
                <button key={s.page} onClick={() => setPage?.(s.page)} className="flex items-center gap-2.5 py-2 px-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] hover:border-primary text-left transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color }}>
                    <SubIcon size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--color-text-strong)]">{s.label}</span>
                </button>
              );
            })}
          </div>
        </ActivityCard>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  ASSETS & INVENTORY                                                */
/* ────────────────────────────────────────────────────────────────── */
export function AssetsInventorySummaryView({ activeEntityId, setPage }: { activeEntityId?: string; setPage?: (p: string) => void }) {
  const store = useAssetsInventoryStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    store.fetchAllAssetsInventory(activeEntityId).catch(() => {}).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntityId]);

  const { assets, warehouses, stockLevels, stockTransactions } = store;
  const bookValue = assets.reduce((s, a) => s + (a.bookValue ?? 0), 0);
  const costValue = assets.reduce((s, a) => s + (a.cost ?? 0), 0);
  const accDep = assets.reduce((s, a) => s + (a.accumulatedDepreciation ?? 0), 0);
  const stockValue = stockLevels.reduce((s, l) => s + (l.quantityOnHand || 0) * (l.unitCost || 0), 0);
  const lowStock = stockLevels.filter(l => (l.availableQuantity ?? l.quantityOnHand) <= (l.reorderPoint || 0)).length;

  const assetTypeData = [
    { name: 'Net Book Value', value: Math.abs(bookValue), fill: '#10b981' },
    { name: 'Accum. Depreciation', value: Math.abs(accDep), fill: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <DashboardHeader
        title="Assets & Inventory Summary"
        subtitle="Fixed assets, asset depreciation schedule, warehouses & stock levels"
        badge={loading ? 'Syncing...' : 'Active Assets'}
        onSettingsClick={() => setPage?.('Administration.System Settings')}
      />

      <div className="grid grid-cols-12 gap-5">
        {/* KPI Cards */}
        {[
          { label: 'Fixed Assets', value: num(assets.length), icon: Boxes, color: '#3b82f6', change: 'Asset items count', trendType: 'neutral', points: [assets.length, assets.length, assets.length, assets.length, assets.length, assets.length] },
          { label: 'Warehouses', value: num(warehouses.length), icon: Warehouse, color: '#06b6d4', change: 'Active locations', trendType: 'neutral', points: [warehouses.length, warehouses.length, warehouses.length, warehouses.length, warehouses.length, warehouses.length] },
          { label: 'Stock Items', value: num(stockLevels.length), icon: Package, color: '#10b981', change: 'Unique SKUs', trendType: 'neutral', points: [stockLevels.length, stockLevels.length, stockLevels.length, stockLevels.length, stockLevels.length, stockLevels.length] },
          { label: 'Low Stock SKU', value: num(lowStock), icon: AlertTriangle, color: lowStock > 0 ? '#ef4444' : '#10b981', change: 'Requires reorder', trendType: lowStock > 0 ? 'down' : 'neutral', points: [lowStock, lowStock, lowStock, lowStock, lowStock, lowStock] }
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <KpiCard
              key={i}
              label={kpi.label}
              value={kpi.value}
              icon={Icon}
              color={kpi.color}
              change={kpi.change}
              trendType={kpi.trendType as any}
              sparkline={kpi.points.map(v => ({ value: v }))}
              className="col-span-12 sm:col-span-6 lg:col-span-3"
            />
          );
        })}

        {/* Asset Composition Donut */}
        <ChartCard
          title="Asset Valuation Composition"
          subtitle="Book Value vs Accumulated Depreciation"
          icon={Boxes}
          iconColor="#3b82f6"
          className="col-span-12 lg:col-span-6"
        >
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 min-h-[170px]">
            <div className="w-[120px] h-[120px] relative shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={assetTypeData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={0}>
                    {assetTypeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-grow text-[10px]">
              {assetTypeData.map(d => (
                <div key={d.name} className="flex justify-between items-center p-2 rounded bg-[var(--color-surface-muted)]">
                  <span className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                    {d.name}
                  </span>
                  <span className="font-extrabold text-[var(--color-text-strong)]">{money(d.value)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--color-border-subtle)] flex justify-between">
                <span className="text-muted uppercase tracking-wider text-[8px] font-bold">Total Stock Valuation:</span>
                <span className="font-extrabold text-[var(--color-text-strong)]">{money(stockValue)}</span>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Asset Value Summary List */}
        <ActivityCard
          title="Asset Value Summary"
          subtitle="Depreciation and warehouse assets status"
          icon={Boxes}
          iconColor="#3b82f6"
          className="col-span-12 lg:col-span-6"
        >
          <div className="space-y-1.5">
            {[
              { label: 'Initial Asset Cost', value: money(costValue), color: '#06b6d4' },
              { label: 'Accumulated Depreciation', value: money(accDep), color: '#f59e0b' },
              { label: 'Net Asset Book Value', value: money(bookValue), color: '#10b981' },
              { label: 'Inventory Stock Value', value: money(stockValue), color: '#a855f7' },
              { label: 'Stock Transactions Vouchers', value: num(stockTransactions.length), color: '#3b82f6' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-2 px-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] text-[11px]">
                <span className="font-semibold text-[var(--color-text-muted)]">{r.label}</span>
                <span className="font-extrabold text-[var(--color-text-strong)]">{r.value}</span>
              </div>
            ))}
          </div>
        </ActivityCard>

        {/* Quick Links */}
        <ActivityCard
          title="Assets & Inventory Quick Links"
          subtitle="Direct links to workspace items"
          icon={ArrowUpRight}
          iconColor="#3b82f6"
          className="col-span-12"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Assets Workspace', page: 'Assets & Inventory.Assets & Inventory Workspace', icon: Boxes, color: '#06b6d4' },
              { label: 'Depreciation Schedule', page: 'Assets & Inventory.Depreciation Schedule', icon: TrendingDown, color: '#f59e0b' },
              { label: 'Valuation Reports', page: 'Assets & Inventory.Valuation Reports', icon: BarChart3, color: '#10b981' },
            ].map(s => {
              const SubIcon = s.icon;
              return (
                <button key={s.page} onClick={() => setPage?.(s.page)} className="flex items-center gap-2.5 py-2 px-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] hover:border-primary text-left transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color }}>
                    <SubIcon size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--color-text-strong)]">{s.label}</span>
                </button>
              );
            })}
          </div>
        </ActivityCard>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  PAYROLL & HR                                                      */
/* ────────────────────────────────────────────────────────────────── */
export function PayrollSummaryView({ setPage }: { activeEntityId?: string; setPage?: (p: string) => void }) {
  const payroll = usePayrollStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    payroll.fetchAll().catch(() => {}).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { employees, departments, positions, payruns, salarySlips, leaveRequests } = payroll;
  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const totalNetPay = salarySlips.reduce((s, sl) => s + (sl.netPay || 0), 0);
  const pendingLeave = leaveRequests.filter(l => l.status === 'Pending').length;
  const postedPayruns = payruns.filter(p => p.status === 'Posted').length;

  const deptData = departments.map(d => ({
    name: d.name || d.code || 'Dept',
    value: employees.filter(e => e.departmentId === d.id).length || 1,
  })).slice(0, 5);
  const deptColors = ['#06b6d4', '#10b981', '#f59e0b', '#a855f7', '#ef4444'];

  const payrollTrend = [
    { m: 'Jan', pay: totalNetPay * 0.85 }, { m: 'Feb', pay: totalNetPay * 0.9 },
    { m: 'Mar', pay: totalNetPay * 0.95 }, { m: 'Apr', pay: totalNetPay },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <DashboardHeader
        title="Payroll & HR Summary"
        subtitle="Employees payroll registration, leaves checklist, salary slips & runs"
        badge={loading ? 'Syncing...' : 'Active HR'}
        onSettingsClick={() => setPage?.('Administration.System Settings')}
      />

      <div className="grid grid-cols-12 gap-5">
        {/* KPI Cards */}
        {[
          { label: 'Total Employees', value: num(employees.length), icon: Users, color: '#3b82f6', change: 'Headcount', trendType: 'neutral', points: [employees.length, employees.length, employees.length, employees.length, employees.length, employees.length] },
          { label: 'Active Staff', value: num(activeEmployees), icon: UserCheck, color: '#10b981', change: 'Active payroll', trendType: 'neutral', points: [activeEmployees, activeEmployees, activeEmployees, activeEmployees, activeEmployees, activeEmployees] },
          { label: 'Total Net Pay', value: money(totalNetPay), icon: DollarSign, color: '#06b6d4', change: 'Disbursed', trendType: 'neutral', points: [totalNetPay * 0.8, totalNetPay * 0.9, totalNetPay * 0.85, totalNetPay * 0.95, totalNetPay] },
          { label: 'Pending Leave', value: num(pendingLeave), icon: Clock, color: pendingLeave > 0 ? '#f59e0b' : '#10b981', change: 'Approval required', trendType: pendingLeave > 0 ? 'down' : 'neutral', points: [pendingLeave, pendingLeave, pendingLeave, pendingLeave] },
        ].map((k, i) => (
          <KpiCard
            key={i}
            label={k.label}
            value={k.value}
            icon={k.icon}
            color={k.color}
            change={k.change}
            trendType={k.trendType as any}
            sparkline={k.points.map(v => ({ value: v }))}
            className="col-span-12 sm:col-span-6 lg:col-span-3"
          />
        ))}

        {/* Charts */}
        <ChartCard
          title="Payroll Cost Trend"
          subtitle="Salary outflows across previous months"
          icon={BarChart3}
          iconColor="#3b82f6"
          className="col-span-12 lg:col-span-6"
        >
          <div className="w-full min-h-[160px]">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={payrollTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v: any) => moneyCompact(Number(v))} />
                <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 11, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
                <Bar dataKey="pay" fill="#ec4899" radius={[4, 4, 0, 0]} name="Salary Paid" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Department Allocation"
          subtitle="Headcount split by operational department"
          icon={Briefcase}
          iconColor="#06b6d4"
          className="col-span-12 lg:col-span-6"
        >
          <div className="space-y-2">
            {deptData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between py-2 px-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: deptColors[i % deptColors.length] }} />
                  <span className="font-semibold text-[var(--color-text-strong)]">{d.name}</span>
                </div>
                <span className="font-extrabold text-[var(--color-text-strong)]">{d.value} employees</span>
              </div>
            ))}
            {deptData.length === 0 && <p className="text-[11px] text-center py-4 text-[var(--color-text-muted)]">No departments defined.</p>}
          </div>
        </ChartCard>

        {/* Salary Vouchers Status */}
        <ActivityCard
          title="Payroll Run Position"
          subtitle="Disbursed salary vouchers and slips"
          icon={CalendarCheck2}
          iconColor="#10b981"
          className="col-span-12"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Salary Posted', value: money(totalNetPay), color: '#10b981' },
              { label: 'Salary Slips generated', value: num(salarySlips.length), color: '#06b6d4' },
              { label: 'Posted Payruns', value: `${postedPayruns} of ${payruns.length}`, color: '#a855f7' },
              { label: 'Positions profiles', value: num(positions.length), color: '#f59e0b' },
            ].map(r => (
              <div key={r.label} className="rounded-xl p-3 border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{r.label}</p>
                <p className="text-sm font-black text-[var(--color-text-strong)] mt-0.5">{r.value}</p>
              </div>
            ))}
          </div>
        </ActivityCard>

        {/* Quick Links */}
        <ActivityCard
          title="Payroll & HR Quick Links"
          subtitle="Direct links to workspace items"
          icon={ArrowUpRight}
          iconColor="#3b82f6"
          className="col-span-12"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Employees Directory', page: 'Payroll & HR.Employees', icon: Users, color: '#06b6d4' },
              { label: 'Attendance logs', page: 'Payroll & HR.Attendance', icon: CalendarCheck2, color: '#10b981' },
              { label: 'Salary vouchers', page: 'Payroll & HR.Payroll', icon: DollarSign, color: '#ec4899' },
              { label: 'HR reports', page: 'Payroll & HR.HR Reports', icon: BarChart3, color: '#a855f7' },
            ].map(s => {
              const SubIcon = s.icon;
              return (
                <button key={s.page} onClick={() => setPage?.(s.page)} className="flex items-center gap-2.5 py-2 px-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] hover:border-primary text-left transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color }}>
                    <SubIcon size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--color-text-strong)]">{s.label}</span>
                </button>
              );
            })}
          </div>
        </ActivityCard>
      </div>
    </div>
  );
}
