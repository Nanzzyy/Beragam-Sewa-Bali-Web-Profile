-- ============================================================
-- 1. ENUMS & TYPES
-- ============================================================
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('draft', 'confirmed', 'on_going', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'negotiation';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'pending_payment';

DO $$ BEGIN
    CREATE TYPE proof_type AS ENUM ('delivery', 'return');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Tabel Utama Manajemen Job / Event Rental
CREATE TABLE IF NOT EXISTS public.jobs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name       TEXT NOT NULL,
    client_phone      TEXT,
    client_email      TEXT,
    description       TEXT,
    venue             TEXT NOT NULL,
    setup_date        DATE NOT NULL,                       -- Tanggal pemasangan alat
    job_date          DATE NOT NULL,                       -- Tanggal event berlangsung
    completion_date   DATE NOT NULL,                       -- Tanggal pembongkaran/selesai
    status            job_status NOT NULL DEFAULT 'draft',
    total_rental_fee  NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_rental_fee >= 0),
    total_vendor_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_vendor_cost >= 0),
    payment_method    TEXT DEFAULT 'Cash',                 -- Cash, BCA Transfer, Tempo, dll
    cashflow_tx_id    UUID REFERENCES public.transactions(id) ON DELETE SET NULL, -- Link ke Jurnal
    created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Tabel Logistik Barang (Kombinasi Barang Internal & Sub-Sewa Vendor)
CREATE TABLE IF NOT EXISTS public.job_items (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id            UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    item_id           UUID REFERENCES public.items(id) ON DELETE SET NULL,        -- NULL jika murni barang vendor
    item_name_custom  TEXT,                                                       -- Diisi jika sewa dari vendor luar
    quantity          INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    source_vendor_id  UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,     -- Terisi jika barang outsource/sub-sewa
    sub_rent_cost     NUMERIC(15, 2) DEFAULT 0.00 CHECK (sub_rent_cost >= 0),     -- Biaya bayar ke vendor jika ada
    is_returned       BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- Tabel Penugasan Kru / Karyawan pada Job
CREATE TABLE IF NOT EXISTS public.job_staff (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id            UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    profile_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_in_job       TEXT NOT NULL,                                              -- Soundman, Driver, Helper, dll
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- Tabel Bukti Foto Lapangan (Serah Terima & Pengembalian)
CREATE TABLE IF NOT EXISTS public.job_proofs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id            UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    type              proof_type NOT NULL,                                        -- delivery / return
    photo_url         TEXT NOT NULL,                                              -- URL Supabase Storage
    uploaded_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_proofs ENABLE ROW LEVEL SECURITY;

-- Policy untuk Tabel Jobs
DROP POLICY IF EXISTS "Jobs readable by authorized roles" ON public.jobs;
CREATE POLICY "Jobs readable by authorized roles"
ON public.jobs FOR SELECT TO authenticated
USING (
  public.get_user_role() IN ('owner', 'accounting')
  OR (public.get_user_role() = 'staff')
  OR (public.get_user_role() = 'guest' AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "Jobs modifiable by owner and staff" ON public.jobs;
CREATE POLICY "Jobs modifiable by owner and staff"
ON public.jobs FOR ALL TO authenticated
USING (
  public.get_user_role() IN ('owner', 'staff')
  OR (public.get_user_role() = 'guest' AND created_by = auth.uid())
);

-- Policy untuk Tabel Job Items
DROP POLICY IF EXISTS "Job items readable by authorized roles" ON public.job_items;
CREATE POLICY "Job items readable by authorized roles"
ON public.job_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = job_items.job_id
  )
);

DROP POLICY IF EXISTS "Job items modifiable by owner and staff" ON public.job_items;
CREATE POLICY "Job items modifiable by owner and staff"
ON public.job_items FOR ALL TO authenticated
USING (
  public.get_user_role() IN ('owner', 'staff')
  OR EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = job_items.job_id AND jobs.created_by = auth.uid() AND public.get_user_role() = 'guest'
  )
);

-- Policy untuk Tabel Job Staff
DROP POLICY IF EXISTS "Job staff readable by authorized roles" ON public.job_staff;
CREATE POLICY "Job staff readable by authorized roles"
ON public.job_staff FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = job_staff.job_id
  )
);

