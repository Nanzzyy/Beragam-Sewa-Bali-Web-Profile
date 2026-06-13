import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../models/job_model.dart';
import '../providers/job_provider.dart';
import '../providers/inventory_provider.dart';

class JobFormPage extends ConsumerStatefulWidget {
  final String? jobId;
  const JobFormPage({super.key, this.jobId});

  @override
  ConsumerState<JobFormPage> createState() => _JobFormPageState();
}

class _JobFormPageState extends ConsumerState<JobFormPage> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isEdit = false;

  // Form Fields
  final _clientNameController = TextEditingController();
  final _clientPhoneController = TextEditingController();
  final _clientEmailController = TextEditingController();
  final _venueController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _totalRentalFeeController = TextEditingController(text: '0');
  final _totalVendorCostController = TextEditingController(text: '0');

  DateTime _setupDate = DateTime.now();
  DateTime _jobDate = DateTime.now();
  DateTime _completionDate = DateTime.now();
  JobStatus _status = JobStatus.draft;
  String _paymentMethod = 'Cash';

  // Sub-lists allocated
  final List<Map<String, dynamic>> _allocatedItems = [];
  final List<Map<String, dynamic>> _allocatedStaff = [];

  @override
  void initState() {
    super.initState();
    _isEdit = widget.jobId != null;
    if (_isEdit) {
      _loadJobData();
    }
  }

  Future<void> _loadJobData() async {
    setState(() => _isLoading = true);
    final notifier = ref.read(jobsProvider.notifier);
    final job = await notifier.fetchJobDetails(widget.jobId!);

    if (job == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal memuat detail job untuk diedit')),
        );
        context.go('/jobs');
      }
      return;
    }

    final items = await notifier.fetchJobItems(widget.jobId!);
    final staff = await notifier.fetchJobStaff(widget.jobId!);

    if (mounted) {
      setState(() {
        _clientNameController.text = job.clientName;
        _clientPhoneController.text = job.clientPhone ?? '';
        _clientEmailController.text = job.clientEmail ?? '';
        _venueController.text = job.venue;
        _descriptionController.text = job.description ?? '';
        _totalRentalFeeController.text = job.totalRentalFee.toStringAsFixed(0);
        _totalVendorCostController.text = job.totalVendorCost.toStringAsFixed(0);
        _setupDate = job.setupDate;
        _jobDate = job.jobDate;
        _completionDate = job.completionDate;
        _status = job.status;
        _paymentMethod = job.paymentMethod;

        // Map items
        for (var it in items) {
          _allocatedItems.add({
            'item_id': it.itemId,
            'item_name_custom': it.itemNameCustom,
            'quantity': it.quantity,
            'source_vendor_id': it.sourceVendorId,
            'sub_rent_cost': it.subRentCost,
            'custom_name': it.itemNameCustom ?? it.internalItemName ?? '',
          });
        }

        // Map staff
        for (var st in staff) {
          _allocatedStaff.add({
            'profile_id': st.profileId,
            'role_in_job': st.roleInJob,
            'email': st.staffEmail ?? '',
          });
        }

        _isLoading = false;
      });
    }
  }

  Future<void> _selectDate(BuildContext context, String type) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF10B981),
              onPrimary: Colors.black,
              surface: Color(0xFF1E293B),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (type == 'setup') {
          _setupDate = picked;
        } else if (type == 'job') {
          _jobDate = picked;
        } else {
          _completionDate = picked;
        }
      });
    }
  }

  void _addInventoryItem(Map<String, dynamic> item) {
    setState(() {
      _allocatedItems.add({
        'item_id': item['id'],
        'item_name_custom': null,
        'quantity': 1,
        'source_vendor_id': null,
        'sub_rent_cost': 0.0,
        'custom_name': item['name'],
      });
    });
  }

  void _addVendorItem(String name, int quantity, String vendorId, double cost, String vendorName) {
    setState(() {
      _allocatedItems.add({
        'item_id': null,
        'item_name_custom': name,
        'quantity': quantity,
        'source_vendor_id': vendorId,
        'sub_rent_cost': cost,
        'custom_name': '$name (Vendor: $vendorName)',
      });
      // Auto update total vendor cost
      double totalCost = double.tryParse(_totalVendorCostController.text) ?? 0.0;
      totalCost += (cost * quantity);
      _totalVendorCostController.text = totalCost.toStringAsFixed(0);
    });
  }

  void _addStaffMember(String profileId, String email, String roleInJob) {
    setState(() {
      _allocatedStaff.add({
        'profile_id': profileId,
        'role_in_job': roleInJob,
        'email': email,
      });
    });
  }

  Future<void> _saveForm() async {
    if (!_formKey.currentState!.validate()) return;

    // Date logic verification
    if (_setupDate.isAfter(_jobDate)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tanggal pasang (Setup) tidak boleh setelah tanggal Event utama!'), backgroundColor: Colors.redAccent),
      );
      return;
    }
    if (_jobDate.isAfter(_completionDate)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tanggal bongkar (Completion) tidak boleh sebelum tanggal Event utama!'), backgroundColor: Colors.redAccent),
      );
      return;
    }

    setState(() => _isLoading = true);

    final job = Job(
      id: widget.jobId ?? '',
      clientName: _clientNameController.text.trim(),
      clientPhone: _clientPhoneController.text.trim().isEmpty ? null : _clientPhoneController.text.trim(),
      clientEmail: _clientEmailController.text.trim().isEmpty ? null : _clientEmailController.text.trim(),
      description: _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
      venue: _venueController.text.trim(),
      setupDate: _setupDate,
      jobDate: _jobDate,
      completionDate: _completionDate,
      status: _status,
      totalRentalFee: double.tryParse(_totalRentalFeeController.text) ?? 0.0,
      totalVendorCost: double.tryParse(_totalVendorCostController.text) ?? 0.0,
      paymentMethod: _paymentMethod,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    final notifier = ref.read(jobsProvider.notifier);
    bool success;

    if (_isEdit) {
      success = await notifier.updateJob(
        jobId: widget.jobId!,
        job: job,
        items: _allocatedItems,
        staff: _allocatedStaff,
      );
    } else {
      success = await notifier.createJob(
        job: job,
        items: _allocatedItems,
        staff: _allocatedStaff,
      );
    }

    if (mounted) {
      setState(() => _isLoading = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_isEdit ? 'Job berhasil diperbarui!' : 'Job berhasil disimpan!')),
        );
        context.go('/jobs');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal menyimpan job'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final itemsAsync = ref.watch(itemsInventoryProvider);
    final suppliersAsync = ref.watch(suppliersProvider);
    final staffAsync = ref.watch(staffProfilesProvider);

    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Job / Event' : 'Buat Job Baru'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => context.go('/jobs'),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Form(
            key: _formKey,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Left Panel: Form Details
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('INFORMASI DETAIL EVENT & CLIENT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _clientNameController,
                        decoration: const InputDecoration(labelText: 'Nama Klien *', border: OutlineInputBorder()),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Nama klien wajib diisi' : null,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _clientPhoneController,
                              decoration: const InputDecoration(labelText: 'No. Telp Klien', border: OutlineInputBorder()),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: TextFormField(
                              controller: _clientEmailController,
                              decoration: const InputDecoration(labelText: 'Email Klien', border: OutlineInputBorder()),
                              keyboardType: TextInputType.emailAddress,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _venueController,
                        decoration: const InputDecoration(labelText: 'Nama Venue / Lokasi *', border: OutlineInputBorder()),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Lokasi venue wajib diisi' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _descriptionController,
                        decoration: const InputDecoration(labelText: 'Catatan Deskripsi Tambahan', border: OutlineInputBorder()),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 32),

                      // Date Panel
                      const Text('JADWAL DAN TANGGAL OPERASIONAL', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: _DateTile(
                              label: 'Tanggal Setup',
                              date: _setupDate,
                              onTap: () => _selectDate(context, 'setup'),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _DateTile(
                              label: 'Tanggal Event',
                              date: _jobDate,
                              onTap: () => _selectDate(context, 'job'),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _DateTile(
                              label: 'Tanggal Selesai',
                              date: _completionDate,
                              onTap: () => _selectDate(context, 'complete'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),

                      // Financial Details
                      const Text('BIAYA DAN METODE PEMBAYARAN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _totalRentalFeeController,
                              decoration: const InputDecoration(labelText: 'Total Biaya Sewa Klien (Rp) *', border: OutlineInputBorder()),
                              keyboardType: TextInputType.number,
                              validator: (value) => value == null || double.tryParse(value) == null ? 'Nilai tidak valid' : null,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: TextFormField(
                              controller: _totalVendorCostController,
                              decoration: const InputDecoration(labelText: 'Total Biaya Vendor Outsourcing (Rp) *', border: OutlineInputBorder()),
                              keyboardType: TextInputType.number,
                              validator: (value) => value == null || double.tryParse(value) == null ? 'Nilai tidak valid' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _paymentMethod,
                              decoration: const InputDecoration(labelText: 'Metode Pembayaran *', border: OutlineInputBorder()),
                              items: const [
                                DropdownMenuItem(value: 'Cash', child: Text('Cash (Tunai)')),
                                DropdownMenuItem(value: 'BCA Transfer', child: Text('BCA Transfer')),
                                DropdownMenuItem(value: 'Tempo', child: Text('Tempo (Piutang)')),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _paymentMethod = val);
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: DropdownButtonFormField<JobStatus>(
                              value: _status,
                              decoration: const InputDecoration(labelText: 'Status Job Awal *', border: OutlineInputBorder()),
                              items: JobStatus.values.map((s) {
                                return DropdownMenuItem(
                                  value: s,
                                  child: Text(serializeJobStatus(s).toUpperCase()),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _status = val);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 48),

                      ElevatedButton(
                        onPressed: _saveForm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text(_isEdit ? 'PERBARUI JOB' : 'SIMPAN JOB BARU', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 48),

                // Right Panel: Items and Staff Allocation tables
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Items Section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('LOGISTIK ALAT EVENT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                          IconButton(
                            icon: const Icon(Icons.add_circle, color: Color(0xFF10B981)),
                            onPressed: () => _showAddItemsDialog(itemsAsync, suppliersAsync),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Container(
                        constraints: const BoxConstraints(maxHeight: 220),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: _allocatedItems.isEmpty
                            ? const Padding(padding: EdgeInsets.all(16), child: Text('Belum ada logistik yang ditambahkan.', style: TextStyle(color: Colors.white38)))
                            : ListView.builder(
                                shrinkWrap: true,
                                itemCount: _allocatedItems.length,
                                itemBuilder: (context, idx) {
                                  final item = _allocatedItems[idx];
                                  return ListTile(
                                    dense: true,
                                    title: Text(item['custom_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    subtitle: Text('Qty: ${item['quantity']} • Cost: Rp ${item['sub_rent_cost']}'),
                                    trailing: IconButton(
                                      icon: const Icon(Icons.delete, color: Colors.redAccent, size: 18),
                                      onPressed: () {
                                        setState(() {
                                          _allocatedItems.removeAt(idx);
                                        });
                                      },
                                    ),
                                  );
                                },
                              ),
                      ),
                      const SizedBox(height: 32),

                      // Crew Section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('KRU & STAFF TUGAS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                          IconButton(
                            icon: const Icon(Icons.person_add, color: Color(0xFF10B981)),
                            onPressed: () => _showAddStaffDialog(staffAsync),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Container(
                        constraints: const BoxConstraints(maxHeight: 220),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: _allocatedStaff.isEmpty
                            ? const Padding(padding: EdgeInsets.all(16), child: Text('Belum ada kru penugasan yang ditambahkan.', style: TextStyle(color: Colors.white38)))
                            : ListView.builder(
                                shrinkWrap: true,
                                itemCount: _allocatedStaff.length,
                                itemBuilder: (context, idx) {
                                  final st = _allocatedStaff[idx];
                                  return ListTile(
                                    dense: true,
                                    title: Text(st['email'].split('@')[0], style: const TextStyle(fontWeight: FontWeight.bold)),
                                    subtitle: Text('Peran: ${st['role_in_job']}'),
                                    trailing: IconButton(
                                      icon: const Icon(Icons.delete, color: Colors.redAccent, size: 18),
                                      onPressed: () {
                                        setState(() {
                                          _allocatedStaff.removeAt(idx);
                                        });
                                      },
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showAddItemsDialog(AsyncValue<List<Map<String, dynamic>>> itemsAsync, AsyncValue<List<Map<String, dynamic>>> suppliersAsync) {
    showDialog(
      context: context,
      builder: (ctx) {
        return DefaultTabController(
          length: 2,
          child: AlertDialog(
            backgroundColor: const Color(0xFF1E293B),
            title: const Text('Tambah Logistik / Barang'),
            content: SizedBox(
              width: 500,
              height: 400,
              child: Column(
                children: [
                  const TabBar(
                    indicatorColor: Color(0xFF10B981),
                    labelColor: Color(0xFF10B981),
                    tabs: [
                      Tab(text: 'Stok Internal BSB'),
                      Tab(text: 'Sewa Vendor Luar'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: TabBarView(
                      children: [
                        // Tab 1: Internal Stock
                        itemsAsync.when(
                          loading: () => const Center(child: CircularProgressIndicator()),
                          error: (err, st) => Text('Gagal memuat barang: $err'),
                          data: (items) {
                            return ListView.builder(
                              itemCount: items.length,
                              itemBuilder: (context, idx) {
                                final it = items[idx];
                                return ListTile(
                                  title: Text(it['name'] ?? ''),
                                  subtitle: Text('SKU: ${it['sku']} • Stok: ${it['quantity']}'),
                                  trailing: const Icon(Icons.add, color: Color(0xFF10B981)),
                                  onTap: () {
                                    _addInventoryItem(it);
                                    Navigator.pop(ctx);
                                  },
                                );
                              },
                            );
                          },
                        ),
                        // Tab 2: Vendor sub-rent
                        _VendorItemForm(
                          suppliersAsync: suppliersAsync,
                          onSubmit: (name, qty, vendorId, cost, vendorName) {
                            _addVendorItem(name, qty, vendorId, cost, vendorName);
                            Navigator.pop(ctx);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showAddStaffDialog(AsyncValue<List<Map<String, dynamic>>> staffAsync) {
    showDialog(
      context: context,
      builder: (ctx) {
        final roleController = TextEditingController(text: 'Helper');
        String? selectedProfileId;
        String? selectedEmail;

        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: const Text('Tugaskan Kru Baru'),
          content: staffAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, st) => Text('Gagal memuat staff: $err'),
            data: (profiles) {
              return StatefulBuilder(
                builder: (context, setDialogState) {
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DropdownButtonFormField<String>(
                        decoration: const InputDecoration(labelText: 'Pilih Staff *'),
                        dropdownColor: const Color(0xFF1E293B),
                        items: profiles.map<DropdownMenuItem<String>>((p) {
                          return DropdownMenuItem<String>(
                            value: p['id'] as String,
                            child: Text(p['email'] ?? ''),
                          );
                        }).toList(),
                        onChanged: (id) {
                          final p = profiles.firstWhere((p) => p['id'] == id);
                          setDialogState(() {
                            selectedProfileId = id;
                            selectedEmail = p['email'];
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: roleController,
                        decoration: const InputDecoration(labelText: 'Peran / Tanggung Jawab *'),
                      ),
                    ],
                  );
                },
              );
            },
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            ElevatedButton(
              onPressed: () {
                if (selectedProfileId != null && selectedEmail != null) {
                  _addStaffMember(selectedProfileId!, selectedEmail!, roleController.text.trim());
                  Navigator.pop(ctx);
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.black),
              child: const Text('Tugaskan'),
            ),
          ],
        );
      },
    );
  }
}

class _DateTile extends StatelessWidget {
  final String label;
  final DateTime date;
  final VoidCallback onTap;

  const _DateTile({
    required this.label,
    required this.date,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.white38)),
            const SizedBox(height: 8),
            Text(
              DateFormat('dd/MM/yyyy').format(date),
              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}

class _VendorItemForm extends StatefulWidget {
  final AsyncValue<List<Map<String, dynamic>>> suppliersAsync;
  final Function(String name, int quantity, String vendorId, double cost, String vendorName) onSubmit;

  const _VendorItemForm({
    required this.suppliersAsync,
    required this.onSubmit,
  });

  @override
  State<_VendorItemForm> createState() => _VendorItemFormState();
}

class _VendorItemFormState extends State<_VendorItemForm> {
  final _nameController = TextEditingController();
  final _qtyController = TextEditingController(text: '1');
  final _costController = TextEditingController(text: '0');
  String? _selectedVendorId;
  String? _selectedVendorName;

  @override
  Widget build(BuildContext context) {
    return widget.suppliersAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, st) => Text('Gagal memuat supplier: $err'),
      data: (suppliers) {
        return SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(labelText: 'Pilih Supplier Vendor *'),
                dropdownColor: const Color(0xFF1E293B),
                items: suppliers.map((s) {
                  return DropdownMenuItem(value: s['id'].toString(), child: Text(s['name']));
                }).toList(),
                onChanged: (id) {
                  final s = suppliers.firstWhere((s) => s['id'] == id);
                  setState(() {
                    _selectedVendorId = id;
                    _selectedVendorName = s['name'];
                  });
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nama Barang *'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _qtyController,
                      decoration: const InputDecoration(labelText: 'Jumlah *'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _costController,
                      decoration: const InputDecoration(labelText: 'Biaya Sewa Vendor (Rp) *'),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  if (_nameController.text.trim().isNotEmpty &&
                      _selectedVendorId != null &&
                      _selectedVendorName != null) {
                    final qty = int.tryParse(_qtyController.text) ?? 1;
                    final cost = double.tryParse(_costController.text) ?? 0.0;
                    widget.onSubmit(
                      _nameController.text.trim(),
                      qty,
                      _selectedVendorId!,
                      cost,
                      _selectedVendorName!,
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.black,
                  minimumSize: const Size(double.infinity, 50),
                ),
                child: const Text('Tambahkan Barang Vendor', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }
}
