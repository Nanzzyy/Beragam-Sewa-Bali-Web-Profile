import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Job, JobItem } from './supabase';
import { formatRupiah, formatDate } from './supabase';

function getCompanyConfig() {
  if (typeof window === 'undefined') {
    return {
      name: 'Beragam Sewa Bali',
      address: 'Jl. By Pass Ngurah Rai, Denpasar, Bali',
      email: 'info@beragamsewabali.com',
      phone: '08123456789',
      payment: 'Bank BCA: 1234567890 a.n Beragam Sewa Bali',
      logo: null
    };
  }
  return {
    name: localStorage.getItem('bsb_company_name') || 'Beragam Sewa Bali',
    address: localStorage.getItem('bsb_company_address') || 'Jl. By Pass Ngurah Rai, Denpasar, Bali',
    email: localStorage.getItem('bsb_company_email') || 'info@beragamsewabali.com',
    phone: localStorage.getItem('bsb_company_phone') || '08123456789',
    payment: localStorage.getItem('bsb_company_payment_info') || 'Bank BCA: 1234567890 a.n Beragam Sewa Bali',
    logo: localStorage.getItem('bsb_company_logo') || null
  };
}

export function generateSuratJalan(job: Job, items: JobItem[]) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const config = getCompanyConfig();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT JALAN', 105, 20, { align: 'center' });
  
  if (config.logo) {
    try {
      doc.addImage(config.logo, 'PNG', 14, 8, 18, 18);
    } catch (e) {
      console.error('Error rendering logo in Surat Jalan:', e);
    }
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(config.name, 105, 26, { align: 'center' });
  doc.text(config.address, 105, 31, { align: 'center' });

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

  doc.save(`Surat_Jalan_${job.client_name.replace(/\s+/g, '_')}_${job.setup_date}.pdf`);
}

export function generateInvoice(job: Job, items: JobItem[]) {
  const doc = new jsPDF();
  const config = getCompanyConfig();

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text('INVOICE', 196, 25, { align: 'right' });
  
  if (config.logo) {
    try {
      doc.addImage(config.logo, 'PNG', 14, 10, 18, 18);
    } catch (e) {
      console.error('Error rendering logo in Invoice:', e);
    }
  }

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(config.name, 14, config.logo ? 34 : 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(config.address, 14, config.logo ? 40 : 26);
  doc.text(`Email: ${config.email} | Telp: ${config.phone}`, 14, config.logo ? 45 : 31);

  const headerLineY = config.logo ? 49 : 38;
  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(14, headerLineY, 196, headerLineY);

  // Client Info
  const clientInfoY = config.logo ? 59 : 50;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Ditagihkan Kepada:', 14, clientInfoY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(job.client_name, 14, clientInfoY + 6);
  doc.text(`Venue: ${job.venue}`, 14, clientInfoY + 12);
  doc.text(`Telepon: ${job.client_phone || '-'}`, 14, clientInfoY + 18);

  // Invoice Details
  doc.setFont('helvetica', 'bold');
  doc.text('Detail Event:', 120, clientInfoY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Tgl Invoice: ${formatDate(new Date().toISOString())}`, 120, clientInfoY + 6);
  doc.text(`Tgl Event: ${formatDate(job.job_date)}`, 120, clientInfoY + 12);
  doc.text(`Status: ${job.status.toUpperCase()}`, 120, clientInfoY + 18);

  // Items Table
  const tableData = items.map((item, index) => [
    index + 1,
    item.item_name || item.item_name_custom || '-',
    item.quantity.toString()
  ]);

  autoTable(doc, {
    startY: config.logo ? 92 : 80,
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
    doc.text(config.payment, 14, finalY + 27);
  } else {
    doc.text(`Detail: ${config.payment}`, 14, finalY + 27);
  }

  // Footer Message
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Terima kasih atas kepercayaan Anda menggunakan layanan kami.', 105, finalY + 50, { align: 'center' });

  doc.save(`Invoice_${job.client_name.replace(/\s+/g, '_')}_${job.job_date}.pdf`);
}
