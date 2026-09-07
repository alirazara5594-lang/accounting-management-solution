using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

namespace Zenabook.Api.Controllers;

[ApiController]
[Route("api/v1/purchaseorders")]
public class PurchaseOrdersController(AccountingStore store) : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() => Ok(store.PurchaseOrders.OrderByDescending(p => p.Date).ThenByDescending(p => p.PoNumber));

    [HttpGet("{id:guid}")]
    public IActionResult Get(Guid id) => store.FindPurchaseOrder(id) switch
    {
        { } po => Ok(po),
        null => NotFound()
    };

    [HttpPost]
    public IActionResult Create(PurchaseOrderRequest request)
    {
        if (store.CreatePurchaseOrder(request, out var po, out var error))
            return CreatedAtAction(nameof(Get), new { id = po!.Id }, po);
        return BadRequest(new { error });
    }
}
