import { apiClient } from '../client';

// ── Types ────────────────────────────────────────────────────────────────────
export type PayrollCountry = 'US' | 'CA' | 'UK' | 'DE' | 'FR' | 'NL' | 'BE' | 'ES' | 'IT' | 'PL' | 'PK' | 'SA' | 'AE';
export type EmployeeStatus = 'Active' | 'OnLeave' | 'Terminated' | 'Probation';
export type PayFrequency = 'Weekly' | 'BiWeekly' | 'SemiMonthly' | 'Monthly';
export type EmploymentType = 'FullTime' | 'PartTime' | 'Contract' | 'Intern' | 'Seasonal';
export type PayComponentType = 'Earning' | 'Deduction' | 'EmployerContribution';
export type PayrunStatus = 'Draft' | 'Calculated' | 'Approved' | 'Posted' | 'Cancelled';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type LeaveType = 'Annual' | 'Sick' | 'Maternity' | 'Paternity' | 'Bereavement' | 'Unpaid' | 'CompOff' | 'PublicHoliday';
export type TaxFilingStatus = 'Single' | 'MarriedFilingJointly' | 'MarriedFilingSeparately' | 'HeadOfHousehold' | 'NonResident';

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  nationalId: string;
  taxId: string;
  country: PayrollCountry;
  stateProvince: string;
  city: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  bankName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  bankAccountName: string;
  bankIBAN: string;
  bankSWIFT: string;
  employmentType: EmploymentType;
  payFrequency: PayFrequency;
  status: EmployeeStatus;
  hireDate: string;
  probationEndDate?: string;
  terminationDate?: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  payGradeId?: string;
  grossSalary?: number;
  basicSalary: number;
  basicPercent?: number;
  currency: string;
  taxFilingStatus: TaxFilingStatus;
  taxExemptions: number;
  additionalTaxWithholding?: number;
  // Pakistan Specific
  eobiEnabled?: boolean;
  eobiNumber?: string;
  eobiEmployeePercent?: number;
  eobiEmployerPercent?: number;
  pfEnabled?: boolean;
  pfEmployeePercent?: number;
  pfEmployerPercent?: number;
  // USA Specific
  usFicaEnabled?: boolean;
  us401kEnabled?: boolean;
  us401kEmployeePercent?: number;
  us401kEmployerPercent?: number;
  usHealthPreTaxDeduction?: number;
  // Canada Specific
  caCppEnabled?: boolean;
  caEiEnabled?: boolean;
  caRrspEnabled?: boolean;
  caRrspEmployeePercent?: number;
  caRrspEmployerPercent?: number;
  // UK Specific
  ukPayeTaxCode?: string;
  ukNicEnabled?: boolean;
  ukPensionEnabled?: boolean;
  ukPensionEmployeePercent?: number;
  ukPensionEmployerPercent?: number;
  // UAE Specific
  uaeWpsRoutingCode?: string;
  uaeGpssaEnabled?: boolean;
  uaeGpssaEmployeePercent?: number;
  uaeGpssaEmployerPercent?: number;
  uaeGratuityAccrualEnabled?: boolean;
  // Saudi Arabia Specific
  saZatcaId?: string;
  saGosiEnabled?: boolean;
  saGosiEmployeePercent?: number;
  saGosiEmployerPercent?: number;
  saEosbAccrualEnabled?: boolean;
  // Europe (EU) Specific
  euSocialEnabled?: boolean;
  euSocialSecurityId?: string;
  euEmployeeSocialPercent?: number;
  euEmployerSocialPercent?: number;
  euSupplementaryPensionEnabled?: boolean;
  euPensionEmployeePercent?: number;
  euPensionEmployerPercent?: number;
  // Allowances
  hraPercent?: number;
  transportPercent?: number;
  medicalPercent?: number;
  otherAllowancePercent?: number;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  parentDepartmentId?: string;
  managerId?: string;
  companyId?: string;
  isActive: boolean;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  description: string;
  departmentId?: string;
  minSalary: number;
  maxSalary: number;
  companyId?: string;
}

export interface PayGrade {
  id: string;
  code: string;
  name: string;
  minBasic: number;
  midBasic: number;
  maxBasic: number;
  companyId?: string;
}

