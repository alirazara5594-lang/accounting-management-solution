import { useEffect, useState, useMemo } from 'react';
import { usePayrollStore } from './stores';
import type { Employee } from './api/modules/payroll.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Play, CheckCircle2, FileText, Download, ArrowLeft,
  Calendar, Printer
} from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'SemiMonthly', label: 'Semi-Monthly' },
  { value: 'BiWeekly', label: 'Bi-Weekly' },
  { value: 'Weekly', label: 'Weekly' },
];

export interface EmployeePayrollCalculation {
  employee: Employee;
  grossPackage: number;
  basic: number;
  hra: number;
  transport: number;
  medical: number;
  otherAllowances: number;
  totalAllowances: number;
  grossEarnings: number;
  incomeTax: number;
  eobiDeduction: number;
  pfDeduction: number;
  socialSecurity: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  eobiEmployer: number;
  pfEmployer: number;
  otherEmployerContrib: number;
  totalEmployerCost: number;
  totalCostToCompany: number;
}

export function calculateEmployeePayrollDetails(emp: Employee, frequency: string = 'Monthly'): EmployeePayrollCalculation {
  // Gross Package First (Top-Down Anchor)
  const grossPackage = Number(emp.grossSalary) || (emp.basicSalary ? Number(emp.basicSalary) / 0.6 : 100000);
  
  const basicPct = emp.basicPercent !== undefined ? Number(emp.basicPercent) : 60;
  const hraPct = emp.hraPercent !== undefined ? Number(emp.hraPercent) : 25;
  const medPct = emp.medicalPercent !== undefined ? Number(emp.medicalPercent) : 10;
  const transPct = emp.transportPercent !== undefined ? Number(emp.transportPercent) : 5;
  const otherPct = emp.otherAllowancePercent !== undefined ? Number(emp.otherAllowancePercent) : 0;

  const basic = (grossPackage * basicPct) / 100;
  const hra = (grossPackage * hraPct) / 100;
  const medical = (grossPackage * medPct) / 100;
  const transport = (grossPackage * transPct) / 100;
  const otherAllowances = (grossPackage * otherPct) / 100;

  const totalAllowances = hra + medical + transport + otherAllowances;
  const grossEarnings = basic + totalAllowances;

  let periodsInYear = 12;
  if (frequency === 'SemiMonthly') periodsInYear = 24;
  else if (frequency === 'BiWeekly') periodsInYear = 26;
  else if (frequency === 'Weekly') periodsInYear = 52;

  const annualizedGross = grossEarnings * periodsInYear;
  let incomeTax = 0;
  let eobiDeduction = 0;
  let pfDeduction = 0;
  let socialSecurity = 0;
  let otherDeductions = 0;
  let eobiEmployer = 0;
  let pfEmployer = 0;
  let otherEmployerContrib = 0;

  switch (emp.country) {
    case 'PK': {
      // Pakistan FBR Tax Slabs (Sec 149)
      if (annualizedGross > 600000) {
        if (annualizedGross <= 1200000) {
          const taxable = annualizedGross - 600000;
          incomeTax = (taxable * 0.05) / periodsInYear;
        } else if (annualizedGross <= 2200000) {
          const taxable = annualizedGross - 1200000;
          incomeTax = (30000 + taxable * 0.15) / periodsInYear;
        } else if (annualizedGross <= 3200000) {
          const taxable = annualizedGross - 2200000;
          incomeTax = (180000 + taxable * 0.25) / periodsInYear;
        } else if (annualizedGross <= 4100000) {
          const taxable = annualizedGross - 3200000;
          incomeTax = (430000 + taxable * 0.30) / periodsInYear;
        } else {
          const taxable = annualizedGross - 4100000;
          incomeTax = (700000 + taxable * 0.35) / periodsInYear;
        }
      }

      // EOBI: 1% employee, 5% employer calculated on basic salary
      if (emp.eobiEnabled !== false) {
        const eobiEmpPct = emp.eobiEmployeePercent || 1.0;
        const eobiEmprPct = emp.eobiEmployerPercent || 5.0;
        eobiDeduction = (basic * eobiEmpPct) / 100;
        eobiEmployer = (basic * eobiEmprPct) / 100;
      }

      // Provident Fund: based on basic salary
      if (emp.pfEnabled) {
        const pfEmpPct = emp.pfEmployeePercent || 8.33;
        const pfEmprPct = emp.pfEmployerPercent || 8.33;
        pfDeduction = (basic * pfEmpPct) / 100;
        pfEmployer = (basic * pfEmprPct) / 100;
      }
      break;
    }

    case 'US': {
      if (annualizedGross > 14600) {
        const taxable = annualizedGross - 14600;
        const annualFedTax = taxable <= 11600 ? taxable * 0.10
          : taxable <= 47150 ? 1160 + (taxable - 11600) * 0.12
          : taxable <= 100525 ? 5426 + (taxable - 47150) * 0.22
          : taxable <= 191950 ? 17168.5 + (taxable - 100525) * 0.24 : 39110.5 + (taxable - 191950) * 0.32;
        incomeTax = annualFedTax / periodsInYear;
      }
      if (emp.usFicaEnabled !== false) {
        socialSecurity = (grossEarnings * 0.062) + (grossEarnings * 0.0145);
        otherEmployerContrib = (grossEarnings * 0.0765);
      }
      if (emp.us401kEnabled) {
        const usEmpPct = emp.us401kEmployeePercent || 5.0;
        const usEmprPct = emp.us401kEmployerPercent || 4.0;
        pfDeduction = (grossEarnings * usEmpPct) / 100;
        pfEmployer = (grossEarnings * usEmprPct) / 100;
      }
      if (emp.usHealthPreTaxDeduction) {
        otherDeductions += Number(emp.usHealthPreTaxDeduction);
      }
      break;
    }

    case 'CA': {
      if (annualizedGross > 15705) {
        const taxable = annualizedGross - 15705;
        const federalTax = taxable <= 55867 ? taxable * 0.15 : 8380 + (taxable - 55867) * 0.205;
        incomeTax = federalTax / periodsInYear;
      }
      if (emp.caCppEnabled !== false) {
        const cpp = (grossEarnings * 0.0595);
        socialSecurity += cpp;
        otherEmployerContrib += cpp;
      }
      if (emp.caEiEnabled !== false) {
        const ei = (grossEarnings * 0.0166);
        socialSecurity += ei;
        otherEmployerContrib += (ei * 1.4);
      }
      if (emp.caRrspEnabled) {
        const rrspEmpPct = emp.caRrspEmployeePercent || 5.0;
        const rrspEmprPct = emp.caRrspEmployerPercent || 4.0;
        pfDeduction = (grossEarnings * rrspEmpPct) / 100;
        pfEmployer = (grossEarnings * rrspEmprPct) / 100;
      }
      break;
    }

    case 'UK': {
      if (annualizedGross > 12570) {
        const taxable = annualizedGross - 12570;
        const annualPAYE = taxable <= 37700 ? taxable * 0.20 : 7540 + (taxable - 37700) * 0.40;
        incomeTax = annualPAYE / periodsInYear;
      }
      if (emp.ukNicEnabled !== false) {
        socialSecurity = (grossEarnings * 0.08);
        otherEmployerContrib = (grossEarnings * 0.138);
      }
      if (emp.ukPensionEnabled !== false) {
        const ukEmpPct = emp.ukPensionEmployeePercent || 5.0;
        const ukEmprPct = emp.ukPensionEmployerPercent || 3.0;
        pfDeduction = (grossEarnings * ukEmpPct) / 100;
        pfEmployer = (grossEarnings * ukEmprPct) / 100;
      }
      break;
    }

    case 'AE': {
      incomeTax = 0;
      if (emp.uaeGpssaEnabled) {
        const gpssaEmpPct = emp.uaeGpssaEmployeePercent || 5.0;
        const gpssaEmprPct = emp.uaeGpssaEmployerPercent || 12.5;
        socialSecurity = (grossEarnings * gpssaEmpPct) / 100;
        otherEmployerContrib = (grossEarnings * gpssaEmprPct) / 100;
      }
      if (emp.uaeGratuityAccrualEnabled !== false) {
        otherEmployerContrib += (basic / 30) * (21 / 12);
      }
      break;
    }

    case 'SA': {
      incomeTax = 0;
      if (emp.saGosiEnabled) {
        const gosiEmpPct = emp.saGosiEmployeePercent || 9.75;
        const gosiEmprPct = emp.saGosiEmployerPercent || 11.75;
        socialSecurity = (grossEarnings * gosiEmpPct) / 100;
        otherEmployerContrib = (grossEarnings * gosiEmprPct) / 100;
      } else {
        otherEmployerContrib = (grossEarnings * 0.02);
      }
      if (emp.saEosbAccrualEnabled !== false) {
        otherEmployerContrib += (basic / 30) * (15 / 12);
      }
      break;
    }

    case 'DE':
    case 'FR':
    case 'NL':
    case 'BE':
    case 'ES':
    case 'IT':
    case 'PL':
    default: {
      const taxRate = annualizedGross > 80000 ? 0.30 : annualizedGross > 35000 ? 0.20 : 0.15;
      incomeTax = (annualizedGross * taxRate) / periodsInYear;
      if (emp.euSocialEnabled !== false) {
        const euEmpPct = emp.euEmployeeSocialPercent || 9.0;
        const euEmprPct = emp.euEmployerSocialPercent || 18.0;
        socialSecurity = (grossEarnings * euEmpPct) / 100;
        otherEmployerContrib = (grossEarnings * euEmprPct) / 100;
      }
      if (emp.euSupplementaryPensionEnabled) {
        const euPenEmpPct = emp.euPensionEmployeePercent || 2.0;
        const euPenEmprPct = emp.euPensionEmployerPercent || 2.0;
        pfDeduction += (grossEarnings * euPenEmpPct) / 100;
        pfEmployer += (grossEarnings * euPenEmprPct) / 100;
      }
      break;
    }
  }

  if (emp.additionalTaxWithholding) {
    otherDeductions += Number(emp.additionalTaxWithholding);
  }

  const totalDeductions = incomeTax + eobiDeduction + pfDeduction + socialSecurity + otherDeductions;
  const netPay = grossEarnings - totalDeductions;
  const totalEmployerCost = eobiEmployer + pfEmployer + otherEmployerContrib;
  const totalCostToCompany = grossEarnings + totalEmployerCost;

  return {
    employee: emp,
    grossPackage,
    basic,
    hra,
    transport,
    medical,
    otherAllowances,
    totalAllowances,
    grossEarnings,
    incomeTax,
    eobiDeduction,
    pfDeduction,
    socialSecurity,
    otherDeductions,
    totalDeductions,
    netPay,
    eobiEmployer,
    pfEmployer,
    otherEmployerContrib,
    totalEmployerCost,
    totalCostToCompany,
  };
}

