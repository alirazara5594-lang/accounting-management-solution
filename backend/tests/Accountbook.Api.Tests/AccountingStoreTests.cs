using Zenabook.Api.Models;
using Zenabook.Api.Services;
using Xunit;

namespace Accountbook.Api.Tests;

public class AccountingStoreTests
{
    [Fact]
    public void PostingEntryWithAutoReverseCreatesReversalOnFirstDayOfNextMonth()
    {
        var store = new AccountingStore();
        var debitAccount = store.Accounts.First(a => a.Code == "11101");
        var creditAccount = store.Accounts.First(a => a.Code == "41000");
        var entryDate = DateOnly.FromDateTime(DateTime.UtcNow);

        var request = new JournalEntryRequest(
            entryDate,
            "JE-AUTO-REV",
            "Accrual to auto-reverse",
            [
                new JournalLineRequest(debitAccount.Id, 100m, 0m, null),
                new JournalLineRequest(creditAccount.Id, 0m, 100m, null)
            ],
            AutoReverse: true);

        Assert.True(store.CreateJournal(request, out var entry, out var createError), createError);
        Assert.NotNull(entry);

        var transition = new TransitionRequest(entry!.Version);
        Assert.True(store.Transition(entry.Id, JournalStatus.Submitted, transition, out entry, out var submitError), submitError);
        Assert.True(store.Transition(entry!.Id, JournalStatus.Approved, new TransitionRequest(entry.Version), out entry, out var approveError), approveError);
        Assert.True(store.Transition(entry!.Id, JournalStatus.Posted, new TransitionRequest(entry.Version), out entry, out var postError), postError);

        var reversal = store.Entries.SingleOrDefault(e => e.ReversalOfId == entry!.Id);
        Assert.NotNull(reversal);
        Assert.Equal($"REV-{request.Reference}", reversal.Reference);
        Assert.Equal(new DateOnly(entryDate.Year, entryDate.Month, 1).AddMonths(1), reversal.Date);
        Assert.Equal(JournalStatus.Draft, reversal.Status);
        Assert.Equal(100m, reversal.Lines.Single(l => l.AccountId == creditAccount.Id).Debit);
        Assert.Equal(100m, reversal.Lines.Single(l => l.AccountId == debitAccount.Id).Credit);
    }

    [Fact]
    public void DirectBillAndPoBillShareUnifiedSequentialNumbering()
    {
        var store = new AccountingStore();
        
        // 1. Create a Direct Bill (no PO) with empty BillNumber
        var directBill = store.CreateVendorBill(new VendorBill
        {
            BillNumber = "",
            VendorInvoiceNumber = "SUPP-INV-001",
            VendorId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.Today),
            DueDate = DateOnly.FromDateTime(DateTime.Today.AddDays(30)),
            Lines = [new VendorBillLine { Description = "Consulting Expense", Quantity = 1, UnitPrice = 500m }]
        });

        // 2. Create a PO Bill (with PurchaseOrderId) with empty BillNumber
        var poBill = store.CreateVendorBill(new VendorBill
        {
            BillNumber = "",
            VendorInvoiceNumber = "SUPP-INV-002",
            VendorId = Guid.NewGuid(),
            PurchaseOrderId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.Today),
            DueDate = DateOnly.FromDateTime(DateTime.Today.AddDays(30)),
            Lines = [new VendorBillLine { Description = "Raw Materials", Quantity = 10, UnitPrice = 100m }]
        });

        // Extract sequential numbers
        var directNum = int.Parse(directBill.BillNumber.Substring(5));
        var poNum = int.Parse(poBill.BillNumber.Substring(5));

        // Assert that PO Bill immediately follows Direct Bill in continuous sequence
        Assert.Equal(directNum + 1, poNum);
        Assert.StartsWith("BILL-", directBill.BillNumber);
        Assert.StartsWith("BILL-", poBill.BillNumber);
    }
}
