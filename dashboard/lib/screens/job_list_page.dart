import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../models/job_model.dart';
import '../providers/job_provider.dart';
import '../main.dart'; // To get AppRole or parsed roles

class JobListPage extends ConsumerStatefulWidget {
  const JobListPage({super.key});

  @override
  ConsumerState<JobListPage> createState() => _JobListPageState();
}

class _JobListPageState extends ConsumerState<JobListPage> {
  String _searchQuery = '';
  JobStatus? _statusFilter;
  final _currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  Color _getStatusColor(JobStatus status) {
    switch (status) {
      case JobStatus.draft:
        return const Color(0xFF64748B); // Slate Gray
      case JobStatus.confirmed:
        return const Color(0xFF3B82F6); // Royal Blue
      case JobStatus.onGoing:
        return const Color(0xFFF59E0B); // Amber
      case JobStatus.completed:
        return const Color(0xFF10B981); // Emerald Green
      case JobStatus.cancelled:
        return const Color(0xFFEF4444); // Rose Red
    }
  }

  @override
  Widget build(BuildContext context) {
    final jobsAsync = ref.watch(jobsProvider);
    final user = ref.watch(supabaseClientProvider).auth.currentUser;
    final role = parseRole(user?.userMetadata?['role'] as String?);

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Job & Event Management',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 28),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Kelola penyewaan alat event, staf kru, bukti pengiriman, dan sinkronisasi jurnal.',
                      style: TextStyle(color: Colors.white54),
                    ),
                  ],
                ),
                if (role == AppRole.owner || role == AppRole.staff)
                  ElevatedButton.icon(
                    onPressed: () => context.go('/jobs/new'),
                    icon: const Icon(Icons.add),
                    label: const Text('Buat Job Baru'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 32),

            // Search and Filter Row
            Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Cari klien atau venue...',
                      prefixIcon: const Icon(Icons.search, color: Colors.white54),
                      fillColor: const Color(0xFF1E293B),
                      filled: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value.toLowerCase();
                      });
                    },
                  ),
                ),
                const SizedBox(width: 16),
                // Filter Dropdown
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<JobStatus?>(
                      value: _statusFilter,
                      hint: const Text('Filter Status', style: TextStyle(color: Colors.white54)),
                      dropdownColor: const Color(0xFF1E293B),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('Semua Status')),
                        ...JobStatus.values.map(
                          (status) => DropdownMenuItem(
                            value: status,
                            child: Text(serializeJobStatus(status).toUpperCase()),
                          ),
                        ),
                      ],
                      onChanged: (status) {
                        setState(() {
                          _statusFilter = status;
                        });
                      },
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Jobs List Content
            Expanded(
              child: jobsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, stack) => Center(child: Text('Gagal memuat job: $error')),
                data: (jobs) {
                  // Apply filter & search client-side
                  final filteredJobs = jobs.where((job) {
                    final matchesSearch = job.clientName.toLowerCase().contains(_searchQuery) ||
                        job.venue.toLowerCase().contains(_searchQuery);
                    final matchesStatus = _statusFilter == null || job.status == _statusFilter;
                    return matchesSearch && matchesStatus;
                  }).toList();

                  if (filteredJobs.isEmpty) {
                    return const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_late_outlined, size: 64, color: Colors.white24),
                          SizedBox(height: 16),
                          Text('Belum ada job terdaftar.', style: TextStyle(color: Colors.white54)),
                        ],
                      ),
                    );
                  }

                  return ListView.builder(
                    itemCount: filteredJobs.length,
                    itemBuilder: (context, index) {
                      final job = filteredJobs[index];
                      final statusColor = _getStatusColor(job.status);
                      final isSynced = job.cashflowTxId != null;

                      return Card(
                        margin: const EdgeInsets.symmetric(vertical: 8),
                        child: InkWell(
                          onTap: () => context.go('/jobs/${job.id}'),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Row(
                              children: [
                                // Left color bar accent
                                Container(
                                  width: 6,
                                  height: 60,
                                  decoration: BoxDecoration(
                                    color: statusColor,
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                                const SizedBox(width: 20),

                                // Main Content Block
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            job.clientName,
                                            style: const TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          // Status Badge
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: statusColor.withAlpha(38),
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(color: statusColor),
                                            ),
                                            child: Text(
                                              serializeJobStatus(job.status).toUpperCase(),
                                              style: TextStyle(
                                                color: statusColor,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          // Financial Sync Status Badge
                                          if (isSynced)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFF10B981).withAlpha(38),
                                                borderRadius: BorderRadius.circular(4),
                                                border: Border.all(color: const Color(0xFF10B981)),
                                              ),
                                              child: const Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Icon(Icons.sync_alt, color: Color(0xFF10B981), size: 10),
                                                  SizedBox(width: 4),
                                                  Text(
                                                    'JURNAL SYNC',
                                                    style: TextStyle(
                                                      color: Color(0xFF10B981),
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          const Icon(Icons.location_on_outlined, size: 16, color: Colors.white38),
                                          const SizedBox(width: 4),
                                          Text(job.venue, style: const TextStyle(color: Colors.white54)),
                                          const SizedBox(width: 16),
                                          const Icon(Icons.calendar_today_outlined, size: 16, color: Colors.white38),
                                          const SizedBox(width: 4),
                                          Text(
                                            'Event: ${DateFormat('dd MMM yyyy').format(job.jobDate)}',
                                            style: const TextStyle(color: Colors.white54),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),

                                // Cost Block & Arrow
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    const Text('Rental Fee', style: TextStyle(color: Colors.white38, fontSize: 12)),
                                    Text(
                                      _currencyFormat.format(job.totalRentalFee),
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF10B981),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Vendor Cost: ${_currencyFormat.format(job.totalVendorCost)}',
                                      style: const TextStyle(color: Colors.white38, fontSize: 11),
                                    ),
                                  ],
                                ),
                                const SizedBox(width: 16),
                                const Icon(Icons.chevron_right, color: Colors.white38),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
