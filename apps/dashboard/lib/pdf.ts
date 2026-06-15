import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Job, JobItem } from './supabase';
import { formatRupiah, formatDate } from './supabase';

export function generateSuratJalan(job: Job, items: JobItem[]) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT JALAN', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Beragam Sewa Bali', 105, 26, { align: 'center' });
  doc.text('Jl. By Pass Ngurah Rai, Bali', 105, 31, { align: 'center' });

  // Job Info
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('Informasi Pengiriman:', 14, 45);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Kepada: ${job.client_name}`, 14, 52);
  doc.text(`Venue: ${job.venue}`, 14, 58);
  doc.text(`Tanggal Setup: ${formatDate(job.setup_date)}`, 14, 64);
  doc.text(`Kontak: ${job.client_phone || '-'}`, 14, 70);

  // Table
  const tableData = items.map((item, index) => [
    index + 1,
    item.item_name || item.item_name_custom || '-',
    item.quantity.toString()
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['No', 'Nama Barang / Deskripsi', 'Qty']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105] }, // Emerald 600
  });

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  
  if (finalY + 40 > pageHeight) {
    doc.addPage();
  }

  doc.text('Penerima,', 30, finalY + 30);
  doc.text('( ........................... )', 20, finalY + 55);

  doc.text('Pengirim,', 160, finalY + 30);
  doc.text('( ........................... )', 150, finalY + 55);

  doc.save(`Surat_Jalan_${job.client_name.replace(/\\s+/g, '_')}_${job.setup_date}.pdf`);
}

export function generateInvoice(job: Job, items: JobItem[]) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text('INVOICE', 196, 25, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('Beragam Sewa Bali', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('Jl. By Pass Ngurah Rai, Denpasar, Bali', 14, 26);
  doc.text('Email: info@beragamsewabali.com', 14, 31);

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(14, 38, 196, 38);

  // Client Info
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Ditagihkan Kepada:', 14, 50);
  
  doc.setFont('helvetica', 'normal');
  doc.text(job.client_name, 14, 56);
  doc.text(`Venue: ${job.venue}`, 14, 62);
  doc.text(`Telepon: ${job.client_phone || '-'}`, 14, 68);

  // Invoice Details
  doc.setFont('helvetica', 'bold');
  doc.text('Detail Event:', 120, 50);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Tgl Invoice: ${formatDate(new Date().toISOString())}`, 120, 56);
  doc.text(`Tgl Event: ${formatDate(job.job_date)}`, 120, 62);
  doc.text(`Status: ${job.status.toUpperCase()}`, 120, 68);

  // Items Table
  const tableData = items.map((item, index) => [
    index + 1,
    item.item_name || item.item_name_custom || '-',
    item.quantity.toString()
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['No', 'Deskripsi Layanan / Sewa Alat', 'Qty']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] }, // Slate 900
    margin: { top: 10 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Biaya Sewa:', 120, finalY + 15);
  
  doc.setTextColor(5, 150, 105);
  doc.text(formatRupiah(job.total_rental_fee), 196, finalY + 15, { align: 'right' });

  // Payment Info
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Metode Pembayaran:', 14, finalY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(job.payment_method, 14, finalY + 21);

  if (job.payment_method === 'BCA Transfer') {
    doc.text('Bank BCA: 1234567890 a.n Beragam Sewa Bali', 14, finalY + 27);
  }

  // Footer Message
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Terima kasih atas kepercayaan Anda menggunakan layanan kami.', 105, finalY + 50, { align: 'center' });

  doc.save(`Invoice_${job.client_name.replace(/\\s+/g, '_')}_${job.job_date}.pdf`);
}
