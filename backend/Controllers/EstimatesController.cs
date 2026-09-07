using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

[ApiController]
[Route("api/v1/estimates")]
public class EstimatesController : ControllerBase
{
    private readonly AccountingStore _store;
    public EstimatesController(AccountingStore store) => _store = store;

    [HttpGet]
    public IActionResult GetAll([FromQuery] Guid? companyId)
    {
        var estimates = _store.Estimates
            .Where(e => companyId == null || e.CompanyId == companyId)
            .OrderByDescending(e => e.EstimateDate)
            .ThenByDescending(e => e.EstimateNumber)
            .Select(e => new {
                e.Id, e.EstimateNumber, e.CustomerId,
                CustomerName = _store.Customers.FirstOrDefault(c => c.Id == e.CustomerId)?.Name ?? "Unknown",
                e.EstimateDate, e.ExpiryDate,
                Status = (int)e.Status,
                StatusName = e.Status.ToString(),
                e.SubTotal, e.TotalDiscount, e.TotalTax, e.TotalAmount,
                e.Reference, e.ConvertedToInvoiceId
            });
        return Ok(estimates);
    }

    [HttpGet("{id}")]
    public IActionResult GetById(Guid id)
    {
        var e = _store.Estimates.FirstOrDefault(x => x.Id == id);
        if (e == null) return NotFound();
        return Ok(e);
    }

    [HttpPost]
    public IActionResult Create([FromBody] EstimateRequest request)
    {
        if (!_store.CreateEstimate(request, out var estimate, out var error))
            return BadRequest(new { error });
        return Created($"/api/v1/estimates/{estimate!.Id}", estimate);
    }

    [HttpPatch("{id}/status")]
    public IActionResult UpdateStatus(Guid id, [FromBody] System.Text.Json.JsonElement body)
    {
        EstimateStatus status = EstimateStatus.Draft;
        if (body.TryGetProperty("status", out var prop))
        {
            if (prop.ValueKind == System.Text.Json.JsonValueKind.Number && prop.TryGetInt32(out var intVal))
            {
                status = (EstimateStatus)intVal;
            }
            else if (prop.ValueKind == System.Text.Json.JsonValueKind.String)
            {
                var str = prop.GetString();
                if (int.TryParse(str, out var parsedInt))
                    status = (EstimateStatus)parsedInt;
                else if (Enum.TryParse<EstimateStatus>(str, true, out var parsedEnum))
                    status = parsedEnum;
                else if (string.Equals(str, "Finalized", StringComparison.OrdinalIgnoreCase))
                    status = EstimateStatus.Accepted;
                else if (string.Equals(str, "Cancelled", StringComparison.OrdinalIgnoreCase))
                    status = EstimateStatus.Rejected;
            }
        }

        if (!_store.UpdateEstimateStatus(id, status, out var error))
            return BadRequest(new { error });
        return Ok();
    }

    [HttpPost("{id}/convert-to-invoice")]
    public IActionResult ConvertToInvoice(Guid id, [FromBody] ConvertToInvoiceRequest request)
    {
        if (!_store.ConvertEstimateToInvoice(id, request.InvoiceDate, request.DueDate, out var invoice, out var error))
            return BadRequest(new { error });
        return Ok(new { message = "Invoice created successfully.", invoiceId = invoice!.Id });
    }
}

public record ConvertToInvoiceRequest(DateOnly InvoiceDate, DateOnly DueDate);
