class JobItem {
  final String id;
  final String jobId;
  final String? itemId;
  final String? itemNameCustom;
  final int quantity;
  final String? sourceVendorId;
  final double subRentCost;
  final bool isReturned;
  final DateTime createdAt;

  // Joined properties for simple layout displaying
  final String? internalItemName;
  final String? internalItemSku;
  final String? vendorName;

  JobItem({
    required this.id,
    required this.jobId,
    this.itemId,
    this.itemNameCustom,
    required this.quantity,
    this.sourceVendorId,
    required this.subRentCost,
    required this.isReturned,
    required this.createdAt,
    this.internalItemName,
    this.internalItemSku,
    this.vendorName,
  });

  factory JobItem.fromMap(Map<String, dynamic> map) {
    return JobItem(
      id: map['id'] ?? '',
      jobId: map['job_id'] ?? '',
      itemId: map['item_id'],
      itemNameCustom: map['item_name_custom'],
      quantity: map['quantity'] ?? 1,
      sourceVendorId: map['source_vendor_id'],
      subRentCost: (map['sub_rent_cost'] as num?)?.toDouble() ?? 0.0,
      isReturned: map['is_returned'] ?? false,
      createdAt: DateTime.parse(map['created_at'] ?? DateTime.now().toIso8601String()),
      internalItemName: map['items']?['name'],
      internalItemSku: map['items']?['sku'],
      vendorName: map['suppliers']?['name'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'job_id': jobId,
      'item_id': itemId,
      'item_name_custom': itemNameCustom,
      'quantity': quantity,
      'source_vendor_id': sourceVendorId,
      'sub_rent_cost': subRentCost,
      'is_returned': isReturned,
    };
  }
}
