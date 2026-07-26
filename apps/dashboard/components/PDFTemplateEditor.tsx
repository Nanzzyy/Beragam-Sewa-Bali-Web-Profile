'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { defaultTemplate, ELEMENT_LABELS, ELEMENT_COLORS } from '../lib/pdf-template';
import type { PDFTemplateLayout, PDFElementPosition } from '../lib/pdf-template';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLUMNS = 42;
const CELL_PX = 20;
const MARGIN = 4;
const CANVAS_W = COLUMNS * CELL_PX + (COLUMNS - 1) * MARGIN;
const CANVAS_H = 60 * CELL_PX + 59 * MARGIN;

const MM_PER_COL = 5;

interface PDFTemplateEditorProps {
  template: PDFTemplateLayout;
  onChange: (template: PDFTemplateLayout) => void;
}

const elementKeys: (keyof PDFTemplateLayout)[] = [
  'headerImage','companyLogo','documentTitle','companyInfo',
  'clientInfo','officeInfo','itemsTable','totals',
  'notes','terbilang','signatures','stamp'
];

function toGrid(pos: PDFElementPosition) {
  return {
    x: Math.max(0, Math.round(pos.x / MM_PER_COL)),
    y: Math.max(0, Math.round(pos.y / MM_PER_COL)),
    w: Math.max(2, Math.min(Math.round(pos.width / MM_PER_COL), COLUMNS)),
    h: Math.max(1, Math.min(Math.round(pos.height / MM_PER_COL), 60)),
  };
}

function fromGrid(x: number, y: number, w: number, h: number): PDFElementPosition {
  return { x: x * MM_PER_COL, y: y * MM_PER_COL, width: w * MM_PER_COL, height: h * MM_PER_COL };
}

function makeWidgetEl(key: string, gs: ReturnType<typeof toGrid>) {
  const label = ELEMENT_LABELS[key] || key;
  const color = ELEMENT_COLORS[key] || '#f3f4f6';
  const el = document.createElement('div');
  el.className = 'grid-stack-item';
  el.setAttribute('gs-id', key);
  el.setAttribute('data-gs-key', key);
  el.setAttribute('gs-x', String(gs.x));
  el.setAttribute('gs-y', String(gs.y));
  el.setAttribute('gs-w', String(gs.w));
  el.setAttribute('gs-h', String(gs.h));
  el.style.overflow = 'visible';
  if (key === 'stamp') el.style.zIndex = '99';
  el.innerHTML = `<div class="grid-stack-item-content gs-content" style="background:${color};border:2px solid rgba(0,0,0,0.12);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#1f2937;cursor:move;overflow:hidden;text-align:center;padding:4px 6px;line-height:1.2;user-select:none;height:100%;box-sizing:border-box;"><span style="pointer-events:none;">${label}</span></div><button class="gs-del" data-gs-key="${key}" title="Hapus" style="position:absolute;top:2px;right:2px;background:#ef4444;color:#fff;border:none;border-radius:3px;width:16px;height:16px;font-size:11px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:20;opacity:0;transition:opacity 0.15s;">✕</button>`;
  return el;
}

