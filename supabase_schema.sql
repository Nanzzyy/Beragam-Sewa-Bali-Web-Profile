-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUMS AND CUSTOM TYPES
-- ==========================================
CREATE TYPE app_role AS ENUM ('owner', 'accounting', 'staff');
CREATE TYPE item_status AS ENUM ('ready', 'rented', 'maintenance', 'damaged');
CREATE TYPE cashflow_type AS ENUM ('inflow', 'outflow');
CREATE TYPE cashflow_category AS ENUM ('client_rental', 'operational_expense', 'payroll', 'supplier_payment', 'maintenance_cost');
CREATE TYPE item_category AS ENUM ('sound', 'tent', 'chairs', 'tables', 'lighting', 'decoration', 'generator', 'other');

-- ==========================================
-- 2. TABLES DEFINITIONS
-- ==========================================

-- User profiles linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'staff',
    preferences JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers Table with Soft Delete support
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Items Table with Category, status, supplier connection, and Soft Delete
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category item_category NOT NULL DEFAULT 'other',
    status item_status NOT NULL DEFAULT 'ready',
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Maintenance Records Table (connects to Items, tracks cost)
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    description TEXT,
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cost >= 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Cashflow Table (financial ledger)
CREATE TABLE IF NOT EXISTS public.cashflow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type cashflow_type NOT NULL,
    category cashflow_category NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    reference_id UUID, -- References rental invoice or maintenance record ID
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Immutable Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security helper to extract the active user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Profiles are readable by all authenticated users" 
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Profiles can only be modified by Owners" 
ON public.profiles FOR ALL TO authenticated USING (public.get_user_role() = 'owner');

-- Suppliers Policies
CREATE POLICY "Suppliers are readable by all authenticated roles" 
ON public.suppliers FOR SELECT TO authenticated USING (is_deleted = false);

CREATE POLICY "Suppliers can only be created/modified by Owners" 
ON public.suppliers FOR ALL TO authenticated USING (public.get_user_role() = 'owner');

-- Items Policies
CREATE POLICY "Items are readable by all authenticated roles" 
ON public.items FOR SELECT TO authenticated USING (is_deleted = false);

CREATE POLICY "Items can be fully managed by Owners" 
ON public.items FOR ALL TO authenticated USING (public.get_user_role() = 'owner');

CREATE POLICY "Staff can update Item status (ready/rented/damaged)" 
ON public.items FOR UPDATE TO authenticated 
USING (public.get_user_role() = 'staff') 
WITH CHECK (public.get_user_role() = 'staff');

-- Maintenance Policies
CREATE POLICY "Maintenance readable by all authenticated roles" 
ON public.maintenance_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Maintenance managed by Owners and Staff" 
ON public.maintenance_records FOR ALL TO authenticated 
USING (public.get_user_role() IN ('owner', 'staff'));

-- Cashflow Policies (Inflows/Outflows)
CREATE POLICY "Cashflow accessible by Owners and Accounting only" 
ON public.cashflow FOR ALL TO authenticated 
USING (public.get_user_role() IN ('owner', 'accounting'));

-- Audit Logs Policies
CREATE POLICY "Audit logs accessible by Owners only" 
ON public.audit_logs FOR SELECT TO authenticated 
USING (public.get_user_role() = 'owner');

-- ==========================================
-- 4. TRIGGERS & BUSINESS LOGIC
-- ==========================================

-- Trigger to automatically create profile on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, COALESCE((new.raw_user_meta_data->>'role')::app_role, 'staff'::app_role));
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to automatically insert outflow on maintenance insert
CREATE OR REPLACE FUNCTION public.log_maintenance_expense()
RETURNS trigger AS $$
BEGIN
  IF NEW.cost > 0 THEN
    INSERT INTO public.cashflow (type, category, amount, description, reference_id, created_by)
    VALUES ('outflow', 'maintenance_cost', NEW.cost, 'Auto-logged maintenance for record: ' || NEW.id, NEW.id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_log_maintenance_expense
  AFTER INSERT ON public.maintenance_records
  FOR EACH ROW EXECUTE PROCEDURE public.log_maintenance_expense();

-- Universal Audit Logging Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS trigger AS $$
DECLARE
  curr_user UUID;
  action_name TEXT;
  target_id UUID;
  old_val JSONB := null;
  new_val JSONB := null;
BEGIN
  curr_user := auth.uid();
  action_name := TG_OP;

  IF (action_name = 'DELETE') THEN
    target_id := OLD.id;
    old_val := to_jsonb(OLD);
  ELSIF (action_name = 'UPDATE') THEN
    target_id := NEW.id;
    old_val := to_jsonb(OLD);
    new_val := to_jsonb(NEW);
  ELSIF (action_name = 'INSERT') THEN
    target_id := NEW.id;
    new_val := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (curr_user, action_name, TG_TABLE_NAME, target_id, old_val, new_val);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Log triggers to target business tables
CREATE OR REPLACE TRIGGER audit_suppliers AFTER INSERT OR UPDATE OR DELETE ON public.suppliers FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();
CREATE OR REPLACE TRIGGER audit_items AFTER INSERT OR UPDATE OR DELETE ON public.items FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();
CREATE OR REPLACE TRIGGER audit_maintenance AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_records FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();
CREATE OR REPLACE TRIGGER audit_cashflow AFTER INSERT OR UPDATE OR DELETE ON public.cashflow FOR EACH ROW EXECUTE PROCEDURE public.process_audit_log();
