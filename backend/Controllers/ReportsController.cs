using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

namespace Zenabook.Api.Controllers;

[ApiController]
[Route("api/v1/reports")]
public class ReportsController(AccountingStore store) : ControllerBase
{
    private static bool IsRevenue(AccountType t) => t is AccountType.Revenue or AccountType.ContraRevenue;
    private static bool IsExpense(AccountType t) => t is AccountType.Expense or AccountType.ContraExpense;
    private static bool IsAsset(AccountType t) => t is AccountType.Asset or AccountType.ContraAsset;
    private static bool IsLiability(AccountType t) => t is AccountType.Liability or AccountType.ContraLiability;
    private static bool IsEquity(AccountType t) => t is AccountType.Equity or AccountType.ContraEquity;

    private static IEnumerable<Account> PostingAccounts(AccountingStore store) =>
        store.Accounts.Where(a => a.IsPosting && a.Status == AccountStatus.Active);

    private static IEnumerable<JournalEntry> PostedEntries(AccountingStore store, Guid? companyId, string? from, string? to)
    {
        var query = store.Entries.Where(e => e.Status == JournalStatus.Posted || e.Status == JournalStatus.Reversed);
        if (companyId.HasValue) query = query.Where(e => e.CompanyId == companyId);
        if (DateOnly.TryParse(from, out var fromDate)) query = query.Where(e => e.Date >= fromDate);
        if (DateOnly.TryParse(to, out var toDate)) query = query.Where(e => e.Date <= toDate);
        return query;
    }

    private static Dictionary<Guid, decimal> AccountBalances(AccountingStore store, Guid? companyId, string? from, string? to)
    {
        var balances = new Dictionary<Guid, decimal>();
        foreach (var account in PostingAccounts(store)) balances[account.Id] = account.OpeningBalance;
        foreach (var line in PostedEntries(store, companyId, from, to).SelectMany(e => e.Lines))
        {
            if (!balances.TryGetValue(line.AccountId, out var current)) continue;
            balances[line.AccountId] = current + line.Debit - line.Credit;
        }
        return balances;
    }

    [HttpGet("trial-balance")]
    public IActionResult TrialBalance([FromQuery] Guid? companyId, [FromQuery] string? from, [FromQuery] string? to)
    {
        var balances = AccountBalances(store, companyId, from, to);
        var rows = PostingAccounts(store).Select(a =>
        {
            var bal = balances.GetValueOrDefault(a.Id);
            var (debit, credit) = a.NormalBalance == NormalBalanceType.Debit
                ? (bal > 0 ? bal : 0m, bal < 0 ? -bal : 0m)
                : (bal > 0 ? bal : 0m, bal < 0 ? -bal : 0m);
            return new { a.Id, a.Code, a.Name, a.Type, Debit = debit, Credit = credit, Balance = bal };
        }).Where(r => r.Balance != 0).OrderBy(r => r.Code).ToList();
        return Ok(new { totalDebit = rows.Sum(r => r.Debit), totalCredit = rows.Sum(r => r.Credit), rows });
    }

    [HttpGet("income-statement")]
    public IActionResult IncomeStatement([FromQuery] Guid? companyId, [FromQuery] string? from, [FromQuery] string? to)
    {
        var balances = AccountBalances(store, companyId, from, to);
        var rows = PostingAccounts(store)
            .Where(a => IsRevenue(a.Type) || IsExpense(a.Type))
            .Select(a => {
                var rawBal = balances.GetValueOrDefault(a.Id);
                var amount = IsRevenue(a.Type) ? -rawBal : rawBal;
                return new { a.Id, a.Code, a.Name, a.Type, Amount = amount };
            })
            .Where(r => r.Amount != 0)
            .OrderBy(r => r.Code).ToList();

        var revenue = rows.Where(r => IsRevenue(r.Type)).Sum(r => r.Amount);
        var expenses = rows.Where(r => IsExpense(r.Type)).Sum(r => r.Amount);
        var netIncome = revenue - expenses;
        return Ok(new { revenue, expenses, netIncome, rows });
    }