DROP POLICY IF EXISTS "Job staff modifiable by owner and staff" ON public.job_staff;
CREATE POLICY "Job staff modifiable by owner and staff"
ON public.job_staff FOR ALL TO authenticated
USING (
  public.get_user_role() IN ('owner', 'staff')
  OR EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = job_staff.job_id AND jobs.created_by = auth.uid() AND public.get_user_role() = 'guest'
  )
);

-- Policy untuk Tabel Job Proofs
DROP POLICY IF EXISTS "Job proofs readable by authorized roles" ON public.job_proofs;
CREATE POLICY "Job proofs readable by authorized roles"
ON public.job_proofs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = job_proofs.job_id
  )
);

DROP POLICY IF EXISTS "Job proofs modifiable by owner and staff" ON public.job_proofs;
CREATE POLICY "Job proofs modifiable by owner and staff"
ON public.job_proofs FOR ALL TO authenticated
USING (
  public.get_user_role() IN ('owner', 'staff')
  OR EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = job_proofs.job_id AND jobs.created_by = auth.uid() AND public.get_user_role() = 'guest'
  )
);

-- ============================================================
-- 4. AUTOMATIC ACCOUNTING SYNC TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_completed_job_to_cashflow()
RETURNS trigger AS $$
DECLARE
    new_tx_id UUID;
    cash_account TEXT := '1-101'; -- Default: Kas Besar
    receivable_account TEXT := '1-105'; -- Piutang Usaha
    revenue_account TEXT := '4-100'; -- Pendapatan Sewa Peralatan
    expense_account TEXT := '5-101'; -- Beban Operasional / Vendor
    payable_account TEXT := '2-101'; -- Hutang Vendor
BEGIN
    -- Hanya bertindak jika status berubah menjadi 'completed' dan belum di-jurnal sebelumnya
    IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.cashflow_tx_id IS NULL THEN
        
        -- 1. Buat Header Transaksi Jurnal Baru
        INSERT INTO public.transactions (description, date, created_by)
        VALUES (
            'Jurnal Otomatis - Pendapatan Sewa Job: ' || NEW.client_name || ' (Venue: ' || NEW.venue || ')',
            NEW.job_date,
            COALESCE(NEW.created_by, auth.uid())
        ) RETURNING id INTO new_tx_id;

        -- 2. Entri Debit Jurnal (Kas/Piutang sebesar Total Biaya Sewa)
        INSERT INTO public.journal_entries (transaction_id, account_code, debit, credit)
        VALUES (
            new_tx_id,
            CASE WHEN NEW.payment_method = 'Tempo' THEN receivable_account ELSE cash_account END,
            NEW.total_rental_fee,
            0
        );

        -- 3. Entri Kredit Jurnal (Pendapatan Sewa Alat)
        INSERT INTO public.journal_entries (transaction_id, account_code, debit, credit)
        VALUES (
            new_tx_id,
            revenue_account,
            0,
            NEW.total_rental_fee
        );

        -- 4. Jurnal Tambahan untuk Biaya Vendor Outsourcing (Jika Ada)
        IF NEW.total_vendor_cost > 0 THEN
            -- Debit: Beban Operasional / Beban Vendor
            INSERT INTO public.journal_entries (transaction_id, account_code, debit, credit)
            VALUES (new_tx_id, expense_account, NEW.total_vendor_cost, 0);

            -- Kredit: Hutang Vendor / Kas
            INSERT INTO public.journal_entries (transaction_id, account_code, debit, credit)
            VALUES (
                new_tx_id, 
                CASE WHEN NEW.payment_method = 'Tempo' THEN payable_account ELSE cash_account END, 
                0, 
                NEW.total_vendor_cost
            );
        END IF;

        -- Link balik ID transaksi jurnal ke tabel jobs
        NEW.cashflow_tx_id := new_tx_id;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS tr_sync_completed_job ON public.jobs;
CREATE TRIGGER tr_sync_completed_job
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE PROCEDURE public.sync_completed_job_to_cashflow();
