import { useEffect, useState } from 'react';
import { usePayrollStore } from './stores';
import type { Employee } from './api/modules/payroll.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { PageHeader } from '@/components/ui/page-header';
import { StatusChip } from './components/ui/status-chip';
import { EmptyState } from './components/ui/empty-state';
import { Plus, Pencil, UserX, Building2, Briefcase, Shield, CreditCard, GraduationCap, ArrowLeft, ArrowRight, Save, Users, Check, Landmark, PiggyBank, Globe, Calculator } from 'lucide-react';

const COUNTRY_OPTIONS = [
  { value: 'PK', label: '🇵🇰 Pakistan (PKR / FBR / EOBI)' },
  { value: 'US', label: '🇺🇸 United States (USD / FICA / 401k)' },
  { value: 'UK', label: '🇬🇧 United Kingdom (GBP / PAYE / NIC / Pension)' },
  { value: 'CA', label: '🇨🇦 Canada (CAD / CPP / EI / RRSP)' },
  { value: 'AE', label: '🇦🇪 UAE (AED / WPS / GPSSA / Gratuity)' },
  { value: 'SA', label: '🇸🇦 Saudi Arabia (SAR / ZATCA / GOSI / EOSB)' },
  { value: 'DE', label: '🇩🇪 Germany (EUR / Lohnsteuer / Social Insurance)' },
  { value: 'FR', label: '🇫🇷 France (EUR / Sécurité Sociale / PAS)' },
  { value: 'NL', label: '🇳🇱 Netherlands (EUR / Loonheffing / Volksverzekeringen)' },
  { value: 'BE', label: '🇧🇪 Belgium (EUR / RSZ / ONSS)' },
  { value: 'ES', label: '🇪🇸 Spain (EUR / Seguridad Social / IRPF)' },
  { value: 'IT', label: '🇮🇹 Italy (EUR / INPS / IRPEF / TFR)' },
  { value: 'PL', label: '🇵🇱 Poland (PLN / ZUS / PIT / PPK)' },
];

const EMPTY_FORM = {
  firstName: '', lastName: '', middleName: '', preferredName: '', email: '', phone: '', gender: '', maritalStatus: '', nationality: '',
  dateOfBirth: '', nationalId: '', taxId: '', country: 'PK', stateProvince: '', city: '', address: '', postalCode: '',
  bankName: '', bankAccountNumber: '', bankRoutingNumber: '', bankIBAN: '', bankSWIFT: '', bankAccountName: '',
  employmentType: 'FullTime', payFrequency: 'Monthly', status: 'Active', hireDate: '', probationEndDate: '', terminationDate: '',
  managerId: '', departmentId: '', positionId: '', payGradeId: '',
  // Gross-First Package Model
  grossSalary: 100000,
  basicPercent: 60,
  hraPercent: 25,
  medicalPercent: 10,
  transportPercent: 5,
  otherAllowancePercent: 0,
  basicSalary: 60000,
  currency: 'PKR',
  // Pakistan
  eobiEnabled: true, eobiNumber: '', eobiEmployeePercent: 1.0, eobiEmployerPercent: 5.0,
  pfEnabled: false, pfEmployeePercent: 8.33, pfEmployerPercent: 8.33,
  // USA
  usFicaEnabled: false, us401kEnabled: false, us401kEmployeePercent: 5.0, us401kEmployerPercent: 4.0, usHealthPreTaxDeduction: 0,
  // Canada
  caCppEnabled: false, caEiEnabled: false, caRrspEnabled: false, caRrspEmployeePercent: 5.0, caRrspEmployerPercent: 4.0,
  // UK
  ukPayeTaxCode: '1257L', ukNicEnabled: false, ukPensionEnabled: false, ukPensionEmployeePercent: 5.0, ukPensionEmployerPercent: 3.0,
  // UAE
  uaeWpsRoutingCode: '', uaeGpssaEnabled: false, uaeGpssaEmployeePercent: 5.0, uaeGpssaEmployerPercent: 12.5, uaeGratuityAccrualEnabled: true,
  // Saudi Arabia
  saZatcaId: '', saGosiEnabled: false, saGosiEmployeePercent: 9.75, saGosiEmployerPercent: 11.75, saEosbAccrualEnabled: true,
  // Europe (EU)
  euSocialEnabled: false, euSocialSecurityId: '', euEmployeeSocialPercent: 9.0, euEmployerSocialPercent: 18.0,
  euSupplementaryPensionEnabled: false, euPensionEmployeePercent: 2.0, euPensionEmployerPercent: 2.0,
  // General Tax
  taxFilingStatus: 'Single', taxExemptions: 0, additionalTaxWithholding: 0, emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  highestDegree: '', institution: '', fieldOfStudy: '', graduationYear: '', skills: '', certifications: '',
};

const STEPS = [
  { key: 'personal', label: 'Personal Info', icon: Users },
  { key: 'employment', label: 'Employment & Dept', icon: Briefcase },
  { key: 'compensation', label: 'Gross Salary & Package Breakup', icon: CreditCard },
  { key: 'education', label: 'Education', icon: GraduationCap },
  { key: 'bank', label: 'Bank Details', icon: Landmark },
  { key: 'tax', label: 'Tax Info', icon: Shield },
] as const;

type StepKey = typeof STEPS[number]['key'];

