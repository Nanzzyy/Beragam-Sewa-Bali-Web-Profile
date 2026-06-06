import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================
// TYPE DEFINITIONS — matches DDL schema exactly
// ============================================================

export type AccountCategory = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type NormalBalance = 'Debet' | 'Kredit';

export interface Account {
  account_code: string;
  account_name: string;
  category: AccountCategory;
  normal_balance: NormalBalance;
  is_active: boolean;
}

export interface Transaction {
  id: string;
  description: string;
  date: string;
  receipt_url: string | null;
  created_by: string;
  created_at: string;
}

export interface JournalEntry {
  id?: string;
  transaction_id?: string;
  account_code: string;
  debit: number;
  credit: number;
}

export interface JournalEntryWithAccount extends JournalEntry {
  account_name: string;
  category: AccountCategory;
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  category: AccountCategory;
  normal_balance: NormalBalance;
  total_debit: number;
  total_credit: number;
  ending_balance: number;
}

export interface GeneralLedgerRow {
  entry_id: string;
  transaction_id: string;
  transaction_date: string;
  transaction_description: string;
  account_code: string;
  account_name: string;
  category: AccountCategory;
  debit: number;
  credit: number;
  receipt_url: string | null;
  created_by: string;
  created_at: string;
}

// ============================================================
// TRANSACTION INPUT — what the UI sends
// ============================================================

export interface TransactionInput {
  description: string;
  date: string;
  receipt_url?: string;
  entries: JournalEntryInput[];
}

export interface JournalEntryInput {
  account_code: string;
  debit: number;
  credit: number;
}
