using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

namespace Zenabook.Api.Controllers;

[ApiController]
[Route("api/v1/vendor-payments")]
public class VendorPaymentsController(AccountingStore store) : ControllerBase
{
    [HttpGet]
    public IActionResult GetPayments([FromQuery] Guid? companyId)
    {
        var query = store.VendorPayments
            .Where(p => companyId == null || p.CompanyId == companyId)
            .OrderByDescending(p => p.PaymentDate)
            .ThenByDescending(p => p.PaymentNumber)
            .Select(p => new
            {
                p.Id,
                p.PaymentNumber,
                p.VendorId,
                VendorName = store.Vendors.FirstOrDefault(v => v.Id == p.VendorId)?.Name ?? "Unknown",
                Date = p.PaymentDate.ToString("yyyy-MM-dd"),
                p.Amount,
                PaymentMethod = p.PaymentMethod.ToString(),
                p.BankAccountName,
                p.WithdrawFromAccountId,
                WithdrawFromAccountName = p.WithdrawFromAccountId.HasValue
                    ? store.Accounts.FirstOrDefault(a => a.Id == p.WithdrawFromAccountId.Value)?.Name
                    : null,
                p.BillId,
                BillNumber = p.BillId.HasValue
                    ? store.VendorBills.FirstOrDefault(b => b.Id == p.BillId.Value)?.BillNumber
                    : null,
                p.Reference,
                p.Memo,
                Status = p.Status.ToString(),
                p.JournalEntryId,
                p.CreatedAt
            });
        return Ok(query);
    }

    /// <summary>
    /// Returns Asset accounts that are Cash &amp; Bank type — the valid "Withdraw From" targets.
    /// </summary>
    [HttpGet("withdraw-accounts")]
    public IActionResult GetWithdrawAccounts()
    {
        var cashParent = store.Accounts.FirstOrDefault(a => a.Code == "11100");
        var bankParent = store.Accounts.FirstOrDefault(a => a.Code == "11200");
        var cashParentId = cashParent?.Id;
        var bankParentId = bankParent?.Id;

        var accounts = store.Accounts
            .Where(a => a.Status == AccountStatus.Active && a.Type == AccountType.Asset &&
                (a.ParentId == cashParentId || a.ParentId == bankParentId ||
                 a.Name.Contains("Cash", StringComparison.OrdinalIgnoreCase) ||
                 a.Name.Contains("Bank", StringComparison.OrdinalIgnoreCase)))
            .OrderBy(a => a.Code)
            .Select(a => new { a.Id, a.Code, a.Name });

        return Ok(accounts);
    }

    /// <summary>
    /// Returns open bills (with amount due) for a vendor to pay against.
    /// </summary>
    [HttpGet("bills")]
    public IActionResult GetBills([FromQuery] Guid? vendorId)
    {
        var bills = store.VendorBills
            .Where(b => b.Status == VendorBillStatus.Open || b.Status == VendorBillStatus.PartiallyPaid)
            .Where(b => vendorId == null || b.VendorId == vendorId.Value)
            .OrderByDescending(b => b.Date)
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
            });
        return Ok(bills);
    }

    [HttpPost]
    public IActionResult CreatePayment([FromBody] VendorPaymentRequest request)
    {
        if (!store.CreateVendorPayment(request, out var payment, out var error))
            return BadRequest(new { Error = error });
        return Created($"/api/v1/vendor-payments/{payment!.Id}", payment);
    }

    [HttpPost("{id}/void")]
    public IActionResult VoidPayment(Guid id)
    {
        if (store.VoidVendorPayment(id, out var error))
            return Ok(new { message = "Vendor payment voided and ledger reversal posted." });
        return BadRequest(new { Error = error });
    }
}