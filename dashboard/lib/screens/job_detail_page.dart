import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import '../models/job_model.dart';
import '../models/job_item_model.dart';
import '../models/staff_model.dart';
import '../providers/job_provider.dart';
import '../services/pdf_service.dart';
import '../services/storage_service.dart';
import '../main.dart'; // To get parseRole, AppRole

class JobDetailPage extends ConsumerStatefulWidget {
  final String jobId;
  const JobDetailPage({super.key, required this.jobId});

  @override
  ConsumerState<JobDetailPage> createState() => _JobDetailPageState();
}

class _JobDetailPageState extends ConsumerState<JobDetailPage> {
  Job? _job;
  List<JobItem> _items = [];
  List<JobStaff> _staff = [];
  List<Map<String, dynamic>> _proofs = [];
  bool _isLoading = true;
  bool _isUploading = false;
  final _currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  final _dateFormat = DateFormat('dd MMMM yyyy HH:mm', 'id_ID');

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
  void initState() {
    super.initState();
    _loadJobDetails();
  }

  Future<void> _loadJobDetails() async {
    setState(() {
      _isLoading = true;
    });

    final notifier = ref.read(jobsProvider.notifier);
    final job = await notifier.fetchJobDetails(widget.jobId);
    if (job == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Job tidak ditemukan atau akses ditolak.')),
        );
        context.go('/jobs');
      }
      return;
    }

    final items = await notifier.fetchJobItems(widget.jobId);
    final staff = await notifier.fetchJobStaff(widget.jobId);
    final proofs = await notifier.fetchJobProofs(widget.jobId);

    if (mounted) {
      setState(() {
        _job = job;
        _items = items;
        _staff = staff;
        _proofs = proofs;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleUploadProof(String type) async {
    final ImagePicker picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.camera, imageQuality: 75);

    if (image == null) return;

    setState(() {
      _isUploading = true;
    });

    try {
      final String? photoUrl = await StorageService.uploadProof(
        jobId: widget.jobId,
        type: type,
        file: image,
      );

      if (photoUrl != null) {
        final success = await ref.read(jobsProvider.notifier).addJobProof(
              jobId: widget.jobId,
              type: type,
              photoUrl: photoUrl,
            );

        if (success) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Bukti foto $type berhasil diunggah!')),
            );
          }
          await _loadJobDetails();
        } else {
          throw Exception('Gagal menyimpan record bukti ke database');
        }
      } else {
        throw Exception('Gagal mengunggah gambar ke CDN Storage');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal unggah foto: $e'), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
      }
    }
  }

  Future<void> _updateStatus(JobStatus newStatus) async {
    if (_job == null) return;

    setState(() {
      _isLoading = true;
    });

    final success = await ref.read(jobsProvider.notifier).updateJobStatus(widget.jobId, newStatus);
    if (success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status job berhasil diperbarui menjadi ${serializeJobStatus(newStatus).toUpperCase()}')),
        );
      }
      await _loadJobDetails();
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal memperbarui status job'), backgroundColor: Colors.redAccent),
        );
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.read(supabaseClientProvider).auth.currentUser;
    final role = parseRole(user?.userMetadata?['role'] as String?);

    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_job == null) {
      return const Scaffold(body: Center(child: Text('Data job tidak ditemukan.')));
    }

    final statusColor = _getStatusColor(_job!.status);
    final isSynced = _job!.cashflowTxId != null;

    // Guest security check - double guard
    if (role == AppRole.guest && _job!.createdBy != user?.id) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline, size: 64, color: Colors.redAccent),
              const SizedBox(height: 16),
              const Text('Akses Dibatasi', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Sebagai Guest, Anda hanya dapat melihat Job yang Anda buat sendiri.', style: TextStyle(color: Colors.white54)),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => context.go('/jobs'),
                child: const Text('Kembali ke Daftar Job'),
              ),
            ],
          ),
        ),
      );
    }

    final hasDeliveryProof = _proofs.any((p) => p['type'] == 'delivery');
    final hasReturnProof = _proofs.any((p) => p['type'] == 'return');

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => context.go('/jobs'),
        ),
        title: Text('Detail Job - ${_job!.clientName}'),
        actions: [
          if (role == AppRole.owner || role == AppRole.staff)
            IconButton(
              icon: const Icon(Icons.edit, color: Colors.white70),
              onPressed: () => context.go('/jobs/edit/${_job!.id}'),
            ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Banner Sync Ledger jika status COMPLETED
              if (isSynced)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 24),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withAlpha(30),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF10B981)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.sync, color: Color(0xFF10B981)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Transaksi Jurnal Tersinkronisasi Otomatis',
                              style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Transaksi double-entry dengan ID ${_job!.cashflowTxId} telah dibuat secara otomatis di Buku Besar Cashflow.',
                              style: const TextStyle(fontSize: 12, color: Colors.white70),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

              // Title and Quick Status Panel
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _job!.clientName,
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.location_on, color: statusColor, size: 18),
                          const SizedBox(width: 6),
                          Text(_job!.venue, style: const TextStyle(fontSize: 16, color: Colors.white70)),
                        ],
                      ),
                    ],
                  ),
                  // Status Dropdown / Indicator
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: statusColor.withAlpha(38),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: statusColor, width: 1.5),
                        ),
                        child: Text(
                          serializeJobStatus(_job!.status).toUpperCase(),
                          style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Dropdown untuk ganti status
                      if (role == AppRole.owner || role == AppRole.staff)
                        DropdownButton<JobStatus>(
                          value: _job!.status,
                          underline: const SizedBox(),
                          dropdownColor: const Color(0xFF1E293B),
                          items: JobStatus.values.map((status) {
                            return DropdownMenuItem(
                              value: status,
                              child: Text('Ubah ke: ${serializeJobStatus(status).toUpperCase()}', style: TextStyle(color: _getStatusColor(status), fontSize: 12)),
                            );
                          }).toList(),
                          onChanged: (status) {
                            if (status != null && status != _job!.status) {
                              _updateStatus(status);
                            }
                          },
                        ),
                    ],
                  ),
                ],
              ),
              const Divider(height: 48, color: Color(0xFF334155)),

              // Main Details Columns
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Left details (client, setup, dates, fees)
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('DETAIL PEKERJAAN & EVENT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                        const SizedBox(height: 16),
                        _DetailRow(label: 'Kontak Klien', value: '${_job!.clientPhone ?? '-'} / ${_job!.clientEmail ?? '-'}'),
                        _DetailRow(label: 'Tanggal Pemasangan (Setup)', value: DateFormat('dd MMMM yyyy').format(_job!.setupDate)),
                        _DetailRow(label: 'Tanggal Event Utama', value: DateFormat('dd MMMM yyyy').format(_job!.jobDate)),
                        _DetailRow(label: 'Tanggal Pembongkaran', value: DateFormat('dd MMMM yyyy').format(_job!.completionDate)),
                        _DetailRow(label: 'Metode Pembayaran', value: _job!.paymentMethod),
                        if (_job!.description != null && _job!.description!.isNotEmpty)
                          _DetailRow(label: 'Catatan Deskripsi', value: _job!.description!),
                        const SizedBox(height: 32),

                        // Financial Summary Section (Not visible to Guest per RBAC matrix rules!)
                        if (role != AppRole.guest) ...[
                          const Text('RINGKASAN BIAYA & LABA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                          const SizedBox(height: 16),
                          _DetailRow(label: 'Biaya Sewa Klien (Inflow)', value: _currencyFormat.format(_job!.totalRentalFee)),
                          _DetailRow(label: 'Biaya Vendor Luar (Outflow)', value: _currencyFormat.format(_job!.totalVendorCost)),
                          _DetailRow(
                            label: 'Laba Operasional Bersih',
                            value: _currencyFormat.format(_job!.totalRentalFee - _job!.totalVendorCost),
                            valueColor: (_job!.totalRentalFee - _job!.totalVendorCost) >= 0 ? const Color(0xFF10B981) : Colors.redAccent,
                          ),
                          const SizedBox(height: 32),
                        ],

                        // Document Generator PDFs (Not visible to Guest)
                        if (role != AppRole.guest) ...[
                          const Text('UNDUH DOKUMEN RESMI PDF', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              ElevatedButton.icon(
                                onPressed: () => PdfService.generateSuratJalan(job: _job!, items: _items, staff: _staff),
                                icon: const Icon(Icons.assignment),
                                label: const Text('Surat Jalan'),
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B)),
                              ),
                              const SizedBox(width: 12),
                              // Invoice is only for Owner & Accounting (No Staff)
                              if (role == AppRole.owner || role == AppRole.accounting)
                                ElevatedButton.icon(
                                  onPressed: () => PdfService.generateInvoice(job: _job!, items: _items),
                                  icon: const Icon(Icons.receipt_long),
                                  label: const Text('Invoice Tagihan'),
                                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B)),
                                ),
                            ],
                          ),
                          const SizedBox(height: 32),
                        ],

                        // Photo Proofs Upload Block
                        const Text('BUKTI FOTO SERAH TERIMA & PENGEMBALIAN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            // Proof Delivery
                            Expanded(
                              child: Container(
                                height: 160,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1E293B),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFF334155)),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.local_shipping, size: 36, color: Colors.blueAccent),
                                    const SizedBox(height: 8),
                                    const Text('Bukti Kirim (Delivery)', style: TextStyle(fontSize: 12, color: Colors.white54)),
                                    const SizedBox(height: 12),
                                    if (hasDeliveryProof)
                                      ElevatedButton.icon(
                                        onPressed: () => _viewProofImage('delivery'),
                                        icon: const Icon(Icons.image, size: 16),
                                        label: const Text('Lihat Foto', style: TextStyle(fontSize: 11)),
                                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F172A)),
                                      )
                                    else if (role == AppRole.owner || role == AppRole.staff)
                                      ElevatedButton.icon(
                                        onPressed: _isUploading ? null : () => _handleUploadProof('delivery'),
                                        icon: const Icon(Icons.camera_alt, size: 16),
                                        label: const Text('Ambil Foto', style: TextStyle(fontSize: 11)),
                                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B82F6)),
                                      )
                                    else
                                      const Text('Belum Diunggah', style: TextStyle(fontSize: 11, color: Colors.white24)),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            // Proof Return
                            Expanded(
                              child: Container(
                                height: 160,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1E293B),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFF334155)),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.settings_backup_restore, size: 36, color: Color(0xFF10B981)),
                                    const SizedBox(height: 8),
                                    const Text('Bukti Kembali (Return)', style: TextStyle(fontSize: 12, color: Colors.white54)),
                                    const SizedBox(height: 12),
                                    if (hasReturnProof)
                                      ElevatedButton.icon(
                                        onPressed: () => _viewProofImage('return'),
                                        icon: const Icon(Icons.image, size: 16),
                                        label: const Text('Lihat Foto', style: TextStyle(fontSize: 11)),
                                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F172A)),
                                      )
                                    else if (role == AppRole.owner || role == AppRole.staff)
                                      ElevatedButton.icon(
                                        onPressed: _isUploading ? null : () => _handleUploadProof('return'),
                                        icon: const Icon(Icons.camera_alt, size: 16),
                                        label: const Text('Ambil Foto', style: TextStyle(fontSize: 11)),
                                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                                      )
                                    else
                                      const Text('Belum Diunggah', style: TextStyle(fontSize: 11, color: Colors.white24)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (_isUploading) ...[
                          const SizedBox(height: 16),
                          const LinearProgressIndicator(),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 32),

                  // Right sidebar (lists: items, staff)
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Logistics List
                        const Text('LOGISTIK ALAT EVENT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                        const SizedBox(height: 16),
                        if (_items.isEmpty)
                          const Text('Belum ada logistik dialokasikan.', style: TextStyle(color: Colors.white38))
                        else
                          ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _items.length,
                            itemBuilder: (context, idx) {
                              final item = _items[idx];
                              final isInternal = item.itemId != null;
                              final name = isInternal ? (item.internalItemName ?? 'Internal Item') : (item.itemNameCustom ?? 'Vendor Item');

                              return Card(
                                color: const Color(0xFF0F172A),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                  leading: CircleAvatar(
                                    backgroundColor: const Color(0xFF1E293B),
                                    radius: 16,
                                    child: Icon(
                                      isInternal ? Icons.inventory : Icons.handyman,
                                      size: 14,
                                      color: isInternal ? const Color(0xFF10B981) : Colors.orangeAccent,
                                    ),
                                  ),
                                  title: Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  subtitle: Text(
                                    isInternal ? 'Internal • Qty: ${item.quantity}' : 'Vendor • Qty: ${item.quantity}',
                                    style: const TextStyle(fontSize: 11, color: Colors.white54),
                                  ),
                                ),
                              );
                            },
                          ),
                        const SizedBox(height: 32),

                        // Staff assignment list
                        const Text('KRU & STAFF TUGAS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                        const SizedBox(height: 16),
                        if (_staff.isEmpty)
                          const Text('Belum ada kru lapangan dialokasikan.', style: TextStyle(color: Colors.white38))
                        else
                          ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _staff.length,
                            itemBuilder: (context, idx) {
                              final member = _staff[idx];
                              return Card(
                                color: const Color(0xFF0F172A),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                  leading: const CircleAvatar(
                                    backgroundColor: Color(0xFF1E293B),
                                    radius: 16,
                                    child: Icon(Icons.person, size: 14, color: Colors.white70),
                                  ),
                                  title: Text(member.staffEmail?.split('@')[0] ?? 'Kru', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  subtitle: Text(member.roleInJob, style: const TextStyle(fontSize: 11, color: Colors.white54)),
                                ),
                              );
                            },
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _viewProofImage(String type) {
    final proof = _proofs.firstWhere((p) => p['type'] == type);
    final String url = proof['photo_url'];

    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppBar(
                backgroundColor: Colors.black,
                title: Text('Bukti Foto ${type.toUpperCase()}', style: const TextStyle(color: Colors.white)),
                leading: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ),
              Container(
                color: Colors.black,
                child: Image.network(
                  url,
                  fit: BoxFit.contain,
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return const SizedBox(
                      height: 300,
                      child: Center(child: CircularProgressIndicator()),
                    );
                  },
                  errorBuilder: (context, error, stackTrace) => const SizedBox(
                    height: 200,
                    child: Center(child: Text('Gagal memuat gambar bukti', style: TextStyle(color: Colors.white))),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _DetailRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 180,
            child: Text(label, style: const TextStyle(color: Colors.white38)),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: valueColor ?? Colors.white70,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