export default function EmployeeDirectory() {
  const { employees, departments, positions, payGrades, fetchEmployees, fetchDepartments, fetchPositions, fetchPayGrades, createEmployee, updateEmployee, setEmployeeStatus } = usePayrollStore();
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState<StepKey>('personal');
  const [saving, setSaving] = useState(false);
  const [statutoryCountryView, setStatutoryCountryView] = useState<'PK' | 'US' | 'UK' | 'CA' | 'AE' | 'SA' | 'EU'>('PK');

  useEffect(() => { fetchEmployees(); fetchDepartments(); fetchPositions(); fetchPayGrades(); }, []);

  const filtered = employees
    .filter(e => {
      if (search && !`${e.firstName} ${e.lastName} ${e.employeeNumber} ${e.email}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (countryFilter && e.country !== countryFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const numA = a.employeeNumber || `${a.firstName} ${a.lastName}`;
      const numB = b.employeeNumber || `${b.firstName} ${b.lastName}`;
      return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
    });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setStatutoryCountryView('PK');
    setStep('personal');
    setView('form');
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    const empCountry = (emp.country || 'PK') as any;
    if (['DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'PL'].includes(empCountry)) {
      setStatutoryCountryView('EU');
    } else if (['PK', 'US', 'UK', 'CA', 'AE', 'SA'].includes(empCountry)) {
      setStatutoryCountryView(empCountry);
    } else {
      setStatutoryCountryView('PK');
    }

    const grossVal = emp.grossSalary || (emp.basicSalary ? emp.basicSalary / 0.6 : 100000);
    const basicPct = emp.basicPercent !== undefined ? emp.basicPercent : 60;
    const hraPct = emp.hraPercent !== undefined ? emp.hraPercent : 25;
    const medPct = emp.medicalPercent !== undefined ? emp.medicalPercent : 10;
    const transPct = emp.transportPercent !== undefined ? emp.transportPercent : 5;
    const otherPct = emp.otherAllowancePercent !== undefined ? emp.otherAllowancePercent : 0;

    setForm({
      firstName: emp.firstName, lastName: emp.lastName, middleName: emp.middleName, preferredName: emp.preferredName, email: emp.email, phone: emp.phone,
      gender: emp.gender, maritalStatus: emp.maritalStatus, nationality: emp.nationality, dateOfBirth: emp.dateOfBirth, nationalId: emp.nationalId,
      taxId: emp.taxId, country: emp.country || 'PK', stateProvince: emp.stateProvince, city: emp.city, address: emp.address,
      postalCode: emp.postalCode, bankName: emp.bankName, bankAccountNumber: emp.bankAccountNumber,
      bankRoutingNumber: emp.bankRoutingNumber, bankIBAN: emp.bankIBAN, bankSWIFT: emp.bankSWIFT, bankAccountName: emp.bankAccountName,
      employmentType: emp.employmentType, payFrequency: emp.payFrequency, status: emp.status, hireDate: emp.hireDate,
      probationEndDate: emp.probationEndDate || '', terminationDate: emp.terminationDate || '', managerId: emp.managerId || '',
      departmentId: emp.departmentId || '', positionId: emp.positionId || '', payGradeId: emp.payGradeId || '',
      grossSalary: Math.round(grossVal),
      basicPercent: basicPct,
      hraPercent: hraPct,
      medicalPercent: medPct,
      transportPercent: transPct,
      otherAllowancePercent: otherPct,
      basicSalary: emp.basicSalary || Math.round((grossVal * basicPct) / 100),
      currency: emp.currency || 'PKR',
      // PK
      eobiEnabled: emp.eobiEnabled !== undefined ? emp.eobiEnabled : true,
      eobiNumber: emp.eobiNumber || '',
      eobiEmployeePercent: emp.eobiEmployeePercent !== undefined ? emp.eobiEmployeePercent : 1.0,
      eobiEmployerPercent: emp.eobiEmployerPercent !== undefined ? emp.eobiEmployerPercent : 5.0,
      pfEnabled: emp.pfEnabled !== undefined ? emp.pfEnabled : false,
      pfEmployeePercent: emp.pfEmployeePercent !== undefined ? emp.pfEmployeePercent : 8.33,
      pfEmployerPercent: emp.pfEmployerPercent !== undefined ? emp.pfEmployerPercent : 8.33,
      // US
      usFicaEnabled: emp.usFicaEnabled !== undefined ? emp.usFicaEnabled : (emp.country === 'US'),
      us401kEnabled: emp.us401kEnabled || false,
      us401kEmployeePercent: emp.us401kEmployeePercent || 5.0,
      us401kEmployerPercent: emp.us401kEmployerPercent || 4.0,
      usHealthPreTaxDeduction: emp.usHealthPreTaxDeduction || 0,
      // CA
      caCppEnabled: emp.caCppEnabled !== undefined ? emp.caCppEnabled : (emp.country === 'CA'),
      caEiEnabled: emp.caEiEnabled !== undefined ? emp.caEiEnabled : (emp.country === 'CA'),
      caRrspEnabled: emp.caRrspEnabled || false,
      caRrspEmployeePercent: emp.caRrspEmployeePercent || 5.0,
      caRrspEmployerPercent: emp.caRrspEmployerPercent || 4.0,
      // UK
      ukPayeTaxCode: emp.ukPayeTaxCode || '1257L',
      ukNicEnabled: emp.ukNicEnabled !== undefined ? emp.ukNicEnabled : (emp.country === 'UK'),
      ukPensionEnabled: emp.ukPensionEnabled !== undefined ? emp.ukPensionEnabled : (emp.country === 'UK'),
      ukPensionEmployeePercent: emp.ukPensionEmployeePercent || 5.0,
      ukPensionEmployerPercent: emp.ukPensionEmployerPercent || 3.0,
      // UAE
      uaeWpsRoutingCode: emp.uaeWpsRoutingCode || '',
      uaeGpssaEnabled: emp.uaeGpssaEnabled || false,
      uaeGpssaEmployeePercent: emp.uaeGpssaEmployeePercent || 5.0,
      uaeGpssaEmployerPercent: emp.uaeGpssaEmployerPercent || 12.5,
      uaeGratuityAccrualEnabled: emp.uaeGratuityAccrualEnabled !== undefined ? emp.uaeGratuityAccrualEnabled : true,
      // SA
      saZatcaId: emp.saZatcaId || '',
      saGosiEnabled: emp.saGosiEnabled !== undefined ? emp.saGosiEnabled : (emp.country === 'SA'),
      saGosiEmployeePercent: emp.saGosiEmployeePercent || 9.75,
      saGosiEmployerPercent: emp.saGosiEmployerPercent || 11.75,
      saEosbAccrualEnabled: emp.saEosbAccrualEnabled !== undefined ? emp.saEosbAccrualEnabled : true,
      // EU
      euSocialEnabled: emp.euSocialEnabled !== undefined ? emp.euSocialEnabled : ['DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'PL'].includes(emp.country as any),
      euSocialSecurityId: emp.euSocialSecurityId || '',
      euEmployeeSocialPercent: emp.euEmployeeSocialPercent || 9.0,
      euEmployerSocialPercent: emp.euEmployerSocialPercent || 18.0,
      euSupplementaryPensionEnabled: emp.euSupplementaryPensionEnabled || false,
      euPensionEmployeePercent: emp.euPensionEmployeePercent || 2.0,
      euPensionEmployerPercent: emp.euPensionEmployerPercent || 2.0,
      // Tax
      taxFilingStatus: emp.taxFilingStatus, taxExemptions: emp.taxExemptions,
      additionalTaxWithholding: emp.additionalTaxWithholding || 0,
      emergencyContactName: emp.emergencyContactName, emergencyContactPhone: emp.emergencyContactPhone,
      emergencyContactRelation: emp.emergencyContactRelation,
      highestDegree: (emp as any).highestDegree || '', institution: (emp as any).institution || '', fieldOfStudy: (emp as any).fieldOfStudy || '',
      graduationYear: (emp as any).graduationYear || '', skills: (emp as any).skills || '', certifications: (emp as any).certifications || '',
    });
    setStep('personal');
    setView('form');
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const stepIndex = STEPS.findIndex(s => s.key === step);
  const isLastStep = stepIndex === STEPS.length - 1;

  const validateStep = (): string[] => {
    const errs: string[] = [];
    if (step === 'personal') {
      if (!form.firstName.trim()) errs.push('First Name is required.');
      if (!form.lastName.trim()) errs.push('Last Name is required.');
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.push('Enter a valid email address.');
    }
    if (step === 'employment' && !form.hireDate) errs.push('Hire Date is required.');
    return errs;
  };

  const goToNext = () => {
    const errs = validateStep();
    if (errs.length) { alert(errs.join('\n')); return; }
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1].key);
  };

  const goToPrev = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1].key);
  };

  // Gross-First derived amounts
  const grossNum = Number(form.grossSalary) || 0;
  const basicPctNum = Number(form.basicPercent) || 60;
  const hraPctNum = Number(form.hraPercent) || 25;
  const medPctNum = Number(form.medicalPercent) || 10;
  const transPctNum = Number(form.transportPercent) || 5;
  const otherPctNum = Number(form.otherAllowancePercent) || 0;
  const totalPctSum = basicPctNum + hraPctNum + medPctNum + transPctNum + otherPctNum;

  const derivedBasic = (grossNum * basicPctNum) / 100;
  const derivedHra = (grossNum * hraPctNum) / 100;
  const derivedMed = (grossNum * medPctNum) / 100;
  const derivedTrans = (grossNum * transPctNum) / 100;
  const derivedOther = (grossNum * otherPctNum) / 100;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        grossSalary: grossNum,
        basicSalary: derivedBasic,
        basicPercent: basicPctNum,
        hraPercent: hraPctNum,
        medicalPercent: medPctNum,
        transportPercent: transPctNum,
        otherAllowancePercent: otherPctNum,
        taxExemptions: Number(form.taxExemptions) || 0,
        additionalTaxWithholding: Number(form.additionalTaxWithholding) || 0,
        // PK
        eobiEnabled: Boolean(form.eobiEnabled),
        eobiNumber: form.eobiNumber,
        eobiEmployeePercent: Number(form.eobiEmployeePercent) || 0,
        eobiEmployerPercent: Number(form.eobiEmployerPercent) || 0,
        pfEnabled: Boolean(form.pfEnabled),
        pfEmployeePercent: Number(form.pfEmployeePercent) || 0,
        pfEmployerPercent: Number(form.pfEmployerPercent) || 0,
        // US
        usFicaEnabled: Boolean(form.usFicaEnabled),
        us401kEnabled: Boolean(form.us401kEnabled),
        us401kEmployeePercent: Number(form.us401kEmployeePercent) || 0,
        us401kEmployerPercent: Number(form.us401kEmployerPercent) || 0,
        usHealthPreTaxDeduction: Number(form.usHealthPreTaxDeduction) || 0,
        // CA
        caCppEnabled: Boolean(form.caCppEnabled),
        caEiEnabled: Boolean(form.caEiEnabled),
        caRrspEnabled: Boolean(form.caRrspEnabled),
        caRrspEmployeePercent: Number(form.caRrspEmployeePercent) || 0,
        caRrspEmployerPercent: Number(form.caRrspEmployerPercent) || 0,
        // UK
        ukPayeTaxCode: form.ukPayeTaxCode,
        ukNicEnabled: Boolean(form.ukNicEnabled),
        ukPensionEnabled: Boolean(form.ukPensionEnabled),
        ukPensionEmployeePercent: Number(form.ukPensionEmployeePercent) || 0,
        ukPensionEmployerPercent: Number(form.ukPensionEmployerPercent) || 0,
        // UAE
        uaeWpsRoutingCode: form.uaeWpsRoutingCode,
        uaeGpssaEnabled: Boolean(form.uaeGpssaEnabled),
        uaeGpssaEmployeePercent: Number(form.uaeGpssaEmployeePercent) || 0,
        uaeGpssaEmployerPercent: Number(form.uaeGpssaEmployerPercent) || 0,
        uaeGratuityAccrualEnabled: Boolean(form.uaeGratuityAccrualEnabled),
        // SA
        saZatcaId: form.saZatcaId,
        saGosiEnabled: Boolean(form.saGosiEnabled),
        saGosiEmployeePercent: Number(form.saGosiEmployeePercent) || 0,
        saGosiEmployerPercent: Number(form.saGosiEmployerPercent) || 0,
        saEosbAccrualEnabled: Boolean(form.saEosbAccrualEnabled),
        // EU
        euSocialEnabled: Boolean(form.euSocialEnabled),
        euSocialSecurityId: form.euSocialSecurityId,
        euEmployeeSocialPercent: Number(form.euEmployeeSocialPercent) || 0,
        euEmployerSocialPercent: Number(form.euEmployerSocialPercent) || 0,
        euSupplementaryPensionEnabled: Boolean(form.euSupplementaryPensionEnabled),
        euPensionEmployeePercent: Number(form.euPensionEmployeePercent) || 0,
        euPensionEmployerPercent: Number(form.euPensionEmployerPercent) || 0,
      };

      if (editing) {
        await updateEmployee(editing.id, payload);
      } else {
        await createEmployee(payload);
      }
      setView('list');
      fetchEmployees();
    } finally {
      setSaving(false);
    }
  };

  if (view === 'form') {
    return (
      <div className="p-6 max-w-[1300px] mx-auto space-y-6">
        <PageHeader
          title={editing ? `Edit Employee: ${editing.firstName} ${editing.lastName}` : 'Add New Employee'}
          description="Gross Package (Top-Down) compensation structure with automatic percentage breakup into Basic, HRA, Medical, Travel, and statutory schemes."
          actions={
            <Button variant="outline" onClick={() => setView('list')}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Directory
            </Button>
          }
        />

        {/* Wizard Stepper Tabs */}
        <div className="flex border-b border-border overflow-x-auto gap-1">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isCompleted = idx < stepIndex;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(s.key)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-teal-600 text-teal-600 bg-teal-50/50 dark:bg-teal-950/20'
                    : isCompleted
                    ? 'border-transparent text-foreground hover:border-border'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-1 rounded-md ${isActive ? 'bg-teal-600 text-white' : isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {step === 'personal' && (
            <FormSection icon={Users} title="Personal Details" tone="teal">
              <FormField label="First Name" required><Input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="e.g. Ali" /></FormField>
              <FormField label="Middle Name"><Input value={form.middleName} onChange={e => set('middleName', e.target.value)} placeholder="e.g. Raza" /></FormField>
              <FormField label="Last Name" required><Input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="e.g. Khan" /></FormField>
              <FormField label="Preferred Name"><Input value={form.preferredName} onChange={e => set('preferredName', e.target.value)} /></FormField>
              <FormField label="Official Email"><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="employee@company.com" /></FormField>
              <FormField label="Phone Number"><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+92 300 1234567" /></FormField>
              <FormField label="Primary Operating Country"><Select value={form.country} onValueChange={v => {
                if (v !== null) {
                  set('country', v);
                  if (['DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'PL'].includes(v)) {
                    setStatutoryCountryView('EU');
                  } else if (['PK', 'US', 'UK', 'CA', 'AE', 'SA'].includes(v)) {
                    setStatutoryCountryView(v as any);
                  }
                }
              }}>
                <SelectTrigger className="w-full font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select></FormField>
              <FormField label="Date of Birth"><Input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} /></FormField>
              <FormField label="Gender"><Select value={form.gender} onValueChange={v => v !== null && set('gender', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
              </Select></FormField>
              <FormField label="National ID / CNIC / SSN / Steuer-ID"><Input value={form.nationalId} onChange={e => set('nationalId', e.target.value)} placeholder="National ID / CNIC / SSN / Tax ID" /></FormField>
            </FormSection>
          )}

          {step === 'employment' && (
            <>
              <FormSection icon={Briefcase} title="Employment Status & Contract" tone="teal">
                <FormField label="Employment Type"><Select value={form.employmentType} onValueChange={v => v !== null && set('employmentType', v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FullTime">Full-Time Permanent</SelectItem>
                    <SelectItem value="PartTime">Part-Time</SelectItem>
                    <SelectItem value="Contract">Contract / Third-Party</SelectItem>
                    <SelectItem value="Intern">Internship</SelectItem>
                    <SelectItem value="Seasonal">Daily Wages / Seasonal</SelectItem>
                  </SelectContent>
                </Select></FormField>
                <FormField label="Pay Frequency"><Select value={form.payFrequency} onValueChange={v => v !== null && set('payFrequency', v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly (12 Periods)</SelectItem>
                    <SelectItem value="SemiMonthly">Semi-Monthly (24 Periods)</SelectItem>
                    <SelectItem value="BiWeekly">Bi-Weekly (26 Periods)</SelectItem>
                    <SelectItem value="Weekly">Weekly (52 Periods)</SelectItem>
                  </SelectContent>
                </Select></FormField>
                <FormField label="Status"><Select value={form.status} onValueChange={v => v !== null && set('status', v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="OnLeave">On Leave</SelectItem>
                    <SelectItem value="Probation">Probationary</SelectItem>
                    <SelectItem value="Terminated">Terminated / Resigned</SelectItem>
                  </SelectContent>
                </Select></FormField>
                <FormField label="Hire Date" required><Input type="date" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} /></FormField>
                <FormField label="Probation End Date"><Input type="date" value={form.probationEndDate} onChange={e => set('probationEndDate', e.target.value)} /></FormField>
                <FormField label="Termination Date"><Input type="date" value={form.terminationDate} onChange={e => set('terminationDate', e.target.value)} /></FormField>
              </FormSection>

              <FormSection icon={Building2} title="Department & Organization" tone="violet">
                <FormField label="Department"><Select value={form.departmentId} onValueChange={v => set('departmentId', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select></FormField>
                <FormField label="Position / Designation"><Select value={form.positionId} onValueChange={v => set('positionId', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>{positions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select></FormField>
                <FormField label="Pay Grade Level"><Select value={form.payGradeId} onValueChange={v => set('payGradeId', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select pay grade" /></SelectTrigger>
                  <SelectContent>{payGrades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select></FormField>
                <FormField label="Reporting Manager"><Select value={form.managerId} onValueChange={v => set('managerId', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Manager</SelectItem>
                    {employees.filter(e => e.id !== editing?.id && e.status === 'Active').map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                  </SelectContent>
                </Select></FormField>
              </FormSection>
            </>
          )}

          {/* STEP: GROSS SALARY & PERCENTAGE BREAKUP */}
          {step === 'compensation' && (
            <div className="space-y-6">
              {/* Primary Section: Agreed Total Gross Package */}
              <div className="p-5 rounded-2xl border-2 border-teal-600 bg-teal-50/40 dark:bg-teal-950/20 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-teal-200 dark:border-teal-800 pb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-black text-teal-950 dark:text-teal-200 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-teal-600" />
                      1. Total Agreed Gross Salary Package (Top-Down Anchor)
                    </h3>
                    <p className="text-xs text-teal-700 dark:text-teal-400 mt-0.5">
                      Enter the agreed monthly Gross Package. The system automatically splits it by your percentage breakup below.
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                    totalPctSum === 100
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-400'
                  }`}>
                    Breakup Total: {totalPctSum}% {totalPctSum === 100 ? '✓ Balanced' : '(Must equal 100%)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-black text-sm text-foreground block mb-1">TOTAL MONTHLY GROSS SALARY</label>
                    <Input
                      type="number"
                      value={form.grossSalary}
                      onChange={e => set('grossSalary', e.target.value)}
                      placeholder="e.g. 100000"
                      className="font-mono font-black text-lg h-11 border-teal-500 bg-white dark:bg-slate-900 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-xs text-foreground block mb-1">SALARY CURRENCY</label>
                    <Select value={form.currency} onValueChange={v => set('currency', v)}>
                      <SelectTrigger className="w-full font-mono font-bold h-11 bg-white dark:bg-slate-900"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                        <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                        <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="PLN">PLN - Polish Złoty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="font-bold text-xs text-foreground block mb-1">ADDITIONAL TAX WITHHOLDING</label>
                    <Input
                      type="number"
                      value={form.additionalTaxWithholding}
                      onChange={e => set('additionalTaxWithholding', e.target.value)}
                      placeholder="0"
                      className="h-11 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Percentage Breakup of Gross */}
              <FormSection icon={Calculator} title="2. Gross Salary Percentage Breakup (Basic, HRA, Medical, Travel, Utilities)" tone="teal">
                {/* 1. Basic Pay % */}
                <FormField label="Basic Salary Portion (% of Gross)">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={form.basicPercent}
                        onChange={e => set('basicPercent', e.target.value)}
                        placeholder="60"
                        className="font-bold"
                      />
                      <span className="text-xs font-bold text-muted-foreground">%</span>
                    </div>
                    <span className="text-[11px] text-teal-700 font-black block font-mono">
                      = {form.currency} {derivedBasic.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Statutory Base)
                    </span>
                  </div>
                </FormField>

                {/* 2. House Rent Allowance (HRA) % */}
                <FormField label="House Rent Allowance / HRA (% of Gross)">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={form.hraPercent}
                        onChange={e => set('hraPercent', e.target.value)}
                        placeholder="25"
                      />
                      <span className="text-xs font-bold text-muted-foreground">%</span>
                    </div>
                    <span className="text-[11px] text-teal-700 font-bold block font-mono">
                      = {form.currency} {derivedHra.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </FormField>

                {/* 3. Medical Allowance % */}
                <FormField label="Medical Allowance (% of Gross)">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={form.medicalPercent}
                        onChange={e => set('medicalPercent', e.target.value)}
                        placeholder="10"
                      />
                      <span className="text-xs font-bold text-muted-foreground">%</span>
                    </div>
                    <span className="text-[11px] text-teal-700 font-bold block font-mono">
                      = {form.currency} {derivedMed.toLocaleString(undefined, { minimumFractionDigits: 2 })} (FBR 10% Exempt)
                    </span>
                  </div>
                </FormField>

                {/* 4. Travel / Transport Allowance % */}
                <FormField label="Travel / Conveyance Allowance (% of Gross)">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={form.transportPercent}
                        onChange={e => set('transportPercent', e.target.value)}
                        placeholder="5"
                      />
                      <span className="text-xs font-bold text-muted-foreground">%</span>
                    </div>
                    <span className="text-[11px] text-teal-700 font-bold block font-mono">
                      = {form.currency} {derivedTrans.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </FormField>

                {/* 5. Utility / Special Allowance % */}
                <FormField label="Utility / Special Allowance (% of Gross)">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={form.otherAllowancePercent}
                        onChange={e => set('otherAllowancePercent', e.target.value)}
                        placeholder="0"
                      />
                      <span className="text-xs font-bold text-muted-foreground">%</span>
                    </div>
                    <span className="text-[11px] text-teal-700 font-bold block font-mono">
                      = {form.currency} {derivedOther.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </FormField>

                {/* Summary Reconciled Card */}
                <div className="col-span-full p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-bold block">Gross Salary Reconciliation Check:</span>
                    <strong className="text-sm text-teal-300">Basic ({basicPctNum}%) + HRA ({hraPctNum}%) + Medical ({medPctNum}%) + Travel ({transPctNum}%) + Utility ({otherPctNum}%)</strong>
                  </div>
                  <div className="text-right font-mono font-black text-base text-emerald-400">
                    Total: {form.currency} {(derivedBasic + derivedHra + derivedMed + derivedTrans + derivedOther).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </FormSection>

              {/* Section 3: Country Statutory Rules Selector */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                      <Globe className="w-4 h-4 text-teal-600" />
                      3. Country-Specific Statutory & Retirement Deductions
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Statutory deductions calculate automatically from the derived Basic Salary ({form.currency} {derivedBasic.toFixed(2)}).
                    </p>
                  </div>

                  {/* Country Fast-Switch Tabs */}
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl overflow-x-auto text-xs font-bold">
                    {(['PK', 'US', 'UK', 'CA', 'AE', 'SA', 'EU'] as const).map(cCode => (
                      <button
                        key={cCode}
                        type="button"
                        onClick={() => setStatutoryCountryView(cCode)}
                        className={`px-3 py-1 rounded-lg transition-all shrink-0 ${
                          statutoryCountryView === cCode
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {cCode === 'PK' ? '🇵🇰 Pakistan' :
                         cCode === 'US' ? '🇺🇸 USA' :
                         cCode === 'UK' ? '🇬🇧 UK' :
                         cCode === 'CA' ? '🇨🇦 Canada' :
                         cCode === 'AE' ? '🇦🇪 UAE' :
                         cCode === 'SA' ? '🇸🇦 Saudi Arabia' : '🇪🇺 Europe (EU)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 🇪🇺 EUROPE (EU) STATUTORY RULES */}
                {statutoryCountryView === 'EU' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-blue-600" /> Statutory EU Social Insurance (Health, Pension, Unemployment & Care)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <FormField label="EU Social Insurance Status">
                          <Select value={form.euSocialEnabled ? 'true' : 'false'} onValueChange={v => set('euSocialEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (Enrolled in EU Social Insurance)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable / Exempt (Cross-border / Expat)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Social Security / Steuer-ID / NAF No.">
                          <Input value={form.euSocialSecurityId} onChange={e => set('euSocialSecurityId', e.target.value)} placeholder="e.g. DE-9948201 / SSN" disabled={!form.euSocialEnabled} />
                        </FormField>
                        <FormField label="Employee Social Contribution (%)">
                          <Input type="number" step="0.1" value={form.euEmployeeSocialPercent} onChange={e => set('euEmployeeSocialPercent', e.target.value)} placeholder="9.0" disabled={!form.euSocialEnabled} />
                        </FormField>
                        <FormField label="Employer Social Contribution (%)">
                          <Input type="number" step="0.1" value={form.euEmployerSocialPercent} onChange={e => set('euEmployerSocialPercent', e.target.value)} placeholder="18.0" disabled={!form.euSocialEnabled} />
                        </FormField>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                        <PiggyBank className="w-4 h-4 text-teal-600" /> Supplementary / Company Pension Scheme (bAV / PPK / Retraite)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <FormField label="Supplementary Pension Status">
                          <Select value={form.euSupplementaryPensionEnabled ? 'true' : 'false'} onValueChange={v => set('euSupplementaryPensionEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (Enrolled in Company Pension)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable (No Company Pension)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Employee Pension (%)">
                          <Input type="number" step="0.1" value={form.euPensionEmployeePercent} onChange={e => set('euPensionEmployeePercent', e.target.value)} placeholder="2.0" disabled={!form.euSupplementaryPensionEnabled} />
                        </FormField>
                        <FormField label="Employer Pension Match (%)">
                          <Input type="number" step="0.1" value={form.euPensionEmployerPercent} onChange={e => set('euPensionEmployerPercent', e.target.value)} placeholder="2.0" disabled={!form.euSupplementaryPensionEnabled} />
                        </FormField>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🇵🇰 PAKISTAN STATUTORY RULES */}
                {statutoryCountryView === 'PK' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-indigo-600" /> Employees' Old-Age Benefits Institution (EOBI)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <FormField label="EOBI Applicable Status">
                          <Select value={form.eobiEnabled ? 'true' : 'false'} onValueChange={v => set('eobiEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable / Enrolled</SelectItem>
                              <SelectItem value="false">❌ Not Applicable / Exempt</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="EOBI Registration No.">
                          <Input value={form.eobiNumber} onChange={e => set('eobiNumber', e.target.value)} placeholder="e.g. EOBI-884920" disabled={!form.eobiEnabled} />
                        </FormField>
                        <FormField label="Employee EOBI (1% of Basic)">
                          <Input type="number" step="0.1" value={form.eobiEmployeePercent} onChange={e => set('eobiEmployeePercent', e.target.value)} placeholder="1.0" disabled={!form.eobiEnabled} />
                        </FormField>
                        <FormField label="Employer EOBI (5% of Basic)">
                          <Input type="number" step="0.1" value={form.eobiEmployerPercent} onChange={e => set('eobiEmployerPercent', e.target.value)} placeholder="5.0" disabled={!form.eobiEnabled} />
                        </FormField>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                        <PiggyBank className="w-4 h-4 text-rose-600" /> Provident Fund (PF) Scheme
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <FormField label="Provident Fund Status">
                          <Select value={form.pfEnabled ? 'true' : 'false'} onValueChange={v => set('pfEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (Enrolled in PF)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable (No PF)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="PF Employee Deduction (% of Basic)">
                          <Input type="number" step="0.01" value={form.pfEmployeePercent} onChange={e => set('pfEmployeePercent', e.target.value)} placeholder="8.33" disabled={!form.pfEnabled} />
                        </FormField>
                        <FormField label="PF Employer Match (% of Basic)">
                          <Input type="number" step="0.01" value={form.pfEmployerPercent} onChange={e => set('pfEmployerPercent', e.target.value)} placeholder="8.33" disabled={!form.pfEnabled} />
                        </FormField>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🇺🇸 USA STATUTORY RULES */}
                {statutoryCountryView === 'US' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-blue-600" /> FICA (Social Security & Medicare)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <FormField label="FICA Statutory Withholding">
                          <Select value={form.usFicaEnabled ? 'true' : 'false'} onValueChange={v => set('usFicaEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (6.2% Social Security + 1.45% Medicare)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable / Exempt (e.g. Non-Resident Alien)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Pre-Tax Health / Dental Insurance ($ / Month)">
                          <Input type="number" value={form.usHealthPreTaxDeduction} onChange={e => set('usHealthPreTaxDeduction', e.target.value)} placeholder="e.g. 250" />
                        </FormField>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                        <PiggyBank className="w-4 h-4 text-purple-600" /> 401(k) Retirement Plan
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <FormField label="401(k) Enrollment">
                          <Select value={form.us401kEnabled ? 'true' : 'false'} onValueChange={v => set('us401kEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (Enrolled in 401k)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable (Opt-out)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Employee 401(k) Contribution (%)">
                          <Input type="number" step="0.1" value={form.us401kEmployeePercent} onChange={e => set('us401kEmployeePercent', e.target.value)} placeholder="5.0" disabled={!form.us401kEnabled} />
                        </FormField>
                        <FormField label="Employer 401(k) Match (%)">
                          <Input type="number" step="0.1" value={form.us401kEmployerPercent} onChange={e => set('us401kEmployerPercent', e.target.value)} placeholder="4.0" disabled={!form.us401kEnabled} />
                        </FormField>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🇬🇧 UK STATUTORY RULES */}
                {statutoryCountryView === 'UK' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-amber-600" /> HMRC PAYE Tax Code & National Insurance (NIC)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <FormField label="HMRC Tax Code">
                          <Input value={form.ukPayeTaxCode} onChange={e => set('ukPayeTaxCode', e.target.value)} placeholder="1257L / BR / 0T" />
                        </FormField>
                        <FormField label="National Insurance (Class 1 NIC)">
                          <Select value={form.ukNicEnabled ? 'true' : 'false'} onValueChange={v => set('ukNicEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (8% Employee / 13.8% Employer)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable / Category C Exempt</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                        <PiggyBank className="w-4 h-4 text-teal-600" /> Workplace Pension Auto-Enrollment
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <FormField label="Workplace Pension Status">
                          <Select value={form.ukPensionEnabled ? 'true' : 'false'} onValueChange={v => set('ukPensionEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (Auto-Enrolled)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable / Opted Out</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Employee Pension Contribution (%)">
                          <Input type="number" step="0.1" value={form.ukPensionEmployeePercent} onChange={e => set('ukPensionEmployeePercent', e.target.value)} placeholder="5.0" disabled={!form.ukPensionEnabled} />
                        </FormField>
                        <FormField label="Employer Pension Contribution (%)">
                          <Input type="number" step="0.1" value={form.ukPensionEmployerPercent} onChange={e => set('ukPensionEmployerPercent', e.target.value)} placeholder="3.0" disabled={!form.ukPensionEnabled} />
                        </FormField>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🇨🇦 CANADA STATUTORY RULES */}
                {statutoryCountryView === 'CA' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-red-900 dark:text-red-300 flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-red-600" /> Canada Pension Plan (CPP) & Employment Insurance (EI)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <FormField label="CPP Statutory Pension (5.95%)">
                          <Select value={form.caCppEnabled ? 'true' : 'false'} onValueChange={v => set('caCppEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (5.95% Employee + 5.95% Employer)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable / CPT30 Election</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Employment Insurance (EI 1.66%)">
                          <Select value={form.caEiEnabled ? 'true' : 'false'} onValueChange={v => set('caEiEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (1.66% Employee / 1.4x Employer)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable / Exempt Shareholder</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <PiggyBank className="w-4 h-4 text-emerald-600" /> Group RRSP Plan
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <FormField label="Group RRSP Status">
                          <Select value={form.caRrspEnabled ? 'true' : 'false'} onValueChange={v => set('caRrspEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (Enrolled in RRSP)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="Employee RRSP (%)">
                          <Input type="number" step="0.1" value={form.caRrspEmployeePercent} onChange={e => set('caRrspEmployeePercent', e.target.value)} placeholder="5.0" disabled={!form.caRrspEnabled} />
                        </FormField>
                        <FormField label="Employer RRSP Match (%)">
                          <Input type="number" step="0.1" value={form.caRrspEmployerPercent} onChange={e => set('caRrspEmployerPercent', e.target.value)} placeholder="4.0" disabled={!form.caRrspEnabled} />
                        </FormField>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🇦🇪 UAE STATUTORY RULES */}
                {statutoryCountryView === 'AE' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <Landmark className="w-4 h-4 text-emerald-600" /> MOHRE Wage Protection System (WPS) & GPSSA
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <FormField label="WPS Routing Code / Mol ID">
                          <Input value={form.uaeWpsRoutingCode} onChange={e => set('uaeWpsRoutingCode', e.target.value)} placeholder="e.g. WPS-MOL-99210" />
                        </FormField>
                        <FormField label="GPSSA Pension (UAE Nationals)">
                          <Select value={form.uaeGpssaEnabled ? 'true' : 'false'} onValueChange={v => set('uaeGpssaEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (5% Employee / 12.5% Employer)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable (Expatriate Staff)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="End of Service Gratuity (EOSB)">
                          <Select value={form.uaeGratuityAccrualEnabled ? 'true' : 'false'} onValueChange={v => set('uaeGratuityAccrualEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (21 Days / Year Basic)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🇸🇦 SAUDI ARABIA STATUTORY RULES */}
                {statutoryCountryView === 'SA' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-3">
                      <h4 className="text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-teal-600" /> ZATCA Mudad & GOSI Social Insurance
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <FormField label="ZATCA / Mudad ID">
                          <Input value={form.saZatcaId} onChange={e => set('saZatcaId', e.target.value)} placeholder="e.g. MUDAD-77491" />
                        </FormField>
                        <FormField label="GOSI Social Insurance">
                          <Select value={form.saGosiEnabled ? 'true' : 'false'} onValueChange={v => set('saGosiEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (9.75% Saudi / 11.75% Employer)</SelectItem>
                              <SelectItem value="false">❌ Expatriate Only (2% Hazard Rate)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                        <FormField label="End of Service Benefit (EOSB)">
                          <Select value={form.saEosbAccrualEnabled ? 'true' : 'false'} onValueChange={v => set('saEosbAccrualEnabled', v === 'true')}>
                            <SelectTrigger className="w-full font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">✅ Applicable (Labor Law Accrual)</SelectItem>
                              <SelectItem value="false">❌ Not Applicable</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'education' && (
            <FormSection icon={GraduationCap} title="Education Details" tone="indigo">
              <FormField label="Highest Degree"><Select value={form.highestDegree} onValueChange={v => v !== null && set('highestDegree', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select degree" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HighSchool">High School</SelectItem><SelectItem value="Diploma">Diploma</SelectItem>
                  <SelectItem value="Associate">Associate Degree</SelectItem><SelectItem value="Bachelor">Bachelor's</SelectItem>
                  <SelectItem value="Master">Master's</SelectItem><SelectItem value="Doctorate">Doctorate / PhD</SelectItem>
                </SelectContent>
              </Select></FormField>
              <FormField label="Field of Study"><Input value={form.fieldOfStudy} onChange={e => set('fieldOfStudy', e.target.value)} placeholder="Computer Science" /></FormField>
              <FormField label="Graduation Year"><Input type="number" value={form.graduationYear} onChange={e => set('graduationYear', e.target.value)} placeholder="2020" /></FormField>
              <FormField label="Institution"><Input value={form.institution} onChange={e => set('institution', e.target.value)} placeholder="University / College name" /></FormField>
              <FormField label="Skills"><Input value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="Accounting, SAP, Excel..." /></FormField>
              <FormField label="Certifications"><Input value={form.certifications} onChange={e => set('certifications', e.target.value)} placeholder="ACCA, ICMA, CPA..." /></FormField>
            </FormSection>
          )}

          {step === 'bank' && (
            <FormSection icon={Landmark} title="Bank Account Details" tone="cyan">
              <FormField label="Bank Name"><Input value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="Deutsche Bank / BNP Paribas / Meezan" /></FormField>
              <FormField label="Account Title"><Input value={form.bankAccountName} onChange={e => set('bankAccountName', e.target.value)} placeholder="John Doe" /></FormField>
              <FormField label="Account Number"><Input value={form.bankAccountNumber} onChange={e => set('bankAccountNumber', e.target.value)} placeholder="123456789" /></FormField>
              <FormField label="Routing Number / BLZ / Sort Code"><Input value={form.bankRoutingNumber} onChange={e => set('bankRoutingNumber', e.target.value)} placeholder="021000021" /></FormField>
              <FormField label="IBAN"><Input value={form.bankIBAN} onChange={e => set('bankIBAN', e.target.value)} placeholder="DE89370400440532013000" /></FormField>
              <FormField label="SWIFT / BIC"><Input value={form.bankSWIFT} onChange={e => set('bankSWIFT', e.target.value)} placeholder="DEUTDEDBFXX" /></FormField>
            </FormSection>
          )}

          {step === 'tax' && (
            <FormSection icon={Shield} title="Tax Information" tone="rose">
              <FormField label="Tax ID / Steuer-ID / NTN / SSN"><Input value={form.taxId} onChange={e => set('taxId', e.target.value)} placeholder="Tax identification number" /></FormField>
              <FormField label="Tax Filing Status"><Select value={form.taxFilingStatus} onValueChange={v => set('taxFilingStatus', v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single (Filer / Steuerklasse 1)</SelectItem>
                  <SelectItem value="MarriedFilingJointly">Married Filing Jointly (Steuerklasse 3/4)</SelectItem>
                  <SelectItem value="MarriedFilingSeparately">Married Filing Separately</SelectItem>
                  <SelectItem value="HeadOfHousehold">Head of Household</SelectItem>
                  <SelectItem value="NonResident">Non-Resident / Non-Filer</SelectItem>
                </SelectContent>
              </Select></FormField>
              <FormField label="Tax Exemptions"><Input type="number" value={form.taxExemptions} onChange={e => set('taxExemptions', e.target.value)} placeholder="0" /></FormField>
            </FormSection>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t pt-4 sticky bottom-0 bg-background py-3">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
            {stepIndex > 0 && <Button variant="outline" onClick={goToPrev}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>}
          </div>
          {isLastStep
            ? <Button onClick={handleSubmit} disabled={saving}><Save className="mr-1.5 h-4 w-4" />{saving ? 'Saving...' : editing ? 'Update Employee' : 'Create Employee'}</Button>
            : <Button onClick={goToNext}>Save & Move to Next Tab <ArrowRight className="ml-1.5 h-4 w-4" /></Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-amber-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-amber-500 to-orange-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Employee Directory &amp; Gross Packages</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Manage employee records, agreed Gross Packages, percentage breakdowns (Basic 60%, HRA 25%, Medical 10%, Travel 5%), and global statutory schemes.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
              <Plus className="mr-1.5 h-4 w-4" /> Add Employee
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name, employee code, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={countryFilter} onValueChange={v => setCountryFilter(v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Countries" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Countries</SelectItem>
            {COUNTRY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="OnLeave">On Leave</SelectItem>
            <SelectItem value="Probation">Probation</SelectItem>
            <SelectItem value="Terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-5">Code</th>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Country</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5 text-right">Gross Package</th>
                <th className="p-3.5 text-right">Basic (60%)</th>
                <th className="p-3.5 text-center">Statutory Benefit Status</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(emp => {
                const gVal = emp.grossSalary || (emp.basicSalary ? emp.basicSalary / 0.6 : 0);
                const bVal = emp.basicSalary || (gVal * 0.6);
                return (
                  <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-foreground">{emp.employeeNumber}</td>
                    <td className="p-3.5 font-bold text-foreground">
                      <div>{emp.firstName} {emp.lastName}</div>
                      <span className="text-[10px] text-muted-foreground font-normal">{emp.email}</span>
                    </td>
                    <td className="p-3.5 font-semibold text-foreground">
                      {emp.country === 'PK' ? '🇵🇰 Pakistan' :
                       emp.country === 'US' ? '🇺🇸 USA' :
                       emp.country === 'UK' ? '🇬🇧 UK' :
                       emp.country === 'CA' ? '🇨🇦 Canada' :
                       emp.country === 'AE' ? '🇦🇪 UAE' :
                       emp.country === 'SA' ? '🇸🇦 Saudi Arabia' :
                       ['DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'PL'].includes(emp.country as any) ? `🇪🇺 Europe (${emp.country})` : emp.country}
                    </td>
                    <td className="p-3.5 text-muted-foreground">{departments.find(d => d.id === emp.departmentId)?.name || 'General'}</td>
                    <td className="p-3.5 text-right font-mono font-black text-blue-700 dark:text-blue-400">
                      {emp.currency || 'PKR'} {Number(gVal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-foreground">
                      {emp.currency || 'PKR'} {Number(bVal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-center">
                      {emp.country === 'PK' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          EOBI: {emp.eobiEnabled !== false ? `${emp.eobiEmployeePercent || 1}% / ${emp.eobiEmployerPercent || 5}%` : 'Exempt'} | PF: {emp.pfEnabled ? `${emp.pfEmployeePercent || 8.33}%` : 'None'}
                        </span>
                      ) : emp.country === 'US' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          FICA: {emp.usFicaEnabled !== false ? '6.2%+1.45%' : 'Exempt'} | 401k: {emp.us401kEnabled ? `${emp.us401kEmployeePercent}%` : 'None'}
                        </span>
                      ) : emp.country === 'UK' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          NIC: {emp.ukNicEnabled !== false ? '8%' : 'Exempt'} | Pension: {emp.ukPensionEnabled !== false ? '5%/3%' : 'Opt-out'}
                        </span>
                      ) : emp.country === 'CA' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          CPP/EI: {emp.caCppEnabled !== false ? '5.95%/1.66%' : 'Exempt'} | RRSP: {emp.caRrspEnabled ? `${emp.caRrspEmployeePercent}%` : 'None'}
                        </span>
                      ) : emp.country === 'AE' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          WPS: Active | GPSSA: {emp.uaeGpssaEnabled ? '5%/12.5%' : 'Expat'} | Gratuity: Active
                        </span>
                      ) : emp.country === 'SA' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          GOSI: {emp.saGosiEnabled !== false ? '9.75%/11.75%' : '2% Hazard'} | EOSB: Active
                        </span>
                      ) : ['DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'PL'].includes(emp.country as any) ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          EU Social: {emp.euSocialEnabled !== false ? `${emp.euEmployeeSocialPercent || 9}%` : 'Exempt'} | Pension: {emp.euSupplementaryPensionEnabled ? `${emp.euPensionEmployeePercent}%` : 'None'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Standard Statutory</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <StatusChip status={emp.status} label={emp.status} hex={emp.status === 'Active' ? '#10b981' : emp.status === 'Probation' ? '#f59e0b' : '#f43f5e'} />
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openEdit(emp)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        {emp.status === 'Active' ? (
                          <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => setEmployeeStatus(emp.id, 'Terminated')}>
                            <UserX className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700" onClick={() => setEmployeeStatus(emp.id, 'Active')}>
                            Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-0">
                    <EmptyState icon={Users} title="No Employees Found" hint="No employees found matching the filters. Click Add Employee to register new staff." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
