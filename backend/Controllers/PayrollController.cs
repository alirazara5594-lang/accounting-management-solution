using Microsoft.AspNetCore.Mvc;
using Zenabook.Api.Models;
using Zenabook.Api.Services;

namespace Zenabook.Api.Controllers;

[ApiController]
[Route("api/v1/payroll")]
public class PayrollController : ControllerBase
{
    private readonly AccountingStore _store;
    public PayrollController(AccountingStore store) => _store = store;

    // ── Employees ──────────────────────────────────────────────────────────────
    [HttpGet("employees")]
    public ActionResult<List<Employee>> GetEmployees([FromQuery] PayrollCountry? country, [FromQuery] EmployeeStatus? status, [FromQuery] Guid? departmentId, [FromQuery] Guid? companyId)
    {
        var list = _store.Employees.AsEnumerable();
        if (country.HasValue) list = list.Where(e => e.Country == country.Value);
        if (status.HasValue) list = list.Where(e => e.Status == status.Value);
        if (departmentId.HasValue) list = list.Where(e => e.DepartmentId == departmentId.Value);
        if (companyId.HasValue) list = list.Where(e => e.CompanyId == companyId.Value);
        return Ok(list.OrderByDescending(e => e.CreatedAt).ToList());
    }

    [HttpGet("employees/{id}")]
    public ActionResult<Employee> GetEmployee(Guid id)
    {
        var emp = _store.GetEmployee(id);
        return emp == null ? NotFound() : Ok(emp);
    }

    [HttpGet("employees/next-number")]
    public ActionResult<object> NextEmployeeNumber() => Ok(new { number = _store.NextEmployeeNumber() });

    [HttpPost("employees")]
    public ActionResult<Employee> CreateEmployee([FromBody] EmployeeRequest request)
    {
        if (!_store.CreateEmployee(request, out var emp, out var error))
            return BadRequest(new { error });
        return CreatedAtAction(nameof(GetEmployee), new { id = emp!.Id }, emp);
    }

    [HttpPut("employees/{id}")]
    public ActionResult<Employee> UpdateEmployee(Guid id, [FromBody] EmployeeRequest request)
    {
        if (!_store.UpdateEmployee(id, request, out var emp, out var error))
            return BadRequest(new { error });
        return Ok(emp!);
    }

    [HttpPost("employees/{id}/status")]
    public ActionResult<Employee> SetEmployeeStatus(Guid id, [FromBody] SetStatusRequest request)
    {
        if (!Enum.TryParse<EmployeeStatus>(request.Status, true, out var status))
            return BadRequest(new { error = "Invalid status" });
        if (!_store.SetEmployeeStatus(id, status, out var emp, out var error))
            return BadRequest(new { error });
        return Ok(emp!);
    }

    // ── Departments ────────────────────────────────────────────────────────────
    [HttpGet("departments")]
    public ActionResult<List<Department>> GetDepartments([FromQuery] Guid? companyId)
    {
        var list = _store.Departments.AsEnumerable();
        if (companyId.HasValue) list = list.Where(d => d.CompanyId == companyId.Value);
        return Ok(list.ToList());
    }

    [HttpPost("departments")]
    public ActionResult<Department> CreateDepartment([FromBody] DepartmentRequest request)
    {
        if (!_store.CreateDepartment(request, out var dept, out var error))
            return BadRequest(new { error });
        return Created("", dept!);
    }

    [HttpPut("departments/{id}")]
    public ActionResult<Department> UpdateDepartment(Guid id, [FromBody] DepartmentRequest request)
    {
        if (!_store.UpdateDepartment(id, request, out var dept, out var error))
            return BadRequest(new { error });
        return Ok(dept!);
    }

    [HttpDelete("departments/{id}")]
    public ActionResult DeleteDepartment(Guid id)
    {
        if (!_store.DeleteDepartment(id, out var error))
            return BadRequest(new { error });
        return NoContent();
    }

    // ── Positions ──────────────────────────────────────────────────────────────
    [HttpGet("positions")]
    public ActionResult<List<Position>> GetPositions([FromQuery] Guid? departmentId, [FromQuery] Guid? companyId)
    {
        var list = _store.Positions.AsEnumerable();
        if (departmentId.HasValue) list = list.Where(p => p.DepartmentId == departmentId.Value);
        if (companyId.HasValue) list = list.Where(p => p.CompanyId == companyId.Value);
        return Ok(list.ToList());
    }

