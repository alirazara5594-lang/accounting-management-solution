using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

[ApiController]
[Route("api/v1/customer-payments")]
public class CustomerPaymentsController : ControllerBase
{
    private readonly AccountingStore _store;
    public CustomerPaymentsController(AccountingStore store) => _store = store;

    [HttpGet]
    public IActionResult GetAll([FromQuery] Guid? companyId)
    {
        var payments = _store.CustomerPayments
            .Where(p => companyId == null || p.CompanyId == companyId)
            .OrderByDescending(p => p.PaymentDate)
            .ThenByDescending(p => p.ReceiptNumber)
            .Select(p => new {
                p.Id,
                p.ReceiptNumber,
                p.CustomerId,
                CustomerName = _store.Customers.FirstOrDefault(c => c.Id == p.CustomerId)?.Name ?? "Unknown",
                Date = p.PaymentDate.ToString("yyyy-MM-dd"),
                p.Amount,
                PaymentMethod = p.PaymentMethod.ToString(),
                p.BankAccountName,
                p.DepositToAccountId,
                DepositToAccountName = p.DepositToAccountId.HasValue
                    ? _store.Accounts.FirstOrDefault(a => a.Id == p.DepositToAccountId.Value)?.Name
                    : null,
                p.InvoiceId,
                InvoiceNumber = p.InvoiceId.HasValue
                    ? _store.SalesInvoices.FirstOrDefault(i => i.Id == p.InvoiceId.Value)?.InvoiceNumber
                    : null,
                p.Reference,
                p.Memo,
                Status = p.Status.ToString(),
                p.CreatedAt
            });
        return Ok(payments);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var payment = _store.CustomerPayments.FirstOrDefault(p => p.Id == id);
        if (payment == null) return NotFound();
        return Ok(payment);
    }

    /// <summary>
    /// Returns Asset accounts that are Cash & Bank type (children of 11100 or accounts
    /// with "Cash", "Bank", "Petty Cash" in name) — these are the valid "Deposit To" targets.
    /// </summary>
    [HttpGet("deposit-accounts")]
    public IActionResult GetDepositAccounts()
    {
        // Find the Cash parent (11100) and Bank parent (11200)
        var cashParent = _store.Accounts.FirstOrDefault(a => a.Code == "11100");
        var bankParent = _store.Accounts.FirstOrDefault(a => a.Code == "11200");
        var cashParentId = cashParent?.Id;
        var bankParentId = bankParent?.Id;

        var accounts = _store.Accounts
            .Where(a => a.Status == AccountStatus.Active && a.Type == AccountType.Asset &&
                (a.ParentId == cashParentId ||
                 a.ParentId == bankParentId ||
                 a.Name.Contains("Cash", StringComparison.OrdinalIgnoreCase) ||
                 a.Name.Contains("Bank", StringComparison.OrdinalIgnoreCase) ||
                 a.Name.Contains("Petty", StringComparison.OrdinalIgnoreCase)))
            .OrderBy(a => a.Code)
            .Select(a => new { a.Id, a.Code, a.Name });

        return Ok(accounts);
    }

    [HttpPost]
    public IActionResult Create([FromBody] CustomerPaymentRequest request)
    {
        if (!_store.CreateCustomerPayment(request, out var payment, out var error))
            return BadRequest(new { error });
        return Created($"/api/v1/customer-payments/{payment!.Id}", payment);
    }

    [HttpPost("{id}/void")]
    public IActionResult VoidPayment(Guid id)
    {
        if (_store.VoidCustomerPayment(id, out var error))
            return Ok(new { message = "Customer payment voided and ledger reversal posted." });
        return BadRequest(new { error });
    }
}
