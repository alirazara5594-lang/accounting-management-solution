import { create } from 'zustand';
import { payrollApi, type Employee, type Department, type Position, type PayGrade, type PayComponent, type SalaryTaxSlab, type LeaveRequest, type AttendanceRecord, type Holiday, type LoanAdvance, type Payrun, type PayrunEmployee, type SalarySlip, type LeaveStatus } from '../api/modules/payroll.api';

interface PayrollState {
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  payGrades: PayGrade[];
  payComponents: PayComponent[];
  taxSlabs: SalaryTaxSlab[];
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  holidays: Holiday[];
  loans: LoanAdvance[];
  payruns: Payrun[];
  salarySlips: SalarySlip[];
  loading: boolean;
  error: string | null;
  activeTab: string;

  // Actions
  setActiveTab: (tab: string) => void;
  fetchEmployees: (params?: any) => Promise<void>;
  fetchEmployee: (id: string) => Promise<Employee | null>;
  createEmployee: (data: any) => Promise<Employee | null>;
  updateEmployee: (id: string, data: any) => Promise<Employee | null>;
  setEmployeeStatus: (id: string, status: string) => Promise<boolean>;
  fetchDepartments: () => Promise<void>;
  createDepartment: (data: any) => Promise<Department | null>;
  updateDepartment: (id: string, data: any) => Promise<Department | null>;
  deleteDepartment: (id: string) => Promise<boolean>;
  fetchPositions: () => Promise<void>;
  createPosition: (data: any) => Promise<Position | null>;
  updatePosition: (id: string, data: any) => Promise<Position | null>;
  deletePosition: (id: string) => Promise<boolean>;
  fetchPayGrades: () => Promise<void>;
  createPayGrade: (data: any) => Promise<PayGrade | null>;
  fetchPayComponents: (params?: any) => Promise<void>;
  createPayComponent: (data: any) => Promise<PayComponent | null>;
  fetchTaxSlabs: (params?: any) => Promise<void>;
  createTaxSlab: (data: any) => Promise<SalaryTaxSlab | null>;
  updateTaxSlab: (id: string, data: any) => Promise<SalaryTaxSlab | null>;
  deleteTaxSlab: (id: string) => Promise<boolean>;
  fetchLeaveRequests: (params?: any) => Promise<void>;
  createLeaveRequest: (data: any) => Promise<LeaveRequest | null>;
  actionLeaveRequest: (id: string, status: string, comments?: string) => Promise<boolean>;
  fetchAttendance: (params?: any) => Promise<void>;
  recordAttendance: (data: any) => Promise<AttendanceRecord | null>;
  fetchLoans: (params?: any) => Promise<void>;
  createLoanAdvance: (data: any) => Promise<LoanAdvance | null>;
  recordLoanRepayment: (id: string) => Promise<boolean>;
  fetchPayruns: (params?: any) => Promise<void>;
  fetchPayrunEmployees: (id: string) => Promise<PayrunEmployee[]>;
  calculatePayrun: (data: any) => Promise<any>;
  postPayrun: (data: any) => Promise<any>;
  postPayrunToGL: (id: string) => Promise<boolean>;
  fetchSalarySlips: (params?: any) => Promise<void>;
  fetchSalarySlip: (id: string) => Promise<SalarySlip | null>;
  fetchAll: () => Promise<void>;
}

