import { useState, useMemo } from 'react';
import { usePayrollStore } from '../stores';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Printer, Download, ShieldCheck, ArrowLeft, DollarSign
} from 'lucide-react';

interface Props {
  initialEmployeeId?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export default function EmployeeCumulativeStatement({ initialEmployeeId, onClose, isModal = false }: Props) {
  const { employees, salarySlips, departments, positions } = usePayrollStore();

  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    initialEmployeeId || (employees.length > 0 ? employees[0].id : '')
  );
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const currentEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || employees[0];
  }, [employees, selectedEmpId]);

  // All slips for this employee sorted by periodStart ascending
  const employeeSlips = useMemo(() => {
    if (!currentEmployee) return [];
    return salarySlips
      .filter(s => s.employeeNumber === currentEmployee.employeeNumber || s.employeeName.toLowerCase() === `${currentEmployee.firstName} ${currentEmployee.lastName}`.toLowerCase())
      .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());
  }, [salarySlips, currentEmployee]);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    employeeSlips.forEach(s => {
      const yr = new Date(s.periodStart).getFullYear().toString();
      years.add(yr);
    });
    return Array.from(years).sort();
  }, [employeeSlips]);

  // Filtered Slips
  const filteredSlips = useMemo(() => {
    if (selectedYear === 'ALL') return employeeSlips;
    return employeeSlips.filter(s => new Date(s.periodStart).getFullYear().toString() === selectedYear);
  }, [employeeSlips, selectedYear]);

  // Calculate Running Ledger Data
  const ledgerRows = useMemo(() => {
    let runningPfBalance = 0;

    return filteredSlips.map(slip => {
      // Find Tax
      const taxLine = slip.deductions.find(d =>
        d.category.toLowerCase().includes('tax') ||
        d.name.toLowerCase().includes('tax') ||
        d.name.toLowerCase().includes('fbr') ||
        d.name.toLowerCase().includes('paye')
      );
      const taxAmount = taxLine?.amount || 0;

      // Find Employee PF
      const empPfLine = slip.deductions.find(d =>
        d.name.toLowerCase().includes('provident') ||
        d.name.toLowerCase().includes('pf') ||
        d.category.toLowerCase().includes('provident')
      );
      const empPfAmount = empPfLine?.amount || 0;

      // Find Employer PF match
      const employerPfLine = slip.employerContribs.find(c =>
        c.name.toLowerCase().includes('provident') ||
        c.name.toLowerCase().includes('pf') ||
        c.category.toLowerCase().includes('provident')
      );
      const employerPfAmount = employerPfLine?.amount || empPfAmount; // 1:1 match if enabled

      // Total PF added this cycle
      const periodPfTotal = empPfAmount + employerPfAmount;
      runningPfBalance += periodPfTotal;

      // Find EOBI / Social Security
      const eobiLine = slip.deductions.find(d =>
        d.name.toLowerCase().includes('eobi') ||
        d.name.toLowerCase().includes('social') ||
        d.category.toLowerCase().includes('social')
      );
      const eobiAmount = eobiLine?.amount || 0;

      return {
        slip,
        period: `${slip.periodStart} to ${slip.periodEnd}`,
        payDate: slip.payDate,
        gross: slip.grossEarnings,
        tax: taxAmount,
        empPf: empPfAmount,
        employerPf: employerPfAmount,
        periodPfTotal,
        runningPfBalance,
        eobi: eobiAmount,
        totalDeductions: slip.totalDeductions,
        netPay: slip.netPay,
        currency: slip.currency || currentEmployee?.currency || 'PKR',
      };
    });
  }, [filteredSlips, currentEmployee]);

  // Overall Totals
  const totals = useMemo(() => {
    return ledgerRows.reduce((acc, row) => ({
      gross: acc.gross + row.gross,
      tax: acc.tax + row.tax,
      empPf: acc.empPf + row.empPf,
      employerPf: acc.employerPf + row.employerPf,
      totalPf: acc.totalPf + row.periodPfTotal,
      eobi: acc.eobi + row.eobi,
      totalDeductions: acc.totalDeductions + row.totalDeductions,
      netPay: acc.netPay + row.netPay,
    }), {
      gross: 0, tax: 0, empPf: 0, employerPf: 0, totalPf: 0, eobi: 0, totalDeductions: 0, netPay: 0
    });
  }, [ledgerRows]);

  // Tenure calculation
  const tenureText = useMemo(() => {
    if (!currentEmployee?.hireDate) return 'N/A';
    const hire = new Date(currentEmployee.hireDate);
    const end = currentEmployee.terminationDate ? new Date(currentEmployee.terminationDate) : new Date();
    
    let years = end.getFullYear() - hire.getFullYear();
    let months = end.getMonth() - hire.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'Year' : 'Years'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'Month' : 'Months'}`);
    return parts.length > 0 ? parts.join(', ') : 'Less than a month';
  }, [currentEmployee]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!currentEmployee) return;
    const headers = [
      'Period Start', 'Period End', 'Pay Date', 'Slip Number', 'Gross Salary',
      'Income Tax Deducted', 'Employee PF (Deduction)', 'Employer PF (Match)',
      'Total PF Addition', 'Cumulative PF Balance', 'EOBI / Social Security',
      'Total Deductions', 'Net Salary Paid'
    ];

    const rows = ledgerRows.map(r => [
      r.slip.periodStart,
      r.slip.periodEnd,
      r.payDate,
      `"${r.slip.slipNumber}"`,
      r.gross.toFixed(2),
      r.tax.toFixed(2),
      r.empPf.toFixed(2),
      r.employerPf.toFixed(2),
      r.periodPfTotal.toFixed(2),
      r.runningPfBalance.toFixed(2),
      r.eobi.toFixed(2),
      r.totalDeductions.toFixed(2),
      r.netPay.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Statement_${currentEmployee.employeeNumber}_${currentEmployee.firstName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentEmployee) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No employee records found in system.
      </div>
    );
  }

  const dept = departments.find(d => d.id === currentEmployee.departmentId)?.name || 'General';
  const pos = positions.find(p => p.id === currentEmployee.positionId)?.name || 'Staff';
  const curr = currentEmployee.currency || 'PKR';

  return (
    <div className="space-y-6">
      {/* Action Header & Employee Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-4 rounded-2xl border shadow-xs no-print">
        <div className="flex items-center gap-3">
          {isModal && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="mr-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Select Employee For Cumulative Statement
            </span>
            <select
              className="mt-1 font-bold text-sm bg-background border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none"
              value={selectedEmpId}
              onChange={e => setSelectedEmpId(e.target.value)}
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.employeeNumber} — {e.firstName} {e.lastName} ({e.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border text-xs">
            <span className="font-semibold text-muted-foreground px-1.5">Period:</span>
            <select
              className="bg-transparent font-bold text-xs focus:outline-none"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="ALL">All Time (Since Joining Date)</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>Tax Year / Calendar {yr}</option>
              ))}
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs text-blue-700 border-blue-300 hover:bg-blue-50">
            <Printer className="w-3.5 h-3.5 mr-1" /> Print Full Statement
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Print PF Certificate
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs text-purple-700 border-purple-300 hover:bg-purple-50 font-bold">
            <DollarSign className="w-3.5 h-3.5 mr-1" /> Print Tax Certificate
          </Button>
        </div>
      </div>

      {/* Printable Master Container */}
      <div id="employee-statement-printable" className="space-y-6">
        {/* Official Header / Employee Profile Card */}
        <div className="p-6 rounded-2xl border bg-card shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white flex items-center justify-center font-black text-xl shadow-md">
                {currentEmployee.firstName[0]}{currentEmployee.lastName[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-foreground">
                    {currentEmployee.firstName} {currentEmployee.lastName}
                  </h2>
                  <Badge variant={currentEmployee.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] font-bold">
                    {currentEmployee.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                  <span><strong>Emp #:</strong> {currentEmployee.employeeNumber}</span>
                  <span>•</span>
                  <span><strong>Department:</strong> {dept}</span>
                  <span>•</span>
                  <span><strong>Designation:</strong> {pos}</span>
                </div>
              </div>
            </div>

            <div className="sm:text-right text-xs space-y-1 bg-muted/20 sm:bg-transparent p-3 sm:p-0 rounded-xl">
              <div>
                <span className="text-muted-foreground">Date of Joining: </span>
                <span className="font-bold font-mono text-foreground">
                  {currentEmployee.hireDate ? new Date(currentEmployee.hireDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Service Tenure: </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{tenureText}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pay Frequency: </span>
                <span className="font-semibold text-foreground">{currentEmployee.payFrequency || 'Monthly'}</span>
              </div>
            </div>
          </div>

          {/* Lifetime Cumulative KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            <div className="p-3.5 rounded-xl border bg-muted/20">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                Total Gross Earned (Since Joining)
              </span>
              <span className="text-lg font-black font-mono text-foreground mt-0.5 block">
                {curr} {totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {ledgerRows.length} Payruns Processed
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20">
              <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide block">
                Total Income Tax Deducted
              </span>
              <span className="text-lg font-black font-mono text-rose-900 dark:text-rose-200 mt-0.5 block">
                {curr} {totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-rose-700 dark:text-rose-400">
                Official Withholding Tax Total
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                  Total Provident Fund (PF) Balance
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-xl font-black font-mono text-emerald-950 dark:text-emerald-200 mt-0.5 block">
                {curr} {totals.totalPf.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <div className="text-[10px] text-emerald-800 dark:text-emerald-400 flex justify-between mt-1 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                <span>Emp Share: {totals.empPf.toLocaleString()}</span>
                <span>Co Match: {totals.employerPf.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wide block">
                Total Net Salary Paid
              </span>
              <span className="text-lg font-black font-mono text-blue-950 dark:text-blue-200 mt-0.5 block">
                {curr} {totals.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-blue-700 dark:text-blue-400">
                Bank Transfers / Disbursed
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Running Ledger Table */}
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Historical Payroll Ledger & Running PF Accumulation
              </h3>
              <p className="text-xs text-muted-foreground">
                Chronological pay period breakdown from date of joining to present date.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              Showing {ledgerRows.length} Pay Cycles
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b">
                  <th className="p-3 pl-4">Pay Period</th>
                  <th className="p-3">Pay Date</th>
                  <th className="p-3">Slip #</th>
                  <th className="p-3 text-right">Gross Pay</th>
                  <th className="p-3 text-right text-rose-700">Income Tax</th>
                  <th className="p-3 text-right text-amber-700">PF (Employee)</th>
                  <th className="p-3 text-right text-amber-700">PF (Company Match)</th>
                  <th className="p-3 text-right font-black text-emerald-800 dark:text-emerald-300 bg-emerald-500/10">
                    Cumulative PF Balance
                  </th>
                  <th className="p-3 text-right">EOBI / Social</th>
                  <th className="p-3 text-right pr-4 font-bold">Net Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {ledgerRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 pl-4 font-sans font-medium text-foreground">{row.period}</td>
                    <td className="p-3 text-muted-foreground">{row.payDate}</td>
                    <td className="p-3 font-mono text-[11px] font-bold text-blue-600">{row.slip.slipNumber}</td>
                    <td className="p-3 text-right font-bold text-foreground">{row.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-rose-600">{row.tax > 0 ? row.tax.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                    <td className="p-3 text-right text-amber-700">{row.empPf > 0 ? row.empPf.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                    <td className="p-3 text-right text-amber-700">{row.employerPf > 0 ? row.employerPf.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                    <td className="p-3 text-right font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20">
                      {row.runningPfBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{row.eobi > 0 ? row.eobi.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                    <td className="p-3 pr-4 text-right font-bold text-foreground">{row.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {ledgerRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground font-sans">
                      No payroll records found for this period. Run a payrun including this employee to generate ledger records.
                    </td>
                  </tr>
                )}
              </tbody>
              {ledgerRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-mono text-xs font-black">
                    <td colSpan={3} className="p-3 pl-4 font-sans uppercase text-teal-300">
                      CUMULATIVE TOTALS ({selectedYear === 'ALL' ? 'Since Joining' : `Tax Year ${selectedYear}`}):
                    </td>
                    <td className="p-3 text-right">{totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-rose-300">{totals.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-amber-300">{totals.empPf.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-amber-300">{totals.employerPf.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-emerald-400 font-black">
                      {totals.totalPf.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right text-slate-300">{totals.eobi.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 pr-4 text-right text-emerald-300">{totals.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Official Verification Sign-off Box */}
        <div className="p-6 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h4 className="text-sm font-black text-foreground uppercase tracking-wide">
                Employee Statutory & Withholding Verification Certificate
              </h4>
              <p className="text-xs text-muted-foreground">
                Official statement of earnings, tax withheld, and accumulated retirement benefits.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border">
              Official Record
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase block">Prepared By (HR & Payroll)</span>
              <div className="h-10 border-b-2 border-dashed border-border" />
              <div className="text-[11px] text-foreground flex justify-between">
                <span>Signature: ________</span>
                <span>Date: ______</span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase block">Verified By (Accounts / Internal Audit)</span>
              <div className="h-10 border-b-2 border-dashed border-border" />
              <div className="text-[11px] text-foreground flex justify-between">
                <span>Signature: ________</span>
                <span>Date: ______</span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase block">Acknowledged By (Employee)</span>
              <div className="h-10 border-b-2 border-dashed border-border" />
              <div className="text-[11px] text-foreground flex justify-between">
                <span>Signature: ________</span>
                <span>Date: ______</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
