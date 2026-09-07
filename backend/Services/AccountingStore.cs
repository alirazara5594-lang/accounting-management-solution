using Zenabook.Api.Models;
using Zenabook.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using System.Collections;
using System.Reflection;

namespace Zenabook.Api.Services;

public class AccountingStore
{
    private readonly List<Account> _accounts = [];
    private readonly List<JournalEntry> _entries = [];
    private readonly List<JournalTemplate> _templates = [];
    private readonly List<RecurringJournalEntry> _recurringEntries = [];
    private readonly List<JournalEvent> _journalEvents = [];
    private readonly List<IntercompanyAllocation> _intercompanyAllocations = [];
    private readonly List<Company> _companies = [];
    private readonly List<Customer> _customers = [];
    private readonly List<Product> _products = [];
    private readonly List<Vendor> _vendors = [];
    private readonly List<PurchaseOrder> _purchaseOrders = [];
    private readonly List<GoodsReceiptNote> _grns = [];
    private readonly List<PurchaseRequest> _prs = [];
    private readonly List<RequestForQuotation> _rfqs = [];
    private readonly List<VendorQuote> _vendorQuotes = [];
    private readonly List<VendorBill> _vendorBills = [];
    private readonly List<FixedAsset> _fixedAssets = [];
    private readonly List<Warehouse> _warehouses = [];
    private readonly List<StockLevel> _stockLevels = [];
    private readonly List<StockTransaction> _stockTransactions = [];
    private readonly List<TaxAuthority> _taxAuthorities = [];
    private readonly List<TaxCode> _taxCodes = [];
    private readonly List<TaxRate> _taxRates = [];
    private readonly List<SalesInvoice> _salesInvoices = [];
    private readonly List<Estimate> _estimates = [];
    private readonly List<SalesOrder> _salesOrders = [];
    private readonly List<CreditNote> _creditNotes = [];
    private readonly List<BillOfMaterials> _boms = [];
    private readonly List<WorkOrder> _workOrders = [];
    private readonly List<CustomerPayment> _customerPayments = [];
    private readonly List<VendorPayment> _vendorPayments = [];
    private readonly List<FundTransfer> _fundTransfers = [];
    private readonly List<BankReconciliation> _reconciliations = [];
    private readonly List<Budget> _budgets = [];
    private readonly List<PeriodClose> _periodCloses = [];
private readonly List<Voucher> _vouchers = [];
    private readonly List<ExpenseClaim> _expenseClaims = [];
    private readonly List<BankStatementImport> _bankImports = [];
    private readonly List<PayComponent> _payComponents = [];
    private readonly List<Employee> _employees = [];
    private readonly List<Department> _departments = [];
    private readonly List<Position> _positions = [];
    private readonly List<PayGrade> _payGrades = [];
    private readonly List<LeaveBalance> _leaveBalances = [];
    private readonly List<LeaveRequest> _leaveRequests = [];
    private readonly List<AttendanceRecord> _attendanceRecords = [];
    private readonly List<Payrun> _payruns = [];
    private readonly List<PayrunEmployee> _payrunEmployees = [];
    private readonly List<PayrunLine> _payrunLines = [];
    private readonly List<SalarySlip> _salarySlips = [];
    private readonly List<Holiday> _holidays = [];
    private readonly List<LoanAdvance> _loanAdvances = [];
    private readonly List<SalaryTaxSlab> _taxSlabs = [];
    private readonly List<EmployeeCompensation> _employeeCompensations = [];
    private readonly List<Project> _projects = [];
    private readonly List<ProjectPhase> _projectPhases = [];
    private readonly List<ProjectTask> _projectTasks = [];
    private readonly List<TimesheetEntry> _timesheets = [];
    private readonly List<ProjectExpense> _projectExpenses = [];
    private readonly List<TaxObligation> _taxObligations = [];
    private readonly List<TaxReturn> _taxReturns = [];
    private readonly List<TaxExemption> _taxExemptions = [];
    private readonly List<LeaseAgreement> _leases = [];
    private readonly List<WithholdingCertificate> _withholdingCertificates = [];
    private readonly List<EInvoice> _eInvoices = [];
    private readonly List<Survey> _surveys = [];
    private readonly List<FieldVisit> _fieldVisits = [];
    private readonly List<Inspection> _inspections = [];
    private readonly List<FieldWorkOrder> _fieldWorkOrders = [];
    private readonly List<FieldExpense> _fieldExpenses = [];
    private readonly List<AdminUser> _adminUsers = [];
    private readonly List<UserRole> _userRoles = [];
    private readonly List<Branch> _branches = [];
    private readonly List<ApprovalWorkflow> _approvalWorkflows = [];
    private readonly List<NumberSeries> _numberSeries = [];
    private readonly List<Currency> _currencies = [];
    private readonly List<AccountMapping> _mappings = [];
    private readonly List<PrepaymentSchedule> _prepaymentSchedules = [];
    private readonly List<AuditItem> _auditLog = [];
    private readonly Dictionary<Guid, List<AuditItem>> _history = [];
    private readonly object _lock = new();
    private readonly object _persistLock = new();
    private readonly IConfiguration _config;
    private readonly PayrollCountry _activeCountry;

    private readonly IDbContextFactory<AccountingDbContext>? _dbFactory;
    private sealed record StoredState(
        List<Account> Accounts, 
        List<JournalEntry> Entries, 
        Dictionary<Guid, List<AuditItem>> History, 
        List<JournalTemplate> Templates, 
        List<RecurringJournalEntry> RecurringEntries, 
        List<JournalEvent> Events, 
        List<IntercompanyAllocation>? IntercompanyAllocations = null, 
        List<Company>? Companies = null, 
        List<Customer>? Customers = null, 
        List<Product>? Products = null, 
        List<Vendor>? Vendors = null,
        List<PurchaseOrder>? PurchaseOrders = null,
        List<GoodsReceiptNote>? Grns = null,
        List<FixedAsset>? FixedAssets = null,
        List<TaxAuthority>? TaxAuthorities = null,
        List<TaxCode>? TaxCodes = null,
        List<TaxRate>? TaxRates = null,
        List<Warehouse>? Warehouses = null,
        List<StockLevel>? StockLevels = null,
        List<StockTransaction>? StockTransactions = null,
        List<SalesInvoice>? SalesInvoices = null,
        List<Estimate>? Estimates = null,
        List<BillOfMaterials>? Boms = null,
        List<WorkOrder>? WorkOrders = null,
        List<AccountMapping>? Mappings = null,
        List<SalesOrder>? SalesOrders = null,
        List<CreditNote>? CreditNotes = null,
        List<CustomerPayment>? CustomerPayments = null,
        List<VendorPayment>? VendorPayments = null,
        List<FundTransfer>? FundTransfers = null,
        List<BankReconciliation>? Reconciliations = null,
        List<Budget>? Budgets = null,
        List<PeriodClose>? PeriodCloses = null,
        List<Voucher>? Vouchers = null,
List<ExpenseClaim>? ExpenseClaims = null,
        List<BankStatementImport>? BankImports = null,
        List<PayComponent>? PayComponents = null,
        List<Employee>? Employees = null,
        List<Department>? Departments = null,
        List<Position>? Positions = null,
        List<PayGrade>? PayGrades = null,
        List<LeaveBalance>? LeaveBalances = null,
        List<LeaveRequest>? LeaveRequests = null,
        List<AttendanceRecord>? AttendanceRecords = null,
        List<Payrun>? Payruns = null,
        List<PayrunEmployee>? PayrunEmployees = null,
        List<PayrunLine>? PayrunLines = null,
        List<SalarySlip>? SalarySlips = null,
        List<Holiday>? Holidays = null,
        List<LoanAdvance>? LoanAdvances = null,
        List<SalaryTaxSlab>? TaxSlabs = null,
        List<EmployeeCompensation>? EmployeeCompensations = null,
        List<Project>? Projects = null,
        List<ProjectPhase>? ProjectPhases = null,
        List<ProjectTask>? ProjectTasks = null,
        List<TimesheetEntry>? Timesheets = null,
        List<ProjectExpense>? ProjectExpenses = null,
        List<TaxObligation>? TaxObligations = null,
        List<TaxReturn>? TaxReturns = null,
        List<TaxExemption>? TaxExemptions = null,
        List<WithholdingCertificate>? WithholdingCertificates = null,
        List<EInvoice>? EInvoices = null,
        List<Survey>? Surveys = null,
        List<FieldVisit>? FieldVisits = null,
        List<Inspection>? Inspections = null,
        List<FieldWorkOrder>? FieldWorkOrders = null,
        List<FieldExpense>? FieldExpenses = null,
        List<AdminUser>? AdminUsers = null,
        List<UserRole>? UserRoles = null,
        List<Branch>? Branches = null,
        List<ApprovalWorkflow>? ApprovalWorkflows = null,
        List<NumberSeries>? NumberSeries = null,
        List<Currency>? Currencies = null,
        List<AuditItem>? AuditLog = null,
        List<LeaseAgreement>? Leases = null,
        List<PrepaymentSchedule>? Prepayments = null);

    public AccountingStore(IDbContextFactory<AccountingDbContext>? dbFactory = null, IConfiguration? config = null)
    {
        _dbFactory = dbFactory;
        _config = config ?? new ConfigurationBuilder().Build();
        var defaultCountry = _config["ERP:ActiveCountry"] ?? "PK";
        _activeCountry = Enum.Parse<PayrollCountry>(defaultCountry, true);
        if (LoadState()) return;
        var (parentCountry, parentCurrency) = _activeCountry switch
        {
            PayrollCountry.PK => ("Pakistan", "PKR"),
            PayrollCountry.UK => ("United Kingdom", "GBP"),
            PayrollCountry.CA => ("Canada", "CAD"),
            PayrollCountry.DE => ("Germany", "EUR"),
            PayrollCountry.SA => ("Saudi Arabia", "SAR"),
            PayrollCountry.AE => ("United Arab Emirates", "AED"),
            _ => ("United States", "USD"),
        };
        var parentEntity = new Company { Name = "Acme Holdings", Code = "ACME", Type = EntityType.Parent, Country = parentCountry, CurrencyCode = parentCurrency };
        _companies.AddRange([parentEntity, new Company { Name = "Acme Services", Code = "ASV", ParentId = parentEntity.Id, Country = parentCountry, CurrencyCode = parentCurrency }, new Company { Name = "Acme Trading", Code = "ATD", ParentId = parentEntity.Id, Country = parentCountry, CurrencyCode = parentCurrency }]);

        SeedAccounts();

        // Seed all global country presets
        SeedCountryTaxPreset("Pakistan");
        SeedCountryTaxPreset("United Kingdom");
        SeedCountryTaxPreset("Saudi Arabia");
        SeedCountryTaxPreset("United Arab Emirates");
        SeedCountryTaxPreset("United States");
        SeedCountryTaxPreset("Canada");
        SeedCountryTaxPreset("European Union");

        var defaultWarehouse = new Warehouse { Name = "Main Warehouse", Location = "Headquarters", CompanyId = parentEntity.Id };
        _warehouses.Add(defaultWarehouse);

        SeedAdministrationData();
        Persist();
    }

    private Account Seed(string code, string name, AccountType type, Guid? parent, bool reconciliation = false, decimal opening = 0, bool isSystem = true)
    {
        var a = new Account { Code = code, Name = name, Type = type, ParentId = parent, ReconciliationEnabled = reconciliation, OpeningBalance = opening, OpeningBalanceDate = opening != 0 ? DateOnly.FromDateTime(DateTime.Today) : null, IsSystem = isSystem };
        _accounts.Add(a); _history[a.Id] = [new(DateTime.UtcNow, "Created", "Starter account")]; return a;
    }

    private void SeedAccounts()
    {
        _accounts.Clear();
        // 1. Assets (Structural Headers: System = True; Leaf Posting: System = False)
        var assets = Seed("10000", "Assets", AccountType.Asset, null);
        var currentAssets = Seed("11000", "Current Assets", AccountType.Asset, assets.Id);
        
        var cash = Seed("11100", "Cash", AccountType.Asset, currentAssets.Id);
        Seed("11101", "Cash on Hand", AccountType.Asset, cash.Id, true, 0, false);
        Seed("11102", "Petty Cash", AccountType.Asset, cash.Id, true, 0, false);

        var bank = Seed("11200", "Bank Accounts", AccountType.Asset, currentAssets.Id);
        Seed("11201", "HBL Current Account", AccountType.Asset, bank.Id, true, 0, false);
        Seed("11202", "Standard Chartered USD", AccountType.Asset, bank.Id, true, 0, false);

        Seed("12000", "Accounts Receivable", AccountType.Asset, currentAssets.Id, true, 0, false);
        Seed("12100", "Allowance for Doubtful Accounts", AccountType.ContraAsset, currentAssets.Id, true, 0, false);
        Seed("12200", "Withholding Tax Receivable (Advance Tax)", AccountType.Asset, currentAssets.Id, true, 0, false);
        Seed("12300", "Intercompany Receivable", AccountType.Asset, currentAssets.Id, true, 0, false);
        Seed("13000", "Inventory Asset", AccountType.Asset, currentAssets.Id, true, 0, false);
        Seed("14000", "Prepaid Expenses", AccountType.Asset, currentAssets.Id, true, 0, false);
        Seed("14100", "Input VAT / Recoverable Tax (Operating Expenses)", AccountType.Asset, currentAssets.Id, true, 0, false);
        Seed("14120", "Import VAT & Customs Duty Tax Clearing", AccountType.Asset, currentAssets.Id, true, 0, false);
        Seed("14130", "Capital Goods Input VAT (Fixed Assets)", AccountType.Asset, currentAssets.Id, true, 0, false);
        Seed("14150", "Reverse Charge Mechanism (RCM) Input Tax", AccountType.Asset, currentAssets.Id, true, 0, false);
        
        var nonCurrentAssets = Seed("15000", "Non-Current Assets", AccountType.Asset, assets.Id);
        Seed("15100", "Fixed Assets", AccountType.Asset, nonCurrentAssets.Id, true, 0, false);
        Seed("15110", "Right of Use Asset", AccountType.Asset, nonCurrentAssets.Id, true, 0, false);
        Seed("15200", "Accumulated Depreciation", AccountType.ContraAsset, nonCurrentAssets.Id, true, 0, false);
        Seed("15300", "Deferred Tax Asset (IAS 12)", AccountType.Asset, nonCurrentAssets.Id, true, 0, false);

        // 2. Liabilities (Structural Headers: System = True; Leaf Posting: System = False)
        var liabilities = Seed("20000", "Liabilities", AccountType.Liability, null);
        var currentLiabilities = Seed("21000", "Current Liabilities", AccountType.Liability, liabilities.Id);
        Seed("21100", "Accounts Payable", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("21200", "GRNI Accrual", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("21300", "Accrued Salaries Payable", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("21400", "Payroll Tax Payable", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("21500", "EOBI & Social Security Payable", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("21510", "Provident Fund & Pension Payable", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("21520", "End of Service Benefits (EOSB) Accrual", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("21530", "Employee Loan Deductions Clearing", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("22000", "Sales Tax / Output VAT Payable", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("22030", "Import VAT Payable", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("22040", "Fixed Asset Disposal Output Tax Payable", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("22050", "Reverse Charge Mechanism (RCM) Output Tax Payable", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("22100", "Withholding Tax (WHT) Payable on Vendors", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("22200", "Corporate Income Tax Payable (IAS 12)", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("21600", "Lease Liability", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("21700", "Intercompany Clearing", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("21800", "Overhead Allocation Payable", AccountType.Liability, currentLiabilities.Id, true, 0, false);
        Seed("23000", "Deferred Revenue", AccountType.Liability, currentLiabilities.Id, true, 0, false);

        var nonCurrentLiabilities = Seed("25000", "Non-Current Liabilities", AccountType.Liability, liabilities.Id);
        Seed("25200", "Deferred Tax Liability (IAS 12)", AccountType.Liability, nonCurrentLiabilities.Id, true, 0, false);

        // 3. Equity (Structural Headers: System = True; Leaf Posting: System = False)
        var equity = Seed("30000", "Equity", AccountType.Equity, null);
        Seed("31000", "Share Capital", AccountType.Equity, equity.Id, false, 0, false);
        Seed("32000", "Retained Earnings", AccountType.Equity, equity.Id, false, 0, false);

        // 4. Revenue (Structural Headers: System = True; Leaf Posting: System = False)
        var revenue = Seed("40000", "Revenue", AccountType.Revenue, null);
        var operatingRevenue = Seed("41000", "Operating Revenue", AccountType.Revenue, revenue.Id);
        Seed("41100", "Sales Revenue", AccountType.Revenue, operatingRevenue.Id, true, 0, false);
        Seed("41200", "Service Revenue", AccountType.Revenue, operatingRevenue.Id, true, 0, false);
        Seed("41300", "Sales Discounts", AccountType.ContraRevenue, operatingRevenue.Id, true, 0, false);
        Seed("41400", "Sales Returns & Allowances", AccountType.ContraRevenue, operatingRevenue.Id, true, 0, false);
        Seed("42000", "Non-Operating Revenue", AccountType.Revenue, revenue.Id, false, 0, false);

        // 5. Cost of Goods Sold (Structural Headers: System = True; Leaf Posting: System = False)
        var cogs = Seed("50000", "Cost of Goods Sold", AccountType.Expense, null);
        Seed("51000", "Cost of Sales", AccountType.Expense, cogs.Id, false, 0, false);
        Seed("51100", "Purchase Discounts", AccountType.ContraExpense, cogs.Id, false, 0, false);
        Seed("51200", "Purchase Returns & Allowances", AccountType.ContraExpense, cogs.Id, false, 0, false);

        // 6. Expenses (Structural Headers: System = True; Leaf Posting: System = False)
        var expenses = Seed("60000", "Expenses", AccountType.Expense, null);
        var operatingExpenses = Seed("61000", "Operating Expenses", AccountType.Expense, expenses.Id);
        Seed("61100", "Office Expenses", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61200", "Salaries & Wages Expense", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61210", "Housing & Living Allowances (HRA)", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61220", "Transport & Conveyance Allowance", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61230", "Medical & Utility Allowances", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61250", "Employer Statutory Payroll Contributions", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61260", "End of Service & Gratuity Expense", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61300", "Depreciation Expense", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61400", "Interest Expense", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61410", "Bad Debt Expense", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61500", "Intercompany Allocations", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61600", "Overhead Allocation", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61700", "Non-Recoverable Purchase Tax & Duty Expense", AccountType.Expense, operatingExpenses.Id, true, 0, false);
        Seed("61800", "Corporate Income Tax Provision Expense (IAS 12)", AccountType.Expense, operatingExpenses.Id, true, 0, false);
    }

    public IReadOnlyList<Account> Accounts
    {
        get
        {
            lock (_lock)
            {
                EnsureRequiredPayrollAccounts();
                FixIncorrectMappings();
                CorrectMispostedRevenueLines();
                foreach (var a in _accounts)
                {
                    a.IsSystem = _mappings.Any(m => m.AccountId == a.Id);
                }
                return _accounts;
            }
        }
    }
    public IReadOnlyList<AccountMapping> Mappings => _mappings;
    public IReadOnlyList<JournalEntry> Entries => _entries;
    public IReadOnlyList<JournalTemplate> Templates => _templates;
    public IReadOnlyList<RecurringJournalEntry> RecurringEntries => _recurringEntries;
    public IReadOnlyList<IntercompanyAllocation> IntercompanyAllocations => _intercompanyAllocations;
    public IReadOnlyList<Company> Companies => _companies;
    public IReadOnlyList<Customer> Customers => _customers;
    public IReadOnlyList<Product> Products => _products;
    public IReadOnlyList<Vendor> Vendors => _vendors;
    public IReadOnlyList<PurchaseOrder> PurchaseOrders => _purchaseOrders;
    public IReadOnlyList<GoodsReceiptNote> GoodsReceiptNotes => _grns;
    public IReadOnlyList<PurchaseRequest> PurchaseRequests => _prs;
    public IReadOnlyList<RequestForQuotation> RequestForQuotations => _rfqs;
    public IReadOnlyList<VendorQuote> VendorQuotes => _vendorQuotes;
    public IReadOnlyList<VendorBill> VendorBills => _vendorBills;
    public IReadOnlyList<FixedAsset> FixedAssets => _fixedAssets;
    public IReadOnlyList<TaxAuthority> TaxAuthorities => _taxAuthorities;
    public IReadOnlyList<TaxCode> TaxCodes => _taxCodes;
    public IReadOnlyList<Warehouse> Warehouses => _warehouses;
    public IReadOnlyList<StockLevel> StockLevels => _stockLevels;
    public IReadOnlyList<StockTransaction> StockTransactions => _stockTransactions;
    public IReadOnlyList<SalesInvoice> SalesInvoices => _salesInvoices;
    public IReadOnlyList<Estimate> Estimates => _estimates;
    public IReadOnlyList<SalesOrder> SalesOrders => _salesOrders;
    public IReadOnlyList<CreditNote> CreditNotes => _creditNotes;
    public IReadOnlyList<TaxRate> TaxRates => _taxRates;
    public IReadOnlyList<BillOfMaterials> BillOfMaterials => _boms;
    public IReadOnlyList<WorkOrder> WorkOrders => _workOrders;
    public IReadOnlyList<CustomerPayment> CustomerPayments => _customerPayments;
    public IReadOnlyList<VendorPayment> VendorPayments => _vendorPayments;
    public IReadOnlyList<FundTransfer> FundTransfers => _fundTransfers;
    public IReadOnlyList<BankReconciliation> Reconciliations => _reconciliations;
    public IReadOnlyList<Budget> Budgets => _budgets;
    public IReadOnlyList<PeriodClose> PeriodCloses => _periodCloses;
    public IReadOnlyList<Voucher> Vouchers => _vouchers;
public IReadOnlyList<ExpenseClaim> ExpenseClaims => _expenseClaims;
    public IReadOnlyList<BankStatementImport> BankImports => _bankImports;
    public IReadOnlyList<PayComponent> PayComponents => _payComponents;
    public IReadOnlyList<Employee> Employees => _employees;
    public IReadOnlyList<Department> Departments => _departments;
    public IReadOnlyList<Position> Positions => _positions;
    public IReadOnlyList<PayGrade> PayGrades => _payGrades;
    public IReadOnlyList<LeaveBalance> LeaveBalances => _leaveBalances;
    public IReadOnlyList<LeaveRequest> LeaveRequests => _leaveRequests;
    public IReadOnlyList<AttendanceRecord> AttendanceRecords => _attendanceRecords;
    public IReadOnlyList<Payrun> Payruns => _payruns;
    public IReadOnlyList<PayrunEmployee> PayrunEmployees => _payrunEmployees;
    public IReadOnlyList<PayrunLine> PayrunLines => _payrunLines;
    public IReadOnlyList<SalarySlip> SalarySlips => _salarySlips;
    public IReadOnlyList<Holiday> Holidays => _holidays;
    public IReadOnlyList<LoanAdvance> LoanAdvances => _loanAdvances;
    public IReadOnlyList<LeaseAgreement> Leases => _leases;
    public IReadOnlyList<SalaryTaxSlab> TaxSlabs => _taxSlabs;
public IReadOnlyList<EmployeeCompensation> EmployeeCompensations => _employeeCompensations;
    public IReadOnlyList<Project> Projects => _projects;
    public IReadOnlyList<ProjectPhase> ProjectPhases => _projectPhases;
    public IReadOnlyList<ProjectTask> ProjectTasks => _projectTasks;
    public IReadOnlyList<TimesheetEntry> Timesheets => _timesheets;
    public IReadOnlyList<ProjectExpense> ProjectExpenses => _projectExpenses;
    public IReadOnlyList<TaxObligation> TaxObligations => _taxObligations;
    public IReadOnlyList<TaxReturn> TaxReturns => _taxReturns;
    public IReadOnlyList<TaxExemption> TaxExemptions => _taxExemptions;
    public IReadOnlyList<WithholdingCertificate> WithholdingCertificates => _withholdingCertificates;
    public IReadOnlyList<EInvoice> EInvoices => _eInvoices;
    public IReadOnlyList<Survey> Surveys => _surveys;
    public IReadOnlyList<FieldVisit> FieldVisits => _fieldVisits;
    public IReadOnlyList<Inspection> Inspections => _inspections;
    public IReadOnlyList<FieldWorkOrder> FieldWorkOrders => _fieldWorkOrders;
    public IReadOnlyList<FieldExpense> FieldExpenses => _fieldExpenses;
    public IReadOnlyList<AdminUser> AdminUsers => _adminUsers;
    public IReadOnlyList<UserRole> UserRoles => _userRoles;
    public IReadOnlyList<Branch> Branches => _branches;
    public IReadOnlyList<ApprovalWorkflow> ApprovalWorkflows => _approvalWorkflows;
    public IReadOnlyList<NumberSeries> NumberSeriesList => _numberSeries;
    public IReadOnlyList<Currency> Currencies => _currencies;

    public string NextReceiptNumber()
    {
        var numbers = _customerPayments.Select(p => p.ReceiptNumber).Where(n => n.StartsWith("REC-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"REC-{(numbers.Max() + 1):D4}";
    }

    public string NextProjectNumber()
    {
        var numbers = _projects.Select(p => p.ProjectNumber).Where(n => n.StartsWith("PRJ-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"PRJ-{(numbers.Max() + 1):D4}";
    }

    public string NextObligationNumber()
    {
        var numbers = _taxObligations.Select(o => o.ObligationNumber).Where(n => n.StartsWith("OBL-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"OBL-{(numbers.Max() + 1):D4}";
    }

    public string NextReturnNumber()
    {
        var numbers = _taxReturns.Select(r => r.ReturnNumber).Where(n => n.StartsWith("RET-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"RET-{(numbers.Max() + 1):D4}";
    }

    public bool CreateCustomerPayment(CustomerPaymentRequest request, out CustomerPayment? payment, out string? error)
    {
        lock (_lock)
        {
            payment = null; error = null;
            if (request.Amount <= 0) { error = "Payment amount must be positive."; return false; }
            var customer = _customers.FirstOrDefault(c => c.Id == request.CustomerId);
            if (customer == null) { error = "Customer not found."; return false; }
            if (request.InvoiceId.HasValue)
            {
                var invoice = _salesInvoices.FirstOrDefault(i => i.Id == request.InvoiceId.Value);
                if (invoice == null) { error = "Invoice not found."; return false; }
                if (request.Amount > invoice.AmountDue) { error = $"Payment amount ({request.Amount}) exceeds invoice amount due ({invoice.AmountDue})."; return false; }
            }

            // Resolve deposit account (bank/cash receiving the funds)
            var depositId = request.DepositToAccountId ?? GetDefaultDepositAccount();
            var depositAcc = _accounts.FirstOrDefault(a => a.Id == depositId);
            if (depositAcc == null || !depositAcc.IsPosting || depositAcc.Status == AccountStatus.Inactive)
            {
                error = "Deposit To account is not a valid active posting account. Select a Cash or Bank account.";
                return false;
            }

            // Resolve AR account through the central mapping
            var arAccountId = GetMappedAccount("Customer Receivables");
            var arAcc = _accounts.FirstOrDefault(a => a.Id == arAccountId);
            if (arAcc == null || !arAcc.IsPosting || arAcc.Status == AccountStatus.Inactive)
            {
                error = "Customer Receivables account is not mapped to a valid posting account. Configure it under System Account Mapping.";
                return false;
            }

            payment = new CustomerPayment
            {
                ReceiptNumber = NextReceiptNumber(),
                CustomerId = request.CustomerId,
                InvoiceId = request.InvoiceId,
                PaymentDate = request.PaymentDate,
                Amount = request.Amount,
                PaymentMethod = request.PaymentMethod,
                BankAccountName = request.BankAccountName,
                DepositToAccountId = depositId,
                Reference = request.Reference,
                Memo = request.Memo,
                CompanyId = request.CompanyId,
                Status = CustomerPaymentStatus.Posted,
            };

            // Post the double-entry journal: Dr Bank/Cash / Cr AR
            var journal = new JournalEntry
            {
                Date = request.PaymentDate,
                Reference = payment.ReceiptNumber,
                Description = $"Customer payment from {customer.Name} ({payment.ReceiptNumber})",
                TransactionType = TransactionType.Receipt,
                CompanyId = request.CompanyId,
                Lines =
                [
                    new JournalLine(depositId, payment.Amount, 0, $"Receipt: {payment.ReceiptNumber}", null, null, 1, request.CompanyId),
                    new JournalLine(arAccountId, 0, payment.Amount, $"AR: {payment.ReceiptNumber}", null, null, 1, request.CompanyId)
                ],
                Status = JournalStatus.Posted
            };
            _entries.Add(journal);
            payment.JournalEntryId = journal.Id;

            _customerPayments.Add(payment);
            // If posted against an invoice, update invoice AmountPaid
            if (request.InvoiceId.HasValue)
            {
                var invoice = _salesInvoices.First(i => i.Id == request.InvoiceId.Value);
                invoice.AmountPaid += request.Amount;
                if (invoice.AmountDue <= 0) invoice.Status = SalesInvoiceStatus.Paid;
                else invoice.Status = SalesInvoiceStatus.PartiallyPaid;
            }
            Persist();
            return true;
        }
    }

    public string NextVendorPaymentNumber()
    {
        var numbers = _vendorPayments.Select(p => p.PaymentNumber).Where(n => n.StartsWith("PAY-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"PAY-{(numbers.Max() + 1):D5}";
    }

    public string NextFundTransferNumber()
    {
        var numbers = _fundTransfers.Select(t => t.TransferNumber).Where(n => n.StartsWith("TRF-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"TRF-{(numbers.Max() + 1):D5}";
    }

    /// <summary>Returns the first active posting Cash/Bank account (child of 11100 or 11200) as default deposit/disbursement target.</summary>
    public Guid GetDefaultDepositAccount()
    {
        var cashParent = _accounts.FirstOrDefault(a => a.Code == "11100");
        var bankParent = _accounts.FirstOrDefault(a => a.Code == "11200");
        var account = _accounts.FirstOrDefault(a => a.Status == AccountStatus.Active && a.IsPosting &&
            ((cashParent != null && a.ParentId == cashParent.Id) || (bankParent != null && a.ParentId == bankParent.Id)));
        return account?.Id ?? Guid.Empty;
    }

    /// <summary>Returns Cash (11100 children) or Bank (11200 children) COA accounts with computed GL balances.</summary>
    public List<object> GetCashBankAccounts(bool bankOnly, Guid? companyId)
    {
        lock (_lock)
        {
            var parentCode = bankOnly ? "11200" : "11100";
            var parent = _accounts.FirstOrDefault(a => a.Code == parentCode);
            if (parent == null) return [];

            var result = new List<object>();
            foreach (var account in _accounts.Where(a => a.ParentId == parent.Id).OrderBy(a => a.Code))
            {
                var glBalance = account.OpeningBalance + _entries
                    .Where(e => e.Status == JournalStatus.Posted)
                    .SelectMany(e => e.Lines)
                    .Where(l => l.AccountId == account.Id)
                    .Sum(l => l.Debit - l.Credit);

                result.Add(new
                {
                    account.Id,
                    account.Code,
                    account.Name,
                    account.Currency,
                    account.Status,
                    OpeningBalance = account.OpeningBalance,
                    Balance = glBalance,
                    account.ReconciliationEnabled,
                    BankName = account.CustomFields.TryGetValue("BankName", out var bn) ? bn : null,
                    account.UpdatedAt
                });
            }
            return result;
        }
    }

    public bool CreateCashBankAccount(CashBankAccountRequest request, bool bankOnly, out Account? account, out string? error)
    {
        lock (_lock)
        {
            account = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Account name is required."; return false; }

            var parentCode = bankOnly ? "11200" : "11100";
            var parent = _accounts.FirstOrDefault(a => a.Code == parentCode);
            if (parent == null) { error = "Cash/Bank parent account not found."; return false; }

            var code = request.Code?.Trim();
            if (string.IsNullOrWhiteSpace(code))
            {
                var prefix = bankOnly ? "112" : "111";
                var next = _accounts.Where(a => a.Code.StartsWith(prefix)).Select(a => int.TryParse(a.Code[3..], out var n) ? n : 0).DefaultIfEmpty(0).Max() + 1;
                code = $"{prefix}{next:D2}";
            }
            if (code.Length != 5 || !code.All(char.IsDigit)) { error = "Account code must contain exactly 5 numeric digits."; return false; }
            if (_accounts.Any(a => a.Code.Equals(code, StringComparison.OrdinalIgnoreCase))) { error = $"Account code '{code}' already exists."; return false; }

            account = Seed(code, request.Name, AccountType.Asset, parent.Id, request.ReconciliationEnabled, request.OpeningBalance, false);
            account.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency;
            if (!string.IsNullOrWhiteSpace(request.BankName)) account.CustomFields["BankName"] = request.BankName;
            account.UpdatedAt = DateTime.UtcNow;
            RecalculateHierarchy();
            Persist();
            return true;
        }
    }

    public bool UpdateCashBankAccount(Guid id, CashBankAccountRequest request, bool bankOnly, out Account? account, out string? error)
    {
        lock (_lock)
        {
            account = null; error = null;
            var a = Find(id);
            if (a == null) { error = "Account not found."; return false; }
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Account name is required."; return false; }

            var code = request.Code?.Trim();
            if (!string.IsNullOrWhiteSpace(code) && code != a.Code)
            {
                if (code.Length != 5 || !code.All(char.IsDigit)) { error = "Account code must contain exactly 5 numeric digits."; return false; }
                if (_accounts.Any(x => x.Id != id && x.Code.Equals(code, StringComparison.OrdinalIgnoreCase))) { error = $"Account code '{code}' already exists."; return false; }
                a.Code = code;
            }

            a.Name = request.Name.Trim();
            a.Currency = string.IsNullOrWhiteSpace(request.Currency) ? a.Currency : request.Currency;
            a.OpeningBalance = request.OpeningBalance;
            a.ReconciliationEnabled = request.ReconciliationEnabled;
            if (!string.IsNullOrWhiteSpace(request.BankName))
                a.CustomFields["BankName"] = request.BankName;
            a.UpdatedAt = DateTime.UtcNow;
            if (!_history.ContainsKey(id)) _history[id] = [];
            _history[id].Add(new(DateTime.UtcNow, "Updated", "Bank/Cash account details changed"));
            RecalculateHierarchy();
            Persist();
            account = a;
            return true;
        }
    }

    public bool CreateVendorPayment(VendorPaymentRequest request, out VendorPayment? payment, out string? error)
    {
        lock (_lock)
        {
            payment = null; error = null;
            if (request.Amount <= 0) { error = "Payment amount must be positive."; return false; }
            var vendor = _vendors.FirstOrDefault(v => v.Id == request.VendorId);
            if (vendor == null) { error = "Vendor not found."; return false; }

            VendorBill? bill = null;
            if (request.BillId.HasValue)
            {
                bill = _vendorBills.FirstOrDefault(b => b.Id == request.BillId.Value);
                if (bill == null) { error = "Vendor bill not found."; return false; }
                if (request.Amount > bill.AmountDue) { error = $"Payment amount ({request.Amount}) exceeds bill amount due ({bill.AmountDue})."; return false; }
            }

            // Resolve disbursement account (bank/cash the funds come FROM)
            var fromId = request.WithdrawFromAccountId ?? GetDefaultDepositAccount();
            var fromAcc = _accounts.FirstOrDefault(a => a.Id == fromId);
            if (fromAcc == null || !fromAcc.IsPosting || fromAcc.Status == AccountStatus.Inactive)
            {
                error = "Withdraw From account is not a valid active posting account. Select a Cash or Bank account.";
                return false;
            }

            // Resolve AP account through the central mapping
            var apAccountId = GetMappedAccount("Vendor Payables");
            var apAcc = _accounts.FirstOrDefault(a => a.Id == apAccountId);
            if (apAcc == null || !apAcc.IsPosting || apAcc.Status == AccountStatus.Inactive)
            {
                error = "Vendor Payables account is not mapped to a valid posting account. Configure it under System Account Mapping.";
                return false;
            }

            payment = new VendorPayment
            {
                PaymentNumber = NextVendorPaymentNumber(),
                VendorId = request.VendorId,
                BillId = request.BillId,
                PaymentDate = request.PaymentDate,
                Amount = request.Amount,
                PaymentMethod = request.PaymentMethod,
                BankAccountName = request.BankAccountName,
                WithdrawFromAccountId = fromId,
                Reference = request.Reference,
                Memo = request.Memo,
                CompanyId = request.CompanyId,
                Status = VendorPaymentStatus.Posted,
            };

            // Post the double-entry journal: Dr AP / Cr Bank-Cash
            var journal = new JournalEntry
            {
                Date = request.PaymentDate,
                Reference = payment.PaymentNumber,
                Description = $"Vendor payment to {vendor.Name} ({payment.PaymentNumber})",
                TransactionType = TransactionType.Payment,
                CompanyId = request.CompanyId,
                Lines =
                [
                    new JournalLine(apAccountId, payment.Amount, 0, $"AP: {payment.PaymentNumber}", null, null, 1, request.CompanyId),
                    new JournalLine(fromId, 0, payment.Amount, $"Payment: {payment.PaymentNumber}", null, null, 1, request.CompanyId)
                ],
                Status = JournalStatus.Posted
            };
            _entries.Add(journal);
            payment.JournalEntryId = journal.Id;

            _vendorPayments.Add(payment);
            // If paid against a bill, update bill AmountPaid
            if (bill != null)
            {
                bill.AmountPaid += request.Amount;
                if (bill.AmountDue <= 0) bill.Status = VendorBillStatus.Paid;
                else bill.Status = VendorBillStatus.PartiallyPaid;
            }
            Persist();
            return true;
        }
    }

    public bool CreateFundTransfer(FundTransferRequest request, out FundTransfer? transfer, out string? error)
    {
        lock (_lock)
        {
            transfer = null; error = null;
            if (request.Amount <= 0) { error = "Transfer amount must be positive."; return false; }
            if (request.FromAccountId == request.ToAccountId) { error = "Source and target accounts must be different."; return false; }

            var fromAcc = _accounts.FirstOrDefault(a => a.Id == request.FromAccountId);
            var toAcc = _accounts.FirstOrDefault(a => a.Id == request.ToAccountId);
            if (fromAcc == null || !fromAcc.IsPosting || fromAcc.Status == AccountStatus.Inactive)
            { error = "Source account is not a valid active posting account."; return false; }
            if (toAcc == null || !toAcc.IsPosting || toAcc.Status == AccountStatus.Inactive)
            { error = "Target account is not a valid active posting account."; return false; }

            transfer = new FundTransfer
            {
                TransferNumber = NextFundTransferNumber(),
                FromAccountId = request.FromAccountId,
                ToAccountId = request.ToAccountId,
                Amount = request.Amount,
                TransferDate = request.TransferDate,
                Reference = request.Reference,
                Memo = request.Memo,
                CompanyId = request.CompanyId,
                Status = FundTransferStatus.Posted,
            };

            // Post the double-entry journal: Dr Target / Cr Source
            var journal = new JournalEntry
            {
                Date = request.TransferDate,
                Reference = transfer.TransferNumber,
                Description = $"Fund transfer {fromAcc.Name} → {toAcc.Name}",
                TransactionType = TransactionType.Transfer,
                CompanyId = request.CompanyId,
                Lines =
                [
                    new JournalLine(request.ToAccountId, transfer.Amount, 0, $"Transfer in: {transfer.TransferNumber}", null, null, 1, request.CompanyId),
                    new JournalLine(request.FromAccountId, 0, transfer.Amount, $"Transfer out: {transfer.TransferNumber}", null, null, 1, request.CompanyId)
                ],
                Status = JournalStatus.Posted
            };
            _entries.Add(journal);
            transfer.JournalEntryId = journal.Id;

            _fundTransfers.Add(transfer);
            Persist();
            return true;
        }
    }

    public string NextVoucherNumber(VoucherType type)
    {
        var prefix = type switch
        {
            VoucherType.BPV => "BPV",
            VoucherType.BRV => "BRV",
            VoucherType.CPV => "CPV",
            VoucherType.CRV => "CRV",
            _ => "JV"
        };
        var numbers = _vouchers
            .Where(v => v.Type == type)
            .Select(v => v.VoucherNumber)
            .Where(n => n.StartsWith(prefix + "-") && int.TryParse(n[(prefix.Length + 1)..], out _))
            .Select(n => int.Parse(n[(prefix.Length + 1)..]))
            .DefaultIfEmpty(0);
        return $"{prefix}-{DateTime.Now.Year}-{numbers.Max() + 1:D4}";
    }

    public bool CreateVoucher(VoucherRequest request, out Voucher? voucher, out string? error)
    {
        lock (_lock)
        {
            voucher = null; error = null;
            if (request.Amount <= 0) { error = "Voucher amount must be positive."; return false; }

            // Resolve the cash/bank/GL account. Fall back to the default deposit account when the
            // supplied name doesn't map to a real COA account.
            var accountId = Guid.Empty;
            if (!string.IsNullOrWhiteSpace(request.AccountName))
            {
                var name = request.AccountName.Trim();
                var code = name.Split('—')[0].Trim();
                var matched = _accounts.FirstOrDefault(a => a.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                              ?? (int.TryParse(code, out _) ? _accounts.FirstOrDefault(a => a.Code == code) : null);
                accountId = matched?.Id ?? Guid.Empty;
            }
            if (accountId == Guid.Empty) accountId = GetDefaultDepositAccount();
            var account = _accounts.FirstOrDefault(a => a.Id == accountId);
            if (account == null || !account.IsPosting || account.Status == AccountStatus.Inactive)
            { error = "Cash/Bank account is not a valid active posting account. Create one under Bank Accounts first."; return false; }

            var type = request.Type;
            var voucherNumber = NextVoucherNumber(type);
            var isReceipt = type is VoucherType.BRV or VoucherType.CRV;

            voucher = new Voucher
            {
                VoucherNumber = voucherNumber,
                Type = type,
                Date = request.Date,
                AccountName = account.Name,
                AccountId = account.Id,
                PartyType = request.PartyType ?? "General Ledger",
                PartyName = request.PartyName ?? "",
                PaymentMode = request.PaymentMode ?? "",
                ChequeNumber = request.ChequeNumber,
                Amount = request.Amount,
                Currency = request.Currency ?? "USD",
                Narration = request.Narration ?? "",
                CompanyId = request.CompanyId,
                Status = "Posted",
            };

            // Determine offset account for the second journal leg
            var offsetId = isReceipt ? GetMappedAccount("Customer Receivables") : GetMappedAccount("Purchases");
            if (offsetId == accountId)
            {
                var alt = _accounts.FirstOrDefault(a => a.IsPosting && a.Status == AccountStatus.Active && a.Id != accountId);
                offsetId = alt?.Id ?? Guid.Empty;
            }

            // Post double-entry journal: receipts Dr cash/bank / Cr AR; payments Dr expense / Cr cash/bank
            var journal = new JournalEntry
            {
                Date = request.Date,
                Reference = voucherNumber,
                Description = $"{type} {voucherNumber} — {voucher.PartyName} ({account.Name})",
                TransactionType = type == VoucherType.JV ? TransactionType.Adjustment
                    : isReceipt ? TransactionType.Receipt : TransactionType.Payment,
                CompanyId = request.CompanyId,
                Lines = isReceipt
                    ? [new JournalLine(accountId, voucher.Amount, 0, $"{type} receipt: {voucherNumber}", null, null, 1, request.CompanyId),
                       new JournalLine(offsetId, 0, voucher.Amount, $"{type} offset: {voucherNumber}", null, null, 1, request.CompanyId)]
                    : [new JournalLine(offsetId, voucher.Amount, 0, $"{type} expense: {voucherNumber}", null, null, 1, request.CompanyId),
                       new JournalLine(accountId, 0, voucher.Amount, $"{type} disbursement: {voucherNumber}", null, null, 1, request.CompanyId)],
                Status = JournalStatus.Posted
            };
            _entries.Add(journal);
            voucher.JournalEntryId = journal.Id;

            _vouchers.Add(voucher);
            Persist();
            return true;
        }
    }

    public List<object> GetBankTransactions(Guid? bankAccountId, Guid? companyId)
    {
        lock (_lock)
        {
            var cashParent = _accounts.FirstOrDefault(a => a.Code == "11100");
            var bankParent = _accounts.FirstOrDefault(a => a.Code == "11200");
            var cashParentId = cashParent?.Id;
            var bankParentId = bankParent?.Id;

            var result = new List<object>();
            var entries = _entries
                .Where(e => e.Status == JournalStatus.Posted)
                .Where(e => companyId == null || e.CompanyId == companyId)
                .OrderBy(e => e.Date);

            foreach (var entry in entries)
            {
                foreach (var line in entry.Lines)
                {
                    var account = _accounts.FirstOrDefault(a => a.Id == line.AccountId);
                    if (account == null) continue;
                    var isCashBank = account.ParentId == cashParentId || account.ParentId == bankParentId
                        || account.Name.Contains("Cash", StringComparison.OrdinalIgnoreCase)
                        || account.Name.Contains("Bank", StringComparison.OrdinalIgnoreCase);
                    if (!isCashBank) continue;
                    if (bankAccountId != null && account.Id != bankAccountId) continue;

                    // Parse payee/recipient from description "TYPE NUM — Party (Account)"
                    var payee = entry.Description;
                    var dashIdx = entry.Description.IndexOf("—", StringComparison.Ordinal);
                    if (dashIdx >= 0) payee = entry.Description[(dashIdx + 1)..].Trim();

                    var displayType = entry.TransactionType switch
                    {
                        TransactionType.Payment => "Payment",
                        TransactionType.Receipt => "Receipt",
                        TransactionType.Transfer => "Inter-Account Transfer",
                        TransactionType.Sales => "Customer Receipt",
                        TransactionType.Purchase => "Vendor Payment",
                        TransactionType.Adjustment => "Journal Adjustment",
                        TransactionType.Depreciation => "Depreciation",
                        TransactionType.Payroll => "Payroll",
                        _ => entry.TransactionType.ToString()
                    };
                    var mode = line.Debit > 0 ? "Cash In" : "Cash Out";

                    result.Add(new
                    {
                        Id = $"{entry.Id}:{line.AccountId}:{line.Debit}-{line.Credit}",
                        BankAccountId = account.Id,
                        Bank = account.Name,
                        Date = entry.Date.ToString("yyyy-MM-dd"),
                        Ref = entry.Reference,
                        Description = entry.Description,
                        Payee = payee,
                        Mode = mode,
                        Type = displayType,
                        Amount = line.Debit - line.Credit,
                        Curr = account.Currency ?? entry.CurrencyCode,
                        Status = entry.Status.ToString(),
                        Reconciled = false,
                        JournalEntryId = entry.Id
                    });
                }
            }

            return result;
        }
    }

    public List<object> GetBankConnections(Guid? companyId)
    {
        lock (_lock)
        {
            var bankParent = _accounts.FirstOrDefault(a => a.Code == "11200");
            if (bankParent == null) return [];
            return _accounts
                .Where(a => a.ParentId == bankParent.Id && a.Status == AccountStatus.Active)
                .OrderBy(a => a.Code)
                .Select(a => new
                {
                    a.Id,
                    a.Code,
                    a.Name,
                    Provider = a.CustomFields.TryGetValue("BankName", out var bankName) ? bankName : a.Name,
                    AccountNumber = a.Code,
                    Status = a.ReconciliationEnabled ? "Connected" : "Manual Import",
                    FeedType = a.ReconciliationEnabled ? "Open Banking Feed" : "Manual Statement Upload",
                    a.Currency,
                    a.UpdatedAt,
                    CompanyId = companyId
                })
                .Cast<object>()
                .ToList();
        }
    }

    public bool SyncBankConnection(Guid accountId, out Account? account, out string? error)
    {
        lock (_lock)
        {
            account = _accounts.FirstOrDefault(a => a.Id == accountId);
            error = null;
            if (account == null) { error = "Bank account not found."; return false; }
            account.ReconciliationEnabled = true;
            account.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool CreateBankImport(BankStatementImportRequest request, out BankStatementImport? import, out string? error)
    {
        lock (_lock)
        {
            import = null; error = null;
            if (request.TransactionCount < 0) { error = "Transaction count cannot be negative."; return false; }
            if (request.BankAccountId.HasValue && !_accounts.Any(a => a.Id == request.BankAccountId.Value))
            { error = "Bank account not found."; return false; }
            import = new BankStatementImport
            {
                BankAccountId = request.BankAccountId,
                FileName = request.FileName?.Trim() ?? "Manual statement import",
                Format = request.Format?.Trim() ?? "CSV",
                TransactionCount = request.TransactionCount,
                TotalAmount = request.TotalAmount,
                CompanyId = request.CompanyId,
                Status = "Imported"
            };
            _bankImports.Add(import);
            Persist();
            return true;
        }
    }

    public string NextExpenseClaimNumber()
    {
        var numbers = _expenseClaims
            .Select(c => c.ClaimNumber)
            .Where(n => n.StartsWith("EC-") && int.TryParse(n[3..], out _))
            .Select(n => int.Parse(n[3..]))
            .DefaultIfEmpty(0);
        return $"EC-{numbers.Max() + 1:D4}";
    }

    public bool CreateExpenseClaim(ExpenseClaimRequest request, out ExpenseClaim? claim, out string? error)
    {
        lock (_lock)
        {
            claim = null; error = null;
            if (request.Lines.Count == 0) { error = "At least one expense line is required."; return false; }
            if (request.Lines.Any(l => l.Amount <= 0)) { error = "Expense line amounts must be positive."; return false; }

            var fallbackExpenseAccountId = GetMappedAccount("Purchases");
            claim = new ExpenseClaim
            {
                ClaimNumber = NextExpenseClaimNumber(),
                EmployeeName = request.EmployeeName?.Trim() ?? "Employee",
                Department = request.Department?.Trim() ?? "General",
                Date = request.Date,
                Status = ExpenseClaimStatus.Submitted,
                Currency = request.Currency ?? "USD",
                Notes = request.Notes,
                CompanyId = request.CompanyId,
                Lines = request.Lines.Select(l =>
                {
                    var accountId = l.AccountId.HasValue && _accounts.Any(a => a.Id == l.AccountId.Value && a.IsPosting && a.Status == AccountStatus.Active)
                        ? l.AccountId.Value
                        : fallbackExpenseAccountId;
                    return new ExpenseClaimLine
                    {
                        AccountId = accountId,
                        Category = l.Category?.Trim() ?? "General Expense",
                        Description = l.Description?.Trim() ?? "Expense claim line",
                        Amount = l.Amount,
                        Currency = l.Currency ?? request.Currency ?? "USD"
                    };
                }).ToList()
            };

            _expenseClaims.Add(claim);
            Persist();
            return true;
        }
    }

    public bool SetExpenseClaimStatus(Guid id, ExpenseClaimStatus status, out ExpenseClaim? claim, out string? error)
    {
        lock (_lock)
        {
            claim = _expenseClaims.FirstOrDefault(c => c.Id == id); error = null;
            if (claim == null) { error = "Expense claim not found."; return false; }
            var selectedClaim = claim;
            if (status == ExpenseClaimStatus.Paid && selectedClaim.JournalEntryId == null)
            {
                var cashAccountId = GetDefaultDepositAccount();
                var lines = selectedClaim.Lines
                    .Select(l => new JournalLine(l.AccountId ?? GetMappedAccount("Purchases"), l.Amount, 0, $"Expense claim {selectedClaim.ClaimNumber}: {l.Category}", null, l.Currency, 1, selectedClaim.CompanyId))
                    .ToList();
                lines.Add(new JournalLine(cashAccountId, 0, selectedClaim.TotalAmount, $"Expense claim reimbursement: {selectedClaim.ClaimNumber}", null, selectedClaim.Currency, 1, selectedClaim.CompanyId));

                var journal = new JournalEntry
                {
                    Date = selectedClaim.Date,
                    Reference = selectedClaim.ClaimNumber,
                    Description = $"Expense claim {selectedClaim.ClaimNumber} — {selectedClaim.EmployeeName}",
                    TransactionType = TransactionType.Payment,
                    CurrencyCode = selectedClaim.Currency,
                    CompanyId = selectedClaim.CompanyId,
                    Lines = lines,
                    Status = JournalStatus.Posted
                };
                _entries.Add(journal);
                selectedClaim.JournalEntryId = journal.Id;
            }
            else if (status != ExpenseClaimStatus.Paid && selectedClaim.Status == ExpenseClaimStatus.Paid && selectedClaim.JournalEntryId != null)
            {
                // Reversal of reimbursement journal
                ExecuteJournalReversal(selectedClaim.ClaimNumber, "REV", $"Reversal of cancelled expense claim reimbursement {selectedClaim.ClaimNumber}", selectedClaim.CompanyId);
                selectedClaim.JournalEntryId = null;
            }

            claim.Status = status;
            claim.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool CreateBankReconciliation(BankReconciliationRequest request, out BankReconciliation? reconciliation, out string? error)
    {
        lock (_lock)
        {
            reconciliation = null; error = null;
            var account = _accounts.FirstOrDefault(a => a.Id == request.BankAccountId);
            if (account == null) { error = "Bank account not found."; return false; }

            // Compute GL balance from posted journal lines touching this account
            var glBalance = _entries
                .Where(e => e.Status == JournalStatus.Posted)
                .SelectMany(e => e.Lines)
                .Where(l => l.AccountId == request.BankAccountId)
                .Sum(l => l.Debit - l.Credit) + account.OpeningBalance;

            reconciliation = new BankReconciliation
            {
                BankAccountId = request.BankAccountId,
                StatementDate = request.StatementDate,
                StatementBalance = request.StatementBalance,
                GlBalance = glBalance,
                Memo = request.Memo,
                CompanyId = request.CompanyId,
                Status = Math.Abs(glBalance - request.StatementBalance) < 0.01m
                    ? ReconciliationStatus.Balanced
                    : ReconciliationStatus.Difference
            };
            _reconciliations.Add(reconciliation);
            Persist();
            return true;
        }
    }

    public bool CreateBudget(BudgetRequest request, out Budget? budget, out string? error)
    {
        lock (_lock)
        {
            budget = null; error = null;
            if (string.IsNullOrWhiteSpace(request.BudgetName)) { error = "Budget name is required."; return false; }
            if (request.Amount <= 0) { error = "Budget amount must be positive."; return false; }
            var account = _accounts.FirstOrDefault(a => a.Id == request.AccountId);
            if (account == null) { error = "Budget account not found."; return false; }

            budget = new Budget
            {
                BudgetName = request.BudgetName,
                AccountId = request.AccountId,
                Amount = request.Amount,
                FiscalYear = request.FiscalYear,
                PeriodType = request.PeriodType,
                Status = request.Status,
                CompanyId = request.CompanyId
            };
            _budgets.Add(budget);
            AddAudit("budget.create", budget.Id, $"Created budget '{budget.BudgetName}' for {budget.FiscalYear}", request.CompanyId);
            Persist();
            return true;
        }
    }

    public bool UpdateBudget(Guid id, BudgetRequest request, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var budget = _budgets.FirstOrDefault(b => b.Id == id);
            if (budget == null) { error = "Budget not found."; return false; }
            if (budget.Status == BudgetStatus.Locked) { error = "Locked budgets cannot be edited."; return false; }
            budget.BudgetName = request.BudgetName;
            budget.AccountId = request.AccountId;
            budget.Amount = request.Amount;
            budget.FiscalYear = request.FiscalYear;
            budget.PeriodType = request.PeriodType;
            budget.Status = request.Status;
            budget.UpdatedAt = DateTime.UtcNow;
            AddAudit("budget.update", id, $"Updated budget '{budget.BudgetName}'", budget.CompanyId);
            Persist();
            return true;
        }
    }

    public bool DeleteBudget(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var budget = _budgets.FirstOrDefault(b => b.Id == id);
            if (budget == null) { error = "Budget not found."; return false; }
            _budgets.Remove(budget);
            AddAudit("budget.delete", id, $"Deleted budget '{budget.BudgetName}'", budget.CompanyId);
            Persist();
            return true;
        }
    }

    public bool CreatePeriodClose(PeriodCloseRequest request, out PeriodClose? period, out string? error)
    {
        lock (_lock)
        {
            period = null; error = null;
            if (string.IsNullOrWhiteSpace(request.PeriodName)) { error = "Period name is required."; return false; }

            period = new PeriodClose
            {
                PeriodName = request.PeriodName,
                PeriodEndDate = request.PeriodEndDate,
                Note = request.Note,
                CompanyId = request.CompanyId,
                Status = PeriodCloseStatus.Open
            };
            _periodCloses.Add(period);
            AddAudit("period.close", period.Id, $"Opened period '{period.PeriodName}'", request.CompanyId);
            Persist();
            return true;
        }
    }

    public bool ClosePeriod(Guid id, string? by, string? note, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var period = _periodCloses.FirstOrDefault(p => p.Id == id);
            if (period == null) { error = "Period not found."; return false; }
            if (period.Status == PeriodCloseStatus.Closed) { error = "Period is already closed."; return false; }
            period.Status = PeriodCloseStatus.Closed;
            period.ClosedAt = DateTime.UtcNow;
            period.ClosedBy = by;
            period.Note = note;
            AddAudit("period.close", id, $"Closed period '{period.PeriodName}'{(string.IsNullOrWhiteSpace(by) ? "" : $" by {by}")}", period.CompanyId);
            Persist();
            return true;
        }
    }

    public bool ReopenPeriod(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var period = _periodCloses.FirstOrDefault(p => p.Id == id);
            if (period == null) { error = "Period not found."; return false; }
            period.Status = PeriodCloseStatus.Reopened;
            period.ClosedAt = null;
            AddAudit("period.reopen", id, $"Reopened period '{period.PeriodName}'", period.CompanyId);
            Persist();
            return true;
        }
    }

    /// <summary>Global audit trail: account history, journal lifecycle events, and module actions.</summary>
    public List<object> GetAuditTrail(Guid? companyId, int limit = 200)
    {
        lock (_lock)
        {
            var trail = new List<object>();

            foreach (var (accountId, items) in _history)
            {
                var account = _accounts.FirstOrDefault(a => a.Id == accountId);
                if (account == null) continue;
                foreach (var item in items)
                {
                    trail.Add(new { item.At, item.Action, item.Detail, Entity = "Account", EntityName = $"{account.Code} — {account.Name}", EntityId = accountId, CompanyId = account.ParentId });
                }
            }

            foreach (var entry in _entries)
            {
                if (companyId.HasValue && entry.CompanyId != companyId) continue;
                foreach (var ev in _journalEvents.Where(x => x.JournalEntryId == entry.Id))
                {
                    trail.Add(new { ev.OccurredAt, Action = ev.EventType, Detail = ev.Detail, Entity = "JournalEntry", EntityName = $"{entry.Reference} — {entry.Description}", EntityId = entry.Id, CompanyId = entry.CompanyId });
                }
            }

            foreach (var item in _auditLog)
            {
                trail.Add(new { item.At, item.Action, item.Detail, Entity = "System", EntityName = "ERP-wide action", EntityId = (Guid?)null, CompanyId = (Guid?)null });
            }

            return trail.OrderByDescending(x => (DateTime)((dynamic)x).At).Take(limit).ToList();
        }
    }

    private void AddAudit(string action, Guid entityId, string detail, Guid? companyId = null)
    {
        _auditLog.Add(new AuditItem(DateTime.UtcNow, action, detail));
    }

    public string NextBomNumber()
    {
        var numbers = _boms.Select(b => b.BomNumber).Where(n => n.StartsWith("BOM-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"BOM-{(numbers.Max() + 1):D5}";
    }

    public string NextWorkOrderNumber()
    {
        var numbers = _workOrders.Select(w => w.WorkOrderNumber).Where(n => n.StartsWith("WO-") && int.TryParse(n[3..], out _)).Select(n => int.Parse(n[3..])).DefaultIfEmpty(0);
        return $"WO-{(numbers.Max() + 1):D5}";
    }

    public BillOfMaterials CreateBom(BillOfMaterials bom)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(bom.BomNumber)) bom.BomNumber = NextBomNumber();
            _boms.Add(bom);
            Persist();
            return bom;
        }
    }

    public bool UpdateBom(string id, BillOfMaterials updated, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var bom = _boms.FirstOrDefault(b => b.Id == id);
            if (bom == null) { error = "BOM not found."; return false; }

            bom.FinishedProductId = updated.FinishedProductId;
            bom.FinishedProductName = updated.FinishedProductName;
            bom.Version = string.IsNullOrWhiteSpace(updated.Version) ? bom.Version : updated.Version;
            bom.Status = updated.Status;
            bom.Category = updated.Category;
            bom.QuantityProduced = updated.QuantityProduced;
            bom.BatchSize = updated.BatchSize;
            bom.YieldPercentage = updated.YieldPercentage;
            bom.EstimatedLaborHours = updated.EstimatedLaborHours;
            bom.EstimatedMachineHours = updated.EstimatedMachineHours;
            bom.StandardLaborRate = updated.StandardLaborRate;
            bom.StandardMachineRate = updated.StandardMachineRate;
            bom.ExpectedUnitCost = updated.ExpectedUnitCost;
            bom.Notes = updated.Notes;
            bom.Lines = updated.Lines ?? new();
            bom.Operations = updated.Operations ?? new();
            bom.UpdatedAt = DateTime.UtcNow;

            Persist();
            return true;
        }
    }

    public bool DeleteBom(string id, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var bom = _boms.FirstOrDefault(b => b.Id == id);
            if (bom == null) { error = "BOM not found."; return false; }
            if (_workOrders.Any(w => w.BomId == id && w.Status == WorkOrderStatus.InProgress))
            {
                error = "Cannot delete BOM while associated Work Orders are In Progress.";
                return false;
            }

            _boms.Remove(bom);
            Persist();
            return true;
        }
    }

    public WorkOrder CreateWorkOrder(WorkOrder order)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(order.WorkOrderNumber)) order.WorkOrderNumber = NextWorkOrderNumber();
            if (string.IsNullOrWhiteSpace(order.BatchNumber))
            {
                order.BatchNumber = $"LOT-{DateTime.UtcNow:yyyyMMdd}-{order.WorkOrderNumber.Replace("WO-", "")}";
            }

            // Calculate standard target costs
            var bom = _boms.FirstOrDefault(b => b.Id == order.BomId);
            if (bom != null)
            {
                var factor = bom.QuantityProduced > 0 ? (order.QuantityToProduce / bom.QuantityProduced) : 1;
                order.StandardMaterialCost = bom.Lines.Sum(l => l.QuantityRequired * factor * (l.StandardUnitCost > 0 ? l.StandardUnitCost : 10m));
                order.StandardLaborCost = bom.EstimatedLaborHours * factor * (bom.StandardLaborRate > 0 ? bom.StandardLaborRate : order.LaborHourlyRate);
                order.StandardOverheadCost = bom.EstimatedMachineHours * factor * (bom.StandardMachineRate > 0 ? bom.StandardMachineRate : order.MachineHourlyRate);
                order.StandardTotalCost = order.StandardMaterialCost + order.StandardLaborCost + order.StandardOverheadCost;
            }

            _workOrders.Add(order);
            Persist();
            return order;
        }
    }

    public bool CancelWorkOrder(string id, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var wo = _workOrders.FirstOrDefault(x => x.Id == id);
            if (wo == null) { error = "Work Order not found."; return false; }
            if (wo.Status == WorkOrderStatus.Completed) { error = "Cannot cancel a completed Work Order."; return false; }

            // If machine was engaged, reset health
            if (wo.MachineAssetId.HasValue)
            {
                var machine = _fixedAssets.FirstOrDefault(a => a.Id == wo.MachineAssetId.Value);
                if (machine != null && machine.MachineHealth == MachineStatus.InProduction)
                {
                    machine.MachineHealth = MachineStatus.Operating;
                    machine.UpdatedAt = DateTime.UtcNow;
                }
            }

            wo.Status = WorkOrderStatus.Cancelled;
            wo.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool StartWorkOrder(string id, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var wo = _workOrders.FirstOrDefault(x => x.Id == id);
            if (wo is null) { error = "Work Order not found."; return false; }
            if (wo.Status != WorkOrderStatus.Draft && wo.Status != WorkOrderStatus.Released) { error = "Work Order is already in progress or completed."; return false; }

            // Deduct Raw Materials from Warehouse (Stock Out)
            decimal totalMatCost = 0;
            foreach (var line in wo.Lines)
            {
                Guid.TryParse(line.RawMaterialProductId, out var prodId);
                Guid.TryParse(wo.RawMaterialWarehouseId, out var whId);
                Guid.TryParse(wo.CompanyId, out var compId);

                var product = _products.FirstOrDefault(p => p.Id == prodId);
                var level = _stockLevels.FirstOrDefault(sl => sl.ProductId == prodId && sl.WarehouseId == whId);
                var unitCost = level != null && level.MovingAverageCost > 0 ? level.MovingAverageCost : (product?.CostPrice ?? 10m);
                var reqQty = line.QuantityRequired * wo.QuantityToProduce;
                line.QuantityIssued = reqQty;
                line.UnitCost = unitCost;
                line.TotalCost = reqQty * unitCost;
                totalMatCost += line.TotalCost;

                // Record Stock Outbound
                var txn = new StockTransaction
                {
                    Date = DateOnly.FromDateTime(DateTime.Today),
                    Type = StockTransactionType.Out,
                    ProductId = prodId,
                    WarehouseId = whId,
                    Quantity = reqQty,
                    UnitCost = unitCost,
                    Reference = $"WO Issue: {wo.WorkOrderNumber}",
                    CompanyId = compId != Guid.Empty ? compId : null
                };
                _stockTransactions.Add(txn);

                // Update Stock Level
                if (level is not null)
                {
                    level.QuantityOnHand = Math.Max(0, level.QuantityOnHand - reqQty);
                }
                if (product is not null)
                {
                    product.QuantityOnHand = _stockLevels.Where(sl => sl.ProductId == prodId).Sum(sl => sl.QuantityOnHand);
                }
            }

            wo.TotalMaterialCost = totalMatCost;
            wo.Status = WorkOrderStatus.InProgress;

            // Link Machine Status to InProduction in Fixed Assets
            if (wo.MachineAssetId.HasValue)
            {
                var machine = _fixedAssets.FirstOrDefault(a => a.Id == wo.MachineAssetId.Value);
                if (machine is not null)
                {
                    machine.MachineHealth = MachineStatus.InProduction;
                    machine.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Post WIP journal: Dr Work in Progress / Cr Raw Materials Inventory
            if (totalMatCost > 0)
            {
                var wipAccId = GetMappedAccount("Work in Progress");
                var rawMatAccId = GetMappedAccount("Raw Materials Inventory");
                Guid.TryParse(wo.CompanyId, out var woCompId);
                if (wipAccId != Guid.Empty && rawMatAccId != Guid.Empty)
                {
                    _entries.Add(new JournalEntry
                    {
                        Date = DateOnly.FromDateTime(DateTime.Today),
                        Reference = $"WO-START-{wo.WorkOrderNumber}",
                        Description = $"Raw materials issued to production for {wo.WorkOrderNumber}",
                        TransactionType = TransactionType.Inventory,
                        CompanyId = woCompId != Guid.Empty ? woCompId : null,
                        Lines =
                        [
                            new JournalLine(wipAccId, totalMatCost, 0, $"Materials issued: {wo.WorkOrderNumber}", null, null, 1, woCompId != Guid.Empty ? woCompId : null),
                            new JournalLine(rawMatAccId, 0, totalMatCost, $"Materials issued: {wo.WorkOrderNumber}", null, null, 1, woCompId != Guid.Empty ? woCompId : null)
                        ],
                        Status = JournalStatus.Posted
                    });
                }
            }

            Persist();
            return true;
        }
    }

    public bool LogMachineHours(string workOrderId, decimal additionalHours, decimal? hourlyRate, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var wo = _workOrders.FirstOrDefault(x => x.Id == workOrderId);
            if (wo is null) { error = "Work Order not found."; return false; }

            wo.MachineRunHours += additionalHours;
            if (hourlyRate.HasValue && hourlyRate.Value > 0)
            {
                wo.MachineHourlyRate = hourlyRate.Value;
            }
            wo.OverheadCost = Math.Round(wo.MachineRunHours * wo.MachineHourlyRate, 2);
            wo.TotalCost = wo.TotalMaterialCost + wo.DirectLaborCost + wo.OverheadCost;
            wo.UpdatedAt = DateTime.UtcNow;

            // Increment Fixed Asset Runtime Meter Hours
            if (wo.MachineAssetId.HasValue)
            {
                var machine = _fixedAssets.FirstOrDefault(a => a.Id == wo.MachineAssetId.Value);
                if (machine is not null)
                {
                    machine.CurrentMeterHours += additionalHours;
                    machine.UpdatedAt = DateTime.UtcNow;
                }
            }

            Persist();
            return true;
        }
    }

    public bool PerformQcInspection(string workOrderId, QcInspectionRecord qc, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var wo = _workOrders.FirstOrDefault(x => x.Id == workOrderId);
            if (wo is null) { error = "Work Order not found."; return false; }

            qc.Id = Guid.NewGuid().ToString();
            qc.WorkOrderId = workOrderId;
            qc.InspectionDate = DateTime.UtcNow;
            wo.QcHistory.Add(qc);

            wo.QcStatus = qc.Status;
            wo.AcceptedQuantity = qc.QuantityPassed;
            wo.ScrapQuantity = qc.QuantityRejected;
            wo.ScrapReason = qc.DefectReason;
            wo.InspectorName = qc.InspectorName;
            wo.InspectionNotes = qc.Notes;
            wo.InspectedAt = DateTime.UtcNow;
            wo.UpdatedAt = DateTime.UtcNow;

            Persist();
            return true;
        }
    }

    public bool CompleteWorkOrder(string id, decimal actualProducedQty, decimal directLabor, decimal overhead, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var wo = _workOrders.FirstOrDefault(x => x.Id == id);
            if (wo is null) { error = "Work Order not found."; return false; }
            if (wo.Status != WorkOrderStatus.InProgress && wo.Status != WorkOrderStatus.Released) { error = "Work Order must be in progress to complete."; return false; }

            var produceQty = actualProducedQty > 0 ? actualProducedQty : (wo.AcceptedQuantity > 0 ? wo.AcceptedQuantity : wo.QuantityToProduce);
            if (directLabor > 0) wo.DirectLaborCost = directLabor;
            if (overhead > 0) wo.OverheadCost = overhead;

            wo.TotalCost = wo.TotalMaterialCost + wo.DirectLaborCost + wo.OverheadCost;
            wo.UnitCost = produceQty > 0 ? Math.Round(wo.TotalCost / produceQty, 2) : 0;
            wo.CostVariance = wo.TotalCost - wo.StandardTotalCost;
            wo.QuantityProduced = produceQty;

            Guid.TryParse(wo.FinishedProductId, out var finishedProdId);
            Guid.TryParse(wo.FinishedGoodsWarehouseId, out var finishedWhId);
            Guid.TryParse(wo.CompanyId, out var compId);

            // Add Finished Goods into Warehouse (Stock In)
            var txn = new StockTransaction
            {
                Date = DateOnly.FromDateTime(DateTime.Today),
                Type = StockTransactionType.In,
                ProductId = finishedProdId,
                WarehouseId = finishedWhId,
                Quantity = produceQty,
                UnitCost = wo.UnitCost,
                Reference = $"WO Completion: {wo.WorkOrderNumber}",
                CompanyId = compId != Guid.Empty ? compId : null
            };
            _stockTransactions.Add(txn);

            // Update Stock Level for Finished Goods
            var level = _stockLevels.FirstOrDefault(sl => sl.ProductId == finishedProdId && sl.WarehouseId == finishedWhId);
            if (level is null)
            {
                level = new StockLevel
                {
                    ProductId = finishedProdId,
                    WarehouseId = finishedWhId,
                    QuantityOnHand = produceQty,
                    MovingAverageCost = wo.UnitCost,
                    CompanyId = compId != Guid.Empty ? compId : null
                };
                _stockLevels.Add(level);
            }
            else
            {
                var totalVal = (level.QuantityOnHand * level.MovingAverageCost) + wo.TotalCost;
                level.QuantityOnHand += produceQty;
                level.MovingAverageCost = level.QuantityOnHand > 0 ? Math.Round(totalVal / level.QuantityOnHand, 2) : wo.UnitCost;
            }

            // Update Finished Product Cost Price and Stock
            var finishedProduct = _products.FirstOrDefault(p => p.Id == finishedProdId);
            if (finishedProduct is not null)
            {
                finishedProduct.CostPrice = wo.UnitCost;
                finishedProduct.QuantityOnHand = _stockLevels.Where(sl => sl.ProductId == finishedProdId).Sum(sl => sl.QuantityOnHand);
            }

            // Reset Machine Status to Operating in Fixed Assets
            if (wo.MachineAssetId.HasValue)
            {
                var machine = _fixedAssets.FirstOrDefault(a => a.Id == wo.MachineAssetId.Value);
                if (machine is not null)
                {
                    machine.MachineHealth = MachineStatus.Operating;
                    machine.UpdatedAt = DateTime.UtcNow;
                }
            }

            wo.Status = WorkOrderStatus.Completed;
            wo.CompletionDate = DateTime.UtcNow.ToString("yyyy-MM-dd");

            // Post Finished Goods journal: Dr Finished Goods / Cr WIP + Direct Labor + Manufacturing Overhead
            if (wo.TotalCost > 0)
            {
                var fgAccId = GetMappedAccount("Finished Goods Inventory") != Guid.Empty ? GetMappedAccount("Finished Goods Inventory") : _accounts.FirstOrDefault(a => a.Code == "13000" || a.Code == "1300")?.Id ?? Guid.Empty;
                var wipAccId = GetMappedAccount("Work in Progress") != Guid.Empty ? GetMappedAccount("Work in Progress") : _accounts.FirstOrDefault(a => a.Code == "13100" || a.Code == "1310")?.Id ?? Guid.Empty;
                var laborAccId = GetMappedAccount("Direct Labor") != Guid.Empty ? GetMappedAccount("Direct Labor") : _accounts.FirstOrDefault(a => a.Code == "61200" || a.Code == "50000")?.Id ?? Guid.Empty;
                var overheadAccId = GetMappedAccount("Manufacturing Overhead") != Guid.Empty ? GetMappedAccount("Manufacturing Overhead") : _accounts.FirstOrDefault(a => a.Code == "50000" || a.Code == "61250")?.Id ?? Guid.Empty;
                Guid.TryParse(wo.CompanyId, out var woCompId);
                var fgLines = new List<JournalLine>();
                if (fgAccId != Guid.Empty)
                    fgLines.Add(new JournalLine(fgAccId, wo.TotalCost, 0, $"Completed production: {wo.WorkOrderNumber}", null, null, 1, woCompId != Guid.Empty ? woCompId : null));
                if (wipAccId != Guid.Empty && wo.TotalMaterialCost > 0)
                    fgLines.Add(new JournalLine(wipAccId, 0, wo.TotalMaterialCost, $"WIP transfer: {wo.WorkOrderNumber}", null, null, 1, woCompId != Guid.Empty ? woCompId : null));
                if (laborAccId != Guid.Empty && wo.DirectLaborCost > 0)
                    fgLines.Add(new JournalLine(laborAccId, 0, wo.DirectLaborCost, $"Direct labor absorption: {wo.WorkOrderNumber}", null, null, 1, woCompId != Guid.Empty ? woCompId : null));
                if (overheadAccId != Guid.Empty && wo.OverheadCost > 0)
                    fgLines.Add(new JournalLine(overheadAccId, 0, wo.OverheadCost, $"MOH absorption: {wo.WorkOrderNumber}", null, null, 1, woCompId != Guid.Empty ? woCompId : null));

                decimal dr = fgLines.Sum(l => l.Debit);
                decimal cr = fgLines.Sum(l => l.Credit);
                if (fgLines.Count > 1 && Math.Abs(dr - cr) <= 0.001m)
                {
                    _entries.Add(new JournalEntry
                    {
                        Date = DateOnly.FromDateTime(DateTime.Today),
                        Reference = GenerateNextJournalReference(),
                        Description = $"Finished goods capitalization for {wo.WorkOrderNumber}",
                        TransactionType = TransactionType.Inventory,
                        CompanyId = woCompId != Guid.Empty ? woCompId : null,
                        Lines = fgLines,
                        Status = JournalStatus.Posted
                    });
                }
            }

            Persist();
            return true;
        }
    }

    private readonly List<GoodsReceiptNoteModel> _grnModels = [];
    private readonly List<StockTransfer> _stockTransfers = [];

    public IReadOnlyList<GoodsReceiptNoteModel> GoodsReceiptNoteLogs => _grnModels;
    public IReadOnlyList<StockTransfer> StockTransfers => _stockTransfers;

    public PurchaseRequest CreatePurchaseRequest(PurchaseRequest pr)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(pr.RequestNumber))
            {
                var max = _prs.Select(p => p.RequestNumber).Where(n => n.StartsWith("PR-") && int.TryParse(n[3..], out _)).Select(n => int.Parse(n[3..])).DefaultIfEmpty(0).Max();
                pr.RequestNumber = $"PR-{(max + 1):D5}";
            }
            _prs.Add(pr);
            Persist();
            return pr;
        }
    }

    public RequestForQuotation CreateRfq(RequestForQuotation rfq)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(rfq.RfqNumber))
            {
                var max = _rfqs.Select(r => r.RfqNumber).Where(n => n.StartsWith("RFQ-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0).Max();
                rfq.RfqNumber = $"RFQ-{(max + 1):D5}";
            }
            if (rfq.PurchaseRequestId.HasValue)
            {
                var pr = _prs.FirstOrDefault(x => x.Id == rfq.PurchaseRequestId.Value);
                if (pr != null) pr.Status = PurchaseRequestStatus.Ordered;
            }
            _rfqs.Add(rfq);
            Persist();
            return rfq;
        }
    }

    public VendorQuote CreateVendorQuote(VendorQuote quote)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(quote.QuoteNumber))
            {
                var max = _vendorQuotes.Select(q => q.QuoteNumber).Where(n => n.StartsWith("VQ-") && int.TryParse(n[3..], out _)).Select(n => int.Parse(n[3..])).DefaultIfEmpty(0).Max();
                quote.QuoteNumber = $"VQ-{(max + 1):D4}";
            }
            _vendorQuotes.Add(quote);
            Persist();
            return quote;
        }
    }

    public bool SelectVendorQuote(string quoteId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            Guid.TryParse(quoteId, out var targetQuoteId);
            var quote = _vendorQuotes.FirstOrDefault(q => q.Id == targetQuoteId);
            if (quote is null) { error = "Vendor Quote not found."; return false; }

            foreach (var q in _vendorQuotes.Where(x => x.RequestForQuotationId == quote.RequestForQuotationId))
            {
                q.IsWinningQuote = (q.Id == targetQuoteId);
            }

            var maxPo = _purchaseOrders.Select(p => p.PoNumber).Where(n => n.StartsWith("PO-") && int.TryParse(n[3..], out _)).Select(n => int.Parse(n[3..])).DefaultIfEmpty(0).Max();
            var po = new PurchaseOrder
            {
                PoNumber = $"PO-{(maxPo + 1):D5}",
                VendorId = quote.VendorId,
                VendorQuoteId = quote.Id,
                Date = DateOnly.FromDateTime(DateTime.Today),
                ExpectedDeliveryDate = DateOnly.FromDateTime(DateTime.Today.AddDays(quote.DeliveryLeadTimeDays)),
                Status = PurchaseOrderStatus.Issued,
                CompanyId = quote.CompanyId,
                Lines = quote.Lines.Select(l => new PurchaseOrderLine
                {
                    Description = l.Description,
                    ProductId = l.ProductId ?? Guid.Empty,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    TaxAmount = 0,
                    Destination = l.Destination
                }).ToList()
            };
            _purchaseOrders.Add(po);
            Persist();
            return true;
        }
    }

    public bool ProcessGrnReceiving(GoodsReceiptNoteModel grn, out string? error)
    {
        error = null;
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(grn.GrnNumber))
            {
                var max = _grnModels.Select(g => g.GrnNumber).Where(n => n.StartsWith("GRN-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0).Max();
                grn.GrnNumber = $"GRN-{(max + 1):D5}";
            }

            foreach (var line in grn.Lines)
            {
                Guid.TryParse(line.ProductId, out var prodId);
                Guid.TryParse(grn.TargetWarehouseId, out var whId);
                Guid.TryParse(grn.CompanyId, out var compId);

                // Auto-provision Product if missing so item flows seamlessly into Inventory and Products Catalog
                var product = prodId != Guid.Empty ? FindProduct(prodId) : null;
                if (product == null && (line.Destination == LineDestination.Inventory || line.Destination == LineDestination.ManufacturingMaterial))
                {
                    var newPurpose = line.Destination == LineDestination.ManufacturingMaterial ? ProductPurpose.RawMaterial : ProductPurpose.FinishedGood;
                    product = new Product
                    {
                        Code = NextProductCode(),
                        Name = !string.IsNullOrWhiteSpace(line.Description) ? line.Description.Trim() : "Inventory Item",
                        Type = ProductType.Physical,
                        Purpose = newPurpose,
                        Unit = "Each",
                        CostPrice = line.UnitCost,
                        UnitPrice = line.UnitCost > 0 ? Math.Round(line.UnitCost * 1.35m, 2) : 0m,
                        Status = ProductStatus.Active,
                        QuantityOnHand = 0m
                    };
                    _products.Add(product);
                    prodId = product.Id;
                    line.ProductId = prodId.ToString();
                }

                if (line.Destination == LineDestination.Inventory || line.Destination == LineDestination.ManufacturingMaterial)
                {
                    if (whId == Guid.Empty)
                    {
                        var defaultWh = _warehouses.FirstOrDefault(w => w.CompanyId == compId) ?? _warehouses.FirstOrDefault();
                        if (defaultWh != null) whId = defaultWh.Id;
                    }

                    var txn = new StockTransaction
                    {
                        Date = DateOnly.FromDateTime(DateTime.Today),
                        Type = StockTransactionType.In,
                        ProductId = prodId != Guid.Empty ? prodId : Guid.NewGuid(),
                        WarehouseId = whId,
                        Quantity = line.ReceivedQuantity,
                        UnitCost = line.UnitCost,
                        Reference = $"GRN: {grn.GrnNumber}",
                        CompanyId = compId != Guid.Empty ? compId : null
                    };
                    _stockTransactions.Add(txn);

                    var level = _stockLevels.FirstOrDefault(sl => sl.ProductId == prodId && sl.WarehouseId == whId);
                    if (level is null && prodId != Guid.Empty)
                    {
                        level = new StockLevel
                        {
                            ProductId = prodId,
                            WarehouseId = whId,
                            QuantityOnHand = line.ReceivedQuantity,
                            MovingAverageCost = line.UnitCost,
                            CompanyId = compId != Guid.Empty ? compId : null
                        };
                        _stockLevels.Add(level);
                    }
                    else if (level is not null)
                    {
                        var totVal = (level.QuantityOnHand * level.MovingAverageCost) + (line.ReceivedQuantity * line.UnitCost);
                        level.QuantityOnHand += line.ReceivedQuantity;
                        level.MovingAverageCost = level.QuantityOnHand > 0 ? Math.Round(totVal / level.QuantityOnHand, 2) : line.UnitCost;
                    }

                    if (product != null)
                    {
                        product.QuantityOnHand = _stockLevels.Where(sl => sl.ProductId == product.Id).Sum(sl => sl.QuantityOnHand);
                        if (product.CostPrice <= 0) product.CostPrice = line.UnitCost;
                    }
                }
                else if (line.Destination == LineDestination.FixedAsset)
                {
                    var asset = new FixedAsset
                    {
                        AssetTag = $"FA-{(_fixedAssets.Count + 1):D4}",
                        Name = line.Description,
                        Category = "Plant & Machinery",
                        CostAllocation = DepreciationAllocation.ManufacturingOverhead,
                        MachineHealth = MachineStatus.Operating,
                        PurchaseDate = DateOnly.FromDateTime(DateTime.Today),
                        PurchasePrice = line.ReceivedQuantity * line.UnitCost,
                        UsefulLifeYears = 5,
                        SalvageValue = 0,
                        Status = AssetStatus.Active,
                        CompanyId = compId != Guid.Empty ? compId : null
                    };
                    _fixedAssets.Add(asset);
                }
            }

            _grnModels.Add(grn);

            // Post GRNI accrual journal: Dr Inventory / Fixed Assets, Cr GRNI Accrual
            var accrualLines = new List<JournalLine>();
            var inventoryAccId = GetMappedAccount("Inventory");
            var fixedAssetAccId = GetMappedAccount("Fixed Assets");
            var grniAccId = GetMappedAccount("GRNI Accrual");
            var grniTotal = 0m;
            foreach (var line in grn.Lines)
            {
                var amount = line.ReceivedQuantity * line.UnitCost;
                if (amount <= 0) continue;
                Guid.TryParse(grn.CompanyId, out var compId);
                if (line.Destination == LineDestination.FixedAsset)
                {
                    if (fixedAssetAccId != Guid.Empty)
                        accrualLines.Add(new JournalLine(fixedAssetAccId, amount, 0, $"GRN: {grn.GrnNumber}", null, null, 1, compId != Guid.Empty ? compId : null));
                }
                else
                {
                    if (inventoryAccId != Guid.Empty)
                        accrualLines.Add(new JournalLine(inventoryAccId, amount, 0, $"GRN: {grn.GrnNumber}", null, null, 1, compId != Guid.Empty ? compId : null));
                }
                grniTotal += amount;
            }
            if (grniAccId != Guid.Empty && accrualLines.Count > 0)
            {
                Guid.TryParse(grn.CompanyId, out var grnCompId);
                accrualLines.Add(new JournalLine(grniAccId, 0, grniTotal, $"GRNI Accrual: {grn.GrnNumber}", null, null, 1, grnCompId != Guid.Empty ? grnCompId : null));
                var grnJournal = new JournalEntry
                {
                    Date = DateOnly.FromDateTime(DateTime.Today),
                    Reference = grn.GrnNumber,
                    Description = $"Goods received but not yet invoiced: {grn.GrnNumber}",
                    TransactionType = TransactionType.Accrual,
                    CompanyId = grnCompId != Guid.Empty ? grnCompId : null,
                    Lines = accrualLines,
                    Status = JournalStatus.Posted
                };
                _entries.Add(grnJournal);
            }

            Persist();
            return true;
        }
    }

    public VendorBill CreateVendorBill(VendorBill bill)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(bill.BillNumber))
            {
                var max = _vendorBills.Select(b => b.BillNumber).Where(n => n.StartsWith("BILL-") && int.TryParse(n[5..], out _)).Select(n => int.Parse(n[5..])).DefaultIfEmpty(0).Max();
                bill.BillNumber = $"BILL-{(max + 1):D5}";
            }
            bill.Status = VendorBillStatus.Draft;
            _vendorBills.Add(bill);
            Persist();
            return bill;
        }
    }

    public bool UpdateVendorBill(Guid id, VendorBill updated, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var bill = _vendorBills.FirstOrDefault(b => b.Id == id);
            if (bill == null) { error = "Vendor Bill not found."; return false; }
            if (bill.Status != VendorBillStatus.Draft) { error = "Only Draft bills can be edited."; return false; }

            bill.VendorInvoiceNumber = updated.VendorInvoiceNumber ?? bill.VendorInvoiceNumber;
            bill.VendorId = updated.VendorId != Guid.Empty ? updated.VendorId : bill.VendorId;
            bill.PurchaseOrderId = updated.PurchaseOrderId ?? bill.PurchaseOrderId;
            bill.Date = updated.Date != default ? updated.Date : bill.Date;
            bill.DueDate = updated.DueDate != default ? updated.DueDate : bill.DueDate;
            bill.PaymentTermsDays = updated.PaymentTermsDays > 0 ? updated.PaymentTermsDays : bill.PaymentTermsDays;
            bill.CurrencyCode = updated.CurrencyCode ?? bill.CurrencyCode;
            bill.Notes = updated.Notes ?? bill.Notes;
            if (updated.Lines != null && updated.Lines.Count > 0)
            {
                bill.Lines = updated.Lines;
            }
            Persist();
            return true;
        }
    }

    public bool PostVendorBill(Guid id, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var bill = _vendorBills.FirstOrDefault(b => b.Id == id);
            if (bill == null) { error = "Vendor Bill not found."; return false; }
            if (bill.Status != VendorBillStatus.Draft) { error = "Only Draft bills can be posted."; return false; }

            var apAccountId = GetMappedAccount("Vendor Payables");
            var apAcc = _accounts.FirstOrDefault(a => a.Id == apAccountId);
            if (apAcc == null || !apAcc.IsPosting || apAcc.Status == AccountStatus.Inactive)
            {
                error = "Vendor Payables account is not mapped to a valid posting account. Configure it under System Account Mapping.";
                return false;
            }

            var journalLines = new List<JournalLine>();
            bool isReceivedViaGrn = bill.PurchaseOrderId.HasValue &&
                (_grnModels.Any(g => g.PurchaseOrderId == bill.PurchaseOrderId.Value.ToString()) ||
                 _grns.Any(g => g.PurchaseOrderId == bill.PurchaseOrderId.Value));
            var grniAccId = isReceivedViaGrn ? GetMappedAccount("GRNI Accrual") : Guid.Empty;

            foreach (var line in bill.Lines)
            {
                var subTotal = line.Quantity * line.UnitPrice;
                if (subTotal <= 0) continue;

                var debitAccId = grniAccId != Guid.Empty
                    ? grniAccId
                    : line.Destination switch
                    {
                        LineDestination.Inventory or LineDestination.ManufacturingMaterial => GetMappedAccount("Inventory"),
                        LineDestination.FixedAsset => GetMappedAccount("Fixed Assets"),
                        _ => GetMappedAccount("Purchases")
                    };
                if (debitAccId == Guid.Empty)
                {
                    error = $"Expense/Asset account for destination '{line.Destination}' is not mapped under System Account Mapping.";
                    return false;
                }
                var lineDesc = grniAccId != Guid.Empty ? $"Clear GRNI Accrual: {line.Description}" : $"Purchase: {line.Description}";
                journalLines.Add(new JournalLine(debitAccId, subTotal, 0, lineDesc, null, null, 1, bill.CompanyId));

                if (line.TaxAmount > 0)
                {
                    var taxAccId = line.Destination switch
                    {
                        LineDestination.FixedAsset => GetMappedAccount("Capital Goods Input VAT (Fixed Assets)"),
                        LineDestination.Inventory or LineDestination.ManufacturingMaterial => GetMappedAccount("Import VAT & Customs Duty Tax Clearing"),
                        _ => GetMappedAccount("Purchase Input VAT / Recoverable Tax")
                    };
                    if (taxAccId == Guid.Empty) taxAccId = GetMappedAccount("Taxes");
                    if (taxAccId == Guid.Empty)
                    {
                        error = "Input VAT / Recoverable Tax account is not mapped under System Account Mapping.";
                        return false;
                    }
                    journalLines.Add(new JournalLine(taxAccId, line.TaxAmount, 0, $"Purchase Input Tax: {line.Description}", null, null, 1, bill.CompanyId));
                }
            }

            var billTotal = bill.Lines.Sum(l => l.TotalAmount);
            if (journalLines.Count == 0) { error = "Bill has no valid lines to post."; return false; }
            journalLines.Add(new JournalLine(apAccountId, 0, billTotal, $"AP: {bill.BillNumber}", null, null, 1, bill.CompanyId));

            decimal debitSum = journalLines.Sum(l => l.Debit);
            decimal creditSum = journalLines.Sum(l => l.Credit);
            if (Math.Abs(debitSum - creditSum) > 0.001m)
            {
                error = $"Double-entry validation failed: Debits ({debitSum}) do not equal Credits ({creditSum}).";
                return false;
            }

            var journal = new JournalEntry
            {
                Date = bill.Date,
                Reference = bill.BillNumber,
                Description = $"Vendor bill from {_vendors.FirstOrDefault(v => v.Id == bill.VendorId)?.Name ?? bill.VendorId.ToString()}",
                TransactionType = TransactionType.Purchase,
                CompanyId = bill.CompanyId,
                Lines = journalLines,
                Status = JournalStatus.Posted
            };
            _entries.Add(journal);

            bill.Status = VendorBillStatus.Open;
            Persist();
            return true;
        }
    }

    public ThreeWayMatchCheck ValidateThreeWayMatch(string poId)
    {
        var po = _purchaseOrders.FirstOrDefault(p => p.Id.ToString() == poId || p.PoNumber == poId);
        if (po is null) return new ThreeWayMatchCheck { Status = "NotFound", Details = "PO not found." };

        var grns = _grnModels.Where(g => g.PurchaseOrderId == po.Id.ToString() || g.PurchaseOrderNumber == po.PoNumber).ToList();
        var bill = _vendorBills.FirstOrDefault(b => b.PurchaseOrderId == po.Id);

        var orderedAmt = po.Lines.Sum(l => l.TotalAmount);
        var receivedAmt = grns.SelectMany(g => g.Lines).Sum(l => l.ReceivedQuantity * l.UnitCost);
        var billedAmt = bill?.Lines?.Sum(l => l.TotalAmount) ?? receivedAmt;

        var qtyVariance = po.Lines.Sum(l => l.Quantity) - grns.SelectMany(g => g.Lines).Sum(l => l.ReceivedQuantity);
        var priceVariance = Math.Abs(orderedAmt - billedAmt);

        bool matched = Math.Abs(qtyVariance) < 0.01m && priceVariance < 0.01m;

        return new ThreeWayMatchCheck
        {
            PurchaseOrderId = po.Id.ToString(),
            PurchaseOrderNumber = po.PoNumber,
            GrnId = grns.FirstOrDefault()?.Id ?? "",
            GrnNumber = grns.FirstOrDefault()?.GrnNumber ?? "Pending",
            VendorBillNumber = bill?.BillNumber ?? "Pending",
            OrderedAmount = orderedAmt,
            ReceivedAmount = receivedAmt,
            BilledAmount = billedAmt,
            QuantityVariance = qtyVariance,
            PriceVariance = priceVariance,
            IsMatched = matched,
            Status = matched ? "Passed" : (priceVariance > 0.01m ? "OverBilled" : "UnderDelivery"),
            Details = matched ? "3-Way Match Passed cleanly." : $"Discrepancy detected: Qty Var: {qtyVariance}, Price Var: ${priceVariance:F2}"
        };
    }

    public bool ProcessStockTransfer(StockTransfer transfer, out string? error)
    {
        error = null;
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(transfer.TransferNumber))
            {
                var max = _stockTransfers.Select(t => t.TransferNumber).Where(n => n.StartsWith("ST-") && int.TryParse(n[3..], out _)).Select(n => int.Parse(n[3..])).DefaultIfEmpty(0).Max();
                transfer.TransferNumber = $"ST-{(max + 1):D4}";
            }

            Guid.TryParse(transfer.SourceWarehouseId, out var srcWhId);
            Guid.TryParse(transfer.DestinationWarehouseId, out var dstWhId);
            Guid.TryParse(transfer.ProductId, out var prodId);
            Guid.TryParse(transfer.CompanyId, out var compId);

            var srcLevel = _stockLevels.FirstOrDefault(sl => sl.ProductId == prodId && sl.WarehouseId == srcWhId);
            if (srcLevel is not null)
            {
                srcLevel.QuantityOnHand = Math.Max(0, srcLevel.QuantityOnHand - transfer.Quantity);
            }

            var dstLevel = _stockLevels.FirstOrDefault(sl => sl.ProductId == prodId && sl.WarehouseId == dstWhId);
            if (dstLevel is null)
            {
                dstLevel = new StockLevel
                {
                    ProductId = prodId,
                    WarehouseId = dstWhId,
                    QuantityOnHand = transfer.Quantity,
                    MovingAverageCost = srcLevel?.MovingAverageCost ?? 10m,
                    CompanyId = compId != Guid.Empty ? compId : null
                };
                _stockLevels.Add(dstLevel);
            }
            else
            {
                dstLevel.QuantityOnHand += transfer.Quantity;
            }

            _stockTransfers.Add(transfer);
            Persist();
            return true;
        }
    }

    public Customer? FindCustomer(Guid id) => _customers.FirstOrDefault(x => x.Id == id);
    public string NextCustomerNumber()
    {
        var numbers = _customers.Select(c => c.CustomerNumber).Where(n => n.StartsWith("CUST-") && int.TryParse(n[5..], out _)).Select(n => int.Parse(n[5..])).DefaultIfEmpty(0);
        return $"CUST-{(numbers.Max() + 1):D4}";
    }

    public bool CreateCustomer(CustomerRequest request, out Customer? customer, out string? error)
    {
        customer = null; error = null;
        if (string.IsNullOrWhiteSpace(request.Name)) { error = "Customer name is required."; return false; }
        if (!string.IsNullOrWhiteSpace(request.CustomerNumber) && _customers.Any(x => x.CustomerNumber.Equals(request.CustomerNumber.Trim(), StringComparison.OrdinalIgnoreCase))) { error = "A customer with this number already exists."; return false; }
        if (request.CompanyId is { } companyId && !_companies.Any(x => x.Id == companyId && x.Active)) { error = "Associated company entity must be active."; return false; }

        lock (_lock)
        {
            customer = new Customer { CustomerNumber = string.IsNullOrWhiteSpace(request.CustomerNumber) ? NextCustomerNumber() : request.CustomerNumber.Trim(), Name = request.Name.Trim(), Email = request.Email?.Trim(), Phone = request.Phone?.Trim(), TaxId = request.TaxId?.Trim(), AddressLine1 = request.AddressLine1?.Trim(), AddressLine2 = request.AddressLine2?.Trim(), City = request.City?.Trim(), State = request.State?.Trim(), PostalCode = request.PostalCode?.Trim(), Country = string.IsNullOrWhiteSpace(request.Country) ? "United States" : request.Country.Trim(), CurrencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode) ? "USD" : request.CurrencyCode.Trim().ToUpperInvariant(), CreditLimit = request.CreditLimit < 0 ? 0m : request.CreditLimit, PaymentTermsDays = request.PaymentTermsDays <= 0 ? 30 : request.PaymentTermsDays, CompanyId = request.CompanyId };
            _customers.Add(customer); Persist(); return true;
        }
    }

    public bool UpdateCustomer(Guid id, CustomerRequest request, out Customer? customer, out string? error)
    {
        customer = null; error = null;
        if (string.IsNullOrWhiteSpace(request.Name)) { error = "Customer name is required."; return false; }

        lock (_lock)
        {
            customer = FindCustomer(id);
            if (customer is null) { error = "Customer not found."; return false; }
            if (!string.IsNullOrWhiteSpace(request.CustomerNumber) && _customers.Any(x => x.Id != id && x.CustomerNumber.Equals(request.CustomerNumber.Trim(), StringComparison.OrdinalIgnoreCase))) { error = "Another customer with this number already exists."; return false; }
            
            customer.CustomerNumber = string.IsNullOrWhiteSpace(request.CustomerNumber) ? customer.CustomerNumber : request.CustomerNumber.Trim();
            customer.Name = request.Name.Trim(); customer.Email = request.Email?.Trim(); customer.Phone = request.Phone?.Trim(); customer.TaxId = request.TaxId?.Trim(); customer.AddressLine1 = request.AddressLine1?.Trim(); customer.AddressLine2 = request.AddressLine2?.Trim(); customer.City = request.City?.Trim(); customer.State = request.State?.Trim(); customer.PostalCode = request.PostalCode?.Trim(); customer.Country = string.IsNullOrWhiteSpace(request.Country) ? "United States" : request.Country.Trim(); customer.CurrencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode) ? "USD" : request.CurrencyCode.Trim().ToUpperInvariant(); customer.CreditLimit = request.CreditLimit < 0 ? 0m : request.CreditLimit; customer.PaymentTermsDays = request.PaymentTermsDays <= 0 ? 30 : request.PaymentTermsDays; customer.CompanyId = request.CompanyId; customer.UpdatedAt = DateTime.UtcNow;
            Persist(); return true;
        }
    }

    public bool SetCustomerStatus(Guid id, CustomerStatus status, out string? error) { error = null; lock (_lock) { var customer = FindCustomer(id); if (customer is null) { error = "Customer not found."; return false; } customer.Status = status; customer.UpdatedAt = DateTime.UtcNow; Persist(); return true; } }
    public bool DeleteCustomer(Guid id, out string? error) { error = null; lock (_lock) { var customer = FindCustomer(id); if (customer is null) { error = "Customer not found."; return false; } _customers.Remove(customer); Persist(); return true; } }

    public Product? FindProduct(Guid id) => _products.FirstOrDefault(x => x.Id == id);
    public string NextProductCode() { var numbers = _products.Select(c => c.Code).Where(n => n.StartsWith("ITEM-") && int.TryParse(n[5..], out _)).Select(n => int.Parse(n[5..])).DefaultIfEmpty(0); return $"ITEM-{(numbers.Max() + 1):D4}"; }
    public bool CreateProduct(ProductRequest request, out Product? product, out string? error)
    {
        product = null; error = null;
        if (string.IsNullOrWhiteSpace(request.Name)) { error = "Product name is required."; return false; }
        if (!string.IsNullOrWhiteSpace(request.Code) && _products.Any(x => x.Code.Equals(request.Code.Trim(), StringComparison.OrdinalIgnoreCase))) { error = "A product with this code already exists."; return false; }
        lock (_lock)
        {
            product = new Product { Code = string.IsNullOrWhiteSpace(request.Code) ? NextProductCode() : request.Code.Trim(), Name = request.Name.Trim(), Description = request.Description?.Trim(), Type = request.Type, Purpose = request.Purpose, Category = request.Category?.Trim(), Unit = string.IsNullOrWhiteSpace(request.Unit) ? "Each" : request.Unit.Trim(), UnitPrice = request.UnitPrice < 0 ? 0m : request.UnitPrice, CostPrice = request.CostPrice < 0 ? 0m : request.CostPrice, MinimumQuantity = request.MinimumQuantity < 0 ? 0m : request.MinimumQuantity, TaxCodeId = request.TaxCodeId, IncomeAccountId = request.IncomeAccountId, ExpenseAccountId = request.ExpenseAccountId, AssetAccountId = request.AssetAccountId };
            _products.Add(product); Persist(); return true;
        }
    }
    public bool UpdateProduct(Guid id, ProductRequest request, out Product? product, out string? error)
    {
        product = null; error = null;
        if (string.IsNullOrWhiteSpace(request.Name)) { error = "Product name is required."; return false; }
        lock (_lock)
        {
            product = FindProduct(id); if (product is null) { error = "Product not found."; return false; }
            if (!string.IsNullOrWhiteSpace(request.Code) && _products.Any(x => x.Id != id && x.Code.Equals(request.Code.Trim(), StringComparison.OrdinalIgnoreCase))) { error = "Another product with this code already exists."; return false; }
            product.Code = string.IsNullOrWhiteSpace(request.Code) ? product.Code : request.Code.Trim(); product.Name = request.Name.Trim(); product.Description = request.Description?.Trim(); product.Type = request.Type; product.Purpose = request.Purpose; product.Category = request.Category?.Trim(); product.Unit = string.IsNullOrWhiteSpace(request.Unit) ? "Each" : request.Unit.Trim(); product.UnitPrice = request.UnitPrice < 0 ? 0m : request.UnitPrice; product.CostPrice = request.CostPrice < 0 ? 0m : request.CostPrice; product.MinimumQuantity = request.MinimumQuantity < 0 ? 0m : request.MinimumQuantity; product.TaxCodeId = request.TaxCodeId; product.IncomeAccountId = request.IncomeAccountId; product.ExpenseAccountId = request.ExpenseAccountId; product.AssetAccountId = request.AssetAccountId; product.UpdatedAt = DateTime.UtcNow;
            Persist(); return true;
        }
    }
    public bool SetProductStatus(Guid id, ProductStatus status, out string? error) { error = null; lock (_lock) { var product = FindProduct(id); if (product is null) { error = "Product not found."; return false; } product.Status = status; product.UpdatedAt = DateTime.UtcNow; Persist(); return true; } }
    public bool SetProductPurpose(Guid id, ProductPurpose purpose, out string? error) { error = null; lock (_lock) { var product = FindProduct(id); if (product is null) { error = "Product not found."; return false; } product.Purpose = purpose; product.UpdatedAt = DateTime.UtcNow; Persist(); return true; } }
    public bool DeleteProduct(Guid id, out string? error) { error = null; lock (_lock) { var product = FindProduct(id); if (product is null) { error = "Product not found."; return false; } _products.Remove(product); Persist(); return true; } }

    public Vendor? FindVendor(Guid id) => _vendors.FirstOrDefault(x => x.Id == id);
    public string NextVendorNumber() { var numbers = _vendors.Select(c => c.VendorNumber).Where(n => n.StartsWith("VEND-") && int.TryParse(n[5..], out _)).Select(n => int.Parse(n[5..])).DefaultIfEmpty(0); return $"VEND-{(numbers.Max() + 1):D4}"; }
    public bool CreateVendor(VendorRequest request, out Vendor? vendor, out string? error)
    {
        vendor = null; error = null;
        if (string.IsNullOrWhiteSpace(request.Name)) { error = "Vendor name is required."; return false; }
        lock (_lock)
        {
            vendor = new Vendor { VendorNumber = string.IsNullOrWhiteSpace(request.VendorNumber) ? NextVendorNumber() : request.VendorNumber.Trim(), Name = request.Name.Trim(), Email = request.Email?.Trim(), Phone = request.Phone?.Trim(), TaxId = request.TaxId?.Trim(), AddressLine1 = request.AddressLine1?.Trim(), AddressLine2 = request.AddressLine2?.Trim(), City = request.City?.Trim(), State = request.State?.Trim(), PostalCode = request.PostalCode?.Trim(), Country = string.IsNullOrWhiteSpace(request.Country) ? "United States" : request.Country.Trim(), CurrencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode) ? "USD" : request.CurrencyCode.Trim().ToUpperInvariant(), PaymentTermsDays = request.PaymentTermsDays <= 0 ? 30 : request.PaymentTermsDays, DefaultExpenseAccountId = request.DefaultExpenseAccountId, CompanyId = request.CompanyId };
            _vendors.Add(vendor); Persist(); return true;
        }
    }
    public bool UpdateVendor(Guid id, VendorRequest request, out Vendor? vendor, out string? error)
    {
        vendor = null; error = null;
        lock (_lock)
        {
            vendor = FindVendor(id); if (vendor is null) { error = "Vendor not found."; return false; }
            vendor.VendorNumber = string.IsNullOrWhiteSpace(request.VendorNumber) ? vendor.VendorNumber : request.VendorNumber.Trim(); vendor.Name = request.Name.Trim(); vendor.Email = request.Email?.Trim(); vendor.Phone = request.Phone?.Trim(); vendor.TaxId = request.TaxId?.Trim(); vendor.AddressLine1 = request.AddressLine1?.Trim(); vendor.AddressLine2 = request.AddressLine2?.Trim(); vendor.City = request.City?.Trim(); vendor.State = request.State?.Trim(); vendor.PostalCode = request.PostalCode?.Trim(); vendor.Country = string.IsNullOrWhiteSpace(request.Country) ? "United States" : request.Country.Trim(); vendor.CurrencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode) ? "USD" : request.CurrencyCode.Trim().ToUpperInvariant(); vendor.PaymentTermsDays = request.PaymentTermsDays <= 0 ? 30 : request.PaymentTermsDays; vendor.DefaultExpenseAccountId = request.DefaultExpenseAccountId; vendor.CompanyId = request.CompanyId; vendor.UpdatedAt = DateTime.UtcNow;
            Persist(); return true;
        }
    }
    public bool SetVendorStatus(Guid id, VendorStatus status, out string? error) { error = null; lock (_lock) { var vendor = FindVendor(id); if (vendor is null) { error = "Vendor not found."; return false; } vendor.Status = status; vendor.UpdatedAt = DateTime.UtcNow; Persist(); return true; } }
    public bool DeleteVendor(Guid id, out string? error) { error = null; lock (_lock) { var vendor = FindVendor(id); if (vendor is null) { error = "Vendor not found."; return false; } _vendors.Remove(vendor); Persist(); return true; } }

    public PurchaseOrder? FindPurchaseOrder(Guid id) => _purchaseOrders.FirstOrDefault(x => x.Id == id);
    public string NextPoNumber() { var numbers = _purchaseOrders.Select(c => c.PoNumber).Where(n => n.StartsWith("PO-") && int.TryParse(n[3..], out _)).Select(n => int.Parse(n[3..])).DefaultIfEmpty(0); return $"PO-{(numbers.Max() + 1):D5}"; }
    
    public bool CreatePurchaseOrder(PurchaseOrderRequest request, out PurchaseOrder? po, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var vendor = _vendors.FirstOrDefault(v => v.Id == request.VendorId);
            if (vendor == null) { error = "Vendor not found."; po = null; return false; }
            po = new PurchaseOrder
            {
                PoNumber = request.PoNumber ?? NextPoNumber(),
                VendorId = request.VendorId,
                VendorQuoteId = request.VendorQuoteId,
                CompanyId = request.CompanyId ?? vendor.CompanyId,
                Date = request.Date,
                ExpectedDeliveryDate = request.ExpectedDeliveryDate,
                Lines = request.Lines.Select(l => new PurchaseOrderLine
                {
                    ProductId = l.ProductId,
                    Description = l.Description,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    TaxCodeId = l.TaxCodeId,
                    TaxAmount = l.TaxAmount,
                    Destination = l.Destination
                }).ToList()
            };
            _purchaseOrders.Add(po);
            Persist(); return true;
        }
    }

    public bool UpdatePurchaseOrderStatus(Guid id, PurchaseOrderStatus status, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var po = _purchaseOrders.FirstOrDefault(x => x.Id == id);
            if (po == null) { error = "PO not found."; return false; }
            po.Status = status;
            return true;
        }
    }

    public GoodsReceiptNote? FindGoodsReceiptNote(Guid id) => _grns.FirstOrDefault(x => x.Id == id);
    public string NextGrnNumber() { var numbers = _grns.Select(c => c.GrnNumber).Where(n => n.StartsWith("GRN-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0); return $"GRN-{(numbers.Max() + 1):D5}"; }
    
    public bool CreateGoodsReceiptNote(GoodsReceiptNoteRequest request, out GoodsReceiptNote? grn, out string? error)
    {
        grn = null; error = null;
        lock (_lock)
        {
            var po = FindPurchaseOrder(request.PurchaseOrderId);
            if (po == null) { error = "Purchase order not found."; return false; }
            if (request.Lines.Count == 0) { error = "GRN must have at least one line."; return false; }

            grn = new GoodsReceiptNote
            {
                GrnNumber = string.IsNullOrWhiteSpace(request.GrnNumber) ? NextGrnNumber() : request.GrnNumber.Trim(),
                PurchaseOrderId = request.PurchaseOrderId,
                DateReceived = request.DateReceived,
                Notes = request.Notes,
                Lines = request.Lines.Select(l => new GoodsReceiptNoteLine
                {
                    PurchaseOrderLineId = l.PurchaseOrderLineId,
                    QuantityReceived = l.QuantityReceived
                }).ToList()
            };
            _grns.Add(grn); Persist(); return true;
        }
    }

    public PurchaseRequest? FindPurchaseRequest(Guid id) => _prs.FirstOrDefault(x => x.Id == id);
    
    public bool CreatePurchaseRequest(PurchaseRequestRequest request, Guid companyId, out PurchaseRequest? pr, out string? error)
    {
        error = null;
        lock (_lock)
        {
            pr = new PurchaseRequest
            {
                RequestNumber = request.RequestNumber,
                RequesterName = request.RequesterName,
                Date = request.Date,
                CompanyId = companyId,
                Lines = request.Lines.Select(l => new PurchaseRequestLine
                {
                    ProductId = l.ProductId,
                    Description = l.Description,
                    Quantity = l.Quantity
                }).ToList()
            };
            _prs.Add(pr);
            return true;
        }
    }

    public bool UpdatePurchaseRequestStatus(Guid id, PurchaseRequestStatus status, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var pr = _prs.FirstOrDefault(x => x.Id == id);
            if (pr == null) { error = "PR not found."; return false; }
            pr.Status = status;
            return true;
        }
    }

    public RequestForQuotation? FindRfq(Guid id) => _rfqs.FirstOrDefault(x => x.Id == id);

    public bool CreateRfq(RfqRequest request, Guid companyId, out RequestForQuotation? rfq, out string? error)
    {
        error = null;
        lock (_lock)
        {
            if (request.PurchaseRequestId.HasValue)
            {
                var pr = _prs.FirstOrDefault(x => x.Id == request.PurchaseRequestId.Value);
                if (pr != null) pr.Status = PurchaseRequestStatus.Ordered; // Rfq generated
            }

            rfq = new RequestForQuotation
            {
                RfqNumber = request.RfqNumber,
                PurchaseRequestId = request.PurchaseRequestId,
                Date = request.Date,
                Deadline = request.Deadline,
                CompanyId = companyId,
                Lines = request.Lines.Select(l => new RequestForQuotationLine
                {
                    ProductId = l.ProductId,
                    Description = l.Description,
                    Quantity = l.Quantity
                }).ToList()
            };
            _rfqs.Add(rfq);
            return true;
        }
    }

    public bool SubmitVendorQuote(VendorQuoteRequest request, out VendorQuote? quote, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var rfq = _rfqs.FirstOrDefault(x => x.Id == request.RequestForQuotationId);
            if (rfq == null) { error = "RFQ not found."; quote = null; return false; }

            quote = new VendorQuote
            {
                RequestForQuotationId = request.RequestForQuotationId,
                VendorId = request.VendorId,
                Date = request.Date,
                Lines = request.Lines.Select(l => new VendorQuoteLine
                {
                    ProductId = l.ProductId,
                    UnitPrice = l.UnitPrice,
                    TaxCodeId = l.TaxCodeId,
                    TaxAmount = l.TaxAmount
                }).ToList()
            };
            _vendorQuotes.Add(quote);
            return true;
        }
    }

    public bool AwardQuote(Guid rfqId, Guid quoteId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var rfq = _rfqs.FirstOrDefault(x => x.Id == rfqId);
            if (rfq == null) { error = "RFQ not found."; return false; }

            var quotes = _vendorQuotes.Where(x => x.RequestForQuotationId == rfqId).ToList();
            var winning = quotes.FirstOrDefault(x => x.Id == quoteId);
            if (winning == null) { error = "Quote not found."; return false; }

            foreach (var q in quotes) q.IsWinningQuote = false;
            winning.IsWinningQuote = true;
            rfq.Status = RfqStatus.Awarded;
            return true;
        }
    }

    public bool CreateVendorBill(VendorBillRequest request, out VendorBill? bill, out string? error)
    {
        error = null;
        lock (_lock)
        {
            if (request.PurchaseOrderId.HasValue && request.GoodsReceiptNoteId.HasValue)
            {
                var po = _purchaseOrders.FirstOrDefault(x => x.Id == request.PurchaseOrderId.Value);
                var grn = _grns.FirstOrDefault(x => x.Id == request.GoodsReceiptNoteId.Value);
                if (po == null || grn == null) { error = "PO or GRN not found."; bill = null; return false; }

                // Basic 3-way match validation warning if quantities or prices are mismatched
                foreach (var line in request.Lines)
                {
                    var poLine = po.Lines.FirstOrDefault(x => x.ProductId == line.ProductId);
                    var grnLine = poLine != null ? grn.Lines.FirstOrDefault(x => x.PurchaseOrderLineId == poLine.Id) : null;
                    
                    if (poLine != null && grnLine != null)
                    {
                        if (line.Quantity > grnLine.QuantityReceived || line.UnitPrice != poLine.UnitPrice)
                        {
                            // In real system, we flag the bill, but for now we just allow it with warning true
                            // The warning is passed from frontend or evaluated here. Let's just trust the request.HasVarianceWarning
                        }
                    }
                }
            }

            bill = new VendorBill
            {
                BillNumber = request.BillNumber,
                VendorInvoiceNumber = request.VendorInvoiceNumber,
                VendorId = request.VendorId,
                PurchaseOrderId = request.PurchaseOrderId,
                GoodsReceiptNoteId = request.GoodsReceiptNoteId,
                Date = request.Date,
                DueDate = request.DueDate,
                CompanyId = request.CompanyId,
                HasVarianceWarning = request.HasVarianceWarning,
                PaymentTermsDays = request.PaymentTermsDays,
                CurrencyCode = request.CurrencyCode,
                Notes = request.Notes,
                Lines = request.Lines.Select(l => new VendorBillLine
                {
                    ProductId = l.ProductId,
                    Description = l.Description,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    TaxCodeId = l.TaxCodeId,
                    TaxAmount = l.TaxAmount,
                    Destination = l.Destination
                }).ToList()
            };
            _vendorBills.Add(bill);
            return true;
        }
    }

    public bool ProcessGoodsReceiptNote(Guid grnId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var grn = FindGoodsReceiptNote(grnId);
            if (grn == null) { error = "GRN not found."; return false; }
            if (grn.IsProcessed) { error = "GRN is already processed."; return false; }

            var po = FindPurchaseOrder(grn.PurchaseOrderId);
            if (po == null) { error = "Associated PO not found."; return false; }

            // 1. Update Inventory and create Fixed Assets
            foreach (var grnLine in grn.Lines)
            {
                var poLine = po.Lines.FirstOrDefault(l => l.Id == grnLine.PurchaseOrderLineId);
                if (poLine == null) continue;
                
                poLine.ReceivedQuantity += grnLine.QuantityReceived;
                
                var product = FindProduct(poLine.ProductId);
                if (product == null && (poLine.Destination == LineDestination.Inventory || poLine.Destination == LineDestination.ManufacturingMaterial))
                {
                    var newPurpose = poLine.Destination == LineDestination.ManufacturingMaterial ? ProductPurpose.RawMaterial : ProductPurpose.FinishedGood;
                    product = new Product
                    {
                        Code = NextProductCode(),
                        Name = !string.IsNullOrWhiteSpace(poLine.Description) ? poLine.Description.Trim() : "Purchased Item",
                        Type = ProductType.Physical,
                        Purpose = newPurpose,
                        Unit = "Each",
                        CostPrice = poLine.UnitPrice,
                        UnitPrice = poLine.UnitPrice > 0 ? Math.Round(poLine.UnitPrice * 1.35m, 2) : 0m,
                        Status = ProductStatus.Active,
                        QuantityOnHand = 0m
                    };
                    _products.Add(product);
                    poLine.ProductId = product.Id;
                }

                if (poLine.Destination == LineDestination.Inventory || poLine.Destination == LineDestination.ManufacturingMaterial)
                {
                    if (product != null)
                    {
                        product.QuantityOnHand += grnLine.QuantityReceived;
                        if (product.CostPrice <= 0) product.CostPrice = poLine.UnitPrice;
                    }

                    // Find or create StockLevel for default warehouse
                    var warehouse = _warehouses.FirstOrDefault(w => w.CompanyId == po.CompanyId) ?? _warehouses.FirstOrDefault();
                    if (warehouse != null && product != null)
                    {
                        var stockLevel = _stockLevels.FirstOrDefault(s => s.ProductId == product.Id && s.WarehouseId == warehouse.Id);
                        if (stockLevel == null)
                        {
                            stockLevel = new StockLevel { ProductId = product.Id, WarehouseId = warehouse.Id, CompanyId = po.CompanyId };
                            _stockLevels.Add(stockLevel);
                        }
                        // Moving average cost calculation
                        var totalQty = stockLevel.QuantityOnHand + grnLine.QuantityReceived;
                        var totalCost = (stockLevel.QuantityOnHand * stockLevel.MovingAverageCost) + (grnLine.QuantityReceived * poLine.UnitPrice);
                        stockLevel.MovingAverageCost = totalQty > 0 ? totalCost / totalQty : poLine.UnitPrice;
                        stockLevel.QuantityOnHand = totalQty;

                        _stockTransactions.Add(new StockTransaction
                        {
                            Date = grn.DateReceived,
                            ProductId = product.Id,
                            WarehouseId = warehouse.Id,
                            Quantity = grnLine.QuantityReceived,
                            UnitCost = poLine.UnitPrice,
                            Type = StockTransactionType.In,
                            Reference = grn.GrnNumber,
                            CompanyId = po.CompanyId
                        });
                    }
                }
                else if (poLine.Destination == LineDestination.FixedAsset)
                {
                    // Create a fixed asset entry for EACH quantity received (e.g. 5 laptops = 5 assets)
                    for (int i = 0; i < (int)grnLine.QuantityReceived; i++)
                    {
                        var asset = new FixedAsset
                        {
                            AssetTag = $"FA-{DateTime.UtcNow.Ticks.ToString()[^6..]}-{i}", // Quick unique tag
                            Name = product?.Name ?? poLine.Description,
                            Category = "Plant & Machinery",
                            CostAllocation = DepreciationAllocation.ManufacturingOverhead,
                            MachineHealth = MachineStatus.Operating,
                            Description = $"Received from PO {po.PoNumber}",
                            PurchaseDate = grn.DateReceived,
                            PurchasePrice = poLine.UnitPrice, // Cost per unit
                            Status = AssetStatus.Active,
                            CompanyId = po.CompanyId
                        };
                        _fixedAssets.Add(asset);
                    }
                }
            }

            // 2. Update PO Status
            bool allReceived = po.Lines.All(l => l.ReceivedQuantity >= l.Quantity);
            bool someReceived = po.Lines.Any(l => l.ReceivedQuantity > 0);
            po.Status = allReceived ? PurchaseOrderStatus.Fulfilled : (someReceived ? PurchaseOrderStatus.PartiallyReceived : PurchaseOrderStatus.Issued);

            // 3. Optional: Create Accrual Journal Entry (GRNI) 
            // In a real system, you would sum the amounts by GL account and create a balanced entry here.
            var invAccId = GetMappedAccount("Inventory");
            var faAccId = GetMappedAccount("Fixed Assets");
            var grniId = GetMappedAccount("GRNI Accrual");
            var grniLines = new List<JournalLine>();
            decimal grniTotal = 0;
            foreach (var grnLine in grn.Lines)
            {
                var poLine = po.Lines.FirstOrDefault(l => l.Id == grnLine.PurchaseOrderLineId);
                if (poLine == null) continue;
                var amt = grnLine.QuantityReceived * poLine.UnitPrice;
                if (amt <= 0) continue;
                if (poLine.Destination == LineDestination.FixedAsset)
                {
                    if (faAccId != Guid.Empty) grniLines.Add(new JournalLine(faAccId, amt, 0, $"GRN: {grn.GrnNumber}", null, null, 1, po.CompanyId));
                }
                else if (invAccId != Guid.Empty)
                {
                    grniLines.Add(new JournalLine(invAccId, amt, 0, $"GRN: {grn.GrnNumber}", null, null, 1, po.CompanyId));
                }
                grniTotal += amt;
            }
            if (grniId != Guid.Empty && grniLines.Count > 0)
            {
                grniLines.Add(new JournalLine(grniId, 0, grniTotal, $"GRNI Accrual: {grn.GrnNumber}", null, null, 1, po.CompanyId));
                _entries.Add(new JournalEntry
                {
                    Date = grn.DateReceived,
                    Reference = grn.GrnNumber,
                    Description = $"Goods received but not yet invoiced: {grn.GrnNumber}",
                    TransactionType = TransactionType.Accrual,
                    CompanyId = po.CompanyId,
                    Lines = grniLines,
                    Status = JournalStatus.Posted
                });
            }

            grn.IsProcessed = true;
            Persist();
            return true;
        }
    }

    // Fixed Asset Disposal (IAS 16 compliant - posts gain/loss journal)
    public bool DisposeAsset(Guid assetId, DateOnly disposalDate, decimal proceeds, Guid? assetAccountId, Guid? accumDeprAccountId, Guid? gainLossAccountId, Guid? cashAccountId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var asset = _fixedAssets.FirstOrDefault(a => a.Id == assetId);
            if (asset == null) { error = "Asset not found."; return false; }
            if (asset.Status == AssetStatus.Disposed) { error = "Asset is already disposed."; return false; }

            // Fall back to centralized System Account Mapping when accounts not supplied
            var resolvedAssetAcc = (assetAccountId.HasValue && assetAccountId.Value != Guid.Empty) ? assetAccountId.Value : GetMappedAccount("Fixed Assets");
            var resolvedAccumAcc = (accumDeprAccountId.HasValue && accumDeprAccountId.Value != Guid.Empty) ? accumDeprAccountId.Value : GetMappedAccount("Accumulated Depreciation");
            var resolvedGainLossAcc = (gainLossAccountId.HasValue && gainLossAccountId.Value != Guid.Empty) ? gainLossAccountId.Value : GetMappedAccount("Gain/Loss on Disposal");
            if (resolvedAssetAcc == Guid.Empty || resolvedAccumAcc == Guid.Empty || resolvedGainLossAcc == Guid.Empty)
            {
                error = "Asset, Accumulated Depreciation or Gain/Loss account is not mapped. Configure it under System Account Mapping.";
                return false;
            }

            var nbv = asset.PurchasePrice - asset.AccumulatedDepreciation;
            var gainOrLoss = proceeds - nbv; // positive = gain, negative = loss

            var lines = new List<JournalLine>
            {
                // Remove asset at cost: Cr Asset Account
                new JournalLine(resolvedAssetAcc, 0, asset.PurchasePrice, $"Disposal of {asset.Name} (cost)", null, null, 1, asset.CompanyId),
                // Remove accumulated depreciation: Dr Accum Depr Account
                new JournalLine(resolvedAccumAcc, asset.AccumulatedDepreciation, 0, $"Disposal of {asset.Name} (accum depr)", null, null, 1, asset.CompanyId),
            };

            if (proceeds > 0 && cashAccountId.HasValue)
                lines.Add(new JournalLine(cashAccountId.Value, proceeds, 0, $"Proceeds from disposal of {asset.Name}", null, null, 1, asset.CompanyId));

            if (gainOrLoss > 0)
                lines.Add(new JournalLine(resolvedGainLossAcc, 0, gainOrLoss, $"Gain on disposal of {asset.Name}", null, null, 1, asset.CompanyId));
            else if (gainOrLoss < 0)
                lines.Add(new JournalLine(resolvedGainLossAcc, Math.Abs(gainOrLoss), 0, $"Loss on disposal of {asset.Name}", null, null, 1, asset.CompanyId));

            var journalEntry = new JournalEntry
            {
                Date = disposalDate,
                Reference = $"DISP-{asset.AssetTag}",
                Description = $"Disposal of fixed asset: {asset.Name}",
                TransactionType = TransactionType.WriteOff,
                CompanyId = asset.CompanyId,
                Lines = lines,
                Status = JournalStatus.Posted
            };
            _entries.Add(journalEntry);

            asset.Status = AssetStatus.Disposed;
            asset.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    // Inventory / Warehouse CRUD
    public bool CreateWarehouse(string name, string? location, Guid? companyId, out Warehouse? warehouse, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(name)) { error = "Warehouse name is required."; warehouse = null; return false; }
        lock (_lock)
        {
            warehouse = new Warehouse { Name = name.Trim(), Location = location?.Trim(), CompanyId = companyId };
            _warehouses.Add(warehouse);
            Persist();
            return true;
        }
    }

    public bool CreateStockTransaction(StockTransaction request, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var warehouse = _warehouses.FirstOrDefault(w => w.Id == request.WarehouseId);
            if (warehouse == null) { error = "Warehouse not found."; return false; }

            var stockLevel = _stockLevels.FirstOrDefault(s => s.ProductId == request.ProductId && s.WarehouseId == request.WarehouseId);
            if (stockLevel == null)
            {
                stockLevel = new StockLevel { ProductId = request.ProductId, WarehouseId = request.WarehouseId, CompanyId = request.CompanyId };
                _stockLevels.Add(stockLevel);
            }

            if (request.Type == StockTransactionType.Out || request.Type == StockTransactionType.Transfer)
            {
                if (stockLevel.QuantityOnHand < request.Quantity) { error = "Insufficient stock."; return false; }
                stockLevel.QuantityOnHand -= request.Quantity;
            }
            else
            {
                var totalQty = stockLevel.QuantityOnHand + request.Quantity;
                var totalCost = (stockLevel.QuantityOnHand * stockLevel.MovingAverageCost) + (request.Quantity * request.UnitCost);
                stockLevel.MovingAverageCost = totalQty > 0 ? totalCost / totalQty : request.UnitCost;
                stockLevel.QuantityOnHand = totalQty;
            }

            _stockTransactions.Add(request);

            var product = _products.FirstOrDefault(p => p.Id == request.ProductId);
            if (product != null)
            {
                product.QuantityOnHand = _stockLevels.Where(s => s.ProductId == product.Id).Sum(s => s.QuantityOnHand);
                product.UpdatedAt = DateTime.UtcNow;
            }

            Persist();
            return true;
        }
    }

    // Create / Register New Fixed Asset
    public bool CreateFixedAsset(FixedAsset asset, out string? error)
    {
        error = null;
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(asset.Name))
            {
                error = "Asset name is required.";
                return false;
            }
            if (string.IsNullOrWhiteSpace(asset.AssetTag))
            {
                asset.AssetTag = $"AST-{DateTime.UtcNow.Year}-{_fixedAssets.Count + 1:D4}";
            }
            if (asset.PurchasePrice <= 0)
            {
                error = "Purchase cost must be greater than zero.";
                return false;
            }
            if (asset.UsefulLifeYears <= 0)
            {
                asset.UsefulLifeYears = 5;
            }

            asset.CreatedAt = DateTime.UtcNow;
            asset.UpdatedAt = DateTime.UtcNow;
            _fixedAssets.Add(asset);

            Persist();
            return true;
        }
    }

    // Update / Edit Existing Fixed Asset
    public bool UpdateFixedAsset(Guid id, FixedAsset updated, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var existing = _fixedAssets.FirstOrDefault(a => a.Id == id);
            if (existing == null) { error = "Asset not found."; return false; }

            existing.Name = updated.Name;
            existing.Description = updated.Description;
            existing.Category = updated.Category ?? existing.Category;
            existing.SerialNumber = updated.SerialNumber;
            existing.ModelNumber = updated.ModelNumber;
            existing.Manufacturer = updated.Manufacturer;
            existing.PurchaseDate = updated.PurchaseDate;
            existing.PurchasePrice = updated.PurchasePrice;
            existing.SalvageValue = updated.SalvageValue;
            existing.UsefulLifeYears = updated.UsefulLifeYears > 0 ? updated.UsefulLifeYears : 5;
            existing.DepreciationMethod = updated.DepreciationMethod;
            existing.CostAllocation = updated.CostAllocation;
            existing.Status = updated.Status;

            // Procurement Links
            existing.VendorId = updated.VendorId;
            existing.VendorName = updated.VendorName;
            existing.PurchaseOrderId = updated.PurchaseOrderId;
            existing.PurchaseOrderNumber = updated.PurchaseOrderNumber;
            existing.VendorBillId = updated.VendorBillId;
            existing.VendorBillNumber = updated.VendorBillNumber;
            existing.GrnNumber = updated.GrnNumber;
            existing.WarrantyExpiryDate = updated.WarrantyExpiryDate;

            // Factory / Plant Location
            existing.Location = updated.Location;
            existing.Department = updated.Department;
            existing.WorkCenterId = updated.WorkCenterId;
            existing.WorkCenterName = updated.WorkCenterName;
            existing.AssignedCustodianId = updated.AssignedCustodianId;
            existing.AssignedCustodianName = updated.AssignedCustodianName;

            // Machine Health & Metrics
            existing.MachineHealth = updated.MachineHealth;
            existing.CurrentMeterHours = updated.CurrentMeterHours;
            existing.TotalCapacityUnits = updated.TotalCapacityUnits;
            existing.UnitsProduced = updated.UnitsProduced;

            // GL Accounts Overrides
            existing.AssetAccountId = updated.AssetAccountId;
            existing.AccumulatedDepreciationAccountId = updated.AccumulatedDepreciationAccountId;
            existing.DepreciationExpenseAccountId = updated.DepreciationExpenseAccountId;
            existing.GainLossDisposalAccountId = updated.GainLossDisposalAccountId;

            existing.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    // Log Maintenance Ticket / Service Record
    public bool LogAssetMaintenance(Guid assetId, AssetMaintenanceRecord record, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var asset = _fixedAssets.FirstOrDefault(a => a.Id == assetId);
            if (asset == null) { error = "Asset not found."; return false; }

            record.Id = Guid.NewGuid();
            record.AssetId = assetId;
            record.CreatedAt = DateTime.UtcNow;
            asset.MaintenanceHistory.Add(record);
            asset.LastMaintenanceDate = record.Date;
            if (record.NextServiceDueDate.HasValue)
            {
                asset.NextMaintenanceDueDate = record.NextServiceDueDate.Value;
            }
            if (record.MaintenanceType == MaintenanceType.BreakdownRepair && asset.MachineHealth == MachineStatus.Breakdown)
            {
                asset.MachineHealth = MachineStatus.Operating;
                asset.Status = AssetStatus.Active;
            }
            asset.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    // Transfer Asset across Factory Plants / Branches
    public bool TransferAsset(Guid assetId, AssetTransferRecord transfer, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var asset = _fixedAssets.FirstOrDefault(a => a.Id == assetId);
            if (asset == null) { error = "Asset not found."; return false; }

            transfer.Id = Guid.NewGuid();
            transfer.AssetId = assetId;
            transfer.FromLocation = asset.Location;
            transfer.FromWorkCenter = asset.WorkCenterName;
            transfer.CreatedAt = DateTime.UtcNow;

            asset.TransferHistory.Add(transfer);
            asset.Location = transfer.ToLocation;
            if (!string.IsNullOrWhiteSpace(transfer.ToWorkCenter))
            {
                asset.WorkCenterName = transfer.ToWorkCenter;
            }
            asset.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    // Update Factory Machine Health & Meter Runtime Hours
    public bool UpdateMachineStatus(Guid assetId, MachineStatus status, decimal meterHours, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var asset = _fixedAssets.FirstOrDefault(a => a.Id == assetId);
            if (asset == null) { error = "Asset not found."; return false; }

            asset.MachineHealth = status;
            if (meterHours > 0) asset.CurrentMeterHours = meterHours;

            if (status == MachineStatus.Breakdown || status == MachineStatus.UnderMaintenance)
            {
                asset.Status = AssetStatus.UnderMaintenance;
            }
            else if (status == MachineStatus.Operating || status == MachineStatus.InProduction || status == MachineStatus.Idle)
            {
                asset.Status = AssetStatus.Active;
            }

            asset.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    // Fixed Asset Depreciation (posts double-entry GL journal with MOH / OPEX smart allocation)
    public bool RunDepreciation(Guid assetId, Guid? depreciationExpenseAccountId, Guid? accumulatedDepreciationAccountId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var asset = _fixedAssets.FirstOrDefault(a => a.Id == assetId);
            if (asset == null) { error = "Asset not found."; return false; }
            if (asset.Status != AssetStatus.Active && asset.Status != AssetStatus.UnderMaintenance)
            {
                error = "Asset is not active for depreciation.";
                return false;
            }

            // Route expense to Manufacturing Overhead (MOH) for plant machinery or Admin OPEX for office assets
            var defaultExpenseKey = asset.CostAllocation == DepreciationAllocation.ManufacturingOverhead 
                ? "Manufacturing Overhead" 
                : "Depreciation Expense";

            var expAccId = (depreciationExpenseAccountId.HasValue && depreciationExpenseAccountId.Value != Guid.Empty) 
                ? depreciationExpenseAccountId.Value 
                : (asset.DepreciationExpenseAccountId ?? GetMappedAccount(defaultExpenseKey));

            var accumAccId = (accumulatedDepreciationAccountId.HasValue && accumulatedDepreciationAccountId.Value != Guid.Empty) 
                ? accumulatedDepreciationAccountId.Value 
                : (asset.AccumulatedDepreciationAccountId ?? GetMappedAccount("Accumulated Depreciation"));

            if (expAccId == Guid.Empty || accumAccId == Guid.Empty)
            {
                error = "Depreciation Expense or Accumulated Depreciation account is not mapped. Configure it under System Account Mapping.";
                return false;
            }

            decimal monthlyDepreciation = 0m;
            if (asset.DepreciationMethod == DepreciationMethod.DecliningBalance)
            {
                var annualRate = (1.0m / asset.UsefulLifeYears) * 1.5m; // 150% declining balance
                monthlyDepreciation = Math.Round((asset.NetBookValue * annualRate) / 12m, 2);
            }
            else
            {
                // Straight-Line: (Cost - Salvage) / UsefulLife / 12 per month
                var annualDepreciation = (asset.PurchasePrice - asset.SalvageValue) / asset.UsefulLifeYears;
                monthlyDepreciation = Math.Round(annualDepreciation / 12m, 2);
            }

            if (monthlyDepreciation <= 0) { error = "No depreciation remaining to post."; return false; }
            var remainingDepreciable = (asset.PurchasePrice - asset.SalvageValue) - asset.AccumulatedDepreciation;
            if (monthlyDepreciation > remainingDepreciable)
            {
                monthlyDepreciation = remainingDepreciable;
                asset.Status = AssetStatus.Depreciated;
            }

            asset.AccumulatedDepreciation += monthlyDepreciation;
            asset.UpdatedAt = DateTime.UtcNow;

            // Post double-entry journal: Dr Depreciation Expense (or MOH) / Cr Accumulated Depreciation
            var journalEntry = new JournalEntry
            {
                Date = DateOnly.FromDateTime(DateTime.Today),
                Reference = $"DEP-{asset.AssetTag}",
                Description = $"Monthly depreciation for {asset.Name} ({asset.CostAllocation})",
                TransactionType = TransactionType.Depreciation,
                CompanyId = asset.CompanyId,
                Lines =
                [
                    new JournalLine(expAccId, monthlyDepreciation, 0, $"Depreciation ({asset.CostAllocation}): {asset.Name}", null, null, 1, asset.CompanyId),
                    new JournalLine(accumAccId, 0, monthlyDepreciation, $"Accum. Depr: {asset.Name}", null, null, 1, asset.CompanyId)
                ]
            };
            journalEntry.Status = JournalStatus.Posted;
            _entries.Add(journalEntry);
            Persist();
            return true;
        }
    }

    // Batch Depreciation Run — processes all active assets for one month
    public bool RunBatchDepreciation(DateOnly? asOfDate, out List<DepreciationRunResult> results, out string? error)
    {
        results = new List<DepreciationRunResult>();
        error = null;
        lock (_lock)
        {
            var adminExpAccId = GetMappedAccount("Depreciation Expense");
            var mohExpAccId = GetMappedAccount("Manufacturing Overhead");
            var accumAccId = GetMappedAccount("Accumulated Depreciation");
            if (adminExpAccId == Guid.Empty || accumAccId == Guid.Empty)
            {
                error = "Depreciation Expense or Accumulated Depreciation account is not mapped. Configure it under Administration → Chart of Accounts Mapping.";
                return false;
            }

            var runDate = asOfDate ?? DateOnly.FromDateTime(DateTime.Today);
            var activeAssets = _fixedAssets.Where(a => a.Status == AssetStatus.Active || a.Status == AssetStatus.UnderMaintenance).ToList();

            if (activeAssets.Count == 0)
            {
                error = "No active assets found to depreciate.";
                return false;
            }

            foreach (var asset in activeAssets)
            {
                var expAccId = asset.CostAllocation == DepreciationAllocation.ManufacturingOverhead && mohExpAccId != Guid.Empty
                    ? mohExpAccId
                    : (asset.DepreciationExpenseAccountId ?? adminExpAccId);

                decimal monthlyDepreciation = 0m;
                if (asset.DepreciationMethod == DepreciationMethod.DecliningBalance)
                {
                    var annualRate = (1.0m / asset.UsefulLifeYears) * 1.5m;
                    monthlyDepreciation = Math.Round((asset.NetBookValue * annualRate) / 12m, 2);
                }
                else
                {
                    var annualDepreciation = (asset.PurchasePrice - asset.SalvageValue) / asset.UsefulLifeYears;
                    monthlyDepreciation = Math.Round(annualDepreciation / 12m, 2);
                }

                if (monthlyDepreciation <= 0)
                {
                    results.Add(new DepreciationRunResult(asset.Id, asset.AssetTag, asset.Name, 0, "No depreciation remaining", asset.PurchasePrice, asset.AccumulatedDepreciation, asset.NetBookValue, "61300"));
                    continue;
                }

                var remainingDepreciable = (asset.PurchasePrice - asset.SalvageValue) - asset.AccumulatedDepreciation;
                if (monthlyDepreciation > remainingDepreciable)
                {
                    monthlyDepreciation = remainingDepreciable;
                    asset.Status = AssetStatus.Depreciated;
                }

                asset.AccumulatedDepreciation += monthlyDepreciation;
                asset.UpdatedAt = DateTime.UtcNow;

                var expAcc = Find(expAccId);
                var journalEntry = new JournalEntry
                {
                    Date = runDate,
                    Reference = $"DEP-{asset.AssetTag}",
                    Description = $"Monthly depreciation for {asset.Name} ({asset.CostAllocation})",
                    TransactionType = TransactionType.Depreciation,
                    CompanyId = asset.CompanyId,
                    Lines =
                    [
                        new JournalLine(expAccId, monthlyDepreciation, 0, $"Depreciation: {asset.Name}", null, null, 1, asset.CompanyId),
                        new JournalLine(accumAccId, 0, monthlyDepreciation, $"Accum. Depr: {asset.Name}", null, null, 1, asset.CompanyId)
                    ],
                    Status = JournalStatus.Posted
                };
                _entries.Add(journalEntry);

                results.Add(new DepreciationRunResult(
                    asset.Id, asset.AssetTag, asset.Name, monthlyDepreciation, "Posted",
                    asset.PurchasePrice, asset.AccumulatedDepreciation, asset.NetBookValue,
                    expAcc?.Code ?? "61300"
                ));
            }

            Persist();
            return true;
        }
    }
    
    // ─── Estimates & Quotes ───────────────────────────────────────────────────
    public bool CreateEstimate(EstimateRequest request, out Estimate? estimate, out string? error)
    {
        error = null; estimate = null;
        lock (_lock)
        {
            if (FindCustomer(request.CustomerId) == null) { error = "Customer not found."; return false; }
            var nextSeq = _estimates.Count + 1;
            var number = !string.IsNullOrWhiteSpace(request.EstimateNumber)
                ? request.EstimateNumber
                : $"EST-{nextSeq:D5}";
            estimate = new Estimate
            {
                EstimateNumber = number,
                CustomerId = request.CustomerId,
                EstimateDate = request.EstimateDate,
                ExpiryDate = request.ExpiryDate,
                Reference = request.Reference,
                Notes = request.Notes,
                Terms = request.Terms,
                CompanyId = request.CompanyId,
                Lines = request.Lines.Select(l => new EstimateLine
                {
                    ProductId = l.ProductId,
                    Description = l.Description,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    DiscountType = l.DiscountType,
                    DiscountValue = l.DiscountValue,
                    TaxCodeId = l.TaxCodeId,
                    TaxPercent = l.TaxPercent
                }).ToList()
            };
            _estimates.Add(estimate);
            Persist();
            return true;
        }
    }

    public bool UpdateEstimateStatus(Guid id, EstimateStatus status, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var estimate = _estimates.FirstOrDefault(e => e.Id == id);
            if (estimate == null) { error = "Estimate not found."; return false; }
            estimate.Status = status;
            estimate.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool ConvertEstimateToInvoice(Guid estimateId, DateOnly invoiceDate, DateOnly dueDate, out SalesInvoice? invoice, out string? error)
    {
        error = null; invoice = null;
        lock (_lock)
        {
            var estimate = _estimates.FirstOrDefault(e => e.Id == estimateId);
            if (estimate == null) { error = "Estimate not found."; return false; }
            if (estimate.Status == EstimateStatus.Invoiced) { error = "This estimate has already been converted to an invoice."; return false; }

            var invoiceRequest = new SalesInvoiceRequest(
                InvoiceNumber: null,
                CustomerId: estimate.CustomerId,
                InvoiceDate: invoiceDate,
                DueDate: dueDate,
                Reference: estimate.EstimateNumber,
                Notes: estimate.Notes,
                Lines: estimate.Lines.Select(l => new SalesInvoiceLineRequest(
                    ProductId: l.ProductId,
                    Description: l.Description,
                    Quantity: l.Quantity,
                    UnitPrice: l.UnitPrice,
                    DiscountAmount: l.DiscountAmount,
                    TaxCodeId: l.TaxCodeId,
                    TaxAmount: l.TaxAmount
                )).ToList(),
                CompanyId: estimate.CompanyId
            );

            if (!CreateSalesInvoice(invoiceRequest, out invoice, out error)) return false;

            estimate.Status = EstimateStatus.Invoiced;
            estimate.ConvertedToInvoiceId = invoice!.Id;
            estimate.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    // ─── Sales Orders ─────────────────────────────────────────────────────────
    public string NextSalesOrderNumber()
    {
        var numbers = _salesOrders.Select(so => so.OrderNumber).Where(n => n.StartsWith("SO-") && int.TryParse(n[3..], out _)).Select(n => int.Parse(n[3..])).DefaultIfEmpty(0);
        return $"SO-{(numbers.Max() + 1):D4}";
    }

    public bool CreateSalesOrder(SalesOrderRequest request, out SalesOrder order, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var customer = _customers.FirstOrDefault(c => c.Id == request.CustomerId);
            if (customer == null) { error = "Customer not found."; order = null!; return false; }

            order = new SalesOrder
            {
                OrderNumber = string.IsNullOrWhiteSpace(request.OrderNumber) ? NextSalesOrderNumber() : request.OrderNumber.Trim(),
                CustomerId = request.CustomerId,
                OrderDate = request.OrderDate,
                ExpectedDeliveryDate = request.ExpectedDeliveryDate,
                Reference = request.Reference,
                Notes = request.Notes,
                Terms = request.Terms,
                Lines = request.Lines.Select(l => new SalesOrderLine
                {
                    ProductId = l.ProductId,
                    Description = l.Description,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    DiscountAmount = l.DiscountAmount,
                    TaxCodeId = l.TaxCodeId,
                    TaxAmount = l.TaxAmount
                }).ToList(),
                CompanyId = request.CompanyId,
                Status = SalesOrderStatus.Draft
            };

            _salesOrders.Add(order);
            Persist();
            return true;
        }
    }

    public bool UpdateSalesOrderStatus(Guid orderId, SalesOrderStatus status, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var order = _salesOrders.FirstOrDefault(so => so.Id == orderId);
            if (order == null) { error = "Sales Order not found."; return false; }
            order.Status = status;
            order.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool ConvertSalesOrderToInvoice(Guid orderId, out SalesInvoice? invoice, out string? error)
    {
        error = null;
        invoice = null;
        lock (_lock)
        {
            var order = _salesOrders.FirstOrDefault(so => so.Id == orderId);
            if (order == null) { error = "Sales Order not found."; return false; }
            if (order.Status == SalesOrderStatus.Cancelled) { error = "Cannot convert a cancelled order to an invoice."; return false; }
            if (order.ConvertedToInvoiceId.HasValue) { error = "Sales Order has already been converted to an invoice."; return false; }

            // Generate next invoice number
            var invoiceNumbers = _salesInvoices.Select(i => i.InvoiceNumber).Where(n => n.StartsWith("INV-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
            string invoiceNum = $"INV-{(invoiceNumbers.Max() + 1):D4}";

            invoice = new SalesInvoice
            {
                InvoiceNumber = invoiceNum,
                CustomerId = order.CustomerId,
                InvoiceDate = DateOnly.FromDateTime(DateTime.Today),
                DueDate = DateOnly.FromDateTime(DateTime.Today.AddDays(30)),
                Reference = order.OrderNumber,
                Notes = order.Notes,
                Status = SalesInvoiceStatus.Draft,
                Lines = order.Lines.Select(l => new SalesInvoiceLine
                {
                    ProductId = l.ProductId,
                    Description = l.Description,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    DiscountAmount = l.DiscountAmount,
                    TaxCodeId = l.TaxCodeId,
                    TaxAmount = l.TaxAmount
                }).ToList(),
                CompanyId = order.CompanyId
            };

            _salesInvoices.Add(invoice);
            
            // Mark Sales Order as Invoiced and link
            order.Status = SalesOrderStatus.Invoiced;
            order.ConvertedToInvoiceId = invoice.Id;
            order.UpdatedAt = DateTime.UtcNow;

            Persist();
            return true;
        }
    }

    public string NextSalesInvoiceNumber()
    {
        var numbers = _salesInvoices.Select(i => i.InvoiceNumber)
            .Where(n => !string.IsNullOrEmpty(n) && n.StartsWith("INV-") && n.Length <= 10 && int.TryParse(n[4..], out _))
            .Select(n => int.Parse(n[4..]))
            .DefaultIfEmpty(0);
        return $"INV-{(numbers.Max() + 1):D5}";
    }

    public bool CreateSalesInvoice(SalesInvoiceRequest request, out SalesInvoice? invoice, out string? error)
    {
        error = null; invoice = null;
        if (request.Lines == null || request.Lines.Count == 0) { error = "Invoice must have at least one line."; return false; }
        lock (_lock)
        {
            var customer = FindCustomer(request.CustomerId) ?? _customers.FirstOrDefault(c => request.CompanyId == null || c.CompanyId == request.CompanyId) ?? _customers.FirstOrDefault();
            if (customer == null)
            {
                customer = new Customer { Id = request.CustomerId != Guid.Empty ? request.CustomerId : Guid.NewGuid(), CustomerNumber = NextCustomerNumber(), Name = "Valued Customer", CompanyId = request.CompanyId };
                _customers.Add(customer);
            }

            var number = (!string.IsNullOrWhiteSpace(request.InvoiceNumber) && !request.InvoiceNumber.StartsWith("INV-202"))
                ? request.InvoiceNumber
                : NextSalesInvoiceNumber();
            invoice = new SalesInvoice
            {
                InvoiceNumber = number,
                CustomerId = customer.Id,
                InvoiceDate = request.InvoiceDate,
                DueDate = request.DueDate,
                Reference = request.Reference ?? number,
                Notes = request.Notes,
                CompanyId = request.CompanyId,
                Status = SalesInvoiceStatus.Draft,
                Lines = request.Lines.Select(l => new SalesInvoiceLine
                {
                    ProductId = l.ProductId,
                    Description = l.Description,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    DiscountAmount = l.DiscountAmount,
                    TaxCodeId = l.TaxCodeId,
                    TaxAmount = l.TaxAmount
                }).ToList()
            };
            _salesInvoices.Add(invoice);
            Persist();
            return true;
        }
    }

    // ─── Credit Notes ────────────────────────────────────────────────────────
    public string NextCreditNoteNumber()
    {
        var numbers = _creditNotes.Select(cn => cn.CreditNoteNumber).Where(n => n.StartsWith("CN-") && int.TryParse(n[3..], out _)).Select(n => int.Parse(n[3..])).DefaultIfEmpty(0);
        return $"CN-{(numbers.Max() + 1):D5}";
    }

    public bool CreateCreditNote(CreditNoteRequest request, out CreditNote creditNote, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var customer = _customers.FirstOrDefault(c => c.Id == request.CustomerId);
            if (customer == null) { error = "Customer not found."; creditNote = null!; return false; }

            if (request.OriginalInvoiceId.HasValue)
            {
                var invoice = _salesInvoices.FirstOrDefault(i => i.Id == request.OriginalInvoiceId.Value);
                if (invoice == null) { error = "Original invoice not found."; creditNote = null!; return false; }
                if (invoice.CustomerId != request.CustomerId) { error = "Customer mismatch with original invoice."; creditNote = null!; return false; }
            }

            creditNote = new CreditNote
            {
                CreditNoteNumber = string.IsNullOrWhiteSpace(request.CreditNoteNumber) ? NextCreditNoteNumber() : request.CreditNoteNumber.Trim(),
                CustomerId = request.CustomerId,
                OriginalInvoiceId = request.OriginalInvoiceId,
                CreditNoteDate = request.CreditNoteDate,
                Reference = request.Reference,
                Notes = request.Notes,
                Lines = request.Lines.Select(l => new CreditNoteLine
                {
                    ProductId = l.ProductId,
                    Description = l.Description,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    DiscountAmount = l.DiscountAmount,
                    TaxCodeId = l.TaxCodeId,
                    TaxAmount = l.TaxAmount
                }).ToList(),
                CompanyId = request.CompanyId,
                Status = CreditNoteStatus.Draft
            };

            _creditNotes.Add(creditNote);
            Persist();
            return true;
        }
    }

    public bool PostCreditNote(Guid creditNoteId, Guid? arAccountId, Guid? revenueAccountId, Guid? taxLiabilityAccountId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var creditNote = _creditNotes.FirstOrDefault(cn => cn.Id == creditNoteId);
            if (creditNote == null) { error = "Credit Note not found."; return false; }
            if (creditNote.Status != CreditNoteStatus.Draft) { error = "Only draft credit notes can be posted."; return false; }

            // Centralized Posting Engine resolution
            Guid resolvedAr = arAccountId ?? GetMappedAccount("Customer Receivables");
            Guid resolvedRev = revenueAccountId ?? GetMappedAccount("Sales");
            Guid? resolvedTax = taxLiabilityAccountId;
            if (!resolvedTax.HasValue && creditNote.TaxTotal > 0)
            {
                var taxId = GetMappedAccount("Taxes");
                if (taxId != Guid.Empty) resolvedTax = taxId;
            }

            // Validate Resolved Accounts are Leaf Posting and Active
            var arAcc = Find(resolvedAr);
            if (arAcc == null) { error = "Customer Receivables account is not mapped or invalid."; return false; }
            if (!arAcc.IsPosting || arAcc.Status == AccountStatus.Inactive)
            {
                error = $"Customer Receivables account {arAcc.Code} - {arAcc.Name} is not a valid posting account or is inactive.";
                return false;
            }

            var revAcc = Find(resolvedRev);
            if (revAcc == null) { error = "Sales Revenue account is not mapped or invalid."; return false; }
            if (!revAcc.IsPosting || revAcc.Status == AccountStatus.Inactive)
            {
                error = $"Sales Revenue account {revAcc.Code} - {revAcc.Name} is not a valid posting account or is inactive.";
                return false;
            }

            if (resolvedTax.HasValue)
            {
                var taxAcc = Find(resolvedTax.Value);
                if (taxAcc == null) { error = "Tax Payable account is invalid."; return false; }
                if (!taxAcc.IsPosting || taxAcc.Status == AccountStatus.Inactive)
                {
                    error = $"Tax Payable account {taxAcc.Code} - {taxAcc.Name} is not a valid posting account or is inactive.";
                    return false;
                }
            }

            // 1. Post Credit Note Journal:
            // Debit Sales Revenue (resolvedRev) with SubTotal - DiscountTotal
            // Debit Taxes Payable (resolvedTax) with TaxTotal (if tax > 0)
            // Credit Customer Receivables (resolvedAr) with TotalAmount
            var journalLines = new List<JournalLine>();

            var revenueTotal = creditNote.SubTotal - creditNote.DiscountTotal;
            journalLines.Add(new JournalLine(resolvedRev, revenueTotal, 0, $"Revenue Return: {creditNote.CreditNoteNumber}", null, null, 1, creditNote.CompanyId));

            if (creditNote.TaxTotal > 0 && resolvedTax.HasValue)
                journalLines.Add(new JournalLine(resolvedTax.Value, creditNote.TaxTotal, 0, $"Tax Return: {creditNote.CreditNoteNumber}", null, null, 1, creditNote.CompanyId));

            journalLines.Add(new JournalLine(resolvedAr, 0, creditNote.TotalAmount, $"Customer Credit: {creditNote.CreditNoteNumber}", null, null, 1, creditNote.CompanyId));

            var journal = new JournalEntry
            {
                Date = creditNote.CreditNoteDate,
                Reference = creditNote.CreditNoteNumber,
                Description = $"Credit note to customer {_customers.FirstOrDefault(c => c.Id == creditNote.CustomerId)?.Name ?? creditNote.CustomerId.ToString()}",
                TransactionType = TransactionType.Sales,
                CompanyId = creditNote.CompanyId,
                Lines = journalLines,
                Status = JournalStatus.Posted
            };

            _entries.Add(journal);

            // 2. Reduce the original invoice balance if linked
            if (creditNote.OriginalInvoiceId.HasValue)
            {
                var invoice = _salesInvoices.FirstOrDefault(i => i.Id == creditNote.OriginalInvoiceId.Value);
                if (invoice != null)
                {
                    invoice.AmountPaid += creditNote.TotalAmount;
                    if (invoice.AmountDue <= 0)
                    {
                        invoice.Status = SalesInvoiceStatus.Paid;
                    }
                    else
                    {
                        invoice.Status = SalesInvoiceStatus.PartiallyPaid;
                    }
                }
            }

            creditNote.Status = CreditNoteStatus.Posted;
            creditNote.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public void ExecuteJournalReversal(string documentReference, string reversalPrefix, string reversalDescription, Guid? companyId, DateOnly? reversalDate = null)
    {
        var revRef = $"{reversalPrefix}-{documentReference}";
        if (_entries.Any(e => e.Reference == revRef)) return;

        var postedEntries = _entries.Where(e => e.Reference == documentReference && e.Status == JournalStatus.Posted).ToList();
        foreach (var origEntry in postedEntries)
        {
            var revLines = origEntry.Lines.Select(l => new JournalLine(
                l.AccountId,
                l.Credit, // Original Credit becomes Debit
                l.Debit,  // Original Debit becomes Credit
                $"Reversal: {l.Memo}",
                l.Comment,
                l.CurrencyCode,
                l.ExchangeRate,
                l.CompanyId
            )).ToList();

            var revJournal = new JournalEntry
            {
                Date = reversalDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
                Reference = $"{reversalPrefix}-{documentReference}",
                Description = $"{reversalDescription} ({documentReference})",
                TransactionType = origEntry.TransactionType,
                CompanyId = companyId ?? origEntry.CompanyId,
                Lines = revLines,
                Status = JournalStatus.Posted
            };
            _entries.Add(revJournal);
            origEntry.Status = JournalStatus.Reversed;
        }
    }

    public bool VoidCreditNote(Guid creditNoteId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var creditNote = _creditNotes.FirstOrDefault(cn => cn.Id == creditNoteId);
            if (creditNote == null) { error = "Credit Note not found."; return false; }
            if (creditNote.Status == CreditNoteStatus.Void) { error = "Credit Note is already voided."; return false; }

            // 1. Execute GAAP Journal Reversal
            if (creditNote.Status == CreditNoteStatus.Posted)
            {
                ExecuteJournalReversal(creditNote.CreditNoteNumber, "REV", $"Reversal of voided Credit Note {creditNote.CreditNoteNumber}", creditNote.CompanyId);
            }

            // 2. Restore invoice balance if originally linked
            if (creditNote.OriginalInvoiceId.HasValue)
            {
                var invoice = _salesInvoices.FirstOrDefault(i => i.Id == creditNote.OriginalInvoiceId.Value);
                if (invoice != null)
                {
                    invoice.AmountPaid = Math.Max(0, invoice.AmountPaid - creditNote.TotalAmount);
                    if (invoice.AmountPaid <= 0)
                    {
                        invoice.Status = SalesInvoiceStatus.Draft;
                    }
                    else
                    {
                        invoice.Status = SalesInvoiceStatus.PartiallyPaid;
                    }
                }
            }

            creditNote.Status = CreditNoteStatus.Void;
            creditNote.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool VoidCustomerPayment(Guid paymentId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var payment = _customerPayments.FirstOrDefault(p => p.Id == paymentId);
            if (payment == null) { error = "Customer payment not found."; return false; }
            if (payment.Status == CustomerPaymentStatus.Void) { error = "Payment is already voided."; return false; }

            // 1. Execute GAAP Journal Reversal
            if (payment.Status == CustomerPaymentStatus.Posted)
            {
                ExecuteJournalReversal(payment.ReceiptNumber, "REV", $"Reversal of voided Customer Receipt {payment.ReceiptNumber}", payment.CompanyId);
            }

            // 2. Restore linked invoice if any
            if (payment.InvoiceId.HasValue)
            {
                var invoice = _salesInvoices.FirstOrDefault(i => i.Id == payment.InvoiceId.Value);
                if (invoice != null)
                {
                    invoice.AmountPaid = Math.Max(0, invoice.AmountPaid - payment.Amount);
                    if (invoice.AmountPaid <= 0)
                    {
                        invoice.Status = SalesInvoiceStatus.Sent;
                    }
                    else
                    {
                        invoice.Status = SalesInvoiceStatus.PartiallyPaid;
                    }
                }
            }

            payment.Status = CustomerPaymentStatus.Void;
            payment.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool VoidVendorPayment(Guid paymentId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var payment = _vendorPayments.FirstOrDefault(p => p.Id == paymentId);
            if (payment == null) { error = "Vendor payment not found."; return false; }
            if (payment.Status == VendorPaymentStatus.Void) { error = "Payment is already voided."; return false; }

            // 1. Execute GAAP Journal Reversal
            if (payment.Status == VendorPaymentStatus.Posted)
            {
                ExecuteJournalReversal(payment.PaymentNumber, "REV", $"Reversal of voided Vendor Payment {payment.PaymentNumber}", payment.CompanyId);
            }

            // 2. Restore linked vendor bill if any
            if (payment.BillId.HasValue)
            {
                var bill = _vendorBills.FirstOrDefault(b => b.Id == payment.BillId.Value);
                if (bill != null)
                {
                    bill.AmountPaid = Math.Max(0, bill.AmountPaid - payment.Amount);
                    if (bill.AmountPaid <= 0)
                    {
                        bill.Status = VendorBillStatus.Open;
                    }
                    else
                    {
                        bill.Status = VendorBillStatus.PartiallyPaid;
                    }
                }
            }

            payment.Status = VendorPaymentStatus.Void;
            payment.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool VoidVendorBill(Guid billId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var bill = _vendorBills.FirstOrDefault(b => b.Id == billId);
            if (bill == null) { error = "Vendor bill not found."; return false; }
            if (bill.Status == VendorBillStatus.Void) { error = "Bill is already voided."; return false; }
            if (bill.AmountPaid > 0) { error = "Cannot void a bill with existing payments. Void the payments first."; return false; }

            // 1. Execute GAAP Journal Reversal if posted
            if (bill.Status != VendorBillStatus.Draft)
            {
                ExecuteJournalReversal(bill.BillNumber, "REV", $"Reversal of voided Vendor Bill {bill.BillNumber}", bill.CompanyId);
            }

            bill.Status = VendorBillStatus.Void;
            bill.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool VoidFundTransfer(Guid transferId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var transfer = _fundTransfers.FirstOrDefault(t => t.Id == transferId);
            if (transfer == null) { error = "Fund transfer not found."; return false; }
            if (transfer.Status == FundTransferStatus.Void) { error = "Transfer is already voided."; return false; }

            // 1. Execute GAAP Journal Reversal if posted
            if (transfer.Status == FundTransferStatus.Posted)
            {
                ExecuteJournalReversal(transfer.TransferNumber, "REV", $"Reversal of voided Fund Transfer {transfer.TransferNumber}", transfer.CompanyId);
            }

            transfer.Status = FundTransferStatus.Void;
            Persist();
            return true;
        }
    }

    public bool VoidVoucher(Guid voucherId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var voucher = _vouchers.FirstOrDefault(v => v.Id == voucherId);
            if (voucher == null) { error = "Voucher not found."; return false; }
            if (voucher.Status == "Void" || voucher.Status == "Cancelled") { error = "Voucher is already voided."; return false; }

            // 1. Execute GAAP Journal Reversal if posted
            if (voucher.Status == "Posted")
            {
                ExecuteJournalReversal(voucher.VoucherNumber, "REV", $"Reversal of voided Voucher {voucher.VoucherNumber}", voucher.CompanyId);
            }

            voucher.Status = "Void";
            Persist();
            return true;
        }
    }

    public bool PostSalesInvoice(Guid invoiceId, Guid? arAccountId, Guid? revenueAccountId, Guid? taxLiabilityAccountId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var invoice = _salesInvoices.FirstOrDefault(i => i.Id == invoiceId);
            if (invoice == null) { error = "Invoice not found."; return false; }
            if (invoice.Status != SalesInvoiceStatus.Draft) { error = "Only draft invoices can be posted."; return false; }

            // Centralized Posting Engine resolution
            Guid resolvedAr = arAccountId ?? GetMappedAccount("Customer Receivables");
            Guid resolvedRev = revenueAccountId ?? GetMappedAccount("Sales");
            Guid? resolvedTax = taxLiabilityAccountId;
            if (!resolvedTax.HasValue && invoice.TaxTotal > 0)
            {
                var taxId = GetMappedAccount("Taxes");
                if (taxId != Guid.Empty) resolvedTax = taxId;
            }

            // Validate Resolved Accounts are Leaf Posting and Active
            var arAcc = Find(resolvedAr);
            if (arAcc == null) { error = "Customer Receivables account is not mapped or invalid."; return false; }
            if (!arAcc.IsPosting || arAcc.Status == AccountStatus.Inactive)
            {
                error = $"Customer Receivables account {arAcc.Code} - {arAcc.Name} is not a valid posting account or is inactive.";
                return false;
            }

            var revAcc = Find(resolvedRev);
            if (revAcc == null) { error = "Sales Revenue account is not mapped or invalid."; return false; }
            if (!revAcc.IsPosting || revAcc.Status == AccountStatus.Inactive)
            {
                error = $"Sales Revenue account {revAcc.Code} - {revAcc.Name} is not a valid posting account or is inactive.";
                return false;
            }

            if (invoice.TaxTotal > 0)
            {
                if (!resolvedTax.HasValue)
                {
                    error = "Tax Payable account is not mapped or invalid. Configure it under System Account Mapping.";
                    return false;
                }
                var taxAcc = Find(resolvedTax.Value);
                if (taxAcc == null) { error = "Tax Payable account is invalid."; return false; }
                if (!taxAcc.IsPosting || taxAcc.Status == AccountStatus.Inactive)
                {
                    error = $"Tax Payable account {taxAcc.Code} - {taxAcc.Name} is not a valid posting account or is inactive.";
                    return false;
                }
            }

            // 1. Post AR Journal: Dr AR / Cr Revenue per product/service (+ Cr Tax Liability if applicable)
            var journalLines = new List<JournalLine>
            {
                new JournalLine(resolvedAr, invoice.TotalAmount, 0, $"AR: {invoice.InvoiceNumber}", null, null, 1, invoice.CompanyId)
            };

            var serviceRevId = GetMappedAccount("Service Revenue");
            var productRevId = GetMappedAccount("Sales");
            var discountAccId = GetMappedAccount("Sales Discount");

            var lineRevenueGroups = new Dictionary<Guid, decimal>();
            decimal totalDiscountGiven = 0;

            if (invoice.Lines != null && invoice.Lines.Count > 0)
            {
                foreach (var line in invoice.Lines)
                {
                    var grossLineTotal = line.LineTotal;
                    totalDiscountGiven += line.DiscountAmount;
                    Guid lineRevAcc = resolvedRev;

                    if (line.ProductId.HasValue)
                    {
                        var prod = FindProduct(line.ProductId.Value);
                        if (prod != null)
                        {
                            if (prod.IncomeAccountId.HasValue && prod.IncomeAccountId.Value != Guid.Empty)
                            {
                                lineRevAcc = prod.IncomeAccountId.Value;
                            }
                            else if (prod.Type == ProductType.Service && serviceRevId != Guid.Empty)
                            {
                                lineRevAcc = serviceRevId;
                            }
                            else if (prod.Type == ProductType.Physical && productRevId != Guid.Empty)
                            {
                                lineRevAcc = productRevId;
                            }
                        }
                    }

                    if (!lineRevenueGroups.ContainsKey(lineRevAcc))
                        lineRevenueGroups[lineRevAcc] = 0;
                    lineRevenueGroups[lineRevAcc] += grossLineTotal;
                }
            }
            else
            {
                var grossSubtotal = invoice.SubTotal;
                totalDiscountGiven = invoice.DiscountTotal;
                lineRevenueGroups[resolvedRev] = grossSubtotal;
            }

            foreach (var kvp in lineRevenueGroups)
            {
                var revAccObj = Find(kvp.Key);
                var accName = revAccObj?.Name ?? "Revenue";
                journalLines.Add(new JournalLine(kvp.Key, 0, kvp.Value, $"{accName}: {invoice.InvoiceNumber}", null, null, 1, invoice.CompanyId));
            }

            if (totalDiscountGiven > 0 && discountAccId != Guid.Empty)
            {
                var discAcc = Find(discountAccId);
                var discAccName = discAcc?.Name ?? "Sales Discounts";
                journalLines.Add(new JournalLine(discountAccId, totalDiscountGiven, 0, $"{discAccName}: {invoice.InvoiceNumber}", null, null, 1, invoice.CompanyId));
            }

            if (invoice.TaxTotal > 0 && resolvedTax.HasValue)
                journalLines.Add(new JournalLine(resolvedTax.Value, 0, invoice.TaxTotal, $"Tax: {invoice.InvoiceNumber}", null, null, 1, invoice.CompanyId));

            decimal debitSum = journalLines.Sum(l => l.Debit);
            decimal creditSum = journalLines.Sum(l => l.Credit);
            if (Math.Abs(debitSum - creditSum) > 0.001m)
            {
                error = $"Double-entry validation failed: Debits ({debitSum}) do not equal Credits ({creditSum}).";
                return false;
            }

            var journal = new JournalEntry
            {
                Date = invoice.InvoiceDate,
                Reference = invoice.InvoiceNumber,
                Description = $"Sales invoice to customer {_customers.FirstOrDefault(c => c.Id == invoice.CustomerId)?.Name ?? invoice.CustomerId.ToString()}",
                TransactionType = TransactionType.Sales,
                CompanyId = invoice.CompanyId,
                Lines = journalLines,
                Status = JournalStatus.Posted
            };
            _entries.Add(journal);

            // 2. Auto Stock-Out for Physical products & Post GAAP Perpetual COGS Journal
            if (!invoice.StockReduced && invoice.Lines != null)
            {
                var warehouse = _warehouses.FirstOrDefault(w => w.CompanyId == invoice.CompanyId) ?? _warehouses.FirstOrDefault();
                decimal totalCogs = 0m;
                foreach (var line in invoice.Lines)
                {
                    if (line.ProductId == null) continue;
                    var product = FindProduct(line.ProductId.Value);
                    if (product == null || product.Type != ProductType.Physical) continue;

                    var stockLevel = warehouse != null
                        ? _stockLevels.FirstOrDefault(s => s.ProductId == product.Id && s.WarehouseId == warehouse.Id)
                        : null;

                    if (stockLevel != null && stockLevel.QuantityOnHand >= line.Quantity)
                    {
                        var unitCost = stockLevel.MovingAverageCost > 0 ? stockLevel.MovingAverageCost : product.CostPrice;
                        stockLevel.QuantityOnHand -= line.Quantity;
                        product.QuantityOnHand -= line.Quantity;
                        totalCogs += line.Quantity * unitCost;

                        _stockTransactions.Add(new StockTransaction
                        {
                            Date = invoice.InvoiceDate,
                            ProductId = product.Id,
                            WarehouseId = warehouse!.Id,
                            Quantity = line.Quantity,
                            UnitCost = unitCost,
                            Type = StockTransactionType.Out,
                            Reference = invoice.InvoiceNumber,
                            CompanyId = invoice.CompanyId
                        });
                    }
                }

                if (totalCogs > 0)
                {
                    var cogsAccId = GetMappedAccount("Cost of Goods Sold");
                    var invAccId = GetMappedAccount("Inventory");
                    if (cogsAccId != Guid.Empty && invAccId != Guid.Empty)
                    {
                        _entries.Add(new JournalEntry
                        {
                            Date = invoice.InvoiceDate,
                            Reference = $"COGS-{invoice.InvoiceNumber}",
                            Description = $"Cost of goods sold for invoice {invoice.InvoiceNumber}",
                            TransactionType = TransactionType.Inventory,
                            CompanyId = invoice.CompanyId,
                            Lines =
                            [
                                new JournalLine(cogsAccId, totalCogs, 0, $"COGS: {invoice.InvoiceNumber}", null, null, 1, invoice.CompanyId),
                                new JournalLine(invAccId, 0, totalCogs, $"Relieve Inventory: {invoice.InvoiceNumber}", null, null, 1, invoice.CompanyId)
                            ],
                            Status = JournalStatus.Posted
                        });
                    }
                }

                invoice.StockReduced = true;
            }

            invoice.Status = SalesInvoiceStatus.Sent;
            invoice.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool UpdateSalesInvoice(Guid id, SalesInvoiceRequest request, out SalesInvoice? invoice, out string? error)
    {
        error = null; invoice = null;
        lock (_lock)
        {
            invoice = _salesInvoices.FirstOrDefault(i => i.Id == id);
            if (invoice == null) { error = "Invoice not found."; return false; }
            if (invoice.Status != SalesInvoiceStatus.Draft) { error = "Only draft invoices can be edited."; return false; }

            invoice.CustomerId = request.CustomerId;
            invoice.InvoiceDate = request.InvoiceDate;
            invoice.DueDate = request.DueDate;
            invoice.Reference = request.Reference;
            invoice.Notes = request.Notes;
            invoice.Lines = request.Lines?.Select(l => new SalesInvoiceLine
            {
                ProductId = l.ProductId,
                Description = l.Description,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                DiscountAmount = l.DiscountAmount,
                TaxAmount = l.TaxAmount,
                TaxCodeId = l.TaxCodeId
            }).ToList() ?? [];

            invoice.UpdatedAt = DateTime.UtcNow;

            Persist();
            return true;
        }
    }

    public bool UpdateSalesInvoiceStatus(Guid invoiceId, SalesInvoiceStatus status, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var invoice = _salesInvoices.FirstOrDefault(i => i.Id == invoiceId);
            if (invoice == null) { error = "Invoice not found."; return false; }

            // If cancelling / voiding a posted invoice, execute GAAP reversal journal and restore stock
            if ((status == SalesInvoiceStatus.Void || status == SalesInvoiceStatus.Draft) && invoice.Status != SalesInvoiceStatus.Draft && invoice.Status != SalesInvoiceStatus.Void)
            {
                // 1. Find all posted journal entries associated with this invoice (guard against duplicate reversal)
                var revRef = $"REV-{invoice.InvoiceNumber}";
                if (!_entries.Any(e => e.Reference == revRef))
                {
                    var postedEntries = _entries.Where(e => 
                        (e.Reference == invoice.InvoiceNumber || (!string.IsNullOrEmpty(invoice.Reference) && e.Reference == invoice.Reference)) && 
                        e.Status == JournalStatus.Posted &&
                        !e.Reference.StartsWith("REV-")
                    ).ToList();

                    var customerName = _customers.FirstOrDefault(c => c.Id == invoice.CustomerId)?.Name ?? "Customer";

                    foreach (var origEntry in postedEntries)
                    {
                        // Create reversing lines (swap debit and credit)
                        var revLines = origEntry.Lines.Select(l => new JournalLine(
                            l.AccountId,
                            l.Credit, // Original Credit becomes Debit
                            l.Debit,  // Original Debit becomes Credit
                            $"Reversal of {invoice.InvoiceNumber}: {l.Memo}",
                            $"Reverses original entry from {origEntry.Date:yyyy-MM-dd} for invoice {invoice.InvoiceNumber} ({customerName})",
                            l.CurrencyCode,
                            l.ExchangeRate,
                            l.CompanyId
                        )).ToList();

                        var revJournal = new JournalEntry
                        {
                            Date = DateOnly.FromDateTime(DateTime.UtcNow),
                            Reference = revRef,
                            Description = $"Cancellation Reversal of Sales Invoice {invoice.InvoiceNumber} (Customer: {customerName})",
                            TransactionType = TransactionType.Sales,
                            CompanyId = invoice.CompanyId,
                            Lines = revLines,
                            Status = JournalStatus.Posted
                        };
                        _entries.Add(revJournal);
                        origEntry.Status = JournalStatus.Reversed;
                    }
                }

                // 2. Restore Stock if it was reduced
                if (invoice.StockReduced)
                {
                    var warehouse = _warehouses.FirstOrDefault(w => w.CompanyId == invoice.CompanyId) ?? _warehouses.FirstOrDefault();
                    foreach (var line in invoice.Lines)
                    {
                        if (line.ProductId == null) continue;
                        var product = FindProduct(line.ProductId.Value);
                        if (product == null || product.Type != ProductType.Physical) continue;

                        var stockLevel = warehouse != null
                            ? _stockLevels.FirstOrDefault(s => s.ProductId == product.Id && s.WarehouseId == warehouse.Id)
                            : null;

                        if (stockLevel != null)
                        {
                            stockLevel.QuantityOnHand += line.Quantity;
                            product.QuantityOnHand += line.Quantity;

                            _stockTransactions.Add(new StockTransaction
                            {
                                Date = DateOnly.FromDateTime(DateTime.UtcNow),
                                ProductId = product.Id,
                                WarehouseId = warehouse!.Id,
                                Quantity = line.Quantity,
                                UnitCost = stockLevel.MovingAverageCost,
                                Type = StockTransactionType.In,
                                Reference = $"RESTORE-{invoice.InvoiceNumber}",
                                CompanyId = invoice.CompanyId
                            });
                        }
                    }
                    invoice.StockReduced = false;
                }
            }

            invoice.Status = status;
            invoice.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public bool CreateCompany(CompanyRequest request, out Company? company, out string? error)
    {
        company = null; error = null;
        if (string.IsNullOrWhiteSpace(request.Name)) { error = "Company name is required."; return false; }
        var name = request.Name.Trim();
        var code = request.Code?.Trim();
        var legalName = request.LegalName?.Trim();
        var type = request.Type ?? EntityType.Subsidiary;
        var country = !string.IsNullOrWhiteSpace(request.Country) ? request.Country.Trim() : "Pakistan";
        var state = request.State?.Trim();
        var currency = !string.IsNullOrWhiteSpace(request.CurrencyCode) ? request.CurrencyCode.Trim().ToUpperInvariant()
            : !string.IsNullOrWhiteSpace(request.FunctionalCurrency) ? request.FunctionalCurrency.Trim().ToUpperInvariant()
            : (country.ToLowerInvariant().Contains("pakistan") ? "PKR" : country.ToLowerInvariant().Contains("saudi") ? "SAR" : country.ToLowerInvariant().Contains("emirates") ? "AED" : country.ToLowerInvariant().Contains("canada") ? "CAD" : country.ToLowerInvariant().Contains("kingdom") || country.ToLowerInvariant() == "uk" ? "GBP" : "USD");
        
        company = new Company
        {
            Name = name,
            Code = code,
            LegalName = legalName,
            Type = type,
            ParentId = request.ParentId,
            Country = country,
            State = state,
            CurrencyCode = currency,
            TaxRegistrationNumber = request.TaxRegistrationNumber?.Trim(),
            Address = request.Address?.Trim(),
            City = request.City?.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            Website = request.Website?.Trim(),
            FiscalYearStartMonth = request.FiscalYearStartMonth ?? (country.ToLowerInvariant().Contains("pakistan") ? 7 : country.ToLowerInvariant().Contains("kingdom") ? 4 : 1),
            TaxAuthorityId = request.TaxAuthorityId
        };
        _companies.Add(company);

        // Auto-provision country-specific tax rules and authorities
        SeedCountryTaxPreset(country, company.Id);

        Persist();
        return true;
    }
    public bool UpdateCompany(Guid id, CompanyRequest request, out Company? company, out string? error)
    {
        company = _companies.FirstOrDefault(x => x.Id == id); error = null;
        if (company is null) { error = "Entity not found."; return false; }
        if (string.IsNullOrWhiteSpace(request.Name)) { error = "Company name is required."; return false; }
        var prevCountry = company.Country;
        company.Name = request.Name.Trim();
        company.Code = request.Code?.Trim();
        company.LegalName = request.LegalName?.Trim();
        company.Type = request.Type ?? company.Type;
        company.ParentId = request.ParentId;
        company.Country = !string.IsNullOrWhiteSpace(request.Country) ? request.Country.Trim() : company.Country;
        company.State = request.State?.Trim() ?? company.State;
        company.CurrencyCode = !string.IsNullOrWhiteSpace(request.CurrencyCode) ? request.CurrencyCode.Trim().ToUpperInvariant() : !string.IsNullOrWhiteSpace(request.FunctionalCurrency) ? request.FunctionalCurrency.Trim().ToUpperInvariant() : company.CurrencyCode;
        company.TaxRegistrationNumber = request.TaxRegistrationNumber?.Trim() ?? company.TaxRegistrationNumber;
        company.Address = request.Address?.Trim() ?? company.Address;
        company.City = request.City?.Trim() ?? company.City;
        company.Phone = request.Phone?.Trim() ?? company.Phone;
        company.Email = request.Email?.Trim() ?? company.Email;
        company.Website = request.Website?.Trim() ?? company.Website;
        company.FiscalYearStartMonth = request.FiscalYearStartMonth ?? company.FiscalYearStartMonth;
        company.TaxAuthorityId = request.TaxAuthorityId;
        company.UpdatedAt = DateTime.UtcNow;

        if (!string.Equals(prevCountry, company.Country, StringComparison.OrdinalIgnoreCase))
        {
            SeedCountryTaxPreset(company.Country, company.Id);
        }

        Persist(); return true;
    }
    public bool SetCompanyStatus(Guid id, bool active, out string? error) { var company = _companies.FirstOrDefault(x => x.Id == id); error = null; if (company is null) { error = "Entity not found."; return false; } company.Active = active; company.UpdatedAt = DateTime.UtcNow; Persist(); return true; }

    public bool PurgeCompanyData(Guid id, out string? error)
    {
        error = null;
        var company = _companies.FirstOrDefault(x => x.Id == id);
        if (company is null) { error = "Entity not found."; return false; }
        lock (_lock)
        {
            var ids = new HashSet<Guid>();
            void CollectChildren(Guid parentId)
            {
                foreach (var child in _companies.Where(x => x.ParentId == parentId))
                    if (ids.Add(child.Id)) CollectChildren(child.Id);
            }
            CollectChildren(id);
            ids.Add(id);

            var listFields = GetType().GetFields(BindingFlags.NonPublic | BindingFlags.Instance);
            foreach (var field in listFields)
            {
                if (field.GetValue(this) is not IList list) continue;
                var elementType = field.FieldType.IsGenericType ? field.FieldType.GetGenericArguments().FirstOrDefault() : null;
                if (elementType is null || elementType == typeof(Company)) continue;
                var companyIdProp = elementType.GetProperty("CompanyId");
                if (companyIdProp is null) continue;
                var toRemove = new List<object>();
                foreach (var item in list)
                {
                    if (item is null) continue;
                    var match = companyIdProp.GetValue(item) switch
                    {
                        Guid g => ids.Contains(g),
                        string s => Guid.TryParse(s, out var gs) && ids.Contains(gs),
                        _ => false
                    };
                    if (match) toRemove.Add(item);
                }
                foreach (var item in toRemove) list.Remove(item);
            }

            _intercompanyAllocations.RemoveAll(a => a.SourceCompanyId == id || a.Recipients.Any(r => r.CompanyId == id));

            var validEntryIds = _entries.Select(e => e.Id).ToHashSet();
            _journalEvents.RemoveAll(e => !validEntryIds.Contains(e.JournalEntryId));

            _companies.RemoveAll(x => ids.Contains(x.Id));
            Persist();
        }
        return true;
    }
    
    // ─── Tax Authorities ────────────────────────────────────────────────────────
    public TaxAuthority? FindTaxAuthority(Guid id) => _taxAuthorities.FirstOrDefault(x => x.Id == id);
    
    public bool CreateTaxAuthority(TaxAuthorityRequest request, out TaxAuthority? authority, out string? error)
    {
        authority = null; error = null;
        if (string.IsNullOrWhiteSpace(request.Name)) { error = "Authority name is required."; return false; }
        lock (_lock)
        {
            authority = new TaxAuthority
            {
                Name = request.Name.Trim(),
                Code = request.Code?.Trim(),
                Country = request.Country?.Trim(),
                State = request.State?.Trim(),
                RegistrationNumber = request.RegistrationNumber?.Trim(),
                LiabilityAccountId = request.LiabilityAccountId,
                InputTaxAccountId = request.InputTaxAccountId,
                NonRecoverableAccountId = request.NonRecoverableAccountId,
                WithholdingAccountId = request.WithholdingAccountId,
                SettlementAccountId = request.SettlementAccountId,
                FilingFrequency = request.FilingFrequency?.Trim() ?? "Quarterly",
                RemittanceDueDay = request.RemittanceDueDay ?? 20,
                Website = request.Website?.Trim(),
                CompanyId = request.CompanyId
            };
            _taxAuthorities.Add(authority);
            Persist();
            return true;
        }
    }

    public bool UpdateTaxAuthority(Guid id, TaxAuthorityRequest request, out TaxAuthority? authority, out string? error)
    {
        authority = null; error = null;
        lock (_lock)
        {
            authority = FindTaxAuthority(id);
            if (authority is null) { error = "Authority not found."; return false; }
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Authority name is required."; return false; }
            authority.Name = request.Name.Trim();
            authority.Code = request.Code?.Trim();
            authority.Country = request.Country?.Trim();
            authority.State = request.State?.Trim();
            authority.RegistrationNumber = request.RegistrationNumber?.Trim();
            authority.LiabilityAccountId = request.LiabilityAccountId;
            authority.InputTaxAccountId = request.InputTaxAccountId;
            authority.NonRecoverableAccountId = request.NonRecoverableAccountId;
            authority.WithholdingAccountId = request.WithholdingAccountId;
            authority.SettlementAccountId = request.SettlementAccountId;
            authority.FilingFrequency = request.FilingFrequency?.Trim() ?? authority.FilingFrequency;
            authority.RemittanceDueDay = request.RemittanceDueDay ?? authority.RemittanceDueDay;
            authority.Website = request.Website?.Trim() ?? authority.Website;
            authority.CompanyId = request.CompanyId ?? authority.CompanyId;
            Persist();
            return true;
        }
    }

    public bool DeleteTaxAuthority(Guid id, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var auth = FindTaxAuthority(id);
            if (auth is null) { error = "Authority not found."; return false; }
            if (_taxCodes.Any(c => c.TaxAuthorityId == id))
            {
                error = "Cannot delete authority that is currently referenced by tax codes.";
                return false;
            }
            _taxAuthorities.Remove(auth);
            Persist();
            return true;
        }
    }

    // ─── Tax Codes & Rates ──────────────────────────────────────────────────────
    public TaxCode? FindTaxCode(Guid id) => _taxCodes.FirstOrDefault(x => x.Id == id);

    public bool AddTaxRate(Guid taxCodeId, decimal percentage, DateOnly effectiveFrom, DateOnly? effectiveTo, out TaxRate? rate, out string? error)
    {
        rate = null; error = null;
        lock (_lock)
        {
            var code = FindTaxCode(taxCodeId);
            if (code is null) { error = "Tax code not found."; return false; }
            if (percentage < 0) { error = "Rate percentage cannot be negative."; return false; }
            rate = new TaxRate { TaxCodeId = taxCodeId, Percentage = percentage, EffectiveFrom = effectiveFrom, EffectiveTo = effectiveTo };
            code.Rates.Add(rate);
            _taxRates.Add(rate);
            Persist();
            return true;
        }
    }

    public bool CreateTaxCode(TaxCodeRequest request, out TaxCode? code, out string? error)
    {
        code = null; error = null;
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name)) { error = "Code and name are required."; return false; }
        if (FindTaxAuthority(request.TaxAuthorityId) == null) { error = "Invalid tax authority."; return false; }
        
        lock (_lock)
        {
            code = new TaxCode
            {
                Code = request.Code.Trim().ToUpperInvariant(),
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                TaxType = request.TaxType ?? TaxType.Standard,
                Scope = request.Scope ?? TaxScope.Both,
                TaxAuthorityId = request.TaxAuthorityId,
                JurisdictionId = request.JurisdictionId?.Trim() ?? "UK",
                DeductibilityPercentage = request.DeductibilityPercentage ?? 100m,
                IsCompound = request.IsCompound ?? false,
                IsActive = request.IsActive,
                CompanyId = request.CompanyId
            };
            foreach (var r in request.Rates)
            {
                var rate = new TaxRate { TaxCodeId = code.Id, Percentage = r.Percentage, EffectiveFrom = r.EffectiveFrom, EffectiveTo = r.EffectiveTo };
                code.Rates.Add(rate);
                _taxRates.Add(rate);
            }
            _taxCodes.Add(code);
            Persist();
            return true;
        }
    }

    public bool UpdateTaxCode(Guid id, TaxCodeRequest request, out TaxCode? code, out string? error)
    {
        code = null; error = null;
        lock (_lock)
        {
            code = FindTaxCode(id);
            if (code is null) { error = "Tax code not found."; return false; }
            if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name)) { error = "Code and name are required."; return false; }
            if (FindTaxAuthority(request.TaxAuthorityId) == null) { error = "Invalid tax authority."; return false; }

            code.Code = request.Code.Trim().ToUpperInvariant();
            code.Name = request.Name.Trim();
            code.Description = request.Description?.Trim();
            code.TaxType = request.TaxType ?? code.TaxType;
            code.Scope = request.Scope ?? code.Scope;
            code.TaxAuthorityId = request.TaxAuthorityId;
            code.JurisdictionId = request.JurisdictionId?.Trim() ?? code.JurisdictionId;
            code.DeductibilityPercentage = request.DeductibilityPercentage ?? code.DeductibilityPercentage;
            code.IsCompound = request.IsCompound ?? code.IsCompound;
            code.IsActive = request.IsActive;
            code.CompanyId = request.CompanyId ?? code.CompanyId;
            
            _taxRates.RemoveAll(x => x.TaxCodeId == id);
            code.Rates.Clear();
            foreach (var r in request.Rates)
            {
                var rate = new TaxRate { TaxCodeId = code.Id, Percentage = r.Percentage, EffectiveFrom = r.EffectiveFrom, EffectiveTo = r.EffectiveTo };
                code.Rates.Add(rate);
                _taxRates.Add(rate);
            }
            Persist();
            return true;
        }
    }

    public bool DeleteTaxCode(Guid id, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var code = FindTaxCode(id);
            if (code is null) { error = "Tax code not found."; return false; }
            if (_salesInvoices.Any(i => i.Lines.Any(l => l.TaxCodeId == id)))
            {
                error = "Cannot delete tax code used on existing sales invoices. You can deactivate it instead.";
                return false;
            }
            _taxRates.RemoveAll(r => r.TaxCodeId == id);
            _taxCodes.Remove(code);
            Persist();
            return true;
        }
    }

    // ─── Tax Exemptions ─────────────────────────────────────────────────────────
    public List<TaxExemption> GetTaxExemptions(string? jurisdictionId = null, Guid? companyId = null)
    {
        var query = _taxExemptions.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(jurisdictionId)) query = query.Where(e => e.JurisdictionId == jurisdictionId);
        if (companyId.HasValue) query = query.Where(e => e.CompanyId == companyId.Value);
        return query.OrderByDescending(e => e.CreatedAt).ToList();
    }

    public bool CreateTaxExemption(TaxExemptionRequest request, out TaxExemption? exemption, out string? error)
    {
        exemption = null; error = null;
        if (string.IsNullOrWhiteSpace(request.CertificateNumber)) { error = "Certificate number is required."; return false; }
        if (string.IsNullOrWhiteSpace(request.CounterpartyName)) { error = "Counterparty name is required."; return false; }
        lock (_lock)
        {
            exemption = new TaxExemption
            {
                CertificateNumber = request.CertificateNumber.Trim(),
                Type = request.Type,
                CounterpartyName = request.CounterpartyName.Trim(),
                CustomerId = request.CustomerId,
                VendorId = request.VendorId,
                TaxId = request.TaxId?.Trim(),
                IssuingAuthority = request.IssuingAuthority?.Trim(),
                JurisdictionId = request.JurisdictionId?.Trim() ?? "UK",
                ValidFrom = request.ValidFrom,
                ValidTo = request.ValidTo,
                Status = request.Status,
                AttachmentUrl = request.AttachmentUrl,
                Notes = request.Notes,
                CompanyId = request.CompanyId
            };
            _taxExemptions.Add(exemption);
            Persist();
            return true;
        }
    }

    public bool UpdateTaxExemption(Guid id, TaxExemptionRequest request, out TaxExemption? exemption, out string? error)
    {
        exemption = null; error = null;
        lock (_lock)
        {
            exemption = _taxExemptions.FirstOrDefault(e => e.Id == id);
            if (exemption is null) { error = "Tax exemption not found."; return false; }
            if (string.IsNullOrWhiteSpace(request.CertificateNumber)) { error = "Certificate number is required."; return false; }
            exemption.CertificateNumber = request.CertificateNumber.Trim();
            exemption.Type = request.Type;
            exemption.CounterpartyName = request.CounterpartyName.Trim();
            exemption.CustomerId = request.CustomerId;
            exemption.VendorId = request.VendorId;
            exemption.TaxId = request.TaxId?.Trim();
            exemption.IssuingAuthority = request.IssuingAuthority?.Trim();
            exemption.JurisdictionId = request.JurisdictionId?.Trim() ?? exemption.JurisdictionId;
            exemption.ValidFrom = request.ValidFrom;
            exemption.ValidTo = request.ValidTo;
            exemption.Status = request.Status;
            exemption.AttachmentUrl = request.AttachmentUrl;
            exemption.Notes = request.Notes;
            exemption.CompanyId = request.CompanyId ?? exemption.CompanyId;
            Persist();
            return true;
        }
    }

    public bool DeleteTaxExemption(Guid id, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var item = _taxExemptions.FirstOrDefault(e => e.Id == id);
            if (item is null) { error = "Tax exemption not found."; return false; }
            _taxExemptions.Remove(item);
            Persist();
            return true;
        }
    }

    // ─── Country Presets Engine ─────────────────────────────────────────────────
    public bool SeedCountryTaxPreset(string country, Guid? companyId = null)
    {
        lock (_lock)
        {
            var c = (country ?? "").Trim().ToLowerInvariant();
            var today = DateOnly.FromDateTime(DateTime.Today);

            // Resolve standard GL Tax accounts
            var inputVatId = _accounts.FirstOrDefault(a => a.Code == "14100")?.Id;
            var outputVatId = _accounts.FirstOrDefault(a => a.Code == "22000")?.Id;
            var whtPayableId = _accounts.FirstOrDefault(a => a.Code == "22100")?.Id;
            var whtReceivableId = _accounts.FirstOrDefault(a => a.Code == "12200")?.Id;

            if (c.Contains("pakistan") || c == "pk")
            {
                var fbr = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("FBR", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Federal Board of Revenue (FBR)", Code = "FBR", Country = "Pakistan", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, WithholdingAccountId = whtPayableId, FilingFrequency = "Monthly", RemittanceDueDay = 18, Website = "https://fbr.gov.pk", CompanyId = companyId };
                if (!_taxAuthorities.Contains(fbr)) _taxAuthorities.Add(fbr);

                var pra = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("PRA", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Punjab Revenue Authority (PRA)", Code = "PRA", Country = "Pakistan", State = "Punjab", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Monthly", RemittanceDueDay = 15, Website = "https://pra.punjab.gov.pk", CompanyId = companyId };
                if (!_taxAuthorities.Contains(pra)) _taxAuthorities.Add(pra);

                var srb = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("SRB", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Sindh Revenue Board (SRB)", Code = "SRB", Country = "Pakistan", State = "Sindh", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Monthly", RemittanceDueDay = 15, Website = "https://srb.gos.pk", CompanyId = companyId };
                if (!_taxAuthorities.Contains(srb)) _taxAuthorities.Add(srb);

                var kpra = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("KPRA", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Khyber Pakhtunkhwa Revenue Authority (KPRA)", Code = "KPRA", Country = "Pakistan", State = "KPK", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Monthly", RemittanceDueDay = 15, Website = "https://kpra.kp.gov.pk", CompanyId = companyId };
                if (!_taxAuthorities.Contains(kpra)) _taxAuthorities.Add(kpra);

                var bra = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("BRA", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Balochistan Revenue Authority (BRA)", Code = "BRA", Country = "Pakistan", State = "Balochistan", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Monthly", RemittanceDueDay = 15, Website = "https://bra.gob.pk", CompanyId = companyId };
                if (!_taxAuthorities.Contains(bra)) _taxAuthorities.Add(bra);

                AddPresetCode("SALES-PK-18", "Pakistan Sales Tax on Goods 18%", "Federal Sales Tax on Taxable Goods (FBR Sales Tax Act 1990)", TaxType.Standard, TaxScope.Both, fbr.Id, "PK", 18m, today, companyId);
                AddPresetCode("PRA-PK-16", "Punjab Sales Tax on Services 16%", "Punjab Revenue Authority (PRA) Standard Rate on Services", TaxType.ServiceTax, TaxScope.Both, pra.Id, "PK", 16m, today, companyId);
                AddPresetCode("PRA-PK-IT-5", "Punjab IT & Software Services 5%", "PRA Reduced Rate for IT consultancy, software development, and call centers", TaxType.Reduced, TaxScope.Both, pra.Id, "PK", 5m, today, companyId);
                AddPresetCode("SRB-PK-13", "Sindh Sales Tax on Services 13%", "Sindh Revenue Board (SRB) Standard Rate on Services", TaxType.ServiceTax, TaxScope.Both, srb.Id, "PK", 13m, today, companyId);
                AddPresetCode("SRB-PK-IT-3", "Sindh IT & Software Services 3%", "SRB Reduced Rate for software development, IT enabled services & call centers", TaxType.Reduced, TaxScope.Both, srb.Id, "PK", 3m, today, companyId);
                AddPresetCode("KPRA-PK-15", "KPK Sales Tax on Services 15%", "Khyber Pakhtunkhwa Revenue Authority (KPRA) Standard Rate", TaxType.ServiceTax, TaxScope.Both, kpra.Id, "PK", 15m, today, companyId);
                AddPresetCode("KPRA-PK-IT-2", "KPK IT & Software Services 2%", "KPRA Super-Reduced Rate for IT and software development", TaxType.Reduced, TaxScope.Both, kpra.Id, "PK", 2m, today, companyId);
                AddPresetCode("BRA-PK-15", "Balochistan Sales Tax on Services 15%", "Balochistan Revenue Authority (BRA) Rate", TaxType.ServiceTax, TaxScope.Both, bra.Id, "PK", 15m, today, companyId);
                AddPresetCode("ZERO-PK-0", "Pakistan Zero-Rated Exports 0%", "Zero-rated export of physical goods under Fifth Schedule", TaxType.ZeroRated, TaxScope.Sales, fbr.Id, "PK", 0m, today, companyId);
                AddPresetCode("ZERO-PK-IT-EXP-0", "Pakistan IT / Software Exports 0%", "Zero-rated IT export services and freelancing remittance (FBR Fifth Sched)", TaxType.ZeroRated, TaxScope.Sales, fbr.Id, "PK", 0m, today, companyId);
                AddPresetCode("EXEMPT-PK-0", "Pakistan Exempt Supplies 0%", "Unconditional Exempt supplies under Sixth Schedule (foodstuffs, basic medicines)", TaxType.Exempt, TaxScope.Both, fbr.Id, "PK", 0m, today, companyId);
                AddPresetCode("WHT-PK-153-GOODS-5", "FBR WHT Sec 153(1)(a) Goods 5%", "Withholding tax deduction on supplies of goods (Active Filer)", TaxType.Withholding, TaxScope.Purchases, fbr.Id, "PK", 5m, today, companyId);
                AddPresetCode("WHT-PK-153-SERV-10", "FBR WHT Sec 153(1)(b) Services 10%", "Withholding tax deduction on rendering services (Active Filer)", TaxType.Withholding, TaxScope.Purchases, fbr.Id, "PK", 10m, today, companyId);
                AddPresetCode("WHT-PK-153-CONTRACT-7.5", "FBR WHT Sec 153(1)(c) Contracts 7.5%", "Withholding tax deduction on execution of contracts (Active Filer)", TaxType.Withholding, TaxScope.Purchases, fbr.Id, "PK", 7.5m, today, companyId);
            }
            else if (c.Contains("saudi") || c.Contains("ksa") || c == "sa")
            {
                var zatca = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("ZATCA", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Zakat, Tax and Customs Authority (ZATCA)", Code = "ZATCA", Country = "Saudi Arabia", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, WithholdingAccountId = whtPayableId, FilingFrequency = "Monthly", RemittanceDueDay = 30, Website = "https://zatca.gov.sa", CompanyId = companyId };
                if (!_taxAuthorities.Contains(zatca)) _taxAuthorities.Add(zatca);

                AddPresetCode("VAT-KSA-15", "KSA Standard VAT 15%", "Saudi Standard 15% VAT (ZATCA / Fatoora Phase 2)", TaxType.Standard, TaxScope.Both, zatca.Id, "SA", 15m, today, companyId);
                AddPresetCode("VAT-KSA-0", "KSA Zero-Rated Exports 0%", "Qualifying exports outside GCC and international transport", TaxType.ZeroRated, TaxScope.Sales, zatca.Id, "SA", 0m, today, companyId);
                AddPresetCode("VAT-KSA-EXEMPT", "KSA Exempt Supplies 0%", "Exempt financial services margin and residential real estate lease", TaxType.Exempt, TaxScope.Both, zatca.Id, "SA", 0m, today, companyId);
                AddPresetCode("WHT-KSA-5", "ZATCA Non-Resident WHT 5%", "Withholding on technical / consulting services to non-residents", TaxType.Withholding, TaxScope.Purchases, zatca.Id, "SA", 5m, today, companyId);
                AddPresetCode("WHT-KSA-15", "ZATCA Royalties WHT 15%", "Withholding on royalties and management fees to non-residents", TaxType.Withholding, TaxScope.Purchases, zatca.Id, "SA", 15m, today, companyId);
            }
            else if (c.Contains("emirates") || c.Contains("uae") || c == "ae" || c.Contains("dubai"))
            {
                var fta = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("FTA", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Federal Tax Authority (FTA)", Code = "FTA", Country = "United Arab Emirates", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Quarterly", RemittanceDueDay = 28, Website = "https://tax.gov.ae", CompanyId = companyId };
                if (!_taxAuthorities.Contains(fta)) _taxAuthorities.Add(fta);

                AddPresetCode("VAT-UAE-5", "UAE Standard VAT 5%", "UAE Standard 5% VAT (Federal Decree-Law No. 8)", TaxType.Standard, TaxScope.Both, fta.Id, "UAE", 5m, today, companyId);
                AddPresetCode("VAT-UAE-0", "UAE Zero-Rated Exports 0%", "Direct / indirect export of goods and international transport", TaxType.ZeroRated, TaxScope.Sales, fta.Id, "UAE", 0m, today, companyId);
                AddPresetCode("VAT-UAE-EXEMPT", "UAE Exempt Supplies 0%", "Exempt financial services, local passenger transport, bare land", TaxType.Exempt, TaxScope.Both, fta.Id, "UAE", 0m, today, companyId);
                AddPresetCode("VAT-UAE-FZ", "UAE Designated Free Zone 0%", "Designated Zone out-of-scope supply between free zone entities", TaxType.ZeroRated, TaxScope.Both, fta.Id, "UAE", 0m, today, companyId);
                AddPresetCode("VAT-UAE-RC", "UAE Reverse Charge 0%", "Reverse Charge Mechanism on imported services (B2B)", TaxType.ReverseCharge, TaxScope.Both, fta.Id, "UAE", 0m, today, companyId);
            }
            else if (c.Contains("states") || c.Contains("usa") || c == "us" || c.Contains("america"))
            {
                var irs = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("IRS", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Internal Revenue Service (IRS)", Code = "IRS", Country = "United States", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, WithholdingAccountId = whtPayableId, Website = "https://irs.gov", CompanyId = companyId };
                if (!_taxAuthorities.Contains(irs)) _taxAuthorities.Add(irs);

                var cdtfa = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("CDTFA", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "California Dept of Tax & Fee Admin (CDTFA)", Code = "CDTFA", Country = "United States", State = "California", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Quarterly", Website = "https://cdtfa.ca.gov", CompanyId = companyId };
                if (!_taxAuthorities.Contains(cdtfa)) _taxAuthorities.Add(cdtfa);

                var nys = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("NYS", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "New York Dept of Taxation (NYS)", Code = "NYS-DTF", Country = "United States", State = "New York", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Quarterly", Website = "https://tax.ny.gov", CompanyId = companyId };
                if (!_taxAuthorities.Contains(nys)) _taxAuthorities.Add(nys);

                var txcpa = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("Texas", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Texas Comptroller of Public Accounts", Code = "TX-CPA", Country = "United States", State = "Texas", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Quarterly", Website = "https://comptroller.texas.gov", CompanyId = companyId };
                if (!_taxAuthorities.Contains(txcpa)) _taxAuthorities.Add(txcpa);

                AddPresetCode("SALES-CA-7.25", "California Statewide Sales Tax 7.25%", "Base California state sales and use tax (CDTFA)", TaxType.Standard, TaxScope.Sales, cdtfa.Id, "USA", 7.25m, today, companyId);
                AddPresetCode("SALES-CA-LA-9.5", "Los Angeles County Combined Tax 9.5%", "CA State 7.25% + LA County + Transportation District Tax", TaxType.Compound, TaxScope.Sales, cdtfa.Id, "USA", 9.5m, today, companyId);
                AddPresetCode("SALES-NY-8.875", "New York City Combined Sales Tax 8.875%", "NYS 4% + NYC 4.5% + Metropolitan Commuter Dist 0.375%", TaxType.Compound, TaxScope.Sales, nys.Id, "USA", 8.875m, today, companyId);
                AddPresetCode("SALES-TX-8.25", "Texas Combined Sales Tax 8.25%", "Texas State 6.25% + Local City/Transit District 2.0%", TaxType.Compound, TaxScope.Sales, txcpa.Id, "USA", 8.25m, today, companyId);
                AddPresetCode("SALES-US-EXEMPT", "US Resale / Non-Profit Certificate 0%", "Valid Resale Certificate / 501(c)(3) tax exempt entity", TaxType.Exempt, TaxScope.Both, irs.Id, "USA", 0m, today, companyId);
                AddPresetCode("WHT-US-1099-24", "IRS 1099 Backup Withholding 24%", "IRS Backup withholding for payees with missing/invalid TIN (W-9)", TaxType.Withholding, TaxScope.Purchases, irs.Id, "USA", 24m, today, companyId);
            }
            else if (c.Contains("canada") || c == "ca")
            {
                var cra = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("CRA", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Canada Revenue Agency (CRA)", Code = "CRA", Country = "Canada", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Quarterly", Website = "https://canada.ca/en/revenue-agency.html", CompanyId = companyId };
                if (!_taxAuthorities.Contains(cra)) _taxAuthorities.Add(cra);

                var rq = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("Revenu", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Revenu Québec (RQ)", Code = "RQ", Country = "Canada", State = "Quebec", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Quarterly", Website = "https://revenuquebec.ca", CompanyId = companyId };
                if (!_taxAuthorities.Contains(rq)) _taxAuthorities.Add(rq);

                AddPresetCode("GST-CA-5", "Canada Federal GST 5%", "Goods and Services Tax across Canada (AB, NT, NU, YT)", TaxType.Standard, TaxScope.Both, cra.Id, "CA", 5m, today, companyId);
                AddPresetCode("HST-CA-ON-13", "Ontario HST 13%", "Harmonized Sales Tax (5% Federal + 8% Ontario Provincial)", TaxType.Compound, TaxScope.Both, cra.Id, "CA", 13m, today, companyId);
                AddPresetCode("HST-CA-BC-12", "British Columbia GST+PST 12%", "Federal GST 5% + BC Provincial Sales Tax (PST) 7%", TaxType.Compound, TaxScope.Both, cra.Id, "CA", 12m, today, companyId);
                AddPresetCode("HST-CA-QC-14.975", "Quebec GST+QST 14.975%", "Federal GST 5% + Quebec Sales Tax (QST) 9.975%", TaxType.Compound, TaxScope.Both, rq.Id, "CA", 14.975m, today, companyId);
                AddPresetCode("HST-CA-NS-15", "Nova Scotia / Atlantic HST 15%", "Harmonized Sales Tax (5% Federal + 10% Provincial)", TaxType.Compound, TaxScope.Both, cra.Id, "CA", 15m, today, companyId);
                AddPresetCode("GST-CA-EXEMPT", "Canada Exempt / Zero-Rated 0%", "Zero-rated basic groceries, prescription drugs, exports", TaxType.Exempt, TaxScope.Both, cra.Id, "CA", 0m, today, companyId);
            }
            else if (c.Contains("europe") || c == "eu" || c.Contains("germany") || c.Contains("france") || c.Contains("netherlands") || c.Contains("ireland"))
            {
                var eu = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("EU", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "European Union VAT Administration", Code = "EU-VAT", Country = "European Union", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Quarterly", Website = "https://ec.europa.eu/taxation_customs", CompanyId = companyId };
                if (!_taxAuthorities.Contains(eu)) _taxAuthorities.Add(eu);

                var bzst = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("BZSt", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Bundeszentralamt für Steuern (BZSt)", Code = "BZSt", Country = "Germany", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Monthly", Website = "https://bzst.de", CompanyId = companyId };
                if (!_taxAuthorities.Contains(bzst)) _taxAuthorities.Add(bzst);

                var dgfif = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("DGFIP", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Direction Générale des Finances Publiques (DGFiP)", Code = "DGFIP", Country = "France", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, FilingFrequency = "Monthly", Website = "https://impots.gouv.fr", CompanyId = companyId };
                if (!_taxAuthorities.Contains(dgfif)) _taxAuthorities.Add(dgfif);

                AddPresetCode("VAT-DE-19", "Germany Standard VAT 19%", "German Standard Mehrwertsteuer (Umsatzsteuer 19%)", TaxType.Standard, TaxScope.Both, bzst.Id, "EU", 19m, today, companyId);
                AddPresetCode("VAT-DE-7", "Germany Reduced VAT 7%", "German Reduced Rate on food, books, hotel accommodation", TaxType.Reduced, TaxScope.Both, bzst.Id, "EU", 7m, today, companyId);
                AddPresetCode("VAT-FR-20", "France Standard TVA 20%", "French Standard Taxe sur la Valeur Ajoutée (TVA 20%)", TaxType.Standard, TaxScope.Both, dgfif.Id, "EU", 20m, today, companyId);
                AddPresetCode("VAT-FR-10", "France Intermediate TVA 10%", "French Intermediate Rate for restaurants, transport, and renovations", TaxType.Reduced, TaxScope.Both, dgfif.Id, "EU", 10m, today, companyId);
                AddPresetCode("VAT-FR-5.5", "France Reduced TVA 5.5%", "French Reduced Rate on basic necessities, books, and energy", TaxType.Reduced, TaxScope.Both, dgfif.Id, "EU", 5.5m, today, companyId);
                AddPresetCode("VAT-NL-21", "Netherlands Standard BTW 21%", "Dutch Standard Belasting van Toegevoegde Waarde (BTW 21%)", TaxType.Standard, TaxScope.Both, eu.Id, "EU", 21m, today, companyId);
                AddPresetCode("VAT-NL-9", "Netherlands Reduced BTW 9%", "Dutch Reduced Rate for food, medicines, and books", TaxType.Reduced, TaxScope.Both, eu.Id, "EU", 9m, today, companyId);
                AddPresetCode("VAT-IE-23", "Ireland Standard VAT 23%", "Irish Standard Value Added Tax 23%", TaxType.Standard, TaxScope.Both, eu.Id, "EU", 23m, today, companyId);
                AddPresetCode("VAT-IE-13.5", "Ireland Reduced VAT 13.5%", "Irish Reduced Rate for hospitality, cleaning, and repair services", TaxType.Reduced, TaxScope.Both, eu.Id, "EU", 13.5m, today, companyId);
                AddPresetCode("VAT-EU-0-INTRA", "EU Intra-Community B2B Supply 0%", "Cross-border B2B supply with verified VIES VAT ID", TaxType.ZeroRated, TaxScope.Sales, eu.Id, "EU", 0m, today, companyId);
                AddPresetCode("VAT-EU-RC", "EU Reverse Charge Mechanism 0%", "Customer self-accounts for VAT on cross-border services (Art 196)", TaxType.ReverseCharge, TaxScope.Both, eu.Id, "EU", 0m, today, companyId);
                AddPresetCode("VAT-EU-EXEMPT", "EU Exempt Supplies 0%", "Exempt financial, insurance, and medical services (Art 132/135)", TaxType.Exempt, TaxScope.Both, eu.Id, "EU", 0m, today, companyId);
            }
            else // Default to United Kingdom (UK)
            {
                var hmrc = _taxAuthorities.FirstOrDefault(a => a.Name.Contains("HMRC", StringComparison.OrdinalIgnoreCase))
                    ?? new TaxAuthority { Name = "Her Majesty's Revenue and Customs (HMRC)", Code = "HMRC", Country = "United Kingdom", LiabilityAccountId = outputVatId, InputTaxAccountId = inputVatId, WithholdingAccountId = whtPayableId, FilingFrequency = "Quarterly", RemittanceDueDay = 7, Website = "https://gov.uk/government/organisations/hm-revenue-customs", CompanyId = companyId };
                if (!_taxAuthorities.Contains(hmrc)) _taxAuthorities.Add(hmrc);

                AddPresetCode("VAT-UK-20", "UK Standard VAT 20%", "Standard Rate 20% on taxable goods and services", TaxType.Standard, TaxScope.Both, hmrc.Id, "UK", 20m, today, companyId);
                AddPresetCode("VAT-UK-5", "UK Reduced VAT 5%", "Reduced Rate 5% (domestic fuel, children's car seats, mobility aids)", TaxType.Reduced, TaxScope.Both, hmrc.Id, "UK", 5m, today, companyId);
                AddPresetCode("VAT-UK-0", "UK Zero-Rated VAT 0%", "Zero-rated basic food, books, children's clothing, exports", TaxType.ZeroRated, TaxScope.Both, hmrc.Id, "UK", 0m, today, companyId);
                AddPresetCode("VAT-UK-EXEMPT", "UK Exempt Supplies 0%", "Exempt insurance, finance, education, health", TaxType.Exempt, TaxScope.Both, hmrc.Id, "UK", 0m, today, companyId);
                AddPresetCode("VAT-UK-RC", "UK Reverse Charge VAT 0%", "Customer accounts for output and input tax (B2B Cross-border / CIS)", TaxType.ReverseCharge, TaxScope.Both, hmrc.Id, "UK", 0m, today, companyId);
                AddPresetCode("CIS-UK-20", "UK CIS Construction WHT 20%", "Construction Industry Scheme deduction for registered subcontractors", TaxType.Withholding, TaxScope.Purchases, hmrc.Id, "UK", 20m, today, companyId);
                AddPresetCode("CIS-UK-30", "UK CIS Construction WHT 30%", "Construction Industry Scheme deduction for unverified subcontractors", TaxType.Withholding, TaxScope.Purchases, hmrc.Id, "UK", 30m, today, companyId);
            }

            Persist();
            return true;
        }
    }

    private void AddPresetCode(string codeStr, string name, string description, TaxType type, TaxScope scope, Guid authId, string jurId, decimal pct, DateOnly effectiveDate, Guid? companyId)
    {
        var existing = _taxCodes.FirstOrDefault(c => c.Code == codeStr);
        if (existing == null)
        {
            var code = new TaxCode
            {
                Code = codeStr,
                Name = name,
                Description = description,
                TaxType = type,
                Scope = scope,
                TaxAuthorityId = authId,
                JurisdictionId = jurId,
                DeductibilityPercentage = 100m,
                IsActive = true,
                CompanyId = companyId
            };
            var rate = new TaxRate { TaxCodeId = code.Id, Percentage = pct, EffectiveFrom = effectiveDate };
            code.Rates.Add(rate);
            _taxRates.Add(rate);
            _taxCodes.Add(code);
        }
    }

    // ─── Real-Time Tax Summary & Return Calculations ────────────────────────────
    public object GetTaxSummaryReport(DateOnly? fromDate, DateOnly? toDate, string? jurisdictionId, Guid? companyId)
    {
        var from = fromDate ?? new DateOnly(DateTime.Today.Year, 1, 1);
        var to = toDate ?? new DateOnly(DateTime.Today.Year, 12, 31);

        var invoices = _salesInvoices
            .Where(i => i.Status != SalesInvoiceStatus.Draft && i.Status != SalesInvoiceStatus.Void)
            .Where(i => i.InvoiceDate >= from && i.InvoiceDate <= to)
            .Where(i => !companyId.HasValue || i.CompanyId == companyId.Value)
            .ToList();

        var creditNotes = _creditNotes
            .Where(c => c.Status != CreditNoteStatus.Draft && c.Status != CreditNoteStatus.Void)
            .Where(c => c.CreditNoteDate >= from && c.CreditNoteDate <= to)
            .Where(c => !companyId.HasValue || c.CompanyId == companyId.Value)
            .ToList();

        var totalSales = invoices.Sum(i => i.SubTotal - i.DiscountTotal) - creditNotes.Sum(c => c.SubTotal - c.DiscountTotal);
        var totalOutputTax = invoices.Sum(i => i.TaxTotal) - creditNotes.Sum(c => c.TaxTotal);

        var totalZeroRatedSales = invoices
            .SelectMany(i => i.Lines)
            .Where(l => l.TaxAmount == 0 && l.TaxCodeId.HasValue && (_taxCodes.FirstOrDefault(c => c.Id == l.TaxCodeId)?.TaxType == TaxType.ZeroRated))
            .Sum(l => l.LineTotalAfterDiscount);

        var totalExemptSales = invoices
            .SelectMany(i => i.Lines)
            .Where(l => l.TaxAmount == 0 && l.TaxCodeId.HasValue && (_taxCodes.FirstOrDefault(c => c.Id == l.TaxCodeId)?.TaxType == TaxType.Exempt))
            .Sum(l => l.LineTotalAfterDiscount);

        // Purchases (Vendor Bills / POs)
        var totalPurchases = _purchaseOrders
            .Where(p => p.Status != PurchaseOrderStatus.Draft && p.Status != PurchaseOrderStatus.Canceled)
            .Where(p => p.Date >= from && p.Date <= to)
            .Where(p => !companyId.HasValue || p.CompanyId == companyId.Value)
            .Sum(p => p.Lines.Sum(l => l.Quantity * l.UnitPrice));

        var totalInputTax = _purchaseOrders
            .Where(p => p.Status != PurchaseOrderStatus.Draft && p.Status != PurchaseOrderStatus.Canceled)
            .Where(p => p.Date >= from && p.Date <= to)
            .Where(p => !companyId.HasValue || p.CompanyId == companyId.Value)
            .Sum(p => p.Lines.Sum(l => l.TaxAmount));

        // If no purchase orders, calculate reasonable sample input tax or use 0
        var netTaxPayable = totalOutputTax - totalInputTax;

        // Withholding Tax
        var whtCertificates = _withholdingCertificates
            .Where(w => w.PeriodStart >= from && w.PeriodEnd <= to)
            .Where(w => !companyId.HasValue || w.CompanyId == companyId.Value)
            .ToList();
        var totalWithheld = whtCertificates.Sum(w => w.WithheldAmount);

        // Box Breakdown formatting
        var jur = (jurisdictionId ?? "UK").ToUpperInvariant();
        var boxes = new List<object>();

        if (jur == "UK")
        {
            boxes.Add(new { box = "Box 1", description = "VAT due in the period on sales and other outputs", amount = totalOutputTax });
            boxes.Add(new { box = "Box 2", description = "VAT due in the period on acquisitions from other EC member states", amount = 0m });
            boxes.Add(new { box = "Box 3", description = "Total VAT due (Box 1 + Box 2)", amount = totalOutputTax });
            boxes.Add(new { box = "Box 4", description = "VAT reclaimed in the period on purchases and other inputs", amount = totalInputTax });
            boxes.Add(new { box = "Box 5", description = "Net VAT to pay to HMRC or receive back (Box 3 - Box 4)", amount = netTaxPayable });
            boxes.Add(new { box = "Box 6", description = "Total value of sales and all other outputs excluding any VAT", amount = totalSales });
            boxes.Add(new { box = "Box 7", description = "Total value of purchases and all other inputs excluding any VAT", amount = totalPurchases });
            boxes.Add(new { box = "Box 8", description = "Total value of all supplies of goods to other EC member states", amount = totalZeroRatedSales });
            boxes.Add(new { box = "Box 9", description = "Total value of all acquisitions of goods from other EC member states", amount = 0m });
        }
        else if (jur == "PK")
        {
            boxes.Add(new { box = "Annex C (Row 1)", description = "Taxable Goods Supplies subject to standard 18% Sales Tax", amount = totalSales - totalZeroRatedSales - totalExemptSales });
            boxes.Add(new { box = "Annex C (Row 2)", description = "Output Sales Tax Due (Federal FBR 18% / Provincial PRA 16%)", amount = totalOutputTax });
            boxes.Add(new { box = "Annex C (Row 3)", description = "Zero-Rated Supplies (Exports under 5th Schedule)", amount = totalZeroRatedSales });
            boxes.Add(new { box = "Annex C (Row 4)", description = "Exempt Supplies (6th Schedule)", amount = totalExemptSales });
            boxes.Add(new { box = "Annex A (Row 1)", description = "Domestic Purchases & Claimable Input Tax Credit", amount = totalInputTax });
            boxes.Add(new { box = "Section 153 WHT", description = "Withholding Income Tax Deducted / Deposited", amount = totalWithheld });
            boxes.Add(new { box = "Net Payable", description = "Net Federal & Provincial Tax Payable / (Refundable)", amount = netTaxPayable });
        }
        else if (jur == "SA")
        {
            boxes.Add(new { box = "Row 1", description = "Standard rated 15% domestic sales & output tax", amount = totalOutputTax });
            boxes.Add(new { box = "Row 2", description = "Zero rated exports and supplies", amount = totalZeroRatedSales });
            boxes.Add(new { box = "Row 3", description = "Exempt supplies", amount = totalExemptSales });
            boxes.Add(new { box = "Row 7", description = "Standard rated 15% purchases & input tax", amount = totalInputTax });
            boxes.Add(new { box = "Row 12", description = "Total Net Tax Payable to ZATCA / (Refund)", amount = netTaxPayable });
        }
        else if (jur == "CA")
        {
            boxes.Add(new { box = "Line 101", description = "Total sales and other revenue", amount = totalSales });
            boxes.Add(new { box = "Line 103", description = "GST/HST collected or that became collectible", amount = totalOutputTax });
            boxes.Add(new { box = "Line 106", description = "Input Tax Credits (ITCs) on purchases", amount = totalInputTax });
            boxes.Add(new { box = "Line 109", description = "Net tax to be remitted to CRA or (refund)", amount = netTaxPayable });
        }
        else // UAE / US / General
        {
            boxes.Add(new { box = "Box 1", description = "Standard rated supplies & output tax", amount = totalOutputTax });
            boxes.Add(new { box = "Box 4", description = "Zero rated supplies / Exports", amount = totalZeroRatedSales });
            boxes.Add(new { box = "Box 5", description = "Exempt supplies", amount = totalExemptSales });
            boxes.Add(new { box = "Box 9", description = "Standard rated expenses & recoverable input tax", amount = totalInputTax });
            boxes.Add(new { box = "Box 14", description = "Net Tax Payable / (Refund)", amount = netTaxPayable });
        }

        return new
        {
            JurisdictionId = jur,
            PeriodStart = from,
            PeriodEnd = to,
            TotalSales = totalSales,
            TotalPurchases = totalPurchases,
            TotalOutputTax = totalOutputTax,
            TotalInputTax = totalInputTax,
            NetTaxPayable = netTaxPayable,
            TotalZeroRatedSales = totalZeroRatedSales,
            TotalExemptSales = totalExemptSales,
            TotalWithheld = totalWithheld,
            Boxes = boxes
        };
    }
    
    public Account? Find(Guid id) => _accounts.FirstOrDefault(x => x.Id == id);
    public IEnumerable<AuditItem> History(Guid id) => _history.GetValueOrDefault(id, []);

    public string NextCode(AccountType type) => NextCodeForParent(null, type);

    public string NextCodeForParent(Guid? parentId, AccountType type)
    {
        lock (_lock)
        {
            if (parentId == null)
            {
                var prefix = type switch
                {
                    AccountType.Asset or AccountType.ContraAsset => 1,
                    AccountType.Liability or AccountType.ContraLiability => 2,
                    AccountType.Equity or AccountType.ContraEquity => 3,
                    AccountType.Revenue or AccountType.ContraRevenue => 4,
                    _ => 6
                };
                
                var highestRoot = _accounts
                    .Where(x => x.ParentId == null && x.Code.StartsWith(prefix.ToString()) && x.Code.Length == 5)
                    .Select(x => int.TryParse(x.Code, out var n) ? n : prefix * 10000)
                    .DefaultIfEmpty(prefix * 10000)
                    .Max();
                    
                var next = highestRoot == prefix * 10000 ? prefix * 10000 : highestRoot + 10000;
                if (next >= (prefix + 1) * 10000)
                {
                    next = highestRoot + 1000;
                }
                return next.ToString();
            }

            var parent = Find(parentId.Value);
            if (parent == null) return NextCode(type);

            int step = 1;
            if (parent.Code.EndsWith("0000")) step = 1000;
            else if (parent.Code.EndsWith("000")) step = 100;
            else if (parent.Code.EndsWith("00")) step = 10;
            else if (parent.Code.EndsWith("0")) step = 1;

            var children = _accounts.Where(x => x.ParentId == parent.Id).ToList();
            if (children.Count > 0)
            {
                var highestChild = children
                    .Select(x => int.TryParse(x.Code, out var n) ? n : 0)
                    .DefaultIfEmpty(0)
                    .Max();
                if (highestChild > 0)
                {
                    return (highestChild + step).ToString();
                }
            }

            if (int.TryParse(parent.Code, out var pCode))
            {
                return (pCode + step).ToString();
            }

            return NextCode(type);
        }
    }

    public Account Create(AccountRequest r)
    {
        lock (_lock)
        {
            Validate(r, null);
            var account = new Account
            {
                Code = string.IsNullOrWhiteSpace(r.Code) ? NextCodeForParent(r.ParentId, r.Type) : r.Code.Trim(),
                Name = r.Name.Trim(),
                Type = r.Type,
                ParentId = r.ParentId,
                OpeningBalance = r.OpeningBalance,
                OpeningBalanceDate = r.OpeningBalanceDate,
                ReconciliationEnabled = r.ReconciliationEnabled,
                IfrsTag = r.IfrsTag,
                GaapTag = r.GaapTag,
                CustomFields = r.CustomFields ?? [],
                IsSystem = r.IsSystem,
                Subtype = r.Subtype ?? "",
                Currency = r.Currency ?? "USD",
                TaxCategory = r.TaxCategory,
                AllowManualJournal = r.AllowManualJournal,
                Description = r.Description
            };
            _accounts.Add(account);
            _history[account.Id] = [new(DateTime.UtcNow, "Created", "Account created")];
            RecalculateHierarchy();
            Persist();
            return account;
        }
    }

    public bool Update(Guid id, AccountRequest r, out string? error)
    {
        lock (_lock)
        {
            var a = Find(id);
            if (a is null) { error = "Account not found."; return false; }
            if (IsAccountMappedAsSystemControl(a.Id) && (a.Code != r.Code?.Trim() || a.Type != r.Type))
            {
                error = "Critical system account attributes (Code, Type) cannot be modified.";
                return false;
            }
            try
            {
                Validate(r, id);
            }
            catch (Exception e)
            {
                error = e.Message;
                return false;
            }
            a.Code = string.IsNullOrWhiteSpace(r.Code) ? a.Code : r.Code.Trim();
            a.Name = r.Name.Trim();
            a.Type = r.Type;
            a.ParentId = r.ParentId;
            a.OpeningBalance = r.OpeningBalance;
            a.OpeningBalanceDate = r.OpeningBalanceDate;
            a.ReconciliationEnabled = r.ReconciliationEnabled;
            a.IfrsTag = r.IfrsTag;
            a.GaapTag = r.GaapTag;
            a.CustomFields = r.CustomFields ?? [];
            a.IsSystem = r.IsSystem;
            a.Subtype = r.Subtype ?? "";
            a.Currency = r.Currency ?? "USD";
            a.TaxCategory = r.TaxCategory;
            a.AllowManualJournal = r.AllowManualJournal;
            a.Description = r.Description;
            a.UpdatedAt = DateTime.UtcNow;
            _history[id].Add(new(DateTime.UtcNow, "Updated", "Account details changed"));
            RecalculateHierarchy();
            Persist();
            error = null;
            return true;
        }
    }

    public bool SetStatus(Guid id, StatusRequest status, out string? error)
    {
        var a = Find(id);
        if (a is null) { error = "Account not found."; return false; }
        if (IsAccountMappedAsSystemControl(a.Id) && status.Status == AccountStatus.Inactive)
        {
            error = "System accounts are protected and cannot be deactivated.";
            return false;
        }
        a.Status = status.Status;
        a.UpdatedAt = DateTime.UtcNow;
        _history[id].Add(new(DateTime.UtcNow, status.Status.ToString(), status.Reason ?? "Status changed"));
        RecalculateHierarchy();
        Persist();
        error = null;
        return true;
    }

    public bool Delete(Guid id, out string? error)
    {
        var a = Find(id);
        if (a is null) { error = "Account not found."; return false; }
        if (IsAccountMappedAsSystemControl(a.Id))
        {
            error = "System accounts are protected and cannot be deleted.";
            return false;
        }
        if (_accounts.Any(x => x.ParentId == id) || _entries.Any(e => e.Lines.Any(l => l.AccountId == id)))
        {
            error = "Accounts with children or transactions cannot be deleted. Deactivate instead.";
            return false;
        }
        _accounts.Remove(a);
        _history.Remove(id);
        RecalculateHierarchy();
        Persist();
        error = null;
        return true;
    }

    public bool ClearAllAccounts(out string? error)
    {
        error = null;
        lock (_lock)
        {
            _accounts.Clear();
            _history.Clear();
            _mappings.Clear();
            Persist();
            return true;
        }
    }
    
    public string GenerateNextJournalReference()
    {
        var maxSeq = 0;
        foreach (var e in _entries)
        {
            if (!string.IsNullOrWhiteSpace(e.Reference))
            {
                var match = System.Text.RegularExpressions.Regex.Match(e.Reference.Trim(), @"^JE-(?:\d{4}-)?(\d+)$", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (match.Success && int.TryParse(match.Groups[1].Value, out var num) && num > maxSeq)
                    maxSeq = num;
            }
        }
        return $"JE-{maxSeq + 1:D5}";
    }

    public bool CreateJournal(JournalEntryRequest request, out JournalEntry? entry, out string? error) { 
        entry = null; 
        error = null; 
        if (!ValidateJournal(request, out error)) return false; 
        lock (_lock) { 
            var finalRef = !string.IsNullOrWhiteSpace(request.Reference) ? request.Reference : GenerateNextJournalReference();
            entry = new JournalEntry { 
                Date = request.Date, 
                Reference = finalRef, 
                Description = request.Description, 
                Lines = request.Lines.Select(l => new JournalLine(l.AccountId, l.Debit, l.Credit, l.Memo, l.Comment, l.CurrencyCode, l.ExchangeRate, l.CompanyId)).ToList(), 
                TransactionType = request.TransactionType, 
                CurrencyCode = request.CurrencyCode, 
                ExchangeRate = request.ExchangeRate, 
                CompanyId = request.CompanyId, 
                CounterpartyCompanyId = request.CounterpartyCompanyId, 
                ReversalDate = request.ReversalDate, 
                AutoReverse = request.AutoReverse 
            }; 
            _entries.Add(entry); 
            AddEvent(entry, "on_create", "system", "Journal entry created as draft"); 
            Persist(); 
            return true; 
        } 
    }
    public bool Transition(Guid id, JournalStatus target, TransitionRequest request, out JournalEntry? entry, out string? error)
    {
        lock (_lock)
        {
            entry = FindEntry(id);
            error = null;
            if (entry is null) { error = "Journal entry not found."; return false; }
            entry.Status = target;
            entry.Version++;
            AddEvent(entry, "on_status_change", "system", request.Note ?? $"Journal entry {target.ToString().ToLowerInvariant()}");

            if (target == JournalStatus.Posted && entry.AutoReverse)
            {
                var revDate = entry.ReversalDate ?? new DateOnly(entry.Date.Year, entry.Date.Month, 1).AddMonths(1);
                var reversal = new JournalEntry
                {
                    Date = revDate,
                    Reference = $"REV-{entry.Reference}",
                    Description = $"Auto-reversal of {entry.Reference}: {entry.Description}",
                    Lines = entry.Lines.Select(l => new JournalLine(l.AccountId, l.Credit, l.Debit, l.Memo, l.Comment, l.CurrencyCode, l.ExchangeRate, l.CompanyId)).ToList(),
                    TransactionType = entry.TransactionType,
                    CurrencyCode = entry.CurrencyCode,
                    ExchangeRate = entry.ExchangeRate,
                    CompanyId = entry.CompanyId,
                    CounterpartyCompanyId = entry.CounterpartyCompanyId,
                    Status = JournalStatus.Draft,
                    ReversalOfId = entry.Id
                };
                _entries.Add(reversal);
                AddEvent(reversal, "on_create", "system", $"Auto-reversal entry created for {entry.Reference}");
            }

            Persist();
            return true;
        }
    }

    public bool BatchPost(BatchPostRequest request, out object result, out string? error)
    {
        lock (_lock)
        {
            var selected = request.EntryIds.Select(FindEntry).Where(x => x != null).ToList();
            foreach (var item in selected!)
            {
                item!.Status = JournalStatus.Posted;
                item.Version++;
                AddEvent(item, "on_post", "system", "Posted by batch");

                if (item.AutoReverse)
                {
                    var revDate = item.ReversalDate ?? new DateOnly(item.Date.Year, item.Date.Month, 1).AddMonths(1);
                    var reversal = new JournalEntry
                    {
                        Date = revDate,
                        Reference = $"REV-{item.Reference}",
                        Description = $"Auto-reversal of {item.Reference}: {item.Description}",
                        Lines = item.Lines.Select(l => new JournalLine(l.AccountId, l.Credit, l.Debit, l.Memo, l.Comment, l.CurrencyCode, l.ExchangeRate, l.CompanyId)).ToList(),
                        TransactionType = item.TransactionType,
                        CurrencyCode = item.CurrencyCode,
                        ExchangeRate = item.ExchangeRate,
                        CompanyId = item.CompanyId,
                        CounterpartyCompanyId = item.CounterpartyCompanyId,
                        Status = JournalStatus.Draft,
                        ReversalOfId = item.Id
                    };
                    _entries.Add(reversal);
                    AddEvent(reversal, "on_create", "system", $"Auto-reversal entry created for {item.Reference}");
                }
            }
            Persist();
            result = new { posted = selected.Count };
            error = null;
            return true;
        }
    }
    public JournalEntry? FindEntry(Guid id) => _entries.FirstOrDefault(x => x.Id == id);
    public IEnumerable<JournalEvent> Events(Guid id) => _journalEvents.Where(x => x.JournalEntryId == id).OrderByDescending(x => x.OccurredAt);
    public void AddAttachment(Guid id, AttachmentRequest attachment) { var entry = FindEntry(id) ?? throw new KeyNotFoundException(); entry.Attachments.Add(new Attachment(attachment.FileName, attachment.ContentType, attachment.Url, DateTime.UtcNow)); AddEvent(entry, "attachment_added", "system", attachment.FileName); Persist(); }
    public RecurringJournalEntry AddRecurring(RecurringEntryRequest request) { var recurring = new RecurringJournalEntry { Entry = request.Entry, Frequency = request.Frequency, StartsOn = request.StartsOn, EndsOn = request.EndsOn }; _recurringEntries.Add(recurring); Persist(); return recurring; }
    public JournalTemplate AddTemplate(JournalTemplateRequest request) { var template = new JournalTemplate { Name = request.Name, Description = request.Description, TransactionType = request.TransactionType, CurrencyCode = request.CurrencyCode, Lines = request.Lines }; _templates.Add(template); Persist(); return template; }
    public bool CreateIntercompanyAllocation(IntercompanyAllocationRequest request, out IntercompanyAllocation? allocation, out string? error) { allocation = new IntercompanyAllocation { Name = request.Name.Trim(), SourceCompanyId = request.SourceCompanyId, Category = request.Category.Trim(), Description = request.Description?.Trim(), Frequency = request.Frequency, Rate = request.Rate, Quantity = request.Quantity, StartDate = request.StartDate, EndDate = request.EndDate, Recipients = request.Recipients }; _intercompanyAllocations.Add(allocation); Persist(); error = null; return true; }
    public bool SetIntercompanyStatus(Guid id, IntercompanyAllocationStatus status, out string? error) { var allocation = _intercompanyAllocations.FirstOrDefault(x => x.Id == id); if (allocation is null) { error = "Intercompany allocation not found."; return false; } allocation.Status = status; allocation.UpdatedAt = DateTime.UtcNow; Persist(); error = null; return true; }

    public bool ProcessIntercompanyAllocation(Guid id, DateOnly asOfDate, out JournalEntry? entry, out string? error)
    {
        entry = null;
        var allocation = _intercompanyAllocations.FirstOrDefault(x => x.Id == id);
        if (allocation is null)
        {
            error = "Intercompany allocation not found.";
            return false;
        }
        if (allocation.Status != IntercompanyAllocationStatus.Active)
        {
            error = "Allocation must be Active to process.";
            return false;
        }

        var totalAmount = allocation.Rate * allocation.Quantity;

        // Resolve Chart of Accounts via Account Mapping
        var intercompanyReceivable = GetMappedAccount("Intercompany Receivable");
        var intercompanyClearing = GetMappedAccount("Intercompany Clearing");
        var intercompanyAllocations = GetMappedAccount("Intercompany Allocations");

        var lines = new List<JournalLine>();

        // Source company: Debit Intercompany Receivable, Credit Intercompany Allocations
        lines.Add(new JournalLine(
            intercompanyReceivable,
            totalAmount,
            0,
            $"{allocation.Name} — receivable from recipients ({asOfDate:yyyy-MM-dd})",
            CompanyId: allocation.SourceCompanyId
        ));
        lines.Add(new JournalLine(
            intercompanyAllocations,
            0,
            totalAmount,
            $"{allocation.Name} — cost allocation recovery ({asOfDate:yyyy-MM-dd})",
            CompanyId: allocation.SourceCompanyId
        ));

        // Each recipient: Debit Intercompany Allocations, Credit Intercompany Clearing
        foreach (var recipient in allocation.Recipients)
        {
            var recipientAmount = totalAmount * recipient.SharePercent / 100;
            lines.Add(new JournalLine(
                intercompanyAllocations,
                recipientAmount,
                0,
                $"{allocation.Name} — allocated expense ({recipient.SharePercent}%) ({asOfDate:yyyy-MM-dd})",
                CompanyId: recipient.CompanyId
            ));
            lines.Add(new JournalLine(
                intercompanyClearing,
                0,
                recipientAmount,
                $"{allocation.Name} — payable to {_companies.FirstOrDefault(c => c.Id == allocation.SourceCompanyId)?.Name ?? "Source Company"} ({asOfDate:yyyy-MM-dd})",
                CompanyId: recipient.CompanyId
            ));
        }

        var journal = new JournalEntry
        {
            Date = asOfDate,
            Reference = allocation.Name,
            Description = $"Intercompany Allocation: {allocation.Name}",
            Lines = lines,
            TransactionType = TransactionType.InterCompany,
            CompanyId = allocation.SourceCompanyId,
            Status = JournalStatus.Posted
        };
        _entries.Add(journal);
        Persist();
        entry = journal;
        error = null;
        return true;
    }
    
    private bool ValidateJournal(JournalEntryRequest request, out string? error)
    {
        error = null;
        if (request.Lines.Count < 2)
        {
            error = "A journal entry requires at least two lines.";
            return false;
        }

        // Validate double-entry debits/credits balance
        decimal debitSum = request.Lines.Sum(l => l.Debit);
        decimal creditSum = request.Lines.Sum(l => l.Credit);
        if (Math.Abs(debitSum - creditSum) > 0.001m)
        {
            error = $"Journal entry is out of balance. Debits ({debitSum}) must equal Credits ({creditSum}).";
            return false;
        }

        // Validate against Closed Accounting Periods (IAS 8 / GAAP Compliance)
        var closedPeriod = _periodCloses.FirstOrDefault(p =>
            p.Status == PeriodCloseStatus.Closed &&
            p.PeriodEndDate.HasValue &&
            request.Date <= p.PeriodEndDate.Value &&
            (p.CompanyId == null || request.CompanyId == null || p.CompanyId == request.CompanyId));

        if (closedPeriod != null)
        {
            error = $"The accounting period '{closedPeriod.PeriodName}' ending {closedPeriod.PeriodEndDate:yyyy-MM-dd} is closed. You cannot post transactions into a closed period.";
            return false;
        }

        foreach (var line in request.Lines)
        {
            var acc = Find(line.AccountId);
            if (acc == null)
            {
                error = $"Account with ID {line.AccountId} does not exist.";
                return false;
            }
            if (acc.Status == AccountStatus.Inactive)
            {
                error = $"Account {acc.Code} - {acc.Name} is Inactive and cannot receive new postings.";
                return false;
            }
            if (!acc.IsPosting)
            {
                error = $"Account {acc.Code} - {acc.Name} is a Non-Posting/Header account and cannot receive transactions.";
                return false;
            }
            if (!acc.AllowManualJournal && request.TransactionType == TransactionType.Other)
            {
                error = $"Account {acc.Code} - {acc.Name} is not configured for manual journal entry adjustments.";
                return false;
            }
        }
        return true;
    }
    private void AddEvent(JournalEntry entry, string eventType, string actor, string detail) => _journalEvents.Add(new JournalEvent(Guid.NewGuid(), entry.Id, eventType, DateTime.UtcNow, actor, detail, entry.Version));
    
    private bool LoadState()
    {
        if (_dbFactory is null) return false;
        using var db = _dbFactory.CreateDbContext();
        db.Database.EnsureCreated();
        var snapshot = db.AccountingStateSnapshots.Find(1);
        if (snapshot is null) return false;
        var state = JsonSerializer.Deserialize<StoredState>(snapshot.Json);
        if (state is null) return false;
        
        // Migrate 4-digit codes to 5-digit codes if any exist in the saved snapshot
        if (state.Accounts != null)
        {
            foreach (var account in state.Accounts)
            {
                if (account.Code.Length == 4 && int.TryParse(account.Code, out var num))
                {
                    account.Code = (num * 10).ToString();
                }
                
                // Clear the default legacy 28,450.00 opening balance
                if ((account.Code == "11100" || account.Code == "1110" || account.Code == "11100") && account.OpeningBalance == 28450m)
                {
                    account.OpeningBalance = 0m;
                }
            }
        }
        
        // NOTE: Previously this block wiped all accounts when entries.Count == 0.
        // That caused data loss during race conditions or empty snapshots.
        // REMOVED — accounts are never auto-wiped after initial seed.

        _accounts.Clear(); _accounts.AddRange(state.Accounts ?? []);
        _entries.Clear(); _entries.AddRange(state.Entries ?? []);
        var reversalRefs = _entries.Where(e => e.Reference.StartsWith("REV-")).Select(e => e.Reference[4..]).ToHashSet();
        foreach (var entry in _entries)
        {
            if (reversalRefs.Contains(entry.Reference) && entry.Status == JournalStatus.Posted)
            {
                entry.Status = JournalStatus.Reversed;
            }
        }
        _templates.Clear(); _templates.AddRange(state.Templates ?? []);
        _recurringEntries.Clear(); _recurringEntries.AddRange(state.RecurringEntries ?? []);
        _journalEvents.Clear(); _journalEvents.AddRange(state.Events ?? []);
        _intercompanyAllocations.Clear(); _intercompanyAllocations.AddRange(state.IntercompanyAllocations ?? []);
        _companies.Clear(); _companies.AddRange(state.Companies ?? [new Company { Name = "Acme Holdings", Code = "ACME", Type = EntityType.Parent }, new Company { Name = "Acme Services", Code = "ASV" }, new Company { Name = "Acme Trading", Code = "ATD" }]);
        // Migration: correct legacy seed companies (created without explicit country/currency) to the active deployment country/currency
        if (_companies.Count > 0)
        {
            var (activeCountryName, activeCurrency) = _activeCountry switch
            {
                PayrollCountry.PK => ("Pakistan", "PKR"),
                PayrollCountry.UK => ("United Kingdom", "GBP"),
                PayrollCountry.CA => ("Canada", "CAD"),
                PayrollCountry.DE => ("Germany", "EUR"),
                PayrollCountry.SA => ("Saudi Arabia", "SAR"),
                PayrollCountry.AE => ("United Arab Emirates", "AED"),
                _ => ("United States", "USD"),
            };
            foreach (var company in _companies)
            {
                var isLegacySeed = company.Code is "ACME" or "ASV" or "ATD";
                if (!isLegacySeed) continue;
                if (string.IsNullOrWhiteSpace(company.Country) || company.Country == "United States")
                    company.Country = activeCountryName;
                if (string.IsNullOrWhiteSpace(company.CurrencyCode) || company.CurrencyCode == "USD")
                    company.CurrencyCode = activeCurrency;
            }
        }
        _customers.Clear(); _customers.AddRange(state.Customers ?? []);
        _products.Clear(); _products.AddRange(state.Products ?? []);
        _vendors.Clear(); _vendors.AddRange(state.Vendors ?? []);
        _purchaseOrders.Clear(); _purchaseOrders.AddRange(state.PurchaseOrders ?? []);
        _grns.Clear(); _grns.AddRange(state.Grns ?? []);
        _fixedAssets.Clear(); _fixedAssets.AddRange(state.FixedAssets ?? []);
        _taxAuthorities.Clear(); _taxAuthorities.AddRange(state.TaxAuthorities ?? []);
        _taxCodes.Clear(); _taxCodes.AddRange(state.TaxCodes ?? []);
        _taxRates.Clear(); _taxRates.AddRange(state.TaxRates ?? []);

        // Auto-seed presets if missing in loaded database snapshot
        if (_taxCodes.Count < 20 || !_taxCodes.Any(c => c.Code.StartsWith("PRA-PK") || c.Code.StartsWith("SALES-PK-18")))
        {
            SeedCountryTaxPreset("Pakistan");
            SeedCountryTaxPreset("United Kingdom");
            SeedCountryTaxPreset("Saudi Arabia");
            SeedCountryTaxPreset("United Arab Emirates");
            SeedCountryTaxPreset("United States");
            SeedCountryTaxPreset("Canada");
            SeedCountryTaxPreset("European Union");
        }
        _warehouses.Clear(); _warehouses.AddRange(state.Warehouses ?? []);
        _stockLevels.Clear(); _stockLevels.AddRange(state.StockLevels ?? []);
        _stockTransactions.Clear(); _stockTransactions.AddRange(state.StockTransactions ?? []);
        _salesInvoices.Clear(); _salesInvoices.AddRange(state.SalesInvoices ?? []);
        _estimates.Clear(); _estimates.AddRange(state.Estimates ?? []);
        _salesOrders.Clear(); _salesOrders.AddRange(state.SalesOrders ?? []);
        _creditNotes.Clear(); _creditNotes.AddRange(state.CreditNotes ?? []);
        _boms.Clear(); _boms.AddRange(state.Boms ?? []);
        _workOrders.Clear(); _workOrders.AddRange(state.WorkOrders ?? []);
        _customerPayments.Clear(); _customerPayments.AddRange(state.CustomerPayments ?? []);
        _vendorPayments.Clear(); _vendorPayments.AddRange(state.VendorPayments ?? []);
        _fundTransfers.Clear(); _fundTransfers.AddRange(state.FundTransfers ?? []);
        _reconciliations.Clear(); _reconciliations.AddRange(state.Reconciliations ?? []);
        _budgets.Clear(); _budgets.AddRange(state.Budgets ?? []);
        _periodCloses.Clear(); _periodCloses.AddRange(state.PeriodCloses ?? []);
        _vouchers.Clear(); _vouchers.AddRange(state.Vouchers ?? []);
        _expenseClaims.Clear(); _expenseClaims.AddRange(state.ExpenseClaims ?? []);
_bankImports.Clear(); _bankImports.AddRange(state.BankImports ?? []);
        _payComponents.Clear(); _payComponents.AddRange(state.PayComponents ?? []);
        _employees.Clear(); _employees.AddRange(state.Employees ?? []);
        _departments.Clear(); _departments.AddRange(state.Departments ?? []);
        _positions.Clear(); _positions.AddRange(state.Positions ?? []);
        _payGrades.Clear(); _payGrades.AddRange(state.PayGrades ?? []);
        _leaveBalances.Clear(); _leaveBalances.AddRange(state.LeaveBalances ?? []);
        _leaveRequests.Clear(); _leaveRequests.AddRange(state.LeaveRequests ?? []);
        _attendanceRecords.Clear(); _attendanceRecords.AddRange(state.AttendanceRecords ?? []);
        _payruns.Clear(); _payruns.AddRange(state.Payruns ?? []);
        _payrunEmployees.Clear(); _payrunEmployees.AddRange(state.PayrunEmployees ?? []);
        _payrunLines.Clear(); _payrunLines.AddRange(state.PayrunLines ?? []);
        _salarySlips.Clear(); _salarySlips.AddRange(state.SalarySlips ?? []);
        _holidays.Clear(); _holidays.AddRange(state.Holidays ?? []);
        _loanAdvances.Clear(); _loanAdvances.AddRange(state.LoanAdvances ?? []);
        _projects.Clear(); _projects.AddRange(state.Projects ?? []);
        _projectPhases.Clear(); _projectPhases.AddRange(state.ProjectPhases ?? []);
        _projectTasks.Clear(); _projectTasks.AddRange(state.ProjectTasks ?? []);
        _timesheets.Clear(); _timesheets.AddRange(state.Timesheets ?? []);
        _projectExpenses.Clear(); _projectExpenses.AddRange(state.ProjectExpenses ?? []);
        _taxObligations.Clear(); _taxObligations.AddRange(state.TaxObligations ?? []);
        _taxReturns.Clear(); _taxReturns.AddRange(state.TaxReturns ?? []);
        _taxExemptions.Clear(); _taxExemptions.AddRange(state.TaxExemptions ?? []);
        _withholdingCertificates.Clear(); _withholdingCertificates.AddRange(state.WithholdingCertificates ?? []);
        _eInvoices.Clear(); _eInvoices.AddRange(state.EInvoices ?? []);
        _surveys.Clear(); _surveys.AddRange(state.Surveys ?? []);
        _fieldVisits.Clear(); _fieldVisits.AddRange(state.FieldVisits ?? []);
        _inspections.Clear(); _inspections.AddRange(state.Inspections ?? []);
        _fieldWorkOrders.Clear(); _fieldWorkOrders.AddRange(state.FieldWorkOrders ?? []);
        _fieldExpenses.Clear(); _fieldExpenses.AddRange(state.FieldExpenses ?? []);
        _adminUsers.Clear(); _adminUsers.AddRange(state.AdminUsers ?? []);
        _userRoles.Clear(); _userRoles.AddRange(state.UserRoles ?? []);
        _branches.Clear(); _branches.AddRange(state.Branches ?? []);
        _approvalWorkflows.Clear(); _approvalWorkflows.AddRange(state.ApprovalWorkflows ?? []);
        _numberSeries.Clear(); _numberSeries.AddRange(state.NumberSeries ?? []);
        _currencies.Clear(); _currencies.AddRange(state.Currencies ?? []);
            _auditLog.Clear(); _auditLog.AddRange(state.AuditLog ?? []);
            _leases.Clear(); _leases.AddRange(state.Leases ?? []);
        _mappings.Clear(); _mappings.AddRange(state.Mappings ?? []);
        _prepaymentSchedules.Clear(); _prepaymentSchedules.AddRange(state.Prepayments ?? []);
        if (state.History != null)
        {
            foreach (var (id, history) in state.History) _history[id] = history;
        }
        EnsureRequiredPayrollAccounts();
        FixIncorrectMappings();
        CorrectMispostedRevenueLines();
        RecalculateHierarchy();
        Persist();
        return true;
    }

    private void EnsureRequiredPayrollAccounts()
    {
        var currentAssets = _accounts.FirstOrDefault(a => a.Code == "11000") ?? _accounts.FirstOrDefault(a => a.Code == "10000");
        var nonCurrentAssets = _accounts.FirstOrDefault(a => a.Code == "15000") ?? _accounts.FirstOrDefault(a => a.Code == "10000");
        var currentLiabilities = _accounts.FirstOrDefault(a => a.Code == "21000") ?? _accounts.FirstOrDefault(a => a.Code == "20000");
        var nonCurrentLiabilities = _accounts.FirstOrDefault(a => a.Code == "25000") ?? _accounts.FirstOrDefault(a => a.Code == "20000");
        var operatingExpenses = _accounts.FirstOrDefault(a => a.Code == "61000") ?? _accounts.FirstOrDefault(a => a.Code == "60000");

        var requiredAccounts = new List<(string Code, string Name, AccountType Type, Guid? ParentId, bool IsSystem, bool IsPosting)>
        {
            // Statutory Payroll
            ("21300", "Accrued Salaries Payable", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("21400", "Payroll Tax Payable", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("21500", "EOBI & Social Security Payable", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("21510", "Provident Fund & Pension Payable", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("21520", "End of Service Benefits (EOSB) Accrual", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("21530", "Employee Loan Deductions Clearing", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("61200", "Salaries & Wages Expense", AccountType.Expense, operatingExpenses?.Id, true, true),
            ("61210", "Housing & Living Allowances (HRA)", AccountType.Expense, operatingExpenses?.Id, true, true),
            ("61220", "Transport & Conveyance Allowance", AccountType.Expense, operatingExpenses?.Id, true, true),
            ("61230", "Medical & Utility Allowances", AccountType.Expense, operatingExpenses?.Id, true, true),
            ("61250", "Employer Statutory Payroll Contributions", AccountType.Expense, operatingExpenses?.Id, true, true),
            ("61260", "End of Service & Gratuity Expense", AccountType.Expense, operatingExpenses?.Id, true, true),

            // Granular Global Tax Engine (Sales, Expenses, Inventory, Fixed Assets, IAS 12)
            ("12200", "Withholding Tax Receivable (Advance Tax)", AccountType.Asset, currentAssets?.Id, true, true),
            ("14100", "Input VAT / Recoverable Tax (Operating Expenses)", AccountType.Asset, currentAssets?.Id, true, true),
            ("14120", "Import VAT & Customs Duty Tax Clearing", AccountType.Asset, currentAssets?.Id, true, true),
            ("14130", "Capital Goods Input VAT (Fixed Assets)", AccountType.Asset, currentAssets?.Id, true, true),
            ("14150", "Reverse Charge Mechanism (RCM) Input Tax", AccountType.Asset, currentAssets?.Id, true, true),
            ("15300", "Deferred Tax Asset (IAS 12)", AccountType.Asset, nonCurrentAssets?.Id, true, true),

            ("22000", "Sales Tax / Output VAT Payable", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("22030", "Import VAT Payable", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("22040", "Fixed Asset Disposal Output Tax Payable", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("22050", "Reverse Charge Mechanism (RCM) Output Tax Payable", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("22100", "Withholding Tax (WHT) Payable on Vendors", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("22200", "Corporate Income Tax Payable (IAS 12)", AccountType.Liability, currentLiabilities?.Id, true, true),
            ("25200", "Deferred Tax Liability (IAS 12)", AccountType.Liability, nonCurrentLiabilities?.Id, true, true),

            ("61700", "Non-Recoverable Purchase Tax & Duty Expense", AccountType.Expense, operatingExpenses?.Id, true, true),
            ("61800", "Corporate Income Tax Provision Expense (IAS 12)", AccountType.Expense, operatingExpenses?.Id, true, true),
        };

        foreach (var req in requiredAccounts)
        {
            var existing = _accounts.FirstOrDefault(a => a.Code == req.Code);
            if (existing == null)
            {
                var newAcc = new Account
                {
                    Code = req.Code,
                    Name = req.Name,
                    Type = req.Type,
                    ParentId = req.ParentId,
                    IsSystem = req.IsSystem,
                    IsPosting = req.IsPosting,
                    Currency = "USD",
                    Status = AccountStatus.Active,
                    UpdatedAt = DateTime.UtcNow
                };
                _accounts.Add(newAcc);
                _history[newAcc.Id] = [new(DateTime.UtcNow, "Created", "System account compliance migration")];
            }
            else
            {
                if (req.Code == "21500" && existing.Name == "Pension Fund Payable")
                {
                    existing.Name = "EOBI & Social Security Payable";
                }
            }
        }
    }

    private void FixIncorrectMappings()
    {
        var correctMappings = new Dictionary<string, string>
        {
            { "Sales", "41100" },
            { "Product Sales Revenue", "41100" },
            { "Service Revenue", "41200" },
            { "Sales Discount", "41300" },
            { "Sales Returns", "41400" },
            { "Customer Receivables", "12000" },
            { "Allowance for Doubtful Accounts", "12100" },
            { "Deferred Revenue", "23000" },
            { "Vendor Payables", "21100" },
            { "Purchases", "61100" },
            { "Purchase Discounts", "51100" },
            { "Purchase Returns", "51200" },
            { "GRNI Accrual", "21200" },
            { "Prepaid Expenses", "14000" },
            { "Cost of Goods Sold", "51000" },
            { "Inventory", "13000" },
            { "Sales Tax / Output VAT Payable", "22000" },
            { "Taxes", "22000" },
            { "Input Tax", "14100" },
            { "Purchase Input VAT / Recoverable Tax", "14100" },
            { "Non-Recoverable Purchase Tax & Duty Expense", "61700" },
            { "Import VAT & Customs Duty Tax Clearing", "14120" },
            { "Import VAT Payable", "22030" },
            { "Capital Goods Input VAT (Fixed Assets)", "14130" },
            { "Fixed Asset Disposal Output Tax Payable", "22040" },
            { "Withholding Tax Receivable (Advance Tax)", "12200" },
            { "WHT Receivable", "12200" },
            { "Withholding Tax (WHT) Payable on Vendors", "22100" },
            { "WHT Payable", "22100" },
            { "Corporate Income Tax Provision Expense", "61800" },
            { "Corporate Income Tax Payable", "22200" },
            { "Deferred Tax Asset", "15300" },
            { "Deferred Tax Liability", "25200" },
            { "Reverse Charge Mechanism (RCM) Output Tax Payable", "22050" },
            { "Reverse Charge Mechanism (RCM) Input Tax", "14150" },
            { "Fixed Assets", "15100" },
            { "Accumulated Depreciation", "15200" },
            { "Depreciation Expense", "61300" },
            { "Gain/Loss on Disposal", "51000" },
            { "Right of Use Asset", "15110" },
            { "Lease Liability", "21600" },
            { "Interest Expense", "61400" },
            { "Payroll Expense", "61200" },
            { "Employer Payroll Contributions Expense", "61250" },
            { "Accrued Salaries", "21300" },
            { "Payroll Taxes Accrued", "21400" },
            { "EOBI & Social Security Accrued", "21500" },
            { "Provident Fund Accrued", "21510" },
            { "Intercompany Receivable", "12300" },
            { "Intercompany Clearing", "21700" },
            { "Intercompany Allocations", "61500" },
            { "Overhead Allocation", "61600" },
            { "Overhead Allocation Payable", "21800" },
            { "Raw Materials Inventory", "13000" },
            { "Work in Progress", "13000" },
            { "Finished Goods Inventory", "13000" },
            { "Direct Labor", "61200" },
            { "Manufacturing Overhead", "61100" },
            { "Output Tax", "22000" },
            { "Input VAT on Operating Expenses", "14100" },
            { "Import Tax on Inventory", "14120" },
            { "Capital Goods Tax", "14130" },
            { "Corporate Income Tax Expense", "61800" },
            { "Non-Recoverable Tax Expense", "61700" },
            { "Pension Fund Accrued", "21510" },
        };

        bool changed = false;
        foreach (var mapping in _mappings)
        {
            if (correctMappings.TryGetValue(mapping.MappingKey, out var expectedCode))
            {
                var expectedAccount = _accounts.FirstOrDefault(a => a.Code == expectedCode);
                if (expectedAccount != null && mapping.AccountId != expectedAccount.Id)
                {
                    mapping.AccountId = expectedAccount.Id;
                    changed = true;
                }
            }
        }
        if (changed) Persist();
    }

    private void CorrectMispostedRevenueLines()
    {
        var revenueAcc = _accounts.FirstOrDefault(a => a.Code == "41100");
        var discountAcc = _accounts.FirstOrDefault(a => a.Code == "41300");
        var returnsAcc = _accounts.FirstOrDefault(a => a.Code == "41400");
        if (revenueAcc == null) return;

        // Build set of contra-revenue account IDs (Sales Discounts, Sales Returns, etc.)
        var contraRevenueIds = _accounts
            .Where(a => a.Type == AccountType.ContraRevenue && a.Id != revenueAcc.Id)
            .Select(a => a.Id)
            .ToHashSet();

        bool changed = false;

        // 1. In original sales entries, revenue credits should not go to contra-revenue accounts
        foreach (var entry in _entries.Where(e => e.Status == JournalStatus.Posted && e.TransactionType == TransactionType.Sales && !e.Reference.StartsWith("REV-")))
        {
            // Find lines where Credits went to a ContraRevenue account (wrong — revenue credits should go to Revenue accounts)
            var mispostedLines = entry.Lines
                .Where(l => contraRevenueIds.Contains(l.AccountId) && l.Credit > 0)
                .ToList();

            if (mispostedLines.Count == 0) continue;

            var correctedLines = new List<JournalLine>();
            foreach (var line in entry.Lines)
            {
                if (contraRevenueIds.Contains(line.AccountId) && line.Credit > 0)
                {
                    correctedLines.Add(new JournalLine(revenueAcc.Id, line.Debit, line.Credit, line.Memo, line.Comment, line.CurrencyCode, line.ExchangeRate, line.CompanyId));
                    changed = true;
                }
                else
                {
                    correctedLines.Add(line);
                }
            }

            if (mispostedLines.Count > 0)
            {
                entry.Lines.Clear();
                entry.Lines.AddRange(correctedLines);
            }
        }

        // 2. In reversal entries (REV-), discount reversal credits MUST go to the ContraRevenue account (Sales Discounts 41300)
        if (discountAcc != null)
        {
            foreach (var revEntry in _entries.Where(e => e.Reference.StartsWith("REV-")))
            {
                for (int i = 0; i < revEntry.Lines.Count; i++)
                {
                    var line = revEntry.Lines[i];
                    if (line.Memo != null && line.Memo.Contains("Sales Discounts", StringComparison.OrdinalIgnoreCase) && line.AccountId != discountAcc.Id)
                    {
                        revEntry.Lines[i] = new JournalLine(discountAcc.Id, line.Debit, line.Credit, line.Memo, line.Comment, line.CurrencyCode, line.ExchangeRate, line.CompanyId);
                        changed = true;
                    }
                }
            }
        }

        if (changed) Persist();
    }

    private void Persist()
    {
        if (_dbFactory is null) return;
        string json;
        lock (_persistLock)
        {
            json = JsonSerializer.Serialize(new StoredState(_accounts, _entries, _history, _templates, _recurringEntries, _journalEvents, _intercompanyAllocations, _companies, _customers, _products, _vendors, _purchaseOrders, _grns, _fixedAssets, _taxAuthorities, _taxCodes, _taxRates, _warehouses, _stockLevels, _stockTransactions, _salesInvoices, _estimates, _boms, _workOrders, _mappings, _salesOrders, _creditNotes, _customerPayments, _vendorPayments, _fundTransfers, _reconciliations, _budgets, _periodCloses, _vouchers, _expenseClaims, _bankImports, _payComponents, _employees, _departments, _positions, _payGrades, _leaveBalances, _leaveRequests, _attendanceRecords, _payruns, _payrunEmployees, _payrunLines, _salarySlips, _holidays, _loanAdvances, _taxSlabs, _employeeCompensations, _projects, _projectPhases, _projectTasks, _timesheets, _projectExpenses, _taxObligations, _taxReturns, _taxExemptions, _withholdingCertificates, _eInvoices, _surveys, _fieldVisits, _inspections, _fieldWorkOrders, _fieldExpenses, _adminUsers, _userRoles, _branches, _approvalWorkflows, _numberSeries, _currencies, _auditLog, _leases, _prepaymentSchedules));
        }
        using var db = _dbFactory.CreateDbContext();
        var snapshot = db.AccountingStateSnapshots.Find(1);
        if (snapshot is null) db.AccountingStateSnapshots.Add(new AccountingStateSnapshot { Id = 1, Json = json, UpdatedAt = DateTime.UtcNow });
        else { snapshot.Json = json; snapshot.UpdatedAt = DateTime.UtcNow; }
        db.SaveChanges();
    }
    private void Validate(AccountRequest r, Guid? editing)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) 
            throw new InvalidOperationException("Account name is required.");
            
        var code = r.Code?.Trim();
        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException("Account code is required.");
            
        if (code.Length != 5 || !code.All(char.IsDigit))
            throw new InvalidOperationException("Account code must contain exactly 5 numeric digits without letters or special characters.");
            
        if (_accounts.Any(a => a.Id != editing && a.Code.Equals(code, StringComparison.OrdinalIgnoreCase))) 
            throw new InvalidOperationException($"Account code '{code}' already exists. Account codes must be unique.");

        if (r.ParentId.HasValue)
        {
            if (editing.HasValue && r.ParentId.Value == editing.Value)
                throw new InvalidOperationException("An account cannot be its own parent.");

            if (editing.HasValue && CheckCircularReference(editing.Value, r.ParentId.Value))
                throw new InvalidOperationException("Circular reference detected. An account cannot be a child of its own descendants.");

            var parent = Find(r.ParentId.Value);
            if (parent == null)
                throw new InvalidOperationException("Selected parent account is invalid.");
        }
    }

    private bool CheckCircularReference(Guid accountId, Guid? parentId)
    {
        var current = parentId;
        while (current.HasValue)
        {
            if (current.Value == accountId) return true;
            var parent = _accounts.FirstOrDefault(x => x.Id == current.Value);
            current = parent?.ParentId;
        }
        return false;
    }

    public void RecalculateHierarchy()
    {
        lock (_lock)
        {
            foreach (var a in _accounts)
            {
                // 1. Determine Level
                if (a.ParentId == null)
                {
                    a.Level = AccountLevel.MainHead;
                }
                else
                {
                    var parent = _accounts.FirstOrDefault(x => x.Id == a.ParentId);
                    if (parent == null || parent.ParentId == null)
                    {
                        a.Level = AccountLevel.SubHead;
                    }
                    else
                    {
                        a.Level = AccountLevel.DetailAccount;
                    }
                }

                // 2. Determine Normal Balance
                a.NormalBalance = GetNormalBalance(a.Type);

                // 3. Determine if it is a Posting Account (leaf node)
                bool hasChildren = _accounts.Any(x => x.ParentId == a.Id);
                a.IsPosting = !hasChildren;
            }
        }
    }

    private NormalBalanceType GetNormalBalance(AccountType type)
    {
        return type switch
        {
            AccountType.Asset or AccountType.Expense or AccountType.ContraLiability or AccountType.ContraEquity or AccountType.ContraRevenue => NormalBalanceType.Debit,
            _ => NormalBalanceType.Credit
        };
    }

    public Guid GetMappedAccount(string mappingKey)
    {
        lock (_lock)
        {
            var mapping = _mappings.FirstOrDefault(m => m.MappingKey.Equals(mappingKey, StringComparison.OrdinalIgnoreCase));
            if (mapping != null)
            {
                var acc = _accounts.FirstOrDefault(a => a.Id == mapping.AccountId);
                if (acc != null && acc.IsPosting && acc.Status == AccountStatus.Active)
                {
                    return acc.Id;
                }
            }

            // Fallback default seeded codes if mapping not customized
            var fallbackCode = mappingKey switch
            {
                "Customer Receivables" => "12000",
                "Allowance for Doubtful Accounts" => "12100",
                "WHT Receivable" => "12200",
                "Inventory" => "13000",
                "Prepaid Expenses" => "14000",
                "Fixed Assets" => "15100",
                "Accumulated Depreciation" => "15200",
                "Vendor Payables" => "21100",
                "GRNI Accrual" => "21200",
                "Accrued Salaries" => "21300",
                "Payroll Taxes Accrued" or "Payroll Income Tax Withholding Payable" => "21400",
                "EOBI & Social Security Accrued" or "EOBI & Social Security Payable" => "21500",
                "Provident Fund Accrued" or "Provident Fund & Pension Payable" => "21510",
                "Pension Fund Accrued" => "21510",
                "Taxes" or "Sales Tax / Output VAT Payable" or "Output Tax" => "22000",
                "Purchase Input VAT / Recoverable Tax" or "Input Tax" or "Input VAT on Operating Expenses" => "14100",
                "Import VAT & Customs Duty Tax Clearing" or "Import Tax on Inventory" => "14120",
                "Capital Goods Input VAT (Fixed Assets)" or "Capital Goods Tax" => "14130",
                "Reverse Charge Mechanism (RCM) Input Tax" => "14150",
                "Deferred Tax Asset" => "15300",
                "Import VAT Payable" => "22030",
                "Fixed Asset Disposal Output Tax Payable" => "22040",
                "Reverse Charge Mechanism (RCM) Output Tax Payable" => "22050",
                "WHT Payable" or "Withholding Tax (WHT) Payable on Vendors" => "22100",
                "WHT Receivable" or "Withholding Tax Receivable (Advance Tax)" => "12200",
                "Corporate Income Tax Payable" => "22200",
                "Deferred Tax Liability" => "25200",
                "Non-Recoverable Purchase Tax & Duty Expense" or "Non-Recoverable Tax Expense" => "61700",
                "Corporate Income Tax Provision Expense" or "Corporate Income Tax Expense" => "61800",
                "Deferred Revenue" => "23000",
                "Sales" or "Product Sales Revenue" => "41100",
                "Service Revenue" => "41200",
                "Sales Discount" => "41300",
                "Sales Returns" => "41400",
                "Cost of Goods Sold" => "51000",
                "Purchase Discounts" => "51100",
                "Purchase Returns" => "51200",
                "Purchases" => "61100",
                "Payroll Expense" => "61200",
                "Employer Payroll Contributions Expense" => "61250",
                "Depreciation Expense" => "61300",
                "Finance Costs" => "61400",
                "Raw Materials Inventory" => "13000",
                "Work in Progress" => "13000",
                "Finished Goods Inventory" => "13000",
                "Direct Labor" => "61200",
                "Manufacturing Overhead" => "61100",
                "Gain/Loss on Disposal" => "51000",
                "Right of Use Asset" => "15110",
                "Lease Liability" => "21600",
                "Interest Expense" => "61400",
                "Intercompany Receivable" => "12300",
                "Intercompany Clearing" => "21700",
                "Intercompany Allocations" => "61500",
                "Overhead Allocation" => "61600",
                "Overhead Allocation Payable" => "21800",
                _ => null
            };

            if (fallbackCode != null)
            {
                var fallbackAcc = _accounts.FirstOrDefault(a => a.Code == fallbackCode);
                if (fallbackAcc != null) return fallbackAcc.Id;
            }

            // Last resort fallback
            return _accounts.FirstOrDefault(a => a.IsPosting && a.Status == AccountStatus.Active)?.Id ?? Guid.Empty;
        }
    }

    public void ResetDatabase(string? companyName = null, string? country = null, string? currency = null)
    {
        lock (_lock)
        {
            _accounts.Clear();
            _entries.Clear();
            _history.Clear();
            _templates.Clear();
            _recurringEntries.Clear();
            _journalEvents.Clear();
            _intercompanyAllocations.Clear();
            _companies.Clear();
            _customers.Clear();
            _products.Clear();
            _vendors.Clear();
            _purchaseOrders.Clear();
            _grns.Clear();
            _prs.Clear();
            _rfqs.Clear();
            _vendorQuotes.Clear();
            _vendorBills.Clear();
            _fixedAssets.Clear();
            _taxAuthorities.Clear();
            _taxCodes.Clear();
            _taxRates.Clear();
            _warehouses.Clear();
            _stockLevels.Clear();
            _stockTransactions.Clear();
            _salesInvoices.Clear();
            _estimates.Clear();
            _salesOrders.Clear();
            _creditNotes.Clear();
            _boms.Clear();
            _workOrders.Clear();
            _customerPayments.Clear();
            _vendorPayments.Clear();
            _fundTransfers.Clear();
            _reconciliations.Clear();
            _budgets.Clear();
            _periodCloses.Clear();
            _vouchers.Clear();
            _expenseClaims.Clear();
            _bankImports.Clear();
            _payComponents.Clear();
            _employees.Clear();
            _departments.Clear();
            _positions.Clear();
            _payGrades.Clear();
            _leaveBalances.Clear();
            _leaveRequests.Clear();
            _attendanceRecords.Clear();
            _payruns.Clear();
            _payrunEmployees.Clear();
            _payrunLines.Clear();
            _salarySlips.Clear();
            _holidays.Clear();
            _loanAdvances.Clear();
            _taxSlabs.Clear();
            _employeeCompensations.Clear();
            _projects.Clear();
            _projectPhases.Clear();
            _projectTasks.Clear();
            _timesheets.Clear();
            _projectExpenses.Clear();
            _taxObligations.Clear();
            _taxReturns.Clear();
            _taxExemptions.Clear();
            _withholdingCertificates.Clear();
            _eInvoices.Clear();
            _surveys.Clear();
            _fieldVisits.Clear();
            _inspections.Clear();
            _fieldWorkOrders.Clear();
            _fieldExpenses.Clear();
            _adminUsers.Clear();
            _userRoles.Clear();
            _branches.Clear();
            _approvalWorkflows.Clear();
            _numberSeries.Clear();
            _currencies.Clear();
            _grnModels.Clear();
            _stockTransfers.Clear();
            _auditLog.Clear();
            _mappings.Clear();
            _leases.Clear();
            _prepaymentSchedules.Clear();

            var parentName = !string.IsNullOrWhiteSpace(companyName) ? companyName.Trim() : "Apex Enterprise";
            var parentCountry = !string.IsNullOrWhiteSpace(country) ? country : "Pakistan";
            var parentCurrency = !string.IsNullOrWhiteSpace(currency) ? currency : "PKR";

            // Clean Company
            var parentEntity = new Company { Name = parentName, Code = "MAIN", Type = EntityType.Parent, Country = parentCountry, CurrencyCode = parentCurrency };
            _companies.AddRange([parentEntity]);

            // Re-seed structural chart of accounts
            SeedAccounts();

            // Re-seed Tax Authorities & VAT codes
            var hmrc = new TaxAuthority { Name = "HMRC", Country = "United Kingdom" };
            var irs = new TaxAuthority { Name = "IRS", Country = "United States" };
            var cdtfa = new TaxAuthority { Name = "CDTFA", Country = "United States", State = "California" };
            var fta = new TaxAuthority { Name = "FTA", Country = "United Arab Emirates" };
            var zatca = new TaxAuthority { Name = "ZATCA", Country = "Saudi Arabia" };
            var fbr = new TaxAuthority { Name = "FBR", Country = "Pakistan" };
            var pra = new TaxAuthority { Name = "PRA", Country = "Pakistan", State = "Punjab" };
            var cra = new TaxAuthority { Name = "CRA", Country = "Canada" };
            var eu = new TaxAuthority { Name = "EU VAT", Country = "European Union" };
            _taxAuthorities.AddRange([hmrc, irs, cdtfa, fta, zatca, fbr, pra, cra, eu]);

            var today = DateOnly.FromDateTime(DateTime.Today);
            var ukVat = new TaxCode { Code = "VAT-UK-20", Name = "UK Standard VAT 20%", TaxAuthorityId = hmrc.Id };
            ukVat.Rates.Add(new TaxRate { TaxCodeId = ukVat.Id, Percentage = 20m, EffectiveFrom = today });
            
            var usSales = new TaxCode { Code = "ST-US-CA", Name = "California Sales Tax 8.25%", TaxAuthorityId = cdtfa.Id };
            usSales.Rates.Add(new TaxRate { TaxCodeId = usSales.Id, Percentage = 8.25m, EffectiveFrom = today });

            var uaeVat = new TaxCode { Code = "VAT-UAE-5", Name = "UAE Standard VAT 5%", TaxAuthorityId = fta.Id };
            uaeVat.Rates.Add(new TaxRate { TaxCodeId = uaeVat.Id, Percentage = 5m, EffectiveFrom = today });

            var ksaVat = new TaxCode { Code = "VAT-KSA-15", Name = "KSA Standard VAT 15%", TaxAuthorityId = zatca.Id };
            ksaVat.Rates.Add(new TaxRate { TaxCodeId = ksaVat.Id, Percentage = 15m, EffectiveFrom = today });

            var pkVat = new TaxCode { Code = "VAT-PK-16", Name = "Pakistan Sales Tax 16%", TaxAuthorityId = fbr.Id };
            pkVat.Rates.Add(new TaxRate { TaxCodeId = pkVat.Id, Percentage = 16m, EffectiveFrom = today });

            var caHst = new TaxCode { Code = "HST-CA-13", Name = "Canada HST 13%", TaxAuthorityId = cra.Id };
            caHst.Rates.Add(new TaxRate { TaxCodeId = caHst.Id, Percentage = 13m, EffectiveFrom = today });

            var euVatStandard = new TaxCode { Code = "VAT-EU-21", Name = "EU Standard VAT 21%", TaxAuthorityId = eu.Id };
            euVatStandard.Rates.Add(new TaxRate { TaxCodeId = euVatStandard.Id, Percentage = 21m, EffectiveFrom = today });

            var ukVatReduced = new TaxCode { Code = "VAT-UK-5", Name = "UK Reduced VAT 5%", TaxAuthorityId = hmrc.Id };
            ukVatReduced.Rates.Add(new TaxRate { TaxCodeId = ukVatReduced.Id, Percentage = 5m, EffectiveFrom = today });

            _taxCodes.AddRange([ukVat, ukVatReduced, usSales, uaeVat, ksaVat, pkVat, caHst, euVatStandard]);
            _taxRates.AddRange(_taxCodes.SelectMany(c => c.Rates));

            var defaultWarehouse = new Warehouse { Name = "Main Warehouse", Location = "Headquarters", CompanyId = parentEntity.Id };
            _warehouses.Add(defaultWarehouse);

            SeedAdministrationData();
            Persist();
        }
    }

    public bool SetMapping(string mappingKey, Guid accountId, out string? error)
    {
        lock (_lock)
        {
            var acc = Find(accountId);
            if (acc == null) { error = "Account not found."; return false; }
            if (!acc.IsPosting) { error = "Only leaf/posting accounts can be mapped to operations."; return false; }
            if (acc.Status == AccountStatus.Inactive) { error = "Cannot map to an inactive account."; return false; }

            var existing = _mappings.FirstOrDefault(m => m.MappingKey.Equals(mappingKey, StringComparison.OrdinalIgnoreCase));
            if (existing != null)
            {
                existing.AccountId = accountId;
            }
            else
            {
                _mappings.Add(new AccountMapping { MappingKey = mappingKey, AccountId = accountId });
            }

            Persist();
            error = null;
            return true;
        }
    }

    private bool IsAccountMappedAsSystemControl(Guid accountId)
    {
        return _mappings.Any(m => m.AccountId == accountId);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PAYROLL & HR MODULE
    // ═══════════════════════════════════════════════════════════════════════════════

    #region Seed Payroll Data

    private void SeedProjectsData()
    {
        var companyId = _companies.FirstOrDefault()?.Id;
        var engDept = _departments.FirstOrDefault(d => d.Code == "ENG")?.Id;
        var finDept = _departments.FirstOrDefault(d => d.Code == "FIN")?.Id;
        var opsDept = _departments.FirstOrDefault(d => d.Code == "OPS")?.Id;
        var manager = _employees.FirstOrDefault(e => e.DepartmentId == engDept)?.Id;
        var financeManager = _employees.FirstOrDefault(e => e.DepartmentId == finDept)?.Id;
        var engineer2 = _employees.Skip(1).FirstOrDefault(e => e.DepartmentId == engDept)?.Id;

        var p1 = new Project
        {
            ProjectNumber = NextProjectNumber(),
            Name = "ERP Cloud Migration",
            Description = "Migrate on-premise ERP to multi-tenant cloud infrastructure with zero downtime.",
            Status = ProjectStatus.Active,
            StartDate = new DateOnly(2026, 1, 15),
            EndDate = new DateOnly(2026, 9, 30),
            ManagerId = manager,
            DepartmentId = engDept,
            CustomerId = null,
            CustomerName = "Internal",
            Budget = 250000,
            Currency = "USD",
            ProgressPercent = 45,
            CompanyId = companyId,
        };
        _projects.Add(p1);

        var p2 = new Project
        {
            ProjectNumber = NextProjectNumber(),
            Name = "Retail POS Rollout",
            Description = "Deploy point-of-sale terminals across 120 retail branches nationwide.",
            Status = ProjectStatus.Active,
            StartDate = new DateOnly(2026, 3, 1),
            EndDate = new DateOnly(2026, 12, 31),
            ManagerId = financeManager,
            DepartmentId = opsDept,
            CustomerName = "Acme Retail Group",
            Budget = 420000,
            Currency = "USD",
            ProgressPercent = 20,
            CompanyId = companyId,
        };
        _projects.Add(p2);

        var p3 = new Project
        {
            ProjectNumber = NextProjectNumber(),
            Name = "Financial Dashboard Revamp",
            Description = "Rebuild executive financial dashboards with real-time analytics and AI insights.",
            Status = ProjectStatus.Planning,
            StartDate = new DateOnly(2026, 8, 1),
            EndDate = new DateOnly(2027, 1, 31),
            ManagerId = financeManager,
            DepartmentId = finDept,
            CustomerName = "Internal",
            Budget = 120000,
            Currency = "USD",
            ProgressPercent = 0,
            CompanyId = companyId,
        };
        _projects.Add(p3);

        // ── Phases ─────────────────────────────────────────────────────────────
        _projectPhases.AddRange([
            new ProjectPhase { ProjectId = p1.Id, Name = "Discovery", Description = "Requirements & architecture", OrderIndex = 1 },
            new ProjectPhase { ProjectId = p1.Id, Name = "Migration", Description = "Data migration & cutover", OrderIndex = 2, Status = ProjectTaskStatus.InProgress },
            new ProjectPhase { ProjectId = p1.Id, Name = "UAT & Go-Live", Description = "User acceptance & launch", OrderIndex = 3 },
            new ProjectPhase { ProjectId = p2.Id, Name = "Pilot", Description = "Pilot in 10 stores", OrderIndex = 1, Status = ProjectTaskStatus.InProgress },
            new ProjectPhase { ProjectId = p2.Id, Name = "Nationwide", Description = "Scale to all branches", OrderIndex = 2 },
        ]);

        // ── Tasks ──────────────────────────────────────────────────────────────
        var phaseDiscovery = _projectPhases.First(p => p.Name == "Discovery" && p.ProjectId == p1.Id).Id;
        var phaseMigration = _projectPhases.First(p => p.Name == "Migration" && p.ProjectId == p1.Id).Id;
        var phasePilot = _projectPhases.First(p => p.Name == "Pilot" && p.ProjectId == p2.Id).Id;

        _projectTasks.AddRange([
            new ProjectTask { ProjectId = p1.Id, PhaseId = phaseDiscovery, Title = "Architecture blueprint", Description = "Define target cloud architecture", AssigneeId = manager, Status = ProjectTaskStatus.Completed, Priority = TaskPriority.High, StartDate = new DateOnly(2026, 1, 15), DueDate = new DateOnly(2026, 2, 15), EstimatedHours = 80, ActualHours = 92, CompanyId = companyId },
            new ProjectTask { ProjectId = p1.Id, PhaseId = phaseMigration, Title = "Database migration scripts", Description = "Write & test ETL scripts", AssigneeId = engineer2, Status = ProjectTaskStatus.InProgress, Priority = TaskPriority.Critical, StartDate = new DateOnly(2026, 2, 16), DueDate = new DateOnly(2026, 5, 1), EstimatedHours = 160, ActualHours = 118, CompanyId = companyId },
            new ProjectTask { ProjectId = p1.Id, PhaseId = phaseMigration, Title = "Zero-downtime cutover plan", Description = "Plan and rehearse cutover runbook", AssigneeId = manager, Status = ProjectTaskStatus.NotStarted, Priority = TaskPriority.High, StartDate = new DateOnly(2026, 6, 1), DueDate = new DateOnly(2026, 8, 15), EstimatedHours = 60, CompanyId = companyId },
            new ProjectTask { ProjectId = p2.Id, PhaseId = phasePilot, Title = "POS hardware procurement", Description = "Source terminals for pilot stores", AssigneeId = financeManager, Status = ProjectTaskStatus.InProgress, Priority = TaskPriority.Medium, StartDate = new DateOnly(2026, 3, 1), DueDate = new DateOnly(2026, 4, 15), EstimatedHours = 40, ActualHours = 22, CompanyId = companyId },
            new ProjectTask { ProjectId = p2.Id, PhaseId = phasePilot, Title = "Branch staff training", Description = "Train cashiers on new POS software", AssigneeId = financeManager, Status = ProjectTaskStatus.Completed, Priority = TaskPriority.Low, StartDate = new DateOnly(2026, 5, 1), DueDate = new DateOnly(2026, 6, 1), EstimatedHours = 120, ActualHours = 130, CompanyId = companyId },
        ]);

        // ── Timesheets ─────────────────────────────────────────────────────────
        var today = DateOnly.FromDateTime(DateTime.Today);
        if (engineer2.HasValue)
        {
            _timesheets.AddRange([
                new TimesheetEntry { ProjectId = p1.Id, TaskId = _projectTasks.First(t => t.Title == "Database migration scripts").Id, EmployeeId = engineer2.Value, Date = today.AddDays(-2), Hours = 8, Description = "ETL script debugging", Billable = false, CompanyId = companyId },
                new TimesheetEntry { ProjectId = p1.Id, TaskId = _projectTasks.First(t => t.Title == "Database migration scripts").Id, EmployeeId = engineer2.Value, Date = today.AddDays(-1), Hours = 7.5m, Description = "Load testing", Billable = false, CompanyId = companyId },
                new TimesheetEntry { ProjectId = p2.Id, TaskId = _projectTasks.First(t => t.Title == "Branch staff training").Id, EmployeeId = engineer2.Value, Date = today.AddDays(-3), Hours = 6, Description = "Training material review", Billable = true, BillableRate = 95, CompanyId = companyId },
            ]);
        }
        if (manager.HasValue)
        {
            _timesheets.AddRange([
                new TimesheetEntry { ProjectId = p1.Id, TaskId = _projectTasks.First(t => t.Title == "Architecture blueprint").Id, EmployeeId = manager.Value, Date = today.AddDays(-4), Hours = 4, Description = "Stakeholder workshop", Billable = true, BillableRate = 120, CompanyId = companyId },
                new TimesheetEntry { ProjectId = p2.Id, TaskId = _projectTasks.First(t => t.Title == "POS hardware procurement").Id, EmployeeId = manager.Value, Date = today.AddDays(-2), Hours = 5, Description = "Vendor negotiation", Billable = true, BillableRate = 120, CompanyId = companyId },
            ]);
        }

        // ── Expenses ───────────────────────────────────────────────────────────
        _projectExpenses.AddRange([
            new ProjectExpense { ProjectId = p1.Id, Category = "Software", Description = "Cloud infrastructure credits", VendorName = "Cloud Provider", Amount = 15000, Currency = "USD", ExpenseDate = today.AddMonths(-1), Billable = false, CompanyId = companyId },
            new ProjectExpense { ProjectId = p1.Id, Category = "Travel", Description = "Site visit to data center", VendorName = "Airline", Amount = 2400, Currency = "USD", ExpenseDate = today.AddDays(-20), Billable = false, CompanyId = companyId },
            new ProjectExpense { ProjectId = p2.Id, Category = "Hardware", Description = "Pilot POS terminal batch", VendorName = "Retail Hardware Co", Amount = 32000, Currency = "USD", ExpenseDate = today.AddDays(-15), Billable = true, CompanyId = companyId },
            new ProjectExpense { ProjectId = p2.Id, Category = "Consulting", Description = "Installation contractor fees", VendorName = "Field Services LLC", Amount = 8500, Currency = "USD", ExpenseDate = today.AddDays(-10), Billable = true, CompanyId = companyId },
        ]);

        foreach (var p in _projects) RecalculateProjectProgress(p.Id);
    }

    private void SeedComplianceData()
    {
        var companyId = _companies.FirstOrDefault()?.Id;
        var today = DateOnly.FromDateTime(DateTime.Today);
        var qStart = new DateOnly(today.Year, ((today.Month - 1) / 3) * 3 + 1, 1);
        var qEnd = qStart.AddMonths(3).AddDays(-1);

        // ── Tax Obligations ──────────────────────────────────────────────────
        _taxObligations.AddRange([
            new TaxObligation { ObligationNumber = NextObligationNumber(), JurisdictionId = "UK", ObligationType = "VAT", PeriodStart = qStart, PeriodEnd = qEnd, DueDate = qEnd.AddDays(37), Status = TaxObligationStatus.Due, AmountDue = 12840, CompanyId = companyId, Notes = "Quarterly VAT Return" },
            new TaxObligation { ObligationNumber = NextObligationNumber(), JurisdictionId = "PK", ObligationType = "Sales Tax", PeriodStart = new DateOnly(today.Year, today.Month, 1), PeriodEnd = new DateOnly(today.Year, today.Month, DateTime.DaysInMonth(today.Year, today.Month)), DueDate = new DateOnly(today.Year, today.Month, 20), Status = TaxObligationStatus.Due, AmountDue = 45200, CompanyId = companyId, Notes = "Monthly Sales Tax Return (FBR)" },
            new TaxObligation { ObligationNumber = NextObligationNumber(), JurisdictionId = "SA", ObligationType = "VAT", PeriodStart = qStart, PeriodEnd = qEnd, DueDate = qEnd.AddDays(30), Status = TaxObligationStatus.Filed, FiledDate = today.AddDays(-5), AmountDue = 31800, AmountPaid = 31800, CompanyId = companyId, Notes = "ZATCA Quarterly VAT" },
            new TaxObligation { ObligationNumber = NextObligationNumber(), JurisdictionId = "AE", ObligationType = "Corporate Tax", PeriodStart = new DateOnly(today.Year - 1, 1, 1), PeriodEnd = new DateOnly(today.Year - 1, 12, 31), DueDate = new DateOnly(today.Year, 9, 30), Status = TaxObligationStatus.Filed, FiledDate = today.AddDays(-20), AmountDue = 67450, AmountPaid = 67450, CompanyId = companyId, Notes = "Annual CT Registration" },
        ]);

        // ── Tax Returns ──────────────────────────────────────────────────────
        var outputTax = _salesInvoices.Sum(i => i.TaxTotal);
        var inputTax = _vendorBills.Sum(b => b.Lines.Sum(l => l.TaxAmount));
        _taxReturns.AddRange([
            new TaxReturn { ReturnNumber = NextReturnNumber(), JurisdictionId = "UK", ReturnType = "VAT", PeriodStart = qStart, PeriodEnd = qEnd, DueDate = qEnd.AddDays(37), Status = "Draft", OutputTax = Math.Round(outputTax, 2), InputTax = Math.Round(inputTax, 2), CompanyId = companyId, Reference = "Computed from sales invoices & vendor bills" },
            new TaxReturn { ReturnNumber = NextReturnNumber(), JurisdictionId = "PK", ReturnType = "Sales Tax", PeriodStart = new DateOnly(today.Year, today.Month, 1), PeriodEnd = new DateOnly(today.Year, today.Month, DateTime.DaysInMonth(today.Year, today.Month)), DueDate = new DateOnly(today.Year, today.Month, 20), Status = "Filed", OutputTax = Math.Round(outputTax, 2), InputTax = Math.Round(inputTax * 0.8m, 2), AmountPaid = 45200, FiledDate = today.AddDays(-3), CompanyId = companyId },
            new TaxReturn { ReturnNumber = NextReturnNumber(), JurisdictionId = "SA", ReturnType = "VAT", PeriodStart = qStart.AddMonths(-3), PeriodEnd = qStart.AddDays(-1), DueDate = qStart.AddDays(29), Status = "Filed", OutputTax = 51200, InputTax = 19400, AmountPaid = 31800, FiledDate = today.AddDays(-8), CompanyId = companyId },
        ]);

        // ── Withholding Certificates ─────────────────────────────────────────
        _withholdingCertificates.AddRange([
            new WithholdingCertificate { CertificateNumber = "WHT-2026-001", CertificateType = "Payment", CounterpartyName = "Global Consulting Ltd", TaxId = "GB-4521-8890", RatePercent = 20, GrossAmount = 120000, WithheldAmount = 24000, PeriodStart = new DateOnly(2026, 1, 1), PeriodEnd = new DateOnly(2026, 3, 31), Status = "Issued", CompanyId = companyId },
            new WithholdingCertificate { CertificateNumber = "WHT-2026-002", CertificateType = "Contract", CounterpartyName = "Field Services LLC", TaxId = "SA-3012-7784", RatePercent = 5, GrossAmount = 85000, WithheldAmount = 4250, PeriodStart = new DateOnly(2026, 4, 1), PeriodEnd = new DateOnly(2026, 6, 30), Status = "Issued", CompanyId = companyId },
            new WithholdingCertificate { CertificateNumber = "WHT-2026-003", CertificateType = "Payment", CounterpartyName = "Acme Marketing Agency", TaxId = "AE-1044-5566", RatePercent = 15, GrossAmount = 45000, WithheldAmount = 6750, PeriodStart = new DateOnly(2026, 1, 1), PeriodEnd = new DateOnly(2026, 6, 30), Status = "Draft", CompanyId = companyId },
        ]);

        // ── E-Invoices ───────────────────────────────────────────────────────
        foreach (var inv in _salesInvoices.Take(6))
        {
            _eInvoices.Add(new EInvoice
            {
                InvoiceNumber = inv.InvoiceNumber,
                InvoiceType = "Sales",
                CounterpartyName = _customers.FirstOrDefault(c => c.Id == inv.CustomerId)?.Name ?? "Customer",
                CounterpartyTaxId = null,
                IssueDate = inv.InvoiceDate,
                Reference = $"Sales invoice {inv.InvoiceNumber}",
                GrossAmount = inv.TotalAmount - inv.TaxTotal,
                TaxAmount = inv.TaxTotal,
                TotalAmount = inv.TotalAmount,
                Status = EInvoiceStatus.Validated,
                Uuid = Guid.NewGuid().ToString(),
                CompanyId = companyId,
            });
        }
        foreach (var bill in _vendorBills.Take(4))
        {
            var tax = bill.Lines.Sum(l => l.TaxAmount);
            _eInvoices.Add(new EInvoice
            {
                InvoiceNumber = bill.BillNumber,
                InvoiceType = "Purchase",
                CounterpartyName = _vendors.FirstOrDefault(v => v.Id == bill.VendorId)?.Name ?? "Vendor",
                IssueDate = bill.Date,
                Reference = $"Vendor bill {bill.BillNumber}",
                GrossAmount = bill.TotalAmount - tax,
                TaxAmount = tax,
                TotalAmount = bill.TotalAmount,
                Status = EInvoiceStatus.Validated,
                Uuid = Guid.NewGuid().ToString(),
                CompanyId = companyId,
            });
        }
    }

    private void SeedFieldOperationsData()
    {
        var companyId = _companies.FirstOrDefault()?.Id;
        var today = DateOnly.FromDateTime(DateTime.Today);
        var engId = _employees.FirstOrDefault()?.Id;
        var techId = _employees.Skip(1).FirstOrDefault()?.Id;
        var customer1 = _customers.FirstOrDefault()?.Id;
        var customer1Name = _customers.FirstOrDefault()?.Name ?? "Acme Corp";

        // ── Surveys ──────────────────────────────────────────────────────────
        _surveys.AddRange([
            new Survey { SurveyNumber = NextSurveyNumber(), Title = "Q3 Customer Satisfaction Survey", Description = "Measure satisfaction across retail and wholesale customers.", Category = "Customer Satisfaction", Status = SurveyStatus.Active, StartDate = new DateOnly(today.Year, today.Month, 1), EndDate = new DateOnly(today.Year, today.Month, 30), Region = "North Region", AssignedTo = engId, TargetResponses = 200, ResponseCount = 87, CompanyId = companyId },
            new Survey { SurveyNumber = NextSurveyNumber(), Title = "Product Quality Feedback", Description = "Collect product quality feedback from field agents.", Category = "Quality", Status = SurveyStatus.Active, StartDate = new DateOnly(today.Year, today.Month, 10), EndDate = new DateOnly(today.Year, today.Month + 1, 10), Region = "All Regions", AssignedTo = techId, TargetResponses = 150, ResponseCount = 42, CompanyId = companyId },
            new Survey { SurveyNumber = NextSurveyNumber(), Title = "Market Demand Study", Description = "Evaluate demand for new product lines in key territories.", Category = "Market Research", Status = SurveyStatus.Draft, StartDate = new DateOnly(today.Year, today.Month + 1, 1), Region = "South Region", AssignedTo = engId, TargetResponses = 300, ResponseCount = 0, CompanyId = companyId },
        ]);

        // ── Field Visits ─────────────────────────────────────────────────────
        _fieldVisits.AddRange([
            new FieldVisit { VisitNumber = NextVisitNumber(), VisitType = "Site Visit", CustomerId = customer1, CustomerName = customer1Name, ContactName = "Jane Smith", Purpose = "Annual account review and upsell opportunity.", ScheduledDate = today.AddDays(3), StartTime = "10:00", DurationHours = 2.5m, Status = FieldVisitStatus.Scheduled, Location = "Downtown HQ", AssignedTo = techId, CompanyId = companyId },
            new FieldVisit { VisitNumber = NextVisitNumber(), VisitType = "Support Visit", CustomerName = "Riverside Traders", ContactName = "Mark Lee", Purpose = "Resolve billing issue and provide training.", ScheduledDate = today.AddDays(-5), StartTime = "14:00", DurationHours = 1.5m, Status = FieldVisitStatus.Completed, Location = "Riverside Branch", AssignedTo = engId, Findings = "Trained staff on new invoicing flow; issue resolved.", CompanyId = companyId },
            new FieldVisit { VisitNumber = NextVisitNumber(), VisitType = "Audit Visit", CustomerName = "Northgate Stores", ContactName = "Priya Patel", Purpose = "Inventory spot-check and compliance review.", ScheduledDate = today.AddDays(-12), StartTime = "09:00", DurationHours = 3m, Status = FieldVisitStatus.Completed, Location = "Northgate Mall", AssignedTo = techId, Findings = "Stock variances under 1%; no action needed.", CompanyId = companyId },
        ]);

        // ── Inspections ──────────────────────────────────────────────────────
        _inspections.AddRange([
            new Inspection { InspectionNumber = NextInspectionNumber(), InspectionType = "Quality", Location = "Main Warehouse", ScheduledDate = today.AddDays(2), InspectorId = engId, Status = InspectionStatus.Scheduled, Score = 0, CompanyId = companyId },
            new Inspection { InspectionNumber = NextInspectionNumber(), InspectionType = "Safety", Location = "Production Floor A", ScheduledDate = today.AddDays(-8), InspectorId = techId, Status = InspectionStatus.Passed, Score = 92, Findings = "All fire extinguishers up to date. Minor signage improvement recommended.", Reference = "Safety audit Q3", CompanyId = companyId },
            new Inspection { InspectionNumber = NextInspectionNumber(), InspectionType = "Quality", Location = "Branch #12", ScheduledDate = today.AddDays(-15), InspectorId = engId, Status = InspectionStatus.Failed, Score = 61, Findings = "Stock rotation process not followed in cold storage.", Reference = "Routine quality check", CompanyId = companyId },
        ]);

        // ── Field Work Orders ────────────────────────────────────────────────
        _fieldWorkOrders.AddRange([
            new FieldWorkOrder { WorkOrderNumber = NextFieldWorkOrderNumber(), WorkType = "Repair", CustomerName = customer1Name, CustomerId = customer1, Description = "POS terminal not connecting to network.", Priority = "High", Status = FieldWorkOrderStatus.InProgress, AssignedTo = techId, ScheduledDate = today.AddDays(1), LaborHours = 3, LaborCost = 150, PartsCost = 0, Location = customer1Name, CompanyId = companyId },
            new FieldWorkOrder { WorkOrderNumber = NextFieldWorkOrderNumber(), WorkType = "Installation", CustomerName = "Riverside Traders", Description = "Install new POS workstation and barcode scanner.", Priority = "Medium", Status = FieldWorkOrderStatus.Assigned, AssignedTo = engId, ScheduledDate = today.AddDays(5), LaborHours = 6, LaborCost = 360, PartsCost = 480, Location = "Riverside Branch", CompanyId = companyId },
            new FieldWorkOrder { WorkOrderNumber = NextFieldWorkOrderNumber(), WorkType = "Maintenance", CustomerName = "Northgate Stores", Description = "Quarterly maintenance of 4 self-checkout kiosks.", Priority = "Low", Status = FieldWorkOrderStatus.Completed, AssignedTo = techId, ScheduledDate = today.AddDays(-20), CompletedDate = today.AddDays(-18), LaborHours = 8, LaborCost = 440, PartsCost = 120, Location = "Northgate Mall", CompanyId = companyId },
        ]);

        // ── Field Expenses ───────────────────────────────────────────────────
        _fieldExpenses.AddRange([
            new FieldExpense { ExpenseNumber = NextFieldExpenseNumber(), WorkOrderId = _fieldWorkOrders.FirstOrDefault(w => w.WorkType == "Repair")?.Id, Category = "Travel", Description = "Site visit fuel and parking", Amount = 85.50m, Currency = "USD", ExpenseDate = today.AddDays(-1), Reimbursed = true, CompanyId = companyId },
            new FieldExpense { ExpenseNumber = NextFieldExpenseNumber(), WorkOrderId = _fieldWorkOrders.FirstOrDefault(w => w.WorkType == "Installation")?.Id, Category = "Supplies", Description = "Cabling and connectors", Amount = 145m, Currency = "USD", ExpenseDate = today.AddDays(-2), CompanyId = companyId },
            new FieldExpense { ExpenseNumber = NextFieldExpenseNumber(), WorkOrderId = _fieldWorkOrders.FirstOrDefault(w => w.WorkType == "Maintenance")?.Id, Category = "Meals", Description = "Team lunch during maintenance", Amount = 62m, Currency = "USD", ExpenseDate = today.AddDays(-18), Reimbursed = true, CompanyId = companyId },
        ]);
    }

    private void SeedAdministrationData()
    {
        var companyId = _companies.FirstOrDefault()?.Id;

        // ── Users (5 Demo Accounts) ──────────────────────────────────────────
        _adminUsers.AddRange([
            new AdminUser { UserName = "admin", FullName = "Muhammad Ali", Email = "admin@acme.com", Role = "Finance admin", Status = UserStatus.Active, LastLogin = DateTime.UtcNow, CompanyId = companyId },
            new AdminUser { UserName = "accountant", FullName = "Sarah Jenkins", Email = "accountant@acme.com", Role = "Senior Accountant", Status = UserStatus.Active, LastLogin = DateTime.UtcNow, CompanyId = companyId },
            new AdminUser { UserName = "inventory", FullName = "David Chen", Email = "inventory@acme.com", Role = "Warehouse Manager", Status = UserStatus.Active, LastLogin = DateTime.UtcNow, CompanyId = companyId },
            new AdminUser { UserName = "manufacturing", FullName = "Alex Rivera", Email = "manufacturing@acme.com", Role = "Production Engineer", Status = UserStatus.Active, LastLogin = DateTime.UtcNow, CompanyId = companyId },
            new AdminUser { UserName = "auditor", FullName = "Amina Al-Mansoor", Email = "auditor@acme.com", Role = "External Auditor", Status = UserStatus.Active, LastLogin = DateTime.UtcNow, CompanyId = companyId },
            new AdminUser { UserName = "hr", FullName = "Hina Tariq", Email = "hr@acme.com", Role = "HR Officer", Status = UserStatus.Active, LastLogin = DateTime.UtcNow, CompanyId = companyId },
        ]);

        // ── Roles ────────────────────────────────────────────────────────────
        var allPerms = new List<string> { "Dashboard", "Sales", "Procurement", "Banking", "Accounting", "Inventory", "Manufacturing", "Payroll", "Field Ops", "Compliance", "Projects", "Analytics", "Administration" };
        _userRoles.AddRange([
            new UserRole { Name = "Finance admin", Description = "Full access across all modules", Permissions = allPerms, CompanyId = companyId },
            new UserRole { Name = "Senior Accountant", Description = "Accounting, banking, and reporting", Permissions = new List<string> { "Dashboard", "Sales", "Procurement", "Banking", "Accounting", "Inventory", "Analytics" }, CompanyId = companyId },
            new UserRole { Name = "HR Officer", Description = "HR and payroll operations, attendance, and salary sheet generation", Permissions = new List<string> { "Dashboard", "Payroll" }, CompanyId = companyId },
            new UserRole { Name = "Warehouse Manager", Description = "Procurement, multi-warehouse, and logistics", Permissions = new List<string> { "Dashboard", "Procurement", "Inventory", "Analytics" }, CompanyId = companyId },
            new UserRole { Name = "Production Engineer", Description = "BOM, work orders, and job costing", Permissions = new List<string> { "Dashboard", "Inventory", "Manufacturing", "Projects", "Analytics" }, CompanyId = companyId },
            new UserRole { Name = "External Auditor", Description = "Read-only financial review and compliance", Permissions = new List<string> { "Dashboard", "Accounting", "Compliance", "Analytics", "Administration" }, CompanyId = companyId },
        ]);

        // ── Branches ─────────────────────────────────────────────────────────
        _branches.AddRange([
            new Branch { Name = "Head Office", Code = "HO", City = "Karachi", Address = "Main Business District", Active = true, CompanyId = companyId },
            new Branch { Name = "Lahore Branch", Code = "LH", City = "Lahore", Address = "Gulberg III", Active = true, CompanyId = companyId },
            new Branch { Name = "Islamabad Branch", Code = "ISB", City = "Islamabad", Address = "Blue Area", Active = true, CompanyId = companyId },
        ]);

        // ── Approval Workflows ───────────────────────────────────────────────
        _approvalWorkflows.AddRange([
            new ApprovalWorkflow { Name = "Invoice Approval", Module = "Sales", ApproverRole = "Senior Accountant", Steps = 1, Active = true, CompanyId = companyId },
            new ApprovalWorkflow { Name = "Bill Approval", Module = "Procurement", ApproverRole = "Finance admin", Steps = 2, Active = true, CompanyId = companyId },
            new ApprovalWorkflow { Name = "Expense Claim Approval", Module = "Payroll", ApproverRole = "Manager", Steps = 2, Active = true, CompanyId = companyId },
        ]);

        // ── Number Series ────────────────────────────────────────────────────
        _numberSeries.AddRange([
            new NumberSeries { Name = "Invoice", Prefix = "INV-", NextNumber = 1, Format = "INV-00001", Active = true, CompanyId = companyId },
            new NumberSeries { Name = "Bill", Prefix = "BILL-", NextNumber = 1, Format = "BILL-00001", Active = true, CompanyId = companyId },
            new NumberSeries { Name = "Journal Entry", Prefix = "JE-", NextNumber = 1, Format = "JE-00001", Active = true, CompanyId = companyId },
            new NumberSeries { Name = "Payment Receipt", Prefix = "RCPT-", NextNumber = 1, Format = "RCPT-00001", Active = true, CompanyId = companyId },
            new NumberSeries { Name = "Credit Note", Prefix = "CN-", NextNumber = 1, Format = "CN-00001", Active = true, CompanyId = companyId },
            new NumberSeries { Name = "Debit Note", Prefix = "DN-", NextNumber = 1, Format = "DN-00001", Active = true, CompanyId = companyId },
            new NumberSeries { Name = "Purchase Order", Prefix = "PO-", NextNumber = 1, Format = "PO-00001", Active = true, CompanyId = companyId },
            new NumberSeries { Name = "Work Order", Prefix = "WO-", NextNumber = 1, Format = "WO-00001", Active = true, CompanyId = companyId },
        ]);

        // ── Currencies ───────────────────────────────────────────────────────
        _currencies.AddRange([
            new Currency { Code = "USD", Name = "US Dollar", Symbol = "$", Rate = 1m, Base = true, Active = true, CompanyId = companyId },
            new Currency { Code = "GBP", Name = "British Pound", Symbol = "£", Rate = 0.79m, Base = false, Active = true, CompanyId = companyId },
            new Currency { Code = "EUR", Name = "Euro", Symbol = "€", Rate = 0.92m, Base = false, Active = true, CompanyId = companyId },
            new Currency { Code = "PKR", Name = "Pakistani Rupee", Symbol = "₨", Rate = 278.5m, Base = false, Active = true, CompanyId = companyId },
            new Currency { Code = "AED", Name = "UAE Dirham", Symbol = "د.إ", Rate = 3.67m, Base = false, Active = true, CompanyId = companyId },
        ]);
    }

    private void SeedPayrollData()
    {
        var companyId = _companies.FirstOrDefault()?.Id;

        // ── Departments ─────────────────────────────────────────────────────────
        var deptEng = new Department { Code = "ENG", Name = "Engineering", Description = "Software Engineering", CompanyId = companyId };
        var deptFin = new Department { Code = "FIN", Name = "Finance & Accounting", Description = "Finance and Accounting", CompanyId = companyId };
        var deptSales = new Department { Code = "SAL", Name = "Sales & Marketing", Description = "Sales and Marketing", CompanyId = companyId };
        var deptHr = new Department { Code = "HR", Name = "Human Resources", Description = "People and Culture", CompanyId = companyId };
        var deptOps = new Department { Code = "OPS", Name = "Operations & Supply Chain", Description = "Operations", CompanyId = companyId };
        var deptLegal = new Department { Code = "LEG", Name = "Legal & Compliance", Description = "Legal and Compliance", CompanyId = companyId };
        var deptIt = new Department { Code = "IT", Name = "Information Technology", Description = "IT Infrastructure", CompanyId = companyId };
        _departments.AddRange([deptEng, deptFin, deptSales, deptHr, deptOps, deptLegal, deptIt]);

        // ── Positions ───────────────────────────────────────────────────────────
        _positions.AddRange([
            new Position { Code = "CEO", Name = "Chief Executive Officer", DepartmentId = deptHr.Id, MinSalary = 150000, MaxSalary = 500000, CompanyId = companyId },
            new Position { Code = "CFO", Name = "Chief Financial Officer", DepartmentId = deptFin.Id, MinSalary = 120000, MaxSalary = 350000, CompanyId = companyId },
            new Position { Code = "CTO", Name = "Chief Technology Officer", DepartmentId = deptEng.Id, MinSalary = 120000, MaxSalary = 350000, CompanyId = companyId },
            new Position { Code = "VP_ENG", Name = "VP of Engineering", DepartmentId = deptEng.Id, MinSalary = 100000, MaxSalary = 250000, CompanyId = companyId },
            new Position { Code = "VP_SAL", Name = "VP of Sales", DepartmentId = deptSales.Id, MinSalary = 100000, MaxSalary = 250000, CompanyId = companyId },
            new Position { Code = "SR_ENG", Name = "Senior Software Engineer", DepartmentId = deptEng.Id, MinSalary = 80000, MaxSalary = 160000, CompanyId = companyId },
            new Position { Code = "JR_ENG", Name = "Junior Software Engineer", DepartmentId = deptEng.Id, MinSalary = 45000, MaxSalary = 85000, CompanyId = companyId },
            new Position { Code = "ACC", Name = "Accountant", DepartmentId = deptFin.Id, MinSalary = 50000, MaxSalary = 90000, CompanyId = companyId },
            new Position { Code = "SALES", Name = "Sales Representative", DepartmentId = deptSales.Id, MinSalary = 40000, MaxSalary = 80000, CompanyId = companyId },
            new Position { Code = "HR_OFF", Name = "HR Officer", DepartmentId = deptHr.Id, MinSalary = 45000, MaxSalary = 80000, CompanyId = companyId },
        ]);

        // ── Pay Components: Earnings (Common + Country-Specific) ────────────────
        _payComponents.AddRange([
            // Basic
            new PayComponent { Code = "BASIC", Name = "Basic Salary", Type = PayComponentType.Earning, Category = PayComponentCategory.BasicSalary, IsTaxable = true, DisplayOrder = 1, Country = PayrollCountry.US },
            // Allowances
            new PayComponent { Code = "HOU", Name = "Housing Allowance", Type = PayComponentType.Earning, Category = PayComponentCategory.HousingAllowance, IsTaxable = true, PercentageOf = 30, PercentageBase = "Basic", DisplayOrder = 10, Country = PayrollCountry.US },
            new PayComponent { Code = "TRA", Name = "Transport Allowance", Type = PayComponentType.Earning, Category = PayComponentCategory.TransportAllowance, IsTaxable = true, FixedAmount = 300, DisplayOrder = 11, Country = PayrollCountry.US },
            new PayComponent { Code = "MED", Name = "Medical Allowance", Type = PayComponentType.Earning, Category = PayComponentCategory.MedicalAllowance, IsTaxable = false, FixedAmount = 200, DisplayOrder = 12, Country = PayrollCountry.US },
            new PayComponent { Code = "UTL", Name = "Utility Allowance", Type = PayComponentType.Earning, Category = PayComponentCategory.PhoneAllowance, IsTaxable = true, FixedAmount = 100, DisplayOrder = 13, Country = PayrollCountry.US },
            new PayComponent { Code = "PERF", Name = "Performance Bonus", Type = PayComponentType.Earning, Category = PayComponentCategory.PerformanceBonus, IsTaxable = true, DisplayOrder = 20, Country = PayrollCountry.US },
            new PayComponent { Code = "SHIFT", Name = "Shift Allowance", Type = PayComponentType.Earning, Category = PayComponentCategory.ShiftAllowance, IsTaxable = true, FixedAmount = 200, DisplayOrder = 21, Country = PayrollCountry.US },
        ]);

        // ── Pay Components: Deductions - US ────────────────────────────────────
        _payComponents.AddRange([
            new PayComponent { Code = "FED_TAX", Name = "Federal Income Tax", Type = PayComponentType.Deduction, Category = PayComponentCategory.FederalIncomeTax, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.US, DisplayOrder = 100 },
            new PayComponent { Code = "ST_TAX", Name = "State Income Tax", Type = PayComponentType.Deduction, Category = PayComponentCategory.StateIncomeTax, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.US, DisplayOrder = 101 },
            new PayComponent { Code = "FICA_SS", Name = "FICA Social Security", Type = PayComponentType.Deduction, Category = PayComponentCategory.FICA_SocialSecurity, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.US, DisplayOrder = 102 },
            new PayComponent { Code = "FICA_MED", Name = "FICA Medicare", Type = PayComponentType.Deduction, Category = PayComponentCategory.FICA_Medicare, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.US, DisplayOrder = 103 },
            new PayComponent { Code = "401K", Name = "401(k) Contribution", Type = PayComponentType.Deduction, Category = PayComponentCategory.Traditional401k_Contribution, IsTaxable = false, Country = PayrollCountry.US, DisplayOrder = 104 },
            new PayComponent { Code = "HEALTH", Name = "Health Insurance", Type = PayComponentType.Deduction, Category = PayComponentCategory.HealthInsurance, IsTaxable = false, Country = PayrollCountry.US, DisplayOrder = 105 },
        ]);

        // ── Pay Components: Deductions - CA ────────────────────────────────────
        _payComponents.AddRange([
            new PayComponent { Code = "CA_FED", Name = "Federal Tax (CA)", Type = PayComponentType.Deduction, Category = PayComponentCategory.FederalTax_CA, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.CA, DisplayOrder = 100 },
            new PayComponent { Code = "CA_PROV", Name = "Provincial Tax (CA)", Type = PayComponentType.Deduction, Category = PayComponentCategory.ProvincialTax_CA, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.CA, DisplayOrder = 101 },
            new PayComponent { Code = "CA_CPP", Name = "CPP Contribution", Type = PayComponentType.Deduction, Category = PayComponentCategory.CPP, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.CA, DisplayOrder = 102 },
            new PayComponent { Code = "CA_EI", Name = "EI Premium", Type = PayComponentType.Deduction, Category = PayComponentCategory.EI, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.CA, DisplayOrder = 103 },
        ]);

        // ── Pay Components: Deductions - UK ────────────────────────────────────
        _payComponents.AddRange([
            new PayComponent { Code = "UK_PAYE", Name = "PAYE Income Tax", Type = PayComponentType.Deduction, Category = PayComponentCategory.PAYE, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.UK, DisplayOrder = 100 },
            new PayComponent { Code = "UK_NI", Name = "National Insurance", Type = PayComponentType.Deduction, Category = PayComponentCategory.NationalInsurance, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.UK, DisplayOrder = 101 },
            new PayComponent { Code = "UK_PENSION", Name = "Workplace Pension", Type = PayComponentType.Deduction, Category = PayComponentCategory.SIPP, IsTaxable = false, Country = PayrollCountry.UK, DisplayOrder = 102 },
            new PayComponent { Code = "UK_SL", Name = "Student Loan", Type = PayComponentType.Deduction, Category = PayComponentCategory.StudentLoan_Plan2, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.UK, DisplayOrder = 103 },
        ]);

        // ── Pay Components: Deductions - DE (EU) ──────────────────────────────
        _payComponents.AddRange([
            new PayComponent { Code = "DE_LST", Name = "Lohnsteuer (Income Tax)", Type = PayComponentType.Deduction, Category = PayComponentCategory.IncomeTax, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.DE, DisplayOrder = 100 },
            new PayComponent { Code = "DE_SOLI", Name = "Solidaritaetszuschlag", Type = PayComponentType.Deduction, Category = PayComponentCategory.SolidaritySurcharge, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.DE, DisplayOrder = 101 },
            new PayComponent { Code = "DE_RV", Name = "Rentenversicherung (Pension)", Type = PayComponentType.Deduction, Category = PayComponentCategory.Rentenversicherung, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.DE, DisplayOrder = 102 },
            new PayComponent { Code = "DE_KV", Name = "Krankenversicherung (Health)", Type = PayComponentType.Deduction, Category = PayComponentCategory.Krankenversicherung, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.DE, DisplayOrder = 103 },
            new PayComponent { Code = "DE_PV", Name = "Pflegeversicherung (Care)", Type = PayComponentType.Deduction, Category = PayComponentCategory.Pflegeversicherung, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.DE, DisplayOrder = 104 },
            new PayComponent { Code = "DE_AV", Name = "Arbeitslosenversicherung (Unemployment)", Type = PayComponentType.Deduction, Category = PayComponentCategory.Arbeitslosenversicherung, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.DE, DisplayOrder = 105 },
        ]);

        // ── Pay Components: Deductions - PK ────────────────────────────────────
        _payComponents.AddRange([
            new PayComponent { Code = "PK_IT", Name = "Income Tax on Salary", Type = PayComponentType.Deduction, Category = PayComponentCategory.IncomeTax_PK, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.PK, DisplayOrder = 100 },
            new PayComponent { Code = "PK_EOBI", Name = "EOBI Contribution", Type = PayComponentType.Deduction, Category = PayComponentCategory.EOBI, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.PK, DisplayOrder = 101 },
            new PayComponent { Code = "PK_PF", Name = "Provident Fund", Type = PayComponentType.Deduction, Category = PayComponentCategory.PensionContribution, IsTaxable = false, Country = PayrollCountry.PK, DisplayOrder = 102 },
            new PayComponent { Code = "PK_SESSI", Name = "SESSI Contribution", Type = PayComponentType.Deduction, Category = PayComponentCategory.SESSI, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.PK, DisplayOrder = 103 },
        ]);

        // ── Pay Components: Deductions - SA ────────────────────────────────────
        _payComponents.AddRange([
            new PayComponent { Code = "SA_GOSI_S", Name = "GOSI Employee (Saudi)", Type = PayComponentType.Deduction, Category = PayComponentCategory.GOSI_Saudi, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.SA, DisplayOrder = 100 },
            new PayComponent { Code = "SA_GOSI_E", Name = "GOSI Employer Contribution", Type = PayComponentType.EmployerContribution, Category = PayComponentCategory.Employer_GOSI, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.SA, DisplayOrder = 101 },
        ]);

        // ── Pay Components: Deductions - UAE ───────────────────────────────────
        _payComponents.AddRange([
            new PayComponent { Code = "AE_GPSSA", Name = "GPSSA Contribution (UAE National)", Type = PayComponentType.Deduction, Category = PayComponentCategory.VoluntaryPension, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.AE, DisplayOrder = 100 },
            new PayComponent { Code = "AE_Gratuity", Name = "End of Service Gratuity", Type = PayComponentType.EmployerContribution, Category = PayComponentCategory.Gratuity_UAE, IsStatutory = true, IsTaxable = false, Country = PayrollCountry.AE, DisplayOrder = 101 },
        ]);

        // ── Tax Slabs: Pakistan 2026–2027 (FBR) ───────────────────────────────
        // Post-seed: deactivate tax slabs not belonging to the active deployment country
        // This ensures users only see their own country's tax rules during normal operation
        Action deactivateForeignSlabs = () =>
        {
            foreach (var slab in _taxSlabs)
            {
                slab.IsActive = slab.Country == _activeCountry;
            }
        };
        _taxSlabs.Add(new SalaryTaxSlab
        {
            Country = PayrollCountry.PK,
            TaxYear = 2026,
            Name = "Pakistan FBR Salary Tax Slab 2026–2027 (Annual)",
            Currency = "PKR",
            FilingStatus = TaxFilingStatus.Single,
            PeriodBasis = "Annual",
            StandardDeduction = 0,
            PersonalAllowance = 0,
            IsActive = true,
            Brackets =
            [
                new SalaryTaxBracket { FromAmount = 0, ToAmount = 600000, RatePercent = 0, FixedTax = 0, Description = "Up to PKR 600,000 - Exempt" },
                new SalaryTaxBracket { FromAmount = 600001, ToAmount = 1200000, RatePercent = 1, FixedTax = 0, Description = "PKR 600,001 – 1,200,000 @ 1%" },
                new SalaryTaxBracket { FromAmount = 1200001, ToAmount = 2200000, RatePercent = 11, FixedTax = 0, Description = "PKR 1,200,001 – 2,200,000 @ 11%" },
                new SalaryTaxBracket { FromAmount = 2200001, ToAmount = 3200000, RatePercent = 20, FixedTax = 0, Description = "PKR 2,200,001 – 3,200,000 @ 20%" },
                new SalaryTaxBracket { FromAmount = 3200001, ToAmount = 4100000, RatePercent = 25, FixedTax = 0, Description = "PKR 3,200,001 – 4,100,000 @ 25%" },
                new SalaryTaxBracket { FromAmount = 4100001, ToAmount = 5600000, RatePercent = 29, FixedTax = 0, Description = "PKR 4,100,001 – 5,600,000 @ 29%" },
                new SalaryTaxBracket { FromAmount = 5600001, ToAmount = 7000000, RatePercent = 32, FixedTax = 0, Description = "PKR 5,600,001 – 7,000,000 @ 32%" },
                new SalaryTaxBracket { FromAmount = 7000001, ToAmount = null, RatePercent = 35, FixedTax = 0, Description = "Above PKR 7,000,000 @ 35%" },
            ]
        });

        // ── Tax Slabs: US 2026–2027 (Federal, Single) ─────────────────────────
        _taxSlabs.Add(new SalaryTaxSlab
        {
            Country = PayrollCountry.US,
            TaxYear = 2026,
            Name = "US Federal Income Tax 2026–2027 (Single)",
            Currency = "USD",
            FilingStatus = TaxFilingStatus.Single,
            PeriodBasis = "Annual",
            StandardDeduction = 15400,
            PersonalAllowance = 0,
            IsActive = true,
            Brackets =
            [
                new SalaryTaxBracket { FromAmount = 0, ToAmount = 12400, RatePercent = 10, FixedTax = 0, Description = "10% bracket" },
                new SalaryTaxBracket { FromAmount = 12401, ToAmount = 50400, RatePercent = 12, FixedTax = 1220, Description = "12% bracket" },
                new SalaryTaxBracket { FromAmount = 50401, ToAmount = 105700, RatePercent = 22, FixedTax = 5696, Description = "22% bracket" },
                new SalaryTaxBracket { FromAmount = 105701, ToAmount = 201775, RatePercent = 24, FixedTax = 18016, Description = "24% bracket" },
                new SalaryTaxBracket { FromAmount = 201776, ToAmount = 256225, RatePercent = 32, FixedTax = 41136, Description = "32% bracket" },
                new SalaryTaxBracket { FromAmount = 256226, ToAmount = 640600, RatePercent = 35, FixedTax = 58576, Description = "35% bracket" },
                new SalaryTaxBracket { FromAmount = 640601, ToAmount = null, RatePercent = 37, FixedTax = 192801, Description = "37% bracket" },
            ]
        });

        // ── Tax Slabs: UK 2026/27 ─────────────────────────────────────────────
        _taxSlabs.Add(new SalaryTaxSlab
        {
            Country = PayrollCountry.UK,
            TaxYear = 2026,
            Name = "UK Income Tax 2026/27",
            Currency = "GBP",
            FilingStatus = TaxFilingStatus.Single,
            PeriodBasis = "Annual",
            StandardDeduction = 12570,
            PersonalAllowance = 12570,
            IsActive = true,
            Brackets =
            [
                new SalaryTaxBracket { FromAmount = 0, ToAmount = 12570, RatePercent = 0, FixedTax = 0, Description = "Personal Allowance (0%)" },
                new SalaryTaxBracket { FromAmount = 12571, ToAmount = 50270, RatePercent = 20, FixedTax = 7540, Description = "Basic Rate (20%)" },
                new SalaryTaxBracket { FromAmount = 50271, ToAmount = 125140, RatePercent = 40, FixedTax = 42516, Description = "Higher Rate (40%)" },
                new SalaryTaxBracket { FromAmount = 125141, ToAmount = null, RatePercent = 45, FixedTax = 0, Description = "Additional Rate (45%)" },
            ]
        });

        // ── Tax Slabs: Canada 2026–2027 (Federal) ─────────────────────────────
        _taxSlabs.Add(new SalaryTaxSlab
        {
            Country = PayrollCountry.CA,
            TaxYear = 2026,
            Name = "Canada Federal Income Tax 2026–2027",
            Currency = "CAD",
            FilingStatus = TaxFilingStatus.Single,
            PeriodBasis = "Annual",
            StandardDeduction = 16129,
            PersonalAllowance = 16129,
            IsActive = true,
            Brackets =
            [
                new SalaryTaxBracket { FromAmount = 0, ToAmount = 57375, RatePercent = 15, FixedTax = 0, Description = "15% bracket" },
                new SalaryTaxBracket { FromAmount = 57376, ToAmount = 114749, RatePercent = 20.5m, FixedTax = 8606.25m, Description = "20.5% bracket" },
                new SalaryTaxBracket { FromAmount = 114750, ToAmount = 181440, RatePercent = 26, FixedTax = 19947.38m, Description = "26% bracket" },
                new SalaryTaxBracket { FromAmount = 181441, ToAmount = 258482, RatePercent = 29, FixedTax = 31252.38m, Description = "29% bracket" },
                new SalaryTaxBracket { FromAmount = 258483, ToAmount = null, RatePercent = 33, FixedTax = 50392.38m, Description = "33% bracket" },
            ]
        });

        // ── Tax Slabs: Germany 2026–2027 ──────────────────────────────────────
        _taxSlabs.Add(new SalaryTaxSlab
        {
            Country = PayrollCountry.DE,
            TaxYear = 2026,
            Name = "Germany Lohnsteuer 2026–2027",
            Currency = "EUR",
            FilingStatus = TaxFilingStatus.Single,
            PeriodBasis = "Annual",
            StandardDeduction = 12300,
            PersonalAllowance = 12300,
            IsActive = true,
            Brackets =
            [
                new SalaryTaxBracket { FromAmount = 0, ToAmount = 12348, RatePercent = 0, FixedTax = 0, Description = "Tax-free allowance" },
                new SalaryTaxBracket { FromAmount = 12349, ToAmount = 17799, RatePercent = 14, FixedTax = 0, Description = "14% (progression zone)" },
                new SalaryTaxBracket { FromAmount = 17800, ToAmount = 69878, RatePercent = 24, FixedTax = 1654, Description = "24% bracket" },
                new SalaryTaxBracket { FromAmount = 69879, ToAmount = 277825, RatePercent = 42, FixedTax = 12860, Description = "42% bracket" },
                new SalaryTaxBracket { FromAmount = 277826, ToAmount = null, RatePercent = 45, FixedTax = 23340, Description = "45% top rate" },
            ]
        });

        // ── Tax Slabs: Saudi Arabia 2026–2027 (No income tax, GOSI only) ─────
        _taxSlabs.Add(new SalaryTaxSlab
        {
            Country = PayrollCountry.SA,
            TaxYear = 2026,
            Name = "Saudi Arabia - No Income Tax (GOSI Only)",
            Currency = "SAR",
            FilingStatus = TaxFilingStatus.Single,
            PeriodBasis = "Annual",
            StandardDeduction = 0,
            PersonalAllowance = 0,
            IsActive = true,
            Brackets = []
        });

        // ── Tax Slabs: UAE 2026–2027 (No income tax, GPSSA only) ─────────────
        _taxSlabs.Add(new SalaryTaxSlab
        {
            Country = PayrollCountry.AE,
            TaxYear = 2026,
            Name = "UAE - No Income Tax (GPSSA Only)",
            Currency = "AED",
            FilingStatus = TaxFilingStatus.Single,
            PeriodBasis = "Annual",
            StandardDeduction = 0,
            PersonalAllowance = 0,
            IsActive = true,
            Brackets = []
        });

        // Deactivate tax slabs for countries other than the active deployment country
        deactivateForeignSlabs();

        // ── Sample Employees (One per country) ────────────────────────────────
        _employees.AddRange([
            new Employee
            {
                EmployeeNumber = "EMP-0001", FirstName = "John", LastName = "Doe", Country = PayrollCountry.US,
                StateProvince = "California", City = "San Francisco", DepartmentId = deptEng.Id,
                PositionId = _positions[5].Id, BasicSalary = 105000, Currency = "USD",
                HireDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-365)), Email = "john.doe@acme.com",
                BankName = "Chase", BankAccountNumber = "****1234", BankRoutingNumber = "021000021",
                TaxFilingStatus = TaxFilingStatus.Single, EmploymentType = EmploymentType.FullTime,
                PayFrequency = PayFrequency.Monthly, CompanyId = companyId
            },
            new Employee
            {
                EmployeeNumber = "EMP-0002", FirstName = "Sarah", LastName = "Jenkins", Country = PayrollCountry.UK,
                StateProvince = "England", City = "London", DepartmentId = deptFin.Id,
                PositionId = _positions[7].Id, BasicSalary = 55000, Currency = "GBP",
                HireDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-300)), Email = "sarah.jenkins@acme.com",
                BankName = "Barclays", BankAccountNumber = "****5678", BankRoutingNumber = "20-12-34",
                TaxFilingStatus = TaxFilingStatus.Single, EmploymentType = EmploymentType.FullTime,
                PayFrequency = PayFrequency.Monthly, CompanyId = companyId
            },
            new Employee
            {
                EmployeeNumber = "EMP-0003", FirstName = "Muhammad", LastName = "Ali", Country = PayrollCountry.PK,
                StateProvince = "Punjab", City = "Lahore", DepartmentId = deptOps.Id,
                PositionId = _positions[9].Id, BasicSalary = 1800000, Currency = "PKR",
                HireDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-200)), Email = "muhammad.ali@acme.com",
                BankName = "HBL", BankAccountNumber = "****9012", BankRoutingNumber = "12345678",
                TaxFilingStatus = TaxFilingStatus.Single, EmploymentType = EmploymentType.FullTime,
                PayFrequency = PayFrequency.Monthly, CompanyId = companyId
            },
            new Employee
            {
                EmployeeNumber = "EMP-0004", FirstName = "Tariq", LastName = "Al-Otaibi", Country = PayrollCountry.SA,
                StateProvince = "Riyadh", City = "Riyadh", DepartmentId = deptSales.Id,
                PositionId = _positions[4].Id, BasicSalary = 35000, Currency = "SAR",
                HireDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-150)), Email = "tariq.alotaibi@acme.com",
                BankName = "Al Rajhi Bank", BankAccountNumber = "****3456", BankRoutingNumber = "SA00000000000",
                TaxFilingStatus = TaxFilingStatus.Single, EmploymentType = EmploymentType.FullTime,
                PayFrequency = PayFrequency.Monthly, CompanyId = companyId
            },
            new Employee
            {
                EmployeeNumber = "EMP-0005", FirstName = "Rashid", LastName = "Al-Maktoum", Country = PayrollCountry.AE,
                StateProvince = "Dubai", City = "Dubai", DepartmentId = deptIt.Id,
                PositionId = _positions[2].Id, BasicSalary = 50000, Currency = "AED",
                HireDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-100)), Email = "rashid.almaktoum@acme.com",
                BankName = "Emirates NBD", BankAccountNumber = "****7890", BankRoutingNumber = "AE0000000000",
                TaxFilingStatus = TaxFilingStatus.Single, EmploymentType = EmploymentType.FullTime,
                PayFrequency = PayFrequency.Monthly, CompanyId = companyId
            },
            new Employee
            {
                EmployeeNumber = "EMP-0006", FirstName = "Jean", LastName = "Dupont", Country = PayrollCountry.DE,
                StateProvince = "Bavaria", City = "Munich", DepartmentId = deptEng.Id,
                PositionId = _positions[5].Id, BasicSalary = 72000, Currency = "EUR",
                HireDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-180)), Email = "jean.dupont@acme.com",
                BankName = "Deutsche Bank", BankAccountNumber = "****2345", BankRoutingNumber = "DE0000000000",
                TaxFilingStatus = TaxFilingStatus.Single, EmploymentType = EmploymentType.FullTime,
                PayFrequency = PayFrequency.Monthly, CompanyId = companyId
            },
            new Employee
            {
                EmployeeNumber = "EMP-0007", FirstName = "Emily", LastName = "Tremblay", Country = PayrollCountry.CA,
                StateProvince = "Quebec", City = "Montreal", DepartmentId = deptSales.Id,
                PositionId = _positions[8].Id, BasicSalary = 65000, Currency = "CAD",
                HireDate = DateOnly.FromDateTime(DateTime.Today.AddDays(-250)), Email = "emily.tremblay@acme.com",
                BankName = "RBC", BankAccountNumber = "****6789", BankRoutingNumber = "000123456",
                TaxFilingStatus = TaxFilingStatus.Single, EmploymentType = EmploymentType.FullTime,
                PayFrequency = PayFrequency.Monthly, CompanyId = companyId
            },
        ]);
    }

    #endregion

    #region Employee CRUD

    public string NextEmployeeNumber()
    {
        var numbers = _employees.Select(e => e.EmployeeNumber)
            .Where(n => n.StartsWith("EMP-") && int.TryParse(n[4..], out _))
            .Select(n => int.Parse(n[4..]))
            .DefaultIfEmpty(0);
        return $"EMP-{(numbers.Max() + 1):D4}";
    }

    public bool CreateEmployee(EmployeeRequest request, out Employee? employee, out string? error)
    {
        lock (_lock)
        {
            employee = null; error = null;
            if (string.IsNullOrWhiteSpace(request.FirstName)) { error = "First name is required."; return false; }
            if (string.IsNullOrWhiteSpace(request.LastName)) { error = "Last name is required."; return false; }
            if (request.BasicSalary <= 0) { error = "Basic salary must be positive."; return false; }

            employee = new Employee
            {
                EmployeeNumber = string.IsNullOrWhiteSpace(request.EmployeeNumber) ? NextEmployeeNumber() : request.EmployeeNumber.Trim(),
                FirstName = request.FirstName.Trim(),
                MiddleName = request.MiddleName?.Trim() ?? "",
                LastName = request.LastName.Trim(),
                PreferredName = request.PreferredName?.Trim() ?? "",
                DateOfBirth = request.DateOfBirth,
                Gender = request.Gender ?? "",
                MaritalStatus = request.MaritalStatus ?? "",
                Nationality = request.Nationality ?? "",
                NationalId = request.NationalId ?? "",
                TaxId = request.TaxId ?? "",
                Country = request.Country,
                StateProvince = request.StateProvince ?? "",
                City = request.City ?? "",
                Address = request.Address ?? "",
                PostalCode = request.PostalCode ?? "",
                Phone = request.Phone ?? "",
                Email = request.Email ?? "",
                EmergencyContactName = request.EmergencyContactName ?? "",
                EmergencyContactPhone = request.EmergencyContactPhone ?? "",
                EmergencyContactRelation = request.EmergencyContactRelation ?? "",
                BankName = request.BankName ?? "",
                BankAccountNumber = request.BankAccountNumber ?? "",
                BankRoutingNumber = request.BankRoutingNumber ?? "",
                BankAccountName = request.BankAccountName ?? "",
                BankIBAN = request.BankIBAN ?? "",
                BankSWIFT = request.BankSWIFT ?? "",
                EmploymentType = request.EmploymentType,
                PayFrequency = request.PayFrequency,
                Status = EmployeeStatus.Active,
                HireDate = request.HireDate,
                ProbationEndDate = request.ProbationEndDate,
                DepartmentId = request.DepartmentId,
                PositionId = request.PositionId,
                ManagerId = request.ManagerId,
                PayGradeId = request.PayGradeId,
                BasicSalary = request.BasicSalary,
                Currency = request.Currency ?? "USD",
                TaxFilingStatus = request.TaxFilingStatus,
                TaxExemptions = request.TaxExemptions,
                AdditionalTaxWithholding = request.AdditionalTaxWithholding,
                CompanyId = request.CompanyId,
            };

            _employees.Add(employee);
            Persist();
            return true;
        }
    }

    public bool UpdateEmployee(Guid id, EmployeeRequest request, out Employee? employee, out string? error)
    {
        lock (_lock)
        {
            employee = _employees.FirstOrDefault(e => e.Id == id); error = null;
            if (employee == null) { error = "Employee not found."; return false; }
            if (string.IsNullOrWhiteSpace(request.FirstName)) { error = "First name is required."; return false; }
            if (string.IsNullOrWhiteSpace(request.LastName)) { error = "Last name is required."; return false; }
            if (request.BasicSalary <= 0) { error = "Basic salary must be positive."; return false; }

            employee.FirstName = request.FirstName.Trim();
            employee.MiddleName = request.MiddleName?.Trim() ?? "";
            employee.LastName = request.LastName.Trim();
            employee.PreferredName = request.PreferredName?.Trim() ?? "";
            employee.DateOfBirth = request.DateOfBirth;
            employee.Gender = request.Gender ?? "";
            employee.MaritalStatus = request.MaritalStatus ?? "";
            employee.Nationality = request.Nationality ?? "";
            employee.NationalId = request.NationalId ?? "";
            employee.TaxId = request.TaxId ?? "";
            employee.Country = request.Country;
            employee.StateProvince = request.StateProvince ?? "";
            employee.City = request.City ?? "";
            employee.Address = request.Address ?? "";
            employee.PostalCode = request.PostalCode ?? "";
            employee.Phone = request.Phone ?? "";
            employee.Email = request.Email ?? "";
            employee.EmergencyContactName = request.EmergencyContactName ?? "";
            employee.EmergencyContactPhone = request.EmergencyContactPhone ?? "";
            employee.EmergencyContactRelation = request.EmergencyContactRelation ?? "";
            employee.BankName = request.BankName ?? "";
            employee.BankAccountNumber = request.BankAccountNumber ?? "";
            employee.BankRoutingNumber = request.BankRoutingNumber ?? "";
            employee.BankAccountName = request.BankAccountName ?? "";
            employee.BankIBAN = request.BankIBAN ?? "";
            employee.BankSWIFT = request.BankSWIFT ?? "";
            employee.EmploymentType = request.EmploymentType;
            employee.PayFrequency = request.PayFrequency;
            employee.HireDate = request.HireDate;
            employee.ProbationEndDate = request.ProbationEndDate;
            employee.DepartmentId = request.DepartmentId;
            employee.PositionId = request.PositionId;
            employee.ManagerId = request.ManagerId;
            employee.PayGradeId = request.PayGradeId;
            employee.BasicSalary = request.BasicSalary;
            employee.Currency = request.Currency ?? "USD";
            employee.TaxFilingStatus = request.TaxFilingStatus;
            employee.TaxExemptions = request.TaxExemptions;
            employee.AdditionalTaxWithholding = request.AdditionalTaxWithholding;
            employee.CompanyId = request.CompanyId;
            employee.UpdatedAt = DateTime.UtcNow;

            Persist();
            return true;
        }
    }

    public bool SetEmployeeStatus(Guid id, EmployeeStatus status, out Employee? employee, out string? error)
    {
        lock (_lock)
        {
            employee = _employees.FirstOrDefault(e => e.Id == id); error = null;
            if (employee == null) { error = "Employee not found."; return false; }
            employee.Status = status;
            if (status == EmployeeStatus.Terminated) employee.TerminationDate = DateOnly.FromDateTime(DateTime.Today);
            employee.UpdatedAt = DateTime.UtcNow;
            Persist();
            return true;
        }
    }

    public Employee? GetEmployee(Guid id) => _employees.FirstOrDefault(e => e.Id == id);

    #endregion

    #region Department / Position / PayGrade CRUD

    public bool CreateDepartment(DepartmentRequest request, out Department? dept, out string? error)
    {
        lock (_lock)
        {
            dept = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Department name is required."; return false; }
            dept = new Department { Code = request.Code.Trim(), Name = request.Name.Trim(), Description = request.Description ?? "", ParentDepartmentId = request.ParentDepartmentId, ManagerId = request.ManagerId, CompanyId = request.CompanyId };
            _departments.Add(dept);
            Persist(); return true;
        }
    }

    public bool UpdateDepartment(Guid id, DepartmentRequest request, out Department? dept, out string? error)
    {
        lock (_lock)
        {
            dept = _departments.FirstOrDefault(d => d.Id == id); error = null;
            if (dept == null) { error = "Department not found."; return false; }
            dept.Code = request.Code.Trim(); dept.Name = request.Name.Trim(); dept.Description = request.Description ?? "";
            dept.ParentDepartmentId = request.ParentDepartmentId; dept.ManagerId = request.ManagerId; dept.CompanyId = request.CompanyId;
            Persist(); return true;
        }
    }

    public bool DeleteDepartment(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var dept = _departments.FirstOrDefault(d => d.Id == id);
            if (dept == null) { error = "Department not found."; return false; }
            if (_employees.Any(e => e.DepartmentId == id)) { error = "Cannot delete department with assigned employees."; return false; }
            _departments.Remove(dept);
            Persist(); return true;
        }
    }

    public bool CreatePosition(PositionRequest request, out Position? pos, out string? error)
    {
        lock (_lock)
        {
            pos = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Position name is required."; return false; }
            pos = new Position { Code = request.Code.Trim(), Name = request.Name.Trim(), Description = request.Description ?? "", DepartmentId = request.DepartmentId, MinSalary = request.MinSalary, MaxSalary = request.MaxSalary, CompanyId = request.CompanyId };
            _positions.Add(pos);
            Persist(); return true;
        }
    }

    public bool UpdatePosition(Guid id, PositionRequest request, out Position? pos, out string? error)
    {
        lock (_lock)
        {
            pos = _positions.FirstOrDefault(p => p.Id == id); error = null;
            if (pos == null) { error = "Position not found."; return false; }
            pos.Code = request.Code.Trim(); pos.Name = request.Name.Trim(); pos.Description = request.Description ?? "";
            pos.DepartmentId = request.DepartmentId; pos.MinSalary = request.MinSalary; pos.MaxSalary = request.MaxSalary; pos.CompanyId = request.CompanyId;
            Persist(); return true;
        }
    }

    public bool DeletePosition(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var pos = _positions.FirstOrDefault(p => p.Id == id);
            if (pos == null) { error = "Position not found."; return false; }
            if (_employees.Any(e => e.PositionId == id)) { error = "Cannot delete position with assigned employees."; return false; }
            _positions.Remove(pos);
            Persist(); return true;
        }
    }

    public bool CreatePayGrade(PayGradeRequest request, out PayGrade? grade, out string? error)
    {
        lock (_lock)
        {
            grade = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Pay grade name is required."; return false; }
            grade = new PayGrade { Code = request.Code.Trim(), Name = request.Name.Trim(), MinBasic = request.MinBasic, MidBasic = request.MidBasic, MaxBasic = request.MaxBasic, CompanyId = request.CompanyId };
            _payGrades.Add(grade);
            Persist(); return true;
        }
    }

    public bool UpdatePayGrade(Guid id, PayGradeRequest request, out PayGrade? grade, out string? error)
    {
        lock (_lock)
        {
            grade = _payGrades.FirstOrDefault(g => g.Id == id); error = null;
            if (grade == null) { error = "Pay grade not found."; return false; }
            grade.Code = request.Code.Trim(); grade.Name = request.Name.Trim();
            grade.MinBasic = request.MinBasic; grade.MidBasic = request.MidBasic; grade.MaxBasic = request.MaxBasic; grade.CompanyId = request.CompanyId;
            Persist(); return true;
        }
    }

    public bool DeletePayGrade(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var grade = _payGrades.FirstOrDefault(g => g.Id == id);
            if (grade == null) { error = "Pay grade not found."; return false; }
            _payGrades.Remove(grade);
            Persist(); return true;
        }
    }

    #endregion

    #region PayComponent CRUD

    public bool CreatePayComponent(PayComponentRequest request, out PayComponent? comp, out string? error)
    {
        lock (_lock)
        {
            comp = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Component name is required."; return false; }
            comp = new PayComponent
            {
                Code = request.Code.Trim(), Name = request.Name.Trim(), Description = request.Description ?? "",
                Type = request.Type, Category = request.Category, Country = request.Country,
                IsTaxable = request.IsTaxable, IsStatutory = request.IsStatutory,
                FixedAmount = request.FixedAmount, PercentageOf = request.PercentageOf,
                PercentageBase = request.PercentageBase, AccountId = request.AccountId,
                DisplayOrder = request.DisplayOrder, CompanyId = request.CompanyId
            };
            _payComponents.Add(comp);
            Persist(); return true;
        }
    }

    public bool UpdatePayComponent(Guid id, PayComponentRequest request, out PayComponent? comp, out string? error)
    {
        lock (_lock)
        {
            comp = _payComponents.FirstOrDefault(c => c.Id == id); error = null;
            if (comp == null) { error = "Pay component not found."; return false; }
            comp.Code = request.Code.Trim(); comp.Name = request.Name.Trim(); comp.Description = request.Description ?? "";
            comp.Type = request.Type; comp.Category = request.Category; comp.Country = request.Country;
            comp.IsTaxable = request.IsTaxable; comp.IsStatutory = request.IsStatutory;
            comp.FixedAmount = request.FixedAmount; comp.PercentageOf = request.PercentageOf;
            comp.PercentageBase = request.PercentageBase; comp.AccountId = request.AccountId;
            comp.DisplayOrder = request.DisplayOrder; comp.CompanyId = request.CompanyId;
            Persist(); return true;
        }
    }

    public bool DeletePayComponent(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var comp = _payComponents.FirstOrDefault(c => c.Id == id);
            if (comp == null) { error = "Pay component not found."; return false; }
            _payComponents.Remove(comp);
            Persist(); return true;
        }
    }

    #endregion

    #region Tax Slab Management

    public List<SalaryTaxSlab> GetTaxSlabs(PayrollCountry? country = null, int? taxYear = null, Guid? companyId = null)
    {
        var query = _taxSlabs.AsEnumerable();
        // Always filter to active deployment country unless explicitly overridden
        if (!country.HasValue) query = query.Where(s => s.Country == _activeCountry);
        if (country.HasValue) query = query.Where(s => s.Country == country.Value);
        if (taxYear.HasValue) query = query.Where(s => s.TaxYear == taxYear.Value);
        if (companyId.HasValue) query = query.Where(s => s.CompanyId == companyId.Value || s.CompanyId == null);
        return query.ToList();
    }

    public bool CreateTaxSlab(SalaryTaxSlabRequest request, out SalaryTaxSlab? slab, out string? error)
    {
        lock (_lock)
        {
            slab = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Tax slab name is required."; return false; }
            slab = new SalaryTaxSlab
            {
                Country = request.Country, TaxYear = request.TaxYear, Name = request.Name.Trim(),
                Currency = request.Currency, FilingStatus = request.FilingStatus, PeriodBasis = request.PeriodBasis,
                StandardDeduction = request.StandardDeduction, PersonalAllowance = request.PersonalAllowance,
                IsActive = request.IsActive, CompanyId = request.CompanyId,
                Brackets = (request.Brackets ?? []).Select(b => new SalaryTaxBracket
                {
                    FromAmount = b.FromAmount, ToAmount = b.ToAmount, RatePercent = b.RatePercent,
                    FixedTax = b.FixedTax, Description = b.Description
                }).ToList()
            };
            _taxSlabs.Add(slab);
            Persist(); return true;
        }
    }

    public bool UpdateTaxSlab(Guid id, SalaryTaxSlabRequest request, out SalaryTaxSlab? slab, out string? error)
    {
        lock (_lock)
        {
            slab = _taxSlabs.FirstOrDefault(s => s.Id == id); error = null;
            if (slab == null) { error = "Tax slab not found."; return false; }
            slab.Country = request.Country; slab.TaxYear = request.TaxYear; slab.Name = request.Name.Trim();
            slab.Currency = request.Currency; slab.FilingStatus = request.FilingStatus; slab.PeriodBasis = request.PeriodBasis;
            slab.StandardDeduction = request.StandardDeduction; slab.PersonalAllowance = request.PersonalAllowance;
            slab.IsActive = request.IsActive; slab.CompanyId = request.CompanyId; slab.UpdatedAt = DateTime.UtcNow;
            slab.Brackets.Clear();
            slab.Brackets.AddRange((request.Brackets ?? []).Select(b => new SalaryTaxBracket
            {
                FromAmount = b.FromAmount, ToAmount = b.ToAmount, RatePercent = b.RatePercent,
                FixedTax = b.FixedTax, Description = b.Description
            }));
            Persist(); return true;
        }
    }

    public bool DeleteTaxSlab(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var slab = _taxSlabs.FirstOrDefault(s => s.Id == id);
            if (slab == null) { error = "Tax slab not found."; return false; }
            _taxSlabs.Remove(slab);
            Persist(); return true;
        }
    }

    private decimal CalculateIncomeTax(PayrollCountry country, int taxYear, decimal annualTaxableIncome, TaxFilingStatus filingStatus)
    {
        var slab = _taxSlabs
            .Where(s => s.Country == country && s.TaxYear == taxYear && s.IsActive)
            .OrderByDescending(s => s.FilingStatus == filingStatus)
            .FirstOrDefault();
        if (slab == null || slab.Brackets.Count == 0) return 0;

        var income = annualTaxableIncome - slab.StandardDeduction - slab.PersonalAllowance;
        if (income <= 0) return 0;

        decimal tax = 0;
        foreach (var bracket in slab.Brackets.OrderBy(b => b.FromAmount))
        {
            if (income <= bracket.FromAmount) break;
            var taxableInBracket = bracket.ToAmount.HasValue
                ? Math.Min(income, bracket.ToAmount.Value) - bracket.FromAmount
                : income - bracket.FromAmount;
            if (taxableInBracket > 0)
                tax += taxableInBracket * bracket.RatePercent / 100m;
        }
        return Math.Max(0, tax + slab.Brackets.FirstOrDefault(b => income >= b.FromAmount && (b.ToAmount == null || income <= b.ToAmount))?.FixedTax ?? 0);
    }

    #endregion

    #region Leave & Attendance

    public bool CreateLeaveRequest(LeaveRequestRequest request, out LeaveRequest? lr, out string? error)
    {
        lock (_lock)
        {
            lr = null; error = null;
            var emp = _employees.FirstOrDefault(e => e.Id == request.EmployeeId);
            if (emp == null) { error = "Employee not found."; return false; }
            if (request.EndDate < request.StartDate) { error = "End date must be on or after start date."; return false; }
            var totalDays = (request.EndDate.DayNumber - request.StartDate.DayNumber) + 1;
            lr = new LeaveRequest
            {
                EmployeeId = request.EmployeeId, LeaveType = request.LeaveType,
                StartDate = request.StartDate, EndDate = request.EndDate,
                TotalDays = totalDays, Reason = request.Reason ?? "",
                Status = LeaveStatus.Pending, CompanyId = request.CompanyId
            };
            _leaveRequests.Add(lr);
            Persist(); return true;
        }
    }

    public bool ActionLeaveRequest(Guid id, LeaveRequestActionRequest action, out LeaveRequest? lr, out string? error)
    {
        lock (_lock)
        {
            lr = _leaveRequests.FirstOrDefault(l => l.Id == id); error = null;
            if (lr == null) { error = "Leave request not found."; return false; }
            lr.Status = action.Status;
            lr.ApproverComments = action.ApproverComments ?? "";
            lr.ApprovedAt = DateTime.UtcNow;
            Persist(); return true;
        }
    }

    public bool RecordAttendance(AttendanceRecordRequest request, out AttendanceRecord? rec, out string? error)
    {
        lock (_lock)
        {
            rec = null; error = null;
            var emp = _employees.FirstOrDefault(e => e.Id == request.EmployeeId);
            if (emp == null) { error = "Employee not found."; return false; }
            rec = new AttendanceRecord
            {
                EmployeeId = request.EmployeeId, Date = request.Date,
                ClockIn = request.ClockIn, ClockOut = request.ClockOut,
                BreakStart = request.BreakStart, BreakEnd = request.BreakEnd,
                Status = request.Status ?? "Present",
                Notes = request.Notes, CompanyId = request.CompanyId
            };
            _attendanceRecords.Add(rec);
            Persist(); return true;
        }
    }

    #endregion

    #region Loans & Advances

    public bool CreateLoanAdvance(LoanAdvanceRequest request, out LoanAdvance? loan, out string? error)
    {
        lock (_lock)
        {
            loan = null; error = null;
            var emp = _employees.FirstOrDefault(e => e.Id == request.EmployeeId);
            if (emp == null) { error = "Employee not found."; return false; }
            if (request.PrincipalAmount <= 0) { error = "Principal amount must be positive."; return false; }
            loan = new LoanAdvance
            {
                EmployeeId = request.EmployeeId, LoanNumber = request.LoanNumber.Trim(),
                LoanType = request.LoanType, PrincipalAmount = request.PrincipalAmount,
                InterestRate = request.InterestRate, TotalInstallments = request.TotalInstallments,
                InstallmentAmount = request.InstallmentAmount, StartDate = request.StartDate,
                EndDate = request.EndDate, CompanyId = request.CompanyId
            };
            _loanAdvances.Add(loan);
            Persist(); return true;
        }
    }

    public bool RecordLoanRepayment(Guid id, out LoanAdvance? loan, out string? error)
    {
        lock (_lock)
        {
            loan = _loanAdvances.FirstOrDefault(l => l.Id == id); error = null;
            if (loan == null) { error = "Loan not found."; return false; }
            if (loan.PaidInstallments >= loan.TotalInstallments) { error = "Loan already fully repaid."; return false; }
            loan.PaidInstallments++;
            if (loan.PaidInstallments >= loan.TotalInstallments) { loan.Status = "Completed"; loan.EndDate = DateOnly.FromDateTime(DateTime.Today); }
            Persist(); return true;
        }
    }

    #endregion

    #region Payrun Processing

    public string NextPayrunNumber()
    {
        var numbers = _payruns.Select(p => p.PayrunNumber)
            .Where(n => n.StartsWith("PR-") && int.TryParse(n[3..], out _))
            .Select(n => int.Parse(n[3..]))
            .DefaultIfEmpty(0);
        return $"PR-{(numbers.Max() + 1):D5}";
    }

    public string NextSlipNumber()
    {
        var numbers = _salarySlips.Select(s => s.SlipNumber)
            .Where(n => n.StartsWith("SLIP-") && int.TryParse(n[5..], out _))
            .Select(n => int.Parse(n[5..]))
            .DefaultIfEmpty(0);
        return $"SLIP-{(numbers.Max() + 1):D6}";
    }

    public bool CalculateAndProcessPayrun(CalculatePayrunRequest request, bool autoPost, out Payrun? payrun, out List<SalarySlip> slips, out string? error)
    {
        lock (_lock)
        {
            payrun = null; slips = []; error = null;

            var employees = request.EmployeeIds != null && request.EmployeeIds.Count > 0
                ? _employees.Where(e => request.EmployeeIds.Contains(e.Id) && e.Status == EmployeeStatus.Active).ToList()
                : _employees.Where(e => e.Status == EmployeeStatus.Active && (request.CompanyId == null || e.CompanyId == request.CompanyId)).ToList();

            if (employees.Count == 0) { error = "No active employees found for this payrun."; return false; }

            payrun = new Payrun
            {
                PayrunNumber = NextPayrunNumber(), Frequency = request.Frequency,
                PeriodStart = request.PeriodStart, PeriodEnd = request.PeriodEnd,
                PayDate = request.PayDate, Status = PayrunStatus.Calculated, CompanyId = request.CompanyId
            };

            int periodsInYear = request.Frequency switch
            {
                PayFrequency.Weekly => 52,
                PayFrequency.BiWeekly => 26,
                PayFrequency.SemiMonthly => 24,
                _ => 12
            };

            decimal totalGrossAll = 0, totalDeductionsAll = 0, totalEmployerAll = 0;

            foreach (var emp in employees)
            {
                var pe = new PayrunEmployee
                {
                    PayrunId = payrun.Id, EmployeeId = emp.Id, BasicSalary = emp.BasicSalary,
                    Currency = emp.Currency, Status = PayrunStatus.Calculated
                };

                decimal basic = emp.BasicSalary;
                decimal grossEarnings = basic;
                decimal totalDeductions = 0;
                decimal totalEmployerContrib = 0;

                var empLines = new List<PayrunLine>();

                // ── Earnings from active pay components (non-statutory, non-employer) ──
                var earningComponents = _payComponents
                    .Where(c => c.Country == emp.Country && c.Type == PayComponentType.Earning && !c.IsStatutory && c.IsActive)
                    .OrderBy(c => c.DisplayOrder);

                foreach (var comp in earningComponents)
                {
                    decimal amount = comp.FixedAmount ?? 0;
                    if (comp.PercentageOf.HasValue && comp.PercentageBase == "Basic")
                        amount = basic * comp.PercentageOf.Value / 100m;

                    if (amount > 0)
                    {
                        grossEarnings += amount;
                        empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = comp.Id, Category = comp.Category, Amount = amount, Notes = comp.Name });
                    }
                }

                decimal annualGross = grossEarnings * periodsInYear;

                // ── Country-Specific Statutory Deductions ────────────────────────────
                switch (emp.Country)
                {
                    case PayrollCountry.US:
                        {
                            decimal fedTax = CalculateIncomeTax(PayrollCountry.US, request.TaxYear, annualGross, emp.TaxFilingStatus) / periodsInYear;
                            var fedComp = _payComponents.FirstOrDefault(c => c.Code == "FED_TAX");
                            if (fedComp != null && fedTax > 0) { totalDeductions += fedTax; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = fedComp.Id, Category = fedComp.Category, Amount = Math.Round(fedTax, 2), Notes = "Federal Income Tax" }); }

                            decimal ficaSS = Math.Min(annualGross, 176100) * 0.062m / periodsInYear;
                            var ssComp = _payComponents.FirstOrDefault(c => c.Code == "FICA_SS");
                            if (ssComp != null && ficaSS > 0) { totalDeductions += ficaSS; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = ssComp.Id, Category = ssComp.Category, Amount = Math.Round(ficaSS, 2), Notes = "FICA Social Security" }); }

                            decimal ficaMed = annualGross * 0.0145m / periodsInYear;
                            var medComp = _payComponents.FirstOrDefault(c => c.Code == "FICA_MED");
                            if (medComp != null && ficaMed > 0) { totalDeductions += ficaMed; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = medComp.Id, Category = medComp.Category, Amount = Math.Round(ficaMed, 2), Notes = "FICA Medicare" }); }

                            totalEmployerContrib += ficaSS + ficaMed;
                        }
                        break;

                    case PayrollCountry.CA:
                        {
                            decimal fedTax = CalculateIncomeTax(PayrollCountry.CA, request.TaxYear, annualGross, emp.TaxFilingStatus) / periodsInYear;
                            var fedComp = _payComponents.FirstOrDefault(c => c.Code == "CA_FED");
                            if (fedComp != null && fedTax > 0) { totalDeductions += fedTax; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = fedComp.Id, Category = fedComp.Category, Amount = Math.Round(fedTax, 2), Notes = "Federal Tax (CA)" }); }

                            decimal cpp = Math.Min(annualGross, 73200) * 0.0595m / periodsInYear;
                            var cppComp = _payComponents.FirstOrDefault(c => c.Code == "CA_CPP");
                            if (cppComp != null && cpp > 0) { totalDeductions += cpp; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = cppComp.Id, Category = cppComp.Category, Amount = Math.Round(cpp, 2), Notes = "CPP" }); }

                            decimal ei = Math.Min(annualGross, 68500) * 0.0166m / periodsInYear;
                            var eiComp = _payComponents.FirstOrDefault(c => c.Code == "CA_EI");
                            if (eiComp != null && ei > 0) { totalDeductions += ei; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = eiComp.Id, Category = eiComp.Category, Amount = Math.Round(ei, 2), Notes = "EI" }); }

                            totalEmployerContrib += cpp * 1.4m + ei * 1.4m;
                        }
                        break;

                    case PayrollCountry.UK:
                        {
                            decimal payeTax = CalculateIncomeTax(PayrollCountry.UK, request.TaxYear, annualGross, emp.TaxFilingStatus) / periodsInYear;
                            var payeComp = _payComponents.FirstOrDefault(c => c.Code == "UK_PAYE");
                            if (payeComp != null && payeTax > 0) { totalDeductions += payeTax; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = payeComp.Id, Category = payeComp.Category, Amount = Math.Round(payeTax, 2), Notes = "PAYE" }); }

                            decimal ni = Math.Min(annualGross, 50270) * 0.08m / periodsInYear;
                            var niComp = _payComponents.FirstOrDefault(c => c.Code == "UK_NI");
                            if (niComp != null && ni > 0) { totalDeductions += ni; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = niComp.Id, Category = niComp.Category, Amount = Math.Round(ni, 2), Notes = "National Insurance" }); }

                            totalEmployerContrib += ni * 1.38m;
                        }
                        break;

                    case PayrollCountry.DE:
                        {
                            decimal lstTax = CalculateIncomeTax(PayrollCountry.DE, request.TaxYear, annualGross, emp.TaxFilingStatus) / periodsInYear;
                            var lstComp = _payComponents.FirstOrDefault(c => c.Code == "DE_LST");
                            if (lstComp != null && lstTax > 0) { totalDeductions += lstTax; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = lstComp.Id, Category = lstComp.Category, Amount = Math.Round(lstTax, 2), Notes = "Lohnsteuer" }); }

                            decimal soli = lstTax > 18130 ? lstTax * 0.055m : 0;
                            var soliComp = _payComponents.FirstOrDefault(c => c.Code == "DE_SOLI");
                            if (soliComp != null && soli > 0) { totalDeductions += soli; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = soliComp.Id, Category = soliComp.Category, Amount = Math.Round(soli, 2), Notes = "Solidaritaetszuschlag" }); }

                            decimal rv = annualGross * 0.093m / 2 / periodsInYear;
                            var rvComp = _payComponents.FirstOrDefault(c => c.Code == "DE_RV");
                            if (rvComp != null && rv > 0) { totalDeductions += rv; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = rvComp.Id, Category = rvComp.Category, Amount = Math.Round(rv, 2), Notes = "Rentenversicherung" }); }

                            decimal kv = annualGross * 0.073m / 2 / periodsInYear;
                            var kvComp = _payComponents.FirstOrDefault(c => c.Code == "DE_KV");
                            if (kvComp != null && kv > 0) { totalDeductions += kv; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = kvComp.Id, Category = kvComp.Category, Amount = Math.Round(kv, 2), Notes = "Krankenversicherung" }); }

                            decimal pv = annualGross * 0.022m / 2 / periodsInYear;
                            var pvComp = _payComponents.FirstOrDefault(c => c.Code == "DE_PV");
                            if (pvComp != null && pv > 0) { totalDeductions += pv; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = pvComp.Id, Category = pvComp.Category, Amount = Math.Round(pv, 2), Notes = "Pflegeversicherung" }); }

                            decimal av = annualGross * 0.013m / 2 / periodsInYear;
                            var avComp = _payComponents.FirstOrDefault(c => c.Code == "DE_AV");
                            if (avComp != null && av > 0) { totalDeductions += av; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = avComp.Id, Category = avComp.Category, Amount = Math.Round(av, 2), Notes = "Arbeitslosenversicherung" }); }

                            totalEmployerContrib += rv + kv + pv + av;
                        }
                        break;

                    case PayrollCountry.PK:
                        {
                            decimal pkTax = CalculateIncomeTax(PayrollCountry.PK, request.TaxYear, annualGross, emp.TaxFilingStatus) / periodsInYear;
                            var pkTaxComp = _payComponents.FirstOrDefault(c => c.Code == "PK_IT");
                            if (pkTaxComp != null && pkTax > 0) { totalDeductions += pkTax; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = pkTaxComp.Id, Category = pkTaxComp.Category, Amount = Math.Round(pkTax, 2), Notes = "Income Tax on Salary" }); }

                            decimal eobi = Math.Min(annualGross, 25000) * 0.01m / periodsInYear;
                            var eobiComp = _payComponents.FirstOrDefault(c => c.Code == "PK_EOBI");
                            if (eobiComp != null && eobi > 0) { totalDeductions += eobi; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = eobiComp.Id, Category = eobiComp.Category, Amount = Math.Round(eobi, 2), Notes = "EOBI" }); }

                            totalEmployerContrib += eobi;
                        }
                        break;

                    case PayrollCountry.SA:
                        {
                            decimal gosiEmp = annualGross * 0.0975m / periodsInYear;
                            var gosiComp = _payComponents.FirstOrDefault(c => c.Code == "SA_GOSI_S");
                            if (gosiComp != null && gosiEmp > 0) { totalDeductions += gosiEmp; empLines.Add(new PayrunLine { PayrunEmployeeId = pe.Id, PayComponentId = gosiComp.Id, Category = gosiComp.Category, Amount = Math.Round(gosiEmp, 2), Notes = "GOSI Employee (9.75%)" }); }

                            decimal gosiEmr = annualGross * 0.1175m / periodsInYear;
                            totalEmployerContrib += gosiEmr;
                        }
                        break;

                    case PayrollCountry.AE:
                        {
                            // UAE: No income tax. GPSSA for UAE nationals only.
                            // For expats: 0% employee deduction.
                            // Gratuity provision for all (accrual basis):
                            decimal gratuityProvision = basic * 0.0833m / 12;
                            totalEmployerContrib += gratuityProvision;
                        }
                        break;

                    default:
                        break;
                }

                decimal netPay = grossEarnings - totalDeductions;

                pe.GrossEarnings = Math.Round(grossEarnings, 2);
                pe.TotalDeductions = Math.Round(totalDeductions, 2);
                pe.NetPay = Math.Round(netPay, 2);
                pe.EmployerContributions = Math.Round(totalEmployerContrib, 2);

                totalGrossAll += grossEarnings;
                totalDeductionsAll += totalDeductions;
                totalEmployerAll += totalEmployerContrib;

                _payrunEmployees.Add(pe);
                _payrunLines.AddRange(empLines);

                // ── Generate Salary Slip ───────────────────────────────────────────
                var empDept = _departments.FirstOrDefault(d => d.Id == emp.DepartmentId);
                var empPos = _positions.FirstOrDefault(p => p.Id == emp.PositionId);
                var slip = new SalarySlip
                {
                    PayrunEmployeeId = pe.Id, SlipNumber = NextSlipNumber(),
                    PeriodStart = request.PeriodStart, PeriodEnd = request.PeriodEnd, PayDate = request.PayDate,
                    EmployeeName = $"{emp.FirstName} {emp.LastName}", EmployeeNumber = emp.EmployeeNumber,
                    Department = empDept?.Name ?? "", Position = empPos?.Name ?? "",
                    BankName = emp.BankName, BankAccountLast4 = emp.BankAccountNumber.Length >= 4 ? emp.BankAccountNumber[^4..] : emp.BankAccountNumber,
                    BasicSalary = Math.Round(basic, 2), GrossEarnings = Math.Round(grossEarnings, 2),
                    TotalDeductions = Math.Round(totalDeductions, 2), NetPay = Math.Round(netPay, 2),
                    EmployerContributions = Math.Round(totalEmployerContrib, 2), Currency = emp.Currency,
                    PayFrequency = request.Frequency.ToString(),
                    Earnings = empLines.Where(l => _payComponents.FirstOrDefault(c => c.Id == l.PayComponentId)?.Type == PayComponentType.Earning)
                        .Select(l => new SalarySlipLine { Code = _payComponents.First(c => c.Id == l.PayComponentId).Code, Name = l.Notes ?? "", Amount = l.Amount, Category = l.Category.ToString(), IsStatutory = false }).ToList(),
                    Deductions = empLines.Where(l => _payComponents.FirstOrDefault(c => c.Id == l.PayComponentId)?.Type == PayComponentType.Deduction)
                        .Select(l => new SalarySlipLine { Code = _payComponents.First(c => c.Id == l.PayComponentId).Code, Name = l.Notes ?? "", Amount = l.Amount, Category = l.Category.ToString(), IsStatutory = true }).ToList(),
                    EmployerContribs = [],
                };
                _salarySlips.Add(slip);
                slips.Add(slip);
            }

            _payruns.Add(payrun);

            // ── GL Posting if autoPost ───────────────────────────────────────────
            if (autoPost && totalGrossAll > 0)
            {
                var salaryExpAccountId = GetMappedAccount("Payroll Expense") != Guid.Empty ? GetMappedAccount("Payroll Expense") : _accounts.FirstOrDefault(a => a.Code == "61200")?.Id ?? Guid.Empty;
                var employerExpAccountId = GetMappedAccount("Employer Payroll Contributions Expense") != Guid.Empty ? GetMappedAccount("Employer Payroll Contributions Expense") : _accounts.FirstOrDefault(a => a.Code == "61250")?.Id ?? salaryExpAccountId;
                var accruedSalAccountId = GetMappedAccount("Accrued Salaries") != Guid.Empty ? GetMappedAccount("Accrued Salaries") : _accounts.FirstOrDefault(a => a.Code == "21300")?.Id ?? Guid.Empty;
                var taxPayableAccountId = GetMappedAccount("Payroll Taxes Accrued") != Guid.Empty ? GetMappedAccount("Payroll Taxes Accrued") : _accounts.FirstOrDefault(a => a.Code == "21400")?.Id ?? Guid.Empty;
                var eobiPayableAccountId = GetMappedAccount("EOBI & Social Security Accrued") != Guid.Empty ? GetMappedAccount("EOBI & Social Security Accrued") : _accounts.FirstOrDefault(a => a.Code == "21500")?.Id ?? taxPayableAccountId;
                var pfPayableAccountId = GetMappedAccount("Provident Fund Accrued") != Guid.Empty ? GetMappedAccount("Provident Fund Accrued") : _accounts.FirstOrDefault(a => a.Code == "21510")?.Id ?? eobiPayableAccountId;

                var netPayCredit = totalGrossAll - totalDeductionsAll;
                var taxCredit = slips.SelectMany(s => s.Deductions).Where(d => d.Category.Contains("Tax", StringComparison.OrdinalIgnoreCase) || d.Name.Contains("Tax", StringComparison.OrdinalIgnoreCase)).Sum(d => d.Amount);
                var eobiCredit = slips.SelectMany(s => s.Deductions).Where(d => d.Category.Contains("Social", StringComparison.OrdinalIgnoreCase) || d.Name.Contains("EOBI", StringComparison.OrdinalIgnoreCase) || d.Name.Contains("Social", StringComparison.OrdinalIgnoreCase)).Sum(d => d.Amount) + totalEmployerAll;
                var otherCredit = totalDeductionsAll - (taxCredit + (eobiCredit - totalEmployerAll));
                if (otherCredit < 0) otherCredit = 0;
                if (taxCredit == 0 && eobiCredit == totalEmployerAll && totalDeductionsAll > 0)
                {
                    taxCredit = totalDeductionsAll;
                }

                var lines = new List<JournalLine>
                {
                    new JournalLine(salaryExpAccountId, totalGrossAll, 0, $"Gross Salaries & Allowances: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId),
                };

                if (totalEmployerAll > 0)
                {
                    lines.Add(new JournalLine(employerExpAccountId, totalEmployerAll, 0, $"Employer Statutory Contributions: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId));
                }

                lines.Add(new JournalLine(accruedSalAccountId, 0, netPayCredit, $"Net salaries payable: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId));

                if (taxCredit > 0)
                {
                    lines.Add(new JournalLine(taxPayableAccountId, 0, taxCredit, $"Income tax withholding payable: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId));
                }

                if (eobiCredit > 0)
                {
                    lines.Add(new JournalLine(eobiPayableAccountId, 0, eobiCredit, $"EOBI & Social Security payable: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId));
                }

                if (otherCredit > 0)
                {
                    lines.Add(new JournalLine(pfPayableAccountId, 0, otherCredit, $"Provident fund & voluntary deductions: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId));
                }

                var je = new JournalEntry
                {
                    Date = DateOnly.FromDateTime(DateTime.Today),
                    Reference = $"PAYRUN-{payrun.PayrunNumber}",
                    Description = $"Payroll: {payrun.PayrunNumber} | {request.PeriodStart:yyyy-MM-dd} to {request.PeriodEnd:yyyy-MM-dd} | {employees.Count} employees",
                    TransactionType = TransactionType.Payroll,
                    CompanyId = payrun.CompanyId,
                    Status = JournalStatus.Posted,
                    Lines = lines
                };

                _entries.Add(je);
                payrun.JournalEntryId = je.Id;
                payrun.PostedAt = DateTime.UtcNow;
                payrun.Status = PayrunStatus.Posted;
            }

            Persist();
            return true;
        }
    }

    public bool PostPayrunToGL(Guid payrunId, out JournalEntry? je, out string? error)
    {
        lock (_lock)
        {
            je = null;
            error = null;
            var payrun = _payruns.FirstOrDefault(p => p.Id == payrunId);
            if (payrun == null)
            {
                error = "Payrun not found.";
                return false;
            }
            if (payrun.Status == PayrunStatus.Posted)
            {
                error = "Payrun is already posted to the General Ledger.";
                return false;
            }

            var empIds = _payrunEmployees.Where(pe => pe.PayrunId == payrunId).Select(pe => pe.Id).ToHashSet();
            var slips = _salarySlips.Where(s => empIds.Contains(s.PayrunEmployeeId)).ToList();
            if (slips.Count == 0)
            {
                error = "No salary slips found for this payrun.";
                return false;
            }

            decimal totalGrossAll = slips.Sum(s => s.GrossEarnings);
            decimal totalDeductionsAll = slips.Sum(s => s.TotalDeductions);
            decimal totalEmployerAll = slips.Sum(s => s.EmployerContribs?.Sum(c => c.Amount) ?? 0);

            var salaryExpAccountId = GetMappedAccount("Payroll Expense") != Guid.Empty ? GetMappedAccount("Payroll Expense") : _accounts.FirstOrDefault(a => a.Code == "61200")?.Id ?? Guid.Empty;
            var employerExpAccountId = GetMappedAccount("Employer Payroll Contributions Expense") != Guid.Empty ? GetMappedAccount("Employer Payroll Contributions Expense") : _accounts.FirstOrDefault(a => a.Code == "61250")?.Id ?? salaryExpAccountId;
            var accruedSalAccountId = GetMappedAccount("Accrued Salaries") != Guid.Empty ? GetMappedAccount("Accrued Salaries") : _accounts.FirstOrDefault(a => a.Code == "21300")?.Id ?? Guid.Empty;
            var taxPayableAccountId = GetMappedAccount("Payroll Taxes Accrued") != Guid.Empty ? GetMappedAccount("Payroll Taxes Accrued") : _accounts.FirstOrDefault(a => a.Code == "21400")?.Id ?? Guid.Empty;
            var eobiPayableAccountId = GetMappedAccount("EOBI & Social Security Accrued") != Guid.Empty ? GetMappedAccount("EOBI & Social Security Accrued") : _accounts.FirstOrDefault(a => a.Code == "21500")?.Id ?? taxPayableAccountId;
            var pfPayableAccountId = GetMappedAccount("Provident Fund Accrued") != Guid.Empty ? GetMappedAccount("Provident Fund Accrued") : _accounts.FirstOrDefault(a => a.Code == "21510")?.Id ?? eobiPayableAccountId;

            var netPayCredit = totalGrossAll - totalDeductionsAll;
            var taxCredit = slips.SelectMany(s => s.Deductions).Where(d => d.Category.Contains("Tax", StringComparison.OrdinalIgnoreCase) || d.Name.Contains("Tax", StringComparison.OrdinalIgnoreCase)).Sum(d => d.Amount);
            var eobiCredit = slips.SelectMany(s => s.Deductions).Where(d => d.Category.Contains("Social", StringComparison.OrdinalIgnoreCase) || d.Name.Contains("EOBI", StringComparison.OrdinalIgnoreCase) || d.Name.Contains("Social", StringComparison.OrdinalIgnoreCase)).Sum(d => d.Amount) + totalEmployerAll;
            var otherCredit = totalDeductionsAll - (taxCredit + (eobiCredit - totalEmployerAll));
            if (otherCredit < 0) otherCredit = 0;
            if (taxCredit == 0 && eobiCredit == totalEmployerAll && totalDeductionsAll > 0)
            {
                taxCredit = totalDeductionsAll;
            }

            var lines = new List<JournalLine>
            {
                new JournalLine(salaryExpAccountId, totalGrossAll, 0, $"Gross Salaries & Allowances: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId),
            };

            if (totalEmployerAll > 0)
            {
                lines.Add(new JournalLine(employerExpAccountId, totalEmployerAll, 0, $"Employer Statutory Contributions: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId));
            }

            lines.Add(new JournalLine(accruedSalAccountId, 0, netPayCredit, $"Net salaries payable: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId));

            if (taxCredit > 0)
            {
                lines.Add(new JournalLine(taxPayableAccountId, 0, taxCredit, $"Income tax withholding payable: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId));
            }

            if (eobiCredit > 0)
            {
                lines.Add(new JournalLine(eobiPayableAccountId, 0, eobiCredit, $"EOBI & Social Security payable: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId));
            }

            if (otherCredit > 0)
            {
                lines.Add(new JournalLine(pfPayableAccountId, 0, otherCredit, $"Provident fund & voluntary deductions: {payrun.PayrunNumber}", null, "USD", 1, payrun.CompanyId));
            }

            je = new JournalEntry
            {
                Date = DateOnly.FromDateTime(DateTime.Today),
                Reference = $"PAYRUN-{payrun.PayrunNumber}",
                Description = $"Payroll: {payrun.PayrunNumber} | {payrun.PeriodStart:yyyy-MM-dd} to {payrun.PeriodEnd:yyyy-MM-dd} | {slips.Count} employees",
                TransactionType = TransactionType.Payroll,
                CompanyId = payrun.CompanyId,
                Status = JournalStatus.Posted,
                Lines = lines
            };

            _entries.Add(je);
            payrun.JournalEntryId = je.Id;
            payrun.PostedAt = DateTime.UtcNow;
            payrun.Status = PayrunStatus.Posted;

            Persist();
            return true;
        }
    }

    public List<SalarySlip> GetSalarySlips(Guid? payrunId = null, Guid? employeeId = null, Guid? companyId = null)
    {
        var query = _salarySlips.AsEnumerable();
        if (payrunId.HasValue)
        {
            var empIds = _payrunEmployees.Where(pe => pe.PayrunId == payrunId.Value).Select(pe => pe.Id).ToHashSet();
            query = query.Where(s => empIds.Contains(s.PayrunEmployeeId));
        }
        if (employeeId.HasValue)
        {
            var empIds = _payrunEmployees.Where(pe => pe.EmployeeId == employeeId.Value).Select(pe => pe.Id).ToHashSet();
            query = query.Where(s => empIds.Contains(s.PayrunEmployeeId));
        }
        return query.OrderByDescending(s => s.GeneratedAt).ToList();
    }

    public SalarySlip? GetSalarySlipById(Guid id) => _salarySlips.FirstOrDefault(s => s.Id == id);

    #endregion

    #region Projects

    public List<Project> GetProjects(ProjectStatus? status = null, Guid? companyId = null)
    {
        var query = _projects.AsEnumerable();
        if (status.HasValue) query = query.Where(p => p.Status == status.Value);
        if (companyId.HasValue) query = query.Where(p => p.CompanyId == companyId.Value);
        return query.OrderByDescending(p => p.CreatedAt).ToList();
    }

    public Project? GetProjectById(Guid id) => _projects.FirstOrDefault(p => p.Id == id);

    public bool CreateProject(ProjectRequest request, out Project? project, out string? error)
    {
        lock (_lock)
        {
            project = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Project name is required."; return false; }
            if (request.Budget < 0) { error = "Budget cannot be negative."; return false; }
            project = new Project
            {
                ProjectNumber = NextProjectNumber(),
                Name = request.Name.Trim(),
                Description = request.Description ?? "",
                Status = request.Status,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                ManagerId = request.ManagerId,
                DepartmentId = request.DepartmentId,
                CustomerId = request.CustomerId,
                CustomerName = request.CustomerName ?? "",
                Budget = request.Budget,
                Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency,
                CompanyId = request.CompanyId,
            };
            _projects.Add(project);
            Persist(); return true;
        }
    }

    public bool UpdateProject(Guid id, ProjectRequest request, out Project? project, out string? error)
    {
        lock (_lock)
        {
            project = null; error = null;
            var existing = _projects.FirstOrDefault(p => p.Id == id);
            if (existing == null) { error = "Project not found."; return false; }
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Project name is required."; return false; }
            existing.Name = request.Name.Trim();
            existing.Description = request.Description ?? "";
            existing.Status = request.Status;
            existing.StartDate = request.StartDate;
            existing.EndDate = request.EndDate;
            existing.ManagerId = request.ManagerId;
            existing.DepartmentId = request.DepartmentId;
            existing.CustomerId = request.CustomerId;
            existing.CustomerName = request.CustomerName ?? "";
            existing.Budget = request.Budget;
            existing.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency;
            existing.CompanyId = request.CompanyId;
            existing.UpdatedAt = DateTime.UtcNow;
            RecalculateProjectProgress(existing.Id);
            Persist();
            project = existing; return true;
        }
    }

    public bool SetProjectStatus(Guid id, ProjectStatus status, out Project? project, out string? error)
    {
        lock (_lock)
        {
            project = null; error = null;
            var existing = _projects.FirstOrDefault(p => p.Id == id);
            if (existing == null) { error = "Project not found."; return false; }
            existing.Status = status;
            existing.UpdatedAt = DateTime.UtcNow;
            if (status == ProjectStatus.Completed) existing.ProgressPercent = 100;
            if (status == ProjectStatus.Planning) existing.ProgressPercent = 0;
            Persist();
            project = existing; return true;
        }
    }

    public bool DeleteProject(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var existing = _projects.FirstOrDefault(p => p.Id == id);
            if (existing == null) { error = "Project not found."; return false; }
            _projects.Remove(existing);
            _projectPhases.RemoveAll(p => p.ProjectId == id);
            _projectTasks.RemoveAll(t => t.ProjectId == id);
            _timesheets.RemoveAll(t => t.ProjectId == id);
            _projectExpenses.RemoveAll(e => e.ProjectId == id);
            Persist(); return true;
        }
    }

    private void RecalculateProjectProgress(Guid projectId)
    {
        var project = _projects.FirstOrDefault(p => p.Id == projectId);
        if (project == null) return;
        var tasks = _projectTasks.Where(t => t.ProjectId == projectId).ToList();
        if (tasks.Count == 0) return;
        var done = tasks.Count(t => t.Status == ProjectTaskStatus.Completed);
        project.ProgressPercent = Math.Round((decimal)done / tasks.Count * 100, 1);
    }

    // ── Phases ───────────────────────────────────────────────────────────────
    public List<ProjectPhase> GetPhases(Guid? projectId = null)
    {
        var query = _projectPhases.AsEnumerable();
        if (projectId.HasValue) query = query.Where(p => p.ProjectId == projectId.Value);
        return query.OrderBy(p => p.OrderIndex).ToList();
    }

    public bool CreatePhase(ProjectPhaseRequest request, out ProjectPhase? phase, out string? error)
    {
        lock (_lock)
        {
            phase = null; error = null;
            if (_projects.FirstOrDefault(p => p.Id == request.ProjectId) == null) { error = "Project not found."; return false; }
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Phase name is required."; return false; }
            phase = new ProjectPhase
            {
                ProjectId = request.ProjectId,
                Name = request.Name.Trim(),
                Description = request.Description ?? "",
                OrderIndex = request.OrderIndex,
            };
            _projectPhases.Add(phase);
            Persist(); return true;
        }
    }

    // ── Tasks ────────────────────────────────────────────────────────────────
    public List<ProjectTask> GetTasks(Guid? projectId = null, Guid? assigneeId = null, ProjectTaskStatus? status = null)
    {
        var query = _projectTasks.AsEnumerable();
        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);
        if (assigneeId.HasValue) query = query.Where(t => t.AssigneeId == assigneeId.Value);
        if (status.HasValue) query = query.Where(t => t.Status == status.Value);
        return query.OrderByDescending(t => t.CreatedAt).ToList();
    }

    public bool CreateTask(ProjectTaskRequest request, out ProjectTask? task, out string? error)
    {
        lock (_lock)
        {
            task = null; error = null;
            if (_projects.FirstOrDefault(p => p.Id == request.ProjectId) == null) { error = "Project not found."; return false; }
            if (string.IsNullOrWhiteSpace(request.Title)) { error = "Task title is required."; return false; }
            task = new ProjectTask
            {
                ProjectId = request.ProjectId,
                PhaseId = request.PhaseId,
                Title = request.Title.Trim(),
                Description = request.Description ?? "",
                AssigneeId = request.AssigneeId,
                Status = request.Status,
                Priority = request.Priority,
                StartDate = request.StartDate,
                DueDate = request.DueDate,
                EstimatedHours = request.EstimatedHours,
                CompanyId = request.CompanyId,
            };
            _projectTasks.Add(task);
            RecalculateProjectProgress(request.ProjectId);
            Persist(); return true;
        }
    }

    public bool UpdateTask(Guid id, ProjectTaskRequest request, out ProjectTask? task, out string? error)
    {
        lock (_lock)
        {
            task = null; error = null;
            var existing = _projectTasks.FirstOrDefault(t => t.Id == id);
            if (existing == null) { error = "Task not found."; return false; }
            if (string.IsNullOrWhiteSpace(request.Title)) { error = "Task title is required."; return false; }
            existing.Title = request.Title.Trim();
            existing.Description = request.Description ?? "";
            existing.PhaseId = request.PhaseId;
            existing.AssigneeId = request.AssigneeId;
            existing.Status = request.Status;
            existing.Priority = request.Priority;
            existing.StartDate = request.StartDate;
            existing.DueDate = request.DueDate;
            existing.EstimatedHours = request.EstimatedHours;
            existing.CompanyId = request.CompanyId;
            existing.UpdatedAt = DateTime.UtcNow;
            RecalculateProjectProgress(existing.ProjectId);
            Persist();
            task = existing; return true;
        }
    }

    public bool SetTaskStatus(Guid id, ProjectTaskStatus status, out ProjectTask? task, out string? error)
    {
        lock (_lock)
        {
            task = null; error = null;
            var existing = _projectTasks.FirstOrDefault(t => t.Id == id);
            if (existing == null) { error = "Task not found."; return false; }
            existing.Status = status;
            existing.UpdatedAt = DateTime.UtcNow;
            RecalculateProjectProgress(existing.ProjectId);
            Persist();
            task = existing; return true;
        }
    }

    public bool DeleteTask(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var existing = _projectTasks.FirstOrDefault(t => t.Id == id);
            if (existing == null) { error = "Task not found."; return false; }
            _projectTasks.Remove(existing);
            RecalculateProjectProgress(existing.ProjectId);
            Persist(); return true;
        }
    }

    // ── Timesheets ───────────────────────────────────────────────────────────
    public List<TimesheetEntry> GetTimesheets(Guid? projectId = null, Guid? employeeId = null, bool? approved = null)
    {
        var query = _timesheets.AsEnumerable();
        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);
        if (employeeId.HasValue) query = query.Where(t => t.EmployeeId == employeeId.Value);
        if (approved.HasValue) query = query.Where(t => t.Approved == approved.Value);
        return query.OrderByDescending(t => t.Date).ToList();
    }

    public bool LogTimesheet(TimesheetRequest request, out TimesheetEntry? entry, out string? error)
    {
        lock (_lock)
        {
            entry = null; error = null;
            if (_projects.FirstOrDefault(p => p.Id == request.ProjectId) == null) { error = "Project not found."; return false; }
            if (_employees.FirstOrDefault(e => e.Id == request.EmployeeId) == null) { error = "Employee not found."; return false; }
            if (request.Hours <= 0 || request.Hours > 24) { error = "Hours must be between 0 and 24."; return false; }
            entry = new TimesheetEntry
            {
                ProjectId = request.ProjectId,
                TaskId = request.TaskId,
                EmployeeId = request.EmployeeId,
                Date = request.Date,
                Hours = request.Hours,
                Description = request.Description ?? "",
                Billable = request.Billable,
                BillableRate = request.BillableRate,
                Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency,
                CompanyId = request.CompanyId,
            };
            if (request.TaskId.HasValue)
            {
                var task = _projectTasks.FirstOrDefault(t => t.Id == request.TaskId.Value);
                if (task != null) task.ActualHours += request.Hours;
            }
            _timesheets.Add(entry);
            Persist(); return true;
        }
    }

    public bool ApproveTimesheet(Guid id, Guid? approvedBy, out TimesheetEntry? entry, out string? error)
    {
        lock (_lock)
        {
            entry = null; error = null;
            var existing = _timesheets.FirstOrDefault(t => t.Id == id);
            if (existing == null) { error = "Timesheet entry not found."; return false; }
            existing.Approved = true;
            existing.ApprovedBy = approvedBy;
            Persist();
            entry = existing; return true;
        }
    }

    public bool DeleteTimesheet(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var existing = _timesheets.FirstOrDefault(t => t.Id == id);
            if (existing == null) { error = "Timesheet entry not found."; return false; }
            if (existing.TaskId.HasValue)
            {
                var task = _projectTasks.FirstOrDefault(t => t.Id == existing.TaskId.Value);
                if (task != null) task.ActualHours = Math.Max(0, task.ActualHours - existing.Hours);
            }
            _timesheets.Remove(existing);
            Persist(); return true;
        }
    }

    // ── Expenses ─────────────────────────────────────────────────────────────
    public List<ProjectExpense> GetProjectExpenses(Guid? projectId = null, string? category = null)
    {
        var query = _projectExpenses.AsEnumerable();
        if (projectId.HasValue) query = query.Where(e => e.ProjectId == projectId.Value);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(e => e.Category == category);
        return query.OrderByDescending(e => e.ExpenseDate).ToList();
    }

    public bool CreateProjectExpense(ProjectExpenseRequest request, out ProjectExpense? expense, out string? error)
    {
        lock (_lock)
        {
            expense = null; error = null;
            if (_projects.FirstOrDefault(p => p.Id == request.ProjectId) == null) { error = "Project not found."; return false; }
            if (request.Amount <= 0) { error = "Expense amount must be positive."; return false; }
            if (string.IsNullOrWhiteSpace(request.Category)) { error = "Expense category is required."; return false; }
            expense = new ProjectExpense
            {
                ProjectId = request.ProjectId,
                EmployeeId = request.EmployeeId,
                Category = request.Category.Trim(),
                Description = request.Description ?? "",
                VendorName = request.VendorName,
                Amount = request.Amount,
                Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency,
                ExpenseDate = request.ExpenseDate,
                Billable = request.Billable,
                CompanyId = request.CompanyId,
            };
            _projectExpenses.Add(expense);
            Persist(); return true;
        }
    }

    public bool DeleteProjectExpense(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var existing = _projectExpenses.FirstOrDefault(e => e.Id == id);
            if (existing == null) { error = "Expense not found."; return false; }
            _projectExpenses.Remove(existing);
            Persist(); return true;
        }
    }

    // ── Dashboard / Profitability ────────────────────────────────────────────
    public object GetProjectDashboard(Guid projectId)
    {
        var project = _projects.FirstOrDefault(p => p.Id == projectId);
        if (project == null) return new { };
        var tasks = _projectTasks.Where(t => t.ProjectId == projectId).ToList();
        var timesheets = _timesheets.Where(t => t.ProjectId == projectId).ToList();
        var expenses = _projectExpenses.Where(e => e.ProjectId == projectId).ToList();

        var totalHours = timesheets.Sum(t => t.Hours);
        var billableHours = timesheets.Where(t => t.Billable).Sum(t => t.Hours);
        var laborCost = timesheets.Sum(t => t.Hours * t.BillableRate);
        var expenseTotal = expenses.Sum(e => e.Amount);
        var totalCost = laborCost + expenseTotal;
        var budget = project.Budget;
        var budgetUtilization = budget > 0 ? Math.Round(totalCost / budget * 100, 1) : 0;

        return new
        {
            project,
            tasks,
            timesheets,
            expenses,
            totalTasks = tasks.Count,
            completedTasks = tasks.Count(t => t.Status == ProjectTaskStatus.Completed),
            inProgressTasks = tasks.Count(t => t.Status == ProjectTaskStatus.InProgress),
            overdueTasks = tasks.Count(t => t.DueDate.HasValue && t.Status != ProjectTaskStatus.Completed && t.DueDate.Value < DateOnly.FromDateTime(DateTime.Today)),
            totalHours,
            billableHours,
            laborCost,
            expenseTotal,
            totalCost,
            budget,
            budgetUtilization,
            remainingBudget = budget - totalCost,
            profitability = totalCost > 0 ? Math.Round((budget - totalCost) / totalCost * 100, 1) : 0,
        };
    }

    #endregion

    #region Government Compliance

    public List<TaxObligation> GetTaxObligations(string? jurisdictionId = null, TaxObligationStatus? status = null, Guid? companyId = null)
    {
        var query = _taxObligations.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(jurisdictionId)) query = query.Where(o => o.JurisdictionId == jurisdictionId);
        if (status.HasValue) query = query.Where(o => o.Status == status.Value);
        if (companyId.HasValue) query = query.Where(o => o.CompanyId == companyId.Value);
        return query.OrderByDescending(o => o.PeriodStart).ToList();
    }

    public bool CreateTaxObligation(TaxObligationRequest request, out TaxObligation? obligation, out string? error)
    {
        lock (_lock)
        {
            obligation = null; error = null;
            if (request.PeriodStart > request.PeriodEnd) { error = "Period start must be before period end."; return false; }
            if (request.AmountDue < 0) { error = "Amount due cannot be negative."; return false; }
            obligation = new TaxObligation
            {
                ObligationNumber = NextObligationNumber(),
                JurisdictionId = string.IsNullOrWhiteSpace(request.JurisdictionId) ? "UK" : request.JurisdictionId,
                ObligationType = string.IsNullOrWhiteSpace(request.ObligationType) ? "VAT" : request.ObligationType,
                PeriodStart = request.PeriodStart,
                PeriodEnd = request.PeriodEnd,
                DueDate = request.DueDate,
                AmountDue = request.AmountDue,
                Notes = request.Notes,
                CompanyId = request.CompanyId,
            };
            _taxObligations.Add(obligation);
            Persist(); return true;
        }
    }

    public bool SetObligationStatus(Guid id, TaxObligationStatus status, out TaxObligation? obligation, out string? error)
    {
        lock (_lock)
        {
            obligation = null; error = null;
            var existing = _taxObligations.FirstOrDefault(o => o.Id == id);
            if (existing == null) { error = "Obligation not found."; return false; }
            existing.Status = status;
            if (status == TaxObligationStatus.Filed || status == TaxObligationStatus.Paid) existing.FiledDate ??= DateOnly.FromDateTime(DateTime.Today);
            if (status == TaxObligationStatus.Paid) existing.AmountPaid = existing.AmountDue;
            Persist();
            obligation = existing; return true;
        }
    }

    public List<TaxReturn> GetTaxReturns(string? jurisdictionId = null, string? status = null, Guid? companyId = null)
    {
        var query = _taxReturns.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(jurisdictionId)) query = query.Where(r => r.JurisdictionId == jurisdictionId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(r => r.Status == status);
        if (companyId.HasValue) query = query.Where(r => r.CompanyId == companyId.Value);
        return query.OrderByDescending(r => r.PeriodStart).ToList();
    }

    public bool CreateTaxReturn(TaxReturn request, out TaxReturn? ret, out string? error)
    {
        lock (_lock)
        {
            ret = null; error = null;
            if (request.PeriodStart > request.PeriodEnd) { error = "Period start must be before period end."; return false; }
            if (string.IsNullOrWhiteSpace(request.ReturnType)) { error = "Return type is required."; return false; }
            ret = new TaxReturn
            {
                ReturnNumber = NextReturnNumber(),
                JurisdictionId = string.IsNullOrWhiteSpace(request.JurisdictionId) ? "UK" : request.JurisdictionId,
                ReturnType = request.ReturnType,
                PeriodStart = request.PeriodStart,
                PeriodEnd = request.PeriodEnd,
                DueDate = request.DueDate,
                OutputTax = request.OutputTax,
                InputTax = request.InputTax,
                AmountPaid = request.AmountPaid,
                Reference = request.Reference,
                CompanyId = request.CompanyId,
            };
            _taxReturns.Add(ret);
            Persist(); return true;
        }
    }

    public bool FileTaxReturn(Guid id, out TaxReturn? ret, out string? error)
    {
        lock (_lock)
        {
            ret = null; error = null;
            var existing = _taxReturns.FirstOrDefault(r => r.Id == id);
            if (existing == null) { error = "Tax return not found."; return false; }
            existing.Status = "Filed";
            existing.FiledDate ??= DateOnly.FromDateTime(DateTime.Today);
            Persist();
            ret = existing; return true;
        }
    }

    public List<WithholdingCertificate> GetWithholdingCertificates(string? type = null, string? status = null, Guid? companyId = null)
    {
        var query = _withholdingCertificates.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(c => c.CertificateType == type);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(c => c.Status == status);
        if (companyId.HasValue) query = query.Where(c => c.CompanyId == companyId.Value);
        return query.OrderByDescending(c => c.PeriodStart).ToList();
    }

    public bool CreateWithholdingCertificate(WithholdingCertificateRequest request, out WithholdingCertificate? cert, out string? error)
    {
        lock (_lock)
        {
            cert = null; error = null;
            if (string.IsNullOrWhiteSpace(request.CounterpartyName)) { error = "Counterparty name is required."; return false; }
            if (request.GrossAmount <= 0) { error = "Gross amount must be positive."; return false; }
            if (request.RatePercent <= 0) { error = "Rate must be positive."; return false; }
            cert = new WithholdingCertificate
            {
                CertificateNumber = NextWithholdingNumber(),
                CertificateType = string.IsNullOrWhiteSpace(request.CertificateType) ? "Payment" : request.CertificateType,
                CounterpartyName = request.CounterpartyName.Trim(),
                TaxId = request.TaxId ?? "",
                RatePercent = request.RatePercent,
                GrossAmount = request.GrossAmount,
                WithheldAmount = Math.Round(request.GrossAmount * request.RatePercent / 100, 2),
                PeriodStart = request.PeriodStart,
                PeriodEnd = request.PeriodEnd,
                Status = string.IsNullOrWhiteSpace(request.Status) ? "Issued" : request.Status,
                CompanyId = request.CompanyId,
            };
            _withholdingCertificates.Add(cert);
            Persist(); return true;
        }
    }

    public string NextWithholdingNumber()
    {
        var numbers = _withholdingCertificates.Select(c => c.CertificateNumber).Where(n => n.StartsWith("WHT-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"WHT-{(numbers.Max() + 1):D4}";
    }

    public List<EInvoice> GetEInvoices(string? type = null, EInvoiceStatus? status = null, Guid? companyId = null)
    {
        var query = _eInvoices.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(e => e.InvoiceType == type);
        if (status.HasValue) query = query.Where(e => e.Status == status.Value);
        if (companyId.HasValue) query = query.Where(e => e.CompanyId == companyId.Value);
        return query.OrderByDescending(e => e.IssueDate).ToList();
    }

    public bool CreateEInvoice(EInvoiceRequest request, out EInvoice? invoice, out string? error)
    {
        lock (_lock)
        {
            invoice = null; error = null;
            if (string.IsNullOrWhiteSpace(request.CounterpartyName)) { error = "Counterparty name is required."; return false; }
            if (request.GrossAmount < 0 || request.TaxAmount < 0) { error = "Amounts cannot be negative."; return false; }
            invoice = new EInvoice
            {
                InvoiceNumber = NextEInvoiceNumber(),
                InvoiceType = string.IsNullOrWhiteSpace(request.InvoiceType) ? "Sales" : request.InvoiceType,
                CounterpartyName = request.CounterpartyName.Trim(),
                CounterpartyTaxId = request.CounterpartyTaxId,
                IssueDate = request.IssueDate,
                Reference = request.Reference,
                GrossAmount = request.GrossAmount,
                TaxAmount = request.TaxAmount,
                TotalAmount = request.GrossAmount + request.TaxAmount,
                Status = EInvoiceStatus.Draft,
                Uuid = request.Uuid,
                CompanyId = request.CompanyId,
            };
            _eInvoices.Add(invoice);
            Persist(); return true;
        }
    }

    public string NextEInvoiceNumber()
    {
        var numbers = _eInvoices.Select(e => e.InvoiceNumber).Where(n => n.StartsWith("EINV-") && int.TryParse(n[5..], out _)).Select(n => int.Parse(n[5..])).DefaultIfEmpty(0);
        return $"EINV-{(numbers.Max() + 1):D4}";
    }

    public string NextSurveyNumber()
    {
        var numbers = _surveys.Select(s => s.SurveyNumber).Where(n => n.StartsWith("SUR-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"SUR-{(numbers.Max() + 1):D4}";
    }

    public string NextVisitNumber()
    {
        var numbers = _fieldVisits.Select(v => v.VisitNumber).Where(n => n.StartsWith("VIS-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"VIS-{(numbers.Max() + 1):D4}";
    }

    public string NextInspectionNumber()
    {
        var numbers = _inspections.Select(i => i.InspectionNumber).Where(n => n.StartsWith("INS-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"INS-{(numbers.Max() + 1):D5}";
    }

    public string NextFieldWorkOrderNumber()
    {
        var numbers = _fieldWorkOrders.Select(w => w.WorkOrderNumber).Where(n => n.StartsWith("FWO-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"FWO-{(numbers.Max() + 1):D5}";
    }

    public string NextFieldExpenseNumber()
    {
        var numbers = _fieldExpenses.Select(e => e.ExpenseNumber).Where(n => n.StartsWith("FEX-") && int.TryParse(n[4..], out _)).Select(n => int.Parse(n[4..])).DefaultIfEmpty(0);
        return $"FEX-{(numbers.Max() + 1):D5}";
    }

    public bool SetEInvoiceStatus(Guid id, EInvoiceStatus status, out EInvoice? invoice, out string? error)
    {
        lock (_lock)
        {
            invoice = null; error = null;
            var existing = _eInvoices.FirstOrDefault(e => e.Id == id);
            if (existing == null) { error = "E-invoice not found."; return false; }
            existing.Status = status;
            if (existing.Uuid == null) existing.Uuid = Guid.NewGuid().ToString();
            Persist();
            invoice = existing; return true;
        }
    }

    public object GetComplianceDashboard()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var due = _taxObligations.Count(o => o.Status == TaxObligationStatus.Due || o.Status == TaxObligationStatus.Overdue);
        var overdue = _taxObligations.Count(o => o.Status == TaxObligationStatus.Overdue);
        var filed = _taxObligations.Count(o => o.Status == TaxObligationStatus.Filed || o.Status == TaxObligationStatus.Paid);
        var totalDue = _taxObligations.Where(o => o.Status == TaxObligationStatus.Due || o.Status == TaxObligationStatus.Overdue).Sum(o => o.AmountDue - o.AmountPaid);
        var totalWithheld = _withholdingCertificates.Sum(c => c.WithheldAmount);
        var validatedInvoices = _eInvoices.Count(e => e.Status == EInvoiceStatus.Validated);
        var pendingInvoices = _eInvoices.Count(e => e.Status == EInvoiceStatus.Submitted);
        var rejectedInvoices = _eInvoices.Count(e => e.Status == EInvoiceStatus.Rejected);
        var upcoming = _taxObligations
            .Where(o => o.Status == TaxObligationStatus.Due && o.DueDate >= today)
            .OrderBy(o => o.DueDate)
            .Take(5)
            .Select(o => new { o.Id, o.ObligationNumber, o.JurisdictionId, o.ObligationType, o.DueDate, o.AmountDue })
            .ToList();
        return new
        {
            obligations = _taxObligations.Count,
            due,
            overdue,
            filed,
            totalDue,
            totalWithheld,
            validatedInvoices,
            pendingInvoices,
            rejectedInvoices,
            invoices = _eInvoices.Count,
            returns = _taxReturns.Count,
            upcoming,
        };
    }

    #endregion

    #region Survey & Field Operations

    public List<Survey> GetSurveys(SurveyStatus? status = null, string? category = null, Guid? companyId = null)
    {
        var query = _surveys.AsEnumerable();
        if (status.HasValue) query = query.Where(s => s.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(s => s.Category == category);
        if (companyId.HasValue) query = query.Where(s => s.CompanyId == companyId.Value);
        return query.OrderByDescending(s => s.CreatedAt).ToList();
    }

    public bool CreateSurvey(SurveyRequest request, out Survey? survey, out string? error)
    {
        lock (_lock)
        {
            survey = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Title)) { error = "Survey title is required."; return false; }
            if (request.StartDate > request.EndDate) { error = "Start date must be before end date."; return false; }
            survey = new Survey
            {
                SurveyNumber = NextSurveyNumber(),
                Title = request.Title.Trim(),
                Description = request.Description ?? "",
                Category = string.IsNullOrWhiteSpace(request.Category) ? "Customer Satisfaction" : request.Category,
                Status = request.Status,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Region = request.Region ?? "",
                AssignedTo = request.AssignedTo,
                TargetResponses = request.TargetResponses,
                CompanyId = request.CompanyId,
            };
            _surveys.Add(survey);
            Persist(); return true;
        }
    }

    public bool SetSurveyStatus(Guid id, SurveyStatus status, out Survey? survey, out string? error)
    {
        lock (_lock)
        {
            survey = null; error = null;
            var existing = _surveys.FirstOrDefault(s => s.Id == id);
            if (existing == null) { error = "Survey not found."; return false; }
            existing.Status = status;
            Persist();
            survey = existing; return true;
        }
    }

    public List<FieldVisit> GetFieldVisits(FieldVisitStatus? status = null, string? visitType = null, Guid? companyId = null)
    {
        var query = _fieldVisits.AsEnumerable();
        if (status.HasValue) query = query.Where(v => v.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(visitType)) query = query.Where(v => v.VisitType == visitType);
        if (companyId.HasValue) query = query.Where(v => v.CompanyId == companyId.Value);
        return query.OrderByDescending(v => v.ScheduledDate).ToList();
    }

    public bool CreateFieldVisit(FieldVisitRequest request, out FieldVisit? visit, out string? error)
    {
        lock (_lock)
        {
            visit = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Purpose)) { error = "Visit purpose is required."; return false; }
            visit = new FieldVisit
            {
                VisitNumber = NextVisitNumber(),
                VisitType = string.IsNullOrWhiteSpace(request.VisitType) ? "Site Visit" : request.VisitType,
                CustomerId = request.CustomerId,
                CustomerName = request.CustomerName ?? "",
                ContactName = request.ContactName ?? "",
                Purpose = request.Purpose.Trim(),
                ScheduledDate = request.ScheduledDate,
                StartTime = request.StartTime,
                DurationHours = request.DurationHours,
                Status = request.Status,
                Location = request.Location ?? "",
                AssignedTo = request.AssignedTo,
                Findings = request.Findings ?? "",
                CompanyId = request.CompanyId,
            };
            _fieldVisits.Add(visit);
            Persist(); return true;
        }
    }

    public bool SetFieldVisitStatus(Guid id, FieldVisitStatus status, out FieldVisit? visit, out string? error)
    {
        lock (_lock)
        {
            visit = null; error = null;
            var existing = _fieldVisits.FirstOrDefault(v => v.Id == id);
            if (existing == null) { error = "Field visit not found."; return false; }
            existing.Status = status;
            Persist();
            visit = existing; return true;
        }
    }

    public List<Inspection> GetInspections(InspectionStatus? status = null, string? type = null, Guid? companyId = null)
    {
        var query = _inspections.AsEnumerable();
        if (status.HasValue) query = query.Where(i => i.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(i => i.InspectionType == type);
        if (companyId.HasValue) query = query.Where(i => i.CompanyId == companyId.Value);
        return query.OrderByDescending(i => i.ScheduledDate).ToList();
    }

    public bool CreateInspection(InspectionRequest request, out Inspection? inspection, out string? error)
    {
        lock (_lock)
        {
            inspection = null; error = null;
            if (string.IsNullOrWhiteSpace(request.InspectionType)) { error = "Inspection type is required."; return false; }
            if (request.Score is < 0 or > 100) { error = "Score must be between 0 and 100."; return false; }
            inspection = new Inspection
            {
                InspectionNumber = NextInspectionNumber(),
                InspectionType = request.InspectionType,
                Location = request.Location ?? "",
                ScheduledDate = request.ScheduledDate,
                InspectorId = request.InspectorId,
                Status = request.Status,
                Score = request.Score,
                Findings = request.Findings ?? "",
                Reference = request.Reference,
                CompanyId = request.CompanyId,
            };
            _inspections.Add(inspection);
            Persist(); return true;
        }
    }

    public bool SetInspectionStatus(Guid id, InspectionStatus status, out Inspection? inspection, out string? error)
    {
        lock (_lock)
        {
            inspection = null; error = null;
            var existing = _inspections.FirstOrDefault(i => i.Id == id);
            if (existing == null) { error = "Inspection not found."; return false; }
            existing.Status = status;
            if (status == InspectionStatus.Passed) existing.Score = Math.Max(existing.Score, 70);
            if (status == InspectionStatus.Failed) existing.Score = Math.Min(existing.Score == 0 ? 61 : existing.Score, 69);
            Persist();
            inspection = existing; return true;
        }
    }

    public List<FieldWorkOrder> GetFieldWorkOrders(FieldWorkOrderStatus? status = null, string? priority = null, Guid? companyId = null)
    {
        var query = _fieldWorkOrders.AsEnumerable();
        if (status.HasValue) query = query.Where(w => w.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(priority)) query = query.Where(w => w.Priority == priority);
        if (companyId.HasValue) query = query.Where(w => w.CompanyId == companyId.Value);
        return query.OrderByDescending(w => w.ScheduledDate).ToList();
    }

    public bool CreateFieldWorkOrder(FieldWorkOrderRequest request, out FieldWorkOrder? order, out string? error)
    {
        lock (_lock)
        {
            order = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Description)) { error = "Work order description is required."; return false; }
            order = new FieldWorkOrder
            {
                WorkOrderNumber = NextFieldWorkOrderNumber(),
                WorkType = string.IsNullOrWhiteSpace(request.WorkType) ? "Repair" : request.WorkType,
                CustomerId = request.CustomerId,
                CustomerName = request.CustomerName ?? "",
                Description = request.Description.Trim(),
                Priority = string.IsNullOrWhiteSpace(request.Priority) ? "Medium" : request.Priority,
                Status = request.Status,
                AssignedTo = request.AssignedTo,
                ScheduledDate = request.ScheduledDate,
                CompletedDate = request.CompletedDate,
                LaborHours = request.LaborHours,
                LaborCost = request.LaborCost,
                PartsCost = request.PartsCost,
                Location = request.Location ?? "",
                CompanyId = request.CompanyId,
            };
            _fieldWorkOrders.Add(order);
            Persist(); return true;
        }
    }

    public bool SetFieldWorkOrderStatus(Guid id, FieldWorkOrderStatus status, out FieldWorkOrder? order, out string? error)
    {
        lock (_lock)
        {
            order = null; error = null;
            var existing = _fieldWorkOrders.FirstOrDefault(w => w.Id == id);
            if (existing == null) { error = "Field work order not found."; return false; }
            existing.Status = status;
            if (status == FieldWorkOrderStatus.Completed) existing.CompletedDate ??= DateOnly.FromDateTime(DateTime.Today);
            Persist();
            order = existing; return true;
        }
    }

    public List<FieldExpense> GetFieldExpenses(Guid? workOrderId = null, string? category = null, Guid? companyId = null)
    {
        var query = _fieldExpenses.AsEnumerable();
        if (workOrderId.HasValue) query = query.Where(e => e.WorkOrderId == workOrderId.Value);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(e => e.Category == category);
        if (companyId.HasValue) query = query.Where(e => e.CompanyId == companyId.Value);
        return query.OrderByDescending(e => e.ExpenseDate).ToList();
    }

    public bool CreateFieldExpense(FieldExpenseRequest request, out FieldExpense? expense, out string? error)
    {
        lock (_lock)
        {
            expense = null; error = null;
            if (request.Amount <= 0) { error = "Expense amount must be positive."; return false; }
            if (string.IsNullOrWhiteSpace(request.Description)) { error = "Expense description is required."; return false; }
            expense = new FieldExpense
            {
                ExpenseNumber = NextFieldExpenseNumber(),
                WorkOrderId = request.WorkOrderId,
                Category = string.IsNullOrWhiteSpace(request.Category) ? "Travel" : request.Category,
                Description = request.Description.Trim(),
                Amount = request.Amount,
                Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency,
                ExpenseDate = request.ExpenseDate,
                Reimbursed = request.Reimbursed,
                CompanyId = request.CompanyId,
            };
            _fieldExpenses.Add(expense);
            Persist(); return true;
        }
    }

    public object GetFieldOperationsDashboard()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var activeSurveys = _surveys.Count(s => s.Status == SurveyStatus.Active);
        var totalResponses = _surveys.Sum(s => s.ResponseCount);
        var upcomingVisits = _fieldVisits.Count(v => v.Status == FieldVisitStatus.Scheduled);
        var completedVisits = _fieldVisits.Count(v => v.Status == FieldVisitStatus.Completed);
        var openOrders = _fieldWorkOrders.Count(w => w.Status is FieldWorkOrderStatus.Open or FieldWorkOrderStatus.Assigned or FieldWorkOrderStatus.InProgress);
        var completedOrders = _fieldWorkOrders.Count(w => w.Status == FieldWorkOrderStatus.Completed);
        var totalOrderCost = _fieldWorkOrders.Sum(w => w.TotalCost);
        var pendingInspections = _inspections.Count(i => i.Status == InspectionStatus.Scheduled);
        var failedInspections = _inspections.Count(i => i.Status == InspectionStatus.Failed);
        var totalExpenses = _fieldExpenses.Sum(e => e.Amount);
        return new
        {
            surveys = _surveys.Count,
            activeSurveys,
            totalResponses,
            visits = _fieldVisits.Count,
            upcomingVisits,
            completedVisits,
            workOrders = _fieldWorkOrders.Count,
            openOrders,
            completedOrders,
            totalOrderCost,
            inspections = _inspections.Count,
            pendingInspections,
            failedInspections,
            expenses = _fieldExpenses.Count,
            totalExpenses,
        };
    }

    #endregion

    #region Administration

    // ── Users ────────────────────────────────────────────────────────────────
    public List<AdminUser> GetAdminUsers(UserStatus? status = null, string? role = null, Guid? companyId = null)
    {
        var query = _adminUsers.AsEnumerable();
        if (status.HasValue) query = query.Where(u => u.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(role)) query = query.Where(u => u.Role == role);
        if (companyId.HasValue) query = query.Where(u => u.CompanyId == companyId.Value);
        return query.OrderBy(u => u.FullName).ToList();
    }

    public bool CreateAdminUser(AdminUserRequest request, out AdminUser? user, out string? error)
    {
        lock (_lock)
        {
            user = null; error = null;
            if (string.IsNullOrWhiteSpace(request.FullName)) { error = "Full name is required."; return false; }
            if (string.IsNullOrWhiteSpace(request.Email)) { error = "Email is required."; return false; }
            if (_adminUsers.Any(u => u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase))) { error = "A user with this email already exists."; return false; }
            user = new AdminUser
            {
                UserName = string.IsNullOrWhiteSpace(request.UserName) ? request.Email : request.UserName,
                FullName = request.FullName.Trim(),
                Email = request.Email.Trim(),
                Role = string.IsNullOrWhiteSpace(request.Role) ? "Viewer" : request.Role,
                Status = request.Status,
                CompanyId = request.CompanyId,
            };
            _adminUsers.Add(user);
            Persist(); return true;
        }
    }

    public bool UpdateAdminUser(Guid id, AdminUserRequest request, out AdminUser? user, out string? error)
    {
        lock (_lock)
        {
            user = null; error = null;
            var existing = _adminUsers.FirstOrDefault(u => u.Id == id);
            if (existing == null) { error = "User not found."; return false; }
            existing.FullName = request.FullName;
            existing.Email = request.Email;
            existing.Role = string.IsNullOrWhiteSpace(request.Role) ? existing.Role : request.Role;
            existing.Status = request.Status;
            Persist();
            user = existing; return true;
        }
    }

    public bool SetAdminUserStatus(Guid id, UserStatus status, out AdminUser? user, out string? error)
    {
        lock (_lock)
        {
            user = null; error = null;
            var existing = _adminUsers.FirstOrDefault(u => u.Id == id);
            if (existing == null) { error = "User not found."; return false; }
            existing.Status = status;
            Persist();
            user = existing; return true;
        }
    }

    public bool DeleteAdminUser(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var existing = _adminUsers.FirstOrDefault(u => u.Id == id);
            if (existing == null) { error = "User not found."; return false; }
            _adminUsers.Remove(existing);
            Persist(); return true;
        }
    }

    // ── Roles ────────────────────────────────────────────────────────────────
    public List<UserRole> GetUserRoles(Guid? companyId = null)
    {
        var query = _userRoles.AsEnumerable();
        if (companyId.HasValue) query = query.Where(r => r.CompanyId == companyId.Value);
        return query.OrderBy(r => r.Name).ToList();
    }

    public bool CreateUserRole(UserRoleRequest request, out UserRole? role, out string? error)
    {
        lock (_lock)
        {
            role = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Role name is required."; return false; }
            role = new UserRole
            {
                Name = request.Name.Trim(),
                Description = request.Description ?? "",
                Permissions = request.Permissions ?? [],
                CompanyId = request.CompanyId,
            };
            _userRoles.Add(role);
            Persist(); return true;
        }
    }

    public bool UpdateUserRole(Guid id, UserRoleRequest request, out UserRole? role, out string? error)
    {
        lock (_lock)
        {
            role = null; error = null;
            var existing = _userRoles.FirstOrDefault(r => r.Id == id);
            if (existing == null) { error = "Role not found."; return false; }
            existing.Name = request.Name;
            existing.Description = request.Description ?? existing.Description;
            existing.Permissions = request.Permissions ?? existing.Permissions;
            Persist();
            role = existing; return true;
        }
    }

    public bool DeleteUserRole(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var existing = _userRoles.FirstOrDefault(r => r.Id == id);
            if (existing == null) { error = "Role not found."; return false; }
            _userRoles.Remove(existing);
            Persist(); return true;
        }
    }

    // ── Branches ─────────────────────────────────────────────────────────────
    public List<Branch> GetBranches(bool? active = null, Guid? companyId = null)
    {
        var query = _branches.AsEnumerable();
        if (active.HasValue) query = query.Where(b => b.Active == active.Value);
        if (companyId.HasValue) query = query.Where(b => b.CompanyId == companyId.Value);
        return query.OrderBy(b => b.Name).ToList();
    }

    public bool CreateBranch(BranchRequest request, out Branch? branch, out string? error)
    {
        lock (_lock)
        {
            branch = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Branch name is required."; return false; }
            branch = new Branch
            {
                Name = request.Name.Trim(),
                Code = string.IsNullOrWhiteSpace(request.Code) ? request.Name[..Math.Min(3, request.Name.Length)].ToUpper() : request.Code,
                City = request.City ?? "",
                Address = request.Address ?? "",
                Active = request.Active,
                CompanyId = request.CompanyId,
            };
            _branches.Add(branch);
            Persist(); return true;
        }
    }

    public bool SetBranchStatus(Guid id, bool active, out Branch? branch, out string? error)
    {
        lock (_lock)
        {
            branch = null; error = null;
            var existing = _branches.FirstOrDefault(b => b.Id == id);
            if (existing == null) { error = "Branch not found."; return false; }
            existing.Active = active;
            Persist();
            branch = existing; return true;
        }
    }

    public bool DeleteBranch(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var existing = _branches.FirstOrDefault(b => b.Id == id);
            if (existing == null) { error = "Branch not found."; return false; }
            _branches.Remove(existing);
            Persist(); return true;
        }
    }

    // ── Approval Workflows ───────────────────────────────────────────────────
    public List<ApprovalWorkflow> GetApprovalWorkflows(bool? active = null, Guid? companyId = null)
    {
        var query = _approvalWorkflows.AsEnumerable();
        if (active.HasValue) query = query.Where(w => w.Active == active.Value);
        if (companyId.HasValue) query = query.Where(w => w.CompanyId == companyId.Value);
        return query.OrderBy(w => w.Name).ToList();
    }

    public bool CreateApprovalWorkflow(ApprovalWorkflowRequest request, out ApprovalWorkflow? workflow, out string? error)
    {
        lock (_lock)
        {
            workflow = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Workflow name is required."; return false; }
            workflow = new ApprovalWorkflow
            {
                Name = request.Name.Trim(),
                Module = string.IsNullOrWhiteSpace(request.Module) ? "Sales" : request.Module,
                ApproverRole = string.IsNullOrWhiteSpace(request.ApproverRole) ? "Manager" : request.ApproverRole,
                Steps = Math.Max(1, request.Steps),
                Active = request.Active,
                CompanyId = request.CompanyId,
            };
            _approvalWorkflows.Add(workflow);
            Persist(); return true;
        }
    }

    public bool SetApprovalWorkflowStatus(Guid id, bool active, out ApprovalWorkflow? workflow, out string? error)
    {
        lock (_lock)
        {
            workflow = null; error = null;
            var existing = _approvalWorkflows.FirstOrDefault(w => w.Id == id);
            if (existing == null) { error = "Workflow not found."; return false; }
            existing.Active = active;
            Persist();
            workflow = existing; return true;
        }
    }

    public bool DeleteApprovalWorkflow(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var existing = _approvalWorkflows.FirstOrDefault(w => w.Id == id);
            if (existing == null) { error = "Workflow not found."; return false; }
            _approvalWorkflows.Remove(existing);
            Persist(); return true;
        }
    }

    // ── Number Series ────────────────────────────────────────────────────────
    public List<NumberSeries> GetNumberSeries(bool? active = null, Guid? companyId = null)
    {
        var query = _numberSeries.AsEnumerable();
        if (active.HasValue) query = query.Where(n => n.Active == active.Value);
        if (companyId.HasValue) query = query.Where(n => n.CompanyId == companyId.Value);
        return query.OrderBy(n => n.Name).ToList();
    }

    public bool CreateNumberSeries(NumberSeriesRequest request, out NumberSeries? series, out string? error)
    {
        lock (_lock)
        {
            series = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Name)) { error = "Series name is required."; return false; }
            if (request.NextNumber < 1) { error = "Next number must be at least 1."; return false; }
            series = new NumberSeries
            {
                Name = request.Name.Trim(),
                Prefix = request.Prefix ?? "",
                NextNumber = request.NextNumber,
                Format = string.IsNullOrWhiteSpace(request.Format) ? $"{request.Prefix}{request.NextNumber:D4}" : request.Format,
                Active = request.Active,
                CompanyId = request.CompanyId,
            };
            _numberSeries.Add(series);
            Persist(); return true;
        }
    }

    public bool SetNumberSeriesStatus(Guid id, bool active, out NumberSeries? series, out string? error)
    {
        lock (_lock)
        {
            series = null; error = null;
            var existing = _numberSeries.FirstOrDefault(n => n.Id == id);
            if (existing == null) { error = "Number series not found."; return false; }
            existing.Active = active;
            Persist();
            series = existing; return true;
        }
    }

    public bool DeleteNumberSeries(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var existing = _numberSeries.FirstOrDefault(n => n.Id == id);
            if (existing == null) { error = "Number series not found."; return false; }
            _numberSeries.Remove(existing);
            Persist(); return true;
        }
    }

    // ── Currencies ───────────────────────────────────────────────────────────
    public List<Currency> GetCurrencies(bool? active = null, Guid? companyId = null)
    {
        var query = _currencies.AsEnumerable();
        if (active.HasValue) query = query.Where(c => c.Active == active.Value);
        if (companyId.HasValue) query = query.Where(c => c.CompanyId == companyId.Value);
        return query.OrderBy(c => c.Code).ToList();
    }

    public bool CreateCurrency(CurrencyRequest request, out Currency? currency, out string? error)
    {
        lock (_lock)
        {
            currency = null; error = null;
            if (string.IsNullOrWhiteSpace(request.Code)) { error = "Currency code is required."; return false; }
            if (_currencies.Any(c => c.Code.Equals(request.Code, StringComparison.OrdinalIgnoreCase))) { error = "This currency code already exists."; return false; }
            if (request.Rate <= 0) { error = "Exchange rate must be positive."; return false; }
            currency = new Currency
            {
                Code = request.Code.ToUpperInvariant(),
                Name = request.Name ?? "",
                Symbol = request.Symbol ?? "",
                Rate = request.Rate,
                Base = request.Base,
                Active = request.Active,
                CompanyId = request.CompanyId,
            };
            _currencies.Add(currency);
            Persist(); return true;
        }
    }

    public bool SetCurrencyStatus(Guid id, bool active, out Currency? currency, out string? error)
    {
        lock (_lock)
        {
            currency = null; error = null;
            var existing = _currencies.FirstOrDefault(c => c.Id == id);
            if (existing == null) { error = "Currency not found."; return false; }
            existing.Active = active;
            Persist();
            currency = existing; return true;
        }
    }

    public bool DeleteCurrency(Guid id, out string? error)
    {
        lock (_lock)
        {
            error = null;
            var existing = _currencies.FirstOrDefault(c => c.Id == id);
            if (existing == null) { error = "Currency not found."; return false; }
            _currencies.Remove(existing);
            Persist(); return true;
        }
    }

    public object GetAdministrationDashboard()
    {
        return new
        {
            users = _adminUsers.Count,
            activeUsers = _adminUsers.Count(u => u.Status == UserStatus.Active),
            lockedUsers = _adminUsers.Count(u => u.Status == UserStatus.Locked),
            roles = _userRoles.Count,
            permissions = _userRoles.Sum(r => r.Permissions.Count),
            branches = _branches.Count,
            activeBranches = _branches.Count(b => b.Active),
            workflows = _approvalWorkflows.Count,
            activeWorkflows = _approvalWorkflows.Count(w => w.Active),
            numberSeries = _numberSeries.Count,
            currencies = _currencies.Count,
            baseCurrency = _currencies.FirstOrDefault(c => c.Base)?.Code ?? "USD",
        };
    }

    #region Lease Accounting

    public List<LeaseAgreement> GetLeases(Guid? companyId = null, bool? active = null, LeaseType? type = null)
    {
        var query = _leases.AsQueryable();
        if (companyId.HasValue) query = query.Where(l => l.CompanyId == companyId.Value);
        if (active.HasValue) query = query.Where(l => l.IsActive == active.Value);
        if (type.HasValue) query = query.Where(l => l.Type == type.Value);
        return query.ToList();
    }

    public bool CreateLease(LeaseRequest request, out LeaseAgreement? lease, out string? error)
    {
        error = null;
        try
        {
            var term = request.TermMonths ?? (int)((request.EndDate.Year - request.StartDate.Year) * 12 + request.EndDate.Month - request.StartDate.Month);
            var pv = CalculateLeasePresentValue(request.MonthlyRent, request.AnnualEscalationRate, term, request.Type);
            
            lease = new LeaseAgreement
            {
                LeaseNumber = request.LeaseNumber,
                Counterparty = request.Counterparty,
                Type = request.Type,
                PropertyDescription = request.PropertyDescription,
                InitialValue = request.InitialValue,
                MonthlyRent = request.MonthlyRent,
                AnnualEscalationRate = request.AnnualEscalationRate,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                TermMonths = term,
                PresentValue = pv,
                RightOfUseAssetValue = pv,
                AssetAccountId = request.AssetAccountId,
                LiabilityAccountId = request.LiabilityAccountId,
                InterestAccountId = request.InterestAccountId,
                CashAccountId = request.CashAccountId,
                CompanyId = request.CompanyId,
                BalanceSheetLiability = pv,
                IsActive = true
            };
            
            _leases.Add(lease);
            Persist();
            error = null;
            return true;
        }
        catch (Exception ex)
        {
            error = $"Failed to create lease: {ex.Message}";
            lease = null;
            return false;
        }
    }

    public bool GetLeaseSchedule(Guid leaseId, int months, out LeaseScheduleResponse? schedule, out string? error)
    {
        error = null;
        var lease = _leases.FirstOrDefault(l => l.Id == leaseId);
        if (lease == null) { error = "Lease not found"; schedule = null; return false; }

        schedule = GenerateLeaseSchedule(lease, months);
        return true;
    }

    public bool PostLeaseAccrual(Guid leaseId, DateOnly asOfDate, out JournalEntry? entry, out string? error)
    {
        error = null;
        var lease = _leases.FirstOrDefault(l => l.Id == leaseId);
        if (lease == null) { error = "Lease not found"; entry = null; return true; }

        var schedule = GenerateLeaseSchedule(lease, 12);
        var currentMonth = schedule.Schedule.FirstOrDefault(s => s.Date >= asOfDate) ?? schedule.Schedule.FirstOrDefault();
        if (currentMonth == null) { error = "No schedule period found for date"; entry = null; return false; }

        var assetAcc = (lease.AssetAccountId.HasValue && lease.AssetAccountId != Guid.Empty) ? lease.AssetAccountId.Value : GetMappedAccount("Right of Use Asset");
        var liabilityAcc = (lease.LiabilityAccountId.HasValue && lease.LiabilityAccountId != Guid.Empty) ? lease.LiabilityAccountId.Value : GetMappedAccount("Lease Liability");
        var interestAcc = (lease.InterestAccountId.HasValue && lease.InterestAccountId != Guid.Empty) ? lease.InterestAccountId.Value : GetMappedAccount("Interest Expense");
        var depreciationAcc = GetMappedAccount("Depreciation Expense");
        var cashAcc = (lease.CashAccountId.HasValue && lease.CashAccountId != Guid.Empty) ? lease.CashAccountId.Value : Guid.Empty;

        entry = new JournalEntry
        {
            Date = asOfDate,
            Reference = $"LEASE-{lease.LeaseNumber}-{asOfDate:yyyyMM}",
            Description = $"Monthly lease accrual for {lease.Counterparty} ({lease.PropertyDescription})",
            TransactionType = TransactionType.Lease,
            CompanyId = lease.CompanyId,
            Lines = new List<JournalLine>(),
            Status = JournalStatus.Posted
        };

        // Interest portion (for finance leases)
        if (lease.Type == LeaseType.FinanceLease && currentMonth.InterestExpense > 0)
        {
            entry.Lines.Add(new JournalLine(interestAcc, currentMonth.InterestExpense, 0, "Lease interest accrual", null, null, 1, lease.CompanyId));
        }

        // Depreciation portion
        if (currentMonth.DepreciationExpense > 0)
        {
            entry.Lines.Add(new JournalLine(depreciationAcc, currentMonth.DepreciationExpense, 0, "Lease asset depreciation", null, null, 1, lease.CompanyId));
        }

        // For operating leases, everything hits the same P&L account
        if (lease.Type == LeaseType.OperatingLease)
        {
            // Single line for operating lease rent expense
            var totalExpense = currentMonth.TotalExpense;
            if (totalExpense > 0)
                entry.Lines.Add(new JournalLine(depreciationAcc, totalExpense, 0, "Operating lease expense", null, null, 1, lease.CompanyId));
        }

        // Credit side: Lease Liability (principal reduction) or Cash/Bank for payments
        decimal totalDebit = entry.Lines.Sum(l => l.Debit);
        decimal totalCredit = entry.Lines.Sum(l => l.Credit);
        if (totalDebit > totalCredit)
        {
            var creditAmount = totalDebit - totalCredit;
            // Use cash account if set, otherwise credit the lease liability
            var creditAcc = (cashAcc != Guid.Empty) ? cashAcc : liabilityAcc;
            entry.Lines.Add(new JournalLine(creditAcc, 0, creditAmount, "Lease payment / liability", null, null, 1, lease.CompanyId));
        }

        // Update lease balances
        lease.BalanceSheetLiability = currentMonth.ClosingLiability;
        lease.AccumulatedDepreciation += currentMonth.DepreciationExpense;

        _entries.Add(entry);
        Persist();
        return true;
    }

    private decimal CalculateLeasePresentValue(decimal monthlyRent, decimal escalationRate, int months, LeaseType type)
    {
        if (type == LeaseType.OperatingLease) return monthlyRent * months; // Simplified for operating leases
        
        // For finance leases, calculate discounted present value
        var rate = 0.05m; // Assumed incremental borrowing rate of 5%
        decimal pv = 0;
        for (int m = 1; m <= months; m++)
        {
            var monthlyEscalation = (decimal)Math.Pow((double)(1 + escalationRate / 100), m / 12.0);
            var payment = monthlyRent * monthlyEscalation;
            var discountFactor = (decimal)Math.Pow((double)(1 + rate), -m);
            pv += payment * discountFactor;
        }
        return Math.Round(pv, 2);
    }

    private LeaseScheduleResponse GenerateLeaseSchedule(LeaseAgreement lease, int months)
    {
        var schedule = new LeaseScheduleResponse { LeaseId = lease.Id, PresentValue = lease.PresentValue };
        var openingBalance = lease.BalanceSheetLiability;
        var rate = 0.05m;
        var monthlyRate = rate / 12;

        for (int m = 1; m <= months; m++)
        {
            var date = lease.StartDate.AddMonths(m);
            var escalationFactor = (decimal)Math.Pow((double)(1 + lease.AnnualEscalationRate / 100), m / 12.0);
            var monthlyPayment = lease.MonthlyRent * escalationFactor;

            var interest = Math.Round(openingBalance * monthlyRate, 2);
            var principal = Math.Round(monthlyPayment - interest, 2);
            var closingBalance = Math.Round(openingBalance - principal, 2);

            // Depreciation (straight-line over lease term)
            var depreciation = lease.Type == LeaseType.FinanceLease 
                ? Math.Round(lease.RightOfUseAssetValue / lease.TermMonths, 2)
                : 0;

            schedule.Schedule.Add(new LeaseScheduleItem
            {
                Period = m,
                Date = date,
                OpeningLiability = openingBalance,
                InterestExpense = interest,
                PrincipalPayment = principal,
                ClosingLiability = closingBalance,
                DepreciationExpense = depreciation
            });

            openingBalance = closingBalance;
        }

        schedule.TotalInterest = schedule.Schedule.Sum(s => s.InterestExpense);
        schedule.TotalPayments = schedule.Schedule.Sum(s => s.PrincipalPayment + s.InterestExpense);
        return schedule;
    }

    #endregion

    #region Prepayments, Deferred Revenue & Advance Schedules (IFRS 15 / IAS 1 / GAAP)

    public IReadOnlyList<PrepaymentSchedule> GetPrepaymentSchedules(PrepaymentType? type = null, Guid? companyId = null)
    {
        lock (_lock)
        {
            var query = _prepaymentSchedules.AsEnumerable();
            if (type.HasValue) query = query.Where(s => s.Type == type.Value);
            if (companyId.HasValue && companyId.Value != Guid.Empty) query = query.Where(s => s.CompanyId == null || s.CompanyId == companyId.Value);
            return query.OrderByDescending(s => s.CreatedAt).ToList();
        }
    }

    public PrepaymentSchedule? FindPrepaymentSchedule(Guid id)
    {
        lock (_lock)
        {
            return _prepaymentSchedules.FirstOrDefault(s => s.Id == id);
        }
    }

    public bool CreatePrepaymentSchedule(PrepaymentScheduleRequest req, string actor, out PrepaymentSchedule? schedule, out string? error)
    {
        schedule = null;
        error = null;

        if (string.IsNullOrWhiteSpace(req.Title)) { error = "Title/Description is required."; return false; }
        if (req.TotalAmount <= 0) { error = "Total amount must be greater than zero."; return false; }
        if (req.StartDate >= req.EndDate) { error = "End Date must be after Start Date."; return false; }
        if (req.FrequencyMonths <= 0) { error = "Frequency months must be at least 1."; return false; }

        lock (_lock)
        {
            var bsAccount = _accounts.FirstOrDefault(a => a.Id == req.BalanceSheetAccountId);
            if (bsAccount == null) { error = "Invalid Balance Sheet Account selected."; return false; }

            var plAccount = _accounts.FirstOrDefault(a => a.Id == req.ProfitLossAccountId);
            if (plAccount == null) { error = "Invalid P&L / Clearing Account selected."; return false; }

            var prefix = req.Type switch
            {
                PrepaymentType.VendorPrepaidExpense => "PREPAY-",
                PrepaymentType.CustomerDeferredRevenue => "DEFREV-",
                PrepaymentType.VendorAdvance => "VADV-",
                PrepaymentType.CustomerAdvance => "CADV-",
                _ => "SCHED-"
            };

            var seq = _prepaymentSchedules.Count(s => s.Type == req.Type) + 1;
            var schedNumber = $"{prefix}{seq:D4}";

            schedule = new PrepaymentSchedule
            {
                Id = Guid.NewGuid(),
                ScheduleNumber = schedNumber,
                Title = req.Title.Trim(),
                Type = req.Type,
                Status = PrepaymentStatus.Active,
                CompanyId = req.CompanyId ?? _companies.FirstOrDefault()?.Id,
                CounterpartyId = req.CounterpartyId,
                CounterpartyName = req.CounterpartyName?.Trim() ?? "",
                ReferenceNumber = req.ReferenceNumber?.Trim() ?? "",
                TotalAmount = req.TotalAmount,
                RecognizedAmount = 0m,
                CurrencyCode = !string.IsNullOrWhiteSpace(req.CurrencyCode) ? req.CurrencyCode : "USD",
                StartDate = req.StartDate,
                EndDate = req.EndDate,
                FrequencyMonths = req.FrequencyMonths,
                BalanceSheetAccountId = req.BalanceSheetAccountId,
                ProfitLossAccountId = req.ProfitLossAccountId,
                Notes = req.Notes?.Trim() ?? "",
                CreatedAt = DateTime.UtcNow,
                Lines = []
            };

            // Compute number of periods between start and end date
            var months = ((req.EndDate.Year - req.StartDate.Year) * 12) + (req.EndDate.Month - req.StartDate.Month);
            if (months <= 0) months = 1;
            var periodCount = Math.Max(1, (int)Math.Ceiling((double)months / req.FrequencyMonths));

            var periodicAmount = Math.Round(req.TotalAmount / periodCount, 2);
            decimal allocated = 0m;

            for (int i = 0; i < periodCount; i++)
            {
                var periodDueDate = req.StartDate.AddMonths((i + 1) * req.FrequencyMonths);
                if (periodDueDate > req.EndDate) periodDueDate = req.EndDate;

                decimal amt;
                if (i == periodCount - 1)
                {
                    amt = req.TotalAmount - allocated; // Catch rounding variance in last line
                }
                else
                {
                    amt = periodicAmount;
                    allocated += amt;
                }

                schedule.Lines.Add(new PrepaymentScheduleLine
                {
                    PeriodIndex = i + 1,
                    DueDate = periodDueDate,
                    Amount = amt,
                    Posted = false
                });
            }

            _prepaymentSchedules.Add(schedule);
            _auditLog.Add(new AuditItem(DateTime.UtcNow, "CreatePrepaymentSchedule", $"Created {req.Type} schedule {schedNumber} for {schedule.TotalAmount:N2} {schedule.CurrencyCode}"));
            Persist();
            return true;
        }
    }

    public bool PostAmortizationLine(Guid scheduleId, int periodIndex, string actor, out JournalEntry? entry, out string? error)
    {
        entry = null;
        error = null;

        lock (_lock)
        {
            var schedule = _prepaymentSchedules.FirstOrDefault(s => s.Id == scheduleId);
            if (schedule == null) { error = "Prepayment / Deferred Revenue schedule not found."; return false; }

            var line = schedule.Lines.FirstOrDefault(l => l.PeriodIndex == periodIndex);
            if (line == null) { error = $"Schedule period #{periodIndex} not found."; return false; }
            if (line.Posted) { error = $"Schedule period #{periodIndex} is already posted."; return false; }

            var bsAccount = _accounts.FirstOrDefault(a => a.Id == schedule.BalanceSheetAccountId);
            if (bsAccount == null) { error = "Balance Sheet account not found."; return false; }

            var plAccount = _accounts.FirstOrDefault(a => a.Id == schedule.ProfitLossAccountId);
            if (plAccount == null) { error = "P&L / Clearing account not found."; return false; }

            var company = _companies.FirstOrDefault(c => c.Id == schedule.CompanyId) ?? _companies.FirstOrDefault();
            var postingDate = line.DueDate;

            var entryId = Guid.NewGuid();
            var prefix = schedule.Type switch
            {
                PrepaymentType.VendorPrepaidExpense => "JV-AMORT-",
                PrepaymentType.CustomerDeferredRevenue => "JV-DEFREV-",
                PrepaymentType.VendorAdvance => "JV-VADV-",
                PrepaymentType.CustomerAdvance => "JV-CADV-",
                _ => "JV-PREPAY-"
            };
            var voucherNo = $"{prefix}{DateTime.UtcNow:yyyyMMdd}-{_entries.Count + 1:D4}";

            // Determine Debits and Credits based on Schedule Type
            Guid debitAccId, creditAccId;
            string desc;

            if (schedule.Type == PrepaymentType.VendorPrepaidExpense)
            {
                // Dr. Expense (e.g. Insurance / Rent 6xxxx)
                // Cr. Prepaid Asset (14000)
                debitAccId = plAccount.Id;
                creditAccId = bsAccount.Id;
                desc = $"Amortization: {schedule.Title} (Period {line.PeriodIndex}/{schedule.Lines.Count}) - {schedule.CounterpartyName}";
            }
            else if (schedule.Type == PrepaymentType.CustomerDeferredRevenue)
            {
                // Dr. Deferred Revenue Liability (23000)
                // Cr. Sales / Service Revenue (4xxxx)
                debitAccId = bsAccount.Id;
                creditAccId = plAccount.Id;
                desc = $"Revenue Recognition: {schedule.Title} (Period {line.PeriodIndex}/{schedule.Lines.Count}) - {schedule.CounterpartyName}";
            }
            else if (schedule.Type == PrepaymentType.VendorAdvance)
            {
                // Dr. Accounts Payable (21100)
                // Cr. Advances to Suppliers (14050)
                debitAccId = plAccount.Id;
                creditAccId = bsAccount.Id;
                desc = $"Vendor Advance Offset: {schedule.Title} - {schedule.CounterpartyName}";
            }
            else
            {
                // CustomerAdvance: Dr. Customer Advances (23100) / Cr. Accounts Receivable (12000)
                debitAccId = bsAccount.Id;
                creditAccId = plAccount.Id;
                desc = $"Customer Advance Offset: {schedule.Title} - {schedule.CounterpartyName}";
            }

            var debitLine = new JournalLine(debitAccId, line.Amount, 0m, desc, null, schedule.CurrencyCode, 1m, company?.Id);
            var creditLine = new JournalLine(creditAccId, 0m, line.Amount, desc, null, schedule.CurrencyCode, 1m, company?.Id);

            entry = new JournalEntry
            {
                Id = entryId,
                Date = postingDate,
                Reference = voucherNo,
                Description = desc,
                Lines = [debitLine, creditLine],
                Status = JournalStatus.Posted,
                TransactionType = TransactionType.Prepayment,
                CurrencyCode = schedule.CurrencyCode,
                ExchangeRate = 1m,
                CompanyId = company?.Id,
                CreatedAt = DateTime.UtcNow,
                ApprovedBy = actor,
                SubmittedBy = actor,
                Version = 1
            };

            _entries.Add(entry);
            AddEvent(entry, "Posted", actor, $"Posted amortization line #{line.PeriodIndex} for schedule {schedule.ScheduleNumber}");

            line.Posted = true;
            line.PostedDate = postingDate;
            line.JournalEntryId = entry.Id;
            line.JournalVoucherNumber = entry.Reference;

            schedule.RecognizedAmount += line.Amount;
            if (schedule.Lines.All(l => l.Posted))
            {
                schedule.Status = PrepaymentStatus.Completed;
            }

            _auditLog.Add(new AuditItem(DateTime.UtcNow, "PostAmortizationLine", $"Posted period #{line.PeriodIndex} ({line.Amount:N2} {schedule.CurrencyCode}) on schedule {schedule.ScheduleNumber} -> {entry.Reference}"));
            RecalculateHierarchy();
            Persist();
            return true;
        }
    }

    public bool PostBatchAmortization(DateOnly cutoffDate, PrepaymentType? type, string actor, out int postedCount, out string? error)
    {
        postedCount = 0;
        error = null;

        lock (_lock)
        {
            var schedules = _prepaymentSchedules.Where(s => s.Status == PrepaymentStatus.Active);
            if (type.HasValue) schedules = schedules.Where(s => s.Type == type.Value);

            foreach (var schedule in schedules.ToList())
            {
                var dueLines = schedule.Lines.Where(l => !l.Posted && l.DueDate <= cutoffDate).OrderBy(l => l.PeriodIndex);
                foreach (var line in dueLines)
                {
                    if (PostAmortizationLine(schedule.Id, line.PeriodIndex, actor, out _, out var err))
                    {
                        postedCount++;
                    }
                }
            }

            return true;
        }
    }

    public bool DeletePrepaymentSchedule(Guid scheduleId, out string? error)
    {
        error = null;
        lock (_lock)
        {
            var schedule = _prepaymentSchedules.FirstOrDefault(s => s.Id == scheduleId);
            if (schedule == null) { error = "Schedule not found."; return false; }
            if (schedule.Lines.Any(l => l.Posted))
            {
                error = "Cannot delete schedule with posted journal entries. Cancel the schedule instead.";
                return false;
            }

            _prepaymentSchedules.Remove(schedule);
            Persist();
            return true;
        }
    }

    #endregion

    #endregion
}

public enum PrepaymentType
{
    VendorPrepaidExpense,     // Prepaid Rent, Insurance, Software Subscriptions (Asset 14000 -> Expense 6xxxx)
    CustomerDeferredRevenue,  // Upfront customer subscription, retainer, advance (Liability 23000 -> Revenue 4xxxx)
    VendorAdvance,            // Advance paid to supplier (Asset 14050 -> AP 21100)
    CustomerAdvance           // Deposit received from customer (Liability 23100 -> AR 12000)
}

public enum PrepaymentStatus
{
    Active,
    Completed,
    Cancelled
}

public class PrepaymentScheduleLine
{
    public int PeriodIndex { get; set; }
    public DateOnly DueDate { get; set; }
    public decimal Amount { get; set; }
    public bool Posted { get; set; }
    public DateOnly? PostedDate { get; set; }
    public Guid? JournalEntryId { get; set; }
    public string? JournalVoucherNumber { get; set; }
}

public class PrepaymentSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ScheduleNumber { get; set; } = "";
    public string Title { get; set; } = "";
    public PrepaymentType Type { get; set; }
    public PrepaymentStatus Status { get; set; } = PrepaymentStatus.Active;
    public Guid? CompanyId { get; set; }
    public Guid? CounterpartyId { get; set; } // VendorId or CustomerId
    public string CounterpartyName { get; set; } = "";
    public string ReferenceNumber { get; set; } = "";
    public decimal TotalAmount { get; set; }
    public decimal RecognizedAmount { get; set; }
    public decimal RemainingAmount => TotalAmount - RecognizedAmount;
    public string CurrencyCode { get; set; } = "USD";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int FrequencyMonths { get; set; } = 1; // 1 = Monthly, 3 = Quarterly, 12 = Annual
    public Guid BalanceSheetAccountId { get; set; } // e.g. 14000 Prepaid Expenses or 23000 Deferred Revenue
    public Guid ProfitLossAccountId { get; set; }   // e.g. 62000 Insurance Expense or 40000 Sales Revenue
    public string Notes { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<PrepaymentScheduleLine> Lines { get; set; } = [];
}

public record PrepaymentScheduleRequest(
    string Title,
    PrepaymentType Type,
    Guid? CompanyId,
    Guid? CounterpartyId,
    string CounterpartyName,
    string ReferenceNumber,
    decimal TotalAmount,
    string CurrencyCode,
    DateOnly StartDate,
    DateOnly EndDate,
    int FrequencyMonths,
    Guid BalanceSheetAccountId,
    Guid ProfitLossAccountId,
    string? Notes
);
