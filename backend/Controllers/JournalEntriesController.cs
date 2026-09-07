using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

namespace Zenabook.Api.Controllers;

[ApiController]
[Route("api/v1/journal-entries")]
public class JournalEntriesController(AccountingStore store) : ControllerBase
{
    [HttpGet]
    public IActionResult Get([FromQuery] JournalStatus? status) => Ok(store.Entries.Where(e => status is null || e.Status == status).OrderByDescending(e => e.Date).ThenByDescending(e => e.Reference));

    [HttpGet("{id:guid}")]
    public IActionResult GetOne(Guid id) => store.FindEntry(id) is { } entry ? Ok(entry) : NotFound();

    [HttpPost]
    public IActionResult Create(JournalEntryRequest request) => store.CreateJournal(request, out var entry, out var error)
        ? CreatedAtAction(nameof(GetOne), new { id = entry!.Id }, entry)
        : BadRequest(new { message = error });

    [HttpPost("{id:guid}/submit")]
    public IActionResult Submit(Guid id, TransitionRequest request) => Transition(id, JournalStatus.Submitted, request);

    [HttpPost("{id:guid}/approve")]
    public IActionResult Approve(Guid id, TransitionRequest request) => Transition(id, JournalStatus.Approved, request);

    [HttpPost("{id:guid}/post")]
    public IActionResult Post(Guid id, TransitionRequest request) => Transition(id, JournalStatus.Posted, request);

    [HttpPost("batch-post")]
    public IActionResult BatchPost(BatchPostRequest request) => store.BatchPost(request, out var result, out var error) ? Ok(result) : BadRequest(new { message = error });

    [HttpGet("{id:guid}/events")]
    public IActionResult Events(Guid id) => store.FindEntry(id) is null ? NotFound() : Ok(store.Events(id));

    [HttpPost("{id:guid}/attachments")]
    public IActionResult Attach(Guid id, AttachmentRequest request)
    {
        try { store.AddAttachment(id, request); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    private IActionResult Transition(Guid id, JournalStatus status, TransitionRequest request) => store.Transition(id, status, request, out var entry, out var error) ? Ok(entry) : BadRequest(new { message = error });
}

[ApiController]
[Route("api/v1/journal-templates")]
public class JournalTemplatesController(AccountingStore store) : ControllerBase
{
    [HttpGet] public IActionResult Get() => Ok(store.Templates);
    [HttpPost] public IActionResult Create(JournalTemplateRequest request) => Ok(store.AddTemplate(request));
}

[ApiController]
[Route("api/v1/recurring-journal-entries")]
public class RecurringJournalEntriesController(AccountingStore store) : ControllerBase
{
    [HttpGet] public IActionResult Get() => Ok(store.RecurringEntries);
    [HttpPost] public IActionResult Create(RecurringEntryRequest request)
    {
        try { return Ok(store.AddRecurring(request)); }
        catch (InvalidOperationException error) { return BadRequest(new { message = error.Message }); }
    }
}

[ApiController]
[Route("api/v1/intercompany-allocations")]
public class IntercompanyAllocationsController(AccountingStore store) : ControllerBase
{
    [HttpGet] public IActionResult Get() => Ok(store.IntercompanyAllocations.OrderByDescending(x => x.UpdatedAt));
    [HttpPost] public IActionResult Create(IntercompanyAllocationRequest request) => store.CreateIntercompanyAllocation(request, out var allocation, out var error)
        ? Created($"api/v1/intercompany-allocations/{allocation!.Id}", allocation)
        : BadRequest(new { message = error });
    [HttpPatch("{id:guid}/status")]
    public IActionResult SetStatus(Guid id, IntercompanyStatusRequest request) => store.SetIntercompanyStatus(id, request.Status, out var error)
        ? NoContent() : BadRequest(new { message = error });

    [HttpPost("{id:guid}/process")]
    public IActionResult ProcessAllocation(Guid id, [FromQuery] DateOnly? asOfDate = null)
    {
        if (!store.ProcessIntercompanyAllocation(id, asOfDate ?? DateOnly.FromDateTime(DateTime.Today), out var entry, out var error))
            return BadRequest(new { message = error });
        return Ok(entry);
    }
}

[ApiController]
[Route("api/v1/companies")]
public class CompaniesController(AccountingStore store) : ControllerBase
{
    [HttpGet] public IActionResult Get([FromQuery] bool includeInactive = false) => Ok(store.Companies.Where(x => includeInactive || x.Active).OrderBy(x => x.Name));
    [HttpPost] public IActionResult Create(CompanyRequest request) => store.CreateCompany(request, out var company, out var error)
        ? Created($"api/v1/companies/{company!.Id}", company)
        : BadRequest(new { message = error });
    [HttpPut("{id:guid}")] public IActionResult Update(Guid id, CompanyRequest request) => store.UpdateCompany(id, request, out var company, out var error) ? Ok(company) : BadRequest(new { message = error });
    [HttpPatch("{id:guid}/status")] public IActionResult SetStatus(Guid id, CompanyStatusRequest request) => store.SetCompanyStatus(id, request.Active, out var error) ? NoContent() : BadRequest(new { message = error });
    [HttpDelete("{id:guid}")] public IActionResult Purge(Guid id) => store.PurgeCompanyData(id, out var error) ? NoContent() : BadRequest(new { message = error });
}
