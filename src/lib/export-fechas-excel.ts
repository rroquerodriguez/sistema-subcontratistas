import * as XLSX from 'xlsx';
import type { Subcontratista, FechaPrometida } from '@/types';
import { fmtDate, fmtDateTime, excelDateValue } from './utils-app';
import { diasAtrasoFechaPrometida, estaAtrasada, estaCumplida } from './stats-engine';

export interface ColumnaFecha { key: string; label: string }

export const COLUMNAS_FECHA: ColumnaFecha[] = [
  { key: 'descripcion', label: 'Descripción' },
  { key: 'unidades', label: 'Unidades / General' },
  { key: 'fechaPrometida', label: 'Fecha prometida actual' },
  { key: 'fechaCumplida', label: 'Fecha cumplida' },
  { key: 'estado', label: 'Estado' },
  { key: 'diasAtraso', label: 'Días de atraso' },
  { key: 'cambios', label: 'Cambios de fecha' },
  { key: 'historial', label: 'Historial de cambios' },
  { key: 'comentarios', label: 'Comentarios de seguimiento' },
  { key: 'fotos', label: 'Cantidad de fotos' },
  { key: 'notas', label: 'Notas' },
];

export const COLUMNAS_FECHA_DEFAULT = COLUMNAS_FECHA.map((c) => c.key);

function fechaRow(fp: FechaPrometida, subName: (id: string) => string, showSub: boolean, columnas: string[]) {
  const incluye = (key: string) => columnas.includes(key);
  const dias = diasAtrasoFechaPrometida(fp);
  const cumplida = estaCumplida(fp);
  const atrasada = estaAtrasada(fp);
  const row: Record<string, string | number | Date | null> = {};
  if (showSub) row['Subcontratista'] = subName(fp.subcontratistaId);
  if (incluye('descripcion')) row['Descripción'] = fp.descripcion;
  if (incluye('unidades')) row['Unidades / General'] = fp.esGeneral ? 'GENERAL' : fp.unidades;
  if (incluye('fechaPrometida')) row['Fecha prometida actual'] = excelDateValue(fp.fechaPrometidaActual);
  if (incluye('fechaCumplida')) row['Fecha cumplida'] = excelDateValue(fp.fechaCumplida);
  if (incluye('estado')) row['Estado'] = cumplida ? 'CUMPLIDA' : atrasada ? 'ATRASADA' : 'PENDIENTE';
  if (incluye('diasAtraso')) row['Días de atraso'] = dias ?? '';
  if (incluye('cambios')) row['Cambios de fecha'] = fp.historialFechas.length;
  if (incluye('historial')) row['Historial de cambios'] = fp.historialFechas.map((c) => `Antes: ${fmtDate(c.fecha)} (${fmtDateTime(c.registradoEn)})${c.motivo ? ` — ${c.motivo}` : ''}`).join(' | ');
  if (incluye('comentarios')) row['Comentarios de seguimiento'] = (fp.comentarios || []).map((c) => `${fmtDateTime(c.fecha)}: ${c.texto}`).join(' | ');
  if (incluye('fotos')) row['Cantidad de fotos'] = fp.fotos?.length || 0;
  if (incluye('notas')) row['Notas'] = fp.notas;
  return row;
}

function sortByFechaPrometida(a: FechaPrometida, b: FechaPrometida): number {
  return a.fechaPrometidaActual.localeCompare(b.fechaPrometidaActual);
}

export function exportFechasExcel(
  fechas: FechaPrometida[],
  subs: Subcontratista[],
  subFiltro: Subcontratista | null,
  columnas: string[] = COLUMNAS_FECHA_DEFAULT
) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const wb = XLSX.utils.book_new();
  const ordenadas = [...fechas].sort(sortByFechaPrometida);

  if (subFiltro) {
    const rows = ordenadas.map((f) => fechaRow(f, subName, false, columnas));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Fechas prometidas');
  } else {
    const todasRows = ordenadas.map((f) => fechaRow(f, subName, true, columnas));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(todasRows), 'Todas');

    const subIds = [...new Set(ordenadas.map((f) => f.subcontratistaId))];
    subIds.forEach((subId) => {
      const subFechas = ordenadas.filter((f) => f.subcontratistaId === subId);
      const rows = subFechas.map((f) => fechaRow(f, subName, false, columnas));
      const sheetName = (subName(subId) || 'Sub').replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Sub';
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
    });
  }

  const fname = `fechas_prometidas_${subFiltro ? subFiltro.nombre.replace(/\s+/g, '_') : 'general'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fname);
}