export const usePayrollStore = create<PayrollState>((set, _get) => ({
  employees: [],
  departments: [],
  positions: [],
  payGrades: [],
  payComponents: [],
  taxSlabs: [],
  leaveRequests: [],
  attendanceRecords: [],
  holidays: [],
  loans: [],
  payruns: [],
  salarySlips: [],
  loading: false,
  error: null,
  activeTab: 'employees',

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchEmployees: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await payrollApi.getEmployees(params);
      set({ employees: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchEmployee: async (id) => {
    try {
      return await payrollApi.getEmployee(id);
    } catch { return null; }
  },

  createEmployee: async (data) => {
    try {
      const emp = await payrollApi.createEmployee(data);
      set(s => ({ employees: [emp, ...s.employees] }));
      return emp;
    } catch { return null; }
  },

  updateEmployee: async (id, data) => {
    try {
      const emp = await payrollApi.updateEmployee(id, data);
      set(s => ({ employees: s.employees.map(e => e.id === id ? emp : e) }));
      return emp;
    } catch { return null; }
  },

  setEmployeeStatus: async (id, status) => {
    try {
      const emp = await payrollApi.setEmployeeStatus(id, status);
      set(s => ({ employees: s.employees.map(e => e.id === id ? emp : e) }));
      return true;
    } catch { return false; }
  },

  fetchDepartments: async () => {
    try {
      const data = await payrollApi.getDepartments();
      set({ departments: data });
    } catch {}
  },

  createDepartment: async (data) => {
    try {
      const dept = await payrollApi.createDepartment(data);
      set(s => ({ departments: [...s.departments, dept] }));
      return dept;
    } catch { return null; }
  },

  updateDepartment: async (id, data) => {
    try {
      const dept = await payrollApi.updateDepartment(id, data);
      set(s => ({ departments: s.departments.map(d => d.id === id ? dept : d) }));
      return dept;
    } catch { return null; }
  },

  deleteDepartment: async (id) => {
    try {
      await payrollApi.deleteDepartment(id);
      set(s => ({ departments: s.departments.filter(d => d.id !== id) }));
      return true;
    } catch { return false; }
  },

  fetchPositions: async () => {
    try {
      const data = await payrollApi.getPositions();
      set({ positions: data });
    } catch {}
  },

  createPosition: async (data) => {
    try {
      const pos = await payrollApi.createPosition(data);
      set(s => ({ positions: [...s.positions, pos] }));
      return pos;
    } catch { return null; }
  },

  updatePosition: async (id, data) => {
    try {
      const pos = await payrollApi.updatePosition(id, data);
      set(s => ({ positions: s.positions.map(p => p.id === id ? pos : p) }));
      return pos;
    } catch { return null; }
  },

  deletePosition: async (id) => {
    try {
      await payrollApi.deletePosition(id);
      set(s => ({ positions: s.positions.filter(p => p.id !== id) }));
      return true;
    } catch { return false; }
  },

  fetchPayGrades: async () => {
    try {
      const data = await payrollApi.getPayGrades();
      set({ payGrades: data });
    } catch {}
  },

  createPayGrade: async (data) => {
    try {
      const grade = await payrollApi.createPayGrade(data);
      set(s => ({ payGrades: [...s.payGrades, grade] }));
      return grade;
    } catch { return null; }
  },

  fetchPayComponents: async (params) => {
    try {
      const data = await payrollApi.getPayComponents(params);
      set({ payComponents: data });
    } catch {}
  },

  createPayComponent: async (data) => {
    try {
      const comp = await payrollApi.createPayComponent(data);
      set(s => ({ payComponents: [...s.payComponents, comp] }));
      return comp;
    } catch { return null; }
  },

  fetchTaxSlabs: async (params) => {
    try {
      const data = await payrollApi.getTaxSlabs(params);
      set({ taxSlabs: data });
    } catch {}
  },

  createTaxSlab: async (data) => {
    try {
      const slab = await payrollApi.createTaxSlab(data);
      set(s => ({ taxSlabs: [...s.taxSlabs, slab] }));
      return slab;
    } catch { return null; }
  },

  updateTaxSlab: async (id, data) => {
    try {
      const slab = await payrollApi.updateTaxSlab(id, data);
      set(s => ({ taxSlabs: s.taxSlabs.map(t => t.id === id ? slab : t) }));
      return slab;
    } catch { return null; }
  },

  deleteTaxSlab: async (id) => {
    try {
      await payrollApi.deleteTaxSlab(id);
      set(s => ({ taxSlabs: s.taxSlabs.filter(t => t.id !== id) }));
      return true;
    } catch { return false; }
  },

  fetchLeaveRequests: async (params) => {
    try {
      const data = await payrollApi.getLeaveRequests(params);
      set({ leaveRequests: data });
    } catch {}
  },

  createLeaveRequest: async (data) => {
    try {
      const lr = await payrollApi.createLeaveRequest(data);
      set(s => ({ leaveRequests: [lr, ...s.leaveRequests] }));
      return lr;
    } catch { return null; }
  },

  actionLeaveRequest: async (id, status, comments) => {
    try {
      const lr = await payrollApi.actionLeaveRequest(id, { status: status as LeaveStatus, approverComments: comments });
      set(s => ({ leaveRequests: s.leaveRequests.map(l => l.id === id ? lr : l) }));
      return true;
    } catch { return false; }
  },

  fetchAttendance: async (params) => {
    try {
      const data = await payrollApi.getAttendance(params);
      set({ attendanceRecords: data });
    } catch {}
  },

  recordAttendance: async (data) => {
    try {
      const rec = await payrollApi.recordAttendance(data);
      set(s => ({ attendanceRecords: [rec, ...s.attendanceRecords] }));
      return rec;
    } catch { return null; }
  },

  fetchLoans: async (params) => {
    try {
      const data = await payrollApi.getLoans(params);
      set({ loans: data });
    } catch {}
  },

  createLoanAdvance: async (data) => {
    try {
      const loan = await payrollApi.createLoanAdvance(data);
      set(s => ({ loans: [loan, ...s.loans] }));
      return loan;
    } catch { return null; }
  },

  recordLoanRepayment: async (id) => {
    try {
      const loan = await payrollApi.recordLoanRepayment(id);
      set(s => ({ loans: s.loans.map(l => l.id === id ? loan : l) }));
      return true;
    } catch { return false; }
  },

  fetchPayruns: async (params) => {
    try {
      const data = await payrollApi.getPayruns(params);
      set({ payruns: data });
    } catch {}
  },

  fetchPayrunEmployees: async (id) => {
    try {
      return await payrollApi.getPayrunEmployees(id);
    } catch { return []; }
  },

  calculatePayrun: async (data) => {
    try {
      return await payrollApi.calculatePayrun(data);
    } catch { return null; }
  },

  postPayrun: async (data) => {
    try {
      return await payrollApi.postPayrun(data);
    } catch { return null; }
  },

  postPayrunToGL: async (id) => {
    try {
      const res = await payrollApi.postPayrunToGL(id);
      if (res?.success) {
        const data = await payrollApi.getPayruns();
        set({ payruns: data });
        return true;
      }
      return false;
    } catch { return false; }
  },

  fetchSalarySlips: async (params) => {
    try {
      const data = await payrollApi.getSalarySlips(params);
      set({ salarySlips: data });
    } catch {}
  },

  fetchSalarySlip: async (id) => {
    try {
      return await payrollApi.getSalarySlip(id);
    } catch { return null; }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [empData, deptData, posData, gradeData, compData, slabData, leaveData, attData, loanData, prData, slipData] = await Promise.allSettled([
        payrollApi.getEmployees(),
        payrollApi.getDepartments(),
        payrollApi.getPositions(),
        payrollApi.getPayGrades(),
        payrollApi.getPayComponents(),
        payrollApi.getTaxSlabs(),
        payrollApi.getLeaveRequests(),
        payrollApi.getAttendance(),
        payrollApi.getLoans(),
        payrollApi.getPayruns(),
        payrollApi.getSalarySlips(),
      ]);
      set({
        employees: empData.status === 'fulfilled' ? empData.value : [],
        departments: deptData.status === 'fulfilled' ? deptData.value : [],
        positions: posData.status === 'fulfilled' ? posData.value : [],
        payGrades: gradeData.status === 'fulfilled' ? gradeData.value : [],
        payComponents: compData.status === 'fulfilled' ? compData.value : [],
        taxSlabs: slabData.status === 'fulfilled' ? slabData.value : [],
        leaveRequests: leaveData.status === 'fulfilled' ? leaveData.value : [],
        attendanceRecords: attData.status === 'fulfilled' ? attData.value : [],
        loans: loanData.status === 'fulfilled' ? loanData.value : [],
        payruns: prData.status === 'fulfilled' ? prData.value : [],
        salarySlips: slipData.status === 'fulfilled' ? slipData.value : [],
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
}));
