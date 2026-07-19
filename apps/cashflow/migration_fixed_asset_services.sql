-- ============================================================
--  Riwayat Service Aktiva Tetap + Link ke Inventaris Dashboard
--  Additif only (ALTER ADD COLUMN + CREATE TABLE + RLS).
--  Aman dijalankan ulang (IF NOT EXISTS).
-- ============================================================

-- Link opsional aktiva tetap -> item inventaris dashboard (tabel public.items)
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.items(id);

-- Log riwayat service per aktiva tetap
CREATE TABLE IF NOT EXISTS public.fixed_asset_services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixed_asset_id uuid NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  cost numeric(15,2) NOT NULL DEFAULT 0,
  technician text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fa_services_asset ON public.fixed_asset_services(fixed_asset_id);

-- RLS: mirror policy fixed_assets (owner & accounting)
ALTER TABLE public.fixed_asset_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY fixed_asset_services_select_policy ON public.fixed_asset_services
  FOR SELECT USING (get_user_role() = ANY (ARRAY['owner'::app_role, 'accounting'::app_role]));
CREATE POLICY fixed_asset_services_insert_policy ON public.fixed_asset_services
  FOR INSERT WITH CHECK (get_user_role() = ANY (ARRAY['owner'::app_role, 'accounting'::app_role]));
CREATE POLICY fixed_asset_services_update_policy ON public.fixed_asset_services
  FOR UPDATE USING (get_user_role() = ANY (ARRAY['owner'::app_role, 'accounting'::app_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['owner'::app_role, 'accounting'::app_role]));
CREATE POLICY fixed_asset_services_delete_policy ON public.fixed_asset_services
  FOR DELETE USING (get_user_role() = ANY (ARRAY['owner'::app_role, 'accounting'::app_role]));
