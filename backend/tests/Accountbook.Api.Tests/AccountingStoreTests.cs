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
}
