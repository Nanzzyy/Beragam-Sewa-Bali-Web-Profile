import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================
// TYPE DEFINITIONS — Job/Rental Management Schema
// ============================================================

export type JobStatus = 'draft' | 'confirmed' | 'on_going' | 'completed' | 'cancelled';
export type ProofType = 'delivery' | 'return';
export type AppRole = 'owner' | 'accounting' | 'staff' | 'guest';

export interface Job {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  description: string | null;
  venue: string;
  setup_date: string;
  job_date: string;
  completion_date: string;
  status: JobStatus;
  total_rental_fee: number;
  total_vendor_cost: number;
  payment_method: string;
  cashflow_tx_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface JobItem {
  id: string;
  job_id: string;
  item_id: string | null;
  item_name_custom: string | null;
  quantity: number;
  source_vendor_id: string | null;
  sub_rent_cost: number;
  is_returned: boolean;
  created_at: string;
  // Joined fields
  item_name?: string;
  vendor_name?: string;
}

export interface JobStaff {
  id: string;
  job_id: string;
  profile_id: string;
  role_in_job: string;
  created_at: string;
  // Joined fields
  email?: string;
}

export interface JobProof {
  id: string;
  job_id: string;
  type: ProofType;
  photo_url: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  role: AppRole;
}

// ============================================================
// HELPER — Formatted currency
// ============================================================
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const JOB_STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#64748B', bg: '#64748B20' },
  confirmed: { label: 'Confirmed', color: '#3B82F6', bg: '#3B82F620' },
  on_going: { label: 'On Going', color: '#F59E0B', bg: '#F59E0B20' },
  completed: { label: 'Completed', color: '#10B981', bg: '#10B98120' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#EF444420' },
};
