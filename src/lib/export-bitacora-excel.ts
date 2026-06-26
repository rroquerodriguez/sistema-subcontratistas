import * as XLSX from 'xlsx';
import type { Subcontratista, RegistroBitacora, Taller, CicloTaller, Queja } from '@/types';
import { fmtDate, fmtDateTime, excelDateValue } from './utils-app';
import { buildNarrativeBitacora, duracionCiclo, buildParrafoAnalisisBitacora, quejasDelTaller } from './stats-engine';

export interface ColumnaBitacora { key: string; label: string }

export const COLUMNAS_BITACORA: ColumnaBitacora[] = [
  { key: 'fecha', label: 'Fecha' },
  { key: 'taller', label: 'Taller' },
  { key: 'llego', label: 'Personal asignado' },
  { key: 'completo', label: 'Estado del trabajo' },
  { key: 'motivo', label: 'Motivo' },
  { key: 'responsable', label: 'Responsable' },
  { key: 'accion', label: 'Acción' },
  { key: 'notas', label: 'Notas' },
  { key: 'incidencias', label: 'Incidencias del taller' },
  { key: 'fotos', label: 'Cantidad de fotos' },
];

export const COLUMNAS_BITACORA_DEFAULT = COLUMNAS_BITACORA.map((c) => c.key);

function bitacoraRow(b: RegistroBitacora, talleres: Taller[], quejas: Queja[], subName: (id: string) => string, showSub: boolean, columnas: string[]) {
  const incluye = (key: string) => columnas.includes(key);
  const t = talleres.find((x) => x.id === b.tallerId);
  const incidenciasTaller = t ? quejasDelTaller(t, quejas) : [];
  const row: Record<string, string | number | Date | null> = {};
  if (showSub) row['Subcontratista'] = t ? subName(t.subcontratistaId) : '—';
  if (incluye('fecha')) row['Fecha'] = excelDateValue(b.fecha);
  if (incluye('taller')) row['Taller'] = t ? (t.esGeneral ? `${t.edificio} (GENERAL)` : `${t.edificio} ${t.unidad}`) : '—';
  if (incluye('llego')) row['Personal asignado'] = b.llego;
  if (incluye('completo')) row['Estado del trabajo'] = b.completo;
  if (incluye('motivo')) row['Motivo'] = b.motivo;
  if (incluye('responsable')) row['Responsable'] = b.responsable;
  if (incluye('accion')) row['Acción'] = b.accion;
  if (incluye('notas')) row['Notas'] = b.notas;
  if (incluye('incidencias')) row['Incidencias del taller'] = incidenciasTaller.map((q) => q.tipo).join(', ');
  if (incluye('fotos')) row['Cantidad de fotos'] = b.fotos?.length || 0;
  return row;
}

/** Una fila por cada comentario de avance del ciclo, detallando fecha/hora y texto */
function comentariosRows(ciclos: CicloTaller[], talleres: Taller[], subName: (id: string) => string, showSub: boolean) {
  const rows: Record<string, string | number>[] = [];
  ciclos.forEach((c) => {
    const t = talleres.find((x) => x.id === c.tallerId);
    const dur = duracionCiclo(c);
    [...c.comentarios].sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach((com) => {
      rows.push({
        ...(showSub ? { Subcontratista: t ? subName(t.subcontratistaId) : '—' } : {}),
        Taller: t ? `${t.edificio} ${t.unidad}` : '—',
        'Estado del taller': c.estado,
        'Fecha inicio': c.fechaInicio ? fmtDate(c.fechaInicio) : '',
        'Fecha cierre': c.fechaCierre ? fmtDate(c.fechaCierre) : '',
        'Duración (días)': dur ?? '',
        'Fecha y hora del comentario': fmtDateTime(com.fecha),
        Comentario: com.texto,
      });
    });
  });
  return rows;
}

/** Una fila por cada incidencia asociada a los talleres relevantes */
function incidenciasRows(talleres: Taller[], quejas: Queja[], subName: (id: string) => string, showSub: boolean) {
  const rows: Record<string, string | number>[] = [];
  talleres.forEach((t) => {
    quejasDelTaller(t, quejas).forEach((q) => {
      rows.push({
        ...(showSub ? { Subcontratista: subName(t.subcontratistaId) } : {}),
        Taller: t.esGeneral ? `${t.edificio} (GENERAL)` : `${t.edificio} ${t.unidad}`,
        Fecha: fmtDate(q.fecha),
        Tipo: q.tipo,
        Descripción: q.descripcion,
        Causa: q.causa,
      });
    });
  });
  return rows;
}

export function exportBitacoraExcel(
  registros: RegistroBitacora[],
  talleres: Taller[],
  subs: Subcontratista[],
  subFiltro: Subcontratista | null = null,
  ciclos: CicloTaller[] = [],
  periodoLabel: string = '',
  quejas: Queja[] = [],
  columnas: string[] = COLUMNAS_BITACORA_DEFAULT
) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const wb = XLSX.utils.book_new();

  if (periodoLabel) {
    const parrafo = buildParrafoAnalisisBitacora(subFiltro, registros, periodoLabel);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ 'Análisis general': parrafo }]), 'Análisis general');
  }

  const resumenRows = buildNarrativeBitacora(subFiltro, registros).map((linea, i) => ({ '#': i + 1, Análisis: linea }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRows), 'Análisis');

  const talleresRelevantes = subFiltro ? talleres.filter((t) => t.subcontratistaId === subFiltro.id) : talleres;

  const incRows = incidenciasRows(talleresRelevantes, quejas, subName, !subFiltro);
  if (incRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incRows), 'Incidencias');

  const ciclosConComentarios = ciclos.filter((c) => c.comentarios.length > 0 && talleresRelevantes.some((t) => t.id === c.tallerId));
  if (ciclosConComentarios.length) {
    const avanceRows = comentariosRows(ciclosConComentarios, talleres, subName, !subFiltro);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(avanceRows), 'Avance - comentarios');
  }

  if (subFiltro) {
    const rows = registros.map((b) => bitacoraRow(b, talleres, quejas, subName, false, columnas));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Bitácora');
  } else {
    const todasRows = registros.map((b) => bitacoraRow(b, talleres, quejas, subName, true, columnas));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(todasRows), 'Todas');

    const subIdsConRegistros = [...new Set(registros.map((b) => talleres.find((t) => t.id === b.tallerId)?.subcontratistaId).filter(Boolean))] as string[];
    subIdsConRegistros.forEach((subId) => {
      const subRegistros = registros.filter((b) => talleres.find((t) => t.id === b.tallerId)?.subcontratistaId === subId);
      const rows = subRegistros.map((b) => bitacoraRow(b, talleres, quejas, subName, false, columnas));
      const sheetName = (subName(subId) || 'Sub').replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Sub';
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
    });
  }

  const sufijo = periodoLabel ? periodoLabel.replace(/[\s/]+/g, '_') : new Date().toISOString().slice(0, 10);
  const fname = `bitacora_${subFiltro ? subFiltro.nombre.replace(/\s+/g, '_') : 'general'}_${sufijo}.xlsx`;
  XLSX.writeFile(wb, fname);
}