    [HttpGet("balance-sheet")]
    public IActionResult BalanceSheet([FromQuery] Guid? companyId, [FromQuery] string? from, [FromQuery] string? to)
    {
        var balances = AccountBalances(store, companyId, from, to);
        var rows = PostingAccounts(store)
            .Where(a => IsAsset(a.Type) || IsLiability(a.Type) || IsEquity(a.Type))
            .Select(a => {
                var rawBal = balances.GetValueOrDefault(a.Id);
                var amount = IsAsset(a.Type) ? rawBal : -rawBal;
                return new { a.Id, a.Code, a.Name, a.Type, Amount = amount };
            })
            .Where(r => r.Amount != 0)
            .OrderBy(r => r.Code).ToList();

        var revenue = PostingAccounts(store)
            .Where(a => IsRevenue(a.Type))
            .Sum(a => -(balances.GetValueOrDefault(a.Id)));
        var expenses = PostingAccounts(store)
            .Where(a => IsExpense(a.Type))
            .Sum(a => balances.GetValueOrDefault(a.Id));
        var retainedEarnings = revenue - expenses;
        if (retainedEarnings != 0)
            rows.Add(new { Id = Guid.Empty, Code = "RE", Name = "Retained Earnings (Net Income)", Type = AccountType.Equity, Amount = retainedEarnings });

        var assets = rows.Where(r => IsAsset(r.Type)).Sum(r => r.Amount);
        var liabilities = rows.Where(r => IsLiability(r.Type)).Sum(r => r.Amount);
        var equity = rows.Where(r => IsEquity(r.Type)).Sum(r => r.Amount);
        return Ok(new { assets, liabilities, equity, total = assets, rows });
    }

