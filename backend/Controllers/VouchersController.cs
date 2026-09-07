using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

namespace Zenabook.Api.Controllers;

[ApiController]
[Route("api/v1/vouchers")]
public class VouchersController(AccountingStore store) : ControllerBase
{
    [HttpGet]
    public IActionResult GetVouchers([FromQuery] Guid? companyId)
    {
        var query = store.Vouchers
            .Where(v => companyId == null || v.CompanyId == companyId)
            .OrderByDescending(v => v.Date)
            .ThenByDescending(v => v.CreatedAt)
            .Select(v => new
            {
                v.Id,
                v.VoucherNumber,
                VoucherType = v.Type.ToString(),
                Date = v.Date.ToString("yyyy-MM-dd"),
                v.AccountId,
                v.AccountName,
                v.PartyType,
                v.PartyName,
                v.PaymentMode,
                v.ChequeNumber,
                v.Amount,
                v.Currency,
                v.Narration,
                v.Status,
                v.JournalEntryId,
                v.CompanyId,
                v.CreatedAt
            });
        return Ok(query);
    }

    [HttpPost]
    public IActionResult CreateVoucher([FromBody] VoucherRequest request)
    {
        if (!store.CreateVoucher(request, out var voucher, out var error))
            return BadRequest(new { Error = error });
        return Created($"/api/v1/vouchers/{voucher!.Id}", voucher);
    }

    [HttpPost("{id}/void")]
    public IActionResult VoidVoucher(Guid id)
    {
        if (store.VoidVoucher(id, out var error))
            return Ok(new { message = "Voucher voided and ledger reversal posted." });
        return BadRequest(new { Error = error });
    }
}
