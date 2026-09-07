import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { usePayrollStore } from './stores';
import { StatusChip } from './components/ui/status-chip';
import { TableSkeleton } from './components/ui/empty-state';
import EmployeeCumulativeStatement from './components/EmployeeCumulativeStatement';
import type { Employee, Department, Position, PayComponent, SalaryTaxSlab, LeaveRequest, Payrun, SalarySlip, AttendanceRecord, LoanAdvance } from './api/modules/payroll.api';

const countryLabels: Record<string, string> = {
  US: 'United States', CA: 'Canada', UK: 'United Kingdom', DE: 'Germany', FR: 'France',
  NL: 'Netherlands', BE: 'Belgium', ES: 'Spain', IT: 'Italy', PL: 'Poland',
  PK: 'Pakistan', SA: 'Saudi Arabia', AE: 'UAE',
};

const statusColors: Record<string, { label: string; hex: string }> = {
  Active: { label: 'Active', hex: '#10b981' }, OnLeave: { label: 'On Leave', hex: '#f59e0b' }, Terminated: { label: 'Terminated', hex: '#ef4444' }, Probation: { label: 'Probation', hex: '#8b5cf6' },
  Draft: { label: 'Draft', hex: '#94a3b8' }, Calculated: { label: 'Calculated (Pending GL)', hex: '#f59e0b' }, Approved: { label: 'Approved', hex: '#10b981' }, Posted: { label: 'Posted to GL', hex: '#10b981' },
  Cancelled: { label: 'Cancelled', hex: '#ef4444' }, Pending: { label: 'Pending', hex: '#f59e0b' }, Rejected: { label: 'Rejected', hex: '#ef4444' },
};