    [HttpPost("positions")]
    public ActionResult<Position> CreatePosition([FromBody] PositionRequest request)
    {
        if (!_store.CreatePosition(request, out var pos, out var error))
            return BadRequest(new { error });
        return Created("", pos!);
    }

    [HttpPut("positions/{id}")]
    public ActionResult<Position> UpdatePosition(Guid id, [FromBody] PositionRequest request)
    {
        if (!_store.UpdatePosition(id, request, out var pos, out var error))
            return BadRequest(new { error });
        return Ok(pos!);
    }

    [HttpDelete("positions/{id}")]
    public ActionResult DeletePosition(Guid id)
    {
        if (!_store.DeletePosition(id, out var error))
            return BadRequest(new { error });
        return NoContent();
    }

    // ── Pay Grades ─────────────────────────────────────────────────────────────
    [HttpGet("pay-grades")]
    public ActionResult<List<PayGrade>> GetPayGrades([FromQuery] Guid? companyId)
    {
        var list = _store.PayGrades.AsEnumerable();
        if (companyId.HasValue) list = list.Where(g => g.CompanyId == companyId.Value);
        return Ok(list.ToList());
    }

    [HttpPost("pay-grades")]
    public ActionResult<PayGrade> CreatePayGrade([FromBody] PayGradeRequest request)
    {
        if (!_store.CreatePayGrade(request, out var grade, out var error))
            return BadRequest(new { error });
        return Created("", grade!);
    }

    [HttpPut("pay-grades/{id}")]
    public ActionResult<PayGrade> UpdatePayGrade(Guid id, [FromBody] PayGradeRequest request)
    {
        if (!_store.UpdatePayGrade(id, request, out var grade, out var error))
            return BadRequest(new { error });
        return Ok(grade!);
    }

    [HttpDelete("pay-grades/{id}")]
    public ActionResult DeletePayGrade(Guid id)
    {
        if (!_store.DeletePayGrade(id, out var error))
            return BadRequest(new { error });
        return NoContent();
    }

    // ── Pay Components ─────────────────────────────────────────────────────────
    [HttpGet("pay-components")]
    public ActionResult<List<PayComponent>> GetPayComponents([FromQuery] PayrollCountry? country, [FromQuery] PayComponentType? type, [FromQuery] Guid? companyId)
    {
        var list = _store.PayComponents.AsEnumerable();
        if (country.HasValue) list = list.Where(c => c.Country == country.Value);
        if (type.HasValue) list = list.Where(c => c.Type == type.Value);
        if (companyId.HasValue) list = list.Where(c => c.CompanyId == companyId.Value);
        return Ok(list.OrderBy(c => c.DisplayOrder).ToList());
    }

    [HttpPost("pay-components")]
    public ActionResult<PayComponent> CreatePayComponent([FromBody] PayComponentRequest request)
    {
        if (!_store.CreatePayComponent(request, out var comp, out var error))
            return BadRequest(new { error });
        return Created("", comp!);
    }

    [HttpPut("pay-components/{id}")]
    public ActionResult<PayComponent> UpdatePayComponent(Guid id, [FromBody] PayComponentRequest request)
    {
        if (!_store.UpdatePayComponent(id, request, out var comp, out var error))
            return BadRequest(new { error });
        return Ok(comp!);
    }

    [HttpDelete("pay-components/{id}")]
    public ActionResult DeletePayComponent(Guid id)
    {
        if (!_store.DeletePayComponent(id, out var error))
            return BadRequest(new { error });
        return NoContent();
    }

    // ── Tax Slabs ──────────────────────────────────────────────────────────────
    [HttpGet("tax-slabs")]
    public ActionResult<List<SalaryTaxSlab>> GetTaxSlabs([FromQuery] PayrollCountry? country, [FromQuery] int? taxYear, [FromQuery] Guid? companyId)
    {
        return Ok(_store.GetTaxSlabs(country, taxYear, companyId));
    }

    [HttpPost("tax-slabs")]
    public ActionResult<SalaryTaxSlab> CreateTaxSlab([FromBody] SalaryTaxSlabRequest request)
    {
        if (!_store.CreateTaxSlab(request, out var slab, out var error))
            return BadRequest(new { error });
        return Created("", slab!);
    }

