'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { defaultTemplate, ELEMENT_LABELS, ELEMENT_COLORS } from '../lib/pdf-template';
import type { PDFTemplateLayout, PDFElementPosition } from '../lib/pdf-template';

const COLUMNS = 42;
const CELL_MM = 5;
const CELL_HEIGHT = 10;
const CANVAS_W = 840;
const CANVAS_H = 1188;
const MAX_ROW = 60;

interface PDFTemplateEditorProps {
  template: PDFTemplateLayout;
  onChange: (template: PDFTemplateLayout) => void;
}

const elementKeys: (keyof PDFTemplateLayout)[] = [
  'headerImage', 'companyLogo', 'documentTitle', 'companyInfo',
  'clientInfo', 'officeInfo', 'itemsTable', 'totals',
  'notes', 'terbilang', 'signatures', 'stamp'
];

function toGrid(pos: PDFElementPosition) {
  return {
    x: Math.round(pos.x / CELL_MM),
    y: Math.round(pos.y / CELL_MM),
    w: Math.max(2, Math.round(pos.width / CELL_MM)),
    h: Math.max(1, Math.round(pos.height / CELL_MM)),
  };
}

function fromGrid(x: number, y: number, w: number, h: number): PDFElementPosition {
  return { x: x * CELL_MM, y: y * CELL_MM, width: w * CELL_MM, height: h * CELL_MM };
}

function widgetKey(el: HTMLElement): string | null {
  return el.getAttribute('data-gs-key') || el.closest('[data-gs-key]')?.getAttribute('data-gs-key') || null;
}

