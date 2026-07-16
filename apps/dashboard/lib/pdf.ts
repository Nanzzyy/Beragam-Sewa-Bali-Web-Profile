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
      if (logoUrl) base64Logo = await getBase64Image(logoUrl);
      if (headerUrl) base64Header = await getBase64Image(headerUrl);
      if (stampUrl) base64Stamp = await getBase64Image(stampUrl);
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
  } catch (e) {}

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
      if (t.documentType === type || t.headerImage) return t;
    }
  } catch (e) {}
  return null;
}

function drawImage(doc: jsPDF, img: string | null, el: any) {
  if (!img || !el || !el.enabled) return 0;
  try { doc.addImage(img, 'PNG', el.x, el.y, el.width, el.height); return el.y + el.height; }
  catch (e) { try { doc.addImage(img, 'JPEG', el.x, el.y, el.width, el.height); return el.y + el.height; } catch (e2) {} }
  return 0;
}

function terbilang(angka: number): string {
  const h = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan','Sepuluh','Sebelas'];
  let r = '';
  if (angka < 12) r = h[Math.floor(angka)];
  else if (angka < 20) r = terbilang(angka-10)+' Belas';
  else if (angka < 100) r = terbilang(angka/10)+' Puluh '+terbilang(angka%10);
  else if (angka < 200) r = 'Seratus '+terbilang(angka-100);
  else if (angka < 1000) r = terbilang(angka/100)+' Ratus '+terbilang(angka%100);
  else if (angka < 2000) r = 'Seribu '+terbilang(angka-1000);
  else if (angka < 1000000) r = terbilang(angka/1000)+' Ribu '+terbilang(angka%1000);
  else if (angka < 1000000000) r = terbilang(angka/1000000)+' Juta '+terbilang(angka%1000000);
  return r.trim();
}

function getRomanMonth(d: Date) { return ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][d.getMonth()]; }

// helper: write text in container with maxWidth bounding
function writeInBox(doc: jsPDF, text: string, x: number, y: number, w: number, opts?: { fontSize?: number; font?: string; bold?: boolean; align?: 'left' | 'center' | 'right' }): number {
  doc.setFontSize(opts?.fontSize || 10);
  doc.setFont(opts?.font || 'helvetica', opts?.bold ? 'bold' : 'normal');
  // split long text across multiple lines within box width
  const lines = doc.splitTextToSize(text, w - 2);
  const align = opts?.align || 'left';
  let ax = x;
  if (align === 'center') ax = x + w / 2;
  else if (align === 'right') ax = x + w;
  doc.text(lines, ax, y, { align, maxWidth: w - 2 });
  return lines.length * (doc.getTextDimensions('Tg').h || 4);
}

