-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLES DEFINITIONS
-- ==========================================

-- Custom transaction category table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('inflow', 'outflow')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (owner_id, name, type)
);

-- Financial transactions ledger table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('inflow', 'outflow')),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    description TEXT,
    receipt_url TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Categories RLS
CREATE POLICY "Allow owner full control on their categories"
ON public.categories FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Transactions RLS
CREATE POLICY "Allow owner full control on their transactions"
ON public.transactions FOR ALL TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- ==========================================
-- 3. STORAGE BUCKETS FOR RECEIPTS
-- ==========================================
-- Run via Supabase Admin Dashboard Storage:
-- Create a bucket named "receipts" (public: false) and attach the following policies:

-- CREATE POLICY "Allow owners to upload receipts"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'receipts' AND (ext.auth_uid()::text = (storage.foldername(name))[1]));

-- CREATE POLICY "Allow owners to read their own receipts"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'receipts' AND (ext.auth_uid()::text = (storage.foldername(name))[1]));