    [HttpGet("cash-flow")]
    public IActionResult CashFlow([FromQuery] Guid? companyId, [FromQuery] string? from, [FromQuery] string? to)
    {
        var allAccounts = store.Accounts.ToDictionary(a => a.Id);
        var cashAccountIds = store.Accounts
            .Where(a => a.Code.StartsWith("111") || a.Code.StartsWith("112") || a.Name.Contains("Cash", StringComparison.OrdinalIgnoreCase) || a.Name.Contains("Bank", StringComparison.OrdinalIgnoreCase))
            .Select(a => a.Id)
            .ToHashSet();

        // Calculate opening cash balance (before 'from' date)
        decimal openingCash = 0m;
        foreach (var id in cashAccountIds)
        {
            if (allAccounts.TryGetValue(id, out var acc))
                openingCash += acc.OpeningBalance;
        }

        if (DateOnly.TryParse(from, out var fromDate))
        {
            var priorEntries = store.Entries
                .Where(e => e.Status == JournalStatus.Posted && (companyId == null || e.CompanyId == companyId) && e.Date < fromDate);
            foreach (var line in priorEntries.SelectMany(e => e.Lines))
            {
                if (cashAccountIds.Contains(line.AccountId))
                    openingCash += (line.Debit - line.Credit);
            }
        }

        // Process period posted entries
        var periodEntries = PostedEntries(store, companyId, from, to).ToList();

        decimal customerCollections = 0m;
        decimal supplierPayments = 0m;
        decimal payrollPayments = 0m;
        decimal taxPayments = 0m;
        decimal opexPayments = 0m;
        decimal otherOperatingInflow = 0m;

        decimal capexPurchases = 0m;
        decimal assetDisposalProceeds = 0m;
        decimal investmentInflows = 0m;
        decimal investmentOutflows = 0m;

        decimal equityInjections = 0m;
        decimal dividendDrawings = 0m;
        decimal loanProceeds = 0m;
        decimal loanRepayments = 0m;

        var operatingItems = new List<object>();
        var investingItems = new List<object>();
        var financingItems = new List<object>();

        foreach (var entry in periodEntries)
        {
            var cashLines = entry.Lines.Where(l => cashAccountIds.Contains(l.AccountId)).ToList();
            if (cashLines.Count == 0) continue;

            var netCashImpact = cashLines.Sum(l => l.Debit - l.Credit);
            var otherLines = entry.Lines.Where(l => !cashAccountIds.Contains(l.AccountId)).ToList();

            foreach (var other in otherLines)
            {
                if (!allAccounts.TryGetValue(other.AccountId, out var otherAcc)) continue;
                var amount = other.Credit - other.Debit; // Positive if cash received, negative if cash paid

                if (otherAcc.Code.StartsWith("12") || IsRevenue(otherAcc.Type))
                {
                    if (amount >= 0) customerCollections += amount;
                    else customerCollections += amount;
                }
                else if (otherAcc.Code.StartsWith("21") || otherAcc.Code.StartsWith("5"))
                {
                    supplierPayments += (other.Debit - other.Credit);
                }
                else if (otherAcc.Code.StartsWith("611") || otherAcc.Name.Contains("Salaries", StringComparison.OrdinalIgnoreCase) || otherAcc.Name.Contains("Payroll", StringComparison.OrdinalIgnoreCase))
                {
                    payrollPayments += (other.Debit - other.Credit);
                }
                else if (otherAcc.Code.StartsWith("213") || otherAcc.Code.StartsWith("617") || otherAcc.Name.Contains("Tax", StringComparison.OrdinalIgnoreCase))
                {
                    taxPayments += (other.Debit - other.Credit);
                }
                else if (IsExpense(otherAcc.Type) || otherAcc.Code.StartsWith("6"))
                {
                    opexPayments += (other.Debit - other.Credit);
                }
                else if (otherAcc.Code.StartsWith("15") || otherAcc.Name.Contains("Equipment", StringComparison.OrdinalIgnoreCase) || otherAcc.Name.Contains("Vehicle", StringComparison.OrdinalIgnoreCase) || otherAcc.Name.Contains("Asset", StringComparison.OrdinalIgnoreCase))
                {
                    if (other.Debit > other.Credit) capexPurchases += (other.Debit - other.Credit);
                    else assetDisposalProceeds += (other.Credit - other.Debit);
                }
                else if (otherAcc.Code.StartsWith("16") || otherAcc.Name.Contains("Investment", StringComparison.OrdinalIgnoreCase))
                {
                    if (other.Debit > other.Credit) investmentOutflows += (other.Debit - other.Credit);
                    else investmentInflows += (other.Credit - other.Debit);
                }
                else if (otherAcc.Code.StartsWith("31") || otherAcc.Type == AccountType.Equity)
                {
                    if (other.Credit > other.Debit) equityInjections += (other.Credit - other.Debit);
                    else dividendDrawings += (other.Debit - other.Credit);
                }
                else if (otherAcc.Code.StartsWith("25") || otherAcc.Code.StartsWith("26") || otherAcc.Name.Contains("Loan", StringComparison.OrdinalIgnoreCase))
                {
                    if (other.Credit > other.Debit) loanProceeds += (other.Credit - other.Debit);
                    else loanRepayments += (other.Debit - other.Credit);
                }
                else
                {
                    if (netCashImpact > 0) otherOperatingInflow += netCashImpact;
                    else opexPayments += -netCashImpact;
                }
            }
        }

        // Construct Operating Activities breakdown
        if (customerCollections != 0) operatingItems.Add(new { title = "Cash Receipts from Customers & Sales Invoices", amount = customerCollections, type = "inflow", category = "Operating Inflow" });
        if (supplierPayments != 0) operatingItems.Add(new { title = "Cash Paid to Vendors, Suppliers & Direct Costs", amount = -supplierPayments, type = "outflow", category = "Operating Outflow" });
        if (payrollPayments != 0) operatingItems.Add(new { title = "Cash Paid for Employee Salaries & Benefits", amount = -payrollPayments, type = "outflow", category = "Operating Outflow" });
        if (taxPayments != 0) operatingItems.Add(new { title = "Tax Payments (Income, Sales Tax & Withholdings)", amount = -taxPayments, type = "outflow", category = "Operating Outflow" });
        if (opexPayments != 0) operatingItems.Add(new { title = "Cash Paid for Administrative & Operating Expenses", amount = -opexPayments, type = "outflow", category = "Operating Outflow" });
        if (otherOperatingInflow != 0) operatingItems.Add(new { title = "Other Operating Receipts & Income", amount = otherOperatingInflow, type = "inflow", category = "Operating Inflow" });

        var netOperating = customerCollections - supplierPayments - payrollPayments - taxPayments - opexPayments + otherOperatingInflow;

        // Construct Investing Activities breakdown
        if (capexPurchases != 0) investingItems.Add(new { title = "Purchase of Property, Plant & Equipment (CapEx)", amount = -capexPurchases, type = "outflow", category = "Investing Outflow" });
        if (assetDisposalProceeds != 0) investingItems.Add(new { title = "Proceeds from Sale of Fixed Assets", amount = assetDisposalProceeds, type = "inflow", category = "Investing Inflow" });
        if (investmentInflows != 0) investingItems.Add(new { title = "Proceeds from Sale of Investments", amount = investmentInflows, type = "inflow", category = "Investing Inflow" });
        if (investmentOutflows != 0) investingItems.Add(new { title = "Purchase of Financial Investments", amount = -investmentOutflows, type = "outflow", category = "Investing Outflow" });
        var netInvesting = assetDisposalProceeds + investmentInflows - capexPurchases - investmentOutflows;

        // Construct Financing Activities breakdown
        if (equityInjections != 0) financingItems.Add(new { title = "Capital Contributions & Equity Injections", amount = equityInjections, type = "inflow", category = "Financing Inflow" });
        if (dividendDrawings != 0) financingItems.Add(new { title = "Owner Drawings & Dividend Distributions", amount = -dividendDrawings, type = "outflow", category = "Financing Outflow" });
        if (loanProceeds != 0) financingItems.Add(new { title = "Proceeds from Bank Borrowings & Notes Payable", amount = loanProceeds, type = "inflow", category = "Financing Inflow" });
        if (loanRepayments != 0) financingItems.Add(new { title = "Repayment of Bank Loans & Long-term Debt", amount = -loanRepayments, type = "outflow", category = "Financing Outflow" });
        var netFinancing = equityInjections - dividendDrawings + loanProceeds - loanRepayments;

        var netCashFlow = netOperating + netInvesting + netFinancing;
        var closingCash = openingCash + netCashFlow;

        // Income Statement numbers for Indirect Method
        // Income Statement numbers & Working Capital for Indirect Method (IAS 7)
        var balances = AccountBalances(store, companyId, from, to);
        var rows = PostingAccounts(store)
            .Where(a => IsRevenue(a.Type) || IsExpense(a.Type))
            .Select(a => {
                var rawBal = balances.GetValueOrDefault(a.Id);
                var amount = IsRevenue(a.Type) ? -rawBal : rawBal;
                return new { a.Id, a.Code, a.Name, a.Type, Amount = amount };
            })
            .Where(r => r.Amount != 0).ToList();
        var revenue = rows.Where(r => IsRevenue(r.Type)).Sum(r => r.Amount);
        var expenses = rows.Where(r => IsExpense(r.Type)).Sum(r => r.Amount);
        var netIncome = revenue - expenses;

        // Working Capital Changes
        var arAccounts = PostingAccounts(store).Where(a => IsAsset(a.Type) && (a.Code.StartsWith("12") || a.Name.Contains("Receivable", StringComparison.OrdinalIgnoreCase)));
        var arChange = arAccounts.Sum(a => balances.GetValueOrDefault(a.Id) - a.OpeningBalance);

        var invAccounts = PostingAccounts(store).Where(a => IsAsset(a.Type) && (a.Code.StartsWith("13") || a.Name.Contains("Inventory", StringComparison.OrdinalIgnoreCase)));
        var invChange = invAccounts.Sum(a => balances.GetValueOrDefault(a.Id) - a.OpeningBalance);

        var apAccounts = PostingAccounts(store).Where(a => IsLiability(a.Type) && (a.Code.StartsWith("211") || a.Code.StartsWith("212") || (a.Name.Contains("Payable", StringComparison.OrdinalIgnoreCase) && !a.Code.StartsWith("22") && !a.Name.Contains("Tax", StringComparison.OrdinalIgnoreCase))));
        var apChange = apAccounts.Sum(a => -(balances.GetValueOrDefault(a.Id) - a.OpeningBalance));

        var taxPayableAccounts = PostingAccounts(store).Where(a => IsLiability(a.Type) && (a.Code.StartsWith("22") || a.Code.StartsWith("213") || a.Code.StartsWith("214")));
        var taxPayableChange = taxPayableAccounts.Sum(a => -(balances.GetValueOrDefault(a.Id) - a.OpeningBalance));

        var deprAccounts = PostingAccounts(store).Where(a => IsExpense(a.Type) && (a.Code.StartsWith("613") || a.Name.Contains("Depreciation", StringComparison.OrdinalIgnoreCase)));
        var deprAddback = deprAccounts.Sum(a => balances.GetValueOrDefault(a.Id) - a.OpeningBalance);

        var indirectOperatingCashFlow = netIncome + deprAddback - arChange - invChange + apChange + taxPayableChange;

        var bankAccounts = store.GetCashBankAccounts(bankOnly: true, companyId);
        var cashAccounts = store.GetCashBankAccounts(bankOnly: false, companyId);

        return Ok(new
        {
            summary = new
            {
                operatingCashFlow = netOperating,
                investingCashFlow = netInvesting,
                financingCashFlow = netFinancing,
                netCashFlow,
                openingCash,
                closingCash,
                netIncome,
                totalBankAccounts = bankAccounts.Count,
                totalCashRegisters = cashAccounts.Count
            },
            directMethod = new
            {
                operatingActivities = operatingItems,
                netOperating,
                investingActivities = investingItems,
                netInvesting,
                financingActivities = financingItems,
                netFinancing,
                netCashFlow,
                openingCash,
                closingCash
            },
            indirectMethod = new
            {
                netIncome,
                depreciationAddback = deprAddback,
                workingCapitalChanges = new
                {
                    accountsReceivableChange = -arChange,
                    inventoryChange = -invChange,
                    accountsPayableChange = apChange,
                    taxPayableChange = taxPayableChange
                },
                netOperating = indirectOperatingCashFlow,
                netInvesting,
                netFinancing,
                netCashFlow = indirectOperatingCashFlow + netInvesting + netFinancing,
                openingCash,
                closingCash = openingCash + (indirectOperatingCashFlow + netInvesting + netFinancing)
            }
        });
    }