    [HttpPut("tax-slabs/{id}")]
    public ActionResult<SalaryTaxSlab> UpdateTaxSlab(Guid id, [FromBody] SalaryTaxSlabRequest request)
    {
        if (!_store.UpdateTaxSlab(id, request, out var slab, out var error))
            return BadRequest(new { error });
        return Ok(slab!);
    }

    [HttpDelete("tax-slabs/{id}")]
    public ActionResult DeleteTaxSlab(Guid id)
    {
        if (!_store.DeleteTaxSlab(id, out var error))
            return BadRequest(new { error });
        return NoContent();
    }

    // ── Leave ──────────────────────────────────────────────────────────────────
    [HttpGet("leave-requests")]
    public ActionResult<List<LeaveRequest>> GetLeaveRequests([FromQuery] Guid? employeeId, [FromQuery] LeaveStatus? status, [FromQuery] Guid? companyId)
    {
        var list = _store.LeaveRequests.AsEnumerable();
        if (employeeId.HasValue) list = list.Where(l => l.EmployeeId == employeeId.Value);
        if (status.HasValue) list = list.Where(l => l.Status == status.Value);
        if (companyId.HasValue) list = list.Where(l => l.CompanyId == companyId.Value);
        return Ok(list.OrderByDescending(l => l.CreatedAt).ToList());
    }

    [HttpPost("leave-requests")]
    public ActionResult<LeaveRequest> CreateLeaveRequest([FromBody] LeaveRequestRequest request)
    {
        if (!_store.CreateLeaveRequest(request, out var lr, out var error))
            return BadRequest(new { error });
        return Created("", lr!);
    }

    [HttpPost("leave-requests/{id}/action")]
    public ActionResult<LeaveRequest> ActionLeaveRequest(Guid id, [FromBody] LeaveRequestActionRequest action)
    {
        if (!_store.ActionLeaveRequest(id, action, out var lr, out var error))
            return BadRequest(new { error });
        return Ok(lr!);
    }

