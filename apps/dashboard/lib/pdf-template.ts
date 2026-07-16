export interface PDFElementPosition {
  x: number; // mm from left
  y: number; // mm from top
  width: number; // mm
  height: number; // mm
}

export interface PDFTemplateLayout {
  documentType: 'surat_jalan' | 'invoice' | 'quotation' | 'receipt';
  headerImage: PDFElementPosition & { enabled: boolean };
  companyLogo: PDFElementPosition & { enabled: boolean };
  documentTitle: PDFElementPosition & { enabled: boolean; fontSize: number };
  companyInfo: PDFElementPosition & { enabled: boolean };
  clientInfo: PDFElementPosition & { enabled: boolean };
  officeInfo: PDFElementPosition & { enabled: boolean };
  itemsTable: PDFElementPosition & { enabled: boolean };
  totals: PDFElementPosition & { enabled: boolean };
  notes: PDFElementPosition & { enabled: boolean };
  terbilang: PDFElementPosition & { enabled: boolean };
  signatures: PDFElementPosition & { enabled: boolean };
  stamp: PDFElementPosition & { enabled: boolean };
}

export function defaultTemplate(type: PDFTemplateLayout['documentType']): PDFTemplateLayout {
  const isSuratJalan = type === 'surat_jalan';

  if (isSuratJalan) {
    return {
      documentType: 'surat_jalan',
      headerImage: { x: 0, y: 0, width: 210, height: 35, enabled: false },
      companyLogo: { x: 14, y: 8, width: 18, height: 18, enabled: false },
      documentTitle: { x: 105, y: 20, width: 180, height: 12, enabled: true, fontSize: 20 },
      companyInfo: { x: 105, y: 26, width: 180, height: 12, enabled: true },
      clientInfo: { x: 14, y: 45, width: 180, height: 30, enabled: true },
      officeInfo: { x: 14, y: 0, width: 0, height: 0, enabled: false },
      itemsTable: { x: 14, y: 95, width: 182, height: 80, enabled: true },
      totals: { x: 14, y: 0, width: 0, height: 0, enabled: false },
      notes: { x: 14, y: 0, width: 0, height: 0, enabled: false },
      terbilang: { x: 14, y: 0, width: 0, height: 0, enabled: false },
      signatures: { x: 20, y: 0, width: 170, height: 30, enabled: true },
      stamp: { x: 0, y: 0, width: 0, height: 0, enabled: false },
    };
  }

  return {
    documentType: type,
    headerImage: { x: 0, y: 0, width: 210, height: 35, enabled: false },
    companyLogo: { x: 14, y: 8, width: 18, height: 18, enabled: false },
    documentTitle: { x: 14, y: 0, width: 180, height: 10, enabled: true, fontSize: 16 },
    companyInfo: { x: 14, y: 0, width: 0, height: 0, enabled: false },
    clientInfo: { x: 14, y: 20, width: 90, height: 35, enabled: true },
    officeInfo: { x: 110, y: 20, width: 86, height: 35, enabled: true },
    itemsTable: { x: 14, y: 62, width: 182, height: 80, enabled: true },
    totals: { x: 120, y: 0, width: 76, height: 25, enabled: true },
    notes: { x: 14, y: 0, width: 100, height: 25, enabled: true },
    terbilang: { x: 14, y: 0, width: 100, height: 10, enabled: true },
    signatures: { x: 14, y: 0, width: 182, height: 30, enabled: true },
    stamp: { x: 162, y: 0, width: 30, height: 20, enabled: false },
  };
}

export const ELEMENT_LABELS: Record<string, string> = {
  headerImage: 'Gambar Header',
  companyLogo: 'Logo Perusahaan',
  documentTitle: 'Judul Dokumen',
  companyInfo: 'Info Perusahaan',
  clientInfo: 'Info Client',
  officeInfo: 'Info Kantor',
  itemsTable: 'Tabel Item',
  totals: 'Total Pembayaran',
  notes: 'Catatan',
  terbilang: 'Terbilang',
  signatures: 'Tanda Tangan',
  stamp: 'Stempel',
};

export const ELEMENT_COLORS: Record<string, string> = {
  headerImage: '#fef3c7',
  companyLogo: '#dbeafe',
  documentTitle: '#d1fae5',
  companyInfo: '#e0e7ff',
  clientInfo: '#fce7f3',
  officeInfo: '#ede9fe',
  itemsTable: '#f3f4f6',
  totals: '#fef9c3',
  notes: '#ecfdf5',
  terbilang: '#f0fdf4',
  signatures: '#ffedd5',
  stamp: '#fee2e2',
};
