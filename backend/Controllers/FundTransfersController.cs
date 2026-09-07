using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

namespace Zenabook.Api.Controllers;

[ApiController]
[Route("api/v1/fund-transfers")]
public class FundTransfersController(AccountingStore store) : ControllerBase
{
    [HttpGet]
    public IActionResult GetTransfers([FromQuery] Guid? companyId)
    {
        var query = store.FundTransfers
            .Where(t => companyId == null || t.CompanyId == companyId)
            .OrderByDescending(t => t.TransferDate)
            .ThenByDescending(t => t.TransferNumber)
            .Select(t => new
            {
                t.Id,
                t.TransferNumber,
                Date = t.TransferDate.ToString("yyyy-MM-dd"),
                t.FromAccountId,
                FromAccountName = store.Accounts.FirstOrDefault(a => a.Id == t.FromAccountId)?.Name,
                FromAccountCode = store.Accounts.FirstOrDefault(a => a.Id == t.FromAccountId)?.Code,
                t.ToAccountId,
                ToAccountName = store.Accounts.FirstOrDefault(a => a.Id == t.ToAccountId)?.Name,
                ToAccountCode = store.Accounts.FirstOrDefault(a => a.Id == t.ToAccountId)?.Code,
                t.Amount,
                t.Reference,
                t.Memo,
                Status = t.Status.ToString(),
                t.JournalEntryId,
                t.CreatedAt
            });
        return Ok(query);
    }

    /// <summary>
    /// Returns Cash &amp; Bank Asset accounts eligible as transfer source/target.
    /// </summary>
    [HttpGet("accounts")]
    public IActionResult GetTransferAccounts()
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

    [HttpPost]
    public IActionResult CreateTransfer([FromBody] FundTransferRequest request)
    {
        if (!store.CreateFundTransfer(request, out var transfer, out var error))
            return BadRequest(new { Error = error });
        return Created($"/api/v1/fund-transfers/{transfer!.Id}", transfer);
    }

    [HttpPost("{id}/void")]
    public IActionResult VoidTransfer(Guid id)
    {
        if (store.VoidFundTransfer(id, out var error))
            return Ok(new { message = "Fund transfer voided and ledger reversal posted." });
        return BadRequest(new { Error = error });
    }
}