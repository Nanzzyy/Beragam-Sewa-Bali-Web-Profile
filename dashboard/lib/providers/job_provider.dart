import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/job_model.dart';
import '../models/job_item_model.dart';
import '../models/staff_model.dart';

final supabaseClientProvider = Provider<SupabaseClient>((ref) => Supabase.instance.client);

class JobsNotifier extends AsyncNotifier<List<Job>> {
  SupabaseClient get _client => ref.read(supabaseClientProvider);

  @override
  Future<List<Job>> build() async {
    return _fetchJobsInternal();
  }

  Future<List<Job>> _fetchJobsInternal() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      return [];
    }

    final response = await _client
        .from('jobs')
        .select('*')
        .order('job_date', ascending: false);

    return (response as List).map((map) => Job.fromMap(map)).toList();
  }

  Future<void> fetchJobs() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchJobsInternal());
  }

  Future<Job?> fetchJobDetails(String jobId) async {
    try {
      final response = await _client
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();
      return Job.fromMap(response);
    } catch (e) {
      return null;
    }
  }

  Future<List<JobItem>> fetchJobItems(String jobId) async {
    try {
      final response = await _client
          .from('job_items')
          .select('*, items(*), suppliers(*)')
          .eq('job_id', jobId);
      return (response as List).map((map) => JobItem.fromMap(map)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<JobStaff>> fetchJobStaff(String jobId) async {
    try {
      final response = await _client
          .from('job_staff')
          .select('*, profiles(*)')
          .eq('job_id', jobId);
      return (response as List).map((map) => JobStaff.fromMap(map)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchJobProofs(String jobId) async {
    try {
      final response = await _client
          .from('job_proofs')
          .select('*')
          .eq('job_id', jobId);
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      return [];
    }
  }

  Future<bool> createJob({
    required Job job,
    required List<Map<String, dynamic>> items,
    required List<Map<String, dynamic>> staff,
  }) async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) return false;

      final jobMap = job.toMap();
      jobMap['created_by'] = user.id;

      final jobResponse = await _client
          .from('jobs')
          .insert(jobMap)
          .select()
          .single();

      final String newJobId = jobResponse['id'];

      if (items.isNotEmpty) {
        final itemsToInsert = items.map((item) {
          item['job_id'] = newJobId;
          return item;
        }).toList();
        await _client.from('job_items').insert(itemsToInsert);
      }

      if (staff.isNotEmpty) {
        final staffToInsert = staff.map((st) {
          st['job_id'] = newJobId;
          return st;
        }).toList();
        await _client.from('job_staff').insert(staffToInsert);
      }

      await fetchJobs();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateJob({
    required String jobId,
    required Job job,
    required List<Map<String, dynamic>> items,
    required List<Map<String, dynamic>> staff,
  }) async {
    try {
      await _client
          .from('jobs')
          .update(job.toMap())
          .eq('id', jobId);

      await _client.from('job_items').delete().eq('job_id', jobId);
      await _client.from('job_staff').delete().eq('job_id', jobId);

      if (items.isNotEmpty) {
        final itemsToInsert = items.map((item) {
          item['job_id'] = jobId;
          item.remove('id');
          return item;
        }).toList();
        await _client.from('job_items').insert(itemsToInsert);
      }

      if (staff.isNotEmpty) {
        final staffToInsert = staff.map((st) {
          st['job_id'] = jobId;
          st.remove('id');
          return st;
        }).toList();
        await _client.from('job_staff').insert(staffToInsert);
      }

      await fetchJobs();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateJobStatus(String jobId, JobStatus status) async {
    try {
      await _client
          .from('jobs')
          .update({'status': serializeJobStatus(status), 'updated_at': DateTime.now().toIso8601String()})
          .eq('id', jobId);
      await fetchJobs();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> addJobProof({
    required String jobId,
    required String type,
    required String photoUrl,
  }) async {
    try {
      final user = _client.auth.currentUser;
      await _client.from('job_proofs').insert({
        'job_id': jobId,
        'type': type,
        'photo_url': photoUrl,
        'uploaded_by': user?.id,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteJob(String jobId) async {
    try {
      await _client.from('jobs').delete().eq('id', jobId);
      await fetchJobs();
      return true;
    } catch (e) {
      return false;
    }
  }
}

final jobsProvider = AsyncNotifierProvider<JobsNotifier, List<Job>>(() {
  return JobsNotifier();
});
