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
      headerImage: { x: 0, y: 0, width: 210, height: 25, enabled: false },
      companyLogo: { x: 5, y: 30, width: 20, height: 20, enabled: false },
      documentTitle: { x: 50, y: 30, width: 110, height: 15, enabled: true, fontSize: 20 },
      companyInfo: { x: 50, y: 48, width: 110, height: 12, enabled: true },
      clientInfo: { x: 5, y: 65, width: 200, height: 30, enabled: true },
      officeInfo: { x: 5, y: 0, width: 0, height: 0, enabled: false },
      itemsTable: { x: 5, y: 100, width: 200, height: 80, enabled: true },
      totals: { x: 5, y: 0, width: 0, height: 0, enabled: false },
      notes: { x: 5, y: 0, width: 0, height: 0, enabled: false },
      terbilang: { x: 5, y: 0, width: 0, height: 0, enabled: false },
      signatures: { x: 5, y: 185, width: 200, height: 30, enabled: true },
      stamp: { x: 0, y: 0, width: 0, height: 0, enabled: false },
    };
  }

  return {
    documentType: type,
    headerImage: { x: 0, y: 0, width: 210, height: 30, enabled: false },
    companyLogo: { x: 5, y: 32, width: 22, height: 22, enabled: false },
    documentTitle: { x: 30, y: 32, width: 170, height: 14, enabled: true, fontSize: 16 },
    companyInfo: { x: 5, y: 0, width: 0, height: 0, enabled: false },
    clientInfo: { x: 5, y: 58, width: 100, height: 42, enabled: true },
    officeInfo: { x: 110, y: 58, width: 95, height: 65, enabled: true },
    itemsTable: { x: 5, y: 128, width: 200, height: 70, enabled: true },
    totals: { x: 125, y: 202, width: 75, height: 35, enabled: true },
    notes: { x: 5, y: 202, width: 115, height: 35, enabled: true },
    terbilang: { x: 5, y: 240, width: 200, height: 10, enabled: true },
    signatures: { x: 5, y: 255, width: 200, height: 30, enabled: true },
    stamp: { x: 170, y: 258, width: 28, height: 20, enabled: false },
  };
}

export const ELEMENT_LABELS: Record<string, string> = {
  headerImage: '📷 Kop Header',
  companyLogo: '🏷️ Logo',
  documentTitle: '📄 Judul Dokumen',
  companyInfo: '🏢 Info Perusahaan',
  clientInfo: '👤 Info Client',
  officeInfo: '📬 Office & Bank',
  itemsTable: '📊 Tabel Item',
  totals: '💰 Total',
  notes: '📝 Catatan',
  terbilang: '🔤 Terbilang',
  signatures: '✍️ Tanda Tangan',
  stamp: '🔴 Stempel',
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