    [HttpGet("general-ledger")]
    public IActionResult GeneralLedger([FromQuery] Guid? companyId, [FromQuery] string? from, [FromQuery] string? to, [FromQuery] Guid? accountId)
    {
        var accounts = PostingAccounts(store).ToDictionary(a => a.Id);
        var lines = PostedEntries(store, companyId, from, to)
            .SelectMany(e => e.Lines.Select(l => new
            {
                e.Id,
                e.Date,
                e.Reference,
                e.Description,
                e.Status,
                e.TransactionType,
                AccountId = l.AccountId,
                AccountCode = accounts.TryGetValue(l.AccountId, out var a) ? a.Code : "",
                AccountName = accounts.TryGetValue(l.AccountId, out var a2) ? a2.Name : "",
                l.Debit,
                l.Credit,
                l.Memo
            }))
            .Where(l => !accountId.HasValue || l.AccountId == accountId)
            .OrderBy(l => l.Date)
            .ToList();
        return Ok(lines);
    }

    [HttpGet("ar-ledger")]
    public IActionResult ArLedger([FromQuery] Guid? companyId, [FromQuery] Guid? customerId)
    {
        var arId = store.GetMappedAccount("Customer Receivables");
        var invoices = store.SalesInvoices
            .Where(i => companyId == null || i.CompanyId == companyId)
            .Where(i => customerId == null || i.CustomerId == customerId.Value)
            .Where(i => i.Status != SalesInvoiceStatus.Draft && i.Status != SalesInvoiceStatus.Void)
            .Select(i => new
            {
                i.Id,
                i.InvoiceNumber,
                i.CustomerId,
                CustomerName = store.Customers.FirstOrDefault(c => c.Id == i.CustomerId)?.Name ?? "Unknown",
                Date = i.InvoiceDate.ToString("yyyy-MM-dd"),
                DueDate = i.DueDate.ToString("yyyy-MM-dd"),
                i.TotalAmount,
                i.AmountPaid,
                i.AmountDue,
                Status = i.Status.ToString(),
                Currency = "USD"
            })
            .OrderBy(i => i.DueDate).ToList();

        var current = invoices.Where(i => i.AmountDue > 0 && (DateTime.Parse(i.DueDate) - DateTime.Today).Days >= 0).Sum(i => i.AmountDue);
        var pastDue = invoices.Where(i => i.AmountDue > 0 && (DateTime.Parse(i.DueDate) - DateTime.Today).Days < 0).Sum(i => i.AmountDue);
        return Ok(new { arAccountId = arId, current, pastDue, totalDue = current + pastDue, invoices });
    }

