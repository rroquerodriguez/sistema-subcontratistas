import * as XLSX from 'xlsx';
import type { Subcontratista, Queja } from '@/types';
import { excelDateValue, todayISO } from './utils-app';
import { buildNarrativeIncidencias, resumenAtrasoPorCausa } from './stats-engine';

export interface ColumnaQueja { key: string; label: string }

export const COLUMNAS_QUEJA: ColumnaQueja[] = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'causa', label: 'Causa' },
  { key: 'unidades', label: 'Unidades / General' },
  { key: 'impacto', label: 'Impacto (días)' },
  { key: 'accion', label: 'Acción' },
  { key: 'fotos', label: 'Cantidad de fotos' },
];

export const COLUMNAS_QUEJA_DEFAULT = COLUMNAS_QUEJA.map((c) => c.key);

function quejaRow(q: Queja, subName: (id: string) => string, showSub: boolean, columnas: string[]) {
  const incluye = (key: string) => columnas.includes(key);
  const row: Record<string, string | number | Date | null> = {};
  if (showSub) row['Subcontratista'] = subName(q.subcontratistaId);
  if (incluye('fecha')) row['Fecha'] = excelDateValue(q.fecha);
  if (incluye('tipo')) row['Tipo'] = q.tipo;
  if (incluye('descripcion')) row['Descripción'] = q.descripcion;
  if (incluye('causa')) row['Causa'] = q.causa;
  if (incluye('unidades')) row['Unidades / General'] = q.esGeneral ? 'GENERAL' : q.unidades;
  if (incluye('impacto')) row['Impacto (días)'] = q.impactoDias;
  if (incluye('accion')) row['Acción'] = q.accion;
  if (incluye('fotos')) row['Cantidad de fotos'] = q.fotos?.length || 0;
  return row;
}

function sortByFecha(a: Queja, b: Queja): number {
  return a.fecha.localeCompare(b.fecha);
}

export function exportQuejasExcel(
  quejas: Queja[],
  subs: Subcontratista[],
  subFiltro: Subcontratista | null = null,
  columnas: string[] = COLUMNAS_QUEJA_DEFAULT
) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const wb = XLSX.utils.book_new();
  const ordenadas = [...quejas].sort(sortByFecha);

  const resumenRows = buildNarrativeIncidencias(subFiltro, quejas).map((linea, i) => ({ '#': i + 1, Análisis: linea }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRows), 'Análisis');

  const atrasoRows = resumenAtrasoPorCausa(quejas).map((a) => ({
    Causa: a.causa,
    'Cantidad de incidencias': a.cantidadIncidencias,
    'Días de atraso totales': a.diasTotales,
  }));
  if (atrasoRows.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(atrasoRows), 'Atraso por causa');
  }

  if (subFiltro) {
    const rows = ordenadas.map((q) => quejaRow(q, subName, false, columnas));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Incidencias');
  } else {
    const todasRows = ordenadas.map((q) => quejaRow(q, subName, true, columnas));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(todasRows), 'Todas');

    const subIds = [...new Set(ordenadas.map((q) => q.subcontratistaId))];
    subIds.forEach((subId) => {
      const subQuejas = ordenadas.filter((q) => q.subcontratistaId === subId);
      const rows = subQuejas.map((q) => quejaRow(q, subName, false, columnas));
      const sheetName = (subName(subId) || 'Sub').replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Sub';
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
    });
  }

  const fname = `incidencias_${subFiltro ? subFiltro.nombre.replace(/\s+/g, '_') : 'general'}_${todayISO()}.xlsx`;
  XLSX.writeFile(wb, fname);
}
