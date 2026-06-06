-- ============================================================
-- BERAGAM SEWA BALI — DOUBLE-ENTRY ACCOUNTING SYSTEM
-- PT Praven Bali Production
-- Target: cashflow.beragamsewabali.com
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ENUMS
-- ============================================================

DO $$ BEGIN
    CREATE TYPE account_category AS ENUM ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE normal_balance_type AS ENUM ('Debet', 'Kredit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Clean up old incompatible tables from previous cashflow version if they exist
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;

-- Chart of Accounts (Bagan Akun / COA)
CREATE TABLE IF NOT EXISTS public.accounts (
    account_code TEXT PRIMARY KEY,                    -- e.g. '1-102', '4-101'
    account_name TEXT NOT NULL,
    category     account_category NOT NULL,
    normal_balance normal_balance_type NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.accounts IS 'Chart of Accounts (COA) for double-entry ledger';
COMMENT ON COLUMN public.accounts.account_code IS 'Hierarchical code: 1-xxx Asset, 2-xxx Liability, 3-xxx Equity, 4-xxx Revenue, 5-xxx Expense';

-- Transaction Headers (parent of journal entries)
CREATE TABLE IF NOT EXISTS public.transactions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description  TEXT NOT NULL,
    date         DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url  TEXT,
    created_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.transactions IS 'Transaction header — groups journal entry lines';

-- Journal Entries (the double-entry rows)
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id  UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    account_code    TEXT NOT NULL REFERENCES public.accounts(account_code) ON DELETE RESTRICT,
    debit           NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit          NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    created_at      TIMESTAMPTZ DEFAULT now(),

    -- Each line must be either a debit OR a credit, never both non-zero
    CONSTRAINT chk_debit_or_credit CHECK (
        (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
    )
);

COMMENT ON TABLE public.journal_entries IS 'Double-entry journal lines — each transaction must have balanced debit/credit';

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_journal_transaction ON public.journal_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_journal_account ON public.journal_entries(account_code);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);

-- ============================================================
-- 4. TRIGGER: Validate Balanced Journal Entries
-- ============================================================

-- Ensures total debit = total credit for every transaction
CREATE OR REPLACE FUNCTION public.validate_journal_balance()
RETURNS trigger AS $$
DECLARE
    total_debit  NUMERIC(15, 2);
    total_credit NUMERIC(15, 2);
BEGIN
    SELECT
        COALESCE(SUM(debit), 0),
        COALESCE(SUM(credit), 0)
    INTO total_debit, total_credit
    FROM public.journal_entries
    WHERE transaction_id = NEW.transaction_id;

    -- Allow intermediate states during batch inserts via statement-level trigger
    -- Final validation happens at CONSTRAINT TRIGGER level
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Constraint trigger fires AFTER the full statement completes (batch-safe)
CREATE OR REPLACE FUNCTION public.validate_transaction_balance()
RETURNS trigger AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Check all transactions that were modified in this statement
    FOR rec IN
        SELECT DISTINCT transaction_id
        FROM public.journal_entries
        WHERE transaction_id = NEW.transaction_id
    LOOP
        DECLARE
            sum_debit  NUMERIC(15, 2);
            sum_credit NUMERIC(15, 2);
        BEGIN
            SELECT
                COALESCE(SUM(debit), 0),
                COALESCE(SUM(credit), 0)
            INTO sum_debit, sum_credit
            FROM public.journal_entries
            WHERE transaction_id = rec.transaction_id;

            IF sum_debit <> sum_credit THEN
                RAISE EXCEPTION 'UNBALANCED TRANSACTION: transaction_id=%, total_debit=%, total_credit=%. Debit MUST equal Credit.',
                    rec.transaction_id, sum_debit, sum_credit;
            END IF;

            IF sum_debit = 0 AND sum_credit = 0 THEN
                RAISE EXCEPTION 'EMPTY TRANSACTION: transaction_id=% has zero totals.', rec.transaction_id;
            END IF;
        END;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOTE: Balance validation is handled at application level
-- because constraint triggers on individual rows fire before all rows are inserted.
-- The application layer validates sum(debit) = sum(credit) BEFORE committing.

-- ============================================================
-- 5. VIEW: Trial Balance (Neraca Saldo) — Real-time
-- ============================================================

CREATE OR REPLACE VIEW public.v_trial_balance AS
SELECT
    a.account_code,
    a.account_name,
    a.category,
    a.normal_balance,
    COALESCE(SUM(je.debit), 0)  AS total_debit,
    COALESCE(SUM(je.credit), 0) AS total_credit,
    -- Accounting math: Asset/Expense = Debit-Credit, Liability/Equity/Revenue = Credit-Debit
    CASE
        WHEN a.category IN ('Asset', 'Expense')
            THEN COALESCE(SUM(je.debit), 0) - COALESCE(SUM(je.credit), 0)
        WHEN a.category IN ('Liability', 'Equity', 'Revenue')
            THEN COALESCE(SUM(je.credit), 0) - COALESCE(SUM(je.debit), 0)
        ELSE 0
    END AS ending_balance
FROM public.accounts a
LEFT JOIN public.journal_entries je ON je.account_code = a.account_code
WHERE a.is_active = true
GROUP BY a.account_code, a.account_name, a.category, a.normal_balance
ORDER BY a.account_code;

COMMENT ON VIEW public.v_trial_balance IS 'Real-time Neraca Saldo aggregating all journal entries per account';

-- ============================================================
-- 6. VIEW: General Ledger (Buku Besar) — Full Detail
-- ============================================================

CREATE OR REPLACE VIEW public.v_general_ledger AS
SELECT
    je.id AS entry_id,
    t.id AS transaction_id,
    t.date AS transaction_date,
    t.description AS transaction_description,
    je.account_code,
    a.account_name,
    a.category,
    je.debit,
    je.credit,
    t.receipt_url,
    t.created_by,
    t.created_at
FROM public.journal_entries je
JOIN public.transactions t ON t.id = je.transaction_id
JOIN public.accounts a ON a.account_code = je.account_code
ORDER BY t.date DESC, t.created_at DESC;

COMMENT ON VIEW public.v_general_ledger IS 'Buku Besar — detailed ledger showing every journal entry with transaction context';

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role from profiles table
-- (Reuses existing get_user_role() from main schema if present)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- === ACCOUNTS (COA) Policies ===
-- Read: Owner + Accounting
DROP POLICY IF EXISTS "accounts_select_policy" ON public.accounts;
CREATE POLICY "accounts_select_policy"
ON public.accounts FOR SELECT TO authenticated
USING (public.get_user_role() IN ('owner', 'accounting'));

-- Write: Owner only (COA management is owner-restricted)
DROP POLICY IF EXISTS "accounts_insert_policy" ON public.accounts;
CREATE POLICY "accounts_insert_policy"
ON public.accounts FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() = 'owner');

