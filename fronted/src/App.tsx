import { useEffect, useState, useMemo } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { Login } from './Login'
import type { UserData } from './Login'
import OnboardingWizard from './components/OnboardingWizard'
import { AiAssistantDrawer } from './components/AiAssistantDrawer'
import { LicenseModal } from './components/LicenseModal'
import { FeedbackModal } from './components/FeedbackModal'
import { ShortcutsModal } from './components/ShortcutsModal'
import { ShieldAlert } from 'lucide-react'
import { authApi } from './api/modules/auth.api'
import Intercompany from './Intercompany'
import EntitySettings from './EntitySettings'
import CustomerManagement from './CustomerManagement'
import ProductsAndServices from './ProductsAndServices'
import VendorManagement from './VendorManagement'
import { ProcurementWorkspace } from './ProcurementWorkspace'
import { VendorBills } from './VendorBills'
import { FixedAssets } from './FixedAssets'
import { AssetsInventoryWorkspace } from './AssetsInventoryWorkspace'
import { InventoryWorkspace } from './InventoryWorkspace'
import DepreciationRun from './DepreciationRun'
import DepreciationSchedule from './DepreciationSchedule'
import ValuationReport from './ValuationReport'
import { SalesWorkspace } from './SalesWorkspace'
import { EstimatesAndQuotes } from './EstimatesAndQuotes'
import { SalesOrdersWorkspace } from './SalesOrdersWorkspace'
import { ManufacturingWorkspace } from './ManufacturingWorkspace'
import { ChartOfAccounts } from './ChartOfAccounts'
import { FinancialReports } from './FinancialReports';
import { LeaseAccounting } from './Accounting.Leases';
import CreditNotesWorkspace from './CreditNotesWorkspace';
import CustomerPaymentsWorkspace from './CustomerPaymentsWorkspace';
import CustomerStatementsWorkspace from './CustomerStatementsWorkspace';
import CustomerAgingWorkspace from './CustomerAgingWorkspace';
import SalesReportsWorkspace from './SalesReportsWorkspace';
import VendorStatementsWorkspace from './VendorStatementsWorkspace';
import PayablesAgingWorkspace from './PayablesAgingWorkspace';
import { DebitNotes } from './DebitNotes';
import { ExpenseClaimsView } from './ExpenseClaimsView';
import { PurchaseReportsView } from './PurchaseReportsView';
import VendorPrepaymentsView from './VendorPrepaymentsView';
import CustomerDeferredRevenueView from './CustomerDeferredRevenueView';
import EmployeeDirectory from './EmployeeDirectory';
import AttendanceTracker from './AttendanceTracker';
import AttendancePoliciesView from './AttendancePoliciesView';
import BiometricDevicesView from './BiometricDevicesView';
import LeaveManagement from './LeaveManagement';
import PayrollProcessing from './PayrollProcessing';
import SalarySlipsView from './SalarySlipsView';
import LoansAdvancesView from './LoansAdvancesView';
import HRReportsView from './HRReportsView';
import {
  FieldOperationsSummaryView, SurveysView, FieldVisitsView, InspectionsView, WorkOrdersView, FieldExpensesView, FieldReportsView
} from './FieldOperationsViews';
import {
  ProjectsSummaryView, ProjectsListView, ProjectPlanningView, ProjectsTasksView, ProjectBudgetView, ProjectCostingView,
  ProjectsTimesheetsView, ProjectBillingView, ProjectsExpensesView, ProjectProfitabilityView, ProjectsReportsView
} from './ProjectsViews';
import {
  ComplianceSummaryView, TaxManagementView, VatSalesTaxView, WithholdingTaxView, TaxReturnsView, EInvoicingView, ComplianceReportsView
} from './ComplianceViews';
import {
  AnalyticsDashboardView, FinancialAnalyticsView, SalesAnalyticsView, ExpenseAnalyticsView, CashFlowAnalyticsView, InventoryAnalyticsView, ForecastingView, AIInsightsView
} from './AnalyticsViews';
import {
  AdministrationSummaryView, UsersView, RolesPermissionsView, CompaniesView, BranchesView, ApprovalWorkflowsView, NumberSeriesView, CurrencyView, AuditLogsView
} from './AdministrationViews';
import {
  ManufacturingSummaryView, ManufacturingWorkspaceView, BillOfMaterialsView, WorkOrdersMfgView, JobCostingView
} from './ManufacturingViews';
import { SystemSettingsView } from './SystemSettingsView';

import { SystemAccountMapping } from './components/SystemAccountMapping'
import { ModuleSummary } from './ModuleSummary'
import { SalesSummaryView, ProcurementSummaryView, BankingSummaryView, AccountingSummaryView, AssetsInventorySummaryView, PayrollSummaryView } from './MainModuleSummaries'
import { BankAccountsView } from './BankAccountsView'
import { CashAccountsView } from './CashAccountsView'
import { BankConnectionView } from './BankConnectionView'
import { BankImportView } from './BankImportView'
import { BankTransactionsView } from './BankTransactionsView'
import { BankReconciliationView } from './BankReconciliationView'
import { FundTransfersView } from './FundTransfersView'
import { VendorPaymentsView } from './VendorPaymentsView'
import { VoucherManagement } from './VoucherManagement'
import { CashFlowView } from './CashFlowView'
import { GeneralLedgerView } from './GeneralLedgerView'
import { AccountsReceivableView } from './AccountsReceivableView'
import { AccountsPayableView } from './AccountsPayableView'
import { TaxAccountingView } from './TaxAccountingView'
import { BudgetsView } from './BudgetsView'
import { PeriodClosingView } from './PeriodClosingView'
import { AuditTrailView } from './AuditTrailView'
import { JournalEntriesView } from './JournalEntriesView'
import { useCoaStore, useJournalsStore, useCompanyStore, useIntercompanyStore } from './stores'
import { DashboardOverview } from './DashboardOverview'
import { DashboardHub } from './components/DashboardHub'
import { ErrorBoundary } from './components/ErrorBoundary'

import UniqueSidebar from './components/UniqueSidebar';
import { NAVIGATION } from './navigation'
import { getStoredTheme } from './themes'
import TopHeader from './components/TopHeader'
import type { Account } from './api/modules/coa.api'
type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'ContraAsset' | 'ContraLiability' | 'ContraEquity' | 'ContraRevenue' | 'ContraExpense'
type Journal = { id: string; date: string; reference: string; description: string; status?: string; lines: { accountId: string; debit: number; credit: number }[] }
type Allocation = { id: string; name: string; sourceCompanyId: string; category: string; frequency: string; rate: number; quantity: number; status: string; recipients: { companyId: string; sharePercent: number }[] }

