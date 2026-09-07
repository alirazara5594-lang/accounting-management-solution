import { useSalesStore } from '../stores/useSalesStore';

export function getGlobalNextInvoiceNumber(): string {
  let maxNum = 0;

  const inspectString = (str?: string | null) => {
    if (!str) return;
    const clean = String(str).trim();
    if (clean.startsWith('INV-202') || clean.length > 10) return;
    const match = clean.match(/INV-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num < 100000 && num > maxNum) {
        maxNum = num;
      }
    }
  };

  // 1. Scan store invoices (Authoritative live state)
  try {
    const storeInvoices = useSalesStore.getState().invoices || [];
    if (storeInvoices.length === 0) {
      // If store is empty (e.g. database wiped / swapped), clear stale local caches
      try {
        localStorage.removeItem('ams_last_used_inv_sequence');
        localStorage.removeItem('ams_local_invoices_list');
        localStorage.removeItem('ams_invoices_lines_cache');
      } catch {}
      return 'INV-00001';
    }

    for (const inv of storeInvoices) {
      inspectString(inv.invoiceNumber);
      inspectString((inv as any).InvoiceNumber);
      inspectString(inv.reference);
      inspectString((inv as any).Reference);
      inspectString((inv as any).code);
    }
  } catch {}

  const nextNum = maxNum + 1;
  return `INV-${nextNum.toString().padStart(5, '0')}`;
}

export function recordUsedInvoiceNumber(invNum: string) {
  if (!invNum) return;
  const match = String(invNum).match(/INV-(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num < 100000) {
      const current = parseInt(localStorage.getItem('ams_last_used_inv_sequence') || '0', 10);
      if (num > current) {
        localStorage.setItem('ams_last_used_inv_sequence', String(num));
      }
    }
  }
}

/**
 * Formats any raw invoice number / reference into standard canonical INV-00001 format
 * replacing any legacy timestamps (like 20260828...) with clean sequential numbers.
 */
export function formatInvoiceNumber(raw?: string | null, fallbackIndex: number = 1): string {
  if (!raw) return `INV-${fallbackIndex.toString().padStart(5, '0')}`;
  const str = String(raw).trim();

  // If already standard clean format like INV-00001, INV-001, INV-1
  const match = str.match(/^(?:INV-?)?(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) {
      if (num < 100000) {
        return `INV-${num.toString().padStart(5, '0')}`;
      } else {
        return `INV-${fallbackIndex.toString().padStart(5, '0')}`;
      }
    }
  }

  // If starts with EST or has raw timestamp format
  if (str.startsWith('EST-') || str.startsWith('INV-202') || str.length > 10) {
    return `INV-${fallbackIndex.toString().padStart(5, '0')}`;
  }

  return str;
}

/**
 * Formats any raw vendor bill number into standard canonical BILL-00001 format.
 */
export function formatBillNumber(raw?: string | null, fallbackIndex: number = 1): string {
  if (!raw) return `BILL-${fallbackIndex.toString().padStart(5, '0')}`;
  const str = String(raw).trim();
  const match = str.match(/^(?:BILL-?)?(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) {
      if (num < 100000) return `BILL-${num.toString().padStart(5, '0')}`;
      return `BILL-${fallbackIndex.toString().padStart(5, '0')}`;
    }
  }
  if (str.startsWith('BILL-202') || str.length > 11) {
    return `BILL-${fallbackIndex.toString().padStart(5, '0')}`;
  }
  return str;
}

/**
 * Formats any raw purchase order number into standard canonical PO-00001 format.
 */
export function formatPONumber(raw?: string | null, fallbackIndex: number = 1): string {
  if (!raw) return `PO-${fallbackIndex.toString().padStart(5, '0')}`;
  const str = String(raw).trim();
  const match = str.match(/^(?:PO-?)?(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) {
      if (num < 100000) return `PO-${num.toString().padStart(5, '0')}`;
      return `PO-${fallbackIndex.toString().padStart(5, '0')}`;
    }
  }
  if (str.startsWith('PO-202') || str.length > 10) {
    return `PO-${fallbackIndex.toString().padStart(5, '0')}`;
  }
  return str;
}