    [HttpGet("ap-ledger")]
    public IActionResult ApLedger([FromQuery] Guid? companyId, [FromQuery] Guid? vendorId)
    {
        var apId = store.GetMappedAccount("Vendor Payables");
        var bills = store.VendorBills
            .Where(b => companyId == null || b.CompanyId == companyId)
            .Where(b => vendorId == null || b.VendorId == vendorId.Value)
            .Where(b => b.Status != VendorBillStatus.Draft && b.Status != VendorBillStatus.Void)
            .Select(b => new
            {
                b.Id,
                b.BillNumber,
                b.VendorId,
                VendorName = store.Vendors.FirstOrDefault(v => v.Id == b.VendorId)?.Name ?? "Unknown",
                Date = b.Date.ToString("yyyy-MM-dd"),
                DueDate = b.DueDate.ToString("yyyy-MM-dd"),
                b.TotalAmount,
                b.AmountPaid,
                b.AmountDue,
                Status = b.Status.ToString(),
                b.CurrencyCode
            })
            .OrderBy(b => b.DueDate).ToList();

        var current = bills.Where(b => b.AmountDue > 0 && (DateTime.Parse(b.DueDate) - DateTime.Today).Days >= 0).Sum(b => b.AmountDue);
        var pastDue = bills.Where(b => b.AmountDue > 0 && (DateTime.Parse(b.DueDate) - DateTime.Today).Days < 0).Sum(b => b.AmountDue);
        return Ok(new { apAccountId = apId, current, pastDue, totalDue = current + pastDue, bills });
    }

