class JobStaff {
  final String id;
  final String jobId;
  final String profileId;
  final String roleInJob;
  final DateTime createdAt;

  // Joined properties
  final String? staffEmail;
  final String? staffRole;

  JobStaff({
    required this.id,
    required this.jobId,
    required this.profileId,
    required this.roleInJob,
    required this.createdAt,
    this.staffEmail,
    this.staffRole,
  });

  factory JobStaff.fromMap(Map<String, dynamic> map) {
    return JobStaff(
      id: map['id'] ?? '',
      jobId: map['job_id'] ?? '',
      profileId: map['profile_id'] ?? '',
      roleInJob: map['role_in_job'] ?? '',
      createdAt: DateTime.parse(map['created_at'] ?? DateTime.now().toIso8601String()),
      staffEmail: map['profiles']?['email'],
      staffRole: map['profiles']?['role'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'job_id': jobId,
      'profile_id': profileId,
      'role_in_job': roleInJob,
    };
  }
}
