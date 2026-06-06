/**
 * Double-Entry Transaction Processing Engine
 * 
 * Core accounting logic for creating balanced journal entries.
 * Validates debit/credit balance BEFORE writing to Supabase.
 * 
 * Math Rules:
 *   Asset(1), Expense(5)           → Balance = Σ Debit - Σ Credit
 *   Liability(2), Equity(3), Revenue(4) → Balance = Σ Credit - Σ Debit
 */

import {
  supabase,
  type Account,
  type TransactionInput,
  type JournalEntryInput,
  type TrialBalanceRow,
  type GeneralLedgerRow,
  type Transaction,
  type JournalEntryWithAccount,
  type FixedAsset,
} from './supabase';

// ============================================================
// VALIDATION
// ============================================================

export class AccountingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AccountingError';
  }
}

/**
 * Validates that a set of journal entries follow double-entry rules:
 * 1. Minimum 2 entries
 * 2. Total debit === Total credit
 * 3. Each entry has either debit > 0 or credit > 0 (not both)
 * 4. All account codes exist in the COA
 */
export function validateJournalEntries(
  entries: JournalEntryInput[],
  accounts: Account[]
): { valid: boolean; error?: string } {
  // Rule 1: Minimum 2 entries
  if (entries.length < 2) {
    return {
      valid: false,
      error: 'Jurnal harus memiliki minimal 2 baris entri (Debit & Credit).',
    };
  }

  // Rule 3: Each entry is either debit or credit
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.debit > 0 && e.credit > 0) {
      return {
        valid: false,
        error: `Baris ${i + 1}: Entri tidak boleh memiliki Debit DAN Credit sekaligus.`,
      };
    }
    if (e.debit === 0 && e.credit === 0) {
      return {
        valid: false,
        error: `Baris ${i + 1}: Debit atau Credit harus diisi (tidak boleh keduanya 0).`,
      };
    }
    if (e.debit < 0 || e.credit < 0) {
      return {
        valid: false,
        error: `Baris ${i + 1}: Nilai Debit/Credit tidak boleh negatif.`,
      };
    }
  }

  // Rule 4: All account codes must exist
  const accountCodes = new Set(accounts.map(a => a.account_code));
  for (let i = 0; i < entries.length; i++) {
    if (!accountCodes.has(entries[i].account_code)) {
      return {
        valid: false,
        error: `Baris ${i + 1}: Kode akun "${entries[i].account_code}" tidak ditemukan. Gunakan dropdown untuk memilih akun.`,
      };
    }
  }

  // Rule 2: Total debit must equal total credit
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

  // Use tolerance for floating point
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return {
      valid: false,
      error: `Jurnal tidak seimbang! Total Debit (Rp ${totalDebit.toLocaleString('id-ID')}) ≠ Total Credit (Rp ${totalCredit.toLocaleString('id-ID')}). Selisih: Rp ${Math.abs(totalDebit - totalCredit).toLocaleString('id-ID')}.`,
    };
  }

  return { valid: true };
}

// ============================================================
// CRUD OPERATIONS
// ============================================================

/**
 * Fetch Chart of Accounts (COA)
 */
export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_active', true)
    .order('account_code');

  if (error) throw new AccountingError(error.message, 'FETCH_ACCOUNTS_FAILED');
  return data || [];
}

/**
 * Fetch Trial Balance (Neraca Saldo) from materialized view
 */
export async function fetchTrialBalance(): Promise<TrialBalanceRow[]> {
  const { data, error } = await supabase
    .from('v_trial_balance')
    .select('*')
    .order('account_code');

  if (error) throw new AccountingError(error.message, 'FETCH_TRIAL_BALANCE_FAILED');
  return (data || []).map(row => ({
    ...row,
    total_debit: Number(row.total_debit),
    total_credit: Number(row.total_credit),
    ending_balance: Number(row.ending_balance),
  }));
}

/**
 * Fetch General Ledger entries
 */
export async function fetchGeneralLedger(
  options?: { limit?: number; accountCode?: string; dateFrom?: string; dateTo?: string }
): Promise<GeneralLedgerRow[]> {
  let query = supabase
    .from('v_general_ledger')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.accountCode) {
    query = query.eq('account_code', options.accountCode);
  }
  if (options?.dateFrom) {
    query = query.gte('transaction_date', options.dateFrom);
  }
  if (options?.dateTo) {
    query = query.lte('transaction_date', options.dateTo);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new AccountingError(error.message, 'FETCH_LEDGER_FAILED');
  return (data || []).map(row => ({
    ...row,
    debit: Number(row.debit),
    credit: Number(row.credit),
  }));
}

/**
 * Fetch transactions with their journal entries
 */
