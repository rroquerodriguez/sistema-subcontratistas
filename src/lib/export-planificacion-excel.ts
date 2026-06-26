import * as XLSX from 'xlsx';
import type { Subcontratista, Taller, Validacion, Entrega, FechaPrometida } from '@/types';
import { todayISO, diffDays, fechaDeISODia, excelDateValue } from './utils-app';
import { diasAtrasoFechaPrometida, estaAtrasada, estaCumplida } from './stats-engine';

export interface ColumnaPlanificacion {
  key: string;
  label: string;
}

export const COLUMNAS_PLANIFICACION: ColumnaPlanificacion[] = [
  { key: 'proyecto', label: 'Proyecto' },
  { key: 'edificio', label: 'Edificio/Villa/Townhouse' },
  { key: 'unidad', label: 'Unidad' },
  { key: 'actividad', label: 'Actividad' },
  { key: 'prioridad', label: 'Prioridad' },
  { key: 'dia', label: 'Día' },
  { key: 'tecnico', label: 'Técnico asignado' },
  { key: 'inspector', label: 'Inspector de calidad' },
  { key: 'fechaPromesa', label: 'Fecha promesa' },
  { key: 'estadoLiberacion', label: 'Estado liberación' },
  { key: 'fechaLiberacion', label: 'Fecha liberación' },
  { key: 'estadoEntrega', label: 'Estado entrega' },
  { key: 'fechaEntrega', label: 'Fecha entrega' },
  { key: 'dias', label: 'Días liberación-entrega' },
  { key: 'observaciones', label: 'Observaciones' },
];

export const COLUMNAS_PLANIFICACION_DEFAULT = COLUMNAS_PLANIFICACION.map((c) => c.key);

const DIAS_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function sortByDiaPrioridad(a: Taller, b: Taller): number {
  return DIAS_ORDER.indexOf(a.dia) - DIAS_ORDER.indexOf(b.dia) || Number(a.prioridad) - Number(b.prioridad);
}

function buildRows(
  talleres: Taller[],
  validaciones: Validacion[],
  entregas: Entrega[],
  subName: (id: string) => string,
  showSub: boolean,
  columnas: string[]
) {
  const incluye = (key: string) => columnas.includes(key);
  return [...talleres].sort(sortByDiaPrioridad).map((t) => {
    const v = validaciones.find((x) => x.tallerId === t.id);
    const e = entregas.find((x) => x.tallerId === t.id);
    let dias: number | string = '';
    if (v?.resultado === 'LISTO' && v.fecha) {
      const hasta = e?.estado === 'ENTREGADO' && e.fechaEntrega ? e.fechaEntrega : todayISO();
      dias = diffDays(v.fecha, hasta) ?? '';
    }
    const row: Record<string, string | number | Date | null> = {};
    if (showSub) row['Subcontratista'] = subName(t.subcontratistaId);
    if (incluye('proyecto')) row['Proyecto'] = t.proyecto;
    if (incluye('edificio')) row['Edificio/Villa/Townhouse'] = t.edificio;
    if (incluye('unidad')) row['Unidad'] = t.esGeneral ? 'GENERAL' : t.unidad;
    if (incluye('actividad')) row['Actividad'] = t.actividad;
    if (incluye('prioridad')) row['Prioridad'] = t.prioridad;
    if (incluye('dia')) row['Día'] = excelDateValue(fechaDeISODia(t.semana, t.dia));
    if (incluye('tecnico')) row['Técnico asignado'] = t.esGeneral ? 'No aplica' : t.tecnico;
    if (incluye('inspector')) row['Inspector de calidad'] = t.inspector;
    if (incluye('fechaPromesa')) row['Fecha promesa'] = t.esGeneral ? null : excelDateValue(t.fechaPromesa);
    if (incluye('estadoLiberacion')) row['Estado liberación'] = v?.resultado || 'PENDIENTE';
    if (incluye('fechaLiberacion')) row['Fecha liberación'] = excelDateValue(v?.fecha || '');
    if (incluye('estadoEntrega')) row['Estado entrega'] = e?.estado || 'NO ENTREGADO';
    if (incluye('fechaEntrega')) row['Fecha entrega'] = excelDateValue(e?.fechaEntrega || '');
    if (incluye('dias')) row['Días liberación-entrega'] = dias;
    if (incluye('observaciones')) row['Observaciones'] = v?.observaciones || '';
    return row;
  });
}

function buildFechasPrometidasRows(fechas: FechaPrometida[], subName: (id: string) => string, showSub: boolean) {
  return fechas.map((fp) => ({
    ...(showSub ? { Subcontratista: subName(fp.subcontratistaId) } : {}),
    Descripción: fp.descripcion,
    'Unidades / General': fp.esGeneral ? 'GENERAL' : fp.unidades,
    'Fecha prometida': excelDateValue(fp.fechaPrometidaActual),
    Estado: estaCumplida(fp) ? 'CUMPLIDA' : estaAtrasada(fp) ? 'ATRASADA' : 'PENDIENTE',
    'Días de atraso': diasAtrasoFechaPrometida(fp) ?? '',
  }));
}

export function exportPlanificacionExcel(
  talleres: Taller[],
  validaciones: Validacion[],
  entregas: Entrega[],
  subs: Subcontratista[],
  periodoLabel: string,
  subFiltro: Subcontratista | null,
  columnas: string[] = COLUMNAS_PLANIFICACION_DEFAULT,
  fechasPrometidas: FechaPrometida[] = []
) {
  const subName = (id: string) => subs.find((s) => s.id === id)?.nombre || '—';
  const wb = XLSX.utils.book_new();

  const fechasRelevantes = subFiltro ? fechasPrometidas.filter((fp) => fp.subcontratistaId === subFiltro.id) : fechasPrometidas;
  if (fechasRelevantes.length) {
    const fechasRows = buildFechasPrometidasRows(fechasRelevantes, subName, !subFiltro);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fechasRows), 'Fechas prometidas');
  }

  if (subFiltro) {
    const rows = buildRows(talleres, validaciones, entregas, subName, false, columnas);
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, subFiltro.nombre.slice(0, 28) || 'Planificación');
  } else {
    const todasRows = buildRows(talleres, validaciones, entregas, subName, true, columnas);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(todasRows), 'Todas');

    const subIds = [...new Set(talleres.map((t) => t.subcontratistaId))];
    subIds.forEach((subId) => {
      const subTalleres = talleres.filter((t) => t.subcontratistaId === subId);
      const rows = buildRows(subTalleres, validaciones, entregas, subName, false, columnas);
      const sheetName = (subName(subId) || 'Sub').replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Sub';
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
    });
  }

  const fname = `planificacion_${subFiltro ? subFiltro.nombre.replace(/\s+/g, '_') : 'general'}_${periodoLabel.replace(/[\s/]+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fname);
}

