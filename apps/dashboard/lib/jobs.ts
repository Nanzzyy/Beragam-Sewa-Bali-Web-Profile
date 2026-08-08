/**
 * Job/Rental Management Data Access Layer
 *
 * CRUD operations for the ERP dashboard.
 * Mirrors the pattern used in cashflow/lib/accounting.ts.
 */

import { supabase, type Job, type JobEvent, type JobItem, type JobStaff, type JobProof, type JobStatus, type Profile } from './supabase';

// ============================================================
// ERROR HANDLING
// ============================================================

export class DashboardError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DashboardError';
  }
}

const isMissingJobEventsTable = (error: { code?: string } | null) => error?.code === '42P01' || error?.code === 'PGRST205';

// ============================================================
// JOBS CRUD
// ============================================================

export async function fetchJobs(options?: {
  status?: JobStatus;
  search?: string;
  limit?: number;
}): Promise<Job[]> {
  let query = supabase
    .from('jobs')
    .select('*')
    .order('job_date', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.search) {
    query = query.or(`client_name.ilike.%${options.search}%,venue.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new DashboardError(error.message, 'FETCH_JOBS_FAILED');
  const jobs = (data || []).map(j => ({
    ...j,
    total_rental_fee: Number(j.total_rental_fee),
    total_vendor_cost: Number(j.total_vendor_cost),
  }));

  if (jobs.length === 0) return jobs;
  const { data: events, error: eventsError } = await supabase
    .from('job_events')
    .select('*')
    .in('job_id', jobs.map(j => j.id))
    .order('event_number');
  if (eventsError && !isMissingJobEventsTable(eventsError)) {
    throw new DashboardError(eventsError.message, 'FETCH_JOB_EVENTS_FAILED');
  }
  return jobs.map(job => ({ ...job, events: (events || []).filter(event => event.job_id === job.id) }));
}

export async function fetchJobById(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new DashboardError(error.message, 'FETCH_JOB_FAILED');
  }
  if (!data) return null;
  const { data: events, error: eventsError } = await supabase
    .from('job_events')
    .select('*')
    .eq('job_id', id)
    .order('event_number');
  if (eventsError && !isMissingJobEventsTable(eventsError)) {
    throw new DashboardError(eventsError.message, 'FETCH_JOB_EVENTS_FAILED');
  }
  return {
    ...data,
    total_rental_fee: Number(data.total_rental_fee),
    total_vendor_cost: Number(data.total_vendor_cost),
    events: events || [],
  };
}

export async function createJob(input: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'cashflow_tx_id' | 'created_by'>): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new DashboardError('Autentikasi gagal.', 'AUTH_FAILED');

  const { data, error } = await supabase
    .from('jobs')
    .insert({ ...input, created_by: user.id })
    .select('id')
    .single();

  if (error) throw new DashboardError(error.message, 'CREATE_JOB_FAILED');
  const jobId = data!.id;

  return jobId;
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new DashboardError(error.message, 'UPDATE_JOB_FAILED');

}

export async function updateJobStatus(id: string, status: JobStatus): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new DashboardError(error.message, 'UPDATE_STATUS_FAILED');
  
  // Sync Item Statuses
  const itemStatus = status === 'on_going' ? 'rented' : 'ready';
  
  const { data: jobItems } = await supabase.from('job_items').select('item_id, is_package, package_id').eq('job_id', id);
  if (jobItems && jobItems.length > 0) {
    const itemIdsToUpdate = new Set<string>();
    
    for (const ji of jobItems) {
      if (ji.is_package && ji.package_id) {
        const { data: pkgItems } = await supabase.from('package_items').select('item_id').eq('package_id', ji.package_id);
        if (pkgItems) {
          pkgItems.forEach(p => itemIdsToUpdate.add(p.item_id));
        }
      } else if (ji.item_id) {
        itemIdsToUpdate.add(ji.item_id);
      }
    }
    
    if (itemIdsToUpdate.size > 0) {
      await supabase.from('items').update({ status: itemStatus }).in('id', Array.from(itemIdsToUpdate));
    }
  }
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw new DashboardError(error.message, 'DELETE_JOB_FAILED');
}

// ============================================================
// MULTI-DATE JOB EVENTS
// ============================================================

export type JobEventInput = Omit<JobEvent, 'id' | 'job_id' | 'created_at' | 'updated_at'>;

export async function saveJobEvents(jobId: string, events: JobEventInput[]): Promise<void> {
  const { data: existing, error: fetchError } = await supabase.from('job_events').select('id, event_number').eq('job_id', jobId);
  if (fetchError && !isMissingJobEventsTable(fetchError)) throw new DashboardError(fetchError.message, 'FETCH_JOB_EVENTS_FAILED');
  if (events.length > 0) {
    const payload = events.map((event, index) => {
      const existingEvent = (existing || []).find(row => row.event_number === index + 1);
      return {
        ...(existingEvent?.id ? { id: existingEvent.id } : {}),
        ...event,
        job_id: jobId,
        event_number: index + 1,
      };
    });
    const { error } = await supabase.from('job_events').upsert(payload, { onConflict: 'job_id,event_number' });
    if (error) throw new DashboardError(error.message, 'SAVE_JOB_EVENTS_FAILED');
  }
  const { error: deleteError } = await supabase.from('job_events').delete().eq('job_id', jobId).gt('event_number', events.length);
  if (deleteError && !isMissingJobEventsTable(deleteError)) throw new DashboardError(deleteError.message, 'DELETE_JOB_EVENTS_FAILED');
}

// ============================================================
// JOB ITEMS CRUD
// ============================================================

export async function fetchJobItems(jobId: string): Promise<JobItem[]> {
  const { data, error } = await supabase
    .from('job_items')
    .select(`
      *,
      items:item_id ( name ),
      packages:package_id ( name, package_items ( qty, items ( name ) ) ),
      suppliers:source_vendor_id ( name )
    `)
    .eq('job_id', jobId)
    .order('created_at');

  if (error) throw new DashboardError(error.message, 'FETCH_JOB_ITEMS_FAILED');
  return (data || []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as JobItem),
    sub_rent_cost: Number((row as Record<string, unknown>).sub_rent_cost),
    item_name: 
      ((row as Record<string, unknown>).packages as Record<string, unknown>)?.name as string || 
      ((row as Record<string, unknown>).items as Record<string, unknown>)?.name as string || 
      (row as Record<string, unknown>).item_name_custom as string || '',
    vendor_name: ((row as Record<string, unknown>).suppliers as Record<string, unknown>)?.name as string || '',
    package_details: ((row as Record<string, unknown>).packages as any)?.package_items || [],
  }));
}

export async function addJobItem(item: Omit<JobItem, 'id' | 'created_at' | 'item_name' | 'vendor_name'>): Promise<void> {
  const { error } = await supabase.from('job_items').insert(item);
  if (error) throw new DashboardError(error.message, 'ADD_JOB_ITEM_FAILED');
}

export async function removeJobItem(id: string): Promise<void> {
  const { error } = await supabase.from('job_items').delete().eq('id', id);
  if (error) throw new DashboardError(error.message, 'REMOVE_JOB_ITEM_FAILED');
}

export async function markItemReturned(id: string, returned: boolean): Promise<void> {
  const { error } = await supabase.from('job_items').update({ is_returned: returned }).eq('id', id);
  if (error) throw new DashboardError(error.message, 'MARK_RETURNED_FAILED');
}

// ============================================================
// JOB STAFF CRUD
// ============================================================

export async function fetchJobStaff(jobId: string): Promise<JobStaff[]> {
  const { data, error } = await supabase
    .from('job_staff')
    .select(`
      *,
      profiles:profile_id ( email, full_name )
    `)
    .eq('job_id', jobId)
    .order('created_at');

  if (error) throw new DashboardError(error.message, 'FETCH_JOB_STAFF_FAILED');
  return (data || []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as JobStaff),
    email: ((row as Record<string, unknown>).profiles as Record<string, unknown>)?.email as string || '',
    full_name: ((row as Record<string, unknown>).profiles as Record<string, unknown>)?.full_name as string || '',
  }));
}

export async function addJobStaff(staff: Omit<JobStaff, 'id' | 'created_at' | 'email'>): Promise<void> {
  const { error } = await supabase.from('job_staff').insert(staff);
  if (error) throw new DashboardError(error.message, 'ADD_JOB_STAFF_FAILED');
}

export async function removeJobStaff(id: string): Promise<void> {
  const { error } = await supabase.from('job_staff').delete().eq('id', id);
  if (error) throw new DashboardError(error.message, 'REMOVE_JOB_STAFF_FAILED');
}

// ============================================================
// JOB PROOFS CRUD
// ============================================================

export async function fetchJobProofs(jobId: string): Promise<JobProof[]> {
  const { data, error } = await supabase
    .from('job_proofs')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at');

  if (error) throw new DashboardError(error.message, 'FETCH_JOB_PROOFS_FAILED');
  return data || [];
}

export async function addJobProof(proof: Omit<JobProof, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('job_proofs').insert(proof);
  if (error) throw new DashboardError(error.message, 'ADD_JOB_PROOF_FAILED');
}

export async function deleteJobProof(id: string, photoUrl: string): Promise<void> {
  try {
    const urlParts = photoUrl.split('/job-proofs/');
    if (urlParts.length > 1) {
      const fileName = urlParts[1].split('?')[0];
      await supabase.storage.from('job-proofs').remove([fileName]);
    }
  } catch (err) {
    console.error('Failed to delete photo from storage:', err);
  }
  const { error } = await supabase.from('job_proofs').delete().eq('id', id);
  if (error) throw new DashboardError(error.message, 'DELETE_JOB_PROOF_FAILED');
}

// ============================================================
// STORAGE — Upload photo proofs
// ============================================================

export async function uploadProofPhoto(
  jobId: string,
  type: 'delivery' | 'return',
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${type}/${jobId}_${type}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('job-proofs')
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) throw new DashboardError(uploadError.message, 'UPLOAD_PROOF_FAILED');

  const { data: urlData } = supabase.storage.from('job-proofs').getPublicUrl(fileName);
  return urlData.publicUrl;
}

// ============================================================
// PROFILES — for staff assignment
// ============================================================

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('email');

  if (error) throw new DashboardError(error.message, 'FETCH_PROFILES_FAILED');
  return data || [];
}

// ============================================================
// DASHBOARD ANALYTICS
// ============================================================

export interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  totalRevenue: number;
  totalVendorCost: number;
  netProfit: number;
  jobsByStatus: Record<JobStatus, number>;
  totalInventory: number;
  totalSuppliers: number;
  cashflowIn: number;
  cashflowOut: number;
  landingPageServices: number;
  landingPagePackages: number;
  landingPageGallery: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data: jobsData, error: jobsError } = await supabase.from('jobs').select('status, total_rental_fee, total_vendor_cost');
  if (jobsError) throw new DashboardError(jobsError.message, 'FETCH_STATS_FAILED');

  const jobs = jobsData || [];
  const stats: DashboardStats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => ['draft', 'negotiation', 'confirmed', 'on_going'].includes(j.status)).length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    totalRevenue: jobs.filter(j => j.status === 'completed').reduce((s, j) => s + Number(j.total_rental_fee), 0),
    totalVendorCost: jobs.filter(j => j.status === 'completed').reduce((s, j) => s + Number(j.total_vendor_cost), 0),
    netProfit: 0,
    jobsByStatus: { draft: 0, negotiation: 0, confirmed: 0, on_going: 0, pending_payment: 0, completed: 0, cancelled: 0 },
    totalInventory: 0,
    totalSuppliers: 0,
    cashflowIn: 0,
    cashflowOut: 0,
    landingPageServices: 0,
    landingPagePackages: 0,
    landingPageGallery: 0,
  };
  stats.netProfit = stats.totalRevenue - stats.totalVendorCost;

  for (const j of jobs) {
    stats.jobsByStatus[j.status as JobStatus]++;
  }

  // Fetch Inventory Count
  try {
    const { count } = await supabase.from('items').select('*', { count: 'exact', head: true });
    stats.totalInventory = count || 0;
  } catch { /* silent */ }

  // Fetch Suppliers Count
  try {
    const { count } = await supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('is_deleted', false);
    stats.totalSuppliers = count || 0;
  } catch { /* silent */ }

  // Fetch Cashflow Stats
  try {
    const { data: cfData } = await supabase.from('cashflow').select('type, amount');
    if (cfData) {
      stats.cashflowIn = cfData.filter(c => c.type === 'inflow').reduce((s, c) => s + Number(c.amount || 0), 0);
      stats.cashflowOut = cfData.filter(c => c.type === 'outflow').reduce((s, c) => s + Number(c.amount || 0), 0);
    }
  } catch { /* silent */ }

  // Fetch Landing Page Stats (column is section_key)
  try {
    const { data: sectionData } = await supabase.from('section_images').select('section_key');
    if (sectionData) {
      stats.landingPageServices = sectionData.filter(s => s.section_key === 'service').length;
      stats.landingPagePackages = sectionData.filter(s => s.section_key === 'package').length;
      stats.landingPageGallery = sectionData.filter(s => s.section_key === 'gallery').length;
    }
  } catch { /* silent */ }

  return stats;
}