export async function generateSuratJalan(job: Job, items: JobItem[]) {
  const doc = new jsPDF();
  const pageH = doc.internal.pageSize.height;
  const config = await getCompanyConfig();
  const tmpl = await getPDFTemplate('surat_jalan');

  if (tmpl) {
    drawImage(doc, config.header, tmpl.headerImage);
    drawImage(doc, config.logo, tmpl.companyLogo);

    if (tmpl.documentTitle.enabled) {
      const b = tmpl.documentTitle;
      doc.setFontSize(b.fontSize || 20);
      doc.setFont('helvetica', 'bold');
      doc.text('SURAT JALAN', b.x + b.width / 2, b.y + b.height / 2 + 5, { align: 'center' });
    }

    if (tmpl.companyInfo.enabled) {
      const b = tmpl.companyInfo;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(config.name, b.x + b.width / 2, b.y + 4, { align: 'center', maxWidth: b.width - 4 });
      doc.text(config.address, b.x + b.width / 2, b.y + 9, { align: 'center', maxWidth: b.width - 4 });
    }

    if (tmpl.clientInfo.enabled) {
      const b = tmpl.clientInfo;
      const rowH = 5;
      doc.setLineWidth(0.3);
      doc.line(b.x, b.y, b.x + b.width, b.y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text('Informasi Pengiriman:', b.x, b.y + 4);
      doc.setFont('helvetica', 'normal');
      const rows: [string, string][] = [
        ['Kepada:', job.client_name],
        ['Venue:', job.venue],
        ['Tgl Setup:', formatDate(job.setup_date)],
        ['Kontak:', job.client_phone || '-'],
      ];
      rows.forEach(([l, v], i) => {
        doc.setFont('helvetica', 'bold');
        doc.text(l, b.x, b.y + 10 + i * rowH);
        doc.setFont('helvetica', 'normal');
        doc.text(v, b.x + 22, b.y + 10 + i * rowH, { maxWidth: b.width - 24 });
      });
    }

    if (tmpl.itemsTable.enabled) {
      const b = tmpl.itemsTable;
      autoTable(doc, {
        startY: b.y,
        margin: { left: b.x, right: 210 - b.x - b.width },
        head: [['No', 'Nama Barang', 'Qty']],
        body: items.map((it, i) => [i + 1, it.item_name || it.item_name_custom || '-', String(it.quantity)]),
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] },
        tableWidth: b.width,
      });
    }

    const tableEnd = (doc as any).lastAutoTable?.finalY || 100;

    if (tmpl.signatures.enabled) {
      const b = tmpl.signatures;
      const sy = Math.max(b.y, tableEnd + 5);
      doc.setFontSize(9);
      doc.text('Penerima,', b.x + 10, sy + 8);
      doc.text('( ........................... )', b.x, sy + 28);
      doc.text('Pengirim,', b.x + b.width - 30, sy + 8);
      doc.text('( ........................... )', b.x + b.width - 50, sy + 28);
    }
  } else {
    // legacy fallback
    let yo = 0;
    if (config.header) { drawImage(doc, config.header, { x: 0, y: 0, width: 210, height: 35, enabled: true }); yo = 25; }
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('SURAT JALAN', 105, 20 + yo, { align: 'center' });
    if (config.logo) drawImage(doc, config.logo, { x: 14, y: 8, width: 18, height: 18, enabled: true });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(config.name, 105, 26 + yo, { align: 'center' });
    doc.text(config.address, 105, 31 + yo, { align: 'center' });
    doc.line(14, 35 + yo, 196, 35 + yo);
    doc.setFont('helvetica', 'bold'); doc.text('Informasi Pengiriman:', 14, 45 + yo);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kepada: ${job.client_name}`, 14, 52 + yo);
    doc.text(`Venue: ${job.venue}`, 14, 58 + yo);
    doc.text(`Tanggal Setup: ${formatDate(job.setup_date)}`, 14, 64 + yo);
    doc.text(`Kontak: ${job.client_phone || '-'}`, 14, 70 + yo);
    autoTable(doc, {
      startY: 95 + yo,
      head: [['No', 'Nama Barang', 'Qty']],
      body: items.map((it, i) => [i + 1, it.item_name || it.item_name_custom || '-', String(it.quantity)]),
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] },
    });
    let fy = (doc as any).lastAutoTable?.finalY || 100;
    if (fy + 60 > pageH) { doc.addPage(); fy = 20; }
    doc.text('Penerima,', 30, fy + 30);
    doc.text('( ........................... )', 20, fy + 55);
    doc.text('Pengirim,', 160, fy + 30);
    doc.text('( ........................... )', 150, fy + 55);
  }

  doc.save(`Surat_Jalan_${job.client_name.replace(/\s+/g, '_')}_${job.setup_date}.pdf`);
}

async function generateDocument(doc: jsPDF, type: 'INVOICE' | 'QUOTATION' | 'KUITANSI', job: Job, items: JobItem[], config: any) {
  const pageH = doc.internal.pageSize.height;
  const tKey = type === 'INVOICE' ? 'invoice' : type === 'QUOTATION' ? 'quotation' : 'receipt';
  const tmpl = await getPDFTemplate(tKey);

  const packageItemsMap: Record<string, any[]> = {};
  for (const item of items) {
    if (item.is_package && item.package_id && !packageItemsMap[item.package_id]) {
      const { data } = await supabase.from('package_items').select('qty, items:item_id(name)').eq('package_id', item.package_id);
      if (data) packageItemsMap[item.package_id] = data;
    }
  }

  drawImage(doc, config.header, tmpl?.headerImage);
  drawImage(doc, config.logo, tmpl?.companyLogo);

  // ── DOCUMENT TITLE ──
  const titleBox = tmpl?.documentTitle;
  if (!tmpl || titleBox?.enabled) {
    const bx = titleBox?.enabled ? titleBox.x : 14;
    const by = titleBox?.enabled ? titleBox.y : 10;
    doc.setFontSize(titleBox?.fontSize || 16);
    doc.setFont('helvetica', 'bold');
    doc.text(type, bx, by + 4);
  }

  const docTypeCode = type === 'INVOICE' ? 'INV' : type === 'QUOTATION' ? 'QUO' : 'KWT';
  const docNumber = `01/BSB/${docTypeCode}/${getRomanMonth(new Date(job.created_at || Date.now()))}/${new Date(job.created_at || Date.now()).getFullYear()}`;
  {
    const titleBox2 = tmpl?.documentTitle;
    const bx = titleBox2?.enabled ? titleBox2.x : 14;
    const by = titleBox2?.enabled ? titleBox2.y : 10;
    const bw = titleBox2?.enabled ? titleBox2.width : 180;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`NO : ${docNumber}`, bx + bw, by + 4, { align: 'right' });
  }

  // ── CLIENT INFO ──
  if (!tmpl || tmpl.clientInfo?.enabled) {
    const b = tmpl?.clientInfo?.enabled ? tmpl.clientInfo : { x: 14, y: 22, width: 90, height: 40 };
    const rowH = 5;
    const rows: [string, string][] = [
      ['CLIENT', job.client_name],
      ['CONTACT', job.contact_person || job.client_name],
      ['ADDRESS', job.client_address || '-'],
      ['EMAIL', job.client_email || '-'],
      ['PHONE', job.client_phone || '-'],
      ['PROJECT', (job.description || 'EVENT') + (job.venue ? ` / ${job.venue}` : '')],
      ['TGL EVENT', (() => { const s = formatDate(job.job_date); const e = job.completion_date ? formatDate(job.completion_date) : ''; return e ? `${s} s/d ${e}` : s; })()],
    ];
    rows.forEach(([l, v], i) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.text(l, b.x, b.y + rowH + i * rowH);
      doc.setFont('helvetica', 'normal');
      doc.text(v || '-', b.x + 18, b.y + rowH + i * rowH, { maxWidth: b.width - 20 });
    });
  }

  // ── OFFICE INFO (in container box) ──
  if (!tmpl || tmpl.officeInfo?.enabled) {
    const b = tmpl?.officeInfo?.enabled ? tmpl.officeInfo : { x: 110, y: 22, width: 86, height: 60 };
    let oy = b.y;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('OFFICE ADDRESS', b.x, oy); oy += 5;
    doc.setFont('helvetica', 'normal');
    const addrLines = doc.splitTextToSize(config.address, b.width - 4);
    doc.text(addrLines, b.x, oy, { maxWidth: b.width - 4 }); oy += addrLines.length * 4 + 1;
    doc.setFont('helvetica', 'bold');
    doc.text('PHONE', b.x, oy); doc.setFont('helvetica', 'normal'); doc.text(config.phone, b.x + 25, oy); oy += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('EMAIL', b.x, oy); doc.setFont('helvetica', 'normal'); doc.text(config.email, b.x + 25, oy); oy += 5;
    if (config.npwp) {
      doc.setFont('helvetica', 'bold');
      doc.text('NPWP', b.x, oy); doc.setFont('helvetica', 'normal'); doc.text(config.npwp, b.x + 25, oy); oy += 5;
    }
    oy += 2;
    let bankName = 'BCA', bankNumber = '6110252194', bankOwner = 'an. Eka Sutrisna Putra';
    if (config.payment) {
      const m = config.payment.match(/Bank\s+([A-Za-z0-9]+)/i);
      const n = config.payment.match(/(?:No\.?\s*Rek\.?\s*)?(\d{5,20})/i);
      const o = config.payment.match(/(?:a\.n\.?|\ban\.?)\s*([^,\n]+)/i);
      if (m) bankName = m[1].toUpperCase();
      if (n) bankNumber = n[1];
      if (o) bankOwner = 'an. ' + o[1].trim();
    }
    doc.setFont('helvetica', 'bold'); doc.text('BANK', b.x, oy); oy += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(bankName, b.x, oy); oy += 4;
    doc.text(bankNumber, b.x, oy); oy += 4;
    const boLines = doc.splitTextToSize(bankOwner, b.width - 4);
    doc.text(boLines, b.x, oy, { maxWidth: b.width - 4 });
  }

  // ── ITEMS TABLE ──
  const tableData = items.map((item, i) => {
    let name = item.item_name || item.item_name_custom || '-';
    if (item.is_package) {
      let pi = `[PAKET] ${name}`;
      if (item.package_id && packageItemsMap[item.package_id]) {
        const d = packageItemsMap[item.package_id].map(p => `  - ${p.qty}x ${p.items?.name}`).join('\n');
        if (d) pi += `\n${d}`;
      }
      name = pi;
    }
    return [i + 1, name, String(item.quantity), item.is_package ? 'pkg' : 'unit', String(item.days || 1),
      item.sub_rent_cost > 0 ? new Intl.NumberFormat('id-ID').format(item.sub_rent_cost) : '-',
      item.sub_rent_cost > 0 ? new Intl.NumberFormat('id-ID').format(item.sub_rent_cost * item.quantity * (item.days || 1)) : '-'];
  });

  let finalY = 68;
  if (!tmpl || tmpl.itemsTable?.enabled !== false) {
    const tBox = tmpl?.itemsTable?.enabled ? tmpl.itemsTable : { x: 14, y: 68, width: 182, height: 40 };
    autoTable(doc, {
      startY: tBox.y,
      margin: { left: tBox.x, right: 210 - tBox.x - tBox.width },
      head: [['No', 'Description', 'Qty', 'Unit', 'Day', 'Unit Price (Rp)', 'Jumlah (Rp)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 13, halign: 'right' }, 3: { cellWidth: 13 }, 4: { cellWidth: 10, halign: 'right' }, 5: { cellWidth: 28, halign: 'right' }, 6: { cellWidth: 28, halign: 'right' } },
      tableWidth: tBox.width,
      didParseCell: (data) => { if (data.section === 'body' && data.column.index === 1) { const t = data.cell.raw as string; if (t?.startsWith('[PAKET]')) data.cell.styles.fontStyle = 'bold'; } },
    });
    finalY = (doc as any).lastAutoTable?.finalY || 100;
  }
  if (finalY + 100 > pageH) { doc.addPage(); finalY = 20; }

  let totalTagihan = job.total_rental_fee;
  let pphAmount = 0;
  if (job.pph_umkm_enabled) { pphAmount = job.total_rental_fee * 0.005; totalTagihan = job.total_rental_fee - pphAmount; }

  // ── TOTALS ──
  const totBox = tmpl?.totals?.enabled ? tmpl.totals : { x: 130, y: finalY + 5, width: 66, height: 30 };
  let ty = totBox.y;
  const drawTR = (label: string, amount: number, y: number, prefix?: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(label, totBox.x, y);
    if (prefix) doc.text(prefix, totBox.x + 30, y);
    doc.text('Rp.', totBox.x + 36, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Intl.NumberFormat('id-ID').format(amount), totBox.x + totBox.width, y, { align: 'right' });
  };
  drawTR('Sub Total', job.total_rental_fee, ty); ty += 5;
  if (job.discount && job.discount > 0) { drawTR('Discount', job.discount, ty, '-'); totalTagihan -= job.discount; ty += 5; }
  if (job.pph_umkm_enabled) { drawTR('PPH UMKM 0.5%', pphAmount, ty, '-'); ty += 5; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Total Of Payment', totBox.x, ty + 2);
  doc.text('Rp.', totBox.x + 36, ty + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(new Intl.NumberFormat('id-ID').format(totalTagihan), totBox.x + totBox.width, ty + 2, { align: 'right' });

  // ── NOTES ──
  if (!tmpl || tmpl.notes?.enabled) {
    const b = tmpl?.notes?.enabled ? tmpl.notes : { x: 14, y: finalY + 15, width: 110, height: 40 };
    const bw = b.width - 4;
    let ny = b.y;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('NOTE : Termin Pembayaran :', b.x, ny); ny += 4;
    doc.setFont('helvetica', 'normal');
    doc.text('1. Tahap 1 = 50% dari total of payment', b.x, ny); ny += 4;
    const t2 = '2. Tahap 2 = 50% dari total of payment pada Pelunasan Saat Pengiriman dan Barang sudah di cek berfungsi normal';
    const t2Lines = doc.splitTextToSize(t2, bw);
    doc.text(t2Lines, b.x, ny, { maxWidth: bw }); ny += t2Lines.length * 4;
    doc.text('*Harga diatas Belum Termasuk Pajak', b.x, ny, { maxWidth: bw });
  }

  // ── TERBILANG ──
  if (!tmpl || tmpl.terbilang?.enabled) {
    const b = tmpl?.terbilang?.enabled ? tmpl.terbilang : { x: 14, y: 0, width: 120, height: 10 };
    const ty2 = b.y > 0 ? b.y : finalY + 45;
    const tbText = `( ${terbilang(totalTagihan)} Rupiah )`;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('TERBILANG :', b.x, ty2);
    doc.setFont('helvetica', 'italic');
    doc.text(tbText, b.x + 24, ty2, { maxWidth: b.width - 26 });
  }

  // ── SIGNATURES + STAMP ──
  if (!tmpl || tmpl.signatures?.enabled) {
    const b = tmpl?.signatures?.enabled ? tmpl.signatures : { x: 14, y: 0, width: 182, height: 30 };
    const sy = b.y > 0 ? b.y : finalY + 55;
    const currentDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`Denpasar, ${currentDateStr}`, b.x + b.width, sy, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(config.tax_name || config.name, b.x + b.width, sy + 20, { align: 'right' });
    if (config.npwp) {
      doc.setFont('helvetica', 'normal');
      doc.text(`NPWP: ${config.npwp}`, b.x + b.width, sy + 24, { align: 'right' });
    }
  }

  // ── STAMP (drawn last, on top of everything) ──
  if (tmpl?.stamp?.enabled && config.stamp) {
    const s = tmpl.stamp;
    drawImage(doc, config.stamp, s);
  } else if (!tmpl && config.stamp) {
    drawImage(doc, config.stamp, { x: 162, y: 0, width: 30, height: 20, enabled: true });
    // re-draw at correct position
    const tsy = finalY + 55;
    try { doc.addImage(config.stamp, 'PNG', 162, tsy + 2, 30, 20); }
    catch (e) { try { doc.addImage(config.stamp, 'JPEG', 162, tsy + 2, 30, 20); } catch (e2) {} }
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