    // ── Attendance ─────────────────────────────────────────────────────────────
    [HttpGet("attendance")]
    public ActionResult<List<AttendanceRecord>> GetAttendance([FromQuery] Guid? employeeId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] Guid? companyId)
    {
        var list = _store.AttendanceRecords.AsEnumerable();
        if (employeeId.HasValue) list = list.Where(a => a.EmployeeId == employeeId.Value);
        if (from.HasValue) list = list.Where(a => a.Date >= from.Value);
        if (to.HasValue) list = list.Where(a => a.Date <= to.Value);
        if (companyId.HasValue) list = list.Where(a => a.CompanyId == companyId.Value);
        return Ok(list.OrderByDescending(a => a.Date).ToList());
    }

    [HttpPost("attendance")]
    public ActionResult<AttendanceRecord> RecordAttendance([FromBody] AttendanceRecordRequest request)
    {
        if (!_store.RecordAttendance(request, out var rec, out var error))
            return BadRequest(new { error });
        return Created("", rec!);
    }

    // ── Holidays ───────────────────────────────────────────────────────────────
    [HttpGet("holidays")]
    public ActionResult<List<Holiday>> GetHolidays([FromQuery] PayrollCountry? country, [FromQuery] Guid? companyId)
    {
        var list = _store.Holidays.AsEnumerable();
        if (country.HasValue) list = list.Where(h => h.Country == country.Value);
        if (companyId.HasValue) list = list.Where(h => h.CompanyId == companyId.Value);
        return Ok(list.OrderBy(h => h.Date).ToList());
    }

    // ── Loans & Advances ──────────────────────────────────────────────────────
    [HttpGet("loans")]
    public ActionResult<List<LoanAdvance>> GetLoans([FromQuery] Guid? employeeId, [FromQuery] string? status, [FromQuery] Guid? companyId)
    {
        var list = _store.LoanAdvances.AsEnumerable();
        if (employeeId.HasValue) list = list.Where(l => l.EmployeeId == employeeId.Value);
        if (!string.IsNullOrWhiteSpace(status)) list = list.Where(l => l.Status == status);
        if (companyId.HasValue) list = list.Where(l => l.CompanyId == companyId.Value);
        return Ok(list.OrderByDescending(l => l.CreatedAt).ToList());
    }

    [HttpPost("loans")]
    public ActionResult<LoanAdvance> CreateLoanAdvance([FromBody] LoanAdvanceRequest request)
    {
        if (!_store.CreateLoanAdvance(request, out var loan, out var error))
            return BadRequest(new { error });
        return Created("", loan!);
    }

    [HttpPost("loans/{id}/repay")]
    public ActionResult<LoanAdvance> RecordLoanRepayment(Guid id)
    {
        if (!_store.RecordLoanRepayment(id, out var loan, out var error))
            return BadRequest(new { error });
        return Ok(loan!);
    }

    // ── Payruns ────────────────────────────────────────────────────────────────
    [HttpGet("payruns")]
    public ActionResult<List<Payrun>> GetPayruns([FromQuery] PayrunStatus? status, [FromQuery] Guid? companyId)
    {
        var list = _store.Payruns.AsEnumerable();
        if (status.HasValue) list = list.Where(p => p.Status == status.Value);
        if (companyId.HasValue) list = list.Where(p => p.CompanyId == companyId.Value);
        return Ok(list.OrderByDescending(p => p.CreatedAt).ToList());
    }

    [HttpGet("payruns/{id}")]
    public ActionResult<Payrun> GetPayrun(Guid id)
    {
        var payrun = _store.Payruns.FirstOrDefault(p => p.Id == id);
        return payrun == null ? NotFound() : Ok(payrun);
    }

    [HttpGet("payruns/{id}/employees")]
    public ActionResult<List<PayrunEmployee>> GetPayrunEmployees(Guid id)
    {
        return Ok(_store.PayrunEmployees.Where(pe => pe.PayrunId == id).ToList());
    }

    [HttpGet("payruns/{id}/lines")]
    public ActionResult<List<PayrunLine>> GetPayrunLines(Guid id)
    {
        var empIds = _store.PayrunEmployees.Where(pe => pe.PayrunId == id).Select(pe => pe.Id).ToHashSet();
        return Ok(_store.PayrunLines.Where(pl => empIds.Contains(pl.PayrunEmployeeId)).ToList());
    }

    [HttpPost("payruns/calculate")]
    public ActionResult<object> CalculatePayrun([FromBody] CalculatePayrunRequest request)
    {
        if (!_store.CalculateAndProcessPayrun(request, false, out var payrun, out var slips, out var error))
            return BadRequest(new { error });
        return Ok(new { payrun, employeeCount = slips.Count, totalGross = slips.Sum(s => s.GrossEarnings), totalDeductions = slips.Sum(s => s.TotalDeductions), totalNet = slips.Sum(s => s.NetPay) });
    }

    [HttpPost("payruns/post")]
    public ActionResult<object> PostPayrun([FromBody] CalculatePayrunRequest request)
    {
        if (!_store.CalculateAndProcessPayrun(request, true, out var payrun, out var slips, out var error))
            return BadRequest(new { error });
        return Ok(new { payrun, slips, employeeCount = slips.Count, totalGross = slips.Sum(s => s.GrossEarnings), totalDeductions = slips.Sum(s => s.TotalDeductions), totalNet = slips.Sum(s => s.NetPay) });
    }

    [HttpPost("payruns/{id}/post-to-gl")]
    public ActionResult<object> PostPayrunToGL(Guid id)
    {
        if (!_store.PostPayrunToGL(id, out var journalEntry, out var error))
            return BadRequest(new { error });
        return Ok(new { success = true, journalEntry, message = "Payrun posted to General Ledger successfully." });
    }

    // ── Salary Slips ──────────────────────────────────────────────────────────
    [HttpGet("salary-slips")]
    public ActionResult<List<SalarySlip>> GetSalarySlips([FromQuery] Guid? payrunId, [FromQuery] Guid? employeeId, [FromQuery] Guid? companyId)
    {
        return Ok(_store.GetSalarySlips(payrunId, employeeId, companyId));
    }

    [HttpGet("salary-slips/{id}")]
    public ActionResult<SalarySlip> GetSalarySlip(Guid id)
    {
        var slip = _store.GetSalarySlipById(id);
        return slip == null ? NotFound() : Ok(slip);
    }
}

public record SetStatusRequest(string Status);
