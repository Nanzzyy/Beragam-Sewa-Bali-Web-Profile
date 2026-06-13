import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'job_provider.dart';

final suppliersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final response = await client
      .from('suppliers')
      .select('*')
      .eq('is_deleted', false)
      .order('name', ascending: true);
  return List<Map<String, dynamic>>.from(response);
});

final itemsInventoryProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final response = await client
      .from('items')
      .select('*')
      .eq('is_deleted', false)
      .order('name', ascending: true);
  return List<Map<String, dynamic>>.from(response);
});

final staffProfilesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final client = ref.watch(supabaseClientProvider);
  final response = await client
      .from('profiles')
      .select('*')
      .order('email', ascending: true);
  return List<Map<String, dynamic>>.from(response);
});
