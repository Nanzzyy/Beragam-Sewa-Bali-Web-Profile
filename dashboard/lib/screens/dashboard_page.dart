import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../models/job_model.dart';
import '../providers/job_provider.dart';
import '../providers/inventory_provider.dart';
import '../main.dart'; // To get parseRole, AppRole

class DashboardOverviewPage extends ConsumerWidget {
  const DashboardOverviewPage({super.key});

  Color _getStatusColor(JobStatus status) {
    switch (status) {
      case JobStatus.draft:
        return const Color(0xFF64748B);
      case JobStatus.confirmed:
        return const Color(0xFF3B82F6);
      case JobStatus.onGoing:
        return const Color(0xFFF59E0B);
      case JobStatus.completed:
        return const Color(0xFF10B981);
      case JobStatus.cancelled:
        return const Color(0xFFEF4444);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(jobsProvider);
    final itemsAsync = ref.watch(itemsInventoryProvider);
    final user = ref.watch(supabaseClientProvider).auth.currentUser;
    final role = parseRole(user?.userMetadata?['role'] as String?);

    final currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    return Scaffold(
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome Header
              Text(
                'BSB ERP Dashboard',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 28),
              ),
              const SizedBox(height: 8),
              Text(
                'Selamat datang kembali, ${user?.email?.split('@')[0] ?? 'User'}. Peran Anda: ${role.name.toUpperCase()}',
                style: const TextStyle(color: Colors.white54),
              ),
              const SizedBox(height: 32),

              // Metrics Cards Row (RBAC restricted)
              itemsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, st) => Text('Error loading metrics: $err'),
                data: (items) {
                  return jobsAsync.when(
                    loading: () => const SizedBox(),
                    error: (err, st) => const SizedBox(),
                    data: (jobs) {
                      final totalItems = items.where((it) => it['status'] == 'ready').fold(0, (sum, it) => sum + (it['quantity'] as int));
                      final activeRents = jobs.where((j) => j.status == JobStatus.onGoing || j.status == JobStatus.confirmed).length;
                      
                      // Calculate MTD Revenue (Inflow) - Only visible to Owner / Accounting
                      double mtdRevenue = 0;
                      if (role == AppRole.owner || role == AppRole.accounting) {
                        final now = DateTime.now();
                        final thisMonthJobs = jobs.where((j) => j.status == JobStatus.completed && j.jobDate.month == now.month && j.jobDate.year == now.year);
                        mtdRevenue = thisMonthJobs.fold(0.0, (sum, j) => sum + j.totalRentalFee);
                      }

                      return Row(
                        children: [
                          Expanded(
                            child: _MetricCard(
                              title: 'Ready Stock Items',
                              value: totalItems.toString(),
                              icon: Icons.check_circle_outline_rounded,
                              color: const Color(0xFF10B981),
                            ),
                          ),
                          const SizedBox(width: 20),
                          Expanded(
                            child: _MetricCard(
                              title: 'Active Rent Outs (Confirmed/On Going)',
                              value: activeRents.toString(),
                              icon: Icons.shopping_bag_outlined,
                              color: Colors.blueAccent,
                            ),
                          ),
                          const SizedBox(width: 20),
                          // Financial metric is hidden for Staff & Guest!
                          if (role == AppRole.owner || role == AppRole.accounting)
                            Expanded(
                              child: _MetricCard(
                                title: 'Monthly Revenue (MTD)',
                                value: currencyFormat.format(mtdRevenue),
                                icon: Icons.monetization_on_outlined,
                                color: Colors.orangeAccent,
                              ),
                            )
                          else
                            const Expanded(
                              child: _MetricCard(
                                title: 'Staff Role active',
                                value: 'Operational Ready',
                                icon: Icons.engineering_outlined,
                                color: Colors.tealAccent,
                              ),
                            ),
                        ],
                      );
                    },
                  );
                },
              ),
              const SizedBox(height: 40),

              // Gantt Chart Schedule Timeline section
              const Text(
                'Event Schedule Timeline (Gantt Scheduler)',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
              ),
              const SizedBox(height: 8),
              const Text(
                'Visualisasi timeline pemasangan (Setup), pelaksanaan Event, dan pemulangan alat (Completion).',
                style: TextStyle(color: Colors.white54, fontSize: 12),
              ),
              const SizedBox(height: 16),

              jobsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, st) => Text('Gagal memuat timeline: $err'),
                data: (jobs) {
                  final activeJobs = jobs.where((j) => j.status != JobStatus.cancelled).toList();

                  if (activeJobs.isEmpty) {
                    return Container(
                      height: 120,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text('Tidak ada jadwal event aktif untuk ditampilkan.', style: TextStyle(color: Colors.white38)),
                    );
                  }

                  // 1. Calculate date ranges for the Gantt Grid
                  DateTime minDate = activeJobs.map((j) => j.setupDate).reduce((a, b) => a.isBefore(b) ? a : b);
                  DateTime maxDate = activeJobs.map((j) => j.completionDate).reduce((a, b) => a.isAfter(b) ? a : b);

                  // Padding dates by 2 days on each side for nice visual padding
                  minDate = minDate.subtract(const Duration(days: 2));
                  maxDate = maxDate.add(const Duration(days: 2));

                  final totalDays = maxDate.difference(minDate).inDays + 1;
                  const double dayWidth = 45.0;
                  const double rowHeaderWidth = 200.0;

                  return Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Column(
                      children: [
                        // Gantt Header (Dates list)
                        Row(
                          children: [
                            Container(
                              width: rowHeaderWidth,
                              padding: const EdgeInsets.all(16),
                              decoration: const BoxDecoration(
                                border: Border(
                                  right: BorderSide(color: Color(0xFF334155)),
                                  bottom: BorderSide(color: Color(0xFF334155)),
                                ),
                              ),
                              child: const Text('Daftar Job / Venue', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white54)),
                            ),
                            Expanded(
                              child: SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: SizedBox(
                                  width: totalDays * dayWidth,
                                  height: 50,
                                  child: Stack(
                                    children: List.generate(totalDays, (index) {
                                      final date = minDate.add(Duration(days: index));
                                      final isToday = DateUtils.isSameDay(date, DateTime.now());
                                      return Positioned(
                                        left: index * dayWidth,
                                        top: 0,
                                        width: dayWidth,
                                        height: 50,
                                        child: Container(
                                          alignment: Alignment.center,
                                          decoration: BoxDecoration(
                                            border: const Border(
                                              right: BorderSide(color: Color(0xFF1E293B)),
                                              bottom: BorderSide(color: Color(0xFF334155)),
                                            ),
                                            color: isToday ? const Color(0xFF10B981).withAlpha(30) : Colors.transparent,
                                          ),
                                          child: Column(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Text(DateFormat('dd').format(date), style: TextStyle(fontSize: 12, fontWeight: isToday ? FontWeight.bold : FontWeight.normal, color: isToday ? const Color(0xFF10B981) : Colors.white70)),
                                              Text(DateFormat('E').format(date).toUpperCase().substring(0, 2), style: TextStyle(fontSize: 8, color: isToday ? const Color(0xFF10B981) : Colors.white38)),
                                            ],
                                          ),
                                        ),
                                      );
                                    }),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        // Gantt Rows
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: activeJobs.length,
                          itemBuilder: (context, index) {
                            final job = activeJobs[index];
                            final statusColor = _getStatusColor(job.status);

                            // Calculate bar positions
                            final startOffset = job.setupDate.difference(minDate).inDays;
                            final duration = job.completionDate.difference(job.setupDate).inDays + 1;
                            final leftPos = startOffset * dayWidth;
                            final barWidth = duration * dayWidth;

                            return Row(
                              children: [
                                // Row Header
                                Container(
                                  width: rowHeaderWidth,
                                  height: 55,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  decoration: const BoxDecoration(
                                    border: Border(
                                      right: BorderSide(color: Color(0xFF334155)),
                                      bottom: BorderSide(color: Color(0xFF334155)),
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        job.clientName,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, overflow: TextOverflow.ellipsis),
                                      ),
                                      Text(
                                        job.venue,
                                        style: const TextStyle(fontSize: 10, color: Colors.white38, overflow: TextOverflow.ellipsis),
                                      ),
                                    ],
                                  ),
                                ),

                                // Row Scrollable Gantt Bar
                                Expanded(
                                  child: SingleChildScrollView(
                                    scrollDirection: Axis.horizontal,
                                    child: SizedBox(
                                      width: totalDays * dayWidth,
                                      height: 55,
                                      child: Stack(
                                        children: [
                                          // Background grid dividers
                                          ...List.generate(totalDays, (dayIdx) {
                                            final date = minDate.add(Duration(days: dayIdx));
                                            final isToday = DateUtils.isSameDay(date, DateTime.now());
                                            return Positioned(
                                              left: dayIdx * dayWidth,
                                              top: 0,
                                              width: dayWidth,
                                              height: 55,
                                              child: Container(
                                                decoration: BoxDecoration(
                                                  border: const Border(
                                                    right: BorderSide(color: Color(0xFF0F172A), width: 0.5),
                                                    bottom: BorderSide(color: Color(0xFF334155), width: 0.5),
                                                  ),
                                                  color: isToday ? const Color(0xFF10B981).withAlpha(10) : Colors.transparent,
                                                ),
                                              ),
                                            );
                                          }),

                                          // Gantt Bar
                                          Positioned(
                                            left: leftPos + 4,
                                            top: 12,
                                            width: barWidth - 8,
                                            height: 30,
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8),
                                              alignment: Alignment.centerLeft,
                                              decoration: BoxDecoration(
                                                color: statusColor.withAlpha(50),
                                                borderRadius: BorderRadius.circular(6),
                                                border: Border.all(color: statusColor, width: 1.5),
                                              ),
                                              child: Text(
                                                '${job.clientName} (${DateFormat('dd MMM').format(job.setupDate)} - ${DateFormat('dd MMM').format(job.completionDate)})',
                                                style: TextStyle(
                                                  color: statusColor,
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: const TextStyle(color: Colors.white54, fontSize: 14)),
                Icon(icon, color: color, size: 28),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              value,
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white, overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      ),
    );
  }
}