export default function PayrollWorkspace() {
  const store = usePayrollStore();
  const [activeTab, setActiveTab] = useState('employees');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [statementEmpId, setStatementEmpId] = useState<string | null>(null);

  useEffect(() => { store.fetchAll(); }, []);

  const tabs = [
    { key: 'employees', label: 'Employees', icon: '👤' },
    { key: 'tax-pf-ledger', label: 'Tax & PF Ledger', icon: '📈' },
    { key: 'departments', label: 'Departments', icon: '🏢' },
    { key: 'pay-components', label: 'Pay Components', icon: '💰' },
    { key: 'leave', label: 'Leave', icon: '🏖️' },
    { key: 'attendance', label: 'Attendance', icon: '📋' },
    { key: 'payruns', label: 'Payruns', icon: '🧮' },
    { key: 'salary-slips', label: 'Salary Slips', icon: '📄' },
    { key: 'tax-slabs', label: 'Tax Slabs', icon: '📊' },
    { key: 'loans', label: 'Loans', icon: '🏦' },
  ];

  const openCreate = (type: string) => { setModalType(type); setEditingItem(null); setShowModal(true); };
  const openEdit = (type: string, item: any) => { setModalType(type); setEditingItem(item); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setModalType(''); setEditingItem(null); };

  const handlePostPayrunToGL = async (id: string, num: string) => {
    if (!window.confirm(`Post Payrun ${num} to the General Ledger?\n\nThis will record balanced double-entry accounting journals for Salaries Expense, Accrued Salaries Payable, and Statutory Deductions.`)) return;
    const ok = await store.postPayrunToGL(id);
    if (ok) {
      alert(`✓ Payrun ${num} has been posted to the General Ledger!`);
      await store.fetchPayruns();
    } else {
      alert(`Error posting payrun ${num} to the General Ledger.`);
    }
  };

  return (
    <div className="workspace">
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
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Payroll &amp; HR</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Manage employees, payroll, leave, and statutory compliance</p>
            </div>
          </div>
          <div className="header-actions flex items-center gap-2 shrink-0 flex-wrap">
            {activeTab === 'employees' && <button className="btn btn-primary" onClick={() => openCreate('employee')}>+ Add Employee</button>}
            {activeTab === 'departments' && <button className="btn btn-primary" onClick={() => openCreate('department')}>+ Add Department</button>}
            {activeTab === 'pay-components' && <button className="btn btn-primary" onClick={() => openCreate('payComponent')}>+ Add Component</button>}
            {activeTab === 'leave' && <button className="btn btn-primary" onClick={() => openCreate('leaveRequest')}>+ New Leave Request</button>}
            {activeTab === 'tax-slabs' && <button className="btn btn-primary" onClick={() => openCreate('taxSlab')}>+ Add Tax Slab</button>}
            {activeTab === 'loans' && <button className="btn btn-primary" onClick={() => openCreate('loan')}>+ New Loan</button>}
            {activeTab === 'payruns' && <button className="btn btn-primary" onClick={() => openCreate('payrun')}>+ New Payrun</button>}
          </div>
        </div>
      </div>

      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            <span className="tab-icon">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="workspace-content">
        {store.loading && <TableSkeleton rows={6} />}

        {activeTab === 'employees' && !store.loading && (
          <EmployeeList employees={store.employees} departments={store.departments} positions={store.positions}
            onEdit={(e) => openEdit('employee', e)} onStatusChange={(id, s) => store.setEmployeeStatus(id, s)}
            onSelectStatement={(id) => setStatementEmpId(id)} />
        )}
        {activeTab === 'tax-pf-ledger' && !store.loading && (
          <EmployeeCumulativeStatement />
        )}
        {activeTab === 'departments' && !store.loading && (
          <DepartmentsList departments={store.departments} positions={store.positions}
            onEdit={(d) => openEdit('department', d)} onDelete={(id) => store.deleteDepartment(id)}
            onEditPosition={(p) => openEdit('position', p)} onDeletePosition={(id) => store.deletePosition(id)} />
        )}
        {activeTab === 'pay-components' && !store.loading && (
          <PayComponentsList components={store.payComponents}
            onEdit={(c) => openEdit('payComponent', c)} />
        )}
        {activeTab === 'leave' && !store.loading && (
          <LeaveList requests={store.leaveRequests} employees={store.employees}
            onAction={(id, status) => store.actionLeaveRequest(id, status)} />
        )}
        {activeTab === 'attendance' && !store.loading && (
          <AttendanceList records={store.attendanceRecords} employees={store.employees} />
        )}
        {activeTab === 'payruns' && !store.loading && (
          <PayrunsList payruns={store.payruns} onPostToGL={handlePostPayrunToGL} slips={store.salarySlips} employees={store.employees} />
        )}
        {activeTab === 'salary-slips' && !store.loading && (
          <SalarySlipsList slips={store.salarySlips} />
        )}
        {activeTab === 'tax-slabs' && !store.loading && (
          <TaxSlabsList slabs={store.taxSlabs}
            onEdit={(s) => openEdit('taxSlab', s)} onDelete={(id) => store.deleteTaxSlab(id)} />
        )}
        {activeTab === 'loans' && !store.loading && (
          <LoansList loans={store.loans} employees={store.employees}
            onRepay={(id) => store.recordLoanRepayment(id)} />
        )}
      </div>

      {showModal && (
        <PayrollModal type={modalType} item={editingItem} store={store} onClose={closeModal} />
      )}

      {statementEmpId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface, #fff)', width: '100%', maxWidth: '1100px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border, #e2e8f0)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <EmployeeCumulativeStatement initialEmployeeId={statementEmpId} isModal onClose={() => setStatementEmpId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Employee List ─────────────────────────────────────────────────────────────
function EmployeeList({ employees, departments, positions, onEdit, onStatusChange, onSelectStatement }: {
  employees: Employee[]; departments: Department[]; positions: Position[];
  onEdit: (e: Employee) => void; onStatusChange: (id: string, status: string) => void;
  onSelectStatement?: (id: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const filtered = employees.filter(e => {
    if (filter && !`${e.firstName} ${e.lastName} ${e.employeeNumber}`.toLowerCase().includes(filter.toLowerCase())) return false;
    if (countryFilter && e.country !== countryFilter) return false;
    return true;
  });

  return (
    <div className="list-view">
      <div className="list-filters">
        <input className="filter-input" placeholder="Search employees..." value={filter} onChange={e => setFilter(e.target.value)} />
        <select className="filter-select" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="">All Countries</option>
          {Object.entries(countryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee #</th><th>Name</th><th>Country</th><th>Department</th>
              <th>Position</th><th>Basic Salary</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => (
              <tr key={emp.id}>
                <td className="mono">{emp.employeeNumber}</td>
                <td><strong>{emp.firstName} {emp.lastName}</strong><br/><span className="text-muted">{emp.email}</span></td>
                <td>{countryLabels[emp.country] || emp.country}</td>
                <td>{departments.find(d => d.id === emp.departmentId)?.name || '-'}</td>
                <td>{positions.find(p => p.id === emp.positionId)?.name || '-'}</td>
                <td className="num">{emp.currency} {emp.basicSalary.toLocaleString()}</td>
                <td><StatusChip status={emp.status} label={statusColors[emp.status]?.label || emp.status} hex={statusColors[emp.status]?.hex || '#94a3b8'} /></td>
                <td>
                  <div className="cell-actions">
                    {onSelectStatement && (
                      <button
                        className="btn btn-sm btn-outline"
                        title="View cumulative tax & PF ledger since date of joining"
                        onClick={() => onSelectStatement(emp.id)}
                      >
                        📊 Tax & PF
                      </button>
                    )}
                    <button className="btn btn-sm" onClick={() => onEdit(emp)}>Edit</button>
                    {emp.status === 'Active' && <button className="btn btn-sm btn-warn" onClick={() => onStatusChange(emp.id, 'OnLeave')}>Set On Leave</button>}
                    {emp.status !== 'Terminated' && <button className="btn btn-sm btn-danger" onClick={() => onStatusChange(emp.id, 'Terminated')}>Terminate</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Departments List ──────────────────────────────────────────────────────────
function DepartmentsList({ departments, positions, onEdit, onDelete, onEditPosition, onDeletePosition }: {
  departments: Department[]; positions: Position[];
  onEdit: (d: Department) => void; onDelete: (id: string) => void;
  onEditPosition: (p: Position) => void; onDeletePosition: (id: string) => void;
}) {
  return (
    <div className="list-view">
      <h3>Departments</h3>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Description</th><th>Positions</th><th>Actions</th></tr></thead>
          <tbody>
            {departments.map(d => (
              <tr key={d.id}>
                <td className="mono">{d.code}</td>
                <td><strong>{d.name}</strong></td>
                <td>{d.description}</td>
                <td>{positions.filter(p => p.departmentId === d.id).length}</td>
                <td>
                  <div className="cell-actions">
                    <button className="btn btn-sm" onClick={() => onEdit(d)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => onDelete(d.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 style={{ marginTop: '1.5rem' }}>Positions</h3>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Department</th><th>Salary Range</th><th>Actions</th></tr></thead>
          <tbody>
            {positions.map(p => (
              <tr key={p.id}>
                <td className="mono">{p.code}</td>
                <td><strong>{p.name}</strong></td>
                <td>{departments.find(d => d.id === p.departmentId)?.name || '-'}</td>
                <td className="num">{p.minSalary.toLocaleString()} - {p.maxSalary.toLocaleString()}</td>
                <td>
                  <div className="cell-actions">
                    <button className="btn btn-sm" onClick={() => onEditPosition(p)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => onDeletePosition(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Pay Components List ───────────────────────────────────────────────────────
function PayComponentsList({ components, onEdit }: { components: PayComponent[]; onEdit: (c: PayComponent) => void }) {
  const [typeFilter, setTypeFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const filtered = components.filter(c => {
    if (typeFilter && c.type !== typeFilter) return false;
    if (countryFilter && c.country !== countryFilter) return false;
    return true;
  });

  return (
    <div className="list-view">
      <div className="list-filters">
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="Earning">Earning</option>
          <option value="Deduction">Deduction</option>
          <option value="EmployerContribution">Employer Contribution</option>
        </select>
        <select className="filter-select" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="">All Countries</option>
          {Object.entries(countryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Category</th><th>Country</th><th>Amount</th><th>Taxable</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td className="mono">{c.code}</td>
                <td><strong>{c.name}</strong></td>
                <td><span className="badge" style={{ background: c.type === 'Earning' ? '#16a34a' : c.type === 'Deduction' ? '#dc2626' : '#7c3aed' }}>{c.type}</span></td>
                <td>{c.category}</td>
                <td>{countryLabels[c.country] || c.country}</td>
                <td className="num">{c.fixedAmount != null ? `${c.fixedAmount}` : c.percentageOf != null ? `${c.percentageOf}%` : '-'}</td>
                <td>{c.isTaxable ? 'Yes' : 'No'}</td>
                <td><button className="btn btn-sm" onClick={() => onEdit(c)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Leave List ────────────────────────────────────────────────────────────────
function LeaveList({ requests, employees, onAction }: {
  requests: LeaveRequest[]; employees: Employee[];
  onAction: (id: string, status: string) => void;
}) {
  const getEmpName = (id: string) => { const e = employees.find(x => x.id === id); return e ? `${e.firstName} ${e.lastName}` : 'Unknown'; };

  return (
    <div className="list-view">
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {requests.map(lr => (
              <tr key={lr.id}>
                <td>{getEmpName(lr.employeeId)}</td>
                <td>{lr.leaveType}</td>
                <td>{lr.startDate}</td>
                <td>{lr.endDate}</td>
                <td className="num">{lr.totalDays}</td>
                <td>{lr.reason}</td>
                <td><StatusChip status={lr.status} label={statusColors[lr.status]?.label || lr.status} hex={statusColors[lr.status]?.hex || '#94a3b8'} /></td>
                <td>
                  {lr.status === 'Pending' && (
                    <div className="cell-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => onAction(lr.id, 'Approved')}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => onAction(lr.id, 'Rejected')}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Attendance List ───────────────────────────────────────────────────────────
function AttendanceList({ records, employees }: { records: AttendanceRecord[]; employees: Employee[] }) {
  const getEmpName = (id: string) => { const e = employees.find(x => x.id === id); return e ? `${e.firstName} ${e.lastName}` : 'Unknown'; };

  return (
    <div className="list-view">
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Employee</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td>{getEmpName(r.employeeId)}</td>
                <td>{r.date}</td>
                <td>{r.clockIn || '-'}</td>
                <td>{r.clockOut || '-'}</td>
                <td><StatusChip status={r.status} label={r.status} hex={r.status === 'Present' ? '#10b981' : r.status === 'Absent' ? '#f43f5e' : '#f59e0b'} /></td>
                <td>{r.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Payruns List ──────────────────────────────────────────────────────────────
function PayrunsList({
  payruns,
  onPostToGL,
  slips = [],
  employees = []
}: {
  payruns: Payrun[];
  onPostToGL?: (id: string, num: string) => void;
  slips?: any[];
  employees?: any[];
}) {
  const [selectedPayrun, setSelectedPayrun] = useState<Payrun | null>(null);

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="list-view">
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Payrun #</th>
              <th>Frequency</th>
              <th>Period</th>
              <th>Pay Date</th>
              <th>Status</th>
              <th>Created</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payruns.map(p => (
              <tr key={p.id}>
                <td className="mono"><strong>{p.payrunNumber}</strong></td>
                <td>{p.frequency}</td>
                <td>{p.periodStart} to {p.periodEnd}</td>
                <td>{p.payDate}</td>
                <td>
                  <StatusChip
                    status={p.status}
                    label={statusColors[p.status]?.label || p.status}
                    hex={statusColors[p.status]?.hex || '#94a3b8'}
                  />
                </td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="text-right">
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setSelectedPayrun(p)}
                    >
                      📄 Sign-off Sheet
                    </button>
                    {p.status !== 'Posted' && onPostToGL && (
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff', fontWeight: 700 }}
                        onClick={() => onPostToGL(p.id, p.payrunNumber)}
                      >
                        ✓ Post to GL (Accounts)
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {payruns.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  No payruns found. HR can calculate payruns from Payroll Processing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payrun Sign-off Sheet Modal */}
      {selectedPayrun && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--color-surface, #fff)', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border, #e2e8f0)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border, #e2e8f0)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Master Payroll Sign-Off Sheet</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #64748b)' }}>
                  Payrun: {selectedPayrun.payrunNumber} | Period: {selectedPayrun.periodStart} to {selectedPayrun.periodEnd} | Pay Date: {selectedPayrun.payDate}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-outline" onClick={handlePrintSheet}>🖨️ Print Sheet</button>
                <button className="btn btn-sm" onClick={() => setSelectedPayrun(null)}>✕ Close</button>
              </div>
            </div>

            {/* Status & SoD Notice */}
            <div style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', backgroundColor: selectedPayrun.status === 'Posted' ? '#f0fdf4' : '#fffbeb', border: `1px solid ${selectedPayrun.status === 'Posted' ? '#bbf7d0' : '#fef08a'}`, marginBottom: '1rem', fontSize: '0.8rem' }}>
              <strong>Status: {statusColors[selectedPayrun.status]?.label || selectedPayrun.status}</strong>
              <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
                {selectedPayrun.status === 'Posted'
                  ? '✓ This payrun has been verified by Finance and successfully posted to the General Ledger.'
                  : 'Pending Accounts review and General Ledger posting. Download or print this sheet for required executive signatures.'}
              </p>
            </div>

            {/* Signature Certificate */}
            <div style={{ border: '2px solid #cbd5e1', borderRadius: '0.75rem', padding: '1.25rem', marginTop: '1.5rem', background: '#f8fafc' }}>
              <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                Internal Control & Corporate Approval Signatures (Segregation of Duties)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>1. Prepared By</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>HR & Payroll Officer</div>
                  <div style={{ height: '40px', borderBottom: '2px dashed #cbd5e1', margin: '0.5rem 0' }}></div>
                  <div style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sign: ________</span>
                    <span>Date: ______</span>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>2. Verified By</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Internal Auditor</div>
                  <div style={{ height: '40px', borderBottom: '2px dashed #cbd5e1', margin: '0.5rem 0' }}></div>
                  <div style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sign: ________</span>
                    <span>Date: ______</span>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: '#fff', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>3. Approved By</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>CEO / Managing Director</div>
                  <div style={{ height: '40px', borderBottom: '2px dashed #cbd5e1', margin: '0.5rem 0' }}></div>
                  <div style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sign: ________</span>
                    <span>Date: ______</span>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #86efac' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>4. Passed to GL</div>
                  <div style={{ fontSize: '0.7rem', color: '#15803d' }}>Finance Manager / Accounts</div>
                  <div style={{ height: '40px', borderBottom: '2px dashed #86efac', margin: '0.5rem 0' }}></div>
                  <div style={{ fontSize: '0.7rem', color: '#166534', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sign: ________</span>
                    <span>Date: ______</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedPayrun.status !== 'Posted' && onPostToGL && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  className="btn btn-primary"
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff', fontWeight: 700 }}
                  onClick={() => {
                    onPostToGL(selectedPayrun.id, selectedPayrun.payrunNumber);
                    setSelectedPayrun(null);
                  }}
                >
                  ✓ Confirm & Post to General Ledger (Accounts)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Salary Slips List ─────────────────────────────────────────────────────────
function SalarySlipsList({ slips }: { slips: SalarySlip[] }) {
  const [selected, setSelected] = useState<SalarySlip | null>(null);
  if (selected) return <SalarySlipDetail slip={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="list-view">
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Slip #</th><th>Employee</th><th>Period</th><th>Pay Date</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Actions</th></tr></thead>
          <tbody>
            {slips.map(s => (
              <tr key={s.id}>
                <td className="mono">{s.slipNumber}</td>
                <td><strong>{s.employeeName}</strong><br/><span className="text-muted">{s.employeeNumber}</span></td>
                <td>{s.periodStart} to {s.periodEnd}</td>
                <td>{s.payDate}</td>
                <td className="num">{s.currency} {s.grossEarnings.toLocaleString()}</td>
                <td className="num">{s.currency} {s.totalDeductions.toLocaleString()}</td>
                <td className="num"><strong>{s.currency} {s.netPay.toLocaleString()}</strong></td>
                <td><button className="btn btn-sm btn-primary" onClick={() => setSelected(s)}>View Slip</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Salary Slip Detail (Professional Print Layout) ────────────────────────────
function SalarySlipDetail({ slip, onBack }: { slip: SalarySlip; onBack: () => void }) {
  const handlePrint = () => window.print();

  return (
    <div className="salary-slip-container">
      <div className="no-print" style={{ marginBottom: '1rem' }}>
        <div className="cell-actions">
          <button className="btn" onClick={onBack}>← Back to List</button>
          <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print / Save PDF</button>
        </div>
      </div>

      <div className="salary-slip" id="salary-slip-printable">
        <div className="slip-header">
          <div className="slip-company">
            <h2>Acme Holdings</h2>
            <p>123 Business Avenue, Suite 100</p>
            <p>San Francisco, CA 94102</p>
          </div>
          <div className="slip-title">
            <h1>SALARY SLIP</h1>
            <p className="slip-number">{slip.slipNumber}</p>
          </div>
        </div>

        <div className="slip-employee-info">
          <div className="info-grid">
            <div><strong>Employee:</strong> {slip.employeeName}</div>
            <div><strong>Employee #:</strong> {slip.employeeNumber}</div>
            <div><strong>Department:</strong> {slip.department}</div>
            <div><strong>Position:</strong> {slip.position}</div>
            <div><strong>Pay Period:</strong> {slip.periodStart} to {slip.periodEnd}</div>
            <div><strong>Pay Date:</strong> {slip.payDate}</div>
            <div><strong>Pay Frequency:</strong> {slip.payFrequency}</div>
            <div><strong>Bank:</strong> {slip.bankName} ****{slip.bankAccountLast4}</div>
          </div>
        </div>

        <div className="slip-body">
          <div className="slip-columns">
            <div className="slip-column">
              <h3>EARNINGS</h3>
              <div className="slip-line"><span>Basic Salary</span><span className="num">{slip.currency} {slip.basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              {slip.earnings.map((e, i) => (
                <div className="slip-line" key={i}><span>{e.name}</span><span className="num">{slip.currency} {e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              ))}
              <div className="slip-line total"><span>GROSS EARNINGS</span><span className="num">{slip.currency} {slip.grossEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            </div>

            <div className="slip-column">
              <h3>DEDUCTIONS</h3>
              {slip.deductions.length === 0 && <div className="slip-line"><span>No deductions</span><span className="num">-</span></div>}
              {slip.deductions.map((d, i) => (
                <div className="slip-line" key={i}><span>{d.name}</span><span className="num">{slip.currency} {d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              ))}
              <div className="slip-line total"><span>TOTAL DEDUCTIONS</span><span className="num">{slip.currency} {slip.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            </div>
          </div>

          <div className="slip-net-pay">
            <span>NET PAY</span>
            <span className="num">{slip.currency} {slip.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          {slip.employerContribs.length > 0 && (
            <div className="slip-employer">
              <h3>EMPLOYER CONTRIBUTIONS</h3>
              {slip.employerContribs.map((c, i) => (
                <div className="slip-line" key={i}><span>{c.name}</span><span className="num">{slip.currency} {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              ))}
              <div className="slip-line total"><span>TOTAL EMPLOYER</span><span className="num">{slip.currency} {slip.employerContributions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            </div>
          )}
        </div>

        <div className="slip-footer">
          <p>This is a system-generated salary slip. For queries, contact HR.</p>
        </div>
      </div>
    </div>
  );
}

// ── Tax Slabs List ────────────────────────────────────────────────────────────
function TaxSlabsList({ slabs, onEdit, onDelete }: {
  slabs: SalaryTaxSlab[]; onEdit: (s: SalaryTaxSlab) => void; onDelete: (id: string) => void;
}) {
  const [countryFilter, setCountryFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const filtered = slabs.filter(s => {
    if (countryFilter && s.country !== countryFilter) return false;
    if (yearFilter && s.taxYear !== parseInt(yearFilter)) return false;
    return true;
  });

  return (
    <div className="list-view">
      <div className="list-filters">
        <select className="filter-select" value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="">All Countries</option>
          {Object.entries(countryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
          <option value="">All Years</option>
          <option value="2025">2025</option>
          <option value="2026">2026 (2026-2027)</option>
          <option value="2027">2027</option>
        </select>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Country</th><th>Year</th><th>Name</th><th>Brackets</th><th>Std Deduction</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>{countryLabels[s.country] || s.country}</td>
                <td className="mono">{s.taxYear}</td>
                <td><strong>{s.name}</strong></td>
                <td className="num">{s.brackets.length}</td>
                <td className="num">{s.currency} {s.standardDeduction.toLocaleString()}</td>
                <td><StatusChip status={s.isActive ? 'Active' : 'Inactive'} label={s.isActive ? 'Active' : 'Inactive'} hex={s.isActive ? '#10b981' : '#ef4444'} /></td>
                <td>
                  <div className="cell-actions">
                    <button className="btn btn-sm" onClick={() => onEdit(s)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => onDelete(s.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Loans List ────────────────────────────────────────────────────────────────
function LoansList({ loans, employees, onRepay }: {
  loans: LoanAdvance[]; employees: Employee[]; onRepay: (id: string) => void;
}) {
  const getEmpName = (id: string) => { const e = employees.find(x => x.id === id); return e ? `${e.firstName} ${e.lastName}` : 'Unknown'; };

  return (
    <div className="list-view">
      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>Loan #</th><th>Employee</th><th>Type</th><th>Principal</th><th>Installment</th><th>Paid/Total</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loans.map(l => (
              <tr key={l.id}>
                <td className="mono">{l.loanNumber}</td>
                <td>{getEmpName(l.employeeId)}</td>
                <td>{l.loanType}</td>
                <td className="num">{l.principalAmount.toLocaleString()}</td>
                <td className="num">{l.installmentAmount.toLocaleString()}</td>
                <td className="num">{l.paidInstallments}/{l.totalInstallments}</td>
                <td className="num">{l.balanceAmount.toLocaleString()}</td>
                <td><StatusChip status={l.status} label={l.status} hex={l.status === 'Active' ? '#10b981' : l.status === 'Completed' ? '#10b981' : '#f43f5e'} /></td>
                <td>
                  {l.status === 'Active' && <button className="btn btn-sm btn-primary" onClick={() => onRepay(l.id)}>Record Payment</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Payroll Modal ─────────────────────────────────────────────────────────────
function PayrollModal({ type, item, store, onClose }: { type: string; item: any; store: any; onClose: () => void }) {
  const [form, setForm] = useState<any>(() => {
    if (item) return { ...item };
    if (type === 'employee') return { firstName: '', lastName: '', country: 'US', basicSalary: 0, currency: 'USD', payFrequency: 'Monthly', employmentType: 'FullTime', taxFilingStatus: 'Single', hireDate: new Date().toISOString().split('T')[0] };
    if (type === 'department') return { code: '', name: '', description: '' };
    if (type === 'position') return { code: '', name: '', description: '', minSalary: 0, maxSalary: 0 };
    if (type === 'payComponent') return { code: '', name: '', type: 'Earning', category: 'BasicSalary', country: 'US', isTaxable: true, isStatutory: false, displayOrder: 0 };
    if (type === 'leaveRequest') return { employeeId: '', leaveType: 'Annual', startDate: '', endDate: '', reason: '' };
    if (type === 'taxSlab') return { country: 'US', taxYear: 2025, name: '', currency: 'USD', filingStatus: 'Single', periodBasis: 'Annual', standardDeduction: 0, personalAllowance: 0, isActive: true, brackets: [] };
    if (type === 'loan') return { employeeId: '', loanNumber: '', loanType: 'Salary Advance', principalAmount: 0, interestRate: 0, totalInstallments: 1, installmentAmount: 0, startDate: new Date().toISOString().split('T')[0] };
    if (type === 'payrun') return { frequency: 'Monthly', periodStart: '', periodEnd: '', payDate: '' };
    return {};
  });

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (type === 'employee') {
      if (item) await store.updateEmployee(item.id, form);
      else await store.createEmployee(form);
    } else if (type === 'department') {
      if (item) await store.updateDepartment(item.id, form);
      else await store.createDepartment(form);
    } else if (type === 'position') {
      if (item) await store.updatePosition(item.id, form);
      else await store.createPosition(form);
    } else if (type === 'payComponent') {
      await store.createPayComponent(form);
    } else if (type === 'leaveRequest') {
      await store.createLeaveRequest(form);
    } else if (type === 'taxSlab') {
      if (item) await store.updateTaxSlab(item.id, form);
      else await store.createTaxSlab(form);
    } else if (type === 'loan') {
      await store.createLoanAdvance(form);
    } else if (type === 'payrun') {
      await store.calculatePayrun({ ...form, taxYear: 2025, autoPost: false });
    }
    onClose();
  };

  const inputClass = 'form-control';
  const labelClass = 'form-label';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{item ? 'Edit' : 'Create'} {type.replace(/([A-Z])/g, ' $1').trim()}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {type === 'employee' && (
            <div className="form-grid">
              <div><label className={labelClass}>* First Name</label><input className={inputClass} value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} /></div>
              <div><label className={labelClass}>* Last Name</label><input className={inputClass} value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} /></div>
              <div><label className={labelClass}>Email</label><input className={inputClass} value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
              <div><label className={labelClass}>Country</label><select className={inputClass} value={form.country || 'US'} onChange={e => set('country', e.target.value)}>
                {Object.entries(countryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
              <div><label className={labelClass}>* Basic Salary</label><input className={inputClass} type="number" value={form.basicSalary || 0} onChange={e => set('basicSalary', parseFloat(e.target.value) || 0)} /></div>
              <div><label className={labelClass}>Currency</label><input className={inputClass} value={form.currency || 'USD'} onChange={e => set('currency', e.target.value)} /></div>
              <div><label className={labelClass}>Hire Date</label><input className={inputClass} type="date" value={form.hireDate || ''} onChange={e => set('hireDate', e.target.value)} /></div>
              <div><label className={labelClass}>Pay Frequency</label><select className={inputClass} value={form.payFrequency || 'Monthly'} onChange={e => set('payFrequency', e.target.value)}>
                <option value="Weekly">Weekly</option><option value="BiWeekly">Bi-Weekly</option><option value="SemiMonthly">Semi-Monthly</option><option value="Monthly">Monthly</option>
              </select></div>
            </div>
          )}
          {type === 'department' && (
            <div className="form-grid">
              <div><label className={labelClass}>* Code</label><input className={inputClass} value={form.code || ''} onChange={e => set('code', e.target.value)} /></div>
              <div><label className={labelClass}>* Name</label><input className={inputClass} value={form.name || ''} onChange={e => set('name', e.target.value)} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label className={labelClass}>Description</label><input className={inputClass} value={form.description || ''} onChange={e => set('description', e.target.value)} /></div>
            </div>
          )}
          {type === 'position' && (
            <div className="form-grid">
              <div><label className={labelClass}>* Code</label><input className={inputClass} value={form.code || ''} onChange={e => set('code', e.target.value)} /></div>
              <div><label className={labelClass}>* Name</label><input className={inputClass} value={form.name || ''} onChange={e => set('name', e.target.value)} /></div>
              <div><label className={labelClass}>Min Salary</label><input className={inputClass} type="number" value={form.minSalary || 0} onChange={e => set('minSalary', parseFloat(e.target.value) || 0)} /></div>
              <div><label className={labelClass}>Max Salary</label><input className={inputClass} type="number" value={form.maxSalary || 0} onChange={e => set('maxSalary', parseFloat(e.target.value) || 0)} /></div>
            </div>
          )}
          {type === 'taxSlab' && (
            <div className="form-grid">
              <div><label className={labelClass}>Country</label><select className={inputClass} value={form.country || 'US'} onChange={e => set('country', e.target.value)}>
                {Object.entries(countryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
              <div><label className={labelClass}>Tax Year</label><input className={inputClass} type="number" value={form.taxYear || 2025} onChange={e => set('taxYear', parseInt(e.target.value) || 2025)} /></div>
              <div><label className={labelClass}>* Name</label><input className={inputClass} value={form.name || ''} onChange={e => set('name', e.target.value)} /></div>
              <div><label className={labelClass}>Currency</label><input className={inputClass} value={form.currency || 'USD'} onChange={e => set('currency', e.target.value)} /></div>
              <div><label className={labelClass}>Standard Deduction</label><input className={inputClass} type="number" value={form.standardDeduction || 0} onChange={e => set('standardDeduction', parseFloat(e.target.value) || 0)} /></div>
            </div>
          )}
          {(type === 'loan' || type === 'leaveRequest' || type === 'payComponent' || type === 'payrun') && (
            <div className="form-grid">
              {Object.keys(form).filter(k => !['brackets'].includes(k)).map(key => (
                <div key={key}>
                  <label className={labelClass}>{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                  {typeof form[key] === 'boolean' ? (
                    <select className={inputClass} value={form[key] ? 'true' : 'false'} onChange={e => set(key, e.target.value === 'true')}>
                      <option value="true">Yes</option><option value="false">No</option>
                    </select>
                  ) : typeof form[key] === 'number' ? (
                    <input className={inputClass} type="number" value={form[key]} onChange={e => set(key, parseFloat(e.target.value) || 0)} />
                  ) : (
                    <input className={inputClass} value={form[key] || ''} onChange={e => set(key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{item ? 'Update' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}