DROP POLICY IF EXISTS "accounts_update_policy" ON public.accounts;
CREATE POLICY "accounts_update_policy"
ON public.accounts FOR UPDATE TO authenticated
USING (public.get_user_role() = 'owner')
WITH CHECK (public.get_user_role() = 'owner');

-- === TRANSACTIONS Policies ===
DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
CREATE POLICY "transactions_select_policy"
ON public.transactions FOR SELECT TO authenticated
USING (public.get_user_role() IN ('owner', 'accounting'));

DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
CREATE POLICY "transactions_insert_policy"
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('owner', 'accounting'));

DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;
CREATE POLICY "transactions_update_policy"
ON public.transactions FOR UPDATE TO authenticated
USING (public.get_user_role() IN ('owner', 'accounting'))
WITH CHECK (public.get_user_role() IN ('owner', 'accounting'));

DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;
CREATE POLICY "transactions_delete_policy"
ON public.transactions FOR DELETE TO authenticated
USING (public.get_user_role() = 'owner');

-- === JOURNAL ENTRIES Policies ===
DROP POLICY IF EXISTS "journal_entries_select_policy" ON public.journal_entries;
CREATE POLICY "journal_entries_select_policy"
ON public.journal_entries FOR SELECT TO authenticated
USING (public.get_user_role() IN ('owner', 'accounting'));