export interface PayComponent {
  id: string;
  code: string;
  name: string;
  description: string;
  type: PayComponentType;
  category: string;
  country: PayrollCountry;
  isTaxable: boolean;
  isStatutory: boolean;
  fixedAmount?: number;
  percentageOf?: number;
  percentageBase?: string;
  accountId?: string;
  displayOrder: number;
  isActive: boolean;
  companyId?: string;
}

export interface SalaryTaxSlab {
  id: string;
  country: PayrollCountry;
  taxYear: number;
  name: string;
  currency: string;
  filingStatus: TaxFilingStatus;
  periodBasis: string;
  standardDeduction: number;
  personalAllowance: number;
  isActive: boolean;
  brackets: SalaryTaxBracket[];
  companyId?: string;
}

export interface SalaryTaxBracket {
  id: string;
  fromAmount: number;
  toAmount?: number;
  ratePercent: number;
  fixedTax: number;
  description?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  approverComments: string;
  companyId?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  breakStart?: string;
  breakEnd?: string;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  status: string;
  notes?: string;
  companyId?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  country: PayrollCountry;
  stateProvince?: string;
  isRecurring: boolean;
  companyId?: string;
}

export interface LoanAdvance {
  id: string;
  employeeId: string;
  loanNumber: string;
  loanType: string;
  principalAmount: number;
  interestRate: number;
  totalInstallments: number;
  installmentAmount: number;
  paidInstallments: number;
  balanceAmount: number;
  startDate: string;
  endDate?: string;
  status: string;
  companyId?: string;
}

export interface Payrun {
  id: string;
  payrunNumber: string;
  frequency: PayFrequency;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: PayrunStatus;
  companyId?: string;
  journalEntryId?: string;
  createdAt: string;
}

export interface PayrunEmployee {
  id: string;
  payrunId: string;
  employeeId: string;
  basicSalary: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  employerContributions: number;
  currency: string;
  status: PayrunStatus;
}

export interface SalarySlip {
  id: string;
  payrunEmployeeId: string;
  slipNumber: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  position: string;
  bankName: string;
  bankAccountLast4: string;
  basicSalary: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  employerContributions: number;
  currency: string;
  payFrequency: string;
  earnings: SalarySlipLine[];
  deductions: SalarySlipLine[];
  employerContribs: SalarySlipLine[];
}

export interface SalarySlipLine {
  code: string;
  name: string;
  amount: number;
  category: string;
  isStatutory: boolean;
}

