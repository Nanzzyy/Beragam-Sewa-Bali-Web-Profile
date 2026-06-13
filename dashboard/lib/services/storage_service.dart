import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class StorageService {
  static final _supabase = Supabase.instance.client;

  static Future<String?> uploadProof({
    required String jobId,
    required String type, // 'delivery' or 'return'
    required XFile file,
  }) async {
    try {
      final Uint8List bytes = await file.readAsBytes();
      final String extension = file.name.split('.').last.toLowerCase();
      final String fileName = '${jobId}_${type}_proof.$extension';
      final String filePath = '$type/$fileName';

      // Upload binary bytes to 'job-proofs' bucket with upsert allowed
      await _supabase.storage.from('job-proofs').uploadBinary(
        filePath,
        bytes,
        fileOptions: FileOptions(
          upsert: true,
          contentType: 'image/$extension',
        ),
      );

      // Retrieve public CDN URL
      final String publicUrl = _supabase.storage.from('job-proofs').getPublicUrl(filePath);
      return publicUrl;
    } catch (e) {
      print('Error uploading proof to Supabase Storage: $e');
      return null;
    }
  }
}