export default function PayrollProcessing() {
  const { employees, departments, positions, fetchPayruns, fetchEmployees, fetchDepartments, fetchPositions, postPayrun, calculatePayrun } = usePayrollStore();

  const [step, setStep] = useState<'create' | 'preview' | 'slips'>('create');
  const [loading, setLoading] = useState(false);

  // Form State
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [form, setForm] = useState({
    frequency: 'Monthly',
    periodStart: firstDay,
    periodEnd: lastDay,
    payDate: lastDay,
    selectedEmployees: [] as string[],
    filterDepartment: '',
    filterCountry: '',
  });

  useEffect(() => {
    fetchPayruns();
    fetchEmployees();
    fetchDepartments();
    fetchPositions();
  }, []);

  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'Active');
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(e => {
      if (form.filterDepartment && e.departmentId !== form.filterDepartment) return false;
      if (form.filterCountry && e.country !== form.filterCountry) return false;
      return true;
    });
  }, [activeEmployees, form.filterDepartment, form.filterCountry]);

  // Selected employee calculations
  const targetEmployees = useMemo(() => {
    if (form.selectedEmployees.length === 0) return filteredEmployees;
    return filteredEmployees.filter(e => form.selectedEmployees.includes(e.id));
  }, [filteredEmployees, form.selectedEmployees]);

  const calculatedRoster = useMemo(() => {
    return targetEmployees.map(emp => calculateEmployeePayrollDetails(emp, form.frequency));
  }, [targetEmployees, form.frequency]);

  const totals = useMemo(() => {
    return calculatedRoster.reduce((acc, row) => ({
      grossPackage: acc.grossPackage + row.grossPackage,
      basic: acc.basic + row.basic,
      hra: acc.hra + row.hra,
      transport: acc.transport + row.transport,
      medical: acc.medical + row.medical,
      otherAllowances: acc.otherAllowances + row.otherAllowances,
      totalAllowances: acc.totalAllowances + row.totalAllowances,
      grossEarnings: acc.grossEarnings + row.grossEarnings,
      incomeTax: acc.incomeTax + row.incomeTax,
      eobiDeduction: acc.eobiDeduction + row.eobiDeduction,
      pfDeduction: acc.pfDeduction + row.pfDeduction,
      socialSecurity: acc.socialSecurity + row.socialSecurity,
      otherDeductions: acc.otherDeductions + row.otherDeductions,
      totalDeductions: acc.totalDeductions + row.totalDeductions,
      netPay: acc.netPay + row.netPay,
      eobiEmployer: acc.eobiEmployer + row.eobiEmployer,
      pfEmployer: acc.pfEmployer + row.pfEmployer,
      otherEmployerContrib: acc.otherEmployerContrib + row.otherEmployerContrib,
      totalEmployerCost: acc.totalEmployerCost + row.totalEmployerCost,
      totalCostToCompany: acc.totalCostToCompany + row.totalCostToCompany,
    }), {
      grossPackage: 0, basic: 0, hra: 0, transport: 0, medical: 0, otherAllowances: 0,
      totalAllowances: 0, grossEarnings: 0, incomeTax: 0, eobiDeduction: 0, pfDeduction: 0,
      socialSecurity: 0, otherDeductions: 0, totalDeductions: 0, netPay: 0,
      eobiEmployer: 0, pfEmployer: 0, otherEmployerContrib: 0, totalEmployerCost: 0, totalCostToCompany: 0
    });
  }, [calculatedRoster]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setForm(f => ({ ...f, selectedEmployees: filteredEmployees.map(e => e.id) }));
    } else {
      setForm(f => ({ ...f, selectedEmployees: [] }));
    }
  };

  const handleEmployeeToggle = (id: string) => {
    setForm(f => {
      const exists = f.selectedEmployees.includes(id);
      return {
        ...f,
        selectedEmployees: exists ? f.selectedEmployees.filter(x => x !== id) : [...f.selectedEmployees, id]
      };
    });
  };

  const handleRunCalculation = async () => {
    setLoading(true);
    try {
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayrunForSigning = async () => {
    if (!window.confirm('Save this payrun for HR sign-off?\n\nThis will calculate the payroll and save it as "Calculated (Pending GL Posting)" WITHOUT posting any entry to the General Ledger.\n\nOnce management signs the generated sheet, the Accounts Department will post it to GL.')) return;
    setLoading(true);
    try {
      await calculatePayrun({
        frequency: form.frequency,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        payDate: form.payDate,
        employeeIds: targetEmployees.map(e => e.id),
      });
      alert('✓ Payroll run saved successfully as "Calculated (Pending GL Posting)".\n\nNo general ledger journal entries were posted.\n\nThe official sign-off sheet will now be printed for signatures.');
      await fetchPayruns();
      handlePrint();
    } catch (err: any) {
      alert(err.message || 'Error calculating payroll run');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeAndPost = async () => {
    if (!window.confirm('Authorize and post this payrun? This will finalize the payroll and post entries to the General Ledger.')) return;
    setLoading(true);
    try {
      await postPayrun({
        frequency: form.frequency,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        payDate: form.payDate,
        employeeIds: targetEmployees.map(e => e.id),
      });
      alert('✓ Payroll run successfully authorized and posted to General Ledger.');
      await fetchPayruns();
      setStep('create');
    } catch (err: any) {
      alert(err.message || 'Error posting payroll run');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'S.No', 'Employee Code', 'Employee Name', 'Department', 'Position', 'Currency',
      'TOTAL GROSS SALARY', 'Basic Salary (60%)', 'HRA (25%)', 'Medical Allowance (10%)', 'Travel / Transport (5%)', 'Utility / Other',
      'Income Tax (FBR/PAYE)', 'EOBI Employee (1%)', 'Provident Fund (PF)', 'Social Security / GOSI', 'Other Deductions', 'TOTAL DEDUCTIONS (-)',
      'NET SALARY PAYABLE', 'EOBI Employer (5%)', 'PF Match Employer', 'TOTAL COMPANY COST (CTC)'
    ];

    const rows = calculatedRoster.map((r, idx) => [
      idx + 1,
      `"${r.employee.employeeNumber}"`,
      `"${r.employee.firstName} ${r.employee.lastName}"`,
      `"${departments.find(d => d.id === r.employee.departmentId)?.name || 'General'}"`,
      `"${positions.find(p => p.id === r.employee.positionId)?.name || 'Staff'}"`,
      `"${r.employee.currency || 'PKR'}"`,
      r.grossPackage.toFixed(2),
      r.basic.toFixed(2),
      r.hra.toFixed(2),
      r.medical.toFixed(2),
      r.transport.toFixed(2),
      r.otherAllowances.toFixed(2),
      r.incomeTax.toFixed(2),
      r.eobiDeduction.toFixed(2),
      r.pfDeduction.toFixed(2),
      r.socialSecurity.toFixed(2),
      r.otherDeductions.toFixed(2),
      r.totalDeductions.toFixed(2),
      r.netPay.toFixed(2),
      r.eobiEmployer.toFixed(2),
      r.pfEmployer.toFixed(2),
      r.totalCostToCompany.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Master_Salary_Register_${form.periodStart}_to_${form.periodEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-in fade-in">
      {/* 1. SETUP / RUN CREATION STEP */}
      {step === 'create' && (
        <>
          {/* Page Header — AMS Signature Hero Band */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-amber-500/[0.03] to-transparent pointer-events-none" />
            <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0">
                  <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-amber-500 to-yellow-700" />
                  <div className="absolute inset-0 flex items-center justify-center"><Play className="w-6 h-6 text-white" /></div>
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Payroll Processing &amp; Payrun Engine</h1>
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Live Ledger</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Process monthly payroll with Gross-First package breakdown (Basic 60%, HRA 25%, Medical 10%, Travel 5%), statutory deductions, and Director Approval.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button onClick={() => setStep('preview')} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                  <Play className="mr-1.5 h-4 w-4" /> Calculate Payrun
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Payrun Setup Bar */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-3">
              <Calendar className="w-4 h-4 text-teal-600" /> Payrun Cycle & Cut-Off Period
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">Pay Frequency</label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger className="w-full font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Period Start Date</label>
                <Input type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Period End Date (Cut-Off)</label>
                <Input type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Disbursement / Pay Date</label>
                <Input type="date" value={form.payDate} onChange={e => setForm(f => ({ ...f, payDate: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Employee Selection Table */}
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden space-y-3 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Select Employees for this Payrun</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  {targetEmployees.length} of {activeEmployees.length} Selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Select value={form.filterDepartment} onValueChange={v => setForm(f => ({ ...f, filterDepartment: v }))}>
                  <SelectTrigger className="w-[180px] text-xs"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={form.filterCountry} onValueChange={v => setForm(f => ({ ...f, filterCountry: v }))}>
                  <SelectTrigger className="w-[180px] text-xs"><SelectValue placeholder="All Jurisdictions" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Jurisdictions</SelectItem>
                    <SelectItem value="PK">🇵🇰 Pakistan</SelectItem>
                    <SelectItem value="US">🇺🇸 USA</SelectItem>
                    <SelectItem value="UK">🇬🇧 UK</SelectItem>
                    <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                    <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                    <SelectItem value="SA">🇸🇦 Saudi Arabia</SelectItem>
                    <SelectItem value="DE">🇪🇺 Germany / EU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px]">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={form.selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                        onChange={e => handleSelectAll(e.target.checked)}
                        className="rounded border-border text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Employee Name</th>
                    <th className="p-3">Country</th>
                    <th className="p-3">Department</th>
                    <th className="p-3 text-right">Agreed Gross Package</th>
                    <th className="p-3 text-right">Basic (60%)</th>
                    <th className="p-3 text-right">Estimated Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEmployees.map(emp => {
                    const isSelected = form.selectedEmployees.length === 0 || form.selectedEmployees.includes(emp.id);
                    const calc = calculateEmployeePayrollDetails(emp, form.frequency);
                    return (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleEmployeeToggle(emp.id)}
                            className="rounded border-border text-teal-600 focus:ring-teal-500"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold">{emp.employeeNumber}</td>
                        <td className="p-3 font-bold">{emp.firstName} {emp.lastName}</td>
                        <td className="p-3 font-semibold">{emp.country}</td>
                        <td className="p-3 text-muted-foreground">{departments.find(d => d.id === emp.departmentId)?.name || 'General'}</td>
                        <td className="p-3 text-right font-mono font-black text-blue-700 dark:text-blue-400">
                          {emp.currency || 'PKR'} {calc.grossPackage.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          {emp.currency || 'PKR'} {calc.basic.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-400">
                          {emp.currency || 'PKR'} {calc.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleRunCalculation} disabled={targetEmployees.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6">
                Calculate & Review Master Salary Register ({targetEmployees.length} Staff)
              </Button>
            </div>
          </div>
        </>
      )}

      {/* 2. MASTER SALARY REGISTER & DIRECTOR APPROVAL STEP */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Action Header for Director Approval */}
          <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Master Salary Register & Director Approval Certificate
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gross Salary Package first, followed by itemized salary breakup, statutory deductions, net payable, and total company cost.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setStep('create')}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="text-blue-700 border-blue-300 hover:bg-blue-50">
                <Printer className="w-3.5 h-3.5 mr-1" /> Print Sign-off Sheet
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                <Download className="w-3.5 h-3.5 mr-1" /> Download Excel/CSV
              </Button>
              <Button onClick={handleSavePayrunForSigning} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm">
                <FileText className="w-4 h-4 mr-1.5" /> Save & Print Sign-off Sheet (HR)
              </Button>
              <Button onClick={handleAuthorizeAndPost} disabled={loading} variant="outline" className="text-emerald-700 border-emerald-600 hover:bg-emerald-50 font-bold">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" /> Post Directly to GL (Accounts)
              </Button>
            </div>
          </div>

          {/* Segregation of Duties Guidance Banner */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-base shrink-0">ⓘ</span>
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">Segregation of Duties (SoD) - Internal Accounting Control</p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  <strong>HR Department:</strong> Click <em>"Save & Print Sign-off Sheet"</em> to record the calculated payrun without posting to the General Ledger. Obtain required signatures and send to Accounts.<br/>
                  <strong>Accounts Department:</strong> Reviews the signed physical/digital sheet and posts the balanced liability voucher to the General Ledger.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-2.5 py-1 rounded-md font-bold whitespace-nowrap">
              Pending GL Posting
            </span>
          </div>

          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl border bg-card shadow-xs">
              <span className="text-[11px] text-muted-foreground uppercase font-bold block">Total Employees</span>
              <span className="text-2xl font-black text-foreground font-mono">{calculatedRoster.length} Staff</span>
              <span className="text-[10px] text-teal-600 block mt-1">Active Cycle Roster</span>
            </div>

            <div className="p-4 rounded-2xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 shadow-xs">
              <span className="text-[11px] text-blue-800 dark:text-blue-300 uppercase font-bold block">1. Total Gross Salary (Package)</span>
              <span className="text-2xl font-black text-blue-950 dark:text-blue-200 font-mono">
                PKR {totals.grossPackage.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-blue-700 block mt-1">Agreed Gross Total</span>
            </div>

            <div className="p-4 rounded-2xl border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 shadow-xs">
              <span className="text-[11px] text-rose-800 dark:text-rose-300 uppercase font-bold block">2. Total Deductions (-)</span>
              <span className="text-2xl font-black text-rose-950 dark:text-rose-200 font-mono">
                PKR {totals.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-rose-700 block mt-1">Tax, EOBI, PF, Social</span>
            </div>

            <div className="p-4 rounded-2xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 shadow-xs">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 uppercase font-bold block">3. Net Salary Payable</span>
              <span className="text-2xl font-black text-emerald-950 dark:text-emerald-200 font-mono">
                PKR {totals.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-700 block mt-1">Direct Bank Disbursement</span>
            </div>
          </div>

          {/* MASTER SALARY REGISTER TABLE */}
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden space-y-2">
            <div className="p-4 bg-muted/40 border-b flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-foreground">
                  Master Salary Register — {form.periodStart} to {form.periodEnd} ({form.frequency})
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Showing Gross Package first, then Breakup columns (Basic, HRA, Medical, Travel, Utility), and individual deduction columns.
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  {/* Header Group Row */}
                  <tr className="bg-muted/80 border-b text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                    <th colSpan={4} className="p-2.5 pl-4 border-r text-center bg-slate-100 dark:bg-slate-800">
                      EMPLOYEE INFORMATION
                    </th>
                    <th className="p-2.5 border-r text-center bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-black">
                      PRIMARY SALARY
                    </th>
                    <th colSpan={5} className="p-2.5 border-r text-center bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200">
                      GROSS SALARY BREAKUP (100%)
                    </th>
                    <th colSpan={6} className="p-2.5 border-r text-center bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200">
                      DEDUCTIONS BREAKUP (-)
                    </th>
                    <th className="p-2.5 border-r text-center bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200">
                      NET DISBURSEMENT
                    </th>
                    <th colSpan={3} className="p-2.5 pr-4 text-center bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200">
                      EMPLOYER CONTRIBUTIONS (CTC)
                    </th>
                  </tr>

                  {/* Specific Column Names */}
                  <tr className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase">
                    <th className="p-2.5 pl-4">S.No</th>
                    <th className="p-2.5">Emp ID</th>
                    <th className="p-2.5">Employee Name</th>
                    <th className="p-2.5 border-r">Department</th>
                    
                    {/* Primary Gross Column */}
                    <th className="p-2.5 text-right border-r font-black text-blue-800 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30">
                      TOTAL GROSS SALARY
                    </th>

                    {/* Gross Breakup Columns */}
                    <th className="p-2.5 text-right">Basic (60%)</th>
                    <th className="p-2.5 text-right">HRA (25%)</th>
                    <th className="p-2.5 text-right">Medical (10%)</th>
                    <th className="p-2.5 text-right">Travel (5%)</th>
                    <th className="p-2.5 text-right border-r">Utility/Other</th>

                    {/* Deduction Columns */}
                    <th className="p-2.5 text-right text-rose-700">Tax (FBR)</th>
                    <th className="p-2.5 text-right text-rose-700">EOBI (1%)</th>
                    <th className="p-2.5 text-right text-rose-700">PF (Fund)</th>
                    <th className="p-2.5 text-right text-rose-700">Social/GOSI</th>
                    <th className="p-2.5 text-right text-rose-700">Other Ded.</th>
                    <th className="p-2.5 text-right border-r font-black text-rose-800 bg-rose-50/50">TOTAL DED. (-)</th>

                    {/* Net Column */}
                    <th className="p-2.5 text-right border-r font-black text-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30">
                      NET PAYABLE
                    </th>

                    {/* Employer Cost Columns */}
                    <th className="p-2.5 text-right text-purple-700">EOBI (5%)</th>
                    <th className="p-2.5 text-right text-purple-700">PF Match</th>
                    <th className="p-2.5 pr-4 text-right font-black text-purple-900 dark:text-purple-300 bg-purple-50/50">TOTAL CTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {calculatedRoster.map((r, idx) => (
                    <tr key={r.employee.id} className="hover:bg-muted/30 transition-colors font-mono text-[11px]">
                      <td className="p-2.5 pl-4 text-center text-muted-foreground font-sans">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-foreground">{r.employee.employeeNumber}</td>
                      <td className="p-2.5 font-bold text-foreground font-sans whitespace-nowrap">
                        {r.employee.firstName} {r.employee.lastName}
                      </td>
                      <td className="p-2.5 text-muted-foreground font-sans border-r whitespace-nowrap">
                        {departments.find(d => d.id === r.employee.departmentId)?.name || 'General'}
                      </td>

                      {/* Primary Gross Column */}
                      <td className="p-2.5 text-right font-black text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20 border-r">
                        {r.grossPackage.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Breakup Columns */}
                      <td className="p-2.5 text-right font-bold text-foreground">
                        {r.basic.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right text-muted-foreground">
                        {r.hra.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right text-muted-foreground">
                        {r.medical.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right text-muted-foreground">
                        {r.transport.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right text-muted-foreground border-r">
                        {r.otherAllowances.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Deduction Columns */}
                      <td className="p-2.5 text-right text-rose-600">
                        {r.incomeTax > 0 ? r.incomeTax.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-2.5 text-right text-rose-600">
                        {r.eobiDeduction > 0 ? r.eobiDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-2.5 text-right text-rose-600">
                        {r.pfDeduction > 0 ? r.pfDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-2.5 text-right text-rose-600">
                        {r.socialSecurity > 0 ? r.socialSecurity.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-2.5 text-right text-rose-600">
                        {r.otherDeductions > 0 ? r.otherDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-rose-700 bg-rose-50/20 border-r">
                        {r.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Net Payable */}
                      <td className="p-2.5 text-right font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 border-r">
                        {r.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Employer Cost */}
                      <td className="p-2.5 text-right text-purple-600">
                        {r.eobiEmployer > 0 ? r.eobiEmployer.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-2.5 text-right text-purple-600">
                        {r.pfEmployer > 0 ? r.pfEmployer.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-2.5 pr-4 text-right font-black text-purple-900 dark:text-purple-300 bg-purple-50/20">
                        {r.totalCostToCompany.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Grand Totals Footer */}
                <tfoot>
                  <tr className="bg-slate-900 text-white font-mono text-[11px] font-black border-t-2 border-slate-700">
                    <td colSpan={4} className="p-3 pl-4 text-right font-sans text-xs uppercase text-teal-300">
                      GRAND TOTALS ({calculatedRoster.length} Employees):
                    </td>
                    <td className="p-3 text-right text-blue-300 border-r">
                      {totals.grossPackage.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right">{totals.basic.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right">{totals.hra.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right">{totals.medical.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right">{totals.transport.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right border-r">{totals.otherAllowances.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    
                    <td className="p-3 text-right text-rose-300">{totals.incomeTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-rose-300">{totals.eobiDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-rose-300">{totals.pfDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-rose-300">{totals.socialSecurity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-rose-300">{totals.otherDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-rose-400 border-r">{totals.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>

                    <td className="p-3 text-right text-emerald-400 border-r">
                      {totals.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-3 text-right text-purple-300">{totals.eobiEmployer.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-purple-300">{totals.pfEmployer.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 pr-4 text-right text-purple-300">
                      {totals.totalCostToCompany.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Director Approval Sign-Off Box */}
          <div className="p-6 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-card space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-black text-foreground uppercase tracking-wide">
                  Corporate Payroll Sign-Off & Verification Certificate
                </h3>
                <span className="text-xs text-muted-foreground">
                  In compliance with IAS 19 Employee Benefits, FBR / IRS Statutory Regulations, and Company HR Policy.
                </span>
              </div>
              <div className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-300">
                Ready for Director Authorization
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <span className="text-[11px] font-bold text-muted-foreground uppercase block">1. Prepared By (HR Officer)</span>
                <div className="h-10 border-b-2 border-dashed border-border" />
                <div className="text-[11px] text-foreground flex justify-between">
                  <span>Sign: _________</span>
                  <span>Date: ________</span>
                </div>
              </div>

              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <span className="text-[11px] font-bold text-muted-foreground uppercase block">2. Verified By (Internal Auditor)</span>
                <div className="h-10 border-b-2 border-dashed border-border" />
                <div className="text-[11px] text-foreground flex justify-between">
                  <span>Sign: _________</span>
                  <span>Date: ________</span>
                </div>
              </div>

              <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                <span className="text-[11px] font-bold text-muted-foreground uppercase block">3. Authorized By (CEO / Director)</span>
                <div className="h-10 border-b-2 border-dashed border-border" />
                <div className="text-[11px] text-foreground flex justify-between">
                  <span>Sign: _________</span>
                  <span>Date: ________</span>
                </div>
              </div>

              <div className="space-y-3 p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">4. Passed to GL (Finance Mgr)</span>
                <div className="h-10 border-b-2 border-dashed border-emerald-500/40" />
                <div className="text-[11px] text-foreground flex justify-between">
                  <span>Sign: _________</span>
                  <span>Date: ________</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