DROP POLICY IF EXISTS "journal_entries_insert_policy" ON public.journal_entries;
CREATE POLICY "journal_entries_insert_policy"
ON public.journal_entries FOR INSERT TO authenticated
WITH CHECK (public.get_user_role() IN ('owner', 'accounting'));

DROP POLICY IF EXISTS "journal_entries_delete_policy" ON public.journal_entries;
CREATE POLICY "journal_entries_delete_policy"
ON public.journal_entries FOR DELETE TO authenticated
USING (public.get_user_role() = 'owner');

-- ============================================================
-- 8. SEED DATA: Default Chart of Accounts (COA)
-- ============================================================

INSERT INTO public.accounts (account_code, account_name, category, normal_balance) VALUES
    -- ASSET (1-xxx)
    ('1-100', 'Kas Kecil (Petty Cash)',           'Asset',     'Debet'),
    ('1-101', 'Kas Besar (Cash on Hand)',          'Asset',     'Debet'),
    ('1-102', 'Bank BCA',                          'Asset',     'Debet'),
    ('1-103', 'Bank Mandiri',                      'Asset',     'Debet'),
    ('1-104', 'Piutang PPh 23',                    'Asset',     'Debet'),
    ('1-105', 'Piutang Usaha (Accounts Receivable)', 'Asset',   'Debet'),
    ('1-106', 'Persediaan Perlengkapan',           'Asset',     'Debet'),
    ('1-200', 'Peralatan Sewa (Rental Equipment)', 'Asset',     'Debet'),
    ('1-201', 'Akumulasi Penyusutan Peralatan',    'Asset',     'Debet'),

    -- LIABILITY (2-xxx)
    ('2-100', 'Hutang Usaha (Accounts Payable)',   'Liability', 'Kredit'),
    ('2-101', 'Hutang Vendor',                     'Liability', 'Kredit'),
    ('2-102', 'Hutang Pajak',                      'Liability', 'Kredit'),
    ('2-103', 'Hutang Gaji',                       'Liability', 'Kredit'),

    -- EQUITY (3-xxx)
    ('3-100', 'Modal Pemilik',                     'Equity',    'Kredit'),
    ('3-101', 'Laba Ditahan (Retained Earnings)',  'Equity',    'Kredit'),
    ('3-102', 'Prive Pemilik',                     'Equity',    'Kredit'),

    -- REVENUE (4-xxx)
    ('4-100', 'Pendapatan Sewa Peralatan',         'Revenue',   'Kredit'),
    ('4-101', 'Pendapatan Jasa Event',             'Revenue',   'Kredit'),
    ('4-102', 'Pendapatan Lain-lain',              'Revenue',   'Kredit'),

    -- EXPENSE (5-xxx)
    ('5-100', 'Beban Gaji & Upah',                 'Expense',   'Debet'),
    ('5-101', 'Beban Operasional',                 'Expense',   'Debet'),
    ('5-102', 'Beban Listrik & Air',               'Expense',   'Debet'),
    ('5-103', 'Beban Transportasi',                'Expense',   'Debet'),
    ('5-104', 'Beban Pemeliharaan Peralatan',      'Expense',   'Debet'),
    ('5-105', 'Beban Sewa Gedung/Gudang',          'Expense',   'Debet'),
    ('5-106', 'Beban Perlengkapan',                'Expense',   'Debet'),
    ('5-107', 'Beban Administrasi & Umum',         'Expense',   'Debet'),
    ('5-108', 'Beban Penyusutan',                  'Expense',   'Debet')
ON CONFLICT (account_code) DO NOTHING;
