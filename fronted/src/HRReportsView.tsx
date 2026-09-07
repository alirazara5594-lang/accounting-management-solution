import { useEffect, useMemo } from 'react';
import { usePayrollStore } from './stores';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState } from './components/ui/empty-state';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CalendarCheck2, HeartPulse, Banknote, Wallet, TrendingUp, Globe2, Building2, AlertTriangle, UserCheck, FileText } from 'lucide-react';
import { money } from './lib/currency';
import EmployeeCumulativeStatement from './components/EmployeeCumulativeStatement';

const COUNTRY_OPTIONS: Record<string, string> = {
  US: 'United States', CA: 'Canada', UK: 'United Kingdom', DE: 'Germany', FR: 'France', NL: 'Netherlands',
  BE: 'Belgium', ES: 'Spain', IT: 'Italy', PL: 'Poland', PK: 'Pakistan', SA: 'Saudi Arabia', AE: 'UAE',
};

export default function HRReportsView() {
  const { employees, departments, leaveRequests, attendanceRecords, payruns, salarySlips, loans, fetchAll } = usePayrollStore();

  useEffect(() => { fetchAll(); }, []);

  const active = employees.filter(e => e.status === 'Active');
  const onLeave = employees.filter(e => e.status === 'OnLeave');
  const terminated = employees.filter(e => e.status === 'Terminated');

  const headcount = useMemo(() => {
    const map = new Map<string, { total: number; active: number }>();
    employees.forEach(e => {
      const key = e.departmentId || 'Unassigned';
      const cur = map.get(key) || { total: 0, active: 0 };
      cur.total++;
      if (e.status === 'Active') cur.active++;
      map.set(key, cur);
    });
    return Array.from(map.entries()).map(([deptId, v]) => ({
      deptId,
      deptName: departments.find(d => d.id === deptId)?.name || 'Unassigned',
      ...v,
    })).sort((a, b) => b.total - a.total);
  }, [employees, departments]);

  const countryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach(e => { map.set(e.country, (map.get(e.country) || 0) + 1); });
    return Array.from(map.entries()).map(([code, count]) => ({ code, label: COUNTRY_OPTIONS[code] || code, count })).sort((a, b) => b.count - a.count);
  }, [employees]);

  const attendanceStats = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'Present').length;
    const late = attendanceRecords.filter(r => r.status === 'Late').length;
    const absent = attendanceRecords.filter(r => r.status === 'Absent').length;
    const avgHours = total ? attendanceRecords.reduce((s, r) => s + (r.regularHours || 0) + (r.overtimeHours || 0) + (r.nightHours || 0), 0) / total : 0;
    return { total, present, late, absent, avgHours: avgHours.toFixed(1) };
  }, [attendanceRecords]);

  const leaveStats = useMemo(() => {
    const byType = new Map<string, { total: number; days: number; approved: number; pending: number }>();
    leaveRequests.forEach(r => {
      const cur = byType.get(r.leaveType) || { total: 0, days: 0, approved: 0, pending: 0 };
      cur.total++;
      cur.days += r.totalDays || 0;
      if (r.status === 'Approved') cur.approved++;
      if (r.status === 'Pending') cur.pending++;
      byType.set(r.leaveType, cur);
    });
    return Array.from(byType.entries()).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.days - a.days);
  }, [leaveRequests]);

  const payrollSummary = useMemo(() => {
    const posted = payruns.filter(p => p.status === 'Posted');
    const totalGross = salarySlips.reduce((s, slip) => s + slip.grossEarnings, 0);
    const totalDeductions = salarySlips.reduce((s, slip) => s + slip.totalDeductions, 0);
    const totalNet = salarySlips.reduce((s, slip) => s + slip.netPay, 0);
    return { runs: posted.length, totalGross, totalDeductions, totalNet };
  }, [payruns, salarySlips]);

  const loanSummary = useMemo(() => {
    const outstanding = loans.filter(l => l.status === 'Active').reduce((s, l) => s + l.balanceAmount, 0);
    const disbursed = loans.reduce((s, l) => s + l.principalAmount, 0);
    return { outstanding, disbursed, active: loans.filter(l => l.status === 'Active').length };
  }, [loans]);

  const avgSalary = active.length ? active.reduce((s, e) => s + e.basicSalary, 0) / active.length : 0;

  const perCapitaTable = useMemo(() => {
    return headcount.map(h => ({
      deptName: h.deptName,
      headcount: h.total,
      active: h.active,
      salaryCost: employees.filter(e => (e.departmentId || 'Unassigned') === h.deptId && e.status === 'Active').reduce((s, e) => s + e.basicSalary, 0),
    }));
  }, [headcount, employees]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-6">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-orange-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-orange-500 to-amber-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">HR Reports</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400"><span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Headcount, attendance, leave, payroll cost, and loan analytics across your workforce</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Headcount', value: employees.length, desc: 'All employees', icon: Users, color: 'from-teal-400 to-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30', textColor: 'text-teal-600 dark:text-teal-400' },
          { label: 'Active Employees', value: active.length, desc: 'Currently working', icon: UserCheck, color: 'from-green-400 to-green-600', bg: 'bg-green-50 dark:bg-green-950/30', textColor: 'text-green-600 dark:text-green-400' },
          { label: 'On Leave', value: onLeave.length, desc: 'Currently away', icon: HeartPulse, color: 'from-amber-400 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', textColor: 'text-amber-600 dark:text-amber-400' },
          { label: 'Terminated', value: terminated.length, desc: 'No longer active', icon: AlertTriangle, color: 'from-red-400 to-red-600', bg: 'bg-red-50 dark:bg-red-950/30', textColor: 'text-red-600 dark:text-red-400' },
          { label: 'Avg. Basic Salary', value: money(avgSalary), desc: 'Per active employee', icon: Banknote, color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', textColor: 'text-blue-600 dark:text-blue-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{kpi.label}</p>
                <p className={`text-lg font-semibold mt-1 ${kpi.textColor}`}>{kpi.value}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{kpi.desc}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg`}>
                <kpi.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full ${kpi.bg} opacity-50`} />
          </div>
        ))}
      </div>

      <Tabs defaultValue="headcount">
        <TabsList>
          <TabsTrigger value="headcount"><Users className="h-4 w-4" /> Headcount</TabsTrigger>
          <TabsTrigger value="attendance"><CalendarCheck2 className="h-4 w-4" /> Attendance</TabsTrigger>
          <TabsTrigger value="leave"><HeartPulse className="h-4 w-4" /> Leave</TabsTrigger>
          <TabsTrigger value="payroll"><Banknote className="h-4 w-4" /> Payroll Cost</TabsTrigger>
          <TabsTrigger value="employee-ledger"><FileText className="h-4 w-4" /> Employee Statement & PF</TabsTrigger>
          <TabsTrigger value="loans"><Wallet className="h-4 w-4" /> Loans</TabsTrigger>
        </TabsList>

        <TabsContent value="headcount" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="border-b px-5 py-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Building2 className="h-4 w-4 text-primary" /> Headcount by Department</h3>
              </div>
              <div className="p-5">
                {perCapitaTable.length === 0 && <EmptyState icon={Building2} title="No Employee Data" hint="Employee records will populate this headcount breakdown." />}
                {perCapitaTable.map(d => {
                  const pct = employees.length ? (d.headcount / employees.length) * 100 : 0;
                  return (
                    <div key={d.deptName} className="mb-4">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{d.deptName}</span>
                        <span className="text-xs text-muted-foreground">{d.headcount} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <div className="border-b px-5 py-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Globe2 className="h-4 w-4 text-primary" /> Headcount by Country</h3>
              </div>
              <div className="p-5">
                {countryBreakdown.length === 0 && <EmptyState icon={Globe2} title="No Employee Data" hint="Employee records will populate this country breakdown." />}
                {countryBreakdown.map(c => {
                  const pct = employees.length ? (c.count / employees.length) * 100 : 0;
                  return (
                    <div key={c.code} className="mb-4">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{c.label}</span>
                        <span className="text-xs text-muted-foreground">{c.count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Department Headcount & Salary Cost</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Annual Salary Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perCapitaTable.map(d => (
                  <TableRow key={d.deptName}>
                    <TableCell className="font-medium">{d.deptName}</TableCell>
                    <TableCell className="text-right">{d.headcount}</TableCell>
                    <TableCell className="text-right">{d.active}</TableCell>
                    <TableCell className="text-right font-mono">{money(d.salaryCost)}</TableCell>
                  </TableRow>
                ))}
                {perCapitaTable.length === 0 && <TableRow><TableCell colSpan={4} className="p-0"><EmptyState icon={Building2} title="No Data" hint="Department headcount will appear once employees are registered." /></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Records Tracked', value: attendanceStats.total, desc: 'Total attendance entries', icon: CalendarCheck2, color: 'from-teal-400 to-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30', textColor: 'text-teal-600 dark:text-teal-400' },
              { label: 'Present', value: attendanceStats.present, desc: 'Days present', icon: UserCheck, color: 'from-green-400 to-green-600', bg: 'bg-green-50 dark:bg-green-950/30', textColor: 'text-green-600 dark:text-green-400' },
              { label: 'Late Arrivals', value: attendanceStats.late, desc: 'Late check-ins', icon: AlertTriangle, color: 'from-amber-400 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', textColor: 'text-amber-600 dark:text-amber-400' },
              { label: 'Avg Hours / Day', value: attendanceStats.avgHours, desc: 'Average daily hours', icon: TrendingUp, color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', textColor: 'text-blue-600 dark:text-blue-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-lg font-semibold mt-1 ${kpi.textColor}`}>{kpi.value}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{kpi.desc}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg`}>
                    <kpi.icon className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full ${kpi.bg} opacity-50`} />
              </div>
            ))}
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Overtime</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.filter(e => attendanceRecords.some(r => r.employeeId === e.id)).slice(0, 20).map(e => {
                  const recs = attendanceRecords.filter(r => r.employeeId === e.id);
                  const hours = recs.reduce((s, r) => s + (r.regularHours || 0) + (r.overtimeHours || 0) + (r.nightHours || 0), 0);
                  const ot = recs.reduce((s, r) => s + (r.overtimeHours || 0), 0);
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{e.firstName[0]}{e.lastName[0]}</div>
                          <div><div className="font-medium">{e.firstName} {e.lastName}</div><div className="text-xs text-muted-foreground">{e.employeeNumber}</div></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{hours}h</TableCell>
                      <TableCell className="text-right font-mono">{ot}h</TableCell>
                      <TableCell className="text-right">{recs.length}</TableCell>
                    </TableRow>
                  );
                })}
                {attendanceRecords.length === 0 && <TableRow><TableCell colSpan={4} className="p-0"><EmptyState icon={CalendarCheck2} title="No Attendance Data" hint="Attendance data will appear once biometric punches are recorded." /></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Leave Requests', value: leaveRequests.length, desc: 'All requests submitted', icon: HeartPulse, color: 'from-teal-400 to-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30', textColor: 'text-teal-600 dark:text-teal-400' },
              { label: 'Approved', value: leaveRequests.filter(r => r.status === 'Approved').length, desc: 'Successfully approved', icon: UserCheck, color: 'from-green-400 to-green-600', bg: 'bg-green-50 dark:bg-green-950/30', textColor: 'text-green-600 dark:text-green-400' },
              { label: 'Pending', value: leaveRequests.filter(r => r.status === 'Pending').length, desc: 'Awaiting approval', icon: AlertTriangle, color: 'from-amber-400 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', textColor: 'text-amber-600 dark:text-amber-400' },
              { label: 'Total Days Taken', value: leaveRequests.filter(r => r.status === 'Approved').reduce((s, r) => s + (r.totalDays || 0), 0), desc: 'Approved leave days', icon: CalendarCheck2, color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', textColor: 'text-blue-600 dark:text-blue-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-lg font-semibold mt-1 ${kpi.textColor}`}>{kpi.value}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{kpi.desc}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg`}>
                    <kpi.icon className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full ${kpi.bg} opacity-50`} />
              </div>
            ))}
          </div>
          <Card className="overflow-hidden">
            <div className="border-b px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Leave by Type</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveStats.map(l => (
                  <TableRow key={l.type}>
                    <TableCell className="font-medium">{l.type}</TableCell>
                    <TableCell className="text-right">{l.total}</TableCell>
                    <TableCell className="text-right font-mono">{l.days}</TableCell>
                    <TableCell className="text-right"><Badge variant="default">{l.approved}</Badge></TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">{l.pending}</Badge></TableCell>
                  </TableRow>
                ))}
                {leaveStats.length === 0 && <TableRow><TableCell colSpan={5} className="p-0"><EmptyState icon={HeartPulse} title="No Leave Data" hint="Leave requests will populate this type-wise summary." /></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Posted Payruns', value: payrollSummary.runs, desc: 'Payruns completed', icon: Banknote, color: 'from-teal-400 to-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30', textColor: 'text-teal-600 dark:text-teal-400' },
              { label: 'Gross Payroll', value: money(payrollSummary.totalGross), desc: 'Total gross pay', icon: TrendingUp, color: 'from-green-400 to-green-600', bg: 'bg-green-50 dark:bg-green-950/30', textColor: 'text-green-600 dark:text-green-400' },
              { label: 'Total Deductions', value: money(payrollSummary.totalDeductions), desc: 'All deductions', icon: Wallet, color: 'from-amber-400 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', textColor: 'text-amber-600 dark:text-amber-400' },
              { label: 'Net Pay Issued', value: money(payrollSummary.totalNet), desc: 'Net pay disbursed', icon: UserCheck, color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', textColor: 'text-blue-600 dark:text-blue-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-lg font-semibold mt-1 ${kpi.textColor}`}>{kpi.value}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{kpi.desc}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg`}>
                    <kpi.icon className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full ${kpi.bg} opacity-50`} />
              </div>
            ))}
          </div>
          <Card className="overflow-hidden">
            <div className="border-b px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Salary Slips Issued</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salarySlips.slice(0, 25).map(slip => (
                  <TableRow key={slip.id}>
                    <TableCell>
                      <div><div className="font-medium">{slip.employeeName}</div><div className="text-xs text-muted-foreground">{slip.employeeNumber}</div></div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{slip.periodStart} → {slip.periodEnd}</TableCell>
                    <TableCell className="text-right font-mono">{slip.currency} {slip.grossEarnings.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">{slip.currency} {slip.totalDeductions.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{slip.currency} {slip.netPay.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {salarySlips.length === 0 && <TableRow><TableCell colSpan={5} className="p-0"><EmptyState icon={Banknote} title="No Salary Slips Yet" hint="Run a payroll to see issued salary slips here." /></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Disbursed', value: money(loanSummary.disbursed), desc: 'Total loan amount', icon: Wallet, color: 'from-teal-400 to-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30', textColor: 'text-teal-600 dark:text-teal-400' },
              { label: 'Outstanding Balance', value: money(loanSummary.outstanding), desc: 'Remaining balance', icon: Banknote, color: 'from-amber-400 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', textColor: 'text-amber-600 dark:text-amber-400' },
              { label: 'Active Loans', value: loanSummary.active, desc: 'Currently active', icon: UserCheck, color: 'from-green-400 to-green-600', bg: 'bg-green-50 dark:bg-green-950/30', textColor: 'text-green-600 dark:text-green-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-lg font-semibold mt-1 ${kpi.textColor}`}>{kpi.value}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{kpi.desc}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg`}>
                    <kpi.icon className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full ${kpi.bg} opacity-50`} />
              </div>
            ))}
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono font-semibold">{l.loanNumber}</TableCell>
                    <TableCell>{l.loanType}</TableCell>
                    <TableCell className="text-right font-mono">{l.principalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{l.balanceAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{l.paidInstallments}/{l.totalInstallments}</TableCell>
                    <TableCell className="text-right"><StatusChip status={l.status} label={l.status} hex={l.status === 'Active' ? '#10b981' : l.status === 'Completed' ? '#10b981' : '#f43f5e'} /></TableCell>
                  </TableRow>
                ))}
                {loans.length === 0 && <TableRow><TableCell colSpan={6} className="p-0"><EmptyState icon={Wallet} title="No Loans Yet" hint="Employee loans and advances will appear here." /></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="employee-ledger" className="space-y-4">
          <EmployeeCumulativeStatement />
        </TabsContent>
      </Tabs>
    </div>
  );
}