export default function PDFTemplateEditor({ template, onChange }: PDFTemplateEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // ── PDF Preview: generate real sample PDF ──
  const [previewUrl, setPreviewUrl] = useState('');
  const previewTimer = useRef<NodeJS.Timeout | null>(null);

  const generatePreview = useCallback(() => {
    try {
      const doc = new jsPDF();
      const tmpl = template;

      // Draw image placeholders
      const drawPlaceholder = (el: any, label: string) => {
        if (!el || !el.enabled || el.width <= 0 || el.height <= 0) return;
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.rect(el.x, el.y, el.width, el.height, 'FD');
        doc.setFontSize(Math.min(7, el.fontSize || 7));
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'italic');
        doc.text(`[${label}]`, el.x + 2, el.y + el.height / 2 + 1);
      };

      drawPlaceholder(tmpl.headerImage as any, 'Header');
      drawPlaceholder(tmpl.companyLogo as any, 'Logo');

      if (tmpl.documentTitle.enabled) {
        const t = tmpl.documentTitle;
        doc.setFontSize(t.fontSize || 16);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('SAMPLE INVOICE', t.x + 2, t.y + t.height / 2 + 2);
      }

      if (tmpl.companyInfo.enabled) {
        const b = tmpl.companyInfo;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Beragam Sewa Bali', b.x + 2, b.y + 4);
        doc.text('Jl. By Pass Ngurah Rai, Denpasar', b.x + 2, b.y + 9);
      }

      if (tmpl.clientInfo.enabled) {
        const b = tmpl.clientInfo;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('CLIENT : PT Contoh Klien', b.x + 2, b.y + 5);
        doc.setFont('helvetica', 'normal');
        doc.text('CONTACT : Budi Santoso', b.x + 2, b.y + 10);
        doc.text('ADDRESS : Jl. Contoh No. 1, Denpasar', b.x + 2, b.y + 15);
        doc.text('EVENT  : 12 Agustus 2026', b.x + 2, b.y + 20);
      }

      if (tmpl.officeInfo.enabled) {
        const b = tmpl.officeInfo;
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'bold');
        doc.text('OFFICE :', b.x + 2, b.y + 4);
        doc.setFont('helvetica', 'normal');
        doc.text('Jl. By Pass Ngurah Rai, Denpasar', b.x + 2, b.y + 9);
        doc.text('PHONE : 08123456789', b.x + 2, b.y + 14);
        doc.text('EMAIL : info@beragamsewabali.com', b.x + 2, b.y + 19);
        doc.text('BANK  : BCA 6110252194 an. Eka', b.x + 2, b.y + 24);
      }

      if (tmpl.itemsTable.enabled) {
        const b = tmpl.itemsTable;
        autoTable(doc, {
          startY: b.y,
          margin: { left: b.x, right: 210 - b.x - b.width },
          head: [['No', 'Deskripsi', 'Qty', 'Unit', 'Hari', 'Harga (Rp)', 'Jumlah (Rp)']],
          body: [
            [1, 'Tenda Sarnafil 3x3', '2', 'unit', '3', '150.000', '900.000'],
            [2, 'Kursi Tiffany', '100', 'unit', '3', '5.000', '1.500.000'],
            [3, 'Meja Bundar', '10', 'unit', '3', '25.000', '750.000'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          tableWidth: b.width,
          styles: { fontSize: 7 },
        });
      }

      const tableEnd = (doc as any).lastAutoTable?.finalY || (tmpl.itemsTable.enabled ? tmpl.itemsTable.y + 40 : 100);

      if (tmpl.totals.enabled) {
        const b = tmpl.totals;
        const ty = b.y > 0 ? b.y : tableEnd + 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Sub Total', b.x, ty);
        doc.text(': Rp. 3.150.000', b.x + b.width, ty, { align: 'right' });
        doc.setFontSize(9);
        doc.text('GRAND TOTAL', b.x, ty + 8);
        doc.text(': Rp. 3.150.000', b.x + b.width, ty + 8, { align: 'right' });
      }

      const totalsEnd = tmpl.totals.enabled ? (tmpl.totals.y || tableEnd) + 15 : tableEnd + 5;

      if (tmpl.notes.enabled) {
        const b = tmpl.notes;
        const ny = b.y > 0 ? b.y : totalsEnd;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('NOTE : Termin Pembayaran :', b.x, ny);
        doc.setFont('helvetica', 'normal');
        doc.text('1. Tahap 1 = 50% dari total', b.x, ny + 5);
        doc.text('2. Tahap 2 = 50% saat pelunasan', b.x, ny + 10);
      }

      const notesEnd = tmpl.notes.enabled ? (tmpl.notes.y || totalsEnd) + 18 : totalsEnd + 5;

      if (tmpl.terbilang.enabled) {
        const b = tmpl.terbilang;
        const ty = b.y > 0 ? b.y : notesEnd;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('TERBILANG :', b.x, ty);
        doc.setFont('helvetica', 'italic');
        doc.text('( Tiga Juta Seratus Lima Puluh Ribu Rupiah )', b.x + 24, ty);
      }

      if (tmpl.signatures.enabled) {
        const b = tmpl.signatures;
        const sy = b.y > 0 ? b.y : notesEnd + 15;
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text('Denpasar, 12 Agustus 2026', b.x + b.width, sy, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text('Beragam Sewa Bali', b.x + b.width, sy + 12, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text('NPWP: 12.345.678.9-012.345', b.x + b.width, sy + 16, { align: 'right' });
      }

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
    } catch (e) {
      // silent
    }
  }, [template]);

  // Debounced preview regenerate
  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(generatePreview, 400);
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
  }, [generatePreview]);

  // Cleanup blob URL
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, []);

  const emitChange = useCallback((grid: any) => {
    const updated = { ...template } as Record<string, any>;
    elementKeys.forEach((key) => {
      const w = grid.getGridItems?.()?.find(
        (el: HTMLElement) => el.getAttribute('data-gs-key') === key
      );
      if (w) {
        const gx = Math.max(0, Math.min(COLUMNS - 1, parseInt(w.getAttribute('gs-x') || '0')));
        const gy = Math.max(0, parseInt(w.getAttribute('gs-y') || '0'));
        const gw = parseInt(w.getAttribute('gs-w') || '2');
        const gh = parseInt(w.getAttribute('gs-h') || '1');
        Object.assign(updated[key], fromGrid(gx, gy, gw, gh));
      }
    });
    onChange(updated as PDFTemplateLayout);
  }, [template, onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    // cleanup previous
    if (cleanupRef.current) cleanupRef.current();
    if (gridRef.current) { gridRef.current.destroy(false); gridRef.current = null; }
    containerRef.current.innerHTML = '';

    const grid = GridStack.init({
      column: COLUMNS,
      cellHeight: CELL_PX,
      margin: MARGIN,
      float: true,
      animate: false,
      minRow: 1,
      maxRow: 60,
      resizable: { handles: 'e,se,s,sw,w' },
      draggable: { handle: '.gs-content' },
    } as any, containerRef.current);

    gridRef.current = grid;

    elementKeys.forEach((key) => {
      const el = (template as any)[key] as PDFElementPosition & { enabled?: boolean };
      if (!el.enabled) return;
      grid.makeWidget(makeWidgetEl(key, toGrid(el)));
    });

    grid.on('change', () => emitChange(grid));

    const onDel = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('.gs-del');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const key = btn.getAttribute('data-gs-key');
      if (!key || !gridRef.current) return;
      const w = gridRef.current.getGridItems?.()?.find(
        (el: HTMLElement) => el.getAttribute('data-gs-key') === key
      );
      if (w) gridRef.current.removeWidget(w, true);
      const upd = { ...template } as any;
      if (upd[key]) (upd[key] as any).enabled = false;
      onChange(upd as PDFTemplateLayout);
    };
    containerRef.current.addEventListener('click', onDel);
    cleanupRef.current = () => containerRef.current?.removeEventListener('click', onDel);

    return () => {
      if (cleanupRef.current) cleanupRef.current();
      if (gridRef.current) { gridRef.current.destroy(false); gridRef.current = null; }
    };
  }, [template, emitChange, onChange]);

  const toggleElement = (key: string) => {
    const el = (template as any)[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
    if (el.enabled) {
      // remove
      const upd = { ...template } as any;
      (upd[key] as any).enabled = false;
      onChange(upd as PDFTemplateLayout);
      return;
    }
    // add
    if (el.width === 0) {
      const def = defaultTemplate(template.documentType) as any;
      const defEl = def[key];
      el.x = defEl.x || 0;
      el.y = defEl.y || 0;
      el.width = defEl.width || 30;
      el.height = defEl.height || 10;
    }
    const upd = { ...template } as any;
    (upd[key] as any).enabled = true;
    onChange(upd as PDFTemplateLayout);
  };

  const resetTemplate = () => {
    onChange(defaultTemplate(template.documentType));
  };

  return (
    <div className="flex gap-4 items-start">
      <div className="w-52 shrink-0 space-y-1">
        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Elemen PDF</h4>
        {elementKeys.map((key) => {
          const el = (template as any)[key] as PDFElementPosition & { enabled?: boolean };
          return (
            <button key={key} onClick={() => toggleElement(key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${el.enabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: el.enabled ? ELEMENT_COLORS[key] : '#e5e7eb' }} />
              {ELEMENT_LABELS[key]}
            </button>
          );
        })}
        <button onClick={resetTemplate} className="w-full mt-3 px-3 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition">↺ Reset Layout</button>
        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Klik untuk toggle. Drag widget. Resize sudut. ✕ hapus.</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">A4 — 210×297mm</span>
            <span className="text-xs text-slate-400">Scroll untuk lihat penuh · Drag/resize widget</span>
          </div>
          <div className="overflow-auto rounded border border-slate-200 dark:border-slate-700" style={{ maxHeight: '70vh' }}>
            <div ref={containerRef} className="grid-stack mx-auto" style={{ width: `${CANVAS_W}px`, height: `${CANVAS_H}px`, background: '#fff', position: 'relative' }} />
          </div>
        </div>
      </div>

      {/* ── Realtime PDF Preview ── */}
      <div className="w-72 shrink-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm sticky top-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Preview PDF</span>
            <span className="text-[10px] text-slate-400">Sample data · Auto-refresh</span>
          </div>
          <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden bg-white" style={{ aspectRatio: '210/297' }}>
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full" title="PDF Preview" />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400 italic">
                Generating preview...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
