using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

namespace Zenabook.Api.Controllers;

[ApiController]
[Route("api/v1/products")]
public class ProductsController(AccountingStore store) : ControllerBase
{
    [HttpGet]
    public IActionResult Get([FromQuery] string? search, [FromQuery] ProductStatus? status, [FromQuery] ProductType? type, [FromQuery] ProductPurpose? purpose)
    {
        var result = store.Products.Where(p =>
            (status is null || p.Status == status) &&
            (type is null || p.Type == type) &&
            (purpose is null || p.Purpose == purpose) &&
            (string.IsNullOrWhiteSpace(search) ||
             p.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
             p.Code.Contains(search, StringComparison.OrdinalIgnoreCase) ||
             (p.Category != null && p.Category.Contains(search, StringComparison.OrdinalIgnoreCase)))
        ).OrderBy(p => p.Code);

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public IActionResult GetOne(Guid id) => store.FindProduct(id) is { } p ? Ok(p) : NotFound();

    [HttpGet("next-code")]
    public IActionResult NextCode() => Ok(new { code = store.NextProductCode() });

    [HttpPost]
    public IActionResult Create(ProductRequest request)
    {
        if (store.CreateProduct(request, out var product, out var error))
        {
            return CreatedAtAction(nameof(GetOne), new { id = product!.Id }, product);
        }
        return BadRequest(new { message = error });
    }

    [HttpPut("{id:guid}")]
    public IActionResult Update(Guid id, ProductRequest request)
    {
        if (store.UpdateProduct(id, request, out var product, out var error))
        {
            return Ok(product);
        }
        return BadRequest(new { message = error });
    }

    [HttpPatch("{id:guid}/status")]
    public IActionResult SetStatus(Guid id, ProductStatusRequest request)
    {
        if (store.SetProductStatus(id, request.Status, out var error))
        {
            return Ok(store.FindProduct(id));
        }
        return BadRequest(new { message = error });
    }

    [HttpPatch("{id:guid}/purpose")]
    public IActionResult SetPurpose(Guid id, [FromBody] ProductPurposeRequest request)
    {
        if (store.SetProductPurpose(id, request.Purpose, out var error))
        {
            return Ok(store.FindProduct(id));
        }
        return BadRequest(new { message = error });
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id)
    {
        if (store.DeleteProduct(id, out var error))
        {
            return NoContent();
        }
        return BadRequest(new { message = error });
    }
}