const accountTypes: AccountType[] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'ContraAsset', 'ContraLiability', 'ContraEquity', 'ContraRevenue', 'ContraExpense']
const blank = { code: '', name: '', type: 'Asset' as AccountType, parentId: '', openingBalance: '0', reconciliationEnabled: false, ifrsTag: '', gaapTag: '', isSystem: false, subtype: '', currency: 'USD', taxCategory: '', allowManualJournal: true, description: '', status: 'Active' }

export default function App() {
  const [page, setPage] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
        if (hash) return hash;
      }
      const saved = localStorage.getItem('last_active_page');
      if (saved) return saved;
    } catch {}
    return 'Overview.Dashboard';
  });
  const [theme, setTheme] = useState<string>(getStoredTheme);
  const [settingsView, setSettingsView] = useState<'home' | 'entities' | 'mappings'>('home')

  const accounts = useCoaStore((s) => s.accounts as Account[])
  const fetchAccounts = useCoaStore((s) => s.fetchAccounts)
  const saveAccountStore = useCoaStore((s) => s.saveAccount)
  const toggleAccountStatusStore = useCoaStore((s) => s.toggleAccountStatus)

  const entries = useJournalsStore((s) => s.entries as Journal[])
  const fetchJournalEntries = useJournalsStore((s) => s.fetchJournalEntries)

  const allocations = useIntercompanyStore((s) => s.allocations as Allocation[])
  const fetchAllocations = useIntercompanyStore((s) => s.fetchAllocations)

  const entities = useCompanyStore((s) => s.entities)
  const activeEntityId = useCompanyStore((s) => s.activeEntityId)
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies)
  const setActiveEntityId = useCompanyStore((s) => s.setActiveEntityId)

  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Global Navigation Event Listener for seamless inter-module workflow transitions
  useEffect(() => {
    const handleNav = (e: any) => {
      if (e?.detail && typeof e.detail === 'string') {
        setPage(e.detail);
      }
    };
    window.addEventListener('ams_navigate', handleNav);
    return () => window.removeEventListener('ams_navigate', handleNav);
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
      } else if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setPage('Overview.Overview');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setPage('Accounting.Journal Entries');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setPage('Sales & Customers.Sales Invoices');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setPage('Procurement.Bills');
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLicenseModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      const token = localStorage.getItem('auth_token');
      if (stored && token) {
        return JSON.parse(stored) as UserData;
      }
      return null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      const token = authApi.getToken();
      // Demo-mode sessions are never validated against the backend.
      if (!token || token === 'demo-mode') return;
      authApi.validate().catch((err) => {
        const status = err && typeof err.status === 'number' ? err.status : 0;
        if (status === 401 || status === 403) {
          // Keep active session in demo mode instead of logging out
          authApi.setToken('demo-mode');
          localStorage.setItem('ab_demo_mode', 'true');
        }
      });
    }
  }, [currentUser]);

  // Muhammad Ali (admin@acme.com) opens the complete ERP directly with 1-click!
  // Other demo accounts will ask to choose industry, license, and do setup configuration.
  const needsOnboarding = (email: string) => {
    if (email.toLowerCase() === 'admin@acme.com') return false; // Direct instant access
    const key = `onboarding_complete_${email.toLowerCase()}`;
    return !localStorage.getItem(key);
  };

  const handleLogin = async (userData: UserData) => {
    const emailNorm = userData.email.toLowerCase().trim();

    // Reset Sarah Jenkins onboarding so she always triggers Setup Configuration
    if (emailNorm === 'accountant@acme.com') {
      localStorage.removeItem('onboarding_complete_accountant@acme.com');
      localStorage.removeItem('erp_enabled_modules_accountant@acme.com');
    }

    const user: UserData = {
      email: userData.email,
      fullName: userData.fullName,
      role: userData.role || (emailNorm === 'admin@acme.com' ? 'Finance admin' : 'Senior Accountant'),
      avatar: userData.avatar || 'MA',
      provider: userData.provider || 'email',
    };
    
    authApi.setToken('demo-mode');
    localStorage.setItem('ab_demo_mode', 'true');
    localStorage.setItem('auth_user', JSON.stringify(user));
    setCurrentUser(user);
    notify(`Logged in as ${user.fullName}`);

    // Optional background sync with backend if online
    authApi.login({ email: userData.email, password: 'password123' })
      .then((res) => {
        if (res?.token) {
          authApi.setToken(res.token);
          authApi.setUser(res.user);
        }
      })
      .catch(() => {
        // Continue running smoothly
      });
  };

  const handleLogout = () => {
    authApi.logout();
    localStorage.removeItem('ab_demo_mode');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
    notify('Logged out successfully');
  };

  useEffect(() => {
    try {
      localStorage.setItem('last_active_page', page);
      const currentHash = window.location.hash ? decodeURIComponent(window.location.hash.replace(/^#/, '')) : '';
      if (currentHash !== page) {
        window.history.replaceState(null, '', '#' + encodeURIComponent(page));
      }
    } catch {}
  }, [page]);

  useEffect(() => {
    const handleHashChange = () => {
      try {
        const hash = window.location.hash ? decodeURIComponent(window.location.hash.replace(/^#/, '')) : '';
        if (hash && hash !== page) {
          setPage(hash);
        }
      } catch {}
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [page]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme.endsWith('-dark') || theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ams_theme', theme);
  }, [theme]);

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState(blank)
  const [toast, setToast] = useState('')
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(''), 3500) }

  const load = async () => {
    try {
      await Promise.all([
        fetchAccounts(),
        fetchJournalEntries(),
        fetchAllocations(),
        fetchCompanies(),
      ]);
    } catch {
      notify('API unavailable. Start the backend on port 5124.');
    }
  }

  useEffect(() => { load() }, [])

  // After onboarding, if no company exists, redirect to Companies setup
  useEffect(() => {
    if (currentUser && currentUser.email !== 'admin@acme.com') {
      const key = `onboarding_complete_${currentUser.email}`;
      if (localStorage.getItem(key) && entities.length === 0 && page !== 'Administration.Companies') {
        setPage('Administration.Companies');
      }
    }
  }, [currentUser, entities, page])
  const openCreate = async () => { setEditing(null); setForm(blank); setModal(true) }
  const openEdit = (a: Account) => { 
    setEditing(a); 
    const effectiveSubtype = a.subtype || inferSubtype(a.code, a.type);
    setForm({ 
      code: a.code, 
      name: a.name, 
      type: a.type as AccountType, 
      parentId: a.parentId || '', 
      openingBalance: String(a.openingBalance || 0), 
      reconciliationEnabled: a.reconciliationEnabled, 
      ifrsTag: a.ifrsTag || '', 
      gaapTag: a.gaapTag || '', 
      isSystem: a.isSystem, 
      subtype: effectiveSubtype, 
      currency: a.currency || 'USD', 
      taxCategory: a.taxCategory || '', 
      allowManualJournal: a.allowManualJournal !== false, 
      description: a.description || '', 
      status: a.status || 'Active' 
    }); 
    setModal(true); 
  }

  const saveAccount = async (e: FormEvent) => {
    e.preventDefault();
    const effectiveSubtype = form.subtype || inferSubtype(form.code, form.type) || "";
    const body = { 
      ...form, 
      parentId: form.parentId || null, 
      openingBalance: Number(form.openingBalance) || 0, 
      openingBalanceDate: Number(form.openingBalance) ? new Date().toISOString().slice(0, 10) : null, 
      gaapTag: form.gaapTag || null, 
      customFields: {}, 
      isSystem: form.isSystem,
      subtype: effectiveSubtype,
      currency: form.currency || 'USD',
      taxCategory: form.taxCategory || null,
      allowManualJournal: form.allowManualJournal,
      description: form.description || null,
      status: form.status || 'Active'
    };
    try {
      await saveAccountStore(body, editing ? editing.id : undefined);
      await fetchAccounts();
      setModal(false);
      notify(editing ? '✓ Account updated successfully' : '✓ Account created successfully');
    } catch (err: any) {
      notify(err.message || 'Could not save account');
    }
  }

  const toggleStatus = async (a: Account) => {
    try {
      await toggleAccountStatusStore(a);
      notify(`Account ${a.status === 'Active' ? 'deactivated' : 'activated'}`);
    } catch (err: any) {
      notify(err.message || 'Failed to update status');
    }
  }

  const activeEntity = entities.find(x => x.id === activeEntityId)
  const readOnly = !!activeEntity && !activeEntity.active
  const activeViewMap: Record<string, string> = {
    'Overview.Dashboard': 'dashboard-hub',
    'Overview.Summary': 'dashboard-hub',
    'Overview.Overview': 'dashboard-overview',
    'Sales & Customers.Summary': 'sales-summary',
    'Sales & Customers.Customers': 'customers',
    'Sales & Customers.Products & Services': 'products',
    'Sales & Customers.Sales Invoices': 'sales-workspace',
    'Sales & Customers.Estimates & Quotes': 'estimates-quotes',
    'Sales & Customers.Sales Orders': 'sales-orders',
    'Sales & Customers.Credit Notes': 'credit-notes',
    'Sales & Customers.Deferred Revenue & Advances': 'deferred-revenue',
    'Procurement.Summary': 'procurement-summary',
    'Procurement.Vendors': 'vendors',
    'Procurement.Bills': 'bills',
    'Procurement.Debit Notes': 'debit-notes',
    'Procurement.Procurement Workspace': 'procurement-workspace',
    'Procurement.Vendor Payments': 'vendor-payments',
    'Procurement.Vendor Statements': 'vendor-statements',
    'Procurement.Payables Aging': 'payables-aging',
    'Procurement.Prepayments & Amortization': 'vendor-prepayments',
    'Procurement.Expense Claims': 'expense-claims',
    'Procurement.Purchase Reports': 'purchase-reports',
    'Banking & Payments.Summary': 'banking-summary',
    'Banking & Payments.Bank Accounts': 'bank-accounts',
    'Banking & Payments.Cash Accounts': 'cash-accounts',
    'Banking & Payments.Bank Connection': 'bank-connection',
    'Banking & Payments.Bank Import': 'bank-import',
    'Banking & Payments.Transactions': 'bank-transactions',
    'Banking & Payments.Bank Reconciliation': 'bank-reconciliation',
    'Banking & Payments.Voucher Management': 'vouchers-workspace',
    'Banking & Payments.Fund Transfers': 'fund-transfers',
    'Banking & Payments.Cash Flow Statements': 'cash-flow-statements',
    'Accounting.Summary': 'accounting-summary',
    'Accounting.Chart of Accounts': 'accounts',
    'Accounting.Journal Entries': 'journal',
    'Accounting.Fixed Assets': 'fixed-assets',
    'Accounting.General Ledger': 'general-ledger',
    'Accounting.Accounts Receivable': 'accounts-receivable',
    'Accounting.Accounts Payable': 'accounts-payable',
    'Accounting.Tax Accounting': 'tax-accounting',
    'Administration.Tax Accounting': 'tax-accounting',
    'Accounting.Budgets': 'budgets',
    'Accounting.Financial Reports': 'financial-reports',
    'Accounting.Prepayment Schedules': 'vendor-prepayments',
    'Accounting.Period Closing': 'period-closing',
    'Accounting.Audit Trail': 'audit-trail',
    'Accounting.Lease Accounting': 'lease-accounting',
    'Accounting.Intercompany Allocations': 'intercompany',
    'Assets & Inventory.Summary': 'assets-inventory-summary',
    'Assets & Inventory.Asset Register': 'assets-inventory',
    'Assets & Inventory.Inventory': 'assets-inventory-inventory',
    'Assets & Inventory.Depreciation Run': 'depreciation-run',
    'Assets & Inventory.Depreciation Schedule': 'depreciation-schedule',
    'Assets & Inventory.Valuation Reports': 'valuation-report',
    'Manufacturing & Production.Summary': 'mfg-summary',
    'Manufacturing & Production.Manufacturing Workspace': 'mfg-workspace',
    'Manufacturing & Production.Bill of Materials': 'mfg-bom',
    'Manufacturing & Production.Work Orders': 'mfg-orders',
    'Manufacturing & Production.Job Costing': 'mfg-costing',
    'Payroll & HR.Summary': 'payroll-summary',
    'Payroll & HR.Employees': 'payroll-employees',
    'Payroll & HR.Attendance': 'payroll-attendance',
    'Payroll & HR.Leave': 'payroll-leave',
    'Payroll & HR.Payroll': 'payroll-processing',
    'Payroll & HR.Salary': 'payroll-salary',
    'Payroll & HR.Loans & Advances': 'payroll-loans',
    'Payroll & HR.HR Reports': 'payroll-reports',
    'Payroll & HR.Attendance Policy': 'payroll-attendance-policies',
    'Payroll & HR.Attendance Policies': 'payroll-attendance-policies',
    'Payroll & HR.Biometric Configuration': 'payroll-biometric-config',
    'Survey & Field Operations.Summary': 'field-summary',
    'Survey & Field Operations.Surveys': 'field-surveys',
    'Survey & Field Operations.Field Visits': 'field-visits',
    'Survey & Field Operations.Inspections': 'field-inspections',
    'Survey & Field Operations.Work Orders': 'field-work-orders',
    'Survey & Field Operations.Field Expenses': 'field-expenses',
    'Survey & Field Operations.Field Reports': 'field-reports',
    'Government Compliance.Summary': 'compliance-summary',
    'Government Compliance.Tax Management': 'compliance-tax',
    'Government Compliance.Tax Accounting': 'tax-accounting',
    'Government Compliance.VAT / Sales Tax': 'compliance-vat',
    'Government Compliance.Withholding Tax': 'compliance-withholding',
    'Government Compliance.Tax Returns': 'compliance-returns',
    'Government Compliance.E-Invoicing': 'compliance-einvoicing',
    'Government Compliance.Compliance Reports': 'compliance-reports',
    'Projects.Summary': 'projects-summary',
    'Projects.Projects': 'projects-list',
    'Projects.Project Planning': 'projects-planning',
    'Projects.Tasks': 'projects-tasks',
    'Projects.Project Budget': 'projects-budget',
    'Projects.Project Costing': 'projects-costing',
    'Projects.Timesheets': 'projects-timesheets',
    'Projects.Project Billing': 'projects-billing',
    'Projects.Project Expenses': 'projects-expenses',
    'Projects.Project Profitability': 'projects-profitability',
    'Projects.Reports': 'projects-reports',
    'AI & Analytics.Summary': 'analytics-summary',
    'AI & Analytics.Analytics Dashboard': 'analytics-summary',
    'AI & Analytics.Financial Analytics': 'analytics-financial',
    'AI & Analytics.Sales Analytics': 'analytics-sales',
    'AI & Analytics.Expense Analytics': 'analytics-expense',
    'AI & Analytics.Cash Flow Analytics': 'analytics-cashflow',
    'AI & Analytics.Inventory Analytics': 'analytics-inventory',
    'AI & Analytics.Forecasting': 'analytics-forecast',
    'AI & Analytics.AI Insights': 'analytics-insights',
    'Administration.Summary': 'admin-summary',
    'Administration.Users': 'admin-users',
    'Administration.Roles & Permissions': 'admin-roles',
    'Administration.Companies': 'admin-companies',
    'Administration.Branches': 'admin-branches',
    'Administration.Approval Workflows': 'admin-approvals',
    'Administration.System Settings': 'settings',
    'Administration.Biometric Configuration': 'admin-biometric-config',
    'Administration.Chart of Accounts Mapping': 'coa-mapping',
    'Administration.Number Series': 'admin-number-series',
    'Administration.Currency': 'admin-currency',
    'Administration.Audit Logs': 'admin-audit',
    'Sales & Customers.Customer Payments': 'customer-payments',
    'Sales & Customers.Customer Statements': 'customer-statements',
    'Sales & Customers.Customer Aging': 'customer-aging',
    'Sales & Customers.Sales Reports': 'sales-reports'
  }
  const activeView = activeViewMap[page] || 'placeholder'
  const [group, module] = page.split('.')
  const activeGroup = NAVIGATION.find((g: { name: string }) => g.name === group)
  const activeGroupItems = activeGroup?.items || []

  const enabledModules = useMemo(() => {
    const email = currentUser?.email?.toLowerCase() || '';

    // Check user-specific configuration saved during Setup Configuration
    if (email) {
      try {
        const userSaved = localStorage.getItem(`erp_enabled_modules_${email}`);
        if (userSaved) {
          const parsed = JSON.parse(userSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }

    if (activeEntity?.modules && activeEntity.modules.length > 0) {
      return activeEntity.modules;
    }

    // Default for Finance Admin if no custom setup is saved
    if (email === 'admin@acme.com' || currentUser?.role?.toLowerCase().includes('admin')) {
      return []; // All 13 modules
    }

    return [];
  }, [activeEntity, currentUser]);

  const accessibleEntities = useMemo(() => {
    if (!currentUser) return entities;
    const email = currentUser.email.toLowerCase();
    const role = currentUser.role?.toLowerCase() || '';

    // Finance Admin / Super Admin sees all entities
    if (email === 'admin@acme.com' || role.includes('admin')) {
      return entities;
    }

    // Check if user has an assigned company ID
    const assignedCompanyId = (currentUser as any)?.companyId;
    if (assignedCompanyId) {
      const matched = entities.filter(e => e.id === assignedCompanyId);
      if (matched.length > 0) return matched;
    }
    return entities;
  }, [entities, currentUser]);

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Non-admin demo users must complete onboarding first
  if (needsOnboarding(currentUser.email)) {
    return <OnboardingWizard currentUser={currentUser} />;
  }

  return (
    <div className="app">
      <UniqueSidebar
        activePage={page}
        onNavigate={setPage}
        modules={enabledModules}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <div className="main-col">
        <TopHeader
          currentUser={currentUser}
          entities={accessibleEntities}
          activeEntityId={activeEntityId}
          onSelectEntity={setActiveEntityId}
          page={page}
          setPage={setPage}
          accounts={accounts}
          notify={notify}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          onOpenLicense={() => setLicenseModalOpen(true)}
          onOpenFeedback={() => setFeedbackModalOpen(true)}
        />
        <div className="module-workspace">
          <header className="module-head">
            <div className="module-title">
              <span className="module-icon">
                {(() => {
                  const MIcon = activeGroup?.icon;
                  return MIcon ? <MIcon size={20} strokeWidth={1.8} /> : '▦';
                })()}
              </span>
              <div>
                <p className="eyebrow">MODULE</p>
                <h1>{activeGroup?.label || group}</h1>
              </div>
            </div>
            <div className="module-actions">
              <label className="entity-picker">
                Working in
                <select value={activeEntityId} onChange={e => setActiveEntityId(e.target.value)}>
                  {accessibleEntities.map(x => (
                    <option key={x.id} value={x.id}>
                      {x.name}{x.code ? ` · ${x.code}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </header>
        </div>
        <main>
          {readOnly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, fontWeight: 600 }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{activeEntity?.name} is <b>Deactivated</b> — read-only mode. You can view data and download reports, but editing is disabled.</span>
              <button onClick={() => setPage('Administration.Companies')} style={{ marginLeft: 'auto', background: '#fff7ed', border: '1px solid #f59e0b', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#92400e', cursor: 'pointer' }}>Manage Companies</button>
            </div>
          )}
  {activeView === 'dashboard-hub' && <DashboardHub setPage={setPage} accounts={accounts} activeEntityId={activeEntityId} currentUser={currentUser} />}
  {activeView === 'dashboard-overview' && (
    <ErrorBoundary>
      <DashboardOverview accounts={accounts} entries={entries} setPage={setPage} activeEntityId={activeEntityId} />
    </ErrorBoundary>
  )}
  {activeView === 'module-summary' && <ModuleSummary moduleName={group} accounts={accounts} entries={entries} setPage={setPage} openCreateAccount={openCreate} />}
  {activeView === 'sales-summary' && <SalesSummaryView activeEntityId={activeEntityId} setPage={setPage} />}
  {activeView === 'procurement-summary' && <ProcurementSummaryView activeEntityId={activeEntityId} setPage={setPage} />}
  {activeView === 'banking-summary' && <BankingSummaryView activeEntityId={activeEntityId} setPage={setPage} />}
  {activeView === 'accounting-summary' && <AccountingSummaryView accounts={accounts} entries={entries} setPage={setPage} />}
  {activeView === 'assets-inventory-summary' && <AssetsInventorySummaryView activeEntityId={activeEntityId} setPage={setPage} />}
  {activeView === 'payroll-summary' && <PayrollSummaryView activeEntityId={activeEntityId} setPage={setPage} />}
  {activeView === 'customers' && <CustomerManagement entities={entities as any} activeEntityId={activeEntityId} notify={notify} />}
  {activeView === 'accounts' && (
    <ChartOfAccounts accounts={accounts} edit={openEdit} status={toggleStatus} openCreate={openCreate} setParentIdForNew={(parentId) => setForm(f => ({ ...f, parentId }))} reloadAccounts={load} />
  )}
  {activeView.startsWith('vouchers') && <VoucherManagement subView={module} activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'bank-accounts' && <BankAccountsView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'cash-accounts' && <CashAccountsView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'bank-connection' && <BankConnectionView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'bank-import' && <BankImportView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'bank-transactions' && <BankTransactionsView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'bank-reconciliation' && <BankReconciliationView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'fund-transfers' && <FundTransfersView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'cash-flow-statements' && <CashFlowView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'journal' && <JournalEntriesView accounts={accounts.filter(a => a.status === 'Active')} initialEntries={entries} onEntriesChange={async () => { await fetchJournalEntries(); }} />}
  {activeView === 'intercompany' && <Intercompany allocations={allocations} reload={load} notify={notify} />}
  {activeView === 'settings' && settingsView === 'home' && (
    <SystemSettingsView setPage={setPage} notify={notify} />
  )}
  {activeView === 'settings' && settingsView === 'mappings' && <SystemAccountMapping accounts={accounts} close={() => setSettingsView('home')} notify={notify} />}
  {activeView === 'coa-mapping' && <SystemAccountMapping accounts={accounts} close={() => setPage('Overview.Dashboard')} notify={notify} />}
  {activeView === 'settings' && settingsView === 'entities' && <EntitySettings entities={entities as any} selectedId={activeEntityId} select={setActiveEntityId} reload={load} notify={notify} />}
  {activeView === 'products' && <ProductsAndServices notify={notify} activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'vendors' && <VendorManagement entities={entities as any} activeEntityId={activeEntityId} notify={notify} />}
  {activeView === 'sales-workspace' && <SalesWorkspace activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'estimates-quotes' && <EstimatesAndQuotes activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'sales-orders' && <SalesOrdersWorkspace activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'credit-notes' && <CreditNotesWorkspace activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'deferred-revenue' && <CustomerDeferredRevenueView activeEntityId={activeEntityId} accounts={accounts} />}
  {activeView === 'procurement-workspace' && <ProcurementWorkspace activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'vendor-payments' && <VendorPaymentsView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'vendor-prepayments' && <VendorPrepaymentsView activeEntityId={activeEntityId} accounts={accounts} />}
  {activeView === 'expense-claims' && <ExpenseClaimsView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'purchase-reports' && <PurchaseReportsView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'payroll-employees' && <EmployeeDirectory />}
  {activeView === 'payroll-attendance' && <AttendanceTracker />}
  {activeView === 'payroll-attendance-policies' && <AttendancePoliciesView />}
  {activeView === 'payroll-leave' && <LeaveManagement />}
  {activeView === 'payroll-processing' && <PayrollProcessing />}
  {activeView === 'payroll-salary' && <SalarySlipsView />}
  {activeView === 'payroll-loans' && <LoansAdvancesView />}
  {activeView === 'payroll-reports' && <HRReportsView />}
  {activeView === 'payroll-biometric-config' && <BiometricDevicesView />}
  {activeView === 'projects-summary' && <ProjectsSummaryView />}
  {activeView === 'projects-list' && <ProjectsListView activeEntityId={activeEntityId} />}
  {activeView === 'projects-planning' && <ProjectPlanningView activeEntityId={activeEntityId} />}
  {activeView === 'projects-tasks' && <ProjectsTasksView activeEntityId={activeEntityId} />}
  {activeView === 'projects-budget' && <ProjectBudgetView activeEntityId={activeEntityId} />}
  {activeView === 'projects-costing' && <ProjectCostingView activeEntityId={activeEntityId} />}
  {activeView === 'projects-timesheets' && <ProjectsTimesheetsView activeEntityId={activeEntityId} />}
  {activeView === 'projects-billing' && <ProjectBillingView activeEntityId={activeEntityId} />}
  {activeView === 'projects-expenses' && <ProjectsExpensesView activeEntityId={activeEntityId} />}
  {activeView === 'projects-profitability' && <ProjectProfitabilityView activeEntityId={activeEntityId} />}
  {activeView === 'projects-reports' && <ProjectsReportsView activeEntityId={activeEntityId} />}
  {activeView === 'compliance-summary' && <ComplianceSummaryView />}
  {activeView === 'compliance-tax' && <TaxManagementView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'compliance-vat' && <VatSalesTaxView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'compliance-withholding' && <WithholdingTaxView activeEntityId={activeEntityId} />}
  {activeView === 'compliance-returns' && <TaxReturnsView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'compliance-einvoicing' && <EInvoicingView activeEntityId={activeEntityId} />}
  {activeView === 'compliance-reports' && <ComplianceReportsView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'field-summary' && <FieldOperationsSummaryView />}
  {activeView === 'field-surveys' && <SurveysView activeEntityId={activeEntityId} />}
  {activeView === 'field-visits' && <FieldVisitsView activeEntityId={activeEntityId} />}
  {activeView === 'field-inspections' && <InspectionsView activeEntityId={activeEntityId} />}
  {activeView === 'field-work-orders' && <WorkOrdersView activeEntityId={activeEntityId} />}
  {activeView === 'field-expenses' && <FieldExpensesView activeEntityId={activeEntityId} />}
  {activeView === 'field-reports' && <FieldReportsView />}
  {activeView === 'analytics-summary' && <AnalyticsDashboardView />}
  {activeView === 'analytics-financial' && <FinancialAnalyticsView />}
  {activeView === 'analytics-sales' && <SalesAnalyticsView />}
  {activeView === 'analytics-expense' && <ExpenseAnalyticsView />}
  {activeView === 'analytics-cashflow' && <CashFlowAnalyticsView />}
  {activeView === 'analytics-inventory' && <InventoryAnalyticsView />}
  {activeView === 'analytics-forecast' && <ForecastingView />}
  {activeView === 'analytics-insights' && <AIInsightsView />}
  {activeView === 'admin-summary' && <AdministrationSummaryView setPage={setPage} />}
  {activeView === 'admin-users' && <UsersView activeEntityId={activeEntityId} notify={notify} />}
  {activeView === 'admin-roles' && <RolesPermissionsView activeEntityId={activeEntityId} notify={notify} />}
  {activeView === 'admin-companies' && <CompaniesView activeEntityId={activeEntityId} setPage={setPage} notify={notify} />}
  {activeView === 'admin-branches' && <BranchesView activeEntityId={activeEntityId} notify={notify} />}
  {activeView === 'admin-approvals' && <ApprovalWorkflowsView activeEntityId={activeEntityId} notify={notify} />}
  {activeView === 'admin-biometric-config' && <BiometricDevicesView />}
  {activeView === 'admin-number-series' && <NumberSeriesView activeEntityId={activeEntityId} notify={notify} />}
  {activeView === 'admin-currency' && <CurrencyView activeEntityId={activeEntityId} notify={notify} />}
  {activeView === 'admin-audit' && <AuditLogsView activeEntityId={activeEntityId} entities={entities as any} notify={notify} />}
  {activeView === 'bills' && <VendorBills activeEntityId={activeEntityId} />}
  {activeView === 'vendor-statements' && <VendorStatementsWorkspace activeEntityId={activeEntityId} />}
  {activeView === 'payables-aging' && <PayablesAgingWorkspace activeEntityId={activeEntityId} />}
  {activeView === 'debit-notes' && <DebitNotes activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'taxes' && <TaxAccountingView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'fixed-assets' && <FixedAssets activeEntityId={activeEntityId} />}
  {activeView === 'assets-inventory' && <AssetsInventoryWorkspace activeEntityId={activeEntityId} entities={entities} />}
  {activeView === 'assets-inventory-inventory' && <InventoryWorkspace activeEntityId={activeEntityId} />}
  {activeView === 'inventory' && <InventoryWorkspace activeEntityId={activeEntityId} />}
  {activeView === 'depreciation-run' && <DepreciationRun activeEntityId={activeEntityId} />}
  {activeView === 'depreciation-schedule' && <DepreciationSchedule activeEntityId={activeEntityId} />}
  {activeView === 'valuation-report' && <ValuationReport activeEntityId={activeEntityId} />}
  {activeView === 'manufacturing' && <ManufacturingWorkspace activeEntityId={activeEntityId} entities={entities} />}
  {activeView === 'mfg-summary' && <ManufacturingSummaryView activeEntityId={activeEntityId} />}
  {activeView === 'mfg-workspace' && <ManufacturingWorkspaceView activeEntityId={activeEntityId} entities={entities} />}
  {activeView === 'mfg-bom' && <BillOfMaterialsView activeEntityId={activeEntityId} entities={entities} />}
  {activeView === 'mfg-orders' && <WorkOrdersMfgView activeEntityId={activeEntityId} entities={entities} />}
  {activeView === 'mfg-costing' && <JobCostingView activeEntityId={activeEntityId} entities={entities} />}
  {activeView === 'financial-reports' && <FinancialReports accounts={accounts} entries={entries} activeEntityId={activeEntityId} />}
  {activeView === 'general-ledger' && <GeneralLedgerView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'accounts-receivable' && <AccountsReceivableView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'accounts-payable' && <AccountsPayableView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'tax-accounting' && <TaxAccountingView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'budgets' && <BudgetsView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'period-closing' && <PeriodClosingView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'audit-trail' && <AuditTrailView activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'lease-accounting' && <LeaseAccounting activeEntityId={activeEntityId} />}
  {activeView === 'customer-payments' && <CustomerPaymentsWorkspace activeEntityId={activeEntityId} entities={entities as any} />}
  {activeView === 'customer-statements' && <CustomerStatementsWorkspace activeEntityId={activeEntityId} />}
  {activeView === 'customer-aging' && <CustomerAgingWorkspace activeEntityId={activeEntityId} />}
  {activeView === 'sales-reports' && <SalesReportsWorkspace activeEntityId={activeEntityId} />}
          {activeView === 'placeholder' && <div style={{ padding: 40, textAlign: 'center', color: '#666' }}><span style={{ fontSize: 48, opacity: 0.2, display: 'block', marginBottom: 20 }}>🏗</span><h3>Under Construction</h3><p>This module ({module}) is part of the layout but not yet developed.</p></div>}
        </main>
      </div>
      {modal && <AccountModal form={form} setForm={setForm} accounts={accounts} editing={editing} close={() => setModal(false)} save={saveAccount} />}
      {toast && <div className="toast">✓ {toast}</div>}
      <AiAssistantDrawer activePage={page} onNavigate={setPage} onOpenFeedback={() => setFeedbackModalOpen(true)} />
      <LicenseModal isOpen={licenseModalOpen} onClose={() => setLicenseModalOpen(false)} notify={notify} />
      <FeedbackModal isOpen={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} activePage={page} notify={notify} />
      <ShortcutsModal isOpen={shortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)} onNavigate={setPage} />
    </div>
  );
}

const subtypesMap: Record<string, string[]> = {
  Asset: ['Current Assets', 'Non-Current Assets'],
  ContraAsset: ['Current Assets', 'Non-Current Assets'],
  Liability: ['Current Liabilities', 'Non-Current Liabilities'],
  ContraLiability: ['Current Liabilities', 'Non-Current Liabilities'],
  Equity: ['Share Capital & Premium', 'Retained Earnings & Reserves'],
  ContraEquity: ['Share Capital & Premium', 'Retained Earnings & Reserves'],
  Revenue: ['Operating Revenue', 'Non-Operating Revenue'],
  ContraRevenue: ['Operating Revenue', 'Non-Operating Revenue'],
  Expense: ['Operating Expenses', 'Cost of Goods Sold', 'Non-Operating Expenses'],
  ContraExpense: ['Cost of Goods Sold', 'Operating Expenses']
};

const inferSubtype = (code: string, type: string): string => {
  if (!code) return '';
  const num = parseInt(code, 10);
  
  if (type === 'Asset' || type === 'ContraAsset') {
    if (!isNaN(num)) {
      if (num >= 10000 && num < 15000) return 'Current Assets';
      if (num >= 15000) return 'Non-Current Assets';
    }
    return code.startsWith('11') || code.startsWith('12') || code.startsWith('13') || code.startsWith('14')
      ? 'Current Assets' : 'Non-Current Assets';
  }
  
  if (type === 'Liability' || type === 'ContraLiability') {
    if (!isNaN(num)) {
      if (num >= 20000 && num < 25000) return 'Current Liabilities';
      if (num >= 25000) return 'Non-Current Liabilities';
    }
    return code.startsWith('25') || code.startsWith('26') || code.startsWith('27') || code.startsWith('28')
      ? 'Non-Current Liabilities' : 'Current Liabilities';
  }
  
  if (type === 'Equity' || type === 'ContraEquity') {
    if (!isNaN(num) && num >= 30000 && num < 32000) return 'Share Capital & Premium';
    return 'Retained Earnings & Reserves';
  }
  
  if (type === 'Revenue' || type === 'ContraRevenue') {
    if (!isNaN(num) && num >= 40000 && num < 42000) return 'Operating Revenue';
    return 'Non-Operating Revenue';
  }
  
  if (type === 'Expense' || type === 'ContraExpense') {
    if (!isNaN(num) && num >= 50000 && num < 60000) return 'Cost of Goods Sold';
    if (!isNaN(num) && num >= 60000 && num < 62000) return 'Operating Expenses';
    return 'Non-Operating Expenses';
  }
  
  return '';
};

function AccountModal({ form, setForm, accounts, editing, close, save }: { form: any; setForm: any; accounts: Account[]; editing: Account | null; close: () => void; save: (e: FormEvent) => void }) {
  const field = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const [subtype, setSubtype] = useState(() => {
    if (form.subtype) return form.subtype;
    if (editing) {
      return editing.subtype || inferSubtype(editing.code, editing.type);
    }
    const initialType = form.type || 'Asset';
    return subtypesMap[initialType]?.[0] || '';
  });

  // Deep-link support: read URL params on mount to prefill form
  useEffect(() => {
    if (editing) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('type')) {
      const type = params.get('type');
      if (type && accountTypes.includes(type as AccountType)) field('type', type);
    }
    if (params.has('subtype')) {
      const st = params.get('subtype');
      const newSubtypes = subtypesMap[form.type] || [];
      if (st && newSubtypes.includes(st)) setSubtype(st);
    }
    if (params.has('parent')) {
      const parentCode = params.get('parent');
      if (parentCode) {
        const parent = accounts.find(a => a.code === parentCode);
        if (parent) field('parentId', parent.id);
      }
    }
    if (params.has('name')) {
      const name = params.get('name');
      if (name) field('name', name);
    }
  }, []);

  const fetchNextCode = async (type: string, parentId?: string) => {
    if (editing) return;
    try {
      const code = await useCoaStore.getState().getNextCode(type, parentId);
      if (code) {
        setForm((f: any) => ({ ...f, code }));
      }
    } catch {}
  };

  const handleNameChange = (val: string) => {
    field('name', val);
    if (!editing && !form.code && val.trim().length > 0) {
      fetchNextCode(form.type, form.parentId);
    }
  };

  const handleSubtypeChange = (newSubtype: string) => {
    setSubtype(newSubtype);
    field('subtype', newSubtype);
    
    // Only auto-suggest standard parent code for brand new accounts if parent is not selected yet
    if (!editing && !form.parentId) {
      let suggestedParentCode = '';
      switch (newSubtype) {
        case 'Current Assets': suggestedParentCode = '11000'; break;
        case 'Non-Current Assets': suggestedParentCode = '15000'; break;
        case 'Current Liabilities': suggestedParentCode = '21000'; break;
        case 'Non-Current Liabilities': suggestedParentCode = '25000'; break;
        case 'Share Capital & Premium': suggestedParentCode = '31000'; break;
        case 'Retained Earnings & Reserves': suggestedParentCode = '32000'; break;
        case 'Operating Revenue': suggestedParentCode = '41000'; break;
        case 'Non-Operating Revenue': suggestedParentCode = '42000'; break;
        case 'Cost of Goods Sold': suggestedParentCode = '50000'; break;
        case 'Operating Expenses': suggestedParentCode = '61000'; break;
        case 'Non-Operating Expenses': suggestedParentCode = '60000'; break;
      }
      
      const suggestedParent = accounts.find(a => a.code === suggestedParentCode);
      if (suggestedParent) {
        setForm((f: any) => ({ ...f, parentId: suggestedParent.id }));
        fetchNextCode(form.type, suggestedParent.id);
      }
    }
  };

  const handleTypeChange = (val: string) => {
    field('type', val);
    const newSubtypes = subtypesMap[val] || [];
    const firstSubtype = newSubtypes[0] || '';
    setSubtype(firstSubtype);
    field('subtype', firstSubtype);

    if (!editing) {
      let suggestedParentCode = '';
      switch (firstSubtype) {
        case 'Current Assets': suggestedParentCode = '11000'; break;
        case 'Non-Current Assets': suggestedParentCode = '15000'; break;
        case 'Current Liabilities': suggestedParentCode = '21000'; break;
        case 'Non-Current Liabilities': suggestedParentCode = '25000'; break;
        case 'Share Capital & Premium': suggestedParentCode = '31000'; break;
        case 'Retained Earnings & Reserves': suggestedParentCode = '32000'; break;
        case 'Operating Revenue': suggestedParentCode = '41000'; break;
        case 'Non-Operating Revenue': suggestedParentCode = '42000'; break;
        case 'Cost of Goods Sold': suggestedParentCode = '50000'; break;
        case 'Operating Expenses': suggestedParentCode = '61000'; break;
        case 'Non-Operating Expenses': suggestedParentCode = '60000'; break;
      }
      const suggestedParent = accounts.find(a => a.code === suggestedParentCode);
      const parentId = suggestedParent ? suggestedParent.id : '';
      setForm((f: any) => ({ ...f, parentId }));
      fetchNextCode(val, parentId);
    }
  };

  const filteredParents = useMemo(() => {
    const baseType = form.type?.replace('Contra', '');
    return accounts.filter(a => {
      if (a.id === editing?.id) return false;
      const aBaseType = a.type?.replace('Contra', '');
      return aBaseType === baseType;
    }).sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, form.type, editing]);

  const calculatedLevel = useMemo(() => {
    if (!form.parentId) return 'Main Head';
    const parent = accounts.find(a => a.id === form.parentId);
    if (!parent) return 'Main Head';
    if (!parent.parentId) return 'Sub Head';
    return 'Detail Account';
  }, [form.parentId, accounts]);

  const calculatedNormalBalance = useMemo(() => {
    const type = form.type;
    if (type === 'Asset' || type === 'Expense' || type === 'ContraLiability' || type === 'ContraEquity' || type === 'ContraRevenue') {
      return 'Debit';
    }
    return 'Credit';
  }, [form.type]);

  const activeSubtypes = subtypesMap[form.type] || [];
  const isCodeValid = /^\d{5}$/.test(form.code);

  const [unlockOverride, setUnlockOverride] = useState(false);
  const isLocked = editing?.isSystem && !unlockOverride;

  return (
    <div className="overlay">
      <form className="modal max-w-2xl" onSubmit={save}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">CHART OF ACCOUNTS</p>
            <h2>{editing ? 'Edit Account Properties' : 'Create 5-Digit Account'}</h2>
          </div>
          <button type="button" className="close" onClick={close}>×</button>
        </div>

        <div className="form-grid">
          {/* Security Banner & Unlock Switch */}
          {editing?.isSystem ? (
            <div className="col-span-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🔒</span>
                <div>
                  <strong className="text-amber-900 dark:text-amber-300 block">Secured System Account</strong>
                  <span className="text-muted-foreground text-[11px]">Core ledger mapped for ERP integrity.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnlockOverride(!unlockOverride)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                  unlockOverride
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                }`}
              >
                {unlockOverride ? '🔓 Structure Unlocked' : '🔑 Unlock Structure'}
              </button>
            </div>
          ) : (
            <div className="col-span-2 p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <div>
                  <strong className="text-teal-900 dark:text-teal-300 block">Custom Ledger Account</strong>
                  <span className="text-muted-foreground text-[11px]">Fully customizable chart of accounts entity.</span>
                </div>
              </div>
              <label className="flex items-center gap-1.5 font-bold cursor-pointer text-teal-800 dark:text-teal-300 text-xs">
                <input
                  type="checkbox"
                  checked={form.isSystem}
                  onChange={e => field('isSystem', e.target.checked)}
                  className="rounded text-teal-600"
                />
                Secure as Protected Ledger
              </label>
            </div>
          )}

          <label>
            * 1. 5-Digit Account Code
            <input
              required
              disabled={isLocked}
              value={form.code}
              onChange={e => field('code', e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="e.g. 11101"
              className={!isCodeValid && form.code ? 'border-red-500 font-mono font-bold' : 'font-mono font-bold'}
            />
          </label>

          <label>
            * 2. Account Name
            <input
              required
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. HBL Operational Current Account"
            />
          </label>

          <label>
            3. Major Type
            <select disabled={isLocked} value={form.type} onChange={e => handleTypeChange(e.target.value)}>
              {accountTypes.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>

          <label>
            4. Sub-Type
            <select disabled={isLocked} value={subtype} onChange={e => handleSubtypeChange(e.target.value)}>
              {activeSubtypes.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>

          <label className="col-span-2">
            5. Parent Account (Financial Reporting Line)
            <select
              disabled={isLocked}
              value={form.parentId}
              onChange={e => { field('parentId', e.target.value); if (!editing) fetchNextCode(form.type, e.target.value); }}
            >
              <option value="">No Parent (Top-Level Group Line)</option>
              {filteredParents.map(a => (
                <option value={a.id} key={a.id}>{a.code} — {a.name} ({a.subtype || a.type})</option>
              ))}
            </select>
          </label>

          <label>
            Opening Balance
            <input
              type="number"
              step="0.01"
              value={form.openingBalance}
              onChange={e => field('openingBalance', e.target.value)}
              placeholder="0.00"
            />
          </label>

          <label>
            Currency
            <select value={form.currency} onChange={e => field('currency', e.target.value)}>
              <option value="PKR">PKR (Pakistani Rupee)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
              <option value="AED">AED (UAE Dirham)</option>
              <option value="SAR">SAR (Saudi Riyal)</option>
              <option value="CAD">CAD (Canadian Dollar)</option>
            </select>
          </label>

          <label>
            Tax Category
            <select value={form.taxCategory || ''} onChange={e => field('taxCategory', e.target.value)}>
              <option value="">None / Exempt</option>
              <option value="Standard VAT">Standard VAT (15% / 18%)</option>
              <option value="Zero Rated">Zero Rated</option>
              <option value="Sales Tax">US Sales Tax</option>
              <option value="GST">GST / HST (Canada / PK)</option>
            </select>
          </label>

          <label>
            Account Status
            <select value={form.status} onChange={e => field('status', e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>

          <label className="col-span-2">
            Description / Remarks
            <textarea
              value={form.description || ''}
              onChange={e => field('description', e.target.value)}
              placeholder="Describe the business purpose and posting rules for this account..."
              style={{ width: '100%', minHeight: 65, border: '1px solid var(--color-border)', borderRadius: 8, padding: 8, fontSize: 12, resize: 'none' }}
            />
          </label>
        </div>

        {/* Derived Attributes & Options */}
        <div className="mt-4 pt-3 border-t border-border space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-muted/40 rounded-xl border border-border">
            <div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase block">Hierarchy Level</span>
              <span className="font-semibold text-foreground text-xs">{calculatedLevel}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase block">Normal Balance</span>
              <span className={`font-bold text-xs ${calculatedNormalBalance === 'Debit' ? 'text-blue-600' : 'text-emerald-600'}`}>{calculatedNormalBalance}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="check flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={form.allowManualJournal}
                onChange={e => field('allowManualJournal', e.target.checked)}
              />
              Allow Manual General Journal Postings & Adjustments
            </label>
            <label className="check flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={form.reconciliationEnabled}
                onChange={e => field('reconciliationEnabled', e.target.checked)}
              />
              Enable Periodic Bank & Ledger Reconciliation
            </label>
            {editing && (
              <label className="check flex items-center gap-2 cursor-pointer font-bold text-amber-700 dark:text-amber-300">
                <input
                  type="checkbox"
                  checked={form.isSystem}
                  onChange={e => field('isSystem', e.target.checked)}
                />
                🔒 Protect Account Security (Lock as Core ERP Control Ledger)
              </label>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary" onClick={close}>Cancel</button>
          <button className="primary" disabled={!isCodeValid || !form.name.trim()}>
            {editing ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  );
}