export async function fetchTransactionsWithEntries(
  options?: { limit?: number; dateFrom?: string; dateTo?: string }
): Promise<(Transaction & { journal_entries: JournalEntryWithAccount[] })[]> {
  let query = supabase
    .from('transactions')
    .select(`
      *,
      journal_entries (
        id,
        account_code,
        debit,
        credit,
        accounts (
          account_name,
          category
        )
      )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.dateFrom) {
    query = query.gte('date', options.dateFrom);
  }
  if (options?.dateTo) {
    query = query.lte('date', options.dateTo);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new AccountingError(error.message, 'FETCH_TRANSACTIONS_FAILED');

  return (data || []).map(tx => ({
    ...tx,
    journal_entries: (tx.journal_entries || []).map((je: Record<string, unknown>) => ({
      id: je.id as string,
      account_code: je.account_code as string,
      debit: Number(je.debit),
      credit: Number(je.credit),
      account_name: (je.accounts as Record<string, unknown>)?.account_name as string || '',
      category: (je.accounts as Record<string, unknown>)?.category as string || '',
    })),
  }));
}

/**
 * CREATE a new double-entry transaction.
 * 
 * Process:
 * 1. Validate entries (balance check, account existence)
 * 2. Insert transaction header
 * 3. Insert all journal entry lines
 * 4. Verify final balance
 * 
 * All within a single Supabase session — if journal entries fail,
 * the transaction header is cleaned up.
 */
export async function createTransaction(
  input: TransactionInput,
  accounts: Account[]
): Promise<{ transaction_id: string }> {
  // Step 1: Validate
  const validation = validateJournalEntries(input.entries, accounts);
  if (!validation.valid) {
    throw new AccountingError(validation.error!, 'VALIDATION_FAILED');
  }

  // Step 2: Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new AccountingError('Autentikasi gagal. Silakan login ulang.', 'AUTH_FAILED');
  }

  // Step 3: Insert transaction header
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .insert({
      description: input.description.trim(),
      date: input.date,
      receipt_url: input.receipt_url || null,
      is_adjusting: input.is_adjusting || false,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (txError || !txData) {
    throw new AccountingError(
      `Gagal membuat transaksi: ${txError?.message || 'Unknown error'}`,
      'TX_INSERT_FAILED'
    );
  }

  const transactionId = txData.id;

  // Step 4: Insert journal entries
  const journalRows = input.entries.map(e => ({
    transaction_id: transactionId,
    account_code: e.account_code,
    debit: e.debit,
    credit: e.credit,
  }));

  const { error: jeError } = await supabase
    .from('journal_entries')
    .insert(journalRows);

  if (jeError) {
    // Cleanup: delete the orphaned transaction header
    await supabase.from('transactions').delete().eq('id', transactionId);
    throw new AccountingError(
      `Gagal menyimpan jurnal: ${jeError.message}`,
      'JE_INSERT_FAILED'
    );
  }

  // Step 5: Final verification — re-check balance from DB
  const { data: verifyData, error: verifyError } = await supabase
    .from('journal_entries')
    .select('debit, credit')
    .eq('transaction_id', transactionId);

  if (verifyError || !verifyData) {
    throw new AccountingError('Gagal memverifikasi saldo jurnal.', 'VERIFY_FAILED');
  }

  const dbDebit = verifyData.reduce((s, r) => s + Number(r.debit), 0);
  const dbCredit = verifyData.reduce((s, r) => s + Number(r.credit), 0);

  if (Math.abs(dbDebit - dbCredit) > 0.001) {
    // This should never happen if validation passed, but safety net
    await supabase.from('journal_entries').delete().eq('transaction_id', transactionId);
    await supabase.from('transactions').delete().eq('id', transactionId);
    throw new AccountingError(
      `CRITICAL: Saldo jurnal tidak seimbang setelah insert. D=${dbDebit}, C=${dbCredit}`,
      'BALANCE_MISMATCH'
    );
  }

  return { transaction_id: transactionId };
}

/**
 * DELETE a transaction and all its journal entries (cascade)
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (error) {
    throw new AccountingError(
      `Gagal menghapus transaksi: ${error.message}`,
      'TX_DELETE_FAILED'
    );
  }
}

// ============================================================
// ACCOUNTS CRUD
// ============================================================

export async function upsertAccount(account: Account): Promise<void> {
  const { error } = await supabase.from('accounts').upsert(account);
  if (error) throw new AccountingError(error.message, 'UPSERT_ACCOUNT_FAILED');
}

export async function deleteAccount(accountCode: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('account_code', accountCode);
  if (error) throw new AccountingError(error.message, 'DELETE_ACCOUNT_FAILED');
}

// ============================================================
// FIXED ASSETS CRUD
// ============================================================

export async function fetchFixedAssets(): Promise<FixedAsset[]> {
  const { data, error } = await supabase
    .from('fixed_assets')
    .select('*')
    .eq('is_active', true)
    .order('purchase_date', { ascending: false });

  if (error) throw new AccountingError(error.message, 'FETCH_ASSETS_FAILED');
  return data || [];
}

export async function upsertFixedAsset(asset: Omit<FixedAsset, 'id' | 'is_active'> & { id?: string }): Promise<void> {
  const { error } = await supabase.from('fixed_assets').upsert({
    ...asset,
    is_active: true
  });
  if (error) throw new AccountingError(error.message, 'UPSERT_ASSET_FAILED');
}

export async function deleteFixedAsset(id: string): Promise<void> {
  const { error } = await supabase.from('fixed_assets').delete().eq('id', id);
  if (error) throw new AccountingError(error.message, 'DELETE_ASSET_FAILED');
}