export default function PDFTemplateEditor({ template, onChange }: PDFTemplateEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const initialRender = useRef(true);
  const deleteHandlerRef = useRef<((e: Event) => void) | null>(null);

  const syncTemplate = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const updated = { ...template } as Record<string, any>;

    elementKeys.forEach((key) => {
      const widget = grid.getGridItems?.()?.find(
        (el: HTMLElement) => el.getAttribute('data-gs-key') === key
      );
      if (widget) {
        const gsX = parseInt(widget.getAttribute('gs-x') || '0');
        const gsY = parseInt(widget.getAttribute('gs-y') || '0');
        const gsW = parseInt(widget.getAttribute('gs-w') || '2');
        const gsH = parseInt(widget.getAttribute('gs-h') || '1');
        // clamp to grid
        const cx = Math.max(0, Math.min(gsX, COLUMNS - gsW));
        const cy = Math.max(0, Math.min(gsY, MAX_ROW - gsH));
        if (cx !== gsX) widget.setAttribute('gs-x', String(cx));
        if (cy !== gsY) widget.setAttribute('gs-y', String(cy));
        const el = updated[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
        const np = fromGrid(cx, cy, gsW, gsH);
        el.x = np.x; el.y = np.y; el.width = np.width; el.height = np.height;
      }
    });

    onChange(updated as PDFTemplateLayout);
  }, [template, onChange]);

  const doDelete = useCallback((key: string) => {
    if (!gridRef.current) return;
    const widget = gridRef.current.getGridItems?.()?.find(
      (el: HTMLElement) => el.getAttribute('data-gs-key') === key
    );
    if (!widget) return;
    gridRef.current.removeWidget(widget, true);
    const updated = { ...template } as any;
    if (updated[key]) (updated[key] as any).enabled = false;
    onChange(updated as PDFTemplateLayout);
  }, [template, onChange]);

  const makeWidget = useCallback((key: string, gs: ReturnType<typeof toGrid>) => {
    if (!gridRef.current) return;
    const label = ELEMENT_LABELS[key] || key;
    const color = ELEMENT_COLORS[key] || '#f3f4f6';

    const div = document.createElement('div');
    div.className = 'grid-stack-item';
    div.setAttribute('gs-id', key);
    div.setAttribute('data-gs-key', key);
    div.setAttribute('gs-x', String(gs.x));
    div.setAttribute('gs-y', String(gs.y));
    div.setAttribute('gs-w', String(gs.w));
    div.setAttribute('gs-h', String(gs.h));
    div.setAttribute('gs-no-resize', 'false');
    div.setAttribute('gs-no-move', 'false');
    div.style.overflow = 'visible';
    if (key === 'stamp') div.style.zIndex = '99';

    div.innerHTML = `
      <div class="grid-stack-item-content gs-content" style="
        background:${color};
        border:2px solid rgba(0,0,0,0.12);
        border-radius:5px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:12px;
        font-weight:600;
        color:#1f2937;
        cursor:move;
        overflow:hidden;
        text-align:center;
        padding:4px 24px 4px 8px;
        line-height:1.3;
        user-select:none;
        height:100%;
        box-sizing:border-box;
        position:relative;
      ">
        <span>${label}</span>
        <button class="gs-del" data-gs-key="${key}" title="Hapus" style="
          position:absolute;
          top:2px;
          right:2px;
          background:#ef4444;
          color:#fff;
          border:none;
          border-radius:3px;
          width:18px;
          height:18px;
          font-size:12px;
          line-height:1;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:0;
          z-index:20;
          opacity:0;
          transition:opacity 0.15s;
          pointer-events:auto;
        ">✕</button>
      </div>
    `;

    return gridRef.current.makeWidget(div);
  }, []);

  const buildGrid = useCallback((tpl: PDFTemplateLayout) => {
    if (!containerRef.current) return;

    // remove old listener
    if (deleteHandlerRef.current) {
      containerRef.current.removeEventListener('click', deleteHandlerRef.current);
      deleteHandlerRef.current = null;
    }

    if (gridRef.current) {
      gridRef.current.destroy(false);
      gridRef.current = null;
    }
    containerRef.current.innerHTML = '';

    const grid = GridStack.init({
      column: COLUMNS,
      cellHeight: CELL_HEIGHT,
      margin: 4,
      float: false,
      animate: false,
      minRow: 1,
      maxRow: MAX_ROW,
      resizable: { handles: 'e,se,s,sw,w' },
      draggable: { handle: '.gs-content' },
    } as any, containerRef.current);

    gridRef.current = grid;

    elementKeys.forEach((key) => {
      const el = (tpl as any)[key] as PDFElementPosition & { enabled?: boolean };
      if (!el.enabled) return;
      const gs = toGrid(el);
      makeWidget(key as string, gs);
    });

    grid.on('change', () => syncTemplate());

    // single delegation handler
    const handler = (e: Event) => {
      const del = (e.target as HTMLElement).closest('.gs-del') as HTMLElement | null;
      if (!del) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const key = del.getAttribute('data-gs-key');
      if (key) doDelete(key);
    };
    deleteHandlerRef.current = handler;
    containerRef.current.addEventListener('click', handler);
  }, [syncTemplate, doDelete, makeWidget]);

  useEffect(() => {
    initialRender.current = false;
    buildGrid(template);
    return () => {
      if (deleteHandlerRef.current && containerRef.current) {
        containerRef.current.removeEventListener('click', deleteHandlerRef.current);
      }
      if (gridRef.current) {
        gridRef.current.destroy(false);
        gridRef.current = null;
      }
    };
  }, [template, buildGrid]);

  const toggleElement = (key: string) => {
    if (!gridRef.current) return;

    const updated = { ...template } as any;
    const el = updated[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
    el.enabled = !el.enabled;

    if (el.enabled) {
      if (el.width === 0) {
        const def = defaultTemplate(template.documentType) as any;
        const defEl = def[key] as PDFElementPosition & { enabled?: boolean; fontSize?: number };
        el.x = defEl.x;
        el.y = defEl.y;
        el.width = defEl.width || 30;
        el.height = defEl.height || 10;
      }
      const gs = toGrid(el);
      makeWidget(key, gs);
    } else {
      doDelete(key);
    }

    onChange(updated as PDFTemplateLayout);
  };

  const resetTemplate = () => {
    const fresh = defaultTemplate(template.documentType);
    onChange(fresh);
  };

  return (
    <div className="flex gap-4 items-start">
      <div className="w-52 shrink-0 space-y-1">
        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Elemen PDF</h4>
        {elementKeys.map((key) => {
          const el = (template as any)[key] as PDFElementPosition & { enabled?: boolean };
          return (
            <button
              key={key}
              onClick={() => toggleElement(key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                el.enabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: el.enabled ? ELEMENT_COLORS[key] : '#e5e7eb' }} />
              {ELEMENT_LABELS[key]}
            </button>
          );
        })}
        <button onClick={resetTemplate} className="w-full mt-3 px-3 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition">
          ↺ Reset Layout
        </button>
        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Klik elemen untuk toggle. Drag widget di canvas. Resize dari sudut. Klik ✕ untuk hapus.</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">A4 Canvas — 210mm × 297mm</span>
            <span className="text-xs text-slate-400">Drag geser · Resize sudut · ✕ hapus</span>
          </div>
          <div ref={containerRef} className="grid-stack mx-auto" style={{ width: `${CANVAS_W}px`, minHeight: `${CANVAS_H}px`, background: '#fff', border: '2px solid #d1d5db', borderRadius: '4px', position: 'relative', overflow: 'hidden' }} />
        </div>
      </div>
    </div>
  );
}