// ── API Calls ────────────────────────────────────────────────────────────────
export const payrollApi = {
  // Employees
  getEmployees: (params?: { country?: PayrollCountry; status?: EmployeeStatus; departmentId?: string; companyId?: string }) =>
    apiClient<Employee[]>('/payroll/employees', { params }),
  getEmployee: (id: string) => apiClient<Employee>(`/payroll/employees/${id}`),
  getNextEmployeeNumber: () => apiClient<{ number: string }>('/payroll/employees/next-number'),
  createEmployee: (data: any) => apiClient<Employee>('/payroll/employees', { method: 'POST', body: data }),
  updateEmployee: (id: string, data: any) => apiClient<Employee>(`/payroll/employees/${id}`, { method: 'PUT', body: data }),
  setEmployeeStatus: (id: string, status: string) => apiClient<Employee>(`/payroll/employees/${id}/status`, { method: 'POST', body: { status } }),

  // Departments
  getDepartments: (params?: { companyId?: string }) =>
    apiClient<Department[]>('/payroll/departments', { params }),
  createDepartment: (data: any) => apiClient<Department>('/payroll/departments', { method: 'POST', body: data }),
  updateDepartment: (id: string, data: any) => apiClient<Department>(`/payroll/departments/${id}`, { method: 'PUT', body: data }),
  deleteDepartment: (id: string) => apiClient(`/payroll/departments/${id}`, { method: 'DELETE' }),

  // Positions
  getPositions: (params?: { departmentId?: string; companyId?: string }) =>
    apiClient<Position[]>('/payroll/positions', { params }),
  createPosition: (data: any) => apiClient<Position>('/payroll/positions', { method: 'POST', body: data }),
  updatePosition: (id: string, data: any) => apiClient<Position>(`/payroll/positions/${id}`, { method: 'PUT', body: data }),
  deletePosition: (id: string) => apiClient(`/payroll/positions/${id}`, { method: 'DELETE' }),

  // Pay Grades
  getPayGrades: (params?: { companyId?: string }) =>
    apiClient<PayGrade[]>('/payroll/pay-grades', { params }),
  createPayGrade: (data: any) => apiClient<PayGrade>('/payroll/pay-grades', { method: 'POST', body: data }),
  updatePayGrade: (id: string, data: any) => apiClient<PayGrade>(`/payroll/pay-grades/${id}`, { method: 'PUT', body: data }),
  deletePayGrade: (id: string) => apiClient(`/payroll/pay-grades/${id}`, { method: 'DELETE' }),

  // Pay Components
  getPayComponents: (params?: { country?: PayrollCountry; type?: PayComponentType; companyId?: string }) =>
    apiClient<PayComponent[]>('/payroll/pay-components', { params }),
  createPayComponent: (data: any) => apiClient<PayComponent>('/payroll/pay-components', { method: 'POST', body: data }),
  updatePayComponent: (id: string, data: any) => apiClient<PayComponent>(`/payroll/pay-components/${id}`, { method: 'PUT', body: data }),
  deletePayComponent: (id: string) => apiClient(`/payroll/pay-components/${id}`, { method: 'DELETE' }),

  // Tax Slabs
  getTaxSlabs: (params?: { country?: PayrollCountry; taxYear?: number; companyId?: string }) =>
    apiClient<SalaryTaxSlab[]>('/payroll/tax-slabs', { params }),
  createTaxSlab: (data: any) => apiClient<SalaryTaxSlab>('/payroll/tax-slabs', { method: 'POST', body: data }),
  updateTaxSlab: (id: string, data: any) => apiClient<SalaryTaxSlab>(`/payroll/tax-slabs/${id}`, { method: 'PUT', body: data }),
  deleteTaxSlab: (id: string) => apiClient(`/payroll/tax-slabs/${id}`, { method: 'DELETE' }),

  // Leave
  getLeaveRequests: (params?: { employeeId?: string; status?: LeaveStatus; companyId?: string }) =>
    apiClient<LeaveRequest[]>('/payroll/leave-requests', { params }),
  createLeaveRequest: (data: any) => apiClient<LeaveRequest>('/payroll/leave-requests', { method: 'POST', body: data }),
  actionLeaveRequest: (id: string, data: { status: LeaveStatus; approverComments?: string }) =>
    apiClient<LeaveRequest>(`/payroll/leave-requests/${id}/action`, { method: 'POST', body: data }),

  // Attendance
  getAttendance: (params?: { employeeId?: string; from?: string; to?: string; companyId?: string }) =>
    apiClient<AttendanceRecord[]>('/payroll/attendance', { params }),
  recordAttendance: (data: any) => apiClient<AttendanceRecord>('/payroll/attendance', { method: 'POST', body: data }),

  // Holidays
  getHolidays: (params?: { country?: PayrollCountry; companyId?: string }) =>
    apiClient<Holiday[]>('/payroll/holidays', { params }),

  // Loans
  getLoans: (params?: { employeeId?: string; status?: string; companyId?: string }) =>
    apiClient<LoanAdvance[]>('/payroll/loans', { params }),
  createLoanAdvance: (data: any) => apiClient<LoanAdvance>('/payroll/loans', { method: 'POST', body: data }),
  recordLoanRepayment: (id: string) => apiClient<LoanAdvance>(`/payroll/loans/${id}/repay`, { method: 'POST' }),

  // Payruns
  getPayruns: (params?: { status?: PayrunStatus; companyId?: string }) =>
    apiClient<Payrun[]>('/payroll/payruns', { params }),
  getPayrun: (id: string) => apiClient<Payrun>(`/payroll/payruns/${id}`),
  getPayrunEmployees: (id: string) => apiClient<PayrunEmployee[]>(`/payroll/payruns/${id}/employees`),
  calculatePayrun: (data: any) => apiClient<any>('/payroll/payruns/calculate', { method: 'POST', body: data }),
  postPayrun: (data: any) => apiClient<any>('/payroll/payruns/post', { method: 'POST', body: data }),
  postPayrunToGL: (id: string) => apiClient<any>(`/payroll/payruns/${id}/post-to-gl`, { method: 'POST' }),

  // Salary Slips
  getSalarySlips: (params?: { payrunId?: string; employeeId?: string; companyId?: string }) =>
    apiClient<SalarySlip[]>('/payroll/salary-slips', { params }),
  getSalarySlip: (id: string) => apiClient<SalarySlip>(`/payroll/salary-slips/${id}`),
};