    [HttpGet("purchase-reports")]
    public IActionResult PurchaseReports([FromQuery] Guid? companyId, [FromQuery] string? from, [FromQuery] string? to)
    {
        bool InRange(DateOnly date)
        {
            if (DateOnly.TryParse(from, out var fromDate) && date < fromDate) return false;
            if (DateOnly.TryParse(to, out var toDate) && date > toDate) return false;
            return true;
        }

        var bills = store.VendorBills
            .Where(b => companyId == null || b.CompanyId == companyId)
            .Where(b => b.Status != VendorBillStatus.Void)
            .Where(b => InRange(b.Date))
            .ToList();
        var purchaseOrders = store.PurchaseOrders
            .Where(p => companyId == null || p.CompanyId == companyId)
            .Where(p => p.Status != PurchaseOrderStatus.Canceled)
            .Where(p => InRange(p.Date))
            .ToList();
        var payments = store.VendorPayments
            .Where(p => companyId == null || p.CompanyId == companyId)
            .Where(p => p.Status != VendorPaymentStatus.Void)
            .Where(p => InRange(p.PaymentDate))
            .ToList();

        var vendors = store.Vendors.ToDictionary(v => v.Id, v => v.Name);
        var vendorSpend = bills
            .GroupBy(b => b.VendorId)
            .Select(g => new
            {
                VendorId = g.Key,
                VendorName = vendors.GetValueOrDefault(g.Key, "Unknown"),
                BillCount = g.Count(),
                TotalBilled = g.Sum(b => b.TotalAmount),
                AmountPaid = g.Sum(b => b.AmountPaid),
                AmountDue = g.Sum(b => b.AmountDue)
            })
            .OrderByDescending(v => v.TotalBilled)
            .ToList();

        return Ok(new
        {
            totalPurchaseOrders = purchaseOrders.Count,
            purchaseOrderValue = purchaseOrders.Sum(p => p.Lines.Sum(l => l.TotalAmount)),
            totalBills = bills.Count,
            totalBilled = bills.Sum(b => b.TotalAmount),
            amountPaid = bills.Sum(b => b.AmountPaid),
            amountDue = bills.Sum(b => b.AmountDue),
            vendorPayments = payments.Sum(p => p.Amount),
            openBills = bills.Count(b => b.Status == VendorBillStatus.Open || b.Status == VendorBillStatus.PartiallyPaid),
            vendorSpend,
            recentBills = bills
                .OrderByDescending(b => b.Date)
                .Take(25)
                .Select(b => new
                {
                    b.Id,
                    b.BillNumber,
                    VendorName = vendors.GetValueOrDefault(b.VendorId, "Unknown"),
                    Date = b.Date.ToString("yyyy-MM-dd"),
                    DueDate = b.DueDate.ToString("yyyy-MM-dd"),
                    b.TotalAmount,
                    b.AmountPaid,
                    b.AmountDue,
                    Status = b.Status.ToString(),
                    b.CurrencyCode
                })
        });
    }
}
