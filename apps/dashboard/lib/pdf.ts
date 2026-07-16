import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Job, JobItem } from './supabase';
import { formatRupiah, formatDate } from './supabase';
import { supabase } from './supabase';
import { defaultTemplate, type PDFTemplateLayout } from './pdf-template';

async function getBase64Image(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

export async function getCompanyConfig() {
  const defaultConfig = {
    name: 'Beragam Sewa Bali',
    address: 'Jl. By Pass Ngurah Rai, Denpasar, Bali',
    email: 'info@beragamsewabali.com',
    phone: '08123456789',
    payment: 'Bank BCA: 1234567890 a.n Beragam Sewa Bali',
    tax_name: '',
    npwp: '',
    logo: null as string | null,
    header: null as string | null,
    stamp: null as string | null,
  };

  try {
    const { data } = await supabase.from('site_content').select('*');
    if (data && data.length > 0) {
      let logoUrl = data.find(d => d.content_key === 'site_logo_dashboard')?.content_value || null;
      let headerUrl = data.find(d => d.content_key === 'site_header_image')?.content_value || null;
      let stampUrl = data.find(d => d.content_key === 'bsb_stamp_image')?.content_value || null;
      let base64Logo = null;
      let base64Header = null;
      let base64Stamp = null;
      if (logoUrl) {
        base64Logo = await getBase64Image(logoUrl);
      }
      if (headerUrl) {
        base64Header = await getBase64Image(headerUrl);
      }
      if (stampUrl) {
        base64Stamp = await getBase64Image(stampUrl);
      }
      return {
        name: data.find(d => d.content_key === 'bsb_company_name')?.content_value || defaultConfig.name,
        tax_name: data.find(d => d.content_key === 'bsb_company_tax_name')?.content_value || defaultConfig.tax_name,
        npwp: data.find(d => d.content_key === 'bsb_company_npwp')?.content_value || defaultConfig.npwp,
        address: data.find(d => d.content_key === 'bsb_company_address')?.content_value || defaultConfig.address,
        email: data.find(d => d.content_key === 'bsb_company_email')?.content_value || defaultConfig.email,
        phone: data.find(d => d.content_key === 'bsb_company_phone')?.content_value || defaultConfig.phone,
        payment: data.find(d => d.content_key === 'bsb_company_payment_info')?.content_value || defaultConfig.payment,
        logo: base64Logo,
        header: base64Header,
        stamp: base64Stamp,
      };
    }
  } catch (e) {
    console.error('Failed to fetch company config from Supabase:', e);
  }

  return defaultConfig;
}

async function getPDFTemplate(type: string): Promise<PDFTemplateLayout | null> {
  try {
    const { data } = await supabase.from('site_content')
      .select('content_value')
      .eq('content_key', `bsb_pdf_template_${type}`)
      .single();
    if (data?.content_value) {
      const t = JSON.parse(data.content_value);
      // Validate it has the right documentType
      if (t.documentType === type || t.headerImage) return t;
    }
  } catch (e) {}
  return null;
}

function drawHeaderImage(doc: jsPDF, config: any, tmpl: PDFTemplateLayout | null) {
  if (!config.header) return 0;
  const el = tmpl?.headerImage;
  if (tmpl && !el?.enabled) return 0;
  if (tmpl && el?.enabled) {
    try { doc.addImage(config.header, 'PNG', el.x, el.y, el.width, el.height); } 
    catch (e) { try { doc.addImage(config.header, 'JPEG', el.x, el.y, el.width, el.height); } catch (e2) {} }
    return 0;
  }
  try { doc.addImage(config.header, 'PNG', 0, 0, 210, 35); } 
  catch (e) { try { doc.addImage(config.header, 'JPEG', 0, 0, 210, 35); } catch (e2) {} }
  return 25;
}

function drawLogo(doc: jsPDF, config: any, tmpl: PDFTemplateLayout | null) {
  if (!config.logo) return;
  const el = tmpl?.companyLogo;
  if (tmpl && !el?.enabled) return;
  
  const x = el?.enabled ? el.x : 14;
  const y = el?.enabled ? el.y : 8;
  const w = el?.enabled ? el.width : 18;
  const h = el?.enabled ? el.height : 18;
  
  try { doc.addImage(config.logo, 'PNG', x, y, w, h); } 
  catch (e) { try { doc.addImage(config.logo, 'JPEG', x, y, w, h); } catch (e2) {} }
}

export async function generateSuratJalan(job: Job, items: JobItem[]) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const config = await getCompanyConfig();
  const tmpl = await getPDFTemplate('surat_jalan');

  const useTemplate = tmpl !== null && tmpl.headerImage && Object.keys(tmpl).length > 2;

  if (useTemplate) {
    drawHeaderImage(doc, config, tmpl);
    drawLogo(doc, config, tmpl);

    if (tmpl!.documentTitle.enabled) {
      const t = tmpl!.documentTitle;
      doc.setFontSize(t.fontSize || 20);
      doc.setFont('helvetica', 'bold');
      doc.text('SURAT JALAN', t.x, t.y, { align: 'center' });
    }

    if (tmpl!.companyInfo.enabled) {
      const c = tmpl!.companyInfo;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(config.name, c.x, c.y, { align: 'center' });
      doc.text(config.address, c.x, c.y + 5, { align: 'center' });
    }

    if (tmpl!.clientInfo.enabled) {
      const c = tmpl!.clientInfo;
      doc.setLineWidth(0.5);
      doc.line(c.x, c.y - 2, c.x + c.width, c.y - 2);
      doc.setFont('helvetica', 'bold');
      doc.text('Informasi Pengiriman:', c.x, c.y);
      doc.setFont('helvetica', 'normal');
      doc.text(`Kepada: ${job.client_name}`, c.x, c.y + 7);
      doc.text(`Venue: ${job.venue}`, c.x, c.y + 13);
      doc.text(`Tanggal Setup: ${formatDate(job.setup_date)}`, c.x, c.y + 19);
      doc.text(`Kontak: ${job.client_phone || '-'}`, c.x, c.y + 25);
    }

    if (tmpl!.itemsTable.enabled) {
      const t = tmpl!.itemsTable;
      const tableData = items.map((item, index) => [
        index + 1,
        item.item_name || item.item_name_custom || '-',
        item.quantity.toString()
      ]);
      autoTable(doc, {
        startY: t.y,
        margin: { left: t.x, right: 210 - t.x - t.width },
        head: [['No', 'Nama Barang / Deskripsi', 'Qty']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] },
        tableWidth: t.width,
      });
    }

    const tableFinalY = (doc as any).lastAutoTable?.finalY || 100;

    if (tmpl!.signatures.enabled) {
      const s = tmpl!.signatures;
      let sigY = Math.max(s.y, tableFinalY + 5);
      if (sigY + 55 > pageHeight) { doc.addPage(); sigY = 20; }
      doc.setFontSize(10);
      doc.text('Penerima,', s.x + 10, sigY + 10);
      doc.text('( ........................... )', s.x, sigY + 35);
      doc.text('Pengirim,', s.x + s.width - 30, sigY + 10);
      doc.text('( ........................... )', s.x + s.width - 50, sigY + 35);
    }
  } else {
    // Legacy mode
    let yOffset = drawHeaderImage(doc, config, null);
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SURAT JALAN', 105, 20 + yOffset, { align: 'center' });
    
    drawLogo(doc, config, null);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(config.name, 105, 26 + yOffset, { align: 'center' });
    doc.text(config.address, 105, 31 + yOffset, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 35 + yOffset, 196, 35 + yOffset);

    doc.setFont('helvetica', 'bold');
    doc.text('Informasi Pengiriman:', 14, 45 + yOffset);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kepada: ${job.client_name}`, 14, 52 + yOffset);
    doc.text(`Venue: ${job.venue}`, 14, 58 + yOffset);
    doc.text(`Tanggal Setup: ${formatDate(job.setup_date)}`, 14, 64 + yOffset);
    doc.text(`Kontak: ${job.client_phone || '-'}`, 14, 70 + yOffset);

    const tableData = items.map((item, index) => [
      index + 1,
      item.item_name || item.item_name_custom || '-',
      item.quantity.toString()
    ]);

    autoTable(doc, {
      startY: 95 + yOffset,
      head: [['No', 'Nama Barang / Deskripsi', 'Qty']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] },
    });

    let finalY = (doc as any).lastAutoTable.finalY || 100;
    if (finalY + 60 > pageHeight) { doc.addPage(); finalY = 20; }

    doc.text('Penerima,', 30, finalY + 30);
    doc.text('( ........................... )', 20, finalY + 55);
    doc.text('Pengirim,', 160, finalY + 30);
    doc.text('( ........................... )', 150, finalY + 55);
  }

  doc.save(`Surat_Jalan_${job.client_name.replace(/\s+/g, '_')}_${job.setup_date}.pdf`);
}

function terbilang(angka: number): string {
  const huruf = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];
  let hasil = '';

  if (angka < 12) {
    hasil = huruf[Math.floor(angka)];
  } else if (angka < 20) {
    hasil = terbilang(angka - 10) + ' Belas';
  } else if (angka < 100) {
    hasil = terbilang(angka / 10) + ' Puluh ' + terbilang(angka % 10);
  } else if (angka < 200) {
    hasil = 'Seratus ' + terbilang(angka - 100);
  } else if (angka < 1000) {
    hasil = terbilang(angka / 100) + ' Ratus ' + terbilang(angka % 100);
  } else if (angka < 2000) {
    hasil = 'Seribu ' + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    hasil = terbilang(angka / 1000) + ' Ribu ' + terbilang(angka % 1000);
  } else if (angka < 1000000000) {
    hasil = terbilang(angka / 1000000) + ' Juta ' + terbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    hasil = terbilang(angka / 1000000000) + ' Milyar ' + terbilang(angka % 1000000000);
  } else if (angka < 1000000000000000) {
    hasil = terbilang(angka / 1000000000000) + ' Trilyun ' + terbilang(angka % 1000000000000);
  }

  return hasil.trim();
}

function getRomanMonth(date: Date) {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][date.getMonth()];
}

async function generateDocument(doc: jsPDF, type: 'INVOICE' | 'QUOTATION' | 'KUITANSI', job: Job, items: JobItem[], config: any) {
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  
  const templateType = type === 'INVOICE' ? 'invoice' : type === 'QUOTATION' ? 'quotation' : 'receipt';
  const tmpl = await getPDFTemplate(templateType);
  const useTemplate = tmpl !== null && tmpl.headerImage && Object.keys(tmpl).length > 2;

  const packageItemsMap: Record<string, any[]> = {};
  for (const item of items) {
    if (item.is_package && item.package_id && !packageItemsMap[item.package_id]) {
      const { data } = await supabase.from('package_items').select('qty, items:item_id(name)').eq('package_id', item.package_id);
      if (data) packageItemsMap[item.package_id] = data;
    }
  }

  // Header image
  drawHeaderImage(doc, config, useTemplate ? tmpl : null);

  // Logo
  drawLogo(doc, config, useTemplate ? tmpl : null);

  // Document title
  const titleX = useTemplate && tmpl!.documentTitle.enabled ? tmpl!.documentTitle.x : 14;
  let titleY = useTemplate && tmpl!.documentTitle.enabled ? tmpl!.documentTitle.y : 0;
  
  if (!useTemplate) {
    titleY = config.logo && !config.header ? 30 : 20;
  }
  
  if (!useTemplate || tmpl!.documentTitle.enabled) {
    doc.setFontSize(useTemplate && tmpl!.documentTitle.fontSize ? tmpl!.documentTitle.fontSize : 16);
    doc.setFont('helvetica', 'bold');
    doc.text(type, titleX, titleY);
  }

  const date = new Date(job.created_at || Date.now());
  const docTypeCode = type === 'INVOICE' ? 'INV' : type === 'QUOTATION' ? 'QUO' : 'KWT';
  const docNumber = `01/BSB/${docTypeCode}/${getRomanMonth(date)}/${date.getFullYear()}`;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`NO : ${docNumber}`, 196, titleY, { align: 'right' });

  // Client info
  if (useTemplate) {
    if (tmpl!.clientInfo.enabled) {
      const c = tmpl!.clientInfo;
      const writeRow = (label: string, value: string, y: number) => {
        doc.setFont('helvetica', 'bold'); doc.text(label, c.x, y);
        doc.setFont('helvetica', 'normal'); doc.text(value || '-', c.x + 25, y, { maxWidth: c.width - 25 });
      };
      writeRow('CLIENT', job.client_name, c.y);
      writeRow('CONTACT', job.contact_person || job.client_name, c.y + 5);
      writeRow('ADDRESS', job.client_address || '-', c.y + 10);
      writeRow('EMAIL', job.client_email || '-', c.y + 15);
      writeRow('PHONE', job.client_phone || '-', c.y + 20);
      const projectName = (job.description || 'EVENT') + (job.venue ? ` / ${job.venue}` : '');
      writeRow('PROJECT', projectName, c.y + 25);
      const tglMulai = formatDate(job.job_date);
      const tglSelesai = job.completion_date ? formatDate(job.completion_date) : '';
      const eventDateRange = tglSelesai && tglSelesai !== '-' ? `${tglMulai} s/d ${tglSelesai}` : tglMulai;
      writeRow('TGL EVENT', eventDateRange, c.y + 30);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    const baseY = config.logo && !config.header ? 30 : 20;
    const lX = 14; const colonX = 37; const textX = 40;
    const writeRow = (label: string, value: string, y: number) => {
      doc.setFont('helvetica', 'bold'); doc.text(label, lX, y); doc.text(':', colonX, y);
      doc.setFont('helvetica', 'normal'); doc.text(value || '-', textX, y, { maxWidth: 65 });
    };
    writeRow('CLIENT', job.client_name, baseY);
    writeRow('CONTACT', job.contact_person || job.client_name, baseY + 5);
    writeRow('ADDRESS', job.client_address || '-', baseY + 10);
    writeRow('EMAIL', job.client_email || '-', baseY + 15);
    writeRow('PHONE', job.client_phone || '-', baseY + 20);
    const projectName = (job.description || 'EVENT') + (job.venue ? ` / ${job.venue}` : '');
    writeRow('PROJECT', projectName, baseY + 25);
    const tglMulai = formatDate(job.job_date);
    const tglSelesai = job.completion_date ? formatDate(job.completion_date) : '';
    const eventDateRange = tglSelesai && tglSelesai !== '-' ? `${tglMulai} s/d ${tglSelesai}` : tglMulai;
    writeRow('TGL EVENT', eventDateRange, baseY + 30);
  }

  // Office info
  if (useTemplate) {
    if (tmpl!.officeInfo.enabled) {
      const o = tmpl!.officeInfo;
      doc.setFont('helvetica', 'bold'); doc.text('OFFICE ADDRESS', o.x, o.y);
      doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(config.address, o.width - 5), o.x, o.y + 5);
      doc.setFont('helvetica', 'bold'); doc.text('PHONE', o.x, o.y + 15);
      doc.setFont('helvetica', 'normal'); doc.text(config.phone, o.x + 20, o.y + 15);
      doc.setFont('helvetica', 'bold'); doc.text('EMAIL', o.x, o.y + 20);
      doc.setFont('helvetica', 'normal'); doc.text(config.email, o.x + 20, o.y + 20);
      if (config.npwp) {
        doc.setFont('helvetica', 'bold'); doc.text('NPWP', o.x, o.y + 25);
        doc.setFont('helvetica', 'normal'); doc.text(config.npwp, o.x + 20, o.y + 25);
      }

      let bankName = 'BCA';
      let bankNumber = '6110252194';
      let bankOwner = 'an. Eka Sutrisna Putra';
      if (config.payment) {
        const paymentStr = config.payment;
        const bankMatch = paymentStr.match(/Bank\s+([A-Za-z0-9]+)/i);
        const numMatch = paymentStr.match(/(?:No\.?\s*Rek\.?\s*)?(\d{5,20})/i);
        const ownerMatch = paymentStr.match(/(?:a\.n\.?|\ban\.?)\s*([^,\n]+)/i);
        if (bankMatch) bankName = bankMatch[1].toUpperCase();
        if (numMatch) bankNumber = numMatch[1];
        if (ownerMatch) bankOwner = 'an. ' + ownerMatch[1].trim();
      }
      const bankY = config.npwp ? 30 : 25;
      doc.setFont('helvetica', 'bold'); doc.text('BANK ACCOUNT', o.x, o.y + bankY);
      doc.setFont('helvetica', 'normal');
      doc.text(bankName, o.x + 20, o.y + bankY);
      doc.text(bankNumber, o.x + 20, o.y + bankY + 5);
      doc.text(doc.splitTextToSize(bankOwner, o.width - 5), o.x + 20, o.y + bankY + 10);
    }
  } else {
    const rX = 110; const rColonX = 142; const rTextX = 145;
    const yOff = 0;
    doc.setFont('helvetica', 'bold'); doc.text('OFFICE ADDRESS', rX, 20 + yOff); doc.text(':', rColonX, 20 + yOff);
    doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(config.address, 55), rTextX, 20 + yOff);
    
    const rPhoneY = 30 + yOff;
    doc.setFont('helvetica', 'bold'); doc.text('PHONE', rX, rPhoneY); doc.text(':', rColonX, rPhoneY);
    doc.setFont('helvetica', 'normal'); doc.text(config.phone, rTextX, rPhoneY);
    doc.setFont('helvetica', 'bold'); doc.text('EMAIL', rX, rPhoneY + 5); doc.text(':', rColonX, rPhoneY + 5);
    doc.setFont('helvetica', 'normal'); doc.text(config.email, rTextX, rPhoneY + 5);
    if (config.npwp) {
      doc.setFont('helvetica', 'bold'); doc.text('NPWP', rX, rPhoneY + 10); doc.text(':', rColonX, rPhoneY + 10);
      doc.setFont('helvetica', 'normal'); doc.text(config.npwp, rTextX, rPhoneY + 10);
    }
    
    let bankName = 'BCA';
    let bankNumber = '6110252194';
    let bankOwner = 'an. Eka Sutrisna Putra';
    if (config.payment) {
      const paymentStr = config.payment;
      const bankMatch = paymentStr.match(/Bank\s+([A-Za-z0-9]+)/i);
      const numMatch = paymentStr.match(/(?:No\.?\s*Rek\.?\s*)?(\d{5,20})/i);
      const ownerMatch = paymentStr.match(/(?:a\.n\.?|\ban\.?)\s*([^,\n]+)/i);
      if (bankMatch) bankName = bankMatch[1].toUpperCase();
      if (numMatch) bankNumber = numMatch[1];
      if (ownerMatch) bankOwner = 'an. ' + ownerMatch[1].trim();
    }
    const bankY = config.npwp ? rPhoneY + 15 : rPhoneY + 10;
    doc.setFont('helvetica', 'bold'); doc.text('BANK ACCOUNT', rX, bankY); doc.text(':', rColonX, bankY);
    doc.setFont('helvetica', 'normal');
    doc.text(bankName, rTextX, bankY);
    doc.text(bankNumber, rTextX, bankY + 5);
    doc.text(doc.splitTextToSize(bankOwner, 60), rTextX, bankY + 10);
  }

  // Items table
  const tableData: any[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let displayName = item.item_name || item.item_name_custom || '-';
    if (item.is_package) {
      let packageInfo = `[PAKET] ${displayName}`;
      if (item.package_id && packageItemsMap[item.package_id]) {
        const details = packageItemsMap[item.package_id].map(pi => `  - ${pi.qty}x ${pi.items?.name}`).join('\n');
        if (details) packageInfo += `\n${details}`;
      }
      displayName = packageInfo;
    }
    tableData.push([
      i + 1, displayName, item.quantity.toString(),
      item.is_package ? 'pkg' : 'unit', (item.days || 1).toString(),
      item.sub_rent_cost > 0 ? new Intl.NumberFormat('id-ID').format(item.sub_rent_cost) : '-',
      item.sub_rent_cost > 0 ? new Intl.NumberFormat('id-ID').format(item.sub_rent_cost * item.quantity * (item.days || 1)) : '-'
    ]);
  }

  let tableStartY: number;
  let tableMargin: { left: number; right: number } | undefined;
  let tableWidth: number | undefined;

  if (useTemplate && tmpl!.itemsTable.enabled) {
    const t = tmpl!.itemsTable;
    tableStartY = t.y;
    tableMargin = { left: t.x, right: 210 - t.x - t.width };
    tableWidth = t.width;
  } else {
    tableStartY = titleY + 8;
    tableMargin = undefined;
    tableWidth = undefined;
  }

  autoTable(doc, {
    startY: tableStartY,
    margin: tableMargin,
    head: [['No', 'Description', 'Qty', 'Unit', 'Day', 'Unit Price (Rp)', 'Jumlah (Rp)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { cellWidth: 13, halign: 'right' },
      3: { cellWidth: 13 },
      4: { cellWidth: 10, halign: 'right' },
      5: { cellWidth: 33, halign: 'right' },
      6: { cellWidth: 33, halign: 'right' }
    },
    tableWidth: tableWidth,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const cellText = data.cell.raw as string;
        if (cellText && cellText.startsWith('[PAKET]')) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  let finalY: number;
  if (useTemplate && tmpl!.itemsTable.enabled) {
    finalY = (doc as any).lastAutoTable.finalY + 5;
  } else {
    finalY = (doc as any).lastAutoTable.finalY || 100;
    if (finalY + 100 > pageHeight) {
      doc.addPage();
      finalY = 20;
    }
  }

  let totalTagihan = job.total_rental_fee;
  let pphAmount = 0;
  if (job.pph_umkm_enabled) {
    pphAmount = job.total_rental_fee * 0.005;
    totalTagihan = job.total_rental_fee - pphAmount;
  }

  // Totals
  let totalsX: number, totalsY: number;
  if (useTemplate && tmpl!.totals.enabled) {
    totalsX = tmpl!.totals.x;
    totalsY = tmpl!.totals.y > 0 ? tmpl!.totals.y : finalY + 5;
  } else {
    totalsX = 120;
    totalsY = finalY + 10;
  }

  const rpX = totalsX + 43;
  const amtX = totalsX + 76;
  const drawTotalRow = (label: string, amount: number, y: number, prefix: string = '') => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, totalsX, y);
    if (prefix) doc.text(prefix, rpX - 5, y);
    doc.text('Rp.', rpX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Intl.NumberFormat('id-ID').format(amount), amtX, y, { align: 'right' });
  };

  drawTotalRow('Sub Total', job.total_rental_fee, totalsY);
  let currentTotalY = totalsY + 5;
  
  if (job.discount && job.discount > 0) {
    drawTotalRow('Discount', job.discount, currentTotalY, '-');
    totalTagihan -= job.discount;
    currentTotalY += 5;
  }
  
  if (job.pph_umkm_enabled) {
    drawTotalRow('PPh UMKM 0.5%', pphAmount, currentTotalY, '-');
    currentTotalY += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Total Of Payment', totalsX, currentTotalY + 5);
  doc.text('Rp.', rpX, currentTotalY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(new Intl.NumberFormat('id-ID').format(totalTagihan), amtX, currentTotalY + 5, { align: 'right' });

  // Notes
  let noteY: number;
  if (useTemplate && tmpl!.notes.enabled) {
    noteY = tmpl!.notes.y > 0 ? tmpl!.notes.y : currentTotalY + 15;
  } else {
    noteY = currentTotalY + 15;
  }

  if (!useTemplate || tmpl!.notes.enabled) {
    doc.setFont('helvetica', 'bold');
    doc.text('NOTE', 14, noteY); doc.text(':', 30, noteY); doc.text('Termin Pembayaran :', 35, noteY);
    doc.setFont('helvetica', 'normal');
    doc.text('1. Tahap 1 = 50% dari total of payment', 35, noteY + 5);
    const tahap2Text = '2. Tahap 2 = 50% dari total of payment pada Pelunasan Saat Pengiriman dan Barang sudah di cek berfungsi normal';
    const splitTahap2 = doc.splitTextToSize(tahap2Text, 160);
    doc.text(splitTahap2, 35, noteY + 10);
    const offsetAfterTahap2 = 10 + (splitTahap2.length * 4);
    doc.text('*Harga diatas Belum Termasuk Pajak', 35, noteY + offsetAfterTahap2);
  }

  // Terbilang
  let terbilangY: number;
  if (useTemplate && tmpl!.terbilang.enabled) {
    terbilangY = tmpl!.terbilang.y > 0 ? tmpl!.terbilang.y : noteY + 25;
  } else {
    terbilangY = noteY + 25;
  }

  if (!useTemplate || tmpl!.terbilang.enabled) {
    doc.setFont('helvetica', 'bold');
    doc.text('TERBILANG', 14, terbilangY); doc.text(':', 40, terbilangY);
    doc.setFont('helvetica', 'italic');
    doc.text(`( ${terbilang(totalTagihan)} Rupiah )`, 45, terbilangY, { maxWidth: 100 });
  }

  // Signatures
  let sigY: number;
  if (useTemplate && tmpl!.signatures.enabled) {
    sigY = tmpl!.signatures.y > 0 ? tmpl!.signatures.y : terbilangY + 10;
  } else {
    sigY = terbilangY + 10;
  }

  if (!useTemplate || tmpl!.signatures.enabled) {
    const currentDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Denpasar, ${currentDateStr}`, amtX, sigY, { align: 'right' });

    // Stamp
    if (useTemplate && tmpl!.stamp.enabled) {
      const s = tmpl!.stamp;
      if (config.stamp) {
        try { doc.addImage(config.stamp, 'PNG', s.x, sigY + 2, s.width, s.height); }
        catch (e) { try { doc.addImage(config.stamp, 'JPEG', s.x, sigY + 2, s.width, s.height); } catch(e2) {} }
      }
    } else if (!useTemplate && config.stamp) {
      try { doc.addImage(config.stamp, 'PNG', 162, sigY + 2, 30, 20); }
      catch (e) { try { doc.addImage(config.stamp, 'JPEG', 162, sigY + 2, 30, 20); } catch(e2) {} }
    }

    doc.setFont('helvetica', 'bold');
    doc.text(config.tax_name || config.name, amtX, sigY + 25, { align: 'right' });
    if (config.npwp) {
      doc.setFont('helvetica', 'normal');
      doc.text(`NPWP: ${config.npwp}`, amtX, sigY + 30, { align: 'right' });
    }
  }

  const docTypeCapitalized = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  doc.save(`${docTypeCapitalized}_${job.client_name.replace(/\s+/g, '_')}_${job.job_date}.pdf`);
}

export async function generateInvoice(job: Job, items: JobItem[]) {
  const doc = new jsPDF();
  const config = await getCompanyConfig();
  await generateDocument(doc, 'INVOICE', job, items, config);
}

export async function generateQuotation(job: Job, items: JobItem[]) {
  const doc = new jsPDF();
  const config = await getCompanyConfig();
  await generateDocument(doc, 'QUOTATION', job, items, config);
}

export async function generateReceipt(job: Job, items: JobItem[]) {
  const doc = new jsPDF();
  const config = await getCompanyConfig();
  await generateDocument(doc, 'KUITANSI', job, items, config);
}
