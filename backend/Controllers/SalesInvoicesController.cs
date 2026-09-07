using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

[ApiController]
[Route("api/v1/sales-invoices")]
public class SalesInvoicesController : ControllerBase
{
    private readonly AccountingStore _store;
    public SalesInvoicesController(AccountingStore store) => _store = store;

    [HttpGet]
    public IActionResult GetAll([FromQuery] Guid? companyId)
    {
        var invoices = _store.SalesInvoices
            .Where(i => companyId == null || i.CompanyId == null || i.CompanyId == companyId)
            .OrderByDescending(i => i.InvoiceDate)
            .ThenByDescending(i => i.InvoiceNumber)
            .Select(i => new {
                i.Id, i.InvoiceNumber, i.CustomerId,
                CustomerName = _store.Customers.FirstOrDefault(c => c.Id == i.CustomerId)?.Name ?? "Unknown",
                i.InvoiceDate, i.DueDate, i.Status, i.SubTotal, i.DiscountTotal, i.TaxTotal, i.TotalAmount, i.AmountDue, i.Reference, i.Lines
            });
        return Ok(invoices);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var invoice = _store.SalesInvoices.FirstOrDefault(i => i.Id == id);
        if (invoice == null) return NotFound();
        return Ok(invoice);
    }

    [HttpPost]
    public IActionResult Create([FromBody] SalesInvoiceRequest request)
    {
        if (!_store.CreateSalesInvoice(request, out var invoice, out var error))
            return BadRequest(new { error });
        return Created($"/api/v1/sales-invoices/{invoice!.Id}", invoice);
    }

    [HttpPut("{id:guid}")]
    public IActionResult Update(Guid id, [FromBody] SalesInvoiceRequest request)
    {
        if (!_store.UpdateSalesInvoice(id, request, out var invoice, out var error))
            return BadRequest(new { error });
        return Ok(invoice);
    }

    [HttpPost("{id}/post")]
    public IActionResult Post(Guid id, [FromBody] PostInvoiceRequest request)
    {
        if (!_store.PostSalesInvoice(id, request.ArAccountId, request.RevenueAccountId, request.TaxLiabilityAccountId, out var error))
            return BadRequest(new { error });
        return Ok(new { message = "Invoice posted. Journal entry and stock movements created." });
    }

    [HttpPatch("{id}/status")]
    public IActionResult UpdateStatus(Guid id, [FromBody] SalesInvoiceStatusRequest request)
    {
        if (!_store.UpdateSalesInvoiceStatus(id, request.Status, out var error))
            return BadRequest(new { error });
        return Ok();
    }
}

public record PostInvoiceRequest(Guid? ArAccountId, Guid? RevenueAccountId, Guid? TaxLiabilityAccountId);
