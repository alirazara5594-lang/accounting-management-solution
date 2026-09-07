using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

namespace Zenabook.Api.Controllers;

[ApiController]
[Route("api/v1/goodsreceipts")]
public class GoodsReceiptsController(AccountingStore store) : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() => Ok(store.GoodsReceiptNotes.OrderByDescending(g => g.DateReceived).ThenByDescending(g => g.GrnNumber));

    [HttpGet("{id:guid}")]
    public IActionResult Get(Guid id) => store.FindGoodsReceiptNote(id) switch
    {
        { } grn => Ok(grn),
        null => NotFound()
    };

    [HttpPost]
    public IActionResult Create(GoodsReceiptNoteRequest request)
    {
        if (store.CreateGoodsReceiptNote(request, out var grn, out var error))
            return CreatedAtAction(nameof(Get), new { id = grn!.Id }, grn);
        return BadRequest(new { error });
    }

    [HttpPost("{id:guid}/process")]
    public IActionResult Process(Guid id)
    {
        if (store.ProcessGoodsReceiptNote(id, out var error))
            return Ok(new { message = "GRN Processed Successfully" });
        return BadRequest(new { error });
    }
}
