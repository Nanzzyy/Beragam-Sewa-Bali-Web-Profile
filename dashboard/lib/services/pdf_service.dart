import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../models/job_model.dart';
import '../models/job_item_model.dart';
import '../models/staff_model.dart';

class PdfService {
  static final _currencyFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  static final _dateFormat = DateFormat('dd MMMM yyyy', 'id_ID');

  static Future<void> generateSuratJalan({
    required Job job,
    required List<JobItem> items,
    required List<JobStaff> staff,
  }) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Padding(
            padding: const pw.EdgeInsets.all(16),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                // Header Company
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'PT PRAVEN BALI PRODUCTION',
                          style: pw.TextStyle(
                            fontSize: 18,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColor.fromHex('#10B981'),
                          ),
                        ),
                        pw.Text('Sound System, Genset, Tenda & Bali Event Services'),
                        pw.Text('Denpasar, Bali | Email: info@beragamsewa.bali'),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text(
                          'SURAT JALAN',
                          style: pw.TextStyle(
                            fontSize: 22,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        pw.Text('No: SJ-${job.id.substring(0, 8).toUpperCase()}'),
                        pw.Text('Tanggal: ${_dateFormat.format(DateTime.now())}'),
                      ],
                    ),
                  ],
                ),
                pw.Divider(thickness: 2),
                pw.SizedBox(height: 16),

                // Job Details Info
                pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('PELANGGAN:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                          pw.Text(job.clientName),
                          if (job.clientPhone != null) pw.Text('Telp: ${job.clientPhone}'),
                          if (job.clientEmail != null) pw.Text('Email: ${job.clientEmail}'),
                        ],
                      ),
                    ),
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('DETAIL EVENT:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                          pw.Text('Venue: ${job.venue}'),
                          pw.Text('Tanggal Pasang: ${_dateFormat.format(job.setupDate)}'),
                          pw.Text('Tanggal Event: ${_dateFormat.format(job.jobDate)}'),
                          pw.Text('Tanggal Bongkar: ${_dateFormat.format(job.completionDate)}'),
                        ],
                      ),
                    ),
                  ],
                ),
                pw.SizedBox(height: 24),

                // Items Table
                pw.Text('DAFTAR BARANG BAWAKAN / LOGISTIK:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 8),
                pw.TableHelper.fromTextArray(
                  border: pw.TableBorder.all(),
                  headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                  headers: ['No', 'Nama Barang / Deskripsi', 'Jumlah', 'Sumber / Vendor'],
                  data: List<List<String>>.generate(items.length, (index) {
                    final item = items[index];
                    final String name = item.itemId != null
                        ? (item.internalItemName ?? 'Item Internal')
                        : (item.itemNameCustom ?? 'Custom Item');
                    final String source = item.itemId != null ? 'Internal' : (item.vendorName ?? 'Vendor Luar');
                    return [
                      '${index + 1}',
                      name,
                      '${item.quantity}',
                      source,
                    ];
                  }),
                ),
                pw.SizedBox(height: 24),

                // Staff Crew Penugasan
                pw.Text('KRU LAPANGAN / PENANGGUNG JAWAB:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 8),
                pw.TableHelper.fromTextArray(
                  border: pw.TableBorder.all(),
                  headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                  headers: ['No', 'Nama Staff / Email', 'Tanggung Jawab di Job'],
                  data: List<List<String>>.generate(staff.length, (index) {
                    final member = staff[index];
                    return [
                      '${index + 1}',
                      member.staffEmail ?? 'Kru Lapangan',
                      member.roleInJob,
                    ];
                  }),
                ),
                pw.Spacer(),

                // Signatures
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      children: [
                        pw.Text('Diterima Oleh (Venue/Klien)'),
                        pw.SizedBox(height: 50),
                        pw.Text('( ________________________ )'),
                      ],
                    ),
                    pw.Column(
                      children: [
                        pw.Text('Kru Penanggung Jawab'),
                        pw.SizedBox(height: 50),
                        pw.Text('( ________________________ )'),
                      ],
                    ),
                    pw.Column(
                      children: [
                        pw.Text('Mengetahui, Pimpinan BSB'),
                        pw.SizedBox(height: 50),
                        pw.Text('( ________________________ )'),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Surat_Jalan_${job.clientName.replaceAll(' ', '_')}.pdf',
    );
  }

  static Future<void> generateInvoice({
    required Job job,
    required List<JobItem> items,
  }) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Padding(
            padding: const pw.EdgeInsets.all(16),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                // Header Company
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'PT PRAVEN BALI PRODUCTION',
                          style: pw.TextStyle(
                            fontSize: 18,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColor.fromHex('#10B981'),
                          ),
                        ),
                        pw.Text('Sound System, Genset, Tenda & Bali Event Services'),
                        pw.Text('Denpasar, Bali | Email: info@beragamsewa.bali'),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text(
                          'INVOICE TAGIHAN',
                          style: pw.TextStyle(
                            fontSize: 22,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        pw.Text('No: INV-${job.id.substring(0, 8).toUpperCase()}'),
                        pw.Text('Tanggal: ${_dateFormat.format(DateTime.now())}'),
                      ],
                    ),
                  ],
                ),
                pw.Divider(thickness: 2),
                pw.SizedBox(height: 16),

                // Job Details Info
                pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('DITAGIHKAN KEPADA:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                          pw.Text(job.clientName),
                          if (job.clientPhone != null) pw.Text('Telp: ${job.clientPhone}'),
                          if (job.clientEmail != null) pw.Text('Email: ${job.clientEmail}'),
                        ],
                      ),
                    ),
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('KETERANGAN EVENT:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                          pw.Text('Venue: ${job.venue}'),
                          pw.Text('Tanggal Sewa: ${_dateFormat.format(job.jobDate)}'),
                          pw.Text('Metode Bayar: ${job.paymentMethod}'),
                        ],
                      ),
                    ),
                  ],
                ),
                pw.SizedBox(height: 24),

                // Items Table with sub cost
                pw.Text('RINCIAN SEWA BARANG:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 8),
                pw.TableHelper.fromTextArray(
                  border: pw.TableBorder.all(),
                  headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                  headers: ['No', 'Nama Barang / Deskripsi', 'Jumlah', 'Keterangan'],
                  data: List<List<String>>.generate(items.length, (index) {
                    final item = items[index];
                    final String name = item.itemId != null
                        ? (item.internalItemName ?? 'Item Internal')
                        : (item.itemNameCustom ?? 'Custom Item');
                    final String desc = item.itemId != null ? 'Inventaris internal' : 'Outsource Vendor';
                    return [
                      '${index + 1}',
                      name,
                      '${item.quantity}',
                      desc,
                    ];
                  }),
                ),
                pw.SizedBox(height: 24),

                // Financial Summary block
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text('INFORMASI PEMBAYARAN:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                        pw.Text('Transfer Bank BCA: 7720-3942-88'),
                        pw.Text('A/N: PT Praven Bali Production'),
                        pw.Text('* Harap lampirkan bukti transfer saat konfirmasi pembayaran.'),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text(
                          'TOTAL TAGIHAN:',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14),
                        ),
                        pw.Text(
                          _currencyFormat.format(job.totalRentalFee),
                          style: pw.TextStyle(
                            fontSize: 18,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColor.fromHex('#10B981'),
                          ),
                        ),
                        pw.SizedBox(height: 4),
                        pw.Text('Status Pembayaran: ${job.status == JobStatus.completed ? 'LUNAS (Sinkron Keuangan)' : 'Belum Lunas'}'),
                      ],
                    ),
                  ],
                ),
                pw.Spacer(),

                // Signatures
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.end,
                  children: [
                    pw.Column(
                      children: [
                        pw.Text('Denpasar, ${_dateFormat.format(DateTime.now())}'),
                        pw.Text('Hormat kami, PT Praven Bali Production'),
                        pw.SizedBox(height: 60),
                        pw.Text('( ________________________ )'),
                        pw.Text('Finance & Accounting Department'),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Invoice_${job.clientName.replaceAll(' ', '_')}.pdf',
    );
  }
}
