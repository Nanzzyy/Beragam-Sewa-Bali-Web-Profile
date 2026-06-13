enum JobStatus { draft, confirmed, onGoing, completed, cancelled }

JobStatus parseJobStatus(String? status) {
  if (status == null) return JobStatus.draft;
  switch (status.toLowerCase()) {
    case 'draft':
      return JobStatus.draft;
    case 'confirmed':
      return JobStatus.confirmed;
    case 'on_going':
    case 'ongoing':
      return JobStatus.onGoing;
    case 'completed':
      return JobStatus.completed;
    case 'cancelled':
      return JobStatus.cancelled;
    default:
      return JobStatus.draft;
  }
}

String serializeJobStatus(JobStatus status) {
  switch (status) {
    case JobStatus.draft:
      return 'draft';
    case JobStatus.confirmed:
      return 'confirmed';
    case JobStatus.onGoing:
      return 'on_going';
    case JobStatus.completed:
      return 'completed';
    case JobStatus.cancelled:
      return 'cancelled';
  }
}

class Job {
  final String id;
  final String clientName;
  final String? clientPhone;
  final String? clientEmail;
  final String? description;
  final String venue;
  final DateTime setupDate;
  final DateTime jobDate;
  final DateTime completionDate;
  final JobStatus status;
  final double totalRentalFee;
  final double totalVendorCost;
  final String paymentMethod;
  final String? cashflowTxId;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  Job({
    required this.id,
    required this.clientName,
    this.clientPhone,
    this.clientEmail,
    this.description,
    required this.venue,
    required this.setupDate,
    required this.jobDate,
    required this.completionDate,
    required this.status,
    required this.totalRentalFee,
    required this.totalVendorCost,
    required this.paymentMethod,
    this.cashflowTxId,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Job.fromMap(Map<String, dynamic> map) {
    return Job(
      id: map['id'],
      clientName: map['client_name'] ?? '',
      clientPhone: map['client_phone'],
      clientEmail: map['client_email'],
      description: map['description'],
      venue: map['venue'] ?? '',
      setupDate: DateTime.parse(map['setup_date'] ?? DateTime.now().toIso8601String()),
      jobDate: DateTime.parse(map['job_date'] ?? DateTime.now().toIso8601String()),
      completionDate: DateTime.parse(map['completion_date'] ?? DateTime.now().toIso8601String()),
      status: parseJobStatus(map['status']),
      totalRentalFee: (map['total_rental_fee'] as num?)?.toDouble() ?? 0.0,
      totalVendorCost: (map['total_vendor_cost'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: map['payment_method'] ?? 'Cash',
      cashflowTxId: map['cashflow_tx_id'],
      createdBy: map['created_by'],
      createdAt: DateTime.parse(map['created_at'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(map['updated_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toMap() {
    final map = <String, dynamic>{
      'client_name': clientName,
      'client_phone': clientPhone,
      'client_email': clientEmail,
      'description': description,
      'venue': venue,
      'setup_date': setupDate.toIso8601String().split('T')[0],
      'job_date': jobDate.toIso8601String().split('T')[0],
      'completion_date': completionDate.toIso8601String().split('T')[0],
      'status': serializeJobStatus(status),
      'total_rental_fee': totalRentalFee,
      'total_vendor_cost': totalVendorCost,
      'payment_method': paymentMethod,
    };
    if (cashflowTxId != null) map['cashflow_tx_id'] = cashflowTxId;
    if (createdBy != null) map['created_by'] = createdBy;
    return map;
  }
}